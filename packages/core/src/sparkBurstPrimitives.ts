import * as Three from "three"

import { type Vector3Like, toVector3 } from "./cameraPrimitives"

/**
 * Instanced additive HDR spark-burst primitive (A4, procedural-vfx).
 *
 * A port of the *ideas* in the `threejs-procedural-vfx` "instanced spark
 * contract" (a fixed-capacity sprite pool where every instance stores
 * `startPosition / startVelocity / acceleration / spawnTime`, with linear size
 * falloff, a circular additive sprite, HDR color fading to dark, and the
 * dense-swap pooling invariant). It does NOT vendor the reference repo: the
 * reference deliberately uses `Math.random`, non-physical `a * t^2`
 * integration, and re-integrated velocity; we re-derive the contract with a
 * SEEDED RNG and the standard kinematic `p = p0 + v0*t + 0.5*a*t^2` so captures
 * are deterministic and replayable (our evidence rule).
 *
 * Designed for the dark `0x050505` Verse: emitters are `toneMapped = false`
 * additive sprites whose color is `color * emissiveStrength`, so they read as
 * energy and are bloom-ready (pairs with A1/A2 and
 * `createEffectComposerResources`). Tuned defaults are RELATIONSHIPS, not the
 * reference's raw 80/30/10 multipliers — re-tuned against this scene.
 *
 * The handle matches the sibling primitives' Effect-friendly contract
 * (`createCracklingArc`, `createGatewayPortal`): `{ object3D, update, dispose }`.
 */

export const openAgentsSparkBurstPrimitiveSourceRefs = [
  "projects/repos/Threejs-Awesome-Graphics-Agent-Skills/skills/threejs-procedural-vfx/references/procedural-vfx-system.md#instanced-spark-contract",
  "openagents/docs/game/2026-06-22-threejs-graphics-skills-audit.md#A4",
] as const

export type SparkBurstOptions = Readonly<{
  /** Maximum number of simultaneously live sparks. Bounded; never exceeded. */
  capacity?: number
  /** World-space origin around which sparks are emitted. */
  position?: Vector3Like
  /** Deterministic seed for the spark RNG. Same seed => same particles. */
  seed?: number
  /** Bright HDR spark core color (before the emissive multiplier). */
  color?: Three.ColorRepresentation
  /** Cooler color the spark fades toward over its life. */
  secondaryColor?: Three.ColorRepresentation
  /**
   * HDR multiplier applied to the spark color so it reads as energy and blooms.
   * Relationship, not the reference's raw 80 — re-tuned for this scene.
   */
  emissiveStrength?: number
  /** Convenience alias for `emissiveStrength`. */
  hdrBoost?: number
  /** Sprites emitted per second when auto-emitting via `update`. */
  rate?: number
  /** Initial radial speed magnitude of a fresh spark. */
  speed?: number
  /** Lateral spread of emission directions, in radians (cone half-angle). */
  spread?: number
  /** Seconds a spark lives before it is freed. */
  lifetime?: number
  /** Downward (or arbitrary) constant acceleration applied over life. */
  gravity?: number
  /** Base world-space size of a freshly emitted spark sprite. */
  size?: number
  /** When false, `update` does not auto-emit; only explicit `burst`/`emit`. */
  autoEmit?: boolean
}>

export type SparkBurstHandle = Readonly<{
  object3D: Three.Object3D
  /** Advance the simulation, retire expired sparks, and auto-emit if enabled. */
  update: (deltaSeconds: number) => void
  /** Emit a single spark immediately. Returns true if a slot was available. */
  emit: () => boolean
  /** Emit `count` sparks at once (a burst). Returns the number actually spawned. */
  burst: (count: number) => number
  /** Move the emitter origin. */
  setPosition: (position: Vector3Like) => void
  /** Number of currently live sparks. */
  count: () => number
  /** Maximum simultaneous sparks. */
  capacity: number
  dispose: () => void
}>

// mulberry32-style seeded RNG, matching the sibling primitives' generator so
// determinism is consistent across the Verse energy effects.
const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const finitePositive = (value: number | undefined, fallback: number): number =>
  value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback

// Billboarded, additive, circular sprite. Position is integrated analytically
// in the vertex shader from per-instance start state so the CPU update loop only
// has to manage pool occupancy (emit / retire / dense-swap), never per-frame
// position writes for every live spark.
const SPARK_VERTEX_SHADER = /* glsl */ `
  attribute vec3 startPosition;
  attribute vec3 startVelocity;
  attribute vec3 acceleration;
  attribute float spawnTime;
  attribute float colorMix;

  uniform float uTime;
  uniform float uLifetime;
  uniform float uSize;

  varying vec2 vUv;
  varying float vLife;
  varying float vColorMix;

  void main() {
    float age = uTime - spawnTime;
    // 0 at birth -> 1 at death. Outside [0,1] the spark is dead/unborn.
    float life = age / uLifetime;

    // Standard kinematics (deterministic), unlike the reference's a*t^2 quirk.
    vec3 worldPos = startPosition
      + startVelocity * age
      + 0.5 * acceleration * age * age;

    // Linear size falloff to zero over life (procedural-vfx spark contract).
    float scale = uSize * max(1.0 - life, 0.0);
    // Collapse dead/unborn sparks to a degenerate point so they draw nothing.
    if (life < 0.0 || life >= 1.0) scale = 0.0;

    vUv = uv;
    vLife = clamp(life, 0.0, 1.0);
    vColorMix = colorMix;

    // Billboard the unit quad toward the camera in view space.
    vec4 mvCenter = modelViewMatrix * vec4(worldPos, 1.0);
    mvCenter.xy += position.xy * scale;
    gl_Position = projectionMatrix * mvCenter;
  }
`

const SPARK_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform vec3 uColor;
  uniform vec3 uSecondaryColor;
  uniform float uEmissiveStrength;

  varying vec2 vUv;
  varying float vLife;
  varying float vColorMix;

  void main() {
    // Circular additive sprite: soft radial falloff, hard cut outside radius.
    vec2 centered = vUv - vec2(0.5);
    float dist = length(centered) * 2.0;
    if (dist > 1.0) discard;
    float disc = smoothstep(1.0, 0.0, dist);
    // A bright pinhole core on top of the soft disc reads as a spark, not a blob.
    float core = pow(disc, 3.0);
    float intensity = disc * 0.55 + core * 0.85;

    // HDR color fading toward the (darker) secondary color over life, then to
    // black at end-of-life so the additive contribution decays to nothing.
    vec3 baseColor = mix(uColor, uSecondaryColor, mix(vColorMix, 1.0, vLife));
    float fade = 1.0 - vLife;
    vec3 hdr = baseColor * uEmissiveStrength * intensity * fade * fade;

    // Additive blending: alpha is unused for the color contribution, but keep a
    // sensible value so the pass behaves under both Additive and Normal blend.
    gl_FragColor = vec4(hdr, intensity * fade);
  }
`

/**
 * Create a fixed-capacity, instanced, additive HDR spark emitter.
 *
 * Pooling uses the dense-swap invariant from the reference: when a spark dies,
 * the last live spark is moved into the freed slot and ALL of its per-instance
 * attributes (`startPosition / startVelocity / acceleration / spawnTime /
 * colorMix`) are copied, so no stale effect state is ever attached to a moved
 * instance. Only `mesh.count` worth of instances are ever drawn.
 */
export const createSparkBurst = (
  options: SparkBurstOptions = {},
): SparkBurstHandle => {
  const capacity = Math.max(1, Math.floor(options.capacity ?? 256))
  const lifetime = finitePositive(options.lifetime, 1.3)
  const rate = finitePositive(options.rate, 60)
  const speed = finitePositive(options.speed, 1.6)
  const spread = options.spread ?? Math.PI
  const gravity = options.gravity ?? 1.4
  const size = finitePositive(options.size, 0.12)
  const emissiveStrength = finitePositive(
    options.hdrBoost ?? options.emissiveStrength,
    14,
  )
  const autoEmit = options.autoEmit ?? true

  const origin = options.position ? toVector3(options.position) : new Three.Vector3()
  const random = seededRandom(options.seed ?? 1)

  // Per-instance attribute backing arrays. We keep them dense: indices
  // [0, liveCount) are live, the rest are free.
  const startPosition = new Float32Array(capacity * 3)
  const startVelocity = new Float32Array(capacity * 3)
  const acceleration = new Float32Array(capacity * 3)
  const spawnTime = new Float32Array(capacity)
  const colorMix = new Float32Array(capacity)

  const geometry = new Three.InstancedBufferGeometry()
  // Base quad: a unit plane the vertex shader billboards + scales.
  const quad = new Three.PlaneGeometry(1, 1)
  geometry.index = quad.index
  geometry.attributes.position = quad.attributes.position
  geometry.attributes.uv = quad.attributes.uv
  geometry.attributes.normal = quad.attributes.normal

  const startPositionAttr = new Three.InstancedBufferAttribute(startPosition, 3)
  const startVelocityAttr = new Three.InstancedBufferAttribute(startVelocity, 3)
  const accelerationAttr = new Three.InstancedBufferAttribute(acceleration, 3)
  const spawnTimeAttr = new Three.InstancedBufferAttribute(spawnTime, 1)
  const colorMixAttr = new Three.InstancedBufferAttribute(colorMix, 1)
  startPositionAttr.setUsage(Three.DynamicDrawUsage)
  startVelocityAttr.setUsage(Three.DynamicDrawUsage)
  accelerationAttr.setUsage(Three.DynamicDrawUsage)
  spawnTimeAttr.setUsage(Three.DynamicDrawUsage)
  colorMixAttr.setUsage(Three.DynamicDrawUsage)
  geometry.setAttribute("startPosition", startPositionAttr)
  geometry.setAttribute("startVelocity", startVelocityAttr)
  geometry.setAttribute("acceleration", accelerationAttr)
  geometry.setAttribute("spawnTime", spawnTimeAttr)
  geometry.setAttribute("colorMix", colorMixAttr)
  geometry.instanceCount = 0

  const material = new Three.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLifetime: { value: lifetime },
      uSize: { value: size },
      uColor: { value: new Three.Color(options.color ?? 0xff8844) },
      uSecondaryColor: {
        value: new Three.Color(options.secondaryColor ?? 0x331100),
      },
      uEmissiveStrength: { value: emissiveStrength },
    },
    vertexShader: SPARK_VERTEX_SHADER,
    fragmentShader: SPARK_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: Three.AdditiveBlending,
    toneMapped: false,
    side: Three.DoubleSide,
  })

  const mesh = new Three.Mesh(geometry, material)
  mesh.frustumCulled = false
  mesh.userData.openagentsPrimitive = "spark_burst"

  let elapsed = 0
  let liveCount = 0
  let emitAccumulator = 0

  const markDirty = (): void => {
    startPositionAttr.needsUpdate = true
    startVelocityAttr.needsUpdate = true
    accelerationAttr.needsUpdate = true
    spawnTimeAttr.needsUpdate = true
    colorMixAttr.needsUpdate = true
    geometry.instanceCount = liveCount
  }

  // Copy ALL per-instance attribute slices from one slot to another (dense swap).
  const copySlot = (from: number, to: number): void => {
    startPosition[to * 3] = startPosition[from * 3] as number
    startPosition[to * 3 + 1] = startPosition[from * 3 + 1] as number
    startPosition[to * 3 + 2] = startPosition[from * 3 + 2] as number
    startVelocity[to * 3] = startVelocity[from * 3] as number
    startVelocity[to * 3 + 1] = startVelocity[from * 3 + 1] as number
    startVelocity[to * 3 + 2] = startVelocity[from * 3 + 2] as number
    acceleration[to * 3] = acceleration[from * 3] as number
    acceleration[to * 3 + 1] = acceleration[from * 3 + 1] as number
    acceleration[to * 3 + 2] = acceleration[from * 3 + 2] as number
    spawnTime[to] = spawnTime[from] as number
    colorMix[to] = colorMix[from] as number
  }

  const writeSpark = (slot: number): void => {
    // Random direction inside a cone of half-angle `spread` around +Y, with a
    // seeded RNG so the burst is replayable.
    const azimuth = random() * Math.PI * 2
    const cosLimit = Math.cos(Math.min(spread, Math.PI))
    const cosPolar = 1 - random() * (1 - cosLimit)
    const sinPolar = Math.sqrt(Math.max(0, 1 - cosPolar * cosPolar))
    const dirX = Math.cos(azimuth) * sinPolar
    const dirY = cosPolar
    const dirZ = Math.sin(azimuth) * sinPolar
    const velocityScale = speed * (0.55 + random() * 0.9)

    startPosition[slot * 3] = origin.x
    startPosition[slot * 3 + 1] = origin.y
    startPosition[slot * 3 + 2] = origin.z
    startVelocity[slot * 3] = dirX * velocityScale
    startVelocity[slot * 3 + 1] = dirY * velocityScale
    startVelocity[slot * 3 + 2] = dirZ * velocityScale
    acceleration[slot * 3] = 0
    acceleration[slot * 3 + 1] = -gravity
    acceleration[slot * 3 + 2] = 0
    spawnTime[slot] = elapsed
    colorMix[slot] = random()
  }

  const emit = (): boolean => {
    if (liveCount >= capacity) return false
    const slot = liveCount
    liveCount += 1
    writeSpark(slot)
    markDirty()
    return true
  }

  const burst = (count: number): number => {
    let spawned = 0
    const wanted = Math.max(0, Math.floor(count))
    for (let index = 0; index < wanted; index += 1) {
      if (liveCount >= capacity) break
      const slot = liveCount
      liveCount += 1
      writeSpark(slot)
      spawned += 1
    }
    if (spawned > 0) markDirty()
    return spawned
  }

  // Retire expired sparks using the dense-swap invariant: walk the live range,
  // and when a slot is dead, copy the last live slot into it and shrink.
  const retireExpired = (): void => {
    let index = 0
    while (index < liveCount) {
      const age = elapsed - (spawnTime[index] as number)
      if (age >= lifetime) {
        const last = liveCount - 1
        if (index !== last) copySlot(last, index)
        liveCount -= 1
        // Re-test the slot we just swapped in; do not advance `index`.
      } else {
        index += 1
      }
    }
  }

  const update = (deltaSeconds: number): void => {
    const delta = Math.max(0, deltaSeconds)
    elapsed += delta
    material.uniforms.uTime.value = elapsed

    retireExpired()

    if (autoEmit && rate > 0 && delta > 0) {
      emitAccumulator += delta * rate
      const toEmit = Math.floor(emitAccumulator)
      if (toEmit > 0) {
        emitAccumulator -= toEmit
        burst(toEmit)
      }
    }

    markDirty()
  }

  const setPosition = (position: Vector3Like): void => {
    origin.copy(toVector3(position))
  }

  const dispose = (): void => {
    geometry.dispose()
    quad.dispose()
    material.dispose()
    mesh.removeFromParent()
  }

  return {
    object3D: mesh,
    update,
    emit,
    burst,
    setPosition,
    count: () => liveCount,
    capacity,
    dispose,
  }
}

/**
 * Alias matching the audit's "spark pool" naming. A `createSparkPool` reads more
 * naturally for a long-lived portal emitter; `createSparkBurst` reads better for
 * an arc-strike one-shot. They are the same fixed-capacity instanced emitter.
 */
export const createSparkPool = createSparkBurst
