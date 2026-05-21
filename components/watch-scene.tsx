"use client"

import { useRef, Suspense, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Environment, Center, Float } from '@react-three/drei'
import { useScroll, useTransform, useReducedMotion, MotionValue } from 'framer-motion'
import * as THREE from 'three'

// --- Watch hands configuration ---
// Proportions are relative to dial radius (distance from face center to 12-marker).
const HAND_SPECS = {
  hour:   { widthFrac: 0.08,  lengthFrac: 0.55, color: '#e8e0d0', zFracOffset: 0.02 },
  minute: { widthFrac: 0.05,  lengthFrac: 0.75, color: '#ffffff', zFracOffset: 0.04 },
  second: { widthFrac: 0.025, lengthFrac: 0.85, color: '#ff4444', zFracOffset: 0.06 },
} as const

// Sweep periods in seconds (decorative — does not represent real time).
const SWEEP_PERIOD_SECONDS = {
  hour: 43200,    // 12 hours
  minute: 3600,   // 60 minutes
  second: 60,     // 60 seconds
} as const

const MARKER_TOP_NAME = 'MM_Marker_12_L'
const MARKER_BOTTOM_NAME = 'MM_Marker_18'

const HAND_INIT_MAX_ATTEMPTS = 10

type HandKey = keyof typeof HAND_SPECS

interface HandParts {
  pivot: THREE.Group
  geometry: THREE.BoxGeometry
  material: THREE.MeshStandardMaterial
}

function createHandPivot(
  hand: HandKey,
  radius: number,
  centerLocal: THREE.Vector3,
  faceNormalLocal: THREE.Vector3,
): HandParts {
  const spec = HAND_SPECS[hand]
  const width = radius * spec.widthFrac
  const length = radius * spec.lengthFrac
  const depth = width * 0.5

  const geometry = new THREE.BoxGeometry(width, length, depth)
  const material = new THREE.MeshStandardMaterial({
    color: spec.color,
    metalness: 0.8,
    roughness: 0.2,
  })
  const mesh = new THREE.Mesh(geometry, material)
  // Offset mesh so hand extends ~60% above pivot, ~40% below (classic proportions).
  mesh.position.y = length * 0.3

  const pivot = new THREE.Group()
  pivot.name = `watch-hand-${hand}`
  pivot.add(mesh)

  // Position pivot at face center, lifted slightly along the face normal so the
  // hand sits above the dial surface and doesn't z-fight with markers.
  const zOffset = radius * spec.zFracOffset
  pivot.position.copy(centerLocal).addScaledVector(faceNormalLocal, zOffset)

  // Align the pivot's local +Z with the face normal so rotation.z spins the
  // hand inside the dial plane. quaternion.setFromUnitVectors maps (0,0,1) → normal.
  pivot.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    faceNormalLocal.clone().normalize(),
  )

  return { pivot, geometry, material }
}

interface FaceFrame {
  centerLocal: THREE.Vector3   // in clonedScene's local space
  radius: number               // distance from center to 12-marker
  faceNormalLocal: THREE.Vector3
}

function discoverWatchFace(clonedScene: THREE.Object3D): FaceFrame | null {
  const markerTop = clonedScene.getObjectByName(MARKER_TOP_NAME)
  const markerBottom = clonedScene.getObjectByName(MARKER_BOTTOM_NAME)
  if (!markerTop || !markerBottom) {
    console.warn(
      `[watch-scene] Missing dial markers (${MARKER_TOP_NAME} or ${MARKER_BOTTOM_NAME}); skipping hand creation.`
    )
    return null
  }

  // Ensure matrices are current.
  clonedScene.updateMatrixWorld(true)

  const worldTop = new THREE.Vector3()
  const worldBottom = new THREE.Vector3()
  markerTop.getWorldPosition(worldTop)
  markerBottom.getWorldPosition(worldBottom)

  const centerLocal = new THREE.Vector3()
    .addVectors(worldTop, worldBottom)
    .multiplyScalar(0.5)
  clonedScene.worldToLocal(centerLocal)

  const topLocal = clonedScene.worldToLocal(worldTop.clone())
  const radius = topLocal.distanceTo(centerLocal)

  if (radius < 1e-6) {
    console.warn('[watch-scene] Degenerate dial radius; skipping hand creation.')
    return null
  }

  // Approximate face normal: most watch dials in this model have markers in a
  // plane whose normal is +Z in local model space. Use cross of (top-center) and
  // a perpendicular axis derived from the plane defined by the two markers.
  // For our model both markers share Z, so normal == ±Z. Default to +Z and the
  // hands will sit above the dial; if they sit below the dial, flip the sign.
  const faceNormalLocal = new THREE.Vector3(0, 0, 1)

  return { centerLocal, radius, faceNormalLocal }
}

interface WatchModelProps {
  scrollYProgress: MotionValue<number>
}

function WatchModel({ scrollYProgress }: WatchModelProps) {
  const meshRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF('/models/watch.glb')

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
  const reducedMotion = useReducedMotion()

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
        frameloop={reducedMotion ? 'demand' : 'always'}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Lights />
          <Float
            speed={reducedMotion ? 0 : 1.5}
            rotationIntensity={reducedMotion ? 0 : 0.1}
            floatIntensity={reducedMotion ? 0 : 0.3}
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

useGLTF.preload('/models/watch.glb')
