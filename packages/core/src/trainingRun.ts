import { Data, Effect } from "effect"
import * as Three from "three"

export class TrainingRunMountError extends Data.TaggedError(
  "TrainingRunMountError",
)<{
  readonly reason: string
}> {}

export type TrainingRunVector = readonly [number, number, number]

export type TrainingRunNodeRole =
  | "lifecycle"
  | "run"
  | "proof"
  | "receipt"
  | "rung"

export type TrainingRunNodeStatus =
  | "planned"
  | "queued"
  | "sync"
  | "active"
  | "sealed"
  | "verified"
  | "blocked"

export type TrainingRunNodeDefinition = Readonly<{
  id: string
  label: string
  detail: string
  role: TrainingRunNodeRole
  status: TrainingRunNodeStatus
  position: TrainingRunVector
  connectedTo?: readonly string[]
}>

export type TrainingRunEdgeDefinition = Readonly<{
  sourceId: string
  targetId: string
  source: TrainingRunVector
  target: TrainingRunVector
}>

export type TrainingRunContributorDefinition = Readonly<{
  id: string
  label: string
  lifecycleState: string
  phase: number
}>

export type TrainingRunLossPoint = Readonly<{
  step: number
  validationLoss: number
}>

export type TrainingRunVisualizationOptions = Readonly<{
  backgroundColor?: number
  pixelRatio?: number
  maxAllowedStaleSteps?: number
  nodes?: readonly TrainingRunNodeDefinition[]
  contributors?: readonly TrainingRunContributorDefinition[]
  lossCurve?: readonly TrainingRunLossPoint[]
  pulseSpeed?: number
}>

export type ResolvedTrainingRunVisualizationOptions = Readonly<{
  backgroundColor: number
  pixelRatio: number
  maxAllowedStaleSteps: number
  nodes: readonly TrainingRunNodeDefinition[]
  contributors: readonly TrainingRunContributorDefinition[]
  lossCurve: readonly TrainingRunLossPoint[]
  pulseSpeed: number
}>

export type TrainingRunVisualizationHandle = Readonly<{
  element: HTMLElement
  canvas: HTMLCanvasElement
  resize: Effect.Effect<void>
  dispose: Effect.Effect<void>
}>

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
]

export const defaultTrainingRunContributors: readonly TrainingRunContributorDefinition[] =
  [
    { id: "pylon.operator.mac", label: "M1", lifecycleState: "active", phase: 0 },
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
  ]

export const defaultTrainingRunLossCurve: readonly TrainingRunLossPoint[] = [
  { step: 0, validationLoss: 4.8 },
  { step: 80, validationLoss: 4.14 },
  { step: 160, validationLoss: 3.78 },
  { step: 240, validationLoss: 3.42 },
  { step: 320, validationLoss: 3.2 },
  { step: 400, validationLoss: 3.06 },
]

export const defaultTrainingRunVisualizationOptions: ResolvedTrainingRunVisualizationOptions =
  {
    backgroundColor: 0x050505,
    pixelRatio: 2,
    maxAllowedStaleSteps: 5,
    nodes: defaultTrainingRunNodes,
    contributors: defaultTrainingRunContributors,
    lossCurve: defaultTrainingRunLossCurve,
    pulseSpeed: 0.17,
  }

export const resolveTrainingRunVisualizationOptions = (
  options: TrainingRunVisualizationOptions = {},
): ResolvedTrainingRunVisualizationOptions => ({
  ...defaultTrainingRunVisualizationOptions,
  ...options,
  nodes: options.nodes ?? defaultTrainingRunVisualizationOptions.nodes,
  contributors:
    options.contributors ?? defaultTrainingRunVisualizationOptions.contributors,
  lossCurve: options.lossCurve ?? defaultTrainingRunVisualizationOptions.lossCurve,
})

export const createTrainingRunEdges = (
  nodes: readonly TrainingRunNodeDefinition[],
): readonly TrainingRunEdgeDefinition[] => {
  const byId = new Map(nodes.map(node => [node.id, node]))
  const edges: TrainingRunEdgeDefinition[] = []

  for (const node of nodes) {
    for (const targetId of node.connectedTo ?? []) {
      const target = byId.get(targetId)
      if (target === undefined) continue
      edges.push({
        sourceId: node.id,
        targetId,
        source: node.position,
        target: target.position,
      })
    }
  }

  return edges
}

export const summarizeTrainingRunVisualization = (
  nodes: readonly TrainingRunNodeDefinition[] = defaultTrainingRunNodes,
): Readonly<Record<TrainingRunNodeRole, number>> => {
  const counts: Record<TrainingRunNodeRole, number> = {
    lifecycle: 0,
    proof: 0,
    receipt: 0,
    rung: 0,
    run: 0,
  }

  for (const node of nodes) {
    counts[node.role] += 1
  }

  return counts
}

const hostSize = (element: HTMLElement): { width: number; height: number } => {
  const rect = element.getBoundingClientRect()
  const width = Math.max(1, Math.floor(rect.width || element.clientWidth || 480))
  const height = Math.max(1, Math.floor(rect.height || element.clientHeight || 340))
  return { width, height }
}

const vector = (point: TrainingRunVector): Three.Vector3 =>
  new Three.Vector3(point[0], point[1], point[2])

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
            : 0x9ca3af

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
  )

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
  )

const makeTextSprite = (
  text: string,
  options: Readonly<{
    color?: string
    fontSize?: number
    height?: number
    width?: number
  }> = {},
): Three.Sprite => {
  const canvas = document.createElement("canvas")
  canvas.width = options.width ?? 384
  canvas.height = options.height ?? 96

  const context = canvas.getContext("2d")
  if (context !== null) {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = options.color ?? "#f8fafc"
    context.font = `${options.fontSize ?? 34}px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont`
    context.textAlign = "center"
    context.textBaseline = "middle"
    context.fillText(text, canvas.width / 2, canvas.height / 2)
  }

  const texture = new Three.CanvasTexture(canvas)
  texture.colorSpace = Three.SRGBColorSpace
  const material = new Three.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  })
  const sprite = new Three.Sprite(material)
  sprite.scale.set((canvas.width / canvas.height) * 0.42, 0.42, 1)
  return sprite
}

const lineGeometry = (
  points: readonly Three.Vector3[],
): Three.BufferGeometry => new Three.BufferGeometry().setFromPoints([...points])

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
  )

const curvedEdgePoints = (
  source: TrainingRunVector,
  target: TrainingRunVector,
  bend = 0.3,
): readonly Three.Vector3[] => {
  const start = vector(source)
  const end = vector(target)
  const midpoint = start
    .clone()
    .lerp(end, 0.5)
    .add(new Three.Vector3(0, bend, 0))
  return new Three.QuadraticBezierCurve3(start, midpoint, end).getPoints(28)
}

const pointOnPoints = (
  points: readonly Three.Vector3[],
  phase: number,
): Three.Vector3 => {
  if (points.length === 0) return new Three.Vector3()
  if (points.length === 1) return points[0]!.clone()

  const clamped = phase - Math.floor(phase)
  const scaled = clamped * (points.length - 1)
  const index = Math.floor(scaled)
  const nextIndex = Math.min(points.length - 1, index + 1)
  return points[index]!.clone().lerp(points[nextIndex]!, scaled - index)
}

const lossCurvePoints = (
  curve: readonly TrainingRunLossPoint[],
): readonly Three.Vector3[] => {
  if (curve.length === 0) return []

  const minStep = Math.min(...curve.map(point => point.step))
  const maxStep = Math.max(...curve.map(point => point.step))
  const minLoss = Math.min(...curve.map(point => point.validationLoss))
  const maxLoss = Math.max(...curve.map(point => point.validationLoss))
  const width = 2.05
  const height = 0.7
  const origin = new Three.Vector3(2.15, -0.28, 0.12)

  return curve.map(point => {
    const x =
      maxStep === minStep
        ? 0
        : ((point.step - minStep) / (maxStep - minStep)) * width
    const y =
      maxLoss === minLoss
        ? 0
        : ((maxLoss - point.validationLoss) / (maxLoss - minLoss)) * height
    return origin.clone().add(new Three.Vector3(x, y, 0))
  })
}

const disposeMaterial = (material: Three.Material | Three.Material[]): void => {
  if (Array.isArray(material)) {
    material.forEach(disposeMaterial)
    return
  }

  const maybeMapped = material as Three.Material & {
    map?: Three.Texture | null
  }
  maybeMapped.map?.dispose()
  material.dispose()
}

const disposeObject = (object: Three.Object3D): void => {
  object.traverse(child => {
    const maybeRenderable = child as Three.Object3D & {
      geometry?: Three.BufferGeometry
      material?: Three.Material | Three.Material[]
    }
    maybeRenderable.geometry?.dispose()
    if (maybeRenderable.material !== undefined) {
      disposeMaterial(maybeRenderable.material)
    }
  })
}

export const mountTrainingRunVisualization = (
  element: HTMLElement,
  options: TrainingRunVisualizationOptions = {},
): Effect.Effect<TrainingRunVisualizationHandle, TrainingRunMountError> =>
  Effect.try({
    try: () => {
      const resolved = resolveTrainingRunVisualizationOptions(options)
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
      const camera = new Three.OrthographicCamera(-5, 5, 3, -3, 0.1, 100)
      camera.position.set(0, 0, 10)
      camera.lookAt(0, 0, 0)

      const root = new Three.Group()
      scene.add(root)

      const grid = new Three.Group()
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
        )
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
        )
      }
      root.add(grid)

      const staleRing = makeRing(1.12, 0xffffff, 0.18)
      staleRing.position.set(-0.15, 0.28, -0.05)
      root.add(staleRing)
      const staleLabel = makeTextSprite(
        `max stale ${resolved.maxAllowedStaleSteps}`,
        { color: "#d1d5db", fontSize: 26, width: 320, height: 96 },
      )
      staleLabel.position.set(-0.15, -0.92, 0.5)
      root.add(staleLabel)

      const edges = createTrainingRunEdges(resolved.nodes)
      const pulses: Array<{
        mesh: Three.Object3D
        phase: number
        points: readonly Three.Vector3[]
      }> = []

      for (const [index, edge] of edges.entries()) {
        const bend =
          edge.sourceId === "run" || edge.targetId === "run"
            ? 0
            : index % 2 === 0
              ? 0.24
              : -0.18
        const points = curvedEdgePoints(edge.source, edge.target, bend)
        root.add(makeLine(points, 0xffffff, 0.2))
        const pulse = makeCircle(0.035, 0xffffff, 0.95)
        pulse.position.copy(pointOnPoints(points, index / Math.max(edges.length, 1)))
        pulse.position.z = 0.35
        root.add(pulse)
        pulses.push({
          mesh: pulse,
          phase: index / Math.max(edges.length, 1),
          points,
        })
      }

      for (const node of resolved.nodes) {
        const group = new Three.Group()
        const statusColor = colorForStatus(node.status)
        group.position.copy(vector(node.position))

        const radius =
          node.role === "run" ? 0.56 : node.role === "rung" ? 0.34 : 0.27
        group.add(makeRing(radius, statusColor, node.role === "run" ? 0.58 : 0.38))
        group.add(makeCircle(radius * 0.32, statusColor, 0.95))

        const label = makeTextSprite(node.label, {
          color: "#ffffff",
          fontSize: node.role === "run" ? 32 : 28,
          width: node.role === "run" ? 512 : 384,
        })
        label.position.set(0, -radius - 0.25, 0.55)
        group.add(label)

        const detail = makeTextSprite(node.detail, {
          color: "#a3a3a3",
          fontSize: 22,
          width: 448,
        })
        detail.position.set(0, -radius - 0.58, 0.55)
        group.add(detail)

        root.add(group)
      }

      const contributorGroup = new Three.Group()
      contributorGroup.position.set(-0.15, 0.28, 0.4)
      for (const contributor of resolved.contributors) {
        const dot = makeCircle(
          contributor.lifecycleState === "active" ? 0.065 : 0.045,
          0xffffff,
          contributor.lifecycleState === "sync_reentry" ? 0.45 : 0.88,
        )
        const angle = contributor.phase * Math.PI * 2
        const radius = contributor.lifecycleState === "sync_reentry" ? 1.45 : 1.22
        dot.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)
        contributorGroup.add(dot)

        const label = makeTextSprite(contributor.label, {
          color: "#d4d4d4",
          fontSize: 18,
          height: 80,
          width: 220,
        })
        label.position.set(dot.position.x, dot.position.y - 0.16, 0.3)
        contributorGroup.add(label)
      }
      root.add(contributorGroup)

      const lossPoints = lossCurvePoints(resolved.lossCurve)
      root.add(
        makeLine(
          [
            new Three.Vector3(2.15, -0.28, 0.1),
            new Three.Vector3(4.2, -0.28, 0.1),
            new Three.Vector3(4.2, 0.42, 0.1),
          ],
          0xffffff,
          0.16,
        ),
      )
      if (lossPoints.length > 1) {
        root.add(makeLine(lossPoints, 0xffffff, 0.86))
        for (const point of lossPoints) {
          const dot = makeCircle(0.03, 0xffffff, 0.9)
          dot.position.copy(point)
          dot.position.z = 0.28
          root.add(dot)
        }
      }
      const lossLabel = makeTextSprite("loss curve", {
        color: "#d1d5db",
        fontSize: 24,
        width: 260,
      })
      lossLabel.position.set(3.2, -0.68, 0.45)
      root.add(lossLabel)

      let disposed = false
      let frame = 0
      let lastTime = 0

      const resize = () => {
        const { width, height } = hostSize(element)
        renderer.setSize(width, height, false)
        const aspect = width / height
        const viewHeight = 6.25
        camera.left = (-viewHeight * aspect) / 2
        camera.right = (viewHeight * aspect) / 2
        camera.top = viewHeight / 2
        camera.bottom = -viewHeight / 2
        camera.updateProjectionMatrix()
      }

      const render = (time: number) => {
        if (disposed) return
        const delta = lastTime === 0 ? 0 : (time - lastTime) / 1000
        lastTime = time
        staleRing.rotation.z += delta * 0.18
        contributorGroup.rotation.z += delta * 0.07
        for (const pulse of pulses) {
          pulse.phase += delta * resolved.pulseSpeed
          pulse.mesh.position.copy(pointOnPoints(pulse.points, pulse.phase))
          pulse.mesh.position.z = 0.35
        }
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
        disposeObject(scene)
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
      new TrainingRunMountError({
        reason: error instanceof Error ? error.message : String(error),
      }),
  })
