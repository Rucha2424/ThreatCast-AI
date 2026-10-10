from fastapi import APIRouter
from backend.models.schemas import RulesListResponse
from backend.data.rules import get_rules

router = APIRouter(prefix="/api/rules", tags=["Deterministic Rules"])


@router.get("", response_model=RulesListResponse)
def read_rules():
    """Returns the list of active deterministic signature rules and trigger rates."""
    return get_rules()
