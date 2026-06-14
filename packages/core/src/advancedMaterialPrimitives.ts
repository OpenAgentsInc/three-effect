import * as Three from "three"
import { Reflector } from "three/examples/jsm/objects/Reflector.js"

export const pmndrsAdvancedMaterialPrimitiveSourceRefs = [
  "projects/repos/examples/demos/aquarium/src/App.jsx",
  "projects/repos/examples/demos/caustics/src/App.jsx",
  "projects/repos/examples/demos/diamond-refraction/src/App.jsx",
  "projects/repos/examples/demos/flow-shield/src/App.jsx",
  "projects/repos/examples/demos/frosted-glass/src/App.jsx",
  "projects/repos/examples/demos/glass-flower/src/App.jsx",
  "projects/repos/examples/demos/image-gallery/src/App.jsx",
  "projects/repos/examples/demos/night-train/src/App.jsx",
  "projects/repos/examples/demos/wobbling-sphere/src/App.jsx",
  "projects/repos/drei/src/core/MeshTransmissionMaterial.tsx",
  "projects/repos/drei/src/core/MeshReflectorMaterial.tsx",
  "projects/repos/drei/src/core/MeshDistortMaterial.tsx",
  "projects/repos/drei/src/core/MeshRefractionMaterial.tsx",
  "projects/repos/drei/src/core/MeshWobbleMaterial.tsx",
] as const

export type TransmissionMaterialOptions = Three.MeshPhysicalMaterialParameters &
  Readonly<{
    transmission?: number
    thickness?: number
    ior?: number
    attenuationDistance?: number
    attenuationColor?: Three.ColorRepresentation
    anisotropicBlur?: number
  }>

export type AnimatedDistortMaterial = Three.MeshPhysicalMaterial & {
  time: number
  distort: number
  radius: number
}

export type AnimatedWobbleMaterial = Three.MeshStandardMaterial & {
  time: number
  factor: number
}

export type ReflectorOptions = Readonly<{
  width?: number
  height?: number
  color?: Three.ColorRepresentation
  textureWidth?: number
  textureHeight?: number
  clipBias?: number
}>

export const createTransmissionMaterial = (
  options: TransmissionMaterialOptions = {},
): Three.MeshPhysicalMaterial => {
  const material = new Three.MeshPhysicalMaterial({
    roughness: 0,
    metalness: 0,
    transparent: true,
    opacity: 1,
    transmission: 1,
    thickness: 0.5,
    ior: 1.5,
    ...options,
  })
  material.attenuationDistance = options.attenuationDistance ?? 0
  material.attenuationColor = new Three.Color(options.attenuationColor ?? 0xffffff)
  return material
}

export const createRefractionMaterial = (
  options: TransmissionMaterialOptions & Readonly<{ envMap?: Three.Texture }> = {},
): Three.MeshPhysicalMaterial => {
  const parameters: TransmissionMaterialOptions = {
    roughness: options.roughness ?? 0,
    metalness: options.metalness ?? 0,
    transmission: options.transmission ?? 1,
    thickness: options.thickness ?? 0.1,
    ior: options.ior ?? 2.4,
    envMapIntensity: options.envMapIntensity ?? 1,
    color: options.color ?? 0xffffff,
  }
  if (options.envMap) parameters.envMap = options.envMap
  const material = createTransmissionMaterial(parameters)
  material.side = options.side ?? Three.FrontSide
  return material
}

class DistortMaterial extends Three.MeshPhysicalMaterial {
  private readonly uniforms = {
    time: { value: 0 },
    distort: { value: 0.4 },
    radius: { value: 1 },
  }

  constructor(parameters: Three.MeshPhysicalMaterialParameters = {}) {
    super(parameters)
  }

  override onBeforeCompile(shader: Three.WebGLProgramParametersWithUniforms): void {
    shader.uniforms.time = this.uniforms.time
    shader.uniforms.distort = this.uniforms.distort
    shader.uniforms.radius = this.uniforms.radius
    shader.vertexShader = `
      uniform float time;
      uniform float distort;
      uniform float radius;
      ${shader.vertexShader}
    `.replace(
      "#include <begin_vertex>",
      `
      vec3 transformed = vec3(position);
      float wave = sin(position.x * 3.0 + time) * cos(position.y * 2.0 + time * 0.7);
      transformed *= radius + wave * distort;
      `,
    )
  }

  get time(): number {
    return this.uniforms.time.value
  }

  set time(value: number) {
    this.uniforms.time.value = value
  }

  get distort(): number {
    return this.uniforms.distort.value
  }

  set distort(value: number) {
    this.uniforms.distort.value = value
  }

  get radius(): number {
    return this.uniforms.radius.value
  }

  set radius(value: number) {
    this.uniforms.radius.value = value
  }
}

class WobbleMaterial extends Three.MeshStandardMaterial {
  private readonly uniforms = {
    time: { value: 0 },
    factor: { value: 1 },
  }

  constructor(parameters: Three.MeshStandardMaterialParameters = {}) {
    super(parameters)
  }

  override onBeforeCompile(shader: Three.WebGLProgramParametersWithUniforms): void {
    shader.uniforms.time = this.uniforms.time
    shader.uniforms.factor = this.uniforms.factor
    shader.vertexShader = `
      uniform float time;
      uniform float factor;
      ${shader.vertexShader}
    `.replace(
      "#include <begin_vertex>",
      `
      float theta = sin(time + position.y) * 0.5 * factor;
      float c = cos(theta);
      float s = sin(theta);
      mat3 wobble = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
      vec3 transformed = vec3(position) * wobble;
      objectNormal = objectNormal * wobble;
      `,
    )
  }

  get time(): number {
    return this.uniforms.time.value
  }

  set time(value: number) {
    this.uniforms.time.value = value
  }

  get factor(): number {
    return this.uniforms.factor.value
  }

  set factor(value: number) {
    this.uniforms.factor.value = value
  }
}

export const createDistortMaterial = (
  options: Three.MeshPhysicalMaterialParameters & Readonly<{ distort?: number; radius?: number }> = {},
): AnimatedDistortMaterial => {
  const { distort = 0.4, radius = 1, ...parameters } = options
  const material = new DistortMaterial(parameters) as AnimatedDistortMaterial
  material.distort = distort
  material.radius = radius
  return material
}

export const createWobbleMaterial = (
  options: Three.MeshStandardMaterialParameters & Readonly<{ factor?: number }> = {},
): AnimatedWobbleMaterial => {
  const { factor = 1, ...parameters } = options
  const material = new WobbleMaterial(parameters) as AnimatedWobbleMaterial
  material.factor = factor
  return material
}

export const setAnimatedMaterialTime = (
  material: { time?: number },
  timeSeconds: number,
): void => {
  material.time = timeSeconds
}

export const createReflector = (
  options: ReflectorOptions = {},
): Reflector => {
  const geometry = new Three.PlaneGeometry(options.width ?? 1, options.height ?? 1)
  return new Reflector(geometry, {
    color: options.color ?? 0x7f7f7f,
    textureWidth: options.textureWidth ?? 512,
    textureHeight: options.textureHeight ?? 512,
    clipBias: options.clipBias ?? 0,
  })
}
