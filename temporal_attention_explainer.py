from pathlib import Path

import numpy as np
import pandas as pd
import tensorflow as tf

from backend.ml.inference import (
    FEATURE_NAMES,
    SEQUENCE_LENGTH,
    _load_model,
    _load_scaler,
)


PROJECT_ROOT = Path(__file__).resolve().parent

CTU13_STATES_PATH = (
    PROJECT_ROOT
    / "data"
    / "CTU13"
    / "all_network_states.csv"
)


def load_latest_sequence():
    if not CTU13_STATES_PATH.exists():
        raise FileNotFoundError(
            f"CTU13 network states file not found: "
            f"{CTU13_STATES_PATH}"
        )

    df = pd.read_csv(CTU13_STATES_PATH)

    required_columns = [
        "Scenario",
        "Timestamp",
        *FEATURE_NAMES,
    ]

    missing = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing:
        raise ValueError(
            f"CTU13 network states file is missing "
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

    scenario = latest_row["Scenario"]

    scenario_df = (
        df[
            df["Scenario"] == scenario
        ]
        .sort_values("Timestamp")
    )

    if len(scenario_df) < SEQUENCE_LENGTH:
        raise ValueError(
            f"Scenario {scenario} has only "
            f"{len(scenario_df)} states. "
            f"At least {SEQUENCE_LENGTH} "
            f"states are required."
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

    return (
        str(scenario),
        latest_states,
        sequence_df,
    )


def compute_temporal_attribution(
    sequence_df: pd.DataFrame,
):
    scaler = _load_scaler()
    model = _load_model()

    scaled = scaler.transform(
        sequence_df
    ).astype(np.float32)

    model_input = np.expand_dims(
        scaled,
        axis=0,
    )

    baseline_probability = float(
        model.predict(
            model_input,
            verbose=0,
        )[0][0]
    )

    timestep_effects = []

    for timestep in range(
        SEQUENCE_LENGTH
    ):
        perturbed = scaled.copy()

        other_timesteps = [
            index
            for index in range(
                SEQUENCE_LENGTH
            )
            if index != timestep
        ]

        baseline_vector = np.mean(
            scaled[other_timesteps],
            axis=0,
        )

        perturbed[timestep] = baseline_vector

        perturbed_input = np.expand_dims(
            perturbed,
            axis=0,
        )

        perturbed_probability = float(
            model.predict(
                perturbed_input,
                verbose=0,
            )[0][0]
        )

        effect = abs(
            baseline_probability
            - perturbed_probability
        )

        timestep_effects.append(
            effect
        )

    effects = np.asarray(
        timestep_effects,
        dtype=np.float64,
    )

    total_effect = float(
        effects.sum()
    )

    if total_effect <= 0:
        weights = np.ones(
            SEQUENCE_LENGTH,
            dtype=np.float64,
        ) / SEQUENCE_LENGTH
    else:
        weights = (
            effects
            / total_effect
        )

    results = []

    for index, weight in enumerate(weights):
        if index == SEQUENCE_LENGTH - 1:
            label = "Current state"
        else:
            states_back = (
                SEQUENCE_LENGTH
                - 1
                - index
            )

            label = (
                f"T-{states_back}"
            )

        results.append(
            {
                "timestep": index + 1,
                "label": label,
                "relative_weight": round(
                    float(weight),
                    6,
                ),
                "percentage": round(
                    float(weight * 100.0),
                    2,
                ),
            }
        )

    return {
        "baseline_probability": (
            baseline_probability
        ),
        "temporal_attribution": results,
    }


def generate_temporal_attribution():
    (
        scenario,
        latest_states,
        sequence_df,
    ) = load_latest_sequence()

    result = compute_temporal_attribution(
        sequence_df
    )

    output_dir = (
        PROJECT_ROOT
        / "results"
        / "explainability"
    )

    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    output_path = (
        output_dir
        / "temporal_attribution.csv"
    )

    rows = []

    for item in result[
        "temporal_attribution"
    ]:
        timestep_index = (
            item["timestep"] - 1
        )

        timestamp = (
            latest_states[
                "Timestamp"
            ].iloc[timestep_index]
        )

        rows.append(
            {
                "Scenario": scenario,
                "Timestamp": timestamp,
                "Timestep": item["timestep"],
                "Label": item["label"],
                "Relative_Weight": item[
                    "relative_weight"
                ],
                "Percentage": item[
                    "percentage"
                ],
            }
        )

    output_df = pd.DataFrame(rows)

    output_df.to_csv(
        output_path,
        index=False,
    )

    print(
        "Temporal attribution generated."
    )

    print(
        f"Scenario: {scenario}"
    )

    print(
        "Baseline probability:",
        result[
            "baseline_probability"
        ],
    )

    print()
    print(
        "Temporal attribution:"
    )

    for item in result[
        "temporal_attribution"
    ]:
        print(
            f"{item['label']}: "
            f"{item['percentage']:.2f}%"
        )

    print()
    print(
        f"Saved to: {output_path}"
    )

    return result


if __name__ == "__main__":
    generate_temporal_attribution()