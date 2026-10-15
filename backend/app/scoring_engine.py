from typing import Dict, Any, Tuple, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models import (
    Lead, Event, ScoreExplanation, ScoringWeight, PipelineTransition
)
from app.config import settings

DEFAULT_WEIGHTS = {
    "lead_created": {"weight": 10, "window": 168, "desc": "Initial lead profile created", "category": "lifecycle"},
    "email_open": {"weight": 5, "window": 48, "desc": "Marketing or 1:1 email opened", "category": "engagement"},
    "email_click": {"weight": 12, "window": 48, "desc": "Link clicked inside tracked email", "category": "engagement"},
    "page_visit": {"weight": 4, "window": 24, "desc": "Website page visit", "category": "intent"},
    "pricing_page_visit": {"weight": 15, "window": 24, "desc": "High intent: Pricing page visited", "category": "intent"},
    "form_submission": {"weight": 20, "window": 72, "desc": "Contact or demo request form submitted", "category": "intent"},
    "meeting_booked": {"weight": 35, "window": 168, "desc": "Discovery or demo call scheduled on calendar", "category": "intent"},
    "call_logged": {"weight": 15, "window": 72, "desc": "Outbound phone connection logged", "category": "engagement"},
    "deal_stage_change": {"weight": 10, "window": 72, "desc": "Forward deal milestone met", "category": "lifecycle"}
}

def ensure_default_weights(db: Session, tenant_id: str):
    existing = {w.feature_name for w in db.query(ScoringWeight).filter(ScoringWeight.tenant_id == tenant_id).all()}
    for feat, data in DEFAULT_WEIGHTS.items():
        if feat not in existing:
            sw = ScoringWeight(
                tenant_id=tenant_id,
                feature_name=feat,
                weight=data["weight"],
                window_hours=data["window"],
                description=data["desc"],
                category=data["category"]
            )
            db.add(sw)
    db.commit()

def refresh_priority(lead: Lead) -> None:
    """Re-apply recency decay so priority ordering reflects *now*, not the last write."""
    lead.priority_score = calculate_priority_score(lead.current_score, lead.updated_at or datetime.now(timezone.utc))


def calculate_priority_score(score: int, updated_at: datetime) -> float:
    # Recency factor: leads updated in last 6 hours get full recency multiplier
    now = datetime.now(timezone.utc)
    # Ensure timezone aware comparison
    if updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=timezone.utc)
    hours_ago = max(0.1, (now - updated_at).total_seconds() / 3600.0)
    recency_bonus = max(0.0, 20.0 - (hours_ago * 0.5))
    return round(float(score) * 0.8 + recency_bonus, 2)

STAGE_ORDER = [
    "New",
    "Engaged",
    "Contacted",
    "Qualified",
    "Proposal",
    "Negotiation",
    "Closed-Won",
    "Closed-Lost"
]

def evaluate_lead_event(
    db: Session,
    lead: Lead,
    event: Event
) -> Tuple[int, ScoreExplanation, Optional[PipelineTransition]]:
    """
    Evaluates an event for a lead using tenant scoring weights.
    Appends an immutable explanation record and evaluates automatic forward stage transitions.
    """
    ensure_default_weights(db, lead.tenant_id)
    
    # Check if page_visit is pricing page
    target_feature = event.event_type
    payload = event.payload or {}
    if target_feature == "page_visit" and ("pricing" in payload.get("url", "").lower() or payload.get("is_pricing", False)):
        target_feature = "pricing_page_visit"

    # Query active weight
    weight_row = db.query(ScoringWeight).filter(
        ScoringWeight.tenant_id == lead.tenant_id,
        ScoringWeight.feature_name == target_feature
    ).first()

    weight_val = weight_row.weight if weight_row else 5
    window_hours = weight_row.window_hours if weight_row else 48

    previous_score = lead.current_score
    new_score = max(0, min(100, previous_score + weight_val))
    delta = new_score - previous_score

    # Human-readable explanation text
    sign = f"+{delta}" if delta >= 0 else str(delta)
    reason_text = f"{sign} points because of {target_feature.replace('_', ' ')} (weight: {weight_val}, window: {window_hours}h)"
    if target_feature == "meeting_booked":
        reason_text = f"{sign} points: Meeting booked on calendar. High purchase intent signaled."
    elif target_feature == "pricing_page_visit":
        reason_text = f"{sign} points: Visited high-intent pricing page in last {window_hours}h."
    elif target_feature == "form_submission":
        reason_text = f"{sign} points: Form submission received with contact details."

    explanation = ScoreExplanation(
        tenant_id=lead.tenant_id,
        lead_id=lead.id,
        event_id=event.event_id,
        previous_score=previous_score,
        new_score=new_score,
        delta=delta,
        reason_text=reason_text,
        features={
            "feature_name": target_feature,
            "weight": weight_val,
            "window_hours": window_hours,
            "event_payload": payload
        }
    )
    db.add(explanation)

    # Update lead score and priority
    lead.current_score = new_score
    lead.updated_at = datetime.now(timezone.utc)
    lead.priority_score = calculate_priority_score(new_score, lead.updated_at)
    lead.version += 1

    # Automatic Forward Stage Transitions (US-02)
    transition = None
    old_stage = lead.stage
    new_stage = None

    if target_feature == "meeting_booked" and old_stage in ["New", "Engaged", "Contacted"]:
        new_stage = "Qualified"
        trigger_reason = "Event: meeting_booked automatically moved lead to Qualified"
    elif new_score >= settings.PROPOSAL_SCORE_THRESHOLD and old_stage in ["New", "Engaged", "Contacted", "Qualified"]:
        new_stage = "Proposal"
        trigger_reason = f"Score crossed Proposal threshold ({new_score} >= {settings.PROPOSAL_SCORE_THRESHOLD})"
    elif new_score >= settings.QUALIFIED_SCORE_THRESHOLD and old_stage in ["New", "Engaged", "Contacted"]:
        new_stage = "Qualified"
        trigger_reason = f"Score crossed Qualified threshold ({new_score} >= {settings.QUALIFIED_SCORE_THRESHOLD})"
    elif new_score >= settings.CONTACTED_SCORE_THRESHOLD and old_stage in ["New", "Engaged"]:
        new_stage = "Contacted"
        trigger_reason = f"Score crossed Contacted threshold ({new_score} >= {settings.CONTACTED_SCORE_THRESHOLD})"
    elif new_score >= settings.ENGAGED_SCORE_THRESHOLD and old_stage == "New":
        new_stage = "Engaged"
        trigger_reason = f"Score crossed Engagement threshold ({new_score} >= {settings.ENGAGED_SCORE_THRESHOLD})"

    if new_stage and new_stage != old_stage:
        lead.stage = new_stage
        transition = PipelineTransition(
            tenant_id=lead.tenant_id,
            lead_id=lead.id,
            from_stage=old_stage,
            to_stage=new_stage,
            triggered_by="automatic_rule_engine",
            reason=trigger_reason,
            is_automatic=True
        )
        db.add(transition)

    db.commit()
    db.refresh(lead)
    db.refresh(explanation)
    if transition:
        db.refresh(transition)

    return new_score, explanation, transition
