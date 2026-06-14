import { Effect } from "effect"

import {
  mountTrainingRunVisualization,
  trainingRunVisualizationOptionsFromSnapshot,
} from "../../../packages/core/src/index"

const mount = document.getElementById("scene")

if (mount === null) {
  throw new Error("missing #scene mount")
}

const visualization = trainingRunVisualizationOptionsFromSnapshot({
  activeWindowCount: 1,
  assignedContributorCount: 8,
  blockerRefCount: 2,
  closeoutSatisfied: false,
  deviceObserved: 5,
  deviceRequired: 6,
  externalStatus: "observed",
  finalValidationLoss: 3.08,
  freivaldsRefCount: 3,
  gradientCloseoutRefCount: 2,
  lifecycleCounts: {
    active: 3,
    qualified: 2,
    registered: 2,
    state_synced: 1,
    sync_reentry: 1,
    warmup: 2,
  },
  maxAllowedStaleSteps: 5,
  maxValidationLoss: 3.5,
  operatorSignals: [
    {
      detail: "planned",
      id: "plan",
      label: "plan",
      state: "success",
    },
    {
      detail: "active",
      id: "activate",
      label: "activate",
      state: "success",
    },
    {
      detail: "claimed",
      id: "lease",
      label: "lease",
      state: "success",
    },
    {
      detail: "granted",
      id: "bootstrap",
      label: "bootstrap",
      state: "success",
    },
    {
      detail: "queueing",
      id: "closeout",
      label: "closeout",
      state: "info",
    },
    {
      detail: "idle",
      id: "reconcile",
      label: "reconcile",
      state: "idle",
    },
  ],
  pendingPayoutCount: 2,
  plannedWindowCount: 2,
  promiseSignals: [
    {
      blockerCount: 2,
      evidenceRefCount: 8,
      id: "training.model_ladder.v1",
      label: "model ladder",
      state: "yellow",
    },
    {
      blockerCount: 3,
      evidenceRefCount: 4,
      id: "training.marathon_operations.v1",
      label: "marathon ops",
      state: "red",
    },
    {
      blockerCount: 1,
      evidenceRefCount: 6,
      id: "training.public_distributed_training_run.v1",
      label: "public run",
      state: "yellow",
    },
    {
      blockerCount: 0,
      evidenceRefCount: 5,
      id: "training.verification_classes.v1",
      label: "verification",
      state: "green",
    },
  ],
  receiptRefCount: 7,
  reconciledWindowCount: 0,
  rejectedWorkCount: 1,
  runDetail: "run.cs336.a1.real_gradient.demo",
  runLabel: "pylon.first_real_model_training_run.v1",
  runState: "active",
  sealInFlight: true,
  sealedWindowCount: 1,
  settledPayoutSats: 0,
  verifiedWorkCount: 4,
})

const handle = Effect.runSync(mountTrainingRunVisualization(mount, visualization))

globalThis.addEventListener("pagehide", () => {
  Effect.runSync(handle.dispose)
})
