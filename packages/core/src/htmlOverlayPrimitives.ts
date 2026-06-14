import * as Three from "three"

import { type CanvasSize, type Vector3Like, toVector3 } from "./cameraPrimitives"

export const pmndrsHtmlOverlayPrimitiveSourceRefs = [
  "projects/repos/examples/demos/html-annotations/src/App.jsx",
  "projects/repos/examples/demos/html-markers/src/App.jsx",
  "projects/repos/examples/demos/mixing-html-and-webgl/src/App.jsx",
  "projects/repos/drei/src/web/Html.tsx",
] as const

export type WorldTarget = Three.Object3D | Three.Vector3 | Vector3Like

export type ProjectedScreenPoint = Readonly<{
  x: number
  y: number
  ndc: readonly [number, number, number]
  visible: boolean
  behindCamera: boolean
}>

export type HtmlOverlayStyleOptions = Readonly<{
  center?: boolean
  fullscreen?: boolean
  pointerEvents?: string
  distanceFactor?: number
  zIndexRange?: readonly [number, number]
  hidden?: boolean
}>

export type HtmlOverlayStyle = Readonly<Record<string, string>>

const worldPosition = (target: WorldTarget): Three.Vector3 => {
  if (target instanceof Three.Object3D) {
    target.updateMatrixWorld()
    return new Three.Vector3().setFromMatrixPosition(target.matrixWorld)
  }

  return target instanceof Three.Vector3 ? target.clone() : toVector3(target)
}

export const isPointBehindCamera = (
  point: WorldTarget,
  camera: Three.Camera,
): boolean => {
  const objectPosition = worldPosition(point)
  const cameraPosition = new Three.Vector3().setFromMatrixPosition(camera.matrixWorld)
  const delta = objectPosition.sub(cameraPosition)
  const cameraDirection = camera.getWorldDirection(new Three.Vector3())
  return delta.angleTo(cameraDirection) > Math.PI / 2
}

export const projectWorldToScreen = (
  point: WorldTarget,
  camera: Three.Camera,
  size: CanvasSize,
): ProjectedScreenPoint => {
  camera.updateMatrixWorld()
  const projected = worldPosition(point).project(camera)
  const x = (projected.x * size.width) / 2 + size.width / 2
  const y = -(projected.y * size.height) / 2 + size.height / 2
  const visible =
    projected.x >= -1 &&
    projected.x <= 1 &&
    projected.y >= -1 &&
    projected.y <= 1 &&
    projected.z >= -1 &&
    projected.z <= 1

  return {
    x,
    y,
    ndc: [projected.x, projected.y, projected.z],
    visible,
    behindCamera: isPointBehindCamera(point, camera),
  }
}

export const htmlDistanceScale = (
  point: WorldTarget,
  camera: Three.Camera,
  distanceFactor?: number,
): number => {
  if (distanceFactor === undefined) return 1
  if (camera instanceof Three.OrthographicCamera) return camera.zoom * distanceFactor

  if (camera instanceof Three.PerspectiveCamera) {
    const objectPosition = worldPosition(point)
    const cameraPosition = new Three.Vector3().setFromMatrixPosition(camera.matrixWorld)
    const verticalFov = Three.MathUtils.degToRad(camera.fov)
    const distance = objectPosition.distanceTo(cameraPosition)
    const visibleHeight = 2 * Math.tan(verticalFov / 2) * distance
    return visibleHeight === 0 ? 1 : distanceFactor / visibleHeight
  }

  return 1
}

export const htmlOverlayZIndex = (
  point: WorldTarget,
  camera: Three.PerspectiveCamera | Three.OrthographicCamera,
  zIndexRange: readonly [number, number] = [16777271, 0],
): number => {
  const objectPosition = worldPosition(point)
  const cameraPosition = new Three.Vector3().setFromMatrixPosition(camera.matrixWorld)
  const distance = objectPosition.distanceTo(cameraPosition)
  const slope = (zIndexRange[1] - zIndexRange[0]) / (camera.far - camera.near)
  const intercept = zIndexRange[1] - slope * camera.far
  return Math.round(slope * distance + intercept)
}

export const isWorldPointOccluded = (
  point: WorldTarget,
  camera: Three.Camera,
  occluders: readonly Three.Object3D[],
  epsilon = 0.0001,
): boolean => {
  if (occluders.length === 0) return false

  const target = worldPosition(point)
  const origin = new Three.Vector3().setFromMatrixPosition(camera.matrixWorld)
  const direction = target.clone().sub(origin)
  const pointDistance = direction.length()
  if (pointDistance <= epsilon) return false

  const raycaster = new Three.Raycaster(origin, direction.normalize())
  const [first] = raycaster.intersectObjects([...occluders], true)
  return first ? first.distance < pointDistance - epsilon : false
}

export const htmlOverlayStyle = (
  point: WorldTarget,
  camera: Three.Camera,
  size: CanvasSize,
  options: HtmlOverlayStyleOptions = {},
): HtmlOverlayStyle => {
  if (options.fullscreen) {
    return {
      position: "absolute",
      inset: "0",
      pointerEvents: options.pointerEvents ?? "auto",
      display: options.hidden ? "none" : "block",
    }
  }

  const projected = projectWorldToScreen(point, camera, size)
  const scale = htmlDistanceScale(point, camera, options.distanceFactor)
  const anchor = options.center ? " translate(-50%, -50%)" : ""
  const style: Record<string, string> = {
    position: "absolute",
    top: "0px",
    left: "0px",
    transform: `translate3d(${projected.x}px, ${projected.y}px, 0)${anchor} scale(${scale})`,
    transformOrigin: options.center ? "50% 50%" : "0 0",
    pointerEvents: options.pointerEvents ?? "auto",
    display: options.hidden || projected.behindCamera || !projected.visible ? "none" : "block",
  }

  if (
    (camera instanceof Three.PerspectiveCamera ||
      camera instanceof Three.OrthographicCamera) &&
    options.zIndexRange
  ) {
    style.zIndex = String(htmlOverlayZIndex(point, camera, options.zIndexRange))
  }

  return style
}
