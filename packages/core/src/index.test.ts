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
})
