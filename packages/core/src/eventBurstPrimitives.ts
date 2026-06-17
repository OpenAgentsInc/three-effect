import * as Three from "three"

import { type Vector3Like, toVector3 } from "./cameraPrimitives"

export const quickMmorpgEventBurstPrimitiveSourceRefs = [
  "projects/repos/Quick_3D_MMORPG/client/src/particle-system.js",
  "projects/repos/Quick_3D_MMORPG/client/src/blood-effect.js",
  "projects/repos/Quick_3D_MMORPG/client/src/sorceror-effect.js",
  "projects/repos/Quick_3D_MMORPG/client/src/level-up-component.js",
] as const

export type SplinePoint<TValue> = readonly [number, TValue]

export type LinearSpline<TValue> = Readonly<{
  points: readonly SplinePoint<TValue>[]
  sample: (t: number) => TValue
}>

export type EventBurstEvidence = Readonly<{
  motionId?: string
  motionKind?: string
  sourceRefs?: readonly string[]
  generatedAt?: string
  expiresAt?: string
  simulated?: boolean
}>

export type EventBurstEvidenceMode = "optional" | "required"

export type SplineParticleEmitterOptions = Readonly<{
  at: Vector3Like
  count?: number
  durationMs?: number
  spread?: number
  drag?: number
  seed?: number
  color?: LinearSpline<Three.Color> | Three.ColorRepresentation
  alpha?: LinearSpline<number>
  size?: LinearSpline<number> | number
}>

export type SplineParticleEmitterHandle = Readonly<{
  object3D: Three.Points
  update: (deltaMs: number) => boolean
  progress: () => number
  done: () => boolean
  dispose: () => void
}>

export type EvidenceBackedEventBurstOptions = SplineParticleEmitterOptions &
  EventBurstEvidence &
  Readonly<{
    evidenceMode?: EventBurstEvidenceMode
  }>

export type EvidenceBackedEventBurstResult =
  | Readonly<{
      rendered: false
      reason: "missing_evidence"
      evidence: EventBurstEvidence
    }>
  | Readonly<{
      rendered: true
      handle: SplineParticleEmitterHandle
      evidence: EventBurstEvidence
    }>

const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export const createLinearSpline = <TValue>(
  points: readonly SplinePoint<TValue>[],
  interpolate: (from: TValue, to: TValue, t: number) => TValue,
): LinearSpline<TValue> => {
  const sorted = [...points].sort((a, b) => a[0] - b[0])
  return {
    points: sorted,
    sample: t => sampleLinearSpline(sorted, t, interpolate),
  }
}

export const sampleLinearSpline = <TValue>(
  points: readonly SplinePoint<TValue>[],
  t: number,
  interpolate: (from: TValue, to: TValue, t: number) => TValue,
): TValue => {
  if (points.length === 0) {
    throw new Error("sampleLinearSpline requires at least one point")
  }
  if (points.length === 1) {
    return points[0]![1]
  }

  const clamped = Three.MathUtils.clamp(t, 0, 1)
  let left = points[0]!
  for (const right of points.slice(1)) {
    if (clamped <= right[0]) {
      const span = Math.max(0.000001, right[0] - left[0])
      return interpolate(left[1], right[1], (clamped - left[0]) / span)
    }
    left = right
  }
  return points[points.length - 1]![1]
}

export const createNumberSpline = (
  points: readonly SplinePoint<number>[],
): LinearSpline<number> =>
  createLinearSpline(points, (from, to, t) => Three.MathUtils.lerp(from, to, t))

export const createColorSpline = (
  points: readonly SplinePoint<Three.ColorRepresentation>[],
): LinearSpline<Three.Color> =>
  createLinearSpline(
    points.map(([t, color]) => [t, new Three.Color(color)] as const),
    (from, to, t) => from.clone().lerp(to, t),
  )

export const eventBurstHasEvidence = (
  evidence: EventBurstEvidence,
): boolean => (evidence.sourceRefs?.length ?? 0) > 0

export const eventBurstCanRender = (
  evidence: EventBurstEvidence,
  mode: EventBurstEvidenceMode = "optional",
): boolean => mode === "optional" || eventBurstHasEvidence(evidence)

export const createSplineParticleEmitter = (
  options: SplineParticleEmitterOptions,
): SplineParticleEmitterHandle => {
  const origin = toVector3(options.at)
  const count = Math.max(1, Math.floor(options.count ?? 64))
  const durationMs = Math.max(1, options.durationMs ?? 900)
  const spread = options.spread ?? 0.8
  const drag = Three.MathUtils.clamp(options.drag ?? 0.15, 0, 1)
  const random = seededRandom(options.seed ?? 1)
  const alpha =
    options.alpha ?? createNumberSpline([[0, 1], [0.7, 0.8], [1, 0]])
  const size =
    typeof options.size === "number" || options.size === undefined
      ? createNumberSpline([[0, options.size ?? 0.06], [1, 0]])
      : options.size
  const color =
    options.color instanceof Object && "sample" in options.color
      ? options.color
      : createColorSpline([[0, options.color ?? 0xb7f7d4], [1, options.color ?? 0xb7f7d4]])

  const positions = new Float32Array(count * 3)
  const velocities = new Float32Array(count * 3)
  for (let index = 0; index < count; index += 1) {
    const theta = random() * Math.PI * 2
    const phi = Math.acos(2 * random() - 1)
    const speed = spread * (0.4 + random() * 0.6)
    positions[index * 3] = origin.x
    positions[index * 3 + 1] = origin.y
    positions[index * 3 + 2] = origin.z
    velocities[index * 3] = Math.sin(phi) * Math.cos(theta) * speed
    velocities[index * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed
    velocities[index * 3 + 2] = Math.cos(phi) * speed
  }

  const geometry = new Three.BufferGeometry()
  geometry.setAttribute("position", new Three.BufferAttribute(positions, 3))
  const material = new Three.PointsMaterial({
    color: color.sample(0),
    size: size.sample(0),
    transparent: true,
    opacity: alpha.sample(0),
    depthWrite: false,
    sizeAttenuation: true,
  })
  const points = new Three.Points(geometry, material)

  let elapsedMs = 0
  const update = (deltaMs: number): boolean => {
    if (elapsedMs >= durationMs) {
      return false
    }
    elapsedMs = Math.min(durationMs, elapsedMs + Math.max(0, deltaMs))
    const progress = elapsedMs / durationMs
    const attribute = geometry.getAttribute("position") as Three.BufferAttribute
    const array = attribute.array as Float32Array
    const reach = 1 - Math.pow(1 - progress, 2)
    const dampedReach = reach * (1 - drag * progress)
    for (let index = 0; index < count; index += 1) {
      array[index * 3] = origin.x + velocities[index * 3]! * dampedReach
      array[index * 3 + 1] = origin.y + velocities[index * 3 + 1]! * dampedReach
      array[index * 3 + 2] = origin.z + velocities[index * 3 + 2]! * dampedReach
    }
    attribute.needsUpdate = true
    material.opacity = alpha.sample(progress)
    material.size = size.sample(progress)
    material.color.copy(color.sample(progress))
    return elapsedMs < durationMs
  }

  return {
    object3D: points,
    update,
    progress: () => Math.min(1, elapsedMs / durationMs),
    done: () => elapsedMs >= durationMs,
    dispose: () => {
      geometry.dispose()
      material.dispose()
      points.removeFromParent()
    },
  }
}

export const createEvidenceBackedEventBurst = (
  options: EvidenceBackedEventBurstOptions,
): EvidenceBackedEventBurstResult => {
  const evidence: EventBurstEvidence = {
    motionId: options.motionId,
    motionKind: options.motionKind,
    sourceRefs: options.sourceRefs,
    generatedAt: options.generatedAt,
    expiresAt: options.expiresAt,
    simulated: options.simulated,
  }
  if (!eventBurstCanRender(evidence, options.evidenceMode ?? "optional")) {
    return {
      rendered: false,
      reason: "missing_evidence",
      evidence,
    }
  }
  return {
    rendered: true,
    handle: createSplineParticleEmitter(options),
    evidence,
  }
}
