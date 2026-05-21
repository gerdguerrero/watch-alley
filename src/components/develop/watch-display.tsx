"use client"

import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment, Center, Float } from '@react-three/drei'
import * as THREE from 'three'

function WatchModel() {
  const meshRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF('/models/watch.glb')
  
  const clonedScene = useMemo(() => scene.clone(), [scene])
  
  // Gentle continuous rotation
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2
    }
  })

  return (
    <group ref={meshRef} rotation={[-0.2, 0, 0]}>
      <Center>
        <primitive 
          object={clonedScene} 
          scale={16}
        />
      </Center>
    </group>
  )
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.4} />
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
      <pointLight
        position={[-3, 0, -3]}
        intensity={0.4}
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

export function WatchDisplay() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 3], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 2]}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Lights />
          <Float 
            speed={2} 
            rotationIntensity={0.15} 
            floatIntensity={0.4}
            floatingRange={[-0.1, 0.1]}
          >
            <WatchModel />
          </Float>
          <Environment preset="studio" environmentIntensity={0.5} />
        </Suspense>
      </Canvas>
    </div>
  )
}

useGLTF.preload('/models/watch.glb')
