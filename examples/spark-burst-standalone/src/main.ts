import * as Three from "three"

import {
  createEffectComposerResources,
  createSparkBurst,
} from "../../../packages/core/src/index"

// ---------------------------------------------------------------------------
// Isolated spark-burst scene.
//
// The ONLY data is a seeded RNG inside `createSparkBurst` — no Region DO, no D1,
// no Worker, no live receipt. The scene renders through the bloom composer so
// the additive HDR sparks read as energy in the dark `0x050505` Verse.
//
// The headless capture script drives this scene deterministically through a
// global hook (`__sparkScene`): it steps the simulation a fixed amount, samples
// brightness on emit, then lets the pool decay and samples again.
// ---------------------------------------------------------------------------

const params = new URLSearchParams(globalThis.location?.search ?? "")
const numberParam = (name: string, fallback: number): number => {
  const raw = params.get(name)
  if (raw === null) return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

const mount = document.getElementById("scene")
if (mount === null) throw new Error("missing #scene mount")

const scene = new Three.Scene()
scene.background = new Three.Color(0x050505)

const camera = new Three.PerspectiveCamera(50, 1, 0.1, 100)
camera.position.set(0, 0.2, 4.5)
camera.lookAt(0, 0.2, 0)

const renderer = new Three.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2))
renderer.toneMapping = Three.ACESFilmicToneMapping
renderer.toneMappingExposure = 1
mount.appendChild(renderer.domElement)

const sizeOf = (): readonly [number, number] => [
  Math.max(1, mount.clientWidth),
  Math.max(1, mount.clientHeight),
]

// The spark burst: capacity-bounded, additive, HDR, seeded. autoEmit is off so
// the capture can control emit vs decay precisely; we burst on demand.
const sparks = createSparkBurst({
  seed: 6013,
  capacity: numberParam("capacity", 120),
  position: [0, -0.2, 0],
  color: 0x88ccff,
  secondaryColor: 0x081224,
  emissiveStrength: numberParam("hdr", 9),
  speed: numberParam("speed", 1.9),
  spread: Math.PI,
  lifetime: numberParam("lifetime", 1.2),
  gravity: numberParam("gravity", 1.6),
  size: numberParam("size", 0.09),
  autoEmit: false,
})
scene.add(sparks.object3D)

const composer = createEffectComposerResources(renderer, scene, camera, {
  size: sizeOf(),
  // Modest strength + a threshold so only the bright spark cores bloom — the
  // additive sprites read as discrete embers, not a saturated white-out.
  bloom: { strength: 0.7, radius: 0.45, threshold: 0.55 },
  output: true,
})

const resize = (): void => {
  const [width, height] = sizeOf()
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  composer.composer.setSize(width, height)
}
resize()
globalThis.addEventListener("resize", resize)

const renderFrame = (delta: number): void => {
  sparks.update(delta)
  composer.render(delta)
}

// Idle render loop so the scene is alive for human inspection. The capture
// script ignores this and drives `step`/`burst` explicitly.
let running = true
let lastEmit = 0
const clock = new Three.Clock()
const frame = (): void => {
  if (!running) return
  const delta = clock.getDelta()
  lastEmit += delta
  if (lastEmit > 0.04) {
    sparks.burst(8)
    lastEmit = 0
  }
  renderFrame(delta)
  globalThis.requestAnimationFrame(frame)
}
globalThis.requestAnimationFrame(frame)

// Deterministic control hook for the headless capture.
;(globalThis as unknown as { __sparkScene?: unknown }).__sparkScene = {
  ready: true,
  capacity: sparks.capacity,
  count: () => sparks.count(),
  // Stop the idle loop so the capture fully controls the timeline.
  freeze: () => {
    running = false
  },
  // Emit `count` sparks and render one frame at the current time.
  burst: (count: number) => {
    sparks.burst(count)
    renderFrame(0)
  },
  // Advance the simulation by `delta` seconds and render a frame.
  step: (delta: number) => {
    renderFrame(delta)
  },
}

globalThis.addEventListener("pagehide", () => {
  running = false
  globalThis.removeEventListener("resize", resize)
  sparks.dispose()
  composer.dispose()
  renderer.dispose()
})
