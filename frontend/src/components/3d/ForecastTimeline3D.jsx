import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Ring, Line } from '@react-three/drei';
import * as THREE from 'three';

const STAGES_3D = [
  {
    step: 1,
    title: 'T+1: Initial Footprint',
    phase: 'Auth Spike & Reconnaissance',
    pos: [-3.2, 0, 0],
    color: '#fbbf24', // Amber
    severity: 'Medium',
    prob: '89%',
    mitre: 'T1078',
  },
  {
    step: 2,
    title: 'T+2: Lateral Pivoting',
    phase: 'Internal Host Discovery & SMB',
    pos: [0, 0, 0],
    color: '#f97316', // Orange
    severity: 'High',
    prob: '94%',
    mitre: 'T1021.002',
  },
  {
    step: 3,
    title: 'T+3: Critical Impact',
    phase: 'Database Exfiltration / Ransom',
    pos: [3.2, 0, 0],
    color: '#ef4444', // Crimson
    severity: 'Critical',
    prob: '97%',
    mitre: 'T1048',
  },
];

// Single 3D Stage Anchor
function StageAnchor({ stage, isSelected, onSelect }) {
  const meshRef = useRef();
  const ringRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ringRef.current) {
      ringRef.current.rotation.z = t * (stage.step === 3 ? 1.2 : 0.7);
    }
    if (meshRef.current) {
      const scale = isSelected ? 1 + Math.sin(t * 5) * 0.12 : 1;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={stage.pos}>
      {/* Interactive Core Sphere */}
      <mesh
        ref={meshRef}
        onClick={() => onSelect(stage.step)}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[isSelected ? 0.65 : 0.48, 32, 32]} />
        <meshStandardMaterial
          color={stage.color}
          emissive={stage.color}
          emissiveIntensity={isSelected ? 2.5 : 1.0}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Level Concentric Pulse Ring */}
      <group ref={ringRef}>
        <Ring args={[0.8, 0.95, 32]}>
          <meshBasicMaterial
            color={stage.color}
            transparent
            opacity={isSelected ? 0.85 : 0.35}
            side={THREE.DoubleSide}
          />
        </Ring>
      </group>
    </group>
  );
}

// Level Horizontal Trajectory Scene
function ForecastScene({ selectedStage = 1, onSelectStage }) {
  const linePoints = useMemo(() => STAGES_3D.map((s) => s.pos), []);
  const groupRef = useRef();

  useFrame(({ pointer }) => {
    if (!groupRef.current) return;
    // Level subtle parallax only on X-axis (NO pitch/roll tilt!)
    groupRef.current.position.x = pointer.x * 0.3;
  });

  return (
    <group ref={groupRef}>
      {/* Connecting Horizontal Trajectory Line */}
      <Line
        points={linePoints}
        color="#38bdf8"
        lineWidth={2.5}
        dashed
        dashSize={0.3}
        gapSize={0.15}
      />

      {/* 3D Stages */}
      {STAGES_3D.map((stage) => (
        <StageAnchor
          key={stage.step}
          stage={stage}
          isSelected={selectedStage === stage.step}
          onSelect={onSelectStage}
        />
      ))}
    </group>
  );
}

export default function ForecastTimeline3D({ selectedStage = 1, onSelectStage, className = '' }) {
  const activeStage = STAGES_3D.find((s) => s.step === selectedStage) || STAGES_3D[0];

  return (
    <div className={`w-full rounded-2xl overflow-hidden bg-cyber-surface border border-slate-800 shadow-soc-card flex flex-col justify-between ${className}`}>
      {/* Top HUD Header */}
      <div className="p-3.5 px-5 bg-cyber-card/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
          <span className="font-mono text-xs font-bold text-slate-200 tracking-wider uppercase">
            Spatial K=3 Attack Forecast Horizon
          </span>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
          Active: T+{activeStage.step} ({activeStage.prob} Conf)
        </span>
      </div>

      {/* 3D Horizontal Viewport */}
      <div className="w-full h-48 sm:h-56 relative bg-cyber-black/60">
        <Canvas
          camera={{ position: [0, 0, 6.8], fov: 42 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.9} />
          <pointLight position={[10, 10, 10]} intensity={1.5} color="#38bdf8" />
          <pointLight position={[-10, -5, -5]} intensity={1.0} color="#ef4444" />
          <ForecastScene selectedStage={selectedStage} onSelectStage={onSelectStage} />
        </Canvas>
      </div>

      {/* Bottom Interactive Stage Selector Tabs */}
      <div className="p-3 px-4 bg-cyber-card/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          {STAGES_3D.map((stage) => {
            const isSelected = selectedStage === stage.step;
            return (
              <button
                key={stage.step}
                onClick={() => onSelectStage(stage.step)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all duration-200 flex items-center space-x-2 border ${
                  isSelected
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm'
                    : 'bg-cyber-surface text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span>{`T+${stage.step}: ${stage.severity}`}</span>
              </button>
            );
          })}
        </div>

        <div className="text-xs font-mono text-slate-400">
          <strong className="text-white">{activeStage.title}</strong> — {activeStage.phase}
        </div>
      </div>
    </div>
  );
}
