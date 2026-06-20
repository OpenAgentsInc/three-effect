import * as Three from "three"

import { type Vector3Like, toVector3 } from "./cameraPrimitives"
import { applyBillboard } from "./sceneGraphPrimitives"

export const quickMmorpgResourceBarPrimitiveSourceRefs = [
  "projects/repos/Quick_3D_MMORPG/client/src/health-bar.js",
  "projects/repos/Quick_3D_MMORPG/client/src/ui-controller.js",
] as const

/**
 * A single color threshold: when the bar's normalized value is `>= at`, the
 * fill takes `color`. The threshold with the greatest `at` not exceeding the
 * value wins. Sorted internally, so order does not matter.
 */
export type ResourceBarThreshold = Readonly<{
  at: number
  color: Three.ColorRepresentation
}>

export type ResourceBarKind = "mana" | "health" | "earnings"

export type ResourceBarOptions = Readonly<{
  /** Semantic role; selects sensible default colors/thresholds. */
  kind?: ResourceBarKind
  width?: number
  height?: number
  /** Normalized fill in [0, 1]. */
  value?: number
  backgroundColor?: Three.ColorRepresentation
  borderColor?: Three.ColorRepresentation
  /**
   * Explicit fill color. When omitted, the color is driven by `thresholds`
   * (which themselves default per `kind`).
   */
  fillColor?: Three.ColorRepresentation
  /**
   * Color thresholds for the fill. When omitted, defaults are chosen by `kind`.
   * Ignored when `fillColor` is set.
   */
  thresholds?: readonly ResourceBarThreshold[]
  position?: Vector3Like
  depthTest?: boolean
  /** When true (default), the bar faces the camera when `faceCamera` is run. */
  billboard?: boolean
}>

export type ResourceBarHandle = Readonly<{
  group: Three.Group
  fill: Three.Mesh<Three.PlaneGeometry, Three.MeshBasicMaterial>
  /** Set the normalized [0, 1] value; updates fill width and threshold color. */
  setValue: (value: number) => void
  value: () => number
  /** Current fill color hex (after threshold resolution). */
  color: () => number
  faceCamera: (camera: Three.Camera) => void
  dispose: () => void
}>

const MANA_THRESHOLDS: readonly ResourceBarThreshold[] = [
  { at: 0, color: 0x1f4fff },
  { at: 0.25, color: 0x3a82ff },
  { at: 0.6, color: 0x6fb3ff },
]

const HEALTH_THRESHOLDS: readonly ResourceBarThreshold[] = [
  { at: 0, color: 0xff3b3b },
  { at: 0.35, color: 0xffc24d },
  { at: 0.7, color: 0x4dff88 },
]

const EARNINGS_THRESHOLDS: readonly ResourceBarThreshold[] = [
  { at: 0, color: 0x8a6f2a },
  { at: 0.5, color: 0xe0b84d },
  { at: 0.85, color: 0xfff0a8 },
]

export const resourceBarDefaultThresholds = (
  kind: ResourceBarKind,
): readonly ResourceBarThreshold[] => {
  switch (kind) {
    case "mana":
      return MANA_THRESHOLDS
    case "health":
      return HEALTH_THRESHOLDS
    case "earnings":
      return EARNINGS_THRESHOLDS
  }
}

/**
 * Resolve the fill color for a normalized value against a set of thresholds.
 * The greatest threshold `at <= value` wins; falls back to the lowest threshold
 * when the value sits below all of them. Pure, so it is directly unit-testable.
 */
export const resourceBarColorAt = (
  value: number,
  thresholds: readonly ResourceBarThreshold[],
): number => {
  if (thresholds.length === 0) return 0xffffff
  const clamped = Three.MathUtils.clamp(value, 0, 1)
  const sorted = [...thresholds].sort((a, b) => a.at - b.at)
  let chosen = sorted[0]!
  for (const threshold of sorted) {
    if (clamped >= threshold.at) chosen = threshold
  }
  return new Three.Color(chosen.color).getHex()
}

const makePlane = (
  width: number,
  height: number,
  color: Three.ColorRepresentation,
  depthTest: boolean,
): Three.Mesh<Three.PlaneGeometry, Three.MeshBasicMaterial> =>
  new Three.Mesh(
    new Three.PlaneGeometry(width, height),
    new Three.MeshBasicMaterial({
      color,
      transparent: true,
      depthTest,
      depthWrite: false,
      side: Three.DoubleSide,
    }),
  )

/**
 * A world-anchored, camera-facing resource bar (mana/compute, health, or a
 * Pylon's earnings tier). Driven by a normalized [0, 1] value with
 * threshold-based fill coloring. This is the labeled, threshold-aware sibling of
 * `createBillboardStatusBar`.
 *
 * Harvest ref: Quick_3D_MMORPG `health-bar.js` (the shader-template health bar);
 * here it is a reusable plane-based primitive so it shares the billboard and
 * disposal conventions of the rest of the package.
 */
export const createResourceBar = (
  options: ResourceBarOptions = {},
): ResourceBarHandle => {
  const kind = options.kind ?? "mana"
  const width = Math.max(0.0001, options.width ?? 1.6)
  const height = Math.max(0.0001, options.height ?? 0.14)
  const depthTest = options.depthTest ?? false
  const billboard = options.billboard ?? true
  const thresholds = options.thresholds ?? resourceBarDefaultThresholds(kind)

  let currentValue = Three.MathUtils.clamp(options.value ?? 1, 0, 1)
  let currentColor =
    options.fillColor !== undefined
      ? new Three.Color(options.fillColor).getHex()
      : resourceBarColorAt(currentValue, thresholds)

  const group = new Three.Group()
  const background = makePlane(
    width,
    height,
    options.backgroundColor ?? 0x111111,
    depthTest,
  )
  const fill = makePlane(width, height, currentColor, depthTest)
  const border = new Three.LineSegments(
    new Three.EdgesGeometry(background.geometry),
    new Three.LineBasicMaterial({
      color: options.borderColor ?? 0xffffff,
      depthTest,
      transparent: true,
    }),
  )
  fill.position.z = 0.002
  border.position.z = 0.004
  group.add(background, fill, border)
  if (options.position !== undefined) {
    group.position.copy(toVector3(options.position))
  }

  const applyValue = (value: number): void => {
    currentValue = Three.MathUtils.clamp(value, 0, 1)
    fill.scale.x = currentValue
    fill.position.x = ((currentValue - 1) * width) / 2
    if (options.fillColor === undefined) {
      currentColor = resourceBarColorAt(currentValue, thresholds)
      fill.material.color.setHex(currentColor)
    }
  }
  applyValue(currentValue)

  return {
    group,
    fill,
    setValue: applyValue,
    value: () => currentValue,
    color: () => currentColor,
    faceCamera: camera => {
      if (billboard) applyBillboard(group, camera)
    },
    dispose: () => {
      for (const child of [background, fill]) {
        child.geometry.dispose()
        child.material.dispose()
      }
      border.geometry.dispose()
      ;(border.material as Three.Material).dispose()
      group.removeFromParent()
    },
  }
}
