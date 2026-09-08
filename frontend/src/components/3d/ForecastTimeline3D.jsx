import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Float, Ring, Line } from '@react-three/drei';
import * as THREE from 'three';

const STAGES_3D = [
  {
    step: 1,
    title: 'T+1: Initial Footprint',
    phase: 'Reconnaissance & Auth Spike',
    pos: [-4.2, 0.4, 1.5],
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
    pos: [4.2, -0.4, -1.5],
    color: '#ef4444', // Crimson
    severity: 'Critical',
    prob: '97%',
    mitre: 'T1048',
  },
];

// 3D Stage Ring and Node
function StageAnchor({ stage, isSelected, onSelect }) {
  const meshRef = useRef();
  const ringRef = useRef();

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const t = clock.getElapsedTime();
    ringRef.current.rotation.z = t * (stage.step === 3 ? 1.5 : 0.8);

    if (meshRef.current) {
      const scale = isSelected ? 1 + Math.sin(t * 6) * 0.12 : 1;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={stage.pos}>
      {/* Interactive Trigger Sphere */}
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
        <sphereGeometry args={[isSelected ? 0.75 : 0.55, 32, 32]} />
        <meshStandardMaterial
          color={stage.color}
          emissive={stage.color}
          emissiveIntensity={isSelected ? 3.0 : 1.2}
          roughness={0.2}
          metalness={0.7}
        />
      </mesh>

      {/* Orbiting Threat Radius Ring */}
      <group ref={ringRef}>
        <Ring args={[0.9, 1.05, 32]}>
          <meshBasicMaterial
            color={stage.color}
            transparent
            opacity={isSelected ? 0.8 : 0.35}
            side={THREE.DoubleSide}
          />
        </Ring>
      </group>

      {/* 3D Floating Stage Label */}
      <Text
        position={[0, 1.4, 0]}
        fontSize={0.36}
        color={isSelected ? '#38bdf8' : '#e2e8f0'}
        anchorX="center"
        anchorY="middle"
      >
        {`STAGE T+${stage.step}`}
      </Text>

      <Text
        position={[0, -1.3, 0]}
        fontSize={0.25}
        color={stage.color}
        anchorX="center"
        anchorY="middle"
      >
        {`${stage.severity.toUpperCase()} (${stage.prob})`}
      </Text>
    </group>
  );
}

// Camera Dolly & Trajectory Controller
function ForecastScene({ selectedStage = 1, onSelectStage }) {
  const linePoints = useMemo(() => STAGES_3D.map((s) => s.pos), []);

  useFrame(({ camera }) => {
    // Smooth camera interpolation toward selected stage plane
    const target = STAGES_3D.find((s) => s.step === selectedStage) || STAGES_3D[0];
    const targetCamX = target.pos[0] * 0.45;
    const targetCamY = target.pos[1] * 0.3 + 0.3;
    const targetCamZ = 8.5;

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, 0.05);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, 0.05);
    camera.lookAt(target.pos[0] * 0.2, 0, 0);
  });

  return (
    <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.2}>
      <group>
        {/* Connecting Progression Trajectory */}
        <Line
          points={linePoints}
          color="#38bdf8"
          lineWidth={2.5}
          dashed
          dashSize={0.4}
          gapSize={0.2}
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
    </Float>
  );
}

export default function ForecastTimeline3D({ selectedStage = 1, onSelectStage, className = '' }) {
  return (
    <div className={`w-full h-72 sm:h-80 md:h-96 relative rounded-2xl overflow-hidden bg-cyber-black/90 border border-slate-800 shadow-2xl ${className}`}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 9], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.9} />
        <pointLight position={[10, 10, 10]} intensity={1.8} color="#38bdf8" />
        <pointLight position={[-10, -5, -5]} intensity={1.2} color="#ef4444" />
        <ForecastScene selectedStage={selectedStage} onSelectStage={onSelectStage} />
      </Canvas>

      {/* Floating HUD Controls */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none flex items-center space-x-2">
        <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
        <span className="font-mono text-xs font-semibold text-sky-300 uppercase tracking-widest bg-cyber-surface/90 px-3 py-1 rounded-md border border-slate-700/80 backdrop-blur-md">
          Spatial K=3 Attack Forecast Horizon
        </span>
      </div>

      {/* Interactive Stage Selector Bar on 3D Canvas */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-2 bg-cyber-surface/90 p-1.5 rounded-xl border border-slate-700/80 backdrop-blur-md">
        {[1, 2, 3].map((step) => {
          const isSelected = selectedStage === step;
          return (
            <button
              key={step}
              onClick={() => onSelectStage(step)}
              className={`px-3 py-1 rounded-lg font-mono text-xs font-semibold transition-all duration-200 flex items-center space-x-1.5 ${
                isSelected
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-md shadow-sky-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <span>{`T+${step}`}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  step === 1 ? 'bg-amber-400' : step === 2 ? 'bg-orange-500' : 'bg-rose-500'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
