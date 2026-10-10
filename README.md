# ThreatCast AI

### AI-Powered Early Warning for Network Threats

ThreatCast is an explainable cybersecurity intelligence platform that predicts whether a network state is likely to transition into an attack condition within a future warning horizon.

The production system uses a temporal LSTM trained on the CTU13 botnet dataset. Network traffic is converted into 30-second network states, represented using 12 engineered temporal features, and evaluated using a 5-state temporal window.

ThreatCast combines:

- Temporal deep learning
- Early-warning prediction
- SHAP-based explainability
- MITRE ATT&CK-oriented threat interpretation
- Neo4j graph-based data storage
- FastAPI backend services
- React cybersecurity dashboard
- Packet-level graph research
- GraphSAGE-style representation learning
- Temporal Transformer-based latent forecasting

---

## 1. System Overview

ThreatCast is designed around a simple production principle:

> **Observe network behavior → model temporal evolution → predict early warning → explain the prediction → present actionable intelligence.**

The production inference pipeline is:

```text
CTU13 Network Flows
        ↓
30-Second Network-State Aggregation
        ↓
12 Engineered Features
        ↓
5 × 30-Second Temporal Window
        ↓
CTU13 LSTM
        ↓
Early-Warning Probability
        ↓
8% Decision Threshold
        ↓
Normal / Early Warning
        ↓
SHAP Explanation
        ↓
FastAPI
        ↓
Neo4j
        ↓
React Dashboard
```

## Quickstart: New Device

ThreatCast runs locally and does not require external API keys. The first Docker
build downloads the Python ML packages, Node packages, and container images.
Later starts use Docker's cache.

### Prerequisites

Install these on the new device:

- Git
- Docker Desktop with WSL2 enabled on Windows, or Docker Engine with Compose
  on Linux/macOS
- At least 8 GB RAM available to Docker; 12 GB is recommended for TensorFlow,
  PyTorch, Neo4j, and the frontend build
- At least 10 GB free disk space for the first build

### Clone and Run Everything

From PowerShell, Terminal, or a shell:

```bash
git clone https://github.com/Satvik219/ThreatCast-AI.git
cd ThreatCast-AI
docker compose up -d --build
```

This starts the React frontend, FastAPI backend, Neo4j, and the Neo4j demo-data
initializer. The initializer imports CTU13 states, predictions, and warning
events; it can continue running briefly while the frontend and API are already
available.

Check the services:

```bash
docker compose ps
```

Open the application:

- Dashboard: <http://localhost:5173>
- API Swagger docs: <http://localhost:8000/docs>
- API health: <http://localhost:8000/api/health>
- Neo4j Browser: <http://localhost:7474>

Neo4j credentials for local development are `neo4j` and
`threatcast_demo_password`.

### Use the Application

1. Open <http://localhost:5173>.
2. Use **Upload Data** in the top-right header.
3. Select a `.pcap`, `.pcapng`, `.cap`, or CTU13-style `.csv` file.
4. Wait for analysis to finish.
5. Open Overview, Attack Forecast, Network Graph, Explainability, or
        Disagreements. The active uploaded file drives the supported views.
6. The graph is rendered as an interactive 3D topology for PCAP flow data.
7. The Disagreements page lists stored model-versus-rule evaluations and lets a
        human analyst mark them as `TRUE_POSITIVE` or `FALSE_POSITIVE` with a reason.

Short PCAP captures are padded to the five-state model window. CSV uploads must
contain the twelve CTU13 feature columns expected by the backend.

### Stop and Restart

Stop containers while keeping Neo4j and ledger data:

```bash
docker compose down
```

Start again without rebuilding:

```bash
docker compose up -d
```

Follow logs:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f neo4j-init
```

To remove containers and all local data volumes, including Neo4j and the
disagreement ledger, use this destructive command:

```bash
docker compose down -v
```

### Local Blockchain Ledger

The application includes a Fabric-compatible disagreement ledger API. By
default, Docker sets `FABRIC_ENABLED=false`. In this mode, disagreements are
stored in a persistent Docker volume and are available through:

```text
GET  /api/blockchain/status
POST /api/blockchain/evidence/verify
POST /api/blockchain/disagreements
GET  /api/blockchain/disagreements
GET  /api/blockchain/disagreements/{event_id}
GET  /api/blockchain/disagreements/{event_id}/history
POST /api/blockchain/disagreements/{event_id}/resolve
```

Check the current mode:

```bash
curl http://localhost:8000/api/blockchain/status
```

The expected default response indicates that Fabric is disabled and the local
ledger is enabled. This mode requires no extra blockchain installation and is
the recommended mode for a new device.

### Optional: Real Hyperledger Fabric

The repository also contains the Fabric chaincode and gateway source:

- `blockchain/chaincode/disagreement-ledger`
- `blockchain/gateway`
- `backend/blockchain`

The real Fabric peer/orderer network is not bundled in this repository. It
requires Hyperledger Fabric binaries, Docker images, a running peer/orderer
network, a `threatcast` channel, and the `disagreement-ledger` chaincode.

Build the included gateway and chaincode packages:

```bash
cd blockchain/gateway
npm install
npm run build

cd ../chaincode/disagreement-ledger
npm install
npm run build
```

After installing and starting a Fabric test network, deploy the chaincode to
the `threatcast` channel. Then configure the backend before starting Compose:

```powershell
$env:FABRIC_ENABLED = "true"
$env:FABRIC_GATEWAY_COMMAND = "node C:/absolute/path/to/ThreatCast-AI/blockchain/gateway/dist/cli.js"
$env:FABRIC_WORKSPACE_ROOT = "C:/absolute/path/to/fabric-workspace"
$env:FABRIC_CHANNEL = "threatcast"
$env:FABRIC_CHAINCODE = "disagreement-ledger"
docker compose up -d --build
```

Verify that the response now reports `enabled: true` and `available: true`:

```bash
curl http://localhost:8000/api/blockchain/status
```

If Fabric is unavailable, the backend fails closed and does not claim that a
blockchain transaction succeeded. See `blockchain/README.md` and
`backend/blockchain/README.md` for the complete ledger contract and gateway
details.

### Troubleshooting

**Port already in use**

Stop the process using port `5173`, `8000`, `7474`, or `7687`, or edit the
published ports in `docker-compose.yml`.

**Backend or frontend is not ready**

```bash
docker compose ps
docker compose logs --tail=100 backend frontend neo4j-init
```

**World-model checkpoint error**

The required trained artifacts are committed under
`world_model/checkpoints/ctu13_risk/`. Rebuild the backend image:

```bash
docker compose build backend
docker compose up -d --no-deps backend
```

**HTTP 502 after rebuilding the backend**

The frontend Nginx proxy uses Docker DNS. Restart the frontend if an older
container is still serving a stale backend address:

```bash
docker compose restart frontend
```
