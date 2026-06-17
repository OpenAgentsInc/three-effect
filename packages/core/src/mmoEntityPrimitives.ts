import * as Three from "three"

import { type Vector3Like, toVector3 } from "./cameraPrimitives"

export const quickMmorpgEntityPrimitiveSourceRefs = [
  "projects/repos/Quick_3D_MMORPG/client/src/network-entity-controller.js",
  "projects/repos/Quick_3D_MMORPG/client/src/network-player-controller.js",
  "projects/repos/Quick_3D_MMORPG/client/src/network-controller.js",
  "projects/repos/Quick_3D_MMORPG/server/src/world-client.mjs",
  "projects/repos/Quick_3D_MMORPG/server/src/world-entity.mjs",
] as const

export type MmoQuaternionLike =
  | Three.Quaternion
  | readonly [number, number, number, number]

export type MmoEntityTransformInput<TDescription = unknown> = Readonly<{
  id: string
  position: Vector3Like
  quaternion?: MmoQuaternionLike
  state?: string
  updatedAtMs?: number
  description?: TDescription
}>

export type MmoEntityTransformSnapshot<TDescription = unknown> = Readonly<{
  id: string
  position: Three.Vector3
  quaternion: Three.Quaternion
  state?: string
  updatedAtMs: number
  description?: TDescription
}>

export type MmoEntityInterpolationOptions = Readonly<{
  interpolateMs?: number
  staleAfterMs?: number
  despawnAfterMs?: number
}>

export type ResolvedMmoEntityInterpolationOptions = Readonly<{
  interpolateMs: number
  staleAfterMs: number
  despawnAfterMs: number
}>

export type MmoEntityLiveness = "despawn" | "fresh" | "stale"

export type MmoEntityInterpolationState<TDescription = unknown> = {
  id: string
  currentPosition: Three.Vector3
  currentQuaternion: Three.Quaternion
  previousPosition: Three.Vector3
  previousQuaternion: Three.Quaternion
  targetPosition: Three.Vector3
  targetQuaternion: Three.Quaternion
  elapsedMs: number
  updatedAtMs: number
  state?: string
  description?: TDescription
}

export type MmoEntityTransformSample<TDescription = unknown> = Readonly<{
  id: string
  position: Three.Vector3
  quaternion: Three.Quaternion
  state?: string
  updatedAtMs: number
  description?: TDescription
}>

export type MmoEntityTransformInterpolator<TDescription = unknown> = Readonly<{
  apply: (snapshot: MmoEntityTransformSnapshot<TDescription>) => void
  update: (deltaMs: number) => MmoEntityTransformSample<TDescription>
  sample: () => MmoEntityTransformSample<TDescription>
  liveness: (nowMs: number) => MmoEntityLiveness
  reset: (snapshot: MmoEntityTransformSnapshot<TDescription>) => void
}>

export type MmoEntityDescriptionCache<TDescription> = Readonly<{
  get: (id: string) => TDescription | undefined
  missing: (ids: readonly string[]) => readonly string[]
  upsert: (id: string, description: TDescription) => void
  remove: (id: string) => boolean
  clear: () => void
}>

export const defaultMmoEntityInterpolationOptions: ResolvedMmoEntityInterpolationOptions =
  {
    interpolateMs: 100,
    staleAfterMs: 10_000,
    despawnAfterMs: 30_000,
  }

export const resolveMmoEntityInterpolationOptions = (
  options: MmoEntityInterpolationOptions = {},
): ResolvedMmoEntityInterpolationOptions => ({
  ...defaultMmoEntityInterpolationOptions,
  ...options,
  interpolateMs: Math.max(0, options.interpolateMs ?? 100),
  staleAfterMs: Math.max(0, options.staleAfterMs ?? 10_000),
  despawnAfterMs: Math.max(
    options.staleAfterMs ?? 10_000,
    options.despawnAfterMs ?? 30_000,
  ),
})

export const toMmoQuaternion = (
  value: MmoQuaternionLike | undefined,
): Three.Quaternion => {
  if (value === undefined) {
    return new Three.Quaternion()
  }
  if (value instanceof Three.Quaternion) {
    return value.clone()
  }
  return new Three.Quaternion(value[0], value[1], value[2], value[3])
}

export const normalizeMmoEntityTransformSnapshot = <TDescription = unknown>(
  input: MmoEntityTransformInput<TDescription>,
  fallbackUpdatedAtMs = 0,
): MmoEntityTransformSnapshot<TDescription> => {
  const base = {
    id: input.id,
    position: toVector3(input.position),
    quaternion: toMmoQuaternion(input.quaternion),
    updatedAtMs: input.updatedAtMs ?? fallbackUpdatedAtMs,
  }
  const withState =
    input.state === undefined ? base : { ...base, state: input.state }
  return input.description === undefined
    ? withState
    : { ...withState, description: input.description }
}

export const createMmoEntityInterpolationState = <TDescription = unknown>(
  snapshot: MmoEntityTransformSnapshot<TDescription>,
): MmoEntityInterpolationState<TDescription> => {
  const base = {
    id: snapshot.id,
    currentPosition: snapshot.position.clone(),
    currentQuaternion: snapshot.quaternion.clone(),
    previousPosition: snapshot.position.clone(),
    previousQuaternion: snapshot.quaternion.clone(),
    targetPosition: snapshot.position.clone(),
    targetQuaternion: snapshot.quaternion.clone(),
    elapsedMs: 0,
    updatedAtMs: snapshot.updatedAtMs,
  }
  const withState =
    snapshot.state === undefined ? base : { ...base, state: snapshot.state }
  return snapshot.description === undefined
    ? withState
    : { ...withState, description: snapshot.description }
}

export const applyMmoEntityTransformSnapshot = <TDescription = unknown>(
  state: MmoEntityInterpolationState<TDescription>,
  snapshot: MmoEntityTransformSnapshot<TDescription>,
): MmoEntityInterpolationState<TDescription> => {
  state.id = snapshot.id
  state.previousPosition.copy(state.currentPosition)
  state.previousQuaternion.copy(state.currentQuaternion)
  state.targetPosition.copy(snapshot.position)
  state.targetQuaternion.copy(snapshot.quaternion)
  state.elapsedMs = 0
  state.updatedAtMs = snapshot.updatedAtMs
  if (snapshot.state === undefined) {
    delete state.state
  } else {
    state.state = snapshot.state
  }
  if (snapshot.description === undefined) {
    delete state.description
  } else {
    state.description = snapshot.description
  }
  return state
}

export const sampleMmoEntityInterpolationState = <TDescription = unknown>(
  state: MmoEntityInterpolationState<TDescription>,
): MmoEntityTransformSample<TDescription> => {
  const base = {
    id: state.id,
    position: state.currentPosition.clone(),
    quaternion: state.currentQuaternion.clone(),
    updatedAtMs: state.updatedAtMs,
  }
  const withState =
    state.state === undefined ? base : { ...base, state: state.state }
  return state.description === undefined
    ? withState
    : { ...withState, description: state.description }
}

export const updateMmoEntityInterpolationState = <TDescription = unknown>(
  state: MmoEntityInterpolationState<TDescription>,
  deltaMs: number,
  options: MmoEntityInterpolationOptions = {},
): MmoEntityTransformSample<TDescription> => {
  const resolved = resolveMmoEntityInterpolationOptions(options)
  if (resolved.interpolateMs === 0) {
    state.currentPosition.copy(state.targetPosition)
    state.currentQuaternion.copy(state.targetQuaternion)
    return sampleMmoEntityInterpolationState(state)
  }

  state.elapsedMs = Math.max(0, state.elapsedMs + Math.max(0, deltaMs))
  const alpha = Math.min(1, state.elapsedMs / resolved.interpolateMs)
  state.currentPosition.copy(state.previousPosition).lerp(state.targetPosition, alpha)
  state.currentQuaternion
    .copy(state.previousQuaternion)
    .slerp(state.targetQuaternion, alpha)
  return sampleMmoEntityInterpolationState(state)
}

export const mmoEntityLiveness = (
  updatedAtMs: number,
  nowMs: number,
  options: MmoEntityInterpolationOptions = {},
): MmoEntityLiveness => {
  const resolved = resolveMmoEntityInterpolationOptions(options)
  const age = Math.max(0, nowMs - updatedAtMs)
  if (age >= resolved.despawnAfterMs) {
    return "despawn"
  }
  if (age >= resolved.staleAfterMs) {
    return "stale"
  }
  return "fresh"
}

export const createMmoEntityTransformInterpolator = <TDescription = unknown>(
  initial: MmoEntityTransformSnapshot<TDescription>,
  options: MmoEntityInterpolationOptions = {},
): MmoEntityTransformInterpolator<TDescription> => {
  const resolved = resolveMmoEntityInterpolationOptions(options)
  let state = createMmoEntityInterpolationState(initial)

  return {
    apply: snapshot => {
      applyMmoEntityTransformSnapshot(state, snapshot)
    },
    update: deltaMs => updateMmoEntityInterpolationState(state, deltaMs, resolved),
    sample: () => sampleMmoEntityInterpolationState(state),
    liveness: nowMs => mmoEntityLiveness(state.updatedAtMs, nowMs, resolved),
    reset: snapshot => {
      state = createMmoEntityInterpolationState(snapshot)
    },
  }
}

export const createMmoEntityDescriptionCache = <
  TDescription,
>(): MmoEntityDescriptionCache<TDescription> => {
  const descriptions = new Map<string, TDescription>()
  return {
    get: id => descriptions.get(id),
    missing: ids => ids.filter(id => !descriptions.has(id)),
    upsert: (id, description) => {
      descriptions.set(id, description)
    },
    remove: id => descriptions.delete(id),
    clear: () => {
      descriptions.clear()
    },
  }
}
