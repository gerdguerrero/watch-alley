# Watch Hands Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add animated hour, minute, and second hands to the 3D watch in the hero section. Hands sweep at correct clock speeds and rotate with the watch model during scroll-driven transforms.

**Architecture:** Single-file change to `components/watch-scene.tsx`. A new `WatchHands` helper component creates three pivot groups containing `BoxGeometry` hand meshes and attaches them imperatively to the cloned GLTF scene. Face center and dial radius are derived at runtime from the existing `MM_Marker_12_L` and `MM_Marker_18` nodes via `getWorldPosition()` + `worldToLocal()`. Rotation is driven by `clock.getElapsedTime()` in `useFrame`.

**Tech Stack:** React 19, Next.js 16, TypeScript, @react-three/fiber 9.6.1, @react-three/drei 10.7.7, three 0.184.0, framer-motion 12.39.0.

**Testing Note:** This project has no test framework configured (only `next dev`, `next build`, `eslint` in `package.json`). Verification uses: TypeScript compile (`npx tsc --noEmit`), lint (`pnpm lint`), `next build` smoke compile, and manual browser inspection at `localhost:3000`.

---

## File Structure

**Modified:**
- `components/watch-scene.tsx` — add `WatchHands` helper component (~80 lines), wire into `WatchModel`

**Created:** none.

**Untouched:** `components/watch-display.tsx` (contact section, out of scope per spec).

---

## Task 1: Add Hand Configuration Constants and Types

**Files:**
- Modify: `components/watch-scene.tsx` (top of file, after imports)

- [ ] **Step 1: Open the file and add constants block below the imports**

After the existing imports block (around line 7, after `import * as THREE from 'three'`), add this constants block:

```typescript
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors). If TypeScript complains, fix `as const` syntax or import paths.

- [ ] **Step 3: Commit**

```bash
git add components/watch-scene.tsx
git commit -m "feat(watch-scene): add hand configuration constants"
```

---

## Task 2: Implement `createHandPivot` Helper

**Files:**
- Modify: `components/watch-scene.tsx` (add helper function above `WatchModel`)

- [ ] **Step 1: Add the helper function**

Place this function immediately above the existing `function WatchModel(...)` declaration:

```typescript
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/watch-scene.tsx
git commit -m "feat(watch-scene): add createHandPivot helper"
```

---

## Task 3: Implement Face Discovery Logic

**Files:**
- Modify: `components/watch-scene.tsx` (add helper above `WatchModel`, below `createHandPivot`)

- [ ] **Step 1: Add `discoverWatchFace` function**

Place immediately below `createHandPivot`:

```typescript
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/watch-scene.tsx
git commit -m "feat(watch-scene): add discoverWatchFace helper"
```

---

## Task 4: Wire Hand Creation Into `WatchModel`

**Files:**
- Modify: `components/watch-scene.tsx` (inside `WatchModel`)

- [ ] **Step 1: Add imports**

In the existing import line `import { useRef, Suspense, useMemo } from 'react'`, add `useEffect`:

```typescript
import { useRef, Suspense, useMemo, useEffect } from 'react'
```

And add `useReducedMotion` is already imported. Confirm by re-reading line 6.

- [ ] **Step 2: Add refs and initialization state inside `WatchModel`**

Find the existing line `const clonedScene = useMemo(() => scene.clone(), [scene])` (~line 18). Immediately after it, add:

```typescript
  const reducedMotion = useReducedMotion()
  const handsRef = useRef<{ hour: HandParts; minute: HandParts; second: HandParts } | null>(null)
  const initAttemptsRef = useRef(0)
  const initializedRef = useRef(false)
```

- [ ] **Step 3: Import `useReducedMotion` into `WatchModel`**

`useReducedMotion` is already imported at the top from `framer-motion`. No new import needed.

- [ ] **Step 4: Add the cleanup `useEffect` below the refs**

```typescript
  useEffect(() => {
    return () => {
      const hands = handsRef.current
      if (!hands) return
      for (const key of ['hour', 'minute', 'second'] as const) {
        const part = hands[key]
        clonedScene.remove(part.pivot)
        part.geometry.dispose()
        part.material.dispose()
      }
      handsRef.current = null
      initializedRef.current = false
      initAttemptsRef.current = 0
    }
  }, [clonedScene])
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/watch-scene.tsx
git commit -m "feat(watch-scene): add refs and cleanup for watch hands"
```

---

## Task 5: Initialize Hands on First Successful Frame

**Files:**
- Modify: `components/watch-scene.tsx` (inside the existing `useFrame` in `WatchModel`)

- [ ] **Step 1: Modify the existing `useFrame` block**

The current `useFrame` callback is at line 28:

```typescript
useFrame((_, delta) => {
  if (meshRef.current) {
    // ... existing lerp code ...
  }
})
```

Replace it with this expanded version:

```typescript
  useFrame(({ clock }, delta) => {
    // --- Existing scroll-driven transforms ---
    if (meshRef.current) {
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        rotationY.get(),
        delta * 3,
      )
      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        meshRef.current.rotation.x,
        rotationX.get(),
        delta * 3,
      )
      meshRef.current.rotation.z = THREE.MathUtils.lerp(
        meshRef.current.rotation.z,
        rotationZ.get() + Math.sin(Date.now() * 0.0005) * 0.02,
        delta * 3,
      )
      meshRef.current.position.y = THREE.MathUtils.lerp(
        meshRef.current.position.y,
        positionY.get(),
        delta * 3,
      )
      meshRef.current.position.z = THREE.MathUtils.lerp(
        meshRef.current.position.z,
        positionZ.get(),
        delta * 3,
      )
      const s = scale.get()
      const currentScale = meshRef.current.scale.x
      const newScale = THREE.MathUtils.lerp(currentScale, s, delta * 3)
      meshRef.current.scale.setScalar(newScale)
    }

    // --- Lazy hand initialization (first successful frame) ---
    if (!initializedRef.current && initAttemptsRef.current < HAND_INIT_MAX_ATTEMPTS) {
      initAttemptsRef.current += 1
      const frame = discoverWatchFace(clonedScene)
      if (frame) {
        const hour = createHandPivot('hour', frame.radius, frame.centerLocal, frame.faceNormalLocal)
        const minute = createHandPivot('minute', frame.radius, frame.centerLocal, frame.faceNormalLocal)
        const second = createHandPivot('second', frame.radius, frame.centerLocal, frame.faceNormalLocal)
        clonedScene.add(hour.pivot, minute.pivot, second.pivot)
        handsRef.current = { hour, minute, second }
        initializedRef.current = true
      }
    }

    // --- Animate hands ---
    if (initializedRef.current && handsRef.current && !reducedMotion) {
      const t = clock.getElapsedTime()
      handsRef.current.hour.pivot.rotation.z = -(t / SWEEP_PERIOD_SECONDS.hour) * Math.PI * 2
      handsRef.current.minute.pivot.rotation.z = -(t / SWEEP_PERIOD_SECONDS.minute) * Math.PI * 2
      handsRef.current.second.pivot.rotation.z = -(t / SWEEP_PERIOD_SECONDS.second) * Math.PI * 2
    }
  })
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: PASS (no new errors in `components/watch-scene.tsx`).

- [ ] **Step 4: Build smoke test**

Run: `pnpm build`
Expected: PASS (Next.js build succeeds).

- [ ] **Step 5: Commit**

```bash
git add components/watch-scene.tsx
git commit -m "feat(watch-scene): initialize and animate watch hands"
```

---

## Task 6: Manual Browser Verification

**Files:** none modified.

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`
Expected: server running at `http://localhost:3000`.

- [ ] **Step 2: Open the page in a browser**

Navigate to `http://localhost:3000`.

- [ ] **Step 3: Verify hands appear and animate**

Confirm visually:
- Three hand-shaped meshes are visible on the watch dial
- Second hand sweeps visibly (1 revolution / minute) — easiest to confirm
- Minute hand visibly creeps after ~10 seconds of watching the second hand
- Hands are oriented in the dial plane (not perpendicular or off-axis)
- Hands rotate together with the watch when scrolling the page

If hands appear behind the dial (z-fighting or hidden):
- The face normal sign is wrong. Edit `discoverWatchFace` and change `new THREE.Vector3(0, 0, 1)` to `new THREE.Vector3(0, 0, -1)`. Re-test.

If hands appear in the wrong location (not on dial):
- Verify marker names exist by adding `console.log(clonedScene)` and inspecting in DevTools. The Sketchfab model wrapper may need traversal through `Sketchfab_model` → `Collada visual scene group` first; if so, `getObjectByName` still finds them because it recurses.

If hands appear but don't rotate:
- Check the browser console for warnings from `[watch-scene]`.
- Confirm `reducedMotion` is not stuck `true` — toggle OS "reduce motion" off if needed.

- [ ] **Step 4: Verify reduced-motion behavior**

In OS settings, enable "Reduce motion" (macOS: System Settings → Accessibility → Display; Windows: Settings → Accessibility → Visual effects → Animation effects off). Reload the page.

Expected: hands are visible but static (no rotation). Watch body Float animation also stops.

Disable reduced motion before continuing.

- [ ] **Step 5: Verify scroll behavior**

Scroll down the page. Expected: watch rotates as before, hands rotate with it (because pivots are children of `clonedScene`).

- [ ] **Step 6: Verify no console errors**

Open DevTools console. Expected: no red errors from `watch-scene.tsx`. The `[watch-scene]` warnings should not appear unless markers are missing.

- [ ] **Step 7: Stop dev server**

Ctrl+C in the dev server terminal.

---

## Task 7: Calibration Pass (Conditional)

If Task 6 step 3 revealed misalignment that the simple normal-flip didn't fix, perform calibration. Otherwise skip to Task 8.

**Files:**
- Modify: `components/watch-scene.tsx` (`discoverWatchFace` or `HAND_SPECS`)

- [ ] **Step 1: Add a one-off debug log inside `discoverWatchFace`**

After computing `centerLocal` and `radius`, temporarily add:

```typescript
console.log('[watch-scene] face frame', {
  centerLocal: centerLocal.toArray(),
  radius,
  topLocal: topLocal.toArray(),
})
```

- [ ] **Step 2: Reload the page and read the console**

Note the printed values. The expected order of magnitude for radius (given the model's `scale={18}` and Sketchfab pre-scale `0.01333`) is roughly `0.016 * 0.01333 * 18 ≈ 0.004` in the model's local space before our scene applies further transforms. The radius in clonedScene local space should be around `0.016` (the raw marker delta in model units).

- [ ] **Step 3: Adjust if needed**

If hands are too small/large, scale `HAND_SPECS` `widthFrac` and `lengthFrac` proportionally. If hands are offset from the dial center, the markers may be in an unexpected scene branch — try alternative marker names `MM_Marker_12_R` or `MM_Bezel_Pip_12` for the top reference.

- [ ] **Step 4: Remove debug log**

Delete the `console.log` added in step 1.

- [ ] **Step 5: Re-verify in browser**

Repeat Task 6 step 3. Confirm hands are correctly positioned and sized.

- [ ] **Step 6: Commit calibration changes (if any)**

```bash
git add components/watch-scene.tsx
git commit -m "fix(watch-scene): calibrate watch hand position/scale"
```

---

## Task 8: Final Verification and Documentation

**Files:** none modified (verification only).

- [ ] **Step 1: Final type-check, lint, and build**

Run sequentially:

```bash
npx tsc --noEmit
pnpm lint
pnpm build
```

Expected: all three pass with no new errors.

- [ ] **Step 2: Visual final pass**

Run `pnpm dev` and verify on `http://localhost:3000`:
- Hands visible, animating, correct sweep speeds
- No console errors
- Scroll animation still smooth
- Reduced-motion still respected

- [ ] **Step 3: Confirm no unintended changes**

Run: `git status`
Expected: clean working tree (everything committed). Only `components/watch-scene.tsx` should appear in `git log --since="1 hour ago"`.

- [ ] **Step 4: Stop dev server and finish**

Ctrl+C. Implementation complete.
