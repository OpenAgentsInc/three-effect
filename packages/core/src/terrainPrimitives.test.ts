import { describe, expect, test } from "bun:test"

import {
  buildTerrainChunkGeometry,
  createDeterministicTerrainHeightSampler,
  defaultTerrainSplatLayerIndices,
  planTerrainQuadtreeLod,
  quickMmorpgTerrainPrimitiveSourceRefs,
  sampleTerrainHeight,
  terrainChunkGeometryTransferList,
  terrainChunkKey,
  TerrainChunkPool,
  terrainChunkWorkerUrl,
} from "./index"

describe("terrain primitives", () => {
  test("samples deterministic terrain heights from Quick-style noise options", () => {
    expect(quickMmorpgTerrainPrimitiveSourceRefs).toContain(
      "projects/repos/Quick_3D_MMORPG/client/src/terrain-builder-threaded-worker.js",
    )

    const options = {
      seed: 7,
      octaves: 4,
      persistence: 0.5,
      lacunarity: 1.75,
      exponentiation: 2,
      height: 120,
      scale: 500,
    }
    const a = sampleTerrainHeight(125, -300, 0, options)
    const b = sampleTerrainHeight(125, -300, 0, options)
    const c = sampleTerrainHeight(126, -300, 0, options)
    const differentSeed = sampleTerrainHeight(125, -300, 0, {
      ...options,
      seed: 8,
    })

    expect(a).toBe(b)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThanOrEqual(options.height)
    expect(c).not.toBe(a)
    expect(differentSeed).not.toBe(a)
  })

  test("plans stable quadtree LOD chunks around the focus", () => {
    const first = planTerrainQuadtreeLod({
      rootSize: 512,
      minCellSize: 128,
      focus: { x: 0, z: 0 },
      maxDepth: 4,
    })
    const second = planTerrainQuadtreeLod({
      rootSize: 512,
      minCellSize: 128,
      focus: { x: 0, z: 0 },
      maxDepth: 4,
    })

    expect(first.map(node => node.key)).toEqual(second.map(node => node.key))
    expect(first.length).toBeGreaterThan(1)
    expect(first.some(node => node.size === 128)).toBe(true)
    expect(first.every(node => node.size >= 128)).toBe(true)
  })

  test("keeps chunk keys stable across equivalent bounds", () => {
    const key = terrainChunkKey(
      { minX: -64, minZ: 0, maxX: 0, maxZ: 64 },
      3,
    )
    expect(key).toBe("lod:3:x:-64:z:0:w:64")
    expect(
      terrainChunkKey({ minX: -64.0000001, minZ: 0, maxX: 0, maxZ: 64 }, 3),
    ).toBe(key)
  })

  test("builds chunk geometry with skirts and splat weights", () => {
    const heightSampler = createDeterministicTerrainHeightSampler({
      seed: 4,
      octaves: 3,
      exponentiation: 1.2,
      height: 20,
      scale: 90,
    })
    const data = buildTerrainChunkGeometry({
      key: "chunk:test",
      bounds: { minX: -32, minZ: -32, maxX: 32, maxZ: 32 },
      resolution: 4,
      heightSampler,
      skirtDepth: 5,
      splatHeightScale: 20,
    })

    const verticesPerSide = 7
    const vertexCount = verticesPerSide * verticesPerSide
    expect(data.key).toBe("chunk:test")
    expect(data.positions).toHaveLength(vertexCount * 3)
    expect(data.normals).toHaveLength(vertexCount * 3)
    expect(data.uvs).toHaveLength(vertexCount * 2)
    expect(data.indices).toHaveLength(6 * 6 * 6)
    expect(data.splatWeights).toHaveLength(vertexCount * 4)
    expect(data.splatTextureIndices.slice(0, 4)).toEqual(
      new Float32Array([
        defaultTerrainSplatLayerIndices.dirt,
        defaultTerrainSplatLayerIndices.grass,
        defaultTerrainSplatLayerIndices.rock,
        defaultTerrainSplatLayerIndices.snow,
      ]),
    )
    expect(data.skirtVertexCount).toBe(24)

    const skirtHeight = data.positions[1]!
    const innerHeight = data.positions[(verticesPerSide + 1) * 3 + 1]!
    expect(innerHeight - skirtHeight).toBeCloseTo(5)

    const weightTotal =
      data.splatWeights[0]! +
      data.splatWeights[1]! +
      data.splatWeights[2]! +
      data.splatWeights[3]!
    expect(weightTotal).toBeCloseTo(1)
    expect(data.normals[1]).toBeGreaterThan(0)
  })

  test("exposes transferable worker geometry buffers and a bundler URL", () => {
    const data = buildTerrainChunkGeometry({
      bounds: { minX: 0, minZ: 0, maxX: 8, maxZ: 8 },
      resolution: 2,
      noise: { seed: 2, octaves: 2, height: 4, scale: 20 },
    })
    const transfers = terrainChunkGeometryTransferList(data)

    expect(transfers).toHaveLength(6)
    expect(transfers[0]).toBe(data.positions.buffer)
    expect(
      terrainChunkWorkerUrl("https://example.com/pkg/terrainPrimitives.ts").href,
    ).toBe("https://example.com/pkg/terrainPrimitives.worker.ts")
  })

  test("reuses retired chunks through width-keyed pool", () => {
    const pool = new TerrainChunkPool<{ id: string; width?: number }>()
    let created = 0

    const first = pool.acquire(64, () => {
      created += 1
      return { id: "chunk-a" }
    })
    expect(first.reused).toBe(false)
    pool.retire(first.width, first.chunk)
    expect(pool.snapshot().retiredCount).toBe(1)
    expect(pool.recycleRetired(chunk => {
      chunk.width = 64
    })).toBe(1)

    const second = pool.acquire(64, () => {
      created += 1
      return { id: "chunk-b" }
    })
    expect(second.reused).toBe(true)
    expect(second.chunk.id).toBe("chunk-a")
    expect(second.chunk.width).toBe(64)
    expect(created).toBe(1)
  })
})
