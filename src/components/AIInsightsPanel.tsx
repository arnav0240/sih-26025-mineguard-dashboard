/**
 * AIInsightsPanel — MineGuard AI-Powered Risk Intelligence Panel
 *
 * Displays persisted backend Isolation Forest + fused structural risk output.
 * Browser heuristics are deliberately not substituted for backend results.
 *
 * PROTOTYPE AI ANALYSIS — Requires field validation before operational deployment.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  Brain,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Info,
  CheckCircle,
  Activity,
  Zap,
  Server,
  RefreshCw,
} from 'lucide-react';
import {
  NetworkAIAnalysis,
  NodeAIAnalysis,
  AIRiskLevel,
  AITrend,
  BackendAIResponse,
  BackendNodeAssessment,
  BackendRiskAssessment,
} from '../types';
import { backendAIService } from '../services/backendAIService';

// ============================================================
// Props
// ============================================================
interface AIInsightsPanelProps {
  networkAnalysis: NetworkAIAnalysis | null;
  selectedNodeId: string;
  onSelectNode?: (lat: number, lon: number, nodeId: string) => void;
}

// ============================================================
// Color helpers (shared)
// ============================================================
const RISK_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  moderate: '#f59e0b',
  medium: '#f59e0b',
  low: '#10b981',
  nominal: '#10b981',
  safe: '#10b981',
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MODERATE: '#f59e0b',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
  NOMINAL: '#10b981',
  SAFE: '#10b981',
};

const RISK_BG: Record<string, string> = {
  critical: 'rgba(239,68,68,0.14)',
  high: 'rgba(249,115,22,0.14)',
  moderate: 'rgba(245,158,11,0.12)',
  medium: 'rgba(245,158,11,0.12)',
  low: 'rgba(16,185,129,0.12)',
  nominal: 'rgba(16,185,129,0.10)',
  safe: 'rgba(16,185,129,0.10)',
  CRITICAL: 'rgba(239,68,68,0.14)',
  HIGH: 'rgba(249,115,22,0.14)',
  MODERATE: 'rgba(245,158,11,0.12)',
  MEDIUM: 'rgba(245,158,11,0.12)',
  LOW: 'rgba(16,185,129,0.12)',
  NOMINAL: 'rgba(16,185,129,0.10)',
  SAFE: 'rgba(16,185,129,0.10)',
};

function riskColor(level: string): string {
  return RISK_COLOR[level] ?? '#38bdf8';
}
function riskBg(level: string): string {
  return RISK_BG[level] ?? 'rgba(56,189,248,0.1)';
}

const renderTrendIcon = (trend: AITrend) => {
  switch (trend) {
    case 'INCREASING': return <TrendingUp size={16} color="#ef4444" />;
    case 'DECREASING': return <TrendingDown size={16} color="#10b981" />;
    default: return <Minus size={16} color="#94a3b8" />;
  }
};

// ============================================================
// ScoreBar — animated horizontal bar
// ============================================================
function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
      <div
        style={{
          width: `${Math.min(100, value * 100)}%`,
          height: '100%',
          background: color,
          transition: 'width 0.5s ease',
          borderRadius: '3px',
        }}
      />
    </div>
  );
}

// ============================================================
// BackendAssessmentCard — per-node ML assessment detail
// ============================================================
function BackendAssessmentCard({ assessment }: { assessment: BackendRiskAssessment }) {
  const level = assessment.risk_level;
  const color = riskColor(level);
  const bg = riskBg(level);

  return (
    <div style={{
      background: 'rgba(10,14,26,0.90)',
      border: `1px solid ${color}40`,
      borderRadius: '10px',
      padding: '1rem',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'Chakra Petch', color: '#f8fafc' }}>
            {assessment.node_id}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 8px', borderRadius: '4px',
            fontSize: '0.72rem', fontFamily: 'JetBrains Mono', fontWeight: 700,
            background: bg, color, border: `1px solid ${color}`,
          }}>
            {assessment.ai_score > 0.5
              ? <><ShieldAlert size={12} /> ML ANOMALY: DETECTED</>
              : <><ShieldCheck size={12} /> ML STATUS: NOMINAL</>}
          </span>
          <span style={{
            padding: '3px 8px', borderRadius: '4px',
            fontSize: '0.72rem', fontFamily: 'JetBrains Mono', fontWeight: 700,
            background: bg, color,
          }}>
            RISK: {level.toUpperCase()}
          </span>
        </div>
        <div style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono', color: '#64748b' }}>
          {assessment.timestamp ? new Date(assessment.timestamp).toLocaleTimeString() : '—'}
        </div>
      </div>

      {/* Composite score bar */}
      <div style={{ marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
          <span style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono', color: '#94a3b8', minWidth: '130px' }}>
            COMPOSITE SCORE
          </span>
          <ScoreBar value={assessment.composite_score} color={color} />
          <span style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', fontWeight: 700, color, minWidth: '42px', textAlign: 'right' }}>
            {(assessment.composite_score * 100).toFixed(0)}%
          </span>
        </div>

        {/* Component sub-scores */}
        {[
          { label: 'AI Anomaly', val: assessment.ai_score, key: 'ai' },
          { label: 'Rule-Based', val: assessment.rule_score, key: 'rule' },
          { label: 'Trend', val: assessment.trend_score, key: 'trend' },
          { label: 'Sensor Health', val: assessment.sensor_health_score, key: 'health' },
        ].map(({ label, val, key }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', color: '#64748b', minWidth: '130px' }}>
              {label.toUpperCase()}
            </span>
            <ScoreBar value={val} color={val > 0.6 ? '#ef4444' : val > 0.35 ? '#f59e0b' : '#38bdf8'} />
            <span style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', color: '#94a3b8', minWidth: '42px', textAlign: 'right' }}>
              {(val * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      {/* Two-column: factors + actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
        {/* Factors */}
        <div style={{
          background: 'rgba(15,23,42,0.5)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '8px', padding: '0.7rem',
        }}>
          <div style={{ fontSize: '0.68rem', fontFamily: 'JetBrains Mono', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <AlertTriangle size={12} color="#f59e0b" />
            Contributing Factors
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.78rem', color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {(assessment.contributing_factors ?? []).map((f, i) => (
              <li key={i} style={{ lineHeight: '1.4', color: f.startsWith('[CRITICAL]') ? '#ef4444' : f.startsWith('[WARNING]') ? '#f97316' : '#e2e8f0' }}>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Recommended Actions */}
        <div style={{
          background: 'rgba(15,23,42,0.5)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '8px', padding: '0.7rem',
        }}>
          <div style={{ fontSize: '0.68rem', fontFamily: 'JetBrains Mono', color: '#38bdf8', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <CheckCircle size={12} color="#38bdf8" />
            Recommended Actions
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.78rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {(assessment.recommended_actions ?? []).map((a, i) => (
              <li key={i} style={{ lineHeight: '1.4' }}>{a}</li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ marginTop: '0.6rem', fontSize: '0.67rem', color: '#475569', fontStyle: 'italic' }}>
        {assessment.disclaimer}
      </div>
    </div>
  );
}

// ============================================================
// BackendAISection — network overview + selected node card
// ============================================================
function BackendAISection({
  data,
  selectedNodeId,
  onRefresh,
  refreshing,
}: {
  data: BackendAIResponse;
  selectedNodeId: string;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const summary = data.network_summary;
  const assessmentMap: Record<string, BackendNodeAssessment> = {};
  data.node_assessments.forEach(na => { assessmentMap[na.node_id] = na; });

  // Pick the displayed node
  const displayed: BackendNodeAssessment | undefined =
    assessmentMap[selectedNodeId] ??
    (summary.critical_nodes[0] ? assessmentMap[summary.critical_nodes[0]] : undefined) ??
    data.node_assessments[0];

  const overallColor = riskColor(summary.overall_status);

  return (
    <div>
      {/* Subheader */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Server size={13} color="#38bdf8" />
          <span style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono', color: '#64748b', textTransform: 'uppercase' }}>
            Isolation Forest · Unified Risk Engine · Live Backend
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.68rem', fontFamily: 'JetBrains Mono', color: '#475569' }}>
            {new Date(data.generated_at).toLocaleTimeString()}
          </span>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            style={{
              background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)',
              color: '#38bdf8', borderRadius: '5px', padding: '3px 8px',
              fontSize: '0.68rem', fontFamily: 'JetBrains Mono', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px',
              opacity: refreshing ? 0.5 : 1,
            }}
          >
            <RefreshCw size={11} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            REFRESH
          </button>
        </div>
      </div>

      {/* Network KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.65rem', marginBottom: '0.85rem' }}>
        {[
          {
            label: 'Network Status',
            value: summary.overall_status,
            valueColor: overallColor,
            valueFn: (v: string) => v,
          },
          {
            label: 'Peak ML Score',
            value: `${(summary.max_composite_score * 100).toFixed(0)}%`,
            valueColor: summary.max_composite_score > 0.7 ? '#ef4444' : summary.max_composite_score > 0.4 ? '#f59e0b' : '#10b981',
            extra: <ScoreBar value={summary.max_composite_score} color={riskColor(summary.overall_status)} />,
          },
          {
            label: 'Critical Nodes',
            value: summary.critical_nodes.length > 0 ? summary.critical_nodes.join(', ') : 'NONE',
            valueColor: summary.critical_nodes.length > 0 ? '#ef4444' : '#10b981',
          },
          {
            label: 'Nodes Assessed',
            value: `${summary.node_count}`,
            valueColor: '#38bdf8',
          },
        ].map((m, i) => (
          <div key={i} style={{
            background: 'rgba(15,23,42,0.65)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '8px', padding: '0.6rem 0.8rem',
          }}>
            <div style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              {m.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'Chakra Petch', color: m.valueColor }}>
                {m.value}
              </span>
              {m.extra}
            </div>
          </div>
        ))}
      </div>

      {/* Selected node detail */}
      {displayed && (
        <BackendAssessmentCard assessment={displayed.assessment} />
      )}
    </div>
  );
}

// ============================================================
// LegacyAISection — original rule-based frontend analysis
// ============================================================
function LegacyAISection({
  networkAnalysis,
  selectedNodeId,
}: {
  networkAnalysis: NetworkAIAnalysis;
  selectedNodeId: string;
}) {
  const nodeAnalysis: NodeAIAnalysis | undefined =
    networkAnalysis.node_analyses[selectedNodeId] ??
    (networkAnalysis.most_concerning_node
      ? networkAnalysis.node_analyses[networkAnalysis.most_concerning_node]
      : Object.values(networkAnalysis.node_analyses)[0]);

  const networkRisk = networkAnalysis.overall_network_risk;
  const activeColor = nodeAnalysis ? riskColor(nodeAnalysis.risk_level) : '#38bdf8';
  const activeBg = nodeAnalysis ? riskBg(nodeAnalysis.risk_level) : 'rgba(56,189,248,0.1)';

  return (
    <div>
      {/* Subheader */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
        <Activity size={13} color="#c084fc" />
        <span style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono', color: '#64748b', textTransform: 'uppercase' }}>
          Rule-Based Frontend Advisor · Baseline Reference
        </span>
      </div>

      {/* Network overview row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem', marginBottom: '0.85rem' }}>
        {[
          {
            label: 'Top Priority Node',
            value: networkAnalysis.most_concerning_node || 'NONE',
            sub: networkAnalysis.most_concerning_node ? `(${networkRisk})` : '',
            subColor: riskColor(networkRisk),
          },
          {
            label: 'Active Anomalies',
            value: `${networkAnalysis.anomalous_node_count} / ${Object.keys(networkAnalysis.node_analyses).length} NODES`,
            valueColor: networkAnalysis.anomalous_node_count > 0 ? '#ef4444' : '#10b981',
          },
          {
            label: 'Peak Anomaly Score',
            value: `${(networkAnalysis.highest_anomaly_score * 100).toFixed(0)}%`,
            extra: <ScoreBar value={networkAnalysis.highest_anomaly_score} color={riskColor(networkRisk)} />,
          },
        ].map((m, i) => (
          <div key={i} style={{
            background: 'rgba(15,23,42,0.65)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '8px', padding: '0.6rem 0.8rem',
          }}>
            <div style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              {m.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'Chakra Petch', color: m.valueColor ?? '#f8fafc' }}>
                {m.value}
              </span>
              {m.sub && <span style={{ fontSize: '0.72rem', color: m.subColor, fontWeight: 600 }}>({m.sub})</span>}
              {m.extra}
            </div>
          </div>
        ))}
      </div>

      {/* Node detail */}
      {nodeAnalysis && (
        <div style={{
          background: 'rgba(10,14,26,0.85)',
          border: `1px solid ${activeColor}40`,
          borderRadius: '10px', padding: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.7rem', marginBottom: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'Chakra Petch', color: '#fff' }}>
                {nodeAnalysis.node_id}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontFamily: 'JetBrains Mono', fontWeight: 700, background: activeBg, color: activeColor, border: `1px solid ${activeColor}` }}>
                {nodeAnalysis.anomaly_detected ? <><ShieldAlert size={12} /> ANOMALY: DETECTED</> : <><ShieldCheck size={12} /> STATUS: NOMINAL</>}
              </span>
              <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontFamily: 'JetBrains Mono', fontWeight: 700, background: activeBg, color: activeColor }}>
                RISK: {nodeAnalysis.risk_level}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.72rem', fontFamily: 'JetBrains Mono' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                <span>ANOMALY SCORE:</span>
                <strong style={{ color: activeColor }}>{(nodeAnalysis.anomaly_score * 100).toFixed(0)}%</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                <span>TREND:</span>
                {renderTrendIcon(nodeAnalysis.trend)}
                <strong style={{ color: '#e2e8f0' }}>{nodeAnalysis.trend}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.7rem' }}>
              <div style={{ fontSize: '0.68rem', fontFamily: 'JetBrains Mono', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <AlertTriangle size={12} color="#f59e0b" />
                Contributing Sensor Factors:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.78rem', color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {nodeAnalysis.contributing_factors.map((f, i) => <li key={i} style={{ lineHeight: '1.4' }}>{f}</li>)}
              </ul>
            </div>
            <div style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.7rem' }}>
              <div style={{ fontSize: '0.68rem', fontFamily: 'JetBrains Mono', color: '#38bdf8', textTransform: 'uppercase', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle size={12} color="#38bdf8" />
                Recommended Action:
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.45' }}>
                {nodeAnalysis.recommendation}
              </p>
              {nodeAnalysis.metrics_analyzed && (
                <div style={{ marginTop: '0.65rem', paddingTop: '0.45rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', gap: '0.7rem', fontSize: '0.65rem', fontFamily: 'JetBrains Mono', color: '#64748b' }}>
                  <span>TILT: {nodeAnalysis.metrics_analyzed.tilt_deg.toFixed(2)}°</span>
                  <span>LOAD: {nodeAnalysis.metrics_analyzed.load_kg.toFixed(2)} kg</span>
                  <span>GAS: {nodeAnalysis.metrics_analyzed.gas_ppm_equiv.toFixed(0)} ppm</span>
                  <span>TEMP: {nodeAnalysis.metrics_analyzed.temperature.toFixed(1)}°C</span>
                  <span>BATT: {nodeAnalysis.metrics_analyzed.battery_percent}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main AIInsightsPanel
// ============================================================
export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  networkAnalysis,
  selectedNodeId,
}) => {
  const [backendData, setBackendData] = useState<BackendAIResponse | null>(null);
  const [backendError, setBackendError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'backend' | 'legacy'>('backend');

  // Subscribe to backend AI service
  useEffect(() => {
    const unsub = backendAIService.subscribe(data => {
      setBackendData(data);
      setBackendError(false);
    });
    const unsuberr = backendAIService.onError(() => {
      setBackendError(true);
    });
    return () => { unsub(); unsuberr(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const data = await backendAIService.fetchNetworkAssessment();
    if (data) { setBackendData(data); setBackendError(false); }
    else setBackendError(true);
    setRefreshing(false);
  }, []);

  const hasBackend = !!backendData;
  // Do not substitute browser-side heuristics for the persisted backend result.
  const hasLegacy = false;

  // If neither is available
  if (!hasBackend && !hasLegacy) {
    return (
      <div className="panel-card" style={{ border: '1px dashed #475569' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#94a3b8' }}>
          <Info size={18} />
          <span>Backend risk assessment is unavailable. This panel will show persisted telemetry analysis when FastAPI is connected; browser heuristics are not presented as AI results.</span>
        </div>
      </div>
    );
  }

  // Resolve which tab to actually show
  const showTab = activeTab === 'backend' && hasBackend ? 'backend' : hasLegacy ? 'legacy' : 'backend';

  // Determine network-level risk for header badge
  const networkRiskLabel = hasBackend
    ? (backendData!.network_summary.overall_status)
    : (networkAnalysis?.overall_network_risk ?? 'SAFE');

  return (
    <div className="panel-card" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* === Panel Header === */}
      <div className="panel-header" style={{ marginBottom: '0.9rem' }}>
        <div className="panel-title-group">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(6,182,212,0.25))', border: '1px solid rgba(168,85,247,0.5)' }}>
            <Brain size={18} color="#c084fc" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="panel-title" style={{ margin: 0 }}>
                AI-Powered Subsidence & Anomaly Intelligence
              </h2>
              <span style={{ fontSize: '0.62rem', fontFamily: 'JetBrains Mono', fontWeight: 700, textTransform: 'uppercase', padding: '2px 7px', borderRadius: '4px', background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', color: '#d8b4fe', letterSpacing: '0.04em' }}>
                PROTOTYPE AI ASSESSMENT
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className="panel-badge" style={{ background: riskBg(networkRiskLabel), borderColor: riskColor(networkRiskLabel), color: riskColor(networkRiskLabel), display: 'flex', alignItems: 'center', gap: '4px' }}>
            NETWORK RISK: {networkRiskLabel}
          </span>
          {backendError && (
            <span style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', color: '#64748b', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '2px 7px', borderRadius: '4px' }}>
              BACKEND OFFLINE
            </span>
          )}
        </div>
      </div>

      {/* === Tab switcher (only show if both layers are available) === */}
      {hasBackend && hasLegacy && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem' }}>
          {[
            { key: 'backend', label: 'ML Risk Engine', icon: <Zap size={12} />, available: hasBackend },
            { key: 'legacy', label: 'Rule Advisor', icon: <Activity size={12} />, available: hasLegacy },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'backend' | 'legacy')}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 12px', borderRadius: '6px', cursor: 'pointer',
                fontSize: '0.7rem', fontFamily: 'JetBrains Mono', fontWeight: 600,
                border: activeTab === tab.key
                  ? '1px solid rgba(56,189,248,0.6)'
                  : '1px solid rgba(255,255,255,0.1)',
                background: activeTab === tab.key
                  ? 'rgba(56,189,248,0.15)'
                  : 'rgba(15,23,42,0.5)',
                color: activeTab === tab.key ? '#38bdf8' : '#64748b',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* === Tab Content === */}
      {showTab === 'backend' && backendData && (
        <BackendAISection
          data={backendData}
          selectedNodeId={selectedNodeId}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      )}
      {showTab === 'legacy' && networkAnalysis && (
        <LegacyAISection
          networkAnalysis={networkAnalysis}
          selectedNodeId={selectedNodeId}
        />
      )}

      {/* === Footer disclaimer === */}
      <div style={{ marginTop: '0.85rem', fontSize: '0.72rem', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span style={{ fontStyle: 'italic' }}>
          * Backend prototype assessment uses persisted telemetry. Anomaly evidence is not proof of structural failure and is not a certified safety system.
        </span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.67rem', color: '#374151' }}>
          Modular engine — LSTM / GNN ready
        </span>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AIInsightsPanel;
