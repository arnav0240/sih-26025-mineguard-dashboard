/**
 * MineGuard Mine Subsidence Monitoring System - TypeScript Type Definitions
 *
 * This file is the FRONTEND mirror of backend/app/schemas/telemetry.py.
 * All types here must remain in sync with CanonicalNodeTelemetry, TransmissionEvent,
 * and NodeStateSnapshot from the Python schema.
 *
 * UNITS (documented here explicitly):
 *   tilt_deg                  degrees (°)
 *   tilt_rate                 degrees per second (°/s)
 *   vibration_index           g-RMS
 *   vibration_rate            g/s
 *   displacement_mm           millimetres (mm)
 *   displacement_rate         mm/s
 *   displacement_acceleration mm/s²
 *   crack_width_mm            millimetres (mm)
 *   crack_growth_rate         mm/s
 *   temperature               Celsius (°C)
 *   pressure                  Pascals (Pa)
 *   pressure_drop             fraction 0.0–1.0 (0.02 = 2% drop)
 *   gas_ppm_equiv             parts per million equivalent
 *   load_kg                   kilograms (kg)
 *   battery_voltage           Volts (V)
 *   battery_percent           percentage 0–100
 *   anomaly_score             0.0 (nominal) to 1.0 (extreme)
 *   risk_score                0–100 composite score
 *   transmission_interval_s   virtual seconds
 */

// ─────────────────────────────────────────────────────────────────────────────
// Core enumerations
// ─────────────────────────────────────────────────────────────────────────────

export type OverallRisk = 'SAFE' | 'WARNING' | 'DANGER';

export type TelemetrySource = 'SIMULATOR' | 'WOKWI' | 'MQTT' | 'REST';

export type TransmissionType = 'INITIAL' | 'CRITICAL' | 'WARNING' | 'SAFE';

export type DeformationTrend = 'INCREASING' | 'STABLE' | 'DECREASING';

export type SensorState = 'NORMAL' | 'WARNING_SENSOR' | 'CRITICAL_SENSOR';

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'OFFLINE';

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL NODE TELEMETRY — mirrors CanonicalNodeTelemetry in telemetry.py
// ─────────────────────────────────────────────────────────────────────────────

export interface CanonicalNodeTelemetry {
  // Identity
  node_id: string;               // e.g. "NODE-3"
  gateway_id: string;            // e.g. "NODE-5"
  source: TelemetrySource;
  timestamp?: string;            // ISO-8601 UTC
  simulation_time?: number;      // virtual seconds since session start

  // Geospatial
  lat: number;                   // decimal degrees
  lon: number;                   // decimal degrees

  // Core Structural (PRIMARY)
  tilt_deg: number | null;       // °
  tilt_x: number | null;        // °
  tilt_y: number | null;        // °
  tilt_rate?: number | null;     // °/s

  vibration_index: number | null; // g-RMS
  vibration_rate?: number | null; // g/s

  displacement_mm: number | null; // mm
  displacement_rate?: number | null;         // mm/s
  displacement_acceleration?: number | null; // mm/s²
  relative_displacement_mm?: number | null;
  relative_node_id?: string | null;

  crack_detected: boolean | null;
  crack_width_mm: number | null; // mm
  crack_growth_rate?: number | null; // mm/s

  // Environmental Supporting
  temperature: number | null;    // °C
  humidity: number | null;       // %
  pressure: number | null;       // Pa
  pressure_drop: number | null;  // fraction 0.0–1.0
  gas_ppm_equiv: number | null;  // ppm-equiv
  load_kg: number | null;        // kg

  // Power & Communication
  battery_voltage: number | null; // V
  battery_percent: number | null; // %
  hop_count: number | null;       // LoRa mesh hops
  signal_strength: number | null; // dBm
  signal_quality_percent?: number | null;
  gateway_status?: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | null;
  packet_id?: string | null;
  sequence_number?: number | null;
  received_at?: string | null;
  transport_type?: 'HTTP' | 'MQTT' | 'LORA_EMULATED' | 'LORA' | 'WIFI' | null;
  transmission_state?: OverallRisk | null;
  additional_sensors?: Record<string, number | null>;
  sensor_health: number;         // 0.0–1.0

  // Risk & Status
  risk_score: number;            // 0–100
  status: OverallRisk;
  warning_sensors: number;
  critical_sensors: number;
  transmission_interval_s: number; // virtual seconds

  // AI Inference (optional — filled by backend after ML pipeline)
  anomaly_detected?: boolean | null;
  anomaly_score?: number | null;  // 0.0–1.0

  // Temporal & Spatial
  deformation_trend?: DeformationTrend | null;
  spatial_consensus?: boolean | null;
  is_stale?: boolean;
  risk_explanation?: string[];
  sensor_faults?: string[];
  node_baseline?: Record<string, number>;
  deformation_rate_mm_s?: number | null;
  deformation_acceleration_mm_s2?: number | null;
  precursor_fingerprint?: boolean | null;
  spatial_neighbors?: string[];
  risk_components?: Record<string, number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSMISSION EVENT — mirrors TransmissionEvent in telemetry.py
// This is what the WebSocket broadcasts after every adaptive transmission tick.
// ─────────────────────────────────────────────────────────────────────────────

export interface TransmissionEvent {
  event: 'transmission_event';
  transmission_type: TransmissionType;
  session_id?: string;
  gateway_id: string;
  timestamp: string;             // ISO-8601 UTC
  simulation_time: number;       // virtual seconds
  nodes: CanonicalNodeTelemetry[];
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE STATE SNAPSHOT — current state (separate from transmission event history)
// ─────────────────────────────────────────────────────────────────────────────

export interface NodeStateSnapshot {
  node_id: string;
  last_updated: string;
  telemetry: CanonicalNodeTelemetry;
  consecutive_critical_cycles: number;
  consecutive_warning_cycles: number;
  last_transmission_type?: string | null;
  last_seen_at?: string | null;
  last_transmission_at?: string | null;
  current_interval_s: number;
  stale: boolean;
}

export interface NetworkStateResponse {
  generated_at: string;
  gateway_id: string;
  node_count: number;
  nodes: Record<string, NodeStateSnapshot>;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY NodeData — PRESERVED for backwards compatibility with existing components.
// New code should use CanonicalNodeTelemetry directly.
// Bridged from canonical via the adaptCanonicalToLegacy() helper in dataService.ts.
// ─────────────────────────────────────────────────────────────────────────────

export interface EvaluatedSensorStates {
  gas: SensorState;
  temperature: SensorState;
  pressure: SensorState;
  tilt: SensorState;
  load: SensorState;
  vibration: SensorState;
  displacement: SensorState;
  crack: SensorState;
}

export interface AIAnalysisSummary {
  headline: string;
  status: OverallRisk;
  criticalNodeId: string | null;
  primaryRiskDrivers: string[];
  geotechnicalInterpretation: string;
  recommendedAction: string[];
  subsidenceVelocityDegPerHr: number;
}

export interface NodeAIAnalysis {
  node_id: string;
  status: OverallRisk;
  risk_score: number;
  anomaly_detected: boolean;
  anomaly_score: number;
  risk_level: AIRiskLevel;
  contributing_factors: string[];
  trend: AITrend;
  recommendation: string;
  generated_at: string;
  metrics_analyzed?: {
    tilt_deg: number;
    load_kg: number;
    gas_ppm_equiv: number;
    temperature: number;
    pressure: number;
    battery_percent: number;
    warning_sensors: number;
    critical_sensors: number;
  };
}

export interface NetworkAIAnalysis {
  overall_network_risk: AIRiskLevel;
  most_concerning_node: string | null;
  highest_anomaly_score: number;
  anomalous_node_count: number;
  node_analyses: Record<string, NodeAIAnalysis>;
  network_recommendation: string;
  generated_at: string;
}

export interface NodeData {
  // Core identity (legacy: `node`, canonical: `node_id`)
  node: string;               // "NODE-3"
  node_id?: string;           // alias

  // Geospatial
  latitude: number;
  longitude: number;

  // Structural (primary)
  tilt_deg: number;           // °
  vibration_index: number;    // g-RMS (was vibration_rms in legacy)
  displacement_mm: number;    // mm
  crack_detected: boolean;
  crack_width_mm: number;     // mm

  // Environmental (supporting)
  temperature: number;        // °C
  humidity: number;           // %
  pressure: number;           // Pa
  pressure_drop: number;      // fraction
  gas_ppm_equiv: number;      // ppm-equiv
  load_kg: number;            // kg

  // Power & Comms
  battery_voltage: number;    // V
  battery_percent: number;    // %
  mesh_hop_count: number;
  signal_strength: number;    // dBm

  // Risk & Status
  status: OverallRisk;
  risk_score: number;         // 0–100
  warning_sensors: number;
  critical_sensors: number;
  sample_interval_seconds: number; // alias for transmission_interval_s
  packets_sent: number;

  // AI
  anomaly_detected?: boolean | null;
  anomaly_score?: number | null;
  deformation_trend?: DeformationTrend | null;

  // Frontend UI enrichment
  role?: string;
  pressureBaseline?: number;
  sensorStates?: EvaluatedSensorStates;
  buzzerActive?: boolean;
  simulation_time?: number;
  is_stale?: boolean;
  risk_explanation?: string[];
  sensor_faults?: string[];
  precursor_fingerprint?: boolean | null;
  spatial_consensus?: boolean | null;
  spatial_neighbors?: string[];
  deformation_rate_mm_s?: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ALARM STATE — unchanged
// ─────────────────────────────────────────────────────────────────────────────

export interface AlarmState {
  mode: OverallRisk;
  activeNode: NodeData | null;
  activeBuzzerNodeId: string | null;
  sirenFrequencyHz: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// LoRa PACKET LOG — updated to include structural fields
// ─────────────────────────────────────────────────────────────────────────────

export interface LoRaPacketLog {
  id: string;
  source: string;
  route: string;
  status: OverallRisk;
  transmission_type: TransmissionType;
  gps: string;
  payload: {
    tilt: number;
    vibration: number;
    displacement: number;
    crack_detected: boolean;
    gas: number;
    load: number;
    risk: number;
  };
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBSOCKET EVENTS — discriminated union on 'event' field
// ─────────────────────────────────────────────────────────────────────────────

export type WebSocketMessage =
  | TransmissionEvent
  | { event: 'alert_created'; alert: { id: string; node_id: string; severity: string; type: string; message: string; timestamp: string } }
  | { event: 'connection_established'; message: string }
  | { event: 'pong' };

// ─────────────────────────────────────────────────────────────────────────────
// ALERT HISTORY — unchanged
// ─────────────────────────────────────────────────────────────────────────────

export interface AlertHistoryItem {
  id: string;
  node: string;
  node_id?: string;
  previousStatus: OverallRisk;
  newStatus: OverallRisk;
  timestamp: string;
  riskScore: number;
  triggerReason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI ANALYSIS — backend ML assessment interfaces (Phase 2, kept for /api/ai/* )
// ─────────────────────────────────────────────────────────────────────────────

export type AIRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AITrend = 'INCREASING' | 'STABLE' | 'DECREASING';

export interface BackendComponentScore {
  name: string;
  score: number;
  weight: number;
  weighted_score: number;
  rationale: string;
}

export interface BackendRiskAssessment {
  node_id: string;
  timestamp: string;
  risk_level: 'critical' | 'high' | 'moderate' | 'low' | 'nominal';
  composite_score: number;
  ai_score: number;
  rule_score: number;
  sensor_health_score: number;
  trend_score: number;
  components: BackendComponentScore[];
  contributing_factors: string[];
  recommended_actions: string[];
  disclaimer: string;
}

export interface BackendNodeAssessment {
  node_id: string;
  node_status: string;
  last_seen: string | null;
  reading_timestamp: string | null;
  assessment: BackendRiskAssessment;
}

export interface BackendNetworkSummary {
  node_count: number;
  max_composite_score: number;
  mean_composite_score: number;
  critical_nodes: string[];
  high_risk_nodes: string[];
  overall_status: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'NOMINAL';
}

export interface BackendAIResponse {
  generated_at: string;
  disclaimer: string;
  network_summary: BackendNetworkSummary;
  node_assessments: BackendNodeAssessment[];
}

// Gateway network payload — returned by /api/nodes (legacy endpoint, kept for Wokwi compat)
export interface GatewayNetworkPayload {
  gateway: string;
  network: string;
  nodes: NodeData[];
}

// Scenario types
export type DemoScenario =
  | 'DEFAULT_DEMO'
  | 'ROCKBURST_SUBSIDENCE'
  | 'METHANE_OUTBURST'
  | 'ALL_CLEAR_SAFE'
  | 'NORMAL_OPERATION'
  | 'ISOLATED_SENSOR_ANOMALY'
  | 'GRADUAL_SUBSIDENCE'
  | 'RAPID_SUBSIDENCE'
  | 'PROGRESSIVE_TILT'
  | 'CRACK_GROWTH'
  | 'VIBRATION_INCREASE'
  | 'MULTI_NODE_DEFORMATION'
  | 'GATEWAY_FAILURE'
  | 'SENSOR_FAILURE'
  | 'COMMUNICATION_LOSS'
  | 'RECOVERY'
  | 'ENVIRONMENTAL_DISTURBANCE'
  | 'SIMULTANEOUS_CRITICAL'
  | 'MIXED_RISK';
