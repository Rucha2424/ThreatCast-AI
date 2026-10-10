"""
Runtime inference for the weakly-supervised CTU13 MITRE stage head.

IMPORTANT
---------
The CTU13 dataset does not contain timestamp-level ground-truth MITRE
ATT&CK tactic labels. The stage head was therefore trained using
documented CTU13 activity -> tactic weak labels.

This module:
    1. Loads the frozen CTU13 risk world model.
    2. Loads the trained stage head.
    3. Extracts the 64-D current latent from a 5 x 12 history.
    4. Predicts Discovery / Command and Control / Impact probabilities.
    5. Applies thresholds selected on validation scenarios only.
    6. Maps predicted tactics to the documented CTU13 ATT&CK interpretation.
    7. Produces feature-level evidence from the actual 12 model inputs.

It NEVER uses Scenario 13 labels for inference, calibration, or threshold
selection.

It does not claim port-level attribution because the CTU13 network-state
CSV used by the world model does not contain raw source/destination ports.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import json

import numpy as np
import torch
import torch.nn as nn

from world_model.train_ctu13_risk_model import (
    CTU13RiskWorldModel,
    FEATURE_NAMES,
    INPUT_DIM,
    LATENT_DIM,
    SEQUENCE_LENGTH,
)

from world_model.attack_stage import (
    ACTIVITY_MAP,
    SCENARIO_ACTIVITIES,
)


# ---------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent

CHECKPOINT_DIR = (
    BASE_DIR
    / "checkpoints"
    / "ctu13_risk"
)

RISK_CHECKPOINT = (
    CHECKPOINT_DIR
    / "ctu13_risk_world_model.pt"
)

STAGE_CHECKPOINT = (
    CHECKPOINT_DIR
    / "ctu13_stage_head.pt"
)

STAGE_METADATA = (
    CHECKPOINT_DIR
    / "stage_training_metadata.json"
)

FEATURE_MEAN_PATH = (
    CHECKPOINT_DIR
    / "feature_mean.npy"
)

FEATURE_STD_PATH = (
    CHECKPOINT_DIR
    / "feature_std.npy"
)


# ---------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------

STAGE_NAMES = [
    "Discovery",
    "Command and Control",
    "Impact",
]

STAGE_KEYS = [
    "discovery",
    "command_and_control",
    "impact",
]

EPS = 1e-8

DEVICE = torch.device("cpu")


# ---------------------------------------------------------------------
# Stage head architecture
# ---------------------------------------------------------------------

class StageClassificationHead(nn.Module):
    """
    Architecture used during stage-head training.

    64-D world-model latent
        -> Linear(64, 32)
        -> LayerNorm
        -> GELU
        -> Dropout
        -> Linear(32, 3)
    """

    def __init__(
        self,
        latent_dim: int = LATENT_DIM,
        num_classes: int = 3,
    ) -> None:
        super().__init__()

        self.network = nn.Sequential(
            nn.Linear(
                latent_dim,
                32,
            ),
            nn.LayerNorm(32),
            nn.GELU(),
            nn.Dropout(0.20),
            nn.Linear(
                32,
                num_classes,
            ),
        )

    def forward(
        self,
        x: torch.Tensor,
    ) -> torch.Tensor:
        return self.network(x)


# ---------------------------------------------------------------------
# Runtime singleton state
# ---------------------------------------------------------------------

_world_model: CTU13RiskWorldModel | None = None
_stage_head: StageClassificationHead | None = None

_feature_mean: np.ndarray | None = None
_feature_std: np.ndarray | None = None

_stage_metadata: dict[str, Any] | None = None


# ---------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------

def _load_state_dict(
    checkpoint_path: Path,
) -> dict[str, torch.Tensor]:
    """
    Safely load a PyTorch state dictionary.
    """

    if not checkpoint_path.exists():
        raise FileNotFoundError(
            f"Checkpoint not found: {checkpoint_path}"
        )

    checkpoint = torch.load(
        checkpoint_path,
        map_location=DEVICE,
    )

    if isinstance(checkpoint, dict):
        if "state_dict" in checkpoint:
            checkpoint = checkpoint["state_dict"]

        elif "model_state_dict" in checkpoint:
            checkpoint = checkpoint["model_state_dict"]

    if not isinstance(checkpoint, dict):
        raise RuntimeError(
            f"Unsupported checkpoint format: "
            f"{checkpoint_path}"
        )

    cleaned: dict[str, torch.Tensor] = {}

    for key, value in checkpoint.items():
        if isinstance(value, torch.Tensor):
            cleaned[key] = value

    if not cleaned:
        raise RuntimeError(
            f"No tensor parameters found in checkpoint: "
            f"{checkpoint_path}"
        )

    return cleaned


def _strip_module_prefix(
    state_dict: dict[str, torch.Tensor],
) -> dict[str, torch.Tensor]:
    """
    Handles checkpoints saved through DataParallel.
    """

    result = {}

    for key, value in state_dict.items():

        if key.startswith("module."):
            key = key[len("module."):]

        result[key] = value

    return result


def _load_stage_metadata() -> dict[str, Any]:
    global _stage_metadata

    if _stage_metadata is not None:
        return _stage_metadata

    if not STAGE_METADATA.exists():
        raise FileNotFoundError(
            f"Stage metadata not found: "
            f"{STAGE_METADATA}"
        )

    with open(
        STAGE_METADATA,
        "r",
        encoding="utf-8",
    ) as file:
        _stage_metadata = json.load(file)

    return _stage_metadata


def _extract_thresholds(
    metadata: dict[str, Any],
) -> np.ndarray:
    """
    Recover the validation-selected stage thresholds.

    The training script stores the thresholds in this format:

        "selected_validation_thresholds": {
            "Discovery": {
                "threshold": 0.1,
                "validation_f1": ...
            },
            "Command and Control": {
                "threshold": 0.1,
                "validation_f1": ...
            },
            "Impact": {
                "threshold": 0.1,
                "validation_f1": ...
            }
        }

    Thresholds are selected using validation data only.
    Scenario 13 is never used to derive these thresholds.
    """

    # -----------------------------------------------------------------
    # Supported metadata keys
    # -----------------------------------------------------------------

    possible_keys = [
        "selected_validation_thresholds",
        "validation_selected_thresholds",
        "selected_thresholds",
        "thresholds",
        "stage_thresholds",
    ]

    raw = None

    for key in possible_keys:
        if key in metadata:
            raw = metadata[key]
            break

    if raw is None:
        raise RuntimeError(
            "Could not find validation-selected stage "
            "thresholds in stage_training_metadata.json."
        )

    # -----------------------------------------------------------------
    # Dictionary format
    # -----------------------------------------------------------------

    if isinstance(raw, dict):

        values = []

        for stage_name in STAGE_NAMES:

            # ---------------------------------------------------------
            # First try exact stage name.
            #
            # Example:
            # "Command and Control"
            # ---------------------------------------------------------

            if stage_name in raw:
                entry = raw[stage_name]

            else:
                # -----------------------------------------------------
                # Also support normalized keys such as:
                #
                # "command_and_control"
                # -----------------------------------------------------

                normalized_key = (
                    stage_name
                    .lower()
                    .replace(" ", "_")
                )

                if normalized_key not in raw:
                    raise RuntimeError(
                        f"Missing threshold for stage: "
                        f"{stage_name}"
                    )

                entry = raw[normalized_key]

            # ---------------------------------------------------------
            # Current training metadata stores each stage as:
            #
            # {
            #     "threshold": 0.1,
            #     "validation_f1": ...
            # }
            #
            # Also support a direct numeric value for compatibility.
            # ---------------------------------------------------------

            if isinstance(entry, dict):

                if "threshold" not in entry:
                    raise RuntimeError(
                        f"Missing 'threshold' value for stage: "
                        f"{stage_name}"
                    )

                threshold = entry["threshold"]

            else:
                threshold = entry

            # ---------------------------------------------------------
            # Convert and validate
            # ---------------------------------------------------------

            try:
                threshold = float(threshold)
            except (TypeError, ValueError) as exc:
                raise RuntimeError(
                    f"Invalid threshold for stage "
                    f"'{stage_name}': {threshold!r}"
                ) from exc

            if not np.isfinite(threshold):
                raise RuntimeError(
                    f"Non-finite threshold for stage "
                    f"'{stage_name}': {threshold}"
                )

            if not 0.0 < threshold < 1.0:
                raise RuntimeError(
                    f"Invalid threshold for stage "
                    f"'{stage_name}': {threshold}. "
                    "Expected a value strictly between 0 and 1."
                )

            values.append(threshold)

        return np.asarray(
            values,
            dtype=np.float32,
        )

    # -----------------------------------------------------------------
    # List / tuple compatibility format
    # -----------------------------------------------------------------

    if isinstance(raw, (list, tuple)):

        if len(raw) != len(STAGE_NAMES):
            raise RuntimeError(
                "Stage threshold list must contain "
                f"exactly {len(STAGE_NAMES)} values."
            )

        values = []

        for index, value in enumerate(raw):

            # ---------------------------------------------------------
            # Support:
            #
            # 0.1
            #
            # or:
            #
            # {"threshold": 0.1}
            # ---------------------------------------------------------

            if isinstance(value, dict):

                if "threshold" not in value:
                    raise RuntimeError(
                        f"Threshold entry at index {index} "
                        "is missing 'threshold'."
                    )

                value = value["threshold"]

            try:
                value = float(value)
            except (TypeError, ValueError) as exc:
                raise RuntimeError(
                    f"Invalid stage threshold at index "
                    f"{index}: {value!r}"
                ) from exc

            if not np.isfinite(value):
                raise RuntimeError(
                    f"Non-finite stage threshold at index "
                    f"{index}: {value}"
                )

            if not 0.0 < value < 1.0:
                raise RuntimeError(
                    f"Invalid stage threshold at index "
                    f"{index}: {value}. "
                    "Expected a value strictly between 0 and 1."
                )

            values.append(value)

        return np.asarray(
            values,
            dtype=np.float32,
        )

    # -----------------------------------------------------------------
    # Unsupported metadata structure
    # -----------------------------------------------------------------

    raise RuntimeError(
        "Unsupported stage threshold format in "
        "stage_training_metadata.json."
    )
# ---------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------

def _load_models() -> None:
    global _world_model
    global _stage_head
    global _feature_mean
    global _feature_std

    if (
        _world_model is not None
        and _stage_head is not None
        and _feature_mean is not None
        and _feature_std is not None
    ):
        return

    # ---------------------------------------------------------------
    # Frozen world model
    # ---------------------------------------------------------------

    world_model = CTU13RiskWorldModel()

    risk_state = _load_state_dict(
        RISK_CHECKPOINT
    )

    risk_state = _strip_module_prefix(
        risk_state
    )

    world_model.load_state_dict(
        risk_state,
        strict=True,
    )

    world_model.to(DEVICE)
    world_model.eval()

    for parameter in world_model.parameters():
        parameter.requires_grad = False

    # ---------------------------------------------------------------
    # Stage head
    # ---------------------------------------------------------------

    stage_head = StageClassificationHead(
        latent_dim=LATENT_DIM,
        num_classes=3,
    )

    stage_state = _load_state_dict(
        STAGE_CHECKPOINT
    )

    stage_state = _strip_module_prefix(
        stage_state
    )

    # Most likely format:
    #   network.0.weight
    #   network.0.bias
    # etc.
    #
    # Also support checkpoints containing the head under a prefix.

    try:
        stage_head.load_state_dict(
            stage_state,
            strict=True,
        )

    except RuntimeError:

        normalized = {}

        for key, value in stage_state.items():

            if key.startswith("stage_head."):
                key = key[len("stage_head."):]

            elif key.startswith("model."):
                key = key[len("model."):]

            normalized[key] = value

        stage_head.load_state_dict(
            normalized,
            strict=True,
        )

    stage_head.to(DEVICE)
    stage_head.eval()

    for parameter in stage_head.parameters():
        parameter.requires_grad = False

    # ---------------------------------------------------------------
    # Frozen train-only scaler
    # ---------------------------------------------------------------

    if not FEATURE_MEAN_PATH.exists():
        raise FileNotFoundError(
            f"Missing feature mean: "
            f"{FEATURE_MEAN_PATH}"
        )

    if not FEATURE_STD_PATH.exists():
        raise FileNotFoundError(
            f"Missing feature std: "
            f"{FEATURE_STD_PATH}"
        )

    feature_mean = np.load(
        FEATURE_MEAN_PATH
    ).astype(np.float32)

    feature_std = np.load(
        FEATURE_STD_PATH
    ).astype(np.float32)

    if feature_mean.shape != (INPUT_DIM,):
        raise RuntimeError(
            f"Invalid feature mean shape: "
            f"{feature_mean.shape}; "
            f"expected {(INPUT_DIM,)}"
        )

    if feature_std.shape != (INPUT_DIM,):
        raise RuntimeError(
            f"Invalid feature std shape: "
            f"{feature_std.shape}; "
            f"expected {(INPUT_DIM,)}"
        )

    if not np.all(
        np.isfinite(feature_mean)
    ):
        raise RuntimeError(
            "feature_mean contains non-finite values."
        )

    if not np.all(
        np.isfinite(feature_std)
    ):
        raise RuntimeError(
            "feature_std contains non-finite values."
        )

    if np.any(feature_std <= 0):
        raise RuntimeError(
            "feature_std contains zero or negative values."
        )

    _world_model = world_model
    _stage_head = stage_head

    _feature_mean = feature_mean
    _feature_std = feature_std


# ---------------------------------------------------------------------
# Sequence validation
# ---------------------------------------------------------------------

def _validate_sequence(
    sequence: Any,
) -> np.ndarray:
    """
    Validate and convert one 5 x 12 history.
    """

    array = np.asarray(
        sequence,
        dtype=np.float32,
    )

    expected = (
        SEQUENCE_LENGTH,
        INPUT_DIM,
    )

    if array.shape != expected:
        raise ValueError(
            f"Expected sequence shape "
            f"{expected}, got {array.shape}"
        )

    if not np.all(
        np.isfinite(array)
    ):
        raise ValueError(
            "Sequence contains non-finite values."
        )

    return array


# ---------------------------------------------------------------------
# Latent extraction
# ---------------------------------------------------------------------

@torch.no_grad()
def extract_current_latent(
    sequence: Any,
) -> np.ndarray:
    """
    Extract the current 64-D latent from the frozen
    world model.

    Input:
        5 x 12 normalized sequence.

    Output:
        64-D current latent.
    """

    _load_models()

    assert _world_model is not None

    array = _validate_sequence(
        sequence
    )

    tensor = torch.from_numpy(
        array
    ).unsqueeze(0).to(DEVICE)

    projected = _world_model.feature_projection(
        tensor
    )

    latent = _world_model.temporal_encoder(
        projected
    )

    latent = latent.squeeze(0)

    result = latent.cpu().numpy().astype(
        np.float32
    )

    if result.shape != (LATENT_DIM,):
        raise RuntimeError(
            f"Unexpected latent shape: "
            f"{result.shape}"
        )

    return result


# ---------------------------------------------------------------------
# Stage prediction
# ---------------------------------------------------------------------

@torch.no_grad()
def predict_stage(
    sequence: Any,
    scenario: int | None = None,
) -> dict[str, Any]:
    """
    Predict Discovery / Command and Control / Impact
    for the current 5-state history.
    """

    _load_models()

    assert _stage_head is not None

    sequence_array = _validate_sequence(
        sequence
    )

    latent = extract_current_latent(
        sequence_array
    )

    latent_tensor = torch.from_numpy(
        latent
    ).unsqueeze(0).to(DEVICE)

    logits = _stage_head(
        latent_tensor
    )

    probabilities = torch.sigmoid(
        logits
    ).squeeze(0).cpu().numpy()

    metadata = _load_stage_metadata()

    thresholds = _extract_thresholds(
        metadata
    )

    predictions = (
        probabilities >= thresholds
    )

    stage_probabilities = {}

    for index, name in enumerate(
        STAGE_NAMES
    ):
        stage_probabilities[name] = {
            "probability": float(
                probabilities[index]
            ),
            "probability_percent": round(
                float(probabilities[index]) * 100.0,
                4,
            ),
            "threshold": float(
                thresholds[index]
            ),
            "predicted": bool(
                predictions[index]
            ),
        }

    predicted_indices = np.where(
        predictions
    )[0]

    if len(predicted_indices) > 0:

        primary_index = int(
            predicted_indices[
                np.argmax(
                    probabilities[
                        predicted_indices
                    ]
                )
            ]
        )

    else:

        primary_index = int(
            np.argmax(probabilities)
        )

    primary_stage = STAGE_NAMES[
        primary_index
    ]

    primary_probability = float(
        probabilities[
            primary_index
        ]
    )

    # ---------------------------------------------------------------
    # ATT&CK mapping
    # ---------------------------------------------------------------

    mitre_mapping = []

    for activity, stage in ACTIVITY_MAP.items():

        if stage.tactic == primary_stage:

            mitre_mapping.append(
                {
                    "activity": stage.activity,
                    "tactic": stage.tactic,
                    "technique": stage.technique,
                    "description": stage.description,
                    "source": (
                        "CTU13 activity interpretation"
                    ),
                    "trained_classifier": True,
                    "supervision": (
                        "weakly supervised"
                    ),
                }
            )

    # ---------------------------------------------------------------
    # Scenario context
    # ---------------------------------------------------------------

    scenario_context = []

    if scenario is not None:

        activities = (
            SCENARIO_ACTIVITIES.get(
                int(scenario),
                [],
            )
        )

        for activity in activities:

            if activity not in ACTIVITY_MAP:
                continue

            stage = ACTIVITY_MAP[
                activity
            ]

            scenario_context.append(
                {
                    "activity": stage.activity,
                    "tactic": stage.tactic,
                    "technique": stage.technique,
                    "description": stage.description,
                    "source": (
                        "documented CTU13 "
                        "activity mapping"
                    ),
                }
            )

    return {
        "classes": STAGE_NAMES,
        "probabilities": stage_probabilities,
        "primary_stage": {
            "name": primary_stage,
            "probability": primary_probability,
            "probability_percent": round(
                primary_probability * 100.0,
                4,
            ),
        },
        "mitre_mapping": mitre_mapping,
        "scenario_context": scenario_context,
        "latent_dimension": LATENT_DIM,
        "sequence_length": SEQUENCE_LENGTH,
        "feature_count": INPUT_DIM,
        "trained_classifier": True,
        "supervision": "weakly supervised",
        "ground_truth_timestamped_mitre_labels": False,
        "threshold_source": (
            "validation-selected thresholds"
        ),
        "scenario_13_used_for_threshold_selection": False,
    }


# ---------------------------------------------------------------------
# Feature evidence
# ---------------------------------------------------------------------

def _safe_float(
    value: Any,
) -> float:
    value = float(value)

    if not np.isfinite(value):
        return 0.0

    return value


def build_feature_evidence(
    sequence: Any,
) -> dict[str, Any]:
    """
    Explain the latest state relative to the preceding state.

    This is feature evidence, not SHAP attribution.

    We deliberately call this "evidence" rather than "causal
    attribution". The stage head operates on the learned 64-D latent,
    so raw feature deltas are supporting telemetry rather than a
    mathematical decomposition of the neural prediction.
    """

    _load_models()

    array = _validate_sequence(
        sequence
    )

    mean = _feature_mean
    std = _feature_std

    assert mean is not None
    assert std is not None

    latest = array[-1]

    if len(array) >= 2:
        previous = array[-2]
    else:
        previous = latest

    raw_delta = latest - previous

    normalized_latest = (
        (latest - mean)
        / np.maximum(std, EPS)
    )

    feature_records = []

    for index, feature_name in enumerate(
        FEATURE_NAMES
    ):

        latest_value = _safe_float(
            latest[index]
        )

        previous_value = _safe_float(
            previous[index]
        )

        delta_value = _safe_float(
            raw_delta[index]
        )

        standardized_value = _safe_float(
            normalized_latest[index]
        )

        feature_records.append(
            {
                "feature": feature_name,
                "latest_value": latest_value,
                "previous_value": previous_value,
                "delta": delta_value,
                "absolute_delta": abs(
                    delta_value
                ),
                "standardized_value": (
                    standardized_value
                ),
            }
        )

    # Rank by magnitude of the latest state relative
    # to the training distribution.
    by_distribution_shift = sorted(
        feature_records,
        key=lambda item: abs(
            item["standardized_value"]
        ),
        reverse=True,
    )

    # Rank by recent temporal change.
    by_recent_change = sorted(
        feature_records,
        key=lambda item: item["absolute_delta"],
        reverse=True,
    )

    top_distribution = (
        by_distribution_shift[:5]
    )

    top_recent_change = (
        by_recent_change[:5]
    )

    return {
        "method": (
            "feature-level telemetry evidence"
        ),
        "not_shap": True,
        "not_causal_attribution": True,
        "raw_port_information_available": False,
        "port_attribution": None,
        "top_distribution_shift_features": (
            top_distribution
        ),
        "top_recent_change_features": (
            top_recent_change
        ),
        "all_features": feature_records,
    }


# ---------------------------------------------------------------------
# Combined stage + evidence prediction
# ---------------------------------------------------------------------

def predict_stage_with_evidence(
    sequence: Any,
    scenario: int | None = None,
) -> dict[str, Any]:

    sequence_array = _validate_sequence(
        sequence
    )

    stage_result = predict_stage(
        sequence_array,
        scenario=scenario,
    )

    evidence = build_feature_evidence(
        sequence_array
    )

    stage_result["evidence"] = evidence

    return stage_result


# ---------------------------------------------------------------------
# Health / metadata
# ---------------------------------------------------------------------

def get_stage_model_info() -> dict[str, Any]:

    _load_models()

    metadata = _load_stage_metadata()
    thresholds = _extract_thresholds(
        metadata
    )

    return {
        "model": (
            "CTU13 Weakly-Supervised "
            "MITRE Stage Head"
        ),
        "checkpoint": STAGE_CHECKPOINT.name,
        "risk_world_model_checkpoint": (
            RISK_CHECKPOINT.name
        ),
        "latent_dimension": LATENT_DIM,
        "input_sequence_length": (
            SEQUENCE_LENGTH
        ),
        "input_feature_count": INPUT_DIM,
        "classes": STAGE_NAMES,
        "thresholds": {
            STAGE_NAMES[index]: float(
                thresholds[index]
            )
            for index in range(3)
        },
        "trained_classifier": True,
        "supervision": "weakly supervised",
        "ground_truth_timestamped_mitre_labels": False,
        "scenario_13_used_for_training": False,
        "scenario_13_used_for_model_selection": False,
        "scenario_13_used_for_threshold_selection": False,
        "feature_evidence": True,
        "raw_port_attribution_available": False,
    }