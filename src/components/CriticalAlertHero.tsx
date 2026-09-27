import React from 'react';
import { AlertTriangle, MapPin, Radio, Volume2 } from 'lucide-react';
import { AlarmState } from '../types';

interface CriticalAlertHeroProps {
  alarm: AlarmState;
  onFocusMap: (lat: number, lon: number, nodeId: string) => void;
}

export const CriticalAlertHero: React.FC<CriticalAlertHeroProps> = ({ alarm, onFocusMap }) => {
  const { mode, activeNode } = alarm;

  if (mode === 'SAFE' || !activeNode) {
    return null;
  }

  const isDanger = mode === 'DANGER';

  // Section 5 explanation logic
  const isMultiWarningDanger = isDanger && activeNode.warning_sensors >= 3 && activeNode.critical_sensors === 0;

  return (
    <section className={`alert-hero ${!isDanger ? 'warning-theme' : ''}`}>
      <div className="alert-hero-content">
        <div className="alert-icon-ring">
          <AlertTriangle size={32} />
        </div>

        <div className="alert-heading-block">
          <div className="alert-tag-line">
            <span className="alert-badge">
              {isDanger ? 'DGMS CRITICAL EVACUATION PROTOCOL' : 'MINE PRE-HAZARD WARNING PROTOCOL'}
            </span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem', color: isDanger ? '#fca5a5' : '#fde68a' }}>
              <Volume2 size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              {isDanger
                ? `ACTIVE AUDIBLE LOCATOR: ${activeNode.node} ONLY (3000 Hz Continuous Siren)`
                : `ACOUSTIC SIREN: STANDBY (ACTIVE STRICTLY ON CRITICAL / DANGER)`}
            </span>
          </div>

          <div className="alert-title">
            {isDanger
              ? `CRITICAL CONDITION DETECTED AT ${activeNode.node}`
              : `ELEVATED SENSOR READINGS AT ${activeNode.node}`}
          </div>

          <div className="alert-description">
            {isMultiWarningDanger ? (
              <>
                <strong>{activeNode.node}</strong> has triggered the DANGER condition because{' '}
                <strong>5 warning-level sensors are occurring simultaneously</strong> (Temperature, Pressure drop, Gas,
                Tilt, and Load). Risk score: <strong>{activeNode.risk_score}/100</strong>. Continuous 3 kHz audible
                siren is active on {activeNode.node}. All other buzzers forced OFF.
              </>
            ) : isDanger ? (
              <>
                <strong>{activeNode.node}</strong> has crossed critical geotechnical thresholds. Risk score:{' '}
                <strong>{activeNode.risk_score}/100</strong>. Continuous 3 kHz audible siren active on {activeNode.node}.
              </>
            ) : (
              <>
                Elevated gas indicator observed on <strong>{activeNode.node}</strong> (
                <strong>{activeNode.gas_ppm_equiv.toFixed(0)} ppm-equiv</strong>). Siren is standby (activates strictly on critical). Transmission accelerated to 15s.
              </>
            )}
          </div>

          <div className="alert-metrics-strip">
            <div className="alert-metric-item">
              <span className="label">Node ID</span>
              <span className="val" style={{ color: isDanger ? '#ef4444' : '#f59e0b' }}>
                {activeNode.node}
              </span>
            </div>

            <div className="alert-metric-item">
              <span className="label">GPS Coordinates</span>
              <span className="val">
                {activeNode.latitude.toFixed(6)}, {activeNode.longitude.toFixed(6)}
              </span>
            </div>

            <div className="alert-metric-item">
              <span className="label">Tilt / Load</span>
              <span className="val">
                {activeNode.tilt_deg.toFixed(2)}° / {activeNode.load_kg.toFixed(2)} kg
              </span>
            </div>

            <div className="alert-metric-item">
              <span className="label">Gas Indicator</span>
              <span className="val">{activeNode.gas_ppm_equiv.toFixed(0)} ppm-equiv</span>
            </div>

            <div className="alert-metric-item">
              <span className="label">TX Interval</span>
              <span className="val" style={{ color: '#38bdf8' }}>
                <Radio size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Every {activeNode.sample_interval_seconds}s
              </span>
            </div>
          </div>
        </div>

        <div className="alert-actions-block">
          <button
            className={isDanger ? 'btn-evacuate' : 'btn-action'}
            onClick={() => onFocusMap(activeNode.latitude, activeNode.longitude, activeNode.node)}
          >
            <MapPin size={16} />
            Locate Across GIS & Strata
          </button>
        </div>
      </div>
    </section>
  );
};
