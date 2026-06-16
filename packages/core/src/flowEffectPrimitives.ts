import * as Three from "three"

import { type Vector3Like, toVector3 } from "./cameraPrimitives"

export const pmndrsFlowEffectPrimitiveSourceRefs = [
  "projects/repos/examples/demos/tube/src/App.jsx",
  "projects/repos/examples/demos/lightbeams/src/App.jsx",
  "projects/repos/drei/src/core/QuadraticBezierLine.tsx",
  "projects/repos/drei/src/core/Sparkles.tsx",
] as const

// ---------------------------------------------------------------------------
// Flow beam
// ---------------------------------------------------------------------------

export type FlowBeamOptions = Readonly<{
  from: Vector3Like
  to: Vector3Like
  color?: Three.ColorRepresentation
  /** Pulses travelled along the beam per second. */
  rate?: number
  /** Number of pulses riding the beam at once. */
  pulseCount?: number
  /** Radius of the beam tube. */
  radius?: number
  /** Radius of each pulse sphere. */
  pulseRadius?: number
  /** Curve bend, lifted along +Y at the midpoint. */
  bend?: number
  /** Base opacity of the static beam line. */
  opacity?: number
  segments?: number
}>

export type FlowBeamHandle = Readonly<{
  /** Group containing the beam tube and travelling pulses. */
  object3D: Three.Group
  /** Advance the pulses by `deltaSeconds`. */
  update: (deltaSeconds: number) => void
  /** Reposition the beam endpoints. */
  setEndpoints: (from: Vector3Like, to: Vector3Like) => void
  /** Change the pulse travel rate. */
  setRate: (rate: number) => void
  dispose: () => void
}>

const beamCurve = (
  from: Three.Vector3,
  to: Three.Vector3,
  bend: number,
): Three.QuadraticBezierCurve3 => {
  const mid = from.clone().lerp(to, 0.5).add(new Three.Vector3(0, bend, 0))
  return new Three.QuadraticBezierCurve3(from.clone(), mid, to.clone())
}

/**
 * An animated beam of light flowing from `from` to `to`, with travelling
 * pulse spheres whose phase advances at `rate`. Generalizes the tubeFlow /
 * lightBeams ideas into a data-driven, disposable factory.
 */
export const createFlowBeam = (options: FlowBeamOptions): FlowBeamHandle => {
  const color = options.color ?? 0x7dd3fc
  const segments = Math.max(2, options.segments ?? 48)
  const radius = options.radius ?? 0.01
  const pulseRadius = options.pulseRadius ?? 0.045
  const pulseCount = Math.max(1, Math.floor(options.pulseCount ?? 3))
  const bend = options.bend ?? 0
  const opacity = options.opacity ?? 0.4

  let rate = options.rate ?? 0.4
  let from = toVector3(options.from)
  let to = toVector3(options.to)

  const group = new Three.Group()

  const tubeMaterial = new Three.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  })
  let curve = beamCurve(from, to, bend)
  let tube = new Three.Mesh(
    new Three.TubeGeometry(curve, segments, radius, 8, false),
    tubeMaterial,
  )
  group.add(tube)

  const pulseGeometry = new Three.SphereGeometry(pulseRadius, 12, 8)
  const pulseMaterial = new Three.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  })
  const pulses: Array<{ mesh: Three.Mesh; phase: number }> = []
  for (let index = 0; index < pulseCount; index += 1) {
    const mesh = new Three.Mesh(pulseGeometry, pulseMaterial)
    const phase = index / pulseCount
    mesh.position.copy(curve.getPointAt(phase))
    group.add(mesh)
    pulses.push({ mesh, phase })
  }

  const rebuildTube = (): void => {
    curve = beamCurve(from, to, bend)
    const next = new Three.TubeGeometry(curve, segments, radius, 8, false)
    tube.geometry.dispose()
    tube.geometry = next
    for (const pulse of pulses) {
      pulse.mesh.position.copy(curve.getPointAt(pulse.phase % 1))
    }
  }

  const update = (deltaSeconds: number): void => {
    for (const pulse of pulses) {
      pulse.phase = (pulse.phase + deltaSeconds * rate) % 1
      pulse.mesh.position.copy(curve.getPointAt(pulse.phase))
    }
  }

  const setEndpoints = (nextFrom: Vector3Like, nextTo: Vector3Like): void => {
    from = toVector3(nextFrom)
    to = toVector3(nextTo)
    rebuildTube()
  }

  const setRate = (nextRate: number): void => {
    rate = nextRate
  }

  const dispose = (): void => {
    tube.geometry.dispose()
    tubeMaterial.dispose()
    pulseGeometry.dispose()
    pulseMaterial.dispose()
    group.removeFromParent()
  }

  return { object3D: group, update, setEndpoints, setRate, dispose }
}

// ---------------------------------------------------------------------------
// Payout burst
// ---------------------------------------------------------------------------

export type PayoutBurstOptions = Readonly<{
  at: Vector3Like
  color?: Three.ColorRepresentation
  /** Number of particles in the burst. */
  count?: number
  /** Lifetime of the burst in seconds. */
  duration?: number
  /** Peak distance particles travel from the origin. */
  spread?: number
  size?: number
  /** Deterministic seed so bursts are reproducible. */
  seed?: number
}>

export type PayoutBurstHandle = Readonly<{
  /** Points object for the burst. Add to a scene/group. */
  object3D: Three.Points
  /** Advance the burst. Returns false once the burst has finished. */
  update: (deltaSeconds: number) => boolean
  /** Fractional progress through the burst lifetime (0..1). */
  progress: () => number
  /** True once the burst has run its full duration. */
  done: () => boolean
  dispose: () => void
}>

const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * A one-shot particle burst marking a settlement / payout event at `at`.
 * Particles fly radially outward and fade over `duration`. Disposable and
 * data-driven; `update` returns false when finished so a scene can drop it.
 */
export const createPayoutBurst = (
  options: PayoutBurstOptions,
): PayoutBurstHandle => {
  const origin = toVector3(options.at)
  const count = Math.max(1, Math.floor(options.count ?? 48))
  const duration = Math.max(0.0001, options.duration ?? 0.9)
  const spread = options.spread ?? 0.8
  const size = options.size ?? 0.04
  const random = mulberry32(options.seed ?? 1)

  const positions = new Float32Array(count * 3)
  const velocities = new Float32Array(count * 3)

  for (let index = 0; index < count; index += 1) {
    // Uniform-ish direction on a sphere.
    const theta = random() * Math.PI * 2
    const phi = Math.acos(2 * random() - 1)
    const speed = spread * (0.4 + random() * 0.6)
    const dx = Math.sin(phi) * Math.cos(theta) * speed
    const dy = Math.sin(phi) * Math.sin(theta) * speed
    const dz = Math.cos(phi) * speed

    positions[index * 3] = origin.x
    positions[index * 3 + 1] = origin.y
    positions[index * 3 + 2] = origin.z
    velocities[index * 3] = dx
    velocities[index * 3 + 1] = dy
    velocities[index * 3 + 2] = dz
  }

  const geometry = new Three.BufferGeometry()
  geometry.setAttribute("position", new Three.BufferAttribute(positions, 3))

  const material = new Three.PointsMaterial({
    color: options.color ?? 0xb7f7d4,
    size,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    sizeAttenuation: true,
  })

  const points = new Three.Points(geometry, material)

  let elapsed = 0

  const update = (deltaSeconds: number): boolean => {
    if (elapsed >= duration) return false
    elapsed = Math.min(duration, elapsed + deltaSeconds)
    const fraction = elapsed / duration
    // Ease-out radial expansion.
    const reach = 1 - Math.pow(1 - fraction, 2)
    const attribute = geometry.getAttribute("position") as Three.BufferAttribute
    const array = attribute.array as Float32Array
    for (let index = 0; index < count; index += 1) {
      array[index * 3] = origin.x + velocities[index * 3]! * reach
      array[index * 3 + 1] = origin.y + velocities[index * 3 + 1]! * reach
      array[index * 3 + 2] = origin.z + velocities[index * 3 + 2]! * reach
    }
    attribute.needsUpdate = true
    material.opacity = 1 - fraction
    return elapsed < duration
  }

  const dispose = (): void => {
    geometry.dispose()
    material.dispose()
    points.removeFromParent()
  }

  return {
    object3D: points,
    update,
    progress: () => Math.min(1, elapsed / duration),
    done: () => elapsed >= duration,
    dispose,
  }
}
