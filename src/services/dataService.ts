/**
 * MineGuard Mine Subsidence - Data Management & Telemetry Processing Service
 * 
 * Strictly follows the evaluation and calculation rules documented in Technical Handoff:
 * - Sensor Thresholds (Section 9)
 * - Status Logic (Section 11)
 * - Risk Score (Section 12)
 * - Adaptive Communication (Section 13)
 * - Multiple Critical Alarm Selection (Section 24)
 * - Battery Model (Section 25)
 * - LIVE GATEWAY: Preserves authoritative firmware status/scores without recalculation.
 */

import {
  NodeData,
  SensorState,
  EvaluatedSensorStates,
  OverallRisk,
  AlarmState,
  LoRaPacketLog,
  DemoScenario,
  ConnectionStatus,
  AlertHistoryItem,
} from '../types';
import { SENSOR_THRESHOLDS, TRANSMISSION_INTERVALS, INITIAL_DEMO_NODES, LORA_ROUTES } from '../constants';
import { audioAlarmService } from './audioAlarm';
import { fetchNodeData } from './api';
import { adaptCanonicalToLegacy, wsTelemetryConsumer } from './wsConsumer';
import type { CanonicalNodeTelemetry } from '../types';

export class DataService {
  private mode: 'SIMULATION' | 'LIVE_GATEWAY' = 'SIMULATION';
  private gatewayUrl: string = 'http://localhost:8180';
  private nodes: NodeData[] = JSON.parse(JSON.stringify(INITIAL_DEMO_NODES));
  private virtualClock: number = 0;
  private pollIntervalId: number | null = null;
  private isPolling: boolean = false;
  private gatewaySequences: Record<string, number> = {};
  private pendingGatewaySequences: Record<string, number> = {};
  // Unique across browser reloads so Wokwi packet counters may safely restart.
  private readonly gatewaySessionId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  private wsUnsubscribers: (() => void)[] = [];

  // Gateway Connection Tracking
  private connectionStatus: ConnectionStatus = 'DISCONNECTED';
  private lastHeartbeat: string | null = null;
  private connectionError: string | null = null;

  // Alert History Log
  private alertHistory: AlertHistoryItem[] = [];

  // Listeners
  private listeners: ((nodes: NodeData[], alarm: AlarmState) => void)[] = [];
  private packetListeners: ((packet: LoRaPacketLog) => void)[] = [];
  private connectionListeners: ((
    status: ConnectionStatus,
    lastHeartbeat: string | null,
    error: string | null
  ) => void)[] = [];
  private alertListeners: ((alerts: AlertHistoryItem[]) => void)[] = [];

  constructor() {
    this.recomputeAll();
    // Polling starts when start() is called from React (App.tsx useEffect)
  }

  // Evaluate sensor state based on firmware thresholds
  public evaluateGas(gasPpm: number): SensorState {
    if (gasPpm >= SENSOR_THRESHOLDS.GAS_CRITICAL_PPM) return 'CRITICAL_SENSOR';
    if (gasPpm >= SENSOR_THRESHOLDS.GAS_WARNING_PPM) return 'WARNING_SENSOR';
    return 'NORMAL';
  }

  public evaluateTemperature(tempC: number): SensorState {
    if (tempC >= SENSOR_THRESHOLDS.TEMP_CRITICAL_C) return 'CRITICAL_SENSOR';
    if (tempC >= SENSOR_THRESHOLDS.TEMP_WARNING_C) return 'WARNING_SENSOR';
    return 'NORMAL';
  }

  public evaluatePressure(pressurePa: number, baselinePa: number = 101325): SensorState {
    const drop = (baselinePa - pressurePa) / baselinePa;
    if (drop >= SENSOR_THRESHOLDS.PRESSURE_CRITICAL_DROP) return 'CRITICAL_SENSOR';
    if (drop >= SENSOR_THRESHOLDS.PRESSURE_WARNING_DROP) return 'WARNING_SENSOR';
    return 'NORMAL';
  }

  public evaluateTilt(tiltDeg: number): SensorState {
    if (tiltDeg >= SENSOR_THRESHOLDS.TILT_CRITICAL_DEG) return 'CRITICAL_SENSOR';
    if (tiltDeg >= SENSOR_THRESHOLDS.TILT_WARNING_DEG) return 'WARNING_SENSOR';
    return 'NORMAL';
  }

  public evaluateLoad(loadKg: number): SensorState {
    if (loadKg >= SENSOR_THRESHOLDS.LOAD_CRITICAL_KG) return 'CRITICAL_SENSOR';
    if (loadKg >= SENSOR_THRESHOLDS.LOAD_WARNING_KG) return 'WARNING_SENSOR';
    return 'NORMAL';
  }

  // Purely computes sensor states for badge rendering without modifying node overall status
  public computeSensorStates(node: NodeData): EvaluatedSensorStates {
    const baseline = node.pressureBaseline || 101325;
    return {
      gas: this.evaluateGas(node.gas_ppm_equiv),
      temperature: this.evaluateTemperature(node.temperature),
      pressure: this.evaluatePressure(node.pressure, baseline),
      tilt: this.evaluateTilt(node.tilt_deg),
      load: this.evaluateLoad(node.load_kg),
      vibration: 'NORMAL',
      displacement: 'NORMAL',
      crack: node.crack_detected ? 'WARNING_SENSOR' : 'NORMAL',
    };
  }

  // Recompute single node according to exact firmware logic (USED ONLY IN SIMULATION MODE)
  public evaluateNode(node: NodeData): void {
    const states = this.computeSensorStates(node);
    node.sensorStates = states;

    let warningCount = 0;
    let criticalCount = 0;

    Object.values(states).forEach((st) => {
      if (st === 'WARNING_SENSOR') warningCount++;
      if (st === 'CRITICAL_SENSOR') criticalCount++;
    });

    node.warning_sensors = warningCount;
    node.critical_sensors = criticalCount;

    const previousStatus = node.status;

    // Technical Handoff Section 11:
    // IF criticalCount > 0 → DANGER
    // ELSE IF warningCount >= 3 → DANGER
    // ELSE IF warningCount > 0 → WARNING
    // ELSE → SAFE
    if (criticalCount > 0) {
      node.status = 'DANGER';
    } else if (warningCount >= 3) {
      node.status = 'DANGER'; // e.g. Node 3 with 5 warnings triggers DANGER
    } else if (warningCount > 0) {
      node.status = 'WARNING';
    } else {
      node.status = 'SAFE';
    }

    if (previousStatus && previousStatus !== node.status) {
      this.recordAlert(
        node.node,
        previousStatus,
        node.status,
        node.risk_score,
        `Simulation status transition: ${previousStatus} -> ${node.status}`
      );
    }

    // Technical Handoff Section 12:
    // Risk Score = (warning sensors × 12) + (critical sensors × 30) [capped at 100]
    node.risk_score = Math.min(100, warningCount * 12 + criticalCount * 30);

    // Technical Handoff Section 13:
    // Adaptive Communication Frequency
    if (node.status === 'SAFE') {
      node.sample_interval_seconds = TRANSMISSION_INTERVALS.SAFE_SECONDS;
    } else if (node.status === 'WARNING') {
      node.sample_interval_seconds = TRANSMISSION_INTERVALS.WARNING_SECONDS;
    } else {
      node.sample_interval_seconds = TRANSMISSION_INTERVALS.DANGER_SECONDS;
    }
  }

  // Recompute alarm state and resolve tie-breaker for active audible buzzer
  // (In LIVE MODE, this evaluates active buzzer from authoritative firmware fields)
  public recomputeAll(): AlarmState {
    // Technical Handoff Section 24:
    // If multiple nodes become critical, the one with highest risk score is the active audible locator.
    let maxCritScore = -1;
    let criticalNode: NodeData | null = null;
    let maxWarnScore = -1;
    let warningNode: NodeData | null = null;

    this.nodes.forEach((n) => {
      n.buzzerActive = false;
      if (n.status === 'DANGER') {
        if (n.risk_score > maxCritScore) {
          maxCritScore = n.risk_score;
          criticalNode = n;
        }
      } else if (n.status === 'WARNING') {
        if (n.risk_score > maxWarnScore) {
          maxWarnScore = n.risk_score;
          warningNode = n;
        }
      }
    });

    let alarm: AlarmState;

    if (criticalNode) {
      (criticalNode as NodeData).buzzerActive = true;
      alarm = {
        mode: 'DANGER',
        activeNode: criticalNode,
        activeBuzzerNodeId: (criticalNode as NodeData).node,
        sirenFrequencyHz: 3000,
      };
    } else if (warningNode) {
      // Siren is activated ONLY in critical/danger
      (warningNode as NodeData).buzzerActive = false;
      alarm = {
        mode: 'WARNING',
        activeNode: warningNode,
        activeBuzzerNodeId: null,
        sirenFrequencyHz: 0,
      };
    } else {
      alarm = {
        mode: 'SAFE',
        activeNode: null,
        activeBuzzerNodeId: null,
        sirenFrequencyHz: 0,
      };
    }

    // Update hardware sound synthesizer
    audioAlarmService.updateAlarm(alarm.mode, alarm.activeBuzzerNodeId);

    return alarm;
  }

  // Record an alert change to the history
  private recordAlert(
    node: string,
    previousStatus: OverallRisk,
    newStatus: OverallRisk,
    riskScore: number,
    triggerReason: string
  ): void {
    const item: AlertHistoryItem = {
      id: `${Date.now()}-${node}-${Math.random().toString(36).substr(2, 4)}`,
      node,
      previousStatus,
      newStatus,
      timestamp: new Date().toLocaleTimeString(),
      riskScore,
      triggerReason,
    };

    this.alertHistory.unshift(item);
    if (this.alertHistory.length > 50) {
      this.alertHistory.pop();
    }
    this.notifyAlertListeners();
  }

  // Advance simulation clock and fire individual independent packet transmissions
  public tickSimulation(): void {
    this.virtualClock += 1;

    this.nodes.forEach((node, idx) => {
      // Simulate slight realistic physical sensor fluctuation
      if (idx !== 2) {
        // Node 3 is held steady for demonstration unless manipulated via sliders
        const jitter = (Math.random() - 0.5) * 0.04;
        node.tilt_deg = Math.max(0, parseFloat((node.tilt_deg + jitter).toFixed(2)));
      }

      // Battery model: Section 25
      const drain = node.status === 'DANGER' ? 0.04 : node.status === 'WARNING' ? 0.02 : 0.01;
      node.battery_percent = Math.max(5.0, parseFloat((node.battery_percent - drain * 0.1).toFixed(2)));

      // Section 15: "Each node has its own timer ... If only Node 3's timer expires, only Node 3 sends a new packet"
      if (this.virtualClock % node.sample_interval_seconds === 0) {
        node.packets_sent += 1;
        this.emitPacketLog(node, idx);
      }
    });

    const alarm = this.recomputeAll();
    this.notifyListeners(alarm);
  }

  private emitPacketLog(node: NodeData, index: number): void {
    const route = LORA_ROUTES[index] || 'NODE -> GATEWAY';
    const packet: LoRaPacketLog = {
      id: `${Date.now()}-${node.node}`,
      source: node.node,
      route,
      status: node.status,
      transmission_type: node.status === 'DANGER' ? 'CRITICAL' : node.status,
      gps: `${node.latitude.toFixed(6)}, ${node.longitude.toFixed(6)}`,
      payload: {
        tilt: node.tilt_deg,
        vibration: node.vibration_index,
        displacement: node.displacement_mm,
        crack_detected: node.crack_detected,
        gas: node.gas_ppm_equiv,
        load: node.load_kg,
        risk: node.risk_score,
      },
      timestamp: new Date().toLocaleTimeString(),
    };

    this.packetListeners.forEach((cb) => cb(packet));
  }

  // Poll live gateway from ESP32 / Wokwi
  public async pollLiveGateway(): Promise<void> {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      if (this.connectionStatus !== 'CONNECTED') {
        this.connectionStatus = 'CONNECTING';
        this.notifyConnectionListeners();
      }

      // Local Wokwi port forwarding is reached through the Vite /gateway proxy;
      // the canonical /api path remains reserved for FastAPI.
      const customGateway = new URL(this.gatewayUrl);
      const endpoint = ['localhost', '127.0.0.1'].includes(customGateway.hostname)
        ? '/gateway/api/nodes'
        : `${this.gatewayUrl.replace(/\/$/, '')}/api/nodes`;

      const payload = await fetchNodeData(endpoint);

      if (payload && Array.isArray(payload.nodes) && payload.nodes.length > 0) {
        const backendFrames: Record<string, unknown>[] = [];
        // Track status changes and build authoritative live nodes
        const updatedNodes: NodeData[] = payload.nodes.map((gatewayNode, idx) => {
          // Keep the legacy dashboard shape stable when a gateway doesn't have
          // optional channels (e.g. no extensometer/crack sensor is installed).
          const incomingNode: NodeData = {
            ...gatewayNode,
            vibration_index: gatewayNode.vibration_index ?? 0,
            displacement_mm: gatewayNode.displacement_mm ?? 0,
            crack_detected: gatewayNode.crack_detected ?? false,
            crack_width_mm: gatewayNode.crack_width_mm ?? 0,
            battery_voltage: gatewayNode.battery_voltage ?? 0,
            mesh_hop_count: gatewayNode.mesh_hop_count ?? 0,
            signal_strength: gatewayNode.signal_strength ?? -120,
          };
          const prevNode = this.nodes.find((n) => n.node === incomingNode.node);

          // Detect status transitions for alert history
          if (prevNode && prevNode.status !== incomingNode.status) {
            this.recordAlert(
              incomingNode.node,
              prevNode.status,
              incomingNode.status,
              incomingNode.risk_score,
              `ESP32 Firmware status transition: ${prevNode.status} -> ${incomingNode.status}`
            );
          }

          const sequence = incomingNode.packets_sent;
          let lastSequence = this.gatewaySequences[incomingNode.node] ?? -1;
          // Wokwi/ESP32 reboot resets its packet counter. Start a fresh local
          // counter epoch rather than waiting for it to catch the old count.
          if (sequence < lastSequence) {
            this.gatewaySequences[incomingNode.node] = -1;
            lastSequence = -1;
          }
          const pendingSequence = this.pendingGatewaySequences[incomingNode.node];
          const isNewGatewayPacket = sequence > lastSequence && sequence !== pendingSequence;
          if (isNewGatewayPacket) {
            this.pendingGatewaySequences[incomingNode.node] = sequence;
            this.emitPacketLog(incomingNode, idx);
          }

          // Enrich with metadata and sensor states for UI display badges ONLY.
          // CRITICAL: Preserve incomingNode.status, incomingNode.risk_score,
          // incomingNode.sample_interval_seconds, incomingNode.battery_percent,
          // incomingNode.warning_sensors, incomingNode.critical_sensors.
          const sensorStates = this.computeSensorStates(incomingNode);

          if (isNewGatewayPacket) {
            const raw = incomingNode as NodeData & { node: string };
            backendFrames.push({
              node_id: raw.node,
              packet_id: `${this.gatewaySessionId}:${raw.node}:${raw.packets_sent}:${Date.now()}`,
              gateway_counter: sequence,
              gateway_id: 'NODE-5', source: 'WOKWI', transport_type: 'WIFI',
              timestamp: new Date().toISOString(), lat: raw.latitude, lon: raw.longitude,
              tilt_deg: raw.tilt_deg, tilt_x: null, tilt_y: null,
              vibration_index: raw.vibration_index ?? null,
              displacement_mm: raw.displacement_mm ?? null,
              crack_detected: raw.crack_detected ?? null,
              crack_width_mm: raw.crack_width_mm ?? null,
              temperature: raw.temperature, humidity: raw.humidity, pressure: raw.pressure,
              pressure_drop: Math.max(0, (101325 - raw.pressure) / 101325),
              gas_ppm_equiv: raw.gas_ppm_equiv, load_kg: raw.load_kg,
              battery_voltage: raw.battery_voltage ?? null,
              battery_percent: raw.battery_percent,
              hop_count: raw.mesh_hop_count ?? null, signal_strength: raw.signal_strength ?? null,
              gateway_status: 'ONLINE',
              sensor_health: [raw.tilt_deg, raw.temperature, raw.humidity, raw.pressure, raw.gas_ppm_equiv,
                raw.load_kg, raw.battery_percent, raw.vibration_index, raw.displacement_mm, raw.crack_detected]
                .filter((value) => value !== undefined && value !== null).length / 10,
              risk_score: raw.risk_score, status: raw.status,
              transmission_state: raw.status, warning_sensors: raw.warning_sensors,
              critical_sensors: raw.critical_sensors,
              transmission_interval_s: raw.sample_interval_seconds,
            });
          }

          return {
            ...incomingNode,
            role: incomingNode.node === 'NODE-5'
              ? 'Gateway + Sensor Node'
              : 'Wokwi-configured Logical Node',
            pressureBaseline: prevNode?.pressureBaseline || 101325,
            sensorStates,
            buzzerActive: false,
          };
        });

        this.nodes = updatedNodes;
        for (const frame of backendFrames) {
          const nodeId = String(frame.node_id);
          const sequence = Number(frame.gateway_counter);
          void fetch('/api/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(frame) })
            .then((response) => {
              if (!response.ok) throw new Error(`FastAPI returned ${response.status}`);
              this.gatewaySequences[nodeId] = sequence;
            })
            .catch((error) => console.warn('Gateway frame backend ingest failed; will retry on the next gateway poll:', error))
            .finally(() => { delete this.pendingGatewaySequences[nodeId]; });
        }
        this.connectionStatus = 'CONNECTED';
        this.lastHeartbeat = new Date().toLocaleTimeString();
        this.connectionError = null;
        this.notifyConnectionListeners();

        // Calculate alarm state from authoritative fields
        const alarm = this.recomputeAll();
        this.notifyListeners(alarm);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Gateway unreachable';
      this.connectionStatus = 'OFFLINE';
      this.connectionError = errMsg;
      this.notifyConnectionListeners();
      console.warn('Live gateway polling failed:', errMsg);
    } finally {
      this.isPolling = false;
    }
  }

  public loadScenario(scenario: DemoScenario): void {
    const scenarios: Record<DemoScenario, string> = {
      DEFAULT_DEMO: 'demo_5min',
      ROCKBURST_SUBSIDENCE: 'rockburst_subsidence',
      METHANE_OUTBURST: 'methane_outburst',
      ALL_CLEAR_SAFE: 'normal',
      NORMAL_OPERATION: 'normal_operation',
      ISOLATED_SENSOR_ANOMALY: 'isolated_sensor_anomaly',
      GRADUAL_SUBSIDENCE: 'gradual_subsidence',
      RAPID_SUBSIDENCE: 'rapid_subsidence',
      PROGRESSIVE_TILT: 'progressive_tilt',
      CRACK_GROWTH: 'crack_growth',
      VIBRATION_INCREASE: 'vibration_increase',
      MULTI_NODE_DEFORMATION: 'multi_node_deformation',
      GATEWAY_FAILURE: 'gateway_failure',
      SENSOR_FAILURE: 'sensor_failure',
      COMMUNICATION_LOSS: 'communication_loss',
      RECOVERY: 'recovery',
      ENVIRONMENTAL_DISTURBANCE: 'environmental_disturbance',
      SIMULTANEOUS_CRITICAL: 'simultaneous_critical',
      MIXED_RISK: 'mixed_risk',
    };
    void this.startBackendScenario(scenarios[scenario]);
  }

  public stopBackendScenario(): void {
    void fetch('/api/simulation/stop', { method: 'POST' });
  }

  public updateNodeParameter(nodeIndex: number, field: keyof NodeData, value: number): void {
    const node = this.nodes[nodeIndex];
    if (!node) return;
    const frame = { ...node, node_id: node.node, source: 'REPLAY', transport_type: 'HTTP', [field]: value };
    void fetch('/api/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(frame) })
      .catch((error) => console.warn('Telemetry adjustment backend ingest failed:', error));
  }

  public start(intervalMs: number = 1000): void {
    if (this.pollIntervalId !== null) {
      clearInterval(this.pollIntervalId);
    }

    this.wsUnsubscribers.forEach((unsubscribe) => unsubscribe());
    this.wsUnsubscribers = [
      wsTelemetryConsumer.subscribeNodeUpdates((updated, _type, allNodes) =>
        this.applyCanonicalState(allNodes, updated.map((telemetry) => telemetry.node_id))),
      wsTelemetryConsumer.subscribeConnection((state, detail) => {
        this.connectionStatus = state === 'connected' ? 'CONNECTED' : state === 'error' ? 'OFFLINE' : 'CONNECTING';
        this.connectionError = detail ?? null;
        if (state === 'connected') this.lastHeartbeat = new Date().toLocaleTimeString();
        this.notifyConnectionListeners();
      }),
      wsTelemetryConsumer.subscribeAlerts((alert) => {
        this.alertHistory.unshift({
          id: String(alert.id), node: alert.node_id, node_id: alert.node_id,
          previousStatus: 'SAFE',
          newStatus: ['HIGH', 'CRITICAL'].includes(alert.severity) ? 'DANGER' : 'WARNING',
          timestamp: new Date(alert.timestamp).toLocaleTimeString(), riskScore: 0,
          triggerReason: alert.message,
        });
        this.notifyAlertListeners();
      }),
    ];
    wsTelemetryConsumer.connect();
    void wsTelemetryConsumer.fetchInitialState().then((state) => state && this.applyCanonicalState(state));

    // If already in live mode, fire an immediate poll so React subscribers
    // receive real data on first render (not stale demo INITIAL_DEMO_NODES)
    if (this.mode === 'LIVE_GATEWAY') {
      this.pollLiveGateway();
    } else {
      void this.startBackendScenario('normal');
    }

    this.pollIntervalId = window.setInterval(() => {
      if (this.mode === 'LIVE_GATEWAY') {
        this.pollLiveGateway();
      }
    }, intervalMs);

    // Only notify with current state — live poll above will notify once data arrives
    const alarm = this.recomputeAll();
    this.notifyListeners(alarm);
  }

  public stop(): void {
    if (this.pollIntervalId !== null) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    this.wsUnsubscribers.forEach((unsubscribe) => unsubscribe());
    this.wsUnsubscribers = [];
    wsTelemetryConsumer.disconnect();
    if (this.mode === 'SIMULATION') void fetch('/api/simulation/stop', { method: 'POST' });
  }

  public setMode(mode: 'SIMULATION' | 'LIVE_GATEWAY', startScenario: boolean = true): void {
    this.mode = mode;
    if (mode === 'LIVE_GATEWAY') {
      void fetch('/api/simulation/stop', { method: 'POST' });
      this.pollLiveGateway();
    } else {
      this.connectionStatus = 'DISCONNECTED';
      this.connectionError = null;
      this.notifyConnectionListeners();
      if (startScenario) void this.startBackendScenario('normal');
    }
  }

  public getMode(): 'SIMULATION' | 'LIVE_GATEWAY' {
    return this.mode;
  }

  public setGatewayUrl(url: string): void {
    this.gatewayUrl = url;
  }

  public getGatewayUrl(): string {
    return this.gatewayUrl;
  }

  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  public getLastHeartbeat(): string | null {
    return this.lastHeartbeat;
  }

  public getConnectionError(): string | null {
    return this.connectionError;
  }

  public getAlertHistory(): AlertHistoryItem[] {
    return [...this.alertHistory];
  }

  public clearAlertHistory(): void {
    this.alertHistory = [];
    this.notifyAlertListeners();
  }

  public getNodes(): NodeData[] {
    return JSON.parse(JSON.stringify(this.nodes));
  }

  public subscribe(cb: (nodes: NodeData[], alarm: AlarmState) => void): () => void {
    this.listeners.push(cb);
    cb(this.getNodes(), this.recomputeAll());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  public subscribePackets(cb: (packet: LoRaPacketLog) => void): () => void {
    this.packetListeners.push(cb);
    return () => {
      this.packetListeners = this.packetListeners.filter((l) => l !== cb);
    };
  }

  public subscribeConnectionStatus(
    cb: (status: ConnectionStatus, lastHeartbeat: string | null, error: string | null) => void
  ): () => void {
    this.connectionListeners.push(cb);
    cb(this.connectionStatus, this.lastHeartbeat, this.connectionError);
    return () => {
      this.connectionListeners = this.connectionListeners.filter((l) => l !== cb);
    };
  }

  public subscribeAlertHistory(cb: (alerts: AlertHistoryItem[]) => void): () => void {
    this.alertListeners.push(cb);
    cb(this.getAlertHistory());
    return () => {
      this.alertListeners = this.alertListeners.filter((l) => l !== cb);
    };
  }

  private notifyListeners(alarm: AlarmState): void {
    const nodesCopy = this.getNodes();
    this.listeners.forEach((l) => l(nodesCopy, alarm));
  }

  private async startBackendScenario(scenario: string): Promise<void> {
    try {
      const response = await fetch('/api/simulation/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, interval_s: 1 }),
      });
      if (!response.ok) throw new Error(`Backend simulation start failed: ${response.status}`);
    } catch (error) {
      this.connectionStatus = 'OFFLINE';
      this.connectionError = error instanceof Error ? error.message : 'Backend simulator unavailable';
      this.notifyConnectionListeners();
    }
  }

  private applyCanonicalState(state: Record<string, CanonicalNodeTelemetry>, updatedNodeIds: string[] = []): void {
    const previous = this.nodes;
    const updates = Object.values(state).map((telemetry) => {
      const incoming = adaptCanonicalToLegacy(telemetry);
      const existing = previous.find((node) => node.node === incoming.node);
      return {
        ...incoming,
        packets_sent: (existing?.packets_sent ?? 0) + (updatedNodeIds.includes(incoming.node) ? 1 : 0),
        role: telemetry.source === 'WOKWI'
          ? (incoming.node === 'NODE-5' ? 'Wokwi Gateway + Sensor Profile' : 'Wokwi-configured Logical Node')
          : telemetry.source === 'REST'
          ? 'Awaiting first telemetry packet'
          : (incoming.node === 'NODE-5' ? 'Gateway + Sensor Node' : 'Simulated Logical Node'),
        pressureBaseline: existing?.pressureBaseline ?? 101325,
        is_stale: telemetry.is_stale ?? false,
        sensorStates: this.computeSensorStates(incoming),
        buzzerActive: false,
      };
    });
    if (!updates.length) return;
    this.nodes = updates;
    this.connectionStatus = 'CONNECTED';
    this.lastHeartbeat = new Date().toLocaleTimeString();
    this.connectionError = null;
    const alarm = this.recomputeAll();
    this.notifyConnectionListeners();
    updates
      .filter((node) => updatedNodeIds.includes(node.node))
      .forEach((node) => this.emitPacketLog(node, Math.max(0, this.nodes.findIndex((item) => item.node === node.node))));
    this.notifyListeners(alarm);
  }

  private notifyConnectionListeners(): void {
    this.connectionListeners.forEach((l) =>
      l(this.connectionStatus, this.lastHeartbeat, this.connectionError)
    );
  }

  private notifyAlertListeners(): void {
    const historyCopy = this.getAlertHistory();
    this.alertListeners.forEach((l) => l(historyCopy));
  }
}

export const dataService = new DataService();
