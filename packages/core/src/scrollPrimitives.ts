export const pmndrsScrollPrimitiveSourceRefs = [
  "projects/repos/examples/demos/scrollcontrols-with-minimap/src/App.jsx",
  "projects/repos/examples/demos/useintersect-and-scrollcontrols/src/App.jsx",
  "projects/repos/examples/demos/tying-canvas-to-scroll-offset/src/App.jsx",
  "projects/repos/drei/src/web/ScrollControls.tsx",
] as const

export type ScrollAxis = "x" | "y"

export type ScrollMetrics = Readonly<{
  offset: number
  delta: number
  pages: number
  distance: number
  damping: number
  maxSpeed: number
  eps: number
  axis: ScrollAxis
}>

export type ScrollMetricsOptions = Readonly<{
  offset?: number
  delta?: number
  pages?: number
  distance?: number
  damping?: number
  maxSpeed?: number
  eps?: number
  axis?: ScrollAxis
}>

export type ScrollProgressInput = Readonly<{
  scrollOffset: number
  scrollSize: number
  viewportSize: number
}>

export const defaultScrollMetrics: ScrollMetrics = {
  offset: 0,
  delta: 0,
  pages: 1,
  distance: 1,
  damping: 0.25,
  maxSpeed: Number.POSITIVE_INFINITY,
  eps: 0.00001,
  axis: "y",
}

export const clamp01 = (value: number): number =>
  Math.min(1, Math.max(0, value))

export const resolveScrollMetrics = (
  options: ScrollMetricsOptions = {},
): ScrollMetrics => ({
  ...defaultScrollMetrics,
  ...options,
})

export const scrollRange = (
  offset: number,
  from: number,
  distance: number,
  margin = 0,
): number => {
  const start = from - margin
  const end = start + distance + margin * 2
  if (end === start) return offset >= start ? 1 : 0
  if (offset < start) return 0
  if (offset > end) return 1
  return (offset - start) / (end - start)
}

export const scrollCurve = (
  offset: number,
  from: number,
  distance: number,
  margin = 0,
): number => Math.sin(scrollRange(offset, from, distance, margin) * Math.PI)

export const scrollVisible = (
  offset: number,
  from: number,
  distance: number,
  margin = 0,
): boolean => {
  const start = from - margin
  const end = start + distance + margin * 2
  return offset >= start && offset <= end
}

export const scrollProgress = ({
  scrollOffset,
  scrollSize,
  viewportSize,
}: ScrollProgressInput): number => {
  const threshold = scrollSize - viewportSize
  if (threshold <= 0) return 0
  return clamp01(scrollOffset / threshold)
}

export const scrollProgressFromElement = (
  element: HTMLElement,
  axis: ScrollAxis = "y",
): number =>
  axis === "x"
    ? scrollProgress({
        scrollOffset: element.scrollLeft,
        scrollSize: element.scrollWidth,
        viewportSize: element.clientWidth,
      })
    : scrollProgress({
        scrollOffset: element.scrollTop,
        scrollSize: element.scrollHeight,
        viewportSize: element.clientHeight,
      })

export const dampValue = (
  current: number,
  target: number,
  dampingSeconds: number,
  deltaSeconds: number,
  maxSpeed = Number.POSITIVE_INFINITY,
  eps = 0.00001,
): number => {
  if (Math.abs(target - current) <= eps) return target
  if (dampingSeconds <= 0 || deltaSeconds <= 0) return target

  const alpha = 1 - Math.exp(-deltaSeconds / dampingSeconds)
  const unclampedStep = (target - current) * alpha
  const maxStep = Number.isFinite(maxSpeed)
    ? Math.max(0, maxSpeed) * deltaSeconds
    : Number.POSITIVE_INFINITY
  const step =
    Math.abs(unclampedStep) > maxStep
      ? Math.sign(unclampedStep) * maxStep
      : unclampedStep
  const next = current + step

  return Math.abs(target - next) <= eps ? target : next
}

export const updateScrollMetrics = (
  previous: ScrollMetrics,
  targetOffset: number,
  deltaSeconds: number,
  options: ScrollMetricsOptions = {},
): ScrollMetrics => {
  const resolved = resolveScrollMetrics({ ...previous, ...options })
  const offset = dampValue(
    resolved.offset,
    targetOffset,
    resolved.damping,
    deltaSeconds,
    resolved.maxSpeed,
    resolved.eps,
  )

  return {
    ...resolved,
    offset,
    delta: Math.abs(previous.offset - offset),
  }
}

export const scrollMetricsRange = (
  metrics: ScrollMetrics,
  from: number,
  distance: number,
  margin = 0,
): number => scrollRange(metrics.offset, from, distance, margin)

export const scrollMetricsCurve = (
  metrics: ScrollMetrics,
  from: number,
  distance: number,
  margin = 0,
): number => scrollCurve(metrics.offset, from, distance, margin)

export const scrollMetricsVisible = (
  metrics: ScrollMetrics,
  from: number,
  distance: number,
  margin = 0,
): boolean => scrollVisible(metrics.offset, from, distance, margin)
