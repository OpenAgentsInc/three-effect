import { Data, Effect } from "effect"
import * as Three from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

import { type Vector3Like, toVector3 } from "./cameraPrimitives"

export const pmndrsControlsPrimitiveSourceRefs = [
  "projects/repos/examples/demos/backdrop-and-cables/src/App.jsx",
  "projects/repos/examples/demos/basic-demo/src/App.jsx",
  "projects/repos/examples/demos/bounds-and-makedefault/src/App.jsx",
  "projects/repos/examples/demos/instances/src/App.jsx",
  "projects/repos/examples/demos/merged-instance/src/App.jsx",
  "projects/repos/drei/src/core/OrbitControls.tsx",
  "projects/repos/drei/src/core/CameraControls.tsx",
] as const

export class ThreeControlsCreateError extends Data.TaggedError(
  "ThreeControlsCreateError",
)<{
  readonly reason: string
}> {}

export type OrbitControlsOptions = Readonly<{
  enabled?: boolean
  target?: Vector3Like
  enableDamping?: boolean
  dampingFactor?: number
  autoRotate?: boolean
  autoRotateSpeed?: number
  enableZoom?: boolean
  enableRotate?: boolean
  enablePan?: boolean
  minDistance?: number
  maxDistance?: number
  minPolarAngle?: number
  maxPolarAngle?: number
  minAzimuthAngle?: number
  maxAzimuthAngle?: number
  rotateSpeed?: number
  zoomSpeed?: number
  panSpeed?: number
  screenSpacePanning?: boolean
}>

export type OrbitControlsHandle = Readonly<{
  controls: OrbitControls
  update: Effect.Effect<void>
  dispose: Effect.Effect<void>
}>

export const defaultOrbitControlsOptions: Required<
  Omit<OrbitControlsOptions, "target">
> = {
  enabled: true,
  enableDamping: true,
  dampingFactor: 0.05,
  autoRotate: false,
  autoRotateSpeed: 2,
  enableZoom: true,
  enableRotate: true,
  enablePan: true,
  minDistance: 0,
  maxDistance: Number.POSITIVE_INFINITY,
  minPolarAngle: 0,
  maxPolarAngle: Math.PI,
  minAzimuthAngle: Number.NEGATIVE_INFINITY,
  maxAzimuthAngle: Number.POSITIVE_INFINITY,
  rotateSpeed: 1,
  zoomSpeed: 1,
  panSpeed: 1,
  screenSpacePanning: true,
}

export const applyOrbitControlsOptions = (
  controls: OrbitControls,
  options: OrbitControlsOptions = {},
): OrbitControls => {
  const resolved = { ...defaultOrbitControlsOptions, ...options }
  controls.enabled = resolved.enabled
  controls.enableDamping = resolved.enableDamping
  controls.dampingFactor = resolved.dampingFactor
  controls.autoRotate = resolved.autoRotate
  controls.autoRotateSpeed = resolved.autoRotateSpeed
  controls.enableZoom = resolved.enableZoom
  controls.enableRotate = resolved.enableRotate
  controls.enablePan = resolved.enablePan
  controls.minDistance = resolved.minDistance
  controls.maxDistance = resolved.maxDistance
  controls.minPolarAngle = resolved.minPolarAngle
  controls.maxPolarAngle = resolved.maxPolarAngle
  controls.minAzimuthAngle = resolved.minAzimuthAngle
  controls.maxAzimuthAngle = resolved.maxAzimuthAngle
  controls.rotateSpeed = resolved.rotateSpeed
  controls.zoomSpeed = resolved.zoomSpeed
  controls.panSpeed = resolved.panSpeed
  controls.screenSpacePanning = resolved.screenSpacePanning
  if (options.target) controls.target.copy(toVector3(options.target))
  controls.update()
  return controls
}

export const createOrbitControls = (
  camera: Three.Camera,
  domElement: HTMLElement,
  options: OrbitControlsOptions = {},
): Effect.Effect<OrbitControlsHandle, ThreeControlsCreateError> =>
  Effect.try({
    try: () => {
      const controls = applyOrbitControlsOptions(
        new OrbitControls(camera, domElement),
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
    catch: error =>
      new ThreeControlsCreateError({
        reason: error instanceof Error ? error.message : String(error),
      }),
  })

export const focusOrbitControls = (
  controls: OrbitControls,
  camera: Three.Camera,
  target: Vector3Like,
  distance?: number,
): void => {
  const nextTarget = toVector3(target)
  if (distance !== undefined) {
    const direction = camera.position.clone().sub(controls.target).normalize()
    if (direction.lengthSq() === 0) direction.set(0, 0, 1)
    camera.position.copy(nextTarget).addScaledVector(direction, distance)
  }
  controls.target.copy(nextTarget)
  controls.update()
}
