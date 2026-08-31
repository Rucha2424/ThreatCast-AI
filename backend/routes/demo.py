from fastapi import APIRouter
from backend.models.schemas import SimulateAttackRequest, SimulationResponse
from backend.data.state import state_manager
from backend.data.dashboard import get_dashboard_summary

router = APIRouter(prefix="/api/demo", tags=["Demo Simulation"])


@router.post("/simulate-attack", response_model=SimulationResponse)
def simulate_attack(req: SimulateAttackRequest):
    """
    Mutates backend state to simulate an evolving attack scenario
    (e.g., 'lateral_movement_wave', 'exfiltration_crisis', 'ransomware_staging', or 'default').
    Causes all subsequent API calls across Dashboard, Forecast, Graph, and Disagreements to return the new attack state.
    """
    state_manager.set_scenario(req.scenario)
    summary = get_dashboard_summary()

    return SimulationResponse(
        status="success",
        message=f"Applied attack simulation scenario '{req.scenario}' to ThreatCast AI pipeline.",
        active_scenario=req.scenario,
        threat_level=summary.threat_level,
        current_stage=summary.current_stage,
        forecast_horizon=summary.forecast_horizon,
        last_updated=summary.last_updated,
    )


@router.post("/reset", response_model=SimulationResponse)
def reset_simulation():
    """Resets the simulation pipeline back to the default baseline scenario."""
    state_manager.set_scenario("default")
    summary = get_dashboard_summary()

    return SimulationResponse(
        status="success",
        message="ThreatCast AI state reset to baseline.",
        active_scenario="default",
        threat_level=summary.threat_level,
        current_stage=summary.current_stage,
        forecast_horizon=summary.forecast_horizon,
        last_updated=summary.last_updated,
    )
