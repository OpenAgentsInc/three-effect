import * as Three from "three"

export const pmndrsInteractionPrimitiveSourceRefs = [
  "projects/repos/examples/demos/useintersect-and-scrollcontrols/src/App.jsx",
  "projects/repos/examples/demos/cell-fracture/src/App.jsx",
  "projects/repos/examples/demos/faucets-select-highlight/src/App.jsx",
  "projects/repos/examples/demos/raycast-cycling/src/App.jsx",
  "projects/repos/drei/src/web/useCursor.tsx",
] as const

export type ClientPoint = Readonly<{
  x: number
  y: number
}>

export type RectLike = Readonly<{
  left: number
  top: number
  width: number
  height: number
}>

export type CursorController = Readonly<{
  setHovered: (hovered: boolean) => void
  dispose: () => void
}>

export const pointerNdcFromClientPoint = (
  point: ClientPoint,
  rect: RectLike,
): Three.Vector2 =>
  new Three.Vector2(
    ((point.x - rect.left) / Math.max(1, rect.width)) * 2 - 1,
    -(((point.y - rect.top) / Math.max(1, rect.height)) * 2 - 1),
  )

export const raycastFromNdc = (
  camera: Three.Camera,
  ndc: Three.Vector2,
  objects: readonly Three.Object3D[],
  recursive = true,
): Three.Intersection[] => {
  const raycaster = new Three.Raycaster()
  raycaster.setFromCamera(ndc, camera)
  return raycaster.intersectObjects([...objects], recursive)
}

export const raycastFromClientPoint = (
  camera: Three.Camera,
  point: ClientPoint,
  rect: RectLike,
  objects: readonly Three.Object3D[],
  recursive = true,
): Three.Intersection[] =>
  raycastFromNdc(
    camera,
    pointerNdcFromClientPoint(point, rect),
    objects,
    recursive,
  )

export const firstRaycastHit = (
  camera: Three.Camera,
  point: ClientPoint,
  rect: RectLike,
  objects: readonly Three.Object3D[],
): Three.Intersection | undefined =>
  raycastFromClientPoint(camera, point, rect, objects)[0]

export const setCursor = (
  container: HTMLElement,
  hovered: boolean,
  onPointerOver = "pointer",
  onPointerOut = "auto",
): void => {
  container.style.cursor = hovered ? onPointerOver : onPointerOut
}

export const createCursorController = (
  container: HTMLElement,
  onPointerOver = "pointer",
  onPointerOut = "auto",
): CursorController => {
  const original = container.style.cursor
  let hovered = false

  return {
    setHovered: next => {
      hovered = next
      setCursor(container, hovered, onPointerOver, onPointerOut)
    },
    dispose: () => {
      container.style.cursor = original
    },
  }
}

export const visibilityFromIntersection = (
  intersection: IntersectionObserverEntry,
  threshold = 0,
): boolean => intersection.isIntersecting && intersection.intersectionRatio >= threshold
