import React from 'react';
import { ShieldCheck, Compass, Wind, AlertOctagon } from 'lucide-react';
import { NodeData, AlarmState } from '../types';

interface KpiMetricsProps {
  nodes: NodeData[];
  alarm: AlarmState;
}

export const KpiMetrics: React.FC<KpiMetricsProps> = ({ nodes, alarm }) => {
  let maxTilt = 0;
  let maxGas = 0;
  let maxRisk = 0;

  nodes.forEach((n) => {
    if (n.tilt_deg > maxTilt) maxTilt = n.tilt_deg;
    if (n.gas_ppm_equiv > maxGas) maxGas = n.gas_ppm_equiv;
    if (n.risk_score > maxRisk) maxRisk = n.risk_score;
  });

  return (
    <section className="kpi-grid">
      {/* Node Count */}
      <div className="kpi-card">
        <div className="kpi-icon-wrapper cyan">
          <ShieldCheck size={22} />
        </div>
        <div className="kpi-data">
          <span className="kpi-title">Monitored Sensor Stations</span>
          <span className="kpi-value">{nodes.length} / 5 ACTIVE</span>
          <span className="kpi-subtext">NODE-1 (Wokwi HW) + 4 Virtual Nodes</span>
        </div>
      </div>

      {/* Max Tilt */}
      <div className="kpi-card">
        <div className="kpi-icon-wrapper danger">
          <Compass size={22} />
        </div>
        <div className="kpi-data">
          <span className="kpi-title">Peak Subsidence Tilt</span>
          <span className="kpi-value">{maxTilt.toFixed(2)}°</span>
          <span className="kpi-subtext">Warn: 3.0° | Critical: 5.0°</span>
        </div>
      </div>

      {/* Max Gas Indicator */}
      <div className="kpi-card">
        <div className="kpi-icon-wrapper warn">
          <Wind size={22} />
        </div>
        <div className="kpi-data">
          <span className="kpi-title">Peak Gas Indicator</span>
          <span className="kpi-value">{maxGas.toFixed(0)} ppm-equiv</span>
          <span className="kpi-subtext">Warn: 7,500 | Critical: 12,500</span>
        </div>
      </div>

      {/* Risk Score & Siren Status */}
      <div className="kpi-card">
        <div className="kpi-icon-wrapper blue">
          <AlertOctagon size={22} />
        </div>
        <div className="kpi-data">
          <span className="kpi-title">Peak Network Risk Score</span>
          <span
            className="kpi-value"
            style={{
              color: maxRisk >= 60 ? '#ef4444' : maxRisk > 0 ? '#f59e0b' : '#10b981',
            }}
          >
            {maxRisk} / 100
          </span>
          <span className="kpi-subtext">
            {alarm.mode === 'DANGER'
              ? '🚨 3000 Hz Siren Active (Critical)'
              : 'Siren Standby (Active Only in Critical)'}
          </span>
        </div>
      </div>
    </section>
  );
};
