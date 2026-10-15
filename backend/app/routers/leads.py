from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import metrics
from app.assignment_engine import CLOSED_STAGES, assign_lead, fill_capacity_from_hot_queue
from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models import AssignmentLog, Event, Lead, PipelineTransition, ScoreExplanation, User
from app.schemas import LeadCreate, LeadDetailResponse, LeadResponse, StageTransitionRequest
from app.scoring_engine import STAGE_ORDER, calculate_priority_score, refresh_priority
from app.serializers import lead_payload
from app.websocket_manager import ws_manager

router = APIRouter(prefix="/leads", tags=["leads"])


def _users_map(db: Session, tenant_id: str) -> dict:
    return {u.id: u.name for u in db.query(User).filter(User.tenant_id == tenant_id).all()}


def _get_lead(db: Session, lead_id: str, tenant_id: str) -> Lead:
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.tenant_id == tenant_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


async def _broadcast_reassigned(db: Session, tenant_id: str, reassigned: List[Lead]) -> None:
    if not reassigned:
        return
    users = _users_map(db, tenant_id)
    metrics.inc("hot_queue_reassigned", len(reassigned))
    await ws_manager.broadcast(tenant_id, {
        "type": "hot_queue_reassigned",
        "leads": [lead_payload(l, users.get(l.assigned_to)) for l in reassigned],
    })


@router.get("", response_model=List[LeadResponse])
def list_leads(
    stage: Optional[str] = None,
    assigned_to: Optional[str] = None,
    is_hot_queue: Optional[bool] = None,
    search: Optional[str] = None,
    mine: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Lead).filter(Lead.tenant_id == current_user.tenant_id)
    if stage:
        query = query.filter(Lead.stage == stage)
    if mine:
        query = query.filter(or_(Lead.assigned_to == current_user.id, Lead.is_hot_queue == True))  # noqa: E712
    elif assigned_to:
        query = query.filter(Lead.assigned_to == assigned_to)
    if is_hot_queue is not None:
        query = query.filter(Lead.is_hot_queue == is_hot_queue)
    if search:
        like = f"%{search.strip()}%"
        query = query.filter(or_(
            Lead.company_name.ilike(like), Lead.contact_name.ilike(like), Lead.contact_email.ilike(like),
        ))

    leads = query.all()
    # Recency decays continuously, so recompute priority at read time rather
    # than trusting the value written at the last score change.
    for lead in leads:
        refresh_priority(lead)
    leads.sort(key=lambda l: (not l.is_hot_queue, l.stage in CLOSED_STAGES, -l.priority_score, -l.current_score))

    users = _users_map(db, current_user.tenant_id)
    result = [lead_payload(l, users.get(l.assigned_to)) for l in leads]
    db.rollback()  # priority refresh is read-only here; don't persist it
    return result


@router.post("", response_model=LeadResponse, status_code=201)
async def create_lead(
    lead_data: LeadCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    lead = Lead(
        tenant_id=current_user.tenant_id,
        company_name=lead_data.company_name,
        company_size=lead_data.company_size,
        contact_name=lead_data.contact_name,
        contact_email=lead_data.contact_email,
        current_score=lead_data.initial_score,
        priority_score=calculate_priority_score(lead_data.initial_score, now),
        stage="New",
        created_at=now,
        updated_at=now,
    )
    db.add(lead)
    db.flush()
    db.add(ScoreExplanation(
        tenant_id=lead.tenant_id, lead_id=lead.id,
        previous_score=0, new_score=lead.current_score, delta=lead.current_score,
        reason_text=f"+{lead.current_score} points: initial baseline score set at lead creation",
        features={"feature_name": "lead_created", "weight": lead.current_score},
    ))
    db.commit()

    _, status_reason = assign_lead(db, lead)
    db.refresh(lead)
    users = _users_map(db, current_user.tenant_id)
    payload = lead_payload(lead, users.get(lead.assigned_to))

    await ws_manager.broadcast(current_user.tenant_id, {
        "type": "lead_created", "lead": payload, "assignment_status": status_reason,
    })
    return payload


@router.get("/{lead_id}", response_model=LeadDetailResponse)
def get_lead_detail(lead_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lead = _get_lead(db, lead_id, current_user.tenant_id)
    users = _users_map(db, current_user.tenant_id)
    metrics.inc("explanation_viewed")
    return {
        **lead_payload(lead, users.get(lead.assigned_to)),
        "explanations": db.query(ScoreExplanation).filter(ScoreExplanation.lead_id == lead.id)
            .order_by(ScoreExplanation.created_at.desc()).all(),
        "transitions": db.query(PipelineTransition).filter(PipelineTransition.lead_id == lead.id)
            .order_by(PipelineTransition.created_at.desc()).all(),
        "assignments": db.query(AssignmentLog).filter(AssignmentLog.lead_id == lead.id)
            .order_by(AssignmentLog.created_at.desc()).all(),
        "events": db.query(Event).filter(Event.lead_id == lead.id).order_by(Event.received_at.desc()).all(),
    }


@router.post("/{lead_id}/transition", response_model=LeadResponse)
async def transition_lead_stage(
    lead_id: str,
    req: StageTransitionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = _get_lead(db, lead_id, current_user.tenant_id)
    if req.to_stage not in STAGE_ORDER:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Allowed: {STAGE_ORDER}")
    if req.to_stage == lead.stage:
        raise HTTPException(status_code=400, detail="Lead is already in that stage")

    # PRD §8: concurrent transitions → optimistic locking on the version column.
    if req.expected_version is not None and req.expected_version != lead.version:
        raise HTTPException(status_code=409, detail={
            "error": "version_conflict",
            "message": "This lead changed since you loaded it. Refresh and try again.",
            "current_version": lead.version, "current_stage": lead.stage,
        })

    current_idx = STAGE_ORDER.index(lead.stage) if lead.stage in STAGE_ORDER else 0
    target_idx = STAGE_ORDER.index(req.to_stage)
    was_closed = lead.stage in CLOSED_STAGES
    is_backward = target_idx < current_idx or was_closed
    is_closed = req.to_stage in CLOSED_STAGES

    # US-03: backward or closed transitions require explicit confirmation + rationale.
    if (is_backward or is_closed) and (not req.confirmed or not (req.reason or "").strip()):
        raise HTTPException(status_code=400, detail={
            "error": "confirmation_required",
            "message": f"Moving to '{req.to_stage}' requires explicit confirmation and a rationale.",
            "is_backward": is_backward, "is_closed": is_closed,
        })

    old_stage = lead.stage
    lead.stage = req.to_stage
    lead.updated_at = datetime.now(timezone.utc)
    lead.version += 1
    if is_closed:
        lead.is_hot_queue = False
    db.add(PipelineTransition(
        tenant_id=lead.tenant_id, lead_id=lead.id, from_stage=old_stage, to_stage=req.to_stage,
        triggered_by=f"manual_{current_user.role}",
        confirmed_by=current_user.email if (is_backward or is_closed) else None,
        reason=req.reason or f"Manually transitioned by {current_user.name}",
        is_automatic=False,
    ))
    db.commit()
    db.refresh(lead)
    metrics.inc("stage_transitions_manual")

    # Closing frees capacity; reopening may need a rep again.
    reassigned: List[Lead] = []
    if is_closed:
        reassigned = fill_capacity_from_hot_queue(db, current_user.tenant_id)
    elif was_closed and not lead.assigned_to:
        assign_lead(db, lead)
        db.refresh(lead)

    users = _users_map(db, current_user.tenant_id)
    payload = lead_payload(lead, users.get(lead.assigned_to))
    await ws_manager.broadcast(current_user.tenant_id, {
        "type": "stage_transitioned",
        "lead_id": lead.id,
        "lead": payload,
        "from_stage": old_stage,
        "to_stage": req.to_stage,
        "confirmed_by": current_user.email,
        "reason": req.reason,
    })
    await _broadcast_reassigned(db, current_user.tenant_id, reassigned)
    return payload


class ReassignRequest(BaseModel):
    to_user: str
    reason: Optional[str] = None


@router.post("/{lead_id}/assign", response_model=LeadResponse)
async def reassign_lead(
    lead_id: str,
    req: ReassignRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Manager override: assign a lead to a specific rep (capacity is advisory here)."""
    lead = _get_lead(db, lead_id, current_user.tenant_id)
    rep = db.query(User).filter(User.id == req.to_user, User.tenant_id == current_user.tenant_id).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Rep not found")
    previous = lead.assigned_to
    lead.assigned_to = rep.id
    lead.is_hot_queue = False
    lead.version += 1
    db.add(AssignmentLog(
        tenant_id=lead.tenant_id, lead_id=lead.id, from_user=previous, to_user=rep.id,
        reason=req.reason or f"Manually assigned to {rep.name} by {current_user.name}",
    ))
    db.commit()
    db.refresh(lead)
    reassigned = fill_capacity_from_hot_queue(db, current_user.tenant_id) if previous else []
    users = _users_map(db, current_user.tenant_id)
    payload = lead_payload(lead, users.get(lead.assigned_to))
    await ws_manager.broadcast(current_user.tenant_id, {"type": "lead_assigned", "lead": payload})
    await _broadcast_reassigned(db, current_user.tenant_id, reassigned)
    return payload


@router.delete("/{lead_id}/personal-data", status_code=status.HTTP_200_OK)
async def erase_personal_data(
    lead_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """GDPR/CCPA erasure (PRD §7). Contact PII and raw event payloads are wiped;
    the score ledger keeps its numbers (no PII) so the audit trail stays intact."""
    lead = _get_lead(db, lead_id, current_user.tenant_id)
    lead.contact_name = "[erased]"
    lead.contact_email = f"erased+{lead.id[:8]}@redacted.invalid"
    lead.version += 1
    for ev in db.query(Event).filter(Event.lead_id == lead.id).all():
        ev.payload = {"erased": True}
    db.commit()
    metrics.inc("gdpr_erasures")
    await ws_manager.broadcast(current_user.tenant_id, {
        "type": "lead_updated_silent", "lead": lead_payload(lead, _users_map(db, current_user.tenant_id).get(lead.assigned_to)),
    })
    return {"status": "erased", "lead_id": lead.id}
