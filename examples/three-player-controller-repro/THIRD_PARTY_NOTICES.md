# three-player-controller Reproduction Notice

This example catalog mirrors the upstream `three-player-controller` demo tree so
OpenAgents can keep the full controller, model, GLB, 3DGS, BIM, audio, texture,
shooting, multiplayer, and mobile-control examples available from the owned
`three-effect` lane.

Upstream project:

- Repository: `https://github.com/hh-hang/three-player-controller`
- Package: `three-player-controller@0.4.8`
- Author: `hh-hang`
- License: MIT
- Copyright: `(c) 2026 Qu Hang`

Mirrored paths in this directory:

- `src/`: upstream controller source used by the demos
- `example/`: upstream HTML/JS examples and public demo assets
- `assets/`: upstream mobile-control image assets
- `LICENSE.upstream`: upstream MIT license text
- `README.upstream.md`: upstream English README

Some examples intentionally retain upstream runtime dependencies:

- `3dgs` and `multiplayer-3dgs` use `@sparkjsdev/spark`.
- `OfficeBuilding` and `3dtilesScene` use `3d-tiles-renderer`.
- Multiplayer examples use the upstream Firebase realtime setup.
- Vehicle examples dynamically load optional Rapier support.

The local verification script checks that the catalog, GLB/media payload, and
browser bundles remain present. It does not assert that remote multiplayer or
external map/tiles services are online.
