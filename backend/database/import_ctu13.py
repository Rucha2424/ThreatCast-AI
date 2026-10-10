from pathlib import Path
import os

import pandas as pd

from backend.graph_store import Neo4jStore


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
        "NEO4J_PASSWORD is not set. "
        "Set it in the terminal before running this script."
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


# ============================================================
# VALIDATE CSV
# ============================================================

def load_csv():
    if not CSV_PATH.exists():
        raise FileNotFoundError(
            f"CTU13 CSV not found:\n{CSV_PATH}"
        )

    df = pd.read_csv(CSV_PATH)

    required_columns = [
        "Scenario",
        "Timestamp",
        *FEATURE_NAMES,
        "Attack_Flow_Count",
        "Attack_State",
        "Target_Early_Warning",
    ]

    missing = [
        column for column in required_columns
        if column not in df.columns
    ]

    if missing:
        raise ValueError(
            f"Missing CSV columns: {missing}"
        )

    df["Timestamp"] = pd.to_datetime(df["Timestamp"])

    return df


# ============================================================
# IMPORT ONE SCENARIO
# ============================================================

def import_scenario(tx, scenario_number, rows):

    dataset = tx.run(
        """
        MERGE (d:Dataset {id: $dataset_id})
        RETURN d
        """,
        dataset_id="ctu13",
    ).single()

    scenario_id = f"ctu13_scenario_{scenario_number}"

    tx.run(
        """
        MATCH (d:Dataset {id: $dataset_id})

        MERGE (s:Scenario {id: $scenario_id})
        SET
            s.scenario_number = $scenario_number,
            s.name = $name

        MERGE (d)-[:HAS_SCENARIO]->(s)
        """,
        dataset_id="ctu13",
        scenario_id=scenario_id,
        scenario_number=int(scenario_number),
        name=f"CTU13 Scenario {scenario_number}",
    )

    previous_state_id = None

    for index, row in rows.iterrows():

        timestamp = row["Timestamp"]

        state_id = (
            f"ctu13_s{int(scenario_number)}_"
            f"{timestamp.strftime('%Y%m%d%H%M%S%f')}"
        )

        properties = {
            "id": state_id,
            "scenario_number": int(scenario_number),
            "timestamp": timestamp.isoformat(),
            "duration_seconds": 30,

            # 12 model features
            **{
                feature: float(row[feature])
                for feature in FEATURE_NAMES
            },

            # Dataset ground truth / metadata
            "attack_flow_count": float(row["Attack_Flow_Count"]),
            "attack_state": int(row["Attack_State"]),
            "target_early_warning": int(row["Target_Early_Warning"]),
        }

        tx.run(
            """
            MATCH (s:Scenario {id: $scenario_id})

            MERGE (n:NetworkState {id: $id})
            SET n += $properties

            MERGE (s)-[:HAS_STATE]->(n)
            """,
            scenario_id=scenario_id,
            id=state_id,
            properties=properties,
        )

        # Connect consecutive 30-second states.
        if previous_state_id is not None:
            tx.run(
                """
                MATCH (previous:NetworkState {id: $previous_id})
                MATCH (current:NetworkState {id: $current_id})

                MERGE (previous)-[:NEXT_STATE]->(current)
                """,
                previous_id=previous_state_id,
                current_id=state_id,
            )

        previous_state_id = state_id


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 60)
    print("THREATCAST — CTU13 → NEO4J IMPORT")
    print("=" * 60)

    print(f"\nCSV: {CSV_PATH}")
    print(f"Neo4j: {NEO4J_URI}")

    df = load_csv()

    print(f"\nCSV rows: {len(df)}")
    print(f"Scenarios: {df['Scenario'].nunique()}")

    driver = Neo4jStore(
        NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD,
    )

    try:
        driver.verify()
        print("\n✓ Neo4j connection successful")

        with driver.session(database="neo4j") as session:

            for scenario_number, scenario_rows in df.groupby(
                "Scenario",
                sort=True
            ):
                scenario_rows = scenario_rows.sort_values(
                    "Timestamp"
                )

                print(
                    f"Importing Scenario {int(scenario_number)} "
                    f"({len(scenario_rows)} states)..."
                )

                session.execute_write(
                    import_scenario,
                    int(scenario_number),
                    scenario_rows,
                )

        print("\n" + "=" * 60)
        print("IMPORT COMPLETE")
        print("=" * 60)

    finally:
        driver.close()


if __name__ == "__main__":
    main()
