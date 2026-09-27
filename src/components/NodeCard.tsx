import React from 'react';
import { MapPin, BatteryCharging, Radio, Volume2 } from 'lucide-react';
import { NodeData } from '../types';

interface NodeCardProps {
  node: NodeData;
  isSelected: boolean;
  onFocusMap: (lat: number, lon: number, nodeId: string) => void;
}

export const NodeCard: React.FC<NodeCardProps> = ({ node, isSelected, onFocusMap }) => {
  const isDanger = node.status === 'DANGER';
  const isWarning = node.status === 'WARNING';

  const cardClass = isDanger ? 'state-danger' : isWarning ? 'state-warning' : 'state-safe';
  const pillClass = node.status.toLowerCase();
  const fillClass = isDanger ? 'danger' : isWarning ? 'warn' : 'safe';

  const states = node.sensorStates || {
    gas: 'NORMAL',
    temperature: 'NORMAL',
    pressure: 'NORMAL',
    tilt: 'NORMAL',
    load: 'NORMAL',
  };

  const isGateway = node.node === 'NODE-5';
  const roleLabel = node.role || (isGateway ? 'GATEWAY + SENSOR NODE' : 'LOGICAL SENSOR NODE');

  // Pressure drop % calculation
  const baseline = node.pressureBaseline || 101325;
  const dropPct = (((baseline - node.pressure) / baseline) * 100).toFixed(1);

  return (
    <div
      className={`node-card ${cardClass}`}
      style={
        isSelected
          ? {
              borderColor: '#38bdf8',
              boxShadow: '0 0 20px rgba(56,189,248,0.3)',
              transform: 'translateY(-3px)',
            }
          : {}
      }
      onClick={() => onFocusMap(node.latitude, node.longitude, node.node)}
    >
      <div className="node-card-header">
        <div className="node-title-group">
          <div className="node-badge-row">
            <span className="node-name">{node.node}</span>
            <span className="node-type-tag">{roleLabel}</span>
            {node.is_stale && <span className="node-type-tag" style={{ color: '#f59e0b' }}>STALE · LAST KNOWN STATE</span>}
            {isSelected && (
              <span
                style={{
                  background: '#0ea5e9',
                  color: '#ffffff',
                  fontSize: '9px',
                  fontWeight: 800,
                  borderRadius: '3px',
                  padding: '1px 5px',
                  fontFamily: 'JetBrains Mono',
                }}
              >
                SELECTED
              </span>
            )}
          </div>
          <div
            className="node-gps-loc"
            style={{ cursor: 'pointer' }}
            title="Click to view on GIS map & Subsurface Strata"
          >
            <MapPin size={12} />
            {node.latitude.toFixed(6)}, {node.longitude.toFixed(6)}
          </div>
        </div>
        <span className={`node-status-pill ${pillClass}`}>{node.status}</span>
      </div>

      {/* Risk Score Progress Bar */}
      <div className="risk-meter-wrapper">
        <div className="risk-meter-header">
          <span>RISK SCORE</span>
          <span className="risk-meter-val">{node.risk_score} / 100</span>
        </div>
        <div className="risk-bar-track">
          <div className={`risk-bar-fill ${fillClass}`} style={{ width: `${Math.max(4, node.risk_score)}%` }} />
        </div>
      </div>

      {/* 6 Sensors Grid */}
      <div className="node-sensors-grid">
        {/* Tilt */}
        <div className={`sensor-box ${states.tilt === 'CRITICAL_SENSOR' ? 'critical' : states.tilt === 'WARNING_SENSOR' ? 'warn' : ''}`}>
          <div className="sensor-box-top">
            <span className="sensor-name">Tilt Angle</span>
            <span className={`sensor-status-tag ${states.tilt === 'CRITICAL_SENSOR' ? 'critical' : states.tilt === 'WARNING_SENSOR' ? 'warn' : 'normal'}`}>
              {states.tilt === 'CRITICAL_SENSOR' ? 'CRIT' : states.tilt === 'WARNING_SENSOR' ? 'WARN' : 'NORM'}
            </span>
          </div>
          <div className="sensor-val">
            {node.tilt_deg.toFixed(2)}
            <span>°</span>
          </div>
        </div>

        {/* Structural Load */}
        <div className={`sensor-box ${states.load === 'CRITICAL_SENSOR' ? 'critical' : states.load === 'WARNING_SENSOR' ? 'warn' : ''}`}>
          <div className="sensor-box-top">
            <span className="sensor-name">Roof Load</span>
            <span className={`sensor-status-tag ${states.load === 'CRITICAL_SENSOR' ? 'critical' : states.load === 'WARNING_SENSOR' ? 'warn' : 'normal'}`}>
              {states.load === 'CRITICAL_SENSOR' ? 'CRIT' : states.load === 'WARNING_SENSOR' ? 'WARN' : 'NORM'}
            </span>
          </div>
          <div className="sensor-val">
            {node.load_kg.toFixed(2)}
            <span>kg</span>
          </div>
        </div>

        {/* Gas Indicator (ppm-equiv) */}
        <div className={`sensor-box ${states.gas === 'CRITICAL_SENSOR' ? 'critical' : states.gas === 'WARNING_SENSOR' ? 'warn' : ''}`}>
          <div className="sensor-box-top">
            <span className="sensor-name">Gas Indicator</span>
            <span className={`sensor-status-tag ${states.gas === 'CRITICAL_SENSOR' ? 'critical' : states.gas === 'WARNING_SENSOR' ? 'warn' : 'normal'}`}>
              {states.gas === 'CRITICAL_SENSOR' ? 'CRIT' : states.gas === 'WARNING_SENSOR' ? 'WARN' : 'NORM'}
            </span>
          </div>
          <div className="sensor-val">
            {node.gas_ppm_equiv.toFixed(0)}
            <span>ppm-eq</span>
          </div>
        </div>

        {/* Temperature */}
        <div className={`sensor-box ${states.temperature === 'CRITICAL_SENSOR' ? 'critical' : states.temperature === 'WARNING_SENSOR' ? 'warn' : ''}`}>
          <div className="sensor-box-top">
            <span className="sensor-name">Temperature</span>
            <span className={`sensor-status-tag ${states.temperature === 'CRITICAL_SENSOR' ? 'critical' : states.temperature === 'WARNING_SENSOR' ? 'warn' : 'normal'}`}>
              {states.temperature === 'CRITICAL_SENSOR' ? 'CRIT' : states.temperature === 'WARNING_SENSOR' ? 'WARN' : 'NORM'}
            </span>
          </div>
          <div className="sensor-val">
            {node.temperature.toFixed(1)}
            <span>°C</span>
          </div>
        </div>

        {/* Pressure & Drop % */}
        <div className={`sensor-box ${states.pressure === 'CRITICAL_SENSOR' ? 'critical' : states.pressure === 'WARNING_SENSOR' ? 'warn' : ''}`}>
          <div className="sensor-box-top">
            <span className="sensor-name">Pressure (-{dropPct}%)</span>
            <span className={`sensor-status-tag ${states.pressure === 'CRITICAL_SENSOR' ? 'critical' : states.pressure === 'WARNING_SENSOR' ? 'warn' : 'normal'}`}>
              {states.pressure === 'CRITICAL_SENSOR' ? 'CRIT' : states.pressure === 'WARNING_SENSOR' ? 'WARN' : 'NORM'}
            </span>
          </div>
          <div className="sensor-val">
            {(node.pressure / 100).toFixed(0)}
            <span>hPa</span>
          </div>
        </div>

        {/* Humidity */}
        <div className="sensor-box">
          <div className="sensor-box-top">
            <span className="sensor-name">Humidity</span>
            <span className="sensor-status-tag normal">NORM</span>
          </div>
          <div className="sensor-val">
            {node.humidity.toFixed(1)}
            <span>%</span>
          </div>
        </div>
      </div>

      {/* Backend-generated risk explanation and sensor trust notes */}
      {(node.risk_explanation?.length || node.sensor_faults?.length || node.precursor_fingerprint) ? <div style={{ margin: '0.6rem 0', padding: '0.55rem', border: '1px solid rgba(148,163,184,.2)', borderRadius: '6px', fontSize: '.68rem', color: '#cbd5e1' }}>
        <strong>{node.precursor_fingerprint ? 'SUBSIDENCE PRECURSOR' : node.sensor_faults?.length ? 'SENSOR TRUST NOTICE' : 'BACKEND RISK & SIGNAL CLASSIFICATION'}</strong>
        <ul style={{ margin: '.25rem 0 0', paddingLeft: '1.1rem' }}>{[...(node.sensor_faults ?? []), ...(node.risk_explanation ?? []).filter((reason) => reason.startsWith('Research-informed synthetic ML:')), ...(node.risk_explanation ?? []).filter((reason) => !node.sensor_faults?.includes(reason) && !reason.startsWith('Research-informed synthetic ML:'))].slice(0, 4).map((reason, index) => <li key={index}>{reason}</li>)}</ul>
        {node.spatial_consensus && <span>Neighbor agreement: {(node.spatial_neighbors ?? []).join(', ') || 'confirmed'}</span>}
      </div> : null}

      {/* Card Footer Telemetry */}
      <div className="node-card-footer">
        <div className="node-telemetry-badge" title="Simulated battery depletion model">
          <BatteryCharging size={13} />
          {node.battery_percent.toFixed(1)}% (Sim)
        </div>

        <div className="node-telemetry-badge" title="Adaptive transmission interval">
          <Radio size={13} />
          TX: {node.sample_interval_seconds}s
        </div>

        {/* Siren only on critical */}
        <div className={`node-buzzer-indicator ${node.buzzerActive ? 'buzzer-on' : 'buzzer-off'}`}>
          <Volume2 size={13} />
          {node.buzzerActive ? '🚨 3kHz SIREN (CRITICAL)' : 'SIREN OFF'}
        </div>
      </div>
    </div>
  );
};
