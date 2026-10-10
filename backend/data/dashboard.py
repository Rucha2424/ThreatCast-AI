from backend.models.schemas import (
    DashboardSummary,
    DashboardKpis,
    KpiItem,
    TrendItem,
)

from backend.database.neo4j_client import (
    get_driver,
    get_database,
)


WARNING_THRESHOLD = 0.08


def _get_latest_prediction():
    """
    Read the latest persistent CTU13 LSTM prediction
    directly from Neo4j.
    """

    driver = get_driver()
    database = get_database()

    query = """
    MATCH (s:Scenario)-[:HAS_STATE]->(n:NetworkState)
          -[:HAS_PREDICTION]->(p:Prediction)
    RETURN
        s.scenario_number AS scenario_number,
        n.id AS network_state_id,
        n.timestamp AS state_timestamp,
        p.id AS prediction_id,
        p.probability AS probability,
        p.threshold AS threshold,
        p.warning AS warning,
        p.label AS label,
        p.prediction_timestamp AS prediction_timestamp,
        p.model AS model
    ORDER BY p.prediction_timestamp DESC
    LIMIT 1
    """

    with driver.session(database=database) as session:
        result = session.run(query).single()

    if result is None:
        raise RuntimeError(
            "No CTU13 LSTM predictions found in Neo4j."
        )

    probability = float(
        result["probability"] or 0.0
    )

    threshold = float(
        result["threshold"]
        if result["threshold"] is not None
        else WARNING_THRESHOLD
    )

    warning = bool(
        result["warning"]
    )

    return {
        "scenario_number": result["scenario_number"],
        "network_state_id": result["network_state_id"],
        "state_timestamp": result["state_timestamp"],
        "prediction_id": result["prediction_id"],
        "probability": probability,
        "threshold": threshold,
        "warning": warning,
        "label": result["label"],
        "prediction_timestamp": result[
            "prediction_timestamp"
        ],
        "model": result["model"],
    }


def get_dashboard_summary() -> DashboardSummary:
    data = _get_latest_prediction()

    probability = max(
        0.0,
        min(1.0, data["probability"]),
    )

    threshold = data["threshold"]
    warning = data["warning"]

    probability_percent = round(
        probability * 100,
        4,
    )

    if warning:
        threat_level = (
            "CRITICAL"
            if probability >= 0.50
            else "HIGH"
        )

        threat_score = round(
            probability * 100
        )

        current_stage = (
            "Early Warning Assessment"
        )

        current_stage_tactic = (
            "ML Early Warning"
        )

        next_predicted_stage = (
            "Early Warning Signal"
        )

        next_predicted_tactic = (
            "ML Early Warning"
        )

        system_status = (
            "AI Engine Active — Early Warning"
        )

        active_threat_count = 1

        high_risk_node_count = 0

        recommended_action = (
            "Investigate the elevated CTU13 LSTM "
            "early-warning signal and continue "
            "collecting subsequent 30-second "
            "network states."
        )

    else:
        threat_level = "LOW"

        threat_score = round(
            probability * 100
        )

        current_stage = (
            "Normal Network State"
        )

        current_stage_tactic = "N/A"

        next_predicted_stage = (
            "No Elevated Early Warning"
        )

        next_predicted_tactic = "N/A"

        system_status = (
            "AI Engine Active — Normal"
        )

        active_threat_count = 0

        high_risk_node_count = 0

        recommended_action = (
            "Continue normal network monitoring "
            "and collect subsequent 30-second "
            "network states."
        )

    return DashboardSummary(
        threat_level=threat_level,
        threat_score=threat_score,
        current_stage=current_stage,
        current_stage_tactic=current_stage_tactic,
        next_predicted_stage=next_predicted_stage,
        next_predicted_tactic=next_predicted_tactic,
        forecast_confidence=probability,
        forecast_horizon="5 × 30-second states",
        recommended_action=recommended_action,
        system_status=system_status,
        active_threat_count=active_threat_count,
        high_risk_node_count=high_risk_node_count,
        disagreement_detected=False,
        disagreement_count=0,
        last_updated=data[
            "prediction_timestamp"
        ],
        active_scenario=(
            f"ctu13_scenario_{data['scenario_number']}"
        ),
    )


def get_dashboard_kpis() -> DashboardKpis:
    data = _get_latest_prediction()

    probability = max(
        0.0,
        min(1.0, data["probability"]),
    )

    threshold = data["threshold"]
    warning = data["warning"]

    probability_percent = round(
        probability * 100,
        4,
    )

    threshold_percent = round(
        threshold * 100,
        2,
    )

    if warning:
        threat_value = "1 Active"

        threat_context = (
            "CTU13 LSTM early-warning signal"
        )

        threat_trend = TrendItem(
            direction="up",
            value="Threshold exceeded",
        )

        threat_status = "danger"

        forecast_value = "1 Warning"

        forecast_context = (
            "5 × 30-second temporal window"
        )

        forecast_trend = TrendItem(
            direction="up",
            value=(
                f"{probability_percent}% "
                "warning probability"
            ),
        )

        forecast_status = "danger"

    else:
        threat_value = "0 Active"

        threat_context = (
            "No elevated early-warning signal"
        )

        threat_trend = TrendItem(
            direction="neutral",
            value="Within deployment threshold",
        )

        threat_status = "safe"

        forecast_value = "0 Warnings"

        forecast_context = (
            "5 × 30-second temporal window"
        )

        forecast_trend = TrendItem(
            direction="neutral",
            value=(
                f"{probability_percent}% "
                "warning probability"
            ),
        )

        forecast_status = "safe"

    cards = [
        KpiItem(
            id="kpi-threats",
            label="Active Threats",
            value=threat_value,
            context=threat_context,
            trend=threat_trend,
            status=threat_status,
        ),

        KpiItem(
            id="kpi-forecast",
            label="Early Warnings",
            value=forecast_value,
            context=forecast_context,
            trend=forecast_trend,
            status=forecast_status,
        ),

        KpiItem(
            id="kpi-nodes",
            label="High-Risk Nodes",
            value="0 Assets",
            context=(
                "CTU13 LSTM does not identify "
                "individual nodes"
            ),
            trend=TrendItem(
                direction="neutral",
                value=(
                    "Node attribution not available"
                ),
            ),
            status="safe",
        ),

        KpiItem(
            id="kpi-confidence",
            label="Forecast Confidence",
            value=f"{probability_percent}%",
            context=(
                "Persistent Neo4j CTU13 LSTM prediction"
            ),
            trend=TrendItem(
                direction=(
                    "up"
                    if warning
                    else "neutral"
                ),
                value=(
                    f"Above {threshold_percent}% "
                    "deployment threshold"
                    if warning
                    else f"Below {threshold_percent}% "
                    "deployment threshold"
                ),
            ),
            status=(
                "warning"
                if warning
                else "safe"
            ),
        ),

        KpiItem(
            id="kpi-disagreement",
            label="Model-Rule Disagreements",
            value="0 Signals",
            context=(
                "Rule comparison not connected "
                "to CTU13 inference"
            ),
            trend=TrendItem(
                direction="neutral",
                value=(
                    "Awaiting rule-engine integration"
                ),
            ),
            status="safe",
        ),
    ]

    return DashboardKpis(
        cards=cards,
        last_updated=data[
            "prediction_timestamp"
        ],
    )