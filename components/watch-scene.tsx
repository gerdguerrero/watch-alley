"use client"

import { useRef, Suspense, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Environment, Center, Float } from '@react-three/drei'
import { useScroll, useTransform, MotionValue } from 'framer-motion'
import * as THREE from 'three'

interface WatchModelProps {
  scrollYProgress: MotionValue<number>
}

function WatchModel({ scrollYProgress }: WatchModelProps) {
  const meshRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF('/models/seiko_watch.glb')

  // Clone scene once
  const clonedScene = useMemo(() => scene.clone(), [scene])
  
  // Scroll-based transforms - MDX.so style smooth transitions
  const rotationY = useTransform(scrollYProgress, [0, 1], [0, Math.PI * 1.5])
  const rotationX = useTransform(scrollYProgress, [0, 0.5, 1], [-0.3, -0.1, 0.2])
  const rotationZ = useTransform(scrollYProgress, [0, 1], [0, 0.3])
  const positionY = useTransform(scrollYProgress, [0, 1], [0, -1])
  const positionZ = useTransform(scrollYProgress, [0, 0.5, 1], [0, 0.3, -0.5])
  const scale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [1, 1.1, 1.05, 0.75])
  
  useFrame((_, delta) => {
    if (meshRef.current) {
      // Smooth interpolation for scroll values
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y, 
        rotationY.get(), 
        delta * 3
      )
      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        meshRef.current.rotation.x,
        rotationX.get(),
        delta * 3
      )
      meshRef.current.rotation.z = THREE.MathUtils.lerp(
        meshRef.current.rotation.z,
        rotationZ.get() + Math.sin(Date.now() * 0.0005) * 0.02,
        delta * 3
      )
      meshRef.current.position.y = THREE.MathUtils.lerp(
        meshRef.current.position.y,
        positionY.get(),
        delta * 3
      )
      meshRef.current.position.z = THREE.MathUtils.lerp(
        meshRef.current.position.z,
        positionZ.get(),
        delta * 3
      )
      const s = scale.get()
      const currentScale = meshRef.current.scale.x
      const newScale = THREE.MathUtils.lerp(currentScale, s, delta * 3)
      meshRef.current.scale.setScalar(newScale)
    }
  })

  return (
    <group ref={meshRef}>
      <Center>
        <primitive 
          object={clonedScene} 
          scale={18}
        />
      </Center>
    </group>
  )
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight 
        position={[5, 8, 5]} 
        intensity={1.2} 
        color="#fff5e6"
      />
      <directionalLight 
        position={[-5, 3, -5]} 
        intensity={0.4}
        color="#e6f0ff"
      />
      <spotLight
        position={[0, 10, 2]}
        angle={0.4}
        penumbra={1}
        intensity={0.8}
        color="#fff"
      />
      {/* Rim light for premium feel */}
      <pointLight
        position={[-3, 0, -3]}
        intensity={0.3}
        color="#f5a623"
      />
    </>
  )
}

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial color="#333" wireframe />
    </mesh>
  )
}

export function WatchScene() {
  const { scrollYProgress } = useScroll()

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
            <WatchModel scrollYProgress={scrollYProgress} />
          </Float>
          <Environment preset="studio" environmentIntensity={0.5} />
        </Suspense>
      </Canvas>
    </div>
  )
}

useGLTF.preload('/models/seiko_watch.glb')
