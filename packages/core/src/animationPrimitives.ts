import * as Three from "three"

export const pmndrsAnimationPrimitiveSourceRefs = [
  "projects/repos/examples/demos/gltf-animations/src/App.jsx",
  "projects/repos/examples/demos/gltf-animations-re-used/src/App.jsx",
  "projects/repos/examples/demos/gltf-animations-tied-to-scroll/src/App.jsx",
  "projects/repos/drei/src/core/useAnimations.tsx",
] as const

export const quickMmorpgAnimationPrimitiveSourceRefs = [
  "projects/repos/Quick_3D_MMORPG/client/src/player-state.js",
  "projects/repos/Quick_3D_MMORPG/client/src/player-entity.js",
  "projects/repos/Quick_3D_MMORPG/client/src/npc-entity.js",
] as const

export type AnimationController<TClip extends Three.AnimationClip = Three.AnimationClip> =
  Readonly<{
    root: Three.Object3D
    clips: readonly TClip[]
    names: readonly string[]
    mixer: Three.AnimationMixer
    actions: Readonly<Record<string, Three.AnimationAction>>
    action: (name: string) => Three.AnimationAction | undefined
    play: (
      name: string,
      options?: Readonly<{
        fadeIn?: number
        loop?: Three.AnimationActionLoopStyles
        repetitions?: number
        clampWhenFinished?: boolean
      }>,
    ) => Three.AnimationAction | undefined
    update: (deltaSeconds: number) => void
    stopAll: () => void
    dispose: () => void
  }>

export const createAnimationController = <
  TClip extends Three.AnimationClip = Three.AnimationClip,
>(
  root: Three.Object3D,
  clips: readonly TClip[],
): AnimationController<TClip> => {
  const mixer = new Three.AnimationMixer(root)
  const actions: Record<string, Three.AnimationAction> = {}

  for (const clip of clips) {
    if (!clip.name) continue
    actions[clip.name] = mixer.clipAction(clip, root)
  }

  const controller: AnimationController<TClip> = {
    root,
    clips,
    names: clips.map(clip => clip.name),
    mixer,
    actions,
    action: name => actions[name],
    play: (name, options = {}) => {
      const action = actions[name]
      if (!action) return undefined
      if (options.loop !== undefined) {
        action.setLoop(options.loop, options.repetitions ?? Number.POSITIVE_INFINITY)
      }
      if (options.clampWhenFinished !== undefined) {
        action.clampWhenFinished = options.clampWhenFinished
      }
      action.reset()
      if (options.fadeIn !== undefined && options.fadeIn > 0) {
        action.fadeIn(options.fadeIn)
      }
      action.play()
      return action
    },
    update: deltaSeconds => {
      mixer.update(deltaSeconds)
    },
    stopAll: () => {
      mixer.stopAllAction()
    },
    dispose: () => {
      mixer.stopAllAction()
      for (const clip of clips) {
        mixer.uncacheClip(clip)
        mixer.uncacheRoot(root)
      }
    },
  }

  return controller
}

export const animationProgressFromScroll = (
  action: Three.AnimationAction,
  clip: Three.AnimationClip,
  offset: number,
): void => {
  action.paused = true
  action.time = Three.MathUtils.clamp(offset, 0, 1) * clip.duration
}

export type AnimationFsmStateDefinition = Readonly<{
  name: string
  clipName?: string
  labels?: readonly string[]
  canMove?: boolean
  locomotion?: boolean
  oneShot?: boolean
  onComplete?: string
  fadeSeconds?: number
  loop?: Three.AnimationActionLoopStyles
  repetitions?: number
  clampWhenFinished?: boolean
}>

export type AnimationFsmOptions = Readonly<{
  defaultFadeSeconds?: number
  preserveLocomotionPhase?: boolean
}>

export type AnimationFsmSnapshot = Readonly<{
  state: string
  clipName?: string
  canMove: boolean
  locomotion: boolean
}>

export type AnimationFsmHandle = Readonly<{
  current: () => AnimationFsmSnapshot
  transition: (name: string) => boolean
  update: (deltaSeconds: number) => void
  action: () => Three.AnimationAction | undefined
  dispose: () => void
}>

const defaultAnimationFsmOptions: Required<AnimationFsmOptions> = {
  defaultFadeSeconds: 0.2,
  preserveLocomotionPhase: true,
}

export const animationActionPhaseRatio = (
  action: Three.AnimationAction,
): number => {
  const duration = Math.max(0.000001, action.getClip().duration)
  return Three.MathUtils.clamp(action.time / duration, 0, 1)
}

export const syncAnimationActionPhase = (
  source: Three.AnimationAction,
  target: Three.AnimationAction,
): void => {
  target.time = animationActionPhaseRatio(source) * target.getClip().duration
}

export const findAnimationActionByLabels = (
  controller: AnimationController,
  labels: readonly string[],
): Three.AnimationAction | undefined => {
  for (const label of labels) {
    const exact = controller.action(label)
    if (exact !== undefined) {
      return exact
    }
  }

  const normalizedLabels = labels.map(label => label.toLowerCase())
  const foundName = controller.names.find(name =>
    normalizedLabels.some(label => name.toLowerCase().includes(label)),
  )
  return foundName === undefined ? undefined : controller.action(foundName)
}

const stateClipLabels = (
  state: AnimationFsmStateDefinition,
): readonly string[] => {
  if (state.labels !== undefined) {
    return state.labels
  }
  if (state.clipName !== undefined) {
    return [state.clipName]
  }
  return [state.name]
}

const configureFsmAction = (
  action: Three.AnimationAction,
  state: AnimationFsmStateDefinition,
): void => {
  action.enabled = true
  if (state.loop !== undefined) {
    action.setLoop(state.loop, state.repetitions ?? Number.POSITIVE_INFINITY)
  } else if (state.oneShot === true) {
    action.setLoop(Three.LoopOnce, 1)
  }
  action.clampWhenFinished = state.clampWhenFinished ?? state.oneShot === true
}

export const createAnimationStateMachine = (
  controller: AnimationController,
  states: readonly AnimationFsmStateDefinition[],
  initialStateName: string,
  options: AnimationFsmOptions = {},
): AnimationFsmHandle => {
  const resolved = { ...defaultAnimationFsmOptions, ...options }
  const definitions = new Map(states.map(state => [state.name, state]))
  const initialState = definitions.get(initialStateName) ?? states[0]
  if (initialState === undefined) {
    throw new Error("createAnimationStateMachine: at least one state is required")
  }
  let currentState: AnimationFsmStateDefinition = initialState
  let currentAction: Three.AnimationAction | undefined

  const transition = (name: string): boolean => {
    const nextState = definitions.get(name)
    if (nextState === undefined) {
      return false
    }
    if (nextState.name === currentState.name && currentAction !== undefined) {
      return true
    }

    const previousState = currentState
    const previousAction = currentAction
    const nextAction = findAnimationActionByLabels(
      controller,
      stateClipLabels(nextState),
    )
    if (nextAction === undefined) {
      return false
    }

    currentState = nextState
    currentAction = nextAction
    nextAction.reset()
    configureFsmAction(nextAction, nextState)

    if (
      previousAction !== undefined &&
      resolved.preserveLocomotionPhase &&
      previousState.locomotion === true &&
      nextState.locomotion === true
    ) {
      syncAnimationActionPhase(previousAction, nextAction)
    }

    const fadeSeconds = nextState.fadeSeconds ?? resolved.defaultFadeSeconds
    nextAction.play()
    if (previousAction !== undefined && previousAction !== nextAction) {
      if (fadeSeconds > 0) {
        previousAction.crossFadeTo(nextAction, fadeSeconds, true)
      } else {
        previousAction.stop()
      }
    }
    return true
  }

  const onFinished = (event: { action: Three.AnimationAction }): void => {
    if (event.action !== currentAction || currentState.oneShot !== true) {
      return
    }
    transition(currentState.onComplete ?? initialStateName)
  }

  controller.mixer.addEventListener("finished", onFinished)
  transition(currentState.name)

  return {
    current: () => {
      const base = {
        state: currentState.name,
        canMove: currentState.canMove ?? true,
        locomotion: currentState.locomotion ?? false,
      }
      const action = currentAction
      return action === undefined
        ? base
        : { ...base, clipName: action.getClip().name }
    },
    transition,
    update: deltaSeconds => {
      controller.update(deltaSeconds)
    },
    action: () => currentAction,
    dispose: () => {
      controller.mixer.removeEventListener("finished", onFinished)
    },
  }
}
