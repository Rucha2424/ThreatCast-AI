"""Fail-closed bridge to the compiled Hyperledger Fabric gateway CLI."""

from __future__ import annotations

import json
import os
import subprocess
from datetime import datetime, timezone
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class BlockchainUnavailable(RuntimeError):
    """Raised when Fabric is disabled or its gateway cannot be reached."""


@dataclass(frozen=True)
class FabricConfig:
    enabled: bool
    gateway_command: tuple[str, ...]
    workspace_root: Path
    channel: str
    chaincode: str
    timeout_seconds: float
    local_ledger_path: Path

    @classmethod
    def from_environment(cls) -> "FabricConfig":
        project_root = Path(__file__).resolve().parents[2]
        workspace_root = Path(
            os.getenv("FABRIC_WORKSPACE_ROOT", project_root / "blockchain")
        ).resolve()
        gateway_command = os.getenv("FABRIC_GATEWAY_COMMAND", "").strip()
        command = tuple(gateway_command.split()) if gateway_command else ()
        return cls(
            enabled=os.getenv("FABRIC_ENABLED", "false").lower() in {"1", "true", "yes"},
            gateway_command=command,
            workspace_root=workspace_root,
            channel=os.getenv("FABRIC_CHANNEL", "threatcast"),
            chaincode=os.getenv("FABRIC_CHAINCODE", "disagreement-ledger"),
            timeout_seconds=float(os.getenv("FABRIC_SUBMIT_TIMEOUT_SECONDS", "15")),
            local_ledger_path=Path(
                os.getenv(
                    "FABRIC_LOCAL_LEDGER_PATH",
                    project_root / "backend" / "data" / "blockchain_ledger.json",
                )
            ).resolve(),
        )


class FabricService:
    def __init__(self, config: FabricConfig | None = None):
        self.config = config or FabricConfig.from_environment()

    def status(self) -> dict[str, Any]:
        if not self.config.enabled:
            return {"enabled": False, "available": False, "local_ledger": True, "reason": "FABRIC_ENABLED is false; using local development ledger"}
        if not self.config.gateway_command:
            return {"enabled": True, "available": False, "reason": "FABRIC_GATEWAY_COMMAND is not configured"}
        return {"enabled": True, "available": True, "channel": self.config.channel, "chaincode": self.config.chaincode}

    def local_create(self, record: dict[str, Any]) -> dict[str, Any]:
        records = self._read_local_records()
        if any(item.get("eventId") == record["eventId"] for item in records):
            raise ValueError(f"Duplicate disagreement record for eventId {record['eventId']}")
        record = {**record, "ledger": "local", "createdAt": datetime.now(timezone.utc).isoformat()}
        records.append(record)
        self._write_local_records(records)
        return record

    def local_list(self) -> list[dict[str, Any]]:
        return self._read_local_records()

    def local_get(self, event_id: str) -> dict[str, Any]:
        for record in self._read_local_records():
            if record.get("eventId") == event_id:
                return record
        raise KeyError(f"Disagreement {event_id} not found")

    def local_resolve(self, event_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        records = self._read_local_records()
        for record in records:
            if record.get("eventId") == event_id:
                if record.get("status") == "RESOLVED":
                    raise ValueError(f"Disagreement {event_id} is already resolved")
                record.update({
                    "status": "RESOLVED",
                    "analystDecision": payload["analystDecision"],
                    "analystId": payload["analystId"],
                    "resolutionReason": payload["resolutionReason"],
                    "resolvedAt": datetime.now(timezone.utc).isoformat(),
                })
                self._write_local_records(records)
                return record
        raise KeyError(f"Disagreement {event_id} not found")

    def local_history(self, event_id: str) -> list[str]:
        record = self.local_get(event_id)
        history = record.setdefault("history", [])
        return history

    def _read_local_records(self) -> list[dict[str, Any]]:
        path = self.config.local_ledger_path
        if not path.exists():
            return []
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return data if isinstance(data, list) else []
        except json.JSONDecodeError:
            return []

    def _write_local_records(self, records: list[dict[str, Any]]) -> None:
        path = self.config.local_ledger_path
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(".tmp")
        temporary.write_text(json.dumps(records, indent=2, sort_keys=True), encoding="utf-8")
        temporary.replace(path)

    def evaluate(self, function: str, args: list[str] | None = None) -> Any:
        return self._invoke("evaluate", function, args or [])

    def submit(self, function: str, args: list[str] | None = None) -> Any:
        return self._invoke("submit", function, args or [])

    def _invoke(self, operation: str, function: str, args: list[str]) -> Any:
        status = self.status()
        if not status["available"]:
            raise BlockchainUnavailable(status["reason"])

        request = {
            "operation": operation,
            "function": function,
            "args": args,
            "workspaceRoot": str(self.config.workspace_root),
        }
        try:
            completed = subprocess.run(
                self.config.gateway_command,
                input=json.dumps(request) + "\n",
                text=True,
                capture_output=True,
                timeout=self.config.timeout_seconds,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise BlockchainUnavailable(f"Fabric gateway invocation failed: {exc}") from exc

        output = completed.stdout.strip().splitlines()
        if completed.returncode != 0 or not output:
            detail = completed.stderr.strip() or "Fabric gateway returned no response"
            raise BlockchainUnavailable(detail)
        try:
            response = json.loads(output[-1])
        except json.JSONDecodeError as exc:
            raise BlockchainUnavailable("Fabric gateway returned invalid JSON") from exc
        if not response.get("ok"):
            raise BlockchainUnavailable(str(response.get("error", "Fabric transaction failed")))
        return response.get("result")
