import * as Three from "three"

export const quickMmorpgSpatialPrimitiveSourceRefs = [
  "projects/repos/Quick_3D_MMORPG/client/shared/spatial-hash-grid.mjs",
  "projects/repos/Quick_3D_MMORPG/client/src/player-input.js",
  "projects/repos/Quick_3D_MMORPG/client/src/spatial-grid-controller.js",
  "projects/repos/Quick_3D_MMORPG/server/src/world-entity.mjs",
] as const

export type SpatialPoint2 = Readonly<{
  x: number
  y: number
}>

export type SpatialSize2 = Readonly<{
  width: number
  height: number
}>

export type SpatialBounds2 = Readonly<{
  minX: number
  minY: number
  maxX: number
  maxY: number
}>

export type SpatialHashGridOptions = Readonly<{
  bounds: SpatialBounds2
  cellsX: number
  cellsY: number
}>

type SpatialCellRange = Readonly<{
  minX: number
  minY: number
  maxX: number
  maxY: number
}>

export type SpatialHashGridClient<TValue> = {
  readonly id: string
  value: TValue
  position: SpatialPoint2
  size: SpatialSize2
  readonly cells: Set<string>
}

export type SpatialHashGridClientInput<TValue> = Readonly<{
  id: string
  value: TValue
  position: SpatialPoint2
  size: SpatialSize2
}>

const positiveCellCount = (value: number): number =>
  Math.max(1, Math.floor(value))

const clampIndex = (value: number, max: number): number =>
  Math.min(Math.max(0, value), max)

const normalizedWithin = (value: number, min: number, max: number): number => {
  if (max <= min) {
    return 0
  }
  return Math.min(Math.max((value - min) / (max - min), 0), 1)
}

const cellKey = (x: number, y: number): string => `${x}:${y}`

export class SpatialHashGrid<TValue> {
  readonly bounds: SpatialBounds2
  readonly cellsX: number
  readonly cellsY: number
  readonly clients = new Map<string, SpatialHashGridClient<TValue>>()

  #cells: Array<Set<SpatialHashGridClient<TValue>>>

  constructor(options: SpatialHashGridOptions) {
    this.bounds = options.bounds
    this.cellsX = positiveCellCount(options.cellsX)
    this.cellsY = positiveCellCount(options.cellsY)
    this.#cells = Array.from(
      { length: this.cellsX * this.cellsY },
      () => new Set<SpatialHashGridClient<TValue>>(),
    )
  }

  insert(input: SpatialHashGridClientInput<TValue>): SpatialHashGridClient<TValue> {
    const existing = this.clients.get(input.id)
    if (existing !== undefined) {
      this.remove(input.id)
    }

    const client: SpatialHashGridClient<TValue> = {
      id: input.id,
      value: input.value,
      position: input.position,
      size: input.size,
      cells: new Set(),
    }

    this.clients.set(client.id, client)
    this.#insertIntoCells(client)
    return client
  }

  update(
    id: string,
    next: Partial<Pick<SpatialHashGridClient<TValue>, "position" | "size" | "value">>,
  ): SpatialHashGridClient<TValue> | undefined {
    const client = this.clients.get(id)
    if (client === undefined) {
      return undefined
    }

    this.#removeFromCells(client)
    if (next.position !== undefined) {
      client.position = next.position
    }
    if (next.size !== undefined) {
      client.size = next.size
    }
    if (next.value !== undefined) {
      client.value = next.value
    }
    this.#insertIntoCells(client)
    return client
  }

  remove(id: string): boolean {
    const client = this.clients.get(id)
    if (client === undefined) {
      return false
    }
    this.#removeFromCells(client)
    return this.clients.delete(id)
  }

  clear(): void {
    for (const cell of this.#cells) {
      cell.clear()
    }
    this.clients.clear()
  }

  findNear(
    position: SpatialPoint2,
    size: SpatialSize2,
  ): ReadonlyArray<SpatialHashGridClient<TValue>> {
    const range = this.#cellRange(position, size)
    const found = new Set<SpatialHashGridClient<TValue>>()
    for (let x = range.minX; x <= range.maxX; x += 1) {
      for (let y = range.minY; y <= range.maxY; y += 1) {
        const cell = this.#cellAt(x, y)
        for (const client of cell) {
          found.add(client)
        }
      }
    }
    return [...found]
  }

  #cellAt(x: number, y: number): Set<SpatialHashGridClient<TValue>> {
    return this.#cells[y * this.cellsX + x] ?? this.#cells[0]!
  }

  #cellIndex(point: SpatialPoint2): SpatialPoint2 {
    const x = normalizedWithin(point.x, this.bounds.minX, this.bounds.maxX)
    const y = normalizedWithin(point.y, this.bounds.minY, this.bounds.maxY)
    return {
      x: clampIndex(Math.floor(x * this.cellsX), this.cellsX - 1),
      y: clampIndex(Math.floor(y * this.cellsY), this.cellsY - 1),
    }
  }

  #cellRange(position: SpatialPoint2, size: SpatialSize2): SpatialCellRange {
    const halfWidth = Math.max(0, size.width) / 2
    const halfHeight = Math.max(0, size.height) / 2
    const min = this.#cellIndex({
      x: position.x - halfWidth,
      y: position.y - halfHeight,
    })
    const max = this.#cellIndex({
      x: position.x + halfWidth,
      y: position.y + halfHeight,
    })
    return {
      minX: Math.min(min.x, max.x),
      minY: Math.min(min.y, max.y),
      maxX: Math.max(min.x, max.x),
      maxY: Math.max(min.y, max.y),
    }
  }

  #insertIntoCells(client: SpatialHashGridClient<TValue>): void {
    const range = this.#cellRange(client.position, client.size)
    for (let x = range.minX; x <= range.maxX; x += 1) {
      for (let y = range.minY; y <= range.maxY; y += 1) {
        const key = cellKey(x, y)
        this.#cellAt(x, y).add(client)
        client.cells.add(key)
      }
    }
  }

  #removeFromCells(client: SpatialHashGridClient<TValue>): void {
    for (const key of client.cells) {
      const [xText, yText] = key.split(":")
      const x = Number(xText)
      const y = Number(yText)
      if (Number.isFinite(x) && Number.isFinite(y)) {
        this.#cellAt(x, y).delete(client)
      }
    }
    client.cells.clear()
  }
}

export type HitTargetKind = "box" | "mesh" | "sphere"

export type HitTarget<TValue> = Readonly<{
  id: string
  value: TValue
  kind: HitTargetKind
  object?: Three.Object3D
  box?: Three.Box3
  sphere?: Three.Sphere
  recursive?: boolean
}>

export type HitTargetResult<TValue> = Readonly<{
  target: HitTarget<TValue>
  distance: number
  point: Three.Vector3
  object?: Three.Object3D
  intersection?: Three.Intersection
}>

export class HitTargetRegistry<TValue> {
  readonly targets = new Map<string, HitTarget<TValue>>()

  register(target: HitTarget<TValue>): HitTarget<TValue> {
    this.targets.set(target.id, target)
    return target
  }

  remove(id: string): boolean {
    return this.targets.delete(id)
  }

  clear(): void {
    this.targets.clear()
  }

  list(): ReadonlyArray<HitTarget<TValue>> {
    return [...this.targets.values()]
  }
}

const hitFromMesh = <TValue>(
  raycaster: Three.Raycaster,
  target: HitTarget<TValue>,
): ReadonlyArray<HitTargetResult<TValue>> => {
  if (target.object === undefined) {
    return []
  }
  return raycaster
    .intersectObject(target.object, target.recursive ?? true)
    .map(intersection => ({
      target,
      distance: intersection.distance,
      point: intersection.point.clone(),
      object: intersection.object,
      intersection,
    }))
}

const hitFromSphere = <TValue>(
  raycaster: Three.Raycaster,
  target: HitTarget<TValue>,
): ReadonlyArray<HitTargetResult<TValue>> => {
  if (target.sphere === undefined) {
    return []
  }
  const point = raycaster.ray.intersectSphere(target.sphere, new Three.Vector3())
  if (point === null) {
    return []
  }
  return [
    {
      target,
      distance: raycaster.ray.origin.distanceTo(point),
      point,
    },
  ]
}

const hitFromBox = <TValue>(
  raycaster: Three.Raycaster,
  target: HitTarget<TValue>,
): ReadonlyArray<HitTargetResult<TValue>> => {
  if (target.box === undefined) {
    return []
  }
  const point = raycaster.ray.intersectBox(target.box, new Three.Vector3())
  if (point === null) {
    return []
  }
  return [
    {
      target,
      distance: raycaster.ray.origin.distanceTo(point),
      point,
    },
  ]
}

export const raycastHitTargets = <TValue>(
  raycaster: Three.Raycaster,
  targets: readonly HitTarget<TValue>[],
): ReadonlyArray<HitTargetResult<TValue>> =>
  targets
    .flatMap(target => {
      if (target.kind === "mesh") {
        return hitFromMesh(raycaster, target)
      }
      if (target.kind === "sphere") {
        return hitFromSphere(raycaster, target)
      }
      return hitFromBox(raycaster, target)
    })
    .sort((a, b) => a.distance - b.distance)

export const raycastHitTargetRegistry = <TValue>(
  raycaster: Three.Raycaster,
  registry: HitTargetRegistry<TValue>,
): ReadonlyArray<HitTargetResult<TValue>> =>
  raycastHitTargets(raycaster, registry.list())

export const raycastHitTargetsFromNdc = <TValue>(
  camera: Three.Camera,
  ndc: Three.Vector2,
  targets: readonly HitTarget<TValue>[],
): ReadonlyArray<HitTargetResult<TValue>> => {
  const raycaster = new Three.Raycaster()
  raycaster.setFromCamera(ndc, camera)
  return raycastHitTargets(raycaster, targets)
}

export type MinimumDistanceLayoutNode = Readonly<{
  id: string
  position: Three.Vector2
  radius?: number
  fixed?: boolean
}>

export type MinimumDistanceLayoutOptions = Readonly<{
  minDistance: number
  iterations?: number
  strength?: number
  bounds?: SpatialBounds2
}>

export type MinimumDistanceLayoutResult = Readonly<{
  id: string
  position: Three.Vector2
}>

const deterministicDirection = (a: number, b: number): Three.Vector2 => {
  const angle = ((a + 1) * 12.9898 + (b + 1) * 78.233) % (Math.PI * 2)
  return new Three.Vector2(Math.cos(angle), Math.sin(angle)).normalize()
}

const clampLayoutPosition = (
  position: Three.Vector2,
  bounds: SpatialBounds2 | undefined,
): Three.Vector2 => {
  if (bounds === undefined) {
    return position
  }
  position.x = Math.min(Math.max(position.x, bounds.minX), bounds.maxX)
  position.y = Math.min(Math.max(position.y, bounds.minY), bounds.maxY)
  return position
}

export const relaxMinimumDistanceLayout = (
  nodes: readonly MinimumDistanceLayoutNode[],
  options: MinimumDistanceLayoutOptions,
): ReadonlyArray<MinimumDistanceLayoutResult> => {
  const iterations = Math.max(1, Math.floor(options.iterations ?? 8))
  const strength = options.strength ?? 0.5
  const positions = nodes.map(node => node.position.clone())
  const fixed = nodes.map(node => node.fixed === true)
  const radii = nodes.map(node => Math.max(0, node.radius ?? 0))

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let i = 0; i < positions.length; i += 1) {
      for (let j = i + 1; j < positions.length; j += 1) {
        const a = positions[i]!
        const b = positions[j]!
        const delta = b.clone().sub(a)
        const distance = delta.length()
        const required = options.minDistance + (radii[i] ?? 0) + (radii[j] ?? 0)
        if (distance >= required) {
          continue
        }

        const direction =
          distance <= 0.000001 ? deterministicDirection(i, j) : delta.multiplyScalar(1 / distance)
        const push = (required - distance) * Math.max(0, strength)
        const aFixed = fixed[i] ?? false
        const bFixed = fixed[j] ?? false

        if (aFixed && bFixed) {
          continue
        }
        if (aFixed) {
          b.add(direction.multiplyScalar(push))
        } else if (bFixed) {
          a.add(direction.multiplyScalar(-push))
        } else {
          const half = push / 2
          a.add(direction.clone().multiplyScalar(-half))
          b.add(direction.multiplyScalar(half))
        }
        clampLayoutPosition(a, options.bounds)
        clampLayoutPosition(b, options.bounds)
      }
    }
  }

  return nodes.map((node, index) => ({
    id: node.id,
    position: positions[index]!.clone(),
  }))
}
