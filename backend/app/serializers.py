from typing import Dict, Optional

from app.models import Lead


def lead_payload(lead: Lead, assignee_name: Optional[str] = None) -> Dict:
    return {
        "id": lead.id,
        "tenant_id": lead.tenant_id,
        "company_name": lead.company_name,
        "company_size": lead.company_size,
        "contact_name": lead.contact_name,
        "contact_email": lead.contact_email,
        "current_score": lead.current_score,
        "priority_score": lead.priority_score,
        "stage": lead.stage,
        "assigned_to": lead.assigned_to,
        "assignee_name": assignee_name or ("Hot Queue" if lead.is_hot_queue else ("Unassigned" if not lead.assigned_to else None)),
        "is_hot_queue": lead.is_hot_queue,
        "version": lead.version,
        "created_at": lead.created_at,
        "updated_at": lead.updated_at,
    }
