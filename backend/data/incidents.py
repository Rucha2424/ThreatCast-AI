from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.database.neo4j_client import get_database, get_driver
from backend.models.schemas import (
    IncidentDetailResponse,
    IncidentListResponse,
)


def _now_iso() -> str:
    """Return the current UTC time as an ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


def _safe_float(value: Any, default: float = 0.0) -> float:
    """Convert a value to float without raising on None/bad data."""
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_bool(value: Any, default: bool = False) -> bool:
    """Convert a value to bool safely."""
    if value is None:
        return default

    if isinstance(value, bool):
        return value

    if isinstance(value, str):
        return value.strip().lower() in {
            "true",
            "1",
            "yes",
            "y",
        }

    return bool(value)


def _safe_list(value: Any) -> List[Any]:
    """Return a list; convert None/non-list values safely."""
    if value is None:
        return []

    if isinstance(value, list):
        return value

    return [value]


def _incident_from_record(record) -> Dict[str, Any]:
    """
    Convert a Neo4j record into the application's incident structure.

    Incident nodes are optional in the current persistent database.
    Missing properties therefore receive safe defaults instead of
    causing Pydantic validation failures.
    """

    props = record.get("props") or {}

    network_state_id = record.get("network_state_id")
    state_timestamp = record.get("state_timestamp")

    detected_at = (
        props.get("detected_at")
        or state_timestamp
        or _now_iso()
    )

    return {
        "id": props.get(
            "id",
            "unknown",
        ),
        "title": props.get(
            "title",
            "ThreatCast Incident",
        ),
        "detected_at": str(detected_at),
        "current_stage": props.get(
            "current_stage",
            "Unknown",
        ),
        "predicted_progression": _safe_list(
            props.get("predicted_progression")
        ),
        "affected_assets": _safe_list(
            props.get("affected_assets")
        ),
        "risk_level": props.get(
            "risk_level",
            "UNKNOWN",
        ),
        "risk_score": _safe_float(
            props.get("risk_score"),
            0.0,
        ),
        "status": props.get(
            "status",
            "Open",
        ),
        "model_confidence": _safe_float(
            props.get("model_confidence"),
            0.0,
        ),
        "rule_result": props.get(
            "rule_result",
            "Not evaluated",
        ),
        "has_disagreement": _safe_bool(
            props.get("has_disagreement"),
            False,
        ),
        "recommended_action": props.get(
            "recommended_action",
            "Continue normal network monitoring.",
        ),
        "network_state_id": network_state_id,
        "state_timestamp": state_timestamp,
    }


def get_incidents() -> IncidentListResponse:
    """
    Return incidents currently persisted in Neo4j.

    Important:
    - No synthetic/demo incidents are generated.
    - An empty Incident database is a valid state.
    - The endpoint still returns a valid response when there
      are no incidents.
    """

    query = """
    MATCH (i:Incident)

    OPTIONAL MATCH (i)-[r]->(n:NetworkState)

    WHERE r IS NULL OR type(r) = 'BASED_ON'

    RETURN
        properties(i) AS props,
        n.id AS network_state_id,
        n.timestamp AS state_timestamp

    ORDER BY
        coalesce(
            properties(i).detected_at,
            n.timestamp,
            ''
        ) DESC
    """

    with get_driver().session(
        database=get_database()
    ) as session:
        records = list(session.run(query))

    incidents: List[Dict[str, Any]] = [
        _incident_from_record(record)
        for record in records
    ]

    # Empty Incident database is expected at this stage.
    if incidents:
        last_updated = incidents[0]["detected_at"]
    else:
        last_updated = _now_iso()

    return IncidentListResponse(
        total=len(incidents),
        incidents=incidents,
        last_updated=last_updated,
    )


def get_incident(incident_id: str) -> Optional[IncidentDetailResponse]:
    """
    Return a single persisted incident.

    Returns None if the incident does not exist.
    """

    query = """
    MATCH (i:Incident {id: $incident_id})

    OPTIONAL MATCH (i)-[r]->(n:NetworkState)

    WHERE r IS NULL OR type(r) = 'BASED_ON'

    RETURN
        properties(i) AS props,
        n.id AS network_state_id,
        n.timestamp AS state_timestamp
    """

    with get_driver().session(
        database=get_database()
    ) as session:
        record = session.run(
            query,
            incident_id=incident_id,
        ).single()

    if record is None:
        return None

    incident = _incident_from_record(record)

    timeline: List[Dict[str, Any]] = []

    if incident.get("state_timestamp"):
        timeline.append(
            {
                "timestamp": incident["state_timestamp"],
                "stage": incident.get(
                    "current_stage",
                    "Unknown",
                ),
                "description": (
                    "Incident associated with a "
                    "persisted CTU13 network state."
                ),
            }
        )

    return IncidentDetailResponse(
        id=incident["id"],
        title=incident["title"],
        detected_at=incident["detected_at"],
        current_stage=incident["current_stage"],
        predicted_progression=incident[
            "predicted_progression"
        ],
        affected_assets=incident[
            "affected_assets"
        ],
        risk_level=incident["risk_level"],
        risk_score=incident["risk_score"],
        status=incident["status"],
        model_confidence=incident[
            "model_confidence"
        ],
        rule_result=incident["rule_result"],
        has_disagreement=incident[
            "has_disagreement"
        ],
        recommended_action=incident[
            "recommended_action"
        ],
        timeline=timeline,
        containment_playbook=[],
    )


# -------------------------------------------------------------------
# Compatibility alias
# -------------------------------------------------------------------
#
# backend/routes/incidents.py currently imports this name.
# Keep the alias so the route does not need to be modified.
#
get_incident_by_id = get_incident