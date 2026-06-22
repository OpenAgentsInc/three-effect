export const verseIconPrimitiveSourceRefs = [
  "openagents/docs/game/woc/02-hud-and-hotbar.md",
  "openagents/docs/game/woc/06-adaptation-plan.md",
] as const

export type VerseIconKind =
  | "agent"
  | "chat"
  | "focus"
  | "inspect"
  | "proof"
  | "pylon"
  | "receipt"
  | "run"
  | "settlement"
  | "training"
  | "zap"

export type VerseIconPrimitive =
  | "bolt"
  | "brackets"
  | "bubble"
  | "chevron"
  | "core"
  | "diamond"
  | "eye"
  | "hex"
  | "node"
  | "orbit"
  | "ring"
  | "spark"
  | "stack"
  | "trace"
  | "triangle"

export type VerseIconBackground =
  | "grid"
  | "halo"
  | "radial"
  | "scanline"
  | "void"

export type VerseIconPaletteName =
  | "agent"
  | "chat"
  | "focus"
  | "gold"
  | "pylon"
  | "proof"
  | "run"
  | "settlement"
  | "training"
  | "zap"

export type VerseIconPalette = Readonly<{
  background: string
  accent: string
  line: string
  glow: string
  shadow: string
}>

export type VerseIconRecipe = Readonly<{
  background: VerseIconBackground
  fallback: boolean
  id: string
  kind: VerseIconKind | "unknown"
  palette: VerseIconPaletteName
  primitives: ReadonlyArray<VerseIconPrimitive>
  seed: number
}>

export type VerseIconDrawCommand =
  | Readonly<{ op: "circle"; cx: number; cy: number; r: number; role: "accent" | "glow" | "line" | "shadow" }>
  | Readonly<{ op: "line"; x1: number; y1: number; x2: number; y2: number; width: number; role: "accent" | "line" }>
  | Readonly<{ op: "polygon"; points: ReadonlyArray<readonly [number, number]>; role: "accent" | "line" | "shadow" }>
  | Readonly<{ op: "rect"; x: number; y: number; width: number; height: number; role: "accent" | "line" | "shadow" }>

export type VerseIconRenderPlan = Readonly<{
  commands: ReadonlyArray<VerseIconDrawCommand>
  palette: VerseIconPalette
  recipe: VerseIconRecipe
  size: number
}>

export type VerseIconCacheStats = Readonly<{
  drawPlans: number
  recipes: number
}>

const paletteTable: Readonly<Record<VerseIconPaletteName, VerseIconPalette>> = {
  agent: {
    background: "#111827",
    accent: "#7dd3fc",
    line: "#e6e9ef",
    glow: "#38bdf8",
    shadow: "#020617",
  },
  chat: {
    background: "#111827",
    accent: "#f5c542",
    line: "#fff7d6",
    glow: "#facc15",
    shadow: "#17110a",
  },
  focus: {
    background: "#0b1220",
    accent: "#a7f3d0",
    line: "#ecfeff",
    glow: "#34d399",
    shadow: "#031712",
  },
  gold: {
    background: "#16120a",
    accent: "#f5b73a",
    line: "#fff0b8",
    glow: "#facc15",
    shadow: "#130b02",
  },
  proof: {
    background: "#101014",
    accent: "#c4b5fd",
    line: "#f5f3ff",
    glow: "#8b5cf6",
    shadow: "#0b0614",
  },
  pylon: {
    background: "#07141a",
    accent: "#00f0ff",
    line: "#e6fbff",
    glow: "#22d3ee",
    shadow: "#020a0d",
  },
  run: {
    background: "#10130d",
    accent: "#4ade80",
    line: "#ecfdf5",
    glow: "#22c55e",
    shadow: "#041007",
  },
  settlement: {
    background: "#11100d",
    accent: "#f59e0b",
    line: "#fff7ed",
    glow: "#fb923c",
    shadow: "#140902",
  },
  training: {
    background: "#09111f",
    accent: "#60a5fa",
    line: "#dbeafe",
    glow: "#3b82f6",
    shadow: "#020617",
  },
  zap: {
    background: "#160f08",
    accent: "#facc15",
    line: "#fef9c3",
    glow: "#fde047",
    shadow: "#170b02",
  },
}

const knownRecipes: Readonly<Record<VerseIconKind, Omit<VerseIconRecipe, "fallback" | "id" | "kind" | "seed">>> = {
  agent: {
    background: "halo",
    palette: "agent",
    primitives: ["core", "orbit", "node"],
  },
  chat: {
    background: "scanline",
    palette: "chat",
    primitives: ["bubble", "stack", "spark"],
  },
  focus: {
    background: "radial",
    palette: "focus",
    primitives: ["brackets", "eye", "ring"],
  },
  inspect: {
    background: "grid",
    palette: "focus",
    primitives: ["eye", "trace", "brackets"],
  },
  proof: {
    background: "grid",
    palette: "proof",
    primitives: ["hex", "trace", "spark"],
  },
  pylon: {
    background: "halo",
    palette: "pylon",
    primitives: ["diamond", "ring", "spark"],
  },
  receipt: {
    background: "void",
    palette: "gold",
    primitives: ["stack", "trace", "spark"],
  },
  run: {
    background: "radial",
    palette: "run",
    primitives: ["triangle", "orbit", "node"],
  },
  settlement: {
    background: "scanline",
    palette: "settlement",
    primitives: ["core", "stack", "chevron"],
  },
  training: {
    background: "grid",
    palette: "training",
    primitives: ["orbit", "node", "trace"],
  },
  zap: {
    background: "halo",
    palette: "zap",
    primitives: ["bolt", "spark", "ring"],
  },
}

const fallbackKeywords: ReadonlyArray<readonly [RegExp, VerseIconKind]> = [
  [/pylon|station|base/i, "pylon"],
  [/agent|avatar|operator|worker/i, "agent"],
  [/run|job|assignment/i, "run"],
  [/proof|replay|verify|verdict/i, "proof"],
  [/receipt|invoice|evidence/i, "receipt"],
  [/settle|payout|payment/i, "settlement"],
  [/train|trace|gradient/i, "training"],
  [/chat|message|forum/i, "chat"],
  [/zap|tip|bolt|sats/i, "zap"],
  [/inspect|search|view/i, "inspect"],
  [/focus|target|lock/i, "focus"],
]

const backgrounds: ReadonlyArray<VerseIconBackground> = [
  "grid",
  "halo",
  "radial",
  "scanline",
  "void",
]

const palettes: ReadonlyArray<VerseIconPaletteName> = [
  "agent",
  "chat",
  "focus",
  "gold",
  "proof",
  "pylon",
  "run",
  "settlement",
  "training",
  "zap",
]

const primitivePool: ReadonlyArray<VerseIconPrimitive> = [
  "bolt",
  "brackets",
  "bubble",
  "chevron",
  "core",
  "diamond",
  "eye",
  "hex",
  "node",
  "orbit",
  "ring",
  "spark",
  "stack",
  "trace",
  "triangle",
]

const recipeCache = new Map<string, VerseIconRecipe>()
const drawPlanCache = new Map<string, VerseIconRenderPlan>()

export const verseIconPalette = (name: VerseIconPaletteName): VerseIconPalette =>
  paletteTable[name]

export const verseIconCacheStats = (): VerseIconCacheStats => ({
  drawPlans: drawPlanCache.size,
  recipes: recipeCache.size,
})

export const clearVerseIconCaches = (): void => {
  recipeCache.clear()
  drawPlanCache.clear()
}

export const hashVerseIconSeed = (id: string, salt = "verse-icon-v1"): number => {
  const input = `${salt}:${id.trim().toLowerCase()}`
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const pick = <T>(items: ReadonlyArray<T>, seed: number, offset: number): T =>
  items[(seed + offset * 2654435761) % items.length]!

const fallbackKindForId = (id: string): VerseIconKind | "unknown" => {
  const hit = fallbackKeywords.find(([pattern]) => pattern.test(id))
  return hit === undefined ? "unknown" : hit[1]
}

const recipeCacheKey = (kind: VerseIconKind | "unknown", id: string): string =>
  `${kind}:${id.trim().toLowerCase()}`

export const verseIconRecipeFor = (
  kind: VerseIconKind | "unknown",
  id: string = kind,
): VerseIconRecipe => {
  const key = recipeCacheKey(kind, id)
  const cached = recipeCache.get(key)
  if (cached !== undefined) {
    return cached
  }

  const seed = hashVerseIconSeed(id)
  const known = kind === "unknown" ? undefined : knownRecipes[kind]
  const recipe: VerseIconRecipe =
    known === undefined
      ? {
          background: pick(backgrounds, seed, 0),
          fallback: true,
          id,
          kind,
          palette: pick(palettes, seed, 1),
          primitives: [
            pick(primitivePool, seed, 2),
            pick(primitivePool, seed, 3),
            pick(primitivePool, seed, 4),
          ],
          seed,
        }
      : {
          ...known,
          fallback: false,
          id,
          kind,
          seed,
        }

  recipeCache.set(key, recipe)
  return recipe
}

export const verseIconRecipeForId = (id: string): VerseIconRecipe => {
  const normalized = id.trim().toLowerCase()
  const exact = (Object.keys(knownRecipes) as ReadonlyArray<VerseIconKind>).find(
    kind => kind === normalized,
  )
  const kind: VerseIconKind | "unknown" = exact ?? fallbackKindForId(normalized)
  return verseIconRecipeFor(kind, id)
}

const round = (value: number): number => Number(value.toFixed(4))

const jitter = (seed: number, index: number, amount: number): number => {
  const mixed = hashVerseIconSeed(`${seed}:${index}`, "verse-icon-jitter")
  return round(((mixed % 2001) / 1000 - 1) * amount)
}

const commandForPrimitive = (
  primitive: VerseIconPrimitive,
  index: number,
  seed: number,
): ReadonlyArray<VerseIconDrawCommand> => {
  const shift = jitter(seed, index, 0.035)
  if (primitive === "bolt") {
    return [{
      op: "polygon",
      points: [[0.54, 0.13], [0.32, 0.52], [0.49, 0.52], [0.41, 0.87], [0.71, 0.43], [0.53, 0.43]],
      role: "accent",
    }]
  }
  if (primitive === "brackets") {
    return [
      { op: "line", x1: 0.18, y1: 0.24, x2: 0.18, y2: 0.42, width: 0.045, role: "line" },
      { op: "line", x1: 0.18, y1: 0.24, x2: 0.36, y2: 0.24, width: 0.045, role: "line" },
      { op: "line", x1: 0.82, y1: 0.76, x2: 0.64, y2: 0.76, width: 0.045, role: "line" },
      { op: "line", x1: 0.82, y1: 0.76, x2: 0.82, y2: 0.58, width: 0.045, role: "line" },
    ]
  }
  if (primitive === "bubble") {
    return [
      { op: "rect", x: 0.22, y: 0.28, width: 0.56, height: 0.34, role: "accent" },
      { op: "polygon", points: [[0.38, 0.62], [0.49, 0.62], [0.34, 0.78]], role: "accent" },
    ]
  }
  if (primitive === "chevron") {
    return [
      { op: "line", x1: 0.28, y1: 0.34, x2: 0.5, y2: 0.5, width: 0.06, role: "line" },
      { op: "line", x1: 0.5, y1: 0.5, x2: 0.28, y2: 0.66, width: 0.06, role: "line" },
      { op: "line", x1: 0.5, y1: 0.34, x2: 0.72, y2: 0.5, width: 0.06, role: "accent" },
      { op: "line", x1: 0.72, y1: 0.5, x2: 0.5, y2: 0.66, width: 0.06, role: "accent" },
    ]
  }
  if (primitive === "core") {
    return [
      { op: "circle", cx: 0.5, cy: 0.5, r: 0.2 + Math.abs(shift), role: "accent" },
      { op: "circle", cx: 0.5, cy: 0.5, r: 0.33, role: "line" },
    ]
  }
  if (primitive === "diamond") {
    return [{
      op: "polygon",
      points: [[0.5, 0.13], [0.78, 0.5], [0.5, 0.87], [0.22, 0.5]],
      role: "accent",
    }]
  }
  if (primitive === "eye") {
    return [
      { op: "polygon", points: [[0.14, 0.5], [0.34, 0.32], [0.66, 0.32], [0.86, 0.5], [0.66, 0.68], [0.34, 0.68]], role: "line" },
      { op: "circle", cx: 0.5, cy: 0.5, r: 0.13, role: "accent" },
    ]
  }
  if (primitive === "hex") {
    return [{
      op: "polygon",
      points: [[0.5, 0.15], [0.78, 0.32], [0.78, 0.68], [0.5, 0.85], [0.22, 0.68], [0.22, 0.32]],
      role: index % 2 === 0 ? "line" : "accent",
    }]
  }
  if (primitive === "node") {
    return [
      { op: "circle", cx: 0.28, cy: 0.34, r: 0.07, role: "accent" },
      { op: "circle", cx: 0.72, cy: 0.36, r: 0.07, role: "accent" },
      { op: "circle", cx: 0.5, cy: 0.72, r: 0.07, role: "accent" },
      { op: "line", x1: 0.28, y1: 0.34, x2: 0.72, y2: 0.36, width: 0.025, role: "line" },
      { op: "line", x1: 0.72, y1: 0.36, x2: 0.5, y2: 0.72, width: 0.025, role: "line" },
      { op: "line", x1: 0.5, y1: 0.72, x2: 0.28, y2: 0.34, width: 0.025, role: "line" },
    ]
  }
  if (primitive === "orbit") {
    return [
      { op: "circle", cx: 0.5 + shift, cy: 0.5, r: 0.31, role: "line" },
      { op: "circle", cx: 0.69, cy: 0.32, r: 0.045, role: "accent" },
    ]
  }
  if (primitive === "ring") {
    return [
      { op: "circle", cx: 0.5, cy: 0.5, r: 0.39, role: "glow" },
      { op: "circle", cx: 0.5, cy: 0.5, r: 0.3, role: "line" },
    ]
  }
  if (primitive === "spark") {
    return [
      { op: "line", x1: 0.5, y1: 0.17, x2: 0.5, y2: 0.34, width: 0.035, role: "accent" },
      { op: "line", x1: 0.5, y1: 0.66, x2: 0.5, y2: 0.83, width: 0.035, role: "accent" },
      { op: "line", x1: 0.17, y1: 0.5, x2: 0.34, y2: 0.5, width: 0.035, role: "accent" },
      { op: "line", x1: 0.66, y1: 0.5, x2: 0.83, y2: 0.5, width: 0.035, role: "accent" },
    ]
  }
  if (primitive === "stack") {
    return [
      { op: "rect", x: 0.28, y: 0.2, width: 0.44, height: 0.12, role: "line" },
      { op: "rect", x: 0.24, y: 0.42, width: 0.52, height: 0.12, role: "accent" },
      { op: "rect", x: 0.3, y: 0.64, width: 0.4, height: 0.12, role: "line" },
    ]
  }
  if (primitive === "trace") {
    return [
      { op: "line", x1: 0.18, y1: 0.72, x2: 0.38, y2: 0.44, width: 0.04, role: "line" },
      { op: "line", x1: 0.38, y1: 0.44, x2: 0.58, y2: 0.56, width: 0.04, role: "line" },
      { op: "line", x1: 0.58, y1: 0.56, x2: 0.82, y2: 0.24, width: 0.04, role: "accent" },
    ]
  }
  return [{
    op: "polygon",
    points: [[0.5, 0.18], [0.82, 0.78], [0.18, 0.78]],
    role: "accent",
  }]
}

export const verseIconRenderPlan = (
  recipe: VerseIconRecipe,
  size = 128,
): VerseIconRenderPlan => {
  const safeSize = Math.max(16, Math.floor(size))
  const key = `${recipe.kind}:${recipe.id}:${recipe.seed}:${safeSize}`
  const cached = drawPlanCache.get(key)
  if (cached !== undefined) {
    return cached
  }
  const commands = recipe.primitives.flatMap((primitive, index) =>
    commandForPrimitive(primitive, index, recipe.seed),
  )
  const plan = {
    commands,
    palette: verseIconPalette(recipe.palette),
    recipe,
    size: safeSize,
  }
  drawPlanCache.set(key, plan)
  return plan
}

const colorForRole = (
  palette: VerseIconPalette,
  role: "accent" | "glow" | "line" | "shadow",
): string => palette[role]

const scale = (value: number, size: number): number => round(value * size)

export const drawVerseIconPlan = (
  canvas: HTMLCanvasElement,
  plan: VerseIconRenderPlan,
): HTMLCanvasElement => {
  canvas.width = plan.size
  canvas.height = plan.size
  const context = canvas.getContext("2d")
  if (context === null) {
    return canvas
  }

  context.clearRect(0, 0, plan.size, plan.size)
  context.fillStyle = plan.palette.background
  context.fillRect(0, 0, plan.size, plan.size)

  if (plan.recipe.background === "grid" || plan.recipe.background === "scanline") {
    context.strokeStyle = plan.palette.shadow
    context.lineWidth = Math.max(1, plan.size / 96)
    const step = plan.recipe.background === "grid" ? plan.size / 4 : plan.size / 8
    for (let at = step; at < plan.size; at += step) {
      context.beginPath()
      context.moveTo(0, at)
      context.lineTo(plan.size, at)
      if (plan.recipe.background === "grid") {
        context.moveTo(at, 0)
        context.lineTo(at, plan.size)
      }
      context.stroke()
    }
  }

  if (plan.recipe.background === "halo" || plan.recipe.background === "radial") {
    const gradient = context.createRadialGradient(
      plan.size / 2,
      plan.size / 2,
      plan.size * 0.08,
      plan.size / 2,
      plan.size / 2,
      plan.size * 0.58,
    )
    gradient.addColorStop(0, plan.palette.glow)
    gradient.addColorStop(1, plan.palette.background)
    context.globalAlpha = plan.recipe.background === "halo" ? 0.28 : 0.18
    context.fillStyle = gradient
    context.fillRect(0, 0, plan.size, plan.size)
    context.globalAlpha = 1
  }

  for (const command of plan.commands) {
    context.strokeStyle = colorForRole(plan.palette, command.role)
    context.fillStyle = colorForRole(plan.palette, command.role)
    context.lineCap = "round"
    context.lineJoin = "round"
    if (command.op === "circle") {
      context.beginPath()
      context.arc(
        scale(command.cx, plan.size),
        scale(command.cy, plan.size),
        scale(command.r, plan.size),
        0,
        Math.PI * 2,
      )
      if (command.role === "line") {
        context.lineWidth = Math.max(1, plan.size / 32)
        context.stroke()
      } else {
        context.globalAlpha = command.role === "glow" ? 0.25 : 1
        context.fill()
        context.globalAlpha = 1
      }
    } else if (command.op === "line") {
      context.beginPath()
      context.moveTo(scale(command.x1, plan.size), scale(command.y1, plan.size))
      context.lineTo(scale(command.x2, plan.size), scale(command.y2, plan.size))
      context.lineWidth = scale(command.width, plan.size)
      context.stroke()
    } else if (command.op === "polygon") {
      const [first, ...rest] = command.points
      if (first !== undefined) {
        context.beginPath()
        context.moveTo(scale(first[0], plan.size), scale(first[1], plan.size))
        for (const point of rest) {
          context.lineTo(scale(point[0], plan.size), scale(point[1], plan.size))
        }
        context.closePath()
        if (command.role === "line") {
          context.lineWidth = Math.max(1, plan.size / 28)
          context.stroke()
        } else {
          context.fill()
        }
      }
    } else {
      context.fillRect(
        scale(command.x, plan.size),
        scale(command.y, plan.size),
        scale(command.width, plan.size),
        scale(command.height, plan.size),
      )
    }
  }

  return canvas
}

export const verseIconCanvas = (
  id: string,
  size = 128,
  canvas = document.createElement("canvas"),
): HTMLCanvasElement => drawVerseIconPlan(canvas, verseIconRenderPlan(verseIconRecipeForId(id), size))
