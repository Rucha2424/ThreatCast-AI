from datetime import datetime, timezone
from typing import Optional
from backend.models.schemas import EventsResponse, SecurityEvent
from backend.data.state import state_manager


def get_events(limit: int = 50, risk_level: Optional[str] = None, tactic: Optional[str] = None) -> EventsResponse:
    scenario = state_manager.get_active_scenario()
    now_str = state_manager.get_iso_timestamp()

    all_events = [
        SecurityEvent(
            id="evt-1094",
            timestamp="15:32:10",
            source_ip="10.0.1.14",
            source_entity="User-014",
            destination_ip="10.0.2.7",
            destination_entity="Endpoint-07",
            event_type="Token Impersonation & SeDebugPrivilege Enablement",
            tactic="Privilege Escalation",
            technique_id="T1134.001",
            risk_level="CRITICAL",
            status="Observed",
            details="Process lsass.exe opened with PROCESS_ALL_ACCESS rights by elevated user token.",
            is_forecast_trigger=True,
        ),
        SecurityEvent(
            id="evt-1093",
            timestamp="15:31:45",
            source_ip="10.0.2.7",
            source_entity="Endpoint-07",
            destination_ip="10.0.3.3",
            destination_entity="Server-03",
            event_type="SMB/RPC Administrative Share Probing (C$)",
            tactic="Lateral Movement",
            technique_id="T1021.002",
            risk_level="HIGH",
            status="Under Analysis",
            details="High-frequency Tree Connect requests to administrative shares on Server-03 over TCP port 445.",
            is_forecast_trigger=True,
        ),
        SecurityEvent(
            id="evt-1092",
            timestamp="15:30:12",
            source_ip="10.0.2.7",
            source_entity="Endpoint-07",
            destination_ip="10.0.3.0/24",
            destination_entity="Core Subnet",
            event_type="Rapid SYN Port Sweep (Ports 135, 445, 3389)",
            tactic="Discovery",
            technique_id="T1046",
            risk_level="MEDIUM",
            status="Flagged",
            details="Deterministic rule 'Port Scan Detection' matched 45 SYN packets across 20 IP addresses in 2 seconds.",
            is_forecast_trigger=False,
        ),
        SecurityEvent(
            id="evt-1091",
            timestamp="15:28:50",
            source_ip="10.0.1.14",
            source_entity="User-014",
            destination_ip="10.0.3.3",
            destination_entity="Server-03",
            event_type="Kerberos TGS Request (RC4-HMAC Encryption)",
            tactic="Credential Access",
            technique_id="T1558.003",
            risk_level="HIGH",
            status="Observed",
            details="Kerberoasting pattern detected: User-014 requested TGS tickets for SPN MSSQLSvc/db02.prod using weak RC4 cipher.",
            is_forecast_trigger=True,
        ),
        SecurityEvent(
            id="evt-1090",
            timestamp="15:25:34",
            source_ip="10.0.2.7",
            source_entity="Endpoint-07",
            destination_ip="198.51.100.42",
            destination_entity="External C2",
            event_type="Encrypted HTTPS Beaconing to Dynamic DNS",
            tactic="Command and Control",
            technique_id="T1071.001",
            risk_level="HIGH",
            status="Flagged",
            details="Periodic jittered TLS outbound POST requests with payload sizes matching Cobalt Strike beacon profile.",
            is_forecast_trigger=False,
        ),
        SecurityEvent(
            id="evt-1089",
            timestamp="15:22:15",
            source_ip="10.0.1.9",
            source_entity="User-009",
            destination_ip="10.0.2.12",
            destination_entity="Endpoint-12",
            event_type="Routine SSH Session Establishment",
            tactic="Initial Access",
            technique_id="T1078",
            risk_level="LOW",
            status="Observed",
            details="Authorized developer key authentication for scheduled Docker container update.",
            is_forecast_trigger=False,
        ),
        SecurityEvent(
            id="evt-1088",
            timestamp="15:19:04",
            source_ip="10.0.4.2",
            source_entity="Database-02",
            destination_ip="10.0.3.3",
            destination_entity="Server-03",
            event_type="PostgreSQL Connection Pool Heartbeat",
            tactic="Collection",
            technique_id="T1005",
            risk_level="LOW",
            status="Observed",
            details="Healthy keep-alive query execution across backend API database connection pool.",
            is_forecast_trigger=False,
        ),
        SecurityEvent(
            id="evt-1087",
            timestamp="15:15:20",
            source_ip="10.0.2.7",
            source_entity="Endpoint-07",
            destination_ip="10.0.2.7",
            destination_entity="Endpoint-07",
            event_type="PowerShell Encoded Command Execution",
            tactic="Execution",
            technique_id="T1059.001",
            risk_level="CRITICAL",
            status="Blocked",
            details="powershell.exe -EncodedCommand executing Base64 reflective DLL injection payload.",
            is_forecast_trigger=True,
        ),
    ]

    # Filter if parameters are provided
    filtered = all_events
    if risk_level:
        filtered = [e for e in filtered if e.risk_level.upper() == risk_level.upper()]
    if tactic:
        filtered = [e for e in filtered if tactic.lower() in e.tactic.lower()]

    return EventsResponse(
        total=len(filtered[:limit]),
        events=filtered[:limit],
        last_updated=now_str,
    )
