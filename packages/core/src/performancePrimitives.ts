export const pmndrsPerformancePrimitiveSourceRefs = [
  "projects/repos/examples/demos/building-live-envmaps/src/App.jsx",
  "projects/repos/examples/demos/caustics/src/App.jsx",
  "projects/repos/examples/demos/room-with-soft-shadows/src/App.jsx",
  "projects/repos/examples/demos/racing-game/src/App.jsx",
  "projects/repos/drei/src/core/PerformanceMonitor.tsx",
  "projects/repos/drei/src/core/Stats.tsx",
] as const

export type PerformanceMonitorOptions = Readonly<{
  ms?: number
  iterations?: number
  threshold?: number
  bounds?: (refreshRate: number) => readonly [lower: number, upper: number]
  flipflops?: number
  factor?: number
  step?: number
}>

export type PerformanceMonitorState = {
  fps: number
  factor: number
  refreshRate: number
  frames: number[]
  averages: number[]
  index: number
  flipped: number
  fallback: boolean
}

export type PerformanceMonitorSample = Readonly<{
  state: PerformanceMonitorState
  changed: boolean
  direction: "incline" | "decline" | "stable" | "fallback"
}>

export const defaultPerformanceMonitorOptions: Required<PerformanceMonitorOptions> = {
  ms: 250,
  iterations: 10,
  threshold: 0.75,
  bounds: refreshRate => (refreshRate > 100 ? [60, 100] : [40, 60]),
  flipflops: Number.POSITIVE_INFINITY,
  factor: 0.5,
  step: 0.1,
}

export const createPerformanceMonitorState = (
  options: PerformanceMonitorOptions = {},
): PerformanceMonitorState => ({
  fps: 0,
  factor: options.factor ?? defaultPerformanceMonitorOptions.factor,
  refreshRate: 0,
  frames: [],
  averages: [],
  index: 0,
  flipped: 0,
  fallback: false,
})

export const samplePerformanceFrame = (
  state: PerformanceMonitorState,
  nowMs: number,
  options: PerformanceMonitorOptions = {},
): PerformanceMonitorSample => {
  const resolved = { ...defaultPerformanceMonitorOptions, ...options }
  if (state.fallback) return { state, changed: false, direction: "fallback" }

  state.frames.push(nowMs)
  const first = state.frames[0]
  if (first === undefined || nowMs - first < resolved.ms) {
    return { state, changed: false, direction: "stable" }
  }

  const elapsed = Math.max(1, nowMs - first)
  state.fps = Math.round((state.frames.length / elapsed) * 1000)
  state.refreshRate = Math.max(state.refreshRate, state.fps)
  state.averages[state.index % resolved.iterations] = state.fps
  state.index += 1
  state.frames = []

  if (state.averages.length < resolved.iterations) {
    return { state, changed: false, direction: "stable" }
  }

  const [lower, upper] = resolved.bounds(state.refreshRate)
  const upperCount = state.averages.filter(value => value >= upper).length
  const lowerCount = state.averages.filter(value => value < lower).length
  state.averages = []

  if (upperCount > resolved.iterations * resolved.threshold) {
    state.factor = Math.min(1, state.factor + resolved.step)
    state.flipped += 1
    return { state, changed: true, direction: "incline" }
  }

  if (lowerCount > resolved.iterations * resolved.threshold) {
    state.factor = Math.max(0, state.factor - resolved.step)
    state.flipped += 1
    if (state.flipped > resolved.flipflops) {
      state.fallback = true
      return { state, changed: true, direction: "fallback" }
    }
    return { state, changed: true, direction: "decline" }
  }

  return { state, changed: false, direction: "stable" }
}

export const createStatsOverlay = (
  parent: HTMLElement,
  options: Readonly<{
    className?: string
  }> = {},
): Readonly<{
  element: HTMLDivElement
  update: (state: PerformanceMonitorState) => void
  dispose: () => void
}> => {
  const element = document.createElement("div")
  element.style.position = "absolute"
  element.style.top = "0"
  element.style.left = "0"
  element.style.zIndex = "10000"
  element.style.font = "11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace"
  element.style.padding = "4px 6px"
  element.style.color = "#fff"
  element.style.background = "rgba(0, 0, 0, 0.65)"
  if (options.className) element.className = options.className
  parent.appendChild(element)

  return {
    element,
    update: state => {
      element.textContent = `fps ${state.fps} factor ${state.factor.toFixed(2)}`
    },
    dispose: () => {
      element.remove()
    },
  }
}
