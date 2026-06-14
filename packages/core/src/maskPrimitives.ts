import * as Three from "three"

export const pmndrsMaskPrimitiveSourceRefs = [
  "projects/repos/examples/demos/interactive-spline-scene-live-html/src/App.jsx",
  "projects/repos/examples/demos/inverted-stencil-buffer/src/App.jsx",
  "projects/repos/examples/demos/portal-shapes/src/App.jsx",
  "projects/repos/examples/demos/shopping/src/App.jsx",
  "projects/repos/examples/demos/stencil-mask/src/App.jsx",
  "projects/repos/drei/src/core/Mask.tsx",
] as const

export type MaskOptions = Readonly<{
  id?: number
  colorWrite?: boolean
  depthWrite?: boolean
}>

export type UseMaskOptions = Readonly<{
  id?: number
  inverse?: boolean
}>

export const maskMaterialProps = (
  options: MaskOptions = {},
): Partial<Three.Material> => ({
  colorWrite: options.colorWrite ?? false,
  depthWrite: options.depthWrite ?? false,
  stencilWrite: true,
  stencilRef: options.id ?? 1,
  stencilFunc: Three.AlwaysStencilFunc,
  stencilFail: Three.ReplaceStencilOp,
  stencilZFail: Three.ReplaceStencilOp,
  stencilZPass: Three.ReplaceStencilOp,
})

export const useMaskMaterialProps = (
  options: UseMaskOptions = {},
): Partial<Three.Material> => ({
  stencilWrite: true,
  stencilRef: options.id ?? 1,
  stencilFunc: options.inverse ? Three.NotEqualStencilFunc : Three.EqualStencilFunc,
  stencilFail: Three.KeepStencilOp,
  stencilZFail: Three.KeepStencilOp,
  stencilZPass: Three.KeepStencilOp,
})

export const applyMaskMaterial = <TMaterial extends Three.Material>(
  material: TMaterial,
  options: MaskOptions = {},
): TMaterial => {
  Object.assign(material, maskMaterialProps(options))
  material.needsUpdate = true
  return material
}

export const applyMaskedMaterial = <TMaterial extends Three.Material>(
  material: TMaterial,
  options: UseMaskOptions = {},
): TMaterial => {
  Object.assign(material, useMaskMaterialProps(options))
  material.needsUpdate = true
  return material
}
