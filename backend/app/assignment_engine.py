import logging
from typing import List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import AssignmentLog, Lead, User

logger = logging.getLogger("assignment_engine")

CLOSED_STAGES = ("Closed-Won", "Closed-Lost")


def get_rep_open_lead_count(db: Session, user_id: str) -> int:
    """Number of open leads (not Closed-Won / Closed-Lost) assigned to a rep."""
    return db.query(func.count(Lead.id)).filter(
        Lead.assigned_to == user_id,
        ~Lead.stage.in_(CLOSED_STAGES),
    ).scalar() or 0


def _assignable_reps(db: Session, tenant_id: str) -> List[User]:
    reps = db.query(User).filter(
        User.tenant_id == tenant_id, User.is_available == True, User.role == "sales_rep"  # noqa: E712
    ).all()
    if not reps:
        # Tenants with no reps yet (e.g. a fresh signup) route to available admins.
        reps = db.query(User).filter(User.tenant_id == tenant_id, User.is_available == True).all()  # noqa: E712
    return reps


def _next_rep_round_robin(db: Session, tenant_id: str) -> Tuple[Optional[User], int]:
    """True round-robin: among reps with spare capacity, pick the one whose most
    recent assignment is oldest (never-assigned reps go first). Capacity-full or
    unavailable reps are skipped, which is what keeps the rotation fair."""
    best: Optional[Tuple[str, str, User, int]] = None
    for rep in _assignable_reps(db, tenant_id):
        load = get_rep_open_lead_count(db, rep.id)
        if load >= rep.max_concurrent_leads:
            continue
        last = db.query(func.max(AssignmentLog.created_at)).filter(
            AssignmentLog.tenant_id == tenant_id, AssignmentLog.to_user == rep.id
        ).scalar()
        key = (last.isoformat() if last else "", rep.id)
        if best is None or key < best[:2]:
            best = (key[0], key[1], rep, load)
    if best is None:
        return None, 0
    return best[2], best[3]


def assign_lead(db: Session, lead: Lead) -> Tuple[Optional[str], str]:
    """Assign a lead round-robin, respecting max_concurrent_leads.
    If every rep is at capacity the lead enters the Hot Queue."""
    rep, load = _next_rep_round_robin(db, lead.tenant_id)

    if rep is None:
        if not lead.is_hot_queue:
            lead.is_hot_queue = True
            lead.assigned_to = None
            db.add(AssignmentLog(
                tenant_id=lead.tenant_id, lead_id=lead.id, from_user=None, to_user=None,
                reason="All reps at capacity. Lead entered Hot Queue.",
            ))
        db.commit()
        return None, "hot_queue_entered"

    lead.assigned_to = rep.id
    lead.is_hot_queue = False
    db.add(AssignmentLog(
        tenant_id=lead.tenant_id, lead_id=lead.id, from_user=None, to_user=rep.id,
        reason=f"Round-robin assignment to {rep.name} (load {load + 1}/{rep.max_concurrent_leads})",
    ))
    db.commit()
    db.refresh(lead)
    return rep.id, "assigned"


def fill_capacity_from_hot_queue(db: Session, tenant_id: str) -> List[Lead]:
    """Drain the Hot Queue into any free capacity, highest priority first.
    Called whenever capacity may have freed up (close, capacity raise, rep
    becomes available, new rep). Returns the leads that were reassigned."""
    reassigned: List[Lead] = []
    hot_leads = db.query(Lead).filter(
        Lead.tenant_id == tenant_id,
        Lead.is_hot_queue == True,  # noqa: E712
    ).order_by(Lead.priority_score.desc(), Lead.current_score.desc()).all()

    for lead in hot_leads:
        if lead.stage in CLOSED_STAGES:
            lead.is_hot_queue = False
            continue
        rep, load = _next_rep_round_robin(db, tenant_id)
        if rep is None:
            break
        lead.is_hot_queue = False
        lead.assigned_to = rep.id
        lead.version += 1
        db.add(AssignmentLog(
            tenant_id=tenant_id, lead_id=lead.id, from_user=None, to_user=rep.id,
            reason=f"Auto-reassigned from Hot Queue to {rep.name} after capacity freed "
                   f"(load {load + 1}/{rep.max_concurrent_leads})",
        ))
        db.flush()
        reassigned.append(lead)

    db.commit()
    for lead in reassigned:
        db.refresh(lead)
    if reassigned:
        logger.info("Hot queue drained: %d lead(s) reassigned in tenant %s", len(reassigned), tenant_id)
    return reassigned


def check_and_reassign_hot_queue(db: Session, rep_id: str) -> Optional[Lead]:
    """Backwards-compatible wrapper: drain the hot queue for the rep's tenant and
    return the first reassigned lead, if any."""
    rep = db.query(User).filter(User.id == rep_id).first()
    if not rep:
        return None
    reassigned = fill_capacity_from_hot_queue(db, rep.tenant_id)
    return reassigned[0] if reassigned else None
