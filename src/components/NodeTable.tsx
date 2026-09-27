import React from 'react';
import { NodeData } from '../types';

interface NodeTableProps {
  nodes: NodeData[];
  selectedNodeId: string | null;
  onFocusMap: (lat: number, lon: number, nodeId: string) => void;
}

export const NodeTable: React.FC<NodeTableProps> = ({ nodes, selectedNodeId, onFocusMap }) => {
  return (
    <div style={{ overflowX: 'auto', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-subtle)', padding: '1rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'JetBrains Mono', fontSize: '0.82rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase' }}>
            <th style={{ padding: '0.75rem 0.6rem' }}>Station</th>
            <th style={{ padding: '0.75rem 0.6rem' }}>Role</th>
            <th style={{ padding: '0.75rem 0.6rem' }}>Status</th>
            <th style={{ padding: '0.75rem 0.6rem' }}>Risk Score</th>
            <th style={{ padding: '0.75rem 0.6rem' }}>Tilt (3°/5°)</th>
            <th style={{ padding: '0.75rem 0.6rem' }}>Roof Load (5/10kg)</th>
            <th style={{ padding: '0.75rem 0.6rem' }}>Gas Ind. (7.5k/12.5k)</th>
            <th style={{ padding: '0.75rem 0.6rem' }}>Temp (35°/40°)</th>
            <th style={{ padding: '0.75rem 0.6rem' }}>Pressure (-Δ%)</th>
            <th style={{ padding: '0.75rem 0.6rem' }}>Interval</th>
            <th style={{ padding: '0.75rem 0.6rem' }}>Battery</th>
            <th style={{ padding: '0.75rem 0.6rem' }}>Audible Alarm</th>
            <th style={{ padding: '0.75rem 0.6rem' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((n) => {
            const isSelected = n.node === selectedNodeId;
            const isDanger = n.status === 'DANGER';
            const isWarning = n.status === 'WARNING';
            const color = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';

            const st = n.sensorStates || {
              gas: 'NORMAL',
              temperature: 'NORMAL',
              pressure: 'NORMAL',
              tilt: 'NORMAL',
              load: 'NORMAL',
            };

            const baseline = n.pressureBaseline || 101325;
            const dropPct = (((baseline - n.pressure) / baseline) * 100).toFixed(1);

            return (
              <tr
                key={n.node}
                onClick={() => onFocusMap(n.latitude, n.longitude, n.node)}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: isSelected
                    ? 'rgba(14, 165, 233, 0.15)'
                    : isDanger
                    ? 'rgba(239,68,68,0.06)'
                    : isWarning
                    ? 'rgba(245,158,11,0.04)'
                    : 'transparent',
                  cursor: 'pointer',
                  borderLeft: isSelected ? '4px solid #38bdf8' : '4px solid transparent',
                  transition: 'background 0.2s ease',
                }}
              >
                {/* Station */}
                <td style={{ padding: '0.75rem 0.6rem', fontWeight: 800, color: isSelected ? '#38bdf8' : '#fff' }}>
                  {n.node} {isSelected ? '📍' : ''}
                </td>

                {/* Role */}
                <td style={{ padding: '0.75rem 0.6rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                  {n.node === 'NODE-1' ? 'Real Hardware' : n.node === 'NODE-5' ? 'Gateway' : 'Virtual Station'}
                </td>

                {/* Status */}
                <td style={{ padding: '0.75rem 0.6rem' }}>
                  <span
                    style={{
                      background: isDanger ? 'rgba(239,68,68,0.2)' : isWarning ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.15)',
                      color,
                      border: `1px solid ${color}`,
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      fontFamily: 'Chakra Petch',
                    }}
                  >
                    {n.status}
                  </span>
                </td>

                {/* Risk Score */}
                <td style={{ padding: '0.75rem 0.6rem', fontWeight: 700, color: '#fff' }}>
                  {n.risk_score} / 100
                </td>

                {/* Tilt */}
                <td style={{ padding: '0.75rem 0.6rem', color: st.tilt !== 'NORMAL' ? (st.tilt === 'CRITICAL_SENSOR' ? '#ef4444' : '#f59e0b') : '#fff' }}>
                  {n.tilt_deg.toFixed(2)}°
                </td>

                {/* Load */}
                <td style={{ padding: '0.75rem 0.6rem', color: st.load !== 'NORMAL' ? (st.load === 'CRITICAL_SENSOR' ? '#ef4444' : '#f59e0b') : '#fff' }}>
                  {n.load_kg.toFixed(2)} kg
                </td>

                {/* Gas */}
                <td style={{ padding: '0.75rem 0.6rem', color: st.gas !== 'NORMAL' ? (st.gas === 'CRITICAL_SENSOR' ? '#ef4444' : '#f59e0b') : '#fff' }}>
                  {n.gas_ppm_equiv.toFixed(0)} ppm
                </td>

                {/* Temp */}
                <td style={{ padding: '0.75rem 0.6rem', color: st.temperature !== 'NORMAL' ? (st.temperature === 'CRITICAL_SENSOR' ? '#ef4444' : '#f59e0b') : '#fff' }}>
                  {n.temperature.toFixed(1)} °C
                </td>

                {/* Pressure Drop */}
                <td style={{ padding: '0.75rem 0.6rem', color: st.pressure !== 'NORMAL' ? (st.pressure === 'CRITICAL_SENSOR' ? '#ef4444' : '#f59e0b') : '#fff' }}>
                  {(n.pressure / 100).toFixed(0)} hPa (-{dropPct}%)
                </td>

                {/* Interval */}
                <td style={{ padding: '0.75rem 0.6rem', color: '#38bdf8' }}>
                  {n.sample_interval_seconds}s
                </td>

                {/* Battery */}
                <td style={{ padding: '0.75rem 0.6rem', color: '#94a3b8' }}>
                  {n.battery_percent.toFixed(1)}%
                </td>

                {/* Alarm */}
                <td style={{ padding: '0.75rem 0.6rem', fontWeight: 700, color: n.buzzerActive ? '#ef4444' : '#64748b' }}>
                  {n.buzzerActive ? '🚨 3000 Hz SIREN (CRIT)' : 'OFF'}
                </td>

                {/* Action */}
                <td style={{ padding: '0.75rem 0.6rem' }}>
                  <button
                    className="btn-action"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onFocusMap(n.latitude, n.longitude, n.node);
                    }}
                  >
                    Select
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
