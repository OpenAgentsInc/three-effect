import { describe, expect, test } from "bun:test"
import * as Three from "three"

import {
  type EvidenceBackedCracklingArcOptions,
  createEvidenceBackedCracklingArc,
} from "./inferenceGatewayPrimitives"

// Mirrors exactly the options the isolated standalone scene
// (examples/crackling-arc-standalone) builds from its synthetic event, and
// proves the evidence contract resolves both ways for that shape.
const baseSyntheticArcOptions: EvidenceBackedCracklingArcOptions = {
  from: [-1.6, -0.4, 0],
  to: [1.6, 0.6, 0],
  strandCount: 5,
  rate: 2.6,
  opacity: 0.78,
  color: 0x93c5fd,
  secondaryColor: 0xf8fafc,
  seed: 6013,
  motionKind: "crackling_energy",
  generatedAt: "2026-06-22T00:00:00.000Z",
}

describe("crackling-arc-standalone scene evidence gate", () => {
  test("required mode with no sourceRefs and not simulated refuses to render", () => {
    const result = createEvidenceBackedCracklingArc({
      ...baseSyntheticArcOptions,
      evidenceMode: "required",
    })

    expect(result.rendered).toBe(false)
    if (!result.rendered) {
      expect(result.reason).toBe("missing_evidence")
    }
  })

  test("required mode renders when sourceRefs are present", () => {
    const result = createEvidenceBackedCracklingArc({
      ...baseSyntheticArcOptions,
      sourceRefs: ["github:OpenAgentsInc/openagents#6013"],
      evidenceMode: "required",
    })

    expect(result.rendered).toBe(true)
    if (result.rendered) {
      expect(result.evidence.sourceRefs).toContain(
        "github:OpenAgentsInc/openagents#6013",
      )
      result.handle.dispose()
    }
  })

  test("the scene's actual synthetic event (simulated + optional) renders", () => {
    const result = createEvidenceBackedCracklingArc({
      ...baseSyntheticArcOptions,
      sourceRefs: ["github:OpenAgentsInc/openagents#6013"],
      simulated: true,
      evidenceMode: "optional",
    })

    expect(result.rendered).toBe(true)
    if (result.rendered) {
      expect(result.handle.object3D.userData.openagentsPrimitive).toBe(
        "crackling_arc",
      )
      // Animates: positions change after an update tick.
      const line = result.handle.object3D.children.find(
        (child): child is Three.Line => child instanceof Three.Line,
      )
      if (line === undefined) throw new Error("expected a line child")
      const positions = (): Float32Array =>
        (line.geometry.getAttribute("position") as Three.BufferAttribute)
          .array as Float32Array
      const before = [...positions()]
      result.handle.update(0.25)
      expect([...positions()]).not.toEqual(before)
      result.handle.dispose()
    }
  })

  test("simulated alone (no sourceRefs) still satisfies required mode", () => {
    const result = createEvidenceBackedCracklingArc({
      ...baseSyntheticArcOptions,
      simulated: true,
      evidenceMode: "required",
    })

    expect(result.rendered).toBe(true)
    if (result.rendered) result.handle.dispose()
  })
})
