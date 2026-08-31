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
  // Lateral Movement Wave: Horizontal expanded battlefront
  lateral_movement_wave: {
    'user-014': { x: 110, y: 220 },
    'user-009': { x: 130, y: 390 },
    'endpoint-07': { x: 320, y: 220 },
    'endpoint-12': { x: 330, y: 390 },
    'server-03': { x: 550, y: 220 },
    'database-02': { x: 740, y: 160 },
    'gateway-01': { x: 740, y: 340 },
  },
  // Exfiltration Crisis: Linear high-speed egress funnel
  exfiltration_crisis: {
    'user-014': { x: 110, y: 130 },
    'user-009': { x: 110, y: 370 },
    'endpoint-07': { x: 290, y: 150 },
    'endpoint-12': { x: 290, y: 370 },
    'server-03': { x: 480, y: 190 },
    'database-02': { x: 670, y: 230 },
    'gateway-01': { x: 810, y: 320 },
  },
  // Ransomware Staging: Radial mesh cluster
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
    <div className="relative w-full bg-cyber-obsidian rounded-2xl overflow-hidden border border-cyber-maroon-800/80 shadow-2xl select-none group">
      {/* Ambient Neural Glow Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyber-maroon-950/60 via-cyber-black/90 to-cyber-burgundy-950/40 pointer-events-none" />

      {/* Cyber Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#4e1030_1px,transparent_1px)] [background-size:28px_28px] opacity-25 pointer-events-none" />

      {/* Top Cyber Legend Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-cyber-grey-300 bg-cyber-maroon-950/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-cyber-maroon-700/60 shadow-lg">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-cyber-grey-200">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" /> Normal
          </span>
          <span className="flex items-center gap-1.5 text-cyber-grey-200">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" /> Suspicious
          </span>
          <span className="flex items-center gap-1.5 text-rose-300 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shadow-[0_0_12px_#f43f5e]" /> Compromised
          </span>
          <span className="flex items-center gap-1.5 text-fuchsia-300 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-500 shadow-[0_0_10px_#d946ef]" /> Forecasted (T+1..3)
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
            <span className="w-5 h-1 bg-gradient-to-r from-rose-600 to-rose-400 rounded-full shadow-[0_0_8px_#f43f5e]" />
            Active Vector
          </span>
          <span className="flex items-center gap-1.5 text-fuchsia-400 font-semibold">
            <span className="w-5 h-0.5 border-t-2 border-dashed border-fuchsia-400" />
            Predicted Synapse
          </span>
        </div>
      </div>

      {/* SVG Neural Topology Canvas */}
      <svg
        viewBox={viewBox}
        className="w-full h-full relative z-0"
        style={{ minHeight: `${height}px` }}
      >
        <defs>
          {/* Cyber Maroon & Neon Filters */}
          <filter id="cyber-glow-threat" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="cyber-glow-forecast" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Gradients for Neural Axon Edges */}
          <linearGradient id="grad-attack-axon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="50%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#be123c" />
          </linearGradient>

          <linearGradient id="grad-forecast-axon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="50%" stopColor="#c026d3" />
            <stop offset="100%" stopColor="#a21caf" />
          </linearGradient>

          <linearGradient id="grad-normal-axon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4e1030" />
            <stop offset="100%" stopColor="#260817" />
          </linearGradient>

          {/* Marker Arrows */}
          <marker id="marker-threat" markerWidth="10" markerHeight="10" refX="32" refY="5" orient="auto">
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#f43f5e" />
          </marker>

          <marker id="marker-forecast" markerWidth="10" markerHeight="10" refX="32" refY="5" orient="auto">
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#d946ef" />
          </marker>

          <marker id="marker-normal" markerWidth="8" markerHeight="8" refX="28" refY="4" orient="auto">
            <path d="M 0 1 L 7 4 L 0 7 z" fill="#4e1030" />
          </marker>
        </defs>

        {/* 1. Render Neural Interconnecting Edges (Curved Bezier Synaptic Axons) */}
        {edges.map((edge) => {
          const sourceCoord = coordsMap[edge.source] || { x: 200, y: 200 };
          const targetCoord = coordsMap[edge.target] || { x: 450, y: 200 };

          const isAttack = edge.is_attack_path;
          const isForecast = edge.is_forecasted_path;

          // Compute gentle curved control point for organic neural look
          const dx = targetCoord.x - sourceCoord.x;
          const dy = targetCoord.y - sourceCoord.y;
          const cx = (sourceCoord.x + targetCoord.x) / 2 - dy * 0.12;
          const cy = (sourceCoord.y + targetCoord.y) / 2 + dx * 0.12;

          const pathD = `M ${sourceCoord.x} ${sourceCoord.y} Q ${cx} ${cy} ${targetCoord.x} ${targetCoord.y}`;

          let stroke = 'url(#grad-normal-axon)';
          let strokeWidth = 2;
          let markerEnd = 'url(#marker-normal)';
          let strokeDasharray = 'none';

          if (isAttack) {
            stroke = 'url(#grad-attack-axon)';
            strokeWidth = 4;
            markerEnd = 'url(#marker-threat)';
            strokeDasharray = '10 5';
          } else if (isForecast) {
            stroke = 'url(#grad-forecast-axon)';
            strokeWidth = 3;
            markerEnd = 'url(#marker-forecast)';
            strokeDasharray = '6 4';
          }

          // Midpoint for badge placement
          const midX = (sourceCoord.x + targetCoord.x) / 2 + (cx - (sourceCoord.x + targetCoord.x) / 2) * 0.5;
          const midY = (sourceCoord.y + targetCoord.y) / 2 + (cy - (sourceCoord.y + targetCoord.y) / 2) * 0.5;

          return (
            <g key={edge.id} className="transition-all duration-700 ease-in-out">
              {/* Outer Synaptic Glow Line */}
              {(isAttack || isForecast) && (
                <path
                  d={pathD}
                  fill="none"
                  stroke={isAttack ? 'rgba(244, 63, 94, 0.35)' : 'rgba(217, 70, 239, 0.25)'}
                  strokeWidth={strokeWidth + 6}
                />
              )}

              {/* Main Connecting Path */}
              <path
                d={pathD}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                markerEnd={markerEnd}
                className={isAttack ? 'animate-flow-edge' : isForecast ? 'animate-pulse' : ''}
              />

              {/* Protocol Badge */}
              <rect
                x={midX - 32}
                y={midY - 11}
                width="64"
                height="20"
                rx="6"
                fill="#16040e"
                stroke={isAttack ? '#f43f5e' : isForecast ? '#c026d3' : '#4e1030'}
                strokeWidth="1.2"
                className="shadow-md"
              />
              <text
                x={midX}
                y={midY + 3}
                fill={isAttack ? '#fda4af' : isForecast ? '#f5d0fe' : '#94a3b8'}
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

        {/* 2. Render Neural Core Nodes */}
        {nodes.map((node) => {
          const coord = coordsMap[node.id] || { x: 450, y: 250 };
          const isSelected = selectedNodeId === node.id;
          const isHovered = hoveredNodeId === node.id;
          const isInAttackPath = attack_path_node_ids.includes(node.id);
          const isForecastTarget = forecasted_path_node_ids.includes(node.id);

          const Icon = ICON_MAP[node.type] || Server;

          let ringColor = '#4e1030';
          let bgColor = '#1a0512';
          let glowFilter = 'none';

          if (node.state === 'compromised' || isInAttackPath) {
            ringColor = '#f43f5e';
            bgColor = '#380718';
            glowFilter = 'url(#cyber-glow-threat)';
          } else if (node.state === 'suspicious') {
            ringColor = '#f59e0b';
            bgColor = '#2b1004';
          } else if (node.state === 'target' || isForecastTarget) {
            ringColor = '#c026d3';
            bgColor = '#2b0724';
            glowFilter = 'url(#cyber-glow-forecast)';
          } else {
            ringColor = '#10b981';
            bgColor = '#042217';
          }

          return (
            <g
              key={node.id}
              onClick={() => onSelectNode && onSelectNode(node)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              className="cursor-pointer transition-all duration-700 ease-in-out"
              transform={`translate(${coord.x}, ${coord.y})`}
            >
              {/* Selected Spinning Target Ring */}
              {isSelected && (
                <circle
                  r="38"
                  fill="none"
                  stroke="#fb7185"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  className="animate-spin"
                  style={{ animationDuration: '6s' }}
                />
              )}

              {/* Pulsing Neural Concentric Rings for Compromised/Forecasted Nodes */}
              {(node.state === 'compromised' || isInAttackPath) && (
                <>
                  <circle
                    r="34"
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="1.5"
                    opacity="0.6"
                    className="animate-ping"
                    style={{ animationDuration: '2.5s' }}
                  />
                  <circle
                    r="42"
                    fill="none"
                    stroke="#be123c"
                    strokeWidth="1"
                    opacity="0.3"
                    className="animate-pulse"
                  />
                </>
              )}

              {/* Outer Synaptic Hexagon / Circle Node Base */}
              <circle
                r="26"
                fill={bgColor}
                stroke={ringColor}
                strokeWidth={isSelected ? 3.5 : 2.5}
                filter={glowFilter}
                className="transition-all duration-300"
              />

              {/* Center Icon */}
              <foreignObject x="-13" y="-13" width="26" height="26" className="pointer-events-none">
                <div className="w-full h-full flex items-center justify-center text-white">
                  <Icon className="w-4 h-4 drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]" />
                </div>
              </foreignObject>

              {/* Cyber Risk Score Pill */}
              <rect
                x="14"
                y="-28"
                width="30"
                height="16"
                rx="5"
                fill={
                  node.risk_score > 75
                    ? '#be123c'
                    : node.risk_score > 40
                    ? '#b45309'
                    : '#047857'
                }
                stroke="#070206"
                strokeWidth="1.5"
              />
              <text
                x="29"
                y="-16"
                fill="#ffffff"
                fontSize="9"
                fontWeight="800"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                {node.risk_score}
              </text>

              {/* Node Title (High Contrast White) */}
              <text
                x="0"
                y="42"
                fill="#ffffff"
                fontSize="11.5"
                fontWeight="800"
                textAnchor="middle"
                className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-wide"
              >
                {node.id.toUpperCase()}
              </text>

              {/* Node IP Subtitle (Cool Light Grey) */}
              <text
                x="0"
                y="55"
                fill="#cbd5e1"
                fontSize="9.5"
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

      {/* Bottom Cyber Status Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between text-xs text-cyber-grey-300 bg-cyber-maroon-950/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-cyber-maroon-700/60 font-mono shadow-xl">
        <span className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          <span>Click any node to inspect telemetry, observed attacks & predicted next actions.</span>
        </span>
        <span className="text-rose-400 font-bold tracking-wider">
          High-Risk Nodes: {graphData.high_risk_nodes_count || 0}
        </span>
      </div>
    </div>
  );
}
