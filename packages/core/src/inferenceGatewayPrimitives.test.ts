import { describe, expect, test } from "bun:test"
import * as Three from "three"

import {
  createCracklingArc,
  createEvidenceBackedCracklingArc,
  createEvidenceBackedGatewayPortal,
  createGatewayPortal,
  inferenceVisualCanRender,
  inferenceVisualHasEvidence,
  openAgentsInferenceGatewayPrimitiveSourceRefs,
} from "./inferenceGatewayPrimitives"

const firstLinePositions = (group: Three.Group): Float32Array => {
  const line = group.children.find((child): child is Three.Line => child instanceof Three.Line)
  if (line === undefined) throw new Error("expected a line child")
  return (line.geometry.getAttribute("position") as Three.BufferAttribute).array as Float32Array
}

const pointsPositions = (group: Three.Group): Float32Array => {
  const points = group.children.find(
    (child): child is Three.Points => child instanceof Three.Points,
  )
  if (points === undefined) throw new Error("expected a points child")
  return (points.geometry.getAttribute("position") as Three.BufferAttribute).array as Float32Array
}

describe("Inference gateway primitives", () => {
  test("cite the Agent Verse roadmap and issue", () => {
    expect(openAgentsInferenceGatewayPrimitiveSourceRefs).toContain(
      "openagents/docs/inference/khala-buildout-roadmap.md#6013-B",
    )
    expect(openAgentsInferenceGatewayPrimitiveSourceRefs).toContain(
      "github:OpenAgentsInc/openagents#6013",
    )
  })

  test("createCracklingArc is deterministic, animated, and retargetable", () => {
    const a = createCracklingArc({
      from: [0, 0, 0],
      to: [2, 0, 0],
      seed: 42,
      segments: 6,
      strandCount: 2,
    })
    const b = createCracklingArc({
      from: [0, 0, 0],
      to: [2, 0, 0],
      seed: 42,
      segments: 6,
      strandCount: 2,
    })

    expect(a.object3D.children).toHaveLength(2)
    expect([...firstLinePositions(a.object3D)]).toEqual([
      ...firstLinePositions(b.object3D),
    ])

    const before = [...firstLinePositions(a.object3D)]
    a.update(0.25)
    expect([...firstLinePositions(a.object3D)]).not.toEqual(before)

    a.setEndpoints([0, 0, 0], [0, 0, 3])
    const retargeted = firstLinePositions(a.object3D)
    expect(retargeted[retargeted.length - 1]).toBeCloseTo(3)

    expect(() => a.dispose()).not.toThrow()
    b.dispose()
  })

  test("createGatewayPortal carries lane/status metadata and updates tone", () => {
    const portal = createGatewayPortal({
      position: [1, 2, 3],
      lane: "fireworks",
      status: "working",
      ringCount: 2,
      sparkCount: 6,
      seed: 7,
    })
    const twin = createGatewayPortal({
      position: [1, 2, 3],
      lane: "fireworks",
      status: "working",
      ringCount: 2,
      sparkCount: 6,
      seed: 7,
    })

    expect(portal.object3D.userData.openagentsPrimitive).toBe("gateway_portal")
    expect(portal.object3D.userData.gatewayLane).toBe("fireworks")
    expect(portal.object3D.position.toArray()).toEqual([1, 2, 3])
    expect([...pointsPositions(portal.object3D)]).toEqual([
      ...pointsPositions(twin.object3D),
    ])

    const ring = portal.object3D.children.find(
      (child): child is Three.Mesh =>
        child instanceof Three.Mesh && child.geometry instanceof Three.TorusGeometry,
    )
    if (ring === undefined) throw new Error("expected a mesh child")
    const beforeRotation = ring.rotation.z
    portal.update(0.5)
    expect(ring.rotation.z).not.toBe(beforeRotation)

    portal.setStatus("blocked")
    expect(portal.object3D.userData.gatewayStatus).toBe("blocked")
    portal.setPosition([4, 5, 6])
    expect(portal.object3D.position.toArray()).toEqual([4, 5, 6])

    expect(() => portal.dispose()).not.toThrow()
    twin.dispose()
  })

  test("createCracklingArc HDR emissive pushes strands above 1.0 and unsets toneMapped (A2)", () => {
    const flat = createCracklingArc({
      from: [0, 0, 0],
      to: [2, 0, 0],
      color: 0x3366ff,
      seed: 1,
    })
    const flatLine = flat.object3D.children.find(
      (child): child is Three.Line => child instanceof Three.Line,
    )
    if (flatLine === undefined) throw new Error("expected a line child")
    const flatMat = flatLine.material as Three.LineBasicMaterial
    // Default (emissiveStrength 1): unchanged flat look, tone-mapped, max channel <= 1.
    expect(flatMat.toneMapped).toBe(true)
    expect(Math.max(flatMat.color.r, flatMat.color.g, flatMat.color.b)).toBeLessThanOrEqual(1)

    const hdr = createCracklingArc({
      from: [0, 0, 0],
      to: [2, 0, 0],
      color: 0x3366ff,
      emissiveStrength: 6,
      seed: 1,
    })
    const hdrLine = hdr.object3D.children.find(
      (child): child is Three.Line => child instanceof Three.Line,
    )
    if (hdrLine === undefined) throw new Error("expected a line child")
    const hdrMat = hdrLine.material as Three.LineBasicMaterial
    // HDR: emitter is tone-map-exempt and carries values above the display
    // ceiling so an UnrealBloomPass thresholded near 1.0 extracts it.
    expect(hdrMat.toneMapped).toBe(false)
    expect(hdrMat.blending).toBe(Three.AdditiveBlending)
    expect(Math.max(hdrMat.color.r, hdrMat.color.g, hdrMat.color.b)).toBeGreaterThan(1)

    flat.dispose()
    hdr.dispose()
  })

  test("createGatewayPortal HDR makes the core the brightest tier and blooms (A2)", () => {
    const portal = createGatewayPortal({
      position: [0, 0, 0],
      status: "working",
      ringCount: 2,
      sparkCount: 4,
      emissiveStrength: 4,
      seed: 3,
    })
    const core = portal.object3D.children.find(
      (child): child is Three.Mesh =>
        child instanceof Three.Mesh && child.geometry instanceof Three.CircleGeometry,
    )
    const ring = portal.object3D.children.find(
      (child): child is Three.Mesh =>
        child instanceof Three.Mesh && child.geometry instanceof Three.TorusGeometry,
    )
    if (core === undefined || ring === undefined) {
      throw new Error("expected core + ring meshes")
    }
    const coreMat = core.material as Three.MeshBasicMaterial
    const ringMat = ring.material as Three.MeshBasicMaterial
    expect(coreMat.toneMapped).toBe(false)
    expect(ringMat.toneMapped).toBe(false)
    const coreMax = Math.max(coreMat.color.r, coreMat.color.g, coreMat.color.b)
    const ringMax = Math.max(ringMat.color.r, ringMat.color.g, ringMat.color.b)
    // HDR signal present, and the core tier is at least as bright as the ring tier.
    expect(coreMax).toBeGreaterThan(1)
    expect(coreMax).toBeGreaterThanOrEqual(ringMax)
    portal.dispose()
  })

  test("strict evidence wrappers refuse unbacked live motion", () => {
    expect(inferenceVisualHasEvidence({})).toBe(false)
    expect(inferenceVisualHasEvidence({ simulated: true })).toBe(true)
    expect(inferenceVisualCanRender({}, "required")).toBe(false)

    const blockedArc = createEvidenceBackedCracklingArc({
      from: [0, 0, 0],
      to: [1, 0, 0],
      evidenceMode: "required",
    })
    expect(blockedArc).toMatchObject({
      rendered: false,
      reason: "missing_evidence",
    })

    const fixturePortal = createEvidenceBackedGatewayPortal({
      position: [0, 0, 0],
      simulated: true,
      evidenceMode: "required",
    })
    expect(fixturePortal.rendered).toBe(true)
    if (fixturePortal.rendered) fixturePortal.handle.dispose()

    const receiptArc = createEvidenceBackedCracklingArc({
      from: [0, 0, 0],
      to: [1, 0, 0],
      sourceRefs: ["khala:receipt:demo"],
      evidenceMode: "required",
    })
    expect(receiptArc.rendered).toBe(true)
    if (receiptArc.rendered) receiptArc.handle.dispose()
  })
})
