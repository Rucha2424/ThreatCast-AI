"""Graph persistence adapters for ThreatCast-AI.

The application talks to this module instead of constructing Neo4j drivers.
The in-memory fallback holds ordinary Python dictionaries and can optionally
be seeded from JSON.
"""

from __future__ import annotations

import json
import logging
import os
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

from neo4j import GraphDatabase


LOGGER = logging.getLogger("threatcast.storage")


class GraphStore(ABC):
    """Small storage interface used by the FastAPI application."""

    name: str
    database: str

    @abstractmethod
    def verify(self) -> None:
        """Raise when the store is unavailable."""

    @abstractmethod
    def session(self, database: str | None = None):
        """Return a context-managed query session."""

    @abstractmethod
    def close(self) -> None:
        """Release store resources."""


class Neo4jStore(GraphStore):
    """Neo4j-backed store preserving the existing Cypher behavior."""

    name = "neo4j"

    def __init__(self, uri: str, username: str, password: str, database: str = "neo4j") -> None:
        self.database = database
        self._driver = GraphDatabase.driver(
            uri, auth=(username, password), connection_timeout=3.0
        )

    def verify(self) -> None:
        self._driver.verify_connectivity()

    def session(self, database: str | None = None):
        return self._driver.session(database=database or self.database)

    def close(self) -> None:
        self._driver.close()


class _MemoryResult:
    def __init__(self, records: list[dict[str, Any]]) -> None:
        self._records = records

    def single(self) -> dict[str, Any] | None:
        return self._records[0] if self._records else None

    def __iter__(self) -> Iterator[dict[str, Any]]:
        return iter(self._records)


class _MemorySession:
    def __init__(self, store: "InMemoryGraphStore") -> None:
        self._store = store

    def __enter__(self) -> "_MemorySession":
        return self

    def __exit__(self, *_args: Any) -> None:
        return None

    def run(self, query: str, **parameters: Any) -> _MemoryResult:
        return _MemoryResult(self._store.query(query, parameters))


class InMemoryGraphStore(GraphStore):
    """Dict/JSON fallback for a zero-service local backend."""

    name = "in-memory"
    database = "memory"

    def __init__(self, seed_path: str | Path | None = None) -> None:
        now = datetime.now(timezone.utc).isoformat()
        self.data: dict[str, list[dict[str, Any]]] = {
            "network_states": [],
            "predictions": [{
                "scenario_number": 13,
                "network_state_id": "memory-state-001",
                "state_timestamp": now,
                "prediction_id": "memory-prediction-001",
                "probability": 0.0,
                "threshold": 0.08,
                "warning": False,
                "label": "NORMAL",
                "prediction_timestamp": now,
                "model": "CTU13 LSTM",
            }],
            "events": [{
                "id": "memory-event-001",
                "event_type": "ML_BASELINE",
                "source": "ThreatCast in-memory store",
                "severity": "INFO",
                "probability": 0.0,
                "threshold": 0.08,
                "label": "NORMAL",
                "timestamp": now,
                "network_state_id": "memory-state-001",
                "state_timestamp": now,
                "prediction_id": "memory-prediction-001",
            }],
            "incidents": [],
            "scenarios": [{"scenario_number": 13}],
        }
        if seed_path:
            supplied = json.loads(Path(seed_path).read_text(encoding="utf-8"))
            if not isinstance(supplied, dict):
                raise ValueError("In-memory graph seed must be a JSON object.")
            for key in self.data:
                value = supplied.get(key)
                if isinstance(value, list):
                    self.data[key] = value

    def verify(self) -> None:
        return None

    def session(self, database: str | None = None) -> _MemorySession:
        del database
        return _MemorySession(self)

    def close(self) -> None:
        return None

    def query(self, query: str, parameters: dict[str, Any]) -> list[dict[str, Any]]:
        """Handle the fixed read queries issued by the current API."""
        compact = " ".join(query.split())

        if "RETURN count(n) AS total_nodes" in compact:
            return [{"total_nodes": sum(len(items) for items in self.data.values())}]

        if "count(sc) AS scenarios" in compact:
            return [{
                "network_states": len(self.data["network_states"]),
                "predictions": len(self.data["predictions"]),
                "events": len(self.data["events"]),
                "scenarios": len(self.data["scenarios"]),
            }]

        if "HAS_PREDICTION" in compact:
            values = self.data["predictions"]
            return [values[-1]] if values else []

        if "GENERATED_EVENT" in compact:
            records = list(reversed(self.data["events"]))
            risk = parameters.get("risk_level")
            tactic = parameters.get("tactic")
            if risk:
                records = [item for item in records if str(item.get("severity", "WARNING")).lower() == str(risk).lower()]
            if tactic:
                needle = str(tactic).lower()
                records = [item for item in records if needle in str(item.get("event_type", "")).lower() or needle in str(item.get("source", "")).lower()]
            return records[: int(parameters.get("limit", 50))]

        if "MATCH (i:Incident" in compact:
            incident_id = parameters.get("incident_id")
            records = self.data["incidents"]
            if incident_id is not None:
                records = [item for item in records if str((item.get("props") or {}).get("id")) == str(incident_id)]
            return records

        LOGGER.warning("In-memory store received an unsupported read query")
        return []


def _truthy(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def create_graph_store() -> GraphStore:
    """Select Neo4j when healthy, otherwise return the local fallback."""
    seed_path = os.getenv("THREATCAST_MEMORY_STORE_JSON")
    if _truthy(os.getenv("THREATCAST_NO_NEO4J")):
        store = InMemoryGraphStore(seed_path)
        LOGGER.warning("ThreatCast graph store active: in-memory (forced by THREATCAST_NO_NEO4J)")
        return store

    password = os.getenv("NEO4J_PASSWORD", "")
    if password:
        candidate = Neo4jStore(
            uri=os.getenv("NEO4J_URI", "neo4j://localhost:7687"),
            username=os.getenv("NEO4J_USERNAME", "neo4j"),
            password=password,
            database=os.getenv("NEO4J_DATABASE", "neo4j"),
        )
        try:
            candidate.verify()
            LOGGER.warning("ThreatCast graph store active: neo4j")
            return candidate
        except Exception as exc:
            candidate.close()
            LOGGER.warning("Neo4j unavailable (%s); ThreatCast graph store active: in-memory", exc)
    else:
        LOGGER.warning("NEO4J_PASSWORD is unset; ThreatCast graph store active: in-memory")

    return InMemoryGraphStore(seed_path)


_ACTIVE_STORE = create_graph_store()


def get_graph_store() -> GraphStore:
    return _ACTIVE_STORE
