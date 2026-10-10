from typing import Optional

from backend.models.schemas import (
    EventsResponse,
    SecurityEvent,
)

from backend.database.neo4j_client import (
    get_driver,
    get_database,
)


def _timestamp_to_string(value):
    """
    Convert Neo4j/Python timestamp values into strings.
    """

    if value is None:
        return ""

    if hasattr(value, "isoformat"):
        return value.isoformat()

    return str(value)


def get_events(
    limit: int = 50,
    risk_level: Optional[str] = None,
    tactic: Optional[str] = None,
) -> EventsResponse:
    """
    Return persistent ML early-warning events from Neo4j.

    These are CTU13 LSTM warning signals.

    They are NOT:
    - confirmed incidents
    - host-level detections
    - IP-attributed events
    - MITRE ATT&CK stage predictions
    """

    driver = get_driver()
    database = get_database()

    query = """
    MATCH (n:NetworkState)-[:GENERATED_EVENT]->(e:Event)

    OPTIONAL MATCH (e)-[:BASED_ON_PREDICTION]->(p:Prediction)

    WHERE
        (
            $risk_level IS NULL
            OR toUpper(coalesce(e.severity, "WARNING"))
               = toUpper($risk_level)
        )

        AND

        (
            $tactic IS NULL
            OR toLower(
                coalesce(e.event_type, "")
            ) CONTAINS toLower($tactic)

            OR toLower(
                coalesce(e.source, "")
            ) CONTAINS toLower($tactic)
        )

    RETURN
        e.id AS id,
        e.event_type AS event_type,
        e.source AS source,
        e.severity AS severity,
        e.probability AS probability,
        e.threshold AS threshold,
        e.label AS label,
        e.timestamp AS timestamp,

        n.id AS network_state_id,
        n.timestamp AS state_timestamp,

        p.id AS prediction_id

    ORDER BY
        e.timestamp DESC

    LIMIT $limit
    """

    with driver.session(
        database=database
    ) as session:

        records = list(
            session.run(
                query,
                limit=max(
                    1,
                    min(
                        int(limit),
                        500,
                    ),
                ),
                risk_level=risk_level,
                tactic=tactic,
            )
        )

    events = []

    for record in records:

        severity = str(
            record["severity"]
            or "WARNING"
        ).upper()

        event_type = str(
            record["event_type"]
            or "ML_EARLY_WARNING"
        )

        timestamp_text = (
            _timestamp_to_string(
                record["timestamp"]
            )
        )

        probability = record[
            "probability"
        ]

        threshold = record[
            "threshold"
        ]

        if probability is not None:

            probability_percent = (
                float(probability) * 100
            )

            threshold_percent = (
                float(
                    threshold
                    if threshold is not None
                    else 0.08
                ) * 100
            )

            details = (
                "CTU13 LSTM early-warning signal. "
                f"Warning probability: "
                f"{probability_percent:.4f}%. "
                f"Deployment threshold: "
                f"{threshold_percent:.0f}%. "
                f"Network state: "
                f"{record['network_state_id']}."
            )

        else:

            details = (
                "CTU13 LSTM early-warning signal "
                "persisted in Neo4j."
            )

        events.append(
            SecurityEvent(

                id=str(
                    record["id"]
                ),

                timestamp=timestamp_text,

                source_ip="N/A",

                source_entity=(
                    "CTU13 Aggregate Network"
                ),

                destination_ip="N/A",

                destination_entity="N/A",

                event_type=event_type,

                tactic="ML Early Warning",

                technique_id="N/A",

                risk_level=severity,

                status="Warning",

                details=details,

                is_forecast_trigger=True,
            )
        )

    last_updated = (
        events[0].timestamp
        if events
        else None
    )

    return EventsResponse(
        total=len(events),

        events=events,

        last_updated=last_updated,
    )