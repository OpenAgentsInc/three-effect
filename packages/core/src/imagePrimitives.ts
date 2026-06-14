import * as Three from "three"

import { createShaderMaterial } from "./shaderMaterialPrimitives"

export const pmndrsImagePrimitiveSourceRefs = [
  "projects/repos/examples/demos/cards/src/App.jsx",
  "projects/repos/examples/demos/cards-with-border-radius/src/App.jsx",
  "projects/repos/examples/demos/horizontal-tiles/src/App.jsx",
  "projects/repos/examples/demos/image-gallery/src/App.jsx",
  "projects/repos/examples/demos/infinite-scroll/src/App.jsx",
  "projects/repos/examples/demos/scrollcontrols-with-minimap/src/App.jsx",
  "projects/repos/examples/demos/useintersect-and-scrollcontrols/src/App.jsx",
  "projects/repos/drei/src/core/Image.tsx",
] as const

export type ImagePlaneOptions = Readonly<{
  width?: number
  height?: number
  segments?: number
  color?: Three.ColorRepresentation
  opacity?: number
  zoom?: number
  grayscale?: number
  transparent?: boolean
  side?: Three.Side
}>

export const imageCoverScale = (
  plane: readonly [number, number],
  image: readonly [number, number],
): readonly [number, number] => {
  const planeAspect = plane[0] / Math.max(1, plane[1])
  const imageAspect = image[0] / Math.max(1, image[1])
  return planeAspect < imageAspect
    ? [imageAspect / planeAspect, 1]
    : [1, planeAspect / imageAspect]
}

export const createImagePlaneGeometry = (
  options: ImagePlaneOptions = {},
): Three.PlaneGeometry =>
  new Three.PlaneGeometry(
    options.width ?? 1,
    options.height ?? 1,
    options.segments ?? 1,
    options.segments ?? 1,
  )

export const createImagePlaneMaterial = (
  texture: Three.Texture,
  options: ImagePlaneOptions = {},
): Three.ShaderMaterial & {
  map: Three.Texture
  color: Three.Color
  opacity: number
  zoom: number
  grayscale: number
  coverScale: Three.Vector2
} => {
  const imageWidth = Number((texture.image as { width?: number } | undefined)?.width ?? 1)
  const imageHeight = Number((texture.image as { height?: number } | undefined)?.height ?? 1)
  const planeWidth = options.width ?? 1
  const planeHeight = options.height ?? 1
  const [coverX, coverY] = imageCoverScale(
    [planeWidth, planeHeight],
    [imageWidth, imageHeight],
  )

  const material = createShaderMaterial(
    {
      map: texture,
      color: new Three.Color(options.color ?? "white"),
      opacity: options.opacity ?? 1,
      zoom: options.zoom ?? 1,
      grayscale: options.grayscale ?? 0,
      coverScale: new Three.Vector2(coverX, coverY),
    },
    `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    `
      varying vec2 vUv;
      uniform sampler2D map;
      uniform vec3 color;
      uniform float opacity;
      uniform float zoom;
      uniform float grayscale;
      uniform vec2 coverScale;
      const vec3 luma = vec3(0.299, 0.587, 0.114);
      void main() {
        vec2 uv = (vUv - 0.5) * coverScale / max(zoom, 0.0001) + 0.5;
        vec4 texel = texture2D(map, uv);
        float gray = dot(texel.rgb, luma);
        vec3 rgb = mix(texel.rgb, vec3(gray), clamp(grayscale, 0.0, 1.0)) * color;
        gl_FragColor = vec4(rgb, texel.a * opacity);
      }
    `,
    {
      transparent: options.transparent ?? true,
      side: options.side ?? Three.DoubleSide,
    },
  )

  return material
}

export const createImagePlane = (
  texture: Three.Texture,
  options: ImagePlaneOptions = {},
): Three.Mesh<Three.PlaneGeometry, Three.ShaderMaterial> =>
  new Three.Mesh(
    createImagePlaneGeometry(options),
    createImagePlaneMaterial(texture, options),
  )
