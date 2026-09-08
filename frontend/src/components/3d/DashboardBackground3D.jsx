import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function AmbientParticles({ count = 80 }) {
  const pointsRef = useRef();

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const colorSky = new THREE.Color('#38bdf8');
    const colorEmerald = new THREE.Color('#10b981');
    const colorAmber = new THREE.Color('#f59e0b');

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 35;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 25;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;

      const chosenColor = i % 5 === 0 ? colorEmerald : i % 8 === 0 ? colorAmber : colorSky;
      col[i * 3] = chosenColor.r;
      col[i * 3 + 1] = chosenColor.g;
      col[i * 3 + 2] = chosenColor.b;
    }
    return [pos, col];
  }, [count]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime() * 0.04;
    pointsRef.current.rotation.y = t * 0.5;
    pointsRef.current.rotation.x = Math.sin(t * 0.3) * 0.1;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.14}
        vertexColors
        transparent
        opacity={0.35}
        sizeAttenuation
      />
    </points>
  );
}

function CyberGrid() {
  const gridRef = useRef();

  useFrame(({ clock }) => {
    if (!gridRef.current) return;
    const t = clock.getElapsedTime() * 0.02;
    gridRef.current.rotation.z = t;
  });

  return (
    <group position={[0, -12, -8]} rotation={[-Math.PI / 2.3, 0, 0]}>
      <gridHelper args={[60, 30, '#0284c7', '#1e293b']} ref={gridRef}>
        <meshBasicMaterial transparent opacity={0.12} color="#0284c7" />
      </gridHelper>
    </group>
  );
}

export default function DashboardBackground3D() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        dpr={[1, 1]}
        gl={{ antialias: false, powerPreference: 'low-power' }}
      >
        <AmbientParticles count={75} />
        <CyberGrid />
      </Canvas>
    </div>
  );
}
