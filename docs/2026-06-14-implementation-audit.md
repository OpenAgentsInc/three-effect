# three-effect implementation audit

Date: 2026-06-14

This note records what was built in `three-effect` during the first porting
passes, what was pulled from the local pmndrs examples and Drei references,
what is intentionally still not React Three Fiber parity, and what should
happen next.

The project direction remains:

- No React runtime dependency.
- Core package owns Effect-scoped Three.js resources.
- Foldkit package exposes declarative custom elements for OpenAgents surfaces.
- The near-term consumers are OpenAgents web and desktop Foldkit apps.

## Current package surface

The root package is published/imported as `@openagentsinc/three-effect` with
subpath exports:

- `@openagentsinc/three-effect/core`
  - Three.js scene/resource functions.
  - Effect error types and scoped mount handles.
  - Data helpers for ports that need deterministic math without touching DOM.
- `@openagentsinc/three-effect/foldkit`
  - Foldkit custom-element views:
    - `spinningCubeView`
    - `bezierNodesView`
    - `trainingRunView`
    - `mokshaView`
  - Browser custom elements:
    - `oa-spinning-cube`
    - `oa-bezier-nodes`
    - `oa-training-run`
    - `oa-moksha`

The workspace also has future split manifests:

- `packages/core/package.json` as `@openagentsinc/three-effect-core`
- `packages/foldkit/package.json` as `@openagentsinc/three-effect-foldkit`

Those split names are not the active OpenAgents import surface yet. Current
consumers use the root package subpaths.

## Architecture that shipped

The useful shape is not "R3F but with Effect". The useful shape is:

1. A mount function receives a DOM element and options.
2. It builds a Three renderer, scene, camera, resources, and animation loop.
3. It returns an Effect value that either fails with a typed mount error or
   succeeds with a handle.
4. The handle exposes `dispose`; some scenes also expose `resize`,
   `selectNode`, or data-update methods.
5. Foldkit renders a custom element whose lifecycle calls the core mount and
   release functions.

That gives Foldkit a stable Elm-style view surface while keeping WebGL,
requestAnimationFrame, ResizeObserver, GPU resources, textures, controls, and
event listeners outside the model.

The important implementation constraint is that Foldkit owns app state and
message flow, while `three-effect` owns imperative Three resource lifetimes.
The two meet at custom-element attributes/properties and DOM custom events.

## Scenes ported

### Spinning cube

Files:

- `packages/core/src/index.ts`
- `packages/foldkit/src/index.ts`

What shipped:

- A minimal Effect-scoped Three renderer.
- A cube mesh plus edge overlay.
- Ambient and directional lighting.
- ResizeObserver-backed sizing.
- requestAnimationFrame animation.
- Deterministic disposal of animation frame, observer, geometry, materials,
  renderer, and canvas contents.
- Foldkit `spinningCubeView`.

Why it exists:

- It is the smallest visual smoke proving the library shape.
- It is what OpenAgents desktop first embedded on the home surface.

### Bezier nodes

Files:

- `packages/core/src/bezierNodes.ts`
- `packages/core/src/curvePrimitives.ts`
- `packages/foldkit/src/index.ts`
- `examples/bezier-nodes/`

Primary references:

- `projects/repos/examples/demos/bezier-curves-and-nodes/src/App.jsx`
- `projects/repos/examples/demos/bezier-curves-and-nodes/src/Nodes.jsx`
- `projects/repos/drei/src/core/QuadraticBezierLine.tsx`
- `projects/repos/drei/src/web/DragControls.tsx`

What shipped:

- A React-free version of the pmndrs Bezier curves and nodes demo.
- Default graph data for a small node diagram.
- Quadratic Bezier connection construction.
- Drei-compatible midpoint behavior for `QuadraticBezierLine`.
- Animated dashed and continuous connection lines.
- Node labels rendered through canvas textures.
- Endpoint markers.
- Pointer picking/raycasting.
- Dragging on a world-space plane.
- Hover/active visual state.
- Resize and camera updates.
- `bezierNodesView` / `oa-bezier-nodes`.

What was deliberately not copied:

- The React component tree.
- R3F render-loop semantics.
- Drei DragControls state machinery.

The port keeps the geometry and interaction idea, but implements it as a
single scoped Three scene with explicit resources.

### Training run visualization

Files:

- `packages/core/src/trainingRun.ts`
- `packages/foldkit/src/index.ts`
- `examples/training-run/`

Reference ideas used:

- `projects/repos/examples/demos/bezier-curves-and-nodes/src/Nodes.jsx`
- `projects/repos/examples/demos/react-ellipsecurve/src/App.jsx`
- `projects/repos/examples/demos/scrollcontrols-with-minimap/src/App.jsx`
- `projects/repos/examples/demos/svg-maps-with-html-annotations/src/index.jsx`
- `projects/repos/examples/demos/canvas-text/src/App.jsx`

What shipped:

- `TrainingRunVisualizationOptions` and snapshot projection helpers.
- Lifecycle node graph for training states.
- Run-window status rings.
- Verification and staleness indicators.
- Seal/receipt/closeout visual signals.
- Contributor dots and contributor orbit tracks.
- Operator command strip.
- Promise-registry signal strip.
- Loss curve chart with ticks and animated marker points.
- Animated flow connectors.
- Smooth indefinite animation loop; the earlier three-second reset/flicker was
  replaced with continuous phase math.
- Node selection custom event from the custom element to Foldkit.
- Optional `cameraMode: "perspective_walk"` and
  `controller: "wasd_mouselook"` options that reuse the same row-backed scene
  data on a 2.5D ground plane.
- Foldkit `trainingRunView` accepts:
  - attributes
  - visualization options
  - optional node-selection message mapper

OpenAgents integrations built from this:

- Desktop home training pane.
- Desktop full-screen training page with HTML overlays and node-specific data.
- `openagents.com` `/demo` route for the full-screen version.
- Previous workroom demo moved to `/demo2`.

### Moksha

Files:

- `packages/core/src/moksha.ts`
- `packages/core/src/assets/moksha/*`
- `packages/foldkit/src/index.ts`
- `examples/moksha/`

Primary references:

- `projects/repos/examples/demos/moksha/src/index.jsx`
- `projects/repos/examples/demos/moksha/src/blocks.jsx`
- `projects/repos/examples/demos/moksha/src/components/Plane.jsx`
- `projects/repos/examples/demos/moksha/src/components/Text.jsx`
- `projects/repos/examples/demos/moksha/src/components/CustomMaterial.js`
- `projects/repos/examples/demos/moksha/src/diamonds/Diamonds.jsx`
- `projects/repos/examples/demos/moksha/src/diamonds/BackfaceMaterial.js`
- `projects/repos/examples/demos/moksha/src/diamonds/RefractionMaterial.js`

What shipped:

- A React-free scrollytelling scene.
- Orthographic camera.
- Scroll progress tracking.
- Page sections and paragraph layouts.
- Shader-distorted image planes.
- Moonget font asset and text geometry fallback path.
- Canvas text fallback for longer labels/paragraphs.
- Refraction diamond meshes using the included GLB.
- Backface/environment/refraction material pass.
- Stripe/background planes.
- Startup fade.
- Resize-safe renderer and camera updates.
- Texture/font/model disposal.
- Foldkit `mokshaView` / `oa-moksha`.

OpenAgents integration:

- `openagents.com` has a public `/moksha` route that renders `mokshaView`.
- The production deployment issue was not in `three-effect`; the route parsed
  and initialized, but the OpenAgents root view did not delegate `Moksha` to
  the logged-out view. That was fixed in OpenAgents commit `3de2b963b`, then
  deployed to Cloudflare Worker version
  `aec440bc-90cb-4f62-8a84-77faf44a7e91`.

## Common Drei/R3F primitive pass

The broader pass scanned the local pmndrs examples under
`projects/repos/examples/demos` and the local Drei source under
`projects/repos/drei/src`. The source references and frequency table are
tracked in `packages/core/src/commonPrimitiveAudit.ts`.

The highest-frequency primitives were:

- `useGLTF`
- `Environment`
- `OrbitControls`
- `ContactShadows`
- `AccumulativeShadows` / `RandomizedLight`
- `useTexture`
- `ScrollControls` / `useScroll`
- `Text`
- `Float`
- `MeshTransmissionMaterial`
- `PerspectiveCamera` / `OrthographicCamera`
- `Html`
- `Bounds` / `Center`
- `Lightformer`
- `CameraControls`
- `Sky`
- `useAnimations`
- `useCursor`
- `Instances`
- `Image`
- `Mask` / `useMask`
- `RoundedBox`
- `useAspect`
- `Stats` / `PerformanceMonitor`
- `MeshReflectorMaterial`
- `RenderTexture` / `useFBO` / `Effects`
- `MeshDistortMaterial`
- `Edges` / `Outlines` / `Line`
- `Clone` / `Merged` / `Detailed`
- `CameraShake`
- `shaderMaterial`
- `MeshRefractionMaterial` / `MeshWobbleMaterial`
- `Billboard` / `Decal`
- `Stars` / `Sparkles`
- `VideoTexture` / `PositionalAudio`

The ported React-free primitive modules are:

- `assetPrimitives`
  - Texture and GLTF loading as Effect values.
  - Multiple input shapes for texture loads.
  - GLTF object/material collection helpers.
  - First mesh geometry extraction.
- `cameraPrimitives`
  - Perspective and orthographic camera factories.
  - Renderer/camera resize helpers.
  - Bounds measurement.
  - Fit camera to box.
  - Center-style object offset.
  - Viewport math at distance.
- `scrollPrimitives`
  - Normalized progress.
  - Drei-like `range`, `curve`, and `visible`.
  - Damped scroll metrics.
- `htmlOverlayPrimitives`
  - World-to-screen projection.
  - Distance scaling.
  - Z-index mapping.
  - Raycast occlusion checks.
- `instancePrimitives`
  - Instance matrices.
  - Instance colors.
  - Instanced mesh application.
  - Small mesh factory.
- `motionPrimitives`
  - Float-style transform sampling.
  - CameraShake-style rotation sampling.
- `shaderMaterialPrimitives`
  - ShaderMaterial class factory.
  - Uniform property accessors.
- `controlsPrimitives`
  - OrbitControls creation and disposal through Effect.
  - Option application and target focusing helpers.
- `playerControllerPrimitives`
  - WASD + pointer-lock mouselook controller creation and disposal through
    Effect.
  - Stable keyboard action mapping for WASD, arrow keys, sprint, rise, and
    fall.
  - Camera-yaw-relative desired movement, velocity integration, optional
    movement bounds, and ground-height snapping.
- `interactionPrimitives`
  - Pointer NDC conversion.
  - Raycasting helpers.
  - Cursor controller.
  - Intersection visibility checks.
- `animationPrimitives`
  - AnimationMixer/action controller.
  - Named action lookup.
  - Play/stop/fade helpers.
  - Scroll-driven clip progress.
- `geometryPrimitives`
  - `useAspect` math.
  - Rounded boxes.
  - Font loading.
  - Text geometry.
- `imagePrimitives`
  - Image cover scaling.
  - Shader-backed image planes.
- `maskPrimitives`
  - Stencil material props for Mask/useMask-style composition.
- `stagingPrimitives`
  - Environment texture application.
  - RoomEnvironment PMREM texture.
  - Scene compile/preload helper.
  - Sky.
  - Lightformer.
  - Randomized light rigs.
  - Contact-shadow render resources.
  - Accumulative shadow-style group helpers.
  - Cube-camera resources.
- `performancePrimitives`
  - Performance factor sampling.
  - DOM stats overlay.
- `advancedMaterialPrimitives`
  - Transmission material.
  - Refraction material.
  - Distort and wobble shader materials.
  - Reflector plane/material.
  - Time uniform setters.
- `renderPrimitives`
  - FBO resources.
  - Render texture resources.
  - Scene-to-target rendering.
  - EffectComposer with render/output/bloom passes.
- `sceneGraphPrimitives`
  - Object cloning.
  - LOD setup.
  - Geometry merging.
  - Edges.
  - Outlines.
  - Wide lines.
  - Billboarding.
  - Decal geometry.
- `mediaParticlePrimitives`
  - Loading tracker.
  - Video texture creation.
  - Positional audio creation.
  - Deterministic star attributes.
  - Deterministic sparkle attributes.
  - Points construction.

## Verification currently in repo

Commands:

```sh
bun run verify
bun run build:demo:bezier
bun run build:demo:training
bun run build:demo:moksha
```

Coverage:

- Core math/resource helpers are covered by `packages/core/src/index.test.ts`.
- Source-reference arrays are asserted so the audit does not drift silently.
- The demo build commands prove browser bundles compile.
- OpenAgents has separate Foldkit/route tests for the integrated public
  surfaces.

## Known gaps and next work

### Package and release hygiene

- Decide whether the published surface should stay as root subpaths or become
  separate packages:
  - `@openagentsinc/three-effect-core`
  - `@openagentsinc/three-effect-foldkit`
- Add generated `.d.ts` output instead of exporting raw source files forever.
- Add an npm release workflow under the `@openagentsinc` scope.
- Update OpenAgents consumers to a single pinned commit or package version.
  Today the web app and desktop app can point at different Git SHAs.

### Foldkit integration

- Add a small typed event/property pattern for custom elements so every scene
  exposes updates consistently.
- Add an explicit `SceneResource` abstraction in the Foldkit package if more
  scenes need the same connected/disconnected lifecycle.
- Make failure states visible to Foldkit callers without crashing the app:
  current custom elements generally fail quietly after catching mount errors.
- Add optional HTML overlay slots for scenes that need native controls or stats
  over a full-screen canvas.

### Three runtime core

- Move repeated renderer/camera/resize/dispose code into shared helpers without
  hiding the scene-specific resource list.
- Add a resource registry for geometries/materials/textures so complex scenes
  can dispose through one path.
- Add a stable frame-clock abstraction so tests can step animation without
  real `requestAnimationFrame`.
- Add optional OffscreenCanvas detection, but keep DOM canvas as the default.

### Primitive parity

Good next candidates:

- Full CameraControls parity, probably behind an optional dependency because
  Drei's version depends on the external `camera-controls` package.
- Troika-style text layout. Current text support is enough for labels and
  geometry, not full rich text layout.
- HDR/environment preset catalog. Current staging primitives expose the
  underlying PMREM/environment hooks but do not ship a preset system.
- Clouds and volumetric atmosphere. They appear in the examples sweep but were
  not part of the first reusable primitive pass.
- More postprocessing chains. Current support covers the base composer and a
  few passes, not the whole ecosystem.
- Loader progress UI as a Foldkit view primitive.

### Scene-specific next work

- Moksha:
  - Add a visual regression/screenshot smoke.
  - Make scroll section data fully caller-configurable.
  - Add a lower-power mode for mobile GPUs.
  - Split font/model/image asset configuration from the default OpenAgents
    narrative.
- Training run:
  - Feed it from live run payloads instead of demo snapshots everywhere.
  - Add a stable selected-node model contract for Foldkit pages.
  - Add viewport-aware label density.
  - Add screenshot tests for selected node overlays.
- Bezier nodes:
  - Add caller-supplied node/edge schemas.
  - Add keyboard-accessible node selection through Foldkit HTML overlays.
  - Add optional edge labels.

### Deployment and consumer checks

- In OpenAgents, keep route/render tests for every public Three scene. The
  `/moksha` failure showed that parser/init tests are not enough when the
  top-level view has its own route delegation.
- When deploying `openagents.com`, build web assets before Wrangler deploy.
- If Docker is not running and containers are unchanged, Wrangler can deploy
  Worker/assets with `--containers-rollout=none`; container image updates still
  require Docker or another compatible CLI.


## Follow-up pass: controls + scene helpers (2026-06-14)

This increment closed the gap between three-effect's single OrbitControls
binding and the broader controls/debug-gizmo surface R3F and Drei expose.

### `extraControlsPrimitives.ts`

Effect-scoped handles for the remaining `three/examples/jsm/controls`
controllers, each with a typed option type, a default-options constant where
the controller is property-driven, an `apply*Options` applicator, and a
`create*` factory returning a handle with the matching action(s) and a scoped
`dispose`:

- `createMapControls` (reuses the OrbitControls applicator; MapControls
  extends OrbitControls).
- `createTrackballControls` (`update`/`dispose`).
- `createFlyControls` (`update(delta)`/`dispose`).
- `createFirstPersonControls` (`update(delta)`/`dispose`).
- `createPointerLockControls` (`lock`/`unlock`/`isLocked`/`dispose`).
- `createTransformControls` (exposes the `getHelper()` gizmo object plus
  `attach`/`detach`/`setMode`/`dispose`).

Reference: `projects/repos/drei/src/{core,web}/*Controls.tsx`.

Note: `@types/three` 0.184 does not declare `FirstPersonControls.activeLook`,
so that field was left out of the typed option surface to keep downstream
`strict` + `noUncheckedIndexedAccess` typecheck clean.

## Follow-up pass: first-person player controller (2026-06-17)

This increment adds a compositional player controller for scenes that need
WASD + mouselook navigation without pulling in React, Drei, or app-local input
glue. It is intentionally lower-level than a game engine entity controller:
`createWasdMouseLookController` owns pointer lock, keyboard state, velocity
integration, movement clamping, ground-height sampling, lock/unlock actions,
and disposal, while the caller still owns the world mesh, collision policy,
HUD affordance, and data-specific scene semantics.

The primitive cites the pmndrs/Drei `PointerLockControls` and `KeyboardControls`
wrappers plus the local `Quick_3D_MMORPG` player input/entity/camera examples
used as references. The implementation keeps the runtime contract small enough
for downstream scenes such as the Tassadar run page to compose a 2.5D walk mode
without forking parallel controller logic.

## Follow-up pass: MMORPG camera and character controller harvest (2026-06-17)

The first `Quick_3D_MMORPG` harvest now lives in `playerControllerPrimitives.ts`
as React-free camera/player-controller building blocks that can be shared by
OpenAgents surfaces before any model-rendering code is ported:

- `createThirdPersonFollowCamera`, `createThirdPersonFollowCameraState`, and
  `updateThirdPersonFollowCamera` mirror the reference follow-camera pattern:
  compute an ideal offset/look-at point from a target transform, clamp the
  camera above the terrain if a ground sampler is provided, and smooth toward
  the target with the same `1 - smoothing^delta` style interpolation.
- `updateMmorpgCharacterController` mirrors the reference character movement
  contract without depending on its entity system: `A`/`D` yaw the controlled
  object, `W`/`S` move along the object's local forward axis, `Shift` selects
  run speed, damping eases idle deceleration, `groundHeightAt` pins the
  controller to terrain, and `canMoveTo` lets consumers supply collision or
  blocked-cell policy.
- `mmorpgCharacterActionForKeyboard` gives downstream renderers a small action
  signal (`idle`, `walk`, `run`) that can drive an animation mixer later
  without coupling core movement to any specific GLB/FBX asset.

The code intentionally ports the behavior shape, not the reference app's ECS,
network layer, or asset paths.

## Follow-up pass: Quick model-rendering primitive harvest (2026-06-17)

The first model-rendering harvest now lives in `assetPrimitives.ts`, drawing
from the Quick static/animated GLTF components, render component, and loader
controller:

- `applyModelRenderOptions` applies the reusable render policy from the
  reference components: scale/position/quaternion, material texture assignment
  by material-name match, optional bounding boxes, cast/receive shadow flags,
  visibility, frustum-culling policy, and caller hooks for object/material
  customization.
- `createGltfModelInstance` clones a loaded GLTF scene, optionally using
  `SkeletonUtils.clone` for skinned characters, creates an `AnimationMixer`,
  registers stable named actions from GLTF clips, exposes a crossfade-aware
  `play(name)` action, and returns an `update(delta)` handle for the render
  loop.
- `disposeModelInstanceResources` is explicit and opt-in because many loaded
  GLTF clones share geometry/material objects with the source asset. Consumers
  must only dispose resources they own.

Still intentionally not ported: the Quick ECS message bus, hard-coded asset
paths, FBX/OBJ loader catalogs, and network entity interpolation. Those should
land as separate primitives only when an OpenAgents scene has a real model or
network state source to bind.

## Follow-up pass: training run perspective walk mode (2026-06-17)

`mountTrainingRunVisualization` now supports an additive `perspective_walk`
camera mode. The default remains the original orthographic map, so existing
consumers keep the same camera, layout, pointer selection, and animation
behavior unless they explicitly pass the new options.

When enabled, the training-run graph is rotated onto an X/Z ground plane,
rendered with a `PerspectiveCamera`, and given a subtle floor grid for spatial
reference. If `controller: "wasd_mouselook"` is also set, the scene mounts the
shared `createWasdMouseLookController` handle, updates it inside the existing
render loop, and uses center-reticle raycasting while pointer lock is active.
Pointer-based selection remains active when pointer lock is inactive, and the
selected node/entity event shape is unchanged.

Pointer-lock entry now follows a selection-first contract. On an unlocked
canvas click, the scene raycasts the click against real node/entity hit
targets; a hit emits the existing node-selected callback and does not request
pointer lock. Only an empty left-click requests pointer lock. While locked,
left pointer-down raycasts from the center reticle so visible nodes can still
open their info without exiting the world.

This pass deliberately does not add synthetic data motion. The added movement
is camera/user interaction. Existing animated beams, bursts, or structural
edge pulses are still controlled by the input `motionPolicy` and evidence
rules already present in the visualization options.

### `helperPrimitives.ts`

React-free factories for the scene debug/gizmo helpers R3F exposes as intrinsic
elements and Drei wraps as `<Grid>`, `<GizmoHelper>`, and `useHelper`. Each
returns a `{ helper, dispose }` handle; `dispose` calls the helper's own
`dispose()` when present, otherwise releases geometry/material:

- grid / polar grid / axes / arrow
- box / box3 / plane bounds
- camera / skeleton
- directional / point / spot / hemisphere / rect-area light helpers
- vertex normals

Reference: `projects/repos/react-three-fiber` intrinsic helper elements and
`projects/repos/drei/src/core/{Grid,GizmoHelper,Helper}.tsx`.

### Verification

- `bun run verify` (typecheck + 58 tests) passes.
- The new modules were also typechecked under a temporary
  `noUncheckedIndexedAccess: true` tsconfig to confirm they stay clean for the
  downstream OpenAgents strict consumer; the only error surfaced there was a
  pre-existing one in `index.test.ts` (Sky uniform access), untouched here.

### Next work for this lane

- Add a Foldkit-level optional gizmo overlay (grid + axes + transform) once a
  consumer needs interactive scene editing.
- Wire `update(delta)` controllers into a shared frame-loop helper so callers
  do not each re-implement clock deltas.

## Follow-up pass: math primitives (2026-06-14)

`mathPrimitives.ts` wraps the `three/examples/jsm/math` utilities that
procedural-geometry, particle-scatter, and data-viz demos repeatedly use, kept
as pure/deterministic helpers (no GPU/DOM handles to dispose):

- `createImprovedNoise` / `createSimplexNoise` plus `fbmNoise3d`, a normalized
  fractal-Brownian-motion sampler that clamps octaves to >= 1 so the
  accumulator divide is always safe.
- `createSurfaceSampler` -- an Effect handle around `MeshSurfaceSampler`
  (`build()` runs eagerly) exposing `sample()` and `samplePositions(count)`
  that returns a packed `Float32Array` ready for a BufferAttribute.
- `createLut` / `lutColorAt` / `lutColorArray` for mapping scalars to colors
  across the named Lut color maps (rainbow, cooltowarm, blackbody, grayscale).

Reference: `projects/repos/drei/src/core/Sampler.tsx` and the local pmndrs
sampler/points demos.

Verification: `bun run verify` (typecheck + 63 tests) passes; the new module is
clean under the temporary `noUncheckedIndexedAccess` typecheck.
