import * as Three from "three"
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js"
import { Line2 } from "three/examples/jsm/lines/Line2.js"
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js"
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js"
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js"

export const pmndrsSceneGraphPrimitiveSourceRefs = [
  "projects/repos/examples/demos/cards/src/App.jsx",
  "projects/repos/examples/demos/clones/src/App.jsx",
  "projects/repos/examples/demos/edgesgeometry/src/App.jsx",
  "projects/repos/examples/demos/faucets-select-highlight/src/App.jsx",
  "projects/repos/examples/demos/flying-bananas/src/App.jsx",
  "projects/repos/examples/demos/ground-projected-envmaps-lamina/src/App.jsx",
  "projects/repos/examples/demos/iridescent-decals/src/App.jsx",
  "projects/repos/examples/demos/merged-instance/src/App.jsx",
  "projects/repos/examples/demos/object-clump/src/App.jsx",
  "projects/repos/examples/demos/re-using-geometry-and-level-of-detail/src/App.jsx",
  "projects/repos/drei/src/core/Billboard.tsx",
  "projects/repos/drei/src/core/Clone.tsx",
  "projects/repos/drei/src/core/Decal.tsx",
  "projects/repos/drei/src/core/Detailed.tsx",
  "projects/repos/drei/src/core/Edges.tsx",
  "projects/repos/drei/src/core/Line.tsx",
  "projects/repos/drei/src/core/Merged.tsx",
  "projects/repos/drei/src/core/Outlines.tsx",
] as const

export type CloneOptions = Readonly<{
  deep?: boolean | "materialsOnly" | "geometriesOnly"
  castShadow?: boolean
  receiveShadow?: boolean
}>

export type Line2Options = Readonly<{
  color?: Three.ColorRepresentation
  linewidth?: number
  resolution?: readonly [number, number]
  dashed?: boolean
}>

export const cloneObject3D = <TObject extends Three.Object3D>(
  object: TObject,
  options: CloneOptions = {},
): TObject => {
  const clone = object.clone(true) as TObject
  clone.traverse(child => {
    const mesh = child as Three.Mesh
    if (mesh.isMesh) {
      if (options.deep === true || options.deep === "geometriesOnly") {
        mesh.geometry = mesh.geometry.clone()
      }
      if (options.deep === true || options.deep === "materialsOnly") {
        if (Array.isArray(mesh.material)) mesh.material = mesh.material.map(item => item.clone())
        else mesh.material = mesh.material.clone()
      }
      if (options.castShadow !== undefined) mesh.castShadow = options.castShadow
      if (options.receiveShadow !== undefined) mesh.receiveShadow = options.receiveShadow
    }
  })
  return clone
}

export const createDetailedLod = (
  levels: readonly Readonly<{ object: Three.Object3D; distance: number; hysteresis?: number }>[],
): Three.LOD => {
  const lod = new Three.LOD()
  for (const level of levels) {
    lod.addLevel(level.object, level.distance, level.hysteresis ?? 0)
  }
  return lod
}

export const mergeBufferGeometries = (
  geometries: readonly Three.BufferGeometry[],
  useGroups = false,
): Three.BufferGeometry =>
  BufferGeometryUtils.mergeGeometries([...geometries], useGroups)

export const createEdges = (
  geometry: Three.BufferGeometry,
  options: Readonly<{
    threshold?: number
    color?: Three.ColorRepresentation
  }> = {},
): Three.LineSegments<Three.EdgesGeometry, Three.LineBasicMaterial> =>
  new Three.LineSegments(
    new Three.EdgesGeometry(geometry, options.threshold ?? 15),
    new Three.LineBasicMaterial({ color: options.color ?? 0x000000 }),
  )

export const createOutlines = (
  mesh: Three.Mesh,
  options: Readonly<{
    color?: Three.ColorRepresentation
    thickness?: number
    opacity?: number
  }> = {},
): Three.Mesh => {
  const outline = new Three.Mesh(
    mesh.geometry.clone(),
    new Three.MeshBasicMaterial({
      color: options.color ?? 0x000000,
      side: Three.BackSide,
      transparent: (options.opacity ?? 1) < 1,
      opacity: options.opacity ?? 1,
    }),
  )
  outline.position.copy(mesh.position)
  outline.quaternion.copy(mesh.quaternion)
  outline.scale.copy(mesh.scale).multiplyScalar(1 + (options.thickness ?? 0.05))
  return outline
}

export const createLine2 = (
  points: readonly Three.Vector3[],
  options: Line2Options = {},
): Line2 => {
  const geometry = new LineGeometry()
  geometry.setPositions(points.flatMap(point => point.toArray()))
  const material = new LineMaterial({
    color: new Three.Color(options.color ?? 0xffffff).getHex(),
    linewidth: options.linewidth ?? 1,
    dashed: options.dashed ?? false,
  })
  if (options.resolution) material.resolution.set(options.resolution[0], options.resolution[1])
  const line = new Line2(geometry, material)
  line.computeLineDistances()
  return line
}

export const applyBillboard = (
  object: Three.Object3D,
  camera: Three.Camera,
  options: Readonly<{ lockX?: boolean; lockY?: boolean; lockZ?: boolean }> = {},
): void => {
  const previous = object.rotation.clone()
  const cameraWorldQuaternion = camera.getWorldQuaternion(new Three.Quaternion())
  if (object.parent === null) {
    object.quaternion.copy(cameraWorldQuaternion)
  } else {
    const parentWorldQuaternion = object.parent.getWorldQuaternion(new Three.Quaternion())
    object.quaternion.copy(parentWorldQuaternion.invert().multiply(cameraWorldQuaternion))
  }
  if (options.lockX) object.rotation.x = previous.x
  if (options.lockY) object.rotation.y = previous.y
  if (options.lockZ) object.rotation.z = previous.z
}

export const createDecalGeometry = (
  mesh: Three.Mesh,
  position: Three.Vector3,
  orientation: Three.Euler,
  size: Three.Vector3,
): DecalGeometry => new DecalGeometry(mesh, position, orientation, size)
