import * as Three from "three"

import {
  type EvidenceBackedCracklingArcOptions,
  type EvidenceBackedGatewayPortalOptions,
  type InferenceVisualEvidence,
  createEvidenceBackedCracklingArc,
  createEvidenceBackedGatewayPortal,
} from "../../../packages/core/src/index"

// ---------------------------------------------------------------------------
// Synthetic, simulated inference event.
//
// This is the ONLY data feeding the scene. There is no Region Durable Object,
// no D1, no Worker, and no live receipt. `simulated:true` + `evidenceMode`
// "optional" is exactly the demo-scene contract described in
// openagents/docs/game/2026-06-22-isolated-verse-scene-harness-audit.md.
// ---------------------------------------------------------------------------

type SyntheticInferenceEvent = InferenceVisualEvidence &
  Readonly<{
    motionKind: "crackling_energy"
    evidenceMode: "optional" | "required"
  }>

const syntheticEvent: SyntheticInferenceEvent = {
  motionKind: "crackling_energy",
  sourceRefs: ["github:OpenAgentsInc/openagents#6013"],
  simulated: true,
  evidenceMode: "optional",
  generatedAt: new Date().toISOString(),
}

// ---------------------------------------------------------------------------
// Eyeball knobs.
//
// Defaults live here as plain constants; every one can be overridden with a
// URL query param (e.g. ?strandCount=6&rate=3.2&color=0x93c5fd&portal=1).
// ---------------------------------------------------------------------------

const params = new URLSearchParams(globalThis.location?.search ?? "")

const numberParam = (name: string, fallback: number): number => {
  const raw = params.get(name)
  if (raw === null) return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

const colorParam = (name: string, fallback: number): number => {
  const raw = params.get(name)
  if (raw === null) return fallback
  const parsed = raw.startsWith("0x") ? Number(raw) : Number.parseInt(raw, 16)
  return Number.isFinite(parsed) ? parsed : fallback
}

const vectorParam = (
  name: string,
  fallback: readonly [number, number, number],
): readonly [number, number, number] => {
  const raw = params.get(name)
  if (raw === null) return fallback
  const parts = raw.split(",").map((value) => Number(value))
  if (parts.length === 3 && parts.every((value) => Number.isFinite(value))) {
    return [parts[0], parts[1], parts[2]] as const
  }
  return fallback
}

const boolParam = (name: string, fallback: boolean): boolean => {
  const raw = params.get(name)
  if (raw === null) return fallback
  return raw === "1" || raw === "true" || raw === "yes"
}

const knobs = {
  from: vectorParam("from", [-1.6, -0.4, 0]),
  to: vectorParam("to", [1.6, 0.6, 0]),
  strandCount: numberParam("strandCount", 5),
  rate: numberParam("rate", 2.6),
  opacity: numberParam("opacity", 0.78),
  color: colorParam("color", 0x93c5fd),
  secondaryColor: colorParam("secondaryColor", 0xf8fafc),
  showPortal: boolParam("portal", false),
} as const

// ---------------------------------------------------------------------------
// Minimal Three.js scene: camera + WebGLRenderer + a delta render loop that
// calls handle.update. No shared mount helper — this is the isolated slice.
// ---------------------------------------------------------------------------

const mount = document.getElementById("scene")
if (mount === null) {
  throw new Error("missing #scene mount")
}

const scene = new Three.Scene()
scene.background = new Three.Color(0x050505)

const camera = new Three.PerspectiveCamera(50, 1, 0.1, 100)
camera.position.set(0, 0.4, 5)
camera.lookAt(0, 0, 0)

const renderer = new Three.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2))
mount.appendChild(renderer.domElement)

const resize = (): void => {
  const width = mount.clientWidth || 1
  const height = mount.clientHeight || 1
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}
resize()
globalThis.addEventListener("resize", resize)

const updaters: Array<(deltaSeconds: number) => void> = []
const disposers: Array<() => void> = []

// --- Crackling arc (the one effect this scene exists to show) -------------

const arcOptions: EvidenceBackedCracklingArcOptions = {
  from: knobs.from,
  to: knobs.to,
  strandCount: knobs.strandCount,
  rate: knobs.rate,
  opacity: knobs.opacity,
  color: knobs.color,
  secondaryColor: knobs.secondaryColor,
  seed: 6013,
  motionKind: syntheticEvent.motionKind,
  sourceRefs: syntheticEvent.sourceRefs,
  simulated: syntheticEvent.simulated,
  generatedAt: syntheticEvent.generatedAt,
  evidenceMode: syntheticEvent.evidenceMode,
}

const arc = createEvidenceBackedCracklingArc(arcOptions)

if (arc.rendered) {
  scene.add(arc.handle.object3D)
  updaters.push(arc.handle.update)
  disposers.push(arc.handle.dispose)
} else {
  console.warn("crackling arc refused to render:", arc.reason, arc.evidence)
}

// --- Optional gateway portal (second toggle: ?portal=1) -------------------

let portalRendered = false
if (knobs.showPortal) {
  const portalOptions: EvidenceBackedGatewayPortalOptions = {
    position: [0, -1.4, 0],
    lane: "openrouter",
    status: "working",
    seed: 6013,
    motionKind: "gateway_portal",
    sourceRefs: syntheticEvent.sourceRefs,
    simulated: syntheticEvent.simulated,
    generatedAt: syntheticEvent.generatedAt,
    evidenceMode: syntheticEvent.evidenceMode,
  }
  const portal = createEvidenceBackedGatewayPortal(portalOptions)
  if (portal.rendered) {
    scene.add(portal.handle.object3D)
    updaters.push(portal.handle.update)
    disposers.push(portal.handle.dispose)
    portalRendered = true
  } else {
    console.warn("gateway portal refused to render:", portal.reason, portal.evidence)
  }
}

// --- Evidence overlay (so the contract is visible on-screen) --------------

const overlay = document.createElement("pre")
overlay.className = "evidence"
overlay.textContent = [
  `motionKind:   ${syntheticEvent.motionKind}`,
  `sourceRefs:   ${(syntheticEvent.sourceRefs ?? []).join(", ")}`,
  `simulated:    ${String(syntheticEvent.simulated)}`,
  `evidenceMode: ${syntheticEvent.evidenceMode}`,
  `generatedAt:  ${syntheticEvent.generatedAt}`,
  `arc:          rendered=${String(arc.rendered)}`,
  `portal:       ${knobs.showPortal ? `rendered=${String(portalRendered)}` : "off (?portal=1)"}`,
].join("\n")
mount.appendChild(overlay)

// --- Delta render loop ----------------------------------------------------

const clock = new Three.Clock()
let running = true

const frame = (): void => {
  if (!running) return
  const delta = clock.getDelta()
  for (const update of updaters) update(delta)
  renderer.render(scene, camera)
  globalThis.requestAnimationFrame(frame)
}
globalThis.requestAnimationFrame(frame)

// Expose a tiny hook so the headless capture script can confirm boot.
;(globalThis as unknown as { __cracklingScene?: unknown }).__cracklingScene = {
  arcRendered: arc.rendered,
  portalRendered,
}

globalThis.addEventListener("pagehide", () => {
  running = false
  globalThis.removeEventListener("resize", resize)
  for (const dispose of disposers) dispose()
  renderer.dispose()
})
