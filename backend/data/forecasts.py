from datetime import datetime, timezone
from backend.models.schemas import (
    ForecastResponse, ForecastStage, ModelComparisonResponse, LSTMModelSummary
)
from backend.data.state import state_manager


def get_forecast() -> ForecastResponse:
    scenario = state_manager.get_active_scenario()
    now_str = state_manager.get_iso_timestamp()

    if scenario == "lateral_movement_wave":
        current_state = ForecastStage(
            stage_id="stage-obs-1",
            horizon="T_0",
            stage_name="Lateral Movement Active",
            tactic="TA0008 - Lateral Movement",
            technique_id="T1021.002 (SMB/Windows Admin Shares)",
            state_type="observed",
            confidence=1.0,
            estimated_time_to_impact="Current Active State",
            affected_nodes=["Endpoint-07 (10.0.2.7)", "Server-03 (10.0.3.3)"],
            recommended_mitigation="Isolate Endpoint-07 immediately and drop active SMB sessions on Server-03.",
            description="Compromised workstation Endpoint-07 opened unauthorized RPC handles to Server-03 domain controller.",
            probability_distribution={"Lateral Movement": 1.0},
        )
        future_stages = [
            ForecastStage(
                stage_id="stage-f-1",
                horizon="T+1",
                stage_name="Credential Dumping & Kerberoasting",
                tactic="TA0006 - Credential Access",
                technique_id="T1003.001 (LSASS Memory Extraction)",
                state_type="forecasted",
                confidence=0.93,
                estimated_time_to_impact="T + 8 minutes",
                affected_nodes=["Server-03 (10.0.3.3)", "Database-02 (10.0.4.2)"],
                recommended_mitigation="Enable Credential Guard on Server-03; rotate Kerberos krbtgt account credentials.",
                description="FastRP graph proximity indicates high risk of LSASS injection on Server-03 to harvest domain credentials.",
                probability_distribution={
                    "Credential Access": 0.93,
                    "Discovery": 0.05,
                    "Persistence": 0.02,
                },
            ),
            ForecastStage(
                stage_id="stage-f-2",
                horizon="T+2",
                stage_name="Target Database Access & Staging",
                tactic="TA0009 - Collection",
                technique_id="T1074.001 (Local Data Staging)",
                state_type="forecasted",
                confidence=0.89,
                estimated_time_to_impact="T + 18 minutes",
                affected_nodes=["Database-02 (10.0.4.2)"],
                recommended_mitigation="Enforce query rate limiting and read-only mode on sensitive production customer tables.",
                description="Harvested credentials will be utilized to execute batch queries dumping customer tables into encrypted staging containers.",
                probability_distribution={
                    "Collection": 0.89,
                    "Defense Evasion": 0.08,
                    "Command & Control": 0.03,
                },
            ),
            ForecastStage(
                stage_id="stage-f-3",
                horizon="T+3",
                stage_name="Encrypted Egress via DNS Tunneling",
                tactic="TA0010 - Exfiltration",
                technique_id="T1048.003 (Exfiltration Over Unencrypted/DNS Tunnel)",
                state_type="forecasted",
                confidence=0.85,
                estimated_time_to_impact="T + 30 minutes",
                affected_nodes=["Gateway-01 (10.0.0.1)", "External C2 (198.51.100.42)"],
                recommended_mitigation="Apply strict DNS response rate limiting (RRL) and sinkhole outbound queries for high-entropy domains.",
                description="Staged data exfiltration across the perimeter gateway disguised as recurring DNS TXT queries.",
                probability_distribution={
                    "Exfiltration": 0.85,
                    "Impact": 0.10,
                    "Persistence": 0.05,
                },
            ),
        ]
        narrative = "Critical attack progression in progress. The adversary has achieved initial foothold and is currently executing lateral propagation toward Server-03. FastRP graph embeddings predict imminent LSASS memory dumping within 8 minutes followed by customer database staging."
        graph_context = "Subnet 10.0.3.0/24 (Domain Core) is under acute topological threat from infected node Endpoint-07."

    elif scenario == "exfiltration_crisis":
        current_state = ForecastStage(
            stage_id="stage-obs-1",
            horizon="T_0",
            stage_name="Data Collection & Staging",
            tactic="TA0009 - Collection",
            technique_id="T1560.001 (Archive via 7-Zip Utility)",
            state_type="observed",
            confidence=1.0,
            estimated_time_to_impact="Current Active State",
            affected_nodes=["Database-02 (10.0.4.2)", "Server-03 (10.0.3.3)"],
            recommended_mitigation="Freeze write/read IO on Database-02 storage volume; terminate active DB sessions.",
            description="12.4 GB of customer financial and PII tables compressed into hidden directory /var/tmp/.staging.",
            probability_distribution={"Collection": 1.0},
        )
        future_stages = [
            ForecastStage(
                stage_id="stage-f-1",
                horizon="T+1",
                stage_name="Data Exfiltration via Encrypted TLS Channel",
                tactic="TA0010 - Exfiltration",
                technique_id="T1041 (Exfiltration Over C2 Channel)",
                state_type="forecasted",
                confidence=0.96,
                estimated_time_to_impact="T + 4 minutes",
                affected_nodes=["Gateway-01 (10.0.0.1)", "External S3 Bucket (198.51.100.42)"],
                recommended_mitigation="Block outbound TLS connections from Database-02 and Server-03 to unwhitelisted public IP ranges.",
                description="LSTM-B predicts immediate transmission of compressed payload across Gateway-01 within 4 minutes.",
                probability_distribution={
                    "Exfiltration": 0.96,
                    "Impact": 0.04,
                },
            ),
            ForecastStage(
                stage_id="stage-f-2",
                horizon="T+2",
                stage_name="Anti-Forensics & Log Erasure",
                tactic="TA0005 - Defense Evasion",
                technique_id="T1070.001 (Clear Windows Event Logs / bash_history)",
                state_type="forecasted",
                confidence=0.91,
                estimated_time_to_impact="T + 10 minutes",
                affected_nodes=["Server-03 (10.0.3.3)", "Endpoint-07 (10.0.2.7)"],
                recommended_mitigation="Trigger out-of-band SIEM snapshot of security event logs; lock syslog ingestion forwarding.",
                description="To cover tracks post-exfiltration, attacker will execute wevtutil cl Security and shred bash logs.",
                probability_distribution={
                    "Defense Evasion": 0.91,
                    "Persistence": 0.09,
                },
            ),
            ForecastStage(
                stage_id="stage-f-3",
                horizon="T+3",
                stage_name="Impact / Extortion Note Deployment",
                tactic="TA0040 - Impact",
                technique_id="T1486 (Data Encrypted for Impact)",
                state_type="forecasted",
                confidence=0.84,
                estimated_time_to_impact="T + 20 minutes",
                affected_nodes=["Database-02 (10.0.4.2)", "Server-03 (10.0.3.3)"],
                recommended_mitigation="Take emergency immutable database snapshots; notify Incident Commander.",
                description="Secondary ransomware module deployment to leave extortion notes across compromised hosts.",
                probability_distribution={
                    "Impact": 0.84,
                    "Command & Control": 0.16,
                },
            ),
        ]
        narrative = "Severe data exfiltration crisis. High-value data is already compressed in staging. Proactive defense window is under 4 minutes before external egress commences."
        graph_context = "Adversary controls Database-02 and is bridging communication directly to Gateway-01."

    else:  # default scenario
        current_state = ForecastStage(
            stage_id="stage-obs-1",
            horizon="T_0",
            stage_name="Privilege Escalation",
            tactic="TA0004 - Privilege Escalation",
            technique_id="T1134.001 (Token Impersonation / SeDebugPrivilege)",
            state_type="observed",
            confidence=1.0,
            estimated_time_to_impact="Current Active State",
            affected_nodes=["User-014 (SecOps)", "Endpoint-07 (10.0.2.7)"],
            recommended_mitigation="Isolate Endpoint-07 host network adapter; revoke Kerberos TGT ticket for User-014.",
            description="Process token manipulation detected on Endpoint-07 workstation elevating User-014 context to SYSTEM.",
            probability_distribution={"Privilege Escalation": 1.0},
        )
        future_stages = [
            ForecastStage(
                stage_id="stage-f-1",
                horizon="T+1",
                stage_name="Lateral Movement",
                tactic="TA0008 - Lateral Movement",
                technique_id="T1021.002 (SMB/RPC Cross-Subnet Propagation)",
                state_type="forecasted",
                confidence=0.88,
                estimated_time_to_impact="T + 12 minutes",
                affected_nodes=["Endpoint-07 (10.0.2.7)", "Server-03 (10.0.3.3)"],
                recommended_mitigation="Block port 445 SMB routing between SecOps floor and Infrastructure server subnets.",
                description="LSTM-B predicts that elevated credentials will be used to establish authenticated RPC/SMB sessions onto Server-03 within 12 minutes.",
                probability_distribution={
                    "Lateral Movement": 0.88,
                    "Discovery": 0.08,
                    "Persistence": 0.04,
                },
            ),
            ForecastStage(
                stage_id="stage-f-2",
                horizon="T+2",
                stage_name="Credential Access",
                tactic="TA0006 - Credential Access",
                technique_id="T1003 (OS Credential Dumping)",
                state_type="forecasted",
                confidence=0.82,
                estimated_time_to_impact="T + 25 minutes",
                affected_nodes=["Server-03 (10.0.3.3)", "Database-02 (10.0.4.2)"],
                recommended_mitigation="Enforce Protected Users security group restrictions and enable LSA protection.",
                description="Targeting domain administrator cached credentials to unlock high-security database clusters.",
                probability_distribution={
                    "Credential Access": 0.82,
                    "Defense Evasion": 0.12,
                    "Collection": 0.06,
                },
            ),
            ForecastStage(
                stage_id="stage-f-3",
                horizon="T+3",
                stage_name="Data Exfiltration",
                tactic="TA0010 - Exfiltration",
                technique_id="T1048 (Alternative Protocol Egress)",
                state_type="forecasted",
                confidence=0.76,
                estimated_time_to_impact="T + 40 minutes",
                affected_nodes=["Gateway-01 (10.0.0.1)", "External C2"],
                recommended_mitigation="Pre-emptively restrict outbound file transfers exceeding 10MB to unknown external endpoints.",
                description="Adversary objective is exfiltration of database credentials and customer records through the perimeter gateway.",
                probability_distribution={
                    "Exfiltration": 0.76,
                    "Impact": 0.16,
                    "Persistence": 0.08,
                },
            ),
        ]
        narrative = "Adversary achieved Privilege Escalation on Endpoint-07. ThreatCast AI's temporal graph model forecasts a K=3 trajectory: Lateral Movement to Server-03 (88% in 12m), followed by Credential Access (82% in 25m), culminating in Data Exfiltration (76% in 40m)."
        graph_context = "High graph centrality of Endpoint-07 creates a direct shortest-path traversal vector to Domain Controller Server-03."

    return ForecastResponse(
        current_state=current_state,
        future_stages=future_stages,
        summary_narrative=narrative,
        model_used="LSTM-B (Graph FastRP Temporal Model)",
        graph_context=graph_context,
        last_updated=now_str,
    )


def get_forecast_comparison() -> ModelComparisonResponse:
    now_str = state_manager.get_iso_timestamp()

    lstm_a = LSTMModelSummary(
        name="LSTM-A (Baseline)",
        feature_type="Flat / Windowed Statistical Features",
        architecture="2-Layer Bidirectional LSTM (Hidden Size: 128)",
        prediction="Lateral Movement (Isolated)",
        confidence=0.74,
        stability="Moderate (Fluctuates with noise)",
        false_positive_rate="8.4%",
        latency_ms=12.5,
        graph_awareness="None (Treats events as independent time series)",
        key_advantage="Fast computational throughput on raw flow records.",
    )

    lstm_b = LSTMModelSummary(
        name="LSTM-B (ThreatCast AI Innovation)",
        feature_type="Graph FastRP Embeddings + Temporal Windows",
        architecture="Graph-Augmented LSTM (FastRP 128-dim + LSTM 256)",
        prediction="Multi-Stage Progression: Lateral Movement -> Credential Access -> Exfiltration",
        confidence=0.89,
        stability="High (Grounded in topological network structure)",
        false_positive_rate="2.1%",
        latency_ms=18.2,
        graph_awareness="Full (Encodes 14-hop graph neighborhood & node centrality)",
        key_advantage="Anticipates multi-step attacker paths by understanding asset relationships before lateral hops occur.",
    )

    divergence = (
        "While baseline LSTM-A only observes isolated frequency spikes in port 445 traffic and predicts a generic connection anomaly (74% confidence), "
        "ThreatCast AI's LSTM-B incorporates Neo4j FastRP topological embeddings. It recognizes that User-014 and Endpoint-07 share a direct administrative path "
        "to Domain Controller Server-03, boosting forecast confidence to 89% and forecasting a 3-step progression (T+1 Lateral Movement -> T+2 Credential Dumping -> T+3 Exfiltration)."
    )

    advantage = (
        "Graph FastRP embeddings reduce false positives by 75% compared to flat statistical models because structural network context prevents benign maintenance scripts "
        "from being misclassified as lateral movement."
    )

    return ModelComparisonResponse(
        lstm_a=lstm_a,
        lstm_b=lstm_b,
        divergence_analysis=divergence,
        advantage_note=advantage,
        evaluation_benchmark="DAPT2020 & LANL Authentication Benchmark Suite",
        last_updated=now_str,
    )
