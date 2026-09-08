import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';

// Sample network topology node definitions
const NETWORK_NODES = [
  // Core & Firewall
  { id: 'fw-01', label: 'Edge Firewall', pos: [0, 2.5, 0], type: 'gateway', tier: 'edge' },
  { id: 'gw-core', label: 'Core Gateway', pos: [0, 0.8, 0.5], type: 'gateway', tier: 'core' },
  
  // DMZ Tier
  { id: 'web-01', label: 'Web Server Alpha', pos: [-3.2, 1.8, -1.2], type: 'server', tier: 'dmz' },
  { id: 'web-02', label: 'API Gateway', pos: [3.2, 1.8, -1.2], type: 'server', tier: 'dmz' },
  { id: 'auth-srv', label: 'Auth & LDAP', pos: [-1.8, 0.2, -2.5], type: 'server', tier: 'dmz' },

  // Internal Workstations (Subnet A & B)
  { id: 'ws-101', label: 'Workstation 101', pos: [-4.5, -1.5, 1.2], type: 'workstation', tier: 'internal' },
  { id: 'ws-102', label: 'Workstation 102', pos: [-3.0, -2.8, 0.8], type: 'workstation', tier: 'internal' },
  { id: 'ws-103', label: 'Workstation 103', pos: [-1.5, -2.2, 2.0], type: 'workstation', tier: 'internal' },
  { id: 'ws-201', label: 'Admin Terminal', pos: [1.5, -2.2, 2.0], type: 'workstation', tier: 'internal' },
  { id: 'ws-202', label: 'Dev Laptop', pos: [3.2, -2.8, 0.8], type: 'workstation', tier: 'internal' },
  { id: 'ws-203', label: 'Ops Console', pos: [4.5, -1.5, 1.2], type: 'workstation', tier: 'internal' },

  // Sensitive Core & Database Tier
  { id: 'db-master', label: 'Customer DB Master', pos: [-2.2, -0.8, -3.2], type: 'db', tier: 'critical' },
  { id: 'db-replica', label: 'Analytics DB', pos: [2.2, -0.8, -3.2], type: 'db', tier: 'critical' },
  { id: 'vault-01', label: 'HSM KeyVault', pos: [0, -1.8, -3.8], type: 'vault', tier: 'critical' },
  { id: 'backup-srv', label: 'Immutable Backup', pos: [0, -3.4, -2.2], type: 'backup', tier: 'critical' },
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
  ['ws-102', 'ws-103'],
  ['ws-103', 'ws-201'],
  ['ws-201', 'ws-202'],
  ['ws-202', 'ws-203'],
  ['ws-201', 'vault-01'],
  ['db-master', 'db-replica'],
  ['db-master', 'backup-srv'],
  ['vault-01', 'backup-srv'],
];

// Node Mesh Component
function NodePoint({ node, isCompromised, isTargeted, isHovered, onHover, onUnhover }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    if (isCompromised) {
      // Urgent flaring pulse
      const scale = 1 + Math.sin(t * 8) * 0.25;
      meshRef.current.scale.set(scale, scale, scale);
    } else if (isTargeted) {
      const scale = 1 + Math.sin(t * 4) * 0.15;
      meshRef.current.scale.set(scale, scale, scale);
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

  const size = node.tier === 'critical' ? 0.38 : node.type === 'gateway' ? 0.42 : 0.28;

  return (
    <group position={node.pos}>
      {/* Outer Halo */}
      <Sphere args={[size * 1.8, 16, 16]}>
        <meshBasicMaterial
          color={nodeColor}
          transparent
          opacity={isCompromised ? 0.35 : isHovered ? 0.3 : 0.12}
        />
      </Sphere>

      {/* Core Sphere */}
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
          emissiveIntensity={isCompromised ? 2.5 : isTargeted ? 1.8 : 0.8}
          roughness={0.2}
          metalness={0.8}
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
      <sphereGeometry args={[isThreat ? 0.1 : 0.07, 12, 12]} />
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
        speed: 0.8 + (idx % 4) * 0.3,
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
            opacity={link.isThreatLink ? 0.9 : 0.45}
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

// Main 3D Scene Controller
function SceneContent({ activeScenario = 'default', onSelectNode }) {
  const groupRef = useRef();
  const [hoveredNode, setHoveredNode] = useState(null);

  // Dynamic threat attribution based on scenario
  const { compromisedIds, targetedIds } = useMemo(() => {
    switch (activeScenario) {
      case 'credential_dumping':
        return {
          compromisedIds: ['ws-101', 'ws-102'],
          targetedIds: ['auth-srv', 'ws-201'],
        };
      case 'lateral_movement':
        return {
          compromisedIds: ['web-01', 'auth-srv'],
          targetedIds: ['ws-201', 'vault-01', 'db-master'],
        };
      case 'data_exfiltration':
        return {
          compromisedIds: ['db-master', 'auth-srv', 'ws-201'],
          targetedIds: ['fw-01', 'vault-01'],
        };
      case 'ransomware_staging':
        return {
          compromisedIds: ['ws-103', 'ws-201', 'backup-srv'],
          targetedIds: ['db-master', 'vault-01'],
        };
      case 'ai_vs_rule_conflict':
        return {
          compromisedIds: ['web-02'],
          targetedIds: ['auth-srv'],
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
    // Gentle rotation + responsive mouse parallax
    const t = clock.getElapsedTime() * 0.15;
    groupRef.current.rotation.y = Math.sin(t) * 0.2 + pointer.x * 0.35;
    groupRef.current.rotation.x = Math.cos(t * 0.8) * 0.1 - pointer.y * 0.25;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
      <group ref={groupRef}>
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

        {/* Network Traffic Edges & Packet Pulses */}
        <NetworkLinks
          nodesMap={nodesMap}
          compromisedIds={compromisedIds}
          targetedIds={targetedIds}
        />
      </group>
    </Float>
  );
}

export default function HeroNetwork3D({ activeScenario = 'default', onSelectNode, className = '' }) {
  return (
    <div className={`w-full h-full relative rounded-2xl overflow-hidden bg-cyber-black/80 border border-slate-800/80 shadow-2xl ${className}`}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 11], fov: 48 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#38bdf8" />
        <pointLight position={[-10, -10, -10]} intensity={1.0} color="#0284c7" />
        <SceneContent activeScenario={activeScenario} onSelectNode={onSelectNode} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          maxPolarAngle={Math.PI / 1.7}
          minPolarAngle={Math.PI / 2.3}
          maxAzimuthAngle={Math.PI / 4}
          minAzimuthAngle={-Math.PI / 4}
        />
      </Canvas>

      {/* Cyber HUD Overlay Info */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none flex items-center space-x-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
        <span className="font-mono text-xs font-semibold text-sky-400 tracking-wider uppercase bg-cyber-surface/90 px-2.5 py-1 rounded-md border border-slate-700/80 backdrop-blur-md">
          3D Live Topology Stream
        </span>
      </div>

      <div className="absolute bottom-4 right-4 z-10 pointer-events-none flex items-center space-x-3 text-2xs font-mono text-slate-400 bg-cyber-surface/85 px-3 py-1.5 rounded-lg border border-slate-800 backdrop-blur-md">
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
    </div>
  );
}
