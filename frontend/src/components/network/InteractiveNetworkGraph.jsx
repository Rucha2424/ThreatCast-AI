import React, { useState } from 'react';
import {
  User,
  Laptop,
  Server,
  Database,
  Shield,
  Zap,
  Activity,
  Network,
  Cpu,
  Lock,
  Flame,
  Info,
  Sparkles,
} from 'lucide-react';
import InfoTooltip from '../common/InfoTooltip';

const SCENARIO_COORDINATES = {
  default: {
    'user-014': { x: 130, y: 140 },
    'user-009': { x: 130, y: 350 },
    'endpoint-07': { x: 350, y: 150 },
    'endpoint-12': { x: 350, y: 350 },
    'server-03': { x: 570, y: 170 },
    'database-02': { x: 760, y: 270 },
    'gateway-01': { x: 620, y: 410 },
  },
  lateral_movement_wave: {
    'user-014': { x: 110, y: 220 },
    'user-009': { x: 130, y: 390 },
    'endpoint-07': { x: 320, y: 220 },
    'endpoint-12': { x: 330, y: 390 },
    'server-03': { x: 550, y: 220 },
    'database-02': { x: 740, y: 160 },
    'gateway-01': { x: 740, y: 340 },
  },
  exfiltration_crisis: {
    'user-014': { x: 110, y: 130 },
    'user-009': { x: 110, y: 370 },
    'endpoint-07': { x: 290, y: 150 },
    'endpoint-12': { x: 290, y: 370 },
    'server-03': { x: 480, y: 190 },
    'database-02': { x: 670, y: 230 },
    'gateway-01': { x: 810, y: 320 },
  },
  ransomware_staging: {
    'user-014': { x: 160, y: 140 },
    'user-009': { x: 160, y: 340 },
    'endpoint-07': { x: 380, y: 160 },
    'endpoint-12': { x: 360, y: 370 },
    'server-03': { x: 580, y: 240 },
    'database-02': { x: 750, y: 240 },
    'gateway-01': { x: 600, y: 410 },
  },
};

const ICON_MAP = {
  user: User,
  endpoint: Laptop,
  server: Server,
  database: Database,
  gateway: Shield,
};

const DEFAULT_GRAPH_DATA = {
  nodes: [
    { id: 'user-014', label: 'User-014 (SecOps Analyst)', type: 'user', ip: '10.0.1.14', risk_score: 82, state: 'compromised', department: 'Security Operations', os: 'Windows 11', observed_activity: 'Privilege escalation via token impersonation', predicted_action: 'Lateral scan across internal subnet', active_connections: 3, is_in_attack_path: true },
    { id: 'user-009', label: 'User-009 (DevOps)', type: 'user', ip: '10.0.1.9', risk_score: 15, state: 'normal', department: 'Engineering', os: 'macOS', observed_activity: 'GitLab auth', predicted_action: 'Normal', active_connections: 2, is_in_attack_path: false },
    { id: 'endpoint-07', label: 'Endpoint-07 (Workstation)', type: 'endpoint', ip: '10.0.2.7', risk_score: 86, state: 'compromised', department: 'SecOps Floor', os: 'Windows 10', observed_activity: 'Seeding SMB SYN packets and RPC probes', predicted_action: 'Lateral Movement to Server-03 in T+1', active_connections: 5, is_in_attack_path: true },
    { id: 'endpoint-12', label: 'Endpoint-12 (Build Node)', type: 'endpoint', ip: '10.0.2.12', risk_score: 12, state: 'normal', department: 'Engineering', os: 'Ubuntu', observed_activity: 'Routine compile', predicted_action: 'Normal', active_connections: 3, is_in_attack_path: false },
    { id: 'server-03', label: 'Server-03 (Domain Controller)', type: 'server', ip: '10.0.3.3', risk_score: 68, state: 'suspicious', department: 'Core Infra', os: 'Win Server 2022', observed_activity: 'Listening on RPC/SMB; unauthenticated probes', predicted_action: 'Target of T+1 Lateral Movement', active_connections: 9, is_in_attack_path: false },
    { id: 'database-02', label: 'Database-02 (Customer DB)', type: 'database', ip: '10.0.4.2', risk_score: 45, state: 'target', department: 'DB Subnet', os: 'PostgreSQL 16', observed_activity: 'Normal query throughput', predicted_action: 'Target of T+2 Credential Extraction', active_connections: 6, is_in_attack_path: false },
    { id: 'gateway-01', label: 'Gateway-01 (Firewall)', type: 'gateway', ip: '10.0.0.1', risk_score: 35, state: 'normal', department: 'Perimeter', os: 'PAN-OS 11', observed_activity: 'Normal routing', predicted_action: 'Target of T+3 Exfiltration', active_connections: 38, is_in_attack_path: false },
  ],
  edges: [
    { id: 'e1', source: 'user-014', target: 'endpoint-07', protocol: 'RDP/TLS', port: 3389, traffic_volume: '11.8 MB', is_attack_path: true, is_forecasted_path: false, status: 'active' },
    { id: 'e2', source: 'endpoint-07', target: 'server-03', protocol: 'SMB/RPC', port: 445, traffic_volume: '42.3 MB', is_attack_path: false, is_forecasted_path: true, status: 'forecasted' },
    { id: 'e3', source: 'server-03', target: 'database-02', protocol: 'TCP/SQL', port: 5432, traffic_volume: '18.9 MB', is_attack_path: false, is_forecasted_path: true, status: 'forecasted' },
    { id: 'e4', source: 'database-02', target: 'gateway-01', protocol: 'HTTPS/DNS', port: 443, traffic_volume: '0.8 MB', is_attack_path: false, is_forecasted_path: true, status: 'forecasted' },
  ],
  attack_path_node_ids: ['user-014', 'endpoint-07'],
  forecasted_path_node_ids: ['endpoint-07', 'server-03', 'database-02', 'gateway-01'],
};

export default function InteractiveNetworkGraph({
  graphData,
  selectedNodeId,
  onSelectNode,
  compact = false,
  activeScenario = 'default',
}) {
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  const effectiveData = graphData?.nodes?.length ? graphData : DEFAULT_GRAPH_DATA;

  const {
    nodes = [],
    edges = [],
    attack_path_node_ids = [],
    forecasted_path_node_ids = [],
  } = effectiveData;

  const coordsMap =
    SCENARIO_COORDINATES[activeScenario] || SCENARIO_COORDINATES.default;

  const viewBox = compact ? '0 0 920 500' : '0 0 920 520';

  return (
    <div className="relative w-full bg-cyber-black rounded-2xl overflow-hidden border border-slate-800 shadow-soc-card select-none group space-y-2">
      {/* Subtle Dot Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

      {/* Top Explanation & Legend Bar */}
      <div className="p-4 bg-cyber-surface/95 backdrop-blur-md border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4" />
          </span>
          <div>
            <span className="text-white font-bold text-xs sm:text-sm">What This Map Shows: </span>
            <span className="text-slate-400 text-xs sm:text-sm">
              Active compromised systems and the future trajectory predicted by ThreatCast AI.
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3.5 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Normal
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Suspicious
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-500/30" /> Compromised
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-4 h-0.5 bg-rose-500" /> Active Vector
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-4 h-0.5 border-b-2 border-dashed border-sky-400" /> Predicted Path
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        viewBox={viewBox}
        className="w-full h-auto cursor-default"
        style={{ minHeight: compact ? '320px' : '480px' }}
      >
        <defs>
          {/* Active Gradient & Marker */}
          <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>

          <linearGradient id="forecastGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>

          <marker
            id="arrowActive"
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
          </marker>

          <marker
            id="arrowForecast"
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
          </marker>

          <filter id="glowActive" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Normal / Background Edges */}
        {edges.map((edge, idx) => {
          const src = coordsMap[edge.source];
          const tgt = coordsMap[edge.target];
          if (!src || !tgt) return null;

          const isAttackEdge = edge.is_attack_path;
          const isForecastEdge = edge.is_forecasted_path;

          if (isAttackEdge || isForecastEdge) return null;

          return (
            <g key={edge.id || `${edge.source}-${edge.target}-${idx}`}>
              <line
                x1={src.x}
                y1={src.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke="#1e293b"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.8"
              />
            </g>
          );
        })}

        {/* 2. Forecasted Path Edges (T+1..3) */}
        {edges.map((edge, idx) => {
          const src = coordsMap[edge.source];
          const tgt = coordsMap[edge.target];
          if (!src || !tgt) return null;

          const isForecastEdge = edge.is_forecasted_path;
          if (!isForecastEdge) return null;

          return (
            <g key={edge.id || `forecast-${edge.source}-${edge.target}-${idx}`}>
              <line
                x1={src.x}
                y1={src.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke="url(#forecastGrad)"
                strokeWidth="3"
                strokeDasharray="6 4"
                markerEnd="url(#arrowForecast)"
                className="animate-pulse"
                opacity="0.95"
              />
              {/* Midpoint Label */}
              <text
                x={(src.x + tgt.x) / 2}
                y={(src.y + tgt.y) / 2 - 8}
                fill="#38bdf8"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                Predicted Next Hop
              </text>
            </g>
          );
        })}

        {/* 3. Active Observed Attack Edges (T_0) */}
        {edges.map((edge, idx) => {
          const src = coordsMap[edge.source];
          const tgt = coordsMap[edge.target];
          if (!src || !tgt) return null;

          const isAttackEdge = edge.is_attack_path;
          if (!isAttackEdge) return null;

          return (
            <g key={edge.id || `active-${edge.source}-${edge.target}-${idx}`}>
              <line
                x1={src.x}
                y1={src.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke="url(#activeGrad)"
                strokeWidth="3.5"
                markerEnd="url(#arrowActive)"
                filter="url(#glowActive)"
              />
              {/* Active Traversing Pulse */}
              <circle r="4" fill="#ef4444">
                <animateMotion
                  path={`M ${src.x} ${src.y} L ${tgt.x} ${tgt.y}`}
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          );
        })}

        {/* 4. Nodes */}
        {nodes.map((node) => {
          const coords = coordsMap[node.id];
          if (!coords) return null;

          const isSelected = selectedNodeId === node.id;
          const isHovered = hoveredNodeId === node.id;
          const isInAttackPath = attack_path_node_ids.includes(node.id);
          const isInForecastPath = forecasted_path_node_ids.includes(node.id);

          const isCompromised = node.state === 'compromised';
          const isSuspicious = node.state === 'suspicious';

          let nodeFill = '#0d121c';
          let nodeStroke = '#334155';
          let ringColor = 'transparent';

          if (isCompromised) {
            nodeFill = '#1c0d0d';
            nodeStroke = '#ef4444';
            ringColor = 'rgba(239, 68, 68, 0.35)';
          } else if (isSuspicious || isInForecastPath) {
            nodeFill = '#1c160d';
            nodeStroke = '#f59e0b';
            ringColor = 'rgba(245, 158, 11, 0.25)';
          } else {
            nodeFill = '#0d121c';
            nodeStroke = '#10b981';
          }

          const IconComponent = ICON_MAP[node.type] || Laptop;

          return (
            <g
              key={node.id}
              className="cursor-pointer transition-transform duration-200"
              onClick={() => onSelectNode && onSelectNode(node)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
            >
              {/* Outer Pulse Ring for Compromised / Selected */}
              {(isCompromised || isSelected) && (
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r="30"
                  fill={ringColor}
                  className="animate-ping opacity-30"
                />
              )}

              {/* Node Outer Circle */}
              <circle
                cx={coords.x}
                cy={coords.y}
                r={isSelected ? '24' : isHovered ? '22' : '20'}
                fill={nodeFill}
                stroke={isSelected ? '#38bdf8' : nodeStroke}
                strokeWidth={isSelected ? '3.5' : '2.5'}
                className="transition-all duration-200"
              />

              {/* Node Center Icon */}
              <foreignObject
                x={coords.x - 10}
                y={coords.y - 10}
                width="20"
                height="20"
                className="pointer-events-none"
              >
                <div
                  className="w-full h-full flex items-center justify-center text-slate-200"
                >
                  <IconComponent className="w-4 h-4" />
                </div>
              </foreignObject>

              {/* Risk Badge on Node */}
              <g transform={`translate(${coords.x + 10}, ${coords.y - 18})`}>
                <rect
                  width="24"
                  height="16"
                  rx="5"
                  fill={isCompromised ? '#ef4444' : isSuspicious ? '#f59e0b' : '#10b981'}
                />
                <text
                  x="12"
                  y="11.5"
                  fill="#ffffff"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {node.risk_score}
                </text>
              </g>

              {/* Node Label Below */}
              <text
                x={coords.x}
                y={coords.y + 36}
                fill="#f8fafc"
                fontSize="12.5"
                fontFamily="sans-serif"
                fontWeight="bold"
                textAnchor="middle"
              >
                {node.label.split(' ')[0]}
              </text>

              {/* IP / Status Subtitle */}
              <text
                x={coords.x}
                y={coords.y + 50}
                fill="#94a3b8"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="600"
                textAnchor="middle"
              >
                {node.state.toUpperCase()} • {node.ip}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
