from __future__ import annotations

from pathlib import Path

import numpy as np
import torch

from backend.ml.inference import (
    FEATURE_NAMES,
    SEQUENCE_LENGTH,
)

from world_model.train_ctu13_risk_model import (
    CTU13RiskWorldModel,
)

from world_model.risk_calibration import (
    load_calibration,
    calibrate_logits,
    get_threshold,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]

CHECKPOINT_DIR = (
    PROJECT_ROOT
    / "world_model"
    / "checkpoints"
    / "ctu13_risk"
)

CHECKPOINT_PATH = (
    CHECKPOINT_DIR
    / "ctu13_risk_world_model.pt"
)

FEATURE_MEAN_PATH = (
    CHECKPOINT_DIR
    / "feature_mean.npy"
)

FEATURE_STD_PATH = (
    CHECKPOINT_DIR
    / "feature_std.npy"
)

DEVICE = torch.device("cpu")

FORECAST_HORIZON = 3

_model = None
_feature_mean = None
_feature_std = None
_calibration = None


def _load_model():
    global _model

    if _model is not None:
        return _model

    if not CHECKPOINT_PATH.exists():
        raise FileNotFoundError(
            f"World-model checkpoint not found: "
            f"{CHECKPOINT_PATH}"
        )

    checkpoint = torch.load(
        CHECKPOINT_PATH,
        map_location=DEVICE,
        weights_only=True,
    )

    model = CTU13RiskWorldModel()

    model.load_state_dict(
        checkpoint,
        strict=True,
    )

    model.to(DEVICE)
    model.eval()

    _model = model

    return _model


def _load_normalization():
    global _feature_mean
    global _feature_std

    if (
        _feature_mean is not None
        and _feature_std is not None
    ):
        return (
            _feature_mean,
            _feature_std,
        )

    if not FEATURE_MEAN_PATH.exists():
        raise FileNotFoundError(
            f"Feature mean not found: "
            f"{FEATURE_MEAN_PATH}"
        )

    if not FEATURE_STD_PATH.exists():
        raise FileNotFoundError(
            f"Feature std not found: "
            f"{FEATURE_STD_PATH}"
        )

    mean = np.load(
        FEATURE_MEAN_PATH
    ).astype(np.float32)

    std = np.load(
        FEATURE_STD_PATH
    ).astype(np.float32)

    expected_features = len(
        FEATURE_NAMES
    )

    if mean.shape != (
        expected_features,
    ):
        raise ValueError(
            f"Unexpected feature_mean shape: "
            f"{mean.shape}. Expected "
            f"({expected_features},)."
        )

    if std.shape != (
        expected_features,
    ):
        raise ValueError(
            f"Unexpected feature_std shape: "
            f"{std.shape}. Expected "
            f"({expected_features},)."
        )

    std = np.where(
        np.abs(std) < 1e-8,
        1.0,
        std,
    )

    _feature_mean = mean
    _feature_std = std

    return (
        _feature_mean,
        _feature_std,
    )


def _load_risk_calibration():
    global _calibration

    if _calibration is None:
        _calibration = load_calibration()

    return _calibration


def _validate_sequence(
    sequence: list[list[float]],
) -> np.ndarray:

    array = np.asarray(
        sequence,
        dtype=np.float32,
    )

    expected_shape = (
        SEQUENCE_LENGTH,
        len(FEATURE_NAMES),
    )

    if array.shape != expected_shape:
        raise ValueError(
            f"Expected sequence shape "
            f"{expected_shape}; received "
            f"{array.shape}."
        )

    if not np.isfinite(array).all():
        raise ValueError(
            "Sequence contains NaN or infinite values."
        )

    return array


def _validate_sequences(
    sequences: list[list[list[float]]],
) -> np.ndarray:

    array = np.asarray(
        sequences,
        dtype=np.float32,
    )

    expected_shape = (
        len(sequences),
        SEQUENCE_LENGTH,
        len(FEATURE_NAMES),
    )

    if array.ndim != 3:
        raise ValueError(
            "Expected a 3-dimensional sequence batch."
        )

    if array.shape[1:] != expected_shape[1:]:
        raise ValueError(
            f"Expected each sequence to have shape "
            f"{expected_shape[1:]}; received "
            f"{array.shape[1:]}."
        )

    if not np.isfinite(array).all():
        raise ValueError(
            "Sequence batch contains NaN or infinite values."
        )

    return array


def _run_raw_model(
    sequences: list[list[list[float]]],
):
    array = _validate_sequences(
        sequences
    )

    model = _load_model()

    mean, std = _load_normalization()

    normalized = (
        array - mean
    ) / std

    model_input = torch.tensor(
        normalized,
        dtype=torch.float32,
        device=DEVICE,
    )

    with torch.no_grad():

        current_latent = model.encode_current_state(
            model_input
        )

        latent_predictions = model.rollout_latent(
            current_latent,
            forecast_horizon=FORECAST_HORIZON,
        )

        risk_logits = model.risk_head(
            latent_predictions
        )

    current_latent = (
        current_latent
        .detach()
        .cpu()
        .numpy()
    )

    latent_predictions = (
        latent_predictions
        .detach()
        .cpu()
        .numpy()
    )

    risk_logits = (
        risk_logits
        .detach()
        .cpu()
        .numpy()
    )

    expected_logits_shape = (
        len(sequences),
        FORECAST_HORIZON,
    )

    if risk_logits.shape != expected_logits_shape:
        raise ValueError(
            "Unexpected risk-logit shape: "
            f"{risk_logits.shape}. "
            f"Expected {expected_logits_shape}."
        )

    return (
        current_latent,
        latent_predictions,
        risk_logits,
    )


def predict_world_model_batch(
    sequences: list[list[list[float]]],
) -> dict:

    if not sequences:
        raise ValueError(
            "At least one sequence is required."
        )

    current_latent, latent_predictions, risk_logits = (
        _run_raw_model(sequences)
    )

    calibration = _load_risk_calibration()

    calibrated_probabilities = np.zeros_like(
        risk_logits,
        dtype=np.float64,
    )

    for horizon_index in range(
        FORECAST_HORIZON
    ):

        calibrated_probabilities[:, horizon_index] = (
            calibrate_logits(
                risk_logits[:, horizon_index],
                horizon=horizon_index + 1,
                calibration=calibration,
            )
        )

    latest_index = (
        len(sequences) - 1
    )

    latest_probabilities = (
        calibrated_probabilities[
            latest_index
        ]
    )

    latest_raw_logits = (
        risk_logits[
            latest_index
        ]
    )

    rollout = []

    for index, probability in enumerate(
        latest_probabilities,
        start=1,
    ):

        probability = float(
            np.clip(
                probability,
                0.0,
                1.0,
            )
        )

        threshold = get_threshold(
            index,
            calibration=calibration,
        )

        rollout.append(
            {
                "step": index,
                "horizon": f"T+{index}",
                "risk_probability": probability,
                "risk_probability_percent": round(
                    probability * 100.0,
                    4,
                ),
                "threshold": threshold,
                "predicted_attack": bool(
                    probability >= threshold
                ),
            }
        )

    return {
        "model": (
            "CTU13 Temporal "
            "Infiltration Risk World Model"
        ),
        "model_status": "TRAINED_CHECKPOINT_LOADED",
        "checkpoint": CHECKPOINT_PATH.name,
        "sequence_length": SEQUENCE_LENGTH,
        "feature_count": len(FEATURE_NAMES),
        "latent_dimension": int(
            latent_predictions.shape[-1]
        ),
        "forecast_horizon": FORECAST_HORIZON,
        "features": FEATURE_NAMES,
        "rollout": rollout,
        "latent_rollout_shape": list(
            latent_predictions[
                latest_index
            ].shape
        ),
        "current_latent": [
            float(x)
            for x in current_latent[
                latest_index
            ]
        ],
        "latent_rollout": [
            [
                float(value)
                for value in step
            ]
            for step in latent_predictions[
                latest_index
            ]
        ],
        "rollout_is_recursive": True,
        "normalization": {
            "mean_file": FEATURE_MEAN_PATH.name,
            "std_file": FEATURE_STD_PATH.name,
        },
        "calibration": {
            "method": calibration["method"],
            "artifact": "risk_calibration.json",
            "scenario_adaptive": True,
            "calibration_windows": len(
                sequences
            ),
        },
        "raw_latest_logits": [
            float(x)
            for x in latest_raw_logits
        ],
        "note": (
            "Risk probabilities are generated from "
            "the trained CTU13 risk-head logits and "
            "then scenario-adaptively calibrated using "
            "the frozen validation-derived calibration "
            "artifact."
        ),
    }


def predict_world_model(
    sequence: list[list[float]],
) -> dict:

    _validate_sequence(
        sequence
    )

    return predict_world_model_batch(
        [sequence]
    )
