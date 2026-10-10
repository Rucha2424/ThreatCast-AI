import React, { useId, useMemo, useState } from 'react';
import {
  User,
  Laptop,
  Server,
  Database,
  Shield,
  Activity,
} from 'lucide-react';

/* =========================================================
   SCENARIO-SPECIFIC TOPOLOGY
   ========================================================= */

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

/* =========================================================
   NODE ICONS
   ========================================================= */

const ICON_MAP = {
  user: User,
  endpoint: Laptop,
  server: Server,
  database: Database,
  gateway: Shield,
};

/* =========================================================
   COMPONENT
   ========================================================= */

export default function InteractiveNetworkGraph({
  graphData,
  selectedNodeId,
  onSelectNode,
  compact = false,
  activeScenario = 'default',
}) {
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  const rawId = useId();

  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '');

  // The API is backed by persisted Neo4j data, but keep the renderer resilient
  // to a transient/malformed response so one graph payload cannot blank the app.
  const nodes = Array.isArray(graphData?.nodes)
    ? graphData.nodes.filter((node) => node && node.id != null)
    : [];
  const edges = Array.isArray(graphData?.edges)
    ? graphData.edges.filter((edge) => edge && edge.source != null && edge.target != null)
    : [];
  const attack_path_node_ids = Array.isArray(graphData?.attack_path_node_ids)
    ? graphData.attack_path_node_ids
    : [];
  const forecasted_path_node_ids = Array.isArray(graphData?.forecasted_path_node_ids)
    ? graphData.forecasted_path_node_ids
    : [];

  const coordsMap = useMemo(() => {
    const preset = SCENARIO_COORDINATES[activeScenario] || {};
    const generated = {};
    const unpositioned = nodes.filter((node) => !preset[node.id]);

    // Persisted Neo4j IDs do not belong to the legacy demo-coordinate map.
    // Position them deterministically so the existing renderer can display
    // real Dataset/Scenario/State/Prediction/Event entities without overlap.
    unpositioned.forEach((node, index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      generated[node.id] = {
        x: 125 + column * 225,
        y: 105 + row * 150,
      };
    });

    return { ...preset, ...generated };
  }, [activeScenario, nodes]);

  if (!graphData) {
    return (
      <div className="
        w-full
        min-h-[380px]
        rounded-2xl
        bg-threatcast-card
        border border-white/[0.08]
        flex items-center justify-center
        text-threatcast-muted
        font-mono
        text-xs
      ">
        NETWORK GRAPH DATA UNAVAILABLE
      </div>
    );
  }

  const height = compact ? 380 : 560;
  const viewBox = compact
    ? '0 0 920 500'
    : '0 0 920 520';

  /* =========================================================
     SVG IDs
     ========================================================= */

  const attackGradient = `attackGradient-${uid}`;
  const forecastGradient = `forecastGradient-${uid}`;
  const normalGradient = `normalGradient-${uid}`;

  const attackGlow = `attackGlow-${uid}`;
  const cyanGlow = `cyanGlow-${uid}`;
  const silverGlow = `silverGlow-${uid}`;

  const attackMarker = `attackMarker-${uid}`;
  const forecastMarker = `forecastMarker-${uid}`;
  const normalMarker = `normalMarker-${uid}`;

  return (
    <div
      className="
        relative
        w-full
        overflow-hidden
        rounded-2xl
        border border-white/[0.08]
        bg-threatcast-deep
        shadow-[0_25px_80px_rgba(0,0,0,0.38)]
        select-none
        group
      "
    >

      {/* =====================================================
          AMBIENT BACKGROUND
      ===================================================== */}

      <div className="
        absolute inset-0
        bg-[radial-gradient(circle_at_50%_45%,rgba(0,229,255,0.055),transparent_34%)]
        pointer-events-none
      " />

      <div className="
        absolute inset-0
        bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.035),transparent_25%)]
        pointer-events-none
      " />

      {/* Technical grid */}
      <div
        className="
          absolute inset-0
          opacity-50
          pointer-events-none
        "
        style={{
          backgroundImage: `
            linear-gradient(
              rgba(184,192,200,0.035) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(184,192,200,0.035) 1px,
              transparent 1px
            )
          `,
          backgroundSize: '42px 42px',
        }}
      />

      {/* Scanline */}
      <div className="
        absolute inset-0
        pointer-events-none
        opacity-30
        overflow-hidden
      ">
        <div className="
          absolute
          left-0 right-0
          h-24
          bg-gradient-to-b
          from-transparent
          via-[var(--tc-cyan)]/[0.025]
          to-transparent
          animate-[tc-scan_7s_linear_infinite]
        " />
      </div>

      {/* =====================================================
          TOP LEGEND
      ===================================================== */}

      <div className="
        absolute
        top-4 left-4 right-4
        z-10
        flex flex-wrap
        items-center justify-between
        gap-3
        px-4 py-3
        rounded-xl
        bg-threatcast-bg/90
        backdrop-blur-xl
        border border-white/[0.08]
        shadow-[0_10px_35px_rgba(0,0,0,0.28)]
      ">

        <div className="
          flex flex-wrap
          items-center gap-4
          text-[9px]
          font-mono
          uppercase
          tracking-wider
        ">

          {/* Normal */}
          <span className="flex items-center gap-2 text-[var(--tc-muted)]">
            <span className="
              w-2 h-2 rounded-full
              bg-threatcast-green
              shadow-[0_0_8px_rgba(0,255,156,0.8)]
            " />
            Normal
          </span>

          {/* Suspicious */}
          <span className="flex items-center gap-2 text-threatcast-silver">
            <span className="
              w-2 h-2 rounded-full
              bg-threatcast-amber
              shadow-[0_0_8px_rgba(255,176,0,0.8)]
            " />
            Suspicious
          </span>

          {/* Compromised */}
          <span className="flex items-center gap-2 text-threatcast-red">
            <span className="
              w-2 h-2 rounded-full
              bg-[var(--tc-red)]
              shadow-[0_0_9px_rgba(255,23,68,0.9)]
            " />
            Compromised
          </span>

          {/* Forecast */}
          <span className="flex items-center gap-2 text-threatcast-cyan">
            <span className="
              w-2 h-2 rounded-full
              bg-threatcast-cyan
              shadow-[0_0_9px_rgba(0,229,255,0.9)]
            " />
            Forecast T+1..3
          </span>
        </div>

        <div className="
          flex items-center gap-4
          text-[9px]
          font-mono
          uppercase
          tracking-wider
        ">

          <span className="flex items-center gap-2 text-threatcast-amber">
            <span className="
              w-6 h-[2px]
              bg-threatcast-amber
              shadow-[0_0_7px_rgba(255,176,0,0.7)]
            " />
            Active Vector
          </span>

          <span className="flex items-center gap-2 text-threatcast-cyan">
            <span className="
              w-6 h-[2px]
              border-t
              border-dashed
              border-threatcast-cyan
            " />
            Forecast Path
          </span>
        </div>
      </div>

      {/* =====================================================
          SVG NETWORK
      ===================================================== */}

      <svg
        viewBox={viewBox}
        className="relative z-0 w-full h-full"
        style={{ minHeight: `${height}px` }}
      >

        <defs>

          {/* =================================================
              EDGE GRADIENTS
          ================================================= */}

          <linearGradient
            id={attackGradient}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="var(--tc-red)" />
            <stop offset="50%" stopColor="var(--tc-amber)" />
            <stop offset="100%" stopColor="var(--tc-red)" />
          </linearGradient>

          <linearGradient
            id={forecastGradient}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="var(--tc-cyan)" />
            <stop offset="100%" stopColor="var(--tc-violet)" />
          </linearGradient>

          <linearGradient
            id={normalGradient}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="var(--tc-dark-chrome)" />
            <stop offset="100%" stopColor="var(--tc-silver)" />
          </linearGradient>

          {/* =================================================
              GLOWS
          ================================================= */}

          <filter id={attackGlow} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur
              stdDeviation="4"
              result="blur"
            />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id={cyanGlow} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur
              stdDeviation="2.5"
              result="blur"
            />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id={silverGlow} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur
              stdDeviation="1.5"
              result="blur"
            />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* =================================================
              ARROW MARKERS
          ================================================= */}

          <marker
            id={attackMarker}
            markerWidth="9"
            markerHeight="9"
            refX="30"
            refY="4.5"
            orient="auto"
          >
            <path
              d="M 0 1 L 8 4.5 L 0 8 z"
              fill="var(--tc-red)"
            />
          </marker>

          <marker
            id={forecastMarker}
            markerWidth="9"
            markerHeight="9"
            refX="30"
            refY="4.5"
            orient="auto"
          >
            <path
              d="M 0 1 L 8 4.5 L 0 8 z"
              fill="var(--tc-cyan)"
            />
          </marker>

          <marker
            id={normalMarker}
            markerWidth="7"
            markerHeight="7"
            refX="26"
            refY="3.5"
            orient="auto"
          >
            <path
              d="M 0 1 L 6 3.5 L 0 6 z"
              fill="var(--tc-dark-chrome)"
            />
          </marker>
        </defs>

        {/* =====================================================
            EDGES
        ===================================================== */}

        {edges.map((edge) => {
          const sourceCoord =
            coordsMap[edge.source] || {
              x: 200,
              y: 200,
            };

          const targetCoord =
            coordsMap[edge.target] || {
              x: 450,
              y: 200,
            };

          const isAttack = edge.is_attack_path;
          const isForecast = edge.is_forecasted_path;

          const dx = targetCoord.x - sourceCoord.x;
          const dy = targetCoord.y - sourceCoord.y;

          const cx =
            (sourceCoord.x + targetCoord.x) / 2 -
            dy * 0.12;

          const cy =
            (sourceCoord.y + targetCoord.y) / 2 +
            dx * 0.12;

          const pathD = `
            M ${sourceCoord.x} ${sourceCoord.y}
            Q ${cx} ${cy}
            ${targetCoord.x} ${targetCoord.y}
          `;

          let stroke = `url(#${normalGradient})`;
          let strokeWidth = 1.8;
          let markerEnd = `url(#${normalMarker})`;
          let dash = 'none';

          if (isAttack) {
            stroke = `url(#${attackGradient})`;
            strokeWidth = 3;
            markerEnd = `url(#${attackMarker})`;
            dash = '9 5';
          } else if (isForecast) {
            stroke = `url(#${forecastGradient})`;
            strokeWidth = 2.4;
            markerEnd = `url(#${forecastMarker})`;
            dash = '6 5';
          }

          const midX =
            (sourceCoord.x + targetCoord.x) / 2 +
            (
              cx -
              (sourceCoord.x + targetCoord.x) / 2
            ) *
              0.5;

          const midY =
            (sourceCoord.y + targetCoord.y) / 2 +
            (
              cy -
              (sourceCoord.y + targetCoord.y) / 2
            ) *
              0.5;

          return (
            <g key={edge.id}>

              {/* Soft glow under edge */}
              {(isAttack || isForecast) && (
                <path
                  d={pathD}
                  fill="none"
                  stroke={
                    isAttack
                      ? 'var(--tc-red)'
                      : 'var(--tc-cyan)'
                  }
                  strokeWidth={
                    isAttack
                      ? 8
                      : 6
                  }
                  opacity="0.08"
                  filter={
                    isAttack
                      ? `url(#${attackGlow})`
                      : `url(#${cyanGlow})`
                  }
                />
              )}

              {/* Main edge */}
              <path
                d={pathD}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={dash}
                markerEnd={markerEnd}
                opacity={
                  isAttack
                    ? 0.95
                    : isForecast
                    ? 0.85
                    : 0.42
                }
              />

              {/* Animated data packet */}
              {(isAttack || isForecast) && (
                <circle
                  r={isAttack ? 3.2 : 2.5}
                  fill={
                    isAttack
                      ? 'var(--tc-red)'
                      : 'var(--tc-cyan)'
                  }
                  filter={
                    isAttack
                      ? `url(#${attackGlow})`
                      : `url(#${cyanGlow})`
                  }
                >
                  <animateMotion
                    dur={isAttack ? '1.8s' : '2.8s'}
                    repeatCount="indefinite"
                    path={pathD}
                  />
                </circle>
              )}

              {/* Protocol badge */}
              <rect
                x={midX - 30}
                y={midY - 10}
                width="60"
                height="20"
                rx="6"
                fill="var(--tc-bg)"
                fillOpacity="0.94"
                stroke={
                  isAttack
                    ? 'var(--tc-red)'
                    : isForecast
                    ? 'var(--tc-cyan)'
                    : 'var(--tc-dark-chrome)'
                }
                strokeOpacity={
                  isAttack
                    ? 0.55
                    : isForecast
                    ? 0.45
                    : 0.28
                }
                strokeWidth="1"
              />

              <text
                x={midX}
                y={midY + 3.5}
                fill={
                  isAttack
                    ? 'var(--tc-amber)'
                    : isForecast
                    ? 'var(--tc-cyan)'
                    : 'var(--tc-muted)'
                }
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
                fontWeight="700"
                letterSpacing="0.4"
              >
                {edge.protocol || 'FLOW'}
              </text>
            </g>
          );
        })}

        {/* =====================================================
            NODES
        ===================================================== */}

        {nodes.map((node) => {
          const coord =
            coordsMap[node.id] || {
              x: 450,
              y: 250,
            };

          const isSelected =
            selectedNodeId === node.id;

          const isHovered =
            hoveredNodeId === node.id;

          const isInAttackPath =
            attack_path_node_ids.includes(node.id);

          const isForecastTarget =
            forecasted_path_node_ids.includes(node.id);

          const Icon =
            ICON_MAP[node.type] || Server;

          let ringColor = 'var(--tc-dark-chrome)';
          let bgColor = 'var(--tc-card)';
          let iconColor = 'var(--tc-silver)';
          let glowColor = 'rgba(184,192,200,0.15)';

          if (
            node.state === 'compromised' ||
            isInAttackPath
          ) {
            ringColor = 'var(--tc-red)';
            bgColor = 'var(--tc-card)';
            iconColor = 'var(--tc-red)';
            glowColor = 'rgba(255,23,68,0.35)';
          } else if (
            node.state === 'suspicious'
          ) {
            ringColor = 'var(--tc-amber)';
            bgColor = 'var(--tc-card-elevated)';
            iconColor = 'var(--tc-amber)';
            glowColor = 'rgba(255,176,0,0.3)';
          } else if (
            node.state === 'target' ||
            isForecastTarget
          ) {
            ringColor = 'var(--tc-cyan)';
            bgColor = 'var(--tc-card-elevated)';
            iconColor = 'var(--tc-cyan)';
            glowColor = 'rgba(0,229,255,0.3)';
          } else {
            ringColor = 'var(--tc-green)';
            bgColor = 'var(--tc-card-elevated)';
            iconColor = 'var(--tc-green)';
            glowColor = 'rgba(0,255,156,0.2)';
          }

          const isThreat =
            node.state === 'compromised' ||
            isInAttackPath;

          return (
            <g
              key={node.id}
              onClick={() =>
                onSelectNode &&
                onSelectNode(node)
              }
              onMouseEnter={() =>
                setHoveredNodeId(node.id)
              }
              onMouseLeave={() =>
                setHoveredNodeId(null)
              }
              className="cursor-pointer"
              transform={`translate(${coord.x}, ${coord.y})`}
            >

              {/* Threat pulse */}
              {isThreat && (
                <circle
                  r="34"
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="1.5"
                  opacity="0.25"
                >
                  <animate
                    attributeName="r"
                    values="28;42;28"
                    dur="2.2s"
                    repeatCount="indefinite"
                  />

                  <animate
                    attributeName="opacity"
                    values="0.4;0;0.4"
                    dur="2.2s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Selection ring */}
              {isSelected && (
                <circle
                  r="35"
                  fill="none"
                  stroke="var(--tc-chrome)"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                  opacity="0.75"
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0"
                    to="360"
                    dur="8s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Outer glow */}
              <circle
                r={isHovered ? 31 : 28}
                fill={glowColor}
                opacity={isHovered ? 0.9 : 0.5}
                filter={
                  isThreat
                    ? `url(#${attackGlow})`
                    : `url(#${cyanGlow})`
                }
              />

              {/* Metallic outer ring */}
              <circle
                r="26"
                fill="var(--tc-bg-deep)"
                stroke="var(--tc-dark-chrome)"
                strokeWidth="1"
              />

              {/* Main node */}
              <circle
                r="22"
                fill={bgColor}
                stroke={ringColor}
                strokeWidth={
                  isSelected || isHovered
                    ? 2.8
                    : 1.8
                }
                filter={
                  isHovered
                    ? `url(#${silverGlow})`
                    : undefined
                }
              />

              {/* Inner highlight */}
              <circle
                r="17"
                fill="none"
                stroke={ringColor}
                strokeWidth="0.6"
                opacity="0.28"
              />

              {/* Icon */}
              <foreignObject
                x="-12"
                y="-12"
                width="24"
                height="24"
                className="pointer-events-none"
              >
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    color: iconColor,
                  }}
                >
                  <Icon
                    className="w-[15px] h-[15px]"
                    strokeWidth={2}
                  />
                </div>
              </foreignObject>

              {/* Risk score */}
              <rect
                x="11"
                y="-27"
                width="30"
                height="16"
                rx="5"
                fill="var(--tc-bg)"
                stroke={ringColor}
                strokeWidth="1"
              />

              <text
                x="26"
                y="-15.5"
                fill={ringColor}
                fontSize="8"
                fontWeight="800"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                {node.risk_score ?? 0}
              </text>

              {/* Node name */}
              <text
                x="0"
                y="38"
                fill="var(--tc-chrome)"
                fontSize="10.5"
                fontWeight="800"
                textAnchor="middle"
                fontFamily="JetBrains Mono, monospace"
                letterSpacing="0.5"
              >
                {String(node.id).toUpperCase()}
              </text>

              {/* IP */}
              <text
                x="0"
                y="51"
                fill="var(--tc-dark-chrome)"
                fontSize="8.5"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
                fontWeight="600"
              >
                {node.ip || '—'}
              </text>
            </g>
          );
        })}
      </svg>

      {/* =====================================================
          BOTTOM STATUS BAR
      ===================================================== */}

      <div className="
        absolute
        bottom-4 left-4 right-4
        z-10
        flex flex-wrap
        items-center justify-between
        gap-3
        px-4 py-3
        rounded-xl
        bg-threatcast-bg/90
        backdrop-blur-xl
        border border-white/[0.08]
        font-mono
      ">

        <span className="
          flex items-center gap-2
          text-[9px]
          uppercase
          tracking-wider
          text-[var(--tc-muted)]
        ">
          <Activity className="
            w-3.5 h-3.5
            text-threatcast-cyan
            drop-shadow-[0_0_6px_rgba(0,229,255,0.5)]
          " />

          Click a node to inspect topology
        </span>

        <span className="
          flex items-center gap-2
          text-[9px]
          uppercase
          tracking-wider
          font-bold
          text-threatcast-amber
        ">
          <span className="
            w-1.5 h-1.5
            rounded-full
            bg-threatcast-amber
            shadow-[0_0_7px_rgba(255,176,0,0.8)]
          " />

          High-Risk Nodes:
          <span className="text-threatcast-chrome">
            {graphData.high_risk_nodes_count || 0}
          </span>
        </span>
      </div>

      {/* =====================================================
          CORNER HUD MARKERS
      ===================================================== */}

      <div className="
        absolute top-24 left-5
        text-[7px]
        font-mono
        text-threatcast-muted
        tracking-[0.2em]
      ">
        NETWORK TOPOLOGY
      </div>

      <div className="
        absolute top-24 right-5
        text-[7px]
        font-mono
        text-threatcast-muted
        tracking-[0.2em]
      ">
        LIVE GRAPH
      </div>

    </div>
  );
}
