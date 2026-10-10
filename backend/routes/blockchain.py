from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.blockchain.hashing import (
    CANONICALIZATION_VERSION,
    HASH_ALGORITHM,
    sha256_evidence,
)
from backend.blockchain.service import BlockchainUnavailable, FabricService


router = APIRouter(prefix="/api/blockchain", tags=["Blockchain Audit Ledger"])
service = FabricService()


class CreateDisagreementRequest(BaseModel):
    event_id: str | None = None
    occurred_at: str | None = None
    network_state_id: str
    prediction_id: str
    ai_label: str
    ai_confidence: float = Field(ge=0, le=1)
    ai_threshold: float = Field(ge=0, le=1)
    rule_id: str
    rule_output: str
    rule_severity: str
    disagreement_type: str
    severity: str
    evidence: dict[str, Any]


class ResolveDisagreementRequest(BaseModel):
    analyst_decision: str
    analyst_id: str
    resolution_reason: str


class VerifyEvidenceRequest(BaseModel):
    evidence: dict[str, Any]
    evidence_hash: str


def _fabric_error(error: BlockchainUnavailable) -> HTTPException:
    return HTTPException(status_code=503, detail=f"Blockchain unavailable: {error}")


def _record_from_request(request: CreateDisagreementRequest) -> dict[str, Any]:
    return {
        "eventId": request.event_id or f"evt-{uuid4().hex}",
        "occurredAt": request.occurred_at or datetime.now(timezone.utc).isoformat(),
        "networkStateId": request.network_state_id,
        "predictionId": request.prediction_id,
        "aiLabel": request.ai_label,
        "aiConfidence": request.ai_confidence,
        "aiThreshold": request.ai_threshold,
        "ruleId": request.rule_id,
        "ruleOutput": request.rule_output,
        "ruleSeverity": request.rule_severity,
        "disagreementType": request.disagreement_type,
        "severity": request.severity,
        "evidenceHash": sha256_evidence(request.evidence),
        "evidenceHashAlgorithm": HASH_ALGORITHM,
        "evidenceCanonicalizationVersion": CANONICALIZATION_VERSION,
        "status": "PENDING_REVIEW",
    }


@router.get("/status")
def blockchain_status():
    return service.status()


@router.post("/evidence/verify")
def verify_evidence(request: VerifyEvidenceRequest):
    actual_hash = sha256_evidence(request.evidence)
    return {
        "valid": actual_hash.lower() == request.evidence_hash.lower(),
        "evidence_hash": actual_hash,
        "hash_algorithm": HASH_ALGORITHM,
        "canonicalization_version": CANONICALIZATION_VERSION,
    }


@router.post("/disagreements")
def create_disagreement(request: CreateDisagreementRequest):
    record = _record_from_request(request)
    if not service.config.enabled:
        return {"record": service.local_create(record), "evidence_hash": record["evidenceHash"], "ledger": "local"}
    try:
        result = service.submit("createDisagreement", [json.dumps(record, sort_keys=True)])
    except BlockchainUnavailable as error:
        raise _fabric_error(error) from error
    return {"record": result or record, "evidence_hash": record["evidenceHash"]}


@router.get("/disagreements")
def list_disagreements():
    if not service.config.enabled:
        return service.local_list()
    try:
        return service.evaluate("listDisagreements")
    except BlockchainUnavailable as error:
        raise _fabric_error(error) from error


@router.get("/disagreements/{event_id}")
def get_disagreement(event_id: str):
    if not service.config.enabled:
        try:
            return service.local_get(event_id)
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
    try:
        return service.evaluate("getDisagreement", [event_id])
    except BlockchainUnavailable as error:
        raise _fabric_error(error) from error


@router.get("/disagreements/{event_id}/history")
def get_disagreement_history(event_id: str):
    if not service.config.enabled:
        try:
            return service.local_history(event_id)
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
    try:
        return service.evaluate("getDisagreementHistory", [event_id])
    except BlockchainUnavailable as error:
        raise _fabric_error(error) from error


@router.post("/disagreements/{event_id}/resolve")
def resolve_disagreement(event_id: str, request: ResolveDisagreementRequest):
    payload = {
        "eventId": event_id,
        "analystDecision": request.analyst_decision,
        "analystId": request.analyst_id,
        "resolutionReason": request.resolution_reason,
    }
    if not service.config.enabled:
        try:
            return service.local_resolve(event_id, payload)
        except KeyError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
    try:
        return service.submit("resolveDisagreement", [json.dumps(payload, sort_keys=True)])
    except BlockchainUnavailable as error:
        raise _fabric_error(error) from error
