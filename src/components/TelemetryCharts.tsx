import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';
import {
  TrendingUp,
  Flame,
  Activity,
  ShieldAlert,
  Clock,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Radio,
  BatteryCharging,
  Cpu,
} from 'lucide-react';
import { NodeData } from '../types';

Chart.register(...registerables);

interface TelemetryChartsProps {
  nodes: NodeData[];
  selectedNodeId?: string | null;
  onSelectNode?: (lat: number, lon: number, nodeId: string) => void;
}

interface HistoricalPoint {
  timestamp: string | null;
  time_label: string;
  tilt_deg: number;
  tilt_x: number;
  tilt_y: number;
  vibration_rms: number;
  displacement_mm: number;
  risk_score: number;
  load_kg: number;
  gas_ppm_equiv: number;
  temperature: number;
  crack_sensor_state: string;
  battery_percent: number;
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
}) => {
  // Chart Canvas Refs
  const tiltCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gasTempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const geoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const riskCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Chart Instances
  const tiltChartRef = useRef<Chart | null>(null);
  const gasTempChartRef = useRef<Chart | null>(null);
  const geoChartRef = useRef<Chart | null>(null);
  const riskChartRef = useRef<Chart | null>(null);

  // State
  const [timeWindow, setTimeWindow] = useState<'1m' | '5m' | '15m' | '1h'>('15m');
  const [activeStation, setActiveStation] = useState<string>(selectedNodeId || 'NODE-3');
  const [historySeries, setHistorySeries] = useState<HistoricalPoint[]>([]);
  const [sliderIndex, setSliderIndex] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);

  // Live buffer ref for multi-node live line charts
  const historyRef = useRef<{
    labels: string[];
    tilts: { [key: string]: number[] };
    maxGas: number[];
    maxTemp: number[];
  }>({
    labels: [],
    tilts: { 'NODE-1': [], 'NODE-2': [], 'NODE-3': [], 'NODE-4': [], 'NODE-5': [] },
    maxGas: [],
    maxTemp: [],
  });

  // Sync activeStation with selectedNodeId from parent if changed
  useEffect(() => {
    if (selectedNodeId) {
      setActiveStation(selectedNodeId);
    }
  }, [selectedNodeId]);

  // Fetch backend historical time-series for the selected node
  const fetchHistoricalData = useCallback(async () => {
    try {
      const res = await fetch(`/backend/api/readings/${activeStation}/history?window=${timeWindow}&limit=60`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.series)) {
        setHistorySeries(data.series);
        if (!isScrubbing && data.series.length > 0) {
          setSliderIndex(data.series.length - 1);
        }
      }
    } catch {
      // Backend not yet reached or offline
    }
  }, [activeStation, timeWindow, isScrubbing]);

  useEffect(() => {
    fetchHistoricalData();
    const interval = setInterval(fetchHistoricalData, 6000);
    return () => clearInterval(interval);
  }, [fetchHistoricalData]);

  // Initialize all 4 charts
  useEffect(() => {
    if (!tiltCanvasRef.current || !gasTempCanvasRef.current || !geoCanvasRef.current || !riskCanvasRef.current) return;

    const commonScales = {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 9 } },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } },
      },
    };

    // 1. Tilt Chart (Multi-node live)
    tiltChartRef.current = new Chart(tiltCanvasRef.current, {
      type: 'line',
      data: {
        labels: historyRef.current.labels,
        datasets: [
          { label: 'NODE-1 Tilt (°)', data: historyRef.current.tilts['NODE-1'], borderColor: '#10b981', tension: 0.3, borderWidth: 1.5, pointRadius: 1 },
          { label: 'NODE-2 Tilt (°)', data: historyRef.current.tilts['NODE-2'], borderColor: '#38bdf8', tension: 0.3, borderWidth: 1.5, pointRadius: 1 },
          { label: 'NODE-3 Tilt (° - CRITICAL ZONE)', data: historyRef.current.tilts['NODE-3'], borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.12)', tension: 0.3, borderWidth: 2.5, pointRadius: 3 },
          { label: 'NODE-4 Tilt (°)', data: historyRef.current.tilts['NODE-4'], borderColor: '#8b5cf6', tension: 0.3, borderWidth: 1.5, pointRadius: 1 },
          { label: 'NODE-5 Tilt (°)', data: historyRef.current.tilts['NODE-5'], borderColor: '#06b6d4', tension: 0.3, borderWidth: 1.5, pointRadius: 1 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
          legend: { position: 'top', labels: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } } },
        },
        scales: {
          ...commonScales,
          y: {
            ...commonScales.y,
            title: { display: true, text: 'Tilt (Degrees)', color: '#94a3b8' },
            suggestedMin: 0,
            suggestedMax: 6,
          },
        },
      },
    });

    // 2. Gas & Temp Chart
    gasTempChartRef.current = new Chart(gasTempCanvasRef.current, {
      type: 'line',
      data: {
        labels: historyRef.current.labels,
        datasets: [
          { label: 'Peak Gas (ppm-equiv)', data: historyRef.current.maxGas, borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', yAxisID: 'yGas', tension: 0.3, borderWidth: 2, pointRadius: 2 },
          { label: 'Peak Temp (°C)', data: historyRef.current.maxTemp, borderColor: '#ec4899', yAxisID: 'yTemp', tension: 0.3, borderWidth: 2, borderDash: [5, 5], pointRadius: 2 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
          legend: { position: 'top', labels: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } } },
        },
        scales: {
          x: commonScales.x,
          yGas: {
            type: 'linear', position: 'left', grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#f59e0b' },
            title: { display: true, text: 'Gas (ppm)', color: '#f59e0b' }, suggestedMin: 0, suggestedMax: 15000,
          },
          yTemp: {
            type: 'linear', position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#ec4899' },
            title: { display: true, text: 'Temp (°C)', color: '#ec4899' }, suggestedMin: 20, suggestedMax: 50,
          },
        },
      },
    });

    // 3. Geotechnical Subsidence Chart (Vibration RMS vs Displacement mm)
    geoChartRef.current = new Chart(geoCanvasRef.current, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { label: 'Displacement (mm)', data: [], borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.12)', yAxisID: 'yDisp', tension: 0.3, borderWidth: 2.2, pointRadius: 3 },
          { label: 'Vibration RMS (g)', data: [], borderColor: '#a855f7', yAxisID: 'yVibe', tension: 0.3, borderWidth: 1.8, borderDash: [4, 4], pointRadius: 2 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        plugins: {
          legend: { position: 'top', labels: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } } },
        },
        scales: {
          x: commonScales.x,
          yDisp: {
            type: 'linear', position: 'left', grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#38bdf8' },
            title: { display: true, text: 'Displacement (mm)', color: '#38bdf8' }, suggestedMin: 0, suggestedMax: 6,
          },
          yVibe: {
            type: 'linear', position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#a855f7' },
            title: { display: true, text: 'Vibe RMS (g)', color: '#a855f7' }, suggestedMin: 0, suggestedMax: 3,
          },
        },
      },
    });

    // 4. Unified Risk & Anomaly Score Chart
    riskChartRef.current = new Chart(riskCanvasRef.current, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { label: 'Composite Risk Score (%)', data: [], borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.15)', tension: 0.3, borderWidth: 2.5, pointRadius: 3, fill: true },
          { label: 'Critical Threshold (70%)', data: [], borderColor: 'rgba(239, 68, 68, 0.5)', borderDash: [6, 6], borderWidth: 1.5, pointRadius: 0 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        plugins: {
          legend: { position: 'top', labels: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } } },
        },
        scales: {
          ...commonScales,
          y: {
            ...commonScales.y,
            title: { display: true, text: 'Risk Score (%)', color: '#94a3b8' },
            suggestedMin: 0,
            suggestedMax: 100,
          },
        },
      },
    });

    return () => {
      tiltChartRef.current?.destroy();
      gasTempChartRef.current?.destroy();
      geoChartRef.current?.destroy();
      riskChartRef.current?.destroy();
    };
  }, []);

  // Update live buffer for multi-node charts
  useEffect(() => {
    if (!nodes.length) return;
    const timeLabel = new Date().toLocaleTimeString().split(' ')[0];

    const hist = historyRef.current;
    if (hist.labels.length >= 50) {
      hist.labels.shift();
      Object.keys(hist.tilts).forEach((k) => hist.tilts[k].shift());
      hist.maxGas.shift();
      hist.maxTemp.shift();
    }

    hist.labels.push(timeLabel);

    let peakGas = 0;
    let peakTemp = 0;

    nodes.forEach((n) => {
      if (hist.tilts[n.node]) {
        hist.tilts[n.node].push(n.tilt_deg);
      }
      if (n.gas_ppm_equiv > peakGas) peakGas = n.gas_ppm_equiv;
      if (n.temperature > peakTemp) peakTemp = n.temperature;
    });

    hist.maxGas.push(peakGas);
    hist.maxTemp.push(peakTemp);

    tiltChartRef.current?.update('none');
    gasTempChartRef.current?.update('none');
  }, [nodes]);

  // Update single-node historical charts when historySeries changes
  useEffect(() => {
    if (!historySeries.length) return;

    const labels = historySeries.map((p) => p.time_label || p.timestamp?.slice(11, 19) || '');
    const disps = historySeries.map((p) => p.displacement_mm);
    const vibes = historySeries.map((p) => p.vibration_rms);
    const risks = historySeries.map((p) => p.risk_score > 1.0 ? p.risk_score : p.risk_score * 100.0);
    const thresholds = historySeries.map(() => 70);

    // Update Geo Chart
    if (geoChartRef.current) {
      geoChartRef.current.data.labels = labels;
      geoChartRef.current.data.datasets[0].data = disps;
      geoChartRef.current.data.datasets[1].data = vibes;
      geoChartRef.current.update('none');
    }

    // Update Risk Chart
    if (riskChartRef.current) {
      riskChartRef.current.data.labels = labels;
      riskChartRef.current.data.datasets[0].data = risks;
      riskChartRef.current.data.datasets[1].data = thresholds;
      riskChartRef.current.update('none');
    }
  }, [historySeries]);

  // Current inspected node from live nodes or scrubbed historical point
  const liveActiveNode = nodes.find((n) => n.node === activeStation) || nodes[0];
  const scrubbedPoint: HistoricalPoint | null =
    sliderIndex !== null && historySeries[sliderIndex] ? historySeries[sliderIndex] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ======================================================== */}
      {/* 1. Historical Time Slider & Station Selector Header Card */}
      {/* ======================================================== */}
      <div className="panel-card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={16} color="#38bdf8" />
            </div>
            <div>
              <h2 className="panel-title" style={{ margin: 0, fontSize: '1rem' }}>
                Historical Telemetry Inspector & Time Slider
              </h2>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'JetBrains Mono' }}>
                Scrub through historical strata deformation, risk index & displacement
              </span>
            </div>
          </div>

          {/* Time Window Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'JetBrains Mono', marginRight: '4px' }}>
              WINDOW:
            </span>
            {(['1m', '5m', '15m', '1h'] as const).map((w) => (
              <button
                key={w}
                className="btn-action"
                style={{
                  padding: '0.2rem 0.6rem',
                  fontSize: '0.72rem',
                  borderColor: timeWindow === w ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                  background: timeWindow === w ? 'rgba(56,189,248,0.2)' : 'rgba(15,23,42,0.5)',
                  color: timeWindow === w ? '#38bdf8' : '#94a3b8',
                  fontWeight: timeWindow === w ? 700 : 500,
                }}
                onClick={() => {
                  setTimeWindow(w);
                  setIsScrubbing(false);
                }}
              >
                {w.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Station Selectors Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'JetBrains Mono', minWidth: '100px' }}>
            SELECT NODE:
          </span>
          {nodes.map((node) => {
            const isSelected = node.node === activeStation;
            const isDanger = node.status === 'DANGER';
            const isWarning = node.status === 'WARNING';
            const color = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';

            return (
              <button
                key={node.node}
                onClick={() => {
                  setActiveStation(node.node);
                  setIsScrubbing(false);
                  if (onSelectNode) {
                    onSelectNode(node.latitude, node.longitude, node.node);
                  }
                }}
                style={{
                  background: isSelected ? 'rgba(14, 165, 233, 0.25)' : 'rgba(30, 41, 59, 0.5)',
                  border: `1.5px solid ${isSelected ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '6px',
                  padding: '0.25rem 0.65rem',
                  color: '#fff',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '0.75rem',
                  fontWeight: isSelected ? 800 : 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: isSelected ? '0 0 10px rgba(56,189,248,0.35)' : 'none',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                {node.node}
                {isDanger ? ' [CRITICAL]' : isWarning ? ' [WARN]' : ''}
              </button>
            );
          })}
        </div>

        {/* Interactive Slider Bar */}
        {historySeries.length > 1 && (
          <div style={{ background: 'rgba(10,14,26,0.7)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', fontSize: '0.72rem', fontFamily: 'JetBrains Mono' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={13} color="#38bdf8" />
                <span style={{ color: '#94a3b8' }}>TIMELINE SCRUBBER:</span>
                <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                  {scrubbedPoint?.time_label || 'LIVE'}
                </span>
                {isScrubbing && (
                  <span style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b', padding: '1px 6px', borderRadius: '4px', fontSize: '0.65rem' }}>
                    INSPECTING HISTORICAL SNAPSHOT
                  </span>
                )}
              </div>
              <button
                className="btn-action"
                style={{ padding: '1px 6px', fontSize: '0.65rem' }}
                onClick={() => {
                  setSliderIndex(historySeries.length - 1);
                  setIsScrubbing(false);
                }}
              >
                Jump to Live
              </button>
            </div>

            <input
              type="range"
              min={0}
              max={historySeries.length - 1}
              value={sliderIndex ?? historySeries.length - 1}
              onChange={(e) => {
                setSliderIndex(Number(e.target.value));
                setIsScrubbing(true);
              }}
              style={{
                width: '100%',
                cursor: 'pointer',
                accentColor: '#38bdf8',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontFamily: 'JetBrains Mono', color: '#64748b', marginTop: '3px' }}>
              <span>{historySeries[0]?.time_label || 'Start'}</span>
              <span>{historySeries[historySeries.length - 1]?.time_label || 'Now (Live)'}</span>
            </div>
          </div>
        )}

        {/* Selected Station Deep-Dive Metric Strip (Phase 12 Node Detail View) */}
        {liveActiveNode && (
          <div style={{ marginTop: '0.85rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
            {[
              {
                label: 'Status',
                val: scrubbedPoint ? (scrubbedPoint.risk_score > 0.65 ? 'DANGER' : scrubbedPoint.risk_score > 0.35 ? 'WARNING' : 'SAFE') : liveActiveNode.status,
                color: (scrubbedPoint ? scrubbedPoint.risk_score > 0.65 : liveActiveNode.status === 'DANGER') ? '#ef4444' : '#10b981',
              },
              {
                label: 'Tilt Angle',
                val: `${(scrubbedPoint?.tilt_deg ?? liveActiveNode.tilt_deg).toFixed(2)}°`,
                color: '#38bdf8',
              },
              {
                label: 'Displacement',
                val: `${(scrubbedPoint?.displacement_mm ?? (liveActiveNode.tilt_deg * 1.2)).toFixed(2)} mm`,
                color: '#a855f7',
              },
              {
                label: 'Vibration RMS',
                val: `${(scrubbedPoint?.vibration_rms ?? 0.25).toFixed(2)} g`,
                color: '#f59e0b',
              },
              {
                label: 'Roof Load',
                val: `${(scrubbedPoint?.load_kg ?? liveActiveNode.load_kg).toFixed(2)} kg`,
                color: '#cbd5e1',
              },
              {
                label: 'Crack Sensor',
                val: scrubbedPoint?.crack_sensor_state ? scrubbedPoint.crack_sensor_state.toUpperCase() : 'CLOSED',
                color: (scrubbedPoint?.crack_sensor_state === 'open') ? '#ef4444' : '#10b981',
              },
              {
                label: 'Battery',
                val: `${(scrubbedPoint?.battery_percent ?? liveActiveNode.battery_percent).toFixed(0)}%`,
                color: '#10b981',
              },
              {
                label: 'Mesh Hops',
                val: `${liveActiveNode.mesh_hop_count ?? 1} HOP(S)`,
                color: '#06b6d4',
              },
            ].map((m, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(15,23,42,0.6)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '6px',
                  padding: '0.45rem 0.65rem',
                }}
              >
                <div style={{ fontSize: '0.62rem', color: '#64748b', fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>
                  {m.label}
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: m.color, marginTop: '2px' }}>
                  {m.val}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. 4-Grid Charts Section (Tilt, Gas/Temp, Geo, Risk)     */}
      {/* ======================================================== */}
      <section className="charts-grid">
        {/* Chart 1: Multi-Node Subsidence Tilt */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title-group">
              <TrendingUp size={18} color="#ef4444" />
              <h2 className="panel-title">Multi-Node Subsidence Tilt Displacement Trend</h2>
            </div>
            <span className="panel-badge">MPU-6050 INCLINOMETERS</span>
          </div>
          <div className="chart-wrapper">
            <canvas ref={tiltCanvasRef} />
          </div>
        </div>

        {/* Chart 2: Geotechnical Subsidence Deformation (Displacement mm & Vibration RMS) */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title-group">
              <Activity size={18} color="#38bdf8" />
              <h2 className="panel-title">{activeStation}: Strata Displacement vs Vibration RMS</h2>
            </div>
            <span className="panel-badge" style={{ borderColor: 'rgba(56,189,248,0.4)', color: '#38bdf8' }}>
              GEOTECHNICAL STRAIN
            </span>
          </div>
          <div className="chart-wrapper">
            <canvas ref={geoCanvasRef} />
          </div>
        </div>

        {/* Chart 3: Fused Risk Score & AI Anomaly Index */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title-group">
              <ShieldAlert size={18} color="#ef4444" />
              <h2 className="panel-title">{activeStation}: Composite Risk Score vs Time</h2>
            </div>
            <span className="panel-badge" style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#fca5a5' }}>
              CRITICAL AT &ge;70%
            </span>
          </div>
          <div className="chart-wrapper">
            <canvas ref={riskCanvasRef} />
          </div>
        </div>

        {/* Chart 4: Gas Indicator vs Ambient Temperature */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title-group">
              <Flame size={18} color="#f59e0b" />
              <h2 className="panel-title">Gas Level Indicator (MQ-2) vs Ambient Temperature</h2>
            </div>
            <span className="panel-badge">ENVIRONMENTAL CORRELATION</span>
          </div>
          <div className="chart-wrapper">
            <canvas ref={gasTempCanvasRef} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default TelemetryCharts;
