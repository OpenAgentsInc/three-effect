import { Data, Effect } from "effect"
import * as Three from "three"
import {
  DRACOLoader,
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/Addons.js"

export const pmndrsAssetPrimitiveSourceRefs = [
  "projects/repos/drei/src/core/Gltf.tsx",
  "projects/repos/drei/src/core/Texture.tsx",
] as const

export class ThreeAssetLoadError extends Data.TaggedError(
  "ThreeAssetLoadError",
)<{
  readonly url: string
  readonly reason: string
}> {}

export type TextureInput =
  | string
  | readonly string[]
  | Readonly<Record<string, string>>

export type LoadedTextures<TInput extends TextureInput> = TInput extends string
  ? Three.Texture
  : TInput extends readonly string[]
    ? Three.Texture[]
    : TInput extends Readonly<Record<string, string>>
      ? { readonly [K in keyof TInput]: Three.Texture }
      : never

export type TextureLoadOptions = Readonly<{
  manager?: Three.LoadingManager
  configureTexture?: (texture: Three.Texture, url: string) => void
}>

export type GltfLoadOptions = Readonly<{
  manager?: Three.LoadingManager
  dracoDecoderPath?: string
  configureLoader?: (loader: GLTFLoader) => void
}>

export type GltfObjectMap = Readonly<{
  nodes: Readonly<Record<string, Three.Object3D>>
  materials: Readonly<Record<string, Three.Material>>
}>

export const isTextureRecord = (
  input: TextureInput,
): input is Readonly<Record<string, string>> =>
  input === Object(input) && !Array.isArray(input)

const loadTexturePromise = async (
  url: string,
  options: TextureLoadOptions = {},
): Promise<Three.Texture> => {
  const loader = new Three.TextureLoader(options.manager)
  const texture = await loader.loadAsync(url)
  options.configureTexture?.(texture, url)
  return texture
}

export const loadTexture = (
  url: string,
  options: TextureLoadOptions = {},
): Effect.Effect<Three.Texture, ThreeAssetLoadError> =>
  Effect.tryPromise({
    try: () => loadTexturePromise(url, options),
    catch: error =>
      new ThreeAssetLoadError({
        url,
        reason: error instanceof Error ? error.message : String(error),
      }),
  })

export const loadTextures = <TInput extends TextureInput>(
  input: TInput,
  options: TextureLoadOptions = {},
): Effect.Effect<LoadedTextures<TInput>, ThreeAssetLoadError> =>
  Effect.tryPromise({
    try: async () => {
      if (typeof input === "string") {
        return (await loadTexturePromise(input, options)) as LoadedTextures<TInput>
      }

      if (Array.isArray(input)) {
        return (await Promise.all(
          input.map(url => loadTexturePromise(url, options)),
        )) as LoadedTextures<TInput>
      }

      const entries = await Promise.all(
        Object.entries(input).map(async ([key, url]) => [
          key,
          await loadTexturePromise(url, options),
        ]),
      )

      return Object.fromEntries(entries) as LoadedTextures<TInput>
    },
    catch: error =>
      new ThreeAssetLoadError({
        url:
          typeof input === "string"
            ? input
            : Array.isArray(input)
              ? input.join(",")
              : Object.values(input).join(","),
        reason: error instanceof Error ? error.message : String(error),
      }),
  })

export const createGltfLoader = (
  options: GltfLoadOptions = {},
): GLTFLoader => {
  const loader = new GLTFLoader(options.manager)

  if (options.dracoDecoderPath) {
    const dracoLoader = new DRACOLoader(options.manager)
    dracoLoader.setDecoderPath(options.dracoDecoderPath)
    loader.setDRACOLoader(dracoLoader)
  }

  options.configureLoader?.(loader)
  return loader
}

export const loadGltf = (
  url: string,
  options: GltfLoadOptions = {},
): Effect.Effect<GLTF, ThreeAssetLoadError> =>
  Effect.tryPromise({
    try: () => createGltfLoader(options).loadAsync(url),
    catch: error =>
      new ThreeAssetLoadError({
        url,
        reason: error instanceof Error ? error.message : String(error),
      }),
  })

export const loadGltfs = (
  urls: readonly string[],
  options: GltfLoadOptions = {},
): Effect.Effect<readonly GLTF[], ThreeAssetLoadError> =>
  Effect.tryPromise({
    try: () =>
      Promise.all(urls.map(url => createGltfLoader(options).loadAsync(url))),
    catch: error =>
      new ThreeAssetLoadError({
        url: urls.join(","),
        reason: error instanceof Error ? error.message : String(error),
      }),
  })

export const collectGltfObjectMap = (scene: Three.Object3D): GltfObjectMap => {
  const nodes: Record<string, Three.Object3D> = {}
  const materials: Record<string, Three.Material> = {}

  scene.traverse(object => {
    if (object.name) nodes[object.name] = object
    const material = (object as Three.Mesh).material
    if (Array.isArray(material)) {
      material.forEach(item => {
        if (item.name) materials[item.name] = item
      })
    } else if (material instanceof Three.Material && material.name) {
      materials[material.name] = material
    }
  })

  return { nodes, materials }
}

export const firstMeshGeometry = (
  object: Three.Object3D,
): Three.BufferGeometry | undefined => {
  let geometry: Three.BufferGeometry | undefined

  object.traverse(child => {
    if (geometry) return
    if ((child as Three.Mesh).isMesh) {
      geometry = (child as Three.Mesh).geometry
    }
  })

  return geometry
}
