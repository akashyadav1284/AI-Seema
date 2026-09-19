import React, { Suspense, useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Sphere, Box, Text, Html, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Fallback SVG for reduced motion or WebGL failure
const FallbackSVG = () => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-surface/50 rounded-xl border border-border p-8">
    <div className="flex items-center gap-4 text-slate-300">
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-full border-2 border-primary flex items-center justify-center bg-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
          🎥
        </div>
        <span className="text-xs">Cameras</span>
      </div>
      <div className="w-16 h-0.5 bg-primary/50 relative">
        <div className="absolute top-1/2 -translate-y-1/2 right-0 w-2 h-2 rounded-full bg-primary animate-ping" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded border-2 border-purple-500 flex items-center justify-center bg-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
          🧠
        </div>
        <span className="text-xs font-bold text-purple-400">AI Engine</span>
      </div>
      <div className="w-16 h-0.5 bg-warning/50 relative">
        <div className="absolute top-1/2 -translate-y-1/2 right-0 w-2 h-2 rounded-full bg-warning animate-ping" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-full border-2 border-warning flex items-center justify-center bg-warning/20 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
          ⚠️
        </div>
        <span className="text-xs">Alerts</span>
      </div>
    </div>
    <div className="mt-8 text-xs text-slate-500">2D Reduced Motion Fallback Active</div>
  </div>
);

// Animated Data Particle flowing along a line
const DataParticle = ({ start, end, color }) => {
  const meshRef = useRef();
  const [progress, setProgress] = useState(Math.random());
  
  useFrame((state, delta) => {
    setProgress(p => (p + delta * 0.5) % 1);
    if (meshRef.current) {
      meshRef.current.position.lerpVectors(
        new THREE.Vector3(...start), 
        new THREE.Vector3(...end), 
        progress
      );
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
};

const AICore = ({ position }) => {
  const coreRef = useRef();
  
  useFrame((state) => {
    if (coreRef.current) {
      coreRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
      coreRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group position={position}>
      <Box ref={coreRef} args={[1.5, 1.5, 1.5]}>
        <meshStandardMaterial color="#8b5cf6" wireframe transparent opacity={0.8} />
      </Box>
      <Box args={[1, 1, 1]}>
        <meshStandardMaterial color="#c4b5fd" emissive="#8b5cf6" emissiveIntensity={2} toneMapped={false} />
      </Box>
      <Html position={[0, 1.5, 0]} center>
        <div className="px-2 py-1 bg-white shadow-sm rounded border border-purple-200 text-[10px] text-purple-700 whitespace-nowrap font-mono tracking-widest font-bold">
          AI INFERENCE CORE
        </div>
      </Html>
    </group>
  );
};

const Node = ({ position, label, color, type }) => {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.1;
    }
  });

  return (
    <group position={position} ref={meshRef}>
      <Sphere args={[0.4, 16, 16]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} toneMapped={false} />
      </Sphere>
      {type === 'camera' && (
        <Sphere args={[0.6, 16, 16]}>
           <meshBasicMaterial color={color} transparent opacity={0.2} wireframe />
        </Sphere>
      )}
      <Html position={[0, -0.8, 0]} center>
        <div className="px-1.5 py-0.5 bg-white shadow-sm rounded text-[10px] text-slate-700 whitespace-nowrap border border-slate-200 font-medium">
          {label}
        </div>
      </Html>
    </group>
  );
};

const Scene = () => {
  const corePos = [0, 0, 0];
  
  const cameras = [
    { pos: [-4, 1, -2], label: 'CAM-N1', color: '#3b82f6' },
    { pos: [-4, 0, 2], label: 'CAM-N2', color: '#3b82f6' },
    { pos: [-3, -1.5, 0], label: 'CAM-E1', color: '#10b981' },
  ];

  const outputs = [
    { pos: [4, 1, -1.5], label: 'ZONE-A', color: '#f59e0b' },
    { pos: [4, -1, 1.5], label: 'ALERT-DB', color: '#ef4444' },
  ];

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 5, 0]} intensity={2} color="#ffffff" />
      
      {/* Central AI Core */}
      <AICore position={corePos} />

      {/* Cameras (Inputs) */}
      {cameras.map((cam, i) => (
        <React.Fragment key={`cam-${i}`}>
          <Node position={cam.pos} label={cam.label} color={cam.color} type="camera" />
          <Line points={[cam.pos, corePos]} color={cam.color} opacity={0.3} transparent lineWidth={1} dashed dashScale={10} dashSize={1} dashOffset={0} />
          {/* Data particles flowing to core */}
          <DataParticle start={cam.pos} end={corePos} color={cam.color} />
          <DataParticle start={cam.pos} end={corePos} color={cam.color} />
        </React.Fragment>
      ))}

      {/* Outputs (Zones/Events) */}
      {outputs.map((out, i) => (
        <React.Fragment key={`out-${i}`}>
          <Node position={out.pos} label={out.label} color={out.color} type="output" />
          <Line points={[corePos, out.pos]} color={out.color} opacity={0.3} transparent lineWidth={1} />
          {/* Data particles flowing from core */}
          <DataParticle start={corePos} end={out.pos} color={out.color} />
        </React.Fragment>
      ))}
      
      <OrbitControls 
        enablePan={false} 
        enableZoom={true} 
        minDistance={5} 
        maxDistance={15}
        autoRotate 
        autoRotateSpeed={0.5} 
      />
    </>
  );
};

export default function SecurityTopology3D() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    
    const handler = (e) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  if (reducedMotion) {
    return <FallbackSVG />;
  }

  return (
    <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden relative cursor-move bg-slate-50">
      <Canvas camera={{ position: [0, 3, 8], fov: 45 }} dpr={[1, 2]} performance={{ min: 0.5 }}>
        <color attach="background" args={['#f8fafc']} />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
