import * as Three from "three"

import {
  createCommandComposerHud,
  createEffectComposerResources,
} from "../../../packages/core/src/index"

const params = new URLSearchParams(globalThis.location?.search ?? "")
const reducedMotion = params.get("reducedMotion") === "1"

const mount = document.getElementById("scene")
if (mount === null) throw new Error("missing #scene mount")

const scene = new Three.Scene()
scene.background = new Three.Color(0x050505)

const camera = new Three.OrthographicCamera(-4.4, 4.4, 2.7, -2.7, 0.1, 20)
camera.position.set(0, 0, 5)
camera.lookAt(0, 0, 0)

const renderer = new Three.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2))
renderer.toneMapping = Three.ACESFilmicToneMapping
renderer.toneMappingExposure = 1
mount.appendChild(renderer.domElement)

const sizeOf = (): readonly [number, number] => [
  Math.max(1, mount.clientWidth),
  Math.max(1, mount.clientHeight),
]

const hud = createCommandComposerHud({
  focused: true,
  dragActive: true,
  reducedMotion,
  resolution: sizeOf(),
  layout: {
    width: 7.2,
    height: 2,
    attachmentRailHeight: 0.34,
    padding: 0.14,
  },
  dropcursor: { visible: true, x: -1.35, intensity: 0.9 },
  attachments: [
    { id: "diff", kind: "diff", status: "ready", selected: true },
    { id: "image", kind: "image", status: "uploading", progress: 0.64 },
    { id: "paste", kind: "text", status: "staged" },
    { id: "err", kind: "file", status: "error" },
  ],
})
scene.add(hud.object3D)

const composer = createEffectComposerResources(renderer, scene, camera, {
  size: sizeOf(),
  bloom: { strength: 0.82, radius: 0.52, threshold: 0.45 },
  output: true,
})

const resize = (): void => {
  const [width, height] = sizeOf()
  renderer.setSize(width, height, false)
  composer.setSize(width, height, Math.min(globalThis.devicePixelRatio ?? 1, 2))
  hud.setResolution(width, height)
}
resize()
globalThis.addEventListener("resize", resize)

let running = true
const renderFrame = (delta: number): void => {
  hud.update(delta)
  composer.render(delta)
}

const clock = new Three.Clock()
const frame = (): void => {
  if (!running) return
  renderFrame(clock.getDelta())
  globalThis.requestAnimationFrame(frame)
}
globalThis.requestAnimationFrame(frame)

;(globalThis as unknown as { __commandComposerHudScene?: unknown })
  .__commandComposerHudScene = {
    ready: true,
    freeze: () => {
      running = false
    },
    step: (delta: number) => {
      renderFrame(delta)
    },
    setReducedMotion: (enabled: boolean) => {
      hud.setReducedMotion(enabled)
    },
    setFocus: (enabled: boolean) => {
      hud.setFocus(enabled)
    },
    setDragging: (enabled: boolean) => {
      hud.setDragActive(enabled)
    },
  }

globalThis.addEventListener("pagehide", () => {
  running = false
  globalThis.removeEventListener("resize", resize)
  hud.dispose()
  composer.dispose()
  renderer.dispose()
})
