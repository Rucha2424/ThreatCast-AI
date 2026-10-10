from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from backend.ml.inference import (
    FEATURE_NAMES,
    SEQUENCE_LENGTH,
)


PROJECT_ROOT = Path(__file__).resolve().parents[2]

CTU13_STATES = PROJECT_ROOT / "data" / "CTU13" / "all_network_states.csv"


def _clean_numeric(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce").replace(
        [np.inf, -np.inf],
        np.nan,
    ).fillna(0.0)


def _derive_changes(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    base_columns = [
        "Flow_Count",
        "Total_Packets",
        "Total_Bytes",
        "Total_Source_Bytes",
        "Avg_Duration",
    ]

    for column in base_columns:
        if column not in df.columns:
            raise ValueError(f"Missing required feature: {column}")

        df[column] = _clean_numeric(df[column])

    df["Avg_Packets_Per_Flow"] = np.where(
        df["Flow_Count"] > 0,
        df["Total_Packets"] / df["Flow_Count"],
        0.0,
    )

    df["Avg_Bytes_Per_Flow"] = np.where(
        df["Flow_Count"] > 0,
        df["Total_Bytes"] / df["Flow_Count"],
        0.0,
    )

    for source, target in [
        ("Flow_Count", "Flow_Count_Change"),
        ("Total_Packets", "Total_Packets_Change"),
        ("Total_Bytes", "Total_Bytes_Change"),
        ("Total_Source_Bytes", "Total_Source_Bytes_Change"),
        ("Avg_Duration", "Avg_Duration_Change"),
    ]:
        df[target] = df[source].diff().fillna(0.0)

    return df


def validate_model_features(df: pd.DataFrame) -> None:
    missing = [
        feature
        for feature in FEATURE_NAMES
        if feature not in df.columns
    ]

    if missing:
        raise ValueError(
            "Input does not contain the required CTU13 model features: "
            + ", ".join(missing)
        )


def dataframe_to_sequence(
    df: pd.DataFrame,
    sequence_length: int = SEQUENCE_LENGTH,
) -> list[list[float]]:
    validate_model_features(df)

    if len(df) < sequence_length:
        raise ValueError(
            f"At least {sequence_length} temporal states are required. "
            f"Received {len(df)}."
        )

    recent = df.tail(sequence_length)

    values = recent[FEATURE_NAMES].astype(float).to_numpy()

    if not np.isfinite(values).all():
        raise ValueError("Input contains NaN or infinite values.")

    return values.tolist()


def load_ctu13_csv(
    path: str | Path,
    scenario: int | None = None,
) -> pd.DataFrame:
    path = Path(path)

    if not path.exists():
        raise FileNotFoundError(path)

    df = pd.read_csv(path)

    if "Scenario" in df.columns:
        if scenario is not None:
            df = df[df["Scenario"] == scenario]

        if "Timestamp" in df.columns:
            df["Timestamp"] = pd.to_datetime(
                df["Timestamp"],
                errors="coerce",
            )

        df = df.sort_values(
            ["Scenario", "Timestamp"],
            na_position="last",
        )

    elif "Timestamp" in df.columns:
        df["Timestamp"] = pd.to_datetime(
            df["Timestamp"],
            errors="coerce",
        )
        df = df.sort_values("Timestamp")

    df = _derive_changes(df)

    validate_model_features(df)

    return df.reset_index(drop=True)


def load_generic_feature_csv(
    path: str | Path,
) -> pd.DataFrame:
    path = Path(path)

    if not path.exists():
        raise FileNotFoundError(path)

    df = pd.read_csv(path)

    if "Timestamp" in df.columns:
        df["Timestamp"] = pd.to_datetime(
            df["Timestamp"],
            errors="coerce",
        )
        df = df.sort_values("Timestamp")

    df = _derive_changes(df)

    validate_model_features(df)

    return df.reset_index(drop=True)


def build_inference_payload(
    df: pd.DataFrame,
) -> dict[str, Any]:
    sequence = dataframe_to_sequence(df)

    timestamps = []

    if "Timestamp" in df.columns:
        timestamps = [
            str(x)
            for x in df.tail(SEQUENCE_LENGTH)["Timestamp"].tolist()
        ]

    return {
        "feature_names": FEATURE_NAMES,
        "sequence_length": SEQUENCE_LENGTH,
        "timestamps": timestamps,
        "sequence": sequence,
        "state_count": len(df),
    }


def prepare_uploaded_csv(
    path: str | Path,
    scenario: int | None = None,
) -> dict[str, Any]:
    df = load_ctu13_csv(path, scenario=scenario)

    return {
        "dataframe": df,
        "payload": build_inference_payload(df),
    }