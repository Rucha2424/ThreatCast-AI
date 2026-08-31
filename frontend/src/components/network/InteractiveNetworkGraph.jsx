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
} from 'lucide-react';

// Scenario-specific dynamic topological coordinates
const SCENARIO_COORDINATES = {
  // Default Constellation
  default: {
    'user-014': { x: 130, y: 140 },
    'user-009': { x: 130, y: 350 },
    'endpoint-07': { x: 350, y: 150 },
    'endpoint-12': { x: 350, y: 350 },
    'server-03': { x: 570, y: 170 },
    'database-02': { x: 760, y: 270 },
    'gateway-01': { x: 620, y: 410 },
  },
  // Lateral Movement Wave
  lateral_movement_wave: {
    'user-014': { x: 110, y: 220 },
    'user-009': { x: 130, y: 390 },
    'endpoint-07': { x: 320, y: 220 },
    'endpoint-12': { x: 330, y: 390 },
    'server-03': { x: 550, y: 220 },
    'database-02': { x: 740, y: 160 },
    'gateway-01': { x: 740, y: 340 },
  },
  // Exfiltration Crisis
  exfiltration_crisis: {
    'user-014': { x: 110, y: 130 },
    'user-009': { x: 110, y: 370 },
    'endpoint-07': { x: 290, y: 150 },
    'endpoint-12': { x: 290, y: 370 },
    'server-03': { x: 480, y: 190 },
    'database-02': { x: 670, y: 230 },
    'gateway-01': { x: 810, y: 320 },
  },
  // Ransomware Staging
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

export default function InteractiveNetworkGraph({
  graphData,
  selectedNodeId,
  onSelectNode,
  compact = false,
  activeScenario = 'default',
}) {
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  if (!graphData) return null;

  const {
    nodes = [],
    edges = [],
    attack_path_node_ids = [],
    forecasted_path_node_ids = [],
  } = graphData;

  const coordsMap =
    SCENARIO_COORDINATES[activeScenario] || SCENARIO_COORDINATES.default;

  const height = compact ? 380 : 560;
  const viewBox = compact ? '0 0 920 500' : '0 0 920 520';

  return (
    <div className="relative w-full bg-[#fdfcf9] rounded-2xl overflow-hidden border border-[#ebdcc7] shadow-sm select-none group">
      {/* Subtle Dot Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#ded0bc_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Top Legend Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-[#544230] bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-[#ebdcc7] shadow-xs">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[#382819] font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#65a30d]" /> Normal
          </span>
          <span className="flex items-center gap-1.5 text-[#382819] font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d97706]" /> Suspicious
          </span>
          <span className="flex items-center gap-1.5 text-[#c2410c] font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ea580c]" /> Compromised
          </span>
          <span className="flex items-center gap-1.5 text-[#b45309] font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Forecasted (T+1..3)
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[#b45309] font-semibold">
            <span className="w-5 h-1 bg-[#d97706] rounded-full" />
            Active Vector
          </span>
          <span className="flex items-center gap-1.5 text-[#7a644c] font-semibold">
            <span className="w-5 h-0.5 border-t-2 border-dashed border-[#d97706]" />
            Predicted Synapse
          </span>
        </div>
      </div>

      {/* SVG Topology Canvas */}
      <svg
        viewBox={viewBox}
        className="w-full h-full relative z-0"
        style={{ minHeight: `${height}px` }}
      >
        <defs>
          {/* Gradients for Edges */}
          <linearGradient id="grad-attack-light" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          <linearGradient id="grad-forecast-light" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>

          <linearGradient id="grad-normal-light" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ded0bc" />
            <stop offset="100%" stopColor="#ccbaa2" />
          </linearGradient>

          {/* Marker Arrows */}
          <marker id="marker-threat-light" markerWidth="9" markerHeight="9" refX="30" refY="4.5" orient="auto">
            <path d="M 0 1 L 8 4.5 L 0 8 z" fill="#ea580c" />
          </marker>

          <marker id="marker-forecast-light" markerWidth="9" markerHeight="9" refX="30" refY="4.5" orient="auto">
            <path d="M 0 1 L 8 4.5 L 0 8 z" fill="#d97706" />
          </marker>

          <marker id="marker-normal-light" markerWidth="7" markerHeight="7" refX="26" refY="3.5" orient="auto">
            <path d="M 0 1 L 6 3.5 L 0 6 z" fill="#ccbaa2" />
          </marker>
        </defs>

        {/* 1. Render Clean Connecting Edges */}
        {edges.map((edge) => {
          const sourceCoord = coordsMap[edge.source] || { x: 200, y: 200 };
          const targetCoord = coordsMap[edge.target] || { x: 450, y: 200 };

          const isAttack = edge.is_attack_path;
          const isForecast = edge.is_forecasted_path;

          const dx = targetCoord.x - sourceCoord.x;
          const dy = targetCoord.y - sourceCoord.y;
          const cx = (sourceCoord.x + targetCoord.x) / 2 - dy * 0.12;
          const cy = (sourceCoord.y + targetCoord.y) / 2 + dx * 0.12;

          const pathD = `M ${sourceCoord.x} ${sourceCoord.y} Q ${cx} ${cy} ${targetCoord.x} ${targetCoord.y}`;

          let stroke = 'url(#grad-normal-light)';
          let strokeWidth = 2;
          let markerEnd = 'url(#marker-normal-light)';
          let strokeDasharray = 'none';

          if (isAttack) {
            stroke = 'url(#grad-attack-light)';
            strokeWidth = 3.5;
            markerEnd = 'url(#marker-threat-light)';
            strokeDasharray = '8 4';
          } else if (isForecast) {
            stroke = 'url(#grad-forecast-light)';
            strokeWidth = 2.5;
            markerEnd = 'url(#marker-forecast-light)';
            strokeDasharray = '6 4';
          }

          const midX = (sourceCoord.x + targetCoord.x) / 2 + (cx - (sourceCoord.x + targetCoord.x) / 2) * 0.5;
          const midY = (sourceCoord.y + targetCoord.y) / 2 + (cy - (sourceCoord.y + targetCoord.y) / 2) * 0.5;

          return (
            <g key={edge.id} className="transition-all duration-500 ease-in-out">
              {/* Path */}
              <path
                d={pathD}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                markerEnd={markerEnd}
              />

              {/* Protocol Badge */}
              <rect
                x={midX - 30}
                y={midY - 10}
                width="60"
                height="20"
                rx="6"
                fill="#ffffff"
                stroke={isAttack ? '#ea580c' : isForecast ? '#d97706' : '#ded0bc'}
                strokeWidth="1.2"
                className="shadow-xs"
              />
              <text
                x={midX}
                y={midY + 3.5}
                fill={isAttack ? '#c2410c' : isForecast ? '#b45309' : '#7a644c'}
                fontSize="9.5"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
                fontWeight="bold"
              >
                {edge.protocol}
              </text>
            </g>
          );
        })}

        {/* 2. Render Topology Nodes */}
        {nodes.map((node) => {
          const coord = coordsMap[node.id] || { x: 450, y: 250 };
          const isSelected = selectedNodeId === node.id;
          const isHovered = hoveredNodeId === node.id;
          const isInAttackPath = attack_path_node_ids.includes(node.id);
          const isForecastTarget = forecasted_path_node_ids.includes(node.id);

          const Icon = ICON_MAP[node.type] || Server;

          let ringColor = '#ded0bc';
          let bgColor = '#ffffff';
          let iconColor = '#544230';

          if (node.state === 'compromised' || isInAttackPath) {
            ringColor = '#ea580c';
            bgColor = '#fff7ed';
            iconColor = '#c2410c';
          } else if (node.state === 'suspicious') {
            ringColor = '#d97706';
            bgColor = '#fffbeb';
            iconColor = '#b45309';
          } else if (node.state === 'target' || isForecastTarget) {
            ringColor = '#f59e0b';
            bgColor = '#fefce8';
            iconColor = '#92400e';
          } else {
            ringColor = '#84cc16';
            bgColor = '#f7fee7';
            iconColor = '#4d7c0f';
          }

          return (
            <g
              key={node.id}
              onClick={() => onSelectNode && onSelectNode(node)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              className="cursor-pointer transition-all duration-500 ease-in-out"
              transform={`translate(${coord.x}, ${coord.y})`}
            >
              {/* Selected Ring */}
              {isSelected && (
                <circle
                  r="34"
                  fill="none"
                  stroke="#b45309"
                  strokeWidth="2.5"
                  strokeDasharray="5 3"
                />
              )}

              {/* Node Base Circle */}
              <circle
                r="24"
                fill={bgColor}
                stroke={ringColor}
                strokeWidth={isSelected ? 3 : 2}
                className="shadow-sm transition-all duration-200"
              />

              {/* Center Icon */}
              <foreignObject x="-12" y="-12" width="24" height="24" className="pointer-events-none">
                <div className="w-full h-full flex items-center justify-center" style={{ color: iconColor }}>
                  <Icon className="w-4 h-4" />
                </div>
              </foreignObject>

              {/* Risk Score Pill */}
              <rect
                x="12"
                y="-26"
                width="28"
                height="15"
                rx="4"
                fill={
                  node.risk_score > 75
                    ? '#ea580c'
                    : node.risk_score > 40
                    ? '#d97706'
                    : '#65a30d'
                }
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <text
                x="26"
                y="-15"
                fill="#ffffff"
                fontSize="8.5"
                fontWeight="800"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                {node.risk_score}
              </text>

              {/* Node Title */}
              <text
                x="0"
                y="38"
                fill="#301a0a"
                fontSize="11"
                fontWeight="800"
                textAnchor="middle"
                className="font-mono tracking-wide"
              >
                {node.id.toUpperCase()}
              </text>

              {/* Node IP */}
              <text
                x="0"
                y="50"
                fill="#7a644c"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
                fontWeight="600"
              >
                {node.ip}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Bottom Status Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between text-xs text-[#544230] bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-[#ebdcc7] font-mono shadow-xs">
        <span className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#b45309]" />
          <span>Click any node to inspect telemetry, observed attacks & predicted next actions.</span>
        </span>
        <span className="text-[#b45309] font-bold tracking-wider">
          High-Risk Nodes: {graphData.high_risk_nodes_count || 0}
        </span>
      </div>
    </div>
  );
}
