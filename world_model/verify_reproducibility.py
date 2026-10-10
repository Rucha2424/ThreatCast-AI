"""
ThreatCast-AI reproducibility artifact and configuration verifier.

This script does NOT train, retrain, calibrate, or modify any model.

It verifies that the expected CTU13 reproducibility artifacts exist and
that the recorded configuration is internally consistent with the
documented experiment.

Run from the project root:

    python -m world_model.verify_reproducibility
"""

from pathlib import Path
import json
import sys

import numpy as np


# ============================================================
# PATHS
# ============================================================

WORLD_MODEL_DIR = Path(__file__).resolve().parent

CHECKPOINT_DIR = (
    WORLD_MODEL_DIR
    / "checkpoints"
    / "ctu13_risk"
)


# ============================================================
# EXPECTED CONFIGURATION
# ============================================================

EXPECTED_SEED = 42

EXPECTED_FEATURE_COUNT = 12
EXPECTED_SEQUENCE_LENGTH = 5
EXPECTED_FORECAST_HORIZON = 3
EXPECTED_LATENT_DIMENSION = 64

EXPECTED_RISK_TRAIN_SCENARIOS = [
    1,
    2,
    3,
    4,
    5,
    6,
    8,
    9,
    10,
    11,
]

EXPECTED_RISK_VALIDATION_SCENARIOS = [
    12,
]

EXPECTED_RISK_TEST_SCENARIOS = [
    13,
]

EXPECTED_STAGE_TRAIN_SCENARIOS = [
    1,
    2,
    3,
    4,
    8,
    9,
]

EXPECTED_STAGE_VALIDATION_SCENARIOS = [
    5,
    6,
    10,
    11,
]

EXPECTED_STAGE_TEST_SCENARIOS = [
    13,
]

EXPECTED_FEATURE_NAMES = [
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


# ============================================================
# HELPERS
# ============================================================

def check(condition, message):
    """
    Record one reproducibility check.
    """

    status = "PASS" if condition else "FAIL"

    print(
        f"[{status}] {message}"
    )

    return bool(condition)


def load_json(path):
    """
    Load a JSON artifact.
    """

    if not path.exists():
        return None

    try:
        with open(
            path,
            "r",
            encoding="utf-8",
        ) as file:
            return json.load(file)

    except Exception as exc:
        print(
            f"[FAIL] Could not read {path}: {exc}"
        )
        return None


# ============================================================
# MAIN VERIFICATION
# ============================================================

def main():

    print()
    print("=" * 78)
    print("THREATCAST-AI REPRODUCIBILITY VERIFICATION")
    print("=" * 78)
    print()

    failures = []

    # --------------------------------------------------------
    # DIRECTORY
    # --------------------------------------------------------

    if not check(
        CHECKPOINT_DIR.exists(),
        f"Checkpoint directory exists: {CHECKPOINT_DIR}",
    ):
        failures.append(
            "Checkpoint directory missing."
        )

    # --------------------------------------------------------
    # REQUIRED ARTIFACTS
    # --------------------------------------------------------

    required_files = [
        "ctu13_risk_world_model.pt",
        "feature_projection.pt",
        "temporal_encoder.pt",
        "latent_predictor.pt",
        "risk_head.pt",
        "feature_mean.npy",
        "feature_std.npy",
        "training_metadata.json",
        "risk_calibration.json",
        "ctu13_stage_head.pt",
        "stage_training_metadata.json",
    ]

    for filename in required_files:

        path = CHECKPOINT_DIR / filename

        if not check(
            path.exists(),
            f"Artifact exists: {filename}",
        ):
            failures.append(
                f"Missing artifact: {filename}"
            )

    # --------------------------------------------------------
    # RISK METADATA
    # --------------------------------------------------------

    training_metadata = load_json(
        CHECKPOINT_DIR
        / "training_metadata.json"
    )

    if training_metadata is None:

        failures.append(
            "Risk training metadata could not be loaded."
        )

    else:

        checks = [
            (
                training_metadata.get("seed")
                == EXPECTED_SEED,
                "Risk seed = 42",
            ),
            (
                training_metadata.get("input_dim")
                == EXPECTED_FEATURE_COUNT,
                "Risk input dimension = 12",
            ),
            (
                training_metadata.get("sequence_length")
                == EXPECTED_SEQUENCE_LENGTH,
                "Risk sequence length = 5",
            ),
            (
                training_metadata.get("forecast_horizon")
                == EXPECTED_FORECAST_HORIZON,
                "Risk forecast horizon = 3",
            ),
            (
                training_metadata.get("latent_dimension")
                == EXPECTED_LATENT_DIMENSION,
                "Risk latent dimension = 64",
            ),
            (
                training_metadata.get("train_scenarios")
                == EXPECTED_RISK_TRAIN_SCENARIOS,
                "Risk training scenarios match",
            ),
            (
                training_metadata.get("validation_scenarios")
                == EXPECTED_RISK_VALIDATION_SCENARIOS,
                "Risk validation scenario matches",
            ),
            (
                training_metadata.get("test_scenarios")
                == EXPECTED_RISK_TEST_SCENARIOS,
                "Risk test scenario = 13",
            ),
            (
                training_metadata.get(
                    "checkpoint_selection"
                )
                == "validation_mean_pr_auc",
                "Risk checkpoint selection = validation mean PR-AUC",
            ),
        ]

        for condition, message in checks:

            if not check(
                condition,
                message,
            ):
                failures.append(message)

        feature_names = training_metadata.get(
            "features"
        )

        if not check(
            feature_names == EXPECTED_FEATURE_NAMES,
            "Risk feature order matches documented 12-feature schema",
        ):
            failures.append(
                "Risk feature order mismatch."
            )

        scope_note = str(
            training_metadata.get(
                "scope_note",
                ""
            )
        )

        if not check(
            "Scenario 13" in scope_note,
            "Risk metadata documents Scenario 13 isolation",
        ):
            failures.append(
                "Risk Scenario 13 isolation is not documented."
            )

    # --------------------------------------------------------
    # STAGE METADATA
    # --------------------------------------------------------

    stage_metadata = load_json(
        CHECKPOINT_DIR
        / "stage_training_metadata.json"
    )

    if stage_metadata is None:

        failures.append(
            "Stage training metadata could not be loaded."
        )

    else:

        stage_seed = stage_metadata.get(
            "seed"
        )

        if not check(
            stage_seed == EXPECTED_SEED,
            "Stage seed = 42",
        ):
            failures.append(
                "Stage seed mismatch."
            )

        stage_train = stage_metadata.get(
            "stage_train_scenarios"
        )

        if stage_train is not None:

            if not check(
                stage_train
                == EXPECTED_STAGE_TRAIN_SCENARIOS,
                "Stage training scenarios match",
            ):
                failures.append(
                    "Stage training scenario mismatch."
                )

        stage_validation = stage_metadata.get(
            "stage_validation_scenarios"
        )

        if stage_validation is not None:

            if not check(
                stage_validation
                == EXPECTED_STAGE_VALIDATION_SCENARIOS,
                "Stage validation scenarios match",
            ):
                failures.append(
                    "Stage validation scenario mismatch."
                )

        stage_test = stage_metadata.get(
            "stage_test_scenarios"
        )

        if stage_test is not None:

            if not check(
                stage_test
                == EXPECTED_STAGE_TEST_SCENARIOS,
                "Stage test scenario = 13",
            ):
                failures.append(
                    "Stage test scenario mismatch."
                )

    # --------------------------------------------------------
    # CALIBRATION ARTIFACT
    # --------------------------------------------------------

    calibration = load_json(
        CHECKPOINT_DIR
        / "risk_calibration.json"
    )

    if calibration is None:

        failures.append(
            "Risk calibration artifact could not be loaded."
        )

    else:

        if not check(
            calibration.get("method")
            == "scenario_zscore_platt",
            "Calibration method = scenario_zscore_platt",
        ):
            failures.append(
                "Unexpected calibration method."
            )

        if not check(
            calibration.get("seed")
            == EXPECTED_SEED,
            "Calibration seed = 42",
        ):
            failures.append(
                "Calibration seed mismatch."
            )

        if not check(
            calibration.get(
                "validation_scenarios"
            )
            == EXPECTED_RISK_VALIDATION_SCENARIOS,
            "Calibration validation scenario = 12",
        ):
            failures.append(
                "Calibration validation split mismatch."
            )

        if not check(
            calibration.get(
                "test_scenarios"
            )
            == EXPECTED_RISK_TEST_SCENARIOS,
            "Calibration test scenario = 13",
        ):
            failures.append(
                "Calibration test split mismatch."
            )

        horizons = calibration.get(
            "horizons",
            {}
        )

        for horizon in (
            "T+1",
            "T+2",
            "T+3",
        ):

            present = horizon in horizons

            if not check(
                present,
                f"Calibration contains {horizon}",
            ):
                failures.append(
                    f"Missing calibration horizon: {horizon}"
                )

            if present:

                params = horizons[horizon]

                for field in (
                    "platt_A",
                    "platt_B",
                    "threshold",
                ):

                    if not check(
                        field in params,
                        f"{horizon} contains {field}",
                    ):
                        failures.append(
                            f"{horizon} missing {field}"
                        )

    # --------------------------------------------------------
    # SCALER
    # --------------------------------------------------------

    mean_path = (
        CHECKPOINT_DIR
        / "feature_mean.npy"
    )

    std_path = (
        CHECKPOINT_DIR
        / "feature_std.npy"
    )

    if mean_path.exists():

        try:

            mean = np.load(
                mean_path
            )

            if not check(
                mean.shape
                == (EXPECTED_FEATURE_COUNT,),
                "feature_mean.npy shape = (12,)",
            ):
                failures.append(
                    "Invalid feature_mean.npy shape."
                )

            if not check(
                np.all(np.isfinite(mean)),
                "feature_mean.npy contains finite values",
            ):
                failures.append(
                    "feature_mean.npy contains non-finite values."
                )

        except Exception as exc:

            failures.append(
                f"Could not load feature_mean.npy: {exc}"
            )

    if std_path.exists():

        try:

            std = np.load(
                std_path
            )

            if not check(
                std.shape
                == (EXPECTED_FEATURE_COUNT,),
                "feature_std.npy shape = (12,)",
            ):
                failures.append(
                    "Invalid feature_std.npy shape."
                )

            if not check(
                np.all(np.isfinite(std)),
                "feature_std.npy contains finite values",
            ):
                failures.append(
                    "feature_std.npy contains non-finite values."
                )

            if not check(
                np.all(std > 0),
                "feature_std.npy contains positive standard deviations",
            ):
                failures.append(
                    "feature_std.npy contains zero/negative values."
                )

        except Exception as exc:

            failures.append(
                f"Could not load feature_std.npy: {exc}"
            )

    # --------------------------------------------------------
    # DOCUMENTATION
    # --------------------------------------------------------

    documentation_path = (
        WORLD_MODEL_DIR
        / "REPRODUCIBILITY.md"
    )

    if not check(
        documentation_path.exists(),
        "REPRODUCIBILITY.md exists",
    ):
        failures.append(
            "REPRODUCIBILITY.md missing."
        )

    # --------------------------------------------------------
    # FINAL RESULT
    # --------------------------------------------------------

    print()
    print("=" * 78)

    if failures:

        print(
            "REPRODUCIBILITY VERIFICATION: FAIL"
        )

        print()
        print("Problems found:")

        for failure in failures:
            print(
                f"  - {failure}"
            )

        print("=" * 78)

        return 1

    print(
        "REPRODUCIBILITY VERIFICATION: PASS"
    )

    print()
    print(
        "The expected CTU13 risk-model, stage-head, "
        "calibration, scaler, and documentation artifacts "
        "are present and internally consistent."
    )

    print()
    print(
        "NOTE: This verifier does not guarantee bit-identical "
        "floating-point results across different hardware/"
        "software environments."
    )

    print("=" * 78)

    return 0


if __name__ == "__main__":
    sys.exit(
        main()
    )