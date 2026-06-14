import { describe, expect, test } from "bun:test"
import * as Three from "three"

import {
  applyCameraShake,
  applyInstanceTransforms,
  animationProgressFromScroll,
  applyMaskMaterial,
  applyBillboard,
  cubicBezierPoints,
  aspectScale,
  calculateSkySunPosition,
  cameraShakeRotationAtTime,
  cloneObject3D,
  collectGltfObjectMap,
  computeCenterOffset,
  createAnimationController,
  createBezierNodeConnections,
  createContactShadowResources,
  createDetailedLod,
  createDistortMaterial,
  createEdges,
  createFbo,
  createImagePlane,
  createImagePlaneMaterial,
  createInstanceColorArray,
  createInstanceMatrix,
  createLine2,
  createLoadingTracker,
  createLightformer,
  createOutlines,
  createPerformanceMonitorState,
  createPerspectiveCamera,
  createPointsFromAttributes,
  createRandomizedLightRig,
  createReflector,
  createRefractionMaterial,
  createRoundedBoxGeometry,
  createShaderMaterial,
  createSky,
  createSparkleAttributes,
  createStarfieldAttributes,
  createTransmissionMaterial,
  createTrainingRunEdges,
  createWobbleMaterial,
  defaultBezierNodesGraph,
  defaultCameraShakeOptions,
  defaultOrbitControlsOptions,
  defaultPerformanceMonitorOptions,
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
  imageCoverScale,
  isWorldPointOccluded,
  maskMaterialProps,
  mergeBufferGeometries,
  MokshaPlaneMaterial,
  pmndrsMokshaSourceRefs,
  pmndrsAdvancedMaterialPrimitiveSourceRefs,
  pmndrsBezierNodesSourceRefs,
  pmndrsAnimationPrimitiveSourceRefs,
  pmndrsCommonPrimitiveCounts,
  pmndrsCommonPrimitiveSourceRefs,
  pmndrsControlsPrimitiveSourceRefs,
  pmndrsGeometryPrimitiveSourceRefs,
  pmndrsImagePrimitiveSourceRefs,
  pmndrsInteractionPrimitiveSourceRefs,
  pmndrsMaskPrimitiveSourceRefs,
  pmndrsMediaParticlePrimitiveSourceRefs,
  pmndrsMotionPathCurvePresets,
  pmndrsPerformancePrimitiveSourceRefs,
  pmndrsRenderPrimitiveSourceRefs,
  pmndrsSceneGraphPrimitiveSourceRefs,
  pmndrsStagingPrimitiveSourceRefs,
  pmndrsTrainingDatavizSourceRefs,
  pointerNdcFromClientPoint,
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
  samplePerformanceFrame,
  setAnimatedMaterialTime,
  summarizeTrainingRunVisualization,
  trainingRunVisualizationOptionsFromSnapshot,
  updateScrollMetrics,
  useMaskMaterialProps,
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
    expect(pmndrsControlsPrimitiveSourceRefs).toContain(
      "projects/repos/examples/demos/basic-demo/src/App.jsx",
    )
    expect(pmndrsAnimationPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/useAnimations.tsx",
    )
    expect(pmndrsGeometryPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/RoundedBox.tsx",
    )
    expect(pmndrsImagePrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/Image.tsx",
    )
    expect(pmndrsInteractionPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/web/useCursor.tsx",
    )
    expect(pmndrsMaskPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/Mask.tsx",
    )
    expect(pmndrsStagingPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/Environment.tsx",
    )
    expect(pmndrsPerformancePrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/PerformanceMonitor.tsx",
    )
    expect(pmndrsAdvancedMaterialPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/MeshTransmissionMaterial.tsx",
    )
    expect(pmndrsRenderPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/RenderTexture.tsx",
    )
    expect(pmndrsSceneGraphPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/Edges.tsx",
    )
    expect(pmndrsMediaParticlePrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/Sparkles.tsx",
    )
    expect(defaultOrbitControlsOptions.enableDamping).toBe(true)
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

describe("interaction and animation primitives", () => {
  test("normalizes pointer coordinates and raycasts without useThree", () => {
    const ndc = pointerNdcFromClientPoint(
      { x: 50, y: 25 },
      { left: 0, top: 0, width: 100, height: 100 },
    )
    expect(ndc.x).toBe(0)
    expect(ndc.y).toBe(0.5)
  })

  test("creates animation actions and supports scroll-driven progress", () => {
    const root = new Three.Object3D()
    const clip = new Three.AnimationClip("move", 1, [
      new Three.VectorKeyframeTrack(".position", [0, 1], [0, 0, 0, 2, 0, 0]),
    ])
    const controller = createAnimationController(root, [clip])
    const action = controller.play("move")

    expect(controller.names).toEqual(["move"])
    expect(action).toBeDefined()
    controller.update(0.5)
    expect(root.position.x).toBeGreaterThan(0)
    animationProgressFromScroll(action!, clip, 0.25)
    expect(action!.time).toBeCloseTo(0.25)
    controller.dispose()
  })
})

describe("geometry, image, and mask primitives", () => {
  test("computes aspect scaling and rounded geometry parameters", () => {
    expect(aspectScale({ width: 16, height: 9 }, 4, 3)).toEqual([16, 12, 1])
    const geometry = createRoundedBoxGeometry({
      width: 2,
      height: 3,
      depth: 4,
      radius: 0.2,
      segments: 3,
    })
    expect(geometry.parameters.width).toBe(2)
    expect(geometry.parameters.height).toBe(3)
    expect(geometry.parameters.depth).toBe(4)
    expect((geometry.parameters as unknown as { radius: number }).radius).toBe(0.2)
  })

  test("creates cover-scaled image planes with shader accessors", () => {
    expect(imageCoverScale([2, 1], [1, 1])).toEqual([1, 2])
    const texture = new Three.Texture()
    texture.image = { width: 400, height: 200 }

    const material = createImagePlaneMaterial(texture, {
      width: 2,
      height: 1,
      opacity: 0.75,
      grayscale: 0.5,
    })
    expect(material.map.source).toBe(texture.source)
    expect(material.opacity).toBe(0.75)
    expect(material.grayscale).toBe(0.5)

    const mesh = createImagePlane(texture, { width: 2, height: 1 })
    expect(mesh.geometry.parameters.width).toBe(2)
    expect(mesh.geometry.parameters.height).toBe(1)
  })

  test("maps Drei mask semantics to plain material props", () => {
    expect(maskMaterialProps({ id: 7 })).toMatchObject({
      stencilWrite: true,
      stencilRef: 7,
      stencilFunc: Three.AlwaysStencilFunc,
    })
    expect(useMaskMaterialProps({ id: 7, inverse: true })).toMatchObject({
      stencilWrite: true,
      stencilRef: 7,
      stencilFunc: Three.NotEqualStencilFunc,
    })

    const material = applyMaskMaterial(new Three.MeshBasicMaterial(), { id: 3 })
    expect(material.stencilWrite).toBe(true)
    expect(material.stencilRef).toBe(3)
  })
})

describe("staging and performance primitives", () => {
  test("creates sky, lightformer, randomized lights, and contact-shadow resources", () => {
    const sun = calculateSkySunPosition(0.6, 0.1)
    expect(sun.toArray()).toEqual([
      Math.cos(2 * Math.PI * (0.1 - 0.5)),
      Math.sin(Math.PI * (0.6 - 0.5)),
      Math.sin(2 * Math.PI * (0.1 - 0.5)),
    ])

    const sky = createSky({ sunPosition: [1, 2, 3], distance: 500 })
    expect(sky.scale.x).toBe(500)
    expect(sky.material.uniforms.sunPosition.value.toArray()).toEqual([1, 2, 3])

    const lightformer = createLightformer({
      form: "rect",
      color: "white",
      intensity: 2,
      scale: [2, 3],
      target: true,
      pointLight: { intensity: 1 },
    })
    expect(lightformer.scale.toArray()).toEqual([2, 3, 1])
    expect(lightformer.children.some(child => child instanceof Three.PointLight)).toBe(
      true,
    )

    const rig = createRandomizedLightRig({ amount: 4, seed: 123 })
    expect(
      rig.children.filter(child => child instanceof Three.DirectionalLight),
    ).toHaveLength(4)

    const resources = createContactShadowResources({ scale: [2, 3], resolution: 32 })
    expect(resources.camera.left).toBe(-1)
    expect(resources.camera.top).toBe(1.5)
    resources.dispose()
  })

  test("samples performance frames into incline, decline, and fallback states", () => {
    const state = createPerformanceMonitorState({ factor: 0.5 })
    const options = {
      ...defaultPerformanceMonitorOptions,
      ms: 10,
      iterations: 2,
      threshold: 0.5,
      bounds: () => [20, 60] as const,
      step: 0.25,
    }

    samplePerformanceFrame(state, 0, options)
    samplePerformanceFrame(state, 20, options)
    samplePerformanceFrame(state, 40, options)
    const result = samplePerformanceFrame(state, 60, options)

    expect(result.changed).toBe(true)
    expect(result.direction).toBe("incline")
    expect(state.factor).toBe(0.75)
  })
})

describe("advanced material primitives", () => {
  test("creates common Drei-inspired material variants", () => {
    const transmission = createTransmissionMaterial({
      color: "white",
      transmission: 0.9,
      thickness: 0.2,
      ior: 1.4,
    })
    expect(transmission.transmission).toBe(0.9)
    expect(transmission.thickness).toBe(0.2)
    expect(transmission.ior).toBe(1.4)

    const refraction = createRefractionMaterial({ ior: 2.2 })
    expect(refraction.transmission).toBe(1)
    expect(refraction.ior).toBe(2.2)

    const distort = createDistortMaterial({ distort: 0.25, radius: 1.2 })
    setAnimatedMaterialTime(distort, 3)
    expect(distort.time).toBe(3)
    expect(distort.distort).toBe(0.25)
    expect(distort.radius).toBe(1.2)

    const wobble = createWobbleMaterial({ factor: 0.75 })
    setAnimatedMaterialTime(wobble, 4)
    expect(wobble.time).toBe(4)
    expect(wobble.factor).toBe(0.75)
  })

  test("creates reflector resources for mirror-style planes", () => {
    const reflector = createReflector({
      width: 2,
      height: 3,
      textureWidth: 64,
      textureHeight: 64,
    })
    expect(reflector.geometry).toBeInstanceOf(Three.PlaneGeometry)
    expect((reflector.geometry as Three.PlaneGeometry).parameters.width).toBe(2)
    expect((reflector.geometry as Three.PlaneGeometry).parameters.height).toBe(3)
  })
})

describe("render and scene graph primitives", () => {
  test("creates render targets with depth textures", () => {
    const fbo = createFbo({ width: 32, height: 16, depth: true, samples: 2 })
    expect(fbo.width).toBe(32)
    expect(fbo.height).toBe(16)
    expect(fbo.depthTexture).toBeInstanceOf(Three.DepthTexture)
    expect(fbo.samples).toBe(2)
    fbo.dispose()
  })

  test("clones, merges, outlines, and builds line helpers", () => {
    const source = new Three.Mesh(
      new Three.BoxGeometry(1, 1, 1),
      new Three.MeshBasicMaterial({ color: "red" }),
    )
    const clone = cloneObject3D(source, { deep: true, castShadow: true })
    expect(clone).not.toBe(source)
    expect(clone.geometry).not.toBe(source.geometry)
    expect(clone.material).not.toBe(source.material)
    expect(clone.castShadow).toBe(true)

    const merged = mergeBufferGeometries([
      new Three.BoxGeometry(1, 1, 1),
      new Three.BoxGeometry(1, 1, 1),
    ])
    expect(merged.getAttribute("position").count).toBeGreaterThan(0)

    const edges = createEdges(source.geometry, { color: "white" })
    expect(edges.geometry).toBeInstanceOf(Three.EdgesGeometry)

    const outline = createOutlines(source, { thickness: 0.1 })
    expect(outline.scale.x).toBeCloseTo(1.1)

    const line = createLine2(
      [new Three.Vector3(0, 0, 0), new Three.Vector3(1, 0, 0)],
      { linewidth: 2, resolution: [100, 100] },
    )
    expect(line.geometry).toBeDefined()
  })

  test("creates LOD levels and applies billboard rotation", () => {
    const near = new Three.Object3D()
    const far = new Three.Object3D()
    const lod = createDetailedLod([
      { object: near, distance: 0 },
      { object: far, distance: 10 },
    ])
    expect(lod.levels).toHaveLength(2)

    const camera = createPerspectiveCamera({ position: [0, 0, 5], target: [0, 0, 0] })
    const object = new Three.Object3D()
    applyBillboard(object, camera)
    expect(object.quaternion.equals(camera.quaternion)).toBe(true)
  })
})

describe("media and particle primitives", () => {
  test("tracks loading manager progress snapshots", () => {
    const tracker = createLoadingTracker()
    tracker.manager.onStart?.("a", 0, 2)
    expect(tracker.snapshot()).toEqual({
      active: true,
      item: "a",
      loaded: 0,
      total: 2,
      progress: 0,
    })
    tracker.manager.onProgress?.("a", 1, 2)
    expect(tracker.snapshot().progress).toBe(0.5)
    tracker.manager.onLoad?.()
    expect(tracker.snapshot().active).toBe(false)
  })

  test("creates deterministic star and sparkle point attributes", () => {
    const stars = createStarfieldAttributes({ count: 4, seed: 7 })
    const starsAgain = createStarfieldAttributes({ count: 4, seed: 7 })
    expect(stars.positions).toEqual(starsAgain.positions)
    expect(stars.colors).toHaveLength(12)
    expect(stars.sizes).toHaveLength(4)

    const sparkles = createSparkleAttributes({
      count: 3,
      seed: 2,
      color: "cyan",
      scale: [2, 3, 4],
    })
    expect(sparkles.positions).toHaveLength(9)
    expect(sparkles.speeds).toHaveLength(3)

    const points = createPointsFromAttributes(stars)
    expect(points.geometry.getAttribute("position").count).toBe(4)
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

  test("constructs the Moksha shader material before uniforms exist", () => {
    const material = new MokshaPlaneMaterial({ color: 0xff00ff, opacity: 0.45 })

    expect(material.opacity).toBe(0.45)
    expect(material.mokshaUniforms.opacity.value).toBe(0.45)
    material.opacity = 0.2
    expect(material.mokshaUniforms.opacity.value).toBe(0.2)
    material.dispose()
  })

  test("allows the Moksha startup fade plane to reveal scene content", () => {
    const material = new MokshaPlaneMaterial({
      color: 0x0e0e0f,
      depthWrite: false,
      opacity: 1,
      transparent: true,
    })

    expect(material.transparent).toBe(true)
    expect(material.depthWrite).toBe(false)
    material.opacity = 0.12
    expect(material.mokshaUniforms.opacity.value).toBe(0.12)
    material.dispose()
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
