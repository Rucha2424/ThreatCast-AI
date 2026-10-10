from datetime import datetime, timezone
from backend.models.schemas import (
    RulesListResponse, RuleItem, DisagreementResponse, DisagreementItem
)
from backend.data.state import state_manager


def get_rules() -> RulesListResponse:
    rules = [
        RuleItem(
            id="rule-01",
            name="TCP SYN Port Sweep Detector",
            category="Reconnaissance & Discovery",
            pattern="COUNT(SYN_PACKETS) > 30 / 3s per Source IP across unique ports",
            severity="Medium",
            status="Active (Triggered)",
            triggers_last_24h=14,
        ),
        RuleItem(
            id="rule-02",
            name="Brute-Force Authentication Spike",
            category="Credential Access",
            pattern="COUNT(AUTH_FAILED) >= 5 / 60s for single account",
            severity="High",
            status="Active (Triggered)",
            triggers_last_24h=3,
        ),
        RuleItem(
            id="rule-03",
            name="Volumetric Data Egress Threshold",
            category="Exfiltration",
            pattern="SUM(BYTES_OUT) > 500MB / 5min to unwhitelisted external CIDR",
            severity="Critical",
            status="Active (Monitoring)",
            triggers_last_24h=1,
        ),
        RuleItem(
            id="rule-04",
            name="Administrative Share (IPC$/C$) Access",
            category="Lateral Movement",
            pattern="SMB_TREE_CONNECT to IPC$, ADMIN$, C$ from non-admin subnet",
            severity="High",
            status="Active (Triggered)",
            triggers_last_24h=7,
        ),
        RuleItem(
            id="rule-05",
            name="PowerShell Suspicious Parameter Detector",
            category="Execution & Defense Evasion",
            pattern="MATCH(CommandLine, '-enc|-EncodedCommand|-w hidden|-nop')",
            severity="Critical",
            status="Active (Triggered)",
            triggers_last_24h=2,
        ),
    ]
    return RulesListResponse(total_rules=len(rules), rules=rules)


def get_disagreements() -> DisagreementResponse:
    now_str = state_manager.get_iso_timestamp()
    scenario = state_manager.get_active_scenario()

    if scenario == "exfiltration_crisis":
        disagreements = [
            DisagreementItem(
                id="dis-01",
                timestamp="15:30:45",
                model_prediction="Fast Data Exfiltration over Encrypted Channel",
                model_confidence=0.96,
                model_architecture="LSTM-B (Graph FastRP Features)",
                rule_name="Volumetric Data Egress Threshold",
                rule_output="Rule Silent / Suppressed (Egress chunks currently throttled at 48MB/min below 500MB threshold)",
                rule_severity="Low",
                status="Disagreement",
                why_it_matters="The attacker intentionally chunks database exfiltration below standard threshold limits. Deterministic static rule failed to trigger, while ThreatCast AI's temporal graph model recognized the multi-hop pipeline from Database-02 to Gateway-01.",
                observed_signals=[
                    "Database-02 high-entropy compressed temporary files created",
                    "Gateway-01 outbound persistent TLS streams to untrusted IP",
                    "Historical graph baseline confirms DB node has zero normal direct external egress",
                ],
                network_context="Database-02 -> Gateway-01 -> 198.51.100.42",
                recommended_action="Immediately quarantine Database-02 egress gateway routes and inspect active TLS sockets.",
                target_node="Database-02 (10.0.4.2)",
            ),
            DisagreementItem(
                id="dis-02",
                timestamp="15:24:12",
                model_prediction="Coordinated Lateral Movement via Stolen Token",
                model_confidence=0.92,
                model_architecture="LSTM-B (Graph FastRP Features)",
                rule_name="TCP SYN Port Sweep Detector",
                rule_output="Port Scan (Severity: Medium)",
                rule_severity="Medium",
                status="Disagreement",
                why_it_matters="Traditional IDS rules treat the traffic as isolated port scanning. The AI model recognized the scan as targeted reconnaissance for lateral RPC traversal.",
                observed_signals=[
                    "Targeted SYN probes strictly to domain controller RPC port 135 & SMB 445",
                    "User-014 token impersonation preceded the scan by 90 seconds",
                ],
                network_context="Endpoint-07 -> Server-03",
                recommended_action="Isolate Endpoint-07; do not treat as benign port scan.",
                target_node="Endpoint-07 (10.0.2.7)",
            ),
        ]
    else:  # default or lateral movement
        disagreements = [
            DisagreementItem(
                id="dis-01",
                timestamp="15:31:00",
                model_prediction="Multi-Stage Lateral Movement Campaign",
                model_confidence=0.88,
                model_architecture="LSTM-B (Graph FastRP Features)",
                rule_name="TCP SYN Port Sweep Detector",
                rule_output="Port Scan (Severity: Medium)",
                rule_severity="Medium",
                status="Disagreement",
                why_it_matters="Traditional rule engine classified the activity as a low/medium priority port scan. ThreatCast AI's Graph model integrated user privilege escalation context and topological proximity to Server-03, correctly forecasting a high-risk Lateral Movement attack progression.",
                observed_signals=[
                    "Targeted SYN probes strictly directed at Domain Controller ports (135, 445, 3389)",
                    "Preceded by Token Impersonation (SeDebugPrivilege) on User-014 context",
                    "Graph centrality of Endpoint-07 indicates direct vector to Core Infrastructure",
                ],
                network_context="Endpoint-07 (10.0.2.7) -> Server-03 (10.0.3.3)",
                recommended_action="Isolate Endpoint-07 host network adapter; block SMB port 445 cross-subnet relay to Server-03.",
                target_node="Endpoint-07 (10.0.2.7)",
            ),
            DisagreementItem(
                id="dis-02",
                timestamp="15:28:15",
                model_prediction="Kerberoasting & Offline Hash Cracking",
                model_confidence=0.84,
                model_architecture="LSTM-B (Graph FastRP Features)",
                rule_name="Brute-Force Authentication Spike",
                rule_output="No Alert (Threshold not met: 1 single TGS ticket request)",
                rule_severity="Low",
                status="Disagreement",
                why_it_matters="Brute-force rules look for high-frequency failure counts. Kerberoasting requests only a single valid service ticket (TGS) with RC4 encryption to crack offline, evading naive frequency rules completely.",
                observed_signals=[
                    "Service Ticket requested with downgrade encryption (RC4-HMAC-MD5)",
                    "User-014 has never accessed MSSQL SPN in 90-day baseline",
                ],
                network_context="User-014 -> Server-03 (Domain Controller)",
                recommended_action="Rotate SPN service account passwords to AES-256 and enforce gMSA.",
                target_node="Server-03 (10.0.3.3)",
            ),
        ]

    summary = (
        "Model–Rule Disagreements provide a vital secondary telemetry layer. When deep graph models and deterministic rules diverge, "
        "it highlights attacks designed to evade static signature thresholds (e.g. stealthy reconnaissance, offline ticket cracking, chunked egress)."
    )

    return DisagreementResponse(
        total_disagreements=len(disagreements),
        disagreements=disagreements,
        analytical_summary=summary,
        last_updated=now_str,
    )
