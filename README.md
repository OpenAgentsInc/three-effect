# three-effect

Effect and Foldkit bindings for small, resource-scoped Three.js scenes.

The near-term target is not React Three Fiber parity. This repo is for an
Effect-owned Three runtime and a Foldkit adapter that can be used by
OpenAgents web and desktop surfaces. React adapters are intentionally out of
scope for now.

## Packages

- `@openagentsinc/three-effect/core`
  - Effect-first Three runtime utilities.
  - Current proof point: a scoped spinning cube renderer with deterministic
    disposal.
- `@openagentsinc/three-effect/foldkit`
  - Foldkit custom-element binding for the core spinning cube.
  - Designed for Foldkit views to render the element declaratively while Three
    resources remain outside the Foldkit model.

Workspace package manifests also exist under `packages/core` and
`packages/foldkit` as the future publish split:

- `@openagentsinc/three-effect-core`
- `@openagentsinc/three-effect-foldkit`

## Usage

```ts
import { spinningCubeView } from "@openagentsinc/three-effect/foldkit"

const preview = spinningCubeView<Message>()
```

The Foldkit helper registers an `oa-spinning-cube` custom element when a browser
custom-elements registry is available. The element owns a scoped Three renderer
and releases it on disconnect.

## Commands

```sh
bun install
bun run verify
```

