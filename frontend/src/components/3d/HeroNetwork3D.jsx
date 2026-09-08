import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';

// Perfectly structured, symmetrical & tiered 3D network node coordinates
const NETWORK_NODES = [
  // Tier 1: Perimeter & Core Gateway (North)
  { id: 'fw-01', label: 'Edge Firewall', pos: [0, 2.4, 0], type: 'gateway', tier: 'edge' },
  { id: 'gw-core', label: 'Core Gateway', pos: [0, 1.1, 0.5], type: 'gateway', tier: 'core' },

  // Tier 2: DMZ Services (East / West)
  { id: 'web-01', label: 'Web Server Alpha', pos: [-2.8, 1.2, -0.8], type: 'server', tier: 'dmz' },
  { id: 'web-02', label: 'API Gateway', pos: [2.8, 1.2, -0.8], type: 'server', tier: 'dmz' },
  { id: 'auth-srv', label: 'Auth & LDAP Server', pos: [-1.4, 0.1, -1.6], type: 'server', tier: 'dmz' },

  // Tier 3: Internal Endpoints (South-East / South-West)
  { id: 'ws-101', label: 'Workstation 101', pos: [-3.4, -1.0, 0.8], type: 'workstation', tier: 'internal' },
  { id: 'ws-102', label: 'Workstation 102', pos: [-1.8, -1.8, 1.2], type: 'workstation', tier: 'internal' },
  { id: 'ws-201', label: 'Admin Terminal', pos: [1.8, -1.8, 1.2], type: 'workstation', tier: 'internal' },
  { id: 'ws-202', label: 'Dev Laptop', pos: [3.4, -1.0, 0.8], type: 'workstation', tier: 'internal' },

  // Tier 4: Core Infrastructure & Vault (South-Center / Deep)
  { id: 'db-master', label: 'Customer DB Master', pos: [-1.2, -0.8, -2.4], type: 'db', tier: 'critical' },
  { id: 'db-replica', label: 'Analytics DB', pos: [1.2, -0.8, -2.4], type: 'db', tier: 'critical' },
  { id: 'vault-01', label: 'HSM KeyVault', pos: [0, -2.2, -2.2], type: 'vault', tier: 'critical' },
];

const NETWORK_LINKS = [
  ['fw-01', 'gw-core'],
  ['fw-01', 'web-01'],
  ['fw-01', 'web-02'],
  ['gw-core', 'auth-srv'],
  ['gw-core', 'ws-101'],
  ['gw-core', 'ws-201'],
  ['web-01', 'auth-srv'],
  ['web-02', 'auth-srv'],
  ['auth-srv', 'db-master'],
  ['auth-srv', 'vault-01'],
  ['ws-101', 'ws-102'],
  ['ws-102', 'ws-201'],
  ['ws-201', 'ws-202'],
  ['ws-201', 'vault-01'],
  ['db-master', 'db-replica'],
  ['db-master', 'vault-01'],
];

// Single Node Component with Upright Level Rendering
function NodePoint({ node, isCompromised, isTargeted, isHovered, onHover, onUnhover }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    if (isCompromised) {
      const s = 1 + Math.sin(t * 6) * 0.18;
      meshRef.current.scale.set(s, s, s);
    } else if (isTargeted) {
      const s = 1 + Math.sin(t * 3) * 0.1;
      meshRef.current.scale.set(s, s, s);
    } else {
      meshRef.current.scale.set(1, 1, 1);
    }
  });

  const nodeColor = useMemo(() => {
    if (isCompromised) return '#ef4444'; // Crimson Breach
    if (isTargeted) return '#f59e0b';    // Amber Warning
    if (node.tier === 'critical') return '#38bdf8'; // Electric Blue
    if (node.type === 'gateway') return '#0ea5e9';
    return '#10b981'; // Emerald Safe
  }, [isCompromised, isTargeted, node.tier, node.type]);

  const size = node.tier === 'critical' ? 0.35 : node.type === 'gateway' ? 0.38 : 0.26;

  return (
    <group position={node.pos}>
      {/* Outer Halo Glow */}
      <Sphere args={[size * 1.7, 16, 16]}>
        <meshBasicMaterial
          color={nodeColor}
          transparent
          opacity={isCompromised ? 0.35 : isHovered ? 0.28 : 0.12}
        />
      </Sphere>

      {/* Main Node Sphere */}
      <Sphere
        ref={meshRef}
        args={[size, 24, 24]}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(node);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onUnhover();
        }}
      >
        <meshStandardMaterial
          color={nodeColor}
          emissive={nodeColor}
          emissiveIntensity={isCompromised ? 2.2 : isTargeted ? 1.5 : 0.7}
          roughness={0.25}
          metalness={0.75}
        />
      </Sphere>
    </group>
  );
}

// Packet Flow Pulses traveling along links
function PacketPulse({ start, end, speed = 1, color = '#38bdf8', isThreat = false }) {
  const ref = useRef();

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const progress = (clock.getElapsedTime() * speed) % 1.0;
    ref.current.position.lerpVectors(start, end, progress);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[isThreat ? 0.09 : 0.06, 12, 12]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

// Network Links Scene
function NetworkLinks({ nodesMap, compromisedIds, targetedIds }) {
  const linksData = useMemo(() => {
    return NETWORK_LINKS.map(([srcId, dstId], idx) => {
      const srcNode = nodesMap[srcId];
      const dstNode = nodesMap[dstId];
      if (!srcNode || !dstNode) return null;

      const isThreatLink =
        (compromisedIds.includes(srcId) && targetedIds.includes(dstId)) ||
        (compromisedIds.includes(dstId) && targetedIds.includes(srcId)) ||
        (compromisedIds.includes(srcId) && compromisedIds.includes(dstId));

      return {
        id: `${srcId}-${dstId}-${idx}`,
        points: [srcNode.pos, dstNode.pos],
        start: new THREE.Vector3(...srcNode.pos),
        end: new THREE.Vector3(...dstNode.pos),
        isThreatLink,
        speed: 0.7 + (idx % 3) * 0.25,
        color: isThreatLink ? '#ef4444' : '#0284c7',
      };
    }).filter(Boolean);
  }, [nodesMap, compromisedIds, targetedIds]);

  return (
    <group>
      {linksData.map((link) => (
        <group key={link.id}>
          <Line
            points={link.points}
            color={link.isThreatLink ? '#ef4444' : '#1e293b'}
            lineWidth={link.isThreatLink ? 2.5 : 1}
            transparent
            opacity={link.isThreatLink ? 0.9 : 0.4}
          />
          <PacketPulse
            start={link.start}
            end={link.end}
            speed={link.speed}
            color={link.color}
            isThreat={link.isThreatLink}
          />
        </group>
      ))}
    </group>
  );
}

// Level, Upright Scene Container
function SceneContent({ activeScenario = 'default', onSelectNode }) {
  const groupRef = useRef();
  const [hoveredNode, setHoveredNode] = useState(null);

  const { compromisedIds, targetedIds } = useMemo(() => {
    switch (activeScenario) {
      case 'credential_dumping':
        return {
          compromisedIds: ['ws-101'],
          targetedIds: ['auth-srv', 'ws-201'],
        };
      case 'lateral_movement':
      case 'lateral_movement_wave':
        return {
          compromisedIds: ['web-01', 'auth-srv'],
          targetedIds: ['ws-201', 'vault-01', 'db-master'],
        };
      case 'data_exfiltration':
      case 'exfiltration_crisis':
        return {
          compromisedIds: ['db-master', 'auth-srv', 'ws-201'],
          targetedIds: ['fw-01', 'vault-01'],
        };
      case 'ransomware_staging':
        return {
          compromisedIds: ['ws-102', 'ws-201'],
          targetedIds: ['db-master', 'vault-01'],
        };
      default:
        return { compromisedIds: [], targetedIds: [] };
    }
  }, [activeScenario]);

  const nodesMap = useMemo(() => {
    return NETWORK_NODES.reduce((acc, n) => {
      acc[n.id] = n;
      return acc;
    }, {});
  }, []);

  useFrame(({ clock, pointer }) => {
    if (!groupRef.current) return;
    // Pure, level horizontal yaw only (NO pitch or roll tilt)
    const t = clock.getElapsedTime() * 0.12;
    groupRef.current.rotation.y = Math.sin(t) * 0.15 + pointer.x * 0.18;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Network Nodes */}
      {NETWORK_NODES.map((node) => (
        <NodePoint
          key={node.id}
          node={node}
          isCompromised={compromisedIds.includes(node.id)}
          isTargeted={targetedIds.includes(node.id)}
          isHovered={hoveredNode?.id === node.id}
          onHover={(n) => {
            setHoveredNode(n);
            if (onSelectNode) onSelectNode(n);
          }}
          onUnhover={() => setHoveredNode(null)}
        />
      ))}

      {/* Network Edges & Packets */}
      <NetworkLinks
        nodesMap={nodesMap}
        compromisedIds={compromisedIds}
        targetedIds={targetedIds}
      />
    </group>
  );
}

export default function HeroNetwork3D({ activeScenario = 'default', onSelectNode, className = '' }) {
  return (
    <div className={`w-full h-full min-h-[340px] relative rounded-2xl overflow-hidden bg-cyber-surface border border-slate-800 shadow-soc-card flex flex-col justify-between ${className}`}>
      {/* Clean Glassmorphic HUD Header */}
      <div className="p-3.5 px-4 bg-cyber-card/90 border-b border-slate-800 flex items-center justify-between z-10">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-xs font-bold text-slate-200 tracking-wider uppercase">
            Live 3D Topological Stream
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
          Level Surveillance View
        </span>
      </div>

      {/* 3D Canvas with Level Upright Camera */}
      <div className="flex-1 w-full relative">
        <Canvas
          camera={{ position: [0, 0.4, 8.5], fov: 42 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.9} />
          <pointLight position={[10, 10, 10]} intensity={1.5} color="#38bdf8" />
          <pointLight position={[-10, -5, -5]} intensity={0.8} color="#0284c7" />
          <SceneContent activeScenario={activeScenario} onSelectNode={onSelectNode} />
        </Canvas>
      </div>

      {/* Clean Bottom Legend Bar */}
      <div className="p-2.5 px-4 bg-cyber-card/90 border-t border-slate-800 flex items-center justify-between text-2xs font-mono text-slate-400 z-10">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Secure</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Targeted</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Breached</span>
          </span>
        </div>
        <span className="text-slate-500">Auto-Tracking</span>
      </div>
    </div>
  );
}
