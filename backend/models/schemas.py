from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel, Field


# -----------------------------------------------------------------------------
# System & Health
# -----------------------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str = "healthy"
    engine: str = "online"
    version: str = "1.0.0"
    timestamp: str
    environment: str = "production-ready"


# -----------------------------------------------------------------------------
# Dashboard & KPIs
# -----------------------------------------------------------------------------
class TrendItem(BaseModel):
    direction: str = Field(..., description="'up', 'down', or 'neutral'")
    value: str


class KpiItem(BaseModel):
    id: str
    label: str
    value: Union[str, int, float]
    context: str
    trend: Optional[TrendItem] = None
    status: str = Field(..., description="'safe', 'warning', 'danger', or 'info'")


class DashboardKpis(BaseModel):
    cards: List[KpiItem]
    last_updated: str


class DashboardSummary(BaseModel):
    threat_level: str = Field(..., description="'LOW', 'MEDIUM', 'HIGH', or 'CRITICAL'")
    threat_score: int = Field(..., ge=0, le=100)
    current_stage: str
    current_stage_tactic: str
    next_predicted_stage: str
    next_predicted_tactic: str
    forecast_confidence: float = Field(..., ge=0.0, le=1.0)
    forecast_horizon: str
    recommended_action: str
    system_status: str
    active_threat_count: int
    high_risk_node_count: int
    disagreement_detected: bool
    disagreement_count: int
    last_updated: str
    active_scenario: str


# -----------------------------------------------------------------------------
# Security Events & Telemetry
# -----------------------------------------------------------------------------
class SecurityEvent(BaseModel):
    id: str
    timestamp: str
    source_ip: str
    source_entity: str
    destination_ip: str
    destination_entity: str
    event_type: str
    tactic: str
    technique_id: str
    risk_level: str = Field(..., description="'LOW', 'MEDIUM', 'HIGH', or 'CRITICAL'")
    status: str = Field(..., description="'Observed', 'Blocked', 'Flagged', 'Under Analysis'")
    details: str
    is_forecast_trigger: bool = False


class EventsResponse(BaseModel):
    total: int
    events: List[SecurityEvent]
    last_updated: str


# -----------------------------------------------------------------------------
# Network Topology & Risk Graph
# -----------------------------------------------------------------------------
class NetworkNode(BaseModel):
    id: str
    label: str
    type: str = Field(..., description="'user', 'endpoint', 'server', 'gateway', 'database'")
    ip: str
    risk_score: int = Field(..., ge=0, le=100)
    state: str = Field(..., description="'normal', 'suspicious', 'compromised', 'target'")
    department: str
    os: str
    observed_activity: str
    predicted_action: str
    active_connections: int
    is_in_attack_path: bool = False


class NetworkEdge(BaseModel):
    id: str
    source: str
    target: str
    protocol: str
    port: int
    traffic_volume: str
    is_attack_path: bool = False
    is_forecasted_path: bool = False
    status: str = Field(..., description="'active', 'blocked', 'forecasted', 'monitored'")


class NetworkGraphResponse(BaseModel):
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]
    attack_path_node_ids: List[str]
    forecasted_path_node_ids: List[str]
    high_risk_nodes_count: int
    last_updated: str


# -----------------------------------------------------------------------------
# Network Telemetry Activity Charts
# -----------------------------------------------------------------------------
class TrafficPoint(BaseModel):
    time: str
    bytes_in_mbps: float
    bytes_out_mbps: float
    anomalous_mbps: float


class AuthPoint(BaseModel):
    time: str
    successful_logins: int
    failed_logins: int
    privilege_escalations: int


class RiskPoint(BaseModel):
    time: str
    risk_score: int
    threat_events: int


class NetworkActivityResponse(BaseModel):
    traffic_series: List[TrafficPoint]
    auth_series: List[AuthPoint]
    risk_trend: List[RiskPoint]
    last_updated: str


# -----------------------------------------------------------------------------
# Attack Forecasting (K=3 Future States)
# -----------------------------------------------------------------------------
class ForecastStage(BaseModel):
    stage_id: str
    horizon: str = Field(..., description="'T_0', 'T+1', 'T+2', 'T+3'")
    stage_name: str
    tactic: str
    technique_id: str
    state_type: str = Field(..., description="'observed' or 'forecasted'")
    confidence: float = Field(..., ge=0.0, le=1.0)
    estimated_time_to_impact: str
    affected_nodes: List[str]
    recommended_mitigation: str
    description: str
    probability_distribution: Dict[str, float] = Field(default_factory=dict)


class ForecastResponse(BaseModel):
    current_state: ForecastStage
    future_stages: List[ForecastStage]
    summary_narrative: str
    model_used: str
    graph_context: str
    last_updated: str


# -----------------------------------------------------------------------------
# LSTM Model Comparison (Flat vs FastRP Graph)
# -----------------------------------------------------------------------------
class LSTMModelSummary(BaseModel):
    name: str
    feature_type: str
    architecture: str
    prediction: str
    confidence: float
    stability: str
    false_positive_rate: str
    latency_ms: float
    graph_awareness: str
    key_advantage: str


class ModelComparisonResponse(BaseModel):
    lstm_a: LSTMModelSummary
    lstm_b: LSTMModelSummary
    divergence_analysis: str
    advantage_note: str
    evaluation_benchmark: str
    last_updated: str


# -----------------------------------------------------------------------------
# Security Rules & Disagreements
# -----------------------------------------------------------------------------
class RuleItem(BaseModel):
    id: str
    name: str
    category: str
    pattern: str
    severity: str
    status: str
    triggers_last_24h: int


class RulesListResponse(BaseModel):
    total_rules: int
    rules: List[RuleItem]


class DisagreementItem(BaseModel):
    id: str
    timestamp: str
    model_prediction: str
    model_confidence: float
    model_architecture: str
    rule_name: str
    rule_output: str
    rule_severity: str
    status: str = Field(..., description="'Disagreement' or 'Agreement'")
    why_it_matters: str
    observed_signals: List[str]
    network_context: str
    recommended_action: str
    target_node: str


class DisagreementResponse(BaseModel):
    total_disagreements: int
    disagreements: List[DisagreementItem]
    analytical_summary: str
    last_updated: str


# -----------------------------------------------------------------------------
# Incidents Management
# -----------------------------------------------------------------------------
class IncidentTimelineItem(BaseModel):
    time: str
    title: str
    description: str
    type: str = Field(..., description="'observed', 'forecasted', 'rule_alert', 'action_taken'")


class IncidentItem(BaseModel):
    id: str
    title: str
    detected_at: str
    current_stage: str
    predicted_progression: str
    affected_assets: List[str]
    risk_level: str = Field(..., description="'LOW', 'MEDIUM', 'HIGH', or 'CRITICAL'")
    risk_score: int
    status: str = Field(..., description="'Forecasted', 'Investigating', 'Contained', 'Resolved'")
    model_confidence: float
    rule_result: str
    has_disagreement: bool
    recommended_action: str
    timeline: List[IncidentTimelineItem]
    containment_playbook: List[str]


class IncidentListResponse(BaseModel):
    total: int
    incidents: List[IncidentItem]
    last_updated: str


class IncidentDetailResponse(BaseModel):
    incident: IncidentItem


# -----------------------------------------------------------------------------
# Explainability
# -----------------------------------------------------------------------------
class SignalContribution(BaseModel):
    signal_name: str
    category: str
    weight: float = Field(..., ge=0.0, le=1.0)
    direction: str = Field(..., description="'supports_prediction', 'neutral', 'mitigating'")
    source_evidence: str
    metric_value: str


class ExplainabilityResponse(BaseModel):
    incident_id: str
    predicted_stage: str
    confidence: float
    observed_stage: str
    forecast_reasoning: str
    graph_proximity_score: float
    temporal_sequence_alignment: float
    fastrp_embedding_note: str
    contributing_signals: List[SignalContribution]
    subgraph_nodes: List[str]
    subgraph_edges: List[str]
    last_updated: str


# -----------------------------------------------------------------------------
# Demo Attack Simulator
# -----------------------------------------------------------------------------
class SimulateAttackRequest(BaseModel):
    scenario: str = Field(
        "lateral_movement_wave",
        description="Scenarios: 'lateral_movement_wave', 'exfiltration_crisis', 'ransomware_staging', 'default'"
    )


class SimulationResponse(BaseModel):
    status: str = "success"
    message: str
    active_scenario: str
    threat_level: str
    current_stage: str
    forecast_horizon: str
    last_updated: str
