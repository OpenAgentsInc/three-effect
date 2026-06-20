import * as Three from "three"

import {
  createAgentAvatar,
  createAgentWarpInEffect,
  createCharacterSpawner,
  createEntityRegistry,
  createResourceBar,
  defaultWasdKeyboardState,
  type CharacterSpawnerHandle,
  type ResourceBarHandle,
  type MutableWasdKeyboardState,
} from "../../../packages/core/src/index"

const mount = document.getElementById("scene")
const nearbyCount = document.getElementById("nearby-count")

if (mount === null || nearbyCount === null) {
  throw new Error("missing character spawner demo mount")
}

const keyboard: MutableWasdKeyboardState = defaultWasdKeyboardState()
const keyMap: Readonly<Record<string, keyof MutableWasdKeyboardState>> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "backward",
  ArrowDown: "backward",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  ShiftLeft: "sprint",
  ShiftRight: "sprint",
}

const setKey = (event: KeyboardEvent, pressed: boolean): void => {
  const action = keyMap[event.code]
  if (action === undefined) return
  keyboard[action] = pressed
  event.preventDefault()
}

window.addEventListener("keydown", event => setKey(event, true))
window.addEventListener("keyup", event => setKey(event, false))

const renderer = new Three.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
renderer.setClearColor(0x080a0f, 1)
mount.appendChild(renderer.domElement)

const scene = new Three.Scene()
scene.fog = new Three.Fog(0x080a0f, 12, 44)

const camera = new Three.PerspectiveCamera(55, 1, 0.1, 100)
camera.position.set(0, 4.8, 10)

const hemi = new Three.HemisphereLight(0xd8f3ff, 0x141824, 1.6)
scene.add(hemi)
const key = new Three.DirectionalLight(0xffffff, 2.1)
key.position.set(4, 8, 5)
scene.add(key)

const floor = new Three.Mesh(
  new Three.PlaneGeometry(42, 42, 42, 42),
  new Three.MeshStandardMaterial({
    color: 0x101621,
    metalness: 0.15,
    roughness: 0.82,
    wireframe: true,
  }),
)
floor.rotation.x = -Math.PI / 2
scene.add(floor)

const local = createCharacterSpawner({
  mode: "local",
  keyboard,
  camera,
  name: { text: "local-pylon", fontSize: 42, color: "#f6fbff", floatHeight: 1.45 },
  position: [-2.5, 0, 0],
  controller: { walkSpeed: 3.4, runSpeed: 6.4, acceleration: 28 },
})
const localAvatar = createAgentAvatar({
  color: 0xf59e0b,
  radius: 0.46,
  spinSpeed: 1.2,
})
local.root.add(localAvatar.group)
const localBars: readonly ResourceBarHandle[] = [
  createResourceBar({ kind: "health", value: 0.92, width: 1.25, height: 0.09 }),
  createResourceBar({ kind: "mana", value: 0.68, width: 1.25, height: 0.09 }),
  createResourceBar({ kind: "earnings", value: 0.38, width: 1.25, height: 0.09 }),
]
localBars.forEach((bar, index) => {
  bar.group.position.set(0, 1.95 - index * 0.15, 0)
  local.root.add(bar.group)
})
scene.add(local.root)

const remote = createCharacterSpawner({
  mode: "remote",
  name: { text: "remote-agent", fontSize: 42, color: "#b8f3ff", floatHeight: 1.45 },
  initial: { id: "remote-agent", position: [2.8, 0, 0], state: "idle" },
  interpolation: { interpolateMs: 420, staleAfterMs: 2_000, despawnAfterMs: 8_000 },
})
const remoteAvatar = createAgentAvatar({
  color: 0x67e8f9,
  radius: 0.46,
  spinSpeed: 0.85,
})
remote.root.add(remoteAvatar.group)
const remoteBars: readonly ResourceBarHandle[] = [
  createResourceBar({ kind: "health", value: 0.74, width: 1.25, height: 0.09 }),
  createResourceBar({ kind: "mana", value: 0.88, width: 1.25, height: 0.09 }),
]
remoteBars.forEach((bar, index) => {
  bar.group.position.set(0, 1.95 - index * 0.15, 0)
  remote.root.add(bar.group)
})
scene.add(remote.root)

const registry = createEntityRegistry<CharacterSpawnerHandle>({
  spatial: {
    bounds: { minX: -24, minY: -24, maxX: 24, maxY: 24 },
    cellsX: 12,
    cellsY: 12,
    defaultSize: { width: 1.2, height: 1.2 },
  },
})
registry.register({
  id: "local-pylon",
  entity: local,
  position: local.root.position,
  update: entity => {
    registry.setPosition("local-pylon", entity.root.position)
  },
})
registry.register({
  id: "remote-agent",
  entity: remote,
  position: remote.root.position,
  update: entity => {
    registry.setPosition("remote-agent", entity.root.position)
  },
})

const warpLocal = createAgentWarpInEffect({
  at: local.root.position,
  color: 0xf59e0b,
  sourceRefs: ["demo://character-spawner/local"],
})
const warpRemote = createAgentWarpInEffect({
  at: remote.root.position,
  color: 0x67e8f9,
  sourceRefs: ["demo://character-spawner/remote"],
})

if (warpLocal.rendered) scene.add(warpLocal.handle.object3D)
if (warpRemote.rendered) scene.add(warpRemote.handle.object3D)

const clock = new Three.Clock()
let remotePhase = 0
let remoteTargetMs = 0

const resize = (): void => {
  const rect = mount.getBoundingClientRect()
  const width = Math.max(1, Math.floor(rect.width))
  const height = Math.max(1, Math.floor(rect.height))
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

const tick = (nowMs: number): void => {
  const delta = Math.min(clock.getDelta(), 0.05)

  if (nowMs >= remoteTargetMs) {
    remotePhase += 0.7
    remoteTargetMs = nowMs + 700
    remote.applyTransform?.({
      id: "remote-agent",
      position: [
        2.8 + Math.cos(remotePhase) * 2.4,
        0,
        Math.sin(remotePhase * 0.8) * 2.2,
      ],
      rotationY: -remotePhase,
      state: "walk",
      timestampMs: nowMs,
    })
  }

  const handles: readonly CharacterSpawnerHandle[] = [local, remote]
  for (const handle of handles) {
    handle.update(delta)
    handle.faceCamera(camera)
  }
  registry.tick(delta, nowMs)
  nearbyCount.textContent = String(
    registry.near(local.root.position, 4.5, "local-pylon").length,
  )
  localAvatar.update(delta)
  remoteAvatar.update(delta)
  const manaPulse = 0.55 + 0.35 * Math.sin(nowMs * 0.0012)
  localBars[1]?.setValue(manaPulse)
  localBars[2]?.setValue(Math.min(1, localBars[2].value() + delta * 0.035))
  remoteBars[0]?.setValue(0.65 + 0.2 * Math.cos(nowMs * 0.0015))
  for (const bar of [...localBars, ...remoteBars]) bar.faceCamera(camera)
  if (warpLocal.rendered) warpLocal.handle.update(delta * 1000)
  if (warpRemote.rendered) warpRemote.handle.update(delta * 1000)

  renderer.render(scene, camera)
  requestAnimationFrame(tick)
}

resize()
window.addEventListener("resize", resize)
requestAnimationFrame(tick)

window.addEventListener("pagehide", () => {
  local.dispose()
  remote.dispose()
  localAvatar.dispose()
  remoteAvatar.dispose()
  for (const bar of [...localBars, ...remoteBars]) bar.dispose()
  if (warpLocal.rendered) warpLocal.handle.dispose()
  if (warpRemote.rendered) warpRemote.handle.dispose()
  floor.geometry.dispose()
  ;(floor.material as Three.Material).dispose()
  renderer.dispose()
  renderer.domElement.remove()
  registry.clear()
})
