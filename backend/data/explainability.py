from datetime import datetime, timezone
from backend.models.schemas import ExplainabilityResponse, SignalContribution
from backend.data.state import state_manager


def get_explainability(incident_id: str = "INC-8042") -> ExplainabilityResponse:
    now_str = state_manager.get_iso_timestamp()
    scenario = state_manager.get_active_scenario()

    if scenario == "exfiltration_crisis":
        predicted_stage = "Data Exfiltration (T+1)"
        observed_stage = "Collection & Staging (T_0)"
        confidence = 0.96
        reasoning = (
            "The model identified that 12.4 GB of structured customer database records were compressed into a hidden staging directory on Database-02, "
            "coinciding with elevated TLS connections to Gateway-01. Given that Database-02 has zero historical legitimate outbound internet connections, "
            "the temporal sequence strongly aligns (0.97) with automated data exfiltration pipelines."
        )
        signals = [
            SignalContribution(
                signal_name="Large File Compression & Staging Activity",
                category="File & Process Telemetry",
                weight=0.95,
                direction="supports_prediction",
                source_evidence="Process 7z.exe created 12.4GB archive in /var/tmp/.staging",
                metric_value="12.4 GB / 3.2 minutes",
            ),
            SignalContribution(
                signal_name="Outbound Perimeter Gateway Traffic Volume",
                category="Network Flow Telemetry",
                weight=0.92,
                direction="supports_prediction",
                source_evidence="Persistent TLS socket opened from DB subnet to external IP 198.51.100.42",
                metric_value="48.2 MB/min continuous egress",
            ),
            SignalContribution(
                signal_name="FastRP Graph Centrality & Route Proximity",
                category="Topological Graph Embedding",
                weight=0.88,
                direction="supports_prediction",
                source_evidence="Shortest path between DB-02 and Gateway-01 currently has active state routes",
                metric_value="Proximity Score: 0.94",
            ),
            SignalContribution(
                signal_name="Database Bulk Extraction Queries",
                category="Application Logs",
                weight=0.84,
                direction="supports_prediction",
                source_evidence="1.2M rows selected from table 'customers_pii' in un-indexed batch query",
                metric_value="1,240,000 records dumped",
            ),
            SignalContribution(
                signal_name="Temporal Sequence Alignment to Exfiltration Playbook",
                category="LSTM Temporal Sequence",
                weight=0.91,
                direction="supports_prediction",
                source_evidence="Sequence: Initial Foothold -> Recon -> Staging -> Exfil matches MITRE ATT&CK Group APT29 profile",
                metric_value="Sequence Correlation: 0.96",
            ),
        ]
    else:  # default or lateral movement
        predicted_stage = "Lateral Movement (T+1)"
        observed_stage = "Privilege Escalation (T_0)"
        confidence = 0.88
        reasoning = (
            "ThreatCast AI forecasted Lateral Movement from Endpoint-07 to Server-03 because: "
            "(1) User-014 enabled SeDebugPrivilege on Endpoint-07, "
            "(2) Graph FastRP embeddings place Server-03 within 1 topological hop over high-trust RPC/SMB channels, "
            "and (3) Temporal sequencing models observe that 92.4% of privilege escalations on domain workstations are followed by administrative share enumeration."
        )
        signals = [
            SignalContribution(
                signal_name="Privilege Escalation & Token Impersonation",
                category="Host Security Telemetry",
                weight=0.92,
                direction="supports_prediction",
                source_evidence="Process lsass.exe opened with PROCESS_ALL_ACCESS rights by elevated user token on Endpoint-07",
                metric_value="SeDebugPrivilege Active",
            ),
            SignalContribution(
                signal_name="FastRP Topological Graph Proximity",
                category="Graph Representation (FastRP)",
                weight=0.86,
                direction="supports_prediction",
                source_evidence="Neo4j FastRP vector similarity between Endpoint-07 and Domain Controller Server-03 is 0.89",
                metric_value="Cosine Distance: 0.11",
            ),
            SignalContribution(
                signal_name="Targeted RPC / SMB Port Probing",
                category="Network Flow Telemetry",
                weight=0.81,
                direction="supports_prediction",
                source_evidence="45 SYN packets targeted exclusively at ports 135/445 on Domain Controller IP 10.0.3.3",
                metric_value="45 SYNs / 2 seconds",
            ),
            SignalContribution(
                signal_name="Authentication Anomaly (Off-Hours Kerberos TGS)",
                category="Identity & Access Management",
                weight=0.74,
                direction="supports_prediction",
                source_evidence="RC4 cipher downgrade requested for MSSQL service ticket outside working hours",
                metric_value="Risk Score: 78/100",
            ),
            SignalContribution(
                signal_name="Temporal Sequence Alignment",
                category="Temporal AI Model (LSTM-B)",
                weight=0.85,
                direction="supports_prediction",
                source_evidence="Prior states: [Initial Access (T-2), Persistence (T-1), Privilege Escalation (T_0)] -> Next State: Lateral Movement",
                metric_value="Transition Probability: 88%",
            ),
        ]

    return ExplainabilityResponse(
        incident_id=incident_id,
        predicted_stage=predicted_stage,
        confidence=confidence,
        observed_stage=observed_stage,
        forecast_reasoning=reasoning,
        graph_proximity_score=0.89,
        temporal_sequence_alignment=0.92,
        fastrp_embedding_note="FastRP 128-dimensional topological node embeddings derived from 3-hop random walks on Neo4j identity & asset topology.",
        contributing_signals=signals,
        subgraph_nodes=["User-014", "Endpoint-07", "Server-03", "Database-02"],
        subgraph_edges=[
            "User-014 -[LOGGED_IN_TO]-> Endpoint-07",
            "Endpoint-07 -[ADMIN_PROBE_SMB]-> Server-03",
            "Server-03 -[SERVICE_LINK]-> Database-02",
        ],
        last_updated=now_str,
    )
