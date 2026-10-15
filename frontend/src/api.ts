import type {
  Lead, LeadDetail, ScoringWeight, WeightAudit,
  UserProfile, AnalyticsOverview
} from './types';

// Relative by default: Vite proxies /api and /ws in dev, nginx does in Docker.
const API_BASE = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;

const ACCESS_KEY = 'token';
const REFRESH_KEY = 'refresh_token';

const storage = {
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string | null) {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch { /* storage unavailable: session stays in memory */ }
  },
};

let authToken: string | null = storage.get(ACCESS_KEY);
let refreshToken: string | null = storage.get(REFRESH_KEY);
let unauthorizedHandler: (() => void) | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export const getAuthToken = () => authToken;

export const setTokens = (access: string | null, refresh?: string | null) => {
  authToken = access;
  storage.set(ACCESS_KEY, access);
  if (refresh !== undefined) {
    refreshToken = refresh;
    storage.set(REFRESH_KEY, refresh);
  }
};

/** Called once when the session can't be recovered (refresh failed). */
export const onUnauthorized = (handler: () => void) => { unauthorizedHandler = handler; };

export class ApiError extends Error {
  status: number;
  detail: any;
  constructor(status: number, detail: any) {
    super(typeof detail === 'string' ? detail : detail?.message || `Request failed (${status})`);
    this.status = status;
    this.detail = detail;
  }
}

async function tryRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json();
        setTokens(data.access_token, data.refresh_token);
        return true;
      })
      .catch(() => false)
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as any) };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401 && retry && path !== '/auth/login') {
    if (await tryRefresh()) return request<T>(path, init, false);
    setTokens(null, null);
    unauthorizedHandler?.();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? body);
  }
  if (res.headers.get('content-type')?.includes('application/json')) return res.json();
  return (await res.text()) as unknown as T;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

type LoginResponse = { access_token: string; refresh_token: string; user: UserProfile };

export const api = {
  // Auth
  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await request<LoginResponse>('/auth/login', json('POST', { email, password }), false);
    setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async register(data: { email: string; name: string; password: string; tenant_name: string }): Promise<LoginResponse> {
    const res = await request<LoginResponse>('/auth/register', json('POST', data), false);
    setTokens(res.access_token, res.refresh_token);
    return res;
  },

  logout() {
    setTokens(null, null);
  },

  getCurrentUser: () => request<UserProfile>('/auth/me'),
  getReps: () => request<UserProfile[]>('/auth/reps'),

  // Leads
  getLeads(params?: { stage?: string; assigned_to?: string; is_hot_queue?: boolean; search?: string; mine?: boolean }) {
    const query = new URLSearchParams();
    if (params?.stage) query.append('stage', params.stage);
    if (params?.assigned_to) query.append('assigned_to', params.assigned_to);
    if (params?.is_hot_queue !== undefined) query.append('is_hot_queue', String(params.is_hot_queue));
    if (params?.search) query.append('search', params.search);
    if (params?.mine) query.append('mine', 'true');
    return request<Lead[]>(`/leads?${query.toString()}`);
  },

  getLeadDetail: (id: string) => request<LeadDetail>(`/leads/${id}`),

  createLead: (data: {
    company_name: string;
    company_size: string;
    contact_name: string;
    contact_email: string;
    initial_score?: number;
  }) => request<Lead>('/leads', json('POST', data)),

  async transitionStage(
    leadId: string, toStage: string, confirmed = false, reason?: string, expectedVersion?: number
  ): Promise<Lead> {
    try {
      return await request<Lead>(`/leads/${leadId}/transition`, json('POST', {
        to_stage: toStage, confirmed, reason, expected_version: expectedVersion,
      }));
    } catch (e) {
      // Components read `detail` shape ({error, message}) directly.
      if (e instanceof ApiError) throw (typeof e.detail === 'object' ? e.detail : { message: e.message });
      throw e;
    }
  },

  assignLead: (leadId: string, toUser: string, reason?: string) =>
    request<Lead>(`/leads/${leadId}/assign`, json('POST', { to_user: toUser, reason })),

  // Events & Simulator
  ingestEvent: (data: {
    event_id: string;
    lead_id?: string;
    event_type: string;
    contact_email?: string;
    company_name?: string;
    contact_name?: string;
    payload?: Record<string, any>;
  }) => request<any>('/events', json('POST', data)),

  // Admin Weights & Capacity
  getScoringWeights: () => request<ScoringWeight[]>('/admin/scoring-weights'),

  updateScoringWeight: (data: { feature_name: string; weight: number; window_hours: number; description?: string }) =>
    request<ScoringWeight>('/admin/scoring-weights', json('PUT', data)),

  getWeightAudits: () => request<WeightAudit[]>('/admin/weight-audit'),

  updateRepCapacity: (userId: string, data: { max_concurrent_leads?: number; is_available?: boolean }) =>
    request<UserProfile>(`/admin/users/${userId}/capacity`, json('PUT', data)),

  // Analytics
  getAnalytics: () => request<AnalyticsOverview>('/analytics/overview'),

  /** Downloads the audit CSV with the auth header (a plain link can't send it). */
  async downloadAuditCsv(): Promise<void> {
    const csv = await request<string>('/admin/export/audit-csv');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `score_explanations_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
