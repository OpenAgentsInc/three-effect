# three-player-controller Reproduction

This directory preserves the full upstream `three-player-controller` example
set inside `three-effect`, including the GLB assets and demo media that the
controller examples need.

Run the catalog from this repo with:

```bash
bun run dev:demo:three-player-controller
```

Then open:

```text
http://localhost:5173/examples/three-player-controller-repro/example/
```

Build and asset verification:

```bash
bun run verify:demo:three-player-controller
```

The multiplayer and 3D Tiles examples keep their upstream remote-service
dependencies. The verifier proves the local catalog and bundles are intact; it
does not require those remote services to be available.
