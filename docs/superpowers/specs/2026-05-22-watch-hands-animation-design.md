# Watch Hands Animation Design

**Date:** 2026-05-22
**Scope:** `components/watch-scene.tsx` (hero section only)

## Goal

Add animated hour, minute, and second hands to the 3D watch in the hero section. Hands sweep at correct clock speeds (decorative, not real time) and rotate together with the watch model during scroll-driven transforms.

## Constraint

`public/models/watch.glb` contains no named hand meshes. Inspection of the GLB JSON chunk shows only generic mesh nodes (`defaultMaterial.xxx`, `Cylinder:xxx_Cylinder:xxx.004`) plus dial markers prefixed `MM_Marker_*`. No `hour`, `minute`, `second`, or `hand` named objects exist.

Therefore hands must be synthesized as Three.js geometry at runtime and attached to the scene rather than referenced by name.

## Architecture

Only `components/watch-scene.tsx` is modified. One new inner component is added alongside the existing `WatchModel`:

```
WatchScene (Canvas)
└── Float
    └── WatchModel (group ref=meshRef)
        └── Center
            └── primitive object={clonedScene} scale=18
                └── [imperatively attached] hand pivot groups
```

The `WatchHands` logic lives inside `WatchModel`. It does not render JSX; it attaches three pivot `THREE.Group` objects directly to `clonedScene` via a `useEffect` + first-frame initialization pattern.

## Face Center Discovery

The watch face center and radius are derived at runtime from two known marker nodes:

- `MM_Marker_12_L` — top of dial (12 o'clock)
- `MM_Marker_18` — bottom of dial (6 o'clock)

Procedure (executed once on first `useFrame` tick after scene attachment):

1. `clonedScene.getObjectByName('MM_Marker_12_L')` and `'MM_Marker_18'`
2. For each, call `getWorldPosition(vector)` to obtain world coords (handles all parent transforms: Sketchfab_model scale, Collada rotation, primitive scale=18, Center offset)
3. Call `clonedScene.worldToLocal(vector)` on each to convert to clonedScene local space
4. Compute `center = (pos12 + pos18) / 2`
5. Compute `radius = distance(pos12, center)`
6. Compute `faceNormal` from the dial plane (markers share Z in local model space) — used to determine which axis hands rotate around

The first-frame deferral is required because `getWorldPosition` needs `updateMatrixWorld` to have run, which happens on the first render frame.

## Hand Geometry

Each hand is a pivot pattern: a `THREE.Group` at the face center contains a `THREE.Mesh` offset along its local Y axis. Rotating the group rotates the hand around the dial center.

| Hand | Width (× radius) | Length (× radius) | Color | Z offset above face |
|------|------------------|--------------------|--------|---------------------|
| Hour | 0.08 | 0.55 | `#e8e0d0` (silver-cream) | `radius * 0.02` |
| Minute | 0.05 | 0.75 | `#ffffff` (white) | `radius * 0.04` |
| Second | 0.025 | 0.85 | `#ff4444` (red) | `radius * 0.06` |

Geometry: `BoxGeometry(width, length, width * 0.5)`.

Material: `MeshStandardMaterial({ color, metalness: 0.8, roughness: 0.2 })`.

Mesh offset within pivot: `mesh.position.y = length * 0.3` so the hand extends ~60% above the dial center and ~40% below — classic watch hand proportions.

The pivot is positioned at `center + faceNormal * zOffset`. The pivot's orientation is aligned so that its local Z axis matches the face normal (so `pivot.rotation.z` rotates the hand in the dial plane).

## Animation

In `useFrame((_, delta) => ...)`:

```
const t = clock.getElapsedTime()

hourPivot.rotation.z   = -(t / 43200) * Math.PI * 2  // 12 h period
minutePivot.rotation.z = -(t / 3600)  * Math.PI * 2  // 60 min period
secondPivot.rotation.z = -(t / 60)    * Math.PI * 2  // 60 s period
```

Negative sign so hands rotate clockwise (Three.js positive Z rotation is counter-clockwise in screen space).

Since the pivots are children of `clonedScene`, they inherit the model's scroll-driven rotation, position, and scale transforms automatically. No extra integration code needed in the existing `useFrame` block.

## Reduced Motion

The component already calls `useReducedMotion()`. When true:

- Hands are still created and attached (so the watch looks complete, not empty)
- The hand rotation block in `useFrame` is skipped (hands remain frozen at angle 0)

## Cleanup

`useEffect` returns a cleanup function that:

1. Removes each hand pivot from `clonedScene` via `clonedScene.remove(pivot)`
2. Disposes each geometry: `geometry.dispose()`
3. Disposes each material: `material.dispose()`

Prevents leaks if the component unmounts (e.g., HMR, route change).

## Failure Modes

| Condition | Behavior |
|-----------|----------|
| Either marker node missing | Skip hand creation, log a warning. Watch renders without hands rather than crashing. |
| Markers found but world positions are identical (degenerate) | Skip with warning. Indicates GLB corruption or unexpected scene state. |
| First frame runs before scene attached | Initialization re-attempts each frame until success, capped at 10 attempts. |

## Out of Scope

- `components/watch-display.tsx` (contact section) — explicitly excluded per brainstorm decision.
- Real-time clock synchronization — explicitly excluded; sweep is decorative.
- Smooth "tick" vs. continuous sweep distinction — second hand uses continuous sweep (smoother on a 3D model).
- Replacing `watch.glb` — the existing model is preserved.

## Files Touched

- `components/watch-scene.tsx` — ~60 lines added (new `WatchHands` helper + integration into `WatchModel`)

No new files. No new dependencies.
