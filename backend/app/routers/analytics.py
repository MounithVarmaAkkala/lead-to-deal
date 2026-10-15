from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any

from app.database import get_db
from app.models import Lead, User, ScoreExplanation, PipelineTransition, AssignmentLog
from app.auth import get_current_user
from app.assignment_engine import get_rep_open_lead_count
from app import metrics
from app.websocket_manager import ws_manager

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/overview")
def get_analytics_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tenant_id = current_user.tenant_id

    total_leads = db.query(func.count(Lead.id)).filter(Lead.tenant_id == tenant_id).scalar() or 0
    hot_queue_count = db.query(func.count(Lead.id)).filter(
        Lead.tenant_id == tenant_id,
        Lead.is_hot_queue == True
    ).scalar() or 0

    closed_won_count = db.query(func.count(Lead.id)).filter(
        Lead.tenant_id == tenant_id,
        Lead.stage == "Closed-Won"
    ).scalar() or 0

    closed_lost_count = db.query(func.count(Lead.id)).filter(
        Lead.tenant_id == tenant_id,
        Lead.stage == "Closed-Lost"
    ).scalar() or 0

    avg_score = db.query(func.avg(Lead.current_score)).filter(Lead.tenant_id == tenant_id).scalar() or 0.0

    # Stages breakdown
    stages = ["New", "Engaged", "Contacted", "Qualified", "Proposal", "Negotiation", "Closed-Won", "Closed-Lost"]
    stage_counts = {}
    for stg in stages:
        cnt = db.query(func.count(Lead.id)).filter(
            Lead.tenant_id == tenant_id,
            Lead.stage == stg
        ).scalar() or 0
        stage_counts[stg] = cnt

    # Rep capacities
    reps = db.query(User).filter(User.tenant_id == tenant_id).all()
    rep_stats = []
    total_capacity = 0
    total_assigned = 0
    for r in reps:
        load = get_rep_open_lead_count(db, r.id)
        total_capacity += r.max_concurrent_leads
        total_assigned += load
        rep_stats.append({
            "id": r.id,
            "name": r.name,
            "email": r.email,
            "role": r.role,
            "is_available": r.is_available,
            "current_leads": load,
            "max_capacity": r.max_concurrent_leads,
            "utilization_pct": round((load / max(1, r.max_concurrent_leads)) * 100, 1)
        })

    # Recent explanation deltas
    recent_explanations_count = db.query(func.count(ScoreExplanation.id)).filter(
        ScoreExplanation.tenant_id == tenant_id
    ).scalar() or 0

    latency = metrics.latency_summary(tenant_id)
    return {
        "total_leads": total_leads,
        "hot_queue_count": hot_queue_count,
        "closed_won_count": closed_won_count,
        "closed_lost_count": closed_lost_count,
        "win_rate_pct": round((closed_won_count / max(1, closed_won_count + closed_lost_count)) * 100, 1),
        "avg_score": round(float(avg_score), 1),
        "stage_breakdown": stage_counts,
        "rep_capacities": rep_stats,
        "total_rep_capacity": total_capacity,
        "total_open_assigned": total_assigned,
        "system_health": {
            **latency,
            "p95_latency_ms": latency["p95_ms"],
            "target_latency_ms": 500.0,
            "status": "healthy" if latency["p95_ms"] < 500 else "degraded",
            "real_time_mode": "WebSocket Active" if ws_manager.connection_count(tenant_id) else "No live clients",
            "ws_clients": ws_manager.connection_count(tenant_id),
        },
        "explanations_count": recent_explanations_count
    }
