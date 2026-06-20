import { describe, expect, test } from "bun:test"
import * as Three from "three"

import {
  agentIdentityColor,
  createAgentAvatar,
  createAgentWarpInEffect,
  createCharacterSpawner,
  createEntityRegistry,
  createResourceBar,
  quickMmorpgAgentAvatarPrimitiveSourceRefs,
  quickMmorpgCharacterSpawnerPrimitiveSourceRefs,
  quickMmorpgEntityRegistryPrimitiveSourceRefs,
  quickMmorpgResourceBarPrimitiveSourceRefs,
  resourceBarColorAt,
  resourceBarDefaultThresholds,
  type WasdKeyboardState,
} from "./index"

const keyboard = (
  overrides: Partial<WasdKeyboardState> = {},
): WasdKeyboardState => ({
  backward: false,
  fall: false,
  forward: false,
  left: false,
  right: false,
  rise: false,
  sprint: false,
  ...overrides,
})

// ---------------------------------------------------------------------------
// #5734 entity registry + update-loop + spatial-grid glue
// ---------------------------------------------------------------------------

describe("entity registry primitives (#5734)", () => {
  test("declares its harvest source refs", () => {
    expect(quickMmorpgEntityRegistryPrimitiveSourceRefs).toContain(
      "projects/repos/Quick_3D_MMORPG/client/src/entity-manager.js",
    )
  })

  test("registers, looks up, and removes entities by id", () => {
    const registry = createEntityRegistry<{ tag: string }>()
    registry.register({ id: "a", entity: { tag: "alpha" } })
    registry.register({ id: "b", entity: { tag: "beta" } })

    expect(registry.size()).toBe(2)
    expect(registry.lookup("a")?.tag).toBe("alpha")
    expect(registry.has("b")).toBe(true)
    expect([...registry.ids()].sort()).toEqual(["a", "b"])

    expect(registry.remove("a")).toBe(true)
    expect(registry.lookup("a")).toBeUndefined()
    expect(registry.size()).toBe(1)
  })

  test("replacing an id does not duplicate the entity", () => {
    const registry = createEntityRegistry<number>()
    registry.register({ id: "x", entity: 1 })
    registry.register({ id: "x", entity: 2 })
    expect(registry.size()).toBe(1)
    expect(registry.lookup("x")).toBe(2)
  })

  test("ticks every registered update callback with delta and now", () => {
    const registry = createEntityRegistry<{ value: number }>()
    const ticks: number[] = []
    registry.register({
      id: "a",
      entity: { value: 0 },
      update: (entity, delta) => {
        entity.value += delta
        ticks.push(delta)
      },
    })
    registry.register({
      id: "b",
      entity: { value: 0 },
      update: entity => {
        entity.value += 1
      },
    })

    registry.tick(0.5, 1000)
    registry.tick(0.25, 1250)

    expect(registry.lookup("a")?.value).toBeCloseTo(0.75)
    expect(registry.lookup("b")?.value).toBe(2)
    expect(ticks).toEqual([0.5, 0.25])
  })

  test("proximity query returns nearby entities and excludes self", () => {
    const registry = createEntityRegistry<string>({
      spatial: {
        bounds: { minX: -50, minY: -50, maxX: 50, maxY: 50 },
        cellsX: 10,
        cellsY: 10,
        defaultSize: { width: 1, height: 1 },
      },
    })
    registry.register({ id: "self", entity: "self", position: { x: 0, y: 0 } })
    registry.register({ id: "near", entity: "near", position: { x: 2, y: 1 } })
    registry.register({ id: "far", entity: "far", position: { x: 40, y: 40 } })

    const found = registry
      .near({ x: 0, y: 0 }, 6, "self")
      .map(record => record.id)
      .sort()

    expect(found).toContain("near")
    expect(found).not.toContain("self")
    expect(found).not.toContain("far")
  })

  test("near returns empty when no spatial grid is configured", () => {
    const registry = createEntityRegistry<string>()
    registry.register({ id: "a", entity: "a", position: { x: 0, y: 0 } })
    expect(registry.near({ x: 0, y: 0 }, 100)).toEqual([])
    expect(registry.grid).toBeUndefined()
  })

  test("setPosition moves an entity within the grid", () => {
    const registry = createEntityRegistry<string>({
      spatial: {
        bounds: { minX: -50, minY: -50, maxX: 50, maxY: 50 },
        cellsX: 10,
        cellsY: 10,
      },
    })
    registry.register({ id: "mover", entity: "mover", position: { x: -40, y: -40 } })
    expect(registry.near({ x: 0, y: 0 }, 5).length).toBe(0)
    registry.setPosition("mover", { x: 1, y: 1 })
    expect(registry.near({ x: 0, y: 0 }, 5).map(r => r.id)).toContain("mover")
  })

  test("accepts world-space Vector3-like positions projected onto x/z", () => {
    const registry = createEntityRegistry<string>({
      spatial: {
        bounds: { minX: -50, minY: -50, maxX: 50, maxY: 50 },
        cellsX: 10,
        cellsY: 10,
      },
    })
    registry.register({
      id: "v",
      entity: "v",
      position: new Three.Vector3(3, 99, 4),
    })
    expect(registry.record("v")?.position).toEqual({ x: 3, y: 4 })
  })
})

// ---------------------------------------------------------------------------
// #5733 mana/health/earnings bar billboard
// ---------------------------------------------------------------------------

describe("resource bar primitives (#5733)", () => {
  test("declares its harvest source refs", () => {
    expect(quickMmorpgResourceBarPrimitiveSourceRefs).toContain(
      "projects/repos/Quick_3D_MMORPG/client/src/health-bar.js",
    )
  })

  test("resolves threshold color for a value", () => {
    const thresholds = [
      { at: 0, color: 0xff0000 },
      { at: 0.5, color: 0x00ff00 },
      { at: 0.9, color: 0x0000ff },
    ]
    expect(resourceBarColorAt(0.1, thresholds)).toBe(0xff0000)
    expect(resourceBarColorAt(0.6, thresholds)).toBe(0x00ff00)
    expect(resourceBarColorAt(1, thresholds)).toBe(0x0000ff)
  })

  test("provides distinct default thresholds per kind", () => {
    expect(resourceBarDefaultThresholds("mana").length).toBeGreaterThan(0)
    expect(resourceBarDefaultThresholds("health")).not.toEqual(
      resourceBarDefaultThresholds("earnings"),
    )
  })

  test("renders a [0,1] driven fill and recolors by threshold", () => {
    const bar = createResourceBar({ kind: "health", value: 0.8, width: 2 })
    expect(bar.value()).toBeCloseTo(0.8)
    expect(bar.fill.scale.x).toBeCloseTo(0.8)
    expect(bar.fill.position.x).toBeCloseTo(-0.2)
    const highColor = bar.color()

    bar.setValue(0.1)
    expect(bar.fill.scale.x).toBeCloseTo(0.1)
    const lowColor = bar.color()
    expect(lowColor).not.toBe(highColor)
  })

  test("clamps out-of-range values", () => {
    const bar = createResourceBar({ value: 5 })
    expect(bar.value()).toBe(1)
    bar.setValue(-3)
    expect(bar.value()).toBe(0)
  })

  test("explicit fillColor overrides thresholds", () => {
    const bar = createResourceBar({ fillColor: 0x123456, value: 0.2 })
    expect(bar.color()).toBe(0x123456)
    bar.setValue(0.9)
    expect(bar.color()).toBe(0x123456)
  })

  test("billboards toward a camera and disposes cleanly", () => {
    const camera = new Three.PerspectiveCamera()
    camera.position.set(0, 0, 10)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()
    const bar = createResourceBar({ value: 1 })
    expect(() => bar.faceCamera(camera)).not.toThrow()

    let disposed = false
    bar.fill.geometry.addEventListener("dispose", () => {
      disposed = true
    })
    bar.dispose()
    expect(disposed).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// #5732 agent avatar + warp-in spawn FX
// ---------------------------------------------------------------------------

describe("agent avatar primitives (#5732)", () => {
  test("declares its harvest source refs", () => {
    expect(quickMmorpgAgentAvatarPrimitiveSourceRefs).toContain(
      "projects/repos/Quick_3D_MMORPG/client/src/sorceror-effect.js",
    )
  })

  test("mounts a glyph tinted by identity color", () => {
    const avatar = createAgentAvatar({ color: 0xff8800, radius: 0.5 })
    expect(avatar.group.children).toContain(avatar.core)
    expect(avatar.group.children).toContain(avatar.halo)
    expect(avatar.core.material.color.getHex()).toBe(
      agentIdentityColor(0xff8800).getHex(),
    )
  })

  test("recolors in place", () => {
    const avatar = createAgentAvatar({ color: 0xff0000 })
    avatar.setColor(0x00ff00)
    expect(avatar.core.material.color.getHex()).toBe(0x00ff00)
    expect(avatar.halo.material.color.getHex()).toBe(0x00ff00)
  })

  test("spins on update and disposes cleanly", () => {
    const avatar = createAgentAvatar({ spin: true, spinSpeed: 1 })
    const before = avatar.core.rotation.y
    avatar.update(0.5)
    expect(avatar.core.rotation.y).toBeGreaterThan(before)

    let disposed = false
    avatar.core.geometry.addEventListener("dispose", () => {
      disposed = true
    })
    avatar.dispose()
    expect(disposed).toBe(true)
  })

  test("warp-in FX renders a finite particle burst", () => {
    const result = createAgentWarpInEffect({
      at: [0, 0, 0],
      color: 0x7fd4ff,
      durationMs: 100,
      count: 32,
    })
    expect(result.rendered).toBe(true)
    if (!result.rendered) throw new Error("expected render")
    expect(result.handle.object3D).toBeInstanceOf(Three.Points)
    expect(result.handle.done()).toBe(false)
    // Drive past the duration; the burst should complete.
    result.handle.update(60)
    result.handle.update(60)
    expect(result.handle.done()).toBe(true)
    expect(result.handle.progress()).toBe(1)
    result.handle.dispose()
  })

  test("warp-in respects required evidence gating", () => {
    const missing = createAgentWarpInEffect({
      at: [0, 0, 0],
      evidenceMode: "required",
    })
    expect(missing.rendered).toBe(false)

    const ok = createAgentWarpInEffect({
      at: [0, 0, 0],
      evidenceMode: "required",
      sourceRefs: ["motion://agent/spawn/1"],
    })
    expect(ok.rendered).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// #5731 createCharacterSpawner factory
// ---------------------------------------------------------------------------

describe("character spawner primitives (#5731)", () => {
  test("declares its harvest source refs", () => {
    expect(quickMmorpgCharacterSpawnerPrimitiveSourceRefs).toContain(
      "projects/repos/Quick_3D_MMORPG/client/src/spawners.js",
    )
  })

  test("spawns a controllable local entity that moves under WASD", () => {
    const handle = createCharacterSpawner({
      mode: "local",
      keyboard: keyboard({ forward: true }),
      position: [0, 0, 0],
      controller: { walkSpeed: 4, acceleration: 30 },
    })
    expect(handle.mode).toBe("local")

    const start = handle.snapshot().position.clone()
    for (let i = 0; i < 10; i += 1) {
      handle.update(1 / 60)
    }
    const end = handle.snapshot().position
    // Default forward axis is -Z.
    expect(end.z).toBeLessThan(start.z)
    handle.dispose()
  })

  test("spawns an interpolated remote entity that approaches its target", () => {
    const handle = createCharacterSpawner({
      mode: "remote",
      initial: { id: "remote-1", position: [0, 0, 0] },
      interpolation: { interpolateMs: 100 },
    })
    expect(handle.mode).toBe("remote")
    expect(handle.applyTransform).toBeDefined()

    handle.applyTransform?.({ id: "remote-1", position: [10, 0, 0] })
    handle.update(0.05) // 50ms => halfway
    const mid = handle.snapshot().position.x
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(10)

    handle.update(0.1) // overshoot the window => clamps to target
    expect(handle.snapshot().position.x).toBeCloseTo(10)
    handle.dispose()
  })

  test("attaches a third-person follow camera in local mode", () => {
    const camera = new Three.PerspectiveCamera()
    const handle = createCharacterSpawner({
      mode: "local",
      keyboard: keyboard(),
      camera,
    })
    expect(handle.followCamera).toBeDefined()
    handle.update(1 / 60)
    handle.dispose()
  })

  test("drives an animation FSM through idle/walk/run/spawn beats", () => {
    const track = new Three.VectorKeyframeTrack(
      ".position",
      [0, 1],
      [0, 0, 0, 0, 1, 0],
    )
    const clips = [
      new Three.AnimationClip("idle", 1, [track]),
      new Three.AnimationClip("walk", 1, [track]),
      new Three.AnimationClip("run", 1, [track]),
      new Three.AnimationClip("spawn", 0.2, [track]),
    ]
    const handle = createCharacterSpawner({
      mode: "local",
      keyboard: keyboard({ forward: true, sprint: true }),
      clips,
    })
    expect(handle.animation).toBeDefined()
    // Starts in the spawn one-shot.
    expect(handle.animation?.current().state).toBe("spawn")
    // After the spawn one-shot completes and movement input is held, the FSM
    // should reach a locomotion state.
    for (let i = 0; i < 60; i += 1) {
      handle.update(1 / 30)
    }
    expect(["walk", "run", "idle"]).toContain(handle.animation?.current().state)
    handle.dispose()
  })
})
