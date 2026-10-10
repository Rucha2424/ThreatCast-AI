# ThreatCast Fabric Audit Ledger

This package integrates the optional Hyperledger Fabric disagreement ledger from the blockchain-only repository.

The API is disabled by default and fails closed when Fabric is unavailable. Enable it only when the Fabric gateway CLI is built and the local/network channel is running:

```env
FABRIC_ENABLED=true
FABRIC_GATEWAY_COMMAND=node /absolute/path/to/blockchain/gateway/dist/cli.js
FABRIC_WORKSPACE_ROOT=/absolute/path/to/blockchain
FABRIC_CHANNEL=threatcast
FABRIC_CHAINCODE=disagreement-ledger
FABRIC_SUBMIT_TIMEOUT_SECONDS=15
```

Endpoints:

- `GET /api/blockchain/status`
- `POST /api/blockchain/evidence/verify`
- `POST /api/blockchain/disagreements`
- `GET /api/blockchain/disagreements`
- `GET /api/blockchain/disagreements/{event_id}`
- `GET /api/blockchain/disagreements/{event_id}/history`
- `POST /api/blockchain/disagreements/{event_id}/resolve`

The create route hashes the supplied evidence with canonical JSON and SHA-256 before submitting the `PENDING_REVIEW` Fabric record. It never reports a ledger write when Fabric is disabled or unreachable.
