# three-effect

Effect and Foldkit bindings for small, resource-scoped Three.js scenes.

The near-term target is not React Three Fiber parity. This repo is for an
Effect-owned Three runtime and a Foldkit adapter that can be used by
OpenAgents web and desktop surfaces. React adapters are intentionally out of
scope for now.

## Packages

- `@openagentsinc/three-effect/core`
  - Effect-first Three runtime utilities.
  - Current proof points:
    - a scoped spinning cube renderer with deterministic disposal.
    - React-free core primitives for common pmndrs/R3F/Drei patterns seen
      across `projects/repos/examples`: Effect asset loaders for textures and
      GLTF, camera and bounds fitting, Center-style object offsets, scroll
      range/curve/visibility math, HTML overlay projection and raycast
      occlusion, instance matrix/color helpers, Float and CameraShake motion,
      shader-material uniform accessors, orbit controls, animation mixers,
      rounded/text/image geometry, masks, staging/environment/shadow helpers,
      performance sampling, advanced material factories, render targets,
      postprocessing composer resources, scene graph cloning/LOD/edges/lines,
      and deterministic particle/media helpers.
    - command-composer HUD primitives for OpenAgents/Khala chat input shells:
      existing-border edge energy, scanner wash, dropcursor beam, attachment
      hologram nodes, command-card brackets, resize/hardware marks, typed
      projection updates, and reduced-motion behavior. The text editor,
      labels, buttons, file names, and accessibility tree stay in DOM/Foldkit.
    - a React-free port of the pmndrs Bezier curves and nodes example, including
      draggable nodes, labels, endpoint markers, and animated dashed quadratic
      Bezier connections.
    - Drei-inspired quadratic and cubic Bezier point helpers plus data-only
      motion-path presets for experiments that should not depend on React,
      `@react-three/fiber`, or `@react-three/drei` at runtime.
    - a dark operator training-run visualization for lifecycle states, run
      windows, seal/staleness, verification, receipts, rungs, contributor dots,
      animated flow connectors, contributor orbit tracks, and loss-curve
      feedback with 2D chart scaffolding.
    - reusable training-world item primitives, starting with bulletin boards
      that render concise text on the board surface and emit proximity events
      so host apps can open richer overlays without baking product copy into
      the renderer.
    - a React-free port of the pmndrs Moksha scrollytelling demo with
      orthographic scroll parallax, shader-distorted image planes, the Moonget
      display font, refraction diamonds, stripes, startup fade, and narrative
      text overlays.
- `@openagentsinc/three-effect/foldkit`
  - Foldkit custom-element bindings for the core scenes.
  - Designed for Foldkit views to render the element declaratively while Three
    resources remain outside the Foldkit model.

Workspace package manifests also exist under `packages/core` and
`packages/foldkit` as the future publish split:

- `@openagentsinc/three-effect-core`
- `@openagentsinc/three-effect-foldkit`

## Usage

```ts
import {
  bezierNodesView,
  mokshaView,
  spinningCubeView,
  trainingRunView,
} from "@openagentsinc/three-effect/foldkit"

const preview = spinningCubeView<Message>()
const graph = bezierNodesView<Message>()
const moksha = mokshaView<Message>()
const training = trainingRunView<Message>()
```

The Foldkit helpers register `oa-spinning-cube`, `oa-bezier-nodes`,
`oa-moksha`, and `oa-training-run` custom elements when a browser
custom-elements registry is available. Each element owns a scoped Three
renderer and releases it on disconnect.

Command composer HUD smoke:

```sh
bun run scene:composer-hud:capture
```

That builds `examples/command-composer-hud`, opens it with headless Playwright,
captures the WebGL canvas, and asserts the HUD is nonblank and framed.

## Common Primitive Pass

The latest examples sweep scanned `projects/repos/examples/demos` and compared
the frequent `@react-three/drei` / `@react-three/fiber` primitives against what
`three-effect` already had. The highest-volume primitives were `useGLTF`,
`Environment`, `OrbitControls`, `ContactShadows`, `AccumulativeShadows`,
`RandomizedLight`, `useTexture`, `ScrollControls` / `useScroll`, `Text`,
`Float`, camera helpers, `Html`, `Bounds`, `Center`, `Lightformer`,
`CameraControls`, `Sky`, `useAnimations`, `useCursor`, `Image`, `Mask`,
`useMask`, `useAspect`, `RoundedBox`, `Stats`, `MeshTransmissionMaterial`,
`MeshReflectorMaterial`, `MeshDistortMaterial`, `MeshRefractionMaterial`,
`MeshWobbleMaterial`, `RenderTexture`, `useFBO`, `Effects`, `Edges`,
`Outlines`, `Line`, `Merged`, `Clone`, `Detailed`, `Billboard`, `Decal`,
`Stars`, `Sparkles`, `VideoTexture`, `PositionalAudio`, and `shaderMaterial`.

This pass pulled the reusable, React-free layer into `@openagentsinc/three-effect/core`:

- `assetPrimitives`
  - `loadTexture`, `loadTextures`, `loadGltf`, `loadGltfs`,
    `collectGltfObjectMap`, and `firstMeshGeometry`.
- `attachmentPrimitives`
  - Quick MMORPG-inspired bone-map collection, named-bone object attachment,
    transform offsets, resource disposal, and slot-based capability/equipment
    attachment management.
- `billboardPrimitives`
  - Quick MMORPG-inspired camera-facing name plates, speech bubble handles,
    status bars, and grouped entity overlays built on the shared text-label and
    billboarding primitives.
- `cameraPrimitives`
  - perspective and orthographic camera factories, resize helpers, viewport
    math, bounds measurement, fit-to-box, and Center-style offsets.
- `scrollPrimitives`
  - normalized scroll progress, Drei-style `range`, `curve`, `visible`, and
    damped metrics.
- `htmlOverlayPrimitives`
  - world-to-screen projection, z-index calculation, distance scaling, and
    raycast occlusion checks for DOM overlays.
- `instancePrimitives`
  - instance matrices, color buffers, `InstancedMesh` application, and a small
    mesh factory.
- `motionPrimitives`
  - deterministic Float-style transforms and CameraShake-style rotations.
- `shaderMaterialPrimitives`
  - Drei-style shader material classes with uniform property accessors.
- `controlsPrimitives`
  - Effect-scoped OrbitControls handles and target focusing helpers.
- `extraControlsPrimitives`
  - Effect-scoped handles for the remaining `three/examples/jsm/controls`
    camera/object controllers that R3F/Drei wrap as JSX: `MapControls`,
    `TrackballControls`, `FlyControls`, `FirstPersonControls`,
    `PointerLockControls`, and `TransformControls`. Each handle exposes typed
    option applicators, `update`/`lock`/`attach` actions where relevant, and a
    scoped `dispose`.
- `playerControllerPrimitives`
  - A React-free WASD + pointer-lock mouselook controller that composes
    `PointerLockControls` with camera-yaw-relative movement, sprint, optional
    walk bounds, ground-height sampling, keyboard state helpers, and a scoped
    `dispose`.
- `helperPrimitives`
  - React-free factories for the scene debug/gizmo helpers R3F exposes as
    intrinsic elements and Drei wraps as `<Grid>`, `<GizmoHelper>`, and
    `useHelper`: grid/polar-grid, axes, arrow, box/box3/plane bounds, camera,
    skeleton, directional/point/spot/hemisphere/rect-area light helpers, and
    vertex normals. Each returns a `{ helper, dispose }` handle that releases
    the helper's geometry/material deterministically.
- `interactionPrimitives`
  - pointer normalization, raycasting, cursor controllers, and intersection
    visibility helpers.
- `spatialPrimitives`
  - Quick MMORPG-inspired typed spatial hash grids, hit target registries for
    mesh/sphere/box picking, and minimum-distance layout relaxation for dense
    world nodes.
- `animationPrimitives`
  - GLTF-style animation mixer/action controllers, scroll-driven clip
    progress, and Quick MMORPG-inspired animation state machines with
    crossfade policy, phase-preserving locomotion, one-shot completion, and
    `canMove` metadata.
- `geometryPrimitives`
  - Drei `useAspect` math, rounded boxes, font loading, and text geometry.
- `imagePrimitives`
  - image cover scaling and shader-backed image planes.
- `maskPrimitives`
  - plain material stencil props for Drei `Mask` / `useMask` semantics.
- `mathPrimitives`
  - React-free wrappers for the `three/examples/jsm/math` utilities procedural
    and data-viz demos lean on: `ImprovedNoise` / `SimplexNoise` instances plus
    a normalized fBm sampler, a `MeshSurfaceSampler` Effect handle that yields
    weighted surface samples and packed position buffers, and `Lut` color-map
    helpers (`createLut`, `lutColorAt`, `lutColorArray`) for heatmap coloring.
- `stagingPrimitives`
  - scene environment application, RoomEnvironment PMREM textures, preload
    compilation, shadow baking, Sky, Lightformer, randomized lights,
    contact-shadow resources, and cube-camera resources.
- `performancePrimitives`
  - Drei-inspired performance factor sampling and a small DOM stats overlay.
- `advancedMaterialPrimitives`
  - transmission/refraction material factories, animated distort/wobble
    material classes, reflector planes, and time setters.
- `renderPrimitives`
  - FBO creation/resizing, render-texture resources, scene-to-target rendering,
    and EffectComposer resources with render/output/bloom passes.
- `sceneGraphPrimitives`
  - deep object cloning, LOD setup, merged buffer geometries, edges, outline
    meshes, wide line helpers, billboarding, and decal geometry.
- `mediaParticlePrimitives`
  - loading progress tracking, video textures, positional audio, deterministic
    star/sparkle attributes, and Points construction.
- `eventBurstPrimitives`
  - Quick MMORPG-inspired linear splines for alpha/size/color, deterministic
    point-sprite event emitters, and strict evidence-backed event burst
    creation for proof/receipt/settlement/chat effects.
- `mmoEntityPrimitives`
  - Quick MMORPG-inspired transform-row normalization, position/quaternion
    interpolation, stale/despawn liveness helpers, and entity description
    caches for SpacetimeDB-style world row streams.
- `characterSpawnerPrimitives`
  - `createCharacterSpawner()` one-call factory composing GLB animation FSM
    (idle/walk/run/spawn), the WASD character controller, third-person follow
    camera, and floating nameplate into a single controllable (local) or
    interpolated (remote) entity handle for the agent MMORPG. (#5731)
- `agentAvatarPrimitives`
  - `createAgentAvatar()` stylized identity-tinted crystal glyph plus
    `createAgentWarpInEffect()`, a Protoss-style warp-in spawn FX built on the
    evidence-backed event burst. (#5732)
- `resourceBarPrimitives`
  - `createResourceBar()` world-anchored, camera-facing mana/health/earnings
    bar driven by a `[0,1]` value with per-kind color thresholds; the labeled,
    threshold-aware sibling of `createBillboardStatusBar`. (#5733)
- `entityRegistryPrimitives`
  - `createEntityRegistry()` thin register/lookup-by-id store with a per-frame
    update tick and optional `SpatialHashGrid` proximity integration — just
    enough glue to compose the primitives without porting the actor-model ECS.
    (#5734)

The follow-up controls/helpers pass closed the remaining gap between
three-effect's single `OrbitControls` binding and the broader controls and
debug-gizmo surface that React Three Fiber and Drei expose. `MapControls`,
`TrackballControls`, `FlyControls`, `FirstPersonControls`,
`PointerLockControls`, and `TransformControls` now have Effect-scoped handles
in `extraControlsPrimitives`, and the full builtin/addon helper set (grids,
axes, bounds, camera, skeleton, light helpers, vertex normals) is available as
disposable factories in `helperPrimitives`.

The first player-controller primitive builds on those controls for
first-person navigation. `createWasdMouseLookController` is intentionally a
small low-level handle: downstream scenes provide their own world geometry,
auth/data policy, pointer-lock affordance, movement bounds, and HUD, while the
shared library owns keyboard state, velocity integration, mouselook lock state,
and cleanup.

Full CameraControls parity, Troika text layout, HDR preset catalogs, and
opinionated postprocessing chains remain out of core. The new modules provide
the React-free substrate that Foldkit scenes can compose explicitly.

## Moksha Demo

The tracked visual smoke for the Moksha port lives at `examples/moksha/`. It is
based on:

- `projects/repos/examples/demos/moksha/src/index.jsx`
- `projects/repos/examples/demos/moksha/src/blocks.jsx`
- `projects/repos/examples/demos/moksha/src/components/Plane.jsx`
- `projects/repos/examples/demos/moksha/src/components/Text.jsx`
- `projects/repos/examples/demos/moksha/src/components/CustomMaterial.js`
- `projects/repos/examples/demos/moksha/src/diamonds/Diamonds.jsx`
- `projects/repos/examples/demos/moksha/src/diamonds/BackfaceMaterial.js`
- `projects/repos/examples/demos/moksha/src/diamonds/RefractionMaterial.js`

```sh
bun run build:demo:moksha
open examples/moksha/index.html
```

## three-player-controller Reproduction

The full upstream `three-player-controller` example catalog lives at
`examples/three-player-controller-repro/`. This includes the copied GLB pack,
3DGS assets, BIM GLBs, textures, audio, mobile control sprites, the upstream
controller source, and the complete example set:

- `glTF`
- `ShinChan`
- `OfficeBuilding`
- `3dgs`
- `3dtilesScene`
- `multiplayer-gltf`
- `multiplayer-3dgs`
- `shooting`

Attribution and dependency notes are recorded in
`examples/three-player-controller-repro/THIRD_PARTY_NOTICES.md`.

```sh
bun run dev:demo:three-player-controller
# open /examples/three-player-controller-repro/example/

bun run verify:demo:three-player-controller
```

## Training Run Demo

The tracked visual smoke for the Training scene lives at
`examples/training-run/`. It exercises the lifecycle graph, live run snapshot,
promise-registry signals, and operator-command signals in one dark canvas.
The default view remains the orthographic map. Scenes can opt into
`cameraMode: "perspective_walk"` and `controller: "wasd_mouselook"` to place
the same graph on a shallow 2.5D ground plane with a PerspectiveCamera,
pointer-lock mouselook, WASD movement, and center-reticle selection while
pointer lock is active.
The latest 2D/dataviz pass pulls in local reference ideas from:

- `projects/repos/examples/demos/bezier-curves-and-nodes/src/Nodes.jsx`
- `projects/repos/examples/demos/react-ellipsecurve/src/App.jsx`
- `projects/repos/examples/demos/scrollcontrols-with-minimap/src/App.jsx`
- `projects/repos/examples/demos/svg-maps-with-html-annotations/src/index.jsx`
- `projects/repos/examples/demos/canvas-text/src/App.jsx`

```sh
bun run build:demo:training
open examples/training-run/index.html
```

## HUD Kit (Arwes-style sci-fi HUD primitives)

`@openagentsinc/three-effect/core` ships a reusable, React-free kit of
Arwes-style sci-fi HUD primitives in `packages/core/src/hudPrimitives.ts`,
plus a one-canvas gallery scene in `packages/core/src/hudGallery.ts`. The
visual language is ported from the Arwes React/DOM/SVG library
(`projects/repos/arwes`) and the archived OpenAgents WGPUI `hud` crate
(System 4 in `docs/launch/2026-06-19-previous-hud-systems-audit.md` in the
`openagents` repo) into Three.js geometry — no React, no `motion`, no
`@arwes/*` runtime dependency. This is the HUD H2 (#5500) deliverable that
H4 skins the desktop shell/hotbar/panes with.

Primitives (each is a pure factory returning a disposable `{ group | mesh |
points | lineSegments | line, ...mutators, dispose }` handle):

- `createHudFrameCorners` / `createHudFrameLines` / `createHudFrameUnderline`
  — Arwes `FrameCorners` / `FrameLines` / `FrameUnderline`, with a
  `setProgress()` draw-reveal (the deterministic replacement for Arwes'
  `animateDraw` stroke-dashing) and `setColor()`.
- `createHudStatusLight` — an LED core + additive halo with optional pulse.
- `createHudMeter` — a threshold-colored gauge (`hudMeterStatusAt`).
- `createHudDotGrid` / `createHudGridLines` / `createHudScanlines` — the
  dot-grid, grid-line, and scrolling-scanline background surfaces.
- `createHudIlluminator` — the Arwes `Illuminator` pointer-follow glow as an
  additive radial-gradient plane (DOM-free fallback for headless use).
- `createHudSeparator` — a faint rule line.
- `createHudLabel` — crisp 3D HUD text, built on the existing
  `createTextLabel` (canvas-texture-on-a-plane, no troika/SDF dependency).
- `createHudAnimator` — a pure, time-stepped port of the Arwes Animator state
  machine (`entered/entering/exiting/exited`) with `parallel | stagger |
  sequence` managers; drives any primitive's `setProgress`.

Theme: `HUD_STATUS_COLORS` (white-on-black, cyan primary) + `hudStatusColor`.

```ts
import { hudGalleryView } from "@openagentsinc/three-effect/foldkit"

// Foldkit: registers the <oa-hud-gallery> custom element on first use.
const gallery = hudGalleryView<Message>()
```

```ts
import {
  createHudFrameCorners,
  createHudMeter,
  createHudStatusLight,
} from "@openagentsinc/three-effect/core"

const frame = createHudFrameCorners({ width: 2, height: 1.2 })
scene.add(frame.group)
const meter = createHudMeter({ value: 0.82 })
scene.add(meter.group)
const light = createHudStatusLight({ status: "success", pulseHz: 1 })
scene.add(light.group)
// ...and `frame.dispose()` / `meter.dispose()` / `light.dispose()` to release.
```

The tracked visual smoke lives at `examples/hud-gallery/`:

```sh
bun run build:demo:hud
open examples/hud-gallery/index.html
```

Unit coverage (no WebGL/DOM required) is in `packages/core/src/hud.test.ts`:
animator state machine, frame/line/underline layout math, meter thresholds,
dot/grid positions, and Three handle construction + disposal.

## Bezier Nodes Demo

The tracked visual smoke for the pmndrs Bezier/nodes port lives at
`examples/bezier-nodes/`. It is based on:

- `projects/repos/examples/demos/bezier-curves-and-nodes/src/App.jsx`
- `projects/repos/examples/demos/bezier-curves-and-nodes/src/Nodes.jsx`
- `projects/repos/drei/src/core/QuadraticBezierLine.tsx`
- `projects/repos/drei/src/web/DragControls.tsx`

```sh
bun run build:demo:bezier
open examples/bezier-nodes/index.html
```

## Commands

```sh
bun install
bun run verify
bun run build:demo:bezier
bun run build:demo:moksha
bun run build:demo:training
bun run verify:demo:three-player-controller
```

## Implementation Notes

- `docs/2026-06-14-implementation-audit.md` records the first porting pass:
  the pmndrs/Drei source references, scenes that were rewritten, primitive
  modules that shipped, OpenAgents integrations, and next work.
