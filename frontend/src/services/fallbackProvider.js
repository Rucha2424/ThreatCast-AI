// Standalone Fallback Data Provider for ThreatCast AI
// Mirrors backend Pydantic data structures to guarantee 100% uptime on static deployments

let activeScenario = 'default';

export const fallbackProvider = {
  getScenario: () => activeScenario,
  setScenario: (sc) => {
    activeScenario = sc;
  },

  getHealth: async () => ({
    status: 'healthy',
    engine: 'online',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: 'production-cloud',
  }),

  getDashboardSummary: async () => {
    const now = new Date().toISOString();
    if (activeScenario === 'lateral_movement_wave') {
      return {
        threat_level: 'CRITICAL',
        threat_score: 94,
        current_stage: 'Lateral Movement',
        current_stage_tactic: 'TA0008 - Lateral Movement',
        next_predicted_stage: 'Credential Access & Staging',
        next_predicted_tactic: 'TA0006 - Credential Access',
        forecast_confidence: 0.93,
        forecast_horizon: 'T+1 to T+3 (8-30 mins)',
        recommended_action:
          'Quarantine Endpoint-07 & Server-03 immediately; Revoke domain Kerberos tickets; Enable micro-segmentation on Subnet 10.0.4.0/24.',
        system_status: 'AI Engine Active • High Alert',
        active_threat_count: 4,
        high_risk_node_count: 3,
        disagreement_detected: true,
        disagreement_count: 2,
        last_updated: now,
        active_scenario: activeScenario,
      };
    } else if (activeScenario === 'exfiltration_crisis') {
      return {
        threat_level: 'CRITICAL',
        threat_score: 98,
        current_stage: 'Collection & Staging',
        current_stage_tactic: 'TA0009 - Collection',
        next_predicted_stage: 'Encrypted Data Exfiltration',
        next_predicted_tactic: 'TA0010 - Exfiltration',
        forecast_confidence: 0.96,
        forecast_horizon: 'T+1 to T+3 (4-20 mins)',
        recommended_action:
          'Block Gateway-01 egress traffic on port 443 to IP 198.51.100.42; Freeze read queries on Database-02; Rotate DB master credentials.',
        system_status: 'AI Engine Active • High Alert',
        active_threat_count: 5,
        high_risk_node_count: 4,
        disagreement_detected: true,
        disagreement_count: 3,
        last_updated: now,
        active_scenario: activeScenario,
      };
    } else if (activeScenario === 'ransomware_staging') {
      return {
        threat_level: 'CRITICAL',
        threat_score: 91,
        current_stage: 'Defense Evasion',
        current_stage_tactic: 'TA0005 - Defense Evasion',
        next_predicted_stage: 'Mass Encryption & Spreading',
        next_predicted_tactic: 'TA0040 - Impact',
        forecast_confidence: 0.92,
        forecast_horizon: 'T+1 to T+3 (5-25 mins)',
        recommended_action:
          'Initiate emergency snapshot backup of Database-02 and Server-03; Terminate PsExec execution permissions across workstation pool.',
        system_status: 'AI Engine Active • High Alert',
        active_threat_count: 4,
        high_risk_node_count: 3,
        disagreement_detected: true,
        disagreement_count: 2,
        last_updated: now,
        active_scenario: activeScenario,
      };
    }

    return {
      threat_level: 'HIGH',
      threat_score: 78,
      current_stage: 'Privilege Escalation',
      current_stage_tactic: 'TA0004 - Privilege Escalation',
      next_predicted_stage: 'Lateral Movement',
      next_predicted_tactic: 'TA0008 - Lateral Movement',
      forecast_confidence: 0.88,
      forecast_horizon: 'T+1 to T+3 (12-40 mins)',
      recommended_action:
        'Isolate Endpoint-07 host network adapter; revoke Kerberos TGT ticket for User-014; block SMB port 445 cross-subnet relay to Server-03.',
      system_status: 'AI Engine Online • Predictive Mode',
      active_threat_count: 2,
      high_risk_node_count: 2,
      disagreement_detected: true,
      disagreement_count: 1,
      last_updated: now,
      active_scenario: activeScenario,
    };
  },

  getDashboardKpis: async () => {
    const now = new Date().toISOString();
    return {
      cards: [
        {
          id: 'kpi-threats',
          label: 'Active Threats',
          value: activeScenario !== 'default' ? '4 Identified' : '2 Active',
          context: activeScenario !== 'default' ? '2 Critical, 2 High priority' : '1 High, 1 Elevated priority',
          trend: { direction: 'up', value: '+1 in last 30m' },
          status: activeScenario !== 'default' ? 'danger' : 'warning',
        },
        {
          id: 'kpi-forecast',
          label: 'Forecasted Events',
          value: '3 Ahead (K=3)',
          context: 'T+1 projected in ~12 mins',
          trend: { direction: 'neutral', value: 'Window open' },
          status: 'warning',
        },
        {
          id: 'kpi-nodes',
          label: 'High-Risk Nodes',
          value: activeScenario !== 'default' ? '3 Assets' : '2 Assets',
          context: 'Endpoint-07, User-014',
          trend: { direction: 'neutral', value: 'Stationary' },
          status: 'warning',
        },
        {
          id: 'kpi-confidence',
          label: 'Forecast Confidence',
          value: activeScenario === 'exfiltration_crisis' ? '96%' : '88%',
          context: 'LSTM-B + FastRP Graph Model',
          trend: { direction: 'up', value: 'Grounded in 14-hop context' },
          status: 'safe',
        },
        {
          id: 'kpi-disagreement',
          label: 'Model–Rule Disagreements',
          value: activeScenario !== 'default' ? '2 Signals' : '1 Signal',
          context: 'Rule: Port Scan | AI: Lateral Movement',
          trend: { direction: 'neutral', value: 'Active divergence' },
          status: 'warning',
        },
      ],
      last_updated: now,
    };
  },

  getEvents: async (params = {}) => {
    const now = new Date().toISOString();
    const events = [
      {
        id: 'evt-1094',
        timestamp: '15:32:10',
        source_ip: '10.0.1.14',
        source_entity: 'User-014',
        destination_ip: '10.0.2.7',
        destination_entity: 'Endpoint-07',
        event_type: 'Token Impersonation & SeDebugPrivilege Enablement',
        tactic: 'Privilege Escalation',
        technique_id: 'T1134.001',
        risk_level: 'CRITICAL',
        status: 'Observed',
        details: 'Process lsass.exe opened with PROCESS_ALL_ACCESS rights by elevated user token.',
        is_forecast_trigger: true,
      },
      {
        id: 'evt-1093',
        timestamp: '15:31:45',
        source_ip: '10.0.2.7',
        source_entity: 'Endpoint-07',
        destination_ip: '10.0.3.3',
        destination_entity: 'Server-03',
        event_type: 'SMB/RPC Administrative Share Probing (C$)',
        tactic: 'Lateral Movement',
        technique_id: 'T1021.002',
        risk_level: 'HIGH',
        status: 'Under Analysis',
        details: 'High-frequency Tree Connect requests to administrative shares on Server-03 over TCP port 445.',
        is_forecast_trigger: true,
      },
      {
        id: 'evt-1092',
        timestamp: '15:30:12',
        source_ip: '10.0.2.7',
        source_entity: 'Endpoint-07',
        destination_ip: '10.0.3.0/24',
        destination_entity: 'Core Subnet',
        event_type: 'Rapid SYN Port Sweep (Ports 135, 445, 3389)',
        tactic: 'Discovery',
        technique_id: 'T1046',
        risk_level: 'MEDIUM',
        status: 'Flagged',
        details: 'Deterministic rule "Port Scan Detection" matched 45 SYN packets across 20 IP addresses in 2 seconds.',
        is_forecast_trigger: false,
      },
      {
        id: 'evt-1091',
        timestamp: '15:28:50',
        source_ip: '10.0.1.14',
        source_entity: 'User-014',
        destination_ip: '10.0.3.3',
        destination_entity: 'Server-03',
        event_type: 'Kerberos TGS Request (RC4-HMAC Encryption)',
        tactic: 'Credential Access',
        technique_id: 'T1558.003',
        risk_level: 'HIGH',
        status: 'Observed',
        details: 'Kerberoasting pattern detected: User-014 requested TGS tickets for SPN MSSQLSvc/db02.prod using weak RC4 cipher.',
        is_forecast_trigger: true,
      },
      {
        id: 'evt-1090',
        timestamp: '15:25:34',
        source_ip: '10.0.2.7',
        source_entity: 'Endpoint-07',
        destination_ip: '198.51.100.42',
        destination_entity: 'External C2',
        event_type: 'Encrypted HTTPS Beaconing to Dynamic DNS',
        tactic: 'Command and Control',
        technique_id: 'T1071.001',
        risk_level: 'HIGH',
        status: 'Flagged',
        details: 'Periodic jittered TLS outbound POST requests with payload sizes matching Cobalt Strike beacon profile.',
        is_forecast_trigger: false,
      },
      {
        id: 'evt-1089',
        timestamp: '15:22:15',
        source_ip: '10.0.1.9',
        source_entity: 'User-009',
        destination_ip: '10.0.2.12',
        destination_entity: 'Endpoint-12',
        event_type: 'Routine SSH Session Establishment',
        tactic: 'Initial Access',
        technique_id: 'T1078',
        risk_level: 'LOW',
        status: 'Observed',
        details: 'Authorized developer key authentication for scheduled Docker container update.',
        is_forecast_trigger: false,
      },
    ];

    let filtered = events;
    if (params.risk_level) {
      filtered = filtered.filter((e) => e.risk_level.toUpperCase() === params.risk_level.toUpperCase());
    }
    if (params.tactic) {
      filtered = filtered.filter((e) => e.tactic.toLowerCase().includes(params.tactic.toLowerCase()));
    }

    return {
      total: filtered.length,
      events: filtered,
      last_updated: now,
    };
  },

  getNetworkGraph: async () => {
    const now = new Date().toISOString();
    return {
      nodes: [
        {
          id: 'user-014',
          label: 'User-014 (SecOps Analyst)',
          type: 'user',
          ip: '10.0.1.14',
          risk_score: 82,
          state: 'compromised',
          department: 'Security Operations',
          os: 'Windows 11 Enterprise',
          observed_activity: 'Privilege escalation via token impersonation',
          predicted_action: 'Lateral scan across internal management subnet',
          active_connections: 3,
          is_in_attack_path: true,
        },
        {
          id: 'user-009',
          label: 'User-009 (DevOps Eng)',
          type: 'user',
          ip: '10.0.1.9',
          risk_score: 15,
          state: 'normal',
          department: 'Engineering',
          os: 'macOS Sonoma',
          observed_activity: 'Standard GitLab authentication',
          predicted_action: 'No suspicious pattern',
          active_connections: 2,
          is_in_attack_path: false,
        },
        {
          id: 'endpoint-07',
          label: 'Endpoint-07 (Workstation)',
          type: 'endpoint',
          ip: '10.0.2.7',
          risk_score: 86,
          state: 'compromised',
          department: 'SecOps Floor',
          os: 'Windows 10 Pro',
          observed_activity: 'Seeding SMB SYN packets and RPC enumeration',
          predicted_action: 'Lateral Movement to Server-03 in T+1',
          active_connections: 5,
          is_in_attack_path: true,
        },
        {
          id: 'endpoint-12',
          label: 'Endpoint-12 (Build Node)',
          type: 'endpoint',
          ip: '10.0.2.12',
          risk_score: 12,
          state: 'normal',
          department: 'Engineering',
          os: 'Ubuntu 22.04 LTS',
          observed_activity: 'Routine compile tasks',
          predicted_action: 'Normal telemetry profile',
          active_connections: 3,
          is_in_attack_path: false,
        },
        {
          id: 'server-03',
          label: 'Server-03 (Domain Controller / App)',
          type: 'server',
          ip: '10.0.3.3',
          risk_score: 68,
          state: 'suspicious',
          department: 'Core Infrastructure',
          os: 'Windows Server 2022',
          observed_activity: 'Listening on RPC/SMB; unauthenticated probes detected',
          predicted_action: 'Target of T+1 Lateral Movement',
          active_connections: 9,
          is_in_attack_path: false,
        },
        {
          id: 'database-02',
          label: 'Database-02 (Customer & Auth DB)',
          type: 'database',
          ip: '10.0.4.2',
          risk_score: 45,
          state: 'target',
          department: 'Production Database Subnet',
          os: 'PostgreSQL 16 Enterprise',
          observed_activity: 'Normal query throughput from app cluster',
          predicted_action: 'Target of T+2 Credential Extraction',
          active_connections: 6,
          is_in_attack_path: false,
        },
        {
          id: 'gateway-01',
          label: 'Gateway-01 (Border Firewall / Proxy)',
          type: 'gateway',
          ip: '10.0.0.1',
          risk_score: 35,
          state: 'normal',
          department: 'Perimeter Network',
          os: 'Palo Alto PAN-OS 11',
          observed_activity: 'Normal NAT routing and egress filtering',
          predicted_action: 'Predicted T+3 Exfiltration bottleneck',
          active_connections: 38,
          is_in_attack_path: false,
        },
      ],
      edges: [
        { id: 'e1', source: 'user-014', target: 'endpoint-07', protocol: 'RDP/TLS', port: 3389, traffic_volume: '11.8 MB', is_attack_path: true, is_forecasted_path: false, status: 'active' },
        { id: 'e2', source: 'endpoint-07', target: 'server-03', protocol: 'SMB/RPC', port: 445, traffic_volume: '42.3 MB', is_attack_path: false, is_forecasted_path: true, status: 'forecasted' },
        { id: 'e3', source: 'server-03', target: 'database-02', protocol: 'TCP/SQL', port: 5432, traffic_volume: '18.9 MB', is_attack_path: false, is_forecasted_path: true, status: 'forecasted' },
        { id: 'e4', source: 'database-02', target: 'gateway-01', protocol: 'HTTPS/DNS', port: 443, traffic_volume: '0.8 MB', is_attack_path: false, is_forecasted_path: true, status: 'forecasted' },
        { id: 'e5', source: 'user-009', target: 'endpoint-12', protocol: 'SSH', port: 22, traffic_volume: '6.1 MB', is_attack_path: false, is_forecasted_path: false, status: 'monitored' },
        { id: 'e6', source: 'endpoint-12', target: 'gateway-01', protocol: 'HTTPS', port: 443, traffic_volume: '25.4 MB', is_attack_path: false, is_forecasted_path: false, status: 'monitored' },
      ],
      attack_path_node_ids: ['user-014', 'endpoint-07'],
      forecasted_path_node_ids: ['endpoint-07', 'server-03', 'database-02', 'gateway-01'],
      high_risk_nodes_count: 2,
      last_updated: now,
    };
  },

  getNetworkActivity: async () => {
    const now = new Date().toISOString();
    return {
      traffic_series: [
        { time: '15:00', bytes_in_mbps: 110.2, bytes_out_mbps: 95.4, anomalous_mbps: 1.2 },
        { time: '15:05', bytes_in_mbps: 115.8, bytes_out_mbps: 98.1, anomalous_mbps: 2.0 },
        { time: '15:10', bytes_in_mbps: 122.4, bytes_out_mbps: 104.3, anomalous_mbps: 3.5 },
        { time: '15:15', bytes_in_mbps: 130.1, bytes_out_mbps: 112.0, anomalous_mbps: 8.9 },
        { time: '15:20', bytes_in_mbps: 145.6, bytes_out_mbps: 138.4, anomalous_mbps: 18.4 },
        { time: '15:25', bytes_in_mbps: 158.2, bytes_out_mbps: 152.0, anomalous_mbps: 29.1 },
        { time: '15:30', bytes_in_mbps: 164.5, bytes_out_mbps: 160.2, anomalous_mbps: 38.7 },
      ],
      auth_series: [
        { time: '15:00', successful_logins: 42, failed_logins: 1, privilege_escalations: 0 },
        { time: '15:05', successful_logins: 44, failed_logins: 2, privilege_escalations: 0 },
        { time: '15:10', successful_logins: 49, failed_logins: 5, privilege_escalations: 1 },
        { time: '15:15', successful_logins: 53, failed_logins: 9, privilege_escalations: 1 },
        { time: '15:20', successful_logins: 58, failed_logins: 18, privilege_escalations: 2 },
        { time: '15:25', successful_logins: 61, failed_logins: 24, privilege_escalations: 3 },
        { time: '15:30', successful_logins: 66, failed_logins: 32, privilege_escalations: 4 },
      ],
      risk_trend: [
        { time: '15:00', risk_score: 22, threat_events: 0 },
        { time: '15:05', risk_score: 28, threat_events: 1 },
        { time: '15:10', risk_score: 42, threat_events: 2 },
        { time: '15:15', risk_score: 58, threat_events: 3 },
        { time: '15:20', risk_score: 71, threat_events: 5 },
        { time: '15:25', risk_score: 78, threat_events: 8 },
        { time: '15:30', risk_score: 84, threat_events: 11 },
      ],
      last_updated: now,
    };
  },

  getForecast: async () => {
    const now = new Date().toISOString();
    return {
      current_state: {
        stage_id: 'stage-obs-1',
        horizon: 'T_0',
        stage_name: 'Privilege Escalation',
        tactic: 'TA0004 - Privilege Escalation',
        technique_id: 'T1134.001 (Token Impersonation / SeDebugPrivilege)',
        state_type: 'observed',
        confidence: 1.0,
        estimated_time_to_impact: 'Current Active State',
        affected_nodes: ['User-014 (SecOps)', 'Endpoint-07 (10.0.2.7)'],
        recommended_mitigation: 'Isolate Endpoint-07 host network adapter; revoke Kerberos TGT ticket for User-014.',
        description: 'Process token manipulation detected on Endpoint-07 workstation elevating User-014 context to SYSTEM.',
        probability_distribution: { 'Privilege Escalation': 1.0 },
      },
      future_stages: [
        {
          stage_id: 'stage-f-1',
          horizon: 'T+1',
          stage_name: 'Lateral Movement',
          tactic: 'TA0008 - Lateral Movement',
          technique_id: 'T1021.002 (SMB/RPC Cross-Subnet Propagation)',
          state_type: 'forecasted',
          confidence: 0.88,
          estimated_time_to_impact: 'T + 12 minutes',
          affected_nodes: ['Endpoint-07 (10.0.2.7)', 'Server-03 (10.0.3.3)'],
          recommended_mitigation: 'Block port 445 SMB routing between SecOps floor and Infrastructure server subnets.',
          description: 'LSTM-B predicts that elevated credentials will be used to establish authenticated RPC/SMB sessions onto Server-03 within 12 minutes.',
          probability_distribution: {
            'Lateral Movement': 0.88,
            Discovery: 0.08,
            Persistence: 0.04,
          },
        },
        {
          stage_id: 'stage-f-2',
          horizon: 'T+2',
          stage_name: 'Credential Access',
          tactic: 'TA0006 - Credential Access',
          technique_id: 'T1003 (OS Credential Dumping)',
          state_type: 'forecasted',
          confidence: 0.82,
          estimated_time_to_impact: 'T + 25 minutes',
          affected_nodes: ['Server-03 (10.0.3.3)', 'Database-02 (10.0.4.2)'],
          recommended_mitigation: 'Enforce Protected Users security group restrictions and enable LSA protection.',
          description: 'Targeting domain administrator cached credentials to unlock high-security database clusters.',
          probability_distribution: {
            'Credential Access': 0.82,
            'Defense Evasion': 0.12,
            Collection: 0.06,
          },
        },
        {
          stage_id: 'stage-f-3',
          horizon: 'T+3',
          stage_name: 'Data Exfiltration',
          tactic: 'TA0010 - Exfiltration',
          technique_id: 'T1048 (Alternative Protocol Egress)',
          state_type: 'forecasted',
          confidence: 0.76,
          estimated_time_to_impact: 'T + 40 minutes',
          affected_nodes: ['Gateway-01 (10.0.0.1)', 'External C2'],
          recommended_mitigation: 'Pre-emptively restrict outbound file transfers exceeding 10MB to unknown external endpoints.',
          description: 'Adversary objective is exfiltration of database credentials and customer records through the perimeter gateway.',
          probability_distribution: {
            Exfiltration: 0.76,
            Impact: 0.16,
            Persistence: 0.08,
          },
        },
      ],
      summary_narrative:
        "Adversary achieved Privilege Escalation on Endpoint-07. ThreatCast AI's temporal graph model forecasts a K=3 trajectory: Lateral Movement to Server-03 (88% in 12m), followed by Credential Access (82% in 25m), culminating in Data Exfiltration (76% in 40m).",
      model_used: 'LSTM-B (Graph FastRP Temporal Model)',
      graph_context: 'High graph centrality of Endpoint-07 creates a direct shortest-path traversal vector to Domain Controller Server-03.',
      last_updated: now,
    };
  },

  getForecastComparison: async () => {
    const now = new Date().toISOString();
    return {
      lstm_a: {
        name: 'LSTM-A (Baseline)',
        feature_type: 'Flat / Windowed Statistical Features',
        architecture: '2-Layer Bidirectional LSTM (Hidden Size: 128)',
        prediction: 'Lateral Movement (Isolated)',
        confidence: 0.74,
        stability: 'Moderate (Fluctuates with noise)',
        false_positive_rate: '8.4%',
        latency_ms: 12.5,
        graph_awareness: 'None (Treats events as independent time series)',
        key_advantage: 'Fast computational throughput on raw flow records.',
      },
      lstm_b: {
        name: 'LSTM-B (ThreatCast AI Innovation)',
        feature_type: 'Graph FastRP Embeddings + Temporal Windows',
        architecture: 'Graph-Augmented LSTM (FastRP 128-dim + LSTM 256)',
        prediction: 'Multi-Stage Progression: Lateral Movement -> Credential Access -> Exfiltration',
        confidence: 0.89,
        stability: 'High (Grounded in topological network structure)',
        false_positive_rate: '2.1%',
        latency_ms: 18.2,
        graph_awareness: 'Full (Encodes 14-hop graph neighborhood & node centrality)',
        key_advantage: 'Anticipates multi-step attacker paths by understanding asset relationships before lateral hops occur.',
      },
      divergence_analysis:
        "While baseline LSTM-A only observes isolated frequency spikes in port 445 traffic and predicts a generic connection anomaly (74% confidence), ThreatCast AI's LSTM-B incorporates Neo4j FastRP topological embeddings. It recognizes that User-014 and Endpoint-07 share a direct administrative path to Domain Controller Server-03, boosting forecast confidence to 89% and forecasting a 3-step progression.",
      advantage_note:
        'Graph FastRP embeddings reduce false positives by 75% compared to flat statistical models because structural network context prevents benign maintenance scripts from being misclassified as lateral movement.',
      evaluation_benchmark: 'DAPT2020 & LANL Authentication Benchmark Suite',
      last_updated: now,
    };
  },

  getRules: async () => ({
    total_rules: 5,
    rules: [
      {
        id: 'rule-01',
        name: 'TCP SYN Port Sweep Detector',
        category: 'Reconnaissance & Discovery',
        pattern: 'COUNT(SYN_PACKETS) > 30 / 3s per Source IP across unique ports',
        severity: 'Medium',
        status: 'Active (Triggered)',
        triggers_last_24h: 14,
      },
      {
        id: 'rule-02',
        name: 'Brute-Force Authentication Spike',
        category: 'Credential Access',
        pattern: 'COUNT(AUTH_FAILED) >= 5 / 60s for single account',
        severity: 'High',
        status: 'Active (Triggered)',
        triggers_last_24h: 3,
      },
      {
        id: 'rule-03',
        name: 'Volumetric Data Egress Threshold',
        category: 'Exfiltration',
        pattern: 'SUM(BYTES_OUT) > 500MB / 5min to unwhitelisted external CIDR',
        severity: 'Critical',
        status: 'Active (Monitoring)',
        triggers_last_24h: 1,
      },
      {
        id: 'rule-04',
        name: 'Administrative Share (IPC$/C$) Access',
        category: 'Lateral Movement',
        pattern: 'SMB_TREE_CONNECT to IPC$, ADMIN$, C$ from non-admin subnet',
        severity: 'High',
        status: 'Active (Triggered)',
        triggers_last_24h: 7,
      },
      {
        id: 'rule-05',
        name: 'PowerShell Suspicious Parameter Detector',
        category: 'Execution & Defense Evasion',
        pattern: "MATCH(CommandLine, '-enc|-EncodedCommand|-w hidden|-nop')",
        severity: 'Critical',
        status: 'Active (Triggered)',
        triggers_last_24h: 2,
      },
    ],
  }),

  getDisagreements: async () => {
    const now = new Date().toISOString();
    return {
      total_disagreements: 2,
      disagreements: [
        {
          id: 'dis-01',
          timestamp: '15:31:00',
          model_prediction: 'Multi-Stage Lateral Movement Campaign',
          model_confidence: 0.88,
          model_architecture: 'LSTM-B (Graph FastRP Features)',
          rule_name: 'TCP SYN Port Sweep Detector',
          rule_output: 'Port Scan (Severity: Medium)',
          rule_severity: 'Medium',
          status: 'Disagreement',
          why_it_matters:
            "Traditional rule engine classified the activity as a low/medium priority port scan. ThreatCast AI's Graph model integrated user privilege escalation context and topological proximity to Server-03, correctly forecasting a high-risk Lateral Movement attack progression.",
          observed_signals: [
            'Targeted SYN probes strictly directed at Domain Controller ports (135, 445, 3389)',
            'Preceded by Token Impersonation (SeDebugPrivilege) on User-014 context',
            'Graph centrality of Endpoint-07 indicates direct vector to Core Infrastructure',
          ],
          network_context: 'Endpoint-07 (10.0.2.7) -> Server-03 (10.0.3.3)',
          recommended_action: 'Isolate Endpoint-07 host network adapter; block SMB port 445 cross-subnet relay to Server-03.',
          target_node: 'Endpoint-07 (10.0.2.7)',
        },
        {
          id: 'dis-02',
          timestamp: '15:28:15',
          model_prediction: 'Kerberoasting & Offline Hash Cracking',
          model_confidence: 0.84,
          model_architecture: 'LSTM-B (Graph FastRP Features)',
          rule_name: 'Brute-Force Authentication Spike',
          rule_output: 'No Alert (Threshold not met: 1 single TGS ticket request)',
          rule_severity: 'Low',
          status: 'Disagreement',
          why_it_matters:
            'Brute-force rules look for high-frequency failure counts. Kerberoasting requests only a single valid service ticket (TGS) with RC4 encryption to crack offline, evading naive frequency rules completely.',
          observed_signals: [
            'Service Ticket requested with downgrade encryption (RC4-HMAC-MD5)',
            'User-014 has never accessed MSSQL SPN in 90-day baseline',
          ],
          network_context: 'User-014 -> Server-03 (Domain Controller)',
          recommended_action: 'Rotate SPN service account passwords to AES-256 and enforce gMSA.',
          target_node: 'Server-03 (10.0.3.3)',
        },
      ],
      analytical_summary:
        'Model–Rule Disagreements provide a vital secondary telemetry layer. When deep graph models and deterministic rules diverge, it highlights attacks designed to evade static signature thresholds.',
      last_updated: now,
    };
  },

  getIncidents: async () => {
    const now = new Date().toISOString();
    return {
      total: 4,
      incidents: [
        {
          id: 'INC-8042',
          title: 'Coordinated Lateral Movement Campaign targeting Domain Controller',
          detected_at: '15:32:10',
          current_stage: 'Privilege Escalation (Observed)',
          predicted_progression: 'T+1: Lateral Movement -> T+2: Credential Access -> T+3: Exfiltration',
          affected_assets: ['User-014', 'Endpoint-07', 'Server-03'],
          risk_level: 'HIGH',
          risk_score: 88,
          status: 'Forecasted',
          model_confidence: 0.88,
          rule_result: 'TCP SYN Port Sweep (Medium)',
          has_disagreement: true,
          recommended_action:
            'Isolate Endpoint-07 host network adapter; revoke Kerberos TGT ticket for User-014; block SMB port 445 cross-subnet relay to Server-03.',
          timeline: [
            {
              time: '15:25:34',
              title: 'C2 Beaconing Detected',
              description: 'Outbound encrypted TLS beacons observed from Endpoint-07 to 198.51.100.42.',
              type: 'observed',
            },
            {
              time: '15:30:12',
              title: 'Port Scan Rule Matched',
              description: 'Deterministic Rule Engine flagged rapid TCP SYN packet burst across ports 135/445.',
              type: 'rule_alert',
            },
            {
              time: '15:32:10',
              title: 'Token Impersonation & Privilege Escalation',
              description: 'Endpoint telemetry confirmed SeDebugPrivilege enabled on lsass.exe process handle.',
              type: 'observed',
            },
            {
              time: '15:44:00 (Est.)',
              title: 'Forecasted T+1 Lateral Movement Hop',
              description: 'LSTM-B predicts 88% likelihood of SMB/RPC administrative share access on Server-03.',
              type: 'forecasted',
            },
          ],
          containment_playbook: [
            'Step 1: Execute automated host isolation script for Endpoint-07.',
            'Step 2: Force global revocation of Kerberos Ticket Granting Tickets (TGT) for User-014 in Active Directory.',
            'Step 3: Apply micro-segmentation firewall rule dropping port 445/135 between Subnet 10.0.2.0/24 and 10.0.3.0/24.',
            'Step 4: Enable Enhanced LSASS Audit Logging on Domain Controller Server-03.',
          ],
        },
        {
          id: 'INC-8041',
          title: 'Kerberoasting & Offline Hash Extraction Attempt',
          detected_at: '15:28:50',
          current_stage: 'Credential Access (Observed)',
          predicted_progression: 'T+1: Offline Hash Cracking -> T+2: Elevated DB Access',
          affected_assets: ['User-014', 'Server-03'],
          risk_level: 'HIGH',
          risk_score: 79,
          status: 'Investigating',
          model_confidence: 0.84,
          rule_result: 'Threshold Suppressed (1 TGS request)',
          has_disagreement: true,
          recommended_action: 'Rotate SPN MSSQLSvc/db02.prod password to 32+ character random string.',
          timeline: [
            {
              time: '15:28:50',
              title: 'TGS Ticket Request with RC4 Cipher',
              description: 'User-014 requested ticket for database service account using legacy encryption cipher.',
              type: 'observed',
            },
          ],
          containment_playbook: ['Step 1: Rotate service account password immediately.'],
        },
      ],
      last_updated: now,
    };
  },

  getIncident: async (id) => {
    const list = await fallbackProvider.getIncidents();
    const inc = list.incidents.find((i) => i.id.toUpperCase() === id.toUpperCase()) || list.incidents[0];
    return { incident: inc };
  },

  getExplainability: async (id) => {
    const now = new Date().toISOString();
    return {
      incident_id: id,
      predicted_stage: 'Lateral Movement (T+1)',
      confidence: 0.88,
      observed_stage: 'Privilege Escalation (T_0)',
      forecast_reasoning:
        'ThreatCast AI forecasted Lateral Movement from Endpoint-07 to Server-03 because: (1) User-014 enabled SeDebugPrivilege on Endpoint-07, (2) Graph FastRP embeddings place Server-03 within 1 topological hop over high-trust RPC/SMB channels, and (3) Temporal sequencing models observe that 92.4% of privilege escalations on domain workstations are followed by administrative share enumeration.',
      graph_proximity_score: 0.89,
      temporal_sequence_alignment: 0.92,
      fastrp_embedding_note:
        'FastRP 128-dimensional topological node embeddings derived from 3-hop random walks on Neo4j identity & asset topology.',
      contributing_signals: [
        {
          signal_name: 'Privilege Escalation & Token Impersonation',
          category: 'Host Security Telemetry',
          weight: 0.92,
          direction: 'supports_prediction',
          source_evidence: 'Process lsass.exe opened with PROCESS_ALL_ACCESS rights by elevated user token on Endpoint-07',
          metric_value: 'SeDebugPrivilege Active',
        },
        {
          signal_name: 'FastRP Topological Graph Proximity',
          category: 'Graph Representation (FastRP)',
          weight: 0.86,
          direction: 'supports_prediction',
          source_evidence: 'Neo4j FastRP vector similarity between Endpoint-07 and Domain Controller Server-03 is 0.89',
          metric_value: 'Cosine Distance: 0.11',
        },
        {
          signal_name: 'Targeted RPC / SMB Port Probing',
          category: 'Network Flow Telemetry',
          weight: 0.81,
          direction: 'supports_prediction',
          source_evidence: '45 SYN packets targeted exclusively at ports 135/445 on Domain Controller IP 10.0.3.3',
          metric_value: '45 SYNs / 2 seconds',
        },
        {
          signal_name: 'Authentication Anomaly (Off-Hours Kerberos TGS)',
          category: 'Identity & Access Management',
          weight: 0.74,
          direction: 'supports_prediction',
          source_evidence: 'RC4 cipher downgrade requested for MSSQL service ticket outside working hours',
          metric_value: 'Risk Score: 78/100',
        },
        {
          signal_name: 'Temporal Sequence Alignment',
          category: 'Temporal AI Model (LSTM-B)',
          weight: 0.85,
          direction: 'supports_prediction',
          source_evidence: 'Prior states: [Initial Access, Persistence, Privilege Escalation] -> Next: Lateral Movement',
          metric_value: 'Transition Probability: 88%',
        },
      ],
      subgraph_nodes: ['User-014', 'Endpoint-07', 'Server-03', 'Database-02'],
      subgraph_edges: [
        'User-014 -[LOGGED_IN_TO]-> Endpoint-07',
        'Endpoint-07 -[ADMIN_PROBE_SMB]-> Server-03',
        'Server-03 -[SERVICE_LINK]-> Database-02',
      ],
      last_updated: now,
    };
  },

  simulateAttack: async (scenario = 'lateral_movement_wave') => {
    activeScenario = scenario;
    const summary = await fallbackProvider.getDashboardSummary();
    return {
      status: 'success',
      message: `Applied attack simulation scenario '${scenario}' to ThreatCast AI pipeline.`,
      active_scenario: scenario,
      threat_level: summary.threat_level,
      current_stage: summary.current_stage,
      forecast_horizon: summary.forecast_horizon,
      last_updated: summary.last_updated,
    };
  },

  resetSimulation: async () => {
    activeScenario = 'default';
    const summary = await fallbackProvider.getDashboardSummary();
    return {
      status: 'success',
      message: 'ThreatCast AI state reset to baseline.',
      active_scenario: 'default',
      threat_level: summary.threat_level,
      current_stage: summary.current_stage,
      forecast_horizon: summary.forecast_horizon,
      last_updated: summary.last_updated,
    };
  },
};
