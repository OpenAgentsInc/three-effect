import { Effect, Schema as S } from "effect"
import { define as defineCustomElement } from "foldkit/customElement"
import type { Attribute, Html } from "foldkit/html"

import {
  mountBezierNodes,
  mountHudGallery,
  mountMokshaExperience,
  mountSpinningCube,
  mountTrainingRunVisualization,
  trainingRunVisualizationOptionsWithLocalPose,
  type MokshaOptions,
  type TrainingRunLocalPoseSnapshot,
  type TrainingRunLocalPoseUpdate,
  type TrainingRunNodeSelection,
  type TrainingRunPresenceZone,
  type TrainingRunVisualizationHandle,
  type TrainingRunVisualizationOptions,
  type TrainingRunWorldItemSelection,
} from "@openagentsinc/three-effect/core"

export const bezierNodesTagName = "oa-bezier-nodes"
export const mokshaTagName = "oa-moksha"
export const spinningCubeTagName = "oa-spinning-cube"
export const trainingRunTagName = "oa-training-run"
export const hudGalleryTagName = "oa-hud-gallery"

const bezierNodesElement = defineCustomElement({
  tag: bezierNodesTagName,
  properties: {},
  events: {},
})

const spinningCubeElement = defineCustomElement({
  tag: spinningCubeTagName,
  properties: {},
  events: {},
})

const hudGalleryElement = defineCustomElement({
  tag: hudGalleryTagName,
  properties: {},
  events: {},
})

const mokshaElement = defineCustomElement({
  tag: mokshaTagName,
  properties: {
    options: S.Unknown,
  },
  events: {},
})

const trainingRunElement = defineCustomElement({
  tag: trainingRunTagName,
  properties: {
    visualization: S.Unknown,
  },
  events: {
    "node-selected": S.Struct({
      detail: S.String,
      id: S.String,
      label: S.String,
      role: S.Literals(["lifecycle", "run", "proof", "receipt", "rung"]),
      status: S.Literals([
        "planned",
        "queued",
        "sync",
        "active",
        "sealed",
        "verified",
        "blocked",
      ]),
    }),
    "presence-zone-changed": S.Struct({
      zone: S.NullOr(S.Literal("tassadar_area")),
    }),
    "world-item-proximity-changed": S.Struct({
      item: S.NullOr(
        S.Struct({
          detail: S.String,
          id: S.String,
          kind: S.Literal("bulletin_board"),
          label: S.String,
          status: S.Literals([
            "planned",
            "queued",
            "sync",
            "active",
            "sealed",
            "verified",
            "blocked",
          ]),
          sourceRefs: S.Array(S.String),
        }),
      ),
    }),
    "local-pose-changed": S.Struct({
      controller: S.Literals(["third_person_character", "wasd_mouselook"]),
      position: S.Array(S.Number),
      yaw: S.Number,
      action: S.Literals(["idle", "jump", "run", "walk"]),
      capturedAtMs: S.Number,
    }),
  },
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const trainingOptionsFromUnknown = (
  value: unknown,
): TrainingRunVisualizationOptions =>
  isRecord(value) ? (value as TrainingRunVisualizationOptions) : {}

const mokshaOptionsFromUnknown = (value: unknown): MokshaOptions =>
  isRecord(value) ? (value as MokshaOptions) : {}

const stableOptionsSignature = (value: unknown): string => {
  try {
    return JSON.stringify(value)
  } catch {
    return `${Date.now()}`
  }
}

const trainingStaticOptionsSignature = (
  value: TrainingRunVisualizationOptions,
): string => {
  const staticOptions: Record<string, unknown> = { ...value }
  delete staticOptions["remoteAvatars"]
  return stableOptionsSignature(staticOptions)
}

const TRAINING_REBUILD_DEBOUNCE_MS = 250
const TRAINING_ACTIVE_POSE_GRACE_MS = 450

const activeTrainingPose = (
  pose: TrainingRunLocalPoseSnapshot | undefined,
  now = Date.now(),
): boolean =>
  pose !== undefined &&
  (pose.action === "walk" ||
    pose.action === "run" ||
    pose.action === "jump") &&
  now - (pose.capturedAtMs ?? 0) < TRAINING_ACTIVE_POSE_GRACE_MS

const recordTrainingHostDiagnostic = (
  event: string,
  detail: Record<string, unknown> = {},
): void => {
  const host = globalThis as typeof globalThis & {
    __OA_VERSE_SCENE_LOGS?: Array<{
      at: string
      event: string
      detail: Record<string, unknown>
    }>
  }
  const entry = {
    at: new Date().toISOString(),
    event,
    detail,
  }
  if (Array.isArray(host.__OA_VERSE_SCENE_LOGS)) {
    host.__OA_VERSE_SCENE_LOGS.push(entry)
    if (host.__OA_VERSE_SCENE_LOGS.length > 300) {
      host.__OA_VERSE_SCENE_LOGS.splice(
        0,
        host.__OA_VERSE_SCENE_LOGS.length - 300,
      )
    }
  }
  console.info("[verse-scene]", event, detail)
}

const dispatchTrainingNodeSelected = (
  element: HTMLElement,
  node: TrainingRunNodeSelection,
): void => {
  element.dispatchEvent(
    new CustomEvent("node-selected", {
      bubbles: true,
      composed: true,
      detail: node,
    }),
  )
}

const dispatchTrainingPresenceZoneChanged = (
  element: HTMLElement,
  zone: TrainingRunPresenceZone | null,
): void => {
  recordTrainingHostDiagnostic("verse-host.presence-zone", {
    zone: zone ?? "away",
  })
  element.dispatchEvent(
    new CustomEvent("presence-zone-changed", {
      bubbles: true,
      composed: true,
      detail: { zone },
    }),
  )
}

const dispatchTrainingWorldItemProximityChanged = (
  element: HTMLElement,
  item: TrainingRunWorldItemSelection | null,
): void => {
  recordTrainingHostDiagnostic("verse-host.world-item-proximity", {
    itemId: item?.id ?? null,
    kind: item?.kind ?? null,
    status: item?.status ?? null,
  })
  element.dispatchEvent(
    new CustomEvent("world-item-proximity-changed", {
      bubbles: true,
      composed: true,
      detail: { item },
    }),
  )
}

const dispatchTrainingLocalPoseChanged = (
  element: HTMLElement,
  pose: TrainingRunLocalPoseUpdate,
): void => {
  element.dispatchEvent(
    new CustomEvent("local-pose-changed", {
      bubbles: true,
      composed: true,
      detail: pose,
    }),
  )
}

const makeSpinningCubeElement = (): CustomElementConstructor => {
  return class SpinningCubeElement extends HTMLElement {
    #dispose: Effect.Effect<void> | null = null

    connectedCallback(): void {
      if (this.#dispose !== null) return

      const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" })
      shadow.replaceChildren()

      const style = document.createElement("style")
      style.textContent = `
        :host {
          display: block;
          min-height: 220px;
          overflow: hidden;
          background: #0b0d12;
        }
        .mount {
          width: 100%;
          height: 100%;
          min-height: inherit;
        }
      `

      const mount = document.createElement("div")
      mount.className = "mount"
      shadow.append(style, mount)

      const handle = Effect.runSync(mountSpinningCube(mount))
      this.#dispose = handle.dispose
    }

    disconnectedCallback(): void {
      if (this.#dispose === null) return
      Effect.runSync(this.#dispose)
      this.#dispose = null
    }
  }
}

const makeBezierNodesElement = (): CustomElementConstructor => {
  return class BezierNodesElement extends HTMLElement {
    #dispose: Effect.Effect<void> | null = null

    connectedCallback(): void {
      if (this.#dispose !== null) return

      const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" })
      shadow.replaceChildren()

      const style = document.createElement("style")
      style.textContent = `
        :host {
          display: block;
          min-height: 260px;
          overflow: hidden;
          background: #151520;
          touch-action: none;
        }
        .mount {
          width: 100%;
          height: 100%;
          min-height: inherit;
          touch-action: none;
        }
      `

      const mount = document.createElement("div")
      mount.className = "mount"
      shadow.append(style, mount)

      const handle = Effect.runSync(mountBezierNodes(mount))
      this.#dispose = handle.dispose
    }

    disconnectedCallback(): void {
      if (this.#dispose === null) return
      Effect.runSync(this.#dispose)
      this.#dispose = null
    }
  }
}

const makeMokshaElement = (): CustomElementConstructor => {
  return class MokshaElement extends HTMLElement {
    #dispose: Effect.Effect<void> | null = null
    #mount: HTMLDivElement | null = null
    #options: MokshaOptions = {}
    #optionsSignature = stableOptionsSignature(this.#options)

    get options(): MokshaOptions {
      return this.#options
    }

    set options(value: unknown) {
      const options = mokshaOptionsFromUnknown(value)
      const signature = stableOptionsSignature(options)
      if (signature === this.#optionsSignature) return

      this.#options = options
      this.#optionsSignature = signature
      if (this.isConnected && this.#mount !== null) {
        this.#remount()
      }
    }

    connectedCallback(): void {
      if (this.#mount !== null) return

      const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" })
      shadow.replaceChildren()

      const style = document.createElement("style")
      style.textContent = `
        :host {
          display: block;
          min-height: 100dvh;
          overflow: hidden;
          background: #0c0f13;
          color: #f5f5f5;
          touch-action: pan-y;
        }
        .mount {
          width: 100%;
          height: 100%;
          min-height: inherit;
        }
      `

      const mount = document.createElement("div")
      mount.className = "mount"
      this.#mount = mount
      shadow.append(style, mount)

      this.#remount()
    }

    disconnectedCallback(): void {
      this.#unmount()
      this.#mount = null
    }

    #unmount(): void {
      if (this.#dispose === null) return
      Effect.runSync(this.#dispose)
      this.#dispose = null
    }

    #remount(): void {
      if (this.#mount === null) return
      this.#unmount()
      const handle = Effect.runSync(
        mountMokshaExperience(this.#mount, this.#options),
      )
      this.#dispose = handle.dispose
    }
  }
}

const makeTrainingRunElement = (): CustomElementConstructor => {
  return class TrainingRunElement extends HTMLElement {
    #handle: TrainingRunVisualizationHandle | null = null
    #mount: HTMLDivElement | null = null
    #pendingRemount: ReturnType<typeof setTimeout> | null = null
    #preservedLocalPose: TrainingRunLocalPoseSnapshot | undefined
    #latestLocalPose: TrainingRunLocalPoseSnapshot | undefined
    #visualization: TrainingRunVisualizationOptions = {}
    #visualizationSignature = stableOptionsSignature(this.#visualization)
    #visualizationStaticSignature = trainingStaticOptionsSignature(
      this.#visualization,
    )

    get visualization(): TrainingRunVisualizationOptions {
      return this.#visualization
    }

    set visualization(value: unknown) {
      const visualization = trainingOptionsFromUnknown(value)
      const signature = stableOptionsSignature(visualization)
      if (signature === this.#visualizationSignature) return
      const staticSignature = trainingStaticOptionsSignature(visualization)
      const remoteOnly =
        staticSignature === this.#visualizationStaticSignature

      this.#visualization = visualization
      this.#visualizationSignature = signature
      this.#visualizationStaticSignature = staticSignature
      if (this.isConnected && this.#mount !== null) {
        if (remoteOnly && this.#handle !== null) {
          this.#handle.updateRemoteAvatars(visualization.remoteAvatars ?? [])
        } else {
          this.#scheduleRemount("visualization.changed")
        }
      }
    }

    connectedCallback(): void {
      if (this.#mount !== null) return

      const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" })
      shadow.replaceChildren()

      const style = document.createElement("style")
      style.textContent = `
        :host {
          display: block;
          min-height: 340px;
          overflow: hidden;
          background: #050505;
        }
        .mount {
          width: 100%;
          height: 100%;
          min-height: inherit;
          position: relative;
          overflow: hidden;
        }
      `

      const mount = document.createElement("div")
      mount.className = "mount"
      this.#mount = mount
      shadow.append(style, mount)

      this.#remount()
    }

    disconnectedCallback(): void {
      this.#clearPendingRemount()
      this.#unmount()
      this.#mount = null
      this.#preservedLocalPose = undefined
      this.#latestLocalPose = undefined
    }

    #clearPendingRemount(): void {
      if (this.#pendingRemount === null) return
      clearTimeout(this.#pendingRemount)
      this.#pendingRemount = null
    }

    #unmount(): void {
      if (this.#handle === null) return
      const handle = this.#handle
      Effect.runSync(handle.dispose)
      handle.element.remove()
      this.#handle = null
    }

    #scheduleRemount(reason: string): void {
      this.#clearPendingRemount()
      this.#pendingRemount = setTimeout(() => {
        this.#pendingRemount = null
        const pose = this.#latestLocalPose ?? this.#handle?.captureLocalPose()
        if (activeTrainingPose(pose)) {
          this.#latestLocalPose = pose
          recordTrainingHostDiagnostic("verse-host.remount.deferred", {
            reason,
            action: pose?.action ?? "unknown",
          })
          this.#scheduleRemount(`${reason}.active`)
          return
        }
        this.#remount(reason)
      }, TRAINING_REBUILD_DEBOUNCE_MS)
      recordTrainingHostDiagnostic("verse-host.remount.scheduled", {
        reason,
      })
    }

    #remount(reason = "direct"): void {
      if (this.#mount === null) return
      this.#clearPendingRemount()
      const previous = this.#handle
      this.#preservedLocalPose =
        this.#handle?.captureLocalPose() ?? this.#preservedLocalPose
      this.#latestLocalPose = this.#preservedLocalPose
      const visualization = trainingRunVisualizationOptionsWithLocalPose(
        this.#visualization,
        this.#preservedLocalPose,
      )
      const staging = document.createElement("div")
      staging.style.position = "absolute"
      staging.style.inset = "0"
      staging.style.width = "100%"
      staging.style.height = "100%"
      staging.style.opacity = previous === null ? "1" : "0"
      staging.style.pointerEvents = "none"
      this.#mount.append(staging)
      const handle = Effect.runSync(
        mountTrainingRunVisualization(staging, {
          ...visualization,
          onNodeClick: node => dispatchTrainingNodeSelected(this, node),
          onWorldItemProximityChange: item =>
            dispatchTrainingWorldItemProximityChanged(this, item),
          onPresenceZoneChange: zone =>
            dispatchTrainingPresenceZoneChanged(this, zone),
          onLocalPoseChange: pose => {
            this.#latestLocalPose = pose
            dispatchTrainingLocalPoseChanged(this, pose)
          },
        }),
      )
      handle.canvas.style.width = "100%"
      handle.canvas.style.height = "100%"
      this.#handle = handle
      recordTrainingHostDiagnostic("verse-host.remount.mounted", {
        hadPrevious: previous !== null,
        reason,
      })
      if (previous !== null) {
        requestAnimationFrame(() => {
          if (this.#handle !== handle) {
            Effect.runSync(handle.dispose)
            return
          }
          staging.style.opacity = "1"
          Effect.runSync(previous.dispose)
          previous.element.remove()
          recordTrainingHostDiagnostic("verse-host.remount.swapped", {
            reason,
          })
        })
      }
    }
  }
}

const makeHudGalleryElement = (): CustomElementConstructor => {
  return class HudGalleryElement extends HTMLElement {
    #dispose: Effect.Effect<void> | null = null

    connectedCallback(): void {
      if (this.#dispose !== null) return

      const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" })
      shadow.replaceChildren()

      const style = document.createElement("style")
      style.textContent = `
        :host {
          display: block;
          min-height: 340px;
          overflow: hidden;
          background: #0b0d12;
        }
        .mount {
          width: 100%;
          height: 100%;
          min-height: inherit;
        }
      `

      const mount = document.createElement("div")
      mount.className = "mount"
      shadow.append(style, mount)

      const handle = Effect.runSync(mountHudGallery(mount))
      this.#dispose = handle.dispose
    }

    disconnectedCallback(): void {
      if (this.#dispose === null) return
      Effect.runSync(this.#dispose)
      this.#dispose = null
    }
  }
}

export const registerBezierNodesElement = (): void => {
  if (typeof customElements === "undefined") return
  if (typeof HTMLElement === "undefined") return
  if (customElements.get(bezierNodesTagName) !== undefined) return
  customElements.define(bezierNodesTagName, makeBezierNodesElement())
}

export const registerSpinningCubeElement = (): void => {
  if (typeof customElements === "undefined") return
  if (typeof HTMLElement === "undefined") return
  if (customElements.get(spinningCubeTagName) !== undefined) return
  customElements.define(spinningCubeTagName, makeSpinningCubeElement())
}

export const registerMokshaElement = (): void => {
  if (typeof customElements === "undefined") return
  if (typeof HTMLElement === "undefined") return
  if (customElements.get(mokshaTagName) !== undefined) return
  customElements.define(mokshaTagName, makeMokshaElement())
}

export const registerTrainingRunElement = (): void => {
  if (typeof customElements === "undefined") return
  if (typeof HTMLElement === "undefined") return
  if (customElements.get(trainingRunTagName) !== undefined) return
  customElements.define(trainingRunTagName, makeTrainingRunElement())
}

export const registerHudGalleryElement = (): void => {
  if (typeof customElements === "undefined") return
  if (typeof HTMLElement === "undefined") return
  if (customElements.get(hudGalleryTagName) !== undefined) return
  customElements.define(hudGalleryTagName, makeHudGalleryElement())
}

export const bezierNodesView = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
): Html => {
  registerBezierNodesElement()
  const element = bezierNodesElement.withMessage<Message>()
  return element(attributes, [])
}

export const spinningCubeView = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
): Html => {
  registerSpinningCubeElement()
  const element = spinningCubeElement.withMessage<Message>()
  return element(attributes, [])
}

export const mokshaView = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  options?: MokshaOptions,
): Html => {
  registerMokshaElement()
  const element = mokshaElement.withMessage<Message>()
  return element(
    options === undefined ? attributes : [...attributes, element.Options(options)],
    [],
  )
}

export const trainingRunView = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  visualization?: TrainingRunVisualizationOptions,
  onNodeSelected?: (node: TrainingRunNodeSelection) => Message,
  onPresenceZoneChanged?: (zone: TrainingRunPresenceZone | null) => Message,
  onLocalPoseChanged?: (pose: TrainingRunLocalPoseUpdate) => Message,
  onWorldItemProximityChanged?: (
    item: TrainingRunWorldItemSelection | null,
  ) => Message,
): Html => {
  registerTrainingRunElement()
  const element = trainingRunElement.withMessage<Message>()
  const resolvedAttributes =
    onNodeSelected === undefined
      ? attributes
      : [...attributes, element.OnNodeSelected(onNodeSelected)]
  const attributesWithPresence =
    onPresenceZoneChanged === undefined
      ? resolvedAttributes
      : [
          ...resolvedAttributes,
          element.OnPresenceZoneChanged(({ zone }) =>
            onPresenceZoneChanged(zone),
          ),
        ]
  const attributesWithLocalPose =
    onLocalPoseChanged === undefined
      ? attributesWithPresence
      : [
          ...attributesWithPresence,
          element.OnLocalPoseChanged((pose) => onLocalPoseChanged({
            controller: pose.controller,
            position: [
              pose.position[0] ?? 0,
              pose.position[1] ?? 0,
              pose.position[2] ?? 0,
            ],
            yaw: pose.yaw,
            action: pose.action,
            capturedAtMs: pose.capturedAtMs,
          })),
        ]
  const attributesWithWorldItems =
    onWorldItemProximityChanged === undefined
      ? attributesWithLocalPose
      : [
          ...attributesWithLocalPose,
          element.OnWorldItemProximityChanged(({ item }) =>
            onWorldItemProximityChanged(item),
          ),
        ]
  return element(
    visualization === undefined
      ? attributesWithWorldItems
      : [...attributesWithWorldItems, element.Visualization(visualization)],
    [],
  )
}

export const hudGalleryView = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
): Html => {
  registerHudGalleryElement()
  const element = hudGalleryElement.withMessage<Message>()
  return element(attributes, [])
}
