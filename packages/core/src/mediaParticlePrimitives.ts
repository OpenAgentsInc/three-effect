import { Data, Effect } from "effect"
import * as Three from "three"

export const pmndrsMediaParticlePrimitiveSourceRefs = [
  "projects/repos/examples/demos/bloom-hdr-workflow-gltf/src/App.jsx",
  "projects/repos/examples/demos/gatsby-stars/src/App.jsx",
  "projects/repos/examples/demos/ground-projected-envmaps-lamina/src/App.jsx",
  "projects/repos/examples/demos/learn-with-jason/src/App.jsx",
  "projects/repos/examples/demos/lulaby-city/src/App.jsx",
  "projects/repos/examples/demos/racing-game/src/App.jsx",
  "projects/repos/examples/demos/react-ellipsecurve/src/App.jsx",
  "projects/repos/examples/demos/threejs-journey-portal/src/App.jsx",
  "projects/repos/examples/demos/video-textures/src/App.jsx",
  "projects/repos/drei/src/core/PositionalAudio.tsx",
  "projects/repos/drei/src/core/Sparkles.tsx",
  "projects/repos/drei/src/core/Stars.tsx",
  "projects/repos/drei/src/core/VideoTexture.tsx",
  "projects/repos/drei/src/web/Loader.tsx",
] as const

export class ThreeMediaCreateError extends Data.TaggedError(
  "ThreeMediaCreateError",
)<{
  readonly reason: string
}> {}

export type LoadingProgressSnapshot = Readonly<{
  active: boolean
  loaded: number
  total: number
  progress: number
  item?: string
}>

export type ParticleFieldOptions = Readonly<{
  count?: number
  radius?: number
  depth?: number
  scale?: number | readonly [number, number, number]
  color?: Three.ColorRepresentation
  saturation?: number
  size?: number
  seed?: number
}>

const seededRandom = (seed: number): (() => number) => {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 0x100000000
  }
}

export const createLoadingTracker = (): Readonly<{
  manager: Three.LoadingManager
  snapshot: () => LoadingProgressSnapshot
}> => {
  let snapshot: LoadingProgressSnapshot = {
    active: false,
    loaded: 0,
    total: 0,
    progress: 0,
  }
  const manager = new Three.LoadingManager()
  manager.onStart = (item, loaded, total) => {
    snapshot = { active: true, item, loaded, total, progress: total ? loaded / total : 0 }
  }
  manager.onProgress = (item, loaded, total) => {
    snapshot = { active: true, item, loaded, total, progress: total ? loaded / total : 0 }
  }
  manager.onLoad = () => {
    snapshot = { ...snapshot, active: false, progress: 1 }
  }
  manager.onError = item => {
    snapshot = { ...snapshot, active: false, item }
  }

  return { manager, snapshot: () => snapshot }
}

export const createVideoTexture = (
  video: HTMLVideoElement,
  options: Readonly<{
    autoplay?: boolean
    muted?: boolean
    loop?: boolean
  }> = {},
): Effect.Effect<Three.VideoTexture, ThreeMediaCreateError> =>
  Effect.try({
    try: () => {
      video.muted = options.muted ?? video.muted
      video.loop = options.loop ?? video.loop
      if (options.autoplay) void video.play()
      const texture = new Three.VideoTexture(video)
      texture.colorSpace = Three.SRGBColorSpace
      return texture
    },
    catch: error =>
      new ThreeMediaCreateError({
        reason: error instanceof Error ? error.message : String(error),
      }),
  })

export const createPositionalAudio = (
  listener: Three.AudioListener,
  buffer: AudioBuffer,
  options: Readonly<{
    loop?: boolean
    volume?: number
    refDistance?: number
    autoplay?: boolean
  }> = {},
): Three.PositionalAudio => {
  const audio = new Three.PositionalAudio(listener)
  audio.setBuffer(buffer)
  audio.setLoop(options.loop ?? false)
  audio.setVolume(options.volume ?? 1)
  audio.setRefDistance(options.refDistance ?? 1)
  if (options.autoplay) audio.play()
  return audio
}

export const createStarfieldAttributes = (
  options: ParticleFieldOptions = {},
): Readonly<{
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
}> => {
  const count = options.count ?? 5000
  const radius = options.radius ?? 100
  const depth = options.depth ?? 50
  const size = options.size ?? 4
  const saturation = options.saturation ?? 0
  const random = seededRandom(options.seed ?? 1)
  const color = new Three.Color()
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)

  for (let index = 0; index < count; index += 1) {
    const r = radius + depth * random()
    const theta = Math.acos(1 - random() * 2)
    const phi = random() * Math.PI * 2
    const point = new Three.Vector3().setFromSpherical(new Three.Spherical(r, theta, phi))
    point.toArray(positions, index * 3)
    color.setHSL(index / count, saturation, 0.9)
    color.toArray(colors, index * 3)
    sizes[index] = (0.5 + random() * 0.5) * size
  }

  return { positions, colors, sizes }
}

export const createSparkleAttributes = (
  options: ParticleFieldOptions = {},
): Readonly<{
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  speeds: Float32Array
}> => {
  const count = options.count ?? 100
  const random = seededRandom(options.seed ?? 1)
  const scale = options.scale ?? 1
  const scaleTuple: readonly [number, number, number] =
    typeof scale === "number" ? [scale, scale, scale] : [scale[0], scale[1], scale[2]]
  const color = new Three.Color(options.color ?? 0xffffff)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const speeds = new Float32Array(count)

  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (random() - 0.5) * scaleTuple[0]
    positions[index * 3 + 1] = (random() - 0.5) * scaleTuple[1]
    positions[index * 3 + 2] = (random() - 0.5) * scaleTuple[2]
    color.toArray(colors, index * 3)
    sizes[index] = options.size ?? random()
    speeds[index] = 0.5 + random()
  }

  return { positions, colors, sizes, speeds }
}

export const createPointsFromAttributes = (
  attributes: Readonly<{
    positions: Float32Array
    colors?: Float32Array
    sizes?: Float32Array
  }>,
  material: Three.Material = new Three.PointsMaterial({
    size: 1,
    vertexColors: attributes.colors !== undefined,
    transparent: true,
  }),
): Three.Points => {
  const geometry = new Three.BufferGeometry()
  geometry.setAttribute("position", new Three.BufferAttribute(attributes.positions, 3))
  if (attributes.colors) {
    geometry.setAttribute("color", new Three.BufferAttribute(attributes.colors, 3))
  }
  if (attributes.sizes) {
    geometry.setAttribute("size", new Three.BufferAttribute(attributes.sizes, 1))
  }
  return new Three.Points(geometry, material)
}
