# THREATCAST AI — Network Attack Forecasting & Early Warning Platform

> **"Predict the Attack. Stop It Before It Progresses."**  
> *Enterprise AI-Powered Predictive SOC Platform for Smart India Hackathon*

---

## 1. Product Overview & Identity

**ThreatCast AI** is an AI-based Network Attack Forecasting and Early Warning SOC platform.

Traditional Intrusion Detection Systems (IDS) are fundamentally **reactive**:
$$\text{Traffic} \longrightarrow \text{Classification} \longrightarrow \text{Alert}$$
By the time an alert fires, the adversary has already completed credential theft or data exfiltration.

**ThreatCast AI shifts cybersecurity to proactive future-state attack forecasting**:
$$\text{Network State} \longrightarrow \text{Topological Graph (FastRP)} \longrightarrow \text{K=3 State Forecast (T+1, T+2, T+3)} \longrightarrow \text{Model-Rule Verification} \longrightarrow \text{Early Warning}$$

```
    OBSERVE
       ↓
UNDERSTAND NETWORK STATE
       ↓
IDENTIFY ATTACK PROGRESSION
       ↓
FORECAST FUTURE STATES (T+1, T+2, T+3)
       ↓
VALIDATE WITH SECURITY RULES
       ↓
ANALYZE MODEL / RULE DISAGREEMENT
       ↓
EARLY WARNING TRIGGER
       ↓
PROACTIVE DEFENCE PLAYBOOK
```

---

## 2. Architecture & Replaceable Data Provider Layer

### The Zero-Hardcoding Frontend Architecture
The React frontend **never hardcodes cybersecurity metrics, node topologies, or attack stages inside JSX components**. All telemetry, confidence decay curves, graph representations, and model-rule disagreement signals originate from the FastAPI backend via strict Pydantic schemas.

```mermaid
graph TD
    subgraph Data Layer & Models (Conceptual AI Pipeline)
        DS[Cybersecurity Datasets: LANL / CTU-13 / DAPT2020] --> FE[Feature Extraction & Normalization]
        FE --> ATT[MITRE ATT&CK Tactic Mapping]
        ATT --> NGS[Network Graph State: Neo4j + FastRP Embeddings]
        NGS --> LSTM_B[LSTM-B: Temporal Graph FastRP Models]
        FE --> LSTM_A[LSTM-A: Flat / Windowed Feature Models]
        LSTM_B --> K3[K=3 Future-State Forecast: T+1, T+2, T+3]
        LSTM_A --> K3
        FE --> RULES[Deterministic Security Rules: Port Scan, SYN Flood, Brute Force]
        K3 --> COMP[Model vs. Rule Comparison Engine]
        RULES --> COMP
        COMP --> DIS[Disagreement Analysis Layer]
        DIS --> EW[Early Warning Generator]
    end

    subgraph FastAPI Backend (Pluggable Provider Architecture)
        EW --> DATA_PROV[Replaceable Data Provider Layer]
        K3 --> DATA_PROV
        COMP --> DATA_PROV
        DATA_PROV --> ROUTES[FastAPI Route Controllers]
        ROUTES --> SCHEMAS[Pydantic Validation Schemas]
        SCHEMAS --> REST[REST API / JSON Endpoints]
        SIM[Stateful Demo Attack Simulator Engine] --> DATA_PROV
    end

    subgraph React Frontend (Enterprise SOC UI)
        REST --> API_SVC[Centralized Axios Client: src/services/api.js]
        API_SVC --> HOOKS[Custom React Data Hooks: useDashboard, useForecast, etc.]
        HOOKS --> STATE[UI State / Loading / Error / Filter Management]
        STATE --> PAGES[7 Enterprise SOC Pages + Interactive Network Graph & Forecast Timeline]
    end
```

---

## 3. Technology Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS 3, React Router 6, Recharts 2, Lucide React, Axios.
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, Uvicorn, REST API contract.
- **Graph & Embeddings (Conceptual ML)**: Neo4j Graph DB, FastRP (Random Projection) Embeddings, Bidirectional LSTMs.

---

## 4. Complete REST API Contract

All endpoints conform to strict Pydantic models in `backend/models/schemas.py`:

| Endpoint | Method | Response Model | Description |
|---|---|---|---|
| `/api/health` | `GET` | `HealthResponse` | System health, engine status, and runtime timestamp |
| `/api/dashboard/summary` | `GET` | `DashboardSummary` | Threat level, current stage, predicted next stage, confidence, recommended action |
| `/api/dashboard/kpis` | `GET` | `DashboardKpis` | 5 KPI metrics (Active Threats, Forecasted Events, High-Risk Nodes, Confidence, Disagreements) |
| `/api/events` | `GET` | `EventsResponse` | Telemetry event stream mapped to MITRE ATT&CK tactics and techniques |
| `/api/network/graph` | `GET` | `NetworkGraphResponse` | Network nodes (Users, Endpoints, Servers, Gateways, DBs) and active attack path edges |
| `/api/network/activity` | `GET` | `NetworkActivityResponse` | Bandwidth telemetry, authentication spikes, and temporal risk score trends |
| `/api/forecast` | `GET` | `ForecastResponse` | Current observed state ($T_0$) + $K=3$ future states ($T+1, T+2, T+3$), probabilities, and mitigations |
| `/api/forecast/comparison` | `GET` | `ModelComparisonResponse` | LSTM-A (Flat Features) vs. LSTM-B (Graph FastRP Features) architectural benchmark matrix |
| `/api/rules` | `GET` | `RulesListResponse` | Deterministic signature rules & active trigger rates |
| `/api/disagreements` | `GET` | `DisagreementResponse` | Signal divergence intelligence between deep graph models and deterministic rules |
| `/api/incidents` | `GET` | `IncidentListResponse` | Filterable incident lifecycle tracking (`Forecasted`, `Investigating`, `Contained`, `Resolved`) |
| `/api/incidents/{incident_id}` | `GET` | `IncidentDetailResponse` | Forensic timeline, affected assets, and automated containment playbook |
| `/api/explainability/{incident_id}`| `GET` | `ExplainabilityResponse`| Signal attribution weights, FastRP graph proximity score, and diagnostic reasoning |
| `/api/demo/simulate-attack` | `POST` | `SimulationResponse` | Mutates backend state across live attack scenarios (`lateral_movement_wave`, `exfiltration_crisis`, `ransomware_staging`, `default`) |
| `/api/demo/reset` | `POST` | `SimulationResponse` | Resets pipeline state back to baseline |

---

## 5. Platform Page Structure

1. **Overview (`/`)**: Executive dashboard answering the 7 fundamental SOC questions in 5 seconds.
2. **Live Network (`/live-network`)**: Real-time ingress/egress bandwidth area charts, authentication stacked bars, and live telemetry log.
3. **Attack Forecast (`/forecast`)**: Flagship $K=3$ future-state cards ($T+1, T+2, T+3$), forecast confidence decay curves, and LSTM-A vs. LSTM-B matrix.
4. **Network Graph (`/network-graph`)**: Interactive SVG topological visualizer with animated attack vectors and slide-over entity inspection drawer.
5. **Disagreements (`/disagreements`)**: Analysis of why AI graph models and deterministic rules diverge when detecting evasive threats.
6. **Incidents (`/incidents`)**: Enterprise incident lifecycle management with forensic timelines and automated playbooks.
7. **Explainability (`/explainability`)**: Feature attribution weights, 3-hop FastRP subgraph neighborhood context, and natural language reasoning.
8. **Login Gateway (`/login`)**: Enterprise authentication gateway with pre-filled credentials.

---

## 6. Local Quickstart Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Launch FastAPI Backend
```bash
# In project root:
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
*API interactive Swagger docs will be live at: [http://localhost:8000/docs](http://localhost:8000/docs)*

### 2. Launch Vite React Frontend
```bash
# In frontend directory:
cd frontend
npm install
npm run dev
```
*Frontend dashboard will be live at: [http://localhost:5173](http://localhost:5173)*

### 3. One-Click Windows Launch
Double-click `start_all.bat` in the project root to start both backend and frontend automatically.

---

## 7. Interactive Demo Attack Simulation

During hackathon presentations, click the **"Simulate Attack"** button in the top navigation bar to test live scenario changes:

1. **Default Baseline**: Privilege escalation detected on SecOps workstation; $T+1$ forecast predicts lateral movement.
2. **Active Lateral Movement Wave**: Compromised endpoint actively traverses domain controller; threat level elevates to `CRITICAL` (94/100).
3. **Imminent Data Exfiltration Crisis**: 12.4GB customer DB archive staged; forecast predicts external egress in $<4$ minutes.
4. **Ransomware Staging**: Shadow copy destruction and mass encryption staging.

---

## 8. Replacing Prototype Data with Live ML Pipeline

To connect a live trained ML model (PyTorch, Neo4j, FastRP) in the future:
1. Only modify files inside `backend/data/` (e.g. `forecasts.py`, `network.py`, `dashboard.py`) to query your live Neo4j driver and PyTorch inference server.
2. Ensure the returned dictionaries conform to `backend/models/schemas.py`.
3. **Zero changes are required in the React frontend**, because the API contract remains identical.

---

## 9. Production Deployment

### Frontend (Vercel)
1. Set Root Directory to `frontend`.
2. Build Command: `npm run build`.
3. Output Directory: `dist`.
4. Environment Variable: `VITE_API_URL=https://your-fastapi-backend.onrender.com`.

### Backend (Render / Railway)
1. Build Command: `pip install -r backend/requirements.txt`.
2. Start Command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`.
3. Environment Variables:
   - `CORS_ALLOWED_ORIGINS=https://your-vercel-frontend.vercel.app`
   - `ENVIRONMENT=production`
