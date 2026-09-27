/**
 * MineGuard Mine Subsidence System — Canonical Constants & Thresholds
 *
 * This file provides the single source of truth for:
 *   - Structural sensor thresholds (STRUCTURAL_THRESHOLDS — primary)
 *   - Legacy environmental thresholds (SENSOR_THRESHOLDS — backwards compat)
 *   - Adaptive transmission intervals
 *   - Node coordinates and LoRa routes
 *   - Initial demo node states (now using CanonicalNodeTelemetry shape)
 *
 * UNITS documented inline. All values derived from geotechnical specifications.
 */

import { NodeData } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURAL SENSOR THRESHOLDS (PRIMARY — subsidence monitoring)
// ─────────────────────────────────────────────────────────────────────────────
export const STRUCTURAL_THRESHOLDS = {
  // Inclinometer tilt angle — degrees (°)
  TILT_WARNING_DEG: 3.0,
  TILT_CRITICAL_DEG: 5.0,

  // Vibration RMS — g-RMS (gravitational acceleration)
  VIBRATION_WARNING_G: 2.0,
  VIBRATION_CRITICAL_G: 4.0,

  // Cumulative displacement — millimetres (mm)
  DISPLACEMENT_WARNING_MM: 4.0,
  DISPLACEMENT_CRITICAL_MM: 8.0,

  // Structural roof load — kilograms (kg)
  LOAD_WARNING_KG: 5.0,
  LOAD_CRITICAL_KG: 10.0,

  // Crack — width in millimetres (mm)
  CRACK_WARNING_MM: 0.5,
  CRACK_CRITICAL_MM: 2.0,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENTAL SENSOR THRESHOLDS (supporting / secondary)
// ─────────────────────────────────────────────────────────────────────────────
export const SENSOR_THRESHOLDS = {
  // Gas (MQ-2 relative indicator — not certified methane detector)
  GAS_WARNING_PPM: 7500.0,
  GAS_CRITICAL_PPM: 12500.0,

  // Temperature — Celsius (°C)
  TEMP_WARNING_C: 35.0,
  TEMP_CRITICAL_C: 40.0,

  // Barometric pressure drop from baseline — fraction (0.02 = 2%)
  PRESSURE_WARNING_DROP: 0.02,
  PRESSURE_CRITICAL_DROP: 0.04,

  // Tilt (also listed in STRUCTURAL for backwards compat)
  TILT_WARNING_DEG: 3.0,
  TILT_CRITICAL_DEG: 5.0,

  // Structural load (also listed in STRUCTURAL for backwards compat)
  LOAD_WARNING_KG: 5.0,
  LOAD_CRITICAL_KG: 10.0,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// ADAPTIVE TRANSMISSION INTERVALS (virtual seconds)
// ─────────────────────────────────────────────────────────────────────────────
export const TRANSMISSION_INTERVALS = {
  SAFE_SECONDS: 40,      // SAFE nodes: transmit every 40 virtual seconds
  WARNING_SECONDS: 15,   // WARNING nodes: transmit every 15 virtual seconds
  DANGER_SECONDS: 3,     // DANGER nodes: transmit every 3 virtual seconds
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// NODE COORDINATES & METADATA
// ─────────────────────────────────────────────────────────────────────────────
export const NODE_COORDINATES = [
  { id: 'NODE-1', lat: 19.054400, lon: 73.068800, role: 'Wokwi Hardware Node (ESP32-S3)' },
  { id: 'NODE-2', lat: 19.054650, lon: 73.069050, role: 'Virtual Monitoring Station' },
  { id: 'NODE-3', lat: 19.054900, lon: 73.069300, role: 'Virtual Station (Subsidence Focus)' },
  { id: 'NODE-4', lat: 19.055150, lon: 73.069550, role: 'Virtual Monitoring Station' },
  { id: 'NODE-5', lat: 19.055400, lon: 73.069800, role: 'Mesh Gateway + Virtual Station' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// LoRa MESH ROUTES
// ─────────────────────────────────────────────────────────────────────────────
export const LORA_ROUTES = [
  'NODE-1 → NODE-2 → NODE-3 → NODE-4 → NODE-5',
  'NODE-2 → NODE-3 → NODE-4 → NODE-5',
  'NODE-3 → NODE-4 → NODE-5',
  'NODE-4 → NODE-5',
  'NODE-5 → GATEWAY',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL DEMO NODES — canonical-aligned baseline state
// Used as fallback when WebSocket / backend unavailable (SIMULATION mode)
// All structural fields are explicitly set to nominal safe values.
// ─────────────────────────────────────────────────────────────────────────────
export const INITIAL_DEMO_NODES: NodeData[] = [
  {
    node: 'NODE-1',
    node_id: 'NODE-1',
    role: 'Wokwi Hardware Node (ESP32-S3)',
    latitude: 19.054400, longitude: 73.068800,
    // Structural (primary)
    tilt_deg: 0.50,
    vibration_index: 0.18,
    displacement_mm: 0.12,
    crack_detected: false,
    crack_width_mm: 0.0,
    // Environmental (supporting)
    temperature: 28.0, humidity: 60.0,
    pressure: 101325.0, pressure_drop: 0.0,
    gas_ppm_equiv: 1200.0, load_kg: 1.00,
    // Power
    battery_voltage: 4.05, battery_percent: 99.4,
    mesh_hop_count: 1, signal_strength: -68,
    // Status
    status: 'SAFE', risk_score: 0,
    warning_sensors: 0, critical_sensors: 0,
    sample_interval_seconds: 40, packets_sent: 142,
    pressureBaseline: 101325.0, buzzerActive: false,
  },
  {
    node: 'NODE-2',
    node_id: 'NODE-2',
    role: 'Virtual Station (Gas Warning)',
    latitude: 19.054650, longitude: 73.069050,
    tilt_deg: 1.20,
    vibration_index: 0.25,
    displacement_mm: 0.22,
    crack_detected: false,
    crack_width_mm: 0.0,
    temperature: 30.0, humidity: 61.0,
    pressure: 100900.0, pressure_drop: 0.004,
    gas_ppm_equiv: 8500.0, load_kg: 1.50,  // Gas warning
    battery_voltage: 3.95, battery_percent: 96.2,
    mesh_hop_count: 2, signal_strength: -72,
    status: 'WARNING', risk_score: 12,
    warning_sensors: 1, critical_sensors: 0,
    sample_interval_seconds: 15, packets_sent: 278,
    pressureBaseline: 101325.0, buzzerActive: false,
  },
  {
    node: 'NODE-3',
    node_id: 'NODE-3',
    role: 'Virtual Station (Multi-sensor DANGER)',
    latitude: 19.054900, longitude: 73.069300,
    // Structural warnings → triggers DANGER (≥3 warnings)
    tilt_deg: 3.40,           // Warning (≥3.0°)
    vibration_index: 1.80,    // Warning (≥2.0 g)
    displacement_mm: 4.20,    // Warning (≥4.0 mm)
    crack_detected: true,     // Warning
    crack_width_mm: 0.30,
    temperature: 37.0, humidity: 88.0,  // Temp warning (≥35°C)
    pressure: 99120.0, pressure_drop: 0.022,  // Pressure warning (≥2%)
    gas_ppm_equiv: 7800.0, load_kg: 5.60,  // Gas & load warnings
    battery_voltage: 3.82, battery_percent: 84.0,
    mesh_hop_count: 3, signal_strength: -78,
    status: 'DANGER', risk_score: 68,
    warning_sensors: 5, critical_sensors: 1,
    sample_interval_seconds: 3, packets_sent: 894,
    pressureBaseline: 101325.0, buzzerActive: true,
  },
  {
    node: 'NODE-4',
    node_id: 'NODE-4',
    role: 'Virtual Monitoring Station',
    latitude: 19.055150, longitude: 73.069550,
    tilt_deg: 0.70,
    vibration_index: 0.20,
    displacement_mm: 0.08,
    crack_detected: false,
    crack_width_mm: 0.0,
    temperature: 28.5, humidity: 59.0,
    pressure: 101200.0, pressure_drop: 0.001,
    gas_ppm_equiv: 1500.0, load_kg: 1.50,
    battery_voltage: 4.00, battery_percent: 98.9,
    mesh_hop_count: 4, signal_strength: -82,
    status: 'SAFE', risk_score: 0,
    warning_sensors: 0, critical_sensors: 0,
    sample_interval_seconds: 40, packets_sent: 110,
    pressureBaseline: 101325.0, buzzerActive: false,
  },
  {
    node: 'NODE-5',
    node_id: 'NODE-5',
    role: 'Mesh Gateway + Virtual Station',
    latitude: 19.055400, longitude: 73.069800,
    tilt_deg: 0.80,
    vibration_index: 0.15,
    displacement_mm: 0.05,
    crack_detected: false,
    crack_width_mm: 0.0,
    temperature: 29.0, humidity: 60.0,
    pressure: 101250.0, pressure_drop: 0.001,
    gas_ppm_equiv: 1800.0, load_kg: 1.80,
    battery_voltage: 4.12, battery_percent: 99.1,
    mesh_hop_count: 0, signal_strength: -60,
    status: 'SAFE', risk_score: 0,
    warning_sensors: 0, critical_sensors: 0,
    sample_interval_seconds: 40, packets_sent: 104,
    pressureBaseline: 101325.0, buzzerActive: false,
  },
];
