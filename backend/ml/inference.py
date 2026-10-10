from pathlib import Path
from typing import List

import joblib
import numpy as np
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[2]

MODEL_PATH = PROJECT_ROOT / "lstm_early_warning_multiscenario.keras"
SCALER_PATH = PROJECT_ROOT / "lstm_early_warning_scaler.pkl"


FEATURE_NAMES = [
    "Flow_Count",
    "Total_Packets",
    "Total_Bytes",
    "Total_Source_Bytes",
    "Avg_Duration",
    "Avg_Packets_Per_Flow",
    "Avg_Bytes_Per_Flow",
    "Flow_Count_Change",
    "Total_Packets_Change",
    "Total_Bytes_Change",
    "Total_Source_Bytes_Change",
    "Avg_Duration_Change",
]


SEQUENCE_LENGTH = 5
WARNING_THRESHOLD = 0.08


_model = None
_scaler = None


def _load_model():
    global _model

    if _model is None:
        try:
            import tensorflow as tf
        except ImportError as exc:
            raise RuntimeError(
                "TensorFlow is required for the legacy CTU13 LSTM early-warning "
                "model. Install project dependencies or use the PyTorch world "
                "model rollout path."
            ) from exc

        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"CTU13 LSTM model not found: {MODEL_PATH}"
            )

        _model = tf.keras.models.load_model(MODEL_PATH)

        expected_shape = (5, 12)

        if _model.input_shape[-2:] != expected_shape:
            raise ValueError(
                f"Unexpected model input shape: {_model.input_shape}. "
                f"Expected (None, {expected_shape[0]}, {expected_shape[1]})."
            )

    return _model


def _load_scaler():
    global _scaler

    if _scaler is None:
        if not SCALER_PATH.exists():
            raise FileNotFoundError(
                f"CTU13 scaler not found: {SCALER_PATH}"
            )

        _scaler = joblib.load(SCALER_PATH)

        if getattr(_scaler, "n_features_in_", None) != 12:
            raise ValueError(
                "Unexpected scaler feature count: "
                f"{getattr(_scaler, 'n_features_in_', None)}. "
                "Expected 12."
            )

    return _scaler


def _validate_sequence(sequence: List[List[float]]) -> np.ndarray:
    array = np.asarray(sequence, dtype=np.float32)

    expected_shape = (
        SEQUENCE_LENGTH,
        len(FEATURE_NAMES),
    )

    if array.shape != expected_shape:
        raise ValueError(
            f"Expected sequence shape {expected_shape}, "
            f"received {array.shape}."
        )

    if not np.isfinite(array).all():
        raise ValueError(
            "Input sequence contains NaN or infinite values."
        )

    return array


def predict_early_warning(sequence: List[List[float]]) -> dict:
    raw_sequence = _validate_sequence(sequence)

    scaler = _load_scaler()
    model = _load_model()

    # Keep feature names so StandardScaler does not emit
    # the "X does not have valid feature names" warning.
    sequence_df = pd.DataFrame(
        raw_sequence,
        columns=FEATURE_NAMES,
    )

    scaled = scaler.transform(sequence_df)

    model_input = np.expand_dims(
        scaled.astype(np.float32),
        axis=0,
    )

    probability = float(
        model.predict(
            model_input,
            verbose=0,
        )[0][0]
    )

    probability = max(
        0.0,
        min(1.0, probability),
    )

    warning = probability >= WARNING_THRESHOLD

    return {
        "probability": probability,
        "probability_percent": round(
            probability * 100.0,
            4,
        ),
        "threshold": WARNING_THRESHOLD,
        "warning": warning,
        "label": (
            "EARLY WARNING"
            if warning
            else "NORMAL"
        ),
        "model": "CTU13 LSTM",
        "sequence_length": SEQUENCE_LENGTH,
        "feature_count": len(FEATURE_NAMES),
        "features": FEATURE_NAMES,
    }


def get_model_info() -> dict:
    model = _load_model()
    scaler = _load_scaler()

    return {
        "model": "CTU13 LSTM Early Warning",
        "model_file": MODEL_PATH.name,
        "scaler_file": SCALER_PATH.name,
        "input_shape": list(model.input_shape),
        "output_shape": list(model.output_shape),
        "timesteps": SEQUENCE_LENGTH,
        "features": len(FEATURE_NAMES),
        "feature_names": FEATURE_NAMES,
        "threshold": WARNING_THRESHOLD,
        "scaler_features": scaler.n_features_in_,
    }
