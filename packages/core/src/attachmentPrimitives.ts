import * as Three from "three"

import { type Vector3Like, toVector3 } from "./cameraPrimitives"

export const quickMmorpgAttachmentPrimitiveSourceRefs = [
  "projects/repos/Quick_3D_MMORPG/client/src/equip-weapon-component.js",
  "projects/repos/Quick_3D_MMORPG/client/src/player-entity.js",
  "projects/repos/Quick_3D_MMORPG/client/src/npc-entity.js",
] as const

export type AttachmentQuaternionLike =
  | Three.Quaternion
  | readonly [number, number, number, number]

export type BoneAttachmentTransform = Readonly<{
  position?: Vector3Like
  quaternion?: AttachmentQuaternionLike
  scale?: Vector3Like | number
}>

export type BoneAttachmentOptions = BoneAttachmentTransform &
  Readonly<{
    root: Three.Object3D
    object: Three.Object3D
    boneNames: readonly string[]
  }>

export type BoneAttachmentHandle = Readonly<{
  bone: Three.Bone
  object: Three.Object3D
  detach: () => void
  dispose: () => void
}>

export type EquipmentAttachmentSlot = BoneAttachmentTransform &
  Readonly<{
    slotId: string
    boneNames: readonly string[]
  }>

export type EquipmentAttachmentRecord<TValue = unknown> = Readonly<{
  id: string
  slotId: string
  handle: BoneAttachmentHandle
  value?: TValue
}>

export type EquipmentAttachmentManager<TValue = unknown> = Readonly<{
  attach: (
    id: string,
    slotId: string,
    object: Three.Object3D,
    value?: TValue,
    transform?: BoneAttachmentTransform,
  ) => EquipmentAttachmentRecord<TValue> | undefined
  detach: (id: string) => boolean
  get: (id: string) => EquipmentAttachmentRecord<TValue> | undefined
  list: () => readonly EquipmentAttachmentRecord<TValue>[]
  clear: () => void
}>

export const collectBoneMap = (
  root: Three.Object3D,
): Readonly<Record<string, Three.Bone>> => {
  const bones: Record<string, Three.Bone> = {}
  root.traverse(object => {
    if (object instanceof Three.Bone && object.name) {
      bones[object.name] = object
    }
  })
  return bones
}

export const findBoneByNames = (
  root: Three.Object3D,
  names: readonly string[],
): Three.Bone | undefined => {
  const bones = collectBoneMap(root)
  for (const name of names) {
    const bone = bones[name]
    if (bone !== undefined) {
      return bone
    }
  }
  return undefined
}

const toAttachmentQuaternion = (
  value: AttachmentQuaternionLike | undefined,
): Three.Quaternion => {
  if (value === undefined) {
    return new Three.Quaternion()
  }
  if (value instanceof Three.Quaternion) {
    return value.clone()
  }
  return new Three.Quaternion(value[0], value[1], value[2], value[3])
}

const toAttachmentScale = (
  value: Vector3Like | number | undefined,
): Three.Vector3 => {
  if (value === undefined) {
    return new Three.Vector3(1, 1, 1)
  }
  if (typeof value === "number") {
    return new Three.Vector3(value, value, value)
  }
  return toVector3(value)
}

export const applyAttachmentTransform = (
  object: Three.Object3D,
  transform: BoneAttachmentTransform = {},
): Three.Object3D => {
  object.position.copy(toVector3(transform.position ?? [0, 0, 0]))
  object.quaternion.copy(toAttachmentQuaternion(transform.quaternion))
  object.scale.copy(toAttachmentScale(transform.scale))
  return object
}

export const disposeObjectTreeResources = (object: Three.Object3D): void => {
  object.traverse(child => {
    const mesh = child as Three.Mesh
    mesh.geometry?.dispose()
    const material = mesh.material
    if (Array.isArray(material)) {
      material.forEach(item => item.dispose())
    } else {
      material?.dispose()
    }
  })
}

export const attachObjectToBone = (
  options: BoneAttachmentOptions,
): BoneAttachmentHandle | undefined => {
  const bone = findBoneByNames(options.root, options.boneNames)
  if (bone === undefined) {
    return undefined
  }

  applyAttachmentTransform(options.object, options)
  bone.add(options.object)

  const detach = (): void => {
    options.object.removeFromParent()
  }

  return {
    bone,
    object: options.object,
    detach,
    dispose: () => {
      detach()
      disposeObjectTreeResources(options.object)
    },
  }
}

export const createEquipmentAttachmentManager = <TValue = unknown>(
  root: Three.Object3D,
  slots: readonly EquipmentAttachmentSlot[],
): EquipmentAttachmentManager<TValue> => {
  const slotById = new Map(slots.map(slot => [slot.slotId, slot]))
  const records = new Map<string, EquipmentAttachmentRecord<TValue>>()

  const detach = (id: string): boolean => {
    const record = records.get(id)
    if (record === undefined) {
      return false
    }
    record.handle.dispose()
    return records.delete(id)
  }

  return {
    attach: (id, slotId, object, value, transform = {}) => {
      const slot = slotById.get(slotId)
      if (slot === undefined) {
        return undefined
      }
      detach(id)
      const handle = attachObjectToBone({
        root,
        object,
        boneNames: slot.boneNames,
        position: transform.position ?? slot.position,
        quaternion: transform.quaternion ?? slot.quaternion,
        scale: transform.scale ?? slot.scale,
      })
      if (handle === undefined) {
        return undefined
      }
      const base = { id, slotId, handle }
      const record: EquipmentAttachmentRecord<TValue> =
        value === undefined ? base : { ...base, value }
      records.set(id, record)
      return record
    },
    detach,
    get: id => records.get(id),
    list: () => [...records.values()],
    clear: () => {
      for (const id of [...records.keys()]) {
        detach(id)
      }
    },
  }
}
