import * as Three from "three"

import { type Vector3Like, toVector3 } from "./cameraPrimitives"

export const pmndrsInstancePrimitiveSourceRefs = [
  "projects/repos/examples/demos/instances/src/App.jsx",
  "projects/repos/examples/demos/instanced-vertex-colors/src/App.jsx",
  "projects/repos/examples/demos/floating-instanced-shoes/src/App.jsx",
  "projects/repos/drei/src/core/Instances.tsx",
] as const

export type EulerLike =
  | Three.Euler
  | readonly [number, number, number]
  | readonly [number, number, number, Three.EulerOrder]

export type QuaternionLike =
  | Three.Quaternion
  | readonly [number, number, number, number]

export type InstanceTransform = Readonly<{
  position?: Vector3Like
  rotation?: EulerLike
  quaternion?: QuaternionLike
  scale?: Vector3Like | number
  color?: Three.ColorRepresentation
}>

export type ApplyInstanceTransformsOptions = Readonly<{
  range?: number
  matrixAutoUpdate?: boolean
}>

const toEuler = (value: EulerLike): Three.Euler => {
  if (value instanceof Three.Euler) return value.clone()
  return new Three.Euler(value[0], value[1], value[2], value[3] ?? "XYZ")
}

const toQuaternion = (value: QuaternionLike): Three.Quaternion => {
  if (value instanceof Three.Quaternion) return value.clone()
  return new Three.Quaternion(value[0], value[1], value[2], value[3])
}

const toScale = (value: Vector3Like | number | undefined): Three.Vector3 => {
  if (value === undefined) return new Three.Vector3(1, 1, 1)
  if (typeof value === "number") return new Three.Vector3(value, value, value)
  return toVector3(value)
}

export const createInstanceMatrix = (
  transform: InstanceTransform = {},
): Three.Matrix4 => {
  const position = transform.position
    ? toVector3(transform.position)
    : new Three.Vector3()
  const quaternion = transform.quaternion
    ? toQuaternion(transform.quaternion)
    : transform.rotation
      ? new Three.Quaternion().setFromEuler(toEuler(transform.rotation))
      : new Three.Quaternion()
  const scale = toScale(transform.scale)

  return new Three.Matrix4().compose(position, quaternion, scale)
}

export const createInstanceMatrices = (
  transforms: readonly InstanceTransform[],
): Float32Array => {
  const array = new Float32Array(transforms.length * 16)
  transforms.forEach((transform, index) => {
    createInstanceMatrix(transform).toArray(array, index * 16)
  })
  return array
}

export const createInstanceColorArray = (
  transforms: readonly InstanceTransform[],
  fallback: Three.ColorRepresentation = 0xffffff,
): Float32Array => {
  const array = new Float32Array(transforms.length * 3)
  transforms.forEach((transform, index) => {
    new Three.Color(transform.color ?? fallback).toArray(array, index * 3)
  })
  return array
}

export const applyInstanceTransforms = (
  mesh: Three.InstancedMesh,
  transforms: readonly InstanceTransform[],
  options: ApplyInstanceTransformsOptions = {},
): Three.InstancedMesh => {
  const count = Math.min(options.range ?? transforms.length, transforms.length)
  mesh.count = count
  mesh.matrixAutoUpdate = options.matrixAutoUpdate ?? false

  for (let index = 0; index < count; index += 1) {
    const transform = transforms[index]
    if (!transform) continue
    mesh.setMatrixAt(index, createInstanceMatrix(transform))
    if (transform.color !== undefined) {
      mesh.setColorAt(index, new Three.Color(transform.color))
    }
  }

  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

  return mesh
}

export const createInstancedMesh = (
  geometry: Three.BufferGeometry,
  material: Three.Material | readonly Three.Material[],
  transforms: readonly InstanceTransform[],
): Three.InstancedMesh => {
  const meshMaterial: Three.Material | Three.Material[] = Array.isArray(material)
    ? [...(material as readonly Three.Material[])]
    : (material as Three.Material)
  const mesh = new Three.InstancedMesh(
    geometry,
    meshMaterial,
    transforms.length,
  )
  return applyInstanceTransforms(mesh, transforms)
}
