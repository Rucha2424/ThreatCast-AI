# ThreatCast Hyperledger Fabric Integration

This directory contains the Fabric disagreement ledger and gateway bridge integrated from the blockchain-only project.

## Packages

- `chaincode/disagreement-ledger`: TypeScript Fabric contract for immutable disagreement records.
- `gateway`: TypeScript JSON-lines CLI used by the FastAPI service.

## Build

```powershell
cd blockchain/gateway
npm install
npm run build

cd ../chaincode/disagreement-ledger
npm install
npm run build
```

## Enable the API

The FastAPI integration is disabled by default so the existing application works without Fabric. After starting a Fabric network and deploying `disagreement-ledger` to the `threatcast` channel, configure:

```env
FABRIC_ENABLED=true
FABRIC_GATEWAY_COMMAND=node C:/SIH/ThreatCast-AI/blockchain/gateway/dist/cli.js
FABRIC_WORKSPACE_ROOT=C:/path/to/fabric-workspace
FABRIC_CHANNEL=threatcast
FABRIC_CHAINCODE=disagreement-ledger
```

The backend exposes status, evidence verification, create/list/get/history, and resolve operations under `/api/blockchain`.
