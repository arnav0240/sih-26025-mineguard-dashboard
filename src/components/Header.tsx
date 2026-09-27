import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, BellRing, Monitor, Radio, ShieldAlert } from 'lucide-react';
import { audioAlarmService } from '../services/audioAlarm';
import { ConnectionStatus } from '../types';

interface HeaderProps {
  mode: 'SIMULATION' | 'LIVE_GATEWAY';
  gatewayUrl: string;
  connectionStatus?: ConnectionStatus;
  lastHeartbeat?: string | null;
  connectionError?: string | null;
  onSelectMode: (mode: 'SIMULATION' | 'LIVE_GATEWAY') => void;
  onOpenGatewayModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  gatewayUrl,
  connectionStatus = 'DISCONNECTED',
  lastHeartbeat,
  connectionError,
  onSelectMode,
  onOpenGatewayModal,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [clock, setClock] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(now.toTimeString().split(' ')[0]);
      setDateStr(now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleMute = () => {
    const nextMuted = audioAlarmService.toggleMute();
    setIsMuted(nextMuted);
  };

  const handleTestSiren = () => {
    audioAlarmService.triggerTestSiren();
    setIsMuted(false);
  };

  return (
    <header className="top-header">
      <div className="brand-section">
        <div className="brand-icon-box">
          <ShieldAlert size={28} />
        </div>
        <div>
          <h1 className="brand-title">
            MineGuard <span>MINE GEOTECH</span>
          </h1>
          <div className="brand-subtitle">
            5-NODE MINE SUBSIDENCE & STRUCTURAL DEFORMATION MONITORING
          </div>
        </div>
      </div>

      <div className="header-controls">
        {/* Gateway connection pill */}
        <div className="connection-pill" title={mode === 'LIVE_GATEWAY' ? `Gateway endpoint: ${gatewayUrl} (poll: 1s; canonical ingest via FastAPI)` : 'Backend scenario simulator connected through FastAPI'}>
          {mode === 'SIMULATION' ? (
            <>
              <div className="status-dot active-pulse" />
              <span>BACKEND SCENARIO SIMULATOR</span>
            </>
          ) : connectionStatus === 'CONNECTED' ? (
            <>
              <div className="status-dot active-pulse" />
              <span style={{ color: '#10b981', fontWeight: 600 }}>
                LIVE • Gateway Connected {lastHeartbeat ? `• ${lastHeartbeat}` : ''}
              </span>
            </>
          ) : connectionStatus === 'CONNECTING' ? (
            <>
              <div className="status-dot warning active-pulse" />
              <span style={{ color: '#f59e0b' }}>Connecting to Gateway...</span>
            </>
          ) : (
            <>
              <div className="status-dot danger active-pulse" />
              <span style={{ color: '#ef4444', fontWeight: 600 }}>Gateway Offline</span>
            </>
          )}
        </div>

        {/* Mode Switcher */}
        <div className="button-group">
          <button
            className={`mode-btn ${mode === 'SIMULATION' ? 'active' : ''}`}
            onClick={() => onSelectMode('SIMULATION')}
          >
            <Monitor size={14} />
            Sim Mode
          </button>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              className={`mode-btn ${mode === 'LIVE_GATEWAY' ? 'active' : ''}`}
              onClick={() => onSelectMode('LIVE_GATEWAY')}
              title="Poll the structured Node-5 Wokwi/ESP32 gateway snapshot and forward canonical telemetry to FastAPI"
            >
              <Radio size={14} />
              Live Gateway
            </button>
            <button
              onClick={onOpenGatewayModal}
              title="Configure Gateway IP / URL"
              style={{
                background: 'transparent',
                border: 'none',
                color: mode === 'LIVE_GATEWAY' ? '#38bdf8' : '#64748b',
                cursor: 'pointer',
                padding: '0 4px',
                fontSize: '0.8rem',
              }}
            >
              ⚙
            </button>
          </div>
        </div>

        {/* Siren Acoustics Toggle */}
        <button
          className={`btn-action btn-alarm-mute ${isMuted ? 'muted' : ''}`}
          onClick={handleToggleMute}
          title="Toggle Hardware Siren Acoustics (3000 Hz / 1800 Hz)"
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          {isMuted ? 'Siren Muted' : 'Siren Armed'}
        </button>

        {/* Test Siren */}
        <button className="btn-action" onClick={handleTestSiren} title="Test 3000 Hz piezo acoustic siren">
          <BellRing size={15} />
          Test Siren
        </button>

        {/* Clock */}
        <div className="clock-display">
          <span>{clock}</span>
          <span className="sub">{dateStr}</span>
        </div>
      </div>
    </header>
  );
};
