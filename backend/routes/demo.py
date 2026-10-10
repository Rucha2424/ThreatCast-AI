from pathlib import Path
from backend.data.live_explainability import explain_sequence
import pandas as pd
from typing import List
from fastapi import APIRouter, HTTPException

from backend.models.schemas import SimulateAttackRequest, SimulationResponse
from backend.data.state import state_manager

from backend.ml.inference import predict_early_warning, FEATURE_NAMES, SEQUENCE_LENGTH


router = APIRouter(prefix="/api/demo", tags=["Demo Simulation"])


PROJECT_ROOT = Path(__file__).resolve().parents[2]
CTU13_STATES_PATH = PROJECT_ROOT / "data" / "CTU13" / "all_network_states.csv"


@router.post("/simulate-attack", response_model=SimulationResponse)
def simulate_attack(req: SimulateAttackRequest):
    from backend.data.dashboard import get_dashboard_summary

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
    from backend.data.dashboard import get_dashboard_summary

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


@router.get("/ctu13")
def get_ctu13_demo(
    scenario: int = 12,
    states: int = 20,
):
    """
    Research demo using the real CTU13 network-state dataset
    and the deployed CTU13 LSTM early-warning model.
    """

    if not CTU13_STATES_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail=f"CTU13 state file not found: {CTU13_STATES_PATH}",
        )

    if states < SEQUENCE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"states must be at least {SEQUENCE_LENGTH}",
        )

    if states > 100:
        raise HTTPException(
            status_code=400,
            detail="states cannot exceed 100",
        )

    df = pd.read_csv(CTU13_STATES_PATH)

    required_columns = [
        "Scenario",
        "Timestamp",
        *FEATURE_NAMES,
        "Attack_Flow_Count",
        "Attack_State",
        "Target_Early_Warning",
    ]

    missing = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"Missing CTU13 columns: {missing}",
        )

    scenario_df = df[
        pd.to_numeric(df["Scenario"], errors="coerce") == scenario
    ].copy()

    if scenario_df.empty:
        available = sorted(
            pd.to_numeric(df["Scenario"], errors="coerce")
            .dropna()
            .astype(int)
            .unique()
            .tolist()
        )

        raise HTTPException(
            status_code=404,
            detail={
                "message": f"CTU13 scenario {scenario} not found.",
                "available_scenarios": available,
            },
        )

    scenario_df["Timestamp"] = pd.to_datetime(
        scenario_df["Timestamp"],
        errors="coerce",
    )

    scenario_df = scenario_df.dropna(
        subset=["Timestamp"]
    ).sort_values("Timestamp").reset_index(drop=True)

    if len(scenario_df) < SEQUENCE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Scenario {scenario} contains only {len(scenario_df)} "
                f"states; {SEQUENCE_LENGTH} are required."
            ),
        )

    predictions = []

    for index in range(
        SEQUENCE_LENGTH - 1,
        len(scenario_df),
    ):
        window = scenario_df.iloc[
            index - SEQUENCE_LENGTH + 1:index + 1
        ]

        sequence = window[FEATURE_NAMES].astype(float).values.tolist()

        result = predict_early_warning(sequence)

        row = scenario_df.iloc[index]

        feature_values = {
            feature: float(row[feature])
            for feature in FEATURE_NAMES
        }

        predictions.append(
            {
                **feature_values,
                "timestamp": row["Timestamp"].isoformat(),
                "probability": result["probability"],
                "probability_percent": result["probability_percent"],
                "warning": result["warning"],
                "label": result["label"],
                "actual_target": int(row["Target_Early_Warning"]),
                "attack_state": str(row["Attack_State"]),
                "attack_flow_count": float(row["Attack_Flow_Count"]),
            }
        )

    recent_predictions = predictions[-states:]

    timeline = []

    for prediction in recent_predictions:
        probability = prediction["probability"]

        if probability >= 0.08:
            status = "WARNING"
        else:
            status = "NORMAL"

        timeline.append(
            {
                **prediction,
                "status": status,
            }
        )

    latest = timeline[-1]

    warning_count = sum(
        1 for item in timeline
        if item["warning"]
    )

    target_count = sum(
        1 for item in timeline
        if item["actual_target"] == 1
    )

    return {
        "demo": "CTU13 Research Demo",
        "dataset": "CTU13",
        "scenario": scenario,
        "model": "CTU13 LSTM Early Warning",
        "sequence_length": SEQUENCE_LENGTH,
        "state_duration_seconds": 30,
        "temporal_context_seconds": SEQUENCE_LENGTH * 30,
        "feature_count": len(FEATURE_NAMES),
        "features": FEATURE_NAMES,
        "threshold": 0.08,
        "latest": latest,
        "timeline": timeline,
        "summary": {
            "states_shown": len(timeline),
            "warnings": warning_count,
            "early_warning_targets": target_count,
        },
        "research_note": (
            "Predictions are generated from the real CTU13 network-state "
            "features using the deployed trained LSTM. Attack_State and "
            "Target_Early_Warning are shown only as dataset annotations "
            "for research demonstration and are not model inputs."
        ),
    }
@router.post("/live-explain")
def live_explain(sequence: List[List[float]]):
    try:
        return explain_sequence(sequence)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )