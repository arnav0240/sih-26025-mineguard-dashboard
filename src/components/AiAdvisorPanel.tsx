import React from 'react';
import { Cpu, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';
import { AIAnalysisSummary } from '../types';

interface AiAdvisorPanelProps {
  analysis: AIAnalysisSummary;
}

export const AiAdvisorPanel: React.FC<AiAdvisorPanelProps> = ({ analysis }) => {
  const isDanger = analysis.status === 'DANGER';
  const isWarning = analysis.status === 'WARNING';

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title-group">
          <Cpu size={18} color="#06b6d4" />
          <h2 className="panel-title">Local Rule-Based Geotechnical Advisory</h2>
        </div>
        <span className="panel-badge" title="Heuristic dashboard summary; backend risk and alerts are authoritative">
          LOCAL HEURISTIC · {analysis.subsidenceVelocityDegPerHr.toFixed(2)}°/hr
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {/* Status Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: isDanger ? 'rgba(239, 68, 68, 0.15)' : isWarning ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.12)',
            border: `1px solid ${isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981'}`,
          }}
        >
          {isDanger ? (
            <ShieldAlert size={20} color="#ef4444" />
          ) : isWarning ? (
            <AlertTriangle size={20} color="#f59e0b" />
          ) : (
            <CheckCircle size={20} color="#10b981" />
          )}
          <span style={{ fontFamily: 'Chakra Petch', fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
            {analysis.headline}
          </span>
        </div>

        {/* Geotechnical Interpretation */}
        <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
          {analysis.geotechnicalInterpretation}
        </p>

        {/* Primary Risk Drivers */}
        <div style={{ background: 'rgba(10, 14, 26, 0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.75rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Identified Risk Contributors:
          </div>
          <ul style={{ listStyleType: 'disc', paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {analysis.primaryRiskDrivers.map((driver, idx) => (
              <li key={idx}>{driver}</li>
            ))}
          </ul>
        </div>

        {/* Action Recommendations */}
        <div style={{ background: 'rgba(10, 14, 26, 0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.75rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#38bdf8', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Recommended Mine Action Plan:
          </div>
          <ul style={{ listStyleType: 'circle', paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {analysis.recommendedAction.map((action, idx) => (
              <li key={idx}>{action}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
