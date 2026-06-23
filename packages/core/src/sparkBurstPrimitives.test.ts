import { describe, expect, test } from "bun:test"
import * as Three from "three"

import { createSparkBurst, createSparkPool } from "./sparkBurstPrimitives"

const attr = (
  handle: ReturnType<typeof createSparkBurst>,
  name: string,
): Three.InstancedBufferAttribute => {
  const mesh = handle.object3D as Three.Mesh
  const geometry = mesh.geometry as Three.InstancedBufferGeometry
  return geometry.getAttribute(name) as Three.InstancedBufferAttribute
}

const liveSpawnTimes = (
  handle: ReturnType<typeof createSparkBurst>,
): number[] => {
  const a = attr(handle, "spawnTime")
  const out: number[] = []
  for (let i = 0; i < handle.count(); i += 1) out.push(a.getX(i))
  return out
}

const snapshotLive = (
  handle: ReturnType<typeof createSparkBurst>,
): Array<Record<string, number>> => {
  const out: Array<Record<string, number>> = []
  const sp = attr(handle, "startPosition")
  const sv = attr(handle, "startVelocity")
  const ac = attr(handle, "acceleration")
  const st = attr(handle, "spawnTime")
  const cm = attr(handle, "colorMix")
  for (let i = 0; i < handle.count(); i += 1) {
    out.push({
      spx: sp.getX(i),
      spy: sp.getY(i),
      spz: sp.getZ(i),
      svx: sv.getX(i),
      svy: sv.getY(i),
      svz: sv.getZ(i),
      acx: ac.getX(i),
      acy: ac.getY(i),
      acz: ac.getZ(i),
      st: st.getX(i),
      cm: cm.getX(i),
    })
  }
  return out
}

describe("createSparkBurst handle contract", () => {
  test("exposes the sibling-primitive handle shape", () => {
    const handle = createSparkBurst({ seed: 1 })
    expect(handle.object3D).toBeInstanceOf(Three.Object3D)
    expect(typeof handle.update).toBe("function")
    expect(typeof handle.dispose).toBe("function")
    expect(handle.object3D.userData.openagentsPrimitive).toBe("spark_burst")
    handle.dispose()
  })

  test("createSparkPool is an alias of createSparkBurst", () => {
    expect(createSparkPool).toBe(createSparkBurst)
  })

  test("emitters are additive, toneMapped=false, HDR-bright (bloom-ready)", () => {
    const handle = createSparkBurst({ seed: 1, emissiveStrength: 18 })
    const material = (handle.object3D as Three.Mesh)
      .material as Three.ShaderMaterial
    expect(material.blending).toBe(Three.AdditiveBlending)
    expect(material.toneMapped).toBe(false)
    expect(material.depthWrite).toBe(false)
    expect(material.uniforms.uEmissiveStrength?.value).toBe(18)
    // hdrBoost aliases emissiveStrength.
    const aliased = createSparkBurst({ seed: 1, hdrBoost: 9 })
    expect(
      ((aliased.object3D as Three.Mesh).material as Three.ShaderMaterial)
        .uniforms.uEmissiveStrength.value,
    ).toBe(9)
    handle.dispose()
    aliased.dispose()
  })
})

describe("determinism (seeded RNG, our evidence rule)", () => {
  test("same seed => identical per-instance attributes", () => {
    const a = createSparkBurst({ seed: 6013, autoEmit: false })
    const b = createSparkBurst({ seed: 6013, autoEmit: false })
    a.burst(40)
    b.burst(40)
    expect(snapshotLive(a)).toEqual(snapshotLive(b))
    a.dispose()
    b.dispose()
  })

  test("different seeds => different particles", () => {
    const a = createSparkBurst({ seed: 1, autoEmit: false })
    const b = createSparkBurst({ seed: 2, autoEmit: false })
    a.burst(40)
    b.burst(40)
    expect(snapshotLive(a)).not.toEqual(snapshotLive(b))
    a.dispose()
    b.dispose()
  })

  test("auto-emit over a fixed delta schedule is deterministic", () => {
    const drive = (seed: number): number[] => {
      const h = createSparkBurst({ seed, rate: 60, lifetime: 1.3 })
      for (let i = 0; i < 30; i += 1) h.update(1 / 60)
      const live = snapshotLive(h).map((r) => r.st)
      h.dispose()
      return live
    }
    expect(drive(99)).toEqual(drive(99))
  })
})

describe("bounded capacity", () => {
  test("burst never exceeds capacity", () => {
    const handle = createSparkBurst({ seed: 1, capacity: 16, autoEmit: false })
    const spawned = handle.burst(1000)
    expect(spawned).toBe(16)
    expect(handle.count()).toBe(16)
    expect(handle.capacity).toBe(16)
    handle.dispose()
  })

  test("emit returns false when full; draw count tracks live sparks", () => {
    const handle = createSparkBurst({ seed: 1, capacity: 3, autoEmit: false })
    expect(handle.emit()).toBe(true)
    expect(handle.emit()).toBe(true)
    expect(handle.emit()).toBe(true)
    expect(handle.emit()).toBe(false)
    expect(handle.count()).toBe(3)
    const geometry = (handle.object3D as Three.Mesh)
      .geometry as Three.InstancedBufferGeometry
    expect(geometry.instanceCount).toBe(3)
    handle.dispose()
  })

  test("auto-emit at a high rate stays clamped to capacity", () => {
    const handle = createSparkBurst({
      seed: 1,
      capacity: 8,
      rate: 100000,
      lifetime: 100,
    })
    for (let i = 0; i < 10; i += 1) handle.update(1)
    expect(handle.count()).toBeLessThanOrEqual(8)
    handle.dispose()
  })
})

describe("dense-swap pooling preserves attributes", () => {
  test("retiring a middle spark moves the last live spark into its slot, copying all attributes", () => {
    const handle = createSparkBurst({
      seed: 7,
      capacity: 32,
      lifetime: 1.0,
      autoEmit: false,
    })

    // Spawn 3 sparks at t=0.
    handle.burst(3)
    // Advance 0.5s, then spawn a 4th younger spark.
    handle.update(0.5)
    handle.burst(1)
    expect(handle.count()).toBe(4)

    // Identify the youngest spark (spawnTime ~0.5) — it is the last live slot.
    const before = snapshotLive(handle)
    const youngest = before[3]
    expect(youngest.st).toBeCloseTo(0.5, 5)

    // Advance so the original 3 (spawnTime 0, lifetime 1.0) expire but the
    // youngest (spawnTime 0.5) survives. At t=1.05 the youngest age is 0.55.
    handle.update(0.55)

    expect(handle.count()).toBe(1)
    const after = snapshotLive(handle)
    // The surviving spark must be the youngest, with ALL attributes intact.
    expect(after[0].st).toBeCloseTo(youngest.st, 5)
    expect(after[0].svx).toBeCloseTo(youngest.svx, 5)
    expect(after[0].svy).toBeCloseTo(youngest.svy, 5)
    expect(after[0].svz).toBeCloseTo(youngest.svz, 5)
    expect(after[0].cm).toBeCloseTo(youngest.cm, 5)
    handle.dispose()
  })

  test("all sparks expiring leaves an empty, drawable-zero pool", () => {
    const handle = createSparkBurst({ seed: 3, lifetime: 0.5, autoEmit: false })
    handle.burst(10)
    expect(handle.count()).toBe(10)
    handle.update(0.6)
    expect(handle.count()).toBe(0)
    const geometry = (handle.object3D as Three.Mesh)
      .geometry as Three.InstancedBufferGeometry
    expect(geometry.instanceCount).toBe(0)
    handle.dispose()
  })
})

describe("simulation + dispose", () => {
  test("uTime advances with update and a fresh burst records the current time", () => {
    const handle = createSparkBurst({ seed: 1, autoEmit: false, lifetime: 10 })
    handle.update(0.25)
    handle.update(0.25)
    handle.burst(2)
    // Both sparks spawned at elapsed=0.5.
    for (const t of liveSpawnTimes(handle)) expect(t).toBeCloseTo(0.5, 5)
    const material = (handle.object3D as Three.Mesh)
      .material as Three.ShaderMaterial
    expect(material.uniforms.uTime.value).toBeCloseTo(0.5, 5)
    handle.dispose()
  })

  test("dispose frees GPU resources and detaches the mesh", () => {
    const parent = new Three.Group()
    const handle = createSparkBurst({ seed: 1 })
    parent.add(handle.object3D)
    expect(handle.object3D.parent).toBe(parent)

    const mesh = handle.object3D as Three.Mesh
    const geometry = mesh.geometry as Three.InstancedBufferGeometry
    const material = mesh.material as Three.ShaderMaterial
    let geometryDisposed = false
    let materialDisposed = false
    geometry.addEventListener("dispose", () => {
      geometryDisposed = true
    })
    material.addEventListener("dispose", () => {
      materialDisposed = true
    })

    handle.dispose()
    expect(geometryDisposed).toBe(true)
    expect(materialDisposed).toBe(true)
    expect(handle.object3D.parent).toBeNull()
  })
})
