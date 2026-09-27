import React from 'react';
import { Sliders, Zap, Shield, Flame, Activity } from 'lucide-react';
import { DemoScenario, NodeData } from '../types';

interface SimulationLabProps {
  nodes: NodeData[];
  onSelectScenario: (scenario: DemoScenario) => void;
  onUpdateParam: (nodeIndex: number, field: keyof NodeData, val: number) => void;
  simulationRunning: boolean;
  selectedScenario: DemoScenario;
  onStopSimulation: () => void;
  onResetSimulation: () => void;
}

export const SimulationLab: React.FC<SimulationLabProps> = ({
  nodes,
  onSelectScenario,
  onUpdateParam,
  simulationRunning,
  selectedScenario,
  onStopSimulation,
  onResetSimulation,
}) => {
  const node2 = nodes[1] || { gas_ppm_equiv: 8500 };
  const node3 = nodes[2] || { tilt_deg: 3.5, load_kg: 6.0 };

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title-group">
          <Sliders size={18} color="#06b6d4" />
          <h2 className="panel-title">Interactive Anomaly Injection & Demo Lab</h2>
        </div>
        <span className="panel-badge">LIVE STRESS SIMULATOR</span>
      </div>

      <div className="sim-controls-wrapper">
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'JetBrains Mono' }}>
          DEMO PRESETS:
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', margin: '0.5rem 0' }}>
          <label htmlFor="subsidence-scenario" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>BACKEND SCENARIO</label>
          <select id="subsidence-scenario" className="btn-action" value={selectedScenario}
            onChange={(event) => onSelectScenario(event.target.value as DemoScenario)}>
            <option value="DEFAULT_DEMO">Five minute progression</option>
            <option value="NORMAL_OPERATION">Normal operation</option>
            <option value="ISOLATED_SENSOR_ANOMALY">Isolated sensor anomaly</option>
            <option value="GRADUAL_SUBSIDENCE">Gradual subsidence</option>
            <option value="RAPID_SUBSIDENCE">Rapid subsidence</option>
            <option value="PROGRESSIVE_TILT">Progressive tilt</option>
            <option value="CRACK_GROWTH">Crack growth</option>
            <option value="VIBRATION_INCREASE">Vibration increase</option>
            <option value="MULTI_NODE_DEFORMATION">Multi-node deformation</option>
            <option value="GATEWAY_FAILURE">Gateway failure</option>
            <option value="SENSOR_FAILURE">Sensor failure</option>
            <option value="COMMUNICATION_LOSS">Communication loss</option>
            <option value="RECOVERY">Incident recovery</option>
            <option value="ENVIRONMENTAL_DISTURBANCE">Environmental disturbance</option>
            <option value="SIMULTANEOUS_CRITICAL">Simultaneous critical nodes</option>
            <option value="MIXED_RISK">Mixed-risk network</option>
            <option value="ROCKBURST_SUBSIDENCE">Rockburst subsidence</option>
            <option value="METHANE_OUTBURST">Methane outburst</option>
          </select>
          <button className="btn-action" onClick={onStopSimulation} disabled={!simulationRunning}>Stop</button>
          <button className="btn-action" onClick={onResetSimulation}>Reset &amp; restart selected</button>
          <span aria-live="polite" style={{ fontSize: '0.68rem', color: simulationRunning ? '#34d399' : '#fbbf24' }}>
            {simulationRunning ? 'BACKEND SIMULATOR RUNNING' : 'SIMULATOR STOPPED'}
          </span>
        </div>

        <div className="preset-scenario-buttons">
          <button
            className="btn-scenario active"
            onClick={() => onSelectScenario('DEFAULT_DEMO')}
            title="Node 3 Critical (5 Warnings), Node 2 Warning Gas"
          >
            <Zap size={14} color="#f59e0b" />
            ⚡ Default Demo (Node 3 Critical)
          </button>

          <button
            className="btn-scenario"
            onClick={() => onSelectScenario('ROCKBURST_SUBSIDENCE')}
            title="Catastrophic tilt and load on Node 1"
          >
            <Activity size={14} color="#ef4444" />
            💥 Rockburst Subsidence (Node 1)
          </button>

          <button
            className="btn-scenario"
            onClick={() => onSelectScenario('METHANE_OUTBURST')}
            title="Toxic gas surge on Node 2"
          >
            <Flame size={14} color="#f59e0b" />
            ⚠️ Methane Outburst (Node 2)
          </button>

          <button
            className="btn-scenario"
            onClick={() => onSelectScenario('ALL_CLEAR_SAFE')}
            title="Restores all 5 nodes to safe baseline"
          >
            <Shield size={14} color="#10b981" />
            🛡️ All Clear (All Nodes Safe)
          </button>
        </div>

        {/* Sliders Grid */}
        <div className="interactive-slider-grid">
          {/* Node 3 Tilt Slider */}
          <div className="slider-group">
            <div className="slider-label-row">
              <span>NODE-3 TILT (°):</span>
              <span className="slider-val-tag">{node3.tilt_deg.toFixed(1)}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={8}
              step={0.1}
              value={node3.tilt_deg}
              onChange={(e) => onUpdateParam(2, 'tilt_deg', parseFloat(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#64748b' }}>
              <span>0° (Safe)</span>
              <span>3° (Warn)</span>
              <span>5° (Crit)</span>
            </div>
          </div>

          {/* Node 2 Gas Slider */}
          <div className="slider-group">
            <div className="slider-label-row">
              <span>NODE-2 GAS (PPM-EQ):</span>
              <span className="slider-val-tag">{node2.gas_ppm_equiv.toFixed(0)} PPM</span>
            </div>
            <input
              type="range"
              min={500}
              max={15000}
              step={100}
              value={node2.gas_ppm_equiv}
              onChange={(e) => onUpdateParam(1, 'gas_ppm_equiv', parseFloat(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#64748b' }}>
              <span>500 (Clean)</span>
              <span>7,500 (Warn)</span>
              <span>12,500 (Crit)</span>
            </div>
          </div>

          {/* Node 3 Load Slider */}
          <div className="slider-group">
            <div className="slider-label-row">
              <span>NODE-3 ROOF LOAD (KG):</span>
              <span className="slider-val-tag">{node3.load_kg.toFixed(1)} kg</span>
            </div>
            <input
              type="range"
              min={0}
              max={15}
              step={0.2}
              value={node3.load_kg}
              onChange={(e) => onUpdateParam(2, 'load_kg', parseFloat(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#64748b' }}>
              <span>0 kg (Nominal)</span>
              <span>5 kg (Warn)</span>
              <span>10 kg (Crit)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
