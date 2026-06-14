import { Effect } from "effect"
import { define as defineCustomElement } from "foldkit/customElement"
import type { Attribute, Html } from "foldkit/html"

import {
  mountBezierNodes,
  mountSpinningCube,
} from "@openagentsinc/three-effect/core"

export const bezierNodesTagName = "oa-bezier-nodes"
export const spinningCubeTagName = "oa-spinning-cube"

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
