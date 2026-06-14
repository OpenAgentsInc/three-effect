import { describe, expect, test } from "bun:test"

import {
  createBezierNodeConnections,
  createTrainingRunEdges,
  defaultBezierNodesGraph,
  defaultQuadraticBezierMidpoint,
  defaultSpinningCubeOptions,
  defaultTrainingRunNodes,
  resolveTrainingRunVisualizationOptions,
  resolveSpinningCubeOptions,
  summarizeTrainingRunVisualization,
  trainingRunVisualizationOptionsFromSnapshot,
} from "./index"

describe("spinning cube options", () => {
  test("uses stable defaults", () => {
    expect(resolveSpinningCubeOptions()).toEqual(defaultSpinningCubeOptions)
  })

  test("overrides individual options", () => {
    expect(resolveSpinningCubeOptions({ speed: 2 }).speed).toBe(2)
    expect(resolveSpinningCubeOptions({ cubeColor: 0xff0000 }).cubeColor).toBe(
      0xff0000,
    )
  })
})

describe("bezier nodes graph", () => {
  test("keeps the pmndrs example topology", () => {
    const connections = createBezierNodeConnections(defaultBezierNodesGraph)
    expect(
      connections.map(connection => [
        connection.sourceId,
        connection.targetId,
      ]),
    ).toEqual([
      ["a", "b"],
      ["a", "c"],
      ["a", "e"],
      ["b", "d"],
      ["b", "a"],
    ])
  })

  test("uses the default Drei quadratic midpoint rule", () => {
    expect(defaultQuadraticBezierMidpoint([1, 2, 0], [3, -1, 0])).toEqual([
      3,
      2,
      0,
    ])
  })

  test("applies horizontal node insets to connection endpoints", () => {
    const [first] = createBezierNodeConnections(defaultBezierNodesGraph)
    expect(first?.start).toEqual([-1.65, 2, 0])
    expect(first?.end).toEqual([1.65, -3, 0])
    expect(first?.mid).toEqual([1.65, 2, 0])
  })
})

describe("training run visualization", () => {
  test("keeps lifecycle and proof roles visible", () => {
    expect(summarizeTrainingRunVisualization(defaultTrainingRunNodes)).toEqual({
      lifecycle: 6,
      proof: 3,
      receipt: 2,
      rung: 2,
      run: 1,
    })
  })

  test("uses the Pluralis-derived stale-step default", () => {
    expect(resolveTrainingRunVisualizationOptions().maxAllowedStaleSteps).toBe(5)
  })

  test("connects the lifecycle through active and sync reentry", () => {
    const edges = createTrainingRunEdges(defaultTrainingRunNodes)
    expect(
      edges.map(edge => [edge.sourceId, edge.targetId]),
    ).toContainEqual(["active", "sealed_window"])
    expect(
      edges.map(edge => [edge.sourceId, edge.targetId]),
    ).toContainEqual(["sync_reentry", "state_synced"])
  })

  test("maps live run snapshots into scene options", () => {
    const options = trainingRunVisualizationOptionsFromSnapshot({
      activeWindowCount: 1,
      assignedContributorCount: 4,
      deviceObserved: 2,
      deviceRequired: 2,
      externalStatus: "observed",
      finalValidationLoss: 3.1,
      freivaldsRefCount: 3,
      gradientCloseoutRefCount: 2,
      maxAllowedStaleSteps: 7,
      maxValidationLoss: 4,
      reconciledWindowCount: 2,
      runDetail: "run.cs336.a1.real_gradient.demo",
      runLabel: "pylon.first_real_model_training_run.v1",
      runState: "active",
      settledPayoutSats: 21,
      verifiedWorkCount: 3,
    })

    expect(options.maxAllowedStaleSteps).toBe(7)
    expect(options.contributors).toHaveLength(4)
    expect(options.lossCurve).toHaveLength(3)
    expect(options.nodes?.find(node => node.id === "run")?.status).toBe("active")
    expect(options.nodes?.find(node => node.id === "freivalds")?.status).toBe(
      "verified",
    )
    expect(options.nodes?.find(node => node.id === "settlement")?.detail).toBe(
      "21 sats",
    )
  })
})
