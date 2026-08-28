import { getToken } from './auth';

const VITE_API_URL = import.meta.env.VITE_API_URL || '';
let WS_BASE_URL = 'ws://127.0.0.1:8000/ws/live';

if (VITE_API_URL) {
  const protocol = VITE_API_URL.startsWith('https') ? 'wss:' : 'ws:';
  const host = VITE_API_URL.replace(/^https?:\/\//, '');
  WS_BASE_URL = `${protocol}//${host}/ws/live`;
}

class RealtimeHub {
  constructor() {
    this.ws = null;
    this.subscribers = new Set();
    this.reconnectTimer = null;
    this.isConnected = false;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const token = getToken();
    if (!token) {
      // Not logged in yet — don't attempt to connect.
      return;
    }

    try {
      this.ws = new WebSocket(`${WS_BASE_URL}?token=${encodeURIComponent(token)}`);

      this.ws.onopen = () => {
        this.isConnected = true;
        console.log('⚡ Connected to Employee Realtime WebSocket stream');
        this.notify({ event: 'CONNECTION_STATUS', connected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.notify(payload);
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.notify({ event: 'CONNECTION_STATUS', connected: false });

        // 4401 = our custom "unauthorized" close code from the backend.
        if (event.code === 4401) {
          console.warn('⚠️ WebSocket rejected: session expired or invalid token.');
          window.dispatchEvent(new Event('emt-session-expired'));
          return; // don't keep retrying with a bad/stale token
        }

        console.warn('⚠️ Realtime WebSocket closed. Retrying in 3s...');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        this.ws.close();
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 3000);
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify(data) {
    this.subscribers.forEach((cb) => cb(data));
  }
}

export const realtimeHub = new RealtimeHub();
