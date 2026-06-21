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
  if (zone === null) {
    element.removeAttribute("data-presence-zone")
  } else {
    element.setAttribute("data-presence-zone", zone)
  }
  element.dispatchEvent(
    new CustomEvent("presence-zone-changed", {
      bubbles: true,
      composed: true,
      detail: { zone },
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
    #preservedLocalPose: TrainingRunLocalPoseSnapshot | undefined
    #visualization: TrainingRunVisualizationOptions = {}
    #visualizationSignature = stableOptionsSignature(this.#visualization)

    get visualization(): TrainingRunVisualizationOptions {
      return this.#visualization
    }

    set visualization(value: unknown) {
      const visualization = trainingOptionsFromUnknown(value)
      const signature = stableOptionsSignature(visualization)
      if (signature === this.#visualizationSignature) return

      this.#visualization = visualization
      this.#visualizationSignature = signature
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
          min-height: 340px;
          overflow: hidden;
          background: #050505;
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
      this.#preservedLocalPose = undefined
    }

    #unmount(): void {
      if (this.#handle === null) return
      Effect.runSync(this.#handle.dispose)
      this.#handle = null
    }

    #remount(): void {
      if (this.#mount === null) return
      this.#preservedLocalPose =
        this.#handle?.captureLocalPose() ?? this.#preservedLocalPose
      this.#unmount()
      const visualization = trainingRunVisualizationOptionsWithLocalPose(
        this.#visualization,
        this.#preservedLocalPose,
      )
      const handle = Effect.runSync(
        mountTrainingRunVisualization(this.#mount, {
          ...visualization,
          onNodeClick: node => dispatchTrainingNodeSelected(this, node),
          onPresenceZoneChange: zone =>
            dispatchTrainingPresenceZoneChanged(this, zone),
          onLocalPoseChange: pose =>
            dispatchTrainingLocalPoseChanged(this, pose),
        }),
      )
      this.#handle = handle
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
  return element(
    visualization === undefined
      ? attributesWithLocalPose
      : [...attributesWithLocalPose, element.Visualization(visualization)],
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
