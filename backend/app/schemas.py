from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime

EventType = Literal[
    "lead_created", "email_open", "email_click", "form_submission", "page_visit",
    "pricing_page_visit", "meeting_booked", "call_logged", "deal_stage_change",
]

# --- Auth & User ---
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]

class RefreshRequest(BaseModel):
    refresh_token: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=120)
    password: str = Field(..., min_length=8, max_length=128)
    tenant_name: str = Field(..., min_length=2, max_length=120)
    max_concurrent_leads: int = Field(10, ge=0, le=500)

class UserInvite(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=120)
    password: str = Field(..., min_length=8, max_length=128)
    role: Literal["admin", "sales_rep"] = "sales_rep"
    max_concurrent_leads: int = Field(10, ge=0, le=500)

class UserResponse(BaseModel):
    id: str
    tenant_id: str
    email: str
    name: str
    role: str
    max_concurrent_leads: int
    is_available: bool
    current_leads_count: Optional[int] = 0
    created_at: datetime

    class Config:
        from_attributes = True

class UserCapacityUpdate(BaseModel):
    max_concurrent_leads: Optional[int] = Field(None, ge=0, le=500)
    is_available: Optional[bool] = None

# --- Events ---
class EventIngestRequest(BaseModel):
    event_id: str = Field(..., min_length=1, max_length=200, description="Unique client or webhook ID for idempotency")
    lead_id: Optional[str] = Field(None, description="Existing lead ID if known")
    event_type: EventType
    payload: Dict[str, Any] = Field(default_factory=dict)
    contact_email: Optional[str] = None
    company_name: Optional[str] = None
    contact_name: Optional[str] = None

class EventResponse(BaseModel):
    id: str
    event_id: str
    tenant_id: str
    lead_id: str
    event_type: str
    payload: Dict[str, Any]
    received_at: datetime
    duplicate: bool = False
    message: Optional[str] = None

    class Config:
        from_attributes = True

# --- Explanations ---
class ScoreExplanationResponse(BaseModel):
    id: str
    tenant_id: str
    lead_id: str
    event_id: Optional[str] = None
    previous_score: int
    new_score: int
    delta: int
    reason_text: str
    features: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Transitions ---
class PipelineTransitionResponse(BaseModel):
    id: str
    lead_id: str
    from_stage: str
    to_stage: str
    triggered_by: str
    confirmed_by: Optional[str] = None
    reason: Optional[str] = None
    is_automatic: bool
    created_at: datetime

    class Config:
        from_attributes = True

class StageTransitionRequest(BaseModel):
    to_stage: str
    confirmed: bool = Field(False, description="Manual confirmation required for backward and Closed stages")
    reason: Optional[str] = Field(None, max_length=2000, description="Reason required when moving to Closed-Won or Closed-Lost or backwards")
    expected_version: Optional[int] = Field(None, description="Optimistic lock: reject if the lead changed since the client last saw it")

# --- Assignment ---
class AssignmentLogResponse(BaseModel):
    id: str
    lead_id: str
    from_user: Optional[str] = None
    to_user: Optional[str] = None
    reason: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Leads ---
class LeadCreate(BaseModel):
    company_name: str
    company_size: str = "11-50"
    contact_name: str
    contact_email: EmailStr
    initial_score: int = Field(15, ge=0, le=100)

class LeadResponse(BaseModel):
    id: str
    tenant_id: str
    company_name: str
    company_size: str
    contact_name: str
    contact_email: str
    current_score: int
    stage: str
    assigned_to: Optional[str] = None
    assignee_name: Optional[str] = None
    priority_score: float
    is_hot_queue: bool
    version: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class LeadDetailResponse(LeadResponse):
    explanations: List[ScoreExplanationResponse] = []
    transitions: List[PipelineTransitionResponse] = []
    assignments: List[AssignmentLogResponse] = []
    events: List[EventResponse] = []

# --- Scoring Weights ---
class ScoringWeightResponse(BaseModel):
    id: str
    feature_name: str
    weight: int
    window_hours: int
    description: Optional[str] = None
    category: str
    updated_at: datetime

    class Config:
        from_attributes = True

class ScoringWeightUpdate(BaseModel):
    feature_name: str
    weight: int = Field(..., ge=-50, le=100)
    window_hours: int = Field(48, ge=1, le=8760)
    description: Optional[str] = None

class WeightChangeAuditResponse(BaseModel):
    id: str
    changed_by: str
    feature_name: str
    old_weight: int
    new_weight: int
    old_window_hours: Optional[int] = None
    new_window_hours: Optional[int] = None
    changed_at: datetime

    class Config:
        from_attributes = True
