import * as Three from "three"

import { type CanvasSize, type Vector3Like, toVector3 } from "./cameraPrimitives"
import { projectWorldToScreen } from "./htmlOverlayPrimitives"

export type VerseNameplateKind = "agent" | "pylon" | "run"

export type VerseNameplateDefinition = Readonly<{
  id: string
  kind: VerseNameplateKind
  label: string
  position: Vector3Like
  status?: string
  anchorOffset?: Vector3Like
}>

export type VerseNameplateHudExclusion = Readonly<{
  x: number
  y: number
  width: number
  height: number
}>

export type VerseNameplateStatusBar = Readonly<{
  value: number
  tone: "blocked" | "offline" | "online" | "pending" | "working"
}>

export type VerseNameplateProjection = Readonly<{
  id: string
  kind: VerseNameplateKind
  label: string
  status?: string
  statusBar: VerseNameplateStatusBar
  screen: Readonly<{ x: number; y: number }>
  worldPosition: readonly [number, number, number]
  visible: boolean
  degraded: "behind_camera" | "hud_overlap" | "offscreen" | null
}>

export type VerseNameplateProjectionInput = Readonly<{
  camera: Three.Camera
  items: ReadonlyArray<VerseNameplateDefinition>
  size: CanvasSize
  hudExclusionRects?: ReadonlyArray<VerseNameplateHudExclusion>
  paddingPx?: number
}>

export type VerseNameplatePoolReconcileResult = Readonly<{
  created: ReadonlyArray<string>
  removed: ReadonlyArray<string>
  reused: ReadonlyArray<string>
  activeIds: ReadonlyArray<string>
}>

export type VerseNameplatePool = Readonly<{
  reconcile: (
    projections: ReadonlyArray<Pick<VerseNameplateProjection, "id">>,
  ) => VerseNameplatePoolReconcileResult
  activeIds: () => ReadonlyArray<string>
}>

const statusToneFor = (
  kind: VerseNameplateKind,
  status: string | undefined,
): VerseNameplateStatusBar => {
  const normalized = (status ?? "").toLowerCase()
  if (normalized.includes("block") || normalized.includes("reject")) {
    return { value: 0.18, tone: "blocked" }
  }
  if (normalized.includes("offline") || normalized.includes("stale")) {
    return { value: 0.28, tone: "offline" }
  }
  if (
    normalized.includes("work") ||
    normalized.includes("trace") ||
    normalized.includes("replay") ||
    normalized.includes("active")
  ) {
    return { value: 0.78, tone: "working" }
  }
  if (
    normalized.includes("online") ||
    normalized.includes("accepted") ||
    normalized.includes("settled") ||
    normalized.includes("ready")
  ) {
    return { value: 1, tone: "online" }
  }
  return { value: kind === "run" ? 0.5 : 0.42, tone: "pending" }
}

const overlaps = (
  point: Readonly<{ x: number; y: number }>,
  rect: VerseNameplateHudExclusion,
  paddingPx: number,
): boolean =>
  point.x >= rect.x - paddingPx &&
  point.x <= rect.x + rect.width + paddingPx &&
  point.y >= rect.y - paddingPx &&
  point.y <= rect.y + rect.height + paddingPx

const anchoredWorldPosition = (
  item: VerseNameplateDefinition,
): Three.Vector3 => {
  const position = toVector3(item.position)
  if (item.anchorOffset === undefined) return position
  return position.add(toVector3(item.anchorOffset))
}

export const projectVerseNameplates = ({
  camera,
  hudExclusionRects = [],
  items,
  paddingPx = 12,
  size,
}: VerseNameplateProjectionInput): ReadonlyArray<VerseNameplateProjection> =>
  items.map(item => {
    const worldPosition = anchoredWorldPosition(item)
    const projected = projectWorldToScreen(worldPosition, camera, size)
    const screen = {
      x: Number(projected.x.toFixed(2)),
      y: Number(projected.y.toFixed(2)),
    }
    const hudOverlap = hudExclusionRects.some(rect => overlaps(screen, rect, paddingPx))
    const degraded = projected.behindCamera
      ? "behind_camera"
      : !projected.visible
        ? "offscreen"
        : hudOverlap
          ? "hud_overlap"
          : null
    return {
      id: item.id,
      kind: item.kind,
      label: item.label,
      ...(item.status === undefined ? {} : { status: item.status }),
      statusBar: statusToneFor(item.kind, item.status),
      screen,
      worldPosition: [
        Number(worldPosition.x.toFixed(4)),
        Number(worldPosition.y.toFixed(4)),
        Number(worldPosition.z.toFixed(4)),
      ],
      visible: degraded === null,
      degraded,
    }
  })

export const createVerseNameplatePool = (): VerseNameplatePool => {
  const active = new Set<string>()
  return {
    reconcile: projections => {
      const nextIds = projections.map(projection => projection.id)
      const next = new Set(nextIds)
      const created = nextIds.filter(id => !active.has(id))
      const reused = nextIds.filter(id => active.has(id))
      const removed = [...active].filter(id => !next.has(id))
      active.clear()
      for (const id of nextIds) active.add(id)
      return {
        created,
        reused,
        removed,
        activeIds: [...active],
      }
    },
    activeIds: () => [...active],
  }
}
