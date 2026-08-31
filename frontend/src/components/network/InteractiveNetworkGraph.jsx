import React, { useState } from 'react';
import {
  User,
  Laptop,
  Server,
  Database,
  Shield,
  Radio,
  Zap,
  CheckCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { getNodeTypeStyle } from '../../utils/formatters';

// Fixed clean geometric layout coordinates for enterprise topology
const NODE_COORDINATES = {
  'user-014': { x: 120, y: 120 },
  'user-009': { x: 120, y: 320 },
  'endpoint-07': { x: 340, y: 140 },
  'endpoint-12': { x: 340, y: 320 },
  'server-03': { x: 560, y: 160 },
  'database-02': { x: 740, y: 280 },
  'gateway-01': { x: 620, y: 400 },
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
}) {
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  if (!graphData) return null;

  const { nodes = [], edges = [], attack_path_node_ids = [], forecasted_path_node_ids = [] } = graphData;

  const height = compact ? 360 : 540;
  const viewBox = compact ? '0 0 900 480' : '0 0 900 500';

  return (
    <div className="relative w-full bg-soc-navy-950 rounded-2xl overflow-hidden border border-soc-navy-800 shadow-xl select-none">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Top Legend Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-soc-slate-400 bg-soc-navy-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-soc-navy-800">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-soc-secure" /> Normal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Suspicious
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-soc-threat animate-pulse" /> Compromised (Observed)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-soc-ai" /> Forecasted Target
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-red-400">
            <span className="w-4 h-0.5 bg-red-500" /> Active Attack Vector
          </span>
          <span className="flex items-center gap-1 text-indigo-400">
            <span className="w-4 h-0.5 border-t border-dashed border-indigo-400" /> Forecasted Traversal (T+1..3)
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        viewBox={viewBox}
        className="w-full h-full"
        style={{ minHeight: `${height}px` }}
      >
        <defs>
          {/* Animated glow filters */}
          <filter id="glow-threat-svg" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-ai-svg" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Marker arrows */}
          <marker id="arrow-threat" markerWidth="8" markerHeight="8" refX="28" refY="4" orient="auto">
            <polygon points="0 0, 8 4, 0 8" fill="#EF4444" />
          </marker>
          <marker id="arrow-forecast" markerWidth="8" markerHeight="8" refX="28" refY="4" orient="auto">
            <polygon points="0 0, 8 4, 0 8" fill="#6366F1" />
          </marker>
          <marker id="arrow-normal" markerWidth="6" markerHeight="6" refX="24" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="#334155" />
          </marker>
        </defs>

        {/* 1. Render Edges */}
        {edges.map((edge) => {
          const sourceCoord = NODE_COORDINATES[edge.source] || { x: 200, y: 200 };
          const targetCoord = NODE_COORDINATES[edge.target] || { x: 400, y: 200 };

          const isAttack = edge.is_attack_path;
          const isForecast = edge.is_forecasted_path;

          let strokeColor = '#334155';
          let strokeWidth = 1.5;
          let markerEnd = 'url(#arrow-normal)';
          let strokeDasharray = 'none';

          if (isAttack) {
            strokeColor = '#EF4444';
            strokeWidth = 3;
            markerEnd = 'url(#arrow-threat)';
            strokeDasharray = '8 4';
          } else if (isForecast) {
            strokeColor = '#6366F1';
            strokeWidth = 2.5;
            markerEnd = 'url(#arrow-forecast)';
            strokeDasharray = '6 4';
          }

          // Edge midpoint for protocol badge
          const midX = (sourceCoord.x + targetCoord.x) / 2;
          const midY = (sourceCoord.y + targetCoord.y) / 2;

          return (
            <g key={edge.id} className="transition-all duration-300">
              <line
                x1={sourceCoord.x}
                y1={sourceCoord.y}
                x2={targetCoord.x}
                y2={targetCoord.y}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                markerEnd={markerEnd}
                className={isAttack ? 'animate-flow-edge' : isForecast ? 'animate-pulse' : ''}
              />
              {/* Protocol Label */}
              <rect
                x={midX - 28}
                y={midY - 10}
                width="56"
                height="18"
                rx="4"
                fill="#0F172A"
                stroke={isAttack ? '#EF4444' : isForecast ? '#6366F1' : '#1E293B'}
                strokeWidth="1"
              />
              <text
                x={midX}
                y={midY + 3}
                fill={isAttack ? '#FCA5A5' : isForecast ? '#C7D2FE' : '#94A3B8'}
                fontSize="9"
                fontFamily="monospace"
                textAnchor="middle"
                fontWeight="bold"
              >
                {edge.protocol}
              </text>
            </g>
          );
        })}

        {/* 2. Render Nodes */}
        {nodes.map((node) => {
          const coord = NODE_COORDINATES[node.id] || { x: 450, y: 250 };
          const isSelected = selectedNodeId === node.id;
          const isHovered = hoveredNodeId === node.id;
          const isInAttackPath = attack_path_node_ids.includes(node.id);
          const isForecastTarget = forecasted_path_node_ids.includes(node.id);

          const Icon = ICON_MAP[node.type] || Server;

          let ringColor = '#334155';
          let bgColor = '#1E293B';
          let pulseClass = '';

          if (node.state === 'compromised' || isInAttackPath) {
            ringColor = '#EF4444';
            bgColor = '#450A0A';
            pulseClass = 'animate-ping';
          } else if (node.state === 'suspicious') {
            ringColor = '#F59E0B';
            bgColor = '#451A03';
          } else if (node.state === 'target' || isForecastTarget) {
            ringColor = '#6366F1';
            bgColor = '#1E1B4B';
          } else {
            ringColor = '#10B981';
            bgColor = '#064E3B';
          }

          return (
            <g
              key={node.id}
              onClick={() => onSelectNode && onSelectNode(node)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              className="cursor-pointer transition-all duration-200"
              transform={`translate(${coord.x}, ${coord.y})`}
            >
              {/* Outer Selection Highlight */}
              {isSelected && (
                <circle
                  r="34"
                  fill="none"
                  stroke="#818CF8"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  className="animate-spin"
                  style={{ animationDuration: '8s' }}
                />
              )}

              {/* Ping Ring for Compromised Nodes */}
              {node.state === 'compromised' && (
                <circle r="30" fill="none" stroke="#EF4444" strokeWidth="1.5" opacity="0.4" className="animate-pulse" />
              )}

              {/* Node Outer Base */}
              <circle
                r="24"
                fill={bgColor}
                stroke={ringColor}
                strokeWidth={isSelected ? 3 : 2}
                filter={node.state === 'compromised' ? 'url(#glow-threat-svg)' : isForecastTarget ? 'url(#glow-ai-svg)' : 'none'}
              />

              {/* Center Icon Container */}
              <foreignObject x="-12" y="-12" width="24" height="24" className="pointer-events-none">
                <div className="w-full h-full flex items-center justify-center text-white">
                  <Icon className="w-4 h-4" />
                </div>
              </foreignObject>

              {/* Risk Badge Pill */}
              <rect
                x="12"
                y="-26"
                width="28"
                height="14"
                rx="4"
                fill={node.risk_score > 75 ? '#EF4444' : node.risk_score > 40 ? '#F59E0B' : '#10B981'}
              />
              <text
                x="26"
                y="-16"
                fill="#FFFFFF"
                fontSize="8"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {node.risk_score}
              </text>

              {/* Node Title & IP Label */}
              <text
                x="0"
                y="38"
                fill="#F8FAFC"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
                className="drop-shadow-md"
              >
                {node.id.toUpperCase()}
              </text>
              <text
                x="0"
                y="50"
                fill="#94A3B8"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {node.ip}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Bottom Context Pill */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between text-xs text-soc-slate-400 bg-soc-navy-900/90 backdrop-blur px-4 py-2 rounded-xl border border-soc-navy-800 font-mono">
        <span>Click any node to inspect telemetry, observed events, and predicted actions.</span>
        <span className="text-indigo-400 font-semibold">
          High-Risk Nodes: {graphData.high_risk_nodes_count || 0}
        </span>
      </div>
    </div>
  );
}
