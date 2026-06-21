import { Data, Effect } from "effect";
import * as Three from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { createEntityPool } from "./entityPoolPrimitives";
import { createFlowBeam, createPayoutBurst } from "./flowEffectPrimitives";
import {
  createThreePlayerController,
  createWasdMouseLookController,
  type ThreePlayerControllerHandle,
  type ThreePlayerControllerOptions,
  type WasdMouseLookControllerHandle,
  type WasdMouseLookControllerOptions,
} from "./playerControllerPrimitives";
import { bindEntityPresence } from "./presenceBindingPrimitives";
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

export type TrainingRunKeyboardTargeting = Readonly<{
  enabled?: boolean;
  maxTargets?: number;
}>;

export type TrainingRunEntitySelection = Pick<
  TrainingRunEntityDefinition,
  "id" | "label" | "position" | "status"
>;

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
  beams: readonly TrainingRunBeamDefinition[];
  bursts: readonly TrainingRunBurstDefinition[];
  motionPolicy: Required<TrainingRunMotionPolicy>;
  stageNodeGlyph: TrainingRunStageNodeGlyph;
  sceneChrome: Required<TrainingRunSceneChrome>;
  worldLabelDensity: TrainingRunWorldLabelDensity;
  keyboardTargeting: Required<TrainingRunKeyboardTargeting>;
  thirdPersonController: ThreePlayerControllerOptions;
  walkController: WasdMouseLookControllerOptions;
  onNodeClick?: (node: TrainingRunNodeSelection) => void;
  pulseSpeed: number;
}>;

export type TrainingRunVisualizationHandle = Readonly<{
  element: HTMLElement;
  canvas: HTMLCanvasElement;
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
): Required<TrainingRunKeyboardTargeting> => ({
  ...defaultTrainingRunVisualizationOptions.keyboardTargeting,
  ...(targeting ?? {}),
});

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

  return options.onNodeClick === undefined
    ? resolved
    : { ...resolved, onNodeClick: options.onNodeClick };
};

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

export type TrainingRunTargetCandidate = Readonly<{
  id: string;
  position: TrainingRunVector;
  selection: TrainingRunNodeSelection;
}>;

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

export const metaverseStreetSourceRefs = [
  "Snow Crash / Metaverse: a persistent city organized around The Street",
] as const;

export const metaverseStreetParcelPositions = (
  countPerSide = 8,
): readonly Three.Vector3[] => {
  const count = Math.max(0, Math.floor(countPerSide));
  const positions: Three.Vector3[] = [];
  for (let index = 0; index < count; index += 1) {
    const z = -10.8 + index * 1.08;
    const stagger = index % 2 === 0 ? 0 : 0.22;
    positions.push(new Three.Vector3(-5.1 - stagger, 0, z));
    positions.push(new Three.Vector3(5.1 + stagger, 0, z));
  }
  return positions;
};

export const makeMetaverseStreetDistrict = (): Three.Group => {
  const group = new Three.Group();
  group.name = "the-street-district";
  group.userData["sourceRefs"] = metaverseStreetSourceRefs;

  const road = makeHorizontalPlane(3.4, 12.8, 0x0b1014, 0.94);
  road.position.set(0, -0.255, -7.5);
  group.add(road);

  const median = makeHorizontalPlane(0.16, 12.4, 0xfff3a3, 0.42);
  median.position.set(0, -0.248, -7.5);
  group.add(median);

  for (const x of [-1.72, 1.72]) {
    group.add(
      makeLine(
        [new Three.Vector3(x, -0.235, -13.8), new Three.Vector3(x, -0.235, -1.25)],
        0x8ef6ff,
        0.42,
      ),
    );
  }

  for (let index = 0; index < 14; index += 1) {
    const z = -13.45 + index * 0.86;
    const stripe = makeHorizontalPlane(0.09, 0.36, 0xffffff, 0.42);
    stripe.position.set(0, -0.242, z);
    group.add(stripe);
  }

  for (const x of [-3.8, 3.8]) {
    const walk = makeHorizontalPlane(1.65, 12.2, 0x111827, 0.52);
    walk.position.set(x, -0.25, -7.5);
    group.add(walk);
    group.add(
      makeLine(
        [new Three.Vector3(x, -0.215, -13.55), new Three.Vector3(x, -0.215, -1.45)],
        0xb9e6ff,
        0.24,
      ),
    );
  }

  for (const [index, position] of metaverseStreetParcelPositions().entries()) {
    const side = position.x < 0 ? -1 : 1;
    const width = 0.55 + (index % 3) * 0.13;
    const height = 0.55 + (index % 5) * 0.28;
    const depth = 0.5 + (index % 4) * 0.11;
    const parcel = makeHorizontalPlane(1.25, 0.82, 0x1f2937, 0.38);
    parcel.position.set(position.x, -0.246, position.z);
    group.add(parcel);

    const building = new Three.Mesh(
      new Three.BoxGeometry(width, height, depth),
      new Three.MeshBasicMaterial({
        color: index % 4 === 0 ? 0x1d4ed8 : index % 4 === 1 ? 0x7c3aed : 0x155e75,
        opacity: 0.24 + (index % 3) * 0.08,
        transparent: true,
        depthWrite: false,
      }),
    );
    building.position.set(position.x + side * 0.08, height / 2 - 0.22, position.z);
    group.add(building);

    const frontage = makeLine(
      [
        new Three.Vector3(position.x - side * 0.48, 0.05, position.z - 0.28),
        new Three.Vector3(position.x - side * 0.48, 0.05, position.z + 0.28),
      ],
      0xff80b5,
      0.32,
    );
    group.add(frontage);
  }

  const arch = new Three.Group();
  arch.position.set(0, 0, -1.25);
  arch.add(makeLine([new Three.Vector3(-1.95, -0.2, 0), new Three.Vector3(-1.95, 1.25, 0)], 0xffffff, 0.42));
  arch.add(makeLine([new Three.Vector3(1.95, -0.2, 0), new Three.Vector3(1.95, 1.25, 0)], 0xffffff, 0.42));
  arch.add(makeLine([new Three.Vector3(-1.95, 1.25, 0), new Three.Vector3(1.95, 1.25, 0)], 0xffffff, 0.42));
  const sign = makeTextSprite("The Street", {
    color: "#f8fafc",
    fontSize: 34,
    height: 96,
    width: 360,
    worldHeight: 0.34,
  });
  sign.position.set(0, 1.55, 0);
  arch.add(sign);
  group.add(arch);

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

  const ring = makeRing(0.42, 0x8ef6ff, 0.34);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.03;
  group.add(ring);

  const loader = new GLTFLoader();
  let mixer: Three.AnimationMixer | undefined;
  let currentAction: Three.AnimationAction | undefined;
  let currentKey: ThreePlayerAvatarClipKey | undefined;
  let queuedGroundKey: ThreePlayerAvatarClipKey | undefined;
  const actions = new Map<ThreePlayerAvatarClipKey, Three.AnimationAction>();

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
    },
    undefined,
    (error) => {
      group.userData["modelLoadError"] =
        error instanceof Error ? error.message : String(error);
    },
  );

  return {
    group,
    playAction,
    update: (delta) => {
      mixer?.update(Math.max(0, Math.min(delta, 0.1)));
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
      const resolved = resolveTrainingRunVisualizationOptions(options);
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
      renderer.toneMappingExposure = perspectiveWalk ? 1.35 : 1;
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, resolved.pixelRatio),
      );

      const scene = new Three.Scene();
      if (perspectiveWalk) {
        const ambient = new Three.AmbientLight(0xffffff, 2.6);
        scene.add(ambient);
        const hemisphere = new Three.HemisphereLight(0xdceeff, 0x101923, 2.2);
        scene.add(hemisphere);
        const keyLight = new Three.DirectionalLight(0xffffff, 4.8);
        keyLight.position.set(2.8, 5.2, 4.4);
        scene.add(keyLight);
        const rimLight = new Three.DirectionalLight(0x7dd3fc, 1.8);
        rimLight.position.set(-4.5, 2.6, -2.2);
        scene.add(rimLight);
      }
      const camera = perspectiveWalk
        ? new Three.PerspectiveCamera(62, 1, 0.05, 120)
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
      const selectedTargetBeacon = makeCircle(0.085, 0x8ef6ff, 0.92);
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
        selectedTargetLabel = makeTextSprite(
          compactWorldLabel(
            `${target.candidate.selection.label} · ${target.candidate.selection.status}`,
            26,
          ),
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
        root.add(makeLine(points, edgeColor, 0.13));
        const flowLine = makeDashedLine(
          points,
          edgeColor,
          animateStructuralEdges ? 0.58 : 0.28,
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
        const startAnchor = makeCircle(0.022, edgeColor, 0.5);
        startAnchor.position.copy(points[0]!);
        startAnchor.position.z = 0.3;
        root.add(startAnchor);
        const endAnchor = makeCircle(0.022, edgeColor, 0.5);
        endAnchor.position.copy(points.at(-1)!);
        endAnchor.position.z = 0.3;
        root.add(endAnchor);
        if (animateStructuralEdges) {
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
          if (trainingRunSelectionIsPylon(selection)) {
            const pylon = makeTrainingRunPylonLandmark(statusColor, {
              opacity: 0.88,
              scale: 0.58,
            });
            pylon.position.z = 0.52;
            group.add(pylon);
          } else {
            const marker =
              node.status === "blocked"
                ? makeRing(0.08, statusColor, 0.6)
                : makeCircle(0.055, statusColor, 0.92);
            marker.position.z = 0.62;
            group.add(marker);
          }

          if (labelText !== undefined) {
            const label = makeTextSprite(labelText, {
              color: "#ffffff",
              fontSize: 21,
              width: 336,
            });
            label.position.set(0, -0.18, 0.55);
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
        if (trainingRunSelectionIsPylon(selection)) {
          const pylon = makeTrainingRunPylonLandmark(statusColor, {
            opacity: 0.88,
            scale: node.role === "run" ? 0.72 : 0.58,
          });
          pylon.position.z = 0.46;
          group.add(pylon);
        } else {
          group.add(makeCircle(radius * 0.32, statusColor, 0.95));
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
          label.position.set(0, -radius - 0.25, 0.55);
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
          label.position.set(position.x, position.y - 0.16, 0.3);
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
        if (resolved.worldLabelDensity !== "pylons") {
          root.add(pool.mesh);
        }
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
          if (trainingRunSelectionIsPylon(selection)) {
            const pylon = makeTrainingRunPylonLandmark(color, {
              opacity: 0.84,
              scale: 0.52,
            });
            pylon.position.set(position[0], position[1], position[2] + 0.08);
            root.add(pylon);
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
              position: [position[0], position[1] - 0.26, position[2] + 0.26],
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
              minX: -8,
              maxX: 8,
              minZ: -13.5,
              maxZ: 6.8,
            },
            ...resolved.walkController,
            onLockChange: (locked) => {
              canvas.style.cursor = locked ? "none" : "default";
              if (centerReticle !== undefined) centerReticle.visible = locked;
              onLockChange?.(locked);
            },
          }),
        );
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
                minX: -8,
                maxX: 8,
                minZ: -13.5,
                maxZ: 6.8,
              },
            },
            ...resolved.thirdPersonController,
            onActionChange: (action) => {
              threePlayerAvatar?.playAction(action);
              externalActionChange?.(action);
            },
          }),
        );
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
        if (!resolved.keyboardTargeting.enabled || event.key !== "Tab") return;
        event.preventDefault();
        event.stopPropagation();
        selectNextTarget(event.shiftKey ? -1 : 1);
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

      canvas.addEventListener("pointermove", handlePointerMove);
      canvas.addEventListener("pointerleave", handlePointerLeave);
      canvas.addEventListener("pointerdown", handlePointerDown);
      canvas.addEventListener("click", handleClick);
      window.addEventListener("keydown", handleKeyDown, { capture: true });

      let disposed = false;
      let frame = 0;
      let lastTime = 0;

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

      const render = (time: number) => {
        if (disposed) return;
        const delta = lastTime === 0 ? 0 : (time - lastTime) / 1000;
        lastTime = time;
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
        threePlayerAvatar?.update(delta);
        renderer.render(scene, camera);
        frame = requestAnimationFrame(render);
      };

      const observer =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(() => resize());

      resize();
      observer?.observe(element);
      frame = requestAnimationFrame(render);

      const dispose = Effect.sync(() => {
        if (disposed) return;
        disposed = true;
        cancelAnimationFrame(frame);
        observer?.disconnect();
        canvas.removeEventListener("pointermove", handlePointerMove);
        canvas.removeEventListener("pointerleave", handlePointerLeave);
        canvas.removeEventListener("pointerdown", handlePointerDown);
        canvas.removeEventListener("click", handleClick);
        window.removeEventListener("keydown", handleKeyDown, { capture: true });
        if (walkController !== undefined) {
          Effect.runSync(walkController.dispose);
        }
        if (threePlayerController !== undefined) {
          Effect.runSync(threePlayerController.dispose);
        }
        for (const label of entityLabels) label.dispose();
        for (const slot of burstSlots) slot.handle.dispose();
        for (const disposeBeam of beamDisposers) disposeBeam();
        entityPresence?.dispose();
        entityPool?.dispose();
        disposeObject(scene);
        renderer.dispose();
        canvas.remove();
      });

      return {
        element,
        canvas,
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
