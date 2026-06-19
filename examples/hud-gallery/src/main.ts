import { Effect } from "effect"

import { mountHudGallery } from "../../../packages/core/src/index"

const mount = document.getElementById("scene")

if (mount === null) {
  throw new Error("missing #scene mount")
}

const handle = Effect.runSync(mountHudGallery(mount))

window.addEventListener("beforeunload", () => {
  Effect.runSync(handle.dispose)
})
