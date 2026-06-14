import { Effect } from "effect"

import { mountBezierNodes } from "../../../packages/core/src/index"

const mount = document.getElementById("scene")

if (mount === null) {
  throw new Error("missing #scene mount")
}

const handle = Effect.runSync(mountBezierNodes(mount))

globalThis.addEventListener("pagehide", () => {
  Effect.runSync(handle.dispose)
})
