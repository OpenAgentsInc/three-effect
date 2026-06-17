import * as Three from "three"

import { type Vector3Like, toVector3 } from "./cameraPrimitives"
import { applyBillboard } from "./sceneGraphPrimitives"
import {
  createTextLabel,
  type TextLabelHandle,
  type TextLabelOptions,
} from "./textLabelPrimitives"

export const quickMmorpgBillboardPrimitiveSourceRefs = [
  "projects/repos/Quick_3D_MMORPG/client/src/floating-name.js",
  "projects/repos/Quick_3D_MMORPG/client/src/health-bar.js",
  "projects/repos/Quick_3D_MMORPG/client/src/ui-controller.js",
] as const

export type BillboardStatusBarOptions = Readonly<{
  width?: number
  height?: number
  value?: number
  backgroundColor?: Three.ColorRepresentation
  fillColor?: Three.ColorRepresentation
  borderColor?: Three.ColorRepresentation
  position?: Vector3Like
  depthTest?: boolean
}>

export type ResolvedBillboardStatusBarOptions = Readonly<{
  width: number
  height: number
  value: number
  backgroundColor: Three.ColorRepresentation
  fillColor: Three.ColorRepresentation
  borderColor: Three.ColorRepresentation
  depthTest: boolean
}>

export type BillboardStatusBarHandle = Readonly<{
  group: Three.Group
  fill: Three.Mesh<Three.PlaneGeometry, Three.MeshBasicMaterial>
  setValue: (value: number) => void
  faceCamera: (camera: Three.Camera) => void
  dispose: () => void
}>

export type SpeechBubbleOptions = Omit<TextLabelOptions, "text"> &
  Readonly<{
    text: string
    createdAtMs?: number
    ttlMs?: number
  }>

export type SpeechBubbleHandle = Readonly<{
  label: TextLabelHandle
  expiresAtMs: () => number | undefined
  visibleAt: (nowMs: number) => boolean
  setText: (text: string, nowMs?: number) => void
  faceCamera: (camera: Three.Camera) => void
  dispose: () => void
}>

export type EntityBillboardOverlayOptions = Readonly<{
  name?: TextLabelOptions
  speech?: SpeechBubbleOptions
  status?: BillboardStatusBarOptions
  anchorOffset?: Vector3Like
}>

export type EntityBillboardOverlayHandle = Readonly<{
  group: Three.Group
  name?: TextLabelHandle
  speech?: SpeechBubbleHandle
  status?: BillboardStatusBarHandle
  faceCamera: (camera: Three.Camera) => void
  dispose: () => void
}>

export const defaultBillboardStatusBarOptions: ResolvedBillboardStatusBarOptions =
  {
    width: 1.6,
    height: 0.14,
    value: 1,
    backgroundColor: 0x111111,
    fillColor: 0x9fffc4,
    borderColor: 0xffffff,
    depthTest: false,
  }

export const resolveBillboardStatusBarOptions = (
  options: BillboardStatusBarOptions = {},
): ResolvedBillboardStatusBarOptions => ({
  ...defaultBillboardStatusBarOptions,
  ...options,
  width: Math.max(0.0001, options.width ?? defaultBillboardStatusBarOptions.width),
  height: Math.max(
    0.0001,
    options.height ?? defaultBillboardStatusBarOptions.height,
  ),
  value: Three.MathUtils.clamp(
    options.value ?? defaultBillboardStatusBarOptions.value,
    0,
    1,
  ),
})

const makePlane = (
  width: number,
  height: number,
  color: Three.ColorRepresentation,
  depthTest: boolean,
): Three.Mesh<Three.PlaneGeometry, Three.MeshBasicMaterial> =>
  new Three.Mesh(
    new Three.PlaneGeometry(width, height),
    new Three.MeshBasicMaterial({
      color,
      transparent: true,
      depthTest,
      depthWrite: false,
      side: Three.DoubleSide,
    }),
  )

export const createBillboardStatusBar = (
  options: BillboardStatusBarOptions = {},
): BillboardStatusBarHandle => {
  const resolved = resolveBillboardStatusBarOptions(options)
  const group = new Three.Group()
  const background = makePlane(
    resolved.width,
    resolved.height,
    resolved.backgroundColor,
    resolved.depthTest,
  )
  const fill = makePlane(
    resolved.width,
    resolved.height,
    resolved.fillColor,
    resolved.depthTest,
  )
  const border = new Three.LineSegments(
    new Three.EdgesGeometry(background.geometry),
    new Three.LineBasicMaterial({
      color: resolved.borderColor,
      depthTest: resolved.depthTest,
      transparent: true,
    }),
  )
  fill.position.z = 0.002
  border.position.z = 0.004
  group.add(background, fill, border)
  if (options.position !== undefined) {
    group.position.copy(toVector3(options.position))
  }

  const setValue = (value: number): void => {
    const safeValue = Three.MathUtils.clamp(value, 0, 1)
    fill.scale.x = safeValue
    fill.position.x = ((safeValue - 1) * resolved.width) / 2
  }
  setValue(resolved.value)

  return {
    group,
    fill,
    setValue,
    faceCamera: camera => applyBillboard(group, camera),
    dispose: () => {
      for (const child of [background, fill]) {
        child.geometry.dispose()
        child.material.dispose()
      }
      border.geometry.dispose()
      ;(border.material as Three.Material).dispose()
      group.removeFromParent()
    },
  }
}

export const createEntityNamePlate = (
  options: TextLabelOptions,
): TextLabelHandle => createTextLabel(options)

export const createSpeechBubble = (
  options: SpeechBubbleOptions,
): SpeechBubbleHandle => {
  const label = createTextLabel({
    backgroundColor: 0x111111,
    color: 0xffffff,
    worldHeight: 0.34,
    ...options,
  })
  let expiresAtMs =
    options.ttlMs === undefined
      ? undefined
      : (options.createdAtMs ?? 0) + options.ttlMs

  return {
    label,
    expiresAtMs: () => expiresAtMs,
    visibleAt: nowMs => expiresAtMs === undefined || nowMs < expiresAtMs,
    setText: (text, nowMs = 0) => {
      label.setText(text)
      if (options.ttlMs !== undefined) {
        expiresAtMs = nowMs + options.ttlMs
      }
    },
    faceCamera: camera => label.faceCamera(camera),
    dispose: () => label.dispose(),
  }
}

export const createEntityBillboardOverlay = (
  options: EntityBillboardOverlayOptions,
): EntityBillboardOverlayHandle => {
  const group = new Three.Group()
  if (options.anchorOffset !== undefined) {
    group.position.copy(toVector3(options.anchorOffset))
  }

  const name =
    options.name === undefined ? undefined : createEntityNamePlate(options.name)
  const speech =
    options.speech === undefined ? undefined : createSpeechBubble(options.speech)
  const status =
    options.status === undefined
      ? undefined
      : createBillboardStatusBar(options.status)

  if (name !== undefined) {
    group.add(name.object3D)
  }
  if (speech !== undefined) {
    group.add(speech.label.object3D)
  }
  if (status !== undefined) {
    group.add(status.group)
  }

  return {
    group,
    name,
    speech,
    status,
    faceCamera: camera => {
      name?.faceCamera(camera)
      speech?.faceCamera(camera)
      status?.faceCamera(camera)
    },
    dispose: () => {
      name?.dispose()
      speech?.dispose()
      status?.dispose()
      group.removeFromParent()
    },
  }
}
