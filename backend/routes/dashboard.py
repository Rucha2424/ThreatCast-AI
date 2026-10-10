from fastapi import APIRouter
from backend.models.schemas import DashboardSummary, DashboardKpis
from backend.data.dashboard import get_dashboard_summary, get_dashboard_kpis

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def read_dashboard_summary():
    """Returns top-level security posture, current threat level, and primary forecast hero metrics."""
    return get_dashboard_summary()


@router.get("/kpis", response_model=DashboardKpis)
def read_dashboard_kpis():
    """Returns 5 key performance indicator cards with trends and risk statuses."""
    return get_dashboard_kpis()
