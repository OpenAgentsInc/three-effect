import * as Three from "three"

export const pmndrsAnimationPrimitiveSourceRefs = [
  "projects/repos/examples/demos/gltf-animations/src/App.jsx",
  "projects/repos/examples/demos/gltf-animations-re-used/src/App.jsx",
  "projects/repos/examples/demos/gltf-animations-tied-to-scroll/src/App.jsx",
  "projects/repos/drei/src/core/useAnimations.tsx",
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
