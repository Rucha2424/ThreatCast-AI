from datetime import datetime, timezone
from typing import Optional
from backend.models.schemas import (
    IncidentListResponse, IncidentDetailResponse, IncidentItem, IncidentTimelineItem
)
from backend.data.state import state_manager


def get_incidents() -> IncidentListResponse:
    now_str = state_manager.get_iso_timestamp()
    scenario = state_manager.get_active_scenario()

    incidents = [
        IncidentItem(
            id="INC-8042",
            title="Coordinated Lateral Movement Campaign targeting Domain Controller",
            detected_at="15:32:10",
            current_stage="Privilege Escalation (Observed)",
            predicted_progression="T+1: Lateral Movement -> T+2: Credential Access -> T+3: Exfiltration",
            affected_assets=["User-014", "Endpoint-07", "Server-03"],
            risk_level="CRITICAL" if scenario != "default" else "HIGH",
            risk_score=94 if scenario != "default" else 88,
            status="Forecasted",
            model_confidence=0.88 if scenario == "default" else 0.93,
            rule_result="TCP SYN Port Sweep (Medium)",
            has_disagreement=True,
            recommended_action="Isolate Endpoint-07 host network adapter; revoke Kerberos TGT ticket for User-014; block SMB port 445 cross-subnet relay to Server-03.",
            timeline=[
                IncidentTimelineItem(
                    time="15:25:34",
                    title="C2 Beaconing Detected",
                    description="Outbound encrypted TLS beacons observed from Endpoint-07 to 198.51.100.42.",
                    type="observed",
                ),
                IncidentTimelineItem(
                    time="15:30:12",
                    title="Port Scan Rule Matched",
                    description="Deterministic Rule Engine flagged rapid TCP SYN packet burst across ports 135/445.",
                    type="rule_alert",
                ),
                IncidentTimelineItem(
                    time="15:32:10",
                    title="Token Impersonation & Privilege Escalation",
                    description="Endpoint telemetry confirmed SeDebugPrivilege enabled on lsass.exe process handle.",
                    type="observed",
                ),
                IncidentTimelineItem(
                    time="15:44:00 (Est.)",
                    title="Forecasted T+1 Lateral Movement Hop",
                    description="LSTM-B predicts 88% likelihood of SMB/RPC administrative share access on Server-03.",
                    type="forecasted",
                ),
            ],
            containment_playbook=[
                "Step 1: Execute automated host isolation script for Endpoint-07 (EDR Agent ID: EDR-9921).",
                "Step 2: Force global revocation of Kerberos Ticket Granting Tickets (TGT) for User-014 in Active Directory.",
                "Step 3: Apply micro-segmentation firewall rule dropping port 445/135 between Subnet 10.0.2.0/24 and 10.0.3.0/24.",
                "Step 4: Enable Enhanced LSASS Audit Logging on Domain Controller Server-03.",
            ],
        ),
        IncidentItem(
            id="INC-8041",
            title="Kerberoasting & Offline Hash Extraction Attempt",
            detected_at="15:28:50",
            current_stage="Credential Access (Observed)",
            predicted_progression="T+1: Offline Hash Cracking -> T+2: Elevated DB Access",
            affected_assets=["User-014", "Server-03"],
            risk_level="HIGH",
            risk_score=79,
            status="Investigating",
            model_confidence=0.84,
            rule_result="Threshold Suppressed (1 TGS request)",
            has_disagreement=True,
            recommended_action="Rotate SPN MSSQLSvc/db02.prod password to 32+ character random string and migrate to gMSA.",
            timeline=[
                IncidentTimelineItem(
                    time="15:28:50",
                    title="TGS Ticket Request with RC4 Cipher",
                    description="User-014 requested ticket for database service account using legacy encryption cipher.",
                    type="observed",
                ),
                IncidentTimelineItem(
                    time="15:29:00",
                    title="Model-Rule Disagreement Logged",
                    description="Rule engine ignored single request; LSTM-B flagged anomalous account privilege disparity.",
                    type="rule_alert",
                ),
            ],
            containment_playbook=[
                "Step 1: Rotate service account password immediately.",
                "Step 2: Audit Active Directory accounts with SPN attributes configured.",
            ],
        ),
        IncidentItem(
            id="INC-8038",
            title="Periodic Encrypted External C2 Beaconing",
            detected_at="15:15:20",
            current_stage="Command and Control",
            predicted_progression="T+1: Payload Staging -> T+2: Lateral Movement",
            affected_assets=["Endpoint-07", "Gateway-01"],
            risk_level="HIGH",
            risk_score=82,
            status="Contained",
            model_confidence=0.86,
            rule_result="Threat Intelligence Match",
            has_disagreement=False,
            recommended_action="External IP 198.51.100.42 blacklisted at perimeter border gateway.",
            timeline=[
                IncidentTimelineItem(
                    time="15:15:20",
                    title="Outbound C2 Connection",
                    description="TLS SNI matched known malicious dynamic DNS domain.",
                    type="observed",
                ),
                IncidentTimelineItem(
                    time="15:17:00",
                    title="Perimeter Egress Blocked",
                    description="Border firewall applied sinkhole DNS entry.",
                    type="action_taken",
                ),
            ],
            containment_playbook=[
                "Step 1: Blacklist domain at perimeter DNS resolver.",
                "Step 2: Scan memory of Endpoint-07 for injected beacon DLLs.",
            ],
        ),
        IncidentItem(
            id="INC-8025",
            title="Unusual Off-Hours VPN Access from New Geolocation",
            detected_at="14:40:00",
            current_stage="Initial Access",
            predicted_progression="T+1: Internal Reconnaissance -> T+2: Privilege Escalation",
            affected_assets=["User-014"],
            risk_level="MEDIUM",
            risk_score=58,
            status="Resolved",
            model_confidence=0.72,
            rule_result="Geo-Velocity Anomaly Triggered",
            has_disagreement=False,
            recommended_action="MFA challenge enforced; session cleared.",
            timeline=[
                IncidentTimelineItem(
                    time="14:40:00",
                    title="VPN Login from Unknown IP",
                    description="User-014 authenticated from unfamiliar ASN.",
                    type="observed",
                ),
                IncidentTimelineItem(
                    time="14:42:00",
                    title="MFA Step-Up Verification Passed",
                    description="User confirmed secondary push authentication.",
                    type="action_taken",
                ),
            ],
            containment_playbook=[
                "Step 1: Verify user identity out-of-band.",
                "Step 2: Log session for compliance record.",
            ],
        ),
    ]

    return IncidentListResponse(total=len(incidents), incidents=incidents, last_updated=now_str)


def get_incident_by_id(incident_id: str) -> Optional[IncidentDetailResponse]:
    all_incidents = get_incidents().incidents
    for inc in all_incidents:
        if inc.id.upper() == incident_id.upper():
            return IncidentDetailResponse(incident=inc)
    # Default to first incident if not found
    return IncidentDetailResponse(incident=all_incidents[0])
