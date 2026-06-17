import { Data, Effect } from "effect"
import * as Three from "three"
import {
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/loaders/GLTFLoader.js"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js"

export const pmndrsAssetPrimitiveSourceRefs = [
  "projects/repos/drei/src/core/Gltf.tsx",
  "projects/repos/drei/src/core/Texture.tsx",
  "projects/repos/Quick_3D_MMORPG/client/src/gltf-component.js",
  "projects/repos/Quick_3D_MMORPG/client/src/load-controller.js",
  "projects/repos/Quick_3D_MMORPG/client/src/render-component.js",
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

export type ModelRenderTextureMatch = "exact" | "includes"

export type ModelRenderOptions = Readonly<{
  scale?: number | readonly [number, number, number]
  position?: Three.Vector3 | readonly [number, number, number]
  quaternion?: Three.Quaternion
  castShadow?: boolean
  receiveShadow?: boolean
  visible?: boolean
  frustumCulled?: boolean
  computeBoundingBox?: boolean
  materialTextures?: Readonly<Record<string, Three.Texture>>
  textureMatch?: ModelRenderTextureMatch
  configureMaterial?: (material: Three.Material, object: Three.Object3D) => void
  configureObject?: (object: Three.Object3D) => void
}>

export type GltfModelInstanceOptions = ModelRenderOptions &
  Readonly<{
    cloneSkinned?: boolean
    createMixer?: boolean
    actionNames?: readonly string[]
    playAction?: string
    disposeResources?: boolean
  }>

export type GltfModelInstanceHandle = Readonly<{
  object: Three.Object3D
  clips: readonly Three.AnimationClip[]
  mixer?: Three.AnimationMixer
  actions: Readonly<Record<string, Three.AnimationAction>>
  update: (delta: number) => Effect.Effect<void>
  play: (name: string, fadeDuration?: number) => Effect.Effect<boolean>
  dispose: Effect.Effect<void>
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

const modelPositionFromInput = (
  input: Three.Vector3 | readonly [number, number, number],
): Three.Vector3 =>
  input instanceof Three.Vector3
    ? input
    : new Three.Vector3(input[0], input[1], input[2])

const materialMatchesTextureKey = (
  material: Three.Material,
  key: string,
  match: ModelRenderTextureMatch,
): boolean =>
  match === "exact" ? material.name === key : material.name.includes(key)

const materialList = (
  material: Three.Material | readonly Three.Material[] | undefined,
): readonly Three.Material[] => {
  if (material === undefined) return []
  return Array.isArray(material)
    ? [...(material as readonly Three.Material[])]
    : [material as Three.Material]
}

export const applyModelRenderOptions = (
  object: Three.Object3D,
  options: ModelRenderOptions = {},
): Three.Object3D => {
  if (options.scale !== undefined) {
    if (typeof options.scale === "number") {
      object.scale.setScalar(options.scale)
    } else {
      object.scale.set(options.scale[0], options.scale[1], options.scale[2])
    }
  }
  if (options.position !== undefined) {
    object.position.copy(modelPositionFromInput(options.position))
  }
  if (options.quaternion !== undefined) {
    object.quaternion.copy(options.quaternion)
  }

  const textureMatch = options.textureMatch ?? "includes"
  object.traverse(child => {
    const mesh = child as Three.Mesh
    if (mesh.geometry !== undefined && options.computeBoundingBox === true) {
      mesh.geometry.computeBoundingBox()
    }

    for (const material of materialList(mesh.material)) {
      for (const [key, texture] of Object.entries(
        options.materialTextures ?? {},
      )) {
        if (materialMatchesTextureKey(material, key, textureMatch)) {
          const mappedMaterial = material as Three.Material & {
            map?: Three.Texture
          }
          mappedMaterial.map = texture
          material.needsUpdate = true
        }
      }
      options.configureMaterial?.(material, child)
    }

    if (options.castShadow !== undefined) child.castShadow = options.castShadow
    if (options.receiveShadow !== undefined) {
      child.receiveShadow = options.receiveShadow
    }
    if (options.visible !== undefined) child.visible = options.visible
    if (options.frustumCulled !== undefined) {
      child.frustumCulled = options.frustumCulled
    }
    options.configureObject?.(child)
  })

  return object
}

const disposeMaterial = (material: Three.Material): void => {
  material.dispose()
}

export const disposeModelInstanceResources = (object: Three.Object3D): void => {
  object.traverse(child => {
    const mesh = child as Three.Mesh
    mesh.geometry?.dispose()
    for (const material of materialList(mesh.material)) {
      disposeMaterial(material)
    }
  })
}

export const createGltfModelInstance = (
  gltf: GLTF,
  options: GltfModelInstanceOptions = {},
): GltfModelInstanceHandle => {
  const object =
    options.cloneSkinned === true
      ? cloneSkeleton(gltf.scene)
      : gltf.scene.clone(true)
  applyModelRenderOptions(object, options)

  const clips = gltf.animations
  const mixer = options.createMixer === false ? undefined : new Three.AnimationMixer(object)
  const entries = clips.map((clip, index) => {
    const name = options.actionNames?.[index] ?? clip.name
    return [name, mixer?.clipAction(clip)] as const
  })
  const actions = Object.fromEntries(
    entries.filter(
      (entry): entry is readonly [string, Three.AnimationAction] =>
        entry[1] !== undefined,
    ),
  )
  let currentAction: Three.AnimationAction | undefined

  const play = (name: string, fadeDuration = 0.2): Effect.Effect<boolean> =>
    Effect.sync(() => {
      const next = actions[name]
      if (next === undefined) return false
      if (currentAction === next) return true
      next.reset().enabled = true
      if (currentAction !== undefined) {
        currentAction.crossFadeTo(next, fadeDuration, true)
      }
      next.play()
      currentAction = next
      return true
    })

  if (options.playAction !== undefined) {
    Effect.runSync(play(options.playAction, 0))
  }

  return {
    object,
    clips,
    mixer,
    actions,
    update: (delta: number) =>
      Effect.sync(() => {
        mixer?.update(delta)
      }),
    play,
    dispose: Effect.sync(() => {
      if (mixer !== undefined) {
        mixer.stopAllAction()
        mixer.uncacheRoot(object)
      }
      if (options.disposeResources === true) {
        disposeModelInstanceResources(object)
      }
      object.removeFromParent()
    }),
  }
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
