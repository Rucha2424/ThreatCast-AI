from pathlib import Path

import pandas as pd

from backend.database.neo4j_client import get_database, get_driver
from backend.ml.inference import FEATURE_NAMES
from backend.models.schemas import (
    NetworkEdge,
    NetworkGraphResponse,
    NetworkActivityResponse,
    NetworkNode,
    TrafficPoint,
    AuthPoint,
    RiskPoint,
)


PROJECT_ROOT = Path(__file__).resolve().parents[2]

CTU13_STATES_PATH = (
    PROJECT_ROOT
    / "data"
    / "CTU13"
    / "all_network_states.csv"
)


def _load_ctu13_states() -> pd.DataFrame:
    """
    Load CTU13 aggregate network-state observations.
    """

    if not CTU13_STATES_PATH.exists():
        raise FileNotFoundError(
            f"CTU13 network states file not found: "
            f"{CTU13_STATES_PATH}"
        )

    df = pd.read_csv(CTU13_STATES_PATH)

    required_columns = [
        "Scenario",
        "Timestamp",
        *FEATURE_NAMES,
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            "CTU13 CSV is missing required columns: "
            f"{missing_columns}"
        )

    if df.empty:
        raise ValueError(
            "CTU13 network states CSV is empty."
        )

    df["Timestamp"] = pd.to_datetime(
        df["Timestamp"],
        errors="coerce",
    )

    df = df.dropna(
        subset=["Timestamp"]
    )

    for feature in FEATURE_NAMES:
        df[feature] = pd.to_numeric(
            df[feature],
            errors="coerce",
        )

    df = df.dropna(
        subset=FEATURE_NAMES
    )

    if df.empty:
        raise ValueError(
            "CTU13 network states contain no valid feature rows."
        )

    return df.sort_values(
        ["Scenario", "Timestamp"]
    )


def _get_latest_scenario_data() -> pd.DataFrame:
    """
    Get all states for the CTU13 scenario containing
    the latest timestamp.
    """

    df = _load_ctu13_states()

    latest_row = (
        df.sort_values("Timestamp")
        .iloc[-1]
    )

    latest_scenario = latest_row["Scenario"]

    scenario_df = (
        df[
            df["Scenario"] == latest_scenario
        ]
        .sort_values("Timestamp")
        .copy()
    )

    if scenario_df.empty:
        raise ValueError(
            f"No states found for scenario "
            f"{latest_scenario}."
        )

    return scenario_df


def get_network_graph() -> NetworkGraphResponse:
    """Project the persisted CTU13 Neo4j lineage for the existing graph UI.

    CTU13 network states are aggregate 30-second observations, not hosts.
    Consequently this projection deliberately renders only actual database
    entities and relationships (Dataset, Scenario, NetworkState, Prediction,
    Event, and Model); it never manufactures a host-level topology.
    """

    query = """
    MATCH (d:Dataset {id: "ctu13"})-[:HAS_SCENARIO]->(s:Scenario)
          -[:HAS_STATE]->(n:NetworkState)
    WITH d, s, n
    ORDER BY n.timestamp DESC
    LIMIT 6
    OPTIONAL MATCH (n)-[:HAS_PREDICTION]->(p:Prediction)
    OPTIONAL MATCH (n)-[:GENERATED_EVENT]->(e:Event)
    OPTIONAL MATCH (p)-[:PRODUCED_BY]->(m:Model)
    RETURN
        d.id AS dataset_id,
        s.id AS scenario_id,
        s.scenario_number AS scenario_number,
        n.id AS state_id,
        n.timestamp AS state_timestamp,
        n.Flow_Count AS flow_count,
        p.id AS prediction_id,
        p.probability AS probability,
        p.warning AS warning,
        p.prediction_timestamp AS prediction_timestamp,
        e.id AS event_id,
        e.severity AS event_severity,
        m.id AS model_id
    ORDER BY state_timestamp ASC
    """

    with get_driver().session(database=get_database()) as session:
        records = list(session.run(query))

    if not records:
        raise RuntimeError("No persisted CTU13 graph records found in Neo4j.")

    nodes: dict[str, NetworkNode] = {}
    edges: list[NetworkEdge] = []
    edge_ids: set[str] = set()
    attack_path_node_ids: list[str] = []
    latest_timestamp = ""

    def add_node(node: NetworkNode) -> None:
        nodes.setdefault(node.id, node)

    def add_edge(source: str, target: str, relationship: str, *, attack: bool = False) -> None:
        edge_id = f"{relationship}:{source}:{target}"
        if edge_id in edge_ids:
            return
        edge_ids.add(edge_id)
        edges.append(NetworkEdge(
            id=edge_id,
            source=source,
            target=target,
            protocol=relationship,
            port=0,
            traffic_volume="Persisted Neo4j relationship",
            is_attack_path=attack,
            status="monitored",
        ))

    for record in records:
        dataset_id = str(record["dataset_id"])
        scenario_id = str(record["scenario_id"])
        state_id = str(record["state_id"])
        timestamp = str(record["state_timestamp"])
        latest_timestamp = max(latest_timestamp, timestamp)
        scenario_number = record["scenario_number"]

        add_node(NetworkNode(
            id=dataset_id,
            label="CTU13 Dataset",
            type="database",
            ip="Not applicable",
            risk_score=0,
            state="normal",
            department="Dataset",
            os="Not applicable",
            observed_activity="Persisted CTU13 source dataset.",
            predicted_action="Contains the imported scenario lineage.",
            active_connections=1,
        ))
        add_node(NetworkNode(
            id=scenario_id,
            label=f"CTU13 Scenario {scenario_number}",
            type="gateway",
            ip="Not applicable",
            risk_score=0,
            state="normal",
            department="Scenario",
            os="Not applicable",
            observed_activity="Persisted scenario containing 30-second network states.",
            predicted_action="Connects the displayed states to their CTU13 scenario.",
            active_connections=0,
        ))
        add_node(NetworkNode(
            id=state_id,
            label="NetworkState " + timestamp,
            type="endpoint",
            ip="Aggregate telemetry",
            risk_score=0,
            state="normal",
            department="CTU13 Network State",
            os="Not applicable",
            observed_activity=(
                f"Persisted 30-second aggregate state; Flow_Count={record['flow_count']}."
            ),
            predicted_action="Input to the persisted CTU13 LSTM prediction.",
            active_connections=0,
        ))
        add_edge(dataset_id, scenario_id, "HAS_SCENARIO")
        add_edge(scenario_id, state_id, "HAS_STATE")

        prediction_id = record["prediction_id"]
        if prediction_id is None:
            continue

        probability = float(record["probability"] or 0.0)
        warning = bool(record["warning"])
        risk_score = round(max(0.0, min(1.0, probability)) * 100)
        prediction_state = "compromised" if warning else "normal"
        prediction_id = str(prediction_id)
        add_node(NetworkNode(
            id=prediction_id,
            label="LSTM Prediction " + timestamp,
            type="server",
            ip="Not applicable",
            risk_score=risk_score,
            state=prediction_state,
            department="CTU13 LSTM",
            os="Not applicable",
            observed_activity=(
                f"Persisted early-warning probability: {probability * 100:.4f}%."
            ),
            predicted_action=(
                "Persisted warning threshold exceeded."
                if warning else "Persisted prediction is below the warning threshold."
            ),
            active_connections=0,
            is_in_attack_path=warning,
        ))
        add_edge(state_id, prediction_id, "HAS_PREDICTION", attack=warning)
        if warning:
            attack_path_node_ids.extend([state_id, prediction_id])

        model_id = record["model_id"]
        if model_id is not None:
            model_id = str(model_id)
            add_node(NetworkNode(
                id=model_id,
                label="CTU13 LSTM Early Warning",
                type="server",
                ip="Not applicable",
                risk_score=0,
                state="normal",
                department="Model Artifact",
                os="Not applicable",
                observed_activity="Real persisted deployment model artifact.",
                predicted_action="Produces the linked persisted predictions.",
                active_connections=0,
            ))
            add_edge(prediction_id, model_id, "PRODUCED_BY")

        event_id = record["event_id"]
        if event_id is not None:
            event_id = str(event_id)
            add_node(NetworkNode(
                id=event_id,
                label="ML Early Warning Event",
                type="database",
                ip="Not applicable",
                risk_score=risk_score,
                state="suspicious",
                department="Persisted Event",
                os="Not applicable",
                observed_activity="Derived from a persisted CTU13 LSTM warning.",
                predicted_action="Review the linked prediction and source network state.",
                active_connections=0,
                is_in_attack_path=True,
            ))
            add_edge(state_id, event_id, "GENERATED_EVENT", attack=True)
            add_edge(event_id, prediction_id, "BASED_ON_PREDICTION", attack=True)
            attack_path_node_ids.append(event_id)

    connection_counts = {node_id: 0 for node_id in nodes}
    for edge in edges:
        connection_counts[edge.source] += 1
        connection_counts[edge.target] += 1
    for node_id, node in list(nodes.items()):
        nodes[node_id] = node.model_copy(update={
            "active_connections": connection_counts[node_id],
        })

    return NetworkGraphResponse(
        nodes=list(nodes.values()),
        edges=edges,
        attack_path_node_ids=list(dict.fromkeys(attack_path_node_ids)),
        forecasted_path_node_ids=[],
        high_risk_nodes_count=sum(
            1 for node in nodes.values() if node.risk_score > 50
        ),
        last_updated=latest_timestamp,
    )


def get_network_activity() -> NetworkActivityResponse:
    """
    Return recent aggregate CTU13 network activity.

    CTU13 does not provide authentication or privilege-
    escalation event counts, so those values are not fabricated.
    """

    scenario_df = _get_latest_scenario_data()

    recent_states = (
        scenario_df
        .tail(12)
        .copy()
    )

    traffic_series = []
    auth_series = []
    risk_trend = []

    for _, row in recent_states.iterrows():

        timestamp = row["Timestamp"]

        if hasattr(timestamp, "strftime"):
            time_text = timestamp.strftime(
                "%H:%M:%S"
            )
        else:
            time_text = str(timestamp)

        total_bytes = max(
            float(row["Total_Bytes"]),
            0.0,
        )

        total_source_bytes = max(
            float(row["Total_Source_Bytes"]),
            0.0,
        )

        flow_count = max(
            float(row["Flow_Count"]),
            0.0,
        )

        bytes_in_mbps = (
            total_bytes
            * 8.0
            / 30.0
            / 1_000_000.0
        )

        bytes_out_mbps = (
            total_source_bytes
            * 8.0
            / 30.0
            / 1_000_000.0
        )

        flow_change = abs(
            float(row["Flow_Count_Change"])
        )

        anomalous_mbps = (
            flow_change
            * 8.0
            / 30.0
            / 1_000_000.0
        )

        traffic_series.append(
            TrafficPoint(
                time=time_text,
                bytes_in_mbps=round(
                    bytes_in_mbps,
                    6,
                ),
                bytes_out_mbps=round(
                    bytes_out_mbps,
                    6,
                ),
                anomalous_mbps=round(
                    anomalous_mbps,
                    6,
                ),
            )
        )

        auth_series.append(
            AuthPoint(
                time=time_text,
                successful_logins=0,
                failed_logins=0,
                privilege_escalations=0,
            )
        )

        activity_score = min(
            100,
            max(
                0,
                round(
                    flow_count / 10.0
                ),
            ),
        )

        risk_trend.append(
            RiskPoint(
                time=time_text,
                risk_score=activity_score,
                threat_events=0,
            )
        )

    latest_timestamp = (
        recent_states["Timestamp"].iloc[-1]
    )

    if hasattr(
        latest_timestamp,
        "isoformat",
    ):
        last_updated = (
            latest_timestamp.isoformat()
        )
    else:
        last_updated = str(
            latest_timestamp
        )

    return NetworkActivityResponse(
        traffic_series=traffic_series,
        auth_series=auth_series,
        risk_trend=risk_trend,
        last_updated=last_updated,
    )
