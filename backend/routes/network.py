from fastapi import APIRouter
from backend.models.schemas import NetworkGraphResponse, NetworkActivityResponse
from backend.data.network import get_network_graph, get_network_activity

router = APIRouter(prefix="/api/network", tags=["Network"])


@router.get("/graph", response_model=NetworkGraphResponse)
def read_network_graph():
    """Returns interactive network graph nodes, edges, active compromise path, and forecasted traversal vectors."""
    return get_network_graph()


@router.get("/activity", response_model=NetworkActivityResponse)
def read_network_activity():
    """Returns time-series telemetry series for bandwidth throughput, authentication anomalies, and risk trend."""
    return get_network_activity()
