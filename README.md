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
      and shader-material uniform accessors.
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

## Common Primitive Pass

The latest examples sweep scanned `projects/repos/examples/demos` and compared
the frequent `@react-three/drei` / `@react-three/fiber` primitives against what
`three-effect` already had. The highest-volume primitives were `useGLTF`,
`Environment`, `OrbitControls`, `useTexture`, `ScrollControls` / `useScroll`,
`Text`, `Float`, camera helpers, `Html`, `Bounds`, `Center`, `Instances`, and
`shaderMaterial`.

This pass pulled the reusable, React-free layer into `@openagentsinc/three-effect/core`:

- `assetPrimitives`
  - `loadTexture`, `loadTextures`, `loadGltf`, `loadGltfs`,
    `collectGltfObjectMap`, and `firstMeshGeometry`.
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

`OrbitControls`, full environment-map staging, and text mesh layout are still
treated as scene-level concerns rather than a core dependency decision. They
show up heavily in the examples, but pulling them into core prematurely would
force policy around controls, HDR assets, font loading, and layout that should
remain explicit in Foldkit scenes for now.

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

## Training Run Demo

The tracked visual smoke for the Training scene lives at
`examples/training-run/`. It exercises the lifecycle graph, live run snapshot,
promise-registry signals, and operator-command signals in one dark canvas.
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
```
