import { Effect } from "effect"
import { define as defineCustomElement } from "foldkit/customElement"
import type { Attribute, Html } from "foldkit/html"

import { mountSpinningCube } from "@openagentsinc/three-effect/core"

export const spinningCubeTagName = "oa-spinning-cube"

const spinningCubeElement = defineCustomElement({
  tag: spinningCubeTagName,
  properties: {},
  events: {},
})

class SpinningCubeElement extends HTMLElement {
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

export const registerSpinningCubeElement = (): void => {
  if (typeof customElements === "undefined") return
  if (customElements.get(spinningCubeTagName) !== undefined) return
  customElements.define(spinningCubeTagName, SpinningCubeElement)
}

export const spinningCubeView = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
): Html => {
  registerSpinningCubeElement()
  const element = spinningCubeElement.withMessage<Message>()
  return element(attributes, [])
}
