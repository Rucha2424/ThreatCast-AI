from fastapi import APIRouter, Query
from typing import Optional
from backend.models.schemas import EventsResponse
from backend.data.events import get_events

router = APIRouter(prefix="/api/events", tags=["Events & Telemetry"])


@router.get("", response_model=EventsResponse)
def read_events(
    limit: int = Query(50, ge=1, le=200),
    risk_level: Optional[str] = Query(None, description="Filter by risk: LOW, MEDIUM, HIGH, CRITICAL"),
    tactic: Optional[str] = Query(None, description="Filter by MITRE ATT&CK tactic"),
):
    """Returns telemetry log of network events mapped to MITRE ATT&CK tactics."""
    return get_events(limit=limit, risk_level=risk_level, tactic=tactic)
