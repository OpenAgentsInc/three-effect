import * as Three from "three"

import { type Vector3Like, toVector3 } from "./cameraPrimitives"
import { type EntityPoolHandle, type EntityPoolState } from "./entityPoolPrimitives"

export const pmndrsPresenceBindingPrimitiveSourceRefs = [
  "projects/repos/drei/src/core/Instances.tsx",
  "projects/repos/examples/demos/instances/src/App.jsx",
] as const

/** A single presence update for one entity in the living-run view. */
export type EntityPresenceUpdate = Readonly<{
  id: string
  position: Vector3Like
  status?: string
  color?: Three.ColorRepresentation
  /** When false, the entity is removed from the pool on the next apply. */
  present?: boolean
}>

export type PresenceBindingOptions = Readonly<{
  /** Interpolation window in milliseconds. 0 disables interpolation. */
  interpolateMs?: number
  /** Map a status string to a color. Falls back to the update's own color. */
  statusColor?: (status: string) => Three.ColorRepresentation | undefined
}>

export type PresenceBindingHandle = Readonly<{
  /** Apply a full snapshot of presence updates (ids not present are removed). */
  apply: (updates: readonly EntityPresenceUpdate[]) => void
  /** Apply a single incremental update without removing others. */
  upsert: (update: EntityPresenceUpdate) => void
  /** Advance interpolation toward the latest targets. */
  update: (deltaMs: number) => void
  /** Currently tracked ids. */
  ids: () => readonly string[]
  dispose: () => void
}>

type Tracked = {
  current: Three.Vector3
  target: Three.Vector3
  color?: Three.ColorRepresentation
}

const colorEquals = (
  a: Three.ColorRepresentation | undefined,
  b: Three.ColorRepresentation | undefined,
): boolean => a === b

/**
 * Bind a stream/array of `{ id, position, status }` presence updates to an
 * entity pool with simple critically-damped interpolation, so scenes become
 * data-bound rather than scripted.
 *
 * `apply` treats its argument as a full snapshot: any tracked id missing from
 * the snapshot is removed. `upsert` is the incremental form. `update(deltaMs)`
 * moves each entity toward its latest target over `interpolateMs`.
 */
export const bindEntityPresence = (
  pool: EntityPoolHandle,
  options: PresenceBindingOptions = {},
): PresenceBindingHandle => {
  const interpolateMs = Math.max(0, options.interpolateMs ?? 120)
  const tracked = new Map<string, Tracked>()

  const resolveColor = (
    update: EntityPresenceUpdate,
  ): Three.ColorRepresentation | undefined => {
    if (update.status !== undefined && options.statusColor !== undefined) {
      const mapped = options.statusColor(update.status)
      if (mapped !== undefined) return mapped
    }
    return update.color
  }

  const writePool = (id: string, entry: Tracked): void => {
    const state: EntityPoolState = {
      position: entry.current,
      visible: true,
    }
    pool.set(id, entry.color === undefined ? state : { ...state, color: entry.color })
  }

  const upsert = (update: EntityPresenceUpdate): void => {
    if (update.present === false) {
      tracked.delete(update.id)
      pool.remove(update.id)
      return
    }

    const targetPosition = toVector3(update.position)
    const color = resolveColor(update)
    const existing = tracked.get(update.id)

    if (existing === undefined) {
      const baseEntry = {
        current: targetPosition.clone(),
        target: targetPosition.clone(),
      }
      const entry: Tracked =
        color === undefined ? baseEntry : { ...baseEntry, color }
      tracked.set(update.id, entry)
      writePool(update.id, entry)
      return
    }

    existing.target.copy(targetPosition)
    if (!colorEquals(existing.color, color)) {
      if (color === undefined) {
        delete existing.color
      } else {
        existing.color = color
      }
      // Color changes apply immediately (no interpolation on color).
      writePool(update.id, existing)
    }
    if (interpolateMs === 0) {
      existing.current.copy(targetPosition)
      writePool(update.id, existing)
    }
  }

  const apply = (updates: readonly EntityPresenceUpdate[]): void => {
    const seen = new Set<string>()
    for (const update of updates) {
      if (update.present !== false) seen.add(update.id)
      upsert(update)
    }
    for (const id of [...tracked.keys()]) {
      if (!seen.has(id)) {
        tracked.delete(id)
        pool.remove(id)
      }
    }
  }

  const update = (deltaMs: number): void => {
    if (interpolateMs === 0 || deltaMs <= 0) return
    // Exponential smoothing factor derived from the interpolation window.
    const alpha = 1 - Math.exp(-deltaMs / interpolateMs)
    for (const [id, entry] of tracked) {
      if (entry.current.distanceToSquared(entry.target) < 1e-10) continue
      entry.current.lerp(entry.target, alpha)
      writePool(id, entry)
    }
  }

  const dispose = (): void => {
    tracked.clear()
  }

  return {
    apply,
    upsert,
    update,
    ids: () => [...tracked.keys()],
    dispose,
  }
}
