import React from 'react';
import { Activity } from 'lucide-react';
import { NodeData } from '../types';
import { NodeCard } from './NodeCard';

interface NodeGridProps {
  nodes: NodeData[];
  selectedNodeId: string | null;
  onFocusMap: (lat: number, lon: number, nodeId: string) => void;
}

export const NodeGrid: React.FC<NodeGridProps> = ({ nodes, selectedNodeId, onFocusMap }) => {
  return (
    <section>
      <div className="nodes-section-title">
        <h2>
          <Activity size={22} color="#38bdf8" />
          5-Node Comprehensive Telemetry Stations
        </h2>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: '#94a3b8' }}>
          ADAPTIVE TX: SAFE (40s) | WARNING (15s) | DANGER (3s) • SIREN ACTIVE ON CRITICAL ONLY
        </span>
      </div>

      <div className="node-cards-grid">
        {nodes.map((node) => (
          <NodeCard
            key={node.node}
            node={node}
            isSelected={node.node === selectedNodeId}
            onFocusMap={onFocusMap}
          />
        ))}
      </div>
    </section>
  );
};
