export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', path: '/', icon: 'LayoutDashboard' },
  { id: 'live-network', label: 'Live Network', path: '/live-network', icon: 'Activity' },
  { id: 'forecast', label: 'Attack Forecast', path: '/forecast', icon: 'TrendingUp' },
  { id: 'network-graph', label: 'Network Graph', path: '/network-graph', icon: 'Network' },
  { id: 'disagreements', label: 'Disagreements', path: '/disagreements', icon: 'GitCompare' },
  { id: 'incidents', label: 'Incidents', path: '/incidents', icon: 'ShieldAlert' },
  { id: 'explainability', label: 'Explainability', path: '/explainability', icon: 'Sparkles' },
];

export const MITRE_TACTICS = [
  'Initial Access',
  'Execution',
  'Persistence',
  'Privilege Escalation',
  'Defense Evasion',
  'Credential Access',
  'Discovery',
  'Lateral Movement',
  'Collection',
  'Command and Control',
  'Exfiltration',
  'Impact',
];

export const SCENARIOS = [
  {
    id: 'default',
    name: 'Standard Baseline Scenario',
    description: 'Privilege escalation on SecOps floor workstation; T+1 forecast to lateral propagation.',
    badge: 'Baseline',
    color: 'border-soc-slate-200 hover:border-soc-ai',
  },
  {
    id: 'lateral_movement_wave',
    name: 'Active Lateral Movement Wave',
    description: 'Compromised endpoint aggressively traversing domain controller via SMB/RPC admin shares.',
    badge: 'Critical Wave',
    color: 'border-soc-warning hover:border-soc-threat',
  },
  {
    id: 'exfiltration_crisis',
    name: 'Imminent Data Exfiltration Crisis',
    description: '12.4GB customer DB archive staged; K=3 forecast predicts external egress in <4 minutes.',
    badge: 'Emergency',
    color: 'border-soc-threat-border hover:border-soc-threat',
  },
  {
    id: 'ransomware_staging',
    name: 'Ransomware Staging & Anti-Forensics',
    description: 'Shadow copy destruction and mass encryption staging across critical infrastructure.',
    badge: 'High Impact',
    color: 'border-purple-200 hover:border-purple-500',
  },
];
