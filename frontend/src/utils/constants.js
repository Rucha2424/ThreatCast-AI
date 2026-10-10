export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', path: '/', icon: 'LayoutDashboard' },
  { id: 'live-network', label: 'Live Network', path: '/live-network', icon: 'Activity' },
  { id: 'forecast', label: 'Attack Forecast', path: '/forecast', icon: 'TrendingUp' },
  { id: 'network-graph', label: 'Network Graph', path: '/network-graph', icon: 'Network' },
  { id: 'disagreements', label: 'Disagreements', path: '/disagreements', icon: 'GitCompare' },
  { id: 'incidents', label: 'Incidents', path: '/incidents', icon: 'ShieldAlert' },
  { id: 'explainability', label: 'Explainability', path: '/explainability', icon: 'Sparkles' },
  { id: 'research-demo', label: 'Research Demo', path: '/research-demo', icon: 'Sparkles' },
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
    description: 'A workstation is compromised and attackers are about to move sideways.',
    badge: 'Baseline',
    color: 'border-soc-slate-200 hover:border-soc-ai',
  },
  {
    id: 'lateral_movement_wave',
    name: 'Active Lateral Movement Wave',
    description: 'An infected device is spreading across the network.',
    badge: 'Critical Wave',
    color: 'border-soc-warning hover:border-soc-threat',
  },
  {
    id: 'exfiltration_crisis',
    name: 'Imminent Data Exfiltration Crisis',
    description: 'A large data transfer is about to leave the network.',
    badge: 'Emergency',
    color: 'border-soc-threat-border hover:border-soc-threat',
  },
  {
    id: 'ransomware_staging',
    name: 'Ransomware Staging & Anti-Forensics',
    description: 'Files are being prepared for encryption — ransomware indicators detected.',
    badge: 'High Impact',
    color: 'border-purple-200 hover:border-purple-500',
  },
];
