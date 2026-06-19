import { describe, expect, test } from "bun:test"
import * as Three from "three"

import {
  arwesHudPrimitiveSourceRefs,
  createHudAnimator,
  createHudDotGrid,
  createHudFrameCorners,
  createHudFrameLines,
  createHudFrameUnderline,
  createHudGridLines,
  createHudIlluminator,
  createHudMeter,
  createHudScanlines,
  createHudSeparator,
  createHudStatusLight,
  defaultHudFrameOptions,
  HUD_ANIMATOR_DEFAULT_DURATION,
  HUD_METER_DEFAULT_THRESHOLDS,
  HUD_STATUS_COLORS,
  hudAnimatorTotalDuration,
  hudChildProgress,
  hudClamp01,
  hudCornerBracketPoints,
  hudDotGridPositions,
  hudEaseInOut,
  hudFrameLinePoints,
  hudGridLinePositions,
  hudMeterStatusAt,
  hudStatusColor,
  hudUnderlineOutlinePoints,
  resolveHudAnimatorOptions,
} from "./hudPrimitives"

describe("hud theme", () => {
  test("status color lookup returns palette entries", () => {
    expect(hudStatusColor("success")).toBe(HUD_STATUS_COLORS.success)
    expect(hudStatusColor("error")).toBe(0xff4d4d)
  })

  test("source refs cite the Arwes packages and the audit", () => {
    expect(arwesHudPrimitiveSourceRefs.length).toBeGreaterThan(0)
    expect(
      arwesHudPrimitiveSourceRefs.some((ref) => ref.includes("arwes")),
    ).toBe(true)
    expect(
      arwesHudPrimitiveSourceRefs.some((ref) =>
        ref.includes("previous-hud-systems-audit"),
      ),
    ).toBe(true)
  })
})

describe("hud easing + clamp", () => {
  test("hudClamp01 clamps to [0,1]", () => {
    expect(hudClamp01(-2)).toBe(0)
    expect(hudClamp01(0.4)).toBe(0.4)
    expect(hudClamp01(5)).toBe(1)
  })

  test("hudEaseInOut is monotone with fixed endpoints", () => {
    expect(hudEaseInOut(0)).toBe(0)
    expect(hudEaseInOut(1)).toBe(1)
    expect(hudEaseInOut(0.5)).toBeCloseTo(0.5, 5)
    expect(hudEaseInOut(0.25)).toBeLessThan(hudEaseInOut(0.75))
  })
})

describe("hud animator (pure state machine)", () => {
  test("resolve fills defaults", () => {
    const resolved = resolveHudAnimatorOptions({ childCount: 3 })
    expect(resolved.childCount).toBe(3)
    expect(resolved.manager).toBe("parallel")
    expect(resolved.duration).toEqual(HUD_ANIMATOR_DEFAULT_DURATION)
  })

  test("stagger total duration accounts for per-child offset", () => {
    const resolved = resolveHudAnimatorOptions({
      childCount: 5,
      manager: "stagger",
    })
    // delay + stagger*(n-1) + enter
    expect(hudAnimatorTotalDuration(resolved, "enter")).toBeCloseTo(
      0 + 0.04 * 4 + 0.4,
      6,
    )
  })

  test("parallel total duration ignores child count", () => {
    const resolved = resolveHudAnimatorOptions({
      childCount: 10,
      manager: "parallel",
    })
    expect(hudAnimatorTotalDuration(resolved, "enter")).toBeCloseTo(0.4, 6)
  })

  test("sequence offsets each child by a full enter duration", () => {
    const resolved = resolveHudAnimatorOptions({
      childCount: 2,
      manager: "sequence",
    })
    // child 0 done at t=0.4; child 1 starts at 0.4, eased progress still 0
    expect(hudChildProgress(resolved, 0, 0.4, "enter")).toBeCloseTo(1, 5)
    expect(hudChildProgress(resolved, 1, 0.4, "enter")).toBeCloseTo(0, 5)
    expect(hudChildProgress(resolved, 1, 0.8, "enter")).toBeCloseTo(1, 5)
  })

  test("enter lifecycle drives progress 0 -> 1 and settles entered", () => {
    const animator = createHudAnimator({ childCount: 2, manager: "parallel" })
    expect(animator.state()).toBe("exited")
    expect(animator.progress()).toEqual([0, 0])

    animator.enter()
    expect(animator.state()).toBe("entering")
    const mid = animator.update(0.2)
    expect(mid[0]).toBeGreaterThan(0)
    expect(mid[0]).toBeLessThan(1)

    const done = animator.update(0.5)
    expect(animator.state()).toBe("entered")
    expect(done).toEqual([1, 1])
  })

  test("exit lifecycle drives progress 1 -> 0 and settles exited", () => {
    const animator = createHudAnimator({ childCount: 1 })
    animator.enter()
    animator.update(1)
    expect(animator.state()).toBe("entered")

    animator.exit()
    expect(animator.state()).toBe("exiting")
    animator.update(1)
    expect(animator.state()).toBe("exited")
    expect(animator.progress()).toEqual([0])
  })
})

describe("hud layout math", () => {
  test("corner brackets produce 8 segments within the rect", () => {
    const segments = hudCornerBracketPoints({ width: 2, height: 1 }, 0.25)
    expect(segments.length).toBe(8)
    for (const [a, b] of segments) {
      for (const v of [a, b]) {
        expect(Math.abs(v.x)).toBeLessThanOrEqual(1 + 1e-9)
        expect(Math.abs(v.y)).toBeLessThanOrEqual(0.5 + 1e-9)
      }
    }
    // one top-left segment runs along the top edge for cornerLength
    const topLeftHorizontal = segments[0]
    expect(topLeftHorizontal[0].x).toBeCloseTo(-1, 6)
    expect(topLeftHorizontal[1].x).toBeCloseTo(-1 + 0.25, 6)
  })

  test("corner length is clamped to half-extent", () => {
    const segments = hudCornerBracketPoints({ width: 1, height: 1 }, 10)
    // clamped to min(hw, hh) = 0.5
    expect(segments[0][1].x).toBeCloseTo(0, 6)
  })

  test("frame lines give 2 long edges + 4 ticks", () => {
    const segments = hudFrameLinePoints({ width: 3, height: 2 }, 0.3)
    expect(segments.length).toBe(6)
    // first segment is the full top edge
    expect(segments[0][0].x).toBeCloseTo(-1.5, 6)
    expect(segments[0][1].x).toBeCloseTo(1.5, 6)
  })

  test("underline outline closes its loop with an octagon notch", () => {
    const loop = hudUnderlineOutlinePoints({ width: 2, height: 1 }, 0.3)
    expect(loop.length).toBe(6)
    expect(loop[0].x).toBeCloseTo(loop[loop.length - 1].x, 6)
    expect(loop[0].y).toBeCloseTo(loop[loop.length - 1].y, 6)
    // the bottom-right notch introduces a chamfer point
    expect(loop[2].x).toBeCloseTo(1 - 0.3, 6)
    expect(loop[3].y).toBeCloseTo(-0.5 + 0.3, 6)
  })
})

describe("hud meter thresholds", () => {
  test("threshold coloring selects the highest reached band", () => {
    expect(hudMeterStatusAt(0.1, HUD_METER_DEFAULT_THRESHOLDS)).toBe("success")
    expect(hudMeterStatusAt(0.75, HUD_METER_DEFAULT_THRESHOLDS)).toBe("warning")
    expect(hudMeterStatusAt(0.99, HUD_METER_DEFAULT_THRESHOLDS)).toBe("error")
  })

  test("unsorted thresholds still resolve correctly", () => {
    const status = hudMeterStatusAt(0.95, [
      { at: 0.9, status: "error" },
      { at: 0, status: "success" },
      { at: 0.7, status: "warning" },
    ])
    expect(status).toBe("error")
  })
})

describe("hud background positions", () => {
  test("dot grid produces a complete lattice", () => {
    const positions = hudDotGridPositions(4, 2, 1)
    // cols=4, rows=2 -> (5)*(3) = 15 points * 3 floats
    expect(positions.length).toBe(15 * 3)
  })

  test("grid lines produce vertical + horizontal segments", () => {
    const positions = hudGridLinePositions(2, 2, 1)
    // x in {-1,0,1} -> 3 vertical; y in {-1,0,1} -> 3 horizontal; each 2 verts*3
    expect(positions.length).toBe((3 + 3) * 2 * 3)
  })
})

// ---------------------------------------------------------------------------
// WebGL-free Three handle construction + disposal (no DOM/canvas required)
// ---------------------------------------------------------------------------

describe("hud frame handles", () => {
  test("corner frame builds a group of lines + background and disposes", () => {
    const frame = createHudFrameCorners({ width: 2, height: 1 })
    expect(frame.lines.length).toBe(8)
    // group contains 8 lines + 1 background mesh by default
    expect(frame.group.children.length).toBe(9)
    expect(defaultHudFrameOptions.background).toBe(true)

    // progress trims each line toward its start point
    frame.setProgress(0)
    const pos = frame.lines[0].geometry.attributes.position as Three.BufferAttribute
    expect(pos.getX(0)).toBeCloseTo(pos.getX(1), 6)
    frame.setProgress([1, 1, 1, 1, 1, 1, 1, 1])

    frame.setColor(0x123456)
    expect(frame.lines[0].material.color.getHex()).toBe(0x123456)

    frame.dispose()
  })

  test("line and underline frames build without background when disabled", () => {
    const lines = createHudFrameLines({ background: false })
    expect(lines.group.children.length).toBe(lines.lines.length)
    lines.dispose()

    const underline = createHudFrameUnderline({ background: false })
    // underline loop has 5 edges
    expect(underline.lines.length).toBe(5)
    underline.dispose()
  })
})

describe("hud indicator handles", () => {
  test("status light builds core + halo and toggles status", () => {
    const light = createHudStatusLight({ status: "warning", pulseHz: 2 })
    expect(light.group.children.length).toBe(2)
    light.update(0.25)
    light.setStatus("error")
    light.dispose()
  })

  test("meter maps value to fill scale + threshold status", () => {
    const meter = createHudMeter({ width: 2, value: 0.5 })
    expect(meter.value()).toBe(0.5)
    expect(meter.status()).toBe("success")
    meter.setValue(0.95)
    expect(meter.value()).toBe(0.95)
    expect(meter.status()).toBe("error")
    meter.dispose()
  })

  test("separator builds a single line", () => {
    const sep = createHudSeparator({ length: 3 })
    const pos = sep.line.geometry.attributes.position as Three.BufferAttribute
    expect(pos.count).toBe(2)
    sep.dispose()
  })
})

describe("hud background + effect handles", () => {
  test("dot grid + grid lines report their counts and dispose", () => {
    const dots = createHudDotGrid({ width: 2, height: 2, spacing: 1 })
    expect(dots.count).toBe(9)
    dots.dispose()

    const grid = createHudGridLines({ width: 2, height: 2, spacing: 1 })
    expect(grid.segmentCount).toBe(6)
    grid.dispose()
  })

  test("scanlines expose a time uniform that update() advances", () => {
    const scan = createHudScanlines({ width: 2, height: 2 })
    expect(scan.mesh.material.uniforms.uTime.value).toBe(0)
    scan.update(1.5)
    expect(scan.mesh.material.uniforms.uTime.value).toBe(1.5)
    scan.dispose()
  })

  test("illuminator builds a glow plane (DOM-free fallback) and moves", () => {
    const glow = createHudIlluminator({ size: 1 })
    glow.moveTo(0.5, -0.5)
    expect(glow.mesh.position.x).toBeCloseTo(0.5, 6)
    glow.setVisible(false)
    expect(glow.mesh.visible).toBe(false)
    glow.dispose()
  })
})
