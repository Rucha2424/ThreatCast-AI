from pathlib import Path
from typing import Optional

import pandas as pd

from backend.models.schemas import (
    ExplainabilityResponse,
    ShapFeatureImportance,
    ShapLocalContribution,
    ShapTimestepContribution,
    TemporalAttribution,
)

from backend.ml.inference import (
    FEATURE_NAMES,
    SEQUENCE_LENGTH,
    WARNING_THRESHOLD,
    predict_early_warning,
)


PROJECT_ROOT = Path(__file__).resolve().parents[2]

RESULTS_DIR = (
    PROJECT_ROOT
    / "results"
    / "explainability"
)

PREDICTION_SUMMARY_PATH = (
    RESULTS_DIR
    / "prediction_summary.csv"
)

GLOBAL_IMPORTANCE_PATH = (
    RESULTS_DIR
    / "global_feature_importance.csv"
)

LOCAL_EXPLANATIONS_PATH = (
    RESULTS_DIR
    / "local_warning_explanations.csv"
)

TIMESTEP_SHAP_PATH = (
    RESULTS_DIR
    / "timestep_feature_shap.csv"
)

TEMPORAL_ATTRIBUTION_PATH = (
    RESULTS_DIR
    / "temporal_attribution.csv"
)

CTU13_STATES_PATH = (
    PROJECT_ROOT
    / "data"
    / "CTU13"
    / "all_network_states.csv"
)


def _read_csv(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(
            f"Explainability file not found: {path}"
        )

    df = pd.read_csv(path)

    if df.empty:
        raise ValueError(
            f"Explainability file is empty: {path}"
        )

    return df


def _find_column(
    df: pd.DataFrame,
    candidates: list[str],
    required: bool = True,
) -> Optional[str]:

    normalized = {
        str(column).strip().lower(): column
        for column in df.columns
    }

    for candidate in candidates:
        key = candidate.strip().lower()

        if key in normalized:
            return normalized[key]

    if required:
        raise ValueError(
            "Required explainability column not found. "
            f"Expected one of: {candidates}. "
            f"Available columns: {list(df.columns)}"
        )

    return None


def _safe_float(value, default=0.0):

    try:
        result = float(value)

        if pd.isna(result):
            return default

        return result

    except (
        TypeError,
        ValueError,
    ):
        return default


def _safe_int(value, default=0):

    try:
        result = int(float(value))
        return result

    except (
        TypeError,
        ValueError,
    ):
        return default


def _direction_from_shap(
    shap_value: float,
) -> str:

    if shap_value > 0:
        return "toward_warning"

    if shap_value < 0:
        return "away_from_warning"

    return "neutral"


def _get_latest_ctu13_prediction():

    if not CTU13_STATES_PATH.exists():
        raise FileNotFoundError(
            "CTU13 network states file not found: "
            f"{CTU13_STATES_PATH}"
        )

    df = pd.read_csv(
        CTU13_STATES_PATH
    )

    required = [
        "Scenario",
        "Timestamp",
        *FEATURE_NAMES,
    ]

    missing = [
        column
        for column in required
        if column not in df.columns
    ]

    if missing:
        raise ValueError(
            "CTU13 network states file is missing "
            f"required columns: {missing}"
        )

    df["Timestamp"] = pd.to_datetime(
        df["Timestamp"],
        errors="coerce",
    )

    df = df.dropna(
        subset=["Timestamp"]
    )

    if df.empty:
        raise ValueError(
            "No valid CTU13 timestamps found."
        )

    latest_row = (
        df.sort_values("Timestamp")
        .iloc[-1]
    )

    scenario = str(
        latest_row["Scenario"]
    )

    scenario_df = (
        df[
            df["Scenario"] == latest_row["Scenario"]
        ]
        .sort_values("Timestamp")
    )

    if len(scenario_df) < SEQUENCE_LENGTH:
        raise ValueError(
            f"Scenario {scenario} has only "
            f"{len(scenario_df)} states. "
            f"At least {SEQUENCE_LENGTH} are required."
        )

    latest_states = (
        scenario_df
        .tail(SEQUENCE_LENGTH)
        .copy()
    )

    sequence_df = (
        latest_states[FEATURE_NAMES]
        .apply(
            pd.to_numeric,
            errors="coerce",
        )
    )

    if sequence_df.isna().any().any():
        raise ValueError(
            "Latest CTU13 sequence contains "
            "invalid feature values."
        )

    prediction = predict_early_warning(
        sequence_df.values.tolist()
    )

    timestamp = latest_states[
        "Timestamp"
    ].iloc[-1]

    timestamp_text = (
        timestamp.isoformat()
        if hasattr(timestamp, "isoformat")
        else str(timestamp)
    )

    return {
        "scenario": scenario,
        "timestamp": timestamp_text,
        "probability": float(
            prediction["probability"]
        ),
        "threshold": float(
            prediction["threshold"]
        ),
        "warning": bool(
            prediction["warning"]
        ),
        "label": str(
            prediction["label"]
        ),
    }


def _load_global_importance():

    df = _read_csv(
        GLOBAL_IMPORTANCE_PATH
    )

    feature_column = _find_column(
        df,
        [
            "feature",
            "Feature",
            "feature_name",
            "Feature_Name",
        ],
    )

    importance_column = _find_column(
        df,
        [
            "importance",
            "Importance",
            "mean_abs_shap",
            "Mean_Abs_SHAP",
            "mean_absolute_shap",
            "shap_importance",
        ],
    )

    records = []

    for _, row in df.iterrows():

        feature = str(
            row[feature_column]
        ).strip()

        if not feature:
            continue

        importance = _safe_float(
            row[importance_column]
        )

        records.append(
            ShapFeatureImportance(
                feature=feature,
                importance=importance,
            )
        )

    records.sort(
        key=lambda item: abs(item.importance),
        reverse=True,
    )

    return records


def _load_local_explanations():

    df = _read_csv(
        LOCAL_EXPLANATIONS_PATH
    )

    scenario_column = _find_column(
        df,
        [
            "scenario",
            "Scenario",
        ],
    )

    timestamp_column = _find_column(
        df,
        [
            "timestamp",
            "Timestamp",
        ],
    )

    probability_column = _find_column(
        df,
        [
            "probability",
            "Probability",
            "Prediction_Probability",
        ],
    )

    actual_target_column = _find_column(
        df,
        [
            "actual_target",
            "Actual_Target",
            "actual target",
            "target",
        ],
        required=False,
    )

    feature_column = _find_column(
        df,
        [
            "feature",
            "Feature",
            "signal_name",
            "Signal_Name",
        ],
    )

    shap_column = _find_column(
        df,
        [
            "shap_value",
            "SHAP_Value",
            "shap",
            "SHAP",
            "importance",
        ],
    )

    direction_column = _find_column(
        df,
        [
            "direction",
            "Direction",
        ],
        required=False,
    )

    records = []

    for _, row in df.iterrows():

        shap_value = _safe_float(
            row[shap_column]
        )

        direction = (
            str(row[direction_column]).strip()
            if direction_column
            else _direction_from_shap(
                shap_value
            )
        )

        actual_target = None

        if actual_target_column:

            raw_target = row[
                actual_target_column
            ]

            if not pd.isna(raw_target):

                actual_target = _safe_int(
                    raw_target
                )

        records.append(
            ShapLocalContribution(
                scenario=str(
                    row[scenario_column]
                ),
                timestamp=str(
                    row[timestamp_column]
                ),
                probability=_safe_float(
                    row[probability_column]
                ),
                actual_target=actual_target,
                feature=str(
                    row[feature_column]
                ),
                shap_value=shap_value,
                direction=direction,
            )
        )

    records.sort(
        key=lambda item: abs(item.shap_value),
        reverse=True,
    )

    return records


def _load_timestep_shap():

    df = _read_csv(
        TIMESTEP_SHAP_PATH
    )

    scenario_column = _find_column(
        df,
        [
            "scenario",
            "Scenario",
        ],
    )

    timestamp_column = _find_column(
        df,
        [
            "timestamp",
            "Timestamp",
            "Prediction_Timestamp",
        ],
    )

    timestep_column = _find_column(
        df,
        [
            "timestep",
            "Timestep",
            "time_step",
            "Time_Step",
        ],
    )

    feature_column = _find_column(
        df,
        [
            "feature",
            "Feature",
            "feature_name",
            "Feature_Name",
        ],
    )

    shap_column = _find_column(
        df,
        [
            "shap_value",
            "SHAP_Value",
            "shap",
            "SHAP",
            "value",
        ],
    )

    records = []

    for _, row in df.iterrows():

        records.append(
            ShapTimestepContribution(
                scenario=str(
                    row[scenario_column]
                ),
                timestamp=str(
                    row[timestamp_column]
                ),
                timestep=_safe_int(
                    row[timestep_column]
                ),
                feature=str(
                    row[feature_column]
                ),
                shap_value=_safe_float(
                    row[shap_column]
                ),
            )
        )

    records.sort(
        key=lambda item: (
            item.scenario,
            item.timestamp,
            item.timestep,
            -abs(item.shap_value),
        )
    )

    return records


def _load_temporal_attribution():

    df = _read_csv(
        TEMPORAL_ATTRIBUTION_PATH
    )

    timestep_column = _find_column(
        df,
        [
            "timestep",
            "Timestep",
            "time_step",
            "Time_Step",
        ],
    )

    label_column = _find_column(
        df,
        [
            "label",
            "Label",
        ],
    )

    relative_weight_column = _find_column(
        df,
        [
            "relative_weight",
            "Relative_Weight",
            "weight",
        ],
    )

    percentage_column = _find_column(
        df,
        [
            "percentage",
            "Percentage",
        ],
    )

    records = []

    for _, row in df.iterrows():

        records.append(
            TemporalAttribution(
                timestep=_safe_int(
                    row[timestep_column]
                ),
                label=str(
                    row[label_column]
                ),
                relative_weight=_safe_float(
                    row[relative_weight_column]
                ),
                percentage=_safe_float(
                    row[percentage_column]
                ),
            )
        )

    records.sort(
        key=lambda item: item.timestep
    )

    return records


def _get_recent_local_examples(
    records,
    limit=20,
):

    if not records:
        return []

    grouped = {}

    for record in records:

        key = (
            record.scenario,
            record.timestamp,
        )

        grouped.setdefault(
            key,
            [],
        ).append(record)

    selected = []

    for group in grouped.values():

        group.sort(
            key=lambda item: abs(
                item.shap_value
            ),
            reverse=True,
        )

        selected.extend(
            group[:5]
        )

    selected.sort(
        key=lambda item: (
            item.scenario,
            item.timestamp,
            -abs(item.shap_value),
        )
    )

    return selected[:limit]


def get_explainability(
    incident_id: str = "INC-8042",
) -> ExplainabilityResponse:

    prediction = (
        _get_latest_ctu13_prediction()
    )

    global_importance = (
        _load_global_importance()
    )

    local_records = (
        _load_local_explanations()
    )

    timestep_records = (
        _load_timestep_shap()
    )

    temporal_records = (
        _load_temporal_attribution()
    )

    probability = prediction[
        "probability"
    ]

    threshold = prediction[
        "threshold"
    ]

    warning = prediction[
        "warning"
    ]

    if warning:

        stage = (
            "Early Warning"
        )

        reasoning = (
            "The deployed CTU13 LSTM produced "
            "an early-warning probability at or "
            "above the configured 0.08 threshold "
            "using five consecutive 30-second "
            "network-state observations."
        )

    else:

        stage = (
            "Normal Network State"
        )

        reasoning = (
            "The deployed CTU13 LSTM produced "
            "an early-warning probability below "
            "the configured 0.08 threshold using "
            "five consecutive 30-second "
            "network-state observations."
        )

    return ExplainabilityResponse(

        incident_id=incident_id,

        model=(
            "CTU13 LSTM Early Warning"
        ),

        explanation_method=(
            "SHAP GradientExplainer + "
            "post-hoc temporal attribution"
        ),

        probability=probability,

        threshold=threshold,

        warning=warning,

        label=prediction["label"],

        scenario=prediction["scenario"],

        timestamp=prediction["timestamp"],

        sequence_length=SEQUENCE_LENGTH,

        state_duration_seconds=30,

        feature_count=len(
            FEATURE_NAMES
        ),

        predicted_stage=stage,

        confidence=probability,

        observed_stage=(
            "Aggregate Network State"
        ),

        forecast_reasoning=reasoning,

        graph_proximity_score=0.0,

        temporal_sequence_alignment=0.0,

        fastrp_embedding_note=(
            "FastRP is not used by the deployed "
            "CTU13 LSTM explainability pipeline."
        ),

        global_feature_importance=(
            global_importance
        ),

        contributing_signals=(
            _get_recent_local_examples(
                local_records,
                limit=20,
            )
        ),

        timestep_feature_shap=(
            timestep_records[:100]
        ),

        temporal_attribution=(
            temporal_records
        ),

        subgraph_nodes=[],

        subgraph_edges=[],

        scope_note=(
            "The CTU13 LSTM is a binary "
            "early-warning model. SHAP explains "
            "its 12 input features across a "
            "five-state temporal sequence. "
            "Post-hoc temporal attribution "
            "estimates the relative influence of "
            "each historical timestep by measuring "
            "the change in model output when that "
            "timestep is replaced by a baseline. "
            "This is not an internal neural "
            "attention layer. The model does not "
            "independently produce node-level "
            "attribution, graph attack paths, "
            "FastRP explanations, or MITRE ATT&CK "
            "stage predictions."
        ),

        last_updated=prediction[
            "timestamp"
        ],
    )