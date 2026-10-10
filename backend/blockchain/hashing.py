"""Deterministic evidence canonicalization shared by API and Fabric records."""

from __future__ import annotations

import hashlib
import json
from typing import Any


CANONICALIZATION_VERSION = "v1"
HASH_ALGORITHM = "SHA-256"


def canonicalize_evidence(evidence: Any) -> str:
    """Return the stable JSON representation used for evidence hashing."""
    return json.dumps(
        evidence,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )


def sha256_evidence(evidence: Any) -> str:
    return hashlib.sha256(
        canonicalize_evidence(evidence).encode("utf-8")
    ).hexdigest()
