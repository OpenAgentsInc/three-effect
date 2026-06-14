import { describe, expect, test } from "bun:test"
import * as Three from "three"

import {
  applyCameraShake,
  applyInstanceTransforms,
  cubicBezierPoints,
  cameraShakeRotationAtTime,
  collectGltfObjectMap,
  computeCenterOffset,
  createBezierNodeConnections,
  createInstanceColorArray,
  createInstanceMatrix,
  createPerspectiveCamera,
  createShaderMaterial,
  createTrainingRunEdges,
  defaultBezierNodesGraph,
  defaultCameraShakeOptions,
  defaultMokshaDiamonds,
  defaultMokshaOptions,
  defaultMokshaParagraphs,
  defaultQuadraticBezierMidpoint,
  defaultScrollMetrics,
  defaultSpinningCubeOptions,
  defaultTrainingRunNodes,
  dampValue,
  dreiQuadraticBezierMidpoint,
  fitCameraToBox,
  firstMeshGeometry,
  floatTransformAtTime,
  htmlOverlayStyle,
  isWorldPointOccluded,
  pmndrsMokshaSourceRefs,
  pmndrsBezierNodesSourceRefs,
  pmndrsCommonPrimitiveCounts,
  pmndrsCommonPrimitiveSourceRefs,
  pmndrsMotionPathCurvePresets,
  pmndrsTrainingDatavizSourceRefs,
  projectWorldToScreen,
  quadraticBezierPoints,
  resolveMokshaOptions,
  resolveTrainingRunVisualizationOptions,
  scrollCurve,
  scrollMetricsRange,
  scrollProgress,
  scrollRange,
  scrollVisible,
  resolveSpinningCubeOptions,
  summarizeTrainingRunVisualization,
  trainingRunVisualizationOptionsFromSnapshot,
  updateScrollMetrics,
  viewportAtDistance,
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

describe("common pmndrs primitive audit", () => {
  test("records the recurring Drei/R3F primitives that drove the core pass", () => {
    expect(pmndrsCommonPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/web/ScrollControls.tsx",
    )
    expect(pmndrsCommonPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/web/Html.tsx",
    )
    expect(pmndrsCommonPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/Instances.tsx",
    )

    expect(
      pmndrsCommonPrimitiveCounts.find(entry => entry.primitive === "useGLTF")
        ?.sourceFiles,
    ).toBe(98)
    expect(
      pmndrsCommonPrimitiveCounts.find(
        entry => entry.primitive === "ScrollControls/useScroll",
      )?.threeEffectModule,
    ).toBe("scrollPrimitives")
  })
})

describe("scroll primitives", () => {
  test("matches Drei-style range, curve, and visible semantics", () => {
    expect(scrollRange(0.25, 0, 0.5)).toBe(0.5)
    expect(scrollRange(-0.1, 0, 0.5)).toBe(0)
    expect(scrollRange(0.75, 0, 0.5)).toBe(1)
    expect(scrollCurve(0.25, 0, 0.5)).toBeCloseTo(1)
    expect(scrollVisible(0.51, 0, 0.5)).toBe(false)
    expect(scrollVisible(0.51, 0, 0.5, 0.02)).toBe(true)
  })

  test("computes normalized DOM scroll progress and smoothed metrics", () => {
    expect(
      scrollProgress({
        scrollOffset: 50,
        scrollSize: 300,
        viewportSize: 100,
      }),
    ).toBe(0.25)

    const metrics = updateScrollMetrics(defaultScrollMetrics, 1, 0.25)
    expect(metrics.offset).toBeGreaterThan(0)
    expect(metrics.offset).toBeLessThanOrEqual(1)
    expect(metrics.delta).toBe(metrics.offset)
    expect(scrollMetricsRange({ ...metrics, offset: 0.5 }, 0.25, 0.5)).toBe(0.5)
    expect(dampValue(0, 1, 0, 0.016)).toBe(1)
  })
})

describe("camera and overlay primitives", () => {
  test("creates, sizes, and fits cameras to bounds", () => {
    const camera = createPerspectiveCamera({
      fov: 50,
      aspect: 1,
      position: [0, 0, 5],
      target: [0, 0, 0],
    })
    const box = new Three.Box3(
      new Three.Vector3(-1, -1, -1),
      new Three.Vector3(1, 1, 1),
    )
    const fit = fitCameraToBox(camera, box, { margin: 1 })
    const viewport = viewportAtDistance(camera, fit.distance, {
      width: 1000,
      height: 1000,
    })

    expect(fit.center.toArray()).toEqual([0, 0, 0])
    expect(fit.distance).toBeGreaterThan(2)
    expect(camera.position.z).toBeGreaterThan(0)
    expect(viewport.width).toBeGreaterThanOrEqual(2)
  })

  test("computes Center-style offsets without a React wrapper", () => {
    const mesh = new Three.Mesh(
      new Three.BoxGeometry(2, 4, 6),
      new Three.MeshBasicMaterial(),
    )
    mesh.position.set(2, 3, 4)
    mesh.updateMatrixWorld(true)

    const result = computeCenterOffset(mesh)
    expect(result.size.toArray()).toEqual([2, 4, 6])
    expect(result.offset.toArray()).toEqual([-2, -3, -4])
  })

  test("projects world points to stable HTML overlay styles", () => {
    const camera = createPerspectiveCamera({
      fov: 50,
      aspect: 1,
      position: [0, 0, 5],
      target: [0, 0, 0],
    })
    const size = { width: 200, height: 100 }
    const point = projectWorldToScreen([0, 0, 0], camera, size)
    const style = htmlOverlayStyle([0, 0, 0], camera, size, {
      center: true,
      distanceFactor: 10,
      zIndexRange: [100, 0],
    })

    expect(point.x).toBeCloseTo(100)
    expect(point.y).toBeCloseTo(50)
    expect(point.visible).toBe(true)
    expect(style.transform).toContain("translate3d(100px, 50px, 0)")
    expect(style.display).toBe("block")
    expect(Number(style.zIndex)).toBeGreaterThan(0)
  })

  test("detects raycast occlusion for projected HTML targets", () => {
    const camera = createPerspectiveCamera({
      position: [0, 0, 5],
      target: [0, 0, 0],
    })
    const occluder = new Three.Mesh(
      new Three.BoxGeometry(2, 2, 0.1),
      new Three.MeshBasicMaterial(),
    )
    occluder.position.z = 2.5
    occluder.updateMatrixWorld(true)

    expect(isWorldPointOccluded([0, 0, 0], camera, [occluder])).toBe(true)
    expect(isWorldPointOccluded([4, 0, 0], camera, [occluder])).toBe(false)
  })
})

describe("instance, motion, shader, and asset primitives", () => {
  test("builds instance matrices and colors without Drei context", () => {
    const matrix = createInstanceMatrix({
      position: [1, 2, 3],
      rotation: [0, Math.PI / 2, 0],
      scale: 2,
    })
    const position = new Three.Vector3()
    const rotation = new Three.Quaternion()
    const scale = new Three.Vector3()
    matrix.decompose(position, rotation, scale)

    expect(position.toArray()).toEqual([1, 2, 3])
    expect(scale.toArray()).toEqual([2, 2, 2])

    const colors = createInstanceColorArray([
      { color: "red" },
      { color: "blue" },
    ])
    expect(colors).toHaveLength(6)
    expect(colors[0]).toBe(1)

    const mesh = new Three.InstancedMesh(
      new Three.BoxGeometry(1, 1, 1),
      new Three.MeshBasicMaterial(),
      2,
    )
    applyInstanceTransforms(mesh, [
      { position: [1, 0, 0], color: "red" },
      { position: [2, 0, 0], color: "blue" },
    ])
    expect(mesh.count).toBe(2)
    mesh.getMatrixAt(1, matrix)
    matrix.decompose(position, rotation, scale)
    expect(position.x).toBe(2)
  })

  test("keeps Float and CameraShake motion deterministic", () => {
    const floating = floatTransformAtTime(0)
    expect(floating.position.y).toBeCloseTo(0)
    expect(floating.rotation.x).toBeCloseTo(0.125)

    const shake = cameraShakeRotationAtTime(2, {
      ...defaultCameraShakeOptions,
      intensity: 0,
    })
    expect(shake.x).toBeCloseTo(0)
    expect(shake.y).toBeCloseTo(0)
    expect(shake.z).toBeCloseTo(0)

    const camera = createPerspectiveCamera()
    const base = camera.rotation.clone()
    const applied = applyCameraShake(camera, base, 1, { intensity: 0 })
    expect(applied.x).toBeCloseTo(0)
    expect(applied.y).toBeCloseTo(0)
    expect(applied.z).toBeCloseTo(0)
  })

  test("creates shader material uniforms with property accessors", () => {
    const material = createShaderMaterial(
      { time: 0, tint: new Three.Color("white") },
      "void main() { gl_Position = vec4(position, 1.0); }",
      "void main() { gl_FragColor = vec4(1.0); }",
    )

    material.time = 2
    expect(material.uniforms.time?.value).toBe(2)
    expect(material.tint).toBeInstanceOf(Three.Color)
  })

  test("collects GLTF-style object maps from loaded scenes", () => {
    const material = new Three.MeshBasicMaterial()
    material.name = "primary"
    const geometry = new Three.BoxGeometry()
    const mesh = new Three.Mesh(geometry, material)
    mesh.name = "box"
    const scene = new Three.Group()
    scene.add(mesh)

    const map = collectGltfObjectMap(scene)
    expect(map.nodes.box).toBe(mesh)
    expect(map.materials.primary).toBe(material)
    expect(firstMeshGeometry(scene)).toBe(geometry)
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

describe("moksha experience", () => {
  test("records the local pmndrs Moksha source files used for the port", () => {
    expect(pmndrsMokshaSourceRefs).toContain(
      "projects/repos/examples/demos/moksha/src/index.jsx",
    )
    expect(pmndrsMokshaSourceRefs).toContain(
      "projects/repos/examples/demos/moksha/src/diamonds/Diamonds.jsx",
    )
    expect(pmndrsMokshaSourceRefs).toContain(
      "projects/repos/examples/demos/moksha/src/components/CustomMaterial.js",
    )
  })

  test("keeps the full Moksha page structure as data", () => {
    expect(defaultMokshaOptions.sections).toBe(9)
    expect(defaultMokshaOptions.pages).toBe(8)
    expect(defaultMokshaParagraphs.map(paragraph => paragraph.header)).toEqual([
      "District 4",
      "Diamond Road",
      "Catalina",
      "Building 21",
      "Sector 8",
      "The Factory",
    ])
    expect(defaultMokshaDiamonds).toHaveLength(8)
  })

  test("resolves Moksha asset and layout overrides", () => {
    const options = resolveMokshaOptions({
      assets: {
        images: {
          catalina: "/custom/catalina.jpg",
        },
      },
      zoom: 90,
    })

    expect(options.zoom).toBe(90)
    expect(options.assets.images.catalina).toBe("/custom/catalina.jpg")
    expect(options.assets.images.district4).toBe(
      defaultMokshaOptions.assets.images.district4,
    )
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
