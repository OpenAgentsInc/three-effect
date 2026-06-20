import * as Three from "three"

import { type Vector3Like, toVector3 } from "./cameraPrimitives"
import {
  createColorSpline,
  createEvidenceBackedEventBurst,
  createNumberSpline,
  type EvidenceBackedEventBurstResult,
  type EventBurstEvidence,
} from "./eventBurstPrimitives"

export const quickMmorpgAgentAvatarPrimitiveSourceRefs = [
  "projects/repos/Quick_3D_MMORPG/client/src/sorceror-effect.js",
  "projects/repos/Quick_3D_MMORPG/client/src/particle-system.js",
  "projects/repos/Quick_3D_MMORPG/client/src/level-up-component.js",
] as const

/**
 * Convert an identity color into a tuned hue. Accepts any Three color
 * representation (hex, css string, Color); returns a `Three.Color`.
 */
export const agentIdentityColor = (
  color: Three.ColorRepresentation,
): Three.Color => new Three.Color(color)

export type AgentAvatarOptions = Readonly<{
  /** Identity color drives the glyph hue and the warp-in tint. */
  color?: Three.ColorRepresentation
  /** Overall world-space radius of the glyph. */
  radius?: number
  position?: Vector3Like
  /** Emissive intensity for the core crystal. */
  emissiveIntensity?: number
  /** When true, the glyph slowly spins on update. */
  spin?: boolean
  spinSpeed?: number
}>

export type AgentAvatarHandle = Readonly<{
  /** The mountable group: core crystal + halo ring. */
  group: Three.Group
  core: Three.Mesh<Three.OctahedronGeometry, Three.MeshStandardMaterial>
  halo: Three.Mesh<Three.RingGeometry, Three.MeshBasicMaterial>
  /** Recolor the avatar in place (e.g. identity change). */
  setColor: (color: Three.ColorRepresentation) => void
  /** Advance idle animation (spin + halo pulse). */
  update: (deltaSeconds: number) => void
  dispose: () => void
}>

/**
 * A stylized agent avatar: a faceted crystal core wrapped in a thin halo ring,
 * tinted by the agent's identity color. This is the distinct agent entity that
 * replaces the flat node/diamond glyph in the graph view.
 */
export const createAgentAvatar = (
  options: AgentAvatarOptions = {},
): AgentAvatarHandle => {
  const color = agentIdentityColor(options.color ?? 0x7fd4ff)
  const radius = Math.max(0.0001, options.radius ?? 0.6)
  const emissiveIntensity = options.emissiveIntensity ?? 0.85
  const spin = options.spin ?? true
  const spinSpeed = options.spinSpeed ?? 0.6

  const group = new Three.Group()

  const core = new Three.Mesh(
    new Three.OctahedronGeometry(radius, 0),
    new Three.MeshStandardMaterial({
      color: color.clone(),
      emissive: color.clone(),
      emissiveIntensity,
      metalness: 0.2,
      roughness: 0.35,
      flatShading: true,
    }),
  )

  const halo = new Three.Mesh(
    new Three.RingGeometry(radius * 1.25, radius * 1.45, 48),
    new Three.MeshBasicMaterial({
      color: color.clone(),
      transparent: true,
      opacity: 0.6,
      side: Three.DoubleSide,
      depthWrite: false,
    }),
  )
  halo.rotation.x = Math.PI / 2

  group.add(core, halo)
  if (options.position !== undefined) {
    group.position.copy(toVector3(options.position))
  }

  let elapsed = 0
  const setColor = (next: Three.ColorRepresentation): void => {
    const c = new Three.Color(next)
    core.material.color.copy(c)
    core.material.emissive.copy(c)
    halo.material.color.copy(c)
  }

  return {
    group,
    core,
    halo,
    setColor,
    update: deltaSeconds => {
      const safe = Math.max(0, deltaSeconds)
      elapsed += safe
      if (spin) core.rotation.y += spinSpeed * safe
      // Subtle halo breathing.
      const pulse = 0.55 + 0.15 * Math.sin(elapsed * 2.2)
      halo.material.opacity = pulse
    },
    dispose: () => {
      core.geometry.dispose()
      core.material.dispose()
      halo.geometry.dispose()
      halo.material.dispose()
      group.removeFromParent()
    },
  }
}

export type AgentWarpInOptions = Readonly<{
  at: Vector3Like
  /** Identity color tints the warp-in particles. */
  color?: Three.ColorRepresentation
  durationMs?: number
  count?: number
  /** How far particles converge from (Protoss warp converges inward). */
  spread?: number
  seed?: number
}> &
  EventBurstEvidence &
  Readonly<{ evidenceMode?: "optional" | "required" }>

/**
 * A Protoss-style warp-in spawn effect, built on the evidence-backed event
 * burst. The default spline drives particles from a bright, wide flash inward
 * toward the spawn point as they fade — the "warp-in" beat (Act II of agent
 * onboarding). Identity color tints the burst.
 *
 * Returns the same `EvidenceBackedEventBurstResult` shape as the underlying
 * burst, so callers can gate the cinematic on evidence when desired.
 */
export const createAgentWarpInEffect = (
  options: AgentWarpInOptions,
): EvidenceBackedEventBurstResult => {
  const color = agentIdentityColor(options.color ?? 0x7fd4ff)
  const flash = color.clone().lerp(new Three.Color(0xffffff), 0.7)

  return createEvidenceBackedEventBurst({
    at: options.at,
    count: options.count ?? 96,
    durationMs: options.durationMs ?? 700,
    spread: options.spread ?? 1.4,
    drag: 0.05,
    seed: options.seed ?? 7,
    // Bright flash collapsing into the identity hue.
    color: createColorSpline([
      [0, flash],
      [0.4, color],
      [1, color.clone().multiplyScalar(0.6)],
    ]),
    // Burst bright, hold, then snap out — the warp-in flash envelope.
    alpha: createNumberSpline([
      [0, 0],
      [0.12, 1],
      [0.7, 0.85],
      [1, 0],
    ]),
    // Particles start large and pinch to a point as the agent materializes.
    size: createNumberSpline([
      [0, 0.16],
      [0.5, 0.09],
      [1, 0.01],
    ]),
    ...(options.motionId === undefined ? {} : { motionId: options.motionId }),
    ...(options.motionKind === undefined
      ? { motionKind: "agent_warp_in" }
      : { motionKind: options.motionKind }),
    ...(options.sourceRefs === undefined
      ? {}
      : { sourceRefs: options.sourceRefs }),
    ...(options.generatedAt === undefined
      ? {}
      : { generatedAt: options.generatedAt }),
    ...(options.expiresAt === undefined ? {} : { expiresAt: options.expiresAt }),
    ...(options.simulated === undefined ? {} : { simulated: options.simulated }),
    ...(options.evidenceMode === undefined
      ? {}
      : { evidenceMode: options.evidenceMode }),
  })
}
