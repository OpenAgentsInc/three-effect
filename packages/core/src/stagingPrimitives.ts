import { Effect } from "effect"
import * as Three from "three"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"
import { HorizontalBlurShader } from "three/examples/jsm/shaders/HorizontalBlurShader.js"
import { VerticalBlurShader } from "three/examples/jsm/shaders/VerticalBlurShader.js"
import { Sky as ThreeSky } from "three/examples/jsm/objects/Sky.js"

import { ThreeAssetLoadError } from "./assetPrimitives"
import { type Vector3Like, toVector3 } from "./cameraPrimitives"

export const pmndrsStagingPrimitiveSourceRefs = [
  "projects/repos/examples/demos/aquarium/src/App.jsx",
  "projects/repos/examples/demos/baking-soft-shadows/src/App.jsx",
  "projects/repos/examples/demos/bounds-and-makedefault/src/App.jsx",
  "projects/repos/examples/demos/building-dynamic-envmaps/src/App.jsx",
  "projects/repos/examples/demos/clouds/src/App.jsx",
  "projects/repos/examples/demos/envmap-ground-projection/src/App.jsx",
  "projects/repos/drei/src/core/Environment.tsx",
  "projects/repos/drei/src/core/ContactShadows.tsx",
  "projects/repos/drei/src/core/AccumulativeShadows.tsx",
  "projects/repos/drei/src/core/Lightformer.tsx",
  "projects/repos/drei/src/core/Sky.tsx",
  "projects/repos/drei/src/core/BakeShadows.tsx",
  "projects/repos/drei/src/core/Preload.tsx",
  "projects/repos/drei/src/core/CubeCamera.tsx",
] as const

export type SceneEnvironmentOptions = Readonly<{
  background?: boolean | "only"
  backgroundBlurriness?: number
  backgroundIntensity?: number
  environmentIntensity?: number
}>

export type SceneEnvironmentRestore = () => void

export type LightformerForm = "rect" | "plane" | "circle" | "ring" | "box"

export type LightformerOptions = Readonly<{
  form?: LightformerForm
  color?: Three.ColorRepresentation
  intensity?: number
  scale?: number | readonly [number, number] | readonly [number, number, number]
  position?: Vector3Like
  target?: Vector3Like | boolean
  toneMapped?: boolean
  map?: Three.Texture
  pointLight?: Readonly<{
    color?: Three.ColorRepresentation
    intensity?: number
    distance?: number
    decay?: number
  }>
}>

export type RandomizedLightOptions = Readonly<{
  amount?: number
  radius?: number
  position?: Vector3Like
  target?: Vector3Like
  color?: Three.ColorRepresentation
  intensity?: number
  bias?: number
  mapSize?: number
  seed?: number
}>

export type ContactShadowResources = Readonly<{
  group: Three.Group
  plane: Three.Mesh<Three.PlaneGeometry, Three.MeshBasicMaterial>
  camera: Three.OrthographicCamera
  renderTarget: Three.WebGLRenderTarget
  blurRenderTarget: Three.WebGLRenderTarget
  depthMaterial: Three.MeshDepthMaterial
  horizontalBlurMaterial: Three.ShaderMaterial
  verticalBlurMaterial: Three.ShaderMaterial
  dispose: () => void
}>

export type ContactShadowOptions = Readonly<{
  width?: number
  height?: number
  scale?: number | readonly [number, number]
  opacity?: number
  color?: Three.ColorRepresentation
  near?: number
  far?: number
  resolution?: number
  depthWrite?: boolean
}>

export type CubeCameraResources = Readonly<{
  renderTarget: Three.WebGLCubeRenderTarget
  camera: Three.CubeCamera
  update: () => void
  dispose: () => void
}>

export const applySceneEnvironment = (
  scene: Three.Scene,
  texture: Three.Texture,
  options: SceneEnvironmentOptions = {},
): SceneEnvironmentRestore => {
  const previousBackground = scene.background
  const previousEnvironment = scene.environment
  const previousBackgroundBlurriness = scene.backgroundBlurriness
  const previousBackgroundIntensity = scene.backgroundIntensity
  const previousEnvironmentIntensity = scene.environmentIntensity

  if (options.background !== "only") scene.environment = texture
  if (options.background) scene.background = texture
  if (options.backgroundBlurriness !== undefined) {
    scene.backgroundBlurriness = options.backgroundBlurriness
  }
  if (options.backgroundIntensity !== undefined) {
    scene.backgroundIntensity = options.backgroundIntensity
  }
  if (options.environmentIntensity !== undefined) {
    scene.environmentIntensity = options.environmentIntensity
  }

  return () => {
    scene.background = previousBackground
    scene.environment = previousEnvironment
    scene.backgroundBlurriness = previousBackgroundBlurriness
    scene.backgroundIntensity = previousBackgroundIntensity
    scene.environmentIntensity = previousEnvironmentIntensity
  }
}

export const createRoomEnvironmentTexture = (
  renderer: Three.WebGLRenderer,
): Three.Texture => {
  const pmrem = new Three.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const target = pmrem.fromScene(room)
  room.clear()
  pmrem.dispose()
  return target.texture
}

export const preloadScene = (
  renderer: Three.WebGLRenderer,
  scene: Three.Scene,
  camera: Three.Camera,
  all = false,
): Effect.Effect<void, ThreeAssetLoadError> =>
  Effect.try({
    try: () => {
      const invisible: Three.Object3D[] = []
      if (all) {
        scene.traverse(object => {
          if (!object.visible) {
            invisible.push(object)
            object.visible = true
          }
        })
      }
      renderer.compile(scene, camera)
      const target = new Three.WebGLCubeRenderTarget(128)
      const cubeCamera = new Three.CubeCamera(0.01, 100000, target)
      cubeCamera.update(renderer, scene)
      target.dispose()
      invisible.forEach(object => {
        object.visible = false
      })
    },
    catch: error =>
      new ThreeAssetLoadError({
        url: "scene",
        reason: error instanceof Error ? error.message : String(error),
      }),
  })

export const bakeShadows = (
  renderer: Three.WebGLRenderer,
): SceneEnvironmentRestore => {
  const previousAutoUpdate = renderer.shadowMap.autoUpdate
  const previousNeedsUpdate = renderer.shadowMap.needsUpdate
  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.needsUpdate = true
  return () => {
    renderer.shadowMap.autoUpdate = previousAutoUpdate
    renderer.shadowMap.needsUpdate = previousNeedsUpdate
  }
}

export const calculateSkySunPosition = (
  inclination = 0.6,
  azimuth = 0.1,
): Three.Vector3 => {
  const theta = Math.PI * (inclination - 0.5)
  const phi = 2 * Math.PI * (azimuth - 0.5)
  return new Three.Vector3(Math.cos(phi), Math.sin(theta), Math.sin(phi))
}

export const createSky = (
  options: Readonly<{
    distance?: number
    sunPosition?: Vector3Like
    inclination?: number
    azimuth?: number
    mieCoefficient?: number
    mieDirectionalG?: number
    rayleigh?: number
    turbidity?: number
  }> = {},
): ThreeSky => {
  const sky = new ThreeSky()
  sky.scale.setScalar(options.distance ?? 1000)
  const uniforms = sky.material.uniforms
  uniforms.sunPosition.value = options.sunPosition
    ? toVector3(options.sunPosition)
    : calculateSkySunPosition(options.inclination, options.azimuth)
  uniforms.mieCoefficient.value = options.mieCoefficient ?? 0.005
  uniforms.mieDirectionalG.value = options.mieDirectionalG ?? 0.8
  uniforms.rayleigh.value = options.rayleigh ?? 0.5
  uniforms.turbidity.value = options.turbidity ?? 10
  return sky
}

const lightformerGeometry = (
  form: LightformerForm,
): Three.BufferGeometry => {
  if (form === "circle") return new Three.RingGeometry(0, 0.5, 64)
  if (form === "ring") return new Three.RingGeometry(0.25, 0.5, 64)
  if (form === "box") return new Three.BoxGeometry(1, 1, 1)
  return new Three.PlaneGeometry(1, 1)
}

export const createLightformer = (
  options: LightformerOptions = {},
): Three.Mesh => {
  const color = new Three.Color(options.color ?? "white").multiplyScalar(
    options.intensity ?? 1,
  )
  const materialOptions: Three.MeshBasicMaterialParameters = {
    color,
    toneMapped: options.toneMapped ?? false,
    side: Three.DoubleSide,
  }
  if (options.map) materialOptions.map = options.map

  const mesh = new Three.Mesh(
    lightformerGeometry(options.form ?? "rect"),
    new Three.MeshBasicMaterial(materialOptions),
  )

  const scale = options.scale ?? 1
  if (typeof scale === "number") {
    mesh.scale.setScalar(scale)
  } else {
    mesh.scale.set(scale[0], scale[1], scale[2] ?? 1)
  }
  if (options.position) mesh.position.copy(toVector3(options.position))
  if (options.target) {
    mesh.lookAt(options.target === true ? new Three.Vector3() : toVector3(options.target))
  }
  if (options.pointLight) {
    mesh.add(
      new Three.PointLight(
        options.pointLight.color ?? options.color ?? "white",
        options.pointLight.intensity ?? 1,
        options.pointLight.distance ?? 0,
        options.pointLight.decay ?? 2,
      ),
    )
  }

  return mesh
}

const seededRandom = (seed: number): (() => number) => {
  let value = seed >>> 0
  return () => {
    value = (1664525 * value + 1013904223) >>> 0
    return value / 0x100000000
  }
}

export const createRandomizedLightRig = (
  options: RandomizedLightOptions = {},
): Three.Group => {
  const amount = options.amount ?? 8
  const radius = options.radius ?? 4
  const origin = options.position ? toVector3(options.position) : new Three.Vector3(5, 5, 5)
  const target = options.target ? toVector3(options.target) : new Three.Vector3()
  const random = seededRandom(options.seed ?? 1)
  const group = new Three.Group()

  for (let index = 0; index < amount; index += 1) {
    const light = new Three.DirectionalLight(
      options.color ?? "white",
      (options.intensity ?? 1) / Math.max(1, amount),
    )
    light.castShadow = true
    light.shadow.bias = options.bias ?? -0.0001
    light.shadow.mapSize.setScalar(options.mapSize ?? 512)
    light.position.copy(origin).add(
      new Three.Vector3(
        (random() - 0.5) * radius,
        (random() - 0.5) * radius,
        (random() - 0.5) * radius,
      ),
    )
    light.target.position.copy(target)
    group.add(light)
    group.add(light.target)
  }

  return group
}

export const createContactShadowResources = (
  options: ContactShadowOptions = {},
): ContactShadowResources => {
  const scale = options.scale ?? 10
  const width = (options.width ?? 1) * (Array.isArray(scale) ? scale[0] : scale)
  const height = (options.height ?? 1) * (Array.isArray(scale) ? scale[1] : scale)
  const renderTarget = new Three.WebGLRenderTarget(
    options.resolution ?? 512,
    options.resolution ?? 512,
  )
  const blurRenderTarget = new Three.WebGLRenderTarget(
    options.resolution ?? 512,
    options.resolution ?? 512,
  )
  renderTarget.texture.generateMipmaps = false
  blurRenderTarget.texture.generateMipmaps = false

  const geometry = new Three.PlaneGeometry(width, height).rotateX(Math.PI / 2)
  const material = new Three.MeshBasicMaterial({
    color: options.color ?? "black",
    transparent: true,
    opacity: options.opacity ?? 1,
    depthWrite: options.depthWrite ?? false,
    map: renderTarget.texture,
  })
  const plane = new Three.Mesh(geometry, material)
  const camera = new Three.OrthographicCamera(
    width / -2,
    width / 2,
    height / 2,
    height / -2,
    options.near ?? 0,
    options.far ?? 10,
  )
  const group = new Three.Group()
  group.rotation.x = Math.PI / 2
  group.add(plane)
  group.add(camera)

  const depthMaterial = new Three.MeshDepthMaterial()
  depthMaterial.depthTest = false
  depthMaterial.depthWrite = false

  return {
    group,
    plane,
    camera,
    renderTarget,
    blurRenderTarget,
    depthMaterial,
    horizontalBlurMaterial: new Three.ShaderMaterial(HorizontalBlurShader),
    verticalBlurMaterial: new Three.ShaderMaterial(VerticalBlurShader),
    dispose: () => {
      geometry.dispose()
      material.dispose()
      renderTarget.dispose()
      blurRenderTarget.dispose()
      depthMaterial.dispose()
    },
  }
}

export const createCubeCameraResources = (
  renderer: Three.WebGLRenderer,
  scene: Three.Scene,
  options: Readonly<{
    resolution?: number
    near?: number
    far?: number
    envMap?: Three.Texture
    fog?: Three.Fog | Three.FogExp2
  }> = {},
): CubeCameraResources => {
  const renderTarget = new Three.WebGLCubeRenderTarget(options.resolution ?? 256)
  renderTarget.texture.type = Three.HalfFloatType
  const camera = new Three.CubeCamera(
    options.near ?? 0.1,
    options.far ?? 1000,
    renderTarget,
  )

  return {
    renderTarget,
    camera,
    update: () => {
      const previousBackground = scene.background
      const previousFog = scene.fog
      if (options.envMap) scene.background = options.envMap
      if (options.fog) scene.fog = options.fog
      camera.update(renderer, scene)
      scene.background = previousBackground
      scene.fog = previousFog
    },
    dispose: () => {
      renderTarget.dispose()
    },
  }
}
