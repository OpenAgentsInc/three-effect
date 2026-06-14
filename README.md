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
    - a dark operator training-run visualization for lifecycle states, run
      windows, seal/staleness, verification, receipts, rungs, contributor dots,
      and loss-curve feedback.
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

## Commands

```sh
bun install
bun run verify
```
