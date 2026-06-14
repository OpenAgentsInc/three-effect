import { Data, Effect } from "effect"
import * as Three from "three"
import { ImprovedNoise } from "three/examples/jsm/math/ImprovedNoise.js"
import { Lut } from "three/examples/jsm/math/Lut.js"
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js"
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise.js"

// React-free wrappers for the `three/examples/jsm/math` utilities that
// procedural-geometry, particle, and data-viz demos lean on across the local
// pmndrs examples. These are pure/deterministic helpers, so they stay as small
// factory + sampling functions rather than scoped resources -- they own no GPU
// or DOM handles to dispose.
//
// Reference:
// - projects/repos/examples/demos/* (procedural terrain / scatter demos)
// - projects/repos/drei/src/core/Sampler.tsx (MeshSurfaceSampler wrapper)
// - three/examples/jsm/math/{ImprovedNoise,SimplexNoise,MeshSurfaceSampler,Lut}
export const pmndrsMathPrimitiveSourceRefs = [
  "projects/repos/drei/src/core/Sampler.tsx",
  "projects/repos/examples/demos/sampler/src/App.jsx",
  "projects/repos/examples/demos/points/src/App.jsx",
] as const

export class ThreeSurfaceSampleError extends Data.TaggedError(
  "ThreeSurfaceSampleError",
)<{
  readonly reason: string
}> {}

// --- Noise ----------------------------------------------------------------
// `ImprovedNoise` is classic Perlin noise in 3D; `SimplexNoise` adds 2D/3D/4D.
// Both are seeded by their internal permutation tables, so a fresh instance is
// deterministic. We expose the raw instances plus small typed samplers.
export const createImprovedNoise = (): ImprovedNoise => new ImprovedNoise()

export const createSimplexNoise = (): SimplexNoise => new SimplexNoise()

// Sample fractal Brownian motion (layered octaves) from a 3D noise source.
// `octaves` clamps to at least 1 so callers cannot accidentally request zero
// layers and read an undefined accumulator.
export const fbmNoise3d = (
  noise: ImprovedNoise,
  x: number,
  y: number,
  z: number,
  options: Readonly<{
    octaves?: number
    frequency?: number
    amplitude?: number
    lacunarity?: number
    gain?: number
  }> = {},
): number => {
  const octaves = Math.max(1, Math.floor(options.octaves ?? 4))
  const lacunarity = options.lacunarity ?? 2
  const gain = options.gain ?? 0.5
  let frequency = options.frequency ?? 1
  let amplitude = options.amplitude ?? 1
  let total = 0
  let normalization = 0
  for (let i = 0; i < octaves; i += 1) {
    total +=
      noise.noise(x * frequency, y * frequency, z * frequency) * amplitude
    normalization += amplitude
    frequency *= lacunarity
    amplitude *= gain
  }
  // normalization is >= the first amplitude (>0 by construction), so this is
  // always a safe divide.
  return total / normalization
}

// --- MeshSurfaceSampler ---------------------------------------------------
export type SurfaceSample = Readonly<{
  position: Three.Vector3
  normal: Three.Vector3
}>

export type SurfaceSamplerHandle = Readonly<{
  sampler: MeshSurfaceSampler
  // Draw a single weighted sample from the built surface.
  sample: () => SurfaceSample
  // Draw `count` samples and return a flat Float32Array of positions
  // (xyz * count), ready to feed a BufferAttribute.
  samplePositions: (count: number) => Float32Array
}>

export const createSurfaceSampler = (
  mesh: Three.Mesh,
  weightAttribute?: string,
): Effect.Effect<SurfaceSamplerHandle, ThreeSurfaceSampleError> =>
  Effect.try({
    try: () => {
      const sampler = new MeshSurfaceSampler(mesh)
      if (weightAttribute) sampler.setWeightAttribute(weightAttribute)
      sampler.build()

      const sample = (): SurfaceSample => {
        const position = new Three.Vector3()
        const normal = new Three.Vector3()
        sampler.sample(position, normal)
        return { position, normal }
      }

      const samplePositions = (count: number): Float32Array => {
        const safe = Math.max(0, Math.floor(count))
        const positions = new Float32Array(safe * 3)
        const point = new Three.Vector3()
        for (let i = 0; i < safe; i += 1) {
          sampler.sample(point)
          const base = i * 3
          positions[base] = point.x
          positions[base + 1] = point.y
          positions[base + 2] = point.z
        }
        return positions
      }

      return { sampler, sample, samplePositions }
    },
    catch: error =>
      new ThreeSurfaceSampleError({
        reason: error instanceof Error ? error.message : String(error),
      }),
  })

// --- Lut (color lookup tables) --------------------------------------------
// `Lut` maps a normalized scalar to a color across named color maps
// ("rainbow", "cooltowarm", "blackbody", "grayscale"). Useful for heatmap /
// data-viz coloring without hand-rolling gradients.
export type LutColorMap = "rainbow" | "cooltowarm" | "blackbody" | "grayscale"

export const createLut = (
  colorMap: LutColorMap = "rainbow",
  numberOfColors = 32,
): Lut => new Lut(colorMap, numberOfColors)

// Map a single scalar within [min, max] to a color. The Lut clamps internally.
export const lutColorAt = (
  lut: Lut,
  value: number,
  min = 0,
  max = 1,
): Three.Color => {
  lut.setMin(min)
  lut.setMax(max)
  return lut.getColor(value)
}

// Build a flat Float32Array of rgb colors (rgb * count) by mapping each input
// scalar through the Lut -- ready for an instanced/point color attribute.
export const lutColorArray = (
  lut: Lut,
  values: readonly number[],
  min = 0,
  max = 1,
): Float32Array => {
  lut.setMin(min)
  lut.setMax(max)
  const colors = new Float32Array(values.length * 3)
  for (let i = 0; i < values.length; i += 1) {
    // values[i] is in-range by the loop bound; guard for the strict
    // noUncheckedIndexedAccess consumer.
    const value = values[i] ?? min
    const color = lut.getColor(value)
    const base = i * 3
    colors[base] = color.r
    colors[base + 1] = color.g
    colors[base + 2] = color.b
  }
  return colors
}
