from pathlib import Path
import numpy as np
import pandas as pd
import joblib
import tensorflow as tf


PROJECT_ROOT = Path(__file__).resolve().parent

DATA_PATH = PROJECT_ROOT / "data" / "CTU13" / "all_network_states.csv"
MODEL_PATH = PROJECT_ROOT / "lstm_early_warning_multiscenario.keras"
SCALER_PATH = PROJECT_ROOT / "lstm_early_warning_scaler.pkl"

OUTPUT_DIR = PROJECT_ROOT / "results" / "rollout"
OUTPUT_PATH = OUTPUT_DIR / "k_step_rollout.csv"

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
K_STEPS = 3
WARNING_THRESHOLD = 0.08

TEST_SCENARIOS = [12, 13]


def load_data():
    df = pd.read_csv(DATA_PATH)

    df["Timestamp"] = pd.to_datetime(df["Timestamp"])
    df = df.sort_values(["Scenario", "Timestamp"]).reset_index(drop=True)

    return df


def load_model_and_scaler():
    model = tf.keras.models.load_model(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)

    if model.input_shape[-2:] != (5, 12):
        raise ValueError(f"Unexpected model input shape: {model.input_shape}")

    if scaler.n_features_in_ != 12:
        raise ValueError(
            f"Unexpected scaler feature count: {scaler.n_features_in_}"
        )

    return model, scaler


def create_initial_sequence(df, scaler, scenario):
    scenario_df = df[df["Scenario"] == scenario].copy()

    if len(scenario_df) < SEQUENCE_LENGTH:
        return None, None

    features = scenario_df[FEATURE_NAMES].astype(float).values

    scaled = scaler.transform(features)

    initial_sequence = scaled[:SEQUENCE_LENGTH].copy()

    last_row = scenario_df.iloc[SEQUENCE_LENGTH - 1]

    return initial_sequence, last_row


def autoregressive_rollout(model, scaler, initial_sequence):
    current_sequence = initial_sequence.copy()

    results = []

    for step in range(1, K_STEPS + 1):

        model_input = np.expand_dims(current_sequence, axis=0)

        probability = float(
            model.predict(model_input, verbose=0)[0][0]
        )

        warning = probability >= WARNING_THRESHOLD

        last_state = current_sequence[-1].copy()

        predicted_next_state = last_state.copy()

        current_sequence = np.vstack(
            [
                current_sequence[1:],
                predicted_next_state,
            ]
        )

        results.append(
            {
                "step": step,
                "probability": probability,
                "probability_percent": probability * 100.0,
                "warning": warning,
                "label": (
                    "EARLY WARNING"
                    if warning
                    else "NORMAL"
                ),
            }
        )

    return results


def main():
    print("=" * 70)
    print("THREATCAST - K-STEP AUTOREGRESSIVE ROLLOUT")
    print("=" * 70)

    print(f"K steps: {K_STEPS}")
    print(f"Sequence length: {SEQUENCE_LENGTH}")
    print(f"Features: {len(FEATURE_NAMES)}")
    print(f"Warning threshold: {WARNING_THRESHOLD * 100:.0f}%")
    print(f"Test scenarios: {TEST_SCENARIOS}")
    print()

    print("1. Loading CTU13 data...")
    df = load_data()

    print(f"Rows: {len(df)}")
    print(f"Scenarios: {df['Scenario'].nunique()}")
    print()

    print("2. Loading trained LSTM and scaler...")
    model, scaler = load_model_and_scaler()

    print(f"Model input: {model.input_shape}")
    print(f"Model output: {model.output_shape}")
    print("Model validation: PASS")
    print()

    all_results = []

    print("3. Running autoregressive rollout...")
    print()

    for scenario in TEST_SCENARIOS:

        initial_sequence, last_state = create_initial_sequence(
            df,
            scaler,
            scenario,
        )

        if initial_sequence is None:
            print(
                f"Scenario {scenario}: insufficient states - skipped"
            )
            continue

        print(
            f"Scenario {scenario} | "
            f"starting timestamp: {last_state['Timestamp']}"
        )

        rollout = autoregressive_rollout(
            model,
            scaler,
            initial_sequence,
        )

        for result in rollout:

            print(
                f"  T+{result['step']} | "
                f"Probability: "
                f"{result['probability_percent']:.4f}% | "
                f"{result['label']}"
            )

            all_results.append(
                {
                    "Scenario": scenario,
                    "Starting_Timestamp": last_state["Timestamp"],
                    "Step": result["step"],
                    "Probability": result["probability"],
                    "Probability_Percent": result[
                        "probability_percent"
                    ],
                    "Warning": result["warning"],
                    "Label": result["label"],
                    "Model": "CTU13 LSTM",
                    "Sequence_Length": SEQUENCE_LENGTH,
                    "Feature_Count": len(FEATURE_NAMES),
                    "Threshold": WARNING_THRESHOLD,
                }
            )

        print()

    results_df = pd.DataFrame(all_results)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    results_df.to_csv(
        OUTPUT_PATH,
        index=False,
    )

    print("=" * 70)
    print("ROLLOUT RESULTS")
    print("=" * 70)

    print(results_df.to_string(index=False))

    print()
    print(f"Saved: {OUTPUT_PATH}")

    print()
    print("=" * 70)
    print("K-STEP ROLLOUT COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()