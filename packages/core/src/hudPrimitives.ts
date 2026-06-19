import * as Three from "three"

import { createTextLabel, type TextLabelHandle } from "./textLabelPrimitives"

/**
 * Arwes-style sci-fi HUD primitive kit, ported to Three.js.
 *
 * This module ports the *visual language and component taxonomy* of the Arwes
 * React/DOM/SVG library (`projects/repos/arwes`) and the archived OpenAgents
 * WGPUI `hud` crate (System 4 in
 * `openagents/docs/launch/2026-06-19-previous-hud-systems-audit.md`) into the
 * React-free `@openagentsinc/three-effect` Three.js runtime.
 *
 * Concrete Arwes patterns pulled in:
 * - `FrameCorners` — eight corner-bracket line segments sized by `cornerLength`
 *   + `strokeWidth`, with a "draw" reveal that traces the stroke
 *   (`packages/frames/src/createFrameCornersSettings`,
 *   `packages/animated/src/animateDraw`).
 * - `FrameLines` — large top/bottom edge lines plus small corner tick marks
 *   (`createFrameLinesSettings`).
 * - `FrameUnderline` — a bottom bar with a clipped octagon notch
 *   (`createFrameUnderlineSettings`).
 * - The Animator state machine `entered/entering/exiting/exited` with
 *   parallel / stagger / sequence managers (`packages/animator`), ported as a
 *   small, dependency-free, time-stepped `createHudAnimator` (no `motion`).
 * - `Illuminator` — a radial-gradient glow that follows the pointer
 *   (`packages/effects/src/createEffectIlluminator`), ported as a planar
 *   additive sprite-glow.
 * - HSL status-color series (`packages/theme/src/createThemeColor`), ported as
 *   the `HUD_STATUS_COLORS` palette.
 * - WGPUI HUD taxonomy: `StatusLight` (LED), `Meter` (threshold gauge),
 *   `DotGridBackground` / `GridLinesBackground` / `MovingLinesBackground`,
 *   scanline surfaces, and a `Separator` rule.
 *
 * Intentionally left out (and why):
 * - SVG path strings + CSS `var(--arwes-*)` theming — Three.js draws with
 *   line/plane geometry and materials, so the SVG `M/L/H` path grammar and the
 *   DOM custom-property theme system do not carry over. The geometry is
 *   recomputed directly from layout math instead.
 * - The `motion` animation engine and DOM `getTotalLength()` stroke-dash draw —
 *   replaced by a pure progress model so animation is deterministic and
 *   testable without a browser.
 * - Arwes `bleeps` (audio) and the React/Solid component layer — out of scope
 *   for a Three.js primitive kit; H4 composes these primitives instead.
 * - Interactive/form widgets (`HudButton`, `TextInput`, `Select`, `Tabs`,
 *   `Modal`, …) from the WGPUI crate — those are shell concerns for H4, not
 *   render primitives.
 */
export const arwesHudPrimitiveSourceRefs = [
  "projects/repos/arwes/packages/frames/src/createFrameCornersSettings",
  "projects/repos/arwes/packages/frames/src/createFrameLinesSettings",
  "projects/repos/arwes/packages/frames/src/createFrameUnderlineSettings",
  "projects/repos/arwes/packages/animator/src/constants.ts",
  "projects/repos/arwes/packages/animated/src/animateDraw",
  "projects/repos/arwes/packages/effects/src/createEffectIlluminator",
  "projects/repos/arwes/packages/theme/src/createThemeColor",
  "openagents/docs/launch/2026-06-19-previous-hud-systems-audit.md",
] as const

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

/**
 * Sci-fi HUD status palette. White-on-black base with a cyan primary, mirroring
 * the Arwes/WGPUI aesthetic. Values are hex numbers for direct use with
 * `Three.Color`.
 */
export const HUD_STATUS_COLORS = {
  primary: 0x00f0ff,
  secondary: 0x7dd3fc,
  success: 0x2bd576,
  info: 0x4ca3ff,
  warning: 0xf5c542,
  error: 0xff4d4d,
  neutral: 0x9aa6b2,
  line: 0xe6e9ef,
  background: 0x0b0d12,
} as const

export type HudStatus = keyof typeof HUD_STATUS_COLORS

export const hudStatusColor = (status: HudStatus): number =>
  HUD_STATUS_COLORS[status]

// ---------------------------------------------------------------------------
// Animator (pure, dependency-free port of the Arwes Animator state machine)
// ---------------------------------------------------------------------------

export type HudAnimatorState =
  | "exited"
  | "entering"
  | "entered"
  | "exiting"

export type HudAnimatorManager =
  | "parallel"
  | "stagger"
  | "sequence"

export type HudAnimatorDuration = Readonly<{
  /** Enter duration of a single node, in seconds. */
  enter: number
  /** Exit duration of a single node, in seconds. */
  exit: number
  /** Delay before the whole timeline starts, in seconds. */
  delay: number
  /** Per-child stagger offset, in seconds. */
  stagger: number
}>

export const HUD_ANIMATOR_DEFAULT_DURATION: HudAnimatorDuration = {
  enter: 0.4,
  exit: 0.4,
  delay: 0,
  stagger: 0.04,
}

export type HudAnimatorOptions = Readonly<{
  childCount?: number
  manager?: HudAnimatorManager
  duration?: Partial<HudAnimatorDuration>
}>

export type ResolvedHudAnimatorOptions = Readonly<{
  childCount: number
  manager: HudAnimatorManager
  duration: HudAnimatorDuration
}>

export const resolveHudAnimatorOptions = (
  options: HudAnimatorOptions = {},
): ResolvedHudAnimatorOptions => ({
  childCount: Math.max(1, Math.floor(options.childCount ?? 1)),
  manager: options.manager ?? "parallel",
  duration: { ...HUD_ANIMATOR_DEFAULT_DURATION, ...(options.duration ?? {}) },
})

/** smootherstep easing, a dependency-free stand-in for Arwes `outExpo`/`outSine`. */
export const hudEaseInOut = (t: number): number => {
  const x = Math.min(1, Math.max(0, t))
  return x * x * x * (x * (x * 6 - 15) + 10)
}

/**
 * Total wall-clock duration (seconds) for a manager to fully enter/exit all
 * children. `parallel` overlaps; `stagger`/`sequence` offset each child.
 */
export const hudAnimatorTotalDuration = (
  resolved: ResolvedHudAnimatorOptions,
  action: "enter" | "exit",
): number => {
  const base = resolved.duration[action]
  if (resolved.manager === "parallel" || resolved.childCount <= 1) {
    return resolved.duration.delay + base
  }
  const step =
    resolved.manager === "sequence" ? base : resolved.duration.stagger
  return resolved.duration.delay + step * (resolved.childCount - 1) + base
}

/**
 * Eased progress (0..1) of a single child at a given elapsed time, honoring the
 * manager's per-child offset. This is the deterministic replacement for Arwes'
 * `animateDraw` + `motion` timeline.
 */
export const hudChildProgress = (
  resolved: ResolvedHudAnimatorOptions,
  childIndex: number,
  elapsedSeconds: number,
  action: "enter" | "exit",
): number => {
  const base = resolved.duration[action]
  const step =
    resolved.manager === "parallel"
      ? 0
      : resolved.manager === "sequence"
        ? base
        : resolved.duration.stagger
  const start = resolved.duration.delay + step * childIndex
  const raw = (elapsedSeconds - start) / Math.max(1e-6, base)
  return hudEaseInOut(raw)
}

export type HudAnimatorHandle = Readonly<{
  state: () => HudAnimatorState
  /** Begin entering from `exited`/`exiting`. */
  enter: () => void
  /** Begin exiting from `entered`/`entering`. */
  exit: () => void
  /**
   * Advance by `deltaSeconds`. Returns the eased per-child progress array
   * (0 = hidden, 1 = shown) and updates the lifecycle state when complete.
   */
  update: (deltaSeconds: number) => readonly number[]
  /** Per-child progress without advancing time. */
  progress: () => readonly number[]
}>

/**
 * A small lifecycle animator that mirrors the Arwes Animator: it tracks an
 * `entered/entering/exiting/exited` state and produces a per-child progress
 * array driven by a `parallel | stagger | sequence` manager. Pure aside from
 * its own internal counter — no DOM, no `motion`, fully unit-testable.
 */
export const createHudAnimator = (
  options: HudAnimatorOptions = {},
): HudAnimatorHandle => {
  const resolved = resolveHudAnimatorOptions(options)
  let state: HudAnimatorState = "exited"
  let elapsed = 0

  const computeProgress = (): number[] => {
    const action = state === "exiting" ? "exit" : "enter"
    const shown = state === "entered"
    const hidden = state === "exited"
    return Array.from({ length: resolved.childCount }, (_, index) => {
      if (shown) return 1
      if (hidden) return 0
      const p = hudChildProgress(resolved, index, elapsed, action)
      return action === "exit" ? 1 - p : p
    })
  }

  return {
    state: () => state,
    enter: () => {
      if (state === "entered" || state === "entering") return
      state = "entering"
      elapsed = 0
    },
    exit: () => {
      if (state === "exited" || state === "exiting") return
      state = "exiting"
      elapsed = 0
    },
    update: (deltaSeconds: number) => {
      if (state === "entering" || state === "exiting") {
        elapsed += Math.max(0, deltaSeconds)
        const action = state === "exiting" ? "exit" : "enter"
        if (elapsed >= hudAnimatorTotalDuration(resolved, action)) {
          state = state === "exiting" ? "exited" : "entered"
        }
      }
      return computeProgress()
    },
    progress: computeProgress,
  }
}

// ---------------------------------------------------------------------------
// Layout helpers (pure)
// ---------------------------------------------------------------------------

export type HudRect = Readonly<{ width: number; height: number }>

/**
 * Corner-bracket polylines for a `width`x`height` rect centered on the origin,
 * in XY plane coordinates. Mirrors Arwes `FrameCorners`: each of the four
 * corners gets two `cornerLength` segments. Returned as point arrays so callers
 * can build `Three.BufferGeometry` or measure them in tests.
 */
export const hudCornerBracketPoints = (
  rect: HudRect,
  cornerLength: number,
): ReadonlyArray<readonly [Three.Vector2, Three.Vector2]> => {
  const hw = rect.width / 2
  const hh = rect.height / 2
  const cl = Math.min(cornerLength, hw, hh)
  const v = (x: number, y: number) => new Three.Vector2(x, y)
  return [
    // top-left
    [v(-hw, hh), v(-hw + cl, hh)],
    [v(-hw, hh), v(-hw, hh - cl)],
    // top-right
    [v(hw, hh), v(hw - cl, hh)],
    [v(hw, hh), v(hw, hh - cl)],
    // bottom-right
    [v(hw, -hh), v(hw - cl, -hh)],
    [v(hw, -hh), v(hw, -hh + cl)],
    // bottom-left
    [v(-hw, -hh), v(-hw + cl, -hh)],
    [v(-hw, -hh), v(-hw, -hh + cl)],
  ]
}

/**
 * Arwes `FrameLines` geometry: full top + bottom edge lines plus short corner
 * tick marks of length `tickLength`. Returned as point pairs in XY.
 */
export const hudFrameLinePoints = (
  rect: HudRect,
  tickLength: number,
): ReadonlyArray<readonly [Three.Vector2, Three.Vector2]> => {
  const hw = rect.width / 2
  const hh = rect.height / 2
  const t = Math.min(tickLength, hh)
  const v = (x: number, y: number) => new Three.Vector2(x, y)
  return [
    // long top + bottom edges
    [v(-hw, hh), v(hw, hh)],
    [v(-hw, -hh), v(hw, -hh)],
    // corner ticks down from each top corner, up from each bottom corner
    [v(-hw, hh), v(-hw, hh - t)],
    [v(hw, hh), v(hw, hh - t)],
    [v(-hw, -hh), v(-hw, -hh + t)],
    [v(hw, -hh), v(hw, -hh + t)],
  ]
}

/**
 * Arwes `FrameUnderline` outline: a rect with the bottom-right corner cut into
 * an octagon notch of size `notch`. Returned as a closed point loop in XY.
 */
export const hudUnderlineOutlinePoints = (
  rect: HudRect,
  notch: number,
): ReadonlyArray<Three.Vector2> => {
  const hw = rect.width / 2
  const hh = rect.height / 2
  const n = Math.min(notch, rect.width, rect.height)
  return [
    new Three.Vector2(-hw, hh),
    new Three.Vector2(-hw, -hh),
    new Three.Vector2(hw - n, -hh),
    new Three.Vector2(hw, -hh + n),
    new Three.Vector2(hw, hh),
    new Three.Vector2(-hw, hh),
  ]
}

/** Clamp a 0..1 value, used by meters/gauges. */
export const hudClamp01 = (value: number): number =>
  Math.min(1, Math.max(0, value))

/**
 * Map a value within `[min, max]` to a status color using ascending thresholds.
 * Each threshold is `{ at: 0..1, status }`; the highest threshold whose `at`
 * the normalized value has reached wins. Mirrors WGPUI `Meter` threshold
 * coloring.
 */
export type HudMeterThreshold = Readonly<{ at: number; status: HudStatus }>

export const hudMeterStatusAt = (
  normalized: number,
  thresholds: ReadonlyArray<HudMeterThreshold>,
): HudStatus => {
  const v = hudClamp01(normalized)
  let status: HudStatus = "neutral"
  for (const threshold of [...thresholds].sort((a, b) => a.at - b.at)) {
    if (v >= threshold.at) status = threshold.status
  }
  return status
}

export const HUD_METER_DEFAULT_THRESHOLDS: ReadonlyArray<HudMeterThreshold> = [
  { at: 0, status: "success" },
  { at: 0.7, status: "warning" },
  { at: 0.9, status: "error" },
]

// ---------------------------------------------------------------------------
// Frame primitives
// ---------------------------------------------------------------------------

export type HudFrameOptions = Readonly<{
  width?: number
  height?: number
  color?: Three.ColorRepresentation
  /** Bracket/tick length in world units. */
  cornerLength?: number
  lineWidth?: number
  opacity?: number
  /** Add a faint filled background quad behind the frame. */
  background?: boolean
  backgroundColor?: Three.ColorRepresentation
  backgroundOpacity?: number
  z?: number
}>

type ResolvedHudFrameOptions = Required<HudFrameOptions>

export const defaultHudFrameOptions: ResolvedHudFrameOptions = {
  width: 2,
  height: 1.2,
  color: HUD_STATUS_COLORS.primary,
  cornerLength: 0.28,
  lineWidth: 1,
  opacity: 1,
  background: true,
  backgroundColor: HUD_STATUS_COLORS.background,
  backgroundOpacity: 0.35,
  z: 0,
}

export type HudFrameHandle = Readonly<{
  group: Three.Group
  /** Lines whose draw reveal can be driven by an animator progress array. */
  lines: ReadonlyArray<Three.Line<Three.BufferGeometry, Three.LineBasicMaterial>>
  /** Reveal/hide the frame by trimming each line to a 0..1 progress. */
  setProgress: (progress: ReadonlyArray<number> | number) => void
  setColor: (color: Three.ColorRepresentation) => void
  dispose: () => void
}>

const resolveFrameOptions = (
  options: HudFrameOptions,
): ResolvedHudFrameOptions => ({ ...defaultHudFrameOptions, ...options })

const buildFrame = (
  options: HudFrameOptions,
  segments: ReadonlyArray<readonly [Three.Vector2, Three.Vector2]>,
): HudFrameHandle => {
  const resolved = resolveFrameOptions(options)
  const group = new Three.Group()
  const disposables: Array<{ dispose: () => void }> = []

  if (resolved.background) {
    const bgGeometry = new Three.PlaneGeometry(resolved.width, resolved.height)
    const bgMaterial = new Three.MeshBasicMaterial({
      color: resolved.backgroundColor,
      transparent: true,
      opacity: resolved.backgroundOpacity,
      depthWrite: false,
    })
    const bg = new Three.Mesh(bgGeometry, bgMaterial)
    bg.position.z = resolved.z - 1e-3
    group.add(bg)
    disposables.push(bgGeometry, bgMaterial)
  }

  // Store full-resolution endpoints so progress can re-trim each segment.
  const endpoints = segments.map(([a, b]) => [a.clone(), b.clone()] as const)
  const lines = endpoints.map(([a, b]) => {
    const geometry = new Three.BufferGeometry().setFromPoints([
      new Three.Vector3(a.x, a.y, resolved.z),
      new Three.Vector3(b.x, b.y, resolved.z),
    ])
    const material = new Three.LineBasicMaterial({
      color: resolved.color,
      transparent: resolved.opacity < 1,
      opacity: resolved.opacity,
      depthWrite: false,
    })
    const line = new Three.Line(geometry, material)
    group.add(line)
    disposables.push(geometry, material)
    return line
  })

  const setProgress = (progress: ReadonlyArray<number> | number): void => {
    lines.forEach((line, index) => {
      const p = hudClamp01(
        typeof progress === "number" ? progress : (progress[index] ?? 1),
      )
      const [a, b] = endpoints[index]
      const tip = a.clone().lerp(b, p)
      line.geometry.setFromPoints([
        new Three.Vector3(a.x, a.y, resolved.z),
        new Three.Vector3(tip.x, tip.y, resolved.z),
      ])
      line.geometry.attributes.position.needsUpdate = true
    })
  }

  const setColor = (color: Three.ColorRepresentation): void => {
    for (const line of lines) line.material.color.set(color)
  }

  const dispose = (): void => {
    for (const d of disposables) d.dispose()
    group.removeFromParent()
  }

  return { group, lines, setProgress, setColor, dispose }
}

/** Arwes `FrameCorners`: eight corner-bracket segments + optional background. */
export const createHudFrameCorners = (
  options: HudFrameOptions = {},
): HudFrameHandle => {
  const resolved = resolveFrameOptions(options)
  return buildFrame(
    options,
    hudCornerBracketPoints(
      { width: resolved.width, height: resolved.height },
      resolved.cornerLength,
    ),
  )
}

/** Arwes `FrameLines`: top/bottom edge lines + corner ticks. */
export const createHudFrameLines = (
  options: HudFrameOptions = {},
): HudFrameHandle => {
  const resolved = resolveFrameOptions(options)
  return buildFrame(
    options,
    hudFrameLinePoints(
      { width: resolved.width, height: resolved.height },
      resolved.cornerLength,
    ),
  )
}

/** Arwes `FrameUnderline`: octagon-notched outline (used for headers/tags). */
export const createHudFrameUnderline = (
  options: HudFrameOptions = {},
): HudFrameHandle => {
  const resolved = resolveFrameOptions(options)
  const loop = hudUnderlineOutlinePoints(
    { width: resolved.width, height: resolved.height },
    resolved.cornerLength,
  )
  const segments: Array<readonly [Three.Vector2, Three.Vector2]> = []
  for (let i = 0; i < loop.length - 1; i += 1) {
    segments.push([loop[i], loop[i + 1]] as const)
  }
  return buildFrame(options, segments)
}

// ---------------------------------------------------------------------------
// Status light (LED) primitive
// ---------------------------------------------------------------------------

export type HudStatusLightOptions = Readonly<{
  status?: HudStatus
  radius?: number
  /** Outer glow halo radius multiplier (1 = no halo). */
  haloScale?: number
  position?: { x?: number; y?: number; z?: number }
  /** When > 0, the light pulses at this many Hz (driven by `update`). */
  pulseHz?: number
}>

export type HudStatusLightHandle = Readonly<{
  group: Three.Group
  setStatus: (status: HudStatus) => void
  /** Advance the pulse; pass total elapsed seconds. */
  update: (elapsedSeconds: number) => void
  dispose: () => void
}>

export const createHudStatusLight = (
  options: HudStatusLightOptions = {},
): HudStatusLightHandle => {
  const status0 = options.status ?? "success"
  const radius = options.radius ?? 0.08
  const haloScale = options.haloScale ?? 2.6
  const pulseHz = options.pulseHz ?? 0
  const z = options.position?.z ?? 0

  const group = new Three.Group()
  group.position.set(
    options.position?.x ?? 0,
    options.position?.y ?? 0,
    z,
  )

  const coreGeometry = new Three.CircleGeometry(radius, 24)
  const coreMaterial = new Three.MeshBasicMaterial({
    color: hudStatusColor(status0),
    transparent: true,
    depthWrite: false,
  })
  const core = new Three.Mesh(coreGeometry, coreMaterial)

  const haloGeometry = new Three.CircleGeometry(radius * haloScale, 32)
  const haloMaterial = new Three.MeshBasicMaterial({
    color: hudStatusColor(status0),
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    blending: Three.AdditiveBlending,
  })
  const halo = new Three.Mesh(haloGeometry, haloMaterial)
  halo.position.z = -1e-3

  group.add(halo)
  group.add(core)

  const setStatus = (status: HudStatus): void => {
    coreMaterial.color.set(hudStatusColor(status))
    haloMaterial.color.set(hudStatusColor(status))
  }

  const update = (elapsedSeconds: number): void => {
    if (pulseHz <= 0) return
    const pulse = 0.5 + 0.5 * Math.sin(elapsedSeconds * pulseHz * Math.PI * 2)
    coreMaterial.opacity = 0.55 + 0.45 * pulse
    haloMaterial.opacity = 0.08 + 0.22 * pulse
  }

  const dispose = (): void => {
    coreGeometry.dispose()
    coreMaterial.dispose()
    haloGeometry.dispose()
    haloMaterial.dispose()
    group.removeFromParent()
  }

  return { group, setStatus, update, dispose }
}

// ---------------------------------------------------------------------------
// Meter / gauge primitive
// ---------------------------------------------------------------------------

export type HudMeterOptions = Readonly<{
  width?: number
  height?: number
  /** 0..1 fill value. */
  value?: number
  thresholds?: ReadonlyArray<HudMeterThreshold>
  trackColor?: Three.ColorRepresentation
  trackOpacity?: number
  /** Override the fill color; when omitted, threshold coloring is used. */
  fillColor?: Three.ColorRepresentation
  z?: number
}>

export type HudMeterHandle = Readonly<{
  group: Three.Group
  /** Set the 0..1 fill; re-colors from thresholds unless a fillColor was set. */
  setValue: (value: number) => void
  value: () => number
  status: () => HudStatus
  dispose: () => void
}>

export const createHudMeter = (
  options: HudMeterOptions = {},
): HudMeterHandle => {
  const width = options.width ?? 1.6
  const height = options.height ?? 0.14
  const thresholds = options.thresholds ?? HUD_METER_DEFAULT_THRESHOLDS
  const z = options.z ?? 0
  let current = hudClamp01(options.value ?? 0)

  const group = new Three.Group()

  const trackGeometry = new Three.PlaneGeometry(width, height)
  const trackMaterial = new Three.MeshBasicMaterial({
    color: options.trackColor ?? HUD_STATUS_COLORS.neutral,
    transparent: true,
    opacity: options.trackOpacity ?? 0.18,
    depthWrite: false,
  })
  const track = new Three.Mesh(trackGeometry, trackMaterial)
  track.position.z = z - 1e-3
  group.add(track)

  const fillGeometry = new Three.PlaneGeometry(1, height)
  const fillStatus0 = hudMeterStatusAt(current, thresholds)
  const fillMaterial = new Three.MeshBasicMaterial({
    color: options.fillColor ?? hudStatusColor(fillStatus0),
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  })
  const fill = new Three.Mesh(fillGeometry, fillMaterial)
  fill.position.z = z
  group.add(fill)

  const applyFill = (): void => {
    const w = Math.max(1e-4, current * width)
    fill.scale.x = w
    // left-align the fill against the track's left edge
    fill.position.x = -width / 2 + w / 2
    if (options.fillColor === undefined) {
      fillMaterial.color.set(hudStatusColor(hudMeterStatusAt(current, thresholds)))
    }
  }
  applyFill()

  const setValue = (value: number): void => {
    current = hudClamp01(value)
    applyFill()
  }

  const dispose = (): void => {
    trackGeometry.dispose()
    trackMaterial.dispose()
    fillGeometry.dispose()
    fillMaterial.dispose()
    group.removeFromParent()
  }

  return {
    group,
    setValue,
    value: () => current,
    status: () => hudMeterStatusAt(current, thresholds),
    dispose,
  }
}

// ---------------------------------------------------------------------------
// Background surfaces: dot grid, grid lines, scanlines, moving lines
// ---------------------------------------------------------------------------

export type HudDotGridOptions = Readonly<{
  width?: number
  height?: number
  /** Spacing between dots in world units. */
  spacing?: number
  dotSize?: number
  color?: Three.ColorRepresentation
  opacity?: number
  z?: number
}>

export type HudPointsHandle = Readonly<{
  points: Three.Points<Three.BufferGeometry, Three.PointsMaterial>
  count: number
  dispose: () => void
}>

/** WGPUI `DotGridBackground`: a regular lattice of points. */
export const hudDotGridPositions = (
  width: number,
  height: number,
  spacing: number,
): Float32Array => {
  const step = Math.max(1e-3, spacing)
  const cols = Math.max(1, Math.floor(width / step))
  const rows = Math.max(1, Math.floor(height / step))
  const positions = new Float32Array((cols + 1) * (rows + 1) * 3)
  let i = 0
  for (let cx = 0; cx <= cols; cx += 1) {
    for (let cy = 0; cy <= rows; cy += 1) {
      positions[i++] = -width / 2 + cx * step
      positions[i++] = -height / 2 + cy * step
      positions[i++] = 0
    }
  }
  return positions
}

export const createHudDotGrid = (
  options: HudDotGridOptions = {},
): HudPointsHandle => {
  const width = options.width ?? 4
  const height = options.height ?? 2.4
  const spacing = options.spacing ?? 0.2
  const z = options.z ?? 0
  const positions = hudDotGridPositions(width, height, spacing)

  const geometry = new Three.BufferGeometry()
  geometry.setAttribute(
    "position",
    new Three.BufferAttribute(positions, 3),
  )
  const material = new Three.PointsMaterial({
    color: options.color ?? HUD_STATUS_COLORS.primary,
    size: options.dotSize ?? 0.02,
    transparent: true,
    opacity: options.opacity ?? 0.4,
    depthWrite: false,
    sizeAttenuation: false,
  })
  const points = new Three.Points(geometry, material)
  points.position.z = z

  return {
    points,
    count: positions.length / 3,
    dispose: () => {
      geometry.dispose()
      material.dispose()
      points.removeFromParent()
    },
  }
}

export type HudGridLinesOptions = Readonly<{
  width?: number
  height?: number
  spacing?: number
  color?: Three.ColorRepresentation
  opacity?: number
  z?: number
}>

export type HudLinesHandle = Readonly<{
  lineSegments: Three.LineSegments<Three.BufferGeometry, Three.LineBasicMaterial>
  segmentCount: number
  dispose: () => void
}>

/** WGPUI `GridLinesBackground`: orthogonal grid as a single LineSegments. */
export const hudGridLinePositions = (
  width: number,
  height: number,
  spacing: number,
): Float32Array => {
  const step = Math.max(1e-3, spacing)
  const hw = width / 2
  const hh = height / 2
  const verts: number[] = []
  for (let x = -hw; x <= hw + 1e-6; x += step) {
    verts.push(x, -hh, 0, x, hh, 0)
  }
  for (let y = -hh; y <= hh + 1e-6; y += step) {
    verts.push(-hw, y, 0, hw, y, 0)
  }
  return new Float32Array(verts)
}

export const createHudGridLines = (
  options: HudGridLinesOptions = {},
): HudLinesHandle => {
  const width = options.width ?? 4
  const height = options.height ?? 2.4
  const spacing = options.spacing ?? 0.4
  const z = options.z ?? 0
  const positions = hudGridLinePositions(width, height, spacing)

  const geometry = new Three.BufferGeometry()
  geometry.setAttribute(
    "position",
    new Three.BufferAttribute(positions, 3),
  )
  const material = new Three.LineBasicMaterial({
    color: options.color ?? HUD_STATUS_COLORS.primary,
    transparent: true,
    opacity: options.opacity ?? 0.16,
    depthWrite: false,
  })
  const lineSegments = new Three.LineSegments(geometry, material)
  lineSegments.position.z = z

  return {
    lineSegments,
    segmentCount: positions.length / 6,
    dispose: () => {
      geometry.dispose()
      material.dispose()
      lineSegments.removeFromParent()
    },
  }
}

export type HudScanlinesOptions = Readonly<{
  width?: number
  height?: number
  color?: Three.ColorRepresentation
  opacity?: number
  /** Number of scanlines across the height. */
  density?: number
  /** Scroll speed in lines/second (drives `update`). */
  scrollSpeed?: number
  z?: number
}>

export type HudScanlinesHandle = Readonly<{
  mesh: Three.Mesh<Three.PlaneGeometry, Three.ShaderMaterial>
  /** Advance the scanline scroll; pass total elapsed seconds. */
  update: (elapsedSeconds: number) => void
  dispose: () => void
}>

/**
 * A scanline/CRT surface as a shader plane (port of the WGPUI moving-scanline
 * look). The fragment shader draws horizontal lines whose phase scrolls with
 * `uTime`.
 */
export const createHudScanlines = (
  options: HudScanlinesOptions = {},
): HudScanlinesHandle => {
  const width = options.width ?? 4
  const height = options.height ?? 2.4
  const density = options.density ?? 160
  const scrollSpeed = options.scrollSpeed ?? 0.6
  const z = options.z ?? 0
  const color = new Three.Color(options.color ?? HUD_STATUS_COLORS.primary)

  const geometry = new Three.PlaneGeometry(width, height)
  const material = new Three.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: color },
      uOpacity: { value: options.opacity ?? 0.12 },
      uDensity: { value: density },
      uTime: { value: 0 },
      uScroll: { value: scrollSpeed },
    },
    vertexShader: [
      "varying vec2 vUv;",
      "void main() {",
      "  vUv = uv;",
      "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
      "}",
    ].join("\n"),
    fragmentShader: [
      "varying vec2 vUv;",
      "uniform vec3 uColor;",
      "uniform float uOpacity;",
      "uniform float uDensity;",
      "uniform float uTime;",
      "uniform float uScroll;",
      "void main() {",
      "  float line = sin((vUv.y * uDensity + uTime * uScroll) * 6.2831853);",
      "  float intensity = smoothstep(0.2, 1.0, line);",
      "  gl_FragColor = vec4(uColor, intensity * uOpacity);",
      "}",
    ].join("\n"),
  })
  const mesh = new Three.Mesh(geometry, material)
  mesh.position.z = z

  return {
    mesh,
    update: (elapsedSeconds: number) => {
      material.uniforms.uTime.value = elapsedSeconds
    },
    dispose: () => {
      geometry.dispose()
      material.dispose()
      mesh.removeFromParent()
    },
  }
}

// ---------------------------------------------------------------------------
// Illuminator (pointer-follow glow)
// ---------------------------------------------------------------------------

export type HudIlluminatorOptions = Readonly<{
  /** World-space diameter of the glow. */
  size?: number
  color?: Three.ColorRepresentation
  opacity?: number
  z?: number
}>

export type HudIlluminatorHandle = Readonly<{
  mesh: Three.Mesh<Three.PlaneGeometry, Three.MeshBasicMaterial>
  /** Move the glow to a world XY position (e.g. an unprojected pointer). */
  moveTo: (x: number, y: number) => void
  setVisible: (visible: boolean) => void
  dispose: () => void
}>

/**
 * Port of Arwes `Illuminator`: a soft radial glow. Here it is a plane with a
 * procedurally generated radial-gradient texture, additively blended, that the
 * caller positions from a pointer hit (raycast or unproject). Kept input-free
 * so it composes with three-effect's `interactionPrimitives`.
 */
export const createHudIlluminator = (
  options: HudIlluminatorOptions = {},
): HudIlluminatorHandle => {
  const size = options.size ?? 1.4
  const z = options.z ?? 0

  const texture = createRadialGlowTexture(
    new Three.Color(options.color ?? HUD_STATUS_COLORS.primary),
  )

  const geometry = new Three.PlaneGeometry(size, size)
  const material = new Three.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: options.opacity ?? 0.5,
    depthWrite: false,
    blending: Three.AdditiveBlending,
  })
  const mesh = new Three.Mesh(geometry, material)
  mesh.position.z = z

  return {
    mesh,
    moveTo: (x: number, y: number) => {
      mesh.position.set(x, y, z)
    },
    setVisible: (visible: boolean) => {
      mesh.visible = visible
    },
    dispose: () => {
      geometry.dispose()
      material.dispose()
      texture.dispose()
      mesh.removeFromParent()
    },
  }
}

const createRadialGlowTexture = (color: Three.Color): Three.Texture => {
  const fallback = new Three.DataTexture(
    new Uint8Array([255, 255, 255, 255]),
    1,
    1,
  )
  if (typeof document === "undefined") {
    fallback.needsUpdate = true
    return fallback
  }
  const canvas = document.createElement("canvas")
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext("2d")
  if (ctx === null) {
    fallback.needsUpdate = true
    return fallback
  }
  const r = Math.round(color.r * 255)
  const g = Math.round(color.g * 255)
  const b = Math.round(color.b * 255)
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, "rgba(" + r + "," + g + "," + b + ",1)")
  gradient.addColorStop(1, "rgba(" + r + "," + g + "," + b + ",0)")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 128, 128)
  const texture = new Three.CanvasTexture(canvas)
  texture.colorSpace = Three.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

// ---------------------------------------------------------------------------
// Separator rule
// ---------------------------------------------------------------------------

export type HudSeparatorOptions = Readonly<{
  length?: number
  color?: Three.ColorRepresentation
  opacity?: number
  vertical?: boolean
  z?: number
}>

export type HudSeparatorHandle = Readonly<{
  line: Three.Line<Three.BufferGeometry, Three.LineBasicMaterial>
  dispose: () => void
}>

/** WGPUI `Separator`: a single faint rule line. */
export const createHudSeparator = (
  options: HudSeparatorOptions = {},
): HudSeparatorHandle => {
  const length = options.length ?? 2
  const z = options.z ?? 0
  const half = length / 2
  const a = options.vertical
    ? new Three.Vector3(0, -half, z)
    : new Three.Vector3(-half, 0, z)
  const b = options.vertical
    ? new Three.Vector3(0, half, z)
    : new Three.Vector3(half, 0, z)
  const geometry = new Three.BufferGeometry().setFromPoints([a, b])
  const material = new Three.LineBasicMaterial({
    color: options.color ?? HUD_STATUS_COLORS.line,
    transparent: true,
    opacity: options.opacity ?? 0.3,
    depthWrite: false,
  })
  const line = new Three.Line(geometry, material)
  return {
    line,
    dispose: () => {
      geometry.dispose()
      material.dispose()
      line.removeFromParent()
    },
  }
}

// ---------------------------------------------------------------------------
// HUD label (crisp 3D text, reusing the existing text-label primitive)
// ---------------------------------------------------------------------------

export type HudLabelOptions = Readonly<{
  text: string
  status?: HudStatus
  fontSize?: number
  worldHeight?: number
  anchorX?: "left" | "center" | "right"
  position?: { x?: number; y?: number; z?: number }
}>

/**
 * A HUD-styled crisp text label built on `createTextLabel` (canvas-texture on a
 * billboarded plane — no troika/SDF dependency, sharp at any zoom). This is the
 * "port crisp 3D HUD text into three-effect" deliverable; it reuses the shared
 * text primitive rather than adding a parallel one.
 */
export const createHudLabel = (options: HudLabelOptions): TextLabelHandle =>
  createTextLabel({
    text: options.text,
    color: hudStatusColor(options.status ?? "line"),
    fontSize: options.fontSize ?? 42,
    fontFamily:
      "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    fontWeight: 600,
    worldHeight: options.worldHeight ?? 0.16,
    anchorX: options.anchorX ?? "left",
    billboard: false,
    position:
      options.position === undefined
        ? undefined
        : [
            options.position.x ?? 0,
            options.position.y ?? 0,
            options.position.z ?? 0,
          ],
  })
