import * as Three from "three"

import { type Vector3Like, toVector3 } from "./cameraPrimitives"

export const openAgentsInferenceGatewayPrimitiveSourceRefs = [
  "openagents/docs/inference/khala-buildout-roadmap.md#6013-B",
  "github:OpenAgentsInc/openagents#6013",
] as const

export type InferenceVisualEvidence = Readonly<{
  motionId?: string
  motionKind?: string
  sourceRefs?: readonly string[]
  generatedAt?: string
  simulated?: boolean
}>

export type InferenceVisualEvidenceMode = "optional" | "required"

export type InferenceGatewayLane =
  | "fireworks"
  | "openrouter"
  | "passthrough"
  | "vertex"
  | (string & {})

export type InferenceGatewayStatus =
  | "blocked"
  | "offline"
  | "online"
  | "unknown"
  | "working"
  | (string & {})

export type CracklingArcOptions = Readonly<{
  from: Vector3Like
  to: Vector3Like
  bend?: number
  color?: Three.ColorRepresentation
  secondaryColor?: Three.ColorRepresentation
  opacity?: number
  rate?: number
  segments?: number
  seed?: number
  strandCount?: number
  jitter?: number
}>

export type CracklingArcHandle = Readonly<{
  object3D: Three.Group
  update: (deltaSeconds: number) => void
  setEndpoints: (from: Vector3Like, to: Vector3Like) => void
  dispose: () => void
}>

export type GatewayPortalOptions = Readonly<{
  position: Vector3Like
  lane?: InferenceGatewayLane
  status?: InferenceGatewayStatus
  radius?: number
  ringCount?: number
  sparkCount?: number
  seed?: number
  color?: Three.ColorRepresentation
  accentColor?: Three.ColorRepresentation
}>

export type GatewayPortalHandle = Readonly<{
  object3D: Three.Group
  update: (deltaSeconds: number) => void
  setPosition: (position: Vector3Like) => void
  setStatus: (status: InferenceGatewayStatus) => void
  dispose: () => void
}>

export type EvidenceBackedCracklingArcOptions = CracklingArcOptions &
  InferenceVisualEvidence &
  Readonly<{
    evidenceMode?: InferenceVisualEvidenceMode
  }>

export type EvidenceBackedGatewayPortalOptions = GatewayPortalOptions &
  InferenceVisualEvidence &
  Readonly<{
    evidenceMode?: InferenceVisualEvidenceMode
  }>

export type EvidenceBackedCracklingArcResult =
  | Readonly<{
      rendered: false
      reason: "missing_evidence"
      evidence: InferenceVisualEvidence
    }>
  | Readonly<{
      rendered: true
      handle: CracklingArcHandle
      evidence: InferenceVisualEvidence
    }>

export type EvidenceBackedGatewayPortalResult =
  | Readonly<{
      rendered: false
      reason: "missing_evidence"
      evidence: InferenceVisualEvidence
    }>
  | Readonly<{
      rendered: true
      handle: GatewayPortalHandle
      evidence: InferenceVisualEvidence
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

const finitePositive = (value: number, fallback: number): number =>
  Number.isFinite(value) && value > 0 ? value : fallback

const clamp01 = (value: number): number => Three.MathUtils.clamp(value, 0, 1)

const inferenceVisualEvidenceFromOptions = (
  options: InferenceVisualEvidence,
): InferenceVisualEvidence => ({
  ...(options.motionId === undefined ? {} : { motionId: options.motionId }),
  ...(options.motionKind === undefined ? {} : { motionKind: options.motionKind }),
  ...(options.sourceRefs === undefined ? {} : { sourceRefs: options.sourceRefs }),
  ...(options.generatedAt === undefined ? {} : { generatedAt: options.generatedAt }),
  ...(options.simulated === undefined ? {} : { simulated: options.simulated }),
})

export const inferenceVisualHasEvidence = (
  evidence: InferenceVisualEvidence,
): boolean => (evidence.sourceRefs?.length ?? 0) > 0 || evidence.simulated === true

export const inferenceVisualCanRender = (
  evidence: InferenceVisualEvidence,
  mode: InferenceVisualEvidenceMode = "optional",
): boolean => mode === "optional" || inferenceVisualHasEvidence(evidence)

const arcBasis = (
  from: Three.Vector3,
  to: Three.Vector3,
): Readonly<{ normal: Three.Vector3; binormal: Three.Vector3 }> => {
  const direction = to.clone().sub(from)
  if (direction.lengthSq() < 0.000001) direction.set(1, 0, 0)
  direction.normalize()
  const up = Math.abs(direction.dot(new Three.Vector3(0, 1, 0))) > 0.92
    ? new Three.Vector3(1, 0, 0)
    : new Three.Vector3(0, 1, 0)
  const normal = new Three.Vector3().crossVectors(direction, up).normalize()
  const binormal = new Three.Vector3().crossVectors(direction, normal).normalize()
  return { normal, binormal }
}

const arcBasePoint = (
  from: Three.Vector3,
  to: Three.Vector3,
  bend: number,
  t: number,
): Three.Vector3 => {
  const mid = from.clone().lerp(to, 0.5).add(new Three.Vector3(0, bend, 0))
  return new Three.QuadraticBezierCurve3(from, mid, to).getPoint(t)
}

export const createCracklingArc = (
  options: CracklingArcOptions,
): CracklingArcHandle => {
  const group = new Three.Group()
  group.userData.openagentsPrimitive = "crackling_arc"

  let from = toVector3(options.from)
  let to = toVector3(options.to)
  let elapsed = 0

  const strandCount = Math.max(1, Math.floor(options.strandCount ?? 4))
  const segments = Math.max(2, Math.floor(options.segments ?? 18))
  const bend = options.bend ?? 0.22
  const jitter = finitePositive(options.jitter ?? 0.11, 0.11)
  const rate = options.rate ?? 2.4
  const opacity = clamp01(options.opacity ?? 0.72)
  const color = options.color ?? 0x93c5fd
  const secondaryColor = options.secondaryColor ?? 0xf8fafc
  const random = seededRandom(options.seed ?? 1)
  const scratch = new Three.Vector3()

  type Strand = Readonly<{
    geometry: Three.BufferGeometry
    material: Three.LineBasicMaterial
    noise: readonly number[]
    phase: number
  }>

  const strands: Strand[] = []

  const writeStrand = (strand: Strand, index: number): void => {
    const { normal, binormal } = arcBasis(from, to)
    const attribute = strand.geometry.getAttribute("position") as Three.BufferAttribute
    const array = attribute.array as Float32Array

    for (let step = 0; step <= segments; step += 1) {
      const t = step / segments
      const envelope = Math.sin(Math.PI * t)
      const wobble = Math.sin((t * 7.3 + elapsed * rate + strand.phase) * Math.PI)
      const cross = Math.cos((t * 5.1 + elapsed * rate * 0.7 + strand.phase) * Math.PI)
      const noise = strand.noise[step] ?? 0.5
      const amplitude = jitter * envelope * (0.3 + noise * 0.7)
      const point = arcBasePoint(from, to, bend, t)
      scratch
        .copy(normal)
        .multiplyScalar(wobble * amplitude)
        .add(binormal.clone().multiplyScalar(cross * amplitude * 0.55))
      point.add(scratch)
      array[step * 3] = point.x
      array[step * 3 + 1] = point.y
      array[step * 3 + 2] = point.z
    }

    attribute.needsUpdate = true
    strand.material.opacity = opacity * (0.68 + 0.32 * Math.sin(elapsed * rate + index))
  }

  for (let index = 0; index < strandCount; index += 1) {
    const geometry = new Three.BufferGeometry()
    geometry.setAttribute(
      "position",
      new Three.BufferAttribute(new Float32Array((segments + 1) * 3), 3),
    )
    const material = new Three.LineBasicMaterial({
      color: index % 2 === 0 ? color : secondaryColor,
      transparent: true,
      opacity,
      depthWrite: false,
    })
    const line = new Three.Line(geometry, material)
    const strand: Strand = {
      geometry,
      material,
      noise: Array.from({ length: segments + 1 }, () => random()),
      phase: random() * Math.PI * 2,
    }
    strands.push(strand)
    group.add(line)
    writeStrand(strand, index)
  }

  const update = (deltaSeconds: number): void => {
    elapsed += Math.max(0, deltaSeconds)
    strands.forEach(writeStrand)
  }

  const setEndpoints = (nextFrom: Vector3Like, nextTo: Vector3Like): void => {
    from = toVector3(nextFrom)
    to = toVector3(nextTo)
    strands.forEach(writeStrand)
  }

  const dispose = (): void => {
    for (const strand of strands) {
      strand.geometry.dispose()
      strand.material.dispose()
    }
    group.removeFromParent()
  }

  return { object3D: group, update, setEndpoints, dispose }
}

const laneColor = (lane: InferenceGatewayLane): number => {
  switch (lane) {
    case "vertex":
      return 0x8ef6c7
    case "fireworks":
      return 0xffb86b
    case "openrouter":
      return 0x93c5fd
    case "passthrough":
      return 0xe5e7eb
    default:
      return 0xd8b4fe
  }
}

const statusAccent = (
  status: InferenceGatewayStatus,
): Readonly<{ color: number; opacity: number; speed: number }> => {
  switch (status) {
    case "working":
      return { color: 0xfacc15, opacity: 0.92, speed: 1.2 }
    case "online":
      return { color: 0x86efac, opacity: 0.76, speed: 0.72 }
    case "offline":
      return { color: 0xa3a3a3, opacity: 0.3, speed: 0.24 }
    case "blocked":
      return { color: 0xfb7185, opacity: 0.58, speed: 0.18 }
    default:
      return { color: 0xcbd5e1, opacity: 0.48, speed: 0.36 }
  }
}

export const createGatewayPortal = (
  options: GatewayPortalOptions,
): GatewayPortalHandle => {
  const group = new Three.Group()
  group.position.copy(toVector3(options.position))
  group.userData.openagentsPrimitive = "gateway_portal"
  group.userData.gatewayLane = options.lane ?? "passthrough"
  group.userData.gatewayStatus = options.status ?? "unknown"

  const radius = finitePositive(options.radius ?? 0.42, 0.42)
  const ringCount = Math.max(1, Math.floor(options.ringCount ?? 3))
  const sparkCount = Math.max(0, Math.floor(options.sparkCount ?? 28))
  const lane = options.lane ?? "passthrough"
  let status = options.status ?? "unknown"
  let tone = statusAccent(status)
  let elapsed = 0

  const baseColor = options.color ?? laneColor(lane)
  const accentColor = options.accentColor ?? tone.color
  const materials: Three.Material[] = []
  const ringMaterials: Three.MeshBasicMaterial[] = []
  const rings: Three.Mesh[] = []

  const coreMaterial = new Three.MeshBasicMaterial({
    color: baseColor,
    transparent: true,
    opacity: tone.opacity * 0.18,
    depthWrite: false,
    side: Three.DoubleSide,
  })
  materials.push(coreMaterial)
  const core = new Three.Mesh(new Three.CircleGeometry(radius * 0.7, 48), coreMaterial)
  group.add(core)

  for (let index = 0; index < ringCount; index += 1) {
    const geometry = new Three.TorusGeometry(
      radius * (1 + index * 0.16),
      radius * 0.018,
      8,
      64,
    )
    const material = new Three.MeshBasicMaterial({
      color: index === 0 ? baseColor : accentColor,
      transparent: true,
      opacity: tone.opacity * (0.95 - index * 0.18),
      depthWrite: false,
    })
    const ring = new Three.Mesh(geometry, material)
    ring.rotation.set(index * 0.62, index * 0.43, index * 0.27)
    ring.userData.spin = (index % 2 === 0 ? 1 : -1) * (0.65 + index * 0.17)
    ringMaterials.push(material)
    materials.push(material)
    rings.push(ring)
    group.add(ring)
  }

  const random = seededRandom(options.seed ?? 1)
  const sparkGeometry = new Three.BufferGeometry()
  const sparkPositions = new Float32Array(sparkCount * 3)
  for (let index = 0; index < sparkCount; index += 1) {
    const angle = random() * Math.PI * 2
    const distance = radius * (0.58 + random() * 0.72)
    const lift = (random() - 0.5) * radius * 0.28
    sparkPositions[index * 3] = Math.cos(angle) * distance
    sparkPositions[index * 3 + 1] = Math.sin(angle) * distance
    sparkPositions[index * 3 + 2] = lift
  }
  sparkGeometry.setAttribute("position", new Three.BufferAttribute(sparkPositions, 3))
  const sparkMaterial = new Three.PointsMaterial({
    color: accentColor,
    size: radius * 0.055,
    transparent: true,
    opacity: tone.opacity,
    depthWrite: false,
    sizeAttenuation: true,
  })
  materials.push(sparkMaterial)
  const sparks = new Three.Points(sparkGeometry, sparkMaterial)
  group.add(sparks)

  const applyStatus = (): void => {
    group.userData.gatewayStatus = status
    tone = statusAccent(status)
    coreMaterial.opacity = tone.opacity * 0.18
    ringMaterials.forEach((material, index) => {
      material.color.set(index === 0 ? baseColor : tone.color)
      material.opacity = Math.max(0.08, tone.opacity * (0.95 - index * 0.18))
    })
    sparkMaterial.color.set(tone.color)
    sparkMaterial.opacity = tone.opacity
  }

  const update = (deltaSeconds: number): void => {
    elapsed += Math.max(0, deltaSeconds)
    for (const ring of rings) {
      const spin = ring.userData.spin as number
      ring.rotation.z += deltaSeconds * tone.speed * spin
      ring.rotation.x += deltaSeconds * tone.speed * spin * 0.23
    }
    sparks.rotation.z = elapsed * tone.speed * 0.4
    core.scale.setScalar(1 + Math.sin(elapsed * tone.speed * Math.PI) * 0.025)
  }

  const setPosition = (position: Vector3Like): void => {
    group.position.copy(toVector3(position))
  }

  const setStatus = (nextStatus: InferenceGatewayStatus): void => {
    status = nextStatus
    applyStatus()
  }

  const dispose = (): void => {
    core.geometry.dispose()
    for (const ring of rings) ring.geometry.dispose()
    sparkGeometry.dispose()
    for (const material of materials) material.dispose()
    group.removeFromParent()
  }

  applyStatus()

  return { object3D: group, update, setPosition, setStatus, dispose }
}

export const createEvidenceBackedCracklingArc = (
  options: EvidenceBackedCracklingArcOptions,
): EvidenceBackedCracklingArcResult => {
  const evidence = inferenceVisualEvidenceFromOptions(options)
  if (!inferenceVisualCanRender(evidence, options.evidenceMode ?? "optional")) {
    return { rendered: false, reason: "missing_evidence", evidence }
  }
  return { rendered: true, handle: createCracklingArc(options), evidence }
}

export const createEvidenceBackedGatewayPortal = (
  options: EvidenceBackedGatewayPortalOptions,
): EvidenceBackedGatewayPortalResult => {
  const evidence = inferenceVisualEvidenceFromOptions(options)
  if (!inferenceVisualCanRender(evidence, options.evidenceMode ?? "optional")) {
    return { rendered: false, reason: "missing_evidence", evidence }
  }
  return { rendered: true, handle: createGatewayPortal(options), evidence }
}
