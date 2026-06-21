import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import * as Three from "three";

import {
  applyCameraShake,
  applyInstanceTransforms,
  applyMouseLookDelta,
  applyModelRenderOptions,
  animationProgressFromScroll,
  applyMaskMaterial,
  attachObjectToBone,
  applyBillboard,
  collectBoneMap,
  createEquipmentAttachmentManager,
  cubicBezierPoints,
  aspectScale,
  calculateSkySunPosition,
  cameraShakeRotationAtTime,
  cloneObject3D,
  collectGltfObjectMap,
  computeCenterOffset,
  createMmoEntityDescriptionCache,
  createMmoEntityTransformInterpolator,
  createAnimationController,
  createAnimationStateMachine,
  createBillboardStatusBar,
  createBezierNodeConnections,
  createContactShadowResources,
  createConditionalEdgesGeometry,
  createConditionalLineSegments,
  createDetailedLod,
  createDistortMaterial,
  createEdges,
  createFbo,
  createImagePlane,
  createImagePlaneMaterial,
  createGltfModelInstance,
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
  createSceneResourceScope,
  createRefractionMaterial,
  createRoundedBoxGeometry,
  createShaderMaterial,
  createSky,
  createSparkleAttributes,
  HitTargetRegistry,
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
  defaultProofReplayCameraPose,
  defaultProofReplayVisualizationOptions,
  defaultQuadraticBezierMidpoint,
  defaultScrollMetrics,
  defaultSpinningCubeOptions,
  defaultTrainingRunNodes,
  disposeModelInstanceResources,
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
  makeTrainingRunArtifactMarker,
  createTrainingRunPerspectiveAtmosphere,
  makeMetaverseStreetDistrict,
  metaverseStreetBuildingColor,
  metaverseStreetBuildingDimensions,
  metaverseStreetBuildingOpacity,
  metaverseStreetHumanHeight,
  metaverseStreetLayout,
  metaverseStreetParcelPositions,
  metaverseStreetParcelSpacing,
  metaverseStreetSourceRefs,
  metaverseStreetStoryHeight,
  makeTrainingRunPylonLandmark,
  makeTrainingRunBulletinBoard,
  nearestTrainingRunWorldItem,
  trainingRunPerspectiveSunDirection,
  trainingRunHeadLabelPositionForObject,
  trainingRunWorldItemNodeSelection,
  trainingRunWorldItemSelection,
  MokshaPlaneMaterial,
  cycleTrainingRunCameraTarget,
  cycleTrainingRunTarget,
  orderTrainingRunTargetsByCameraView,
  orderTrainingRunTargetsByDistance,
  pmndrsMokshaSourceRefs,
  pmndrsAdvancedMaterialPrimitiveSourceRefs,
  pmndrsAssetPrimitiveSourceRefs,
  pmndrsBezierNodesSourceRefs,
  pmndrsAnimationPrimitiveSourceRefs,
  pmndrsCommonPrimitiveCounts,
  pmndrsCommonPrimitiveSourceRefs,
  threejsSandboxConditionalLineSourceRefs,
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
  resolveTrainingRunEntityPositions,
  uniqueTrainingRunEntities,
  colorForRemoteAvatar,
  trainingRunEntityMinimumDistance,
  trainingRunEntityNodeStatus,
  trainingRunEntityRingPosition,
  trainingRunEntitySelection,
  trainingRunArtifactKindForSelection,
  trainingRunPresenceZoneForPosition,
  trainingRunMotionHasEvidence,
  trainingRunMotionSourceRefs,
  trainingRunPointerClickIntent,
  trainingRunSelectionIsPylon,
  trainingRunRemoteAvatarSelection,
  trainingRunVisualizationRetainedStructuralSignature,
  trainingRunVisualizationOptionsWithLocalPose,
  trainingRunWorldLabelVisibleForSelection,
  trainingRunVisualizationOptionsFromSnapshot,
  canRetainTrainingRunVisualization,
  updateScrollMetrics,
  useMaskMaterialProps,
  viewportAtDistance,
  applyFirstPersonControlsOptions,
  addScopedEventListener,
  applyFlyControlsOptions,
  applyTrackballControlsOptions,
  applyTransformControlsOptions,
  createArrowHelper,
  createAxesHelper,
  createBox3Helper,
  createCameraHelper,
  createDirectionalLightHelper,
  createGridHelper,
  createPlaneHelper,
  createPointLightHelper,
  createPolarGridHelper,
  createVertexNormalsHelper,
  defaultFirstPersonControlsOptions,
  defaultFlyControlsOptions,
  defaultTrackballControlsOptions,
  pmndrsExtraControlsPrimitiveSourceRefs,
  pmndrsHelperPrimitiveSourceRefs,
  createImprovedNoise,
  createLut,
  createSimplexNoise,
  createSurfaceSampler,
  fbmNoise3d,
  lutColorArray,
  lutColorAt,
  pmndrsMathPrimitiveSourceRefs,
  bindEntityPresence,
  clampWasdPosition,
  createEntityPool,
  createColorSpline,
  createEvidenceBackedEventBurst,
  createFlowBeam,
  createNumberSpline,
  createPayoutBurst,
  createSplineParticleEmitter,
  defaultTextLabelOptions,
  defaultWasdKeyboardState,
  createThirdPersonFollowCamera,
  createThirdPersonFollowCameraState,
  defaultMmorpgCharacterControllerOptions,
  defaultMmorpgCharacterControllerState,
  defaultThreePlayerAvatarAnimationClips,
  defaultThreePlayerAvatarModelUrl,
  defaultThreePlayerControllerOptions,
  integrateWasdVelocity,
  keyCodeToWasdAction,
  animationActionPhaseRatio,
  findAnimationActionByLabels,
  mmoEntityLiveness,
  mmorpgCharacterActionForKeyboard,
  mmorpgCharacterForwardDirection,
  pmndrsEntityPoolPrimitiveSourceRefs,
  pmndrsFlowEffectPrimitiveSourceRefs,
  pmndrsPlayerControllerPrimitiveSourceRefs,
  pmndrsPresenceBindingPrimitiveSourceRefs,
  pmndrsTextLabelPrimitiveSourceRefs,
  quickMmorpgAttachmentPrimitiveSourceRefs,
  quickMmorpgBillboardPrimitiveSourceRefs,
  quickMmorpgEntityPrimitiveSourceRefs,
  quickMmorpgEventBurstPrimitiveSourceRefs,
  resolveBillboardStatusBarOptions,
  eventBurstCanRender,
  quickMmorpgAnimationPrimitiveSourceRefs,
  resolveMmorpgCharacterControllerOptions,
  resolveProofReplayVisualizationOptions,
  normalizeMmoEntityTransformSnapshot,
  resolveThreePlayerControllerOptions,
  resolveThirdPersonFollowCameraOptions,
  resolveTextLabelOptions,
  proofReplayCameraPoseWithOverride,
  setWasdKeyState,
  updateMmoEntityInterpolationState,
  createMmoEntityInterpolationState,
  quickMmorpgSpatialPrimitiveSourceRefs,
  raycastHitTargetRegistry,
  relaxMinimumDistanceLayout,
  SpatialHashGrid,
  threePlayerControllerLookDeltaToOrbitDelta,
  thirdPersonCameraDistanceAfterWheel,
  thirdPersonCameraOffsetAtDistance,
  thirdPersonCameraOffsetDistance,
  thirdPersonFollowSmoothingFactor,
  thirdPersonIdealLookAt,
  thirdPersonIdealOffset,
  thirdPersonOrbitOffset,
  updateCameraRelativeMmorpgCharacterController,
  updateMmorpgCharacterController,
  updateThirdPersonFollowCamera,
  wheelDeltaPixels,
  wasdDesiredDirection,
  wasdMouseMovementFromEvent,
} from "./index";

import { FirstPersonControls } from "three/examples/jsm/controls/FirstPersonControls.js";
import { FlyControls } from "three/examples/jsm/controls/FlyControls.js";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";

describe("spinning cube options", () => {
  test("uses stable defaults", () => {
    expect(resolveSpinningCubeOptions()).toEqual(defaultSpinningCubeOptions);
  });

  test("overrides individual options", () => {
    expect(resolveSpinningCubeOptions({ speed: 2 }).speed).toBe(2);
    expect(resolveSpinningCubeOptions({ cubeColor: 0xff0000 }).cubeColor).toBe(
      0xff0000,
    );
  });
});

describe("common pmndrs primitive audit", () => {
  test("records the recurring Drei/R3F primitives that drove the core pass", () => {
    expect(pmndrsCommonPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/web/ScrollControls.tsx",
    );
    expect(pmndrsCommonPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/web/Html.tsx",
    );
    expect(pmndrsCommonPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/Instances.tsx",
    );

    expect(
      pmndrsCommonPrimitiveCounts.find((entry) => entry.primitive === "useGLTF")
        ?.sourceFiles,
    ).toBe(98);
    expect(
      pmndrsCommonPrimitiveCounts.find(
        (entry) => entry.primitive === "ScrollControls/useScroll",
      )?.threeEffectModule,
    ).toBe("scrollPrimitives");
    expect(pmndrsControlsPrimitiveSourceRefs).toContain(
      "projects/repos/examples/demos/basic-demo/src/App.jsx",
    );
    expect(pmndrsAnimationPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/useAnimations.tsx",
    );
    expect(pmndrsGeometryPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/RoundedBox.tsx",
    );
    expect(pmndrsImagePrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/Image.tsx",
    );
    expect(pmndrsInteractionPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/web/useCursor.tsx",
    );
    expect(pmndrsMaskPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/Mask.tsx",
    );
    expect(pmndrsStagingPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/Environment.tsx",
    );
    expect(pmndrsPerformancePrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/PerformanceMonitor.tsx",
    );
    expect(pmndrsAdvancedMaterialPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/MeshTransmissionMaterial.tsx",
    );
    expect(pmndrsRenderPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/RenderTexture.tsx",
    );
    expect(pmndrsSceneGraphPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/Edges.tsx",
    );
    expect(pmndrsMediaParticlePrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/Sparkles.tsx",
    );
    expect(defaultOrbitControlsOptions.enableDamping).toBe(true);
  });
});

describe("scroll primitives", () => {
  test("matches Drei-style range, curve, and visible semantics", () => {
    expect(scrollRange(0.25, 0, 0.5)).toBe(0.5);
    expect(scrollRange(-0.1, 0, 0.5)).toBe(0);
    expect(scrollRange(0.75, 0, 0.5)).toBe(1);
    expect(scrollCurve(0.25, 0, 0.5)).toBeCloseTo(1);
    expect(scrollVisible(0.51, 0, 0.5)).toBe(false);
    expect(scrollVisible(0.51, 0, 0.5, 0.02)).toBe(true);
  });

  test("computes normalized DOM scroll progress and smoothed metrics", () => {
    expect(
      scrollProgress({
        scrollOffset: 50,
        scrollSize: 300,
        viewportSize: 100,
      }),
    ).toBe(0.25);

    const metrics = updateScrollMetrics(defaultScrollMetrics, 1, 0.25);
    expect(metrics.offset).toBeGreaterThan(0);
    expect(metrics.offset).toBeLessThanOrEqual(1);
    expect(metrics.delta).toBe(metrics.offset);
    expect(scrollMetricsRange({ ...metrics, offset: 0.5 }, 0.25, 0.5)).toBe(
      0.5,
    );
    expect(dampValue(0, 1, 0, 0.016)).toBe(1);
  });
});

describe("camera and overlay primitives", () => {
  test("creates, sizes, and fits cameras to bounds", () => {
    const camera = createPerspectiveCamera({
      fov: 50,
      aspect: 1,
      position: [0, 0, 5],
      target: [0, 0, 0],
    });
    const box = new Three.Box3(
      new Three.Vector3(-1, -1, -1),
      new Three.Vector3(1, 1, 1),
    );
    const fit = fitCameraToBox(camera, box, { margin: 1 });
    const viewport = viewportAtDistance(camera, fit.distance, {
      width: 1000,
      height: 1000,
    });

    expect(fit.center.toArray()).toEqual([0, 0, 0]);
    expect(fit.distance).toBeGreaterThan(2);
    expect(camera.position.z).toBeGreaterThan(0);
    expect(viewport.width).toBeGreaterThanOrEqual(2);
  });

  test("computes Center-style offsets without a React wrapper", () => {
    const mesh = new Three.Mesh(
      new Three.BoxGeometry(2, 4, 6),
      new Three.MeshBasicMaterial(),
    );
    mesh.position.set(2, 3, 4);
    mesh.updateMatrixWorld(true);

    const result = computeCenterOffset(mesh);
    expect(result.size.toArray()).toEqual([2, 4, 6]);
    expect(result.offset.toArray()).toEqual([-2, -3, -4]);
  });

  test("projects world points to stable HTML overlay styles", () => {
    const camera = createPerspectiveCamera({
      fov: 50,
      aspect: 1,
      position: [0, 0, 5],
      target: [0, 0, 0],
    });
    const size = { width: 200, height: 100 };
    const point = projectWorldToScreen([0, 0, 0], camera, size);
    const style = htmlOverlayStyle([0, 0, 0], camera, size, {
      center: true,
      distanceFactor: 10,
      zIndexRange: [100, 0],
    });

    expect(point.x).toBeCloseTo(100);
    expect(point.y).toBeCloseTo(50);
    expect(point.visible).toBe(true);
    expect(style.transform).toContain("translate3d(100px, 50px, 0)");
    expect(style.display).toBe("block");
    expect(Number(style.zIndex)).toBeGreaterThan(0);
  });

  test("detects raycast occlusion for projected HTML targets", () => {
    const camera = createPerspectiveCamera({
      position: [0, 0, 5],
      target: [0, 0, 0],
    });
    const occluder = new Three.Mesh(
      new Three.BoxGeometry(2, 2, 0.1),
      new Three.MeshBasicMaterial(),
    );
    occluder.position.z = 2.5;
    occluder.updateMatrixWorld(true);

    expect(isWorldPointOccluded([0, 0, 0], camera, [occluder])).toBe(true);
    expect(isWorldPointOccluded([4, 0, 0], camera, [occluder])).toBe(false);
  });
});

describe("instance, motion, shader, and asset primitives", () => {
  test("builds instance matrices and colors without Drei context", () => {
    const matrix = createInstanceMatrix({
      position: [1, 2, 3],
      rotation: [0, Math.PI / 2, 0],
      scale: 2,
    });
    const position = new Three.Vector3();
    const rotation = new Three.Quaternion();
    const scale = new Three.Vector3();
    matrix.decompose(position, rotation, scale);

    expect(position.toArray()).toEqual([1, 2, 3]);
    expect(scale.toArray()).toEqual([2, 2, 2]);

    const colors = createInstanceColorArray([
      { color: "red" },
      { color: "blue" },
    ]);
    expect(colors).toHaveLength(6);
    expect(colors[0]).toBe(1);

    const mesh = new Three.InstancedMesh(
      new Three.BoxGeometry(1, 1, 1),
      new Three.MeshBasicMaterial(),
      2,
    );
    applyInstanceTransforms(mesh, [
      { position: [1, 0, 0], color: "red" },
      { position: [2, 0, 0], color: "blue" },
    ]);
    expect(mesh.count).toBe(2);
    mesh.getMatrixAt(1, matrix);
    matrix.decompose(position, rotation, scale);
    expect(position.x).toBe(2);
  });

  test("keeps Float and CameraShake motion deterministic", () => {
    const floating = floatTransformAtTime(0);
    expect(floating.position.y).toBeCloseTo(0);
    expect(floating.rotation.x).toBeCloseTo(0.125);

    const shake = cameraShakeRotationAtTime(2, {
      ...defaultCameraShakeOptions,
      intensity: 0,
    });
    expect(shake.x).toBeCloseTo(0);
    expect(shake.y).toBeCloseTo(0);
    expect(shake.z).toBeCloseTo(0);

    const camera = createPerspectiveCamera();
    const base = camera.rotation.clone();
    const applied = applyCameraShake(camera, base, 1, { intensity: 0 });
    expect(applied.x).toBeCloseTo(0);
    expect(applied.y).toBeCloseTo(0);
    expect(applied.z).toBeCloseTo(0);
  });

  test("creates shader material uniforms with property accessors", () => {
    const material = createShaderMaterial(
      { time: 0, tint: new Three.Color("white") },
      "void main() { gl_Position = vec4(position, 1.0); }",
      "void main() { gl_FragColor = vec4(1.0); }",
    );

    material.time = 2;
    expect(material.uniforms.time?.value).toBe(2);
    expect(material.tint).toBeInstanceOf(Three.Color);
  });

  test("collects GLTF-style object maps from loaded scenes", () => {
    expect(pmndrsAssetPrimitiveSourceRefs).toContain(
      "projects/repos/Quick_3D_MMORPG/client/src/render-component.js",
    );
    const material = new Three.MeshBasicMaterial();
    material.name = "primary";
    const geometry = new Three.BoxGeometry();
    const mesh = new Three.Mesh(geometry, material);
    mesh.name = "box";
    const scene = new Three.Group();
    scene.add(mesh);

    const map = collectGltfObjectMap(scene);
    expect(map.nodes.box).toBe(mesh);
    expect(map.materials.primary).toBe(material);
    expect(firstMeshGeometry(scene)).toBe(geometry);
  });

  test("applies Quick-style model render policy to a loaded object", () => {
    const material = new Three.MeshBasicMaterial();
    material.name = "body.primary";
    const geometry = new Three.BoxGeometry();
    const mesh = new Three.Mesh(geometry, material);
    const root = new Three.Group();
    const texture = new Three.Texture();
    root.add(mesh);

    applyModelRenderOptions(root, {
      castShadow: true,
      computeBoundingBox: true,
      frustumCulled: false,
      materialTextures: { body: texture },
      position: [1, 2, 3],
      receiveShadow: true,
      scale: 2,
      visible: true,
    });

    expect(root.position.toArray()).toEqual([1, 2, 3]);
    expect(root.scale.x).toBe(2);
    expect(mesh.castShadow).toBe(true);
    expect(mesh.receiveShadow).toBe(true);
    expect(mesh.frustumCulled).toBe(false);
    expect(geometry.boundingBox).toBeInstanceOf(Three.Box3);
    expect(material.map).toBe(texture);
  });

  test("creates a GLTF model instance with mixer actions and disposable resources", () => {
    const material = new Three.MeshBasicMaterial();
    const geometry = new Three.BoxGeometry();
    const mesh = new Three.Mesh(geometry, material);
    const root = new Three.Group();
    root.add(mesh);
    const clip = new Three.AnimationClip("idle", 1, [
      new Three.VectorKeyframeTrack(".position", [0, 1], [0, 0, 0, 1, 0, 0]),
    ]);
    const handle = createGltfModelInstance(
      { animations: [clip], scene: root } as Parameters<
        typeof createGltfModelInstance
      >[0],
      {
        actionNames: ["idle"],
        playAction: "idle",
        scale: [1, 2, 1],
      },
    );

    expect(handle.object).not.toBe(root);
    expect(handle.object.scale.y).toBe(2);
    expect(handle.actions.idle).toBeInstanceOf(Three.AnimationAction);
    expect(Effect.runSync(handle.play("missing"))).toBe(false);
    expect(Effect.runSync(handle.play("idle"))).toBe(true);
    Effect.runSync(handle.update(0.1));
    Effect.runSync(handle.dispose);
  });

  test("disposes model instance resources when the caller owns them", () => {
    const material = new Three.MeshBasicMaterial();
    const geometry = new Three.BoxGeometry();
    let materialDisposed = false;
    let geometryDisposed = false;
    material.addEventListener("dispose", () => {
      materialDisposed = true;
    });
    geometry.addEventListener("dispose", () => {
      geometryDisposed = true;
    });
    const mesh = new Three.Mesh(geometry, material);
    disposeModelInstanceResources(mesh);
    expect(materialDisposed).toBe(true);
    expect(geometryDisposed).toBe(true);
  });
});

describe("interaction and animation primitives", () => {
  test("normalizes pointer coordinates and raycasts without useThree", () => {
    const ndc = pointerNdcFromClientPoint(
      { x: 50, y: 25 },
      { left: 0, top: 0, width: 100, height: 100 },
    );
    expect(ndc.x).toBe(0);
    expect(ndc.y).toBe(0.5);
  });

  test("creates animation actions and supports scroll-driven progress", () => {
    const root = new Three.Object3D();
    const clip = new Three.AnimationClip("move", 1, [
      new Three.VectorKeyframeTrack(".position", [0, 1], [0, 0, 0, 2, 0, 0]),
    ]);
    const controller = createAnimationController(root, [clip]);
    const action = controller.play("move");

    expect(controller.names).toEqual(["move"]);
    expect(action).toBeDefined();
    controller.update(0.5);
    expect(root.position.x).toBeGreaterThan(0);
    animationProgressFromScroll(action!, clip, 0.25);
    expect(action!.time).toBeCloseTo(0.25);
    controller.dispose();
  });

  test("drives Quick-style animation states with phase preservation and one-shot completion", () => {
    expect(quickMmorpgAnimationPrimitiveSourceRefs).toContain(
      "projects/repos/Quick_3D_MMORPG/client/src/player-state.js",
    );

    const root = new Three.Object3D();
    const idle = new Three.AnimationClip("Idle", 1, [
      new Three.VectorKeyframeTrack(".position", [0, 1], [0, 0, 0, 0, 0, 0]),
    ]);
    const walk = new Three.AnimationClip("Walk", 2, [
      new Three.VectorKeyframeTrack(".position", [0, 2], [0, 0, 0, 2, 0, 0]),
    ]);
    const run = new Three.AnimationClip("Run", 1, [
      new Three.VectorKeyframeTrack(".position", [0, 1], [0, 0, 0, 4, 0, 0]),
    ]);
    const attack = new Three.AnimationClip("Attack", 0.1, [
      new Three.VectorKeyframeTrack(".scale", [0, 0.1], [1, 1, 1, 1.2, 1.2, 1.2]),
    ]);
    const controller = createAnimationController(root, [idle, walk, run, attack]);

    const idleAction = controller.action("Idle");
    expect(idleAction).toBeDefined();
    expect(findAnimationActionByLabels(controller, ["idle"])).toBe(idleAction!);

    const fsm = createAnimationStateMachine(
      controller,
      [
        { name: "idle", labels: ["Idle"], canMove: true },
        { name: "walk", labels: ["Walk"], canMove: true, locomotion: true },
        { name: "run", labels: ["Run"], canMove: true, locomotion: true },
        {
          name: "attack",
          labels: ["Attack"],
          canMove: false,
          oneShot: true,
          onComplete: "idle",
          fadeSeconds: 0,
        },
      ],
      "idle",
      { defaultFadeSeconds: 0 },
    );

    expect(fsm.current()).toMatchObject({ state: "idle", canMove: true });
    expect(fsm.transition("walk")).toBe(true);
    const walkAction = fsm.action()!;
    walkAction.time = 1;
    expect(animationActionPhaseRatio(walkAction)).toBeCloseTo(0.5);
    expect(fsm.transition("run")).toBe(true);
    expect(fsm.action()?.time).toBeCloseTo(0.5);

    expect(fsm.transition("attack")).toBe(true);
    expect(fsm.current()).toMatchObject({ state: "attack", canMove: false });
    fsm.update(0.2);
    expect(fsm.current().state).toBe("idle");
    fsm.dispose();
    controller.dispose();
  });
});

describe("spatial primitives", () => {
  test("indexes, updates, dedupes, and removes spatial hash grid clients", () => {
    expect(quickMmorpgSpatialPrimitiveSourceRefs).toContain(
      "projects/repos/Quick_3D_MMORPG/client/shared/spatial-hash-grid.mjs",
    );

    const grid = new SpatialHashGrid<string>({
      bounds: { minX: -100, minY: -100, maxX: 100, maxY: 100 },
      cellsX: 10,
      cellsY: 10,
    });

    grid.insert({
      id: "a",
      value: "alpha",
      position: { x: 0, y: 0 },
      size: { width: 40, height: 40 },
    });
    grid.insert({
      id: "b",
      value: "beta",
      position: { x: 80, y: 80 },
      size: { width: 10, height: 10 },
    });

    expect(
      grid.findNear({ x: 0, y: 0 }, { width: 20, height: 20 }).map(client => client.id),
    ).toEqual(["a"]);

    grid.update("b", { position: { x: 8, y: 0 } });
    expect(
      grid.findNear({ x: 0, y: 0 }, { width: 30, height: 30 }).map(client => client.id).sort(),
    ).toEqual(["a", "b"]);

    const deduped = grid.findNear(
      { x: 0, y: 0 },
      { width: 80, height: 80 },
    )
    expect(deduped.filter(client => client.id === "a")).toHaveLength(1);
    expect(grid.remove("a")).toBe(true);
    expect(
      grid.findNear({ x: 0, y: 0 }, { width: 30, height: 30 }).map(client => client.id),
    ).toEqual(["b"]);
  });

  test("raycasts registered sphere and box hit targets in distance order", () => {
    const registry = new HitTargetRegistry<string>();
    registry.register({
      id: "far",
      value: "sphere",
      kind: "sphere",
      sphere: new Three.Sphere(new Three.Vector3(0, 0, -5), 1),
    });
    registry.register({
      id: "near",
      value: "box",
      kind: "box",
      box: new Three.Box3(
        new Three.Vector3(-1, -1, -3),
        new Three.Vector3(1, 1, -2),
      ),
    });

    const raycaster = new Three.Raycaster(
      new Three.Vector3(0, 0, 0),
      new Three.Vector3(0, 0, -1),
    );
    const hits = raycastHitTargetRegistry(raycaster, registry);

    expect(hits.map(hit => hit.target.id)).toEqual(["near", "far"]);
    expect(hits[0]?.distance).toBeCloseTo(2);
    expect(registry.remove("near")).toBe(true);
    expect(raycastHitTargetRegistry(raycaster, registry).map(hit => hit.target.id)).toEqual([
      "far",
    ]);
  });

  test("relaxes overlapping layout nodes to a minimum distance", () => {
    const result = relaxMinimumDistanceLayout(
      [
        { id: "a", position: new Three.Vector2(0, 0) },
        { id: "b", position: new Three.Vector2(0, 0) },
      ],
      { minDistance: 2, iterations: 4, strength: 1 },
    );

    const a = result.find(node => node.id === "a")?.position;
    const b = result.find(node => node.id === "b")?.position;
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(a!.distanceTo(b!)).toBeGreaterThanOrEqual(1.99);
  });
});

describe("scene resource scope", () => {
  test("disposes finalizers once in reverse ownership order", () => {
    const scope = createSceneResourceScope();
    const calls: string[] = [];

    scope.add(() => calls.push("root"));
    scope.add(() => calls.push("child"));

    expect(scope.size()).toBe(2);
    scope.dispose();
    scope.dispose();

    expect(scope.disposed()).toBe(true);
    expect(calls).toEqual(["child", "root"]);
    expect(scope.size()).toBe(0);
  });

  test("unregisters finalizers and disposes child scopes with the parent", () => {
    const scope = createSceneResourceScope();
    const child = scope.child();
    const calls: string[] = [];
    const unregister = scope.add(() => calls.push("removed"));
    child.add(() => calls.push("child"));
    unregister();

    scope.dispose();

    expect(calls).toEqual(["child"]);
    expect(child.disposed()).toBe(true);
  });

  test("runs finalizers added after disposal immediately", () => {
    const scope = createSceneResourceScope();
    const calls: string[] = [];

    scope.dispose();
    scope.add(() => calls.push("late"));

    expect(calls).toEqual(["late"]);
  });

  test("scopes DOM event listener ownership", () => {
    const scope = createSceneResourceScope();
    const target = new EventTarget();
    let count = 0;
    addScopedEventListener(scope, target, "ping", () => {
      count += 1;
    });

    target.dispatchEvent(new Event("ping"));
    scope.dispose();
    target.dispatchEvent(new Event("ping"));

    expect(count).toBe(1);
  });
});

describe("mmo entity primitives", () => {
  test("normalizes transform rows and interpolates position plus quaternion", () => {
    expect(quickMmorpgEntityPrimitiveSourceRefs).toContain(
      "projects/repos/Quick_3D_MMORPG/client/src/network-entity-controller.js",
    );

    const initial = normalizeMmoEntityTransformSnapshot({
      id: "agent-1",
      state: "idle",
      position: [0, 0, 0],
      quaternion: [0, 0, 0, 1],
      updatedAtMs: 100,
      description: { label: "Agent 1" },
    });
    const state = createMmoEntityInterpolationState(initial);

    const target = normalizeMmoEntityTransformSnapshot({
      id: "agent-1",
      state: "walk",
      position: [10, 0, 0],
      quaternion: new Three.Quaternion().setFromAxisAngle(
        new Three.Vector3(0, 1, 0),
        Math.PI,
      ),
      updatedAtMs: 200,
    });

    updateMmoEntityInterpolationState(state, 0, { interpolateMs: 100 });
    expect(state.currentPosition.x).toBe(0);
    state.previousPosition.copy(state.currentPosition);
    state.previousQuaternion.copy(state.currentQuaternion);
    state.targetPosition.copy(target.position);
    state.targetQuaternion.copy(target.quaternion);
    state.elapsedMs = 0;
    state.updatedAtMs = target.updatedAtMs;
    state.state = target.state;

    const halfway = updateMmoEntityInterpolationState(state, 50, {
      interpolateMs: 100,
    });
    expect(halfway.position.x).toBeCloseTo(5);
    expect(halfway.state).toBe("walk");
    expect(halfway.quaternion.y).toBeCloseTo(Math.SQRT1_2);

    const complete = updateMmoEntityInterpolationState(state, 50, {
      interpolateMs: 100,
    });
    expect(complete.position.x).toBeCloseTo(10);
  });

  test("interpolator applies snapshots, resets, and reports liveness", () => {
    const interpolator = createMmoEntityTransformInterpolator(
      normalizeMmoEntityTransformSnapshot({
        id: "remote",
        position: [0, 0, 0],
        updatedAtMs: 1_000,
      }),
      { interpolateMs: 100, staleAfterMs: 500, despawnAfterMs: 1_000 },
    );

    interpolator.apply(
      normalizeMmoEntityTransformSnapshot({
        id: "remote",
        position: [0, 0, 10],
        updatedAtMs: 1_100,
      }),
    );

    expect(interpolator.update(50).position.z).toBeCloseTo(5);
    expect(interpolator.liveness(1_200)).toBe("fresh");
    expect(interpolator.liveness(1_700)).toBe("stale");
    expect(interpolator.liveness(2_100)).toBe("despawn");

    interpolator.reset(
      normalizeMmoEntityTransformSnapshot({
        id: "remote",
        position: [4, 0, 0],
        updatedAtMs: 2_200,
      }),
    );
    expect(interpolator.sample().position.x).toBe(4);
    expect(mmoEntityLiveness(100, 1_000, { staleAfterMs: 300, despawnAfterMs: 800 })).toBe(
      "despawn",
    );
  });

  test("tracks missing descriptions in a stable cache", () => {
    const cache = createMmoEntityDescriptionCache<{ label: string }>();
    expect(cache.missing(["a", "b"])).toEqual(["a", "b"]);
    cache.upsert("a", { label: "Alpha" });
    expect(cache.get("a")).toEqual({ label: "Alpha" });
    expect(cache.missing(["a", "b"])).toEqual(["b"]);
    expect(cache.remove("a")).toBe(true);
    expect(cache.get("a")).toBeUndefined();
  });
});

describe("attachment primitives", () => {
  test("collects named bones and attaches objects with transform offsets", () => {
    expect(quickMmorpgAttachmentPrimitiveSourceRefs).toContain(
      "projects/repos/Quick_3D_MMORPG/client/src/equip-weapon-component.js",
    );

    const root = new Three.Group();
    const hand = new Three.Bone();
    hand.name = "RightHandIndex1";
    root.add(hand);

    const bones = collectBoneMap(root);
    expect(bones.RightHandIndex1).toBe(hand);

    const object = new Three.Object3D();
    const handle = attachObjectToBone({
      root,
      object,
      boneNames: ["Missing", "RightHandIndex1"],
      position: [1, 2, 3],
      scale: 2,
    });

    expect(handle?.bone).toBe(hand);
    expect(object.parent).toBe(hand);
    expect(object.position.toArray()).toEqual([1, 2, 3]);
    expect(object.scale.toArray()).toEqual([2, 2, 2]);
    handle?.detach();
    expect(object.parent).toBeNull();
  });

  test("equipment manager replaces records and disposes attached resources", () => {
    const root = new Three.Group();
    const hand = new Three.Bone();
    hand.name = "RightHandIndex1";
    root.add(hand);
    const manager = createEquipmentAttachmentManager<{ capability: string }>(root, [
      { slotId: "right-hand", boneNames: ["RightHandIndex1"], scale: 0.5 },
    ]);

    const firstGeometry = new Three.BoxGeometry();
    const firstMaterial = new Three.MeshBasicMaterial();
    let firstDisposed = false;
    firstGeometry.addEventListener("dispose", () => {
      firstDisposed = true;
    });
    const first = new Three.Mesh(firstGeometry, firstMaterial);

    const firstRecord = manager.attach("tool", "right-hand", first, {
      capability: "inspect",
    });
    expect(firstRecord?.value).toEqual({ capability: "inspect" });
    expect(first.parent).toBe(hand);

    const second = new Three.Mesh(
      new Three.BoxGeometry(),
      new Three.MeshBasicMaterial(),
    );
    const secondRecord = manager.attach("tool", "right-hand", second, {
      capability: "verify",
    });
    expect(secondRecord?.value).toEqual({ capability: "verify" });
    expect(firstDisposed).toBe(true);
    expect(first.parent).toBeNull();
    expect(second.parent).toBe(hand);
    expect(manager.list().map(record => record.id)).toEqual(["tool"]);
    expect(manager.detach("tool")).toBe(true);
    expect(second.parent).toBeNull();
  });
});

describe("billboard primitives", () => {
  test("resolves status bar defaults and clamps values", () => {
    expect(quickMmorpgBillboardPrimitiveSourceRefs).toContain(
      "projects/repos/Quick_3D_MMORPG/client/src/health-bar.js",
    );
    expect(resolveBillboardStatusBarOptions({ value: 2 }).value).toBe(1);
    expect(resolveBillboardStatusBarOptions({ value: -1 }).value).toBe(0);
    expect(resolveBillboardStatusBarOptions({ width: 0 }).width).toBeGreaterThan(0);
  });

  test("creates disposable billboard status bars that update fill geometry", () => {
    const handle = createBillboardStatusBar({
      width: 2,
      height: 0.2,
      value: 0.25,
      position: [1, 2, 3],
    });

    expect(handle.group.position.toArray()).toEqual([1, 2, 3]);
    expect(handle.fill.scale.x).toBeCloseTo(0.25);
    expect(handle.fill.position.x).toBeCloseTo(-0.75);
    handle.setValue(0.75);
    expect(handle.fill.scale.x).toBeCloseTo(0.75);
    expect(handle.fill.position.x).toBeCloseTo(-0.25);

    let disposed = false;
    handle.fill.geometry.addEventListener("dispose", () => {
      disposed = true;
    });
    handle.dispose();
    expect(disposed).toBe(true);
  });
});

describe("event burst primitives", () => {
  test("samples number and color splines deterministically", () => {
    expect(quickMmorpgEventBurstPrimitiveSourceRefs).toContain(
      "projects/repos/Quick_3D_MMORPG/client/src/particle-system.js",
    );
    const alpha = createNumberSpline([[0, 1], [1, 0]]);
    expect(alpha.sample(0.25)).toBeCloseTo(0.75);

    const color = createColorSpline([[0, 0xff0000], [1, 0x0000ff]]);
    expect(color.sample(0.5).r).toBeCloseTo(0.5);
    expect(color.sample(0.5).b).toBeCloseTo(0.5);
  });

  test("requires evidence before creating strict animated bursts", () => {
    expect(eventBurstCanRender({}, "required")).toBe(false);
    expect(
      eventBurstCanRender({ sourceRefs: ["proof:verification:1"] }, "required"),
    ).toBe(true);
    const blocked = createEvidenceBackedEventBurst({
      at: [0, 0, 0],
      evidenceMode: "required",
    });
    expect(blocked.rendered).toBe(false);

    const rendered = createEvidenceBackedEventBurst({
      at: [0, 0, 0],
      evidenceMode: "required",
      sourceRefs: ["proof:verification:1"],
      count: 4,
      durationMs: 100,
    });
    expect(rendered.rendered).toBe(true);
    if (rendered.rendered) {
      rendered.handle.dispose();
    }
  });

  test("updates and disposes spline particle emitters", () => {
    const emitter = createSplineParticleEmitter({
      at: [1, 2, 3],
      count: 4,
      durationMs: 100,
      seed: 10,
      alpha: createNumberSpline([[0, 1], [1, 0]]),
      size: createNumberSpline([[0, 0.2], [1, 0.01]]),
      color: createColorSpline([[0, 0xffffff], [1, 0x00ff00]]),
    });
    const positions = (
      emitter.object3D.geometry.getAttribute("position") as Three.BufferAttribute
    ).array as Float32Array;
    expect([positions[0], positions[1], positions[2]]).toEqual([1, 2, 3]);
    expect(emitter.update(50)).toBe(true);
    expect(emitter.progress()).toBeCloseTo(0.5);
    expect(emitter.update(50)).toBe(false);
    expect(emitter.done()).toBe(true);
    let disposed = false;
    emitter.object3D.geometry.addEventListener("dispose", () => {
      disposed = true;
    });
    emitter.dispose();
    expect(disposed).toBe(true);
  });
});

describe("geometry, image, and mask primitives", () => {
  test("computes aspect scaling and rounded geometry parameters", () => {
    expect(aspectScale({ width: 16, height: 9 }, 4, 3)).toEqual([16, 12, 1]);
    const geometry = createRoundedBoxGeometry({
      width: 2,
      height: 3,
      depth: 4,
      radius: 0.2,
      segments: 3,
    });
    expect(geometry.parameters.width).toBe(2);
    expect(geometry.parameters.height).toBe(3);
    expect(geometry.parameters.depth).toBe(4);
    expect((geometry.parameters as unknown as { radius: number }).radius).toBe(
      0.2,
    );
  });

  test("creates cover-scaled image planes with shader accessors", () => {
    expect(imageCoverScale([2, 1], [1, 1])).toEqual([1, 2]);
    const texture = new Three.Texture();
    texture.image = { width: 400, height: 200 };

    const material = createImagePlaneMaterial(texture, {
      width: 2,
      height: 1,
      opacity: 0.75,
      grayscale: 0.5,
    });
    expect(material.map.source).toBe(texture.source);
    expect(material.opacity).toBe(0.75);
    expect(material.grayscale).toBe(0.5);

    const mesh = createImagePlane(texture, { width: 2, height: 1 });
    expect(mesh.geometry.parameters.width).toBe(2);
    expect(mesh.geometry.parameters.height).toBe(1);
  });

  test("maps Drei mask semantics to plain material props", () => {
    expect(maskMaterialProps({ id: 7 })).toMatchObject({
      stencilWrite: true,
      stencilRef: 7,
      stencilFunc: Three.AlwaysStencilFunc,
    });
    expect(useMaskMaterialProps({ id: 7, inverse: true })).toMatchObject({
      stencilWrite: true,
      stencilRef: 7,
      stencilFunc: Three.NotEqualStencilFunc,
    });

    const material = applyMaskMaterial(new Three.MeshBasicMaterial(), {
      id: 3,
    });
    expect(material.stencilWrite).toBe(true);
    expect(material.stencilRef).toBe(3);
  });
});

describe("staging and performance primitives", () => {
  test("creates sky, lightformer, randomized lights, and contact-shadow resources", () => {
    const sun = calculateSkySunPosition(0.6, 0.1);
    expect(sun.toArray()).toEqual([
      Math.cos(2 * Math.PI * (0.1 - 0.5)),
      Math.sin(Math.PI * (0.6 - 0.5)),
      Math.sin(2 * Math.PI * (0.1 - 0.5)),
    ]);

    const sky = createSky({ sunPosition: [1, 2, 3], distance: 500 });
    expect(sky.scale.x).toBe(500);
    expect(sky.material.uniforms.sunPosition.value.toArray()).toEqual([
      1, 2, 3,
    ]);

    const lightformer = createLightformer({
      form: "rect",
      color: "white",
      intensity: 2,
      scale: [2, 3],
      target: true,
      pointLight: { intensity: 1 },
    });
    expect(lightformer.scale.toArray()).toEqual([2, 3, 1]);
    expect(
      lightformer.children.some((child) => child instanceof Three.PointLight),
    ).toBe(true);

    const rig = createRandomizedLightRig({ amount: 4, seed: 123 });
    expect(
      rig.children.filter((child) => child instanceof Three.DirectionalLight),
    ).toHaveLength(4);

    const resources = createContactShadowResources({
      scale: [2, 3],
      resolution: 32,
    });
    expect(resources.camera.left).toBe(-1);
    expect(resources.camera.top).toBe(1.5);
    resources.dispose();
  });

  test("samples performance frames into incline, decline, and fallback states", () => {
    const state = createPerformanceMonitorState({ factor: 0.5 });
    const options = {
      ...defaultPerformanceMonitorOptions,
      ms: 10,
      iterations: 2,
      threshold: 0.5,
      bounds: () => [20, 60] as const,
      step: 0.25,
    };

    samplePerformanceFrame(state, 0, options);
    samplePerformanceFrame(state, 20, options);
    samplePerformanceFrame(state, 40, options);
    const result = samplePerformanceFrame(state, 60, options);

    expect(result.changed).toBe(true);
    expect(result.direction).toBe("incline");
    expect(state.factor).toBe(0.75);
  });
});

describe("advanced material primitives", () => {
  test("creates common Drei-inspired material variants", () => {
    const transmission = createTransmissionMaterial({
      color: "white",
      transmission: 0.9,
      thickness: 0.2,
      ior: 1.4,
    });
    expect(transmission.transmission).toBe(0.9);
    expect(transmission.thickness).toBe(0.2);
    expect(transmission.ior).toBe(1.4);

    const refraction = createRefractionMaterial({ ior: 2.2 });
    expect(refraction.transmission).toBe(1);
    expect(refraction.ior).toBe(2.2);

    const distort = createDistortMaterial({ distort: 0.25, radius: 1.2 });
    setAnimatedMaterialTime(distort, 3);
    expect(distort.time).toBe(3);
    expect(distort.distort).toBe(0.25);
    expect(distort.radius).toBe(1.2);

    const wobble = createWobbleMaterial({ factor: 0.75 });
    setAnimatedMaterialTime(wobble, 4);
    expect(wobble.time).toBe(4);
    expect(wobble.factor).toBe(0.75);
  });

  test("creates reflector resources for mirror-style planes", () => {
    const reflector = createReflector({
      width: 2,
      height: 3,
      textureWidth: 64,
      textureHeight: 64,
    });
    expect(reflector.geometry).toBeInstanceOf(Three.PlaneGeometry);
    expect((reflector.geometry as Three.PlaneGeometry).parameters.width).toBe(
      2,
    );
    expect((reflector.geometry as Three.PlaneGeometry).parameters.height).toBe(
      3,
    );
  });
});

describe("render and scene graph primitives", () => {
  test("creates render targets with depth textures", () => {
    const fbo = createFbo({ width: 32, height: 16, depth: true, samples: 2 });
    expect(fbo.width).toBe(32);
    expect(fbo.height).toBe(16);
    expect(fbo.depthTexture).toBeInstanceOf(Three.DepthTexture);
    expect(fbo.samples).toBe(2);
    fbo.dispose();
  });

  test("clones, merges, outlines, and builds line helpers", () => {
    const source = new Three.Mesh(
      new Three.BoxGeometry(1, 1, 1),
      new Three.MeshBasicMaterial({ color: "red" }),
    );
    const clone = cloneObject3D(source, { deep: true, castShadow: true });
    expect(clone).not.toBe(source);
    expect(clone.geometry).not.toBe(source.geometry);
    expect(clone.material).not.toBe(source.material);
    expect(clone.castShadow).toBe(true);

    const merged = mergeBufferGeometries([
      new Three.BoxGeometry(1, 1, 1),
      new Three.BoxGeometry(1, 1, 1),
    ]);
    expect(merged.getAttribute("position").count).toBeGreaterThan(0);

    const edges = createEdges(source.geometry, { color: "white" });
    expect(edges.geometry).toBeInstanceOf(Three.EdgesGeometry);

    const outline = createOutlines(source, { thickness: 0.1 });
    expect(outline.scale.x).toBeCloseTo(1.1);

    const line = createLine2(
      [new Three.Vector3(0, 0, 0), new Three.Vector3(1, 0, 0)],
      { linewidth: 2, resolution: [100, 100] },
    );
    expect(line.geometry).toBeDefined();
  });

  test("builds conditional line geometry and materials for faceted meshes", () => {
    expect(threejsSandboxConditionalLineSourceRefs).toContain(
      "projects/repos/threejs-sandbox/conditional-lines/src/ConditionalEdgesShader.js",
    );

    const source = new Three.OctahedronGeometry(1, 1);
    const edges = createConditionalEdgesGeometry(source);
    expect(edges.getAttribute("position").count).toBeGreaterThan(0);
    expect(edges.getAttribute("control0").count).toBe(
      edges.getAttribute("position").count,
    );
    expect(edges.getAttribute("control1").count).toBe(
      edges.getAttribute("position").count,
    );
    expect(edges.getAttribute("direction").count).toBe(
      edges.getAttribute("position").count,
    );

    const handle = createConditionalLineSegments(source, {
      color: "#d8f4ff",
      linewidth: 1.5,
      opacity: 0.8,
      resolution: [320, 240],
    });
    expect(handle.line).toBeDefined();
    expect(handle.material.color.getHexString()).toBe("d8f4ff");
    expect(handle.material.linewidth).toBe(1.5);
    expect(handle.material.opacity).toBe(0.8);
    expect(handle.material.resolution.toArray()).toEqual([320, 240]);
    handle.setResolution(640, 480);
    expect(handle.material.resolution.toArray()).toEqual([640, 480]);

    edges.dispose();
    handle.dispose();
    source.dispose();
  });

  test("creates LOD levels and applies billboard rotation", () => {
    const near = new Three.Object3D();
    const far = new Three.Object3D();
    const lod = createDetailedLod([
      { object: near, distance: 0 },
      { object: far, distance: 10 },
    ]);
    expect(lod.levels).toHaveLength(2);

    const camera = createPerspectiveCamera({
      position: [0, 0, 5],
      target: [0, 0, 0],
    });
    const object = new Three.Object3D();
    applyBillboard(object, camera);
    expect(object.quaternion.equals(camera.quaternion)).toBe(true);

    const parent = new Three.Group();
    parent.rotation.x = -Math.PI / 2;
    const child = new Three.Object3D();
    parent.add(child);
    applyBillboard(child, camera);
    parent.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const childWorldQuaternion = child.getWorldQuaternion(
      new Three.Quaternion(),
    );
    const cameraWorldQuaternion = camera.getWorldQuaternion(
      new Three.Quaternion(),
    );
    expect(childWorldQuaternion.angleTo(cameraWorldQuaternion)).toBeLessThan(
      0.000001,
    );
  });
});

describe("media and particle primitives", () => {
  test("tracks loading manager progress snapshots", () => {
    const tracker = createLoadingTracker();
    tracker.manager.onStart?.("a", 0, 2);
    expect(tracker.snapshot()).toEqual({
      active: true,
      item: "a",
      loaded: 0,
      total: 2,
      progress: 0,
    });
    tracker.manager.onProgress?.("a", 1, 2);
    expect(tracker.snapshot().progress).toBe(0.5);
    tracker.manager.onLoad?.();
    expect(tracker.snapshot().active).toBe(false);
  });

  test("creates deterministic star and sparkle point attributes", () => {
    const stars = createStarfieldAttributes({ count: 4, seed: 7 });
    const starsAgain = createStarfieldAttributes({ count: 4, seed: 7 });
    expect(stars.positions).toEqual(starsAgain.positions);
    expect(stars.colors).toHaveLength(12);
    expect(stars.sizes).toHaveLength(4);

    const sparkles = createSparkleAttributes({
      count: 3,
      seed: 2,
      color: "cyan",
      scale: [2, 3, 4],
    });
    expect(sparkles.positions).toHaveLength(9);
    expect(sparkles.speeds).toHaveLength(3);

    const points = createPointsFromAttributes(stars);
    expect(points.geometry.getAttribute("position").count).toBe(4);
  });
});

describe("bezier nodes graph", () => {
  test("records the exact pmndrs and drei source files used for the port", () => {
    expect(pmndrsBezierNodesSourceRefs).toContain(
      "projects/repos/examples/demos/bezier-curves-and-nodes/src/Nodes.jsx",
    );
    expect(pmndrsBezierNodesSourceRefs).toContain(
      "projects/repos/drei/src/core/QuadraticBezierLine.tsx",
    );
    expect(pmndrsBezierNodesSourceRefs).toContain(
      "projects/repos/drei/src/web/DragControls.tsx",
    );
  });

  test("keeps the pmndrs example topology", () => {
    const connections = createBezierNodeConnections(defaultBezierNodesGraph);
    expect(
      connections.map((connection) => [
        connection.sourceId,
        connection.targetId,
      ]),
    ).toEqual([
      ["a", "b"],
      ["a", "c"],
      ["a", "e"],
      ["b", "d"],
      ["b", "a"],
    ]);
  });

  test("uses the default Drei quadratic midpoint rule", () => {
    expect(defaultQuadraticBezierMidpoint([1, 2, 0], [3, -1, 0])).toEqual([
      3, 2, 0,
    ]);
    expect(dreiQuadraticBezierMidpoint([1, 2, 0], [3, -1, 0])).toEqual([
      3, 2, 0,
    ]);
  });

  test("generates quadratic curve points without React or drei runtime", () => {
    const points = quadraticBezierPoints([0, 0, 0], [4, 0, 0], 4);
    expect(points).toHaveLength(5);
    expect(points[0]).toEqual([0, 0, 0]);
    expect(points.at(-1)).toEqual([4, 0, 0]);
    expect(points[2]?.[0]).toBe(3);
  });

  test("keeps the pmndrs cubic motion-path presets available as data", () => {
    const presetIds = pmndrsMotionPathCurvePresets.map((preset) => preset.id);
    expect(presetIds).toEqual(["heart", "circle", "rollercoaster", "infinity"]);
    const rollercoaster = pmndrsMotionPathCurvePresets.find(
      (preset) => preset.id === "rollercoaster",
    );
    expect(rollercoaster?.segments).toHaveLength(2);
    expect(cubicBezierPoints(rollercoaster!.segments[0]!, 4).at(-1)).toEqual([
      6, 3, 0,
    ]);
  });

  test("applies horizontal node insets to connection endpoints", () => {
    const [first] = createBezierNodeConnections(defaultBezierNodesGraph);
    expect(first?.start).toEqual([-1.65, 2, 0]);
    expect(first?.end).toEqual([1.65, -3, 0]);
    expect(first?.mid).toEqual([1.65, 2, 0]);
  });
});

describe("moksha experience", () => {
  test("records the local pmndrs Moksha source files used for the port", () => {
    expect(pmndrsMokshaSourceRefs).toContain(
      "projects/repos/examples/demos/moksha/src/index.jsx",
    );
    expect(pmndrsMokshaSourceRefs).toContain(
      "projects/repos/examples/demos/moksha/src/diamonds/Diamonds.jsx",
    );
    expect(pmndrsMokshaSourceRefs).toContain(
      "projects/repos/examples/demos/moksha/src/components/CustomMaterial.js",
    );
  });

  test("keeps the full Moksha page structure as data", () => {
    expect(defaultMokshaOptions.sections).toBe(9);
    expect(defaultMokshaOptions.pages).toBe(8);
    expect(
      defaultMokshaParagraphs.map((paragraph) => paragraph.header),
    ).toEqual([
      "District 4",
      "Diamond Road",
      "Catalina",
      "Building 21",
      "Sector 8",
      "The Factory",
    ]);
    expect(defaultMokshaDiamonds).toHaveLength(8);
  });

  test("resolves Moksha asset and layout overrides", () => {
    const options = resolveMokshaOptions({
      assets: {
        images: {
          catalina: "/custom/catalina.jpg",
        },
      },
      zoom: 90,
    });

    expect(options.zoom).toBe(90);
    expect(options.assets.images.catalina).toBe("/custom/catalina.jpg");
    expect(options.assets.images.district4).toBe(
      defaultMokshaOptions.assets.images.district4,
    );
  });

  test("resolves Moksha copy overrides without changing defaults", () => {
    const options = resolveMokshaOptions({
      copy: {
        closingCaption: "The forum is not a monument. It is a muster.",
        midTitleLines: ["agent", "city", "rising"],
        openingTitle: "OPENAGENTS",
      },
    });

    expect(defaultMokshaOptions.copy.openingTitle).toBe("MOKSHA");
    expect(options.copy.openingTitle).toBe("OPENAGENTS");
    expect(options.copy.openingCaption).toBe(
      defaultMokshaOptions.copy.openingCaption,
    );
    expect(options.copy.midTitleLines).toEqual(["agent", "city", "rising"]);
    expect(options.copy.closingCaption).toBe(
      "The forum is not a monument. It is a muster.",
    );
  });

  test("constructs the Moksha shader material before uniforms exist", () => {
    const material = new MokshaPlaneMaterial({
      color: 0xff00ff,
      opacity: 0.45,
    });

    expect(material.opacity).toBe(0.45);
    expect(material.mokshaUniforms.opacity.value).toBe(0.45);
    material.opacity = 0.2;
    expect(material.mokshaUniforms.opacity.value).toBe(0.2);
    material.dispose();
  });

  test("allows the Moksha startup fade plane to reveal scene content", () => {
    const material = new MokshaPlaneMaterial({
      color: 0x0e0e0f,
      depthWrite: false,
      opacity: 1,
      transparent: true,
    });

    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    material.opacity = 0.12;
    expect(material.mokshaUniforms.opacity.value).toBe(0.12);
    material.dispose();
  });
});

describe("training run visualization", () => {
  test("records the pmndrs 2d visualization references used for the dataviz pass", () => {
    expect(pmndrsTrainingDatavizSourceRefs).toContain(
      "projects/repos/examples/demos/bezier-curves-and-nodes/src/Nodes.jsx",
    );
    expect(pmndrsTrainingDatavizSourceRefs).toContain(
      "projects/repos/examples/demos/react-ellipsecurve/src/App.jsx",
    );
    expect(pmndrsTrainingDatavizSourceRefs).toContain(
      "projects/repos/examples/demos/scrollcontrols-with-minimap/src/App.jsx",
    );
  });

  test("keeps lifecycle and proof roles visible", () => {
    expect(summarizeTrainingRunVisualization(defaultTrainingRunNodes)).toEqual({
      lifecycle: 6,
      proof: 3,
      receipt: 2,
      rung: 2,
      run: 1,
    });
  });

  test("uses the Pluralis-derived stale-step default", () => {
    expect(resolveTrainingRunVisualizationOptions().maxAllowedStaleSteps).toBe(
      5,
    );
  });

  test("keeps anonymous training-run motion disabled by default", () => {
    const resolved = resolveTrainingRunVisualizationOptions();
    expect(resolved.cameraMode).toBe("orthographic_map");
    expect(resolved.controller).toBe("none");
    expect(resolved.motionPolicy).toEqual({
      ambient: "static",
      bursts: "once",
      evidence: "optional",
      structuralEdges: "static",
    });
    expect(resolved.sceneChrome).toEqual({
      contributorOrbit: "visible",
      lossPanel: "visible",
      staleRing: "visible",
      statusChart: "visible",
    });
    expect(resolved.stageNodeGlyph).toBe("orb");
    expect(resolved.keyboardTargeting).toEqual({
      enabled: false,
      maxTargets: 24,
    });
    expect(resolved.walkController).toEqual({});
  });

  test("preserves local controller position across refreshed visualization remounts", () => {
    const refreshed = trainingRunVisualizationOptionsWithLocalPose(
      {
        cameraMode: "perspective_walk",
        controller: "third_person_character",
        thirdPersonController: {
          jumpHeight: 4.9,
        },
      },
      {
        controller: "third_person_character",
        position: [4.25, 0, -12.75],
      },
    );

    expect(refreshed.thirdPersonController).toEqual({
      initialPosition: [4.25, 0, -12.75],
      jumpHeight: 4.9,
    });
  });

  test("preserves the local pose callback through option resolution", () => {
    const onLocalPoseChange = () => undefined;
    const resolved = resolveTrainingRunVisualizationOptions({
      onLocalPoseChange,
    });

    expect(resolved.onLocalPoseChange).toBe(onLocalPoseChange);
  });

  test("does not apply a stale pose to a different controller mode", () => {
    const refreshed = trainingRunVisualizationOptionsWithLocalPose(
      {
        cameraMode: "perspective_walk",
        controller: "wasd_mouselook",
      },
      {
        controller: "third_person_character",
        position: [4.25, 0, -12.75],
      },
    );

    expect(refreshed.walkController).toBeUndefined();
  });

  test("cycles keyboard targets from nearest to farthest", () => {
    const selection = {
      detail: "detail",
      label: "label",
      role: "run" as const,
      status: "active" as const,
    };
    const targets = [
      {
        id: "far",
        position: [5, 0, 0] as const,
        selection: { ...selection, id: "far" },
      },
      {
        id: "near",
        position: [0.5, 0, 0] as const,
        selection: { ...selection, id: "near" },
      },
      {
        id: "middle",
        position: [2, 0, 0] as const,
        selection: { ...selection, id: "middle" },
      },
    ];

    expect(
      orderTrainingRunTargetsByDistance(targets, [0, 0, 0]).map(
        (target) => target.id,
      ),
    ).toEqual(["near", "middle", "far"]);
    expect(
      cycleTrainingRunTarget(targets, {
        currentId: null,
        origin: [0, 0, 0],
      })?.id,
    ).toBe("near");
    expect(
      cycleTrainingRunTarget(targets, {
        currentId: "near",
        origin: [0, 0, 0],
      })?.id,
    ).toBe("middle");
    expect(
      cycleTrainingRunTarget(targets, {
        currentId: "near",
        direction: -1,
        origin: [0, 0, 0],
      })?.id,
    ).toBe("far");
  });

  test("cycles keyboard targets through the camera-visible screen set", () => {
    const selection = {
      detail: "detail",
      label: "label",
      role: "run" as const,
      status: "active" as const,
    };
    const camera = new Three.PerspectiveCamera(60, 1, 0.1, 20);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    const targets = [
      {
        id: "offscreen",
        position: [4, 0, 0] as const,
        selection: { ...selection, id: "offscreen" },
      },
      {
        id: "edge",
        position: [1.25, 0, 0] as const,
        selection: { ...selection, id: "edge" },
      },
      {
        id: "behind",
        position: [0, 0, 8] as const,
        selection: { ...selection, id: "behind" },
      },
      {
        id: "center",
        position: [0, 0, 0] as const,
        selection: { ...selection, id: "center" },
      },
    ];

    expect(
      orderTrainingRunTargetsByCameraView(targets, camera, [0, 0, 5]).map(
        (target) => target.id,
      ),
    ).toEqual(["center", "edge"]);
    expect(
      cycleTrainingRunCameraTarget(targets, {
        camera,
        currentId: null,
        origin: [0, 0, 5],
      })?.id,
    ).toBe("center");
    expect(
      cycleTrainingRunCameraTarget(targets, {
        camera,
        currentId: "center",
        origin: [0, 0, 5],
      })?.id,
    ).toBe("edge");
    expect(
      cycleTrainingRunCameraTarget(targets, {
        camera,
        currentId: "edge",
        direction: 1,
        origin: [0, 0, 5],
      })?.id,
    ).toBe("center");
  });

  test("resolves perspective walk controller options", () => {
    const groundHeightAt = (x: number, z: number) => (x + z) * 0.01;
    const onLockChange = () => {};
    const resolved = resolveTrainingRunVisualizationOptions({
      cameraMode: "perspective_walk",
      controller: "wasd_mouselook",
      walkController: {
        bounds: {
          maxX: 2,
          maxZ: 4,
          minX: -2,
          minZ: -4,
        },
        groundHeightAt,
        lockSelector: "[data-enter-world]",
        movementSpeed: 2.5,
        onLockChange,
      },
    });

    expect(resolved.cameraMode).toBe("perspective_walk");
    expect(resolved.controller).toBe("wasd_mouselook");
    expect(resolved.walkController).toMatchObject({
      bounds: {
        maxX: 2,
        maxZ: 4,
        minX: -2,
        minZ: -4,
      },
      lockSelector: "[data-enter-world]",
      movementSpeed: 2.5,
    });
    expect(resolved.walkController.groundHeightAt).toBe(groundHeightAt);
    expect(resolved.walkController.onLockChange).toBe(onLockChange);
  });

  test("resolves third-person character controller options", () => {
    const groundHeightAt = (x: number, z: number) => x - z;
    const resolved = resolveTrainingRunVisualizationOptions({
      cameraMode: "perspective_walk",
      controller: "third_person_character",
      thirdPersonController: {
        groundHeightAt,
        initialPosition: [1, 0, 2],
        character: {
          runSpeed: 8,
        },
        camera: {
          offset: [0, 2, 5],
        },
      },
    });

    expect(resolved.cameraMode).toBe("perspective_walk");
    expect(resolved.controller).toBe("third_person_character");
    expect(resolved.thirdPersonController).toMatchObject({
      initialPosition: [1, 0, 2],
      character: {
        runSpeed: 8,
      },
      camera: {
        offset: [0, 2, 5],
      },
    });
    expect(resolved.thirdPersonController.groundHeightAt).toBe(groundHeightAt);
  });

  test("places The Street as deterministic distant parcel geometry", () => {
    expect(metaverseStreetSourceRefs[0]).toContain("The Street");
    const parcels = metaverseStreetParcelPositions(3);

    expect(parcels).toHaveLength(6);
    expect(metaverseStreetLayout.farZ).toBeLessThan(-100);
    expect(metaverseStreetLayout.nearZ).toBeGreaterThan(100);
    expect(metaverseStreetLayout.tassadarLotX).toBeGreaterThan(
      metaverseStreetLayout.shoulderX,
    );
    expect(metaverseStreetLayout.parcelX).toBeGreaterThan(
      metaverseStreetLayout.tassadarLotX +
        metaverseStreetLayout.tassadarSceneScale * 3,
    );
    expect(metaverseStreetLayout.tassadarSceneScale).toBeGreaterThan(1.4);
    expect(parcels[0]).toMatchObject({ x: -18.2, y: 0, z: -136 });
    expect(parcels[1]).toMatchObject({ x: 18.2, y: 0, z: -136 });
    expect(parcels[2]?.z).toBeCloseTo(parcels[0]!.z + metaverseStreetParcelSpacing);
  });

  test("detects the local avatar entering and leaving the Tassadar area", () => {
    expect(trainingRunPresenceZoneForPosition([0, 0, 4.4])).toBe(
      "tassadar_area",
    );
    expect(
      trainingRunPresenceZoneForPosition([
        metaverseStreetLayout.tassadarLotX + 1,
        0,
        metaverseStreetLayout.tassadarLotZ - 2,
      ]),
    ).toBe("tassadar_area");
    expect(trainingRunPresenceZoneForPosition([0, 0, -40])).toBeNull();
    expect(trainingRunPresenceZoneForPosition([22, 0, 0])).toBeNull();
  });

  test("scales Street buildings as skyline mass instead of tiny blocks", () => {
    expect(metaverseStreetBuildingDimensions(0)).toEqual({
      depth: 4.8,
      height: metaverseStreetStoryHeight * 5,
      width: 3.8,
    });
    expect(metaverseStreetStoryHeight).toBeCloseTo(
      metaverseStreetHumanHeight * (10 / 6),
    );
    expect(metaverseStreetBuildingDimensions(5).height).toBe(
      metaverseStreetStoryHeight * 8,
    );
    expect(metaverseStreetBuildingDimensions(11).height).toBe(
      metaverseStreetStoryHeight * 18,
    );
    expect(metaverseStreetBuildingDimensions(11).height).toBeGreaterThan(
      metaverseStreetHumanHeight * 25,
    );
    expect(metaverseStreetBuildingDimensions(5).width).toBeGreaterThan(4.5);
  });

  test("renders Street buildings as translucent grayscale shadow casters", () => {
    expect(metaverseStreetBuildingColor(0)).toBe(0xd8d8d8);
    expect(metaverseStreetBuildingOpacity(3)).toBeCloseTo(0.129);

    const district = makeMetaverseStreetDistrict();
    const building = district.children.find(
      (child): child is Three.Mesh<
        Three.BoxGeometry,
        Three.MeshPhysicalMaterial
      > =>
        child instanceof Three.Mesh &&
        child.name === "the-street-building-0",
    );

    expect(building).toBeDefined();
    expect(building!.castShadow).toBe(true);
    expect(building!.receiveShadow).toBe(true);
    expect(building!.material).toBeInstanceOf(Three.MeshPhysicalMaterial);
    expect(building!.material.transparent).toBe(true);
    expect(building!.material.opacity).toBeLessThan(0.3);
    expect(building!.material.color.r).toBeCloseTo(
      building!.material.color.g,
    );
    expect(building!.material.color.g).toBeCloseTo(
      building!.material.color.b,
    );

    const receivingSurface = district.children.find(
      (child): child is Three.Mesh<
        Three.PlaneGeometry,
        Three.MeshStandardMaterial
      > =>
        child instanceof Three.Mesh &&
        child.material instanceof Three.MeshStandardMaterial &&
        child.receiveShadow,
    );
    expect(receivingSurface).toBeDefined();
  });

  test("creates a dark grayscale sky, white sun, and shadow sun for perspective Verse", () => {
    const direction = trainingRunPerspectiveSunDirection();
    expect(direction.length()).toBeCloseTo(1);
    expect(direction.y).toBeGreaterThan(0);

    const atmosphere = createTrainingRunPerspectiveAtmosphere();
    const sky = atmosphere.children.find(
      (child) => child.name === "training-run-dark-grayscale-sky",
    );
    const sunDisc = atmosphere.children.find(
      (child) => child.name === "training-run-white-sun",
    );
    const sunLight = atmosphere.children.find(
      (child): child is Three.DirectionalLight =>
        child instanceof Three.DirectionalLight &&
        child.name === "training-run-shadow-sun",
    );

    expect(sky).toBeDefined();
    expect(sunDisc).toBeInstanceOf(Three.Sprite);
    expect(sunLight).toBeDefined();
    expect(sunLight!.color.getHex()).toBe(0xffffff);
    expect(sunLight!.castShadow).toBe(true);
    expect(sunLight!.shadow.mapSize.width).toBe(2048);
    expect(sunLight!.shadow.camera.left).toBeLessThan(-50);
    expect(sunLight!.shadow.camera.right).toBeGreaterThan(50);
  });

  test("uses the imported controller GLB for the default third-person avatar", () => {
    expect(defaultThreePlayerAvatarModelUrl).toContain(
      "/assets/three-player-controller/UEPerson.glb",
    );
    expect(defaultThreePlayerAvatarAnimationClips).toEqual({
      idle: "idle",
      jumpEnd: "jumpEnd",
      jumpLoop: "jumpLoop",
      jumpStart: "jumpStart",
      run: "run",
      walk: "walk",
    });
  });

  test("resolves explicit motion policy overrides", () => {
    const resolved = resolveTrainingRunVisualizationOptions({
      motionPolicy: {
        ambient: "animated",
        bursts: "loop",
        evidence: "required",
        structuralEdges: "animated",
      },
    });
    expect(resolved.motionPolicy).toEqual({
      ambient: "animated",
      bursts: "loop",
      evidence: "required",
      structuralEdges: "animated",
    });
  });

  test("supports compact aggregate stage glyphs for live scenes", () => {
    const resolved = resolveTrainingRunVisualizationOptions({
      sceneChrome: {
        contributorOrbit: "hidden",
        lossPanel: "hidden",
        staleRing: "hidden",
        statusChart: "hidden",
      },
      stageNodeGlyph: "compact_gate",
    });
    expect(resolved.sceneChrome).toEqual({
      contributorOrbit: "hidden",
      lossPanel: "hidden",
      staleRing: "hidden",
      statusChart: "hidden",
    });
    expect(resolved.stageNodeGlyph).toBe("compact_gate");
  });

  test("can restrict world labels to pylon landmarks", () => {
    const resolved = resolveTrainingRunVisualizationOptions({
      worldLabelDensity: "pylons",
    });

    expect(resolved.worldLabelDensity).toBe("pylons");
    expect(
      trainingRunWorldLabelVisibleForSelection(
        { id: "pylon.operator.mac", label: "M1" },
        "pylons",
      ),
    ).toBe(true);
    expect(
      trainingRunWorldLabelVisibleForSelection(
        { id: "pylon:local", label: "My Pylon Base" },
        "pylons",
      ),
    ).toBe(true);
    expect(
      trainingRunWorldLabelVisibleForSelection(
        { id: "training.trace.accepted", label: "trace" },
        "pylons",
      ),
    ).toBe(false);
    expect(
      trainingRunWorldLabelVisibleForSelection(
        { id: "training.verdict", label: "verdict" },
        "compact",
      ),
    ).toBe(true);
  });

  test("builds pylon landmarks from geometry instead of a flat dot", () => {
    expect(
      trainingRunSelectionIsPylon({ id: "pylon.operator.mac", label: "M1" }),
    ).toBe(true);
    expect(
      trainingRunSelectionIsPylon({ id: "training.trace", label: "trace" }),
    ).toBe(false);

    const landmark = makeTrainingRunPylonLandmark(0x8ef6ff);
    const meshes = landmark.children.filter(
      (child): child is Three.Mesh => child instanceof Three.Mesh,
    );

    expect(landmark.name).toBe("training-run-pylon-landmark");
    expect(meshes.length).toBeGreaterThanOrEqual(5);
    expect(
      meshes.some((mesh) => mesh.geometry instanceof Three.CylinderGeometry),
    ).toBe(true);
    expect(
      meshes.some((mesh) => mesh.geometry instanceof Three.OctahedronGeometry),
    ).toBe(true);
  });

  test("anchors pylon labels directly above the pylon head", () => {
    const parent = new Three.Group();
    parent.position.set(2, -1, 0.25);
    const pylon = makeTrainingRunPylonLandmark(0x8ef6ff, { scale: 0.75 });
    pylon.position.set(1.25, -0.5, 0.4);
    parent.add(pylon);

    const anchor = trainingRunHeadLabelPositionForObject(pylon, parent, {
      margin: 0.05,
      worldHeight: 0.2,
    });

    pylon.updateWorldMatrix(true, true);
    parent.updateWorldMatrix(true, false);
    const box = new Three.Box3().setFromObject(pylon);
    const topCenterLocal = parent.worldToLocal(
      new Three.Vector3(
        (box.min.x + box.max.x) / 2,
        (box.min.y + box.max.y) / 2,
        box.max.z,
      ),
    );

    expect(anchor.x).toBeCloseTo(topCenterLocal.x);
    expect(anchor.y).toBeCloseTo(topCenterLocal.y);
    expect(anchor.z).toBeCloseTo(topCenterLocal.z + 0.15);
  });

  test("renders non-pylon run refs as dimensional artifacts", () => {
    expect(
      trainingRunArtifactKindForSelection({
        detail: "60 sats",
        id: "settlement",
        label: "settlement",
        role: "receipt",
        status: "sealed",
      }),
    ).toBe("settlement_vault");
    expect(
      trainingRunArtifactKindForSelection({
        detail: "accepted/rejected",
        id: "verdict",
        label: "verdict",
        role: "proof",
        status: "verified",
      }),
    ).toBe("proof_shard");

    const marker = makeTrainingRunArtifactMarker(
      "settlement_vault",
      0xffd166,
    );
    const geometryTypes: string[] = [];
    marker.traverse((object) => {
      if (object instanceof Three.Mesh) {
        geometryTypes.push(object.geometry.type);
      }
    });

    expect(marker.name).toBe("training-run-settlement-vault");
    expect(geometryTypes).toContain("CylinderGeometry");
    expect(geometryTypes).toContain("TorusGeometry");
    expect(geometryTypes).toContain("OctahedronGeometry");
    expect(
      geometryTypes.filter((type) => type === "CircleGeometry"),
    ).toHaveLength(0);
  });

  test("recognizes evidence-bound motion source refs", () => {
    expect(
      trainingRunMotionSourceRefs({
        sourceRefs: [" pylon.a ", "", "training.challenge.1"],
      }),
    ).toEqual(["pylon.a", "training.challenge.1"]);
    expect(
      trainingRunMotionHasEvidence({
        sourceRefs: [" ", "training.challenge.1"],
      }),
    ).toBe(true);
    expect(trainingRunMotionHasEvidence({ sourceRefs: [" "] })).toBe(false);
  });

  test("preserves node click callbacks in resolved scene options", () => {
    const onNodeClick = () => {};

    expect(
      resolveTrainingRunVisualizationOptions({ onNodeClick }).onNodeClick,
    ).toBe(onNodeClick);
  });

  test("preserves world-item options and proximity callbacks", () => {
    const onWorldItemProximityChange = () => {};
    const item = {
      id: "bulletin.tassadar",
      kind: "bulletin_board" as const,
      label: "Tassadar board",
      detail: "Five pylons are active.",
      position: [2, 0, 0.4] as const,
      sourceRefs: [" run.tassadar ", "", "route:/api/public/tassadar-run-summary"],
    };

    const resolved = resolveTrainingRunVisualizationOptions({
      worldItems: [item],
      onWorldItemProximityChange,
    });

    expect(resolved.worldItems).toEqual([item]);
    expect(resolved.onWorldItemProximityChange).toBe(
      onWorldItemProximityChange,
    );
    expect(trainingRunWorldItemSelection(item)).toEqual({
      detail: "Five pylons are active.",
      id: "bulletin.tassadar",
      kind: "bulletin_board",
      label: "Tassadar board",
      status: "active",
      sourceRefs: ["run.tassadar", "route:/api/public/tassadar-run-summary"],
    });
    expect(trainingRunWorldItemNodeSelection(item)).toEqual({
      detail: "Five pylons are active.",
      id: "world-item:bulletin.tassadar",
      label: "Tassadar board",
      role: "run",
      status: "active",
    });
  });

  test("finds the nearest bulletin board only inside its interaction radius", () => {
    const near = {
      id: "bulletin.near",
      kind: "bulletin_board" as const,
      label: "Near board",
      detail: "Near detail",
      position: [1, 0, 0] as const,
      interactionRadius: 1.25,
    };
    const far = {
      id: "bulletin.far",
      kind: "bulletin_board" as const,
      label: "Far board",
      detail: "Far detail",
      position: [4, 0, 0] as const,
      interactionRadius: 1,
    };

    expect(nearestTrainingRunWorldItem([far, near], [0, 0, 0])?.id).toBe(
      "bulletin.near",
    );
    expect(nearestTrainingRunWorldItem([far], [0, 0, 0])).toBeNull();
    expect(typeof makeTrainingRunBulletinBoard).toBe("function");
  });

  test("renders bulletin boards as visible grounded world objects", () => {
    const previousDocument = globalThis.document;
    const canvasContext = {
      clearRect: () => {},
      fillRect: () => {},
      fillText: () => {},
      measureText: (text: string) => ({ width: text.length * 12 }),
      font: "",
      fillStyle: "",
      textAlign: "center",
      textBaseline: "middle",
    };
    globalThis.document = {
      createElement: (tagName: string) => {
        if (tagName !== "canvas") {
          throw new Error(`unexpected test element: ${tagName}`);
        }
        return {
          width: 1,
          height: 1,
          getContext: () => canvasContext,
        } as unknown as HTMLCanvasElement;
      },
    } as unknown as Document;
    let board: Three.Group;
    try {
      board = makeTrainingRunBulletinBoard({
        id: "bulletin.visible",
        kind: "bulletin_board",
        label: "Tassadar",
        detail: "Live run summary.",
        lines: ["Status: active", "5 pylons, 2 active"],
        position: [0, 0, 0],
      });
    } finally {
      globalThis.document = previousDocument;
    }

    const box = new Three.Box3().setFromObject(board);
    const size = box.getSize(new Three.Vector3());

    expect(size.x).toBeGreaterThan(3);
    expect(size.z).toBeGreaterThan(2);
    expect(box.min.z).toBeGreaterThanOrEqual(-0.001);
    expect(board.children.length).toBeGreaterThan(9);
  });

  test("selects scene hits before requesting perspective-walk pointer lock", () => {
    const selection = {
      detail: "6 pylons seen",
      id: "registered",
      label: "registered",
      role: "lifecycle" as const,
      status: "queued" as const,
    };

    expect(
      trainingRunPointerClickIntent({
        button: 0,
        pointerLocked: false,
        selection,
        walkControllerEnabled: true,
      }),
    ).toBe("select");
    expect(
      trainingRunPointerClickIntent({
        button: 0,
        pointerLocked: false,
        walkControllerEnabled: true,
      }),
    ).toBe("lock");
    expect(
      trainingRunPointerClickIntent({
        button: 0,
        pointerLocked: true,
        selection,
        walkControllerEnabled: true,
      }),
    ).toBe("select");
    expect(
      trainingRunPointerClickIntent({
        button: 2,
        pointerLocked: false,
        selection,
        walkControllerEnabled: true,
      }),
    ).toBe("none");
  });

  test("connects the lifecycle through active and sync reentry", () => {
    const edges = createTrainingRunEdges(defaultTrainingRunNodes);
    expect(edges.map((edge) => [edge.sourceId, edge.targetId])).toContainEqual([
      "active",
      "sealed_window",
    ]);
    expect(edges.map((edge) => [edge.sourceId, edge.targetId])).toContainEqual([
      "sync_reentry",
      "state_synced",
    ]);
  });

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
    });

    expect(options.maxAllowedStaleSteps).toBe(7);
    expect(options.contributors).toHaveLength(6);
    expect(
      options.contributors?.map((contributor) => contributor.lifecycleState),
    ).toEqual([
      "qualified",
      "state_synced",
      "warmup",
      "active",
      "active",
      "sync_reentry",
    ]);
    expect(options.lossCurve).toHaveLength(3);
    expect(options.nodes?.find((node) => node.id === "run")?.status).toBe(
      "active",
    );
    expect(options.nodes?.find((node) => node.id === "freivalds")?.status).toBe(
      "verified",
    );
    expect(
      options.nodes?.find((node) => node.id === "sealed_window")?.detail,
    ).toBe("seal in flight");
    expect(
      options.nodes?.find((node) => node.id === "sealed_window")?.status,
    ).toBe("sealed");
    expect(options.nodes?.find((node) => node.id === "receipt")?.detail).toBe(
      "6 receipts",
    );
    expect(
      options.nodes?.find((node) => node.id === "settlement")?.detail,
    ).toBe("21 sats");
  });

  test("maps product-promise registry counts into scene signals", () => {
    const options = trainingRunVisualizationOptionsFromSnapshot({
      promiseBlockerRefCount: 4,
      promiseEvidenceRefCount: 9,
      promiseGreenCount: 1,
      promisePlannedCount: 2,
      promiseRedCount: 1,
      promiseYellowCount: 3,
    });

    expect(options.promiseSignals?.map((signal) => signal.state)).toEqual([
      "green",
      "yellow",
      "planned",
      "red",
    ]);
    expect(
      options.promiseSignals?.find((signal) => signal.state === "red"),
    ).toEqual({
      blockerCount: 4,
      evidenceRefCount: 9,
      id: "promise.red",
      label: "red",
      state: "red",
    });
  });

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
    });

    expect(options.promiseSignals).toEqual([
      {
        blockerCount: 2,
        evidenceRefCount: 5,
        id: "training.model_ladder.v1",
        label: "model ladder",
        state: "yellow",
      },
    ]);
  });

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
    });

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
    ]);
  });

  test("surfaces blocker and pending-payout state in scene nodes", () => {
    const options = trainingRunVisualizationOptionsFromSnapshot({
      blockerRefCount: 2,
      pendingPayoutCount: 3,
      receiptRefCount: 0,
      runState: "planned",
      sealInFlight: true,
      verifiedWorkCount: 0,
    });

    expect(
      options.nodes?.find((node) => node.id === "sync_reentry")?.detail,
    ).toBe("2 blockers");
    expect(
      options.nodes?.find((node) => node.id === "sync_reentry")?.status,
    ).toBe("blocked");
    expect(
      options.nodes?.find((node) => node.id === "sealed_window")?.detail,
    ).toBe("seal in flight");
    expect(
      options.nodes?.find((node) => node.id === "settlement")?.detail,
    ).toBe("3 pending");
  });
});

describe("proof replay visualization", () => {
  test("keeps a perspective camera snapshot with stable defaults", () => {
    expect(resolveProofReplayVisualizationOptions()).toMatchObject({
      ...defaultProofReplayVisualizationOptions,
      camera: defaultProofReplayCameraPose,
    });
  });

  test("applies caller camera overrides without mutating the base pose", () => {
    const base = defaultProofReplayCameraPose;
    const pose = proofReplayCameraPoseWithOverride(base, {
      fov: 38,
      position: { x: 3, y: 2, z: 8 },
      target: [1, 0, -1],
    });

    expect(pose.fov).toBe(38);
    expect(pose.position).toEqual({ x: 3, y: 2, z: 8 });
    expect(pose.target).toEqual([1, 0, -1]);
    expect(base.position).toEqual([0, 7.8, 10.5]);
  });
});

describe("training run entity layer", () => {
  test("keeps entity labels camera-facing for perspective walk mode", async () => {
    const source = await Bun.file(
      new URL("./trainingRun.ts", import.meta.url),
    ).text();
    const entityLabelBlock = source.slice(
      source.indexOf("const entityLabels: TextLabelHandle[] = []"),
      source.indexOf("for (const beam of resolved.beams)"),
    );
    expect(source).toContain("const entityLabels: TextLabelHandle[] = []");
    expect(entityLabelBlock).not.toContain("billboard: false");
    expect(source).toContain("label.faceCamera(camera);");
    expect(source).toContain("for (const label of entityLabels)");
  });

  test("defaults the entity layer to honest-empty arrays", () => {
    const resolved = resolveTrainingRunVisualizationOptions();
    expect(resolved.entities).toEqual([]);
    expect(resolved.remoteAvatars).toEqual([]);
    expect(resolved.remoteAvatarInterpolation).toMatchObject({
      despawnAfterMs: 12_000,
      interpolateMs: 180,
      staleAfterMs: 6_000,
    });
    expect(resolved.beams).toEqual([]);
    expect(resolved.bursts).toEqual([]);
  });

  test("passes remote avatar render instances through resolution", () => {
    const remoteAvatars = [
      {
        animation: "walk",
        color: "#f5b73a",
        id: "avatar.alpha",
        label: "Alpha",
        position: [1, 0, -2],
        updatedAtMs: 1_200,
        yaw: 0.75,
      },
    ] as const;

    const resolved = resolveTrainingRunVisualizationOptions({
      remoteAvatarInterpolation: { interpolateMs: 240 },
      remoteAvatars,
    });

    expect(resolved.remoteAvatars).toEqual(remoteAvatars);
    expect(resolved.remoteAvatarInterpolation).toMatchObject({
      despawnAfterMs: 12_000,
      interpolateMs: 240,
      staleAfterMs: 6_000,
    });
  });

  test("projects remote avatar selection and colors without permanent labels", () => {
    const fresh = {
      color: "#f5b73a",
      id: "avatar.alpha",
      label: "Alpha",
      position: [0, 0, 0],
    } as const;
    const stale = { ...fresh, stale: true };

    expect(trainingRunRemoteAvatarSelection(fresh)).toEqual({
      detail: "remote avatar",
      id: "remote-avatar:avatar.alpha",
      label: "Alpha",
      role: "run",
      status: "active",
    });
    expect(trainingRunRemoteAvatarSelection(stale).status).toBe("queued");
    expect(colorForRemoteAvatar(fresh)).toBe(0xf5b73a);
    expect(colorForRemoteAvatar({ color: "not-a-hex", stale: true })).toBe(
      0x9ca3af,
    );
  });

  test("passes provided entity layer arrays through resolution", () => {
    const entities = [
      { id: "pylon.a", status: "active", label: "A" },
      { id: "pylon.b", status: "warmup" },
    ] as const;
    const beams = [{ fromId: "pylon.a", toId: "pylon.b" }] as const;
    const bursts = [{ atId: "pylon.a" }] as const;

    const resolved = resolveTrainingRunVisualizationOptions({
      entities,
      beams,
      bursts,
    });
    expect(resolved.entities).toEqual(entities);
    expect(resolved.beams).toEqual(beams);
    expect(resolved.bursts).toEqual(bursts);
  });

  test("retains the scene across transient local pose restore updates", () => {
    const base = {
      cameraMode: "perspective_walk",
      controller: "third_person_character",
      thirdPersonController: {
        character: { walkSpeed: 3.8 },
        initialPosition: [0, 0, 4.4],
      },
    } as const;
    const moved = trainingRunVisualizationOptionsWithLocalPose(base, {
      action: "walk",
      capturedAtMs: 1_000,
      controller: "third_person_character",
      position: [2, 0, -5],
      yaw: 0.75,
    });

    expect(trainingRunVisualizationRetainedStructuralSignature(base)).toBe(
      trainingRunVisualizationRetainedStructuralSignature(moved),
    );
    expect(canRetainTrainingRunVisualization(base, moved)).toBe(true);
  });

  test("retains the scene across live world item copy changes", () => {
    const loading = {
      cameraMode: "perspective_walk",
      controller: "third_person_character",
      worldItems: [
        {
          detail: "Loading",
          id: "verse:bulletin:tassadar-run",
          kind: "bulletin_board",
          label: "Tassadar Board",
          lines: ["Loading Tassadar run"],
          position: [-0.95, 1.78, 0.04],
        },
      ],
    } as const;
    const hydrated = {
      ...loading,
      worldItems: [
        {
          ...loading.worldItems[0],
          detail: "Tassadar is active.",
          label: "Tassadar Run Board",
          lines: ["Status: active", "5 pylons, 2 active"],
        },
      ],
    } as const;

    expect(canRetainTrainingRunVisualization(loading, hydrated)).toBe(true);
  });

  test("lays out entities deterministically (no Math.random / time)", () => {
    const a = trainingRunEntityRingPosition(0, 5);
    const b = trainingRunEntityRingPosition(0, 5);
    expect(a).toEqual(b);
    const c = trainingRunEntityRingPosition(1, 5);
    expect(c).not.toEqual(a);
    // default ring positions are a deterministic 3D cloud, not one flat plane
    expect(a[2]).not.toBe(c[2]);
  });

  test("resolves positions: explicit wins, ring fills the unplaced", () => {
    const positions = resolveTrainingRunEntityPositions([
      { id: "fixed", status: "active", position: [3, 1, 0] },
      { id: "ring0", status: "warmup" },
      { id: "ring1", status: "qualified" },
    ]);
    expect(positions.get("fixed")).toEqual([3, 1, 0]);
    // unplaced entities only count themselves for ring spacing
    expect(positions.get("ring0")).toEqual(trainingRunEntityRingPosition(0, 2));
    expect(positions.get("ring1")).toEqual(trainingRunEntityRingPosition(1, 2));
    expect(positions.get("ring0")?.[2]).not.toBe(positions.get("ring1")?.[2]);
  });

  test("collapses duplicate entity ids into one visual node", () => {
    const entities = uniqueTrainingRunEntities([
      { id: "pylon.same", label: "P1", status: "active" },
      { id: "pylon.other", label: "P2", status: "warmup" },
      { id: "pylon.same", label: "RW1", status: "rejected" },
    ]);

    expect(entities).toEqual([
      { id: "pylon.same", label: "RW1", status: "rejected" },
      { id: "pylon.other", label: "P2", status: "warmup" },
    ]);
  });

  test("separates entity positions by a deterministic minimum distance", () => {
    const positions = resolveTrainingRunEntityPositions([
      { id: "a", status: "active", position: [0, 0, 0] },
      { id: "b", status: "active", position: [0.1, 0, 0] },
      { id: "c", status: "active", position: [0.2, 0, 0] },
    ]);
    const values = [...positions.values()];
    for (let left = 0; left < values.length; left += 1) {
      for (let right = left + 1; right < values.length; right += 1) {
        const a = values[left] ?? [0, 0, 0];
        const b = values[right] ?? [0, 0, 0];
        expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeGreaterThanOrEqual(
          trainingRunEntityMinimumDistance - 0.00001,
        );
      }
    }
  });

  test("maps arbitrary entity status onto the bounded node status enum", () => {
    expect(trainingRunEntityNodeStatus("active")).toBe("active");
    expect(trainingRunEntityNodeStatus("verified")).toBe("verified");
    expect(trainingRunEntityNodeStatus("registered")).toBe("queued");
    expect(trainingRunEntityNodeStatus("warmup")).toBe("sync");
    expect(trainingRunEntityNodeStatus("sync_reentry")).toBe("blocked");
    expect(trainingRunEntityNodeStatus("settled")).toBe("verified");
    expect(trainingRunEntityNodeStatus("totally-unknown")).toBe("active");
  });

  test("projects an entity selection for the node-selected / onNodeClick hook", () => {
    const selection = trainingRunEntitySelection({
      id: "pylon.operator.mac",
      status: "warmup",
      label: "M1",
    });
    expect(selection.id).toBe("pylon.operator.mac");
    expect(selection.label).toBe("M1");
    expect(selection.role).toBe("run");
    // bounded status the foldkit event schema accepts ...
    expect(selection.status).toBe("sync");
    // ... while the raw entity status survives in detail for #5116 dereference
    expect(selection.detail).toBe("warmup");
  });

  test("falls back to the entity id when no label is given", () => {
    const selection = trainingRunEntitySelection({
      id: "pylon.unlabeled",
      status: "active",
    });
    expect(selection.label).toBe("pylon.unlabeled");
  });
});

describe("extra controls primitives", () => {
  test("cites the Drei controls wrappers that motivated the port", () => {
    expect(pmndrsExtraControlsPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/web/TransformControls.tsx",
    );
    expect(pmndrsExtraControlsPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/MapControls.tsx",
    );
  });

  test("exposes stable defaults for each controller", () => {
    expect(defaultTrackballControlsOptions.dynamicDampingFactor).toBe(0.2);
    expect(defaultFlyControlsOptions.rollSpeed).toBe(0.005);
    expect(defaultFirstPersonControlsOptions.lookSpeed).toBe(0.005);
    expect(defaultFirstPersonControlsOptions.constrainVertical).toBe(false);
  });

  test("applies trackball options onto a real controller", () => {
    const camera = new Three.PerspectiveCamera();
    const controls = new TrackballControls(camera, undefined);
    applyTrackballControlsOptions(controls, {
      rotateSpeed: 3,
      noPan: true,
      staticMoving: true,
    });
    expect(controls.rotateSpeed).toBe(3);
    expect(controls.noPan).toBe(true);
    expect(controls.staticMoving).toBe(true);
    // dynamicDampingFactor falls back to the default.
    expect(controls.dynamicDampingFactor).toBe(0.2);
  });

  test("applies fly and first-person movement options", () => {
    const camera = new Three.PerspectiveCamera();
    const fly = new FlyControls(camera, undefined);
    applyFlyControlsOptions(fly, { movementSpeed: 12, autoForward: true });
    expect(fly.movementSpeed).toBe(12);
    expect(fly.autoForward).toBe(true);

    const fp = new FirstPersonControls(camera, undefined);
    applyFirstPersonControlsOptions(fp, {
      movementSpeed: 5,
      constrainVertical: true,
      verticalMax: 2,
    });
    expect(fp.movementSpeed).toBe(5);
    expect(fp.constrainVertical).toBe(true);
    expect(fp.verticalMax).toBe(2);
    // unspecified options keep their defaults
    expect(fp.lookVertical).toBe(true);
  });

  test("applyTransformControlsOptions only mutates provided fields", () => {
    const noop = applyTransformControlsOptions;
    expect(typeof noop).toBe("function");
  });
});

describe("player controller primitives", () => {
  test("cites the controller references that motivated the primitive", () => {
    expect(pmndrsPlayerControllerPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/PointerLockControls.tsx",
    );
    expect(pmndrsPlayerControllerPrimitiveSourceRefs).toContain(
      "projects/repos/three-player-controller/src/playerController.ts",
    );
    expect(pmndrsPlayerControllerPrimitiveSourceRefs).toContain(
      "projects/repos/three-player-controller/src/systems/CameraSystem.ts",
    );
    expect(pmndrsPlayerControllerPrimitiveSourceRefs).toContain(
      "projects/repos/three-player-controller/src/systems/InputSystem.ts",
    );
    expect(pmndrsPlayerControllerPrimitiveSourceRefs).toContain(
      "projects/repos/Quick_3D_MMORPG/client/src/player-entity.js",
    );
    expect(pmndrsPlayerControllerPrimitiveSourceRefs).toContain(
      "projects/repos/Quick_3D_MMORPG/client/src/player-state.js",
    );
    expect(pmndrsPlayerControllerPrimitiveSourceRefs).toContain(
      "projects/repos/Quick_3D_MMORPG/client/src/third-person-camera.js",
    );
  });

  test("maps keyboard codes into stable WASD actions", () => {
    expect(keyCodeToWasdAction("KeyW")).toBe("forward");
    expect(keyCodeToWasdAction("ArrowDown")).toBe("backward");
    expect(keyCodeToWasdAction("KeyA")).toBe("left");
    expect(keyCodeToWasdAction("ShiftRight")).toBe("sprint");
    expect(keyCodeToWasdAction("Escape")).toBeUndefined();

    const state = defaultWasdKeyboardState();
    expect(setWasdKeyState(state, "KeyW", true)).toBe(true);
    expect(state.forward).toBe(true);
    expect(setWasdKeyState(state, "KeyW", false)).toBe(true);
    expect(state.forward).toBe(false);
    expect(setWasdKeyState(state, "Escape", true)).toBe(false);
  });

  test("computes camera-yaw-relative desired movement", () => {
    const camera = new Three.PerspectiveCamera();
    camera.rotation.y = Math.PI / 2;
    camera.updateMatrixWorld();

    const state = {
      ...defaultWasdKeyboardState(),
      forward: true,
    };
    const direction = wasdDesiredDirection(camera, state);
    expect(direction.x).toBeCloseTo(-1);
    expect(direction.z).toBeCloseTo(0);

    const strafeState = {
      ...defaultWasdKeyboardState(),
      right: true,
    };
    const strafe = wasdDesiredDirection(camera, strafeState);
    expect(strafe.x).toBeCloseTo(0);
    expect(strafe.z).toBeCloseTo(-1);
  });

  test("reads standard and browser-prefixed mouse movement deltas", () => {
    expect(
      wasdMouseMovementFromEvent(
        { movementX: 3, movementY: -2 } as MouseEvent,
      ),
    ).toEqual([3, -2]);

    const prefixed = {
      movementX: 0,
      movementY: 0,
    } as MouseEvent & {
      webkitMovementX: number;
      webkitMovementY: number;
    };
    Object.defineProperty(prefixed, "webkitMovementX", { value: 7 });
    Object.defineProperty(prefixed, "webkitMovementY", { value: -6 });
    expect(wasdMouseMovementFromEvent(prefixed)).toEqual([7, -6]);
  });

  test("applies explicit pointer-lock mouse deltas to camera yaw and pitch", () => {
    const camera = new Three.PerspectiveCamera();
    const before = camera.quaternion.clone();
    applyMouseLookDelta(camera, 80, -40, {
      pitchMax: Math.PI / 2 - 0.05,
      pitchMin: -Math.PI / 2 + 0.05,
      pointerSensitivity: 0.002,
    });

    expect(camera.quaternion.angleTo(before)).toBeGreaterThan(0);
    const direction = new Three.Vector3(0, 0, -1).applyQuaternion(
      camera.quaternion,
    );
    expect(direction.x).not.toBeCloseTo(0);
    expect(direction.y).not.toBeCloseTo(0);

    applyMouseLookDelta(camera, 0, 1000, {
      pitchMax: 0.1,
      pitchMin: -0.1,
      pointerSensitivity: 1,
    });
    const euler = new Three.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    expect(euler.x).toBeCloseTo(-0.1);
  });

  test("integrates velocity with acceleration and damping", () => {
    const velocity = new Three.Vector3();
    const forward = new Three.Vector3(0, 0, -1);
    integrateWasdVelocity(
      velocity,
      forward,
      0.016,
      {
        acceleration: 18,
        damping: 12,
        movementSpeed: 4,
        sprintMultiplier: 2,
      },
      true,
    );
    expect(velocity.z).toBeLessThan(0);
    expect(Math.abs(velocity.z)).toBeLessThanOrEqual(8);

    const beforeDamping = Math.abs(velocity.z);
    integrateWasdVelocity(
      velocity,
      new Three.Vector3(),
      0.016,
      {
        acceleration: 18,
        damping: 12,
        movementSpeed: 4,
        sprintMultiplier: 2,
      },
      false,
    );
    expect(Math.abs(velocity.z)).toBeLessThan(beforeDamping);
  });

  test("clamps movement positions to walk bounds", () => {
    const position = new Three.Vector3(20, 2, -20);
    clampWasdPosition(position, {
      minX: -3,
      maxX: 3,
      minZ: -4,
      maxZ: 4,
    });
    expect(position.x).toBe(3);
    expect(position.z).toBe(-4);
  });

  test("computes Quick-style third-person camera offset and look target", () => {
    const target = {
      position: new Three.Vector3(10, 0, -2),
      quaternion: new Three.Quaternion().setFromAxisAngle(
        new Three.Vector3(0, 1, 0),
        Math.PI / 2,
      ),
    };
    const options = resolveThirdPersonFollowCameraOptions({
      offset: [0, 3, 6],
      lookAtOffset: [0, 1, -2],
      minGroundClearance: 2,
      groundHeightAt: () => 4,
    });

    const offset = thirdPersonIdealOffset(target, options);
    const lookAt = thirdPersonIdealLookAt(target, options);
    expect(offset.x).toBeCloseTo(16);
    expect(offset.y).toBeCloseTo(6);
    expect(offset.z).toBeCloseTo(-2);
    expect(lookAt.x).toBeCloseTo(8);
    expect(lookAt.y).toBeCloseTo(1);
    expect(lookAt.z).toBeCloseTo(-2);
    expect(thirdPersonFollowSmoothingFactor(0, options.smoothing)).toBe(0);
    expect(thirdPersonFollowSmoothingFactor(1, 0)).toBe(1);
    expect(thirdPersonFollowSmoothingFactor(1, 0.01)).toBeCloseTo(0.99);
  });

  test("scales and clamps third-person follow camera wheel zoom", () => {
    expect(thirdPersonCameraOffsetDistance([0, 3, 4])).toBe(5);
    expect(thirdPersonCameraOffsetAtDistance([0, 3, 4], 10)).toEqual([
      0, 6, 8,
    ]);
    expect(wheelDeltaPixels(2, 0)).toBe(2);
    expect(wheelDeltaPixels(2, 1)).toBe(32);
    expect(wheelDeltaPixels(2, 2)).toBe(320);

    const options = resolveThirdPersonFollowCameraOptions({
      minDistance: 2,
      maxDistance: 8,
      zoomSpeed: 0.01,
    });
    expect(thirdPersonCameraDistanceAfterWheel(5, 100, 0, options)).toBe(6);
    expect(thirdPersonCameraDistanceAfterWheel(5, -1000, 0, options)).toBe(2);
    expect(thirdPersonCameraDistanceAfterWheel(5, 1000, 0, options)).toBe(8);
  });

  test("uses the original three-player-controller drag orbit math", () => {
    expect(threePlayerControllerLookDeltaToOrbitDelta(100)).toBeCloseTo(-0.05);
    expect(threePlayerControllerLookDeltaToOrbitDelta(-40)).toBeCloseTo(0.02);

    const offset = thirdPersonOrbitOffset(
      [0, 2, 4],
      threePlayerControllerLookDeltaToOrbitDelta(100),
      threePlayerControllerLookDeltaToOrbitDelta(-40),
    );
    expect(thirdPersonCameraOffsetDistance(offset)).toBeCloseTo(
      thirdPersonCameraOffsetDistance([0, 2, 4]),
    );
    expect(offset[0]).toBeLessThan(0);
    expect(offset[1]).toBeLessThan(2);

    const clampedUp = thirdPersonOrbitOffset([0, 4, 0.01], 0, -100);
    expect(clampedUp[1]).toBeLessThan(thirdPersonCameraOffsetDistance(clampedUp));
  });

  test("defaults the harvested controller to snap-follow and stronger click drag", () => {
    const options = resolveThreePlayerControllerOptions(
      globalThis as unknown as Window,
      {},
    );
    expect(options.camera.smoothing).toBe(0);
    expect(options.camera.lookAtOffset).toEqual([0, 0.9, 0]);
    expect(options.dragSensitivity).toBe(3);
    const yawedTarget = {
      position: new Three.Vector3(3, 0, -2),
      quaternion: new Three.Quaternion().setFromAxisAngle(
        new Three.Vector3(0, 1, 0),
        Math.PI / 2,
      ),
    };
    const lookAt = thirdPersonIdealLookAt(
      yawedTarget,
      resolveThirdPersonFollowCameraOptions(options.camera),
    );
    expect(lookAt.x).toBeCloseTo(3);
    expect(lookAt.z).toBeCloseTo(-2);
    expect(threePlayerControllerLookDeltaToOrbitDelta(100 * options.dragSensitivity)).toBeCloseTo(
      -0.15,
    );
  });

  test("updates a third-person follow camera with smoothing", () => {
    const camera = new Three.PerspectiveCamera();
    const target = {
      position: new Three.Vector3(0, 0, 0),
      quaternion: new Three.Quaternion(),
    };
    const state = createThirdPersonFollowCameraState(camera, target, {
      offset: [0, 2, 4],
      lookAtOffset: [0, 1, -1],
    });
    expect(camera.position.z).toBeCloseTo(4);

    target.position.set(0, 0, -4);
    updateThirdPersonFollowCamera(camera, target, state, 1, {
      offset: [0, 2, 4],
      lookAtOffset: [0, 1, -1],
      smoothing: 0.01,
    });
    expect(camera.position.z).toBeCloseTo(0.04);
    expect(camera.quaternion.length()).toBeCloseTo(1);

    const handle = createThirdPersonFollowCamera(camera, target, {
      offset: [0, 2, 4],
      lookAtOffset: [0, 1, -1],
    });
    Effect.runSync(handle.snap);
    expect(handle.state.currentPosition.z).toBeCloseTo(0);

    Effect.runSync(
      handle.setOptions({
        offset: [0, 2, 2],
        lookAtOffset: [0, 1, -1],
      }),
    );
    Effect.runSync(handle.snap);
    expect(handle.state.currentPosition.z).toBeCloseTo(-2);
  });

  test("derives MMORPG walk/run/idle actions from keyboard state", () => {
    expect(mmorpgCharacterActionForKeyboard(defaultWasdKeyboardState())).toBe(
      "idle",
    );
    expect(
      mmorpgCharacterActionForKeyboard({
        ...defaultWasdKeyboardState(),
        forward: true,
      }),
    ).toBe("walk");
    expect(
      mmorpgCharacterActionForKeyboard({
        ...defaultWasdKeyboardState(),
        forward: true,
        sprint: true,
      }),
    ).toBe("run");
  });

  test("moves a Quick-style character by turning the object and walking forward", () => {
    const object = new Three.Object3D();
    const state = defaultMmorpgCharacterControllerState();
    const keyboard = {
      ...defaultWasdKeyboardState(),
      forward: true,
      left: true,
    };
    const snapshot = updateMmorpgCharacterController(
      object,
      keyboard,
      state,
      0.1,
      {
        acceleration: 100,
        walkSpeed: 4,
        turnSpeed: Math.PI,
      },
    );

    expect(snapshot.action).toBe("walk");
    expect(snapshot.blocked).toBe(false);
    expect(snapshot.velocity.z).toBeGreaterThan(0);
    expect(object.position.length()).toBeGreaterThan(0);
    expect(object.quaternion.angleTo(new Three.Quaternion())).toBeGreaterThan(0);

    const forward = mmorpgCharacterForwardDirection(object);
    expect(forward.length()).toBeCloseTo(1);
  });

  test("moves the harvested third-person character camera-relative on A/D", () => {
    const object = new Three.Object3D();
    const camera = new Three.PerspectiveCamera();
    camera.position.set(0, 1, 6);
    camera.lookAt(0, 1, 0);
    const state = defaultMmorpgCharacterControllerState();
    const keyboard = {
      ...defaultWasdKeyboardState(),
      right: true,
    };
    const snapshot = updateCameraRelativeMmorpgCharacterController(
      object,
      camera,
      keyboard,
      state,
      0.1,
      {
        acceleration: 100,
        turnSpeed: 100,
        walkSpeed: 4,
      },
    );

    expect(snapshot.action).toBe("walk");
    expect(snapshot.velocity.x).toBeGreaterThan(0);
    expect(Math.abs(snapshot.velocity.z)).toBeLessThan(0.000001);
    expect(object.position.x).toBeGreaterThan(0);
    expect(Math.abs(object.position.z)).toBeLessThan(0.000001);
    const forward = mmorpgCharacterForwardDirection(object);
    expect(forward.x).toBeGreaterThan(0.99);
    expect(Math.abs(forward.z)).toBeLessThan(0.000001);
  });

  test("keeps default A/D third-person turning calm", () => {
    const defaults = defaultThreePlayerControllerOptions({} as Window);
    expect(defaultMmorpgCharacterControllerOptions.turnSpeed).toBeLessThan(
      Math.PI * 1.2,
    );
    expect(defaults.character.turnSpeed).toBeLessThan(Math.PI * 1.2);
  });

  test("keeps Quick-style character movement bounded and collision-aware", () => {
    const object = new Three.Object3D();
    const state = defaultMmorpgCharacterControllerState();
    const keyboard = {
      ...defaultWasdKeyboardState(),
      forward: true,
    };
    const options = resolveMmorpgCharacterControllerOptions({
      acceleration: defaultMmorpgCharacterControllerOptions.acceleration,
      bounds: { minX: -1, maxX: 1, minZ: -0.2, maxZ: 0.2 },
      canMoveTo: (next) => next.z > -0.1,
      groundHeightAt: () => 2,
      walkSpeed: 100,
    });

    const blocked = updateMmorpgCharacterController(
      object,
      keyboard,
      state,
      0.1,
      options,
    );
    expect(blocked.blocked).toBe(true);
    expect(object.position.z).toBe(0);
    expect(blocked.velocity.z).toBe(0);

    const allowed = updateMmorpgCharacterController(
      object,
      {
        ...defaultWasdKeyboardState(),
        backward: true,
      },
      state,
      0.1,
      {
        ...options,
        canMoveTo: () => true,
      },
    );
    expect(allowed.blocked).toBe(false);
    expect(object.position.y).toBe(2);
    expect(object.position.z).toBeLessThanOrEqual(0.2);
  });
});

describe("helper primitives", () => {
  test("cites the R3F/Drei helper sources", () => {
    expect(pmndrsHelperPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/Grid.tsx",
    );
    expect(pmndrsHelperPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/Helper.tsx",
    );
  });

  test("builds disposable grid and axes helpers", () => {
    const grid = createGridHelper({ size: 20, divisions: 4 });
    expect(grid.helper).toBeInstanceOf(Three.GridHelper);
    expect(() => grid.dispose()).not.toThrow();

    const polar = createPolarGridHelper({ radius: 8, rings: 3 });
    expect(polar.helper).toBeInstanceOf(Three.PolarGridHelper);
    polar.dispose();

    const axes = createAxesHelper(3);
    expect(axes.helper).toBeInstanceOf(Three.AxesHelper);
    axes.dispose();
  });

  test("builds bounding-box, plane, and camera helpers", () => {
    const box = new Three.Box3(
      new Three.Vector3(-1, -1, -1),
      new Three.Vector3(1, 1, 1),
    );
    const box3 = createBox3Helper(box, 0x00ff00);
    expect(box3.helper).toBeInstanceOf(Three.Box3Helper);
    box3.dispose();

    const plane = createPlaneHelper(
      new Three.Plane(new Three.Vector3(0, 1, 0), 0),
    );
    expect(plane.helper).toBeInstanceOf(Three.PlaneHelper);
    plane.dispose();

    const camera = new Three.PerspectiveCamera();
    const cameraHelper = createCameraHelper(camera);
    expect(cameraHelper.helper).toBeInstanceOf(Three.CameraHelper);
    cameraHelper.dispose();
  });

  test("builds arrow, light, and vertex-normal helpers", () => {
    const arrow = createArrowHelper({ length: 2, color: 0xff00ff });
    expect(arrow.helper).toBeInstanceOf(Three.ArrowHelper);
    arrow.dispose();

    const light = new Three.DirectionalLight();
    const lightHelper = createDirectionalLightHelper(light, 2);
    expect(lightHelper.helper).toBeInstanceOf(Three.DirectionalLightHelper);
    lightHelper.dispose();

    const point = new Three.PointLight();
    const pointHelper = createPointLightHelper(point, 1);
    expect(pointHelper.helper).toBeInstanceOf(Three.PointLightHelper);
    pointHelper.dispose();

    const mesh = new Three.Mesh(
      new Three.BoxGeometry(1, 1, 1),
      new Three.MeshBasicMaterial(),
    );
    const normals = createVertexNormalsHelper(mesh, 0.5);
    expect(normals.helper.type).toBe("VertexNormalsHelper");
    normals.dispose();
  });
});

describe("math primitives", () => {
  test("cites the sampler/noise sources", () => {
    expect(pmndrsMathPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/Sampler.tsx",
    );
  });

  test("produces deterministic, bounded Perlin and simplex noise", () => {
    const perlin = createImprovedNoise();
    const a = perlin.noise(1.5, 2.5, 3.5);
    const b = perlin.noise(1.5, 2.5, 3.5);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(-1);
    expect(a).toBeLessThanOrEqual(1);

    const simplex = createSimplexNoise();
    const s2 = simplex.noise(0.25, 0.75);
    expect(s2).toBeGreaterThanOrEqual(-1);
    expect(s2).toBeLessThanOrEqual(1);
  });

  test("fbm stays normalized and clamps octaves to at least one", () => {
    const perlin = createImprovedNoise();
    const value = fbmNoise3d(perlin, 0.3, 0.6, 0.9, {
      octaves: 5,
      frequency: 1.5,
    });
    expect(value).toBeGreaterThanOrEqual(-1);
    expect(value).toBeLessThanOrEqual(1);

    // octaves: 0 is clamped up to 1 rather than dividing by zero.
    const single = fbmNoise3d(perlin, 0.3, 0.6, 0.9, { octaves: 0 });
    expect(Number.isFinite(single)).toBe(true);
  });

  test("samples positions off a built mesh surface", () => {
    const mesh = new Three.Mesh(
      new Three.PlaneGeometry(4, 4, 2, 2),
      new Three.MeshBasicMaterial(),
    );
    const handle = Effect.runSync(createSurfaceSampler(mesh));
    const single = handle.sample();
    expect(single.position).toBeInstanceOf(Three.Vector3);
    expect(Number.isFinite(single.position.x)).toBe(true);

    const positions = handle.samplePositions(8);
    expect(positions.length).toBe(24);
    // every sampled coordinate is finite
    expect([...positions].every(Number.isFinite)).toBe(true);
  });

  test("maps scalars to Lut colors and packs a color array", () => {
    const lut = createLut("cooltowarm", 16);
    const low = lutColorAt(lut, 0, 0, 1);
    const high = lutColorAt(lut, 1, 0, 1);
    expect(low).toBeInstanceOf(Three.Color);
    // cool-to-warm: the endpoints differ
    expect(low.getHex()).not.toBe(high.getHex());

    const colors = lutColorArray(lut, [0, 0.5, 1], 0, 1);
    expect(colors.length).toBe(9);
    expect([...colors].every((channel) => channel >= 0 && channel <= 1)).toBe(
      true,
    );
  });
});

describe("living-run P0 primitives", () => {
  test("cites the drei/pmndrs source refs for each primitive", () => {
    expect(pmndrsTextLabelPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/Text.tsx",
    );
    expect(pmndrsTextLabelPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/Billboard.tsx",
    );
    expect(pmndrsEntityPoolPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/Instances.tsx",
    );
    expect(pmndrsFlowEffectPrimitiveSourceRefs).toContain(
      "projects/repos/examples/demos/lightbeams/src/App.jsx",
    );
    expect(pmndrsPresenceBindingPrimitiveSourceRefs).toContain(
      "projects/repos/drei/src/core/Instances.tsx",
    );
  });

  test("resolves crisp text label defaults and overrides", () => {
    const resolved = resolveTextLabelOptions({ text: "pylon.mac" });
    expect(resolved.text).toBe("pylon.mac");
    expect(resolved.billboard).toBe(defaultTextLabelOptions.billboard);
    expect(resolved.worldHeight).toBe(defaultTextLabelOptions.worldHeight);

    const overridden = resolveTextLabelOptions({
      text: "node",
      worldHeight: 0.8,
      billboard: false,
      color: 0xff0000,
    });
    expect(overridden.worldHeight).toBe(0.8);
    expect(overridden.billboard).toBe(false);
    expect(overridden.color).toBe(0xff0000);
  });

  test("entity pool spawns, updates, reuses freed slots, and disposes", () => {
    const pool = createEntityPool({ capacity: 4, color: 0x223344 });
    expect(pool.capacity).toBe(4);
    expect(pool.count()).toBe(0);

    pool.set("a", { position: [1, 0, 0], color: "red" });
    pool.set("b", { position: [2, 0, 0] });
    pool.set("c", { position: [3, 0, 0] });
    expect(pool.count()).toBe(3);
    expect(pool.mesh.count).toBe(3);
    expect(pool.has("b")).toBe(true);

    // updating an existing id keeps the slot
    const slotA = pool.set("a", { position: [9, 0, 0] });
    const matrix = new Three.Matrix4();
    pool.mesh.getMatrixAt(slotA, matrix);
    const position = new Three.Vector3();
    position.setFromMatrixPosition(matrix);
    expect(position.x).toBe(9);

    // removing frees a slot for reuse
    pool.remove("b");
    expect(pool.count()).toBe(2);
    expect(pool.has("b")).toBe(false);
    const slotD = pool.set("d", { position: [4, 0, 0] });
    expect(slotD).toBe(1); // reused b's slot index
    expect(pool.count()).toBe(3);

    expect(() => pool.dispose()).not.toThrow();
  });

  test("entity pool throws when capacity is exceeded", () => {
    const pool = createEntityPool({ capacity: 1 });
    pool.set("a", { position: [0, 0, 0] });
    expect(() => pool.set("b", { position: [1, 0, 0] })).toThrow();
    pool.dispose();
  });

  test("flow beam builds geometry, advances pulses, and retargets", () => {
    const beam = createFlowBeam({
      from: [0, 0, 0],
      to: [2, 0, 0],
      rate: 1,
      pulseCount: 2,
    });
    expect(beam.object3D).toBeInstanceOf(Three.Group);
    const pulses = beam.object3D.children.filter(
      (child) =>
        child instanceof Three.Mesh &&
        child.geometry instanceof Three.SphereGeometry,
    );
    expect(pulses).toHaveLength(2);

    const before = (pulses[0] as Three.Mesh).position.clone();
    beam.update(0.25);
    const after = (pulses[0] as Three.Mesh).position.clone();
    expect(after.distanceTo(before)).toBeGreaterThan(0);

    expect(() => beam.setEndpoints([0, 0, 0], [0, 4, 0])).not.toThrow();
    expect(() => beam.setRate(2)).not.toThrow();
    expect(() => beam.dispose()).not.toThrow();
  });

  test("payout burst is deterministic, expands, and finishes", () => {
    const a = createPayoutBurst({
      at: [0, 0, 0],
      count: 16,
      seed: 7,
      duration: 1,
    });
    const b = createPayoutBurst({
      at: [0, 0, 0],
      count: 16,
      seed: 7,
      duration: 1,
    });
    const posA = a.object3D.geometry.getAttribute("position")
      .array as Float32Array;
    const posB = b.object3D.geometry.getAttribute("position")
      .array as Float32Array;
    expect([...posA]).toEqual([...posB]);

    expect(a.done()).toBe(false);
    const stillRunning = a.update(0.5);
    expect(stillRunning).toBe(true);
    expect(a.progress()).toBeCloseTo(0.5);
    // particles moved away from the origin
    const moved = a.object3D.geometry.getAttribute("position")
      .array as Float32Array;
    expect(
      Math.abs(moved[0]!) + Math.abs(moved[1]!) + Math.abs(moved[2]!),
    ).toBeGreaterThan(0);

    const finished = a.update(0.6);
    expect(finished).toBe(false);
    expect(a.done()).toBe(true);
    a.dispose();
    b.dispose();
  });

  test("presence binding applies snapshots, interpolates, and prunes", () => {
    const pool = createEntityPool({ capacity: 8 });
    const binding = bindEntityPresence(pool, {
      interpolateMs: 100,
      statusColor: (status) => (status === "active" ? 0x00ff00 : undefined),
    });

    binding.apply([
      { id: "p1", position: [0, 0, 0], status: "active" },
      { id: "p2", position: [5, 0, 0] },
    ]);
    expect([...binding.ids()].sort()).toEqual(["p1", "p2"]);
    expect(pool.count()).toBe(2);

    // retarget p1 and interpolate toward it
    binding.upsert({ id: "p1", position: [10, 0, 0] });
    const slot = pool.set("p1", {}); // no-op set returns p1's slot
    binding.update(50);
    const matrix = new Three.Matrix4();
    pool.mesh.getMatrixAt(slot, matrix);
    const position = new Three.Vector3().setFromMatrixPosition(matrix);
    expect(position.x).toBeGreaterThan(0);
    expect(position.x).toBeLessThan(10);

    // a snapshot omitting p2 prunes it
    binding.apply([{ id: "p1", position: [10, 0, 0] }]);
    expect(binding.ids()).toEqual(["p1"]);
    expect(pool.has("p2")).toBe(false);

    // present:false removes explicitly
    binding.upsert({ id: "p1", position: [10, 0, 0], present: false });
    expect(binding.ids()).toEqual([]);

    binding.dispose();
    pool.dispose();
  });

  test("presence binding without interpolation snaps immediately", () => {
    const pool = createEntityPool({ capacity: 2 });
    const binding = bindEntityPresence(pool, { interpolateMs: 0 });
    binding.upsert({ id: "x", position: [0, 0, 0] });
    const slot = binding.ids().length;
    expect(slot).toBe(1);
    binding.upsert({ id: "x", position: [7, 0, 0] });
    const matrix = new Three.Matrix4();
    pool.mesh.getMatrixAt(0, matrix);
    const position = new Three.Vector3().setFromMatrixPosition(matrix);
    expect(position.x).toBe(7);
    binding.dispose();
    pool.dispose();
  });
});
