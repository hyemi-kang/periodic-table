"use client";

import { Suspense, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { BackSide } from "three";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";

interface Props {
  children: ReactNode;
  cameraZ?: number;
  minDistance?: number;
  maxDistance?: number;
}

/**
 * Shared canvas: offline studio lighting (no HDR download), orbit controls with
 * drag-to-rotate / wheel-to-zoom, and auto-rotation until the user interacts.
 */
export default function SceneCanvas({ children, cameraZ = 6, minDistance = 2.5, maxDistance = 16 }: Props) {
  const [auto, setAuto] = useState(true);

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.7, cameraZ], fov: 38, near: 0.1, far: 100 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ touchAction: "none" }}
    >
      <color attach="background" args={["#000000"]} />
      <ambientLight intensity={0.15} />
      <directionalLight position={[4, 6, 5]} intensity={1.4} />
      <Suspense fallback={null}>
        <Environment resolution={256} frames={1} background={false}>
          {/* a soft grey dome so mirror-like metals reflect *something* instead of pure black */}
          <mesh scale={60}>
            <sphereGeometry args={[1, 32, 16]} />
            <meshBasicMaterial color="#6f7580" side={BackSide} toneMapped={false} />
          </mesh>
          <Lightformer form="rect" intensity={4} position={[0, 5, -2]} scale={[10, 4, 1]} rotation-x={Math.PI / 2} />
          <Lightformer form="rect" intensity={2.5} position={[-5, 1, 2]} scale={[1.5, 6, 1]} rotation-y={Math.PI / 2} />
          <Lightformer form="rect" intensity={2.5} position={[5, 1, 2]} scale={[1.5, 6, 1]} rotation-y={-Math.PI / 2} />
          <Lightformer form="rect" intensity={1.2} position={[0, 1, -6]} scale={[10, 3, 1]} />
          <Lightformer form="circle" intensity={2} position={[0, -4, 3]} scale={4} rotation-x={-Math.PI / 2} />
        </Environment>
        {children}
      </Suspense>
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        autoRotate={auto}
        autoRotateSpeed={1.1}
        minDistance={minDistance}
        maxDistance={maxDistance}
        onStart={() => setAuto(false)}
      />
    </Canvas>
  );
}
