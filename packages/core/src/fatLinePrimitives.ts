import * as Three from "three"
import { Line2 } from "three/examples/jsm/lines/Line2.js"
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js"
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js"

import { type Vector3Like, toVector3 } from "./cameraPrimitives"

/**
 * Screen-space-width "fat" glowing lines (A3, threejs-bloom / procedural-vfx).
 *
 * Plain `THREE.LineBasicMaterial` draws 1px GPU lines that are thin and faint in
 * the dark `0x050505` Verse. This primitive replaces a connection with a pair of
 * `Line2`/`LineMaterial` screen-space lines: a bright, narrow HDR CORE plus a
 * wider, soft, low-opacity additive ENVELOPE. Together they read as energy with
 * a bright-core / soft-halo profile — a glowing connection that the bloom pass
 * picks up (the core is `toneMapped = false` and `color * emissiveStrength`),
 * instead of a hairline scratch.
 *
 * `LineMaterial` needs the drawing-buffer resolution to compute screen-space
 * width, so the handle exposes `setResolution(width, height)` for the host
 * resize path.
 *
 * The handle matches the sibling Verse primitives' Effect-friendly contract:
 * `{ object3D, setResolution, dispose }` (+ `setColor`/`setOpacity` knobs for
 * status-driven brightness).
 */

export const openAgentsFatLinePrimitiveSourceRefs = [
  "projects/repos/Threejs-Awesome-Graphics-Agent-Skills/skills/threejs-procedural-vfx/examples/reentry-plasma/reentry-plasma.js#filament-core-plus-envelope",
  "openagents/docs/game/2026-06-22-threejs-graphics-skills-audit.md#A3",
  "three/examples/jsm/lines/Line2.js",
] as const

export type GlowLineOptions = Readonly<{
  /** Ordered points the line passes through (world space). */
  points: readonly Vector3Like[]
  /** Bright HDR core color. */
  color?: Three.ColorRepresentation
  /** Soft envelope color (defaults to the core color). */
  envelopeColor?: Three.ColorRepresentation
  /** Screen-space width of the bright core, in pixels (before DPR). */
  coreWidth?: number
  /** Screen-space width of the soft glow envelope, in pixels (before DPR). */
  envelopeWidth?: number
  /** Core opacity. */
  opacity?: number
  /** Envelope opacity (kept low so it reads as a soft halo, not a slab). */
  envelopeOpacity?: number
  /**
   * HDR multiplier on the core color so it exceeds the display range and feeds a
   * bloom pass thresholded near 1.0. 1 (default) keeps a non-HDR core. The
   * envelope stays tone-mapped (a soft, in-range halo) so it does not over-bloom.
   */
  emissiveStrength?: number
  /** Convenience alias for `emissiveStrength`. */
  hdrBoost?: number
  /** Initial drawing-buffer resolution for screen-space width. */
  resolution?: readonly [number, number]
  depthTest?: boolean
  depthWrite?: boolean
}>

export type GlowLineHandle = Readonly<{
  object3D: Three.Group
  /** The bright core line (separated so callers can re-color it on status). */
  core: Line2
  /** The soft additive envelope line. */
  envelope: Line2
  /** Update screen-space width resolution; call from the host resize handler. */
  setResolution: (width: number, height: number) => void
  /** Re-color the core (and envelope) — used for status-driven brightness. */
  setColor: (color: Three.ColorRepresentation) => void
  /** Adjust the core opacity (status-driven fade). */
  setOpacity: (opacity: number) => void
  /** Replace the line path without rebuilding materials. */
  setPoints: (points: readonly Vector3Like[]) => void
  dispose: () => void
}>

const finitePositive = (value: number | undefined, fallback: number): number =>
  value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback

const flatPositions = (points: readonly Vector3Like[]): number[] => {
  const out: number[] = []
  for (const point of points) {
    const vector = toVector3(point)
    out.push(vector.x, vector.y, vector.z)
  }
  // `LineGeometry.setPositions` requires at least two points; degenerate input
  // collapses to a zero-length segment rather than throwing.
  if (out.length < 6) {
    const x = out[0] ?? 0
    const y = out[1] ?? 0
    const z = out[2] ?? 0
    return [x, y, z, x, y, z]
  }
  return out
}

/**
 * Create a fat, glowing connection line (bright HDR core + soft additive
 * envelope). Pure construction; advance nothing per frame (the bloom pass does
 * the glow). The host owns `setResolution` on resize.
 */
export const createGlowLine = (options: GlowLineOptions): GlowLineHandle => {
  const group = new Three.Group()
  group.userData.openagentsPrimitive = "glow_line"

  const color = options.color ?? 0xb9e6ff
  const envelopeColor = options.envelopeColor ?? color
  const coreWidth = finitePositive(options.coreWidth, 2.4)
  const envelopeWidth = finitePositive(options.envelopeWidth, 7.5)
  const opacity = options.opacity ?? 0.95
  const envelopeOpacity = options.envelopeOpacity ?? 0.22
  const emissiveStrength = finitePositive(
    options.hdrBoost ?? options.emissiveStrength ?? 1,
    1,
  )
  const hdr = emissiveStrength > 1
  const resolution = options.resolution ?? [1, 1]

  const positions = flatPositions(options.points)

  const makeLine = (
    width: number,
    lineColor: Three.Color,
    lineOpacity: number,
    additive: boolean,
    toneMapped: boolean,
  ): Line2 => {
    const geometry = new LineGeometry()
    geometry.setPositions(positions)
    const material = new LineMaterial({
      color: 0xffffff,
      linewidth: width,
      worldUnits: false,
      transparent: true,
      opacity: lineOpacity,
      depthTest: options.depthTest ?? true,
      depthWrite: options.depthWrite ?? false,
      alphaToCoverage: false,
    })
    // Drive color through the material's color (so HDR scaling > 1 survives) and
    // keep it out of tone mapping when it carries HDR signal for bloom.
    material.color.copy(lineColor)
    material.toneMapped = toneMapped
    if (additive) material.blending = Three.AdditiveBlending
    material.resolution.set(resolution[0], resolution[1])
    const line = new Line2(geometry, material)
    line.computeLineDistances()
    return line
  }

  const coreColor = new Three.Color(color).multiplyScalar(
    hdr ? emissiveStrength : 1,
  )
  const envColor = new Three.Color(envelopeColor)

  // Envelope first (drawn under), then the bright core on top.
  const envelope = makeLine(
    envelopeWidth,
    envColor,
    envelopeOpacity,
    true,
    true,
  )
  const core = makeLine(coreWidth, coreColor, opacity, hdr, !hdr)
  group.add(envelope)
  group.add(core)

  const setResolution = (width: number, height: number): void => {
    ;(core.material as LineMaterial).resolution.set(width, height)
    ;(envelope.material as LineMaterial).resolution.set(width, height)
  }

  const setColor = (next: Three.ColorRepresentation): void => {
    ;(core.material as LineMaterial).color
      .set(next)
      .multiplyScalar(hdr ? emissiveStrength : 1)
    ;(envelope.material as LineMaterial).color.set(next)
  }

  const setOpacity = (next: number): void => {
    ;(core.material as LineMaterial).opacity = next
    ;(envelope.material as LineMaterial).opacity = next * (envelopeOpacity / opacity)
  }

  const setPoints = (points: readonly Vector3Like[]): void => {
    const next = flatPositions(points)
    core.geometry.setPositions(next)
    envelope.geometry.setPositions(next)
    core.computeLineDistances()
    envelope.computeLineDistances()
  }

  const dispose = (): void => {
    core.geometry.dispose()
    envelope.geometry.dispose()
    ;(core.material as LineMaterial).dispose()
    ;(envelope.material as LineMaterial).dispose()
    group.removeFromParent()
  }

  return {
    object3D: group,
    core,
    envelope,
    setResolution,
    setColor,
    setOpacity,
    setPoints,
    dispose,
  }
}
