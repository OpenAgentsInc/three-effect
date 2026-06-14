import { Effect, Schema as S } from "effect"
import { define as defineCustomElement } from "foldkit/customElement"
import type { Attribute, Html } from "foldkit/html"

import {
  mountBezierNodes,
  mountMokshaExperience,
  mountSpinningCube,
  mountTrainingRunVisualization,
  type TrainingRunNodeSelection,
  type TrainingRunVisualizationOptions,
} from "@openagentsinc/three-effect/core"

export const bezierNodesTagName = "oa-bezier-nodes"
export const mokshaTagName = "oa-moksha"
export const spinningCubeTagName = "oa-spinning-cube"
export const trainingRunTagName = "oa-training-run"

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

const mokshaElement = defineCustomElement({
  tag: mokshaTagName,
  properties: {},
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
  },
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const trainingOptionsFromUnknown = (
  value: unknown,
): TrainingRunVisualizationOptions =>
  isRecord(value) ? (value as TrainingRunVisualizationOptions) : {}

const trainingOptionsSignature = (
  value: TrainingRunVisualizationOptions,
): string => {
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

    connectedCallback(): void {
      if (this.#dispose !== null) return

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
      shadow.append(style, mount)

      const handle = Effect.runSync(mountMokshaExperience(mount))
      this.#dispose = handle.dispose
    }

    disconnectedCallback(): void {
      if (this.#dispose === null) return
      Effect.runSync(this.#dispose)
      this.#dispose = null
    }
  }
}

const makeTrainingRunElement = (): CustomElementConstructor => {
  return class TrainingRunElement extends HTMLElement {
    #dispose: Effect.Effect<void> | null = null
    #mount: HTMLDivElement | null = null
    #visualization: TrainingRunVisualizationOptions = {}
    #visualizationSignature = trainingOptionsSignature(this.#visualization)

    get visualization(): TrainingRunVisualizationOptions {
      return this.#visualization
    }

    set visualization(value: unknown) {
      const visualization = trainingOptionsFromUnknown(value)
      const signature = trainingOptionsSignature(visualization)
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
        mountTrainingRunVisualization(this.#mount, {
          ...this.#visualization,
          onNodeClick: node => dispatchTrainingNodeSelected(this, node),
        }),
      )
      this.#dispose = handle.dispose
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
): Html => {
  registerMokshaElement()
  const element = mokshaElement.withMessage<Message>()
  return element(attributes, [])
}

export const trainingRunView = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  visualization?: TrainingRunVisualizationOptions,
  onNodeSelected?: (node: TrainingRunNodeSelection) => Message,
): Html => {
  registerTrainingRunElement()
  const element = trainingRunElement.withMessage<Message>()
  const resolvedAttributes =
    onNodeSelected === undefined
      ? attributes
      : [...attributes, element.OnNodeSelected(onNodeSelected)]
  return element(
    visualization === undefined
      ? resolvedAttributes
      : [...resolvedAttributes, element.Visualization(visualization)],
    [],
  )
}
