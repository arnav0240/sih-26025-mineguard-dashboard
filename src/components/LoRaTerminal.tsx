import React, { useRef, useEffect, useState } from 'react';
import { Terminal, Trash2, BellRing, Radio } from 'lucide-react';
import { LoRaPacketLog, AlertHistoryItem } from '../types';

interface LoRaTerminalProps {
  packets: LoRaPacketLog[];
  alerts?: AlertHistoryItem[];
  onClear: () => void;
  onClearAlerts?: () => void;
}

export const LoRaTerminal: React.FC<LoRaTerminalProps> = ({
  packets,
  alerts = [],
  onClear,
  onClearAlerts,
}) => {
  const [activeView, setActiveView] = useState<'PACKETS' | 'ALERTS'>('PACKETS');
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [packets, alerts, activeView]);

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title-group">
          {activeView === 'PACKETS' ? (
            <Terminal size={18} color="#10b981" />
          ) : (
            <BellRing size={18} color="#f59e0b" />
          )}
          <h2 className="panel-title">
            {activeView === 'PACKETS' ? 'Logical LoRa Mesh Packet Inspector (Emulated)' : 'Geotechnical Alert History'}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Sub-view toggle */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(15, 23, 42, 0.8)',
              padding: '2px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              onClick={() => setActiveView('PACKETS')}
              style={{
                background: activeView === 'PACKETS' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                border: activeView === 'PACKETS' ? '1px solid #10b981' : 'none',
                color: activeView === 'PACKETS' ? '#10b981' : '#94a3b8',
                borderRadius: '4px',
                padding: '0.2rem 0.5rem',
                fontSize: '0.72rem',
                fontFamily: 'JetBrains Mono',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <Radio size={12} />
              Packets ({packets.length})
            </button>
            <button
              onClick={() => setActiveView('ALERTS')}
              style={{
                background: activeView === 'ALERTS' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                border: activeView === 'ALERTS' ? '1px solid #f59e0b' : 'none',
                color: activeView === 'ALERTS' ? '#f59e0b' : '#94a3b8',
                borderRadius: '4px',
                padding: '0.2rem 0.5rem',
                fontSize: '0.72rem',
                fontFamily: 'JetBrains Mono',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <BellRing size={12} />
              Alerts ({alerts.length})
            </button>
          </div>

          <button
            onClick={activeView === 'PACKETS' ? onClear : onClearAlerts}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title={activeView === 'PACKETS' ? 'Clear Packet Log' : 'Clear Alert History'}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="lora-terminal" ref={terminalRef}>
        {activeView === 'PACKETS' ? (
          <>
            <div className="log-entry safe">
              <span className="log-time">[INIT]</span>
              <span className="log-node">GATEWAY</span>
              <span className="log-msg">Emulated LoRa topology is idle. Waiting for backend telemetry events...</span>
            </div>

            {packets.map((pkt) => {
              const statusClass = pkt.status.toLowerCase();
              return (
                <div key={pkt.id} className={`log-entry ${statusClass}`}>
                  <span className="log-time">[{pkt.timestamp}]</span>
                  <span className="log-node">{pkt.source}</span>
                  <span className="log-msg">
                    » [{pkt.route}] | GPS: {pkt.gps} | Tilt: {pkt.payload.tilt.toFixed(2)}° | Gas: {pkt.payload.gas.toFixed(0)}ppm-eq | Load: {pkt.payload.load.toFixed(2)}kg | Risk: {pkt.payload.risk}/100
                  </span>
                </div>
              );
            })}
          </>
        ) : (
          <>
            <div className="log-entry safe">
              <span className="log-time">[LOG]</span>
              <span className="log-node">SYS</span>
              <span className="log-msg">Hazard alert transition logger initialized. Tracking firmware & simulation threshold changes.</span>
            </div>

            {alerts.length === 0 ? (
              <div className="log-entry safe">
                <span className="log-time">[{new Date().toLocaleTimeString()}]</span>
                <span className="log-node">AUDIT</span>
                <span className="log-msg">No active status transition alerts. All nodes within operational thresholds.</span>
              </div>
            ) : (
              alerts.map((al) => {
                const isCrit = al.newStatus === 'DANGER';
                const isWarn = al.newStatus === 'WARNING';
                const statusClass = isCrit ? 'danger' : isWarn ? 'warning' : 'safe';

                return (
                  <div key={al.id} className={`log-entry ${statusClass}`}>
                    <span className="log-time">[{al.timestamp}]</span>
                    <span className="log-node">{al.node}</span>
                    <span className="log-msg">
                      <strong>[{al.previousStatus} ➔ {al.newStatus}]</strong> • Risk: {al.riskScore}/100 • {al.triggerReason}
                    </span>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
};
