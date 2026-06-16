import * as Three from "three"

import { type Vector3Like, toVector3 } from "./cameraPrimitives"
import { applyBillboard } from "./sceneGraphPrimitives"

export const pmndrsTextLabelPrimitiveSourceRefs = [
  "projects/repos/drei/src/core/Text.tsx",
  "projects/repos/drei/src/core/Billboard.tsx",
  "projects/repos/examples/demos/canvas-text/src/App.jsx",
] as const

export type TextLabelOptions = Readonly<{
  text: string
  color?: Three.ColorRepresentation
  backgroundColor?: Three.ColorRepresentation | null
  fontSize?: number
  fontFamily?: string
  fontWeight?: string | number
  padding?: number
  /** World-space height of one text line. The plane width tracks the canvas aspect. */
  worldHeight?: number
  /** Supersampling factor for crisp text at the canvas resolution. */
  resolution?: number
  anchorX?: "left" | "center" | "right"
  anchorY?: "top" | "middle" | "bottom"
  position?: Vector3Like
  /** When true, the label faces the camera every frame it is updated. */
  billboard?: boolean
  depthTest?: boolean
  opacity?: number
}>

export type ResolvedTextLabelOptions = Readonly<{
  text: string
  color: Three.ColorRepresentation
  backgroundColor: Three.ColorRepresentation | null
  fontSize: number
  fontFamily: string
  fontWeight: string | number
  padding: number
  worldHeight: number
  resolution: number
  anchorX: "left" | "center" | "right"
  anchorY: "top" | "middle" | "bottom"
  billboard: boolean
  depthTest: boolean
  opacity: number
}>

export type TextLabelHandle = Readonly<{
  /** The billboarded plane carrying the text texture. */
  object3D: Three.Mesh<Three.PlaneGeometry, Three.MeshBasicMaterial>
  /** Re-rasterize the label with new text. */
  setText: (text: string) => void
  /** Face the label at the camera (no-op when billboard is disabled). */
  faceCamera: (camera: Three.Camera) => void
  /** Current rendered text. */
  text: () => string
  dispose: () => void
}>

export const defaultTextLabelOptions: Omit<ResolvedTextLabelOptions, "text"> = {
  color: 0xffffff,
  backgroundColor: null,
  fontSize: 48,
  fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont",
  fontWeight: 500,
  padding: 0.25,
  worldHeight: 0.42,
  resolution: 2,
  anchorX: "center",
  anchorY: "middle",
  billboard: true,
  depthTest: false,
  opacity: 1,
}

export const resolveTextLabelOptions = (
  options: TextLabelOptions,
): ResolvedTextLabelOptions => ({
  ...defaultTextLabelOptions,
  ...options,
})

const toColorString = (color: Three.ColorRepresentation): string =>
  `#${new Three.Color(color).getHexString()}`

/**
 * Rasterize a single line of text onto a DPR-aware canvas and return both the
 * canvas and its pixel aspect ratio. Kept pure so it can be unit tested without
 * a WebGL context.
 */
export const rasterizeTextLabel = (
  canvas: HTMLCanvasElement,
  resolved: ResolvedTextLabelOptions,
): { width: number; height: number } => {
  const scale = Math.max(1, resolved.resolution)
  const fontSize = resolved.fontSize * scale
  const padding = fontSize * resolved.padding
  const font = `${resolved.fontWeight} ${fontSize}px ${resolved.fontFamily}`

  const context = canvas.getContext("2d")
  if (context === null) {
    canvas.width = 1
    canvas.height = 1
    return { width: 1, height: 1 }
  }

  context.font = font
  const metrics = context.measureText(resolved.text)
  const textWidth = Math.max(1, metrics.width)
  const lineHeight = fontSize * 1.25

  canvas.width = Math.ceil(textWidth + padding * 2)
  canvas.height = Math.ceil(lineHeight + padding * 2)

  context.clearRect(0, 0, canvas.width, canvas.height)
  if (resolved.backgroundColor !== null) {
    context.fillStyle = toColorString(resolved.backgroundColor)
    context.fillRect(0, 0, canvas.width, canvas.height)
  }

  // Re-apply font after the resize reset.
  context.font = font
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.fillStyle = toColorString(resolved.color)
  context.fillText(resolved.text, canvas.width / 2, canvas.height / 2)

  return { width: canvas.width, height: canvas.height }
}

const applyAnchor = (
  geometry: Three.PlaneGeometry,
  width: number,
  height: number,
  resolved: ResolvedTextLabelOptions,
): void => {
  const offsetX =
    resolved.anchorX === "left"
      ? width / 2
      : resolved.anchorX === "right"
        ? -width / 2
        : 0
  const offsetY =
    resolved.anchorY === "bottom"
      ? height / 2
      : resolved.anchorY === "top"
        ? -height / 2
        : 0
  geometry.translate(offsetX, offsetY, 0)
}

/**
 * Create a crisp, billboarded text label as a reusable, disposable primitive.
 *
 * This is the canvas-texture-on-a-plane variant (no SDF/troika dependency). The
 * canvas is supersampled by `resolution` and rendered with `LinearFilter` so it
 * stays sharp across zoom levels.
 */
export const createTextLabel = (options: TextLabelOptions): TextLabelHandle => {
  const resolved = resolveTextLabelOptions(options)

  const canvas =
    typeof document === "undefined"
      ? (null as unknown as HTMLCanvasElement)
      : document.createElement("canvas")
  if (canvas === null) {
    throw new Error("createTextLabel requires a DOM canvas")
  }

  const dimensions = rasterizeTextLabel(canvas, resolved)

  const texture = new Three.CanvasTexture(canvas)
  texture.colorSpace = Three.SRGBColorSpace
  texture.minFilter = Three.LinearFilter
  texture.magFilter = Three.LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true

  const material = new Three.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: resolved.depthTest,
    depthWrite: false,
    opacity: resolved.opacity,
    side: Three.DoubleSide,
  })

  const aspect = dimensions.width / dimensions.height
  const planeHeight = resolved.worldHeight
  const planeWidth = planeHeight * aspect
  const geometry = new Three.PlaneGeometry(planeWidth, planeHeight)

  const mesh = new Three.Mesh(geometry, material)
  applyAnchor(geometry, planeWidth, planeHeight, resolved)
  if (options.position !== undefined) {
    mesh.position.copy(toVector3(options.position))
  }

  let currentText = resolved.text

  const setText = (text: string): void => {
    if (text === currentText) return
    currentText = text
    const next = rasterizeTextLabel(canvas, { ...resolved, text })
    texture.needsUpdate = true

    const nextAspect = next.width / next.height
    const nextWidth = planeHeight * nextAspect
    mesh.geometry.dispose()
    const nextGeometry = new Three.PlaneGeometry(nextWidth, planeHeight)
    mesh.geometry = nextGeometry
    applyAnchor(nextGeometry, nextWidth, planeHeight, resolved)
  }

  const faceCamera = (camera: Three.Camera): void => {
    if (!resolved.billboard) return
    applyBillboard(mesh, camera)
  }

  const dispose = (): void => {
    mesh.geometry.dispose()
    material.dispose()
    texture.dispose()
    mesh.removeFromParent()
  }

  return {
    object3D: mesh,
    setText,
    faceCamera,
    text: () => currentText,
    dispose,
  }
}
