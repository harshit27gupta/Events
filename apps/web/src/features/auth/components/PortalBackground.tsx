import React, { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Float, Icosahedron, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

function Particles({ count = 140 }: { count?: number }) {
  const ref = useRef<any>();
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) {
      ref.current.rotation.x = Math.sin(t * 0.1) * 0.1;
      ref.current.rotation.y = Math.cos(t * 0.1) * 0.1;
    }
  });

  return (
    <group ref={ref}>
      <Points positions={positions} stride={3} frustumCulled>
        <PointMaterial
          transparent
          color="#a855f7"
          size={0.035}
          sizeAttenuation
          depthWrite={false}
        />
      </Points>
    </group>
  );
}

function Prisms() {
  return (
    <Float speed={1} rotationIntensity={0.2} floatIntensity={0.8}>
      <group position={[0, 0, -2]}>
        <Icosahedron args={[1.2, 0]}>
          <meshStandardMaterial
            color={new THREE.Color('#6d28d9')}
            emissive={new THREE.Color('#7c3aed')}
            emissiveIntensity={0.35}
            metalness={0.4}
            roughness={0.2}
          />
        </Icosahedron>
      </group>
    </Float>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 2, 2]} intensity={0.7} color={new THREE.Color('#93c5fd')} />
      <directionalLight position={[-3, -1, -2]} intensity={0.5} color={new THREE.Color('#e879f9')} />
    </>
  );
}

export function PortalBackground() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }} dpr={[1, 2]}>
        <color attach="background" args={[0x0a0a0f]} />
        <Suspense fallback={null}>
          <Lights />
          <Prisms />
          <Particles />
          <EffectComposer>
            <Bloom intensity={0.6} luminanceThreshold={0.2} luminanceSmoothing={0.7} />
          </EffectComposer>
        </Suspense>
      </Canvas>
      <div className="absolute inset-0 pointer-events-none portal-overlay" />
    </div>
  );
}

export default PortalBackground;


