from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
import csv
import io

from app.database import get_db
from app.models import (
    User, ScoringWeight, WeightChangeAudit, ScoreExplanation, PipelineTransition, Lead
)
from app.schemas import (
    ScoringWeightResponse, ScoringWeightUpdate,
    WeightChangeAuditResponse, UserCapacityUpdate, UserResponse
)
from app.auth import get_current_user, require_admin
from app.scoring_engine import ensure_default_weights
from app.assignment_engine import fill_capacity_from_hot_queue
from app.serializers import lead_payload
from app import metrics
from app.websocket_manager import ws_manager

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/scoring-weights", response_model=List[ScoringWeightResponse])
def get_scoring_weights(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    ensure_default_weights(db, current_user.tenant_id)
    weights = db.query(ScoringWeight).filter(
        ScoringWeight.tenant_id == current_user.tenant_id
    ).order_by(ScoringWeight.feature_name.asc()).all()
    return weights

@router.put("/scoring-weights", response_model=ScoringWeightResponse)
async def update_scoring_weight(
    update_data: ScoringWeightUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    ensure_default_weights(db, current_user.tenant_id)
    sw = db.query(ScoringWeight).filter(
        ScoringWeight.tenant_id == current_user.tenant_id,
        ScoringWeight.feature_name == update_data.feature_name
    ).first()

    if not sw:
        raise HTTPException(status_code=404, detail="Scoring weight feature not found")

    old_weight = sw.weight
    old_window = sw.window_hours

    sw.weight = update_data.weight
    sw.window_hours = update_data.window_hours
    if update_data.description:
        sw.description = update_data.description
    sw.updated_at = datetime.now(timezone.utc)

    # US-06: Immutable audit entry
    audit = WeightChangeAudit(
        tenant_id=current_user.tenant_id,
        changed_by=current_user.email,
        feature_name=update_data.feature_name,
        old_weight=old_weight,
        new_weight=update_data.weight,
        old_window_hours=old_window,
        new_window_hours=update_data.window_hours,
        changed_at=datetime.now(timezone.utc)
    )
    db.add(audit)
    db.commit()
    db.refresh(sw)
    metrics.inc("weight_updated")

    # Notify clients
    await ws_manager.broadcast(current_user.tenant_id, {
        "type": "weight_updated",
        "feature_name": sw.feature_name,
        "new_weight": sw.weight,
        "changed_by": current_user.name
    })

    return sw

@router.get("/weight-audit", response_model=List[WeightChangeAuditResponse])
def get_weight_audit_trail(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    audits = db.query(WeightChangeAudit).filter(
        WeightChangeAudit.tenant_id == current_user.tenant_id
    ).order_by(WeightChangeAudit.changed_at.desc()).limit(100).all()
    return audits

@router.put("/users/{user_id}/capacity", response_model=UserResponse)
async def update_user_capacity(
    user_id: str,
    update_data: UserCapacityUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id, User.tenant_id == current_user.tenant_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_capacity = user.max_concurrent_leads
    if update_data.max_concurrent_leads is not None:
        user.max_concurrent_leads = update_data.max_concurrent_leads
    if update_data.is_available is not None:
        user.is_available = update_data.is_available

    db.commit()
    db.refresh(user)

    # Capacity may have freed up: drain the hot queue into it.
    reassigned = fill_capacity_from_hot_queue(db, current_user.tenant_id)
    if reassigned:
        metrics.inc("hot_queue_reassigned", len(reassigned))
        names = {u.id: u.name for u in db.query(User).filter(User.tenant_id == current_user.tenant_id).all()}
        await ws_manager.broadcast(current_user.tenant_id, {
            "type": "hot_queue_reassigned",
            "leads": [lead_payload(l, names.get(l.assigned_to)) for l in reassigned],
        })

    await ws_manager.broadcast(current_user.tenant_id, {
        "type": "rep_capacity_updated",
        "user_id": user.id,
        "name": user.name,
        "max_concurrent_leads": user.max_concurrent_leads,
        "is_available": user.is_available,
        "reassigned_lead_ids": [l.id for l in reassigned],
    })

    return user

@router.get("/export/audit-csv")
def export_audit_log_csv(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """P2: Export of explanation audit logs"""
    explanations = db.query(ScoreExplanation).filter(
        ScoreExplanation.tenant_id == current_user.tenant_id
    ).order_by(ScoreExplanation.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Lead ID", "Event ID", "Feature", "Weight", "Previous Score", "New Score", "Delta", "Reason Text", "Timestamp"])

    for exp in explanations:
        writer.writerow([
            exp.id, exp.lead_id, exp.event_id or "",
            (exp.features or {}).get("feature_name") or (exp.features or {}).get("feature", ""),
            (exp.features or {}).get("weight", ""),
            exp.previous_score, exp.new_score,
            exp.delta, exp.reason_text, exp.created_at.isoformat()
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=score_explanations_audit.csv"}
    )
