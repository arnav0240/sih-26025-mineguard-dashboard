import React from 'react';
import { NodeData } from '../types';

interface TunnelSchematicProps {
  nodes: NodeData[];
  selectedNodeId: string | null;
  onSelectNode: (lat: number, lon: number, nodeId: string) => void;
}

export const TunnelSchematic: React.FC<TunnelSchematicProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
}) => {
  const selectedNode = nodes.find((n) => n.node === selectedNodeId) || nodes[2]; // Default to Node-3

  const positions = [
    { x: 12, y: 72, depth: '-120m', strata: 'Working Face (Seam)' }, // NODE-1
    { x: 30, y: 70, depth: '-110m', strata: 'Middle Haulage' }, // NODE-2
    { x: 48, y: 68, depth: '-105m', strata: 'Active Shear Fault Zone' }, // NODE-3
    { x: 68, y: 63, depth: '-75m', strata: 'Shale Drift Incline' }, // NODE-4
    { x: 90, y: 22, depth: '0m (Surface)', strata: 'Surface Portal / Gateway' }, // NODE-5
  ];

  const selectedIndex = nodes.findIndex((n) => n.node === selectedNode.node);
  const selectedPos = positions[selectedIndex >= 0 ? selectedIndex : 2];

  return (
    <div className="panel-card" style={{ overflow: 'hidden' }}>
      <div className="panel-header">
        <div className="panel-title-group">
          <span style={{ fontSize: '1.1rem' }}>⛏️</span>
          <h2 className="panel-title">Underground Strata Profile & Tunnel Incline</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className="panel-badge" style={{ color: '#38bdf8', borderColor: 'rgba(56,189,248,0.4)' }}>
            INTERLINKED WITH GIS SURFACE MAP
          </span>
          <span className="panel-badge">
            SELECTED: {selectedNode.node} ({selectedPos.depth})
          </span>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '380px',
          background: '#090d16',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* SVG Geological Strata & Tunnel Schematic */}
        <svg width="100%" height="100%" viewBox="0 0 900 380" preserveAspectRatio="none">
          <defs>
            <linearGradient id="overburdenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#292524" />
              <stop offset="50%" stopColor="#1c1917" />
              <stop offset="100%" stopColor="#0c0a09" />
            </linearGradient>

            <linearGradient id="coalSeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#020617" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            <pattern id="strataGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Grid */}
          <rect width="900" height="380" fill="url(#strataGrid)" />

          {/* Surface Ground Profile */}
          <path d="M 0 65 Q 300 55, 600 75 T 900 70 L 900 380 L 0 380 Z" fill="url(#overburdenGrad)" opacity="0.9" />

          {/* Strata Layers */}
          <path d="M 0 115 Q 400 105, 900 125" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" fill="none" />
          <text x="20" y="110" fill="#64748b" fontSize="10" fontFamily="JetBrains Mono">Overburden Sandstone (-30m)</text>

          <path d="M 0 180 Q 400 170, 900 190" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" fill="none" />
          <text x="20" y="175" fill="#64748b" fontSize="10" fontFamily="JetBrains Mono">Shale / Clay Aquitard Layer (-65m)</text>

          {/* Coal Seam / Mining Horizon */}
          <path d="M 0 230 Q 450 220, 900 235 L 900 320 L 0 315 Z" fill="url(#coalSeamGrad)" stroke="rgba(56,189,248,0.2)" />
          <text x="20" y="225" fill="#0ea5e9" fontSize="10" fontFamily="JetBrains Mono">Main Coal Seam / Working Horizon (-105m to -120m)</text>

          {/* Tunnel Gallery (Underground Shaft) */}
          <path
            d="M 60 275 L 220 270 L 420 262 L 640 252 L 810 135 L 835 85"
            stroke="#1e293b"
            strokeWidth="32"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 60 275 L 220 270 L 420 262 L 640 252 L 810 135 L 835 85"
            stroke="#020617"
            strokeWidth="24"
            strokeLinecap="round"
            fill="none"
          />

          {/* Roof Strata Support Props */}
          {[120, 270, 360, 480, 560, 680].map((x, i) => (
            <g key={i}>
              <line x1={x} y1={250} x2={x} y2={280} stroke="#475569" strokeWidth="3" />
              <rect x={x - 6} y={248} width={12} height={4} fill="#64748b" rx="1" />
              <rect x={x - 6} y={278} width={12} height={4} fill="#64748b" rx="1" />
            </g>
          ))}

          {/* Wireless LoRa Signal Propagation Line */}
          <path
            d="M 100 260 Q 260 245, 420 255 T 730 190 T 835 85"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeDasharray="6 6"
            fill="none"
            opacity="0.7"
          />

          {/* Node 3 Subsidence Fault / Shear Zone Warning Box */}
          <rect x="360" y="215" width="130" height="90" fill="rgba(239,68,68,0.12)" stroke="#ef4444" strokeDasharray="4 4" rx="4" />
          <text x="368" y="230" fill="#ef4444" fontSize="10" fontWeight="700" fontFamily="JetBrains Mono">SUBSIDENCE SHEAR ZONE</text>

          {/* Interlinked Vertical Ground Projection Borehole Laser from Surface to Selected Node */}
          {selectedPos && (
            <g>
              <line
                x1={`${selectedPos.x}%`}
                y1="65"
                x2={`${selectedPos.x}%`}
                y2={`${selectedPos.y}%`}
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="3 3"
                opacity="0.85"
              />
              <circle cx={`${selectedPos.x}%`} cy="65" r="4" fill="#38bdf8" />
              <text
                x={`${selectedPos.x}%`}
                y="55"
                textAnchor="middle"
                fill="#38bdf8"
                fontSize="9"
                fontFamily="JetBrains Mono"
                fontWeight="700"
              >
                SURFACE GPS
              </text>
            </g>
          )}
        </svg>

        {/* HTML Node Interactive Stations Overlay */}
        {nodes.map((node, index) => {
          const pos = positions[index] || { x: 50, y: 50, depth: '-100m', strata: '' };
          const isSelected = node.node === selectedNode.node;
          const isDanger = node.status === 'DANGER';
          const isWarning = node.status === 'WARNING';
          const color = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';

          return (
            <div
              key={node.node}
              style={{
                position: 'absolute',
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: isSelected ? 30 : 20,
              }}
              onClick={() => onSelectNode(node.latitude, node.longitude, node.node)}
              title={`Click to select & focus ${node.node} on both Surface Map and Subsurface Strata`}
            >
              {/* Radar pulse ring for selected, critical, or warning */}
              {(isSelected || isDanger || isWarning) && (
                <div
                  style={{
                    position: 'absolute',
                    width: isSelected ? '46px' : '38px',
                    height: isSelected ? '46px' : '38px',
                    borderRadius: '50%',
                    border: `2px solid ${isSelected ? '#38bdf8' : color}`,
                    animation: 'pulse-ring 1.8s infinite',
                    top: isSelected ? '-8px' : '-4px',
                    left: isSelected ? '-8px' : '-4px',
                  }}
                />
              )}

              {/* Station Circle */}
              <div
                style={{
                  width: isSelected ? '32px' : '26px',
                  height: isSelected ? '32px' : '26px',
                  borderRadius: '50%',
                  background: isSelected ? '#0ea5e9' : color,
                  border: isSelected ? '3px solid #ffffff' : '2px solid #ffffff',
                  boxShadow: `0 0 ${isSelected ? '20px' : '12px'} ${isSelected ? '#38bdf8' : color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontFamily: 'JetBrains Mono',
                  fontWeight: 800,
                  fontSize: isSelected ? '13px' : '11px',
                  transition: 'all 0.2s ease',
                }}
              >
                {node.node.replace('NODE-', '')}
              </div>

              {/* Station Tag */}
              <div
                style={{
                  background: isSelected ? 'rgba(14, 165, 233, 0.95)' : 'rgba(15, 23, 42, 0.95)',
                  border: `1px solid ${isSelected ? '#ffffff' : color}`,
                  borderRadius: '4px',
                  padding: '2px 6px',
                  marginTop: '4px',
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono',
                  fontWeight: 700,
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.8)',
                }}
              >
                {node.node}
              </div>

              {/* Depth Tag */}
              <div
                style={{
                  background: 'rgba(2, 6, 23, 0.9)',
                  borderRadius: '3px',
                  padding: '1px 5px',
                  fontSize: '9px',
                  fontFamily: 'JetBrains Mono',
                  color: '#94a3b8',
                  marginTop: '1px',
                }}
              >
                {pos.depth}
              </div>
            </div>
          );
        })}

        {/* Selected Node Live Telemetry HUD Card inside Strata View */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '8px',
            padding: '0.65rem 0.9rem',
            backdropFilter: 'blur(12px)',
            maxWidth: '280px',
            fontSize: '0.78rem',
            fontFamily: 'JetBrains Mono',
            boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
            zIndex: 40,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ color: '#38bdf8', fontWeight: 800 }}>{selectedNode.node} INTERLINK</span>
            <span
              style={{
                fontSize: '9px',
                padding: '1px 6px',
                borderRadius: '3px',
                fontWeight: 800,
                background:
                  selectedNode.status === 'DANGER'
                    ? '#ef4444'
                    : selectedNode.status === 'WARNING'
                    ? '#f59e0b'
                    : '#10b981',
                color: '#fff',
              }}
            >
              {selectedNode.status}
            </span>
          </div>
          <div style={{ color: '#cbd5e1', fontSize: '0.72rem' }}>Depth: {selectedPos.depth} • {selectedPos.strata}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '6px' }}>
            <div>Tilt: <strong style={{ color: '#fff' }}>{selectedNode.tilt_deg.toFixed(2)}°</strong></div>
            <div>Load: <strong style={{ color: '#fff' }}>{selectedNode.load_kg.toFixed(2)}kg</strong></div>
            <div>Gas: <strong style={{ color: '#fff' }}>{selectedNode.gas_ppm_equiv.toFixed(0)}ppm</strong></div>
            <div>Risk: <strong style={{ color: '#fff' }}>{selectedNode.risk_score}/100</strong></div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'JetBrains Mono' }}>
        <span>← Deep Gallery Face (-120m)</span>
        <span style={{ color: '#06b6d4' }}>
          💡 Click any station on the strata profile or GIS map to synchronize both views in real time.
        </span>
        <span>Surface Gateway Portal (0m) →</span>
      </div>
    </div>
  );
};
