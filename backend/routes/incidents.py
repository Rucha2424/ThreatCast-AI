from fastapi import APIRouter, HTTPException
from backend.models.schemas import IncidentListResponse, IncidentDetailResponse
from backend.data.incidents import get_incidents, get_incident_by_id

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])


@router.get("", response_model=IncidentListResponse)
def read_incidents():
    """Returns the full list of tracked and forecasted security incidents."""
    return get_incidents()


@router.get("/{incident_id}", response_model=IncidentDetailResponse)
def read_incident(incident_id: str):
    """Returns granular forensic details, timeline, and containment playbook for a specific incident."""
    res = get_incident_by_id(incident_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")
    return res
