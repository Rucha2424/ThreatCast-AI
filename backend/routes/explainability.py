from fastapi import APIRouter
from backend.models.schemas import ExplainabilityResponse
from backend.data.explainability import get_explainability

router = APIRouter(prefix="/api/explainability", tags=["Explainability"])


@router.get("/{incident_id}", response_model=ExplainabilityResponse)
def read_explainability(incident_id: str):
    """Returns feature attributions, FastRP topological graph proximity, and natural language reasoning for an incident."""
    return get_explainability(incident_id)
