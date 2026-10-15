export interface Lead {
  id: string;
  tenant_id: string;
  company_name: string;
  company_size: string;
  contact_name: string;
  contact_email: string;
  current_score: number;
  stage: string;
  assigned_to: string | null;
  assignee_name?: string | null;
  priority_score: number;
  is_hot_queue: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  // UI local state for animation
  justUpdated?: boolean;
  lastDelta?: number;
}

export interface ScoreExplanation {
  id: string;
  tenant_id: string;
  lead_id: string;
  event_id?: string | null;
  previous_score: number;
  new_score: number;
  delta: number;
  reason_text: string;
  features: {
    feature_name?: string;
    weight?: number;
    window_hours?: number;
    event_payload?: Record<string, any>;
    [key: string]: any;
  };
  created_at: string;
}

export interface PipelineTransition {
  id: string;
  lead_id: string;
  from_stage: string;
  to_stage: string;
  triggered_by: string;
  confirmed_by?: string | null;
  reason?: string | null;
  is_automatic: boolean;
  created_at: string;
}

export interface AssignmentLog {
  id: string;
  lead_id: string;
  from_user?: string | null;
  to_user?: string | null;
  reason: string;
  created_at: string;
}

export interface RawEvent {
  id: string;
  event_id: string;
  lead_id: string;
  event_type: string;
  payload: Record<string, any>;
  received_at: string;
}

export interface LeadDetail extends Lead {
  explanations: ScoreExplanation[];
  transitions: PipelineTransition[];
  assignments: AssignmentLog[];
  events: RawEvent[];
}

export interface UserProfile {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: 'admin' | 'sales_rep';
  max_concurrent_leads: number;
  is_available: boolean;
  current_leads_count?: number;
  created_at: string;
}

export interface ScoringWeight {
  id: string;
  feature_name: string;
  weight: number;
  window_hours: number;
  description?: string;
  category: string;
  updated_at: string;
}

export interface WeightAudit {
  id: string;
  changed_by: string;
  feature_name: string;
  old_weight: number;
  new_weight: number;
  old_window_hours?: number | null;
  new_window_hours?: number | null;
  changed_at: string;
}

export interface AnalyticsOverview {
  total_leads: number;
  hot_queue_count: number;
  closed_won_count: number;
  closed_lost_count: number;
  win_rate_pct: number;
  avg_score: number;
  stage_breakdown: Record<string, number>;
  rep_capacities: {
    id: string;
    name: string;
    email: string;
    role: string;
    is_available: boolean;
    current_leads: number;
    max_capacity: number;
    utilization_pct: number;
  }[];
  total_rep_capacity: number;
  total_open_assigned: number;
  system_health: {
    p95_latency_ms: number;
    target_latency_ms: number;
    status: string;
    real_time_mode: string;
  };
  explanations_count: number;
}
