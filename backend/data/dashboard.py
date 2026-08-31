from datetime import datetime, timezone
from backend.models.schemas import DashboardSummary, DashboardKpis, KpiItem, TrendItem
from backend.data.state import state_manager


def get_dashboard_summary() -> DashboardSummary:
    scenario = state_manager.get_active_scenario()
    now_str = state_manager.get_iso_timestamp()

    if scenario == "lateral_movement_wave":
        return DashboardSummary(
            threat_level="CRITICAL",
            threat_score=94,
            current_stage="Lateral Movement",
            current_stage_tactic="TA0008 - Lateral Movement",
            next_predicted_stage="Credential Access & Staging",
            next_predicted_tactic="TA0006 - Credential Access",
            forecast_confidence=0.93,
            forecast_horizon="T+1 to T+3 (8-30 mins)",
            recommended_action="Quarantine Endpoint-07 & Server-03 immediately; Revoke domain Kerberos tickets; Enable micro-segmentation on Subnet 10.0.4.0/24.",
            system_status="AI Engine Active • High Alert",
            active_threat_count=4,
            high_risk_node_count=3,
            disagreement_detected=True,
            disagreement_count=2,
            last_updated=now_str,
            active_scenario=scenario,
        )
    elif scenario == "exfiltration_crisis":
        return DashboardSummary(
            threat_level="CRITICAL",
            threat_score=98,
            current_stage="Collection & Staging",
            current_stage_tactic="TA0009 - Collection",
            next_predicted_stage="Encrypted Data Exfiltration",
            next_predicted_tactic="TA0010 - Exfiltration",
            forecast_confidence=0.96,
            forecast_horizon="T+1 to T+3 (4-20 mins)",
            recommended_action="Block Gateway-01 egress traffic on port 443 to IP 198.51.100.42; Freeze read queries on Database-02; Rotate DB master credentials.",
            system_status="AI Engine Active • High Alert",
            active_threat_count=5,
            high_risk_node_count=4,
            disagreement_detected=True,
            disagreement_count=3,
            last_updated=now_str,
            active_scenario=scenario,
        )
    elif scenario == "ransomware_staging":
        return DashboardSummary(
            threat_level="CRITICAL",
            threat_score=91,
            current_stage="Defense Evasion",
            current_stage_tactic="TA0005 - Defense Evasion",
            next_predicted_stage="Mass Encryption & Spreading",
            next_predicted_tactic="TA0040 - Impact",
            forecast_confidence=0.92,
            forecast_horizon="T+1 to T+3 (5-25 mins)",
            recommended_action="Initiate emergency snapshot backup of Database-02 and Server-03; Terminate PsExec and WMI execution permissions across workstation pool.",
            system_status="AI Engine Active • High Alert",
            active_threat_count=4,
            high_risk_node_count=3,
            disagreement_detected=True,
            disagreement_count=2,
            last_updated=now_str,
            active_scenario=scenario,
        )
    else:  # default scenario
        return DashboardSummary(
            threat_level="HIGH",
            threat_score=78,
            current_stage="Privilege Escalation",
            current_stage_tactic="TA0004 - Privilege Escalation",
            next_predicted_stage="Lateral Movement",
            next_predicted_tactic="TA0008 - Lateral Movement",
            forecast_confidence=0.88,
            forecast_horizon="T+1 to T+3 (12-40 mins)",
            recommended_action="Isolate Endpoint-07 host network adapter; revoke Kerberos TGT ticket for User-014; block SMB port 445 cross-subnet relay to Server-03.",
            system_status="AI Engine Online • Predictive Mode",
            active_threat_count=2,
            high_risk_node_count=2,
            disagreement_detected=True,
            disagreement_count=1,
            last_updated=now_str,
            active_scenario=scenario,
        )


def get_dashboard_kpis() -> DashboardKpis:
    scenario = state_manager.get_active_scenario()
    now_str = state_manager.get_iso_timestamp()

    if scenario == "lateral_movement_wave":
        cards = [
            KpiItem(
                id="kpi-threats",
                label="Active Threats",
                value="4 Identified",
                context="2 Critical, 2 High priority",
                trend=TrendItem(direction="up", value="+2 from last hour"),
                status="danger",
            ),
            KpiItem(
                id="kpi-forecast",
                label="Forecasted Events",
                value="3 Ahead (K=3)",
                context="Next impact in ~8 mins",
                trend=TrendItem(direction="up", value="Escalating stage"),
                status="danger",
            ),
            KpiItem(
                id="kpi-nodes",
                label="High-Risk Nodes",
                value="3 Assets",
                context="Endpoint-07, Server-03, DB-02",
                trend=TrendItem(direction="up", value="+1 node involved"),
                status="danger",
            ),
            KpiItem(
                id="kpi-confidence",
                label="Forecast Confidence",
                value="93%",
                context="LSTM-B + FastRP Graph Model",
                trend=TrendItem(direction="up", value="+5% graph weight"),
                status="safe",
            ),
            KpiItem(
                id="kpi-disagreement",
                label="Model–Rule Disagreements",
                value="2 Signals",
                context="Deterministic rules lag graph AI",
                trend=TrendItem(direction="neutral", value="Active divergence"),
                status="warning",
            ),
        ]
    elif scenario == "exfiltration_crisis":
        cards = [
            KpiItem(
                id="kpi-threats",
                label="Active Threats",
                value="5 Identified",
                context="3 Critical, 2 High priority",
                trend=TrendItem(direction="up", value="+3 rapid spikes"),
                status="danger",
            ),
            KpiItem(
                id="kpi-forecast",
                label="Forecasted Events",
                value="3 Ahead (K=3)",
                context="Egress window in ~4 mins",
                trend=TrendItem(direction="up", value="Imminent exfil"),
                status="danger",
            ),
            KpiItem(
                id="kpi-nodes",
                label="High-Risk Nodes",
                value="4 Assets",
                context="DB-02, Gateway-01, Server-03",
                trend=TrendItem(direction="up", value="Gateway compromised"),
                status="danger",
            ),
            KpiItem(
                id="kpi-confidence",
                label="Forecast Confidence",
                value="96%",
                context="LSTM-B + FastRP Graph Model",
                trend=TrendItem(direction="up", value="Very High certainty"),
                status="safe",
            ),
            KpiItem(
                id="kpi-disagreement",
                label="Model–Rule Disagreements",
                value="3 Signals",
                context="Data volume rule suppressed by slow crawl",
                trend=TrendItem(direction="up", value="+1 subtle evasion"),
                status="warning",
            ),
        ]
    else:  # default scenario
        cards = [
            KpiItem(
                id="kpi-threats",
                label="Active Threats",
                value="2 Active",
                context="1 High, 1 Elevated priority",
                trend=TrendItem(direction="up", value="+1 in last 30m"),
                status="warning",
            ),
            KpiItem(
                id="kpi-forecast",
                label="Forecasted Events",
                value="3 Ahead (K=3)",
                context="T+1 projected in ~12 mins",
                trend=TrendItem(direction="neutral", value="Window open"),
                status="warning",
            ),
            KpiItem(
                id="kpi-nodes",
                label="High-Risk Nodes",
                value="2 Assets",
                context="Endpoint-07, User-014",
                trend=TrendItem(direction="neutral", value="Stationary"),
                status="warning",
            ),
            KpiItem(
                id="kpi-confidence",
                label="Forecast Confidence",
                value="88%",
                context="LSTM-B + FastRP Graph Model",
                trend=TrendItem(direction="up", value="Grounded in 14-hop context"),
                status="safe",
            ),
            KpiItem(
                id="kpi-disagreement",
                label="Model–Rule Disagreements",
                value="1 Signal",
                context="Rule: Port Scan | AI: Lateral Movement",
                trend=TrendItem(direction="neutral", value="Stable"),
                status="warning",
            ),
        ]

    return DashboardKpis(cards=cards, last_updated=now_str)
