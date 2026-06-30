import { describe, expect, test } from "bun:test"
import * as Three from "three"
import { Line2 } from "three/examples/jsm/lines/Line2.js"
import type { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js"

import {
  commandComposerHudCoreOpacity,
  commandComposerHudLayoutFromCssRect,
  createCommandComposerHud,
  openAgentsCommandComposerHudPrimitiveSourceRefs,
  resolveCommandComposerHudOptions,
} from "./commandComposerHudPrimitives"

describe("command composer HUD source contract", () => {
  test("cites the OpenAgents ADR, StarCraft direction, and ProseMirror cursor ideas", () => {
    expect(openAgentsCommandComposerHudPrimitiveSourceRefs).toContain(
      "OpenAgentsInc/three-effect#18",
    )
    expect(
      openAgentsCommandComposerHudPrimitiveSourceRefs.some((ref) =>
        ref.includes("0013-adopt-prosemirror-inspired-command-composer"),
      ),
    ).toBe(true)
    expect(
      openAgentsCommandComposerHudPrimitiveSourceRefs.some((ref) =>
        ref.includes("prosemirror-dropcursor"),
      ),
    ).toBe(true)
  })

  test("resolves CSS rectangles into reusable world-space layout", () => {
    const layout = commandComposerHudLayoutFromCssRect(
      { width: 720, height: 190 },
      { pixelsPerWorldUnit: 100 },
    )
    expect(layout.width).toBeCloseTo(7.2, 6)
    expect(layout.height).toBeCloseTo(1.9, 6)
    expect(layout.attachmentRailHeight).toBeGreaterThan(0)
  })

  test("option resolution keeps projection data typed and bounded", () => {
    const resolved = resolveCommandComposerHudOptions({
      layout: { width: -1, height: 0 },
      focused: true,
      dropcursor: { visible: true, x: 0.4, intensity: 2 },
      attachments: [{ id: "a", kind: "image", status: "ready" }],
    })
    expect(resolved.layout.width).toBeGreaterThan(0)
    expect(resolved.focused).toBe(true)
    expect(resolved.dropcursor.visible).toBe(true)
    expect(resolved.attachments[0]?.kind).toBe("image")
  })
})

describe("createCommandComposerHud", () => {
  test("builds border energy as line primitives, not an inner focus slab", () => {
    const hud = createCommandComposerHud({
      focused: true,
      layout: { width: 6, height: 1.6 },
      attachments: [{ id: "file-1", kind: "file", status: "staged" }],
    })

    expect(hud.object3D).toBeInstanceOf(Three.Group)
    expect(hud.object3D.userData.openagentsPrimitive).toBe(
      "command_composer_hud",
    )
    const edgeLines = hud.edgeEnergy.object3D.children.filter(
      (child): child is Line2 => child instanceof Line2,
    )
    expect(edgeLines).toHaveLength(2)
    expect(
      hud.object3D.children.some(
        (child) => child.userData.openagentsRole === "edge-energy",
      ),
    ).toBe(true)
    expect(
      hud.object3D.children.some(
        (child) => child.userData.openagentsRole === "focus-slab",
      ),
    ).toBe(false)

    hud.dispose()
  })

  test("reduced motion pauses scanner time while preserving visible framing", () => {
    const hud = createCommandComposerHud({
      focused: true,
      reducedMotion: true,
    })
    expect(hud.scannerPlane.material.uniforms.uSpeed.value).toBe(0)
    hud.update(1)
    expect(hud.scannerPlane.material.uniforms.uTime.value).toBe(0)
    expect(commandComposerHudCoreOpacity(hud)).toBeGreaterThan(0)
    hud.setReducedMotion(false)
    expect(hud.scannerPlane.material.uniforms.uSpeed.value).toBeGreaterThan(0)
    hud.update(1)
    expect(hud.scannerPlane.material.uniforms.uTime.value).toBeGreaterThan(0)
    hud.dispose()
  })

  test("dropcursor visibility and resolution are controllable from projection state", () => {
    const hud = createCommandComposerHud({
      focused: true,
      dropcursor: { visible: false },
    })
    expect(hud.dropcursorBeam.object3D.visible).toBe(false)
    hud.setDropcursor({ visible: true, x: 0.5, intensity: 0.7 })
    hud.update(0.016)
    expect(hud.dropcursorBeam.object3D.visible).toBe(true)
    const coreMaterial = hud.dropcursorBeam.core.material as LineMaterial
    expect(coreMaterial.opacity).toBeCloseTo(0.7)

    hud.setResolution(1920, 1080)
    expect((hud.edgeEnergy.core.material as LineMaterial).resolution.x).toBe(
      1920,
    )
    expect((hud.dropcursorBeam.core.material as LineMaterial).resolution.y).toBe(
      1080,
    )
    hud.dispose()
  })

  test("attachment hologram nodes rebuild from typed projections", () => {
    const hud = createCommandComposerHud({
      attachments: [
        { id: "img", kind: "image", status: "ready", selected: true },
        { id: "txt", kind: "text", status: "uploading", progress: 0.5 },
      ],
    })
    expect(hud.attachmentNodes()).toHaveLength(2)
    expect(hud.attachmentNodes()[0]?.userData.attachmentId).toBe("img")

    hud.setAttachments([{ id: "err", kind: "diff", status: "error" }])
    expect(hud.attachmentNodes()).toHaveLength(1)
    expect(hud.attachmentNodes()[0]?.userData.status).toBe("error")
    hud.dispose()
  })

  test("layout changes resize the projected shell without changing the public handle", () => {
    const hud = createCommandComposerHud({ layout: { width: 5, height: 1.2 } })
    const group = hud.object3D
    hud.setLayout({ width: 7, height: 2 })
    expect(hud.object3D).toBe(group)
    expect(hud.projection().layout.width).toBe(7)
    expect(hud.projection().layout.height).toBe(2)
    hud.dispose()
  })
})
