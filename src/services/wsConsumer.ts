/**
 * MineGuard — WebSocket Transmission Consumer
 *
 * Connects to ws://localhost:8000/ws/telemetry and handles canonical
 * TransmissionEvent frames from the backend's AdaptiveTransmissionScheduler.
 *
 * Event handling:
 *   INITIAL  → populates the full node state for all 5 nodes
 *   CRITICAL → merges ONLY the critical nodes into state (other nodes unchanged)
 *   WARNING  → merges ONLY the warning nodes into state
 *   SAFE     → merges ONLY the safe node(s) into state
 *
 * A critical event NEVER overwrites safe/warning node state.
 * The scheduler already guarantees this on the server side; this client
 * respects it by doing targeted, not wholesale, state updates.
 */

import {
  CanonicalNodeTelemetry,
  NodeData,
  TransmissionEvent,
  TransmissionType,
  WebSocketMessage,
} from '../types';

export type NodeStateCallback = (
  updatedNodes: CanonicalNodeTelemetry[],
  transmissionType: TransmissionType,
  allNodes: Record<string, CanonicalNodeTelemetry>
) => void;

export type AlertCallback = (alert: {
  id: string; node_id: string; severity: string; type: string;
  message: string; timestamp: string;
}) => void;

export type ConnectionCallback = (status: 'connected' | 'disconnected' | 'error', detail?: string) => void;

/** Convert a CanonicalNodeTelemetry to the legacy NodeData format for compatibility. */
export function adaptCanonicalToLegacy(tel: CanonicalNodeTelemetry): NodeData {
  return {
    node: tel.node_id,
    node_id: tel.node_id,
    latitude: tel.lat,
    longitude: tel.lon,

    tilt_deg: tel.tilt_deg ?? 0,
    vibration_index: tel.vibration_index ?? 0,
    displacement_mm: tel.displacement_mm ?? 0,
    crack_detected: tel.crack_detected ?? false,
    crack_width_mm: tel.crack_width_mm ?? 0,

    temperature: tel.temperature ?? 0,
    humidity: tel.humidity ?? 0,
    pressure: tel.pressure ?? 0,
    pressure_drop: tel.pressure_drop ?? 0,
    gas_ppm_equiv: tel.gas_ppm_equiv ?? 0,
    load_kg: tel.load_kg ?? 0,

    battery_voltage: tel.battery_voltage ?? 0,
    battery_percent: tel.battery_percent ?? 0,
    mesh_hop_count: tel.hop_count ?? 0,
    signal_strength: tel.signal_strength ?? -120,

    status: tel.status,
    risk_score: tel.risk_score,
    warning_sensors: tel.warning_sensors,
    critical_sensors: tel.critical_sensors,
    sample_interval_seconds: tel.transmission_interval_s,
    packets_sent: 0, // tracked client-side if needed

    anomaly_detected: tel.anomaly_detected,
    anomaly_score: tel.anomaly_score,
    deformation_trend: tel.deformation_trend,
    simulation_time: tel.simulation_time,
    is_stale: tel.is_stale ?? false,
    risk_explanation: tel.risk_explanation ?? [],
    sensor_faults: tel.sensor_faults ?? [],
    precursor_fingerprint: tel.precursor_fingerprint,
    spatial_consensus: tel.spatial_consensus,
    spatial_neighbors: tel.spatial_neighbors ?? [],
    deformation_rate_mm_s: tel.deformation_rate_mm_s,

    // UI defaults (enriched by dataService consumers)
    role: tel.node_id === 'NODE-5' ? 'Mesh Gateway' : 'Monitoring Node',
    pressureBaseline: 101325,
    buzzerActive: false,
  };
}

export class WebSocketTelemetryConsumer {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private nodeStateMap: Record<string, CanonicalNodeTelemetry> = {};
  private nodeListeners: NodeStateCallback[] = [];
  private alertListeners: AlertCallback[] = [];
  private connectionListeners: ConnectionCallback[] = [];
  private reconnectTimer: number | null = null;
  private reconnectInterval = 3000;
  private intentionalClose = false;
  private pingTimer: number | null = null;

  constructor(wsUrl?: string) {
    this.wsUrl = wsUrl ?? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/telemetry`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Connection management
  // ─────────────────────────────────────────────────────────────────────────

  connect(): void {
    this.intentionalClose = false;
    this._openSocket();
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private _openSocket(): void {
    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.info('[WS] Connected to MineGuard telemetry stream');
        this.connectionListeners.forEach(cb => cb('connected'));
        // Start keepalive ping every 30s
        if (this.pingTimer !== null) clearInterval(this.pingTimer);
        this.pingTimer = window.setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ action: 'ping' }));
          }
        }, 30_000);
      };

      this.ws.onmessage = (event) => this._handleMessage(event);

      this.ws.onerror = (err) => {
        console.warn('[WS] Error:', err);
        this.connectionListeners.forEach(cb => cb('error', 'WebSocket error'));
      };

      this.ws.onclose = () => {
        console.warn('[WS] Connection closed');
        this.connectionListeners.forEach(cb => cb('disconnected'));
        if (!this.intentionalClose) {
          this.reconnectTimer = window.setTimeout(() => this._openSocket(), this.reconnectInterval);
        }
      };
    } catch (err) {
      console.error('[WS] Failed to open socket:', err);
      this.connectionListeners.forEach(cb => cb('error', String(err)));
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Message routing — canonical event dispatch
  // ─────────────────────────────────────────────────────────────────────────

  private _handleMessage(event: MessageEvent): void {
    let msg: WebSocketMessage;
    try {
      msg = JSON.parse(event.data as string);
    } catch {
      return;
    }

    if (!msg || typeof msg !== 'object' || !('event' in msg)) return;

    switch (msg.event) {
      case 'transmission_event':
        this._handleTransmissionEvent(msg as TransmissionEvent);
        break;
      case 'alert_created':
        this.alertListeners.forEach(cb => cb(msg.alert));
        break;
      case 'pong':
        break;
      default:
        break;
    }
  }

  private _handleTransmissionEvent(evt: TransmissionEvent): void {
    const { transmission_type, nodes } = evt;

    // Update node state map with ONLY the nodes present in this event.
    // Other nodes' state is NOT touched — this enforces the isolation contract.
    for (const tel of nodes) {
      this.nodeStateMap[tel.node_id] = tel;
    }

    // Notify listeners with the updated nodes (not the full network map)
    this.nodeListeners.forEach(cb => cb(nodes, transmission_type, { ...this.nodeStateMap }));

    if (transmission_type === 'INITIAL') {
      console.info(`[WS] INITIAL snapshot received — ${nodes.length} nodes`);
    } else if (transmission_type === 'CRITICAL') {
      console.warn(`[WS] CRITICAL event — ${nodes.map(n => n.node_id).join(', ')}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REST fallback: fetch initial state when WebSocket hasn't received INITIAL yet
  // ─────────────────────────────────────────────────────────────────────────

  async fetchInitialState(): Promise<Record<string, CanonicalNodeTelemetry> | null> {
    try {
      const res = await fetch('/api/nodes/state', { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.nodes) {
        for (const [node_id, snapshot] of Object.entries(data.nodes as Record<string, { telemetry: CanonicalNodeTelemetry; stale?: boolean }>)) {
          this.nodeStateMap[node_id] = { ...snapshot.telemetry, is_stale: snapshot.stale ?? false };
        }
      }
      return { ...this.nodeStateMap };
    } catch {
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Accessors
  // ─────────────────────────────────────────────────────────────────────────

  getNodeState(nodeId: string): CanonicalNodeTelemetry | undefined {
    return this.nodeStateMap[nodeId];
  }

  getAllNodesState(): Record<string, CanonicalNodeTelemetry> {
    return { ...this.nodeStateMap };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Subscriptions
  // ─────────────────────────────────────────────────────────────────────────

  subscribeNodeUpdates(cb: NodeStateCallback): () => void {
    this.nodeListeners.push(cb);
    // Immediately deliver current state if available
    if (Object.keys(this.nodeStateMap).length > 0) {
      const allNodes = Object.values(this.nodeStateMap);
      cb(allNodes, 'INITIAL', { ...this.nodeStateMap });
    }
    return () => { this.nodeListeners = this.nodeListeners.filter(l => l !== cb); };
  }

  subscribeAlerts(cb: AlertCallback): () => void {
    this.alertListeners.push(cb);
    return () => { this.alertListeners = this.alertListeners.filter(l => l !== cb); };
  }

  subscribeConnection(cb: ConnectionCallback): () => void {
    this.connectionListeners.push(cb);
    return () => { this.connectionListeners = this.connectionListeners.filter(l => l !== cb); };
  }
}

/** Module singleton — consumed by components via import */
export const wsTelemetryConsumer = new WebSocketTelemetryConsumer();
