import React, { useCallback, useEffect, useState } from 'react';
import { Clock3, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Incident {
  id: number;
  node_id: string;
  severity: string;
  type: string;
  message: string;
  timestamp: string | null;
  acknowledged: boolean;
  resolved: boolean;
  detection_lead_time_s: number | null;
  scenario_name: string | null;
  source_packet_id: string | null;
  contributing_signals: string[];
}

export const IncidentTimeline: React.FC = () => {
  const [events, setEvents] = useState<Incident[]>([]);
  const [offline, setOffline] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/alerts/incidents/timeline?limit=30');
      if (!response.ok) throw new Error('Backend timeline unavailable');
      const data = await response.json() as { events: Incident[] };
      setEvents(data.events);
      setOffline(false);
    } catch { setOffline(true); }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const acknowledge = async (id: number) => {
    await fetch(`/api/alerts/${id}/acknowledge`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acknowledged: true }),
    });
    void refresh();
  };

  const resolve = async (id: number) => {
    await fetch(`/api/alerts/${id}/resolve`, { method: 'PATCH' });
    void refresh();
  };

  return <section className="panel-card" aria-label="Backend incident timeline">
    <div className="panel-header">
      <div className="panel-title-group"><Clock3 size={17} color="#38bdf8" /><h2 className="panel-title">Incident Timeline</h2></div>
      <span className="panel-badge">{offline ? 'BACKEND OFFLINE' : `${events.length} BACKEND EVENTS`}</span>
    </div>
    {events.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '.8rem' }}>No backend alert events recorded. Scenario and live events appear here with source packet traceability.</p> :
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '.5rem' }}>
        {events.slice(-12).reverse().map((event) => <li key={event.id} style={{ borderLeft: `3px solid ${event.severity === 'CRITICAL' ? '#ef4444' : ['WARNING', 'HIGH'].includes(event.severity) ? '#f59e0b' : '#38bdf8'}`, padding: '.45rem .7rem', background: 'rgba(15,23,42,.55)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.7rem', flexWrap: 'wrap' }}>
            <strong style={{ color: event.severity === 'CRITICAL' ? '#fca5a5' : ['WARNING', 'HIGH'].includes(event.severity) ? '#fcd34d' : '#bae6fd' }}><AlertTriangle size={12} /> {event.severity} · {event.node_id}</strong>
            <time style={{ color: '#94a3b8', fontSize: '.72rem' }}>{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'time unavailable'}</time>
          </div>
          <div style={{ color: '#cbd5e1', fontSize: '.77rem', marginTop: '.25rem' }}>{event.message}</div>
          {!!event.contributing_signals?.length && <ul style={{ color: '#94a3b8', fontSize: '.7rem', margin: '.25rem 0', paddingLeft: '1.1rem' }}>{event.contributing_signals.slice(0, 3).map((signal, index) => <li key={index}>{signal}</li>)}</ul>}
          <div style={{ color: '#64748b', fontSize: '.65rem', display: 'flex', gap: '.8rem', flexWrap: 'wrap' }}>
            {event.scenario_name && <span>Scenario: {event.scenario_name}</span>}
            {event.detection_lead_time_s !== null && <span>Scenario detection: {event.detection_lead_time_s.toFixed(1)}s after ground-truth start</span>}
            {event.source_packet_id && <span>Packet: {event.source_packet_id}</span>}
            {!event.acknowledged && <button className="btn-action" onClick={() => void acknowledge(event.id)}><CheckCircle2 size={12} /> Acknowledge</button>}
            {event.acknowledged && !event.resolved && <button className="btn-action" onClick={() => void resolve(event.id)}>Resolve incident</button>}
            {event.resolved && <span>RESOLVED</span>}
          </div>
        </li>)}
      </ol>}
    <p style={{ color: '#64748b', fontSize: '.65rem', marginBottom: 0 }}>Detection lead time is only a synthetic scenario demonstration measure, not field-validated performance.</p>
  </section>;
};
