from pathlib import Path
import warnings

import numpy as np
import pandas as pd
import joblib
import tensorflow as tf
import shap
import matplotlib.pyplot as plt

warnings.filterwarnings("ignore")

PROJECT_ROOT = Path(__file__).resolve().parent

DATA_PATH = PROJECT_ROOT / "data" / "CTU13" / "all_network_states.csv"
MODEL_PATH = PROJECT_ROOT / "lstm_early_warning_multiscenario.keras"
SCALER_PATH = PROJECT_ROOT / "lstm_early_warning_scaler.pkl"

OUTPUT_DIR = PROJECT_ROOT / "results" / "explainability"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

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

TARGET = "Target_Early_Warning"

SEQUENCE_LENGTH = 5
WARNING_THRESHOLD = 0.08

TRAIN_SCENARIOS = [1, 2, 3, 6, 7, 8, 9, 10, 11]
TEST_SCENARIOS = [12, 13]

BACKGROUND_SAMPLES = 50
EXPLANATION_SAMPLES = 100

SEED = 42

np.random.seed(SEED)
tf.random.set_seed(SEED)


def print_header(title):
    print()
    print("=" * 78)
    print(title)
    print("=" * 78)


def validate_files():
    required = [DATA_PATH, MODEL_PATH, SCALER_PATH]

    missing = [str(path) for path in required if not path.exists()]

    if missing:
        print_header("ERROR - REQUIRED FILES NOT FOUND")

        for path in missing:
            print(path)

        raise FileNotFoundError(
            "One or more required CTU13 explainability files are missing."
        )


def load_data():
    print_header("1. LOADING CTU13 NETWORK STATES")

    df = pd.read_csv(DATA_PATH)

    required_columns = [
        "Scenario",
        "Timestamp",
        TARGET,
        *FEATURE_NAMES,
    ]

    missing = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing:
        raise ValueError(
            f"CTU13 CSV is missing required columns: {missing}"
        )

    df["Scenario"] = pd.to_numeric(
        df["Scenario"],
        errors="coerce"
    )

    df["Timestamp"] = pd.to_datetime(
        df["Timestamp"],
        errors="coerce"
    )

    df[TARGET] = pd.to_numeric(
        df[TARGET],
        errors="coerce"
    )

    for feature in FEATURE_NAMES:
        df[feature] = pd.to_numeric(
            df[feature],
            errors="coerce"
        )

    df = df.dropna(
        subset=[
            "Scenario",
            "Timestamp",
            TARGET,
            *FEATURE_NAMES,
        ]
    ).copy()

    df["Scenario"] = df["Scenario"].astype(int)
    df[TARGET] = df[TARGET].astype(int)

    df = df.sort_values(
        ["Scenario", "Timestamp"]
    ).reset_index(drop=True)

    print(f"Rows: {len(df)}")
    print(f"Scenarios: {df['Scenario'].nunique()}")

    return df


def create_sequences(df, scenarios):
    sequences = []
    targets = []
    metadata = []

    for scenario in scenarios:

        scenario_df = (
            df[df["Scenario"] == scenario]
            .sort_values("Timestamp")
            .reset_index(drop=True)
        )

        if len(scenario_df) < SEQUENCE_LENGTH:
            print(
                f"Scenario {scenario}: "
                f"{len(scenario_df)} states - skipped"
            )
            continue

        values = scenario_df[
            FEATURE_NAMES
        ].to_numpy(dtype=np.float32)

        target_values = scenario_df[
            TARGET
        ].to_numpy(dtype=np.int32)

        timestamps = scenario_df[
            "Timestamp"
        ].to_numpy()

        for end_index in range(
            SEQUENCE_LENGTH - 1,
            len(scenario_df)
        ):

            start_index = (
                end_index - SEQUENCE_LENGTH + 1
            )

            sequence = values[
                start_index:end_index + 1
            ]

            target = target_values[end_index]

            sequences.append(sequence)
            targets.append(target)

            metadata.append(
                {
                    "Scenario": scenario,
                    "Sequence_Start": timestamps[start_index],
                    "Prediction_Timestamp": timestamps[end_index],
                    "Sequence_End": timestamps[end_index],
                }
            )

    if not sequences:
        raise ValueError(
            "No valid sequences were created."
        )

    X = np.asarray(
        sequences,
        dtype=np.float32
    )

    y = np.asarray(
        targets,
        dtype=np.int32
    )

    metadata_df = pd.DataFrame(metadata)

    return X, y, metadata_df


def scale_sequences(X, scaler):
    original_shape = X.shape

    flattened = X.reshape(
        -1,
        len(FEATURE_NAMES)
    )

    scaled = scaler.transform(
        flattened
    )

    scaled = scaled.reshape(
        original_shape
    )

    return scaled.astype(np.float32)


def normalize_shap_values(shap_values):
    if isinstance(shap_values, list):
        if len(shap_values) != 1:
            raise ValueError(
                f"Expected one SHAP output for binary model, "
                f"received {len(shap_values)} outputs."
            )

        shap_values = shap_values[0]

    shap_values = np.asarray(
        shap_values
    )

    if shap_values.ndim == 4:
        if shap_values.shape[-1] == 1:
            shap_values = shap_values[..., 0]

        elif shap_values.shape[-1] > 1:
            raise ValueError(
                "Unexpected multi-output SHAP result for "
                "the binary CTU13 model."
            )

    if shap_values.ndim != 3:
        raise ValueError(
            f"Unexpected SHAP shape: "
            f"{shap_values.shape}. "
            f"Expected (samples, timesteps, features)."
        )

    return shap_values


def create_global_importance(
    shap_values,
    X_raw,
    metadata,
):
    print_header(
        "5. CALCULATING GLOBAL FEATURE IMPORTANCE"
    )

    absolute_importance = np.mean(
        np.abs(shap_values),
        axis=(0, 1)
    )

    signed_importance = np.mean(
        shap_values,
        axis=(0, 1)
    )

    importance_df = pd.DataFrame(
        {
            "Feature": FEATURE_NAMES,
            "Mean_Absolute_SHAP": absolute_importance,
            "Mean_SHAP": signed_importance,
        }
    )

    importance_df = importance_df.sort_values(
        "Mean_Absolute_SHAP",
        ascending=False
    ).reset_index(drop=True)

    importance_df.insert(
        0,
        "Rank",
        np.arange(
            1,
            len(importance_df) + 1
        )
    )

    output_path = (
        OUTPUT_DIR
        / "global_feature_importance.csv"
    )

    importance_df.to_csv(
        output_path,
        index=False
    )

    print()
    print(
        "GLOBAL CTU13 SHAP FEATURE IMPORTANCE"
    )
    print("-" * 78)

    for _, row in importance_df.iterrows():
        print(
            f"{int(row['Rank']):2d}. "
            f"{row['Feature']:<32} "
            f"{row['Mean_Absolute_SHAP']:.8f}"
        )

    top_n = min(12, len(importance_df))

    plot_df = importance_df.head(
        top_n
    ).sort_values(
        "Mean_Absolute_SHAP"
    )

    plt.figure(figsize=(10, 7))

    plt.barh(
        plot_df["Feature"],
        plot_df["Mean_Absolute_SHAP"]
    )

    plt.xlabel(
        "Mean Absolute SHAP Value"
    )

    plt.ylabel(
        "Feature"
    )

    plt.title(
        "CTU13 LSTM Global Feature Importance"
    )

    plt.tight_layout()

    plot_path = (
        OUTPUT_DIR
        / "explainability_feature_importance.png"
    )

    plt.savefig(
        plot_path,
        dpi=200,
        bbox_inches="tight"
    )

    plt.close()

    return importance_df


def create_local_explanations(
    X_raw,
    X_scaled,
    y,
    predictions,
    shap_values,
    metadata,
):
    print_header(
        "6. CREATING LOCAL WARNING EXPLANATIONS"
    )

    warning_indices = np.where(
        predictions >= WARNING_THRESHOLD
    )[0]

    if len(warning_indices) == 0:
        print(
            "No model warnings were generated "
            "on the selected test samples."
        )

        return pd.DataFrame()

    print(
        f"Model warnings in explained samples: "
        f"{len(warning_indices)}"
    )

    records = []

    for sample_index in warning_indices:

        probability = float(
            predictions[sample_index]
        )

        scenario = int(
            metadata.iloc[sample_index]["Scenario"]
        )

        timestamp = (
            metadata.iloc[sample_index]
            ["Prediction_Timestamp"]
        )

        actual = int(
            y[sample_index]
        )

        sample_shap = shap_values[
            sample_index
        ]

        feature_signed = np.sum(
            sample_shap,
            axis=0
        )

        feature_absolute = np.sum(
            np.abs(sample_shap),
            axis=0
        )

        order = np.argsort(
            feature_absolute
        )[::-1]

        top_features = []

        for feature_index in order[:5]:

            feature_name = (
                FEATURE_NAMES[feature_index]
            )

            contribution = float(
                feature_signed[feature_index]
            )

            direction = (
                "toward_warning"
                if contribution >= 0
                else "away_from_warning"
            )

            top_features.append(
                (
                    feature_name,
                    contribution,
                    direction
                )
            )

            records.append(
                {
                    "Scenario": scenario,
                    "Timestamp": timestamp,
                    "Prediction_Probability": probability,
                    "Prediction_Percent": round(
                        probability * 100,
                        4
                    ),
                    "Warning": 1,
                    "Actual_Target": actual,
                    "Feature": feature_name,
                    "SHAP_Value": contribution,
                    "Absolute_SHAP": abs(
                        contribution
                    ),
                    "Direction": direction,
                }
            )

        print()
        print(
            f"Scenario {scenario} | "
            f"{timestamp}"
        )

        print(
            f"Probability: "
            f"{probability:.6f} "
            f"({probability * 100:.2f}%)"
        )

        print(
            f"Actual target: {actual}"
        )

        print(
            "Top contributors:"
        )

        for (
            feature_name,
            contribution,
            direction
        ) in top_features:

            print(
                f"  {feature_name:<32} "
                f"{contribution:+.6f} "
                f"({direction})"
            )

    local_df = pd.DataFrame(
        records
    )

    local_path = (
        OUTPUT_DIR
        / "local_warning_explanations.csv"
    )

    local_df.to_csv(
        local_path,
        index=False
    )

    return local_df


def create_timestep_explanations(
    X_raw,
    shap_values,
    predictions,
    metadata,
):
    print_header(
        "7. CREATING TIMESTEP-LEVEL EXPLANATIONS"
    )

    records = []

    warning_indices = np.where(
        predictions >= WARNING_THRESHOLD
    )[0]

    for sample_index in warning_indices:

        sample_shap = shap_values[
            sample_index
        ]

        scenario = int(
            metadata.iloc[sample_index]["Scenario"]
        )

        timestamp = (
            metadata.iloc[sample_index]
            ["Prediction_Timestamp"]
        )

        for timestep in range(
            SEQUENCE_LENGTH
        ):

            for feature_index, feature_name in enumerate(
                FEATURE_NAMES
            ):

                shap_value = float(
                    sample_shap[
                        timestep,
                        feature_index
                    ]
                )

                records.append(
                    {
                        "Scenario": scenario,
                        "Prediction_Timestamp": timestamp,
                        "Timestep": timestep + 1,
                        "Feature": feature_name,
                        "Raw_Value": float(
                            X_raw[
                                sample_index,
                                timestep,
                                feature_index
                            ]
                        ),
                        "SHAP_Value": shap_value,
                        "Absolute_SHAP": abs(
                            shap_value
                        ),
                    }
                )

    timestep_df = pd.DataFrame(
        records
    )

    output_path = (
        OUTPUT_DIR
        / "timestep_feature_shap.csv"
    )

    timestep_df.to_csv(
        output_path,
        index=False
    )

    return timestep_df


def create_prediction_summary(
    metadata,
    y,
    predictions,
):
    print_header(
        "8. SAVING PREDICTION SUMMARY"
    )

    result_df = metadata.copy()

    result_df["Actual_Target"] = y

    result_df["Prediction_Probability"] = (
        predictions
    )

    result_df["Prediction_Percent"] = (
        predictions * 100
    )

    result_df["Warning"] = (
        predictions >= WARNING_THRESHOLD
    ).astype(int)

    result_df["Prediction_Label"] = np.where(
        result_df["Warning"] == 1,
        "EARLY WARNING",
        "NORMAL"
    )

    result_df["Correct"] = (
        result_df["Warning"]
        == result_df["Actual_Target"]
    )

    output_path = (
        OUTPUT_DIR
        / "prediction_summary.csv"
    )

    result_df.to_csv(
        output_path,
        index=False
    )

    return result_df


def create_local_plots(
    X_raw,
    shap_values,
    predictions,
    metadata,
):
    print_header(
        "9. CREATING LOCAL EXPLANATION PLOTS"
    )

    warning_indices = np.where(
        predictions >= WARNING_THRESHOLD
    )[0]

    if len(warning_indices) == 0:
        print(
            "No warning plots created."
        )
        return

    max_plots = min(
        5,
        len(warning_indices)
    )

    for plot_number in range(
        max_plots
    ):

        sample_index = warning_indices[
            plot_number
        ]

        sample_shap = shap_values[
            sample_index
        ]

        feature_contribution = np.sum(
            sample_shap,
            axis=0
        )

        order = np.argsort(
            np.abs(feature_contribution)
        )[::-1][:10]

        feature_names = [
            FEATURE_NAMES[index]
            for index in order
        ]

        values = [
            feature_contribution[index]
            for index in order
        ]

        scenario = int(
            metadata.iloc[sample_index]["Scenario"]
        )

        timestamp = (
            metadata.iloc[sample_index]
            ["Prediction_Timestamp"]
        )

        probability = float(
            predictions[sample_index]
        )

        plt.figure(figsize=(11, 7))

        plt.barh(
            feature_names[::-1],
            values[::-1]
        )

        plt.axvline(
            0,
            linewidth=1
        )

        plt.xlabel(
            "SHAP Contribution"
        )

        plt.ylabel(
            "Feature"
        )

        plt.title(
            "CTU13 LSTM Local Explanation\n"
            f"Scenario {scenario} | "
            f"{timestamp} | "
            f"Probability {probability * 100:.2f}%"
        )

        plt.tight_layout()

        plot_path = (
            OUTPUT_DIR
            / f"local_warning_s{scenario}_"
            f"{plot_number + 1}.png"
        )

        plt.savefig(
            plot_path,
            dpi=200,
            bbox_inches="tight"
        )

        plt.close()


def main():
    print_header(
        "THREATCAST - CTU13 LSTM SHAP EXPLAINABILITY"
    )

    print(
        "Model: CTU13 LSTM Early Warning"
    )

    print(
        "Sequence: 5 states × 12 features"
    )

    print(
        "Warning threshold: 8%"
    )

    print(
        "Test scenarios: 12, 13"
    )

    validate_files()

    df = load_data()

    print_header(
        "2. LOADING TRAINED MODEL AND SCALER"
    )

    model = tf.keras.models.load_model(
        MODEL_PATH
    )

    scaler = joblib.load(
        SCALER_PATH
    )

    print(
        f"Model input shape: "
        f"{model.input_shape}"
    )

    print(
        f"Model output shape: "
        f"{model.output_shape}"
    )

    expected_shape = (
        None,
        SEQUENCE_LENGTH,
        len(FEATURE_NAMES)
    )

    actual_shape = tuple(
        model.input_shape
    )

    if actual_shape != expected_shape:
        raise ValueError(
            f"Unexpected model input shape: "
            f"{actual_shape}. "
            f"Expected {expected_shape}."
        )

    if getattr(
        scaler,
        "n_features_in_",
        None
    ) != len(FEATURE_NAMES):
        raise ValueError(
            f"Unexpected scaler feature count: "
            f"{getattr(scaler, 'n_features_in_', None)}. "
            f"Expected {len(FEATURE_NAMES)}."
        )

    print(
        "Model and scaler validation: PASS"
    )

    print_header(
        "3. CREATING TRAINING BACKGROUND SEQUENCES"
    )

    X_train_raw, y_train, train_metadata = (
        create_sequences(
            df,
            TRAIN_SCENARIOS
        )
    )

    X_train_scaled = scale_sequences(
        X_train_raw,
        scaler
    )

    print(
        f"Training sequences: "
        f"{X_train_scaled.shape}"
    )

    print_header(
        "4. CREATING HELD-OUT TEST SEQUENCES"
    )

    X_test_raw, y_test, test_metadata = (
        create_sequences(
            df,
            TEST_SCENARIOS
        )
    )

    X_test_scaled = scale_sequences(
        X_test_raw,
        scaler
    )

    print(
        f"Test sequences: "
        f"{X_test_scaled.shape}"
    )

    background_count = min(
        BACKGROUND_SAMPLES,
        len(X_train_scaled)
    )

    explanation_count = min(
        EXPLANATION_SAMPLES,
        len(X_test_scaled)
    )

    background_indices = np.linspace(
        0,
        len(X_train_scaled) - 1,
        background_count,
        dtype=int
    )

    explanation_indices = np.linspace(
        0,
        len(X_test_scaled) - 1,
        explanation_count,
        dtype=int
    )

    background = X_train_scaled[
        background_indices
    ]

    X_explain_scaled = X_test_scaled[
        explanation_indices
    ]

    X_explain_raw = X_test_raw[
        explanation_indices
    ]

    y_explain = y_test[
        explanation_indices
    ]

    metadata_explain = (
        test_metadata
        .iloc[explanation_indices]
        .reset_index(drop=True)
    )

    print(
        f"SHAP background: "
        f"{background.shape}"
    )

    print(
        f"SHAP explanation samples: "
        f"{X_explain_scaled.shape}"
    )

    print_header(
        "5. GENERATING MODEL PREDICTIONS"
    )

    predictions = model.predict(
        X_explain_scaled,
        verbose=0
    )

    predictions = np.asarray(
        predictions
    ).reshape(-1)

    print(
        f"Predictions generated: "
        f"{len(predictions)}"
    )

    print(
        f"Minimum probability: "
        f"{predictions.min():.8f}"
    )

    print(
        f"Maximum probability: "
        f"{predictions.max():.8f}"
    )

    warning_count = int(
        np.sum(
            predictions >= WARNING_THRESHOLD
        )
    )

    print(
        f"Warnings >= {WARNING_THRESHOLD:.2f}: "
        f"{warning_count}"
    )

    print_header(
        "6. CREATING SHAP GRADIENT EXPLAINER"
    )

    explainer = shap.GradientExplainer(
        model,
        background
    )

    print(
        "SHAP GradientExplainer created."
    )

    print_header(
        "7. CALCULATING SHAP VALUES"
    )

    shap_values = explainer.shap_values(
        X_explain_scaled
    )

    shap_values = normalize_shap_values(
        shap_values
    )

    print(
        f"Normalized SHAP shape: "
        f"{shap_values.shape}"
    )

    expected_shape = (
        len(X_explain_scaled),
        SEQUENCE_LENGTH,
        len(FEATURE_NAMES)
    )

    if shap_values.shape != expected_shape:
        raise ValueError(
            f"Unexpected SHAP shape: "
            f"{shap_values.shape}. "
            f"Expected {expected_shape}."
        )

    importance_df = create_global_importance(
        shap_values,
        X_explain_raw,
        metadata_explain
    )

    local_df = create_local_explanations(
        X_explain_raw,
        X_explain_scaled,
        y_explain,
        predictions,
        shap_values,
        metadata_explain
    )

    timestep_df = create_timestep_explanations(
        X_explain_raw,
        shap_values,
        predictions,
        metadata_explain
    )

    summary_df = create_prediction_summary(
        metadata_explain,
        y_explain,
        predictions
    )

    create_local_plots(
        X_explain_raw,
        shap_values,
        predictions,
        metadata_explain
    )

    print_header(
        "10. FINAL EXPLAINABILITY SUMMARY"
    )

    print(
        f"Explained samples: "
        f"{len(predictions)}"
    )

    print(
        f"Warnings: "
        f"{warning_count}"
    )

    print(
        f"Normal predictions: "
        f"{len(predictions) - warning_count}"
    )

    if len(local_df) > 0:
        unique_warning_samples = (
            local_df[
                [
                    "Scenario",
                    "Timestamp"
                ]
            ]
            .drop_duplicates()
            .shape[0]
        )

        print(
            f"Warnings with local explanations: "
            f"{unique_warning_samples}"
        )

    print()
    print(
        "OUTPUT FILES:"
    )

    print(
        f"  {OUTPUT_DIR / 'prediction_summary.csv'}"
    )

    print(
        f"  {OUTPUT_DIR / 'global_feature_importance.csv'}"
    )

    print(
        f"  {OUTPUT_DIR / 'local_warning_explanations.csv'}"
    )

    print(
        f"  {OUTPUT_DIR / 'timestep_feature_shap.csv'}"
    )

    print(
        f"  {OUTPUT_DIR / 'explainability_feature_importance.png'}"
    )

    print_header(
        "CTU13 LSTM SHAP EXPLAINABILITY COMPLETE"
    )


if __name__ == "__main__":
    main()