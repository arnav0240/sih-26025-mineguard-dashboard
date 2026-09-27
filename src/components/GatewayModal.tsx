import React, { useState } from 'react';

interface GatewayModalProps {
  isOpen: boolean;
  currentUrl: string;
  onClose: () => void;
  onConnect: (url: string) => void;
}

export const GatewayModal: React.FC<GatewayModalProps> = ({
  isOpen,
  currentUrl,
  onClose,
  onConnect,
}) => {
  const [url, setUrl] = useState<string>(currentUrl);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onConnect(url.trim());
    }
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-window">
        <div className="modal-title">
          <span>Connect to Physical / Wokwi Gateway</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.25rem' }}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
            Enter the IP address or host URL of the ESP32-S3 Node-5 Gateway running Wokwi or real hardware:
          </p>

          <input
            type="text"
            className="input-field"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="e.g. http://192.168.1.150 or http://localhost:8180"
          />

          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            The dashboard will poll <code>/api/nodes</code> at regular intervals for complete network telemetry.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn-action" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-action"
              style={{ background: '#06b6d4', borderColor: '#22d3ee', color: '#0f172a', fontWeight: 700 }}
            >
              Connect Gateway
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
