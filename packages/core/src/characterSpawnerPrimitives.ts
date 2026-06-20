import * as Three from "three"

import {
  createAnimationController,
  createAnimationStateMachine,
  type AnimationController,
  type AnimationFsmHandle,
  type AnimationFsmStateDefinition,
} from "./animationPrimitives"
import { type Vector3Like, toVector3 } from "./cameraPrimitives"
import {
  createMmoEntityTransformInterpolator,
  normalizeMmoEntityTransformSnapshot,
  type MmoEntityInterpolationOptions,
  type MmoEntityTransformInput,
  type MmoEntityTransformInterpolator,
} from "./mmoEntityPrimitives"
import {
  createThirdPersonFollowCamera,
  defaultMmorpgCharacterControllerState,
  updateMmorpgCharacterController,
  type MmorpgCharacterAction,
  type MmorpgCharacterControllerOptions,
  type MmorpgCharacterControllerState,
  type ThirdPersonFollowCameraHandle,
  type ThirdPersonFollowCameraOptions,
  type WasdKeyboardState,
} from "./playerControllerPrimitives"
import {
  createTextLabel,
  type TextLabelHandle,
  type TextLabelOptions,
} from "./textLabelPrimitives"

export const quickMmorpgCharacterSpawnerPrimitiveSourceRefs = [
  "projects/repos/Quick_3D_MMORPG/client/src/spawners.js",
  "projects/repos/Quick_3D_MMORPG/client/src/player-entity.js",
  "projects/repos/Quick_3D_MMORPG/client/src/network-entity-controller.js",
] as const

/** The four animation beats the spawner FSM understands. */
export type CharacterSpawnerAction =
  | MmorpgCharacterAction
  | "spawn"

const DEFAULT_FSM_STATES: readonly AnimationFsmStateDefinition[] = [
  { name: "idle", labels: ["idle", "Idle"], locomotion: true },
  { name: "walk", labels: ["walk", "Walk"], locomotion: true },
  { name: "run", labels: ["run", "Run"], locomotion: true },
  {
    name: "spawn",
    labels: ["spawn", "Spawn", "appear", "respawn"],
    oneShot: true,
    onComplete: "idle",
    canMove: false,
  },
]

export type CharacterSpawnerNameplate = TextLabelOptions &
  Readonly<{
    /** Vertical offset above the root where the nameplate floats. */
    floatHeight?: number
  }>

type CharacterSpawnerBase = Readonly<{
  /** Display name for the floating nameplate. */
  name?: string | CharacterSpawnerNameplate
  /** Initial world position of the entity root. */
  position?: Vector3Like
  /** Animation clips harvested from the loaded GLB (or any source). */
  clips?: readonly Three.AnimationClip[]
  /** Custom FSM state table; defaults to idle/walk/run/spawn. */
  fsmStates?: readonly AnimationFsmStateDefinition[]
  /** When false, the spawn one-shot is skipped and the FSM starts at idle. */
  playSpawnAnimation?: boolean
}>

export type LocalCharacterSpawnerOptions = CharacterSpawnerBase &
  Readonly<{
    mode: "local"
    /** Keyboard state the WASD controller reads each tick. */
    keyboard: WasdKeyboardState
    controller?: MmorpgCharacterControllerOptions
    /** When supplied, a third-person follow camera tracks the root. */
    camera?: Three.Camera
    followCamera?: ThirdPersonFollowCameraOptions
  }>

export type RemoteCharacterSpawnerOptions = CharacterSpawnerBase &
  Readonly<{
    mode: "remote"
    /** Initial transform snapshot for the interpolator. */
    initial?: MmoEntityTransformInput
    interpolation?: MmoEntityInterpolationOptions
  }>

export type CharacterSpawnerOptions =
  | LocalCharacterSpawnerOptions
  | RemoteCharacterSpawnerOptions

export type CharacterSpawnerSnapshot = Readonly<{
  position: Three.Vector3
  quaternion: Three.Quaternion
  action: string
}>

export type CharacterSpawnerHandle = Readonly<{
  mode: "local" | "remote"
  /** Mountable root; carries the model (if any) and the nameplate. */
  root: Three.Group
  /** The animation FSM, when clips were provided. */
  animation?: AnimationFsmHandle
  animationController?: AnimationController
  nameplate?: TextLabelHandle
  /** Local-only: the third-person follow camera handle, if a camera was given. */
  followCamera?: ThirdPersonFollowCameraHandle
  /** Remote-only: feed an authoritative transform snapshot. */
  applyTransform?: (input: MmoEntityTransformInput) => void
  /** Advance the entity by one frame. Returns the current transform/action. */
  update: (deltaSeconds: number) => CharacterSpawnerSnapshot
  /** Re-face the nameplate at a camera. */
  faceCamera: (camera: Three.Camera) => void
  snapshot: () => CharacterSpawnerSnapshot
  dispose: () => void
}>

const resolveNameplateOptions = (
  name: string | CharacterSpawnerNameplate | undefined,
): CharacterSpawnerNameplate | undefined => {
  if (name === undefined) return undefined
  if (typeof name === "string") return { text: name, floatHeight: 2 }
  return { floatHeight: 2, ...name }
}

const buildModelRoot = (
  options: CharacterSpawnerOptions,
): { root: Three.Group; model: Three.Object3D } => {
  const root = new Three.Group()
  // Callers attach their loaded GLB scene to `root` via the returned handle's
  // `root` if they want a model; the spawner itself stays asset-agnostic so it
  // can compose with `createGltfModelInstance`/`createGltfLoader` upstream.
  const model = root
  if (options.position !== undefined) {
    root.position.copy(toVector3(options.position))
  }
  return { root, model }
}

const mountNameplate = (
  root: Three.Group,
  nameplate: CharacterSpawnerNameplate | undefined,
): TextLabelHandle | undefined => {
  if (nameplate === undefined) return undefined
  if (typeof document === "undefined") {
    // No DOM (e.g. server/test) — skip the canvas-backed label gracefully.
    return undefined
  }
  const label = createTextLabel(nameplate)
  label.object3D.position.y = nameplate.floatHeight ?? 2
  root.add(label.object3D)
  return label
}

const buildAnimation = (
  root: Three.Object3D,
  options: CharacterSpawnerOptions,
): {
  controller?: AnimationController
  fsm?: AnimationFsmHandle
} => {
  const clips = options.clips ?? []
  if (clips.length === 0) return {}
  const controller = createAnimationController(root, clips)
  const states = options.fsmStates ?? DEFAULT_FSM_STATES
  const startSpawn =
    (options.playSpawnAnimation ?? true) &&
    states.some(state => state.name === "spawn")
  const fsm = createAnimationStateMachine(
    controller,
    states,
    startSpawn ? "spawn" : "idle",
  )
  return { controller, fsm }
}

/**
 * One-call factory that composes the character primitives into a single
 * controllable (local) or interpolated (remote) entity handle:
 *
 * - a mountable root group + optional floating nameplate (`createTextLabel`)
 * - an animation FSM over harvested clips (`createAnimationController` +
 *   `createAnimationStateMachine`) with idle/walk/run/spawn beats
 * - **local**: a WASD character controller (`updateMmorpgCharacterController`)
 *   driven each tick, plus an optional third-person follow camera
 *   (`createThirdPersonFollowCamera`)
 * - **remote**: an MMO transform interpolator
 *   (`createMmoEntityTransformInterpolator`) fed authoritative snapshots
 *
 * The factory stays asset-agnostic: load the GLB upstream with
 * `createGltfLoader`/`createGltfModelInstance`, pass its `animations` as
 * `clips`, and add its scene to the returned `root`.
 */
export const createCharacterSpawner = (
  options: CharacterSpawnerOptions,
): CharacterSpawnerHandle => {
  const { root } = buildModelRoot(options)
  const nameplate = mountNameplate(
    root,
    resolveNameplateOptions(options.name),
  )
  const { controller, fsm } = buildAnimation(root, options)

  const faceCamera = (camera: Three.Camera): void => {
    nameplate?.faceCamera(camera)
  }

  const baseHandle = {
    root,
    ...(fsm === undefined ? {} : { animation: fsm }),
    ...(controller === undefined ? {} : { animationController: controller }),
    ...(nameplate === undefined ? {} : { nameplate }),
    faceCamera,
  }

  if (options.mode === "local") {
    const controllerState: MmorpgCharacterControllerState =
      defaultMmorpgCharacterControllerState()
    const followCamera =
      options.camera === undefined
        ? undefined
        : createThirdPersonFollowCamera(
            options.camera,
            root,
            options.followCamera ?? {},
          )

    let lastAction = fsm?.current().state ?? "idle"

    const snapshot = (): CharacterSpawnerSnapshot => ({
      position: root.position.clone(),
      quaternion: root.quaternion.clone(),
      action: fsm?.current().state ?? lastAction,
    })

    const update = (deltaSeconds: number): CharacterSpawnerSnapshot => {
      const canMove = fsm?.current().canMove ?? true
      const moveSnapshot = updateMmorpgCharacterController(
        root,
        canMove ? options.keyboard : EMPTY_KEYBOARD,
        controllerState,
        deltaSeconds,
        options.controller ?? {},
      )
      lastAction = moveSnapshot.action
      // Drive the FSM only between locomotion states; the spawn one-shot
      // resolves itself via onComplete.
      const currentState = fsm?.current().state
      if (
        fsm !== undefined &&
        currentState !== "spawn" &&
        currentState !== moveSnapshot.action
      ) {
        fsm.transition(moveSnapshot.action)
      }
      fsm?.update(deltaSeconds)
      controller?.update(deltaSeconds)
      followCamera?.update(deltaSeconds)
      return {
        position: moveSnapshot.position,
        quaternion: moveSnapshot.quaternion,
        action: fsm?.current().state ?? moveSnapshot.action,
      }
    }

    return {
      ...baseHandle,
      mode: "local",
      ...(followCamera === undefined ? {} : { followCamera }),
      update,
      snapshot,
      dispose: () => {
        fsm?.dispose()
        controller?.dispose()
        nameplate?.dispose()
        root.removeFromParent()
      },
    }
  }

  // Remote mode: interpolate authoritative transforms.
  const initialInput: MmoEntityTransformInput = options.initial ?? {
    id: typeof options.name === "string" ? options.name : "remote",
    position: options.position ?? [0, 0, 0],
  }
  const interpolator: MmoEntityTransformInterpolator =
    createMmoEntityTransformInterpolator(
      normalizeMmoEntityTransformSnapshot(initialInput),
      options.interpolation ?? {},
    )

  const applySample = (): CharacterSpawnerSnapshot => {
    const sample = interpolator.sample()
    root.position.copy(sample.position)
    root.quaternion.copy(sample.quaternion)
    root.updateMatrixWorld()
    return {
      position: sample.position,
      quaternion: sample.quaternion,
      action: sample.state ?? fsm?.current().state ?? "idle",
    }
  }
  applySample()

  return {
    ...baseHandle,
    mode: "remote",
    applyTransform: input => {
      interpolator.apply(normalizeMmoEntityTransformSnapshot(input))
      // Reflect a state change into the FSM if one was provided.
      if (fsm !== undefined && input.state !== undefined) {
        const current = fsm.current().state
        if (current !== "spawn" && current !== input.state) {
          fsm.transition(input.state)
        }
      }
    },
    update: deltaSeconds => {
      interpolator.update(deltaSeconds * 1000)
      fsm?.update(deltaSeconds)
      return applySample()
    },
    snapshot: () => {
      const sample = interpolator.sample()
      return {
        position: sample.position,
        quaternion: sample.quaternion,
        action: sample.state ?? fsm?.current().state ?? "idle",
      }
    },
    dispose: () => {
      fsm?.dispose()
      controller?.dispose()
      nameplate?.dispose()
      root.removeFromParent()
    },
  }
}

const EMPTY_KEYBOARD: WasdKeyboardState = {
  backward: false,
  fall: false,
  forward: false,
  left: false,
  right: false,
  rise: false,
  sprint: false,
}
