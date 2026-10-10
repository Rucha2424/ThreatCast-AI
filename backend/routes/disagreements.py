from fastapi import APIRouter
from backend.models.schemas import DisagreementResponse
from backend.data.rules import get_disagreements

router = APIRouter(prefix="/api/disagreements", tags=["Model-Rule Disagreements"])


@router.get("", response_model=DisagreementResponse)
def read_disagreements():
    """Returns detected disagreements between AI graph models and deterministic security rules."""
    return get_disagreements()
