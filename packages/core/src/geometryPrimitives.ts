import { Data, Effect } from "effect"
import * as Three from "three"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"
import { TextGeometry, type TextGeometryParameters } from "three/examples/jsm/geometries/TextGeometry.js"
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js"

import { type CanvasSize } from "./cameraPrimitives"

export const pmndrsGeometryPrimitiveSourceRefs = [
  "projects/repos/examples/demos/arkanoid/src/App.jsx",
  "projects/repos/examples/demos/cards/src/App.jsx",
  "projects/repos/examples/demos/flexbox-yoga-in-webgl/src/App.jsx",
  "projects/repos/examples/demos/html-input-fields/src/App.jsx",
  "projects/repos/examples/demos/inverted-stencil-buffer/src/App.jsx",
  "projects/repos/examples/demos/pinball-in-70-lines/src/App.jsx",
  "projects/repos/drei/src/core/Text.tsx",
  "projects/repos/drei/src/core/Text3D.tsx",
  "projects/repos/drei/src/core/RoundedBox.tsx",
  "projects/repos/drei/src/core/useAspect.tsx",
] as const

export class ThreeFontLoadError extends Data.TaggedError("ThreeFontLoadError")<{
  readonly url: string
  readonly reason: string
}> {}

export type ViewportLike = Readonly<{
  width: number
  height: number
  aspect?: number
}>

export type RoundedBoxOptions = Readonly<{
  width?: number
  height?: number
  depth?: number
  segments?: number
  radius?: number
}>

export const aspectScale = (
  viewport: ViewportLike,
  width: number,
  height: number,
  factor = 1,
): readonly [number, number, number] => {
  const aspect = viewport.aspect ?? viewport.width / Math.max(1, viewport.height)
  const imageAspect = width / Math.max(1, height)
  const scaleBase = aspect > imageAspect ? viewport.width / width : viewport.height / height
  return [width * scaleBase * factor, height * scaleBase * factor, 1]
}

export const screenAspectScale = (
  size: CanvasSize,
  width: number,
  height: number,
  factor = 1,
): readonly [number, number, number] =>
  aspectScale(
    {
      width: size.width,
      height: size.height,
      aspect: size.width / Math.max(1, size.height),
    },
    width,
    height,
    factor,
  )

export const createRoundedBoxGeometry = (
  options: RoundedBoxOptions = {},
): RoundedBoxGeometry =>
  new RoundedBoxGeometry(
    options.width ?? 1,
    options.height ?? 1,
    options.depth ?? 1,
    options.segments ?? 2,
    options.radius ?? 0.1,
  )

export const loadFont = (
  url: string,
  manager?: Three.LoadingManager,
): Effect.Effect<Font, ThreeFontLoadError> =>
  Effect.tryPromise({
    try: () => new FontLoader(manager).loadAsync(url),
    catch: error =>
      new ThreeFontLoadError({
        url,
        reason: error instanceof Error ? error.message : String(error),
      }),
  })

export const createTextGeometry = (
  text: string,
  parameters: TextGeometryParameters,
): TextGeometry => new TextGeometry(text, parameters)

export const centerGeometry = <TGeometry extends Three.BufferGeometry>(
  geometry: TGeometry,
): TGeometry => {
  geometry.center()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
