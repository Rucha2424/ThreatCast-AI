import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Database, Laptop, RotateCw, Server, Shield, User } from 'lucide-react';

const ICONS = { user: User, endpoint: Laptop, server: Server, database: Database, gateway: Shield };

function positions(ids, radius) {
  const result = {};
  const count = ids.length || 1;
  const angle = Math.PI * (3 - Math.sqrt(5));
  ids.forEach((id, index) => {
    const y = count === 1 ? 0 : 1 - (index / (count - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = angle * index;
    result[id] = { x: Math.cos(theta) * ring * radius, y: y * radius, z: Math.sin(theta) * ring * radius };
  });
  return result;
}

function rotate(point, yaw, pitch) {
  const x = point.x * Math.cos(yaw) + point.z * Math.sin(yaw);
  const z = -point.x * Math.sin(yaw) + point.z * Math.cos(yaw);
  return { x, y: point.y * Math.cos(pitch) - z * Math.sin(pitch), z: point.y * Math.sin(pitch) + z * Math.cos(pitch) };
}

function project(point, center, camera) {
  const scale = camera / (camera - point.z);
  return { x: center.x + point.x * scale, y: center.y + point.y * scale, scale };
}

export default function InteractiveNetworkGraph3D({ graphData, compact = false, selectedNodeId, onSelectNode }) {
  const [rotation, setRotation] = useState({ yaw: 0.55, pitch: -0.18 });
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(null);
  const pointer = useRef({ x: 0, y: 0 });
  const moved = useRef(false);
  const frame = useRef(null);
  const lastTime = useRef(0);
  const nodes = Array.isArray(graphData?.nodes) ? graphData.nodes : [];
  const edges = Array.isArray(graphData?.edges) ? graphData.edges : [];
  const ids = useMemo(() => nodes.map((node) => node.id).filter(Boolean).sort(), [nodes]);
  const radius = compact ? 128 : 164;
  const center = { x: 460, y: compact ? 248 : 258 };
  const camera = radius * 2.7;
  const base = useMemo(() => positions(ids, radius), [ids, radius]);

  useEffect(() => {
    const animate = (time) => {
      const delta = lastTime.current ? Math.min((time - lastTime.current) / 1000, 0.05) : 0;
      lastTime.current = time;
      if (!dragging) setRotation((current) => ({ ...current, yaw: current.yaw + delta * 0.16 }));
      frame.current = requestAnimationFrame(animate);
    };
    frame.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame.current);
  }, [dragging]);

  if (!graphData) return <div className="flex min-h-[380px] items-center justify-center bg-threatcast-card text-xs text-threatcast-muted">NETWORK GRAPH DATA UNAVAILABLE</div>;

  const projected = {};
  nodes.forEach((node) => {
    const rotated = rotate(base[node.id] || { x: 0, y: 0, z: 0 }, rotation.yaw, rotation.pitch);
    projected[node.id] = { node, rotated, point: project(rotated, center, camera) };
  });

  const colors = (node) => node.state === 'compromised' || graphData.attack_path_node_ids?.includes(node.id)
    ? ['var(--tc-red)', 'var(--tc-card)']
    : node.state === 'suspicious' ? ['var(--tc-amber)', 'var(--tc-card-elevated)']
    : node.state === 'target' || graphData.forecasted_path_node_ids?.includes(node.id) ? ['var(--tc-violet)', 'var(--tc-card-elevated)']
    : ['var(--tc-green)', 'var(--tc-card-elevated)'];

  const onDown = (event) => { moved.current = false; setDragging(true); pointer.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture?.(event.pointerId); };
  const onMove = (event) => {
    if (!dragging) return;
    const dx = event.clientX - pointer.current.x;
    const dy = event.clientY - pointer.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
    pointer.current = { x: event.clientX, y: event.clientY };
    setRotation((current) => ({ yaw: current.yaw + dx * 0.007, pitch: Math.max(-1.25, Math.min(1.25, current.pitch + dy * 0.007)) }));
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-threatcast-deep shadow-[0_25px_80px_rgba(0,0,0,0.38)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(0,229,255,0.08),transparent_38%)]" />
      <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between rounded-xl border border-white/[0.08] bg-threatcast-bg/90 px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-threatcast-silver backdrop-blur-xl">
        <span>Normal <b className="text-threatcast-green">●</b> Suspicious <b className="text-[var(--tc-amber)]">●</b> Compromised <b className="text-threatcast-red">●</b> Forecast <b className="text-[var(--tc-violet)]">●</b></span>
        <span className="hidden items-center gap-1.5 text-threatcast-muted sm:flex"><RotateCw className="h-3 w-3" /> Drag to rotate</span>
      </div>
      <svg viewBox={compact ? '0 0 920 500' : '0 0 920 520'} className="relative z-0 h-full w-full cursor-grab touch-none active:cursor-grabbing" style={{ minHeight: compact ? 380 : 560 }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)}>
        <defs><radialGradient id="graph3d-shading" cx="38%" cy="32%" r="70%"><stop offset="0%" stopColor="var(--tc-card-elevated)" stopOpacity=".65" /><stop offset="100%" stopColor="var(--tc-bg-deep)" stopOpacity="0" /></radialGradient><filter id="graph3d-glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        <circle cx={center.x} cy={center.y} r={radius * 1.04} fill="url(#graph3d-shading)" stroke="rgba(184,192,200,.14)" />
        {edges.map((edge, index) => {
          const source = projected[edge.source]; const target = projected[edge.target];
          if (!source || !target) return null;
          const mid = { x: (source.rotated.x + target.rotated.x) / 2, y: (source.rotated.y + target.rotated.y) / 2, z: (source.rotated.z + target.rotated.z) / 2 };
          const length = Math.hypot(mid.x, mid.y, mid.z) || 1;
          const lift = radius * .08 + Math.hypot(target.rotated.x - source.rotated.x, target.rotated.y - source.rotated.y, target.rotated.z - source.rotated.z) * .22;
          const control = project({ x: mid.x + mid.x / length * lift, y: mid.y + mid.y / length * lift, z: mid.z + mid.z / length * lift }, center, camera);
          const path = `M ${source.point.x} ${source.point.y} Q ${control.x} ${control.y} ${target.point.x} ${target.point.y}`;
          const color = edge.is_attack_path ? 'var(--tc-red)' : edge.is_forecasted_path ? 'var(--tc-violet)' : 'var(--tc-dark-chrome)';
          return <path key={edge.id || index} d={path} fill="none" stroke={color} strokeWidth={edge.is_attack_path ? 2.8 : 1.5} strokeDasharray={edge.is_attack_path || edge.is_forecasted_path ? '8 5' : 'none'} opacity={edge.is_attack_path || edge.is_forecasted_path ? .9 : .4} filter={edge.is_attack_path || edge.is_forecasted_path ? 'url(#graph3d-glow)' : undefined} />;
        })}
        {nodes.slice().sort((a, b) => projected[a.id].rotated.z - projected[b.id].rotated.z).map((node) => {
          const item = projected[node.id]; const [ring, fill] = colors(node); const Icon = ICONS[node.type] || Server; const active = hovered === node.id; const selected = selectedNodeId === node.id;
          return <g key={node.id} transform={`translate(${item.point.x} ${item.point.y}) scale(${item.point.scale})`} opacity={.45 + ((item.rotated.z + radius) / (2 * radius)) * .55} onPointerEnter={() => setHovered(node.id)} onPointerLeave={() => setHovered(null)} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onSelectNode?.(node); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectNode?.(node); } }} role="button" tabIndex={0} aria-label={`Inspect ${node.label || node.id}`} className="cursor-pointer"><circle r={selected ? 35 : active ? 32 : 28} fill={`${ring}35`} filter="url(#graph3d-glow)" />{selected && <circle r="31" fill="none" stroke="var(--tc-chrome)" strokeWidth="1.3" strokeDasharray="4 3" />}<circle r="25" fill="var(--tc-bg-deep)" stroke="var(--tc-dark-chrome)" /><circle r="21" fill={fill} stroke={ring} strokeWidth={selected || active ? 3 : 1.8} /><foreignObject x="-12" y="-12" width="24" height="24" className="pointer-events-none"><div className="flex h-full w-full items-center justify-center" style={{ color: ring }}><Icon className="h-4 w-4" /></div></foreignObject><text x="0" y="38" fill="var(--tc-chrome)" fontSize="10" fontWeight="800" textAnchor="middle" fontFamily="monospace">{String(node.id).toUpperCase()}</text><text x="0" y="51" fill="var(--tc-muted)" fontSize="8" textAnchor="middle" fontFamily="monospace">{node.ip || ''}</text></g>;
        })}
      </svg>
      <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between rounded-xl border border-white/[0.08] bg-threatcast-bg/90 px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-[var(--tc-muted)] backdrop-blur-xl"><span className="flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-threatcast-cyan" /> Live PCAP topology</span><span className="text-[var(--tc-amber)]">High-risk nodes: {graphData.high_risk_nodes_count || 0}</span></div>
    </div>
  );
}
