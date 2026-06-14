import { Data, Effect } from "effect"
import * as Three from "three"

import {
  dreiQuadraticBezierMidpoint,
  quadraticBezierPoints,
} from "./curvePrimitives"

export class BezierNodesMountError extends Data.TaggedError(
  "BezierNodesMountError",
)<{
  readonly reason: string
}> {}

export type VectorTuple = readonly [number, number, number]

export type BezierNodeDefinition = Readonly<{
  id: string
  label: string
  color: number
  position: VectorTuple
  connectedTo?: readonly string[]
}>

export type BezierNodeConnection = Readonly<{
  sourceId: string
  targetId: string
  start: VectorTuple
  mid: VectorTuple
  end: VectorTuple
}>

export type BezierNodesOptions = Readonly<{
  backgroundColor?: number
  pixelRatio?: number
  nodes?: readonly BezierNodeDefinition[]
  segments?: number
  horizontalInset?: number
  outerRadius?: number
  innerRadius?: number
  endpointRadius?: number
  dashSize?: number
  gapSize?: number
  dashSpeed?: number
}>

export type ResolvedBezierNodesOptions = Readonly<{
  backgroundColor: number
  pixelRatio: number
  nodes: readonly BezierNodeDefinition[]
  segments: number
  horizontalInset: number
  outerRadius: number
  innerRadius: number
  endpointRadius: number
  dashSize: number
  gapSize: number
  dashSpeed: number
}>

export type BezierNodesHandle = Readonly<{
  element: HTMLElement
  canvas: HTMLCanvasElement
  resize: Effect.Effect<void>
  dispose: Effect.Effect<void>
}>

export const defaultBezierNodesGraph: readonly BezierNodeDefinition[] = [
  {
    id: "a",
    label: "a",
    color: 0x204090,
    position: [-2, 2, 0],
    connectedTo: ["b", "c", "e"],
  },
  {
    id: "b",
    label: "b",
    color: 0x904020,
    position: [2, -3, 0],
    connectedTo: ["d", "a"],
  },
  {
    id: "c",
    label: "c",
    color: 0x209040,
    position: [-0.25, 0, 0],
  },
  {
    id: "d",
    label: "d",
    color: 0x204090,
    position: [0.5, -0.75, 0],
  },
  {
    id: "e",
    label: "e",
    color: 0x204090,
    position: [-0.5, -1, 0],
  },
]

export const defaultBezierNodesOptions: ResolvedBezierNodesOptions = {
  backgroundColor: 0x151520,
  pixelRatio: 2,
  nodes: defaultBezierNodesGraph,
  segments: 28,
  horizontalInset: 0.35,
  outerRadius: 0.5,
  innerRadius: 0.25,
  endpointRadius: 0.05,
  dashSize: 0.032,
  gapSize: 0.018,
  dashSpeed: 0.18,
}

export const resolveBezierNodesOptions = (
  options: BezierNodesOptions = {},
): ResolvedBezierNodesOptions => ({
  ...defaultBezierNodesOptions,
  ...options,
  nodes: options.nodes ?? defaultBezierNodesOptions.nodes,
})

export const defaultQuadraticBezierMidpoint = (
  start: VectorTuple,
  end: VectorTuple,
): VectorTuple => dreiQuadraticBezierMidpoint(start, end)

export const createBezierNodeConnections = (
  nodes: readonly BezierNodeDefinition[],
  horizontalInset = defaultBezierNodesOptions.horizontalInset,
): readonly BezierNodeConnection[] => {
  const byId = new Map(nodes.map(node => [node.id, node]))
  const connections: BezierNodeConnection[] = []

  for (const node of nodes) {
    for (const targetId of node.connectedTo ?? []) {
      const target = byId.get(targetId)
      if (target === undefined) continue

      const start: VectorTuple = [
        node.position[0] + horizontalInset,
        node.position[1],
        node.position[2],
      ]
      const end: VectorTuple = [
        target.position[0] - horizontalInset,
        target.position[1],
        target.position[2],
      ]

      connections.push({
        sourceId: node.id,
        targetId,
        start,
        mid: defaultQuadraticBezierMidpoint(start, end),
        end,
      })
    }
  }

  return connections
}

const hostSize = (element: HTMLElement): { width: number; height: number } => {
  const rect = element.getBoundingClientRect()
  const width = Math.max(1, Math.floor(rect.width || element.clientWidth || 320))
  const height = Math.max(1, Math.floor(rect.height || element.clientHeight || 260))
  return { width, height }
}

const tupleToVector = (point: VectorTuple): Three.Vector3 =>
  new Three.Vector3(point[0], point[1], point[2])

const makeCircle = (
  radius: number,
  color: number,
  opacity = 1,
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

const makeTextSprite = (label: string): Three.Sprite => {
  const canvas = document.createElement("canvas")
  canvas.width = 128
  canvas.height = 128

  const context = canvas.getContext("2d")
  if (context !== null) {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = "#f8fafc"
    context.font =
      "600 54px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont"
    context.textAlign = "center"
    context.textBaseline = "middle"
    context.fillText(label, canvas.width / 2, canvas.height / 2 + 2)
  }

  const texture = new Three.CanvasTexture(canvas)
  texture.colorSpace = Three.SRGBColorSpace

  const sprite = new Three.Sprite(
    new Three.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    }),
  )
  sprite.scale.set(0.48, 0.48, 1)
  sprite.position.set(0, 0, 0.9)
  return sprite
}

const disposeMaterial = (material: Three.Material | Three.Material[]): void => {
  if (Array.isArray(material)) {
    material.forEach(disposeMaterial)
    return
  }

  const withMap = material as Three.Material & {
    map?: Three.Texture | null
  }
  withMap.map?.dispose()
  material.dispose()
}

const disposeObject = (object: Three.Object3D): void => {
  object.traverse(child => {
    const maybeMesh = child as Three.Object3D & {
      geometry?: Three.BufferGeometry
      material?: Three.Material | Three.Material[]
    }
    maybeMesh.geometry?.dispose()
    if (maybeMesh.material !== undefined) disposeMaterial(maybeMesh.material)
  })
}

type NodeView = Readonly<{
  id: string
  color: number
  group: Three.Group
  innerMaterial: Three.MeshBasicMaterial
  hitTargets: readonly Three.Object3D[]
}>

type ConnectionView = {
  readonly source: NodeView
  readonly target: NodeView
  readonly curve: Three.QuadraticBezierCurve3
  readonly continuousGeometry: Three.BufferGeometry
  readonly dashGeometry: Three.BufferGeometry
  readonly startDot: Three.Object3D
  readonly endDot: Three.Object3D
  phase: number
}

const connectionCurve = (
  source: Three.Vector3,
  target: Three.Vector3,
  horizontalInset: number,
): Three.QuadraticBezierCurve3 => {
  const start = source.clone().add(new Three.Vector3(horizontalInset, 0, 0))
  const end = target.clone().add(new Three.Vector3(-horizontalInset, 0, 0))
  const mid = new Three.Vector3(end.x, start.y, end.z)
  return new Three.QuadraticBezierCurve3(start, mid, end)
}

const setContinuousCurveGeometry = (
  geometry: Three.BufferGeometry,
  curve: Three.QuadraticBezierCurve3,
  segments: number,
): void => {
  geometry.setFromPoints(
    quadraticBezierPoints(
      [curve.v0.x, curve.v0.y, curve.v0.z],
      [curve.v2.x, curve.v2.y, curve.v2.z],
      segments,
      [curve.v1.x, curve.v1.y, curve.v1.z],
    ).map(point => tupleToVector(point)),
  )
}

const writeDashedCurveGeometry = (
  geometry: Three.BufferGeometry,
  curve: Three.QuadraticBezierCurve3,
  phase: number,
  dashSize: number,
  gapSize: number,
): void => {
  const cycle = dashSize + gapSize
  const maxSegments = Math.ceil(1 / cycle) + 2
  const values =
    geometry.getAttribute("position") instanceof Three.BufferAttribute
      ? (geometry.getAttribute("position").array as Float32Array)
      : new Float32Array(maxSegments * 2 * 3)

  let cursor = 0
  let drawnPoints = 0
  for (let t = -phase; t < 1; t += cycle) {
    const startT = Math.max(0, t)
    const endT = Math.min(1, t + dashSize)
    if (endT <= startT) continue

    const start = curve.getPoint(startT)
    const end = curve.getPoint(endT)
    values[cursor++] = start.x
    values[cursor++] = start.y
    values[cursor++] = start.z
    values[cursor++] = end.x
    values[cursor++] = end.y
    values[cursor++] = end.z
    drawnPoints += 2
  }

  if (geometry.getAttribute("position") === undefined) {
    geometry.setAttribute("position", new Three.BufferAttribute(values, 3))
  } else {
    geometry.getAttribute("position").needsUpdate = true
  }
  geometry.setDrawRange(0, drawnPoints)
}

export const mountBezierNodes = (
  element: HTMLElement,
  options: BezierNodesOptions = {},
): Effect.Effect<BezierNodesHandle, BezierNodesMountError> =>
  Effect.try({
    try: () => {
      const resolved = resolveBezierNodesOptions(options)
      const canvas = document.createElement("canvas")
      canvas.style.display = "block"
      canvas.style.width = "100%"
      canvas.style.height = "100%"
      canvas.style.touchAction = "none"
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
      camera.position.set(0, -0.35, 10)
      camera.lookAt(0, -0.35, 0)

      const root = new Three.Group()
      scene.add(root)

      const nodeViews = new Map<string, NodeView>()
      const hitTargets: Three.Object3D[] = []

      for (const node of resolved.nodes) {
        const group = new Three.Group()
        group.position.copy(tupleToVector(node.position))

        const outer = makeCircle(resolved.outerRadius, node.color, 0.2)
        const inner = makeCircle(resolved.innerRadius, node.color, 1)
        inner.position.z = 0.1
        const label = makeTextSprite(node.label)

        group.add(outer, inner, label)
        root.add(group)

        const view: NodeView = {
          id: node.id,
          color: node.color,
          group,
          innerMaterial: inner.material,
          hitTargets: [outer, inner],
        }
        nodeViews.set(node.id, view)
        hitTargets.push(...view.hitTargets)
      }

      const connectionGroup = new Three.Group()
      root.add(connectionGroup)
      const markerGroup = new Three.Group()
      markerGroup.position.z = 1
      root.add(markerGroup)

      const connectionViews: ConnectionView[] = []
      for (const connection of createBezierNodeConnections(
        resolved.nodes,
        resolved.horizontalInset,
      )) {
        const source = nodeViews.get(connection.sourceId)
        const target = nodeViews.get(connection.targetId)
        if (source === undefined || target === undefined) continue

        const curve = connectionCurve(
          source.group.position,
          target.group.position,
          resolved.horizontalInset,
        )

        const continuousGeometry = new Three.BufferGeometry()
        setContinuousCurveGeometry(continuousGeometry, curve, resolved.segments)
        const continuousLine = new Three.Line(
          continuousGeometry,
          new Three.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.12,
            depthWrite: false,
          }),
        )

        const dashGeometry = new Three.BufferGeometry()
        writeDashedCurveGeometry(
          dashGeometry,
          curve,
          0,
          resolved.dashSize,
          resolved.gapSize,
        )
        const dashedLine = new Three.LineSegments(
          dashGeometry,
          new Three.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.92,
            depthWrite: false,
          }),
        )

        const startDot = makeCircle(resolved.endpointRadius, 0xff1050, 1)
        const endDot = makeCircle(resolved.endpointRadius, 0xff1050, 1)
        startDot.position.copy(curve.v0)
        endDot.position.copy(curve.v2)

        connectionGroup.add(continuousLine, dashedLine)
        markerGroup.add(startDot, endDot)
        connectionViews.push({
          source,
          target,
          curve,
          continuousGeometry,
          dashGeometry,
          startDot,
          endDot,
          phase: 0,
        })
      }

      let disposed = false
      let frame = 0
      let lastTime = 0
      let activeNode: NodeView | null = null
      let hoveredNode: NodeView | null = null

      const raycaster = new Three.Raycaster()
      const pointer = new Three.Vector2()
      const dragPlane = new Three.Plane(new Three.Vector3(0, 0, 1), 0)
      const dragPoint = new Three.Vector3()

      const setHoveredNode = (node: NodeView | null) => {
        if (hoveredNode === node) return
        if (hoveredNode !== null) hoveredNode.innerMaterial.color.set(hoveredNode.color)
        hoveredNode = node
        if (hoveredNode !== null) hoveredNode.innerMaterial.color.set(0xff1050)
        canvas.style.cursor =
          activeNode !== null ? "grabbing" : hoveredNode !== null ? "grab" : "default"
      }

      const updatePointer = (event: PointerEvent) => {
        const rect = canvas.getBoundingClientRect()
        pointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1
        pointer.y = -(((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1)
        raycaster.setFromCamera(pointer, camera)
      }

      const nodeFromPointer = (event: PointerEvent): NodeView | null => {
        updatePointer(event)
        const intersections = raycaster.intersectObjects(hitTargets, false)
        const hit = intersections[0]?.object
        if (hit === undefined) return null

        for (const view of nodeViews.values()) {
          if (view.hitTargets.includes(hit)) return view
        }
        return null
      }

      const worldPointFromPointer = (event: PointerEvent): Three.Vector3 | null => {
        updatePointer(event)
        return raycaster.ray.intersectPlane(dragPlane, dragPoint)
      }

      const updateConnections = () => {
        for (const connection of connectionViews) {
          const updated = connectionCurve(
            connection.source.group.position,
            connection.target.group.position,
            resolved.horizontalInset,
          )
          connection.curve.v0.copy(updated.v0)
          connection.curve.v1.copy(updated.v1)
          connection.curve.v2.copy(updated.v2)
          connection.startDot.position.copy(connection.curve.v0)
          connection.endDot.position.copy(connection.curve.v2)
          setContinuousCurveGeometry(
            connection.continuousGeometry,
            connection.curve,
            resolved.segments,
          )
          writeDashedCurveGeometry(
            connection.dashGeometry,
            connection.curve,
            connection.phase,
            resolved.dashSize,
            resolved.gapSize,
          )
        }
      }

      const onPointerDown = (event: PointerEvent) => {
        const node = nodeFromPointer(event)
        if (node === null) return
        event.preventDefault()
        activeNode = node
        setHoveredNode(node)
        canvas.style.cursor = "grabbing"
        canvas.setPointerCapture(event.pointerId)
      }

      const onPointerMove = (event: PointerEvent) => {
        if (activeNode === null) {
          setHoveredNode(nodeFromPointer(event))
          return
        }

        const next = worldPointFromPointer(event)
        if (next === null) return
        activeNode.group.position.set(next.x, next.y, 0)
        updateConnections()
      }

      const onPointerUp = (event: PointerEvent) => {
        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId)
        }
        activeNode = null
        setHoveredNode(nodeFromPointer(event))
      }

      const onPointerLeave = () => {
        if (activeNode === null) setHoveredNode(null)
      }

      canvas.addEventListener("pointerdown", onPointerDown)
      canvas.addEventListener("pointermove", onPointerMove)
      canvas.addEventListener("pointerup", onPointerUp)
      canvas.addEventListener("pointercancel", onPointerUp)
      canvas.addEventListener("pointerleave", onPointerLeave)

      const resize = () => {
        const { width, height } = hostSize(element)
        renderer.setSize(width, height, false)
        const aspect = width / height
        const viewHeight = 6.7
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
        const cycle = resolved.dashSize + resolved.gapSize
        for (const connection of connectionViews) {
          connection.phase =
            (connection.phase + delta * resolved.dashSpeed) % cycle
          writeDashedCurveGeometry(
            connection.dashGeometry,
            connection.curve,
            connection.phase,
            resolved.dashSize,
            resolved.gapSize,
          )
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
        canvas.removeEventListener("pointerdown", onPointerDown)
        canvas.removeEventListener("pointermove", onPointerMove)
        canvas.removeEventListener("pointerup", onPointerUp)
        canvas.removeEventListener("pointercancel", onPointerUp)
        canvas.removeEventListener("pointerleave", onPointerLeave)
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
      new BezierNodesMountError({
        reason: error instanceof Error ? error.message : String(error),
      }),
  })
