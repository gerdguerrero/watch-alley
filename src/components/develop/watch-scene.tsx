"use client";

import { Center, Environment, Float, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";

function WatchModel() {
  const { scene } = useGLTF("/models/watch.glb");

  // Clone scene once so multiple mounts don't share mutations.
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  // Static model. The earlier version had scroll-tied scale/position/rotation
  // (scale ramped 1 -> 1.1 -> 1.05 -> 0.75) that visibly shrank and zoomed
  // the watch as the user scrolled past the hero. Removed so the canvas
  // content stays put; gentle ambient motion still comes from <Float>.
  return (
    <group rotation={[-0.1, 0, 0]}>
      <Center>
        <primitive object={clonedScene} scale={18} />
      </Center>
    </group>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} color="#fff5e6" />
      <directionalLight position={[-5, 3, -5]} intensity={0.4} color="#e6f0ff" />
      <spotLight position={[0, 10, 2]} angle={0.4} penumbra={1} intensity={0.8} color="#fff" />
      {/* Rim light for premium feel */}
      <pointLight position={[-3, 0, -3]} intensity={0.3} color="#f5a623" />
    </>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial color="#333" wireframe />
    </mesh>
  );
}

export function WatchScene() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 2]}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Lights />
          <Float
            speed={1.5}
            rotationIntensity={0.1}
            floatIntensity={0.3}
            floatingRange={[-0.05, 0.05]}
          >
            <WatchModel />
          </Float>
          <Environment preset="studio" environmentIntensity={0.5} />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/watch.glb");
