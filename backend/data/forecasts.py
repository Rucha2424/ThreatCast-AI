from datetime import datetime, timezone

from backend.models.schemas import (
    ForecastResponse,
    ForecastStage,
    ModelComparisonResponse,
)

from backend.database.neo4j_client import (
    get_driver,
    get_database,
)


WARNING_THRESHOLD = 0.08


def _timestamp_to_string(value):
    """
    Convert Neo4j/Python timestamp values to an ISO string.
    """

    if value is None:
        return datetime.now(
            timezone.utc
        ).isoformat()

    if hasattr(value, "isoformat"):
        return value.isoformat()

    return str(value)


def _get_latest_prediction():
    """
    Read the latest persisted CTU13 LSTM prediction
    directly from Neo4j.

    No CSV loading and no model inference are performed.
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

    ORDER BY
        p.prediction_timestamp DESC

    LIMIT 1
    """

    with driver.session(
        database=database
    ) as session:

        result = session.run(
            query
        ).single()

    if result is None:
        raise RuntimeError(
            "No CTU13 LSTM predictions were found in Neo4j."
        )

    probability = float(
        result["probability"]
        if result["probability"] is not None
        else 0.0
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
        "scenario_number": result[
            "scenario_number"
        ],
        "network_state_id": result[
            "network_state_id"
        ],
        "state_timestamp": result[
            "state_timestamp"
        ],
        "prediction_id": result[
            "prediction_id"
        ],
        "probability": probability,
        "threshold": threshold,
        "warning": warning,
        "label": result["label"],
        "prediction_timestamp": result[
            "prediction_timestamp"
        ],
        "model": result["model"],
    }


def _make_current_state(data):
    """
    Convert a persistent Neo4j Prediction into the
    ForecastStage expected by the frontend/API.
    """

    probability = max(
        0.0,
        min(
            1.0,
            float(data["probability"]),
        ),
    )

    warning = bool(
        data["warning"]
    )

    if warning:

        stage_name = (
            "Early Warning — Attack Risk Detected"
        )

        tactic = "ML Early Warning"

        description = (
            "The deployed CTU13 LSTM produced an "
            "elevated early-warning probability from "
            "the persisted prediction."
        )

        mitigation = (
            "Increase monitoring, inspect subsequent "
            "30-second network states, and investigate "
            "traffic associated with the affected "
            "scenario."
        )

        state_type = "predicted"

    else:

        stage_name = (
            "Normal Network State"
        )

        tactic = "N/A"

        description = (
            "The persisted CTU13 LSTM prediction is "
            "below the deployed early-warning threshold."
        )

        mitigation = (
            "Continue normal network monitoring and "
            "collect subsequent 30-second network states."
        )

        state_type = "observed"

    return ForecastStage(
        stage_id="ctu13-current",

        horizon="T0",

        stage_name=stage_name,

        tactic=tactic,

        technique_id="N/A",

        state_type=state_type,

        confidence=probability,

        estimated_time_to_impact=(
            "Next 5 × 30-second states"
        ),

        affected_nodes=[],

        recommended_mitigation=mitigation,

        description=description,

        probability_distribution={
            "Early Warning": probability,
            "Normal": 1.0 - probability,
        },
    )


def get_forecast() -> ForecastResponse:
    """
    Return the latest persistent CTU13 LSTM
    early-warning prediction from Neo4j.

    Important:
    - No CSV access.
    - No fresh model inference.
    - No fabricated future attack stages.
    """

    data = _get_latest_prediction()

    probability = float(
        data["probability"]
    )

    threshold = float(
        data["threshold"]
    )

    warning = bool(
        data["warning"]
    )

    current_state = _make_current_state(
        data
    )

    scenario = data[
        "scenario_number"
    ]

    if warning:

        narrative = (
            f"CTU13 scenario {scenario} has a "
            f"persisted early-warning probability of "
            f"{probability * 100:.4f}%, which is at or "
            f"above the deployed threshold of "
            f"{threshold * 100:.0f}%. "
            "The CTU13 LSTM provides an early-warning "
            "signal only; it does not independently "
            "predict specific MITRE ATT&CK stages."
        )

    else:

        narrative = (
            f"CTU13 scenario {scenario} has a "
            f"persisted early-warning probability of "
            f"{probability * 100:.4f}%, below the "
            f"deployed threshold of "
            f"{threshold * 100:.0f}%. "
            "The current result is classified as "
            "normal. The CTU13 LSTM predicts "
            "early-warning risk, not specific MITRE "
            "ATT&CK stages."
        )

    return ForecastResponse(
        current_state=current_state,

        future_stages=[],

        summary_narrative=narrative,

        model_used=(
            "CTU13 LSTM Early Warning "
            f"(threshold={threshold})"
        ),

        graph_context=(
            "No graph-based attack-path inference is "
            "produced by the CTU13 LSTM. The deployed "
            "model uses 12 network-state features across "
            "5 consecutive 30-second states."
        ),

        last_updated=_timestamp_to_string(
            data["prediction_timestamp"]
        ),
    )


def get_forecast_comparison():
    """
    Return the research comparison between the
    CTU13 LSTM and DAPT2020 LSTM.

    These are different datasets and different tasks.
    Their confidence values are therefore not directly
    comparable.
    """

    return ModelComparisonResponse(
        lstm_a={
            "name": "CTU13 LSTM",

            "feature_type": (
                "12 engineered network-state features"
            ),

            "architecture": (
                "LSTM 64 → Dropout → Dense 32 → Sigmoid"
            ),

            "prediction": (
                "Binary early-warning prediction"
            ),

            "confidence": 0.0,

            "stability": (
                "Cross-scenario performance varies"
            ),

            "false_positive_rate": (
                "3.11% on held-out CTU13 test set"
            ),

            "latency_ms": 0.0,

            "graph_awareness": "None",

            "key_advantage": (
                "Temporal early-warning prediction from "
                "five consecutive 30-second network states"
            ),
        },

        lstm_b={
            "name": "DAPT2020 LSTM",

            "feature_type": (
                "DAPT2020 network-flow features"
            ),

            "architecture": "LSTM",

            "prediction": (
                "Attack-stage classification"
            ),

            "confidence": 0.0,

            "stability": (
                "Poor attack-stage generalization"
            ),

            "false_positive_rate": (
                "Not directly comparable"
            ),

            "latency_ms": 0.0,

            "graph_awareness": "None",

            "key_advantage": (
                "Separate research model for attack-stage "
                "classification on DAPT2020"
            ),
        },

        divergence_analysis=(
            "The CTU13 LSTM and DAPT2020 LSTM perform "
            "different tasks on different datasets. "
            "CTU13 predicts binary early-warning risk, "
            "while DAPT2020 classifies attack stages. "
            "Their confidence values must therefore not "
            "be interpreted as directly comparable "
            "attack probabilities."
        ),

        advantage_note=(
            "The deployed ThreatCast model is the CTU13 "
            "LSTM early-warning model. The DAPT2020 LSTM "
            "is retained as a separate research model "
            "for attack-stage classification."
        ),

        evaluation_benchmark=(
            "CTU13 held-out test set: Accuracy 83.82%, "
            "Precision 58.82%, Recall 21.28%, F1 31.25%, "
            "False Positive Rate 3.11%, ROC-AUC 0.5238, "
            "PR-AUC 0.3644. "
            "DAPT2020 results are not directly comparable "
            "because the dataset and prediction task differ."
        ),

        last_updated=datetime.now(
            timezone.utc
        ).isoformat(),
    )