import { getAuthToken } from './api';

type MessageHandler = (data: any) => void;

/**
 * Tenant WebSocket with JWT auth, exponential-backoff reconnect and resume:
 * every server message carries a `seq`; on reconnect we send the last one we
 * saw and the server replays what we missed (or asks for a full resync).
 */
class RealTimeService {
  private socket: WebSocket | null = null;
  private tenantId: string | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private attempts = 0;
  private lastSeq = 0;
  private isConnected = false;
  private latencyList: number[] = [];

  public connect(tenantId: string) {
    this.tenantId = tenantId;
    this.open();
  }

  public disconnect() {
    this.tenantId = null;
    this.lastSeq = 0;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const s = this.socket;
    this.socket = null;
    s?.close();
  }

  private open() {
    const token = getAuthToken();
    if (!this.tenantId || !token) return;
    if (this.socket) {
      const old = this.socket;
      this.socket = null;
      old.close();
    }

    const base = import.meta.env.VITE_WS_URL
      ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
    const url = `${base}/ws/tenant/${this.tenantId}?token=${encodeURIComponent(token)}&last_seq=${this.lastSeq}`;
    const socket = new WebSocket(url);
    this.socket = socket;

    socket.onopen = () => {
      this.isConnected = true;
      this.attempts = 0;
      this.notify({ type: 'connection_status', connected: true });
    };

    socket.onmessage = (event) => {
      let data: any;
      try { data = JSON.parse(event.data); } catch { return; }
      if (data.type === 'hello') {
        if (data.resync_required) this.notify({ type: 'resync_required' });
        this.lastSeq = Math.max(this.lastSeq, data.seq || 0);
        return;
      }
      if (typeof data.seq === 'number') {
        if (data.seq <= this.lastSeq) return; // already applied
        this.lastSeq = data.seq;
      }
      if (typeof data.elapsed_ms === 'number') {
        this.latencyList.push(data.elapsed_ms);
        if (this.latencyList.length > 100) this.latencyList.shift();
      }
      this.notify(data);
    };

    socket.onclose = () => {
      if (this.socket !== socket) return; // superseded or intentionally closed
      this.isConnected = false;
      this.notify({ type: 'connection_status', connected: false });
      this.scheduleReconnect();
    };

    socket.onerror = () => socket.close();
  }

  private scheduleReconnect() {
    if (!this.tenantId) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const delay = Math.min(15000, 500 * 2 ** this.attempts) + Math.random() * 300;
    this.attempts += 1;
    this.reconnectTimer = setTimeout(() => this.open(), delay);
  }

  public subscribe(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => { this.handlers.delete(handler); };
  }

  private notify(data: any) {
    this.handlers.forEach((h) => h(data));
  }

  public getConnected(): boolean {
    return this.isConnected;
  }

  /** p95 of observed server-side event→push latency, or null with no samples. */
  public getP95Latency(): number | null {
    if (this.latencyList.length === 0) return null;
    const sorted = [...this.latencyList].sort((a, b) => a - b);
    return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]);
  }
}

export const realTimeService = new RealTimeService();
