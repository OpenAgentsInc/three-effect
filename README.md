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
  spinningCubeView,
  trainingRunView,
} from "@openagentsinc/three-effect/foldkit"

const preview = spinningCubeView<Message>()
const graph = bezierNodesView<Message>()
const training = trainingRunView<Message>()
```

The Foldkit helpers register `oa-spinning-cube`, `oa-bezier-nodes`, and
`oa-training-run` custom elements when a browser custom-elements registry is
available. Each element owns a scoped Three renderer and releases it on
disconnect.

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
bun run build:demo:training
```
