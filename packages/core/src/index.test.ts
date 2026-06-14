import { describe, expect, test } from "bun:test"

import {
  cubicBezierPoints,
  createBezierNodeConnections,
  createTrainingRunEdges,
  defaultBezierNodesGraph,
  defaultQuadraticBezierMidpoint,
  defaultSpinningCubeOptions,
  defaultTrainingRunNodes,
  dreiQuadraticBezierMidpoint,
  pmndrsBezierNodesSourceRefs,
  pmndrsMotionPathCurvePresets,
  pmndrsTrainingDatavizSourceRefs,
  quadraticBezierPoints,
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
  test("records the exact pmndrs and drei source files used for the port", () => {
    expect(pmndrsBezierNodesSourceRefs).toContain(
      "projects/repos/examples/demos/bezier-curves-and-nodes/src/Nodes.jsx",
    )
    expect(pmndrsBezierNodesSourceRefs).toContain(
      "projects/repos/drei/src/core/QuadraticBezierLine.tsx",
    )
    expect(pmndrsBezierNodesSourceRefs).toContain(
      "projects/repos/drei/src/web/DragControls.tsx",
    )
  })

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
    expect(dreiQuadraticBezierMidpoint([1, 2, 0], [3, -1, 0])).toEqual([
      3,
      2,
      0,
    ])
  })

  test("generates quadratic curve points without React or drei runtime", () => {
    const points = quadraticBezierPoints([0, 0, 0], [4, 0, 0], 4)
    expect(points).toHaveLength(5)
    expect(points[0]).toEqual([0, 0, 0])
    expect(points.at(-1)).toEqual([4, 0, 0])
    expect(points[2]?.[0]).toBe(3)
  })

  test("keeps the pmndrs cubic motion-path presets available as data", () => {
    const presetIds = pmndrsMotionPathCurvePresets.map(preset => preset.id)
    expect(presetIds).toEqual([
      "heart",
      "circle",
      "rollercoaster",
      "infinity",
    ])
    const rollercoaster = pmndrsMotionPathCurvePresets.find(
      preset => preset.id === "rollercoaster",
    )
    expect(rollercoaster?.segments).toHaveLength(2)
    expect(
      cubicBezierPoints(rollercoaster!.segments[0]!, 4).at(-1),
    ).toEqual([6, 3, 0])
  })

  test("applies horizontal node insets to connection endpoints", () => {
    const [first] = createBezierNodeConnections(defaultBezierNodesGraph)
    expect(first?.start).toEqual([-1.65, 2, 0])
    expect(first?.end).toEqual([1.65, -3, 0])
    expect(first?.mid).toEqual([1.65, 2, 0])
  })
})

describe("training run visualization", () => {
  test("records the pmndrs 2d visualization references used for the dataviz pass", () => {
    expect(pmndrsTrainingDatavizSourceRefs).toContain(
      "projects/repos/examples/demos/bezier-curves-and-nodes/src/Nodes.jsx",
    )
    expect(pmndrsTrainingDatavizSourceRefs).toContain(
      "projects/repos/examples/demos/react-ellipsecurve/src/App.jsx",
    )
    expect(pmndrsTrainingDatavizSourceRefs).toContain(
      "projects/repos/examples/demos/scrollcontrols-with-minimap/src/App.jsx",
    )
  })

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

  test("preserves node click callbacks in resolved scene options", () => {
    const onNodeClick = () => {}

    expect(resolveTrainingRunVisualizationOptions({ onNodeClick }).onNodeClick).toBe(
      onNodeClick,
    )
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
      lifecycleCounts: {
        active: 2,
        qualified: 1,
        state_synced: 1,
        sync_reentry: 1,
        warmup: 1,
      },
      maxAllowedStaleSteps: 7,
      maxValidationLoss: 4,
      pendingPayoutCount: 1,
      receiptRefCount: 6,
      reconciledWindowCount: 2,
      runDetail: "run.cs336.a1.real_gradient.demo",
      runLabel: "pylon.first_real_model_training_run.v1",
      runState: "active",
      sealInFlight: true,
      settledPayoutSats: 21,
      verifiedWorkCount: 3,
    })

    expect(options.maxAllowedStaleSteps).toBe(7)
    expect(options.contributors).toHaveLength(6)
    expect(options.contributors?.map(contributor => contributor.lifecycleState)).toEqual([
      "qualified",
      "state_synced",
      "warmup",
      "active",
      "active",
      "sync_reentry",
    ])
    expect(options.lossCurve).toHaveLength(3)
    expect(options.nodes?.find(node => node.id === "run")?.status).toBe("active")
    expect(options.nodes?.find(node => node.id === "freivalds")?.status).toBe(
      "verified",
    )
    expect(options.nodes?.find(node => node.id === "sealed_window")?.detail).toBe(
      "seal in flight",
    )
    expect(options.nodes?.find(node => node.id === "sealed_window")?.status).toBe(
      "sealed",
    )
    expect(options.nodes?.find(node => node.id === "receipt")?.detail).toBe(
      "6 receipts",
    )
    expect(options.nodes?.find(node => node.id === "settlement")?.detail).toBe(
      "21 sats",
    )
  })

  test("maps product-promise registry counts into scene signals", () => {
    const options = trainingRunVisualizationOptionsFromSnapshot({
      promiseBlockerRefCount: 4,
      promiseEvidenceRefCount: 9,
      promiseGreenCount: 1,
      promisePlannedCount: 2,
      promiseRedCount: 1,
      promiseYellowCount: 3,
    })

    expect(options.promiseSignals?.map(signal => signal.state)).toEqual([
      "green",
      "yellow",
      "planned",
      "red",
    ])
    expect(options.promiseSignals?.find(signal => signal.state === "red")).toEqual({
      blockerCount: 4,
      evidenceRefCount: 9,
      id: "promise.red",
      label: "red",
      state: "red",
    })
  })

  test("preserves explicit product-promise scene signals", () => {
    const options = trainingRunVisualizationOptionsFromSnapshot({
      promiseGreenCount: 3,
      promiseSignals: [
        {
          blockerCount: 2,
          evidenceRefCount: 5,
          id: "training.model_ladder.v1",
          label: "model ladder",
          state: "yellow",
        },
      ],
    })

    expect(options.promiseSignals).toEqual([
      {
        blockerCount: 2,
        evidenceRefCount: 5,
        id: "training.model_ladder.v1",
        label: "model ladder",
        state: "yellow",
      },
    ])
  })

  test("preserves explicit operator command scene signals", () => {
    const options = trainingRunVisualizationOptionsFromSnapshot({
      operatorSignals: [
        {
          detail: "planned",
          id: "plan",
          label: "plan",
          state: "success",
        },
        {
          detail: "claiming",
          id: "lease",
          label: "lease",
          state: "info",
        },
      ],
    })

    expect(options.operatorSignals).toEqual([
      {
        detail: "planned",
        id: "plan",
        label: "plan",
        state: "success",
      },
      {
        detail: "claiming",
        id: "lease",
        label: "lease",
        state: "info",
      },
    ])
  })

  test("surfaces blocker and pending-payout state in scene nodes", () => {
    const options = trainingRunVisualizationOptionsFromSnapshot({
      blockerRefCount: 2,
      pendingPayoutCount: 3,
      receiptRefCount: 0,
      runState: "planned",
      sealInFlight: true,
      verifiedWorkCount: 0,
    })

    expect(options.nodes?.find(node => node.id === "sync_reentry")?.detail).toBe(
      "2 blockers",
    )
    expect(options.nodes?.find(node => node.id === "sync_reentry")?.status).toBe(
      "blocked",
    )
    expect(options.nodes?.find(node => node.id === "sealed_window")?.detail).toBe(
      "seal in flight",
    )
    expect(options.nodes?.find(node => node.id === "settlement")?.detail).toBe(
      "3 pending",
    )
  })
})
