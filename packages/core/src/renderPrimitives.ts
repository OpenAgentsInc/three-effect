import * as Three from "three"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"

export const pmndrsRenderPrimitiveSourceRefs = [
  "projects/repos/examples/demos/bloom-hdr-workflow-gltf/src/App.jsx",
  "projects/repos/examples/demos/color-grading/src/App.jsx",
  "projects/repos/examples/demos/dbismut-furniture/src/App.jsx",
  "projects/repos/examples/demos/drei-rendertexture/src/App.jsx",
  "projects/repos/examples/demos/gpgpu-curl-noise-dof/src/App.jsx",
  "projects/repos/examples/demos/monitors/src/App.jsx",
  "projects/repos/examples/demos/racing-game/src/App.jsx",
  "projects/repos/examples/demos/scrollcontrols-and-lens-refraction/src/App.jsx",
  "projects/repos/drei/src/core/Fbo.tsx",
  "projects/repos/drei/src/core/RenderTexture.tsx",
  "projects/repos/drei/src/core/Effects.tsx",
] as const

export type FboOptions = Omit<
  Three.RenderTargetOptions,
  "depth" | "depthBuffer" | "samples"
> &
  Readonly<{
    width?: number
    height?: number
    samples?: number
    depth?: boolean
    depthBuffer?: boolean
  }>

export type RenderTextureResources = Readonly<{
  scene: Three.Scene
  camera: Three.Camera
  target: Three.WebGLRenderTarget
  texture: Three.Texture
  render: () => void
  dispose: () => void
}>

export type EffectComposerResources = Readonly<{
  composer: EffectComposer
  renderPass: RenderPass
  outputPass: OutputPass
  bloomPass?: UnrealBloomPass
  render: (deltaSeconds?: number) => void
  dispose: () => void
}>

export const createFbo = (options: FboOptions = {}): Three.WebGLRenderTarget => {
  const width = options.width ?? 256
  const height = options.height ?? 256
  const { width: _width, height: _height, depth, samples = 0, ...settings } = options
  const target = new Three.WebGLRenderTarget(width, height, {
    minFilter: Three.LinearFilter,
    magFilter: Three.LinearFilter,
    type: Three.HalfFloatType,
    ...settings,
  })

  if (depth ?? options.depthBuffer) {
    target.depthTexture = new Three.DepthTexture(width, height, Three.FloatType)
  }
  target.samples = samples
  return target
}

export const resizeFbo = (
  target: Three.WebGLRenderTarget,
  width: number,
  height: number,
  samples = target.samples,
): Three.WebGLRenderTarget => {
  target.setSize(width, height)
  target.samples = samples
  return target
}

export const renderSceneToTarget = (
  renderer: Three.WebGLRenderer,
  scene: Three.Scene,
  camera: Three.Camera,
  target: Three.WebGLRenderTarget,
): void => {
  const previousTarget = renderer.getRenderTarget()
  const previousXrEnabled = renderer.xr.enabled
  const previousAutoClear = renderer.autoClear
  renderer.xr.enabled = false
  renderer.autoClear = true
  renderer.setRenderTarget(target)
  renderer.render(scene, camera)
  renderer.setRenderTarget(previousTarget)
  renderer.xr.enabled = previousXrEnabled
  renderer.autoClear = previousAutoClear
}

export const createRenderTextureResources = (
  renderer: Three.WebGLRenderer,
  camera: Three.Camera,
  options: FboOptions = {},
): RenderTextureResources => {
  const scene = new Three.Scene()
  const target = createFbo(options)
  return {
    scene,
    camera,
    target,
    texture: target.texture,
    render: () => renderSceneToTarget(renderer, scene, camera, target),
    dispose: () => {
      target.dispose()
      scene.clear()
    },
  }
}

export const createEffectComposerResources = (
  renderer: Three.WebGLRenderer,
  scene: Three.Scene,
  camera: Three.Camera,
  options: Readonly<{
    size?: readonly [number, number]
    bloom?: boolean | Readonly<{ strength?: number; radius?: number; threshold?: number }>
    output?: boolean
  }> = {},
): EffectComposerResources => {
  const composer = new EffectComposer(renderer)
  if (options.size) composer.setSize(options.size[0], options.size[1])
  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)

  const bloomPass =
    options.bloom === true || typeof options.bloom === "object"
      ? new UnrealBloomPass(
          new Three.Vector2(options.size?.[0] ?? 256, options.size?.[1] ?? 256),
          typeof options.bloom === "object" ? options.bloom.strength ?? 1 : 1,
          typeof options.bloom === "object" ? options.bloom.radius ?? 0 : 0,
          typeof options.bloom === "object" ? options.bloom.threshold ?? 0 : 0,
        )
      : undefined
  if (bloomPass) composer.addPass(bloomPass)

  const outputPass = new OutputPass()
  if (options.output ?? true) composer.addPass(outputPass)

  const resources: {
    composer: EffectComposer
    renderPass: RenderPass
    outputPass: OutputPass
    bloomPass?: UnrealBloomPass
    render: (deltaSeconds?: number) => void
    dispose: () => void
  } = {
    composer,
    renderPass,
    outputPass,
    render: deltaSeconds => {
      composer.render(deltaSeconds)
    },
    dispose: () => {
      composer.dispose()
    },
  }
  if (bloomPass) resources.bloomPass = bloomPass
  return resources
}
