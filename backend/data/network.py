from datetime import datetime, timezone
from backend.models.schemas import (
    NetworkGraphResponse, NetworkNode, NetworkEdge,
    NetworkActivityResponse, TrafficPoint, AuthPoint, RiskPoint
)
from backend.data.state import state_manager


def get_network_graph() -> NetworkGraphResponse:
    scenario = state_manager.get_active_scenario()
    now_str = state_manager.get_iso_timestamp()

    if scenario == "lateral_movement_wave":
        nodes = [
            NetworkNode(
                id="user-014",
                label="User-014 (SecOps Analyst)",
                type="user",
                ip="10.0.1.14",
                risk_score=92,
                state="compromised",
                department="Security Operations",
                os="Windows 11 Enterprise",
                observed_activity="Abnormal Kerberos TGS requests after off-hours login",
                predicted_action="Credential dumping & privilege propagation",
                active_connections=4,
                is_in_attack_path=True,
            ),
            NetworkNode(
                id="user-009",
                label="User-009 (DevOps Eng)",
                type="user",
                ip="10.0.1.9",
                risk_score=24,
                state="normal",
                department="Engineering",
                os="macOS Sonoma",
                observed_activity="Standard Git push and Docker build interactions",
                predicted_action="No suspicious action predicted",
                active_connections=2,
                is_in_attack_path=False,
            ),
            NetworkNode(
                id="endpoint-07",
                label="Endpoint-07 (Workstation)",
                type="endpoint",
                ip="10.0.2.7",
                risk_score=96,
                state="compromised",
                department="SecOps Floor",
                os="Windows 10 Pro",
                observed_activity="Active beaconing and SMB port 445 cross-subnet probing",
                predicted_action="PsExec remote process spawn to Server-03",
                active_connections=7,
                is_in_attack_path=True,
            ),
            NetworkNode(
                id="endpoint-12",
                label="Endpoint-12 (Build Node)",
                type="endpoint",
                ip="10.0.2.12",
                risk_score=18,
                state="normal",
                department="Engineering",
                os="Ubuntu 22.04 LTS",
                observed_activity="Standard CI/CD runner processes",
                predicted_action="Normal telemetry profile",
                active_connections=3,
                is_in_attack_path=False,
            ),
            NetworkNode(
                id="server-03",
                label="Server-03 (Domain Controller / App)",
                type="server",
                ip="10.0.3.3",
                risk_score=88,
                state="suspicious",
                department="Core Infrastructure",
                os="Windows Server 2022",
                observed_activity="Anomalous RPC bind and administrative share mounting (C$)",
                predicted_action="LSASS memory dump and ntds.dit extraction",
                active_connections=12,
                is_in_attack_path=True,
            ),
            NetworkNode(
                id="database-02",
                label="Database-02 (Customer & Auth DB)",
                type="database",
                ip="10.0.4.2",
                risk_score=75,
                state="target",
                department="Production Database Subnet",
                os="PostgreSQL 16 Enterprise / RHEL 9",
                observed_activity="Elevated connection attempts from Server-03",
                predicted_action="Bulk SQL staging and extraction in T+2",
                active_connections=8,
                is_in_attack_path=False,
            ),
            NetworkNode(
                id="gateway-01",
                label="Gateway-01 (Border Firewall / Proxy)",
                type="gateway",
                ip="10.0.0.1",
                risk_score=62,
                state="normal",
                department="Perimeter Network",
                os="Palo Alto PAN-OS 11",
                observed_activity="Monitoring high-frequency internal DNS queries",
                predicted_action="Potential target for DNS tunneling exfiltration in T+3",
                active_connections=45,
                is_in_attack_path=False,
            ),
        ]
        edges = [
            NetworkEdge(id="e1", source="user-014", target="endpoint-07", protocol="RDP/TLS", port=3389, traffic_volume="14.2 MB", is_attack_path=True, is_forecasted_path=False, status="active"),
            NetworkEdge(id="e2", source="endpoint-07", target="server-03", protocol="SMB/RPC", port=445, traffic_volume="128.5 MB", is_attack_path=True, is_forecasted_path=False, status="active"),
            NetworkEdge(id="e3", source="server-03", target="database-02", protocol="TCP/SQL", port=5432, traffic_volume="45.1 MB", is_attack_path=False, is_forecasted_path=True, status="forecasted"),
            NetworkEdge(id="e4", source="database-02", target="gateway-01", protocol="HTTPS/DNS", port=443, traffic_volume="1.2 MB", is_attack_path=False, is_forecasted_path=True, status="forecasted"),
            NetworkEdge(id="e5", source="user-009", target="endpoint-12", protocol="SSH", port=22, traffic_volume="8.4 MB", is_attack_path=False, is_forecasted_path=False, status="monitored"),
            NetworkEdge(id="e6", source="endpoint-12", target="gateway-01", protocol="HTTPS", port=443, traffic_volume="32.0 MB", is_attack_path=False, is_forecasted_path=False, status="monitored"),
        ]
        attack_path = ["user-014", "endpoint-07", "server-03"]
        forecasted_path = ["server-03", "database-02", "gateway-01"]
        high_risk_count = 3

    elif scenario == "exfiltration_crisis":
        nodes = [
            NetworkNode(
                id="user-014",
                label="User-014 (SecOps Analyst)",
                type="user",
                ip="10.0.1.14",
                risk_score=95,
                state="compromised",
                department="Security Operations",
                os="Windows 11 Enterprise",
                observed_activity="Session hijacked via stolen OAuth token",
                predicted_action="Attacker maintaining persistent backdoor",
                active_connections=5,
                is_in_attack_path=True,
            ),
            NetworkNode(
                id="endpoint-07",
                label="Endpoint-07 (Workstation)",
                type="endpoint",
                ip="10.0.2.7",
                risk_score=98,
                state="compromised",
                department="SecOps Floor",
                os="Windows 10 Pro",
                observed_activity="Relaying C2 command traffic",
                predicted_action="Anti-forensics log purge scheduled",
                active_connections=9,
                is_in_attack_path=True,
            ),
            NetworkNode(
                id="server-03",
                label="Server-03 (Domain Controller)",
                type="server",
                ip="10.0.3.3",
                risk_score=94,
                state="compromised",
                department="Core Infrastructure",
                os="Windows Server 2022",
                observed_activity="Active staging directory with 7z compressed archives",
                predicted_action="Streaming chunks to perimeter gateway",
                active_connections=16,
                is_in_attack_path=True,
            ),
            NetworkNode(
                id="database-02",
                label="Database-02 (Customer DB)",
                type="database",
                ip="10.0.4.2",
                risk_score=97,
                state="compromised",
                department="Production Database Subnet",
                os="PostgreSQL 16 Enterprise",
                observed_activity="Mass SELECT query execution dumping 1.2M records",
                predicted_action="Data exfiltration transfer active",
                active_connections=12,
                is_in_attack_path=True,
            ),
            NetworkNode(
                id="gateway-01",
                label="Gateway-01 (Border Firewall)",
                type="gateway",
                ip="10.0.0.1",
                risk_score=89,
                state="target",
                department="Perimeter Network",
                os="Palo Alto PAN-OS 11",
                observed_activity="High volume encrypted TLS outbound connection to 198.51.100.42",
                predicted_action="Exfiltration completion within 4 minutes",
                active_connections=58,
                is_in_attack_path=False,
            ),
        ]
        edges = [
            NetworkEdge(id="e1", source="user-014", target="endpoint-07", protocol="RDP/TLS", port=3389, traffic_volume="28.4 MB", is_attack_path=True, is_forecasted_path=False, status="active"),
            NetworkEdge(id="e2", source="endpoint-07", target="server-03", protocol="SMB/RPC", port=445, traffic_volume="340.2 MB", is_attack_path=True, is_forecasted_path=False, status="active"),
            NetworkEdge(id="e3", source="server-03", target="database-02", protocol="TCP/SQL", port=5432, traffic_volume="890.5 MB", is_attack_path=True, is_forecasted_path=False, status="active"),
            NetworkEdge(id="e4", source="database-02", target="gateway-01", protocol="HTTPS/TLS", port=443, traffic_volume="1.4 GB", is_attack_path=False, is_forecasted_path=True, status="forecasted"),
        ]
        attack_path = ["user-014", "endpoint-07", "server-03", "database-02"]
        forecasted_path = ["database-02", "gateway-01"]
        high_risk_count = 4

    else:  # default scenario
        nodes = [
            NetworkNode(
                id="user-014",
                label="User-014 (SecOps Analyst)",
                type="user",
                ip="10.0.1.14",
                risk_score=82,
                state="compromised",
                department="Security Operations",
                os="Windows 11 Enterprise",
                observed_activity="Privilege escalation via token impersonation",
                predicted_action="Lateral scan across internal management subnet",
                active_connections=3,
                is_in_attack_path=True,
            ),
            NetworkNode(
                id="user-009",
                label="User-009 (DevOps Eng)",
                type="user",
                ip="10.0.1.9",
                risk_score=15,
                state="normal",
                department="Engineering",
                os="macOS Sonoma",
                observed_activity="Standard GitLab authentication",
                predicted_action="No suspicious pattern",
                active_connections=2,
                is_in_attack_path=False,
            ),
            NetworkNode(
                id="endpoint-07",
                label="Endpoint-07 (Workstation)",
                type="endpoint",
                ip="10.0.2.7",
                risk_score=86,
                state="compromised",
                department="SecOps Floor",
                os="Windows 10 Pro",
                observed_activity="Seeding SMB SYN packets and RPC enumeration",
                predicted_action="Lateral Movement to Server-03 in T+1",
                active_connections=5,
                is_in_attack_path=True,
            ),
            NetworkNode(
                id="endpoint-12",
                label="Endpoint-12 (Build Node)",
                type="endpoint",
                ip="10.0.2.12",
                risk_score=12,
                state="normal",
                department="Engineering",
                os="Ubuntu 22.04 LTS",
                observed_activity="Routine compile tasks",
                predicted_action="Normal telemetry profile",
                active_connections=3,
                is_in_attack_path=False,
            ),
            NetworkNode(
                id="server-03",
                label="Server-03 (Domain Controller / App)",
                type="server",
                ip="10.0.3.3",
                risk_score=68,
                state="suspicious",
                department="Core Infrastructure",
                os="Windows Server 2022",
                observed_activity="Listening on RPC/SMB; unauthenticated probes detected",
                predicted_action="Target of T+1 Lateral Movement",
                active_connections=9,
                is_in_attack_path=False,
            ),
            NetworkNode(
                id="database-02",
                label="Database-02 (Customer & Auth DB)",
                type="database",
                ip="10.0.4.2",
                risk_score=45,
                state="target",
                department="Production Database Subnet",
                os="PostgreSQL 16 Enterprise",
                observed_activity="Normal query throughput from app cluster",
                predicted_action="Target of T+2 Credential Extraction",
                active_connections=6,
                is_in_attack_path=False,
            ),
            NetworkNode(
                id="gateway-01",
                label="Gateway-01 (Border Firewall / Proxy)",
                type="gateway",
                ip="10.0.0.1",
                risk_score=35,
                state="normal",
                department="Perimeter Network",
                os="Palo Alto PAN-OS 11",
                observed_activity="Normal NAT routing and egress filtering",
                predicted_action="Predicted T+3 Exfiltration bottleneck",
                active_connections=38,
                is_in_attack_path=False,
            ),
        ]
        edges = [
            NetworkEdge(id="e1", source="user-014", target="endpoint-07", protocol="RDP/TLS", port=3389, traffic_volume="11.8 MB", is_attack_path=True, is_forecasted_path=False, status="active"),
            NetworkEdge(id="e2", source="endpoint-07", target="server-03", protocol="SMB/RPC", port=445, traffic_volume="42.3 MB", is_attack_path=False, is_forecasted_path=True, status="forecasted"),
            NetworkEdge(id="e3", source="server-03", target="database-02", protocol="TCP/SQL", port=5432, traffic_volume="18.9 MB", is_attack_path=False, is_forecasted_path=True, status="forecasted"),
            NetworkEdge(id="e4", source="database-02", target="gateway-01", protocol="HTTPS/DNS", port=443, traffic_volume="0.8 MB", is_attack_path=False, is_forecasted_path=True, status="forecasted"),
            NetworkEdge(id="e5", source="user-009", target="endpoint-12", protocol="SSH", port=22, traffic_volume="6.1 MB", is_attack_path=False, is_forecasted_path=False, status="monitored"),
            NetworkEdge(id="e6", source="endpoint-12", target="gateway-01", protocol="HTTPS", port=443, traffic_volume="25.4 MB", is_attack_path=False, is_forecasted_path=False, status="monitored"),
        ]
        attack_path = ["user-014", "endpoint-07"]
        forecasted_path = ["endpoint-07", "server-03", "database-02", "gateway-01"]
        high_risk_count = 2

    return NetworkGraphResponse(
        nodes=nodes,
        edges=edges,
        attack_path_node_ids=attack_path,
        forecasted_path_node_ids=forecasted_path,
        high_risk_nodes_count=high_risk_count,
        last_updated=now_str,
    )


def get_network_activity() -> NetworkActivityResponse:
    now_str = state_manager.get_iso_timestamp()
    scenario = state_manager.get_active_scenario()

    # Time series points across the last 10 observation windows
    if scenario == "exfiltration_crisis":
        traffic_series = [
            TrafficPoint(time="15:00", bytes_in_mbps=120.4, bytes_out_mbps=145.2, anomalous_mbps=5.1),
            TrafficPoint(time="15:05", bytes_in_mbps=135.0, bytes_out_mbps=160.8, anomalous_mbps=8.4),
            TrafficPoint(time="15:10", bytes_in_mbps=142.1, bytes_out_mbps=180.2, anomalous_mbps=15.2),
            TrafficPoint(time="15:15", bytes_in_mbps=155.8, bytes_out_mbps=240.5, anomalous_mbps=45.6),
            TrafficPoint(time="15:20", bytes_in_mbps=168.2, bytes_out_mbps=380.0, anomalous_mbps=120.4),
            TrafficPoint(time="15:25", bytes_in_mbps=175.4, bytes_out_mbps=620.1, anomalous_mbps=295.8),
            TrafficPoint(time="15:30", bytes_in_mbps=188.0, bytes_out_mbps=890.4, anomalous_mbps=480.2),
        ]
        auth_series = [
            AuthPoint(time="15:00", successful_logins=45, failed_logins=2, privilege_escalations=0),
            AuthPoint(time="15:05", successful_logins=48, failed_logins=4, privilege_escalations=0),
            AuthPoint(time="15:10", successful_logins=52, failed_logins=12, privilege_escalations=1),
            AuthPoint(time="15:15", successful_logins=64, failed_logins=28, privilege_escalations=3),
            AuthPoint(time="15:20", successful_logins=71, failed_logins=45, privilege_escalations=5),
            AuthPoint(time="15:25", successful_logins=85, failed_logins=62, privilege_escalations=8),
            AuthPoint(time="15:30", successful_logins=92, failed_logins=84, privilege_escalations=12),
        ]
        risk_trend = [
            RiskPoint(time="15:00", risk_score=35, threat_events=1),
            RiskPoint(time="15:05", risk_score=48, threat_events=2),
            RiskPoint(time="15:10", risk_score=62, threat_events=4),
            RiskPoint(time="15:15", risk_score=78, threat_events=7),
            RiskPoint(time="15:20", risk_score=89, threat_events=14),
            RiskPoint(time="15:25", risk_score=95, threat_events=22),
            RiskPoint(time="15:30", risk_score=98, threat_events=31),
        ]
    else:  # default or lateral movement
        traffic_series = [
            TrafficPoint(time="15:00", bytes_in_mbps=110.2, bytes_out_mbps=95.4, anomalous_mbps=1.2),
            TrafficPoint(time="15:05", bytes_in_mbps=115.8, bytes_out_mbps=98.1, anomalous_mbps=2.0),
            TrafficPoint(time="15:10", bytes_in_mbps=122.4, bytes_out_mbps=104.3, anomalous_mbps=3.5),
            TrafficPoint(time="15:15", bytes_in_mbps=130.1, bytes_out_mbps=112.0, anomalous_mbps=8.9),
            TrafficPoint(time="15:20", bytes_in_mbps=145.6, bytes_out_mbps=138.4, anomalous_mbps=18.4),
            TrafficPoint(time="15:25", bytes_in_mbps=158.2, bytes_out_mbps=152.0, anomalous_mbps=29.1),
            TrafficPoint(time="15:30", bytes_in_mbps=164.5, bytes_out_mbps=160.2, anomalous_mbps=38.7),
        ]
        auth_series = [
            AuthPoint(time="15:00", successful_logins=42, failed_logins=1, privilege_escalations=0),
            AuthPoint(time="15:05", successful_logins=44, failed_logins=2, privilege_escalations=0),
            AuthPoint(time="15:10", successful_logins=49, failed_logins=5, privilege_escalations=1),
            AuthPoint(time="15:15", successful_logins=53, failed_logins=9, privilege_escalations=1),
            AuthPoint(time="15:20", successful_logins=58, failed_logins=18, privilege_escalations=2),
            AuthPoint(time="15:25", successful_logins=61, failed_logins=24, privilege_escalations=3),
            AuthPoint(time="15:30", successful_logins=66, failed_logins=32, privilege_escalations=4),
        ]
        risk_trend = [
            RiskPoint(time="15:00", risk_score=22, threat_events=0),
            RiskPoint(time="15:05", risk_score=28, threat_events=1),
            RiskPoint(time="15:10", risk_score=42, threat_events=2),
            RiskPoint(time="15:15", risk_score=58, threat_events=3),
            RiskPoint(time="15:20", risk_score=71, threat_events=5),
            RiskPoint(time="15:25", risk_score=78, threat_events=8),
            RiskPoint(time="15:30", risk_score=84, threat_events=11),
        ]

    return NetworkActivityResponse(
        traffic_series=traffic_series,
        auth_series=auth_series,
        risk_trend=risk_trend,
        last_updated=now_str,
    )
