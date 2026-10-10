from pathlib import Path
import os

import pandas as pd

from backend.graph_store import Neo4jStore
from backend.ml.inference import predict_early_warning


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

CSV_PATH = PROJECT_ROOT / "data" / "CTU13" / "all_network_states.csv"


# ============================================================
# NEO4J CONNECTION
# ============================================================

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

if not NEO4J_PASSWORD:
    raise RuntimeError(
        "NEO4J_PASSWORD is not set."
    )


# ============================================================
# MODEL FEATURES
# ============================================================

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


# ============================================================
# LOAD DATA
# ============================================================

def load_data():

    if not CSV_PATH.exists():
        raise FileNotFoundError(
            f"CSV not found: {CSV_PATH}"
        )

    df = pd.read_csv(CSV_PATH)

    required = [
        "Scenario",
        "Timestamp",
        *FEATURE_NAMES,
    ]

    missing = [
        column for column in required
        if column not in df.columns
    ]

    if missing:
        raise ValueError(
            f"Missing columns: {missing}"
        )

    df["Timestamp"] = pd.to_datetime(df["Timestamp"])

    return df


# ============================================================
# STORE ONE PREDICTION
# ============================================================

def store_prediction(
    tx,
    scenario_number,
    state_id,
    state_timestamp,
    prediction,
):

    prediction_id = (
        f"prediction_s{scenario_number}_"
        f"{state_timestamp.strftime('%Y%m%d%H%M%S%f')}"
    )

    tx.run(
        """
        MATCH (n:NetworkState {id: $state_id})

        // The model is a real persisted deployment artifact, not a
        // synthetic dashboard record.  Creating it here makes a fresh
        // database import self-contained and keeps repeated imports safe.
        MERGE (m:Model {id: "ctu13_lstm_early_warning"})
        SET
            m.name = "CTU13 LSTM Early Warning",
            m.sequence_length = $sequence_length,
            m.feature_count = 12,
            m.threshold = $threshold

        MERGE (p:Prediction {id: $prediction_id})

        SET
            p.probability = $probability,
            p.probability_percent = $probability_percent,
            p.threshold = $threshold,
            p.warning = $warning,
            p.label = $label,
            p.model = $model,
            p.sequence_length = $sequence_length,
            p.created_at = datetime(),
            p.prediction_timestamp = $prediction_timestamp

        MERGE (n)-[:HAS_PREDICTION]->(p)
        MERGE (p)-[:PRODUCED_BY]->(m)
        """,
        state_id=state_id,
        prediction_id=prediction_id,
        probability=prediction["probability"],
        probability_percent=prediction["probability_percent"],
        threshold=prediction["threshold"],
        warning=prediction["warning"],
        label=prediction["label"],
        model=prediction["model"],
        sequence_length=prediction["sequence_length"],
        prediction_timestamp=state_timestamp.isoformat(),
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 60)
    print("THREATCAST — CTU13 LSTM → NEO4J PREDICTIONS")
    print("=" * 60)

    df = load_data()

    print(f"\nCSV rows: {len(df)}")
    print(f"Scenarios: {df['Scenario'].nunique()}")

    driver = Neo4jStore(
        NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD,
    )

    total_predictions = 0

    try:

        driver.verify()

        print("\n✓ Neo4j connection successful")
        print("✓ CTU13 LSTM inference module loaded")

        with driver.session(database="neo4j") as session:

            for scenario_number, scenario_df in df.groupby(
                "Scenario",
                sort=True,
            ):

                scenario_df = scenario_df.sort_values(
                    "Timestamp"
                ).reset_index(drop=True)

                print(
                    f"\nScenario {int(scenario_number)}: "
                    f"{len(scenario_df)} states"
                )

                if len(scenario_df) < SEQUENCE_LENGTH:
                    print(
                        "  Skipped — fewer than 5 states."
                    )
                    continue

                scenario_predictions = 0

                for end_index in range(
                    SEQUENCE_LENGTH - 1,
                    len(scenario_df),
                ):

                    window = scenario_df.iloc[
                        end_index - SEQUENCE_LENGTH + 1:
                        end_index + 1
                    ]

                    sequence = window[
                        FEATURE_NAMES
                    ].astype(float).values.tolist()

                    prediction = predict_early_warning(
                        sequence
                    )

                    state_row = scenario_df.iloc[end_index]

                    timestamp = state_row["Timestamp"]

                    state_id = (
                        f"ctu13_s{int(scenario_number)}_"
                        f"{timestamp.strftime('%Y%m%d%H%M%S%f')}"
                    )

                    session.execute_write(
                        store_prediction,
                        int(scenario_number),
                        state_id,
                        timestamp,
                        prediction,
                    )

                    scenario_predictions += 1
                    total_predictions += 1

                print(
                    f"  Predictions stored: "
                    f"{scenario_predictions}"
                )

        print("\n" + "=" * 60)
        print("PREDICTION IMPORT COMPLETE")
        print("=" * 60)
        print(
            f"Total predictions stored: "
            f"{total_predictions}"
        )

    finally:
        driver.close()


if __name__ == "__main__":
    main()
