import React from 'react';
import { Radio, Wifi, Monitor } from 'lucide-react';
import { NodeData } from '../types';

interface LoRaTopologyProps {
  nodes: NodeData[];
  selectedNodeId: string | null;
  onSelectNode: (lat: number, lon: number, nodeId: string) => void;
}

export const LoRaTopology: React.FC<LoRaTopologyProps> = ({ nodes, selectedNodeId, onSelectNode }) => {
  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title-group">
          <Radio size={18} color="#3b82f6" />
          <h2 className="panel-title">Logical LoRa Mesh (Emulated) & Uplink</h2>
        </div>
        <span className="panel-badge">NODE-5 GATEWAY • WIFI UPLINK • MESH EMULATED</span>
      </div>

      <div className="lora-topology-box">
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'JetBrains Mono', marginBottom: '0.5rem' }}>
          LOGICAL ROUTE: FIELD NODES ➔ NODE-5/GATEWAY ➔ WIFI ➔ FASTAPI BACKEND
        </div>

        <div className="topology-nodes-strip">
          <div className="topology-track-line" />

          {nodes.map((node, index) => {
            const isDanger = node.status === 'DANGER';
            const isWarning = node.status === 'WARNING';
            const isGateway = node.node === 'NODE-5';
            const isSelected = node.node === selectedNodeId;

            let roleLabel = 'SAFE';
            if (node.node === 'NODE-1') roleLabel = 'WOKWI SENSOR PROFILE';
            else if (isGateway) roleLabel = 'GATEWAY';
            else if (isDanger) roleLabel = 'CRITICAL';
            else if (isWarning) roleLabel = 'WARNING';
            else roleLabel = 'LOGICAL NODE';

            return (
              <React.Fragment key={node.node}>
                <div
                  className={`topology-node-pill ${isDanger ? 'is-critical' : ''} ${
                    isWarning ? 'is-warning' : ''
                  } ${isGateway ? 'is-gateway' : ''}`}
                  style={
                    isSelected
                      ? {
                          borderColor: '#38bdf8',
                          boxShadow: '0 0 16px rgba(56,189,248,0.5)',
                          transform: 'translateY(-3px)',
                        }
                      : {}
                  }
                  onClick={() => onSelectNode(node.latitude, node.longitude, node.node)}
                  title={`Click to focus ${node.node} across Surface Map & Underground Strata`}
                >
                  <span className="topo-node-id">{node.node}</span>
                  <span className="topo-node-role">{roleLabel}</span>
                </div>
                {index < nodes.length - 1 && <span className="hop-arrow">➔</span>}
              </React.Fragment>
            );
          })}

          {/* Wi-Fi Uplink Step */}
          <span className="hop-arrow" style={{ color: '#06b6d4', fontWeight: 800 }}>➔</span>
          <div
            className="topology-node-pill"
            style={{ borderColor: 'rgba(6, 182, 212, 0.45)', background: 'rgba(6, 182, 212, 0.1)' }}
            title="ESP32-S3 Wi-Fi Station Uplink"
          >
            <span className="topo-node-id" style={{ color: '#06b6d4', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Wifi size={12} /> Wi-Fi
            </span>
            <span className="topo-node-role" style={{ color: '#22d3ee' }}>TCP / HTTP</span>
          </div>

          {/* Dashboard Endpoint Step */}
          <span className="hop-arrow" style={{ color: '#10b981', fontWeight: 800 }}>➔</span>
          <div
            className="topology-node-pill"
            style={{ borderColor: 'rgba(16, 185, 129, 0.45)', background: 'rgba(16, 185, 129, 0.1)' }}
            title="Vite React SCADA Dashboard"
          >
            <span className="topo-node-id" style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Monitor size={12} /> DASHBOARD
            </span>
            <span className="topo-node-role" style={{ color: '#34d399' }}>MineGuard UI</span>
          </div>
        </div>
      </div>

      {/* Network Metrics Footer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
        <div style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0.6rem 0.8rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'JetBrains Mono' }}>ROUTING PROTOCOL</div>
          <div style={{ fontFamily: 'Chakra Petch', fontSize: '1.05rem', fontWeight: 700, color: '#10b981' }}>
            MULTI-HOP CHAIN
          </div>
        </div>

        <div style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0.6rem 0.8rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'JetBrains Mono' }}>GATEWAY ENDPOINT</div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8' }}>
            GET /api/nodes
          </div>
        </div>
      </div>
    </div>
  );
};
