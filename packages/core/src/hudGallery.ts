import { Data, Effect } from "effect"
import * as Three from "three"

import {
  createHudAnimator,
  createHudDotGrid,
  createHudFrameCorners,
  createHudFrameLines,
  createHudFrameUnderline,
  createHudGridLines,
  createHudIlluminator,
  createHudLabel,
  createHudMeter,
  createHudScanlines,
  createHudSeparator,
  createHudStatusLight,
  HUD_STATUS_COLORS,
  type HudStatus,
} from "./hudPrimitives"

/**
 * A self-contained HUD gallery scene that mounts every primitive in
 * `hudPrimitives` onto one orthographic, white-on-black canvas. It is the
 * tracked visual smoke for the kit (HUD H2 / #5500) and the source the Foldkit
 * `oa-hud-gallery` element and the `examples/hud-gallery` demo both render.
 */
export class HudGalleryMountError extends Data.TaggedError(
  "HudGalleryMountError",
)<{
  readonly reason: string
}> {}

export type HudGalleryHandle = Readonly<{
  element: HTMLElement
  canvas: HTMLCanvasElement
  resize: Effect.Effect<void>
  dispose: Effect.Effect<void>
}>

const hostSize = (element: HTMLElement): { width: number; height: number } => {
  const rect = element.getBoundingClientRect()
  const width = Math.max(1, Math.floor(rect.width || element.clientWidth || 960))
  const height = Math.max(1, Math.floor(rect.height || element.clientHeight || 540))
  return { width, height }
}

export const mountHudGallery = (
  element: HTMLElement,
): Effect.Effect<HudGalleryHandle, HudGalleryMountError> =>
  Effect.try({
    try: () => {
      const canvas = document.createElement("canvas")
      canvas.style.display = "block"
      canvas.style.width = "100%"
      canvas.style.height = "100%"
      element.replaceChildren(canvas)

      const renderer = new Three.WebGLRenderer({ canvas, antialias: true })
      renderer.setClearColor(HUD_STATUS_COLORS.background, 1)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

      const scene = new Three.Scene()
      // Orthographic frustum spanning ~8 world units wide; HUD primitives live
      // in the XY plane.
      const frustumHeight = 5
      const camera = new Three.OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
      camera.position.set(0, 0, 10)
      camera.lookAt(0, 0, 0)

      const disposables: Array<{ dispose: () => void }> = []
      const updaters: Array<(elapsed: number, delta: number) => void> = []
      const track = <T extends { dispose: () => void }>(handle: T): T => {
        disposables.push(handle)
        return handle
      }

      // --- Background surfaces ---
      const grid = track(
        createHudGridLines({ width: 7.6, height: 4.4, spacing: 0.4, opacity: 0.1 }),
      )
      scene.add(grid.lineSegments)

      const dots = track(
        createHudDotGrid({ width: 7.6, height: 4.4, spacing: 0.2, opacity: 0.22 }),
      )
      scene.add(dots.points)

      const scan = track(createHudScanlines({ width: 7.6, height: 4.4, opacity: 0.08 }))
      scene.add(scan.mesh)
      updaters.push((elapsed) => scan.update(elapsed))

      // --- Frames row ---
      const corners = track(
        createHudFrameCorners({ width: 2, height: 1.2, color: HUD_STATUS_COLORS.primary }),
      )
      corners.group.position.set(-2.6, 1.2, 0)
      scene.add(corners.group)

      const lines = track(
        createHudFrameLines({ width: 2, height: 1.2, color: HUD_STATUS_COLORS.secondary }),
      )
      lines.group.position.set(0, 1.2, 0)
      scene.add(lines.group)

      const underline = track(
        createHudFrameUnderline({ width: 2, height: 1.2, color: HUD_STATUS_COLORS.info }),
      )
      underline.group.position.set(2.6, 1.2, 0)
      scene.add(underline.group)

      // Drive the corner frame's draw reveal with a staggered animator.
      const frameAnimator = createHudAnimator({
        childCount: corners.lines.length,
        manager: "stagger",
      })
      frameAnimator.enter()
      updaters.push((_, delta) => {
        corners.setProgress(frameAnimator.update(delta))
      })

      // --- Status lights row ---
      const statuses: ReadonlyArray<HudStatus> = [
        "success",
        "info",
        "warning",
        "error",
        "neutral",
      ]
      statuses.forEach((status, index) => {
        const light = track(
          createHudStatusLight({
            status,
            pulseHz: status === "error" ? 1.5 : 0,
            position: { x: -2 + index * 1, y: -0.1 },
          }),
        )
        scene.add(light.group)
        updaters.push((elapsed) => light.update(elapsed))
      })

      // --- Meters ---
      const meterValues = [0.35, 0.78, 0.95]
      meterValues.forEach((value, index) => {
        const meter = track(createHudMeter({ width: 2, value }))
        meter.group.position.set(0, -1.1 - index * 0.34, 0)
        scene.add(meter.group)
      })

      // --- Separator ---
      const sep = track(createHudSeparator({ length: 7.2, opacity: 0.25 }))
      sep.line.position.set(0, 0.45, 0)
      scene.add(sep.line)

      // --- Crisp 3D HUD text labels ---
      const titleLabel = createHudLabel({
        text: "OPENAGENTS // HUD KIT",
        status: "primary",
        worldHeight: 0.22,
        anchorX: "center",
        position: { x: 0, y: 2.1 },
      })
      scene.add(titleLabel.object3D)
      disposables.push(titleLabel)

      const statusLabel = createHudLabel({
        text: "ALL SYSTEMS NOMINAL",
        status: "success",
        worldHeight: 0.14,
        anchorX: "center",
        position: { x: 0, y: -2.1 },
      })
      scene.add(statusLabel.object3D)
      disposables.push(statusLabel)

      // --- Illuminator that follows the pointer ---
      const illuminator = track(
        createHudIlluminator({ size: 1.8, opacity: 0.35, z: 0.5 }),
      )
      illuminator.setVisible(false)
      scene.add(illuminator.mesh)

      const onPointerMove = (event: PointerEvent): void => {
        const rect = canvas.getBoundingClientRect()
        const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1
        const ny = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
        illuminator.setVisible(true)
        illuminator.moveTo(
          (nx * (camera.right - camera.left)) / 2,
          (ny * (camera.top - camera.bottom)) / 2,
        )
      }
      const onPointerLeave = (): void => illuminator.setVisible(false)
      canvas.addEventListener("pointermove", onPointerMove)
      canvas.addEventListener("pointerleave", onPointerLeave)

      let disposed = false
      let frame = 0
      const start = performance.now()

      const resize = (): void => {
        const { width, height } = hostSize(element)
        renderer.setSize(width, height, false)
        const aspect = width / height
        const halfH = frustumHeight / 2
        const halfW = halfH * aspect
        camera.left = -halfW
        camera.right = halfW
        camera.top = halfH
        camera.bottom = -halfH
        camera.updateProjectionMatrix()
      }

      let lastTime = start
      const render = (now: number): void => {
        if (disposed) return
        const elapsed = (now - start) / 1000
        const delta = (now - lastTime) / 1000
        lastTime = now
        for (const update of updaters) update(elapsed, delta)
        renderer.render(scene, camera)
        frame = requestAnimationFrame(render)
      }

      const observer =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(() => resize())

      resize()
      observer?.observe(element)
      frame = requestAnimationFrame(render)

      const dispose = Effect.sync(() => {
        if (disposed) return
        disposed = true
        cancelAnimationFrame(frame)
        observer?.disconnect()
        canvas.removeEventListener("pointermove", onPointerMove)
        canvas.removeEventListener("pointerleave", onPointerLeave)
        for (const d of disposables) d.dispose()
        renderer.dispose()
        canvas.remove()
      })

      return {
        element,
        canvas,
        resize: Effect.sync(resize),
        dispose,
      }
    },
    catch: (error) =>
      new HudGalleryMountError({
        reason: error instanceof Error ? error.message : String(error),
      }),
  })
