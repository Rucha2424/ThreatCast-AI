import os
from datetime import datetime, timezone

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.models.schemas import HealthResponse

from backend.routes.dashboard import router as dashboard_router
from backend.routes.network import router as network_router
from backend.routes.forecast import router as forecast_router
from backend.routes.events import router as events_router
from backend.routes.rules import router as rules_router
from backend.routes.disagreements import router as disagreements_router
from backend.routes.incidents import router as incidents_router
from backend.routes.explainability import router as explainability_router
from backend.routes.demo import router as demo_router
from backend.routes.database import router as database_router
from backend.routes.world_model import router as world_model_router
from backend.routes.blockchain import router as blockchain_router


# ============================================================
# THREATCAST AI — FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="ThreatCast AI — Network Attack Forecasting & Early Warning Platform",
    description=(
        "AI-based Network Attack Forecasting and Early Warning Platform "
        "with CTU13 LSTM inference and Neo4j persistence."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


# ============================================================
# CORS CONFIGURATION
# ============================================================

raw_origins = os.getenv(
    "CORS_ALLOWED_ORIGINS",
    (
        "http://localhost:5173,"
        "http://localhost:3000,"
        "http://127.0.0.1:5173,"
        "http://127.0.0.1:3000,"
        "http://localhost:4173"
    ),
)

origins = [
    origin.strip()
    for origin in raw_origins.split(",")
    if origin.strip()
]

# Hackathon/local-development compatibility.
if "*" not in origins:
    origins.append("*")


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/", tags=["System"])
def root_info():
    return {
        "product": "THREATCAST AI",
        "tagline": "Predict the Attack. Stop It Before It Progresses.",
        "description": (
            "AI-based Network Attack Forecasting "
            "and Early Warning Platform"
        ),
        "docs": "/docs",
        "health": "/api/health",
        "database_status": "/api/database/status",
        "database_counts": "/api/database/counts",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get(
    "/api/health",
    response_model=HealthResponse,
    tags=["System"],
)
def health_check():
    return HealthResponse(
        status="healthy",
        engine="online",
        version="1.0.0",
        timestamp=datetime.now(timezone.utc).isoformat(),
        environment=os.getenv(
            "ENVIRONMENT",
            "development",
        ),
    )


# ============================================================
# FEATURE ROUTERS
# ============================================================

app.include_router(dashboard_router)
app.include_router(network_router)
app.include_router(forecast_router)
app.include_router(events_router)
app.include_router(rules_router)
app.include_router(disagreements_router)
app.include_router(incidents_router)
app.include_router(explainability_router)
app.include_router(demo_router)
app.include_router(world_model_router)
app.include_router(blockchain_router)

# Neo4j database routes
app.include_router(database_router)


# ============================================================
# APPLICATION ENTRY POINT
# ============================================================

if __name__ == "__main__":

    port = int(
        os.getenv("PORT", "8000")
    )

    host = os.getenv(
        "HOST",
        "0.0.0.0",
    )

    print(
        f"Starting ThreatCast AI Backend "
        f"on http://{host}:{port}"
    )

    uvicorn.run(
        "backend.main:app",
        host=host,
        port=port,
        reload=True,
    )