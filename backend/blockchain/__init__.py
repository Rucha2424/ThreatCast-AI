"""Optional Hyperledger Fabric integration for ThreatCast evidence records."""

from .hashing import canonicalize_evidence, sha256_evidence
from .service import BlockchainUnavailable, FabricService

__all__ = [
    "BlockchainUnavailable",
    "FabricService",
    "canonicalize_evidence",
    "sha256_evidence",
]
