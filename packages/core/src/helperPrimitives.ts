import * as Three from "three"
import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper.js"
import { VertexNormalsHelper } from "three/examples/jsm/helpers/VertexNormalsHelper.js"

// React-free factories for the scene debug/gizmo helpers that React Three
// Fiber exposes as intrinsic elements (`<gridHelper>`, `<axesHelper>`,
// `<cameraHelper>`, light helpers) and that Drei wraps as `<Grid>`,
// `<GizmoHelper>`, and `useHelper`. These keep a `dispose` callback so Foldkit
// scenes can release helper geometries/materials deterministically, matching
// the rest of three-effect's resource discipline.
//
// Reference:
// - projects/repos/react-three-fiber (intrinsic helper elements)
// - projects/repos/drei/src/core/Grid.tsx
// - projects/repos/drei/src/core/GizmoHelper.tsx
// - projects/repos/drei/src/core/Helper.tsx (useHelper)
export const pmndrsHelperPrimitiveSourceRefs = [
  "projects/repos/react-three-fiber/packages/fiber/src/three-types.ts",
  "projects/repos/drei/src/core/Grid.tsx",
  "projects/repos/drei/src/core/GizmoHelper.tsx",
  "projects/repos/drei/src/core/Helper.tsx",
] as const

type Disposable = Readonly<{ dispose: () => void }>

// Dispose helper geometry/material that the helper itself owns. Helpers like
// CameraHelper expose `dispose()`; line-based helpers expose geometry/material.
const disposeHelper = (helper: Three.Object3D): void => {
  const maybe = helper as Partial<Disposable> & {
    geometry?: { dispose?: () => void }
    material?: { dispose?: () => void } | { dispose?: () => void }[]
  }
  if (typeof maybe.dispose === "function") {
    maybe.dispose()
    return
  }
  maybe.geometry?.dispose?.()
  const material = maybe.material
  if (Array.isArray(material)) {
    for (const item of material) item.dispose?.()
  } else {
    material?.dispose?.()
  }
}

export type HelperHandle<THelper extends Three.Object3D> = Readonly<{
  helper: THelper
  dispose: () => void
}>

const handle = <THelper extends Three.Object3D>(
  helper: THelper,
): HelperHandle<THelper> => ({
  helper,
  dispose: () => disposeHelper(helper),
})

// --- Grid -----------------------------------------------------------------
export type GridHelperOptions = Readonly<{
  size?: number
  divisions?: number
  colorCenterLine?: Three.ColorRepresentation
  colorGrid?: Three.ColorRepresentation
}>

export const createGridHelper = (
  options: GridHelperOptions = {},
): HelperHandle<Three.GridHelper> =>
  handle(
    new Three.GridHelper(
      options.size ?? 10,
      options.divisions ?? 10,
      options.colorCenterLine ?? 0x444444,
      options.colorGrid ?? 0x888888,
    ),
  )

export type PolarGridHelperOptions = Readonly<{
  radius?: number
  sectors?: number
  rings?: number
  divisions?: number
  color1?: Three.ColorRepresentation
  color2?: Three.ColorRepresentation
}>

export const createPolarGridHelper = (
  options: PolarGridHelperOptions = {},
): HelperHandle<Three.PolarGridHelper> =>
  handle(
    new Three.PolarGridHelper(
      options.radius ?? 10,
      options.sectors ?? 16,
      options.rings ?? 8,
      options.divisions ?? 64,
      options.color1 ?? 0x444444,
      options.color2 ?? 0x888888,
    ),
  )

// --- Axes / arrows --------------------------------------------------------
export const createAxesHelper = (
  size = 1,
): HelperHandle<Three.AxesHelper> => handle(new Three.AxesHelper(size))

export type ArrowHelperOptions = Readonly<{
  dir?: Three.Vector3
  origin?: Three.Vector3
  length?: number
  color?: Three.ColorRepresentation
  headLength?: number
  headWidth?: number
}>

export const createArrowHelper = (
  options: ArrowHelperOptions = {},
): HelperHandle<Three.ArrowHelper> => {
  const dir = (options.dir ?? new Three.Vector3(0, 1, 0)).clone().normalize()
  const arrow = new Three.ArrowHelper(
    dir,
    options.origin ?? new Three.Vector3(0, 0, 0),
    options.length ?? 1,
    options.color ?? 0xffff00,
    options.headLength,
    options.headWidth,
  )
  return handle(arrow)
}

// --- Bounding boxes -------------------------------------------------------
export const createBoxHelper = (
  object: Three.Object3D,
  color: Three.ColorRepresentation = 0xffff00,
): HelperHandle<Three.BoxHelper> =>
  handle(new Three.BoxHelper(object, new Three.Color(color).getHex()))

export const createBox3Helper = (
  box: Three.Box3,
  color: Three.ColorRepresentation = 0xffff00,
): HelperHandle<Three.Box3Helper> =>
  handle(new Three.Box3Helper(box, new Three.Color(color)))

export const createPlaneHelper = (
  plane: Three.Plane,
  size = 1,
  color: Three.ColorRepresentation = 0xffff00,
): HelperHandle<Three.PlaneHelper> =>
  handle(new Three.PlaneHelper(plane, size, new Three.Color(color).getHex()))

// --- Camera / skeleton ----------------------------------------------------
export const createCameraHelper = (
  camera: Three.Camera,
): HelperHandle<Three.CameraHelper> =>
  handle(new Three.CameraHelper(camera))

export const createSkeletonHelper = (
  object: Three.Object3D,
): HelperHandle<Three.SkeletonHelper> =>
  handle(new Three.SkeletonHelper(object))

// --- Light helpers --------------------------------------------------------
export const createDirectionalLightHelper = (
  light: Three.DirectionalLight,
  size = 1,
  color?: Three.ColorRepresentation,
): HelperHandle<Three.DirectionalLightHelper> =>
  handle(new Three.DirectionalLightHelper(light, size, color))

export const createPointLightHelper = (
  light: Three.PointLight,
  size = 1,
  color?: Three.ColorRepresentation,
): HelperHandle<Three.PointLightHelper> =>
  handle(new Three.PointLightHelper(light, size, color))

export const createSpotLightHelper = (
  light: Three.SpotLight,
  color?: Three.ColorRepresentation,
): HelperHandle<Three.SpotLightHelper> =>
  handle(new Three.SpotLightHelper(light, color))

export const createHemisphereLightHelper = (
  light: Three.HemisphereLight,
  size = 1,
  color?: Three.ColorRepresentation,
): HelperHandle<Three.HemisphereLightHelper> =>
  handle(new Three.HemisphereLightHelper(light, size, color))

export const createRectAreaLightHelper = (
  light: Three.RectAreaLight,
  color?: Three.ColorRepresentation,
): HelperHandle<RectAreaLightHelper> =>
  handle(new RectAreaLightHelper(light, color))

// --- Vertex normals -------------------------------------------------------
export const createVertexNormalsHelper = (
  object: Three.Object3D,
  size = 1,
  color: Three.ColorRepresentation = 0xff0000,
): HelperHandle<VertexNormalsHelper> =>
  handle(new VertexNormalsHelper(object, size, new Three.Color(color).getHex()))
