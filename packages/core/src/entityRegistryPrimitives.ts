import * as Three from "three"

import { type Vector3Like, toVector3 } from "./cameraPrimitives"
import {
  SpatialHashGrid,
  type SpatialBounds2,
  type SpatialHashGridClient,
  type SpatialPoint2,
  type SpatialSize2,
} from "./spatialPrimitives"

export const quickMmorpgEntityRegistryPrimitiveSourceRefs = [
  "projects/repos/Quick_3D_MMORPG/client/src/entity-manager.js",
  "projects/repos/Quick_3D_MMORPG/client/src/entity.js",
  "projects/repos/Quick_3D_MMORPG/shared/spatial-hash-grid.mjs",
] as const

/**
 * Thin per-frame update callback. `deltaSeconds` is the wall-clock delta and
 * `nowMs` is a monotonic-ish timestamp the tick is driven with. Both are passed
 * so primitives that interpolate on wall-clock time and primitives that animate
 * on frame delta can share a single tick.
 */
export type EntityUpdate<TEntity> = (
  entity: TEntity,
  deltaSeconds: number,
  nowMs: number,
) => void

export type EntityRegistryRecord<TEntity> = {
  readonly id: string
  entity: TEntity
  update?: EntityUpdate<TEntity>
  /** Where this entity is on the 2D (x,z) proximity plane, if tracked. */
  position?: SpatialPoint2
}

export type EntityRegistration<TEntity> = Readonly<{
  id: string
  entity: TEntity
  update?: EntityUpdate<TEntity>
  /**
   * Optional initial 2D position. When provided, the entity is inserted into
   * the spatial grid (if one is configured) so it can be returned by proximity
   * queries.
   */
  position?: SpatialPoint2 | Vector3Like
  /** Footprint for the spatial grid; defaults to a small square. */
  size?: SpatialSize2
}>

export type EntityRegistryOptions = Readonly<{
  /**
   * When supplied, the registry maintains a `SpatialHashGrid` keyed by entity
   * id for proximity queries. Omit to disable proximity entirely (the
   * `near`/`grid` members then return empty / undefined).
   */
  spatial?: Readonly<{
    bounds: SpatialBounds2
    cellsX: number
    cellsY: number
    /** Default footprint used when a registration omits `size`. */
    defaultSize?: SpatialSize2
  }>
}>

export type EntityRegistry<TEntity> = Readonly<{
  /** Register (or replace) an entity by id. Returns the stored record. */
  register: (
    registration: EntityRegistration<TEntity>,
  ) => EntityRegistryRecord<TEntity>
  /** Look up the stored entity by id. */
  lookup: (id: string) => TEntity | undefined
  /** Look up the full record (entity + update + position) by id. */
  record: (id: string) => EntityRegistryRecord<TEntity> | undefined
  has: (id: string) => boolean
  /** Remove an entity (and its spatial-grid client) by id. */
  remove: (id: string) => boolean
  /** Number of registered entities. */
  size: () => number
  /** All registered entities (insertion order is not guaranteed). */
  all: () => readonly TEntity[]
  ids: () => readonly string[]
  /**
   * Update an entity's tracked 2D position, moving it within the spatial grid.
   * No-op when the entity is unknown or no spatial grid is configured.
   */
  setPosition: (id: string, position: SpatialPoint2 | Vector3Like) => void
  /**
   * Run every registered `update` callback once. `deltaSeconds` drives frame
   * animation; `nowMs` drives wall-clock interpolation.
   */
  tick: (deltaSeconds: number, nowMs?: number) => void
  /**
   * Entities whose 2D footprint overlaps the query box centered on `position`.
   * Returns an empty array when no spatial grid is configured. The querying
   * entity id, if given, is excluded from the result.
   */
  near: (
    position: SpatialPoint2 | Vector3Like,
    radius: number,
    excludeId?: string,
  ) => readonly EntityRegistryRecord<TEntity>[]
  /** The underlying spatial grid, when one is configured. */
  grid: SpatialHashGrid<string> | undefined
  clear: () => void
}>

const DEFAULT_FOOTPRINT: SpatialSize2 = { width: 1, height: 1 }

const toSpatialPoint = (
  value: SpatialPoint2 | Vector3Like,
): SpatialPoint2 => {
  if (
    typeof value === "object" &&
    value !== null &&
    "x" in value &&
    "y" in value &&
    !(value instanceof Three.Vector3) &&
    !Array.isArray(value)
  ) {
    return value as SpatialPoint2
  }
  // Project a world-space Vector3-like onto the (x, z) plane.
  const v = toVector3(value as Vector3Like)
  return { x: v.x, y: v.z }
}

/**
 * Create a thin entity registry that composes existing three-effect primitives.
 *
 * This deliberately does NOT implement the Quick_3D_MMORPG actor/component
 * model. It only provides: register/lookup by id, a per-frame update tick, and
 * an optional `SpatialHashGrid` integration for proximity queries — just enough
 * glue to compose spawners, billboards, and interpolators together.
 */
export const createEntityRegistry = <TEntity>(
  options: EntityRegistryOptions = {},
): EntityRegistry<TEntity> => {
  const records = new Map<string, EntityRegistryRecord<TEntity>>()
  const spatial = options.spatial
  const grid =
    spatial === undefined
      ? undefined
      : new SpatialHashGrid<string>({
          bounds: spatial.bounds,
          cellsX: spatial.cellsX,
          cellsY: spatial.cellsY,
        })
  const defaultSize = spatial?.defaultSize ?? DEFAULT_FOOTPRINT

  const register = (
    registration: EntityRegistration<TEntity>,
  ): EntityRegistryRecord<TEntity> => {
    if (records.has(registration.id)) {
      remove(registration.id)
    }
    const record: EntityRegistryRecord<TEntity> = {
      id: registration.id,
      entity: registration.entity,
    }
    if (registration.update !== undefined) {
      record.update = registration.update
    }
    if (registration.position !== undefined) {
      const point = toSpatialPoint(registration.position)
      record.position = point
      grid?.insert({
        id: registration.id,
        value: registration.id,
        position: point,
        size: registration.size ?? defaultSize,
      })
    }
    records.set(registration.id, record)
    return record
  }

  const remove = (id: string): boolean => {
    grid?.remove(id)
    return records.delete(id)
  }

  const setPosition = (
    id: string,
    position: SpatialPoint2 | Vector3Like,
  ): void => {
    const record = records.get(id)
    if (record === undefined) return
    const point = toSpatialPoint(position)
    record.position = point
    grid?.update(id, { position: point })
  }

  const near = (
    position: SpatialPoint2 | Vector3Like,
    radius: number,
    excludeId?: string,
  ): readonly EntityRegistryRecord<TEntity>[] => {
    if (grid === undefined) return []
    const point = toSpatialPoint(position)
    const span = Math.max(0, radius) * 2
    const clients = grid.findNear(point, { width: span, height: span })
    const results: EntityRegistryRecord<TEntity>[] = []
    for (const client of clients as readonly SpatialHashGridClient<string>[]) {
      if (client.value === excludeId) continue
      const record = records.get(client.value)
      if (record !== undefined) results.push(record)
    }
    return results
  }

  return {
    register,
    lookup: id => records.get(id)?.entity,
    record: id => records.get(id),
    has: id => records.has(id),
    remove,
    size: () => records.size,
    all: () => [...records.values()].map(record => record.entity),
    ids: () => [...records.keys()],
    setPosition,
    tick: (deltaSeconds, nowMs = 0) => {
      for (const record of records.values()) {
        record.update?.(record.entity, deltaSeconds, nowMs)
      }
    },
    near,
    grid,
    clear: () => {
      grid?.clear()
      records.clear()
    },
  }
}
