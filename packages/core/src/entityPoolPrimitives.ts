import * as Three from "three"

import { type Vector3Like, toVector3 } from "./cameraPrimitives"
import { createInstanceMatrix } from "./instancePrimitives"

export const pmndrsEntityPoolPrimitiveSourceRefs = [
  "projects/repos/drei/src/core/Instances.tsx",
  "projects/repos/examples/demos/instances/src/App.jsx",
  "projects/repos/examples/demos/instanced-vertex-colors/src/App.jsx",
] as const

export type EntityPoolState = Readonly<{
  position?: Vector3Like
  scale?: Vector3Like | number
  color?: Three.ColorRepresentation
  /** When false, the entity is hidden (collapsed to zero scale) without freeing its slot. */
  visible?: boolean
}>

export type EntityPoolOptions = Readonly<{
  capacity: number
  geometry?: Three.BufferGeometry
  material?: Three.Material
  /** Default color applied to freshly spawned entities. */
  color?: Three.ColorRepresentation
  /** Default scale applied to freshly spawned entities. */
  scale?: Vector3Like | number
  frustumCulled?: boolean
}>

export type EntityPoolHandle = Readonly<{
  /** The backing InstancedMesh. Add this to a scene/group. */
  mesh: Three.InstancedMesh
  /** Spawn or update an entity by id. Returns the slot index. */
  set: (id: string, state: EntityPoolState) => number
  /** Despawn an entity, freeing its slot for reuse. */
  remove: (id: string) => boolean
  /** True if the id currently occupies a slot. */
  has: (id: string) => boolean
  /** Number of live entities. */
  count: () => number
  /** Maximum number of simultaneous entities. */
  capacity: number
  /** Live entity ids in slot order. */
  ids: () => readonly string[]
  dispose: () => void
}>

const HIDDEN_SCALE = 1e-6

const toScaleVector = (
  value: Vector3Like | number | undefined,
): Three.Vector3 => {
  if (value === undefined) return new Three.Vector3(1, 1, 1)
  if (typeof value === "number") return new Three.Vector3(value, value, value)
  return toVector3(value)
}

/**
 * A scalable, LOD-friendly entity pool over a single `InstancedMesh`.
 *
 * Entities are addressed by string id and map to a compact slot range, so the
 * mesh's draw `count` only covers live entities. Despawned slots are reused on
 * the next spawn, keeping the instance buffers contiguous. Intended for
 * rendering many Pylon nodes / agents in the living-run view.
 */
export const createEntityPool = (
  options: EntityPoolOptions,
): EntityPoolHandle => {
  const capacity = Math.max(1, Math.floor(options.capacity))
  const geometry = options.geometry ?? new Three.SphereGeometry(0.5, 16, 12)
  const ownsGeometry = options.geometry === undefined
  const material =
    options.material ??
    new Three.MeshBasicMaterial({ color: 0xffffff, transparent: true })
  const ownsMaterial = options.material === undefined

  const mesh = new Three.InstancedMesh(geometry, material, capacity)
  mesh.frustumCulled = options.frustumCulled ?? false
  mesh.matrixAutoUpdate = false
  mesh.count = 0
  // Ensure an instanceColor buffer exists so per-entity color works.
  mesh.setColorAt(0, new Three.Color(options.color ?? 0xffffff))
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

  const defaultScale = toScaleVector(options.scale)
  const defaultColor = new Three.Color(options.color ?? 0xffffff)

  const slotById = new Map<string, number>()
  const idBySlot: Array<string | undefined> = new Array(capacity).fill(undefined)
  const freeSlots: number[] = []
  let highWater = 0

  const recomputeCount = (): void => {
    let count = 0
    for (let index = 0; index < highWater; index += 1) {
      if (idBySlot[index] !== undefined) count = index + 1
    }
    mesh.count = count
  }

  const writeSlot = (slot: number, state: EntityPoolState): void => {
    const position = state.position ? toVector3(state.position) : new Three.Vector3()
    const visible = state.visible ?? true
    const scale = visible
      ? toScaleVector(state.scale ?? defaultScale)
      : new Three.Vector3(HIDDEN_SCALE, HIDDEN_SCALE, HIDDEN_SCALE)
    mesh.setMatrixAt(slot, createInstanceMatrix({ position, scale }))
    mesh.setColorAt(slot, new Three.Color(state.color ?? defaultColor))
  }

  const set = (id: string, state: EntityPoolState): number => {
    let slot = slotById.get(id)
    if (slot === undefined) {
      slot = freeSlots.pop()
      if (slot === undefined) {
        if (highWater >= capacity) {
          throw new Error(
            `createEntityPool: capacity ${capacity} exceeded for id ${id}`,
          )
        }
        slot = highWater
        highWater += 1
      }
      slotById.set(id, slot)
      idBySlot[slot] = id
    }

    writeSlot(slot, state)
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    recomputeCount()
    return slot
  }

  const remove = (id: string): boolean => {
    const slot = slotById.get(id)
    if (slot === undefined) return false
    slotById.delete(id)
    idBySlot[slot] = undefined
    freeSlots.push(slot)
    // Collapse the freed instance so a stale matrix never renders.
    mesh.setMatrixAt(
      slot,
      createInstanceMatrix({
        scale: HIDDEN_SCALE,
      }),
    )
    mesh.instanceMatrix.needsUpdate = true
    recomputeCount()
    return true
  }

  const dispose = (): void => {
    if (ownsGeometry) geometry.dispose()
    if (ownsMaterial) material.dispose()
    mesh.dispose()
    mesh.removeFromParent()
    slotById.clear()
  }

  return {
    mesh,
    set,
    remove,
    has: id => slotById.has(id),
    count: () => slotById.size,
    capacity,
    ids: () =>
      idBySlot.filter((id): id is string => id !== undefined),
    dispose,
  }
}
