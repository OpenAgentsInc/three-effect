export const quickMmorpgTerrainPrimitiveSourceRefs = [
  "projects/repos/Quick_3D_MMORPG/client/shared/terrain-height.mjs",
  "projects/repos/Quick_3D_MMORPG/client/shared/noise.mjs",
  "projects/repos/Quick_3D_MMORPG/client/src/quadtree.js",
  "projects/repos/Quick_3D_MMORPG/client/src/terrain-builder-threaded.js",
  "projects/repos/Quick_3D_MMORPG/client/src/terrain-builder-threaded-worker.js",
  "projects/repos/Quick_3D_MMORPG/client/src/terrain-chunk.js",
  "projects/repos/Quick_3D_MMORPG/client/src/texture-splatter.js",
] as const

export type TerrainPoint2 = Readonly<{
  x: number
  z: number
}>

export type TerrainBounds2 = Readonly<{
  minX: number
  minZ: number
  maxX: number
  maxZ: number
}>

export type TerrainNoiseOptions = Readonly<{
  seed?: number
  octaves?: number
  persistence?: number
  lacunarity?: number
  exponentiation?: number
  height?: number
  scale?: number
}>

export type ResolvedTerrainNoiseOptions = Required<TerrainNoiseOptions>

export type TerrainHeightSampler = (x: number, z: number, y?: number) => number

export type TerrainQuadtreePlanOptions = Readonly<{
  rootSize: number
  minCellSize: number
  focus: TerrainPoint2
  origin?: TerrainPoint2
  splitDistanceFactor?: number
  maxDepth?: number
}>

export type TerrainQuadtreeNode = Readonly<{
  key: string
  bounds: TerrainBounds2
  center: TerrainPoint2
  size: number
  lod: number
}>

export type TerrainChunkBuildOptions = Readonly<{
  key?: string
  bounds: TerrainBounds2
  resolution?: number
  heightSampler?: TerrainHeightSampler
  noise?: TerrainNoiseOptions
  skirtDepth?: number
  splatHeightScale?: number
}>

export type TerrainChunkWorkerBuildOptions = Omit<
  TerrainChunkBuildOptions,
  "heightSampler"
>

export type TerrainSplatLayer = "dirt" | "grass" | "rock" | "snow"

export type TerrainChunkGeometryData = Readonly<{
  key: string
  bounds: TerrainBounds2
  resolution: number
  positions: Float32Array
  normals: Float32Array
  uvs: Float32Array
  indices: Uint32Array
  splatTextureIndices: Float32Array
  splatWeights: Float32Array
  skirtVertexCount: number
}>

export type TerrainChunkWorkerRequest = Readonly<{
  subject: "build_terrain_chunk"
  id: string
  options: TerrainChunkWorkerBuildOptions
}>

export type TerrainChunkWorkerResponse = Readonly<{
  subject: "terrain_chunk_built"
  id: string
  data: TerrainChunkGeometryData
}>

export type TerrainChunkPoolAcquire<TChunk> = Readonly<{
  width: number
  chunk: TChunk
  reused: boolean
}>

export type TerrainChunkPoolSnapshot = Readonly<{
  availableByWidth: ReadonlyArray<Readonly<{ width: number; count: number }>>
  retiredCount: number
}>

export const defaultTerrainNoiseOptions: ResolvedTerrainNoiseOptions = {
  seed: 1,
  octaves: 10,
  persistence: 0.5,
  lacunarity: 1.6,
  exponentiation: 7.5,
  height: 800,
  scale: 1800,
}

export const defaultTerrainSplatLayerIndices: Readonly<
  Record<TerrainSplatLayer, number>
> = {
  dirt: 0,
  grass: 1,
  rock: 3,
  snow: 4,
}

const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1)

const fade = (value: number): number =>
  value * value * value * (value * (value * 6 - 15) + 10)

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

const stableNumber = (value: number): string => {
  const rounded = Math.abs(value) < 0.000001 ? 0 : value
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(6).replace(/\.?0+$/, "")
}

const hashUnit3d = (seed: number, x: number, y: number, z: number): number => {
  let h =
    Math.imul(x | 0, 374_761_393) ^
    Math.imul(y | 0, 668_265_263) ^
    Math.imul(z | 0, 2_147_483_647) ^
    Math.imul(seed | 0, 1_274_126_177)
  h = Math.imul(h ^ (h >>> 13), 1_274_126_177)
  return ((h ^ (h >>> 16)) >>> 0) / 4_294_967_295
}

const valueNoise3d = (
  seed: number,
  x: number,
  y: number,
  z: number,
): number => {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const z0 = Math.floor(z)
  const tx = fade(x - x0)
  const ty = fade(y - y0)
  const tz = fade(z - z0)

  const c000 = hashUnit3d(seed, x0, y0, z0)
  const c100 = hashUnit3d(seed, x0 + 1, y0, z0)
  const c010 = hashUnit3d(seed, x0, y0 + 1, z0)
  const c110 = hashUnit3d(seed, x0 + 1, y0 + 1, z0)
  const c001 = hashUnit3d(seed, x0, y0, z0 + 1)
  const c101 = hashUnit3d(seed, x0 + 1, y0, z0 + 1)
  const c011 = hashUnit3d(seed, x0, y0 + 1, z0 + 1)
  const c111 = hashUnit3d(seed, x0 + 1, y0 + 1, z0 + 1)

  const x00 = lerp(c000, c100, tx)
  const x10 = lerp(c010, c110, tx)
  const x01 = lerp(c001, c101, tx)
  const x11 = lerp(c011, c111, tx)
  return lerp(lerp(x00, x10, ty), lerp(x01, x11, ty), tz)
}

export const resolveTerrainNoiseOptions = (
  options: TerrainNoiseOptions = {},
): ResolvedTerrainNoiseOptions => ({
  ...defaultTerrainNoiseOptions,
  ...options,
  seed: Math.floor(options.seed ?? defaultTerrainNoiseOptions.seed),
  octaves: Math.max(
    1,
    Math.floor(options.octaves ?? defaultTerrainNoiseOptions.octaves),
  ),
  persistence: Math.max(
    0,
    options.persistence ?? defaultTerrainNoiseOptions.persistence,
  ),
  lacunarity: Math.max(
    0.000001,
    options.lacunarity ?? defaultTerrainNoiseOptions.lacunarity,
  ),
  exponentiation: Math.max(
    0.000001,
    options.exponentiation ?? defaultTerrainNoiseOptions.exponentiation,
  ),
  height: Math.max(0, options.height ?? defaultTerrainNoiseOptions.height),
  scale: Math.max(0.000001, options.scale ?? defaultTerrainNoiseOptions.scale),
})

export const sampleTerrainHeight = (
  x: number,
  z: number,
  y = 0,
  options: TerrainNoiseOptions = {},
): number => {
  const resolved = resolveTerrainNoiseOptions(options)
  const gain = 2 ** -resolved.persistence
  let amplitude = 1
  let frequency = 1
  let normalization = 0
  let total = 0

  for (let octave = 0; octave < resolved.octaves; octave += 1) {
    const noise = valueNoise3d(
      resolved.seed + octave * 1013,
      (x / resolved.scale) * frequency,
      (y / resolved.scale) * frequency,
      (z / resolved.scale) * frequency,
    )
    total += noise * amplitude
    normalization += amplitude
    amplitude *= gain
    frequency *= resolved.lacunarity
  }

  return Math.pow(total / normalization, resolved.exponentiation) * resolved.height
}

export const createDeterministicTerrainHeightSampler = (
  options: TerrainNoiseOptions = {},
): TerrainHeightSampler => {
  const resolved = resolveTerrainNoiseOptions(options)
  return (x, z, y = 0) => sampleTerrainHeight(x, z, y, resolved)
}

export const terrainBoundsSize = (bounds: TerrainBounds2): number =>
  Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ)

export const terrainBoundsCenter = (bounds: TerrainBounds2): TerrainPoint2 => ({
  x: (bounds.minX + bounds.maxX) / 2,
  z: (bounds.minZ + bounds.maxZ) / 2,
})

export const terrainChunkKey = (
  bounds: TerrainBounds2,
  lod = 0,
): string =>
  `lod:${lod}:x:${stableNumber(bounds.minX)}:z:${stableNumber(
    bounds.minZ,
  )}:w:${stableNumber(terrainBoundsSize(bounds))}`

const terrainNode = (bounds: TerrainBounds2, lod: number): TerrainQuadtreeNode => {
  const center = terrainBoundsCenter(bounds)
  return {
    key: terrainChunkKey(bounds, lod),
    bounds,
    center,
    size: terrainBoundsSize(bounds),
    lod,
  }
}

const splitTerrainBounds = (
  bounds: TerrainBounds2,
): readonly TerrainBounds2[] => {
  const midX = (bounds.minX + bounds.maxX) / 2
  const midZ = (bounds.minZ + bounds.maxZ) / 2
  return [
    { minX: bounds.minX, minZ: bounds.minZ, maxX: midX, maxZ: midZ },
    { minX: midX, minZ: bounds.minZ, maxX: bounds.maxX, maxZ: midZ },
    { minX: bounds.minX, minZ: midZ, maxX: midX, maxZ: bounds.maxZ },
    { minX: midX, minZ: midZ, maxX: bounds.maxX, maxZ: bounds.maxZ },
  ]
}

const pointDistance = (a: TerrainPoint2, b: TerrainPoint2): number =>
  Math.hypot(a.x - b.x, a.z - b.z)

export const planTerrainQuadtreeLod = (
  options: TerrainQuadtreePlanOptions,
): ReadonlyArray<TerrainQuadtreeNode> => {
  const rootSize = Math.max(1, options.rootSize)
  const minCellSize = Math.max(1, options.minCellSize)
  const origin = options.origin ?? { x: 0, z: 0 }
  const splitDistanceFactor = Math.max(0, options.splitDistanceFactor ?? 1.5)
  const maxDepth = Math.max(0, Math.floor(options.maxDepth ?? 12))
  const half = rootSize / 2
  const root: TerrainBounds2 = {
    minX: origin.x - half,
    minZ: origin.z - half,
    maxX: origin.x + half,
    maxZ: origin.z + half,
  }
  const leaves: TerrainQuadtreeNode[] = []

  const visit = (bounds: TerrainBounds2, lod: number) => {
    const node = terrainNode(bounds, lod)
    const shouldSplit =
      lod < maxDepth &&
      node.size / 2 >= minCellSize &&
      pointDistance(node.center, options.focus) < node.size * splitDistanceFactor

    if (!shouldSplit) {
      leaves.push(node)
      return
    }

    for (const child of splitTerrainBounds(bounds)) {
      visit(child, lod + 1)
    }
  }

  visit(root, 0)
  return leaves
}

const terrainChunkBuildKey = (options: TerrainChunkBuildOptions): string =>
  options.key ?? terrainChunkKey(options.bounds)

const resolvedResolution = (resolution: number | undefined): number =>
  Math.max(1, Math.floor(resolution ?? 16))

const pushNormal = (
  normals: Float32Array,
  vertexIndex: number,
  x: number,
  y: number,
  z: number,
) => {
  const base = vertexIndex * 3
  normals[base] += x
  normals[base + 1] += y
  normals[base + 2] += z
}

const vertexPosition = (
  positions: Float32Array,
  vertexIndex: number,
): readonly [number, number, number] => {
  const base = vertexIndex * 3
  return [positions[base] ?? 0, positions[base + 1] ?? 0, positions[base + 2] ?? 0]
}

const addTriangleNormal = (
  positions: Float32Array,
  normals: Float32Array,
  a: number,
  b: number,
  c: number,
) => {
  const [ax, ay, az] = vertexPosition(positions, a)
  const [bx, by, bz] = vertexPosition(positions, b)
  const [cx, cy, cz] = vertexPosition(positions, c)
  const abx = bx - ax
  const aby = by - ay
  const abz = bz - az
  const acx = cx - ax
  const acy = cy - ay
  const acz = cz - az
  const nx = aby * acz - abz * acy
  const ny = abz * acx - abx * acz
  const nz = abx * acy - aby * acx
  pushNormal(normals, a, nx, ny, nz)
  pushNormal(normals, b, nx, ny, nz)
  pushNormal(normals, c, nx, ny, nz)
}

const normalizeNormals = (normals: Float32Array): void => {
  for (let i = 0; i < normals.length; i += 3) {
    const x = normals[i] ?? 0
    const y = normals[i + 1] ?? 0
    const z = normals[i + 2] ?? 0
    const length = Math.hypot(x, y, z)
    if (length <= 0.000001) {
      normals[i] = 0
      normals[i + 1] = 1
      normals[i + 2] = 0
    } else {
      normals[i] = x / length
      normals[i + 1] = y / length
      normals[i + 2] = z / length
    }
  }
}

const writeSplatWeights = (
  output: Float32Array,
  indices: Float32Array,
  vertexIndex: number,
  height: number,
  normalY: number,
  heightScale: number,
) => {
  const height01 = clamp01(height / Math.max(0.000001, heightScale))
  const slope = clamp01(1 - Math.max(0, normalY))
  const weights = [
    clamp01(1 - height01 * 2.4) + 0.02,
    clamp01(1 - Math.abs(height01 - 0.35) * 2.2) * (1 - slope * 0.45) + 0.02,
    clamp01(slope * 1.5 + height01 * 0.35) + 0.02,
    clamp01((height01 - 0.72) / 0.28) + 0.02,
  ]
  const total = weights.reduce((sum, value) => sum + value, 0)
  const base = vertexIndex * 4
  output[base] = weights[0]! / total
  output[base + 1] = weights[1]! / total
  output[base + 2] = weights[2]! / total
  output[base + 3] = weights[3]! / total
  indices[base] = defaultTerrainSplatLayerIndices.dirt
  indices[base + 1] = defaultTerrainSplatLayerIndices.grass
  indices[base + 2] = defaultTerrainSplatLayerIndices.rock
  indices[base + 3] = defaultTerrainSplatLayerIndices.snow
}

export const buildTerrainChunkGeometry = (
  options: TerrainChunkBuildOptions,
): TerrainChunkGeometryData => {
  const resolution = resolvedResolution(options.resolution)
  const verticesPerSide = resolution + 3
  const cellsPerSide = verticesPerSide - 1
  const vertexCount = verticesPerSide * verticesPerSide
  const indexCount = cellsPerSide * cellsPerSide * 6
  const positions = new Float32Array(vertexCount * 3)
  const normals = new Float32Array(vertexCount * 3)
  const uvs = new Float32Array(vertexCount * 2)
  const indices = new Uint32Array(indexCount)
  const splatTextureIndices = new Float32Array(vertexCount * 4)
  const splatWeights = new Float32Array(vertexCount * 4)
  const sampler =
    options.heightSampler ??
    createDeterministicTerrainHeightSampler(options.noise ?? defaultTerrainNoiseOptions)
  const skirtDepth = Math.max(0, options.skirtDepth ?? 10)
  const splatHeightScale = Math.max(
    0.000001,
    options.splatHeightScale ??
      options.noise?.height ??
      defaultTerrainNoiseOptions.height,
  )
  let skirtVertexCount = 0

  for (let zIndex = 0; zIndex < verticesPerSide; zIndex += 1) {
    const v = clamp01((zIndex - 1) / resolution)
    const z = lerp(options.bounds.minZ, options.bounds.maxZ, v)

    for (let xIndex = 0; xIndex < verticesPerSide; xIndex += 1) {
      const u = clamp01((xIndex - 1) / resolution)
      const x = lerp(options.bounds.minX, options.bounds.maxX, u)
      const vertexIndex = zIndex * verticesPerSide + xIndex
      const isSkirt =
        xIndex === 0 ||
        zIndex === 0 ||
        xIndex === verticesPerSide - 1 ||
        zIndex === verticesPerSide - 1
      const height = sampler(x, z, 0) - (isSkirt ? skirtDepth : 0)
      const positionBase = vertexIndex * 3
      const uvBase = vertexIndex * 2

      positions[positionBase] = x
      positions[positionBase + 1] = height
      positions[positionBase + 2] = z
      uvs[uvBase] = u
      uvs[uvBase + 1] = v
      if (isSkirt) {
        skirtVertexCount += 1
      }
    }
  }

  let cursor = 0
  const vertexAt = (x: number, z: number): number => z * verticesPerSide + x
  for (let z = 0; z < cellsPerSide; z += 1) {
    for (let x = 0; x < cellsPerSide; x += 1) {
      const a = vertexAt(x, z)
      const b = vertexAt(x + 1, z)
      const c = vertexAt(x + 1, z + 1)
      const d = vertexAt(x, z + 1)
      indices[cursor] = a
      indices[cursor + 1] = d
      indices[cursor + 2] = b
      indices[cursor + 3] = b
      indices[cursor + 4] = d
      indices[cursor + 5] = c
      cursor += 6
    }
  }

  for (let i = 0; i < indices.length; i += 3) {
    addTriangleNormal(positions, normals, indices[i]!, indices[i + 1]!, indices[i + 2]!)
  }
  normalizeNormals(normals)

  for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex += 1) {
    writeSplatWeights(
      splatWeights,
      splatTextureIndices,
      vertexIndex,
      positions[vertexIndex * 3 + 1] ?? 0,
      normals[vertexIndex * 3 + 1] ?? 1,
      splatHeightScale,
    )
  }

  return {
    key: terrainChunkBuildKey(options),
    bounds: options.bounds,
    resolution,
    positions,
    normals,
    uvs,
    indices,
    splatTextureIndices,
    splatWeights,
    skirtVertexCount,
  }
}

export const terrainChunkGeometryTransferList = (
  data: TerrainChunkGeometryData,
): Transferable[] => [
  data.positions.buffer as ArrayBuffer,
  data.normals.buffer as ArrayBuffer,
  data.uvs.buffer as ArrayBuffer,
  data.indices.buffer as ArrayBuffer,
  data.splatTextureIndices.buffer as ArrayBuffer,
  data.splatWeights.buffer as ArrayBuffer,
]

export const terrainChunkWorkerUrl = (
  baseUrl: string | URL = import.meta.url,
): URL => new URL("./terrainPrimitives.worker.ts", baseUrl)

export const createTerrainChunkWorker = (
  workerUrl: string | URL = terrainChunkWorkerUrl(),
): Worker => new Worker(workerUrl, { type: "module" })

export class TerrainChunkPool<TChunk> {
  #availableByWidth = new Map<number, TChunk[]>()
  #retired: Array<Readonly<{ width: number; chunk: TChunk }>> = []

  acquire(
    width: number,
    create: () => TChunk,
    reset?: (chunk: TChunk, width: number) => void,
  ): TerrainChunkPoolAcquire<TChunk> {
    const key = Math.max(0, width)
    const available = this.#availableByWidth.get(key) ?? []
    const chunk = available.pop()
    if (available.length === 0) {
      this.#availableByWidth.delete(key)
    } else {
      this.#availableByWidth.set(key, available)
    }

    if (chunk !== undefined) {
      reset?.(chunk, key)
      return { width: key, chunk, reused: true }
    }

    const created = create()
    reset?.(created, key)
    return { width: key, chunk: created, reused: false }
  }

  release(width: number, chunk: TChunk): void {
    const key = Math.max(0, width)
    const available = this.#availableByWidth.get(key) ?? []
    available.push(chunk)
    this.#availableByWidth.set(key, available)
  }

  retire(width: number, chunk: TChunk): void {
    this.#retired.push({ width: Math.max(0, width), chunk })
  }

  recycleRetired(onRecycle?: (chunk: TChunk, width: number) => void): number {
    const retired = this.#retired.splice(0)
    for (const record of retired) {
      onRecycle?.(record.chunk, record.width)
      this.release(record.width, record.chunk)
    }
    return retired.length
  }

  clear(onDispose?: (chunk: TChunk, width: number) => void): void {
    for (const record of this.#retired.splice(0)) {
      onDispose?.(record.chunk, record.width)
    }
    for (const [width, chunks] of this.#availableByWidth) {
      for (const chunk of chunks) {
        onDispose?.(chunk, width)
      }
    }
    this.#availableByWidth.clear()
  }

  snapshot(): TerrainChunkPoolSnapshot {
    return {
      availableByWidth: [...this.#availableByWidth.entries()]
        .map(([width, chunks]) => ({ width, count: chunks.length }))
        .sort((a, b) => a.width - b.width),
      retiredCount: this.#retired.length,
    }
  }
}
