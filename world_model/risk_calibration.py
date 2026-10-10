"""
CTU13 scenario-adaptive calibrated risk inference helper.

This module reproduces the exact calibration transformation learned by
calibrate_ctu13_risk_model.py.

IMPORTANT
---------
The neural world-model checkpoint is NOT modified here.

Calibration consists of:

    raw logits
        ↓
    scenario-level z-normalization
        ↓
    frozen Platt transformation
        ↓
    probability

The scenario-level mean/std are computed from the COMPLETE collection of
current-scenario logits supplied to calibrate_logits().

Therefore, callers MUST provide all rollout logits for the requested horizon
from the current scenario.

Example
-------
    from world_model.risk_calibration import (
        load_calibration,
        calibrate_logits,
        get_threshold,
    )

    calibration = load_calibration()

    probabilities = calibrate_logits(
        raw_logits,
        horizon=1,
        calibration=calibration,
    )

    threshold = get_threshold(
        horizon=1,
        calibration=calibration,
    )

Scientific scope
----------------
This is scenario-adaptive calibration.

The resulting probability is conditional on the score distribution of the
current scenario. It must NOT be described as a universally calibrated
probability across arbitrary datasets or domains.
"""

from pathlib import Path
import json

import numpy as np


# ============================================================
# PATHS
# ============================================================

CALIBRATION_PATH = (
    Path(__file__).resolve().parent
    / "checkpoints"
    / "ctu13_risk"
    / "risk_calibration.json"
)


# ============================================================
# CONSTANTS
# ============================================================

EPS = 1e-6

EXPECTED_METHOD = "scenario_zscore_platt"
EXPECTED_HORIZONS = ("T+1", "T+2", "T+3")


# ============================================================
# ARTIFACT LOADING
# ============================================================

def load_calibration(path=CALIBRATION_PATH):
    """
    Load and validate the frozen calibration artifact.

    Parameters
    ----------
    path : str or pathlib.Path
        Path to risk_calibration.json.

    Returns
    -------
    dict
        Validated calibration artifact.
    """

    path = Path(path)

    if not path.exists():
        raise FileNotFoundError(
            f"Risk calibration artifact not found: {path}"
        )

    if not path.is_file():
        raise FileNotFoundError(
            f"Risk calibration path is not a file: {path}"
        )

    try:
        with open(
            path,
            "r",
            encoding="utf-8",
        ) as file:
            calibration = json.load(file)

    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Invalid JSON calibration artifact: {path}"
        ) from exc

    if not isinstance(calibration, dict):
        raise ValueError(
            "Risk calibration artifact must contain a JSON object."
        )

    method = calibration.get("method")

    if method != EXPECTED_METHOD:
        raise ValueError(
            "Unsupported risk calibration method: "
            f"{method!r}. Expected {EXPECTED_METHOD!r}."
        )

    horizons = calibration.get("horizons")

    if not isinstance(horizons, dict):
        raise ValueError(
            "Risk calibration artifact is missing "
            "the 'horizons' object."
        )

    for key in EXPECTED_HORIZONS:
        if key not in horizons:
            raise ValueError(
                f"Risk calibration artifact is missing {key}."
            )

        params = horizons[key]

        if not isinstance(params, dict):
            raise ValueError(
                f"Calibration parameters for {key} must be an object."
            )

        required = (
            "platt_A",
            "platt_B",
            "threshold",
        )

        missing = [
            field
            for field in required
            if field not in params
        ]

        if missing:
            raise ValueError(
                f"Calibration parameters for {key} "
                f"are missing: {missing}"
            )

        for field in required:
            value = float(params[field])

            if not np.isfinite(value):
                raise ValueError(
                    f"Calibration parameter {key}.{field} "
                    "is not finite."
                )

    return calibration


# ============================================================
# INPUT VALIDATION
# ============================================================

def _validate_logits(raw_logits):
    """
    Validate and normalize the supplied raw-logit array.

    The function intentionally preserves the caller's array shape.

    Returns
    -------
    numpy.ndarray
        Finite float64 logits.
    """

    logits = np.asarray(
        raw_logits,
        dtype=np.float64,
    )

    if logits.size == 0:
        raise ValueError(
            "Cannot calibrate an empty logit array."
        )

    if not np.all(np.isfinite(logits)):
        raise ValueError(
            "Raw logits contain NaN or infinite values."
        )

    return logits


def _get_horizon_parameters(
    calibration,
    horizon,
):
    """
    Retrieve and validate calibration parameters for one horizon.
    """

    try:
        horizon_number = int(horizon)
    except (TypeError, ValueError) as exc:
        raise ValueError(
            f"Invalid horizon: {horizon!r}"
        ) from exc

    if horizon_number < 1:
        raise ValueError(
            f"Horizon must be >= 1, received {horizon_number}."
        )

    key = f"T+{horizon_number}"

    horizons = calibration.get("horizons", {})

    if key not in horizons:
        raise KeyError(
            f"No calibration parameters for {key}."
        )

    params = horizons[key]

    A = float(params["platt_A"])
    B = float(params["platt_B"])
    threshold = float(params["threshold"])

    if not np.isfinite(A):
        raise ValueError(
            f"Invalid Platt coefficient A for {key}: {A}"
        )

    if not np.isfinite(B):
        raise ValueError(
            f"Invalid Platt intercept B for {key}: {B}"
        )

    if not np.isfinite(threshold):
        raise ValueError(
            f"Invalid threshold for {key}: {threshold}"
        )

    if threshold < 0.0 or threshold > 1.0:
        raise ValueError(
            f"Threshold for {key} must be between 0 and 1; "
            f"received {threshold}."
        )

    return key, A, B, threshold


# ============================================================
# SCENARIO STANDARDIZATION
# ============================================================

def standardize_scenario_logits(raw_logits):
    """
    Perform the same unlabeled scenario-level z-normalization used during
    offline calibration.

    Parameters
    ----------
    raw_logits : array-like
        ALL raw logits for one forecast horizon in the current scenario.

    Returns
    -------
    standardized : numpy.ndarray
    mean : float
    std : float
    """

    logits = _validate_logits(raw_logits)

    mean = float(np.mean(logits))
    std = float(np.std(logits))

    if not np.isfinite(mean):
        raise ValueError(
            "Scenario logit mean is not finite."
        )

    if not np.isfinite(std) or std < EPS:
        std = 1.0

    standardized = (
        logits - mean
    ) / std

    return (
        standardized,
        mean,
        std,
    )


# ============================================================
# CALIBRATION
# ============================================================

def calibrate_logits(
    raw_logits,
    horizon,
    calibration=None,
):
    """
    Convert raw world-model logits into scenario-adaptive calibrated
    probabilities.

    Parameters
    ----------
    raw_logits : array-like
        ALL raw rollout logits for the requested horizon in the current
        scenario.

    horizon : int
        Forecast horizon, e.g. 1, 2, or 3.

    calibration : dict, optional
        Loaded calibration artifact.

    Returns
    -------
    numpy.ndarray
        Calibrated probabilities in [0, 1].
    """

    if calibration is None:
        calibration = load_calibration()

    key, A, B, _threshold = _get_horizon_parameters(
        calibration,
        horizon,
    )

    z, _mean, _std = standardize_scenario_logits(
        raw_logits
    )

    transformed = np.clip(
        A * z + B,
        -60.0,
        60.0,
    )

    probabilities = (
        1.0
        / (
            1.0
            + np.exp(-transformed)
        )
    )

    probabilities = probabilities.astype(
        float
    )

    if not np.all(np.isfinite(probabilities)):
        raise RuntimeError(
            f"Calibration produced non-finite probabilities for {key}."
        )

    probabilities = np.clip(
        probabilities,
        0.0,
        1.0,
    )

    return probabilities


# ============================================================
# THRESHOLD
# ============================================================

def get_threshold(
    horizon,
    calibration=None,
):
    """
    Return the frozen validation-selected threshold for a horizon.
    """

    if calibration is None:
        calibration = load_calibration()

    _key, _A, _B, threshold = (
        _get_horizon_parameters(
            calibration,
            horizon,
        )
    )

    return float(threshold)


# ============================================================
# CALIBRATION METADATA
# ============================================================

def get_calibration_info(
    calibration=None,
):
    """
    Return concise metadata describing the calibration artifact.

    This is useful for API responses and reproducibility reporting.
    """

    if calibration is None:
        calibration = load_calibration()

    return {
        "method": calibration["method"],
        "version": calibration.get(
            "version"
        ),
        "seed": calibration.get(
            "seed"
        ),
        "validation_scenarios": calibration.get(
            "validation_scenarios",
            [],
        ),
        "test_scenarios": calibration.get(
            "test_scenarios",
            [],
        ),
        "max_validation_fpr": calibration.get(
            "max_validation_fpr"
        ),
        "folds": calibration.get(
            "folds"
        ),
        "scenario_adaptive": True,
    }


# ============================================================
# SELF-CHECK
# ============================================================

def validate_calibration_artifact(
    calibration=None,
):
    """
    Run an internal consistency check on the calibration artifact.

    Returns
    -------
    dict
        Validation result suitable for logs/tests.
    """

    if calibration is None:
        calibration = load_calibration()

    checks = {
        "method": calibration.get("method")
        == EXPECTED_METHOD,
        "has_horizons": isinstance(
            calibration.get("horizons"),
            dict,
        ),
    }

    for key in EXPECTED_HORIZONS:
        checks[f"{key}_present"] = (
            key in calibration.get(
                "horizons",
                {},
            )
        )

    valid = all(checks.values())

    return {
        "valid": bool(valid),
        "checks": checks,
        "method": calibration.get(
            "method"
        ),
        "horizons": list(
            calibration.get(
                "horizons",
                {},
            ).keys()
        ),
    }


# ============================================================
# MODULE SELF-TEST
# ============================================================

if __name__ == "__main__":

    print("=" * 70)
    print("THREATCAST RISK CALIBRATION HELPER CHECK")
    print("=" * 70)

    calibration = load_calibration()

    validation = validate_calibration_artifact(
        calibration
    )

    print(
        f"Artifact valid: {validation['valid']}"
    )

    print(
        f"Method:         {calibration['method']}"
    )

    for horizon in range(1, 4):

        threshold = get_threshold(
            horizon,
            calibration,
        )

        print(
            f"T+{horizon} threshold: {threshold:.6f}"
        )

        # Deterministic smoke-test logits.
        test_logits = np.asarray(
            [
                -3.0,
                -2.5,
                -2.0,
                -1.5,
                -1.0,
            ],
            dtype=np.float64,
        )

        probabilities = calibrate_logits(
            test_logits,
            horizon,
            calibration,
        )

        if not np.all(
            (probabilities >= 0.0)
            & (probabilities <= 1.0)
        ):
            raise RuntimeError(
                f"T+{horizon} probability range check failed."
            )

        print(
            f"T+{horizon} probability check: "
            f"PASS"
        )

    print()
    print("RISK CALIBRATION HELPER: PASS")