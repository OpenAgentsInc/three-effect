import { describe, expect, test } from "bun:test"
import * as Three from "three"
import { Line2 } from "three/examples/jsm/lines/Line2.js"
import type { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js"

import {
  createGlowLine,
  openAgentsFatLinePrimitiveSourceRefs,
} from "./fatLinePrimitives"

const points = [
  [0, 0, 0],
  [1, 0.5, 0],
  [2, 0, 0],
] as const

describe("Fat glow line primitives (A3)", () => {
  test("cite the audit + reference filament idea", () => {
    expect(openAgentsFatLinePrimitiveSourceRefs).toContain(
      "openagents/docs/game/2026-06-22-threejs-graphics-skills-audit.md#A3",
    )
  })

  test("builds a bright core + soft envelope as two screen-space Line2 lines", () => {
    const glow = createGlowLine({
      points: [...points],
      color: 0x3366ff,
      coreWidth: 2.4,
      envelopeWidth: 8,
      emissiveStrength: 3,
      resolution: [1920, 1080],
    })

    // Two Line2 children: the soft envelope (under) + the bright core (on top).
    const lines = glow.object3D.children.filter(
      (child): child is Line2 => child instanceof Line2,
    )
    expect(lines).toHaveLength(2)
    expect(glow.object3D.userData.openagentsPrimitive).toBe("glow_line")

    const coreMat = glow.core.material as LineMaterial
    const envMat = glow.envelope.material as LineMaterial

    // The core is wider-than-1px (screen-space fat line), HDR (tone-map-exempt,
    // color above the display ceiling, additive) so it blooms.
    expect(coreMat.linewidth).toBeGreaterThan(1)
    expect(coreMat.toneMapped).toBe(false)
    expect(coreMat.blending).toBe(Three.AdditiveBlending)
    expect(
      Math.max(coreMat.color.r, coreMat.color.g, coreMat.color.b),
    ).toBeGreaterThan(1)

    // The envelope is wider than the core and a soft, in-range, low-opacity halo.
    expect(envMat.linewidth).toBeGreaterThan(coreMat.linewidth)
    expect(envMat.opacity).toBeLessThan(coreMat.opacity)

    glow.dispose()
  })

  test("setResolution updates BOTH lines' screen-space resolution", () => {
    const glow = createGlowLine({ points: [...points], resolution: [1, 1] })
    glow.setResolution(1280, 720)
    expect((glow.core.material as LineMaterial).resolution.x).toBe(1280)
    expect((glow.core.material as LineMaterial).resolution.y).toBe(720)
    expect((glow.envelope.material as LineMaterial).resolution.x).toBe(1280)
    expect((glow.envelope.material as LineMaterial).resolution.y).toBe(720)
    glow.dispose()
  })

  test("emissiveStrength 1 keeps a non-HDR, tone-mapped core (existing look)", () => {
    const glow = createGlowLine({ points: [...points], color: 0xffffff })
    const coreMat = glow.core.material as LineMaterial
    expect(coreMat.toneMapped).toBe(true)
    expect(
      Math.max(coreMat.color.r, coreMat.color.g, coreMat.color.b),
    ).toBeLessThanOrEqual(1)
    glow.dispose()
  })

  test("setPoints / setColor / setOpacity do not throw and re-tint the core", () => {
    const glow = createGlowLine({
      points: [...points],
      color: 0x111111,
      emissiveStrength: 4,
    })
    expect(() =>
      glow.setPoints([
        [0, 0, 0],
        [5, 5, 0],
      ]),
    ).not.toThrow()
    glow.setColor(0x44ff88)
    // Re-coloring still applies the HDR multiplier so it stays bloom-bright.
    const coreMat = glow.core.material as LineMaterial
    expect(
      Math.max(coreMat.color.r, coreMat.color.g, coreMat.color.b),
    ).toBeGreaterThan(1)
    glow.setOpacity(0.5)
    expect(coreMat.opacity).toBeCloseTo(0.5)
    glow.dispose()
  })
})
