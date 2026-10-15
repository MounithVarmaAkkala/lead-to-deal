import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime,
    ForeignKey, UniqueConstraint, Text, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    leads = relationship("Lead", back_populates="tenant", cascade="all, delete-orphan")
    scoring_weights = relationship("ScoringWeight", back_populates="tenant", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    email = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="sales_rep") # admin, sales_rep
    max_concurrent_leads = Column(Integer, default=10)
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

    tenant = relationship("Tenant", back_populates="users")
    assigned_leads = relationship("Lead", back_populates="assignee", foreign_keys="Lead.assigned_to")

    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_tenant_user_email"),
    )

class Lead(Base):
    __tablename__ = "leads"

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    company_name = Column(String, nullable=False)
    company_size = Column(String, default="11-50")
    contact_name = Column(String, nullable=False)
    contact_email = Column(String, nullable=False)
    current_score = Column(Integer, default=10)
    stage = Column(String, default="New") # New, Engaged, Contacted, Qualified, Proposal, Negotiation, Closed-Won, Closed-Lost
    assigned_to = Column(String, ForeignKey("users.id"), nullable=True)
    priority_score = Column(Float, default=10.0) # Combined score & recency
    is_hot_queue = Column(Boolean, default=False)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    tenant = relationship("Tenant", back_populates="leads")
    assignee = relationship("User", back_populates="assigned_leads", foreign_keys=[assigned_to])
    events = relationship("Event", back_populates="lead", cascade="all, delete-orphan")
    score_explanations = relationship("ScoreExplanation", back_populates="lead", cascade="all, delete-orphan")
    transitions = relationship("PipelineTransition", back_populates="lead", cascade="all, delete-orphan")
    assignments = relationship("AssignmentLog", back_populates="lead", cascade="all, delete-orphan")

class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    event_id = Column(String, nullable=False) # client/webhook provided unique event id for idempotency
    lead_id = Column(String, ForeignKey("leads.id"), nullable=False, index=True)
    event_type = Column(String, nullable=False) # email_open, email_click, form_submission, page_visit, meeting_booked, call_logged, deal_stage_change, etc.
    payload = Column(JSON, default=dict)
    received_at = Column(DateTime, default=utc_now)

    lead = relationship("Lead", back_populates="events")

    __table_args__ = (
        UniqueConstraint("tenant_id", "event_id", name="uq_tenant_event_id"),
    )

class ScoreExplanation(Base):
    """
    APPEND-ONLY & IMMUTABLE.
    Stores exact formula, delta, features applied, previous/new scores, and human-readable explanation.
    """
    __tablename__ = "score_explanations"

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    lead_id = Column(String, ForeignKey("leads.id"), nullable=False, index=True)
    event_id = Column(String, nullable=True)
    previous_score = Column(Integer, nullable=False)
    new_score = Column(Integer, nullable=False)
    delta = Column(Integer, nullable=False)
    reason_text = Column(Text, nullable=False)
    features = Column(JSON, default=dict) # e.g. {"feature": "email_open", "weight": 5, "window_hours": 48}
    created_at = Column(DateTime, default=utc_now, nullable=False)

    lead = relationship("Lead", back_populates="score_explanations")

class PipelineTransition(Base):
    __tablename__ = "pipeline_transitions"

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    lead_id = Column(String, ForeignKey("leads.id"), nullable=False, index=True)
    from_stage = Column(String, nullable=False)
    to_stage = Column(String, nullable=False)
    triggered_by = Column(String, nullable=False) # "automatic_score_threshold", "meeting_booked", "manual_rep"
    confirmed_by = Column(String, nullable=True) # user email/id if manual confirmation
    reason = Column(Text, nullable=True)
    is_automatic = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

    lead = relationship("Lead", back_populates="transitions")

class AssignmentLog(Base):
    __tablename__ = "assignment_log"

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    lead_id = Column(String, ForeignKey("leads.id"), nullable=False, index=True)
    from_user = Column(String, nullable=True)
    to_user = Column(String, nullable=True)
    reason = Column(String, nullable=False) # "round_robin", "hot_queue_entered", "hot_queue_reassigned", "manual_reassignment"
    created_at = Column(DateTime, default=utc_now)

    lead = relationship("Lead", back_populates="assignments")

class ScoringWeight(Base):
    __tablename__ = "scoring_weights"

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    feature_name = Column(String, nullable=False)
    weight = Column(Integer, nullable=False)
    window_hours = Column(Integer, default=48)
    description = Column(String, nullable=True)
    category = Column(String, default="engagement") # engagement, demographic, intent
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    tenant = relationship("Tenant", back_populates="scoring_weights")

    __table_args__ = (
        UniqueConstraint("tenant_id", "feature_name", name="uq_tenant_feature_name"),
    )

class WeightChangeAudit(Base):
    __tablename__ = "weight_change_audit"

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    changed_by = Column(String, nullable=False) # user email
    feature_name = Column(String, nullable=False)
    old_weight = Column(Integer, nullable=False)
    new_weight = Column(Integer, nullable=False)
    old_window_hours = Column(Integer, nullable=True)
    new_window_hours = Column(Integer, nullable=True)
    changed_at = Column(DateTime, default=utc_now)


# --- Append-only enforcement (PRD US-05 / §6) --------------------------------
# Audit tables are immutable at the application layer: any ORM UPDATE or DELETE
# raises. In PostgreSQL deployments, also REVOKE UPDATE, DELETE on these tables
# from the application role for defence in depth.
from sqlalchemy import event as _sa_event


class ImmutableRecordError(RuntimeError):
    pass


def _forbid_mutation(mapper, connection, target):
    raise ImmutableRecordError(f"{type(target).__name__} is append-only and cannot be modified or deleted")


for _model in (ScoreExplanation, PipelineTransition, AssignmentLog, WeightChangeAudit):
    _sa_event.listen(_model, "before_update", _forbid_mutation)
    _sa_event.listen(_model, "before_delete", _forbid_mutation)
