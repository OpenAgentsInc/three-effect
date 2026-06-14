import * as Three from "three"

export const pmndrsCameraPrimitiveSourceRefs = [
  "projects/repos/examples/demos/bounds-and-makedefault/src/App.jsx",
  "projects/repos/examples/demos/stage-presets-gltfjsx/src/App.jsx",
  "projects/repos/drei/src/core/PerspectiveCamera.tsx",
  "projects/repos/drei/src/core/OrthographicCamera.tsx",
  "projects/repos/drei/src/core/Bounds.tsx",
  "projects/repos/drei/src/core/Center.tsx",
] as const

export type Vector3Like = Three.Vector3 | readonly [number, number, number]

export type CanvasSize = Readonly<{
  width: number
  height: number
}>

export type PerspectiveCameraOptions = Readonly<{
  fov?: number
  aspect?: number
  near?: number
  far?: number
  position?: Vector3Like
  target?: Vector3Like
}>

export type OrthographicCameraOptions = Readonly<{
  width?: number
  height?: number
  near?: number
  far?: number
  zoom?: number
  position?: Vector3Like
  target?: Vector3Like
}>

export type BoundsMeasurement = Readonly<{
  box: Three.Box3
  size: Three.Vector3
  center: Three.Vector3
  radius: number
  maxSize: number
}>

export type FitCameraOptions = Readonly<{
  margin?: number
  clip?: boolean
  direction?: Vector3Like
}>

export type FitCameraResult = Readonly<{
  box: Three.Box3
  size: Three.Vector3
  center: Three.Vector3
  distance: number
  radius: number
}>

export type CenterObjectOptions = Readonly<{
  top?: boolean
  right?: boolean
  bottom?: boolean
  left?: boolean
  front?: boolean
  back?: boolean
  disableX?: boolean
  disableY?: boolean
  disableZ?: boolean
  precise?: boolean
}>

export type CenterObjectResult = Readonly<{
  box: Three.Box3
  size: Three.Vector3
  center: Three.Vector3
  offset: Three.Vector3
}>

export const toVector3 = (value: Vector3Like): Three.Vector3 =>
  value instanceof Three.Vector3
    ? value.clone()
    : new Three.Vector3(value[0], value[1], value[2])

export const createPerspectiveCamera = (
  options: PerspectiveCameraOptions = {},
): Three.PerspectiveCamera => {
  const camera = new Three.PerspectiveCamera(
    options.fov ?? 50,
    options.aspect ?? 1,
    options.near ?? 0.1,
    options.far ?? 2000,
  )

  if (options.position) camera.position.copy(toVector3(options.position))
  if (options.target) camera.lookAt(toVector3(options.target))
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()

  return camera
}

export const createOrthographicCamera = (
  options: OrthographicCameraOptions = {},
): Three.OrthographicCamera => {
  const width = options.width ?? 2
  const height = options.height ?? 2
  const camera = new Three.OrthographicCamera(
    width / -2,
    width / 2,
    height / 2,
    height / -2,
    options.near ?? 0.1,
    options.far ?? 2000,
  )

  camera.zoom = options.zoom ?? 1
  if (options.position) camera.position.copy(toVector3(options.position))
  if (options.target) camera.lookAt(toVector3(options.target))
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()

  return camera
}

export const updateCameraForSize = (
  camera: Three.Camera,
  size: CanvasSize,
): void => {
  if (camera instanceof Three.PerspectiveCamera) {
    camera.aspect = size.width / Math.max(1, size.height)
    camera.updateProjectionMatrix()
  } else if (camera instanceof Three.OrthographicCamera) {
    camera.left = size.width / -2
    camera.right = size.width / 2
    camera.top = size.height / 2
    camera.bottom = size.height / -2
    camera.updateProjectionMatrix()
  }
}

export const viewportAtDistance = (
  camera: Three.Camera,
  distance: number,
  size?: CanvasSize,
): { width: number; height: number; factor: number; distance: number } => {
  if (camera instanceof Three.PerspectiveCamera) {
    const height =
      2 * Math.tan(Three.MathUtils.degToRad(camera.fov) / 2) * Math.abs(distance)
    const width = height * camera.aspect
    return {
      width,
      height,
      factor: size ? size.width / width : 1,
      distance,
    }
  }

  if (camera instanceof Three.OrthographicCamera) {
    const width = (camera.right - camera.left) / camera.zoom
    const height = (camera.top - camera.bottom) / camera.zoom
    return {
      width,
      height,
      factor: size ? size.width / width : 1,
      distance,
    }
  }

  return {
    width: size?.width ?? 1,
    height: size?.height ?? 1,
    factor: 1,
    distance,
  }
}

export const measureBounds = (
  objectOrBox: Three.Object3D | Three.Box3,
  precise = true,
): BoundsMeasurement => {
  const box =
    objectOrBox instanceof Three.Box3
      ? objectOrBox.clone()
      : new Three.Box3().setFromObject(objectOrBox, precise)
  const size = box.getSize(new Three.Vector3())
  const center = box.getCenter(new Three.Vector3())
  const sphere = box.getBoundingSphere(new Three.Sphere())

  return {
    box,
    size,
    center,
    radius: sphere.radius,
    maxSize: Math.max(size.x, size.y, size.z),
  }
}

export const cameraFitDistance = (
  camera: Three.PerspectiveCamera,
  size: Three.Vector3,
  margin = 1.2,
): number => {
  const verticalFov = Three.MathUtils.degToRad(camera.fov)
  const horizontalFov =
    2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect)
  const heightDistance = size.y / (2 * Math.tan(verticalFov / 2))
  const widthDistance = size.x / (2 * Math.tan(horizontalFov / 2))
  const depthDistance = size.z / 2
  return margin * Math.max(heightDistance, widthDistance, depthDistance, 0.0001)
}

export const fitCameraToBox = (
  camera: Three.PerspectiveCamera | Three.OrthographicCamera,
  objectOrBox: Three.Object3D | Three.Box3,
  options: FitCameraOptions = {},
): FitCameraResult => {
  const { box, size, center, radius } = measureBounds(objectOrBox)
  const margin = options.margin ?? 1.2

  if (camera instanceof Three.PerspectiveCamera) {
    const distance = cameraFitDistance(camera, size, margin)
    const direction = options.direction
      ? toVector3(options.direction).normalize()
      : camera.position.clone().sub(center).normalize()

    if (direction.lengthSq() === 0) direction.set(0, 0, 1)
    camera.position.copy(center).addScaledVector(direction, distance)
    camera.lookAt(center)

    if (options.clip ?? true) {
      camera.near = Math.max(0.01, distance - radius * margin * 2)
      camera.far = Math.max(camera.near + 1, distance + radius * margin * 2)
    }

    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()

    return { box, size, center, distance, radius }
  }

  const width = Math.max(0.0001, size.x)
  const height = Math.max(0.0001, size.y)
  const zoomX = (camera.right - camera.left) / width
  const zoomY = (camera.top - camera.bottom) / height
  const zoom = Math.min(zoomX, zoomY) / margin
  camera.zoom = zoom
  camera.lookAt(center)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()

  return { box, size, center, distance: camera.position.distanceTo(center), radius }
}

export const computeCenterOffset = (
  objectOrBox: Three.Object3D | Three.Box3,
  options: CenterObjectOptions = {},
): CenterObjectResult => {
  const { box, size, center } = measureBounds(
    objectOrBox,
    options.precise ?? true,
  )
  const verticalAlignment = options.top ? size.y / 2 : options.bottom ? -size.y / 2 : 0
  const horizontalAlignment = options.left ? -size.x / 2 : options.right ? size.x / 2 : 0
  const depthAlignment = options.front ? size.z / 2 : options.back ? -size.z / 2 : 0
  const offset = new Three.Vector3(
    options.disableX ? 0 : -center.x + horizontalAlignment,
    options.disableY ? 0 : -center.y + verticalAlignment,
    options.disableZ ? 0 : -center.z + depthAlignment,
  )

  return { box, size, center, offset }
}

export const centerObject3D = (
  object: Three.Object3D,
  options: CenterObjectOptions = {},
): CenterObjectResult => {
  const result = computeCenterOffset(object, options)
  object.position.add(result.offset)
  object.updateMatrixWorld(true)
  return result
}
