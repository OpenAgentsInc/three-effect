import { Data, Effect } from "effect"
import * as Three from "three"

export * from "./bezierNodes"
export * from "./advancedMaterialPrimitives"
export * from "./animationPrimitives"
export * from "./assetPrimitives"
export * from "./cameraPrimitives"
export * from "./commonPrimitiveAudit"
export * from "./controlsPrimitives"
export * from "./conditionalLinePrimitives"
export * from "./curvePrimitives"
export * from "./extraControlsPrimitives"
export * from "./geometryPrimitives"
export * from "./helperPrimitives"
export * from "./htmlOverlayPrimitives"
export * from "./imagePrimitives"
export * from "./instancePrimitives"
export * from "./interactionPrimitives"
export * from "./maskPrimitives"
export * from "./mathPrimitives"
export * from "./mediaParticlePrimitives"
export * from "./moksha"
export * from "./motionPrimitives"
export * from "./performancePrimitives"
export * from "./renderPrimitives"
export * from "./sceneGraphPrimitives"
export * from "./scrollPrimitives"
export * from "./shaderMaterialPrimitives"
export * from "./stagingPrimitives"
export * from "./trainingRun"

export class SpinningCubeMountError extends Data.TaggedError(
  "SpinningCubeMountError",
)<{
  readonly reason: string
}> {}

export type SpinningCubeOptions = Readonly<{
  cubeColor?: number
  edgeColor?: number
  backgroundColor?: number
  speed?: number
  pixelRatio?: number
}>

export type ResolvedSpinningCubeOptions = Required<SpinningCubeOptions>

export type SpinningCubeHandle = Readonly<{
  element: HTMLElement
  canvas: HTMLCanvasElement
  resize: Effect.Effect<void>
  dispose: Effect.Effect<void>
}>

export const defaultSpinningCubeOptions: ResolvedSpinningCubeOptions = {
  cubeColor: 0x7dd3fc,
  edgeColor: 0xe6e9ef,
  backgroundColor: 0x0b0d12,
  speed: 0.9,
  pixelRatio: 2,
}

export const resolveSpinningCubeOptions = (
  options: SpinningCubeOptions = {},
): ResolvedSpinningCubeOptions => ({
  ...defaultSpinningCubeOptions,
  ...options,
})

const hostSize = (element: HTMLElement): { width: number; height: number } => {
  const rect = element.getBoundingClientRect()
  const width = Math.max(1, Math.floor(rect.width || element.clientWidth || 320))
  const height = Math.max(1, Math.floor(rect.height || element.clientHeight || 220))
  return { width, height }
}

export const mountSpinningCube = (
  element: HTMLElement,
  options: SpinningCubeOptions = {},
): Effect.Effect<SpinningCubeHandle, SpinningCubeMountError> =>
  Effect.try({
    try: () => {
      const resolved = resolveSpinningCubeOptions(options)
      const canvas = document.createElement("canvas")
      canvas.style.display = "block"
      canvas.style.width = "100%"
      canvas.style.height = "100%"
      element.replaceChildren(canvas)

      const renderer = new Three.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
      })
      renderer.setClearColor(resolved.backgroundColor, 1)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, resolved.pixelRatio))

      const scene = new Three.Scene()
      const camera = new Three.PerspectiveCamera(45, 1, 0.1, 100)
      camera.position.set(2.4, 1.7, 3.2)
      camera.lookAt(0, 0, 0)

      const group = new Three.Group()
      const geometry = new Three.BoxGeometry(1.1, 1.1, 1.1)
      const material = new Three.MeshStandardMaterial({
        color: resolved.cubeColor,
        roughness: 0.38,
        metalness: 0.2,
      })
      const cube = new Three.Mesh(geometry, material)
      const edges = new Three.LineSegments(
        new Three.EdgesGeometry(geometry),
        new Three.LineBasicMaterial({ color: resolved.edgeColor }),
      )
      group.add(cube)
      group.add(edges)
      scene.add(group)

      scene.add(new Three.AmbientLight(0xffffff, 1.7))
      const key = new Three.DirectionalLight(0xffffff, 2.2)
      key.position.set(2, 3, 4)
      scene.add(key)

      let disposed = false
      let frame = 0

      const resize = () => {
        const { width, height } = hostSize(element)
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
      }

      const render = (time: number) => {
        if (disposed) return
        const seconds = time / 1000
        group.rotation.x = seconds * resolved.speed * 0.55
        group.rotation.y = seconds * resolved.speed
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
        geometry.dispose()
        material.dispose()
        ;(edges.geometry as Three.BufferGeometry).dispose()
        ;(edges.material as Three.Material).dispose()
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
    catch: error =>
      new SpinningCubeMountError({
        reason: error instanceof Error ? error.message : String(error),
      }),
  })
