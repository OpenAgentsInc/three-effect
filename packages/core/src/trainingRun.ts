import { Data, Effect } from "effect";
import * as Three from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { createEntityPool } from "./entityPoolPrimitives";
import { createFlowBeam, createPayoutBurst } from "./flowEffectPrimitives";
import {
  createManagedFrameClock,
  type ManagedFrameClockFrame,
} from "./frameClockPrimitives";
import {
  createMmoEntityTransformInterpolator,
  normalizeMmoEntityTransformSnapshot,
  type MmoEntityInterpolationOptions,
  type MmoEntityTransformInput,
  type MmoEntityTransformInterpolator,
} from "./mmoEntityPrimitives";
import {
  createThreePlayerController,
  createWasdMouseLookController,
  type ThreePlayerControllerAvatarAction,
  type ThreePlayerControllerHandle,
  type ThreePlayerControllerOptions,
  type WasdMouseLookControllerHandle,
  type WasdMouseLookControllerOptions,
} from "./playerControllerPrimitives";
import { bindEntityPresence } from "./presenceBindingPrimitives";
import {
  addScopedEventListener,
  createSceneResourceScope,
  type SceneResourceScope,
} from "./resourceScopePrimitives";
import {
  createSceneNodeReconciler,
  type SceneNodeDescriptor,
} from "./sceneNodeReconcilerPrimitives";
import {
  HitTargetRegistry,
  raycastHitTargetRegistry,
} from "./spatialPrimitives";
import { createTextLabel, type TextLabelHandle } from "./textLabelPrimitives";

export const defaultThreePlayerAvatarModelUrl = new URL(
  "./assets/three-player-controller/UEPerson.glb",
  import.meta.url,
).href;

export const defaultThreePlayerAvatarAnimationClips = {
  idle: "idle",
  jumpEnd: "jumpEnd",
  jumpLoop: "jumpLoop",
  jumpStart: "jumpStart",
  run: "run",
  walk: "walk",
} as const;

type ThreePlayerAvatarClipKey =
  keyof typeof defaultThreePlayerAvatarAnimationClips;

type ThreePlayerAvatarAnimationHandle = Readonly<{
  group: Three.Group;
  playAction: (action: "idle" | "jump" | "run" | "walk") => void;
  update: (delta: number) => void;
}>;

type AvatarFadeMaterial = Readonly<{
  depthWrite: boolean;
  material: Three.Material;
  opacity: number;
  transparent: boolean;
}>;

export class TrainingRunMountError extends Data.TaggedError(
  "TrainingRunMountError",
)<{
  readonly reason: string;
}> {}

export type TrainingRunVector = readonly [number, number, number];

export type TrainingRunNodeRole =
  | "lifecycle"
  | "run"
  | "proof"
  | "receipt"
  | "rung";

export type TrainingRunNodeStatus =
  | "planned"
  | "queued"
  | "sync"
  | "active"
  | "sealed"
  | "verified"
  | "blocked";

export type TrainingRunNodeDefinition = Readonly<{
  id: string;
  label: string;
  detail: string;
  role: TrainingRunNodeRole;
  status: TrainingRunNodeStatus;
  position: TrainingRunVector;
  connectedTo?: readonly string[];
}>;

export type TrainingRunNodeSelection = Pick<
  TrainingRunNodeDefinition,
  "detail" | "id" | "label" | "role" | "status"
>;

export type TrainingRunEdgeDefinition = Readonly<{
  sourceId: string;
  targetId: string;
  source: TrainingRunVector;
  target: TrainingRunVector;
}>;

export type TrainingRunContributorDefinition = Readonly<{
  id: string;
  label: string;
  lifecycleState: string;
  phase: number;
}>;

export type TrainingRunLifecycleState =
  | "registered"
  | "qualified"
  | "state_synced"
  | "warmup"
  | "active"
  | "sync_reentry";

export type TrainingRunLifecycleCounts = Partial<
  Record<TrainingRunLifecycleState, number>
>;

export type TrainingRunLossPoint = Readonly<{
  step: number;
  validationLoss: number;
}>;

export type TrainingRunPromiseSignalState =
  | "degraded"
  | "green"
  | "planned"
  | "red"
  | "unknown"
  | "withdrawn"
  | "yellow";

export type TrainingRunPromiseSignalDefinition = Readonly<{
  id: string;
  label: string;
  state: TrainingRunPromiseSignalState;
  blockerCount: number;
  evidenceRefCount: number;
}>;

export type TrainingRunOperatorSignalState =
  | "error"
  | "idle"
  | "info"
  | "success";

export type TrainingRunOperatorSignalDefinition = Readonly<{
  id: string;
  label: string;
  state: TrainingRunOperatorSignalState;
  detail: string;
}>;

export type TrainingRunEntityDefinition = Readonly<{
  id: string;
  status: string;
  label?: string;
  position?: TrainingRunVector;
}>;

export type TrainingRunArtifactKind =
  | "activity_beacon"
  | "blocked_gate"
  | "proof_shard"
  | "receipt_slab"
  | "settlement_vault";

export type TrainingRunMotionKind =
  | "presence"
  | "assignment"
  | "trace_submitted"
  | "replay_verified"
  | "replay_rejected"
  | "settlement_recorded"
  | "real_bitcoin_moved"
  | "corpus_accepted"
  | "counter_changed"
  | (string & {});

export type TrainingRunMotionEvidence = Readonly<{
  /** Stable identifier for the motion instance. */
  motionId?: string;
  /** Public meaning of the motion; e.g. replay_verified or real_bitcoin_moved. */
  motionKind?: TrainingRunMotionKind;
  /** Public refs that authorize this motion. Required in strict live scenes. */
  sourceRefs?: readonly string[];
  /** Projection timestamp used to derive the motion. */
  generatedAt?: string;
  /** Optional stale/expiry boundary for liveness-style motion. */
  expiresAt?: string;
  /** True only for explicitly labelled simulation evidence. */
  simulated?: boolean;
}>;

export type TrainingRunBeamDefinition = Readonly<
  TrainingRunMotionEvidence & {
    fromId: string;
    toId: string;
  }
>;

export type TrainingRunBurstDefinition = Readonly<
  TrainingRunMotionEvidence & {
    atId: string;
  }
>;

export type TrainingRunStructuralEdgeMotion = "static" | "animated";

export type TrainingRunMotionEvidenceMode = "optional" | "required";

export type TrainingRunBurstPlayback = "once" | "loop";

export type TrainingRunMotionPolicy = Readonly<{
  /** Base graph edge motion. Live pages should keep this static. */
  structuralEdges?: TrainingRunStructuralEdgeMotion;
  /** Ambient orbit/ring rotation. Live pages should keep this static. */
  ambient?: TrainingRunStructuralEdgeMotion;
  /** Require sourceRefs before rendering animated beams or bursts. */
  evidence?: TrainingRunMotionEvidenceMode;
  /** One-shot event burst by default; demos may opt into looping. */
  bursts?: TrainingRunBurstPlayback;
}>;

export type TrainingRunStageNodeGlyph = "orb" | "compact_gate";

export type TrainingRunSceneChromeVisibility = "visible" | "hidden";

export type TrainingRunLossPanelVisibility =
  | TrainingRunSceneChromeVisibility
  | "auto";

export type TrainingRunSceneChrome = Readonly<{
  contributorOrbit?: TrainingRunSceneChromeVisibility;
  lossPanel?: TrainingRunLossPanelVisibility;
  staleRing?: TrainingRunSceneChromeVisibility;
  statusChart?: TrainingRunSceneChromeVisibility;
}>;

export type TrainingRunWorldLabelDensity = "full" | "compact" | "pylons";

export type TrainingRunCameraMode = "orthographic_map" | "perspective_walk";

export type TrainingRunControllerMode =
  | "none"
  | "third_person_character"
  | "wasd_mouselook";

export type TrainingRunPointerClickIntent = "lock" | "none" | "select";

export type TrainingRunPointerClickDecisionInput = Readonly<{
  button: number;
  pointerLocked: boolean;
  selection?: TrainingRunNodeSelection | undefined;
  walkControllerEnabled: boolean;
}>;

export type TrainingRunKeyboardTargetingAction = "next" | "previous";

export type TrainingRunKeyboardTargetingBinding = Readonly<{
  code?: string;
  key?: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}>;

export type TrainingRunKeyboardTargetingBindingMap = Readonly<
  Partial<
    Record<
      TrainingRunKeyboardTargetingAction,
      readonly TrainingRunKeyboardTargetingBinding[]
    >
  >
>;

export type TrainingRunKeyboardTargeting = Readonly<{
  enabled?: boolean;
  maxTargets?: number;
  bindings?: TrainingRunKeyboardTargetingBindingMap;
}>;

export type ResolvedTrainingRunKeyboardTargeting = Readonly<{
  enabled: boolean;
  maxTargets: number;
  bindings: Readonly<
    Record<
      TrainingRunKeyboardTargetingAction,
      readonly TrainingRunKeyboardTargetingBinding[]
    >
  >;
}>;

export type TrainingRunPresenceZone = "tassadar_area";

export type TrainingRunEntitySelection = Pick<
  TrainingRunEntityDefinition,
  "id" | "label" | "position" | "status"
>;

export type TrainingRunRemoteAvatarAnimation = Extract<
  ThreePlayerControllerAvatarAction,
  "idle" | "run" | "walk"
>;

export type TrainingRunRemoteAvatarLabelVisibility =
  | "auto"
  | "hidden"
  | "visible";

export type TrainingRunRemoteAvatarDefinition = Readonly<{
  id: string;
  label: string;
  position: TrainingRunVector;
  yaw?: number;
  animation?: TrainingRunRemoteAvatarAnimation;
  updatedAtMs?: number;
  stale?: boolean;
  color?: string;
  avatarKind?: string;
  actorRef?: string;
  modelUrl?: string;
  labelVisibility?: TrainingRunRemoteAvatarLabelVisibility;
}>;

export type TrainingRunWorldItemKind = "bulletin_board";

export type TrainingRunWorldItemDefinition = Readonly<{
  id: string;
  kind: TrainingRunWorldItemKind;
  label: string;
  detail: string;
  position: TrainingRunVector;
  yaw?: number;
  status?: TrainingRunNodeStatus;
  interactionRadius?: number;
  title?: string;
  lines?: readonly string[];
  sourceRefs?: readonly string[];
}>;

export type TrainingRunWorldItemSelection = Readonly<{
  detail: string;
  id: string;
  kind: TrainingRunWorldItemKind;
  label: string;
  status: TrainingRunNodeStatus;
  sourceRefs: readonly string[];
}>;

export type TrainingRunVisualizationOptions = Readonly<{
  backgroundColor?: number;
  cameraMode?: TrainingRunCameraMode;
  controller?: TrainingRunControllerMode;
  pixelRatio?: number;
  maxAllowedStaleSteps?: number;
  nodes?: readonly TrainingRunNodeDefinition[];
  contributors?: readonly TrainingRunContributorDefinition[];
  lossCurve?: readonly TrainingRunLossPoint[];
  operatorSignals?: readonly TrainingRunOperatorSignalDefinition[];
  promiseSignals?: readonly TrainingRunPromiseSignalDefinition[];
  entities?: readonly TrainingRunEntityDefinition[];
  worldItems?: readonly TrainingRunWorldItemDefinition[];
  remoteAvatars?: readonly TrainingRunRemoteAvatarDefinition[];
  remoteAvatarInterpolation?: MmoEntityInterpolationOptions;
  beams?: readonly TrainingRunBeamDefinition[];
  bursts?: readonly TrainingRunBurstDefinition[];
  motionPolicy?: TrainingRunMotionPolicy;
  /** Draw aggregate non-run stage nodes as compact gates instead of record orbs. */
  stageNodeGlyph?: TrainingRunStageNodeGlyph;
  /** Toggle auxiliary analytical chrome around the primary scene nodes. */
  sceneChrome?: TrainingRunSceneChrome;
  /** Control how much text is drawn into the world itself. */
  worldLabelDensity?: TrainingRunWorldLabelDensity;
  /** Let Tab cycle through nearby in-world nodes/entities instead of HTML focus. */
  keyboardTargeting?: TrainingRunKeyboardTargeting;
  thirdPersonController?: ThreePlayerControllerOptions;
  walkController?: WasdMouseLookControllerOptions;
  onNodeClick?: (node: TrainingRunNodeSelection) => void;
  onWorldItemProximityChange?: (
    item: TrainingRunWorldItemSelection | null,
  ) => void;
  onPresenceZoneChange?: (zone: TrainingRunPresenceZone | null) => void;
  onLocalPoseChange?: (pose: TrainingRunLocalPoseUpdate) => void;
  pulseSpeed?: number;
}>;

export type TrainingRunVisualizationSnapshot = Readonly<{
  activeWindowCount?: number;
  assignedContributorCount?: number;
  deviceObserved?: number;
  deviceRequired?: number;
  externalStatus?: string;
  finalValidationLoss?: number | null;
  freivaldsRefCount?: number;
  gradientCloseoutRefCount?: number;
  lifecycleCounts?: TrainingRunLifecycleCounts;
  lossUnderBudget?: boolean;
  maxAllowedStaleSteps?: number;
  maxValidationLoss?: number | null;
  blockerRefCount?: number;
  closeoutSatisfied?: boolean;
  pendingPayoutCount?: number;
  plannedWindowCount?: number;
  operatorSignals?: readonly TrainingRunOperatorSignalDefinition[];
  promiseBlockerRefCount?: number;
  promiseDegradedCount?: number;
  promiseEvidenceRefCount?: number;
  promiseGreenCount?: number;
  promisePlannedCount?: number;
  promiseRedCount?: number;
  promiseSignals?: readonly TrainingRunPromiseSignalDefinition[];
  promiseUnknownCount?: number;
  promiseWithdrawnCount?: number;
  promiseYellowCount?: number;
  receiptRefCount?: number;
  reconciledWindowCount?: number;
  rejectedWorkCount?: number;
  runDetail?: string;
  runLabel?: string;
  runState?: "planned" | "active" | "sealed" | "reconciled" | string;
  sealInFlight?: boolean;
  sealedWindowCount?: number;
  settledPayoutSats?: number;
  verifiedWorkCount?: number;
}>;

export type TrainingRunLocalPoseSnapshot = Readonly<{
  controller: Extract<
    TrainingRunControllerMode,
    "third_person_character" | "wasd_mouselook"
  >;
  position: TrainingRunVector;
  yaw?: number;
  action?: ThreePlayerControllerAvatarAction;
  capturedAtMs?: number;
}>;

export type TrainingRunLocalPoseUpdate = Readonly<{
  controller: Extract<
    TrainingRunControllerMode,
    "third_person_character" | "wasd_mouselook"
  >;
  position: TrainingRunVector;
  yaw: number;
  action: ThreePlayerControllerAvatarAction;
  capturedAtMs: number;
}>;

export type ResolvedTrainingRunVisualizationOptions = Readonly<{
  backgroundColor: number;
  cameraMode: TrainingRunCameraMode;
  controller: TrainingRunControllerMode;
  pixelRatio: number;
  maxAllowedStaleSteps: number;
  nodes: readonly TrainingRunNodeDefinition[];
  contributors: readonly TrainingRunContributorDefinition[];
  lossCurve: readonly TrainingRunLossPoint[];
  operatorSignals: readonly TrainingRunOperatorSignalDefinition[];
  promiseSignals: readonly TrainingRunPromiseSignalDefinition[];
  entities: readonly TrainingRunEntityDefinition[];
  worldItems: readonly TrainingRunWorldItemDefinition[];
  remoteAvatars: readonly TrainingRunRemoteAvatarDefinition[];
  remoteAvatarInterpolation: MmoEntityInterpolationOptions;
  beams: readonly TrainingRunBeamDefinition[];
  bursts: readonly TrainingRunBurstDefinition[];
  motionPolicy: Required<TrainingRunMotionPolicy>;
  stageNodeGlyph: TrainingRunStageNodeGlyph;
  sceneChrome: Required<TrainingRunSceneChrome>;
  worldLabelDensity: TrainingRunWorldLabelDensity;
  keyboardTargeting: ResolvedTrainingRunKeyboardTargeting;
  thirdPersonController: ThreePlayerControllerOptions;
  walkController: WasdMouseLookControllerOptions;
  onNodeClick?: (node: TrainingRunNodeSelection) => void;
  onWorldItemProximityChange?: (
    item: TrainingRunWorldItemSelection | null,
  ) => void;
  onPresenceZoneChange?: (zone: TrainingRunPresenceZone | null) => void;
  onLocalPoseChange?: (pose: TrainingRunLocalPoseUpdate) => void;
  pulseSpeed: number;
}>;

export type TrainingRunVisualizationHandle = Readonly<{
  element: HTMLElement;
  canvas: HTMLCanvasElement;
  captureLocalPose: () => TrainingRunLocalPoseSnapshot | undefined;
  updateVisualization: (options: TrainingRunVisualizationOptions) => boolean;
  updateRemoteAvatars: (
    avatars: readonly TrainingRunRemoteAvatarDefinition[],
  ) => void;
  selectNextTarget: (direction?: 1 | -1) => TrainingRunNodeSelection | undefined;
  resize: Effect.Effect<void>;
  dispose: Effect.Effect<void>;
}>;

export const defaultTrainingRunNodes: readonly TrainingRunNodeDefinition[] = [
  {
    id: "registered",
    label: "registered",
    detail: "presence recorded",
    role: "lifecycle",
    status: "queued",
    position: [-4.3, 2.05, 0],
    connectedTo: ["qualified"],
  },
  {
    id: "qualified",
    label: "qualified",
    detail: "device gate",
    role: "lifecycle",
    status: "sync",
    position: [-2.85, 2.55, 0],
    connectedTo: ["state_synced"],
  },
  {
    id: "state_synced",
    label: "state synced",
    detail: "last durable seal",
    role: "lifecycle",
    status: "sync",
    position: [-1.28, 2.45, 0],
    connectedTo: ["warmup"],
  },
  {
    id: "warmup",
    label: "warmup",
    detail: "shadow window",
    role: "lifecycle",
    status: "sync",
    position: [0.35, 2.0, 0],
    connectedTo: ["active"],
  },
  {
    id: "active",
    label: "active",
    detail: "merged work",
    role: "lifecycle",
    status: "active",
    position: [1.9, 2.45, 0],
    connectedTo: ["sealed_window"],
  },
  {
    id: "sync_reentry",
    label: "sync reentry",
    detail: "stale > bound",
    role: "lifecycle",
    status: "blocked",
    position: [3.52, 2.0, 0],
    connectedTo: ["state_synced"],
  },
  {
    id: "run",
    label: "Tassadar / Psion",
    detail: "training authority",
    role: "run",
    status: "active",
    position: [-0.15, 0.28, 0],
    connectedTo: ["registered", "training_window", "r1", "r2"],
  },
  {
    id: "training_window",
    label: "window",
    detail: "planned -> active",
    role: "proof",
    status: "active",
    position: [-3.75, -1.55, 0],
    connectedTo: ["sealed_window"],
  },
  {
    id: "sealed_window",
    label: "seal",
    detail: "checkpoint digest",
    role: "proof",
    status: "sealed",
    position: [-1.95, -2.1, 0],
    connectedTo: ["freivalds"],
  },
  {
    id: "freivalds",
    label: "Freivalds",
    detail: "verified challenge",
    role: "proof",
    status: "verified",
    position: [-0.1, -2.0, 0],
    connectedTo: ["receipt"],
  },
  {
    id: "receipt",
    label: "receipt",
    detail: "accepted work",
    role: "receipt",
    status: "verified",
    position: [1.75, -2.1, 0],
    connectedTo: ["settlement"],
  },
  {
    id: "settlement",
    label: "settlement",
    detail: "provider confirmed",
    role: "receipt",
    status: "planned",
    position: [3.55, -1.55, 0],
  },
  {
    id: "r1",
    label: "R1",
    detail: "operator rehearsal",
    role: "rung",
    status: "sealed",
    position: [-4.25, 0.25, 0],
    connectedTo: ["r2"],
  },
  {
    id: "r2",
    label: "R2",
    detail: "contributor rung",
    role: "rung",
    status: "planned",
    position: [4.0, 0.25, 0],
  },
];

export const defaultTrainingRunContributors: readonly TrainingRunContributorDefinition[] =
  [
    {
      id: "pylon.operator.mac",
      label: "M1",
      lifecycleState: "active",
      phase: 0,
    },
    {
      id: "pylon.operator.cuda",
      label: "4080",
      lifecycleState: "warmup",
      phase: 0.19,
    },
    {
      id: "pylon.joiner.a",
      label: "A",
      lifecycleState: "state_synced",
      phase: 0.38,
    },
    {
      id: "pylon.joiner.b",
      label: "B",
      lifecycleState: "qualified",
      phase: 0.58,
    },
    {
      id: "pylon.stale",
      label: "stale",
      lifecycleState: "sync_reentry",
      phase: 0.78,
    },
  ];

export const defaultTrainingRunLossCurve: readonly TrainingRunLossPoint[] = [
  { step: 0, validationLoss: 4.8 },
  { step: 80, validationLoss: 4.14 },
  { step: 160, validationLoss: 3.78 },
  { step: 240, validationLoss: 3.42 },
  { step: 320, validationLoss: 3.2 },
  { step: 400, validationLoss: 3.06 },
];

export const defaultTrainingRunPromiseSignals: readonly TrainingRunPromiseSignalDefinition[] =
  [];

export const defaultTrainingRunOperatorSignals: readonly TrainingRunOperatorSignalDefinition[] =
  [];

export const pmndrsTrainingDatavizSourceRefs = [
  "projects/repos/examples/demos/bezier-curves-and-nodes/src/Nodes.jsx",
  "projects/repos/examples/demos/react-ellipsecurve/src/App.jsx",
  "projects/repos/examples/demos/scrollcontrols-with-minimap/src/App.jsx",
  "projects/repos/examples/demos/svg-maps-with-html-annotations/src/index.jsx",
  "projects/repos/examples/demos/canvas-text/src/App.jsx",
] as const;

export const defaultTrainingRunVisualizationOptions: ResolvedTrainingRunVisualizationOptions =
  {
    backgroundColor: 0x050505,
    cameraMode: "orthographic_map",
    controller: "none",
    pixelRatio: 2,
    maxAllowedStaleSteps: 5,
    nodes: defaultTrainingRunNodes,
    contributors: defaultTrainingRunContributors,
    lossCurve: defaultTrainingRunLossCurve,
    operatorSignals: defaultTrainingRunOperatorSignals,
    promiseSignals: defaultTrainingRunPromiseSignals,
    entities: [],
    worldItems: [],
    remoteAvatars: [],
    remoteAvatarInterpolation: {
      despawnAfterMs: 12_000,
      interpolateMs: 180,
      staleAfterMs: 6_000,
    },
    beams: [],
    bursts: [],
    motionPolicy: {
      ambient: "static",
      bursts: "once",
      evidence: "optional",
      structuralEdges: "static",
    },
    stageNodeGlyph: "orb",
    sceneChrome: {
      contributorOrbit: "visible",
      lossPanel: "visible",
      staleRing: "visible",
      statusChart: "visible",
    },
    worldLabelDensity: "full",
    keyboardTargeting: {
      enabled: false,
      maxTargets: 24,
      bindings: {
        next: [{ key: "Tab", shiftKey: false }],
        previous: [{ key: "Tab", shiftKey: true }],
      },
    },
    thirdPersonController: {},
    walkController: {},
    pulseSpeed: 0.17,
  };

const resolveTrainingRunMotionPolicy = (
  policy: TrainingRunMotionPolicy | undefined,
): Required<TrainingRunMotionPolicy> => ({
  ...defaultTrainingRunVisualizationOptions.motionPolicy,
  ...(policy ?? {}),
});

const resolveTrainingRunSceneChrome = (
  chrome: TrainingRunSceneChrome | undefined,
): Required<TrainingRunSceneChrome> => ({
  ...defaultTrainingRunVisualizationOptions.sceneChrome,
  ...(chrome ?? {}),
});

const resolveTrainingRunKeyboardTargeting = (
  targeting: TrainingRunKeyboardTargeting | undefined,
): ResolvedTrainingRunKeyboardTargeting => {
  const defaults = defaultTrainingRunVisualizationOptions.keyboardTargeting;
  return {
    ...defaults,
    ...(targeting ?? {}),
    bindings: {
      next: targeting?.bindings?.next ?? defaults.bindings.next,
      previous: targeting?.bindings?.previous ?? defaults.bindings.previous,
    },
  };
};

const trainingRunKeyboardTargetingBindingMatchesEvent = (
  binding: TrainingRunKeyboardTargetingBinding,
  event: KeyboardEvent,
): boolean => {
  const hasPrimaryMatch =
    (binding.code !== undefined && binding.code === event.code) ||
    (binding.key !== undefined && binding.key === event.key);
  if (!hasPrimaryMatch) return false;
  if (binding.altKey !== undefined && binding.altKey !== event.altKey) {
    return false;
  }
  if (binding.ctrlKey !== undefined && binding.ctrlKey !== event.ctrlKey) {
    return false;
  }
  if (binding.metaKey !== undefined && binding.metaKey !== event.metaKey) {
    return false;
  }
  if (binding.shiftKey !== undefined && binding.shiftKey !== event.shiftKey) {
    return false;
  }
  return true;
};

export const trainingRunKeyboardTargetingDirectionFromEvent = (
  event: KeyboardEvent,
  targeting: ResolvedTrainingRunKeyboardTargeting,
): 1 | -1 | undefined => {
  if (!targeting.enabled) return undefined;
  if (
    targeting.bindings.previous.some((binding) =>
      trainingRunKeyboardTargetingBindingMatchesEvent(binding, event),
    )
  ) {
    return -1;
  }
  if (
    targeting.bindings.next.some((binding) =>
      trainingRunKeyboardTargetingBindingMatchesEvent(binding, event),
    )
  ) {
    return 1;
  }
  return undefined;
};

export const resolveTrainingRunVisualizationOptions = (
  options: TrainingRunVisualizationOptions = {},
): ResolvedTrainingRunVisualizationOptions => {
  const resolved = {
    ...defaultTrainingRunVisualizationOptions,
    ...options,
    nodes: options.nodes ?? defaultTrainingRunVisualizationOptions.nodes,
    contributors:
      options.contributors ??
      defaultTrainingRunVisualizationOptions.contributors,
    lossCurve:
      options.lossCurve ?? defaultTrainingRunVisualizationOptions.lossCurve,
    operatorSignals:
      options.operatorSignals ??
      defaultTrainingRunVisualizationOptions.operatorSignals,
    promiseSignals:
      options.promiseSignals ??
      defaultTrainingRunVisualizationOptions.promiseSignals,
    entities:
      options.entities ?? defaultTrainingRunVisualizationOptions.entities,
    worldItems:
      options.worldItems ?? defaultTrainingRunVisualizationOptions.worldItems,
    remoteAvatars:
      options.remoteAvatars ??
      defaultTrainingRunVisualizationOptions.remoteAvatars,
    remoteAvatarInterpolation: {
      ...defaultTrainingRunVisualizationOptions.remoteAvatarInterpolation,
      ...(options.remoteAvatarInterpolation ?? {}),
    },
    beams: options.beams ?? defaultTrainingRunVisualizationOptions.beams,
    bursts: options.bursts ?? defaultTrainingRunVisualizationOptions.bursts,
    motionPolicy: resolveTrainingRunMotionPolicy(options.motionPolicy),
    stageNodeGlyph:
      options.stageNodeGlyph ??
      defaultTrainingRunVisualizationOptions.stageNodeGlyph,
    sceneChrome: resolveTrainingRunSceneChrome(options.sceneChrome),
    worldLabelDensity:
      options.worldLabelDensity ??
      defaultTrainingRunVisualizationOptions.worldLabelDensity,
    keyboardTargeting: resolveTrainingRunKeyboardTargeting(
      options.keyboardTargeting,
    ),
    thirdPersonController: {
      ...defaultTrainingRunVisualizationOptions.thirdPersonController,
      ...(options.thirdPersonController ?? {}),
    },
    walkController: {
      ...defaultTrainingRunVisualizationOptions.walkController,
      ...(options.walkController ?? {}),
    },
  };

  return {
    ...resolved,
    ...(options.onNodeClick === undefined
      ? {}
      : { onNodeClick: options.onNodeClick }),
    ...(options.onWorldItemProximityChange === undefined
      ? {}
      : { onWorldItemProximityChange: options.onWorldItemProximityChange }),
    ...(options.onPresenceZoneChange === undefined
      ? {}
      : { onPresenceZoneChange: options.onPresenceZoneChange }),
    ...(options.onLocalPoseChange === undefined
      ? {}
      : { onLocalPoseChange: options.onLocalPoseChange }),
  };
};

export const trainingRunVisualizationOptionsWithLocalPose = (
  options: TrainingRunVisualizationOptions,
  pose: TrainingRunLocalPoseSnapshot | undefined,
): TrainingRunVisualizationOptions => {
  if (pose === undefined || options.controller !== pose.controller) {
    return options;
  }

  if (pose.controller === "third_person_character") {
    return {
      ...options,
      thirdPersonController: {
        ...(options.thirdPersonController ?? {}),
        initialPosition: pose.position,
      },
    };
  }

  return {
    ...options,
    walkController: {
      ...(options.walkController ?? {}),
      initialPosition: pose.position,
    },
  };
};

const withoutInitialPose = (value: unknown): unknown => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return value;
  }
  const copy: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  delete copy["initialPosition"];
  return copy;
};

const structuralJsonReplacer = (_key: string, value: unknown): unknown =>
  typeof value === "function" ? "[function]" : value;

export const trainingRunVisualizationRetainedStructuralSignature = (
  options: TrainingRunVisualizationOptions = {},
): string => {
  const resolved = resolveTrainingRunVisualizationOptions(options);
  return JSON.stringify(
    {
      backgroundColor: resolved.backgroundColor,
      cameraMode: resolved.cameraMode,
      controller: resolved.controller,
      pixelRatio: resolved.pixelRatio,
      motionPolicy: resolved.motionPolicy,
      stageNodeGlyph: resolved.stageNodeGlyph,
      sceneChrome: resolved.sceneChrome,
      worldLabelDensity: resolved.worldLabelDensity,
      keyboardTargeting: resolved.keyboardTargeting,
      remoteAvatarInterpolation: resolved.remoteAvatarInterpolation,
      thirdPersonController: withoutInitialPose(
        resolved.thirdPersonController,
      ),
      walkController: withoutInitialPose(resolved.walkController),
    },
    structuralJsonReplacer,
  );
};

export const canRetainTrainingRunVisualization = (
  current: TrainingRunVisualizationOptions,
  next: TrainingRunVisualizationOptions,
): boolean =>
  trainingRunVisualizationRetainedStructuralSignature(current) ===
  trainingRunVisualizationRetainedStructuralSignature(next);

export const trainingRunPointerClickIntent = ({
  button,
  pointerLocked,
  selection,
  walkControllerEnabled,
}: TrainingRunPointerClickDecisionInput): TrainingRunPointerClickIntent => {
  if (button !== 0) return "none";
  if (selection !== undefined) return "select";
  return walkControllerEnabled && !pointerLocked ? "lock" : "none";
};

export const trainingRunWorldLabelVisibleForSelection = (
  selection: Pick<TrainingRunNodeSelection, "id" | "label">,
  density: TrainingRunWorldLabelDensity,
): boolean => {
  if (density === "full" || density === "compact") return true;
  const id = selection.id.toLowerCase();
  const label = selection.label.toLowerCase();
  return trainingRunSelectionIsPylon({ id, label });
};

export const trainingRunSelectionIsPylon = (
  selection: Pick<TrainingRunNodeSelection, "id" | "label">,
): boolean => {
  const id = selection.id.toLowerCase();
  const label = selection.label.toLowerCase();
  return (
    id.startsWith("pylon.") ||
    id.startsWith("pylon:") ||
    label.includes("pylon")
  );
};

const finiteNonNegative = (value: number | undefined): number =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;

const runStatusFromSnapshot = (
  state: TrainingRunVisualizationSnapshot["runState"],
): TrainingRunNodeStatus => {
  switch (state) {
    case "active":
      return "active";
    case "sealed":
      return "sealed";
    case "reconciled":
      return "verified";
    case "planned":
      return "planned";
    default:
      return "planned";
  }
};

const nodeWith = (
  id: string,
  next: Partial<TrainingRunNodeDefinition>,
): TrainingRunNodeDefinition => {
  const base = defaultTrainingRunNodes.find((node) => node.id === id);
  if (base === undefined) {
    throw new Error(`unknown training node ${id}`);
  }
  return { ...base, ...next };
};

const contributorDefinitionsFromSnapshot = (
  snapshot: TrainingRunVisualizationSnapshot,
): readonly TrainingRunContributorDefinition[] => {
  const lifecycleContributors = contributorDefinitionsFromLifecycleCounts(
    snapshot.lifecycleCounts,
  );
  if (lifecycleContributors.length > 0) return lifecycleContributors;

  const assigned = finiteNonNegative(snapshot.assignedContributorCount);
  const observed = finiteNonNegative(snapshot.deviceObserved);
  const rejected = finiteNonNegative(snapshot.rejectedWorkCount);
  const count = Math.max(
    1,
    Math.min(12, Math.ceil(Math.max(assigned, observed))),
  );
  const contributors: TrainingRunContributorDefinition[] = [];

  for (let index = 0; index < count; index += 1) {
    const active = index < observed;
    contributors.push({
      id: `pylon.${index + 1}`,
      label: active ? `P${index + 1}` : `W${index + 1}`,
      lifecycleState: active
        ? "active"
        : index % 2 === 0
          ? "warmup"
          : "qualified",
      phase: index / count,
    });
  }

  if (rejected > 0 || snapshot.externalStatus === "blocked_external") {
    contributors.push({
      id: "pylon.sync_reentry",
      label: "stale",
      lifecycleState: "sync_reentry",
      phase: 0.78,
    });
  }

  return contributors;
};

const lifecycleStateOrder: readonly TrainingRunLifecycleState[] = [
  "registered",
  "qualified",
  "state_synced",
  "warmup",
  "active",
  "sync_reentry",
];

const lifecycleStateShortLabel: Readonly<
  Record<TrainingRunLifecycleState, string>
> = {
  active: "A",
  qualified: "Q",
  registered: "R",
  state_synced: "S",
  sync_reentry: "stale",
  warmup: "W",
};

const contributorDefinitionsFromLifecycleCounts = (
  counts: TrainingRunLifecycleCounts | undefined,
): readonly TrainingRunContributorDefinition[] => {
  if (counts === undefined) return [];

  const contributors: Array<Omit<TrainingRunContributorDefinition, "phase">> =
    [];
  for (const state of lifecycleStateOrder) {
    const count = finiteNonNegative(counts[state]);
    for (let index = 0; index < count && contributors.length < 14; index += 1) {
      const prefix = lifecycleStateShortLabel[state];
      contributors.push({
        id: `pylon.${state}.${index + 1}`,
        label: state === "sync_reentry" ? prefix : `${prefix}${index + 1}`,
        lifecycleState: state,
      });
    }
  }

  const divisor = Math.max(contributors.length, 1);
  return contributors.map((contributor, index) => ({
    ...contributor,
    phase: index / divisor,
  }));
};

const lossCurveFromSnapshot = (
  snapshot: TrainingRunVisualizationSnapshot,
): readonly TrainingRunLossPoint[] => {
  const finalLoss = snapshot.finalValidationLoss;
  const maxLoss = snapshot.maxValidationLoss;
  if (
    typeof finalLoss !== "number" ||
    typeof maxLoss !== "number" ||
    !Number.isFinite(finalLoss) ||
    !Number.isFinite(maxLoss)
  ) {
    return defaultTrainingRunLossCurve;
  }

  const start = Math.max(maxLoss * 1.2, finalLoss * 1.35, 0.01);
  const midpoint = (start + finalLoss) / 2;
  return [
    { step: 0, validationLoss: start },
    { step: 120, validationLoss: midpoint },
    { step: 240, validationLoss: finalLoss },
  ];
};

const promiseSignalsFromSnapshot = (
  snapshot: TrainingRunVisualizationSnapshot,
): readonly TrainingRunPromiseSignalDefinition[] => {
  if (snapshot.promiseSignals !== undefined) return snapshot.promiseSignals;

  const signals: TrainingRunPromiseSignalDefinition[] = [];
  const pushIfPresent = (
    id: string,
    label: string,
    state: TrainingRunPromiseSignalState,
    count: number,
  ) => {
    if (count <= 0) return;
    signals.push({
      blockerCount:
        state === "red" || state === "degraded" || state === "withdrawn"
          ? finiteNonNegative(snapshot.promiseBlockerRefCount)
          : 0,
      evidenceRefCount: finiteNonNegative(snapshot.promiseEvidenceRefCount),
      id,
      label,
      state,
    });
  };

  pushIfPresent(
    "promise.green",
    "green",
    "green",
    finiteNonNegative(snapshot.promiseGreenCount),
  );
  pushIfPresent(
    "promise.yellow",
    "yellow",
    "yellow",
    finiteNonNegative(snapshot.promiseYellowCount),
  );
  pushIfPresent(
    "promise.planned",
    "planned",
    "planned",
    finiteNonNegative(snapshot.promisePlannedCount),
  );
  pushIfPresent(
    "promise.red",
    "red",
    "red",
    finiteNonNegative(snapshot.promiseRedCount),
  );
  pushIfPresent(
    "promise.degraded",
    "degraded",
    "degraded",
    finiteNonNegative(snapshot.promiseDegradedCount),
  );
  pushIfPresent(
    "promise.withdrawn",
    "withdrawn",
    "withdrawn",
    finiteNonNegative(snapshot.promiseWithdrawnCount),
  );
  pushIfPresent(
    "promise.unknown",
    "unknown",
    "unknown",
    finiteNonNegative(snapshot.promiseUnknownCount),
  );

  return signals.slice(0, 7);
};

export const trainingRunVisualizationOptionsFromSnapshot = (
  snapshot: TrainingRunVisualizationSnapshot,
): TrainingRunVisualizationOptions => {
  const activeWindows = finiteNonNegative(snapshot.activeWindowCount);
  const plannedWindows = finiteNonNegative(snapshot.plannedWindowCount);
  const sealedWindows = finiteNonNegative(snapshot.sealedWindowCount);
  const reconciledWindows = finiteNonNegative(snapshot.reconciledWindowCount);
  const verifiedWork = finiteNonNegative(snapshot.verifiedWorkCount);
  const freivaldsRefs = finiteNonNegative(snapshot.freivaldsRefCount);
  const closeoutRefs = finiteNonNegative(snapshot.gradientCloseoutRefCount);
  const receiptRefs = finiteNonNegative(snapshot.receiptRefCount);
  const blockerRefs = finiteNonNegative(snapshot.blockerRefCount);
  const pendingPayouts = finiteNonNegative(snapshot.pendingPayoutCount);
  const settledSats = finiteNonNegative(snapshot.settledPayoutSats);
  const observedDevices = finiteNonNegative(snapshot.deviceObserved);
  const requiredDevices = finiteNonNegative(snapshot.deviceRequired);
  const deviceReady =
    requiredDevices === 0
      ? observedDevices > 0
      : observedDevices >= requiredDevices;
  const externalBlocked = snapshot.externalStatus === "blocked_external";
  const sealInFlight = snapshot.sealInFlight === true;
  const closeoutSatisfied = snapshot.closeoutSatisfied === true;

  const visualization = {
    contributors: contributorDefinitionsFromSnapshot(snapshot),
    lossCurve: lossCurveFromSnapshot(snapshot),
    operatorSignals: snapshot.operatorSignals ?? [],
    promiseSignals: promiseSignalsFromSnapshot(snapshot),
    nodes: [
      nodeWith("registered", {
        detail: `${Math.max(observedDevices, finiteNonNegative(snapshot.assignedContributorCount))} pylons seen`,
        status: observedDevices > 0 ? "active" : "queued",
      }),
      nodeWith("qualified", {
        detail:
          requiredDevices > 0
            ? `${observedDevices}/${requiredDevices} device gate`
            : "device gate",
        status: deviceReady ? "verified" : "sync",
      }),
      nodeWith("state_synced", {
        detail:
          sealedWindows + reconciledWindows > 0
            ? "last seal durable"
            : sealInFlight
              ? "seal barrier"
              : `stale <= ${snapshot.maxAllowedStaleSteps ?? 5}`,
        status:
          sealedWindows + reconciledWindows > 0
            ? "verified"
            : externalBlocked
              ? "blocked"
              : "sync",
      }),
      nodeWith("warmup", {
        detail:
          activeWindows > 0
            ? `${activeWindows} active windows`
            : plannedWindows > 0
              ? `${plannedWindows} planned windows`
              : "shadow window",
        status: activeWindows > 0 ? "active" : "sync",
      }),
      nodeWith("active", {
        detail: `${activeWindows} active windows`,
        status: activeWindows > 0 ? "active" : "planned",
      }),
      nodeWith("sync_reentry", {
        detail:
          blockerRefs > 0
            ? `${blockerRefs} blockers`
            : externalBlocked
              ? "external blocker"
              : "stale > bound",
        status: externalBlocked || blockerRefs > 0 ? "blocked" : "planned",
      }),
      nodeWith("run", {
        label: snapshot.runLabel ?? "Tassadar / Psion",
        detail: snapshot.runDetail ?? "training authority",
        status: runStatusFromSnapshot(snapshot.runState),
      }),
      nodeWith("training_window", {
        label: "windows",
        detail: `${plannedWindows} plan / ${activeWindows} act / ${sealedWindows} seal`,
        status:
          activeWindows > 0
            ? "active"
            : plannedWindows > 0
              ? "queued"
              : reconciledWindows > 0
                ? "verified"
                : "planned",
      }),
      nodeWith("sealed_window", {
        detail: sealInFlight
          ? "seal in flight"
          : `${sealedWindows + reconciledWindows} durable`,
        status:
          sealedWindows + reconciledWindows > 0
            ? "sealed"
            : sealInFlight
              ? "sync"
              : "planned",
      }),
      nodeWith("freivalds", {
        detail: `${freivaldsRefs} refs`,
        status: freivaldsRefs > 0 ? "verified" : "blocked",
      }),
      nodeWith("receipt", {
        detail:
          receiptRefs > 0
            ? `${receiptRefs} receipts`
            : `${verifiedWork} verified`,
        status:
          closeoutSatisfied || (verifiedWork > 0 && closeoutRefs > 0)
            ? "verified"
            : verifiedWork > 0
              ? "sealed"
              : "planned",
      }),
      nodeWith("settlement", {
        detail:
          settledSats > 0
            ? `${settledSats} sats`
            : pendingPayouts > 0
              ? `${pendingPayouts} pending`
              : "provider confirmed",
        status:
          settledSats > 0
            ? "verified"
            : pendingPayouts > 0
              ? "queued"
              : "planned",
      }),
      nodeWith("r1", {
        detail: verifiedWork > 0 ? "evidence observed" : "operator rehearsal",
        status: verifiedWork > 0 ? "verified" : "sealed",
      }),
      nodeWith("r2", {
        detail: deviceReady ? "contributor ready" : "needs devices",
        status: deviceReady ? "active" : "planned",
      }),
    ],
  };

  return snapshot.maxAllowedStaleSteps === undefined
    ? visualization
    : {
        ...visualization,
        maxAllowedStaleSteps: snapshot.maxAllowedStaleSteps,
      };
};

export const createTrainingRunEdges = (
  nodes: readonly TrainingRunNodeDefinition[],
): readonly TrainingRunEdgeDefinition[] => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const edges: TrainingRunEdgeDefinition[] = [];

  for (const node of nodes) {
    for (const targetId of node.connectedTo ?? []) {
      const target = byId.get(targetId);
      if (target === undefined) continue;
      edges.push({
        sourceId: node.id,
        targetId,
        source: node.position,
        target: target.position,
      });
    }
  }

  return edges;
};

export const summarizeTrainingRunVisualization = (
  nodes: readonly TrainingRunNodeDefinition[] = defaultTrainingRunNodes,
): Readonly<Record<TrainingRunNodeRole, number>> => {
  const counts: Record<TrainingRunNodeRole, number> = {
    lifecycle: 0,
    proof: 0,
    receipt: 0,
    rung: 0,
    run: 0,
  };

  for (const node of nodes) {
    counts[node.role] += 1;
  }

  return counts;
};

const hostSize = (element: HTMLElement): { width: number; height: number } => {
  const rect = element.getBoundingClientRect();
  const width = Math.max(
    1,
    Math.floor(rect.width || element.clientWidth || 480),
  );
  const height = Math.max(
    1,
    Math.floor(rect.height || element.clientHeight || 340),
  );
  return { width, height };
};

const vector = (point: TrainingRunVector): Three.Vector3 =>
  new Three.Vector3(point[0], point[1], point[2]);

const nodeSelection = (
  node: TrainingRunNodeDefinition,
): TrainingRunNodeSelection => ({
  detail: node.detail,
  id: node.id,
  label: node.label,
  role: node.role,
  status: node.status,
});

export const trainingRunWorldItemSelection = (
  item: TrainingRunWorldItemDefinition,
): TrainingRunWorldItemSelection => ({
  detail: item.detail,
  id: item.id,
  kind: item.kind,
  label: item.label,
  status: item.status ?? "active",
  sourceRefs: (item.sourceRefs ?? [])
    .map((ref) => ref.trim())
    .filter((ref) => ref.length > 0),
});

export const trainingRunWorldItemNodeSelection = (
  item: TrainingRunWorldItemDefinition,
): TrainingRunNodeSelection => ({
  detail: item.detail,
  id: `world-item:${item.id}`,
  label: item.label,
  role: "run",
  status: item.status ?? "active",
});

export type TrainingRunTargetCandidate = Readonly<{
  id: string;
  position: TrainingRunVector;
  selection: TrainingRunNodeSelection;
}>;

export const nearestTrainingRunWorldItem = (
  items: readonly TrainingRunWorldItemDefinition[],
  origin: TrainingRunVector,
): TrainingRunWorldItemSelection | null => {
  const originVector = vector(origin);
  const nearest = items
    .map((item) => {
      const radius = Math.max(0, item.interactionRadius ?? 2.2);
      const distance = vector(item.position).distanceTo(originVector);
      return { distance, item, radius };
    })
    .filter(({ distance, radius }) => distance <= radius)
    .sort((left, right) => {
      if (left.distance !== right.distance) return left.distance - right.distance;
      return left.item.id.localeCompare(right.item.id);
    })[0];

  return nearest === undefined
    ? null
    : trainingRunWorldItemSelection(nearest.item);
};

const projectedTarget = new Three.Vector3();

export const orderTrainingRunTargetsByDistance = (
  targets: readonly TrainingRunTargetCandidate[],
  origin: TrainingRunVector,
  maxTargets = targets.length,
): readonly TrainingRunTargetCandidate[] => {
  const originVector = vector(origin);
  const limit =
    Number.isFinite(maxTargets) && maxTargets > 0
      ? Math.floor(maxTargets)
      : targets.length;
  return [...targets]
    .sort((left, right) => {
      const leftDistance = vector(left.position).distanceToSquared(originVector);
      const rightDistance = vector(right.position).distanceToSquared(originVector);
      if (leftDistance !== rightDistance) return leftDistance - rightDistance;
      return left.id.localeCompare(right.id);
    })
    .slice(0, limit);
};

export const orderTrainingRunTargetsByCameraView = (
  targets: readonly TrainingRunTargetCandidate[],
  camera: Three.Camera,
  origin: TrainingRunVector,
  maxTargets = targets.length,
): readonly TrainingRunTargetCandidate[] => {
  const originVector = vector(origin);
  const limit =
    Number.isFinite(maxTargets) && maxTargets > 0
      ? Math.floor(maxTargets)
      : targets.length;
  camera.updateMatrixWorld();
  const projectionCamera = camera as Three.Camera & {
    updateProjectionMatrix?: () => void;
  };
  projectionCamera.updateProjectionMatrix?.();
  return targets
    .flatMap((target) => {
      projectedTarget.set(
        target.position[0],
        target.position[1],
        target.position[2],
      );
      projectedTarget.project(camera);
      const onScreen =
        projectedTarget.z >= -1 &&
        projectedTarget.z <= 1 &&
        Math.abs(projectedTarget.x) <= 1 &&
        Math.abs(projectedTarget.y) <= 1;
      if (!onScreen) return [];
      const screenDistance =
        projectedTarget.x * projectedTarget.x +
        projectedTarget.y * projectedTarget.y;
      const worldDistance = vector(target.position).distanceToSquared(originVector);
      return [{ screenDistance, target, worldDistance }];
    })
    .sort((left, right) => {
      if (left.screenDistance !== right.screenDistance) {
        return left.screenDistance - right.screenDistance;
      }
      if (left.worldDistance !== right.worldDistance) {
        return left.worldDistance - right.worldDistance;
      }
      return left.target.id.localeCompare(right.target.id);
    })
    .slice(0, limit)
    .map((entry) => entry.target);
};

export const cycleTrainingRunTarget = (
  targets: readonly TrainingRunTargetCandidate[],
  input: Readonly<{
    currentId?: string | null;
    direction?: 1 | -1;
    maxTargets?: number;
    origin: TrainingRunVector;
  }>,
): TrainingRunTargetCandidate | undefined => {
  const ordered = orderTrainingRunTargetsByDistance(
    targets,
    input.origin,
    input.maxTargets,
  );
  if (ordered.length === 0) return undefined;
  const direction = input.direction ?? 1;
  const currentIndex =
    input.currentId === undefined || input.currentId === null
      ? -1
      : ordered.findIndex((target) => target.id === input.currentId);
  const nextIndex =
    currentIndex === -1
      ? 0
      : (currentIndex + direction + ordered.length) % ordered.length;
  return ordered[nextIndex];
};

export const cycleTrainingRunCameraTarget = (
  targets: readonly TrainingRunTargetCandidate[],
  input: Readonly<{
    camera: Three.Camera;
    currentId?: string | null;
    direction?: 1 | -1;
    maxTargets?: number;
    origin: TrainingRunVector;
  }>,
): TrainingRunTargetCandidate | undefined => {
  const ordered = orderTrainingRunTargetsByCameraView(
    targets,
    input.camera,
    input.origin,
    input.maxTargets,
  );
  if (ordered.length === 0) return undefined;
  const direction = input.direction ?? 1;
  const currentIndex =
    input.currentId === undefined || input.currentId === null
      ? -1
      : ordered.findIndex((target) => target.id === input.currentId);
  const nextIndex =
    currentIndex === -1
      ? 0
      : (currentIndex + direction + ordered.length) % ordered.length;
  return ordered[nextIndex];
};

/**
 * Map an arbitrary contributor/entity status string onto the bounded node
 * status enum so an entity selection can travel through the existing
 * `onNodeClick` / `node-selected` path without widening the foldkit schema.
 * The raw status is preserved separately (in the selection `detail`).
 */
export const trainingRunEntityNodeStatus = (
  status: string,
): TrainingRunNodeStatus => {
  switch (status) {
    case "planned":
    case "queued":
    case "sync":
    case "active":
    case "sealed":
    case "verified":
    case "blocked":
      return status;
    case "registered":
      return "queued";
    case "qualified":
    case "state_synced":
    case "warmup":
      return "sync";
    case "sync_reentry":
      return "blocked";
    case "reconciled":
    case "settled":
      return "verified";
    default:
      return "active";
  }
};

const colorForEntityStatus = (status: string): number =>
  colorForStatus(trainingRunEntityNodeStatus(status));

export const trainingRunRemoteAvatarSelection = (
  avatar: TrainingRunRemoteAvatarDefinition,
): TrainingRunNodeSelection => ({
  detail: avatar.stale === true ? "remote avatar stale" : "remote avatar",
  id: `remote-avatar:${avatar.id}`,
  label: avatar.label,
  role: "run",
  status: avatar.stale === true ? "queued" : "active",
});

export const colorForRemoteAvatar = (
  avatar: Pick<TrainingRunRemoteAvatarDefinition, "color" | "stale">,
): number => {
  const color = avatar.color?.trim();
  if (color !== undefined && /^#[0-9a-f]{6}$/iu.test(color)) {
    return Number.parseInt(color.slice(1), 16);
  }
  return avatar.stale === true ? 0x9ca3af : 0x8ef6ff;
};

const remoteAvatarQuaternion = (yaw: number | undefined): Three.Quaternion => {
  const quaternion = new Three.Quaternion();
  const safeYaw = typeof yaw === "number" && Number.isFinite(yaw) ? yaw : 0;
  quaternion.setFromAxisAngle(
    new Three.Vector3(0, 1, 0),
    safeYaw,
  );
  return quaternion;
};

const remoteAvatarTransformInput = (
  avatar: TrainingRunRemoteAvatarDefinition,
): MmoEntityTransformInput<TrainingRunRemoteAvatarDefinition> => ({
  id: avatar.id,
  position: avatar.position,
  quaternion: remoteAvatarQuaternion(avatar.yaw),
  state: avatar.animation ?? "idle",
  updatedAtMs: avatar.updatedAtMs ?? Date.now(),
  description: avatar,
});

/**
 * Project an entity into a `TrainingRunNodeSelection` for the shared
 * `onNodeClick` path. The raw entity status is carried in `detail` so
 * receipt-dereference consumers (#5116) can recover it exactly, while `status`
 * is the bounded node-status projection the foldkit event schema accepts.
 */
export const trainingRunEntitySelection = (
  entity: TrainingRunEntityDefinition,
): TrainingRunNodeSelection => ({
  detail: entity.status,
  id: entity.id,
  label: entity.label ?? entity.id,
  role: "run",
  status: trainingRunEntityNodeStatus(entity.status),
});

export const trainingRunMotionSourceRefs = (
  motion: TrainingRunMotionEvidence,
): readonly string[] =>
  (motion.sourceRefs ?? [])
    .map((ref) => ref.trim())
    .filter((ref) => ref.length > 0);

export const trainingRunMotionHasEvidence = (
  motion: TrainingRunMotionEvidence,
): boolean => trainingRunMotionSourceRefs(motion).length > 0;

const motionAllowedByPolicy = (
  motion: TrainingRunMotionEvidence,
  policy: Required<TrainingRunMotionPolicy>,
): boolean =>
  policy.evidence === "optional" || trainingRunMotionHasEvidence(motion);

/**
 * Deterministically lay out entities that lack an explicit position on a ring
 * around the run hub, so the same input always yields the same scene. Uses
 * index-derived angles (golden-ratio stepped) rather than time/random.
 */
export const trainingRunEntityRingPosition = (
  index: number,
  count: number,
  options: Readonly<{
    center?: TrainingRunVector;
    radius?: number;
    heightAmplitude?: number;
  }> = {},
): TrainingRunVector => {
  const center = options.center ?? entityRingLayout.center;
  const radius = options.radius ?? entityRingLayout.radius;
  const heightAmplitude = options.heightAmplitude ?? entityRingLayout.heightAmplitude;
  const total = Math.max(1, count);
  // Even angular spacing with a golden-ratio offset keeps small rings legible
  // and large rings non-overlapping, all deterministically.
  const angle = (index / total) * Math.PI * 2 + index * 2.399963229728653;
  const heightPhase = index * 1.324717957244746 + total * 0.37;
  return [
    center[0] + Math.cos(angle) * radius,
    center[1] + Math.sin(angle) * radius,
    center[2] + Math.sin(heightPhase) * heightAmplitude,
  ];
};

const entityRingLayout = {
  center: [-0.15, 0.28, 0.62] as TrainingRunVector,
  heightAmplitude: 0.58,
  radius: 1.62,
} as const;

export const trainingRunEntityMinimumDistance = 0.86;

export const uniqueTrainingRunEntities = (
  entities: readonly TrainingRunEntityDefinition[],
): readonly TrainingRunEntityDefinition[] => {
  const byId = new Map<string, TrainingRunEntityDefinition>();
  for (const entity of entities) {
    byId.set(entity.id, entity);
  }
  return [...byId.values()];
};

export const separateTrainingRunEntityPositions = (
  positions: ReadonlyMap<string, TrainingRunVector>,
  minDistance = trainingRunEntityMinimumDistance,
): ReadonlyMap<string, TrainingRunVector> => {
  const ids = [...positions.keys()];
  const vectors = ids.map((id) => {
    const position = positions.get(id) ?? [0, 0, 0];
    return new Three.Vector3(position[0], position[1], position[2]);
  });
  const minimum = Math.max(0, minDistance);
  if (minimum === 0 || vectors.length < 2) return positions;
  for (let iteration = 0; iteration < 10; iteration += 1) {
    let moved = false;
    for (let left = 0; left < vectors.length; left += 1) {
      for (let right = left + 1; right < vectors.length; right += 1) {
        const a = vectors[left] ?? new Three.Vector3();
        const b = vectors[right] ?? new Three.Vector3();
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= minimum) continue;
        const fallbackAngle =
          ((left + 1) * 1.61803398875 + (right + 1) * 0.754877666) *
          Math.PI;
        const nx =
          distance > 0.000001 ? dx / distance : Math.cos(fallbackAngle);
        const ny =
          distance > 0.000001 ? dy / distance : Math.sin(fallbackAngle);
        const push = (minimum - distance) / 2;
        a.x += nx * push;
        a.y += ny * push;
        b.x -= nx * push;
        b.y -= ny * push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return new Map(
    ids.map((id, index) => {
      const vector = vectors[index] ?? new Three.Vector3();
      return [id, [vector.x, vector.y, vector.z] as TrainingRunVector] as const;
    }),
  );
};

/**
 * Resolve every entity to a concrete position: explicit `position` wins,
 * otherwise a deterministic ring slot. Duplicate IDs collapse to one rendered
 * node, then a deterministic minimum-distance pass keeps labels legible.
 */
export const resolveTrainingRunEntityPositions = (
  entities: readonly TrainingRunEntityDefinition[],
): ReadonlyMap<string, TrainingRunVector> => {
  const positions = new Map<string, TrainingRunVector>();
  const visualEntities = uniqueTrainingRunEntities(entities);
  const unplaced = visualEntities.filter(
    (entity) => entity.position === undefined,
  );
  let ringIndex = 0;
  for (const entity of visualEntities) {
    if (entity.position !== undefined) {
      positions.set(entity.id, entity.position);
    } else {
      positions.set(
        entity.id,
        trainingRunEntityRingPosition(ringIndex, unplaced.length),
      );
      ringIndex += 1;
    }
  }
  return separateTrainingRunEntityPositions(positions);
};

const colorForStatus = (status: TrainingRunNodeStatus): number =>
  status === "blocked"
    ? 0xff6b6b
    : status === "sealed"
      ? 0xffd166
      : status === "verified"
        ? 0xb7f7d4
        : status === "active"
          ? 0xffffff
          : status === "sync"
            ? 0xb9e6ff
            : 0x9ca3af;

const colorForPromiseSignal = (state: TrainingRunPromiseSignalState): number =>
  state === "green"
    ? 0xb7f7d4
    : state === "yellow"
      ? 0xffd166
      : state === "planned"
        ? 0xb9e6ff
        : state === "red" || state === "degraded" || state === "withdrawn"
          ? 0xff6b6b
          : 0x9ca3af;

const colorForOperatorSignal = (
  state: TrainingRunOperatorSignalState,
): number =>
  state === "success"
    ? 0xb7f7d4
    : state === "error"
      ? 0xff6b6b
      : state === "info"
        ? 0xb9e6ff
        : 0x9ca3af;

const makeCircle = (
  radius: number,
  color: number,
  opacity: number,
): Three.Mesh<Three.CircleGeometry, Three.MeshBasicMaterial> =>
  new Three.Mesh(
    new Three.CircleGeometry(radius, 48),
    new Three.MeshBasicMaterial({
      color,
      opacity,
      transparent: opacity < 1,
      depthWrite: opacity >= 1,
    }),
  );

const makeRect = (
  width: number,
  height: number,
  color: number,
  opacity: number,
): Three.Mesh<Three.PlaneGeometry, Three.MeshBasicMaterial> =>
  new Three.Mesh(
    new Three.PlaneGeometry(width, height),
    new Three.MeshBasicMaterial({
      color,
      opacity,
      transparent: true,
      depthWrite: false,
      side: Three.DoubleSide,
    }),
  );

const makeRing = (
  radius: number,
  color: number,
  opacity: number,
): Three.Mesh<Three.RingGeometry, Three.MeshBasicMaterial> =>
  new Three.Mesh(
    new Three.RingGeometry(radius * 0.82, radius, 64),
    new Three.MeshBasicMaterial({
      color,
      opacity,
      transparent: true,
      depthWrite: false,
      side: Three.DoubleSide,
    }),
  );

const translucentBasicMaterial = (
  color: number,
  opacity: number,
): Three.MeshBasicMaterial =>
  new Three.MeshBasicMaterial({
    color,
    opacity,
    transparent: opacity < 1,
    depthWrite: false,
    side: Three.DoubleSide,
  });

export const trainingRunBulletinBoardSourceRefs = [
  "projects/repos/examples/demos/canvas-text/src/App.jsx",
  "packages/core/src/textLabelPrimitives.ts",
] as const;

export const makeTrainingRunBulletinBoard = (
  item: TrainingRunWorldItemDefinition,
): Three.Group => {
  const group = new Three.Group();
  const width = 3.1;
  const height = 1.64;
  const thickness = 0.14;
  const postHeight = 2.18;
  const yaw = typeof item.yaw === "number" && Number.isFinite(item.yaw)
    ? item.yaw
    : 0;

  group.position.copy(vector(item.position));
  group.rotation.z = yaw;
  group.name = `training-run-world-item:${item.id}`;

  const postMaterial = new Three.MeshStandardMaterial({
    color: 0x24272c,
    emissive: 0x060708,
    metalness: 0.08,
    roughness: 0.72,
  });
  for (const x of [-width / 2 + 0.22, width / 2 - 0.22]) {
    const post = new Three.Mesh(
      new Three.BoxGeometry(0.18, 0.18, postHeight),
      postMaterial,
    );
    post.position.set(x, 0.04, postHeight / 2);
    group.add(post);
  }

  const base = new Three.Mesh(
    new Three.BoxGeometry(width + 0.34, 0.34, 0.12),
    new Three.MeshStandardMaterial({
      color: 0x111315,
      emissive: 0x030405,
      metalness: 0.08,
      roughness: 0.78,
    }),
  );
  base.position.set(0, 0.04, 0.06);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const board = new Three.Mesh(
    new Three.BoxGeometry(width, thickness, height),
    new Three.MeshStandardMaterial({
      color: 0x2f343a,
      emissive: 0x07090b,
      metalness: 0.12,
      roughness: 0.62,
    }),
  );
  board.position.set(0, 0, 1.39);
  board.castShadow = true;
  board.receiveShadow = true;
  group.add(board);

  const frameMaterial = new Three.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0x30343a,
    metalness: 0.18,
    roughness: 0.46,
  });
  const frameDepth = 0.048;
  const frameRail = 0.08;
  const frameY = -thickness / 2 - 0.028;
  for (const z of [
    1.39 - height / 2 - frameRail / 2,
    1.39 + height / 2 + frameRail / 2,
  ]) {
    const rail = new Three.Mesh(
      new Three.BoxGeometry(width + frameRail * 2, frameDepth, frameRail),
      frameMaterial,
    );
    rail.position.set(0, frameY, z);
    rail.castShadow = true;
    group.add(rail);
  }
  for (const x of [-width / 2 - frameRail / 2, width / 2 + frameRail / 2]) {
    const rail = new Three.Mesh(
      new Three.BoxGeometry(frameRail, frameDepth, height + frameRail * 2),
      frameMaterial,
    );
    rail.position.set(x, frameY, 1.39);
    rail.castShadow = true;
    group.add(rail);
  }

  const face = new Three.Mesh(
    new Three.PlaneGeometry(width - 0.24, height - 0.22),
    new Three.MeshBasicMaterial({
      color: 0x050608,
      opacity: 0.98,
      transparent: true,
      side: Three.DoubleSide,
    }),
  );
  face.rotation.x = Math.PI / 2;
  face.position.set(0, -thickness / 2 - 0.008, 1.39);
  group.add(face);

  const headerBacking = new Three.Mesh(
    new Three.PlaneGeometry(width - 0.36, 0.36),
    new Three.MeshBasicMaterial({
      color: 0x111418,
      opacity: 0.96,
      transparent: true,
      side: Three.DoubleSide,
    }),
  );
  headerBacking.rotation.x = Math.PI / 2;
  headerBacking.position.set(0, -thickness / 2 - 0.011, 1.96);
  group.add(headerBacking);

  const accent = new Three.Mesh(
    new Three.BoxGeometry(width - 0.34, 0.018, 0.05),
    new Three.MeshBasicMaterial({ color: 0xe5e7eb }),
  );
  accent.position.set(0, -thickness / 2 - 0.018, 1.73);
  group.add(accent);

  const title = createTextLabel({
    text: compactWorldLabel(item.title ?? item.label, 24),
    color: "#fff7d6",
    fontSize: 64,
    fontWeight: 700,
    worldHeight: 0.24,
    billboard: false,
    depthTest: true,
    opacity: 1,
  });
  title.object3D.rotation.x = Math.PI / 2;
  title.object3D.position.set(0, -thickness / 2 - 0.024, 1.96);
  group.add(title.object3D);

  const lines = (item.lines ?? [item.detail]).slice(0, 3);
  for (const [index, line] of lines.entries()) {
    const label = createTextLabel({
      text: compactWorldLabel(line, 34),
      color: "#f4efe3",
      fontSize: 42,
      worldHeight: 0.14,
      billboard: false,
      depthTest: true,
      opacity: 0.94,
    });
    label.object3D.rotation.x = Math.PI / 2;
    label.object3D.position.set(
      0,
      -thickness / 2 - 0.025,
      1.52 - index * 0.22,
    );
    group.add(label.object3D);
  }

  const footer = createTextLabel({
    text: "walk up for details",
    color: "#d1d5db",
    fontSize: 34,
    worldHeight: 0.12,
    billboard: false,
    depthTest: true,
    opacity: 0.9,
  });
  footer.object3D.rotation.x = Math.PI / 2;
  footer.object3D.position.set(0, -thickness / 2 - 0.026, 0.82);
  group.add(footer.object3D);

  const glow = makeRing(width * 0.56, 0xe5e7eb, 0.28);
  glow.scale.y = 0.24;
  glow.position.z = 0.025;
  group.add(glow);

  return group;
};

export const makeTrainingRunPylonLandmark = (
  color: number,
  options: Readonly<{ scale?: number; opacity?: number }> = {},
): Three.Group => {
  const scale = options.scale ?? 1;
  const opacity = options.opacity ?? 0.9;
  const group = new Three.Group();
  group.name = "training-run-pylon-landmark";

  const material = (nextColor: number, nextOpacity: number) =>
    new Three.MeshBasicMaterial({
      color: nextColor,
      opacity: nextOpacity,
      transparent: true,
      depthWrite: false,
      side: Three.DoubleSide,
    });

  const base = makeRing(0.2 * scale, color, opacity * 0.55);
  base.position.z = 0.02 * scale;
  group.add(base);

  const tower = new Three.Mesh(
    new Three.CylinderGeometry(0.055 * scale, 0.13 * scale, 0.62 * scale, 5),
    material(color, opacity * 0.76),
  );
  tower.rotation.x = Math.PI / 2;
  tower.position.z = 0.34 * scale;
  group.add(tower);

  const core = new Three.Mesh(
    new Three.CylinderGeometry(0.026 * scale, 0.04 * scale, 0.74 * scale, 5),
    material(0xffffff, opacity * 0.5),
  );
  core.rotation.x = Math.PI / 2;
  core.position.z = 0.4 * scale;
  group.add(core);

  const cap = new Three.Mesh(
    new Three.OctahedronGeometry(0.12 * scale, 0),
    material(0xffffff, opacity * 0.82),
  );
  cap.position.z = 0.76 * scale;
  group.add(cap);

  for (const rotation of [0, Math.PI / 2]) {
    const vane = new Three.Mesh(
      new Three.BoxGeometry(0.38 * scale, 0.018 * scale, 0.08 * scale),
      material(color, opacity * 0.48),
    );
    vane.rotation.z = rotation;
    vane.position.z = 0.56 * scale;
    group.add(vane);
  }

  return group;
};

type ArtifactSelection = Pick<TrainingRunNodeSelection, "id" | "label"> &
  Partial<Pick<TrainingRunNodeSelection, "detail" | "role" | "status">>;

export const trainingRunArtifactKindForSelection = (
  selection: ArtifactSelection,
): TrainingRunArtifactKind => {
  const text = [
    selection.id,
    selection.label,
    selection.detail ?? "",
    selection.role ?? "",
    selection.status ?? "",
  ]
    .join(" ")
    .toLowerCase();
  if (
    text.includes("settlement") ||
    text.includes("settled") ||
    text.includes("payout") ||
    text.includes("recipient") ||
    text.includes("sats")
  ) {
    return "settlement_vault";
  }
  if (
    text.includes("receipt") ||
    text.includes("closeout") ||
    selection.role === "receipt"
  ) {
    return "receipt_slab";
  }
  if (
    text.includes("proof") ||
    text.includes("trace") ||
    text.includes("replay") ||
    text.includes("verdict") ||
    text.includes("freivalds") ||
    text.includes("seal") ||
    selection.role === "proof"
  ) {
    return "proof_shard";
  }
  if (selection.status === "blocked" || text.includes("blocked")) {
    return "blocked_gate";
  }
  return "activity_beacon";
};

export const makeTrainingRunArtifactMarker = (
  kind: TrainingRunArtifactKind,
  color: number,
  options: Readonly<{ scale?: number; opacity?: number }> = {},
): Three.Group => {
  const scale = options.scale ?? 1;
  const opacity = options.opacity ?? 0.84;
  const group = new Three.Group();
  group.name = `training-run-${kind.replace(/_/g, "-")}`;
  const material = (nextColor: number, nextOpacity = opacity) =>
    translucentBasicMaterial(nextColor, nextOpacity);

  const base = makeRing(0.16 * scale, color, opacity * 0.35);
  base.position.z = 0.015 * scale;
  group.add(base);

  if (kind === "settlement_vault") {
    const plinth = new Three.Mesh(
      new Three.CylinderGeometry(0.16 * scale, 0.2 * scale, 0.08 * scale, 8),
      material(color, opacity * 0.58),
    );
    plinth.rotation.x = Math.PI / 2;
    plinth.position.z = 0.08 * scale;
    group.add(plinth);

    const vault = new Three.Mesh(
      new Three.CylinderGeometry(0.1 * scale, 0.14 * scale, 0.44 * scale, 8),
      material(0xffd166, opacity * 0.72),
    );
    vault.rotation.x = Math.PI / 2;
    vault.position.z = 0.32 * scale;
    group.add(vault);

    const seal = new Three.Mesh(
      new Three.TorusGeometry(0.12 * scale, 0.012 * scale, 8, 28),
      material(0xfff3a3, opacity * 0.76),
    );
    seal.position.z = 0.52 * scale;
    group.add(seal);

    const cap = new Three.Mesh(
      new Three.OctahedronGeometry(0.105 * scale, 0),
      material(0xffffff, opacity * 0.72),
    );
    cap.position.z = 0.66 * scale;
    group.add(cap);
    return group;
  }

  if (kind === "proof_shard") {
    for (const x of [-0.09, 0.09]) {
      const post = new Three.Mesh(
        new Three.BoxGeometry(0.035 * scale, 0.05 * scale, 0.44 * scale),
        material(color, opacity * 0.56),
      );
      post.position.set(x * scale, 0, 0.28 * scale);
      group.add(post);
    }
    const lintel = new Three.Mesh(
      new Three.BoxGeometry(0.25 * scale, 0.045 * scale, 0.055 * scale),
      material(color, opacity * 0.5),
    );
    lintel.position.z = 0.52 * scale;
    group.add(lintel);
    const shard = new Three.Mesh(
      new Three.OctahedronGeometry(0.09 * scale, 0),
      material(0xffffff, opacity * 0.68),
    );
    shard.position.z = 0.35 * scale;
    group.add(shard);
    return group;
  }

  if (kind === "receipt_slab") {
    const slab = new Three.Mesh(
      new Three.BoxGeometry(0.22 * scale, 0.04 * scale, 0.36 * scale),
      material(color, opacity * 0.62),
    );
    slab.rotation.z = 0.08;
    slab.position.z = 0.28 * scale;
    group.add(slab);
    for (const z of [0.2, 0.29, 0.38]) {
      const rule = new Three.Mesh(
        new Three.BoxGeometry(0.15 * scale, 0.018 * scale, 0.012 * scale),
        material(0xffffff, opacity * 0.42),
      );
      rule.position.z = z * scale;
      group.add(rule);
    }
    return group;
  }

  if (kind === "blocked_gate") {
    for (const rotation of [Math.PI / 4, -Math.PI / 4]) {
      const bar = new Three.Mesh(
        new Three.BoxGeometry(0.27 * scale, 0.035 * scale, 0.05 * scale),
        material(color, opacity * 0.62),
      );
      bar.rotation.z = rotation;
      bar.position.z = 0.32 * scale;
      group.add(bar);
    }
    const core = new Three.Mesh(
      new Three.BoxGeometry(0.09 * scale, 0.09 * scale, 0.32 * scale),
      material(0xffffff, opacity * 0.32),
    );
    core.position.z = 0.26 * scale;
    group.add(core);
    return group;
  }

  const mast = new Three.Mesh(
    new Three.CylinderGeometry(0.035 * scale, 0.055 * scale, 0.34 * scale, 6),
    material(color, opacity * 0.6),
  );
  mast.rotation.x = Math.PI / 2;
  mast.position.z = 0.24 * scale;
  group.add(mast);
  const beacon = new Three.Mesh(
    new Three.OctahedronGeometry(0.085 * scale, 0),
    material(0xffffff, opacity * 0.62),
  );
  beacon.position.z = 0.48 * scale;
  group.add(beacon);
  return group;
};

const makeTextSprite = (
  text: string,
  options: Readonly<{
    color?: string;
    fontSize?: number;
    height?: number;
    worldHeight?: number;
    width?: number;
  }> = {},
): Three.Sprite => {
  const canvas = document.createElement("canvas");
  canvas.width = options.width ?? 384;
  canvas.height = options.height ?? 96;

  const context = canvas.getContext("2d");
  if (context !== null) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = options.color ?? "#f8fafc";
    context.font = `${options.fontSize ?? 34}px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  const texture = new Three.CanvasTexture(canvas);
  texture.colorSpace = Three.SRGBColorSpace;
  const material = new Three.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new Three.Sprite(material);
  const worldHeight = options.worldHeight ?? 0.42;
  sprite.scale.set(
    (canvas.width / canvas.height) * worldHeight,
    worldHeight,
    1,
  );
  return sprite;
};

export const trainingRunHeadLabelPositionForObject = (
  object: Three.Object3D,
  parent: Three.Object3D,
  options: Readonly<{
    fallbackHeight?: number;
    margin?: number;
    worldHeight?: number;
  }> = {},
): Three.Vector3 => {
  const margin = options.margin ?? 0.08;
  const worldHeight = options.worldHeight ?? 0.42;
  const fallbackHeight = options.fallbackHeight ?? 0.8;
  object.updateWorldMatrix(true, true);
  parent.updateWorldMatrix(true, false);

  const box = new Three.Box3().setFromObject(object);
  const anchorWorld = new Three.Vector3();
  if (box.isEmpty()) {
    object.getWorldPosition(anchorWorld);
    anchorWorld.z += fallbackHeight;
  } else {
    anchorWorld.set(
      (box.min.x + box.max.x) / 2,
      (box.min.y + box.max.y) / 2,
      box.max.z,
    );
  }
  anchorWorld.z += margin + worldHeight / 2;
  return parent.worldToLocal(anchorWorld);
};

const compactWorldLabel = (text: string, maxLength = 18): string => {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(1, maxLength - 1))}…`;
};

const lineGeometry = (points: readonly Three.Vector3[]): Three.BufferGeometry =>
  new Three.BufferGeometry().setFromPoints([...points]);

const makeLine = (
  points: readonly Three.Vector3[],
  color: number,
  opacity: number,
): Three.Line<Three.BufferGeometry, Three.LineBasicMaterial> =>
  new Three.Line(
    lineGeometry(points),
    new Three.LineBasicMaterial({
      color,
      opacity,
      transparent: opacity < 1,
      depthWrite: false,
    }),
  );

const makeHorizontalPlane = (
  width: number,
  depth: number,
  color: number,
  opacity: number,
): Three.Mesh<Three.PlaneGeometry, Three.MeshBasicMaterial> => {
  const mesh = new Three.Mesh(
    new Three.PlaneGeometry(width, depth),
    new Three.MeshBasicMaterial({
      color,
      opacity,
      transparent: opacity < 1,
      depthWrite: false,
      side: Three.DoubleSide,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
};

const makeHorizontalLitPlane = (
  width: number,
  depth: number,
  color: number,
  opacity: number,
): Three.Mesh<Three.PlaneGeometry, Three.MeshStandardMaterial> => {
  const mesh = new Three.Mesh(
    new Three.PlaneGeometry(width, depth),
    new Three.MeshStandardMaterial({
      color,
      metalness: 0,
      opacity,
      roughness: 0.86,
      transparent: opacity < 1,
      side: Three.DoubleSide,
    }),
  );
  mesh.receiveShadow = true;
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
};

export const metaverseStreetSourceRefs = [
  "Snow Crash / Metaverse: a persistent city organized around The Street",
] as const;

export const metaverseStreetLayout = {
  centerZ: 0,
  farZ: -140,
  nearZ: 140,
  roadWidth: 4.8,
  shoulderX: 4.9,
  sidewalkX: 6.15,
  parcelX: 18.2,
  tassadarLotX: 5.8,
  tassadarLotZ: 0.8,
  tassadarSceneScale: 1.65,
} as const;

export const metaverseTassadarAreaHalfExtents = {
  x: metaverseStreetLayout.tassadarSceneScale * 6.1,
  z: metaverseStreetLayout.tassadarSceneScale * 4.7,
} as const;

export const trainingRunPresenceZoneForPosition = (
  position: readonly [number, number, number],
): TrainingRunPresenceZone | null => {
  const x = position[0];
  const z = position[2];
  return Math.abs(x - metaverseStreetLayout.tassadarLotX) <=
    metaverseTassadarAreaHalfExtents.x &&
    Math.abs(z - metaverseStreetLayout.tassadarLotZ) <=
      metaverseTassadarAreaHalfExtents.z
    ? "tassadar_area"
    : null;
};

const metaverseStreetLength =
  metaverseStreetLayout.nearZ - metaverseStreetLayout.farZ;

export const metaverseStreetHumanHeight = 1.83;
export const metaverseStreetStoryHeight =
  metaverseStreetHumanHeight * (10 / 6);
export const metaverseStreetParcelSpacing = 13.5;

export const metaverseStreetParcelPositions = (
  countPerSide = 72,
): readonly Three.Vector3[] => {
  const count = Math.max(0, Math.floor(countPerSide));
  const positions: Three.Vector3[] = [];
  for (let index = 0; index < count; index += 1) {
    const z = metaverseStreetLayout.farZ + 4 + index * metaverseStreetParcelSpacing;
    const stagger = index % 2 === 0 ? 0 : 0.38;
    positions.push(
      new Three.Vector3(-metaverseStreetLayout.parcelX - stagger, 0, z),
    );
    positions.push(
      new Three.Vector3(metaverseStreetLayout.parcelX + stagger, 0, z),
    );
  }
  return positions;
};

export const metaverseStreetBuildingDimensions = (
  index: number,
): Readonly<{ depth: number; height: number; width: number }> => ({
  depth: 4.8 + (index % 5) * 1.6,
  height: metaverseStreetStoryHeight * (5 + ((index * 7) % 16)),
  width: 3.8 + (index % 4) * 1.25,
});

export const metaverseStreetBuildingColor = (index: number): number => {
  const grayscale = [0xd8d8d8, 0xbcbcbc, 0xa3a3a3, 0xc9c9c9] as const;
  return grayscale[Math.abs(index) % grayscale.length]!;
};

export const metaverseStreetBuildingOpacity = (index: number): number =>
  0.075 + (Math.abs(index) % 4) * 0.018;

const makeMetaverseStreetBuildingMaterial = (
  index: number,
): Three.MeshPhysicalMaterial =>
  new Three.MeshPhysicalMaterial({
    color: metaverseStreetBuildingColor(index),
    metalness: 0.02,
    opacity: metaverseStreetBuildingOpacity(index),
    roughness: 0.58,
    transparent: true,
    depthWrite: false,
    envMapIntensity: 0.24,
    clearcoat: 0.25,
    clearcoatRoughness: 0.6,
    side: Three.DoubleSide,
  });

export const trainingRunPerspectiveSunDirection = (): Three.Vector3 =>
  new Three.Vector3(0.36, 0.44, -0.82).normalize();

export const createTrainingRunPerspectiveAtmosphere = (): Three.Group => {
  const group = new Three.Group();
  group.name = "training-run-perspective-atmosphere";
  const sunDirection = trainingRunPerspectiveSunDirection();

  const sky = new Three.Mesh(
    new Three.SphereGeometry(640, 32, 16),
    new Three.ShaderMaterial({
      uniforms: {
        topColor: { value: new Three.Color(0x0b0c0e) },
        horizonColor: { value: new Three.Color(0x24272a) },
        bottomColor: { value: new Three.Color(0x050506) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          float upper = smoothstep(0.0, 0.82, h);
          float lower = smoothstep(-0.86, 0.08, h);
          vec3 lowBlend = mix(bottomColor, horizonColor, lower);
          vec3 color = mix(lowBlend, topColor, upper);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: false,
      fog: false,
      side: Three.BackSide,
    }),
  );
  sky.name = "training-run-dark-grayscale-sky";
  sky.renderOrder = -1000;
  group.add(sky);

  const sunDisc = new Three.Sprite(
    new Three.SpriteMaterial({
      color: 0xffffff,
      depthWrite: false,
      opacity: 0.62,
      transparent: true,
    }),
  );
  sunDisc.name = "training-run-white-sun";
  sunDisc.position.copy(sunDirection).multiplyScalar(520);
  sunDisc.scale.setScalar(28);
  group.add(sunDisc);

  const ambient = new Three.AmbientLight(0xcfcfcf, 0.28);
  ambient.name = "training-run-low-ambient-fill";
  group.add(ambient);

  const hemisphere = new Three.HemisphereLight(0xf4f4f4, 0x050505, 0.54);
  hemisphere.name = "training-run-grayscale-hemisphere";
  group.add(hemisphere);

  const sunLight = new Three.DirectionalLight(0xffffff, 4.1);
  sunLight.name = "training-run-shadow-sun";
  sunLight.position.copy(sunDirection).multiplyScalar(90);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.setScalar(2048);
  sunLight.shadow.camera.left = -82;
  sunLight.shadow.camera.right = 82;
  sunLight.shadow.camera.top = 82;
  sunLight.shadow.camera.bottom = -82;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 220;
  sunLight.shadow.bias = -0.00045;
  sunLight.shadow.normalBias = 0.018;
  sunLight.target.position.set(0, 0, 0);
  group.add(sunLight);
  group.add(sunLight.target);

  const fill = new Three.DirectionalLight(0xb8b8b8, 0.22);
  fill.name = "training-run-soft-opposite-fill";
  fill.position.set(-28, 18, 38);
  group.add(fill);

  return group;
};

export const makeMetaverseStreetDistrict = (): Three.Group => {
  const group = new Three.Group();
  group.name = "the-street-district";
  group.userData["sourceRefs"] = metaverseStreetSourceRefs;

  const road = makeHorizontalLitPlane(
    metaverseStreetLayout.roadWidth,
    metaverseStreetLength,
    0x050607,
    0.98,
  );
  road.position.set(0, -0.255, metaverseStreetLayout.centerZ);
  group.add(road);

  const median = makeHorizontalLitPlane(0.14, metaverseStreetLength - 2, 0xf5f5f5, 0.34);
  median.position.set(0, -0.248, metaverseStreetLayout.centerZ);
  group.add(median);

  for (const x of [-2.42, 2.42]) {
    group.add(
      makeLine(
        [
          new Three.Vector3(x, -0.235, metaverseStreetLayout.farZ + 0.45),
          new Three.Vector3(x, -0.235, metaverseStreetLayout.nearZ - 0.45),
        ],
        0xf5f5f5,
        0.18,
      ),
    );
  }

  for (let index = 0; index < 210; index += 1) {
    const z = metaverseStreetLayout.farZ + 1.2 + index * 1.32;
    const stripe = makeHorizontalPlane(0.08, 0.5, 0xffffff, 0.3);
    stripe.position.set(0, -0.242, z);
    group.add(stripe);
  }

  for (const x of [-metaverseStreetLayout.shoulderX, metaverseStreetLayout.shoulderX]) {
    const walk = makeHorizontalLitPlane(2.35, metaverseStreetLength - 2, 0x0a0b0d, 0.56);
    walk.position.set(x, -0.25, metaverseStreetLayout.centerZ);
    group.add(walk);
    group.add(
      makeLine(
        [
          new Three.Vector3(x, -0.215, metaverseStreetLayout.farZ + 0.65),
          new Three.Vector3(x, -0.215, metaverseStreetLayout.nearZ - 0.65),
        ],
        0xd8d8d8,
        0.12,
      ),
    );
  }

  for (const [index, position] of metaverseStreetParcelPositions().entries()) {
    const side = position.x < 0 ? -1 : 1;
    const { depth, height, width } = metaverseStreetBuildingDimensions(index);
    const parcel = makeHorizontalLitPlane(1.9, 1.36, 0x171717, 0.42);
    parcel.position.set(position.x, -0.246, position.z);
    group.add(parcel);

    const building = new Three.Mesh(
      new Three.BoxGeometry(width, height, depth),
      makeMetaverseStreetBuildingMaterial(index),
    );
    building.name = `the-street-building-${index}`;
    building.castShadow = true;
    building.receiveShadow = true;
    building.position.set(
      position.x + side * 0.12,
      height / 2 - 0.22,
      position.z,
    );
    group.add(building);

    const frontage = makeLine(
      [
        new Three.Vector3(position.x - side * 0.48, 0.05, position.z - 0.28),
        new Three.Vector3(position.x - side * 0.48, 0.05, position.z + 0.28),
      ],
      0xf5f5f5,
      0.2,
    );
    group.add(frontage);
  }

  return group;
};

const makePerspectiveFloorGrid = (): Three.Group => {
  const group = new Three.Group();
  for (let x = -6; x <= 6; x += 1) {
    group.add(
      makeLine(
        [new Three.Vector3(x, -0.24, -4), new Three.Vector3(x, -0.24, 4)],
        0xffffff,
        x === 0 ? 0.1 : 0.035,
      ),
    );
  }
  for (let z = -4; z <= 4; z += 1) {
    group.add(
      makeLine(
        [new Three.Vector3(-6, -0.24, z), new Three.Vector3(6, -0.24, z)],
        0xffffff,
        z === 0 ? 0.1 : 0.035,
      ),
    );
  }
  return group;
};

const makeThreePlayerAvatar = (
  modelUrl: string = defaultThreePlayerAvatarModelUrl,
): ThreePlayerAvatarAnimationHandle => {
  const group = new Three.Group();
  group.name = "three-player-controller-avatar";
  group.userData["sourceModelUrl"] = modelUrl;
  group.userData["animationClips"] = defaultThreePlayerAvatarAnimationClips;
  group.userData["modelLoadState"] = "loading";

  const ring = makeRing(0.42, 0x8ef6ff, 0.34);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.03;
  group.add(ring);

  const loader = new GLTFLoader();
  let mixer: Three.AnimationMixer | undefined;
  let currentAction: Three.AnimationAction | undefined;
  let currentKey: ThreePlayerAvatarClipKey | undefined;
  let queuedGroundKey: ThreePlayerAvatarClipKey | undefined;
  let modelFadeProgress = 1;
  const fadeMaterials: AvatarFadeMaterial[] = [];
  const actions = new Map<ThreePlayerAvatarClipKey, Three.AnimationAction>();

  const fadeInModel = (model: Three.Object3D): void => {
    modelFadeProgress = 0;
    group.userData["modelFadeState"] = "fading";
    model.traverse((child) => {
      const mesh = child as Three.Mesh<
        Three.BufferGeometry,
        Three.Material | Three.Material[]
      >;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const material of materials) {
        fadeMaterials.push({
          material,
          opacity: material.opacity,
          transparent: material.transparent,
          depthWrite: material.depthWrite,
        });
        material.transparent = true;
        material.depthWrite = false;
        material.opacity = 0;
        material.needsUpdate = true;
      }
    });
  };

  const updateModelFade = (delta: number): void => {
    if (modelFadeProgress >= 1 || fadeMaterials.length === 0) return;
    modelFadeProgress = Math.min(1, modelFadeProgress + Math.max(0, delta) / 0.22);
    const eased = 1 - (1 - modelFadeProgress) * (1 - modelFadeProgress);
    for (const entry of fadeMaterials) {
      entry.material.opacity = entry.opacity * eased;
      entry.material.needsUpdate = true;
    }
    if (modelFadeProgress < 1) return;
    for (const entry of fadeMaterials) {
      entry.material.opacity = entry.opacity;
      entry.material.transparent = entry.transparent;
      entry.material.depthWrite = entry.depthWrite;
      entry.material.needsUpdate = true;
    }
    fadeMaterials.length = 0;
    group.userData["modelFadeState"] = "complete";
  };

  const playClip = (key: ThreePlayerAvatarClipKey, fade = 0.18): void => {
    const next = actions.get(key);
    if (next === undefined || next === currentAction) return;

    const previous = currentAction;
    next.reset();
    next.enabled = true;
    next.setEffectiveWeight(1);
    next.play();
    if (previous !== undefined) {
      previous.fadeOut(fade);
      next.fadeIn(fade);
    } else {
      next.fadeIn(fade);
    }
    currentAction = next;
    currentKey = key;
    group.userData["currentAnimation"] = key;
  };

  const playAction = (action: "idle" | "jump" | "run" | "walk"): void => {
    if (action === "jump") {
      if (actions.has("jumpStart")) {
        queuedGroundKey = undefined;
        playClip("jumpStart");
        return;
      }
      playClip(actions.has("jumpLoop") ? "jumpLoop" : "idle");
      return;
    }

    const nextGroundKey = action === "run" ? "run" : action === "walk" ? "walk" : "idle";
    if (
      currentKey !== undefined &&
      (currentKey === "jumpStart" || currentKey === "jumpLoop") &&
      actions.has("jumpEnd")
    ) {
      queuedGroundKey = nextGroundKey;
      playClip("jumpEnd");
      return;
    }
    playClip(nextGroundKey);
  };

  loader.load(
    modelUrl,
    (gltf) => {
      mixer = new Three.AnimationMixer(gltf.scene);
      const model = gltf.scene;
      model.name = "three-player-controller-UEPerson-model";
      model.scale.setScalar(0.86);
      model.position.set(0, 0, 0);
      model.rotation.y = Math.PI;
      model.traverse((child) => {
        const mesh = child as Three.Mesh<
          Three.BufferGeometry,
          Three.Material | Three.Material[]
        >;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      });
      fadeInModel(model);
      for (const [key, clipName] of Object.entries(
        defaultThreePlayerAvatarAnimationClips,
      ) as Array<[ThreePlayerAvatarClipKey, string]>) {
        const clip = gltf.animations.find((animation) => animation.name === clipName);
        if (clip === undefined || mixer === undefined) continue;
        const action = mixer.clipAction(clip);
        const isOneShot = key === "jumpStart" || key === "jumpEnd";
        action.setLoop(isOneShot ? Three.LoopOnce : Three.LoopRepeat, isOneShot ? 1 : Infinity);
        action.clampWhenFinished = isOneShot;
        action.setEffectiveTimeScale(key === "jumpStart" ? 1.2 : 1);
        action.enabled = true;
        action.setEffectiveWeight(0);
        actions.set(key, action);
      }
      mixer.addEventListener("finished", (event) => {
        if (event.action === actions.get("jumpStart")) {
          playClip("jumpLoop");
          return;
        }
        if (event.action === actions.get("jumpEnd")) {
          playClip(queuedGroundKey ?? "idle");
          queuedGroundKey = undefined;
        }
      });
      group.add(model);
      playClip("idle", 0);
      mixer.update(0);
      group.userData["modelLoadState"] = "ready";
    },
    undefined,
    (error) => {
      group.userData["modelLoadError"] =
        error instanceof Error ? error.message : String(error);
      group.userData["modelLoadState"] = "error";
    },
  );

  return {
    group,
    playAction,
    update: (delta) => {
      mixer?.update(Math.max(0, Math.min(delta, 0.1)));
      updateModelFade(Math.max(0, Math.min(delta, 0.1)));
    },
  };
};

const makeCenterReticle = (): Three.Group => {
  const group = new Three.Group();
  group.position.set(0, 0, -1);
  group.visible = false;
  const horizontal = makeLine(
    [new Three.Vector3(-0.015, 0, 0), new Three.Vector3(0.015, 0, 0)],
    0xffffff,
    0.42,
  );
  const vertical = makeLine(
    [new Three.Vector3(0, -0.015, 0), new Three.Vector3(0, 0.015, 0)],
    0xffffff,
    0.42,
  );
  horizontal.material.depthTest = false;
  vertical.material.depthTest = false;
  horizontal.renderOrder = 10;
  vertical.renderOrder = 10;
  group.add(horizontal);
  group.add(vertical);
  return group;
};

const makeDashedLine = (
  points: readonly Three.Vector3[],
  color: number,
  opacity: number,
  options: Readonly<{
    dashSize?: number;
    gapSize?: number;
    scale?: number;
  }> = {},
): Three.Line<Three.BufferGeometry, Three.LineDashedMaterial> => {
  const line = new Three.Line(
    lineGeometry(points),
    new Three.LineDashedMaterial({
      color,
      dashSize: options.dashSize ?? 0.16,
      gapSize: options.gapSize ?? 0.1,
      opacity,
      scale: options.scale ?? 1,
      transparent: opacity < 1,
      depthWrite: false,
    }),
  );
  line.computeLineDistances();
  return line;
};

const ellipsePoints = (
  xRadius: number,
  yRadius: number,
): readonly Three.Vector3[] =>
  new Three.EllipseCurve(0, 0, xRadius, yRadius, 0, Math.PI * 2)
    .getPoints(96)
    .map((point: Three.Vector2) => new Three.Vector3(point.x, point.y, 0));

const curvedEdgePoints = (
  source: TrainingRunVector,
  target: TrainingRunVector,
  bend = 0.3,
): readonly Three.Vector3[] => {
  const start = vector(source);
  const end = vector(target);
  const midpoint = start
    .clone()
    .lerp(end, 0.5)
    .add(new Three.Vector3(0, bend, 0));
  return new Three.QuadraticBezierCurve3(start, midpoint, end).getPoints(28);
};

const pointOnPoints = (
  points: readonly Three.Vector3[],
  phase: number,
): Three.Vector3 => {
  if (points.length === 0) return new Three.Vector3();
  if (points.length === 1) return points[0]!.clone();

  const clamped = phase - Math.floor(phase);
  const scaled = clamped * (points.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(points.length - 1, index + 1);
  return points[index]!.clone().lerp(points[nextIndex]!, scaled - index);
};

const lossChartLayout = {
  height: 0.78,
  origin: new Three.Vector3(2.15, -0.38, 0.12),
  width: 2.05,
} as const;

const lossCurveDomain = (
  curve: readonly TrainingRunLossPoint[],
):
  | Readonly<{
      maxLoss: number;
      maxStep: number;
      minLoss: number;
      minStep: number;
    }>
  | undefined => {
  if (curve.length === 0) return undefined;
  return {
    maxLoss: Math.max(...curve.map((point) => point.validationLoss)),
    maxStep: Math.max(...curve.map((point) => point.step)),
    minLoss: Math.min(...curve.map((point) => point.validationLoss)),
    minStep: Math.min(...curve.map((point) => point.step)),
  };
};

const lossCurvePoints = (
  curve: readonly TrainingRunLossPoint[],
): readonly Three.Vector3[] => {
  const domain = lossCurveDomain(curve);
  if (domain === undefined) return [];

  return curve.map((point) => {
    const x =
      domain.maxStep === domain.minStep
        ? 0
        : ((point.step - domain.minStep) / (domain.maxStep - domain.minStep)) *
          lossChartLayout.width;
    const y =
      domain.maxLoss === domain.minLoss
        ? 0
        : ((domain.maxLoss - point.validationLoss) /
            (domain.maxLoss - domain.minLoss)) *
          lossChartLayout.height;
    return lossChartLayout.origin.clone().add(new Three.Vector3(x, y, 0));
  });
};

const makeAreaUnderCurve = (
  points: readonly Three.Vector3[],
  baselineY: number,
  color: number,
  opacity: number,
): Three.Mesh<Three.ShapeGeometry, Three.MeshBasicMaterial> | undefined => {
  if (points.length < 2) return undefined;

  const shape = new Three.Shape();
  const first = points[0]!;
  const last = points.at(-1)!;
  shape.moveTo(first.x, baselineY);
  for (const point of points) {
    shape.lineTo(point.x, point.y);
  }
  shape.lineTo(last.x, baselineY);
  shape.closePath();

  return new Three.Mesh(
    new Three.ShapeGeometry(shape),
    new Three.MeshBasicMaterial({
      color,
      opacity,
      transparent: true,
      depthWrite: false,
      side: Three.DoubleSide,
    }),
  );
};

const formatLossTick = (value: number): string =>
  Number.isFinite(value) ? value.toFixed(2) : "n/a";

const statusChartOrder: readonly TrainingRunNodeStatus[] = [
  "active",
  "verified",
  "sealed",
  "sync",
  "blocked",
  "queued",
  "planned",
];

const createStatusMiniChart = (
  nodes: readonly TrainingRunNodeDefinition[],
): Three.Group => {
  const group = new Three.Group();
  group.position.set(4.48, 0.72, 0.48);

  const counts = new Map<TrainingRunNodeStatus, number>();
  for (const status of statusChartOrder) counts.set(status, 0);
  for (const node of nodes) {
    counts.set(node.status, (counts.get(node.status) ?? 0) + 1);
  }

  const maxCount = Math.max(...[...counts.values()], 1);
  const title = makeTextSprite("status mix", {
    color: "#d1d5db",
    fontSize: 16,
    height: 80,
    width: 240,
    worldHeight: 0.2,
  });
  title.position.set(0, 0.48, 0.2);
  group.add(title);

  statusChartOrder.forEach((status, index) => {
    const count = counts.get(status) ?? 0;
    const height = count === 0 ? 0.04 : 0.1 + (count / maxCount) * 0.34;
    const bar = makeRect(
      0.085,
      height,
      colorForStatus(status),
      count === 0 ? 0.18 : 0.72,
    );
    bar.position.set(index * 0.12 - 0.36, height / 2, 0.1);
    group.add(bar);

    const dot = makeCircle(
      0.024,
      colorForStatus(status),
      count === 0 ? 0.25 : 0.85,
    );
    dot.position.set(index * 0.12 - 0.36, -0.08, 0.15);
    group.add(dot);
  });

  return group;
};

const disposeMaterial = (material: Three.Material | Three.Material[]): void => {
  if (Array.isArray(material)) {
    material.forEach(disposeMaterial);
    return;
  }

  const maybeMapped = material as Three.Material & {
    map?: Three.Texture | null;
  };
  maybeMapped.map?.dispose();
  material.dispose();
};

const disposeObject = (object: Three.Object3D): void => {
  object.traverse((child: Three.Object3D) => {
    const maybeRenderable = child as Three.Object3D & {
      geometry?: Three.BufferGeometry;
      material?: Three.Material | Three.Material[];
    };
    maybeRenderable.geometry?.dispose();
    if (maybeRenderable.material !== undefined) {
      disposeMaterial(maybeRenderable.material);
    }
  });
};

export const mountTrainingRunVisualization = (
  element: HTMLElement,
  options: TrainingRunVisualizationOptions = {},
): Effect.Effect<TrainingRunVisualizationHandle, TrainingRunMountError> =>
  Effect.try({
    try: () => {
      let resolved = resolveTrainingRunVisualizationOptions(options);
      const sceneScope = createSceneResourceScope();
      const animateStructuralEdges =
        resolved.motionPolicy.structuralEdges === "animated";
      const animateAmbient = resolved.motionPolicy.ambient === "animated";
      const showContributorOrbit =
        resolved.sceneChrome.contributorOrbit === "visible";
      const showStaleRing = resolved.sceneChrome.staleRing === "visible";
      const showLossPanel =
        resolved.sceneChrome.lossPanel === "visible" ||
        (resolved.sceneChrome.lossPanel === "auto" &&
          resolved.lossCurve.length > 1);
      const showStatusChart = resolved.sceneChrome.statusChart === "visible";
      const perspectiveWalk = resolved.cameraMode === "perspective_walk";
      const compactWorldLabels = resolved.worldLabelDensity === "compact";
      const visibleWorldLabelText = (
        selection: Pick<TrainingRunNodeSelection, "id" | "label">,
        maxLength: number,
      ): string | undefined =>
        trainingRunWorldLabelVisibleForSelection(
          selection,
          resolved.worldLabelDensity,
        )
          ? compactWorldLabels || resolved.worldLabelDensity === "pylons"
            ? compactWorldLabel(selection.label, maxLength)
            : selection.label
          : undefined;
      const canvas = document.createElement("canvas");
      canvas.style.display = "block";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.touchAction = "none";
      canvas.style.userSelect = "none";
      canvas.tabIndex = -1;
      element.replaceChildren(canvas);

      const renderer = new Three.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
      });
      renderer.setClearColor(resolved.backgroundColor, 1);
      renderer.outputColorSpace = Three.SRGBColorSpace;
      renderer.toneMapping = Three.ACESFilmicToneMapping;
      renderer.toneMappingExposure = perspectiveWalk ? 0.86 : 1;
      renderer.shadowMap.enabled = perspectiveWalk;
      if (perspectiveWalk) {
        renderer.shadowMap.type = Three.VSMShadowMap;
      }
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, resolved.pixelRatio),
      );

      const scene = new Three.Scene();
      sceneScope.add(() => {
        disposeObject(scene);
        renderer.dispose();
        canvas.remove();
      });
      if (perspectiveWalk) {
        scene.fog = new Three.FogExp2(0x070808, 0.0048);
        scene.add(createTrainingRunPerspectiveAtmosphere());
      }
      const camera = perspectiveWalk
        ? new Three.PerspectiveCamera(62, 1, 0.05, 900)
        : new Three.OrthographicCamera(-5, 5, 3, -3, 0.1, 100);
      if (camera instanceof Three.PerspectiveCamera) {
        camera.position.set(0, 1.65, 6.25);
        camera.lookAt(0, 0.35, 0);
        scene.add(camera);
      } else {
        camera.position.set(0, 0, 10);
        camera.lookAt(0, 0, 0);
      }

      const root = new Three.Group();
      if (perspectiveWalk) {
        root.rotation.x = -Math.PI / 2;
        root.position.set(
          metaverseStreetLayout.tassadarLotX,
          0,
          metaverseStreetLayout.tassadarLotZ,
        );
        root.scale.setScalar(metaverseStreetLayout.tassadarSceneScale);
        scene.add(makePerspectiveFloorGrid());
        scene.add(makeMetaverseStreetDistrict());
      }
      scene.add(root);
      const raycaster = new Three.Raycaster();
      const pointer = new Three.Vector2();
      const hitTargets = new HitTargetRegistry<TrainingRunNodeSelection>();
      const keyboardTargets: Array<{
        candidate: TrainingRunTargetCandidate;
        color: number;
        localPosition: TrainingRunVector;
      }> = [];
      let selectedTargetId: string | null = null;
      let disposed = false;

      const removeKeyboardTargets = (predicate: (id: string) => boolean): void => {
        for (let index = keyboardTargets.length - 1; index >= 0; index -= 1) {
          const id = keyboardTargets[index]?.candidate.id;
          if (id !== undefined && predicate(id)) {
            keyboardTargets.splice(index, 1);
          }
        }
      };

      const grid = new Three.Group();
      for (let x = -4; x <= 4; x += 1) {
        grid.add(
          makeLine(
            [
              new Three.Vector3(x, -2.75, -0.2),
              new Three.Vector3(x, 2.9, -0.2),
            ],
            0xffffff,
            x === 0 ? 0.12 : 0.045,
          ),
        );
      }
      for (let y = -2; y <= 2; y += 1) {
        grid.add(
          makeLine(
            [
              new Three.Vector3(-4.75, y, -0.2),
              new Three.Vector3(4.75, y, -0.2),
            ],
            0xffffff,
            y === 0 ? 0.12 : 0.045,
          ),
        );
      }
      root.add(grid);

      let staleRing: Three.Object3D | undefined;
      if (showStaleRing) {
        staleRing = makeRing(1.12, 0xffffff, 0.18);
        staleRing.position.set(-0.15, 0.28, -0.05);
        root.add(staleRing);
        const staleLabel = makeTextSprite(
          `max stale ${resolved.maxAllowedStaleSteps}`,
          { color: "#d1d5db", fontSize: 26, width: 320, height: 96 },
        );
        staleLabel.position.set(-0.15, -0.92, 0.5);
        root.add(staleLabel);
      }
      const contributorOrbitGroup = new Three.Group();
      contributorOrbitGroup.position.set(-0.15, 0.28, 0.08);
      if (showContributorOrbit) {
        for (const rotation of [-0.32, 0.18, 0.68]) {
          const orbit = makeLine(ellipsePoints(1.38, 0.92), 0xffffff, 0.11);
          orbit.rotation.z = rotation;
          contributorOrbitGroup.add(orbit);
        }
      root.add(contributorOrbitGroup);
      }

      const selectedTargetHighlight = new Three.Group();
      selectedTargetHighlight.visible = false;
      const selectedTargetRing = makeRing(0.38, 0x8ef6ff, 0.72);
      selectedTargetRing.position.z = -0.18;
      const selectedTargetLine = makeLine(
        [new Three.Vector3(0, 0, -0.14), new Three.Vector3(0, 0, 0.9)],
        0x8ef6ff,
        0.72,
      );
      const selectedTargetBeacon = new Three.Mesh(
        new Three.OctahedronGeometry(0.105, 0),
        translucentBasicMaterial(0x8ef6ff, 0.92),
      );
      selectedTargetBeacon.position.z = 0.9;
      const selectedTargetLight = new Three.PointLight(0x8ef6ff, 1.65, 2.8);
      selectedTargetLight.position.z = 1.04;
      let selectedTargetLabel: Three.Sprite | undefined;
      selectedTargetHighlight.add(
        selectedTargetRing,
        selectedTargetLine,
        selectedTargetBeacon,
        selectedTargetLight,
      );
      root.add(selectedTargetHighlight);

      const registerKeyboardTarget = (
        localPosition: TrainingRunVector,
        selection: TrainingRunNodeSelection,
        color: number,
      ): void => {
        const worldPosition = vector(localPosition);
        root.updateMatrixWorld(true);
        root.localToWorld(worldPosition);
        keyboardTargets.push({
          candidate: {
            id: selection.id,
            position: [worldPosition.x, worldPosition.y, worldPosition.z],
            selection,
          },
          color,
          localPosition,
        });
      };

      const registerWorldKeyboardTarget = (
        worldPosition: Three.Vector3,
        selection: TrainingRunNodeSelection,
        color: number,
      ): void => {
        const localPosition = worldPosition.clone();
        root.updateMatrixWorld(true);
        root.worldToLocal(localPosition);
        keyboardTargets.push({
          candidate: {
            id: selection.id,
            position: [worldPosition.x, worldPosition.y, worldPosition.z],
            selection,
          },
          color,
          localPosition: [
            localPosition.x,
            localPosition.y,
            localPosition.z,
          ],
        });
      };

      const setSelectedTarget = (
        target:
          | Readonly<{
              candidate: TrainingRunTargetCandidate;
              color: number;
              localPosition: TrainingRunVector;
            }>
          | undefined,
      ): TrainingRunNodeSelection | undefined => {
        if (target === undefined) {
          selectedTargetId = null;
          selectedTargetHighlight.visible = false;
          return undefined;
        }
        selectedTargetId = target.candidate.id;
        const [x, y, z] = target.localPosition;
        selectedTargetHighlight.position.set(x, y, 0);
        selectedTargetRing.material.color.setHex(target.color);
        selectedTargetLine.material.color.setHex(target.color);
        selectedTargetBeacon.material.color.setHex(target.color);
        selectedTargetLight.color.setHex(target.color);
        selectedTargetLine.geometry.dispose();
        selectedTargetLine.geometry = lineGeometry([
          new Three.Vector3(0, 0, -0.14),
          new Three.Vector3(0, 0, Math.max(0.42, z + 0.5)),
        ]);
        selectedTargetBeacon.position.z = Math.max(0.38, z + 0.5);
        selectedTargetLight.position.z = Math.max(0.55, z + 0.65);
        if (selectedTargetLabel !== undefined) {
          selectedTargetHighlight.remove(selectedTargetLabel);
          disposeObject(selectedTargetLabel);
        }
        const targetLabel = trainingRunSelectionIsPylon(
          target.candidate.selection,
        )
          ? `${target.candidate.selection.label} · ${target.candidate.selection.status}`
          : target.candidate.selection.label;
        selectedTargetLabel = makeTextSprite(
          compactWorldLabel(targetLabel, 26),
          {
            color: "#ffffff",
            fontSize: 18,
            height: 80,
            width: 420,
            worldHeight: 0.18,
          },
        );
        selectedTargetLabel.position.set(0, -0.3, Math.max(0.56, z + 0.62));
        selectedTargetHighlight.add(selectedTargetLabel);
        selectedTargetHighlight.visible = true;
        return target.candidate.selection;
      };

      type RemoteAvatarRuntime = {
        definition: TrainingRunRemoteAvatarDefinition;
        handle: ThreePlayerAvatarAnimationHandle;
        hitTarget: Three.Object3D;
        interpolator: MmoEntityTransformInterpolator<TrainingRunRemoteAvatarDefinition>;
        color: number;
      };

      const remoteAvatarTargetPrefix = "remote-avatar:";
      const remoteAvatars = new Map<string, RemoteAvatarRuntime>();

      const setRemoteAvatarOpacity = (
        object: Three.Object3D,
        factor: number,
      ): void => {
        const opacityFactor = Math.max(0, Math.min(1, factor));
        object.traverse((child) => {
          const mesh = child as Three.Mesh<
            Three.BufferGeometry,
            Three.Material | Three.Material[]
          >;
          if (!mesh.isMesh) return;
          const materials = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          for (const material of materials) {
            const baseOpacity =
              typeof material.userData["remoteAvatarBaseOpacity"] === "number"
                ? (material.userData["remoteAvatarBaseOpacity"] as number)
                : material.opacity;
            material.userData["remoteAvatarBaseOpacity"] = baseOpacity;
            material.opacity = baseOpacity * opacityFactor;
            material.transparent = material.transparent || material.opacity < 1;
            if (material.opacity < 1) material.depthWrite = false;
          }
        });
      };

      const disposeRemoteAvatar = (avatarId: string): void => {
        const entry = remoteAvatars.get(avatarId);
        if (entry === undefined) return;
        remoteAvatars.delete(avatarId);
        hitTargets.remove(`${remoteAvatarTargetPrefix}${avatarId}`);
        entry.handle.group.removeFromParent();
        disposeObject(entry.handle.group);
      };

      const syncRemoteAvatarKeyboardTargets = (): void => {
        removeKeyboardTargets((id) => id.startsWith(remoteAvatarTargetPrefix));
        for (const entry of remoteAvatars.values()) {
          if (!entry.handle.group.visible) continue;
          registerWorldKeyboardTarget(
            entry.handle.group.position.clone(),
            trainingRunRemoteAvatarSelection(entry.definition),
            entry.color,
          );
        }
      };

      const createRemoteAvatar = (
        definition: TrainingRunRemoteAvatarDefinition,
      ): RemoteAvatarRuntime => {
        const color = colorForRemoteAvatar(definition);
        const handle = makeThreePlayerAvatar(
          definition.modelUrl ?? defaultThreePlayerAvatarModelUrl,
        );
        handle.group.name = `${remoteAvatarTargetPrefix}${definition.id}`;
        handle.group.userData["remoteAvatarId"] = definition.id;
        handle.group.userData["remoteAvatarKind"] =
          definition.avatarKind ?? "agent";
        const accentRing = makeRing(0.54, color, 0.32);
        accentRing.rotation.x = Math.PI / 2;
        accentRing.position.y = 0.035;
        handle.group.add(accentRing);
        const hitTarget = new Three.Mesh(
          new Three.SphereGeometry(0.72, 12, 8),
          translucentBasicMaterial(color, 0.001),
        );
        hitTarget.name = `${remoteAvatarTargetPrefix}${definition.id}:hit`;
        hitTarget.position.y = 0.92;
        handle.group.add(hitTarget);

        const interpolator = createMmoEntityTransformInterpolator(
          normalizeMmoEntityTransformSnapshot(
            remoteAvatarTransformInput(definition),
          ),
          resolved.remoteAvatarInterpolation,
        );
        const selection = trainingRunRemoteAvatarSelection(definition);
        hitTargets.register({
          id: `${remoteAvatarTargetPrefix}${definition.id}`,
          kind: "mesh",
          object: hitTarget,
          recursive: false,
          value: selection,
        });
        handle.playAction(definition.animation ?? "idle");
        scene.add(handle.group);
        return {
          color,
          definition,
          handle,
          hitTarget,
          interpolator,
        };
      };

      const updateRemoteAvatars = (
        avatars: readonly TrainingRunRemoteAvatarDefinition[],
      ): void => {
        if (disposed) return;
        const activeIds = new Set(avatars.map((avatar) => avatar.id));
        for (const avatarId of [...remoteAvatars.keys()]) {
          if (!activeIds.has(avatarId)) disposeRemoteAvatar(avatarId);
        }
        for (const avatar of avatars) {
          const snapshot = normalizeMmoEntityTransformSnapshot(
            remoteAvatarTransformInput(avatar),
          );
          const existing = remoteAvatars.get(avatar.id);
          if (existing === undefined) {
            const entry = createRemoteAvatar(avatar);
            entry.interpolator.reset(snapshot);
            remoteAvatars.set(avatar.id, entry);
            continue;
          }
          existing.definition = avatar;
          existing.color = colorForRemoteAvatar(avatar);
          existing.interpolator.apply(snapshot);
          existing.handle.playAction(avatar.animation ?? "idle");
          hitTargets.register({
            id: `${remoteAvatarTargetPrefix}${avatar.id}`,
            kind: "mesh",
            object: existing.hitTarget,
            recursive: false,
            value: trainingRunRemoteAvatarSelection(avatar),
          });
        }
        syncRemoteAvatarKeyboardTargets();
      };

      const updateRemoteAvatarFrames = (delta: number): void => {
        for (const [avatarId, entry] of [...remoteAvatars.entries()]) {
          const liveness = entry.interpolator.liveness(Date.now());
          if (liveness === "despawn") {
            disposeRemoteAvatar(avatarId);
            continue;
          }
          const sample = entry.interpolator.update(delta * 1000);
          entry.handle.group.position.copy(sample.position);
          entry.handle.group.quaternion.copy(sample.quaternion);
          entry.handle.group.visible = true;
          const stale = entry.definition.stale === true || liveness === "stale";
          setRemoteAvatarOpacity(entry.handle.group, stale ? 0.35 : 1);
          entry.handle.playAction(
            sample.state === "run" || sample.state === "walk"
              ? sample.state
              : "idle",
          );
          entry.handle.update(delta);
        }
        syncRemoteAvatarKeyboardTargets();
      };

      updateRemoteAvatars(resolved.remoteAvatars);

      type WorldItemRuntime = {
        group: Three.Group;
        hitTarget: Three.Object3D;
        item: TrainingRunWorldItemDefinition;
        nodeTarget: TrainingRunNodeSelection;
        selection: TrainingRunWorldItemSelection;
        signature: string;
        worldPosition: Three.Vector3;
      };

      const worldItemTargetPrefix = "world-item:";
      const worldItemTargets = new Map<string, WorldItemRuntime>();

      const worldItemSignature = (
        item: TrainingRunWorldItemDefinition,
      ): string =>
        JSON.stringify({
          detail: item.detail,
          id: item.id,
          interactionRadius: item.interactionRadius,
          kind: item.kind,
          label: item.label,
          lines: item.lines,
          position: item.position,
          sourceRefs: item.sourceRefs,
          status: item.status,
          title: item.title,
          yaw: item.yaw,
        });

      const worldItemDescriptor = (
        item: TrainingRunWorldItemDefinition,
      ): SceneNodeDescriptor<TrainingRunWorldItemKind, TrainingRunWorldItemDefinition> => ({
        id: item.id,
        kind: item.kind,
        props: item,
      });

      const disposeWorldItemRuntime = (runtime: WorldItemRuntime): void => {
        worldItemTargets.delete(runtime.item.id);
        hitTargets.remove(`${worldItemTargetPrefix}${runtime.item.id}`);
        removeKeyboardTargets((id) => id === runtime.nodeTarget.id);
        if (selectedTargetId === runtime.nodeTarget.id) {
          setSelectedTarget(undefined);
        }
        disposeObject(runtime.group);
      };

      const createWorldItem = (
        item: TrainingRunWorldItemDefinition,
        _scope: SceneResourceScope,
      ): WorldItemRuntime | undefined => {
        if (item.kind !== "bulletin_board") return undefined;
        const group = makeTrainingRunBulletinBoard(item);
        const selection = trainingRunWorldItemSelection(item);
        const nodeTarget = trainingRunWorldItemNodeSelection(item);
        const color = colorForStatus(item.status ?? "active");
        const worldPosition = vector(item.position);
        root.updateMatrixWorld(true);
        root.localToWorld(worldPosition);
        registerKeyboardTarget(item.position, nodeTarget, color);

        const hitTarget = new Three.Mesh(
          new Three.BoxGeometry(3.28, 0.86, 2.18),
          translucentBasicMaterial(color, 0.001),
        );
        hitTarget.position.set(0, -0.2, 1.18);
        group.add(hitTarget);
        hitTargets.register({
          id: `${worldItemTargetPrefix}${item.id}`,
          kind: "mesh",
          object: hitTarget,
          recursive: false,
          value: nodeTarget,
        });
        const runtime = {
          group,
          hitTarget,
          item,
          nodeTarget,
          selection,
          signature: worldItemSignature(item),
          worldPosition,
        };
        worldItemTargets.set(item.id, runtime);
        return runtime;
      };

      const worldItemReconciler = createSceneNodeReconciler({
        root,
        scope: sceneScope,
        catalogue: {
          bulletin_board: {
            create: (descriptor, scope) => {
              const item =
                descriptor.props as TrainingRunWorldItemDefinition;
              const runtime = createWorldItem(item, scope);
              if (runtime === undefined) {
                throw new Error(`Unsupported world item kind: ${item.kind}`);
              }
              return {
                object: runtime.group,
                state: runtime,
                dispose: () => disposeWorldItemRuntime(runtime),
              };
            },
            update: (runtime, descriptor) => {
              const item =
                descriptor.props as TrainingRunWorldItemDefinition;
              const current = runtime.state as WorldItemRuntime | undefined;
              return current?.signature === worldItemSignature(item);
            },
          },
        },
      });

      const updateWorldItems = (
        items: readonly TrainingRunWorldItemDefinition[],
      ): void => {
        if (disposed) return;
        worldItemReconciler.update(
          items
            .filter((item) => item.kind === "bulletin_board")
            .map(worldItemDescriptor),
        );
      };

      updateWorldItems(resolved.worldItems);

      const edges = createTrainingRunEdges(resolved.nodes);
      const nodeStatusById = new Map(
        resolved.nodes.map((node) => [node.id, node.status] as const),
      );
      const flowLines: Array<{
        line: Three.Line<Three.BufferGeometry, Three.LineDashedMaterial>;
        phase: number;
      }> = [];
      const pulses: Array<{
        mesh: Three.Object3D;
        phase: number;
        points: readonly Three.Vector3[];
      }> = [];

      for (const [index, edge] of edges.entries()) {
        const bend =
          edge.sourceId === "run" || edge.targetId === "run"
            ? 0
            : index % 2 === 0
              ? 0.24
              : -0.18;
        const points = curvedEdgePoints(edge.source, edge.target, bend);
        const edgeColor = colorForStatus(
          nodeStatusById.get(edge.targetId) ?? "planned",
        );
        root.add(makeLine(points, edgeColor, perspectiveWalk ? 0.025 : 0.13));
        const flowLine = makeDashedLine(
          points,
          edgeColor,
          perspectiveWalk
            ? 0.08
            : animateStructuralEdges
              ? 0.58
              : 0.28,
          {
            dashSize: 0.18,
            gapSize: 0.14,
          },
        );
        root.add(flowLine);
        if (animateStructuralEdges) {
          flowLines.push({
            line: flowLine,
            phase: index / Math.max(edges.length, 1),
          });
        }
        const startAnchor = makeCircle(
          0.018,
          edgeColor,
          perspectiveWalk ? 0.14 : 0.5,
        );
        startAnchor.position.copy(points[0]!);
        startAnchor.position.z = 0.3;
        root.add(startAnchor);
        const endAnchor = makeCircle(
          0.018,
          edgeColor,
          perspectiveWalk ? 0.14 : 0.5,
        );
        endAnchor.position.copy(points.at(-1)!);
        endAnchor.position.z = 0.3;
        root.add(endAnchor);
        if (animateStructuralEdges && !perspectiveWalk) {
          const pulse = makeCircle(0.035, 0xffffff, 0.95);
          pulse.position.copy(
            pointOnPoints(points, index / Math.max(edges.length, 1)),
          );
          pulse.position.z = 0.35;
          root.add(pulse);
          pulses.push({
            mesh: pulse,
            phase: index / Math.max(edges.length, 1),
            points,
          });
        }
      }

      for (const node of resolved.nodes) {
        const group = new Three.Group();
        const statusColor = colorForStatus(node.status);
        const selection = nodeSelection(node);
        group.position.copy(vector(node.position));
        registerKeyboardTarget(node.position, selection, statusColor);

        const compactStageNode =
          resolved.stageNodeGlyph === "compact_gate" && node.role !== "run";
        if (compactStageNode) {
          const hitTarget = makeCircle(0.34, statusColor, 0.001);
          hitTarget.position.z = 0.62;
          group.add(hitTarget);
          hitTargets.register({
            id: `node:${node.id}`,
            kind: "mesh",
            object: hitTarget,
            recursive: false,
            value: selection,
          });

          group.add(
            makeLine(
              [
                new Three.Vector3(-0.26, 0, 0.56),
                new Three.Vector3(0.26, 0, 0.56),
              ],
              statusColor,
              0.42,
            ),
          );
          const labelText = visibleWorldLabelText(selection, 16);
          let labelAnchor: Three.Vector3 | undefined;
          if (trainingRunSelectionIsPylon(selection)) {
            const pylon = makeTrainingRunPylonLandmark(statusColor, {
              opacity: 0.88,
              scale: 0.58,
            });
            pylon.position.z = 0.52;
            group.add(pylon);
            labelAnchor = trainingRunHeadLabelPositionForObject(pylon, group, {
              margin: 0.06,
              worldHeight: 0.42,
            });
          } else {
            const marker = makeTrainingRunArtifactMarker(
              trainingRunArtifactKindForSelection(selection),
              statusColor,
              {
                opacity: node.status === "planned" ? 0.48 : 0.78,
                scale: node.role === "receipt" ? 0.7 : 0.62,
              },
            );
            marker.position.z = 0.42;
            group.add(marker);
          }

          if (labelText !== undefined) {
            const label = makeTextSprite(labelText, {
              color: "#ffffff",
              fontSize: 21,
              width: 336,
            });
            label.position.copy(
              labelAnchor ?? new Three.Vector3(0, -0.18, 0.55),
            );
            group.add(label);
          }

          if (resolved.worldLabelDensity === "full") {
            const detail = makeTextSprite(node.detail, {
              color: "#a3a3a3",
              fontSize: 16,
              width: 384,
            });
            detail.position.set(0, -0.42, 0.55);
            group.add(detail);
          }

          root.add(group);
          continue;
        }

        const radius =
          node.role === "run" ? 0.56 : node.role === "rung" ? 0.34 : 0.27;
        group.add(
          makeRing(radius, statusColor, node.role === "run" ? 0.58 : 0.38),
        );
        const hitTarget = makeCircle(radius * 0.92, statusColor, 0.001);
        hitTarget.position.z = 0.62;
        group.add(hitTarget);
        hitTargets.register({
          id: `node:${node.id}`,
          kind: "mesh",
          object: hitTarget,
          recursive: false,
          value: selection,
        });
        let labelAnchor: Three.Vector3 | undefined;
        if (trainingRunSelectionIsPylon(selection)) {
          const pylon = makeTrainingRunPylonLandmark(statusColor, {
            opacity: 0.88,
            scale: node.role === "run" ? 0.72 : 0.58,
          });
          pylon.position.z = 0.46;
          group.add(pylon);
          labelAnchor = trainingRunHeadLabelPositionForObject(pylon, group, {
            margin: node.role === "run" ? 0.07 : 0.06,
            worldHeight: 0.42,
          });
        } else {
          const marker = makeTrainingRunArtifactMarker(
            trainingRunArtifactKindForSelection(selection),
            statusColor,
            {
              opacity: node.status === "planned" ? 0.5 : 0.82,
              scale: node.role === "receipt" ? 0.92 : 0.78,
            },
          );
          marker.position.z = 0.08;
          group.add(marker);
        }

        const labelText = visibleWorldLabelText(
          selection,
          node.role === "run" ? 18 : 14,
        );
        if (labelText !== undefined) {
          const label = makeTextSprite(labelText, {
            color: "#ffffff",
            fontSize: node.role === "run" ? 32 : 28,
            width: node.role === "run" ? 512 : 384,
          });
          label.position.copy(
            labelAnchor ?? new Three.Vector3(0, -radius - 0.25, 0.55),
          );
          group.add(label);
        }

        if (resolved.worldLabelDensity === "full") {
          const detail = makeTextSprite(node.detail, {
            color: "#a3a3a3",
            fontSize: 22,
            width: 448,
          });
          detail.position.set(0, -radius - 0.58, 0.55);
          group.add(detail);
        }

        root.add(group);
      }

      const contributorGroup = new Three.Group();
      contributorGroup.position.set(-0.15, 0.28, 0.4);
      for (const contributor of resolved.contributors) {
        const angle = contributor.phase * Math.PI * 2;
        const radius =
          contributor.lifecycleState === "sync_reentry" ? 1.45 : 1.22;
        const position = new Three.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          0,
        );
        let contributorLabelAnchor: Three.Vector3 | undefined;
        if (
          trainingRunSelectionIsPylon({
            id: contributor.id,
            label: contributor.label,
          })
        ) {
          const pylon = makeTrainingRunPylonLandmark(0xffffff, {
            opacity: contributor.lifecycleState === "sync_reentry" ? 0.48 : 0.78,
            scale: contributor.lifecycleState === "active" ? 0.33 : 0.27,
          });
          pylon.position.copy(position);
          contributorGroup.add(pylon);
          contributorLabelAnchor = trainingRunHeadLabelPositionForObject(
            pylon,
            contributorGroup,
            {
              margin: 0.05,
              worldHeight: 0.42,
            },
          );
        } else {
          const dot = makeCircle(
            contributor.lifecycleState === "active" ? 0.065 : 0.045,
            0xffffff,
            contributor.lifecycleState === "sync_reentry" ? 0.45 : 0.88,
          );
          dot.position.copy(position);
          contributorGroup.add(dot);
        }

        if (resolved.worldLabelDensity !== "pylons") {
          const label = makeTextSprite(contributor.label, {
            color: "#d4d4d4",
            fontSize: 18,
            height: 80,
            width: 220,
          });
          label.position.copy(
            contributorLabelAnchor ??
              new Three.Vector3(position.x, position.y - 0.16, 0.3),
          );
          contributorGroup.add(label);
        }
      }
      root.add(contributorGroup);

      const lossPoints = lossCurvePoints(resolved.lossCurve);
      const lossDomain = lossCurveDomain(resolved.lossCurve);
      if (showLossPanel) {
        const lossPanel = makeRect(
          lossChartLayout.width + 0.28,
          lossChartLayout.height + 0.26,
          0xffffff,
          0.035,
        );
        lossPanel.position.set(
          lossChartLayout.origin.x + lossChartLayout.width / 2,
          lossChartLayout.origin.y + lossChartLayout.height / 2,
          0.03,
        );
        root.add(lossPanel);
        for (let index = 0; index <= 4; index += 1) {
          const x =
            lossChartLayout.origin.x + (lossChartLayout.width / 4) * index;
          root.add(
            makeLine(
              [
                new Three.Vector3(x, lossChartLayout.origin.y, 0.08),
                new Three.Vector3(
                  x,
                  lossChartLayout.origin.y + lossChartLayout.height,
                  0.08,
                ),
              ],
              0xffffff,
              index === 0 || index === 4 ? 0.16 : 0.06,
            ),
          );
        }
        for (let index = 0; index <= 3; index += 1) {
          const y =
            lossChartLayout.origin.y + (lossChartLayout.height / 3) * index;
          root.add(
            makeLine(
              [
                new Three.Vector3(lossChartLayout.origin.x, y, 0.08),
                new Three.Vector3(
                  lossChartLayout.origin.x + lossChartLayout.width,
                  y,
                  0.08,
                ),
              ],
              0xffffff,
              index === 0 || index === 3 ? 0.16 : 0.06,
            ),
          );
        }
        if (lossDomain !== undefined) {
          const topTick = makeTextSprite(formatLossTick(lossDomain.maxLoss), {
            color: "#a3a3a3",
            fontSize: 16,
            height: 80,
            width: 180,
            worldHeight: 0.16,
          });
          topTick.position.set(
            lossChartLayout.origin.x - 0.18,
            lossChartLayout.origin.y + lossChartLayout.height,
            0.4,
          );
          root.add(topTick);
          const bottomTick = makeTextSprite(
            formatLossTick(lossDomain.minLoss),
            {
              color: "#a3a3a3",
              fontSize: 16,
              height: 80,
              width: 180,
              worldHeight: 0.16,
            },
          );
          bottomTick.position.set(
            lossChartLayout.origin.x - 0.18,
            lossChartLayout.origin.y,
            0.4,
          );
          root.add(bottomTick);
          const stepTick = makeTextSprite(`${lossDomain.maxStep} step`, {
            color: "#a3a3a3",
            fontSize: 16,
            height: 80,
            width: 220,
            worldHeight: 0.16,
          });
          stepTick.position.set(
            lossChartLayout.origin.x + lossChartLayout.width,
            lossChartLayout.origin.y - 0.18,
            0.4,
          );
          root.add(stepTick);
        }
        if (lossPoints.length > 1) {
          const area = makeAreaUnderCurve(
            lossPoints,
            lossChartLayout.origin.y,
            0xb9e6ff,
            0.12,
          );
          if (area !== undefined) {
            area.position.z = 0.05;
            root.add(area);
          }
          root.add(
            makeDashedLine(lossPoints, 0xffffff, 0.82, {
              dashSize: 0.08,
              gapSize: 0.045,
            }),
          );
          for (const point of lossPoints) {
            const dot = makeCircle(0.03, 0xffffff, 0.9);
            dot.position.copy(point);
            dot.position.z = 0.28;
            root.add(dot);
          }
        }
        const lossLabel = makeTextSprite("loss curve", {
          color: "#d1d5db",
          fontSize: 24,
          width: 260,
        });
        lossLabel.position.set(3.2, -0.68, 0.45);
        root.add(lossLabel);
      }
      if (showStatusChart) {
        root.add(createStatusMiniChart(resolved.nodes));
      }

      if (resolved.operatorSignals.length > 0) {
        const operatorGroup = new Three.Group();
        operatorGroup.position.set(-3.75, 2.92, 0.5);
        operatorGroup.add(
          makeLine(
            [new Three.Vector3(0, -0.1, 0), new Three.Vector3(7.5, -0.1, 0)],
            0xffffff,
            0.1,
          ),
        );
        const title = makeTextSprite("operator commands", {
          color: "#d1d5db",
          fontSize: 20,
          height: 80,
          width: 320,
        });
        title.position.set(0.78, 0.18, 0.2);
        operatorGroup.add(title);

        for (const [index, signal] of resolved.operatorSignals
          .slice(0, 6)
          .entries()) {
          const x = 1.15 + index * 1.05;
          const color = colorForOperatorSignal(signal.state);
          const ring = makeRing(0.095, color, 0.48);
          ring.position.set(x, -0.1, 0.1);
          operatorGroup.add(ring);
          const dot = makeCircle(
            0.035,
            color,
            signal.state === "idle" ? 0.5 : 0.92,
          );
          dot.position.set(x, -0.1, 0.2);
          operatorGroup.add(dot);
          const label = makeTextSprite(signal.label, {
            color: "#ffffff",
            fontSize: 16,
            height: 80,
            width: 220,
          });
          label.position.set(x, -0.31, 0.22);
          operatorGroup.add(label);
          const detail = makeTextSprite(signal.detail, {
            color: "#a3a3a3",
            fontSize: 14,
            height: 80,
            width: 260,
          });
          detail.position.set(x, -0.52, 0.22);
          operatorGroup.add(detail);
        }
        root.add(operatorGroup);
      }

      if (resolved.promiseSignals.length > 0) {
        const signalGroup = new Three.Group();
        signalGroup.position.set(-4.45, -2.82, 0.48);
        signalGroup.add(
          makeLine(
            [new Three.Vector3(0, 0.18, 0), new Three.Vector3(8.9, 0.18, 0)],
            0xffffff,
            0.12,
          ),
        );
        const title = makeTextSprite("promise registry", {
          color: "#d1d5db",
          fontSize: 22,
          height: 80,
          width: 300,
        });
        title.position.set(0.72, 0.5, 0.2);
        signalGroup.add(title);

        for (const [index, signal] of resolved.promiseSignals
          .slice(0, 7)
          .entries()) {
          const x = 1.05 + index * 1.1;
          const color = colorForPromiseSignal(signal.state);
          const ring = makeRing(0.11, color, 0.5);
          ring.position.set(x, 0.18, 0.1);
          signalGroup.add(ring);
          const dot = makeCircle(0.04, color, 0.92);
          dot.position.set(x, 0.18, 0.2);
          signalGroup.add(dot);
          const label = makeTextSprite(signal.label, {
            color: "#ffffff",
            fontSize: 18,
            height: 80,
            width: 240,
          });
          label.position.set(x, -0.09, 0.22);
          signalGroup.add(label);
          const detail = makeTextSprite(
            `${signal.state} / ${signal.blockerCount} blk / ${signal.evidenceRefCount} refs`,
            {
              color: "#a3a3a3",
              fontSize: 15,
              height: 80,
              width: 320,
            },
          );
          detail.position.set(x, -0.32, 0.22);
          signalGroup.add(detail);
        }
        root.add(signalGroup);
      }

      // ---------------------------------------------------------------------
      // Entity layer (optional): Pylon contributors, verification beams, and
      // settlement bursts. Absent/empty arrays render nothing extra.
      // ---------------------------------------------------------------------
      const entityPositions = resolveTrainingRunEntityPositions(
        resolved.entities,
      );
      const visualEntities = uniqueTrainingRunEntities(resolved.entities);
      const entityLabels: TextLabelHandle[] = [];
      const flowBeams: Array<{ update: (deltaSeconds: number) => void }> = [];
      const beamDisposers: Array<() => void> = [];
      type BurstHandle = ReturnType<typeof createPayoutBurst>;
      const burstSlots: Array<{
        handle: BurstHandle;
        at: TrainingRunVector;
        seed: number;
      }> = [];
      let entityPool: ReturnType<typeof createEntityPool> | undefined;
      let entityPresence: ReturnType<typeof bindEntityPresence> | undefined;

      if (visualEntities.length > 0) {
        const pool = createEntityPool({
          capacity: visualEntities.length,
          geometry: new Three.CircleGeometry(0.085, 24),
          scale: 1,
        });
        pool.mesh.position.z = 0.36;
        entityPool = pool;

        const presence = bindEntityPresence(pool, {
          interpolateMs: 0,
          statusColor: (status) => colorForEntityStatus(status),
        });
        presence.apply(
          visualEntities.map((entity) => ({
            id: entity.id,
            position: entityPositions.get(entity.id) ?? [0, 0, 0],
            status: entity.status,
          })),
        );
        entityPresence = presence;

        for (const entity of visualEntities) {
          const position = entityPositions.get(entity.id) ?? [0, 0, 0];
          const color = colorForEntityStatus(entity.status);
          const selection = trainingRunEntitySelection(entity);
          registerKeyboardTarget(position, selection, color);
          const ring = makeRing(0.14, color, 0.42);
          ring.position.set(position[0], position[1], position[2] - 0.02);
          root.add(ring);
          let labelAnchor: Three.Vector3 | undefined;
          if (trainingRunSelectionIsPylon(selection)) {
            const pylon = makeTrainingRunPylonLandmark(color, {
              opacity: 0.84,
              scale: 0.52,
            });
            pylon.position.set(position[0], position[1], position[2] + 0.08);
            root.add(pylon);
            labelAnchor = trainingRunHeadLabelPositionForObject(pylon, root, {
              margin: 0.04,
              worldHeight: 0.2,
            });
          } else {
            const marker = makeTrainingRunArtifactMarker(
              trainingRunArtifactKindForSelection(selection),
              color,
              {
                opacity: entity.status === "planned" ? 0.42 : 0.72,
                scale: 0.54,
              },
            );
            marker.position.set(position[0], position[1], position[2] + 0.02);
            root.add(marker);
          }

          const hitTarget = makeCircle(0.16, color, 0.001);
          hitTarget.position.set(position[0], position[1], position[2] + 0.34);
          root.add(hitTarget);
          hitTargets.register({
            id: `entity:${entity.id}`,
            kind: "mesh",
            object: hitTarget,
            recursive: false,
            value: selection,
          });

          if (entity.label !== undefined) {
            const labelText = visibleWorldLabelText(selection, 18);
            if (labelText === undefined) continue;
            const label = createTextLabel({
              text: labelText,
              color: "#e5e7eb",
              fontSize: 36,
              worldHeight: 0.2,
              position:
                labelAnchor === undefined
                  ? [position[0], position[1] - 0.26, position[2] + 0.26]
                  : [labelAnchor.x, labelAnchor.y, labelAnchor.z],
              billboard: true,
            });
            label.faceCamera(camera);
            root.add(label.object3D);
            entityLabels.push(label);
          }
        }
      }

      for (const beam of resolved.beams) {
        if (!motionAllowedByPolicy(beam, resolved.motionPolicy)) continue;
        const from = entityPositions.get(beam.fromId);
        const to = entityPositions.get(beam.toId);
        if (from === undefined || to === undefined) continue;
        const handle = createFlowBeam({
          from,
          to,
          color: 0xb9e6ff,
          rate: 0.7,
          pulseCount: 3,
          bend: 0.18,
          opacity: 0.32,
        });
        root.add(handle.object3D);
        flowBeams.push({ update: handle.update });
        beamDisposers.push(handle.dispose);
      }

      const makeBurst = (at: TrainingRunVector, seed: number): BurstHandle =>
        createPayoutBurst({
          at: [at[0], at[1], at[2] + 0.4],
          color: 0xb7f7d4,
          count: 36,
          duration: 1.1,
          spread: 0.7,
          seed,
        });

      for (const [index, burst] of resolved.bursts.entries()) {
        if (!motionAllowedByPolicy(burst, resolved.motionPolicy)) continue;
        const at = entityPositions.get(burst.atId);
        if (at === undefined) continue;
        const seed = index + 1;
        const handle = makeBurst(at, seed);
        root.add(handle.object3D);
        burstSlots.push({ handle, at, seed });
      }

      let walkController: WasdMouseLookControllerHandle | undefined;
      let threePlayerController: ThreePlayerControllerHandle | undefined;
      let threePlayerAvatar: ThreePlayerAvatarAnimationHandle | undefined;
      let threePlayerAction: ThreePlayerControllerAvatarAction = "idle";
      const localPoseEuler = new Three.Euler(0, 0, 0, "YXZ");
      const centerReticle =
        perspectiveWalk && camera instanceof Three.PerspectiveCamera
          ? makeCenterReticle()
          : undefined;
      if (centerReticle !== undefined) camera.add(centerReticle);
      if (
        perspectiveWalk &&
        resolved.controller === "wasd_mouselook" &&
        camera instanceof Three.PerspectiveCamera
      ) {
        const onLockChange = resolved.walkController.onLockChange;
        walkController = Effect.runSync(
          createWasdMouseLookController(camera, canvas, {
            initialPosition: [0, 1.65, 6.25],
            bounds: {
              minX: -22,
              maxX: 22,
              minZ: -136,
              maxZ: 136,
            },
            ...resolved.walkController,
            onLockChange: (locked) => {
              canvas.style.cursor = locked ? "none" : "default";
              if (centerReticle !== undefined) centerReticle.visible = locked;
              onLockChange?.(locked);
            },
          }),
        );
        sceneScope.add(() => {
          if (walkController !== undefined) {
            Effect.runSync(walkController.dispose);
          }
        });
      }
      if (
        perspectiveWalk &&
        resolved.controller === "third_person_character" &&
        camera instanceof Three.PerspectiveCamera
      ) {
        threePlayerAvatar = makeThreePlayerAvatar();
        scene.add(threePlayerAvatar.group);
        const externalActionChange =
          resolved.thirdPersonController.onActionChange;
        threePlayerController = Effect.runSync(
          createThreePlayerController(camera, threePlayerAvatar.group, canvas, {
            initialPosition: [0, 0, 4.4],
            character: {
              bounds: {
                minX: -22,
                maxX: 22,
                minZ: -136,
                maxZ: 136,
              },
            },
            ...resolved.thirdPersonController,
            onActionChange: (action) => {
              threePlayerAction = action;
              threePlayerAvatar?.playAction(action);
              externalActionChange?.(action);
            },
          }),
        );
        sceneScope.add(() => {
          if (threePlayerController !== undefined) {
            Effect.runSync(threePlayerController.dispose);
          }
        });
      }

      const pointerLockActive = (): boolean =>
        walkController?.controls.isLocked === true ||
        canvas.ownerDocument.pointerLockElement === canvas;

      const targetOrigin = (): TrainingRunVector => {
        if (threePlayerController !== undefined) {
          const position = Effect.runSync(threePlayerController.getPosition);
          return [position.x, position.y, position.z];
        }
        if (walkController !== undefined) {
          const position = Effect.runSync(walkController.getPosition);
          return [position.x, position.y, position.z];
        }
        return [camera.position.x, camera.position.y, camera.position.z];
      };
      const yawForObject = (object: Three.Object3D): number => {
        localPoseEuler.setFromQuaternion(object.quaternion, "YXZ");
        return localPoseEuler.y;
      };
      const captureLocalPose = (): TrainingRunLocalPoseSnapshot | undefined => {
        if (threePlayerController !== undefined) {
          const position = Effect.runSync(threePlayerController.getPosition);
          return {
            controller: "third_person_character",
            position: [position.x, position.y, position.z],
            yaw:
              threePlayerAvatar === undefined
                ? 0
                : yawForObject(threePlayerAvatar.group),
            action: threePlayerAction,
            capturedAtMs: Date.now(),
          };
        }
        if (walkController !== undefined) {
          const position = Effect.runSync(walkController.getPosition);
          return {
            controller: "wasd_mouselook",
            position: [position.x, position.y, position.z],
            yaw: camera.rotation.y,
            action: "idle",
            capturedAtMs: Date.now(),
          };
        }
        return undefined;
      };
      let lastLocalPoseEmitMs = 0;
      const emitLocalPose = (time: number): void => {
        if (resolved.onLocalPoseChange === undefined) return;
        if (time - lastLocalPoseEmitMs < 100) return;
        const pose = captureLocalPose();
        if (
          pose === undefined ||
          pose.yaw === undefined ||
          pose.action === undefined ||
          pose.capturedAtMs === undefined
        ) {
          return;
        }
        lastLocalPoseEmitMs = time;
        resolved.onLocalPoseChange({
          controller: pose.controller,
          position: pose.position,
          yaw: pose.yaw,
          action: pose.action,
          capturedAtMs: pose.capturedAtMs,
        });
      };
      let currentPresenceZone: TrainingRunPresenceZone | null | undefined;
      const emitPresenceZone = (
        zone: TrainingRunPresenceZone | null,
      ): void => {
        if (zone === currentPresenceZone) return;
        currentPresenceZone = zone;
        resolved.onPresenceZoneChange?.(zone);
      };
      const updatePresenceZone = (): void => {
        emitPresenceZone(
          perspectiveWalk
            ? trainingRunPresenceZoneForPosition(targetOrigin())
            : "tassadar_area",
        );
      };
      let currentWorldItemProximityId: string | null | undefined;
      const emitWorldItemProximity = (
        selection: TrainingRunWorldItemSelection | null,
      ): void => {
        const nextId = selection?.id ?? null;
        if (nextId === currentWorldItemProximityId) return;
        currentWorldItemProximityId = nextId;
        resolved.onWorldItemProximityChange?.(selection);
      };
      const updateWorldItemProximity = (): void => {
        if (worldItemTargets.size === 0) {
          emitWorldItemProximity(null);
          return;
        }
        const origin = vector(targetOrigin());
        const nearest = [...worldItemTargets.values()]
          .map((target) => {
            const radius = Math.max(0, target.item.interactionRadius ?? 2.2);
            const distance = target.worldPosition.distanceTo(origin);
            return { distance, radius, target };
          })
          .filter(({ distance, radius }) => distance <= radius)
          .sort((left, right) => {
            if (left.distance !== right.distance) {
              return left.distance - right.distance;
            }
            return left.target.item.id.localeCompare(right.target.item.id);
          })[0];
        emitWorldItemProximity(nearest?.target.selection ?? null);
      };

      const updateVisualization = (
        options: TrainingRunVisualizationOptions,
      ): boolean => {
        if (disposed) return false;
        if (!canRetainTrainingRunVisualization(resolved, options)) {
          return false;
        }
        resolved = resolveTrainingRunVisualizationOptions(options);
        updateRemoteAvatars(resolved.remoteAvatars);
        updateWorldItems(resolved.worldItems);
        currentWorldItemProximityId = undefined;
        updatePresenceZone();
        updateWorldItemProximity();
        return true;
      };

      const selectNextTarget = (
        direction: 1 | -1 = 1,
      ): TrainingRunNodeSelection | undefined => {
        const target = cycleTrainingRunCameraTarget(
          keyboardTargets.map((entry) => entry.candidate),
          {
            camera,
            currentId: selectedTargetId,
            direction,
            maxTargets: resolved.keyboardTargeting.maxTargets,
            origin: targetOrigin(),
          },
        );
        const entry =
          target === undefined
            ? undefined
            : keyboardTargets.find(
                (candidate) => candidate.candidate.id === target.id,
              );
        const selection = setSelectedTarget(entry);
        if (selection !== undefined) resolved.onNodeClick?.(selection);
        return selection;
      };

      const selectionAtPointer = (
        event?: MouseEvent | PointerEvent,
      ): TrainingRunNodeSelection | undefined => {
        if (pointerLockActive()) {
          pointer.set(0, 0);
        } else {
          if (event === undefined) return undefined;
          const rect = canvas.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return undefined;
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
        }
        raycaster.setFromCamera(pointer, camera);
        return raycastHitTargetRegistry(raycaster, hitTargets)[0]?.target.value;
      };

      const handlePointerMove = (event: PointerEvent) => {
        if (pointerLockActive()) {
          canvas.style.cursor = "none";
          return;
        }
        canvas.style.cursor =
          selectionAtPointer(event) === undefined ? "default" : "pointer";
      };

      const handlePointerLeave = () => {
        canvas.style.cursor = "default";
      };

      const emitSelection = (
        selection: TrainingRunNodeSelection | undefined,
      ): boolean => {
        if (selection === undefined) return false;
        setSelectedTarget(
          keyboardTargets.find(
            (target) => target.candidate.selection.id === selection.id,
          ),
        );
        resolved.onNodeClick?.(selection);
        return true;
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        const direction = trainingRunKeyboardTargetingDirectionFromEvent(
          event,
          resolved.keyboardTargeting,
        );
        if (direction === undefined) return;
        event.preventDefault();
        event.stopPropagation();
        selectNextTarget(direction);
        canvas.focus({ preventScroll: true });
      };

      const handlePointerDown = (event: PointerEvent) => {
        if (!pointerLockActive()) return;
        const selection = selectionAtPointer(event);
        const intent = trainingRunPointerClickIntent({
          button: event.button,
          pointerLocked: true,
          selection,
          walkControllerEnabled: walkController !== undefined,
        });
        if (intent === "select") {
          event.preventDefault();
          emitSelection(selection);
          return;
        }
        event.preventDefault();
      };

      const handleClick = (event: MouseEvent) => {
        const pointerLocked = pointerLockActive();
        if (pointerLocked) {
          event.preventDefault();
          return;
        }
        const selection = selectionAtPointer(event);
        const intent = trainingRunPointerClickIntent({
          button: event.button,
          pointerLocked,
          selection,
          walkControllerEnabled: walkController !== undefined,
        });
        if (intent === "select") {
          event.preventDefault();
          emitSelection(selection);
          return;
        }
        if (intent === "lock" && walkController !== undefined) {
          event.preventDefault();
          Effect.runSync(walkController.lock);
          return;
        }
      };

      addScopedEventListener(
        sceneScope,
        canvas,
        "pointermove",
        handlePointerMove as EventListener,
      );
      addScopedEventListener(sceneScope, canvas, "pointerleave", handlePointerLeave);
      addScopedEventListener(
        sceneScope,
        canvas,
        "pointerdown",
        handlePointerDown as EventListener,
      );
      addScopedEventListener(
        sceneScope,
        canvas,
        "click",
        handleClick as EventListener,
      );
      addScopedEventListener(
        sceneScope,
        window,
        "keydown",
        handleKeyDown as EventListener,
        { capture: true },
      );

      const frameClock = createManagedFrameClock({ mode: "always" });
      sceneScope.add(frameClock.dispose);

      const resize = () => {
        const { width, height } = hostSize(element);
        renderer.setSize(width, height, false);
        const aspect = width / height;
        if (camera instanceof Three.PerspectiveCamera) {
          camera.aspect = aspect;
        } else {
          const viewHeight = 6.25;
          camera.left = (-viewHeight * aspect) / 2;
          camera.right = (viewHeight * aspect) / 2;
          camera.top = viewHeight / 2;
          camera.bottom = -viewHeight / 2;
        }
        camera.updateProjectionMatrix();
      };

      const render = ({ delta, time }: ManagedFrameClockFrame) => {
        if (disposed) return;
        if (animateAmbient) {
          if (staleRing !== undefined) {
            staleRing.rotation.z += delta * 0.18;
          }
          contributorOrbitGroup.rotation.z -= delta * 0.025;
          contributorGroup.rotation.z += delta * 0.07;
        }
        for (const flowLine of flowLines) {
          flowLine.line.material.scale =
            0.92 +
            Math.sin(time * 0.0018 + flowLine.phase * Math.PI * 2) * 0.08;
        }
        for (const pulse of pulses) {
          pulse.phase += delta * resolved.pulseSpeed;
          pulse.mesh.position.copy(pointOnPoints(pulse.points, pulse.phase));
          pulse.mesh.position.z = 0.35;
        }
        if (selectedTargetHighlight.visible) {
          const pulsePhase = 0.5 + Math.sin(time * 0.004) * 0.5;
          selectedTargetRing.scale.setScalar(1 + pulsePhase * 0.16);
          selectedTargetRing.material.opacity = 0.42 + pulsePhase * 0.3;
          selectedTargetBeacon.material.opacity = 0.62 + pulsePhase * 0.3;
          selectedTargetLight.intensity = 1.1 + pulsePhase * 0.8;
          if (selectedTargetLabel !== undefined) {
            selectedTargetLabel.lookAt(camera.position);
          }
        }
        for (const beam of flowBeams) {
          beam.update(delta);
        }
        for (const label of entityLabels) {
          label.faceCamera(camera);
        }
        for (const slot of burstSlots) {
          slot.handle.update(delta);
          if (resolved.motionPolicy.bursts === "loop" && slot.handle.done()) {
            // Re-arm the settlement burst so the pulse keeps marking the slot.
            slot.handle.dispose();
            const next = makeBurst(slot.at, slot.seed);
            root.add(next.object3D);
            slot.handle = next;
          }
        }
        if (walkController !== undefined) {
          Effect.runSync(walkController.update(delta));
          if (centerReticle !== undefined) {
            centerReticle.visible = walkController.controls.isLocked;
          }
        }
        if (threePlayerController !== undefined) {
          Effect.runSync(threePlayerController.update(delta));
        }
        updateRemoteAvatarFrames(delta);
        emitLocalPose(time);
        updatePresenceZone();
        updateWorldItemProximity();
        threePlayerAvatar?.update(delta);
        renderer.render(scene, camera);
      };

      const observer =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(() => resize());
      if (observer !== null) {
        sceneScope.add(() => observer.disconnect());
      }

      resize();
      observer?.observe(element);
      updatePresenceZone();
      updateWorldItemProximity();
      frameClock.subscribe(render);
      frameClock.start();

      const dispose = Effect.sync(() => {
        if (disposed) return;
        disposed = true;
        frameClock.dispose();
        for (const avatarId of [...remoteAvatars.keys()]) {
          disposeRemoteAvatar(avatarId);
        }
        worldItemReconciler.dispose();
        for (const label of entityLabels) label.dispose();
        for (const slot of burstSlots) slot.handle.dispose();
        for (const disposeBeam of beamDisposers) disposeBeam();
        entityPresence?.dispose();
        entityPool?.dispose();
        sceneScope.dispose();
      });

      return {
        element,
        canvas,
        captureLocalPose,
        updateVisualization,
        updateRemoteAvatars,
        selectNextTarget,
        resize: Effect.sync(resize),
        dispose,
      };
    },
    catch: (error) =>
      new TrainingRunMountError({
        reason: error instanceof Error ? error.message : String(error),
      }),
  });
