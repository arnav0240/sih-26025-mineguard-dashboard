/**
 * MineGuard AI — Backend ML Assessment Service
 *
 * Fetches live risk assessments from the FastAPI backend's
 * Isolation Forest + Unified Risk Engine pipeline.
 *
 * Endpoints consumed:
 *   GET /backend/ai/assessment       → network-wide assessment
 *   GET /backend/ai/assessment/:id   → per-node assessment
 *   POST /backend/ai/analyze         → on-demand payload analysis
 *
 * The /backend proxy prefix is configured in vite.config.ts to route to
 * http://127.0.0.1:8000, keeping the backend decoupled from the frontend origin.
 *
 * EXTENSION POINT:
 *   If the ML model is upgraded (LSTM, Autoencoder, GNN), only the backend
 *   changes. This service continues to work without modification because it
 *   consumes the stable BackendAIResponse interface.
 */

import type {
  BackendAIResponse,
  BackendNodeAssessment,
} from '../types';

const BACKEND_BASE = '/backend';

// ---------------------------------------------------------------------------
// Polling interval for live AI assessment refresh (ms)
// ---------------------------------------------------------------------------
const POLL_INTERVAL_MS = 10_000; // 10 seconds

type AssessmentCallback = (data: BackendAIResponse) => void;
type ErrorCallback = (err: Error) => void;

class BackendAIService {
  private _pollTimer: ReturnType<typeof setInterval> | null = null;
  private _listeners = new Set<AssessmentCallback>();
  private _errorListeners = new Set<ErrorCallback>();
  private _lastData: BackendAIResponse | null = null;
  private _isPolling = false;

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /** Subscribe to live AI assessment updates. Starts polling if not already started. */
  subscribe(cb: AssessmentCallback): () => void {
    this._listeners.add(cb);
    if (this._lastData) cb(this._lastData); // immediate snapshot
    this._startPolling();
    return () => {
      this._listeners.delete(cb);
      if (this._listeners.size === 0) this._stopPolling();
    };
  }

  /** Subscribe to error events. */
  onError(cb: ErrorCallback): () => void {
    this._errorListeners.add(cb);
    return () => this._errorListeners.delete(cb);
  }

  /** Fetch a single node's assessment on demand. */
  async fetchNodeAssessment(nodeId: string): Promise<BackendNodeAssessment | null> {
    try {
      const res = await fetch(`${BACKEND_BASE}/api/ai/assessment/${encodeURIComponent(nodeId)}`);
      if (!res.ok) return null;
      return (await res.json()) as BackendNodeAssessment;
    } catch {
      return null;
    }
  }

  /** Fetch the full network assessment immediately (non-reactive). */
  async fetchNetworkAssessment(): Promise<BackendAIResponse | null> {
    try {
      const res = await fetch(`${BACKEND_BASE}/api/ai/assessment`);
      if (!res.ok) return null;
      return (await res.json()) as BackendAIResponse;
    } catch {
      return null;
    }
  }

  /** Last cached assessment (may be null if backend has no data yet). */
  get latestData(): BackendAIResponse | null {
    return this._lastData;
  }

  // --------------------------------------------------------------------------
  // Internal polling
  // --------------------------------------------------------------------------

  private _startPolling() {
    if (this._isPolling) return;
    this._isPolling = true;
    this._fetchAndNotify(); // immediate first fetch
    this._pollTimer = setInterval(() => this._fetchAndNotify(), POLL_INTERVAL_MS);
  }

  private _stopPolling() {
    if (this._pollTimer !== null) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
    this._isPolling = false;
  }

  private async _fetchAndNotify() {
    try {
      const res = await fetch(`${BACKEND_BASE}/api/ai/assessment`);
      if (!res.ok) {
        // Backend has no data yet — not an error worth surfacing
        if (res.status === 404) return;
        throw new Error(`Backend AI assessment returned HTTP ${res.status}`);
      }
      const data = (await res.json()) as BackendAIResponse;
      this._lastData = data;
      this._listeners.forEach(cb => cb(data));
    } catch (err) {
      this._errorListeners.forEach(cb => cb(err instanceof Error ? err : new Error(String(err))));
    }
  }
}

// Singleton instance
export const backendAIService = new BackendAIService();
export default backendAIService;
