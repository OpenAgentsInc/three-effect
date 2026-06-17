import { Data, Effect } from "effect"
import * as Three from "three"
import { FirstPersonControls } from "three/examples/jsm/controls/FirstPersonControls.js"
import { FlyControls } from "three/examples/jsm/controls/FlyControls.js"
import { MapControls } from "three/examples/jsm/controls/MapControls.js"
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js"
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js"
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js"

import {
  type OrbitControlsOptions,
  applyOrbitControlsOptions,
} from "./controlsPrimitives"

// React-free Effect ports of the remaining `three/examples/jsm/controls`
// camera/object controllers that React Three Fiber and Drei expose as JSX
// wrappers. `controlsPrimitives` already covers OrbitControls; this module
// adds the rest so Foldkit scenes can choose a controller without pulling in
// `@react-three/drei`.
//
// Reference:
// - projects/repos/drei/src/core/MapControls.tsx
// - projects/repos/drei/src/web/TrackballControls.tsx
// - projects/repos/drei/src/core/FlyControls.tsx
// - projects/repos/drei/src/web/FirstPersonControls.tsx
// - projects/repos/drei/src/web/PointerLockControls.tsx
// - projects/repos/drei/src/web/TransformControls.tsx
export const pmndrsExtraControlsPrimitiveSourceRefs = [
  "projects/repos/drei/src/core/MapControls.tsx",
  "projects/repos/drei/src/web/TrackballControls.tsx",
  "projects/repos/drei/src/core/FlyControls.tsx",
  "projects/repos/drei/src/web/FirstPersonControls.tsx",
  "projects/repos/drei/src/web/PointerLockControls.tsx",
  "projects/repos/drei/src/web/TransformControls.tsx",
] as const

export class ThreeExtraControlsCreateError extends Data.TaggedError(
  "ThreeExtraControlsCreateError",
)<{
  readonly reason: string
}> {}

const reason = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

// --- MapControls ----------------------------------------------------------
// MapControls extends OrbitControls with a pan-first interaction model, so it
// reuses the same option shape and applicator.
export type MapControlsHandle = Readonly<{
  controls: MapControls
  update: Effect.Effect<void>
  dispose: Effect.Effect<void>
}>

export const createMapControls = (
  camera: Three.Camera,
  domElement: HTMLElement,
  options: OrbitControlsOptions = {},
): Effect.Effect<MapControlsHandle, ThreeExtraControlsCreateError> =>
  Effect.try({
    try: () => {
      // MapControls extends OrbitControls, so it accepts the same options.
      const controls = new MapControls(camera, domElement)
      applyOrbitControlsOptions(controls, options)
      return {
        controls,
        update: Effect.sync(() => {
          controls.update()
        }),
        dispose: Effect.sync(() => {
          controls.dispose()
        }),
      }
    },
    catch: error => new ThreeExtraControlsCreateError({ reason: reason(error) }),
  })

// --- TrackballControls ----------------------------------------------------
export type TrackballControlsOptions = Readonly<{
  enabled?: boolean
  rotateSpeed?: number
  zoomSpeed?: number
  panSpeed?: number
  noRotate?: boolean
  noZoom?: boolean
  noPan?: boolean
  staticMoving?: boolean
  dynamicDampingFactor?: number
  minDistance?: number
  maxDistance?: number
}>

export const defaultTrackballControlsOptions: Required<TrackballControlsOptions> =
  {
    enabled: true,
    rotateSpeed: 1,
    zoomSpeed: 1.2,
    panSpeed: 0.3,
    noRotate: false,
    noZoom: false,
    noPan: false,
    staticMoving: false,
    dynamicDampingFactor: 0.2,
    minDistance: 0,
    maxDistance: Number.POSITIVE_INFINITY,
  }

export const applyTrackballControlsOptions = (
  controls: TrackballControls,
  options: TrackballControlsOptions = {},
): TrackballControls => {
  const resolved = { ...defaultTrackballControlsOptions, ...options }
  controls.enabled = resolved.enabled
  controls.rotateSpeed = resolved.rotateSpeed
  controls.zoomSpeed = resolved.zoomSpeed
  controls.panSpeed = resolved.panSpeed
  controls.noRotate = resolved.noRotate
  controls.noZoom = resolved.noZoom
  controls.noPan = resolved.noPan
  controls.staticMoving = resolved.staticMoving
  controls.dynamicDampingFactor = resolved.dynamicDampingFactor
  controls.minDistance = resolved.minDistance
  controls.maxDistance = resolved.maxDistance
  return controls
}

export type TrackballControlsHandle = Readonly<{
  controls: TrackballControls
  update: Effect.Effect<void>
  dispose: Effect.Effect<void>
}>

export const createTrackballControls = (
  camera: Three.Camera,
  domElement: HTMLElement,
  options: TrackballControlsOptions = {},
): Effect.Effect<TrackballControlsHandle, ThreeExtraControlsCreateError> =>
  Effect.try({
    try: () => {
      const controls = applyTrackballControlsOptions(
        new TrackballControls(camera, domElement),
        options,
      )
      return {
        controls,
        update: Effect.sync(() => {
          controls.update()
        }),
        dispose: Effect.sync(() => {
          controls.dispose()
        }),
      }
    },
    catch: error => new ThreeExtraControlsCreateError({ reason: reason(error) }),
  })

// --- FlyControls ----------------------------------------------------------
export type FlyControlsOptions = Readonly<{
  movementSpeed?: number
  rollSpeed?: number
  dragToLook?: boolean
  autoForward?: boolean
}>

export const defaultFlyControlsOptions: Required<FlyControlsOptions> = {
  movementSpeed: 1,
  rollSpeed: 0.005,
  dragToLook: false,
  autoForward: false,
}

export const applyFlyControlsOptions = (
  controls: FlyControls,
  options: FlyControlsOptions = {},
): FlyControls => {
  const resolved = { ...defaultFlyControlsOptions, ...options }
  controls.movementSpeed = resolved.movementSpeed
  controls.rollSpeed = resolved.rollSpeed
  controls.dragToLook = resolved.dragToLook
  controls.autoForward = resolved.autoForward
  return controls
}

export type FlyControlsHandle = Readonly<{
  controls: FlyControls
  update: (delta: number) => Effect.Effect<void>
  dispose: Effect.Effect<void>
}>

export const createFlyControls = (
  camera: Three.Camera,
  domElement: HTMLElement,
  options: FlyControlsOptions = {},
): Effect.Effect<FlyControlsHandle, ThreeExtraControlsCreateError> =>
  Effect.try({
    try: () => {
      const controls = applyFlyControlsOptions(
        new FlyControls(camera, domElement),
        options,
      )
      return {
        controls,
        update: (delta: number) =>
          Effect.sync(() => {
            controls.update(delta)
          }),
        dispose: Effect.sync(() => {
          controls.dispose()
        }),
      }
    },
    catch: error => new ThreeExtraControlsCreateError({ reason: reason(error) }),
  })

// --- FirstPersonControls --------------------------------------------------
export type FirstPersonControlsOptions = Readonly<{
  enabled?: boolean
  movementSpeed?: number
  lookSpeed?: number
  lookVertical?: boolean
  autoForward?: boolean
  heightSpeed?: boolean
  heightCoef?: number
  heightMin?: number
  heightMax?: number
  constrainVertical?: boolean
  verticalMin?: number
  verticalMax?: number
}>

export const defaultFirstPersonControlsOptions: Required<FirstPersonControlsOptions> =
  {
    enabled: true,
    movementSpeed: 1,
    lookSpeed: 0.005,
    lookVertical: true,
    autoForward: false,
    heightSpeed: false,
    heightCoef: 1,
    heightMin: 0,
    heightMax: 1,
    constrainVertical: false,
    verticalMin: 0,
    verticalMax: Math.PI,
  }

export const applyFirstPersonControlsOptions = (
  controls: FirstPersonControls,
  options: FirstPersonControlsOptions = {},
): FirstPersonControls => {
  const resolved = { ...defaultFirstPersonControlsOptions, ...options }
  controls.enabled = resolved.enabled
  controls.movementSpeed = resolved.movementSpeed
  controls.lookSpeed = resolved.lookSpeed
  controls.lookVertical = resolved.lookVertical
  controls.autoForward = resolved.autoForward
  controls.heightSpeed = resolved.heightSpeed
  controls.heightCoef = resolved.heightCoef
  controls.heightMin = resolved.heightMin
  controls.heightMax = resolved.heightMax
  controls.constrainVertical = resolved.constrainVertical
  controls.verticalMin = resolved.verticalMin
  controls.verticalMax = resolved.verticalMax
  return controls
}

export type FirstPersonControlsHandle = Readonly<{
  controls: FirstPersonControls
  update: (delta: number) => Effect.Effect<void>
  dispose: Effect.Effect<void>
}>

export const createFirstPersonControls = (
  camera: Three.Camera,
  domElement: HTMLElement,
  options: FirstPersonControlsOptions = {},
): Effect.Effect<FirstPersonControlsHandle, ThreeExtraControlsCreateError> =>
  Effect.try({
    try: () => {
      const controls = applyFirstPersonControlsOptions(
        new FirstPersonControls(camera, domElement),
        options,
      )
      return {
        controls,
        update: (delta: number) =>
          Effect.sync(() => {
            controls.update(delta)
          }),
        dispose: Effect.sync(() => {
          controls.dispose()
        }),
      }
    },
    catch: error => new ThreeExtraControlsCreateError({ reason: reason(error) }),
  })

// --- PointerLockControls --------------------------------------------------
export type PointerLockControlsHandle = Readonly<{
  controls: PointerLockControls
  lock: Effect.Effect<void>
  unlock: Effect.Effect<void>
  isLocked: Effect.Effect<boolean>
  dispose: Effect.Effect<void>
}>

export const createPointerLockControls = (
  camera: Three.PerspectiveCamera,
  domElement: HTMLElement,
): Effect.Effect<PointerLockControlsHandle, ThreeExtraControlsCreateError> =>
  Effect.try({
    try: () => {
      const controls = new PointerLockControls(camera, domElement)
      const defaultErrorLogger = (
        controls as PointerLockControls & {
          _onPointerlockError?: EventListener
        }
      )._onPointerlockError
      if (defaultErrorLogger !== undefined) {
        domElement.ownerDocument.removeEventListener(
          "pointerlockerror",
          defaultErrorLogger,
        )
      }
      return {
        controls,
        lock: Effect.sync(() => {
          try {
            const request = domElement.requestPointerLock({
              unadjustedMovement: false,
            })
            void Promise.resolve(request).catch(() => undefined)
          } catch {
            // Callers that need diagnostics should listen for pointerlockerror
            // or use the higher-level WASD controller debug callback.
          }
        }),
        unlock: Effect.sync(() => {
          controls.unlock()
        }),
        isLocked: Effect.sync(() => controls.isLocked),
        dispose: Effect.sync(() => {
          controls.dispose()
        }),
      }
    },
    catch: error => new ThreeExtraControlsCreateError({ reason: reason(error) }),
  })

// --- TransformControls ----------------------------------------------------
export type TransformControlsMode = "translate" | "rotate" | "scale"

export type TransformControlsOptions = Readonly<{
  mode?: TransformControlsMode
  size?: number
  space?: "world" | "local"
  showX?: boolean
  showY?: boolean
  showZ?: boolean
  translationSnap?: number | null
  rotationSnap?: number | null
}>

export const applyTransformControlsOptions = (
  controls: TransformControls,
  options: TransformControlsOptions = {},
): TransformControls => {
  if (options.mode) controls.setMode(options.mode)
  if (options.size !== undefined) controls.setSize(options.size)
  if (options.space) controls.setSpace(options.space)
  if (options.showX !== undefined) controls.showX = options.showX
  if (options.showY !== undefined) controls.showY = options.showY
  if (options.showZ !== undefined) controls.showZ = options.showZ
  if (options.translationSnap !== undefined) {
    controls.setTranslationSnap(options.translationSnap)
  }
  if (options.rotationSnap !== undefined) {
    controls.setRotationSnap(options.rotationSnap)
  }
  return controls
}

export type TransformControlsHandle = Readonly<{
  controls: TransformControls
  // The visual gizmo Object3D that must be added to the scene graph.
  helper: Three.Object3D
  attach: (object: Three.Object3D) => Effect.Effect<void>
  detach: Effect.Effect<void>
  setMode: (mode: TransformControlsMode) => Effect.Effect<void>
  dispose: Effect.Effect<void>
}>

export const createTransformControls = (
  camera: Three.Camera,
  domElement: HTMLElement,
  options: TransformControlsOptions = {},
): Effect.Effect<TransformControlsHandle, ThreeExtraControlsCreateError> =>
  Effect.try({
    try: () => {
      const controls = applyTransformControlsOptions(
        new TransformControls(camera, domElement),
        options,
      )
      return {
        controls,
        helper: controls.getHelper(),
        attach: (object: Three.Object3D) =>
          Effect.sync(() => {
            controls.attach(object)
          }),
        detach: Effect.sync(() => {
          controls.detach()
        }),
        setMode: (mode: TransformControlsMode) =>
          Effect.sync(() => {
            controls.setMode(mode)
          }),
        dispose: Effect.sync(() => {
          controls.detach()
          controls.dispose()
        }),
      }
    },
    catch: error => new ThreeExtraControlsCreateError({ reason: reason(error) }),
  })
