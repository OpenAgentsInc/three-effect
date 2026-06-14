import * as Three from "three"

export const pmndrsShaderMaterialPrimitiveSourceRefs = [
  "projects/repos/drei/src/core/shaderMaterial.tsx",
] as const

export type ShaderUniformValue =
  | Three.Texture
  | Three.TypedArray
  | Three.Matrix4
  | Three.Matrix3
  | Three.Quaternion
  | Three.Vector4
  | Three.Vector3
  | Three.Vector2
  | Three.Color
  | number
  | boolean
  | string
  | null

export type ShaderUniformMap = Readonly<
  Record<
    string,
    | ShaderUniformValue
    | Readonly<Record<string, ShaderUniformValue>>
    | readonly ShaderUniformValue[]
  >
>

export type ShaderMaterialConstructor<TUniforms extends ShaderUniformMap> = {
  readonly key: string
  new (
    parameters?: Three.ShaderMaterialParameters,
  ): Three.ShaderMaterial & { [K in keyof TUniforms]: TUniforms[K] }
}

export const createShaderMaterialClass = <TUniforms extends ShaderUniformMap>(
  uniforms: TUniforms,
  vertexShader: string,
  fragmentShader: string,
  onInit?: (
    material: Three.ShaderMaterial & { [K in keyof TUniforms]: TUniforms[K] },
  ) => void,
): ShaderMaterialConstructor<TUniforms> => {
  class ThreeEffectShaderMaterial extends Three.ShaderMaterial {
    static readonly key = Three.MathUtils.generateUUID()

    constructor(parameters?: Three.ShaderMaterialParameters) {
      super({ vertexShader, fragmentShader, ...parameters })

      for (const uniformName of Object.keys(uniforms)) {
        this.uniforms[uniformName] = new Three.Uniform(uniforms[uniformName])
        Object.defineProperty(this, uniformName, {
          configurable: true,
          enumerable: true,
          get() {
            return this.uniforms[uniformName]?.value
          },
          set(value) {
            if (this.uniforms[uniformName]) {
              this.uniforms[uniformName]!.value = value
            } else {
              this.uniforms[uniformName] = new Three.Uniform(value)
            }
          },
        })
      }

      this.uniforms = Three.UniformsUtils.clone(this.uniforms)
      onInit?.(
        this as unknown as Three.ShaderMaterial & {
          [K in keyof TUniforms]: TUniforms[K]
        },
      )
    }
  }

  return ThreeEffectShaderMaterial as unknown as ShaderMaterialConstructor<TUniforms>
}

export const createShaderMaterial = <TUniforms extends ShaderUniformMap>(
  uniforms: TUniforms,
  vertexShader: string,
  fragmentShader: string,
  parameters?: Three.ShaderMaterialParameters,
): Three.ShaderMaterial & { [K in keyof TUniforms]: TUniforms[K] } => {
  const Material = createShaderMaterialClass(uniforms, vertexShader, fragmentShader)
  return new Material(parameters)
}
