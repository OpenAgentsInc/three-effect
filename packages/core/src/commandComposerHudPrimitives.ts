import * as Three from "three"
import type { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js"

import { type Vector3Like, toVector3 } from "./cameraPrimitives"
import { createGlowLine, type GlowLineHandle } from "./fatLinePrimitives"
import {
  HUD_STATUS_COLORS,
  createHudFrameCorners,
  hudClamp01,
  type HudFrameHandle,
  type HudStatus,
} from "./hudPrimitives"

/**
 * Three.js atmosphere for the OpenAgents command composer.
 *
 * The DOM/Foldkit composer owns the textarea, labels, buttons, metadata, file
 * affordances, and accessibility tree. This primitive only projects the sci-fi
 * HUD feedback around that DOM surface: edge energy that sits on the existing
 * border, scanner wash, dropcursor beam, attachment hologram nodes, command-card
 * bracket marks, and resize/hardware marks.
 */
export const openAgentsCommandComposerHudPrimitiveSourceRefs = [
  "OpenAgentsInc/openagents#7639",
  "OpenAgentsInc/three-effect#18",
  "openagents/docs/adr/0013-adopt-prosemirror-inspired-command-composer.md#three-effect-hud-primitives",
  "openagents/docs/design/starcraft.md",
  "projects/prosemirror/repos/prosemirror-gapcursor",
  "projects/prosemirror/repos/prosemirror-dropcursor",
] as const

export type CommandComposerAttachmentKind =
  | "file"
  | "image"
  | "text"
  | "code"
  | "diff"

export type CommandComposerAttachmentStatus =
  | "staged"
  | "uploading"
  | "ready"
  | "error"

export type CommandComposerAttachmentProjection = Readonly<{
  id: string
  kind?: CommandComposerAttachmentKind
  status?: CommandComposerAttachmentStatus
  selected?: boolean
  /** 0..1 progress for deferred preview/upload work. */
  progress?: number
}>

export type CommandComposerDropcursorProjection = Readonly<{
  visible?: boolean
  /** X position in local composer world units, centered at 0. */
  x?: number
  /** 0..1 energy multiplier. */
  intensity?: number
}>

export type CommandComposerHudLayout = Readonly<{
  /** Composer width in local world units. */
  width?: number
  /** Composer height in local world units. */
  height?: number
  /** Visual border radius in local world units; used by host projections. */
  borderRadius?: number
  /** Bottom rail reserved for attachment hologram nodes. */
  attachmentRailHeight?: number
  /** Inner visual padding for scanner/dropcursor effects. */
  padding?: number
  /** Width of the command-card bracket affordance near the send controls. */
  commandCardWidth?: number
  /** Height of the command-card bracket affordance near the send controls. */
  commandCardHeight?: number
}>

export type CommandComposerHudProjection = Readonly<{
  layout?: CommandComposerHudLayout
  focused?: boolean
  dragActive?: boolean
  reducedMotion?: boolean
  attachments?: readonly CommandComposerAttachmentProjection[]
  dropcursor?: CommandComposerDropcursorProjection
}>

export type CommandComposerHudOptions = CommandComposerHudProjection &
  Readonly<{
    position?: Vector3Like
    resolution?: readonly [number, number]
    accentColor?: Three.ColorRepresentation
    edgeColor?: Three.ColorRepresentation
    scannerColor?: Three.ColorRepresentation
    errorColor?: Three.ColorRepresentation
    z?: number
  }>

export type ResolvedCommandComposerHudLayout = Required<CommandComposerHudLayout>

export type ResolvedCommandComposerHudOptions = Readonly<{
  layout: ResolvedCommandComposerHudLayout
  focused: boolean
  dragActive: boolean
  reducedMotion: boolean
  attachments: readonly CommandComposerAttachmentProjection[]
  dropcursor: Required<CommandComposerDropcursorProjection>
  position: Three.Vector3
  resolution: readonly [number, number]
  accentColor: Three.ColorRepresentation
  edgeColor: Three.ColorRepresentation
  scannerColor: Three.ColorRepresentation
  errorColor: Three.ColorRepresentation
  z: number
}>

export type CommandComposerHudCssProjectionOptions = Readonly<{
  pixelsPerWorldUnit?: number
  minWorldWidth?: number
  minWorldHeight?: number
}>

export type CommandComposerHudHandle = Readonly<{
  object3D: Three.Group
  /** Bright core + soft envelope exactly on the host composer's border. */
  edgeEnergy: GlowLineHandle
  /** Vertical insertion beam borrowed from ProseMirror dropcursor behavior. */
  dropcursorBeam: GlowLineHandle
  /** Subtle scanner wash; hidden/paused when reduced motion is requested. */
  scannerPlane: Three.Mesh<Three.PlaneGeometry, Three.ShaderMaterial>
  projection: () => ResolvedCommandComposerHudOptions
  setProjection: (projection: CommandComposerHudProjection) => void
  setLayout: (layout: CommandComposerHudLayout) => void
  setFocus: (focused: boolean) => void
  setDragActive: (dragActive: boolean) => void
  setReducedMotion: (reducedMotion: boolean) => void
  setDropcursor: (dropcursor: CommandComposerDropcursorProjection) => void
  setAttachments: (
    attachments: readonly CommandComposerAttachmentProjection[],
  ) => void
  setResolution: (width: number, height: number) => void
  update: (deltaSeconds: number) => void
  attachmentNodes: () => readonly Three.Object3D[]
  dispose: () => void
}>

const DEFAULT_LAYOUT: ResolvedCommandComposerHudLayout = {
  width: 6.8,
  height: 1.75,
  borderRadius: 0.08,
  attachmentRailHeight: 0.34,
  padding: 0.14,
  commandCardWidth: 0.62,
  commandCardHeight: 0.38,
}

const DEFAULT_DROP_CURSOR: Required<CommandComposerDropcursorProjection> = {
  visible: false,
  x: 0,
  intensity: 0.8,
}

const clampPositive = (value: number | undefined, fallback: number): number =>
  value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback

const resolveLayout = (
  layout: CommandComposerHudLayout = {},
): ResolvedCommandComposerHudLayout => ({
  width: clampPositive(layout.width, DEFAULT_LAYOUT.width),
  height: clampPositive(layout.height, DEFAULT_LAYOUT.height),
  borderRadius: Math.max(0, layout.borderRadius ?? DEFAULT_LAYOUT.borderRadius),
  attachmentRailHeight: clampPositive(
    layout.attachmentRailHeight,
    DEFAULT_LAYOUT.attachmentRailHeight,
  ),
  padding: Math.max(0, layout.padding ?? DEFAULT_LAYOUT.padding),
  commandCardWidth: clampPositive(
    layout.commandCardWidth,
    DEFAULT_LAYOUT.commandCardWidth,
  ),
  commandCardHeight: clampPositive(
    layout.commandCardHeight,
    DEFAULT_LAYOUT.commandCardHeight,
  ),
})

const toPosition = (value: Vector3Like | undefined): Three.Vector3 => {
  if (value === undefined) return new Three.Vector3()
  if (value instanceof Three.Vector3) return value.clone()
  return new Three.Vector3(value[0], value[1], value[2])
}

export const resolveCommandComposerHudOptions = (
  options: CommandComposerHudOptions = {},
): ResolvedCommandComposerHudOptions => ({
  layout: resolveLayout(options.layout),
  focused: options.focused ?? false,
  dragActive: options.dragActive ?? false,
  reducedMotion: options.reducedMotion ?? false,
  attachments: [...(options.attachments ?? [])],
  dropcursor: { ...DEFAULT_DROP_CURSOR, ...(options.dropcursor ?? {}) },
  position: toPosition(options.position),
  resolution: options.resolution ?? [1, 1],
  accentColor: options.accentColor ?? HUD_STATUS_COLORS.primary,
  edgeColor: options.edgeColor ?? 0x8bdcff,
  scannerColor: options.scannerColor ?? 0x3bd5ff,
  errorColor: options.errorColor ?? HUD_STATUS_COLORS.error,
  z: options.z ?? 0,
})

export const commandComposerHudLayoutFromCssRect = (
  rect: Pick<DOMRectReadOnly, "width" | "height">,
  options: CommandComposerHudCssProjectionOptions = {},
): ResolvedCommandComposerHudLayout => {
  const scale = clampPositive(options.pixelsPerWorldUnit, 100)
  return resolveLayout({
    width: Math.max(options.minWorldWidth ?? 1, rect.width / scale),
    height: Math.max(options.minWorldHeight ?? 0.5, rect.height / scale),
    borderRadius: DEFAULT_LAYOUT.borderRadius,
  })
}

const rectanglePath = (
  layout: ResolvedCommandComposerHudLayout,
  z: number,
): readonly Vector3Like[] => {
  const hw = layout.width / 2
  const hh = layout.height / 2
  return [
    [-hw, hh, z],
    [hw, hh, z],
    [hw, -hh, z],
    [-hw, -hh, z],
    [-hw, hh, z],
  ]
}

const createScannerPlane = (
  layout: ResolvedCommandComposerHudLayout,
  options: ResolvedCommandComposerHudOptions,
): Three.Mesh<Three.PlaneGeometry, Three.ShaderMaterial> => {
  const width = Math.max(0.01, layout.width - layout.padding * 2)
  const height = Math.max(
    0.01,
    layout.height - layout.padding * 2 - layout.attachmentRailHeight,
  )
  const geometry = new Three.PlaneGeometry(width, height)
  const material = new Three.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new Three.Color(options.scannerColor) },
      uOpacity: { value: options.reducedMotion ? 0.012 : 0.024 },
      uSpeed: { value: options.reducedMotion ? 0 : 0.18 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uSpeed;
      varying vec2 vUv;

      void main() {
        float sweep = fract(vUv.y + uTime * uSpeed);
        float beam = smoothstep(0.0, 0.08, sweep) * (1.0 - smoothstep(0.12, 0.24, sweep));
        float scan = 0.18 + 0.82 * beam;
        float sideFade = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
        float verticalFade = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.92, vUv.y);
        float alpha = uOpacity * scan * sideFade * verticalFade;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: Three.AdditiveBlending,
    toneMapped: false,
  })
  const mesh = new Three.Mesh(geometry, material)
  mesh.name = "command-composer-scanner-plane"
  mesh.userData.openagentsRole = "scanner-plane"
  mesh.position.set(0, layout.attachmentRailHeight / 2, options.z + 0.002)
  return mesh
}

const setGlowLineVisible = (line: GlowLineHandle, visible: boolean): void => {
  line.object3D.visible = visible
  line.core.visible = visible
  line.envelope.visible = visible
}

const setGlowLineOpacity = (line: GlowLineHandle, opacity: number): void => {
  line.setOpacity(hudClamp01(opacity))
}

const materialColorForAttachment = (
  attachment: CommandComposerAttachmentProjection,
  options: ResolvedCommandComposerHudOptions,
): Three.ColorRepresentation => {
  if (attachment.status === "error") return options.errorColor
  if (attachment.selected) return options.accentColor
  if (attachment.status === "ready") return HUD_STATUS_COLORS.success
  if (attachment.status === "uploading") return HUD_STATUS_COLORS.info
  return HUD_STATUS_COLORS.secondary
}

const createAttachmentRail = (
  attachments: readonly CommandComposerAttachmentProjection[],
  layout: ResolvedCommandComposerHudLayout,
  options: ResolvedCommandComposerHudOptions,
): Three.Group => {
  const group = new Three.Group()
  group.name = "command-composer-attachment-rail"
  group.userData.openagentsRole = "attachment-rail"
  const count = attachments.length
  const maxNodes = Math.max(1, count)
  const step = Math.min(0.42, (layout.width - layout.padding * 2) / maxNodes)
  const start = -((count - 1) * step) / 2
  const y = -layout.height / 2 + layout.attachmentRailHeight * 0.52

  attachments.forEach((attachment, index) => {
    const node = new Three.Group()
    node.name = `command-composer-attachment-${attachment.id}`
    node.userData.openagentsRole = "attachment-node"
    node.userData.attachmentId = attachment.id
    node.userData.kind = attachment.kind ?? "file"
    node.userData.status = attachment.status ?? "staged"
    node.position.set(start + index * step, y, options.z + 0.01)

    const color = materialColorForAttachment(attachment, options)
    const radius = attachment.selected ? 0.065 : 0.052
    const bodyGeometry =
      attachment.kind === "image"
        ? new Three.PlaneGeometry(radius * 2.1, radius * 2.1)
        : new Three.CircleGeometry(radius, 20)
    const bodyMaterial = new Three.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: attachment.status === "error" ? 0.95 : 0.78,
      depthWrite: false,
      depthTest: false,
      blending: Three.AdditiveBlending,
      toneMapped: false,
    })
    const body = new Three.Mesh(bodyGeometry, bodyMaterial)
    body.userData.openagentsRole = "attachment-node-body"
    node.add(body)

    const haloGeometry = new Three.CircleGeometry(radius * 2.4, 28)
    const haloMaterial = new Three.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: attachment.selected ? 0.22 : 0.1,
      depthWrite: false,
      depthTest: false,
      blending: Three.AdditiveBlending,
      toneMapped: false,
    })
    const halo = new Three.Mesh(haloGeometry, haloMaterial)
    halo.position.z = -0.001
    halo.userData.openagentsRole = "attachment-node-halo"
    node.add(halo)

    if (attachment.status === "uploading") {
      const progress = hudClamp01(attachment.progress ?? 0.35)
      const progressGeometry = new Three.PlaneGeometry(radius * 2.5 * progress, 0.012)
      const progressMaterial = new Three.MeshBasicMaterial({
        color: options.accentColor,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      })
      const progressBar = new Three.Mesh(progressGeometry, progressMaterial)
      progressBar.position.set((-radius * 2.5 * (1 - progress)) / 2, -radius * 1.6, 0.002)
      progressBar.userData.openagentsRole = "attachment-progress"
      node.add(progressBar)
    }

    group.add(node)
  })

  return group
}

const createLineSegments = (
  name: string,
  segments: readonly (readonly [Vector3Like, Vector3Like])[],
  color: Three.ColorRepresentation,
  opacity: number,
): Three.LineSegments<Three.BufferGeometry, Three.LineBasicMaterial> => {
  const positions: number[] = []
  for (const [a, b] of segments) {
    const start = toVector3(a)
    const end = toVector3(b)
    positions.push(start.x, start.y, start.z, end.x, end.y, end.z)
  }
  const geometry = new Three.BufferGeometry()
  geometry.setAttribute(
    "position",
    new Three.Float32BufferAttribute(positions, 3),
  )
  const material = new Three.LineBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  })
  const line = new Three.LineSegments(geometry, material)
  line.name = name
  line.userData.openagentsRole = name
  return line
}

const commandCardSegments = (
  layout: ResolvedCommandComposerHudLayout,
  z: number,
): readonly (readonly [Vector3Like, Vector3Like])[] => {
  const w = layout.commandCardWidth
  const h = layout.commandCardHeight
  const x0 = layout.width / 2 - layout.padding - w
  const x1 = layout.width / 2 - layout.padding
  const y0 = -layout.height / 2 + layout.padding
  const y1 = y0 + h
  const tick = Math.min(w, h) * 0.38
  return [
    [[x0, y1, z], [x0 + tick, y1, z]],
    [[x0, y1, z], [x0, y1 - tick, z]],
    [[x1, y1, z], [x1 - tick, y1, z]],
    [[x1, y1, z], [x1, y1 - tick, z]],
    [[x1, y0, z], [x1 - tick, y0, z]],
    [[x1, y0, z], [x1, y0 + tick, z]],
  ]
}

const resizeGripSegments = (
  layout: ResolvedCommandComposerHudLayout,
  z: number,
): readonly (readonly [Vector3Like, Vector3Like])[] => {
  const x = layout.width / 2 - layout.padding * 0.7
  const y = -layout.height / 2 + layout.padding * 0.7
  return [0, 1, 2].map((index) => {
    const offset = index * 0.07
    return [
      [x - 0.22 + offset, y, z],
      [x, y + 0.22 - offset, z],
    ] as const
  })
}

const hardwareSegments = (
  layout: ResolvedCommandComposerHudLayout,
  z: number,
): readonly (readonly [Vector3Like, Vector3Like])[] => {
  const left = -layout.width / 2 + layout.padding
  const right = layout.width / 2 - layout.padding
  const top = layout.height / 2 - layout.padding * 0.75
  const bottom = -layout.height / 2 + layout.padding * 0.75
  return [
    [[left, top, z], [left + 0.22, top, z]],
    [[right - 0.22, top, z], [right, top, z]],
    [[left, bottom, z], [left + 0.22, bottom, z]],
    [[right - 0.22, bottom, z], [right, bottom, z]],
  ]
}

const disposeGroupResources = (group: Three.Group): void => {
  group.traverse((object) => {
    const mesh = object as Three.Mesh
    mesh.geometry?.dispose()
    const material = mesh.material
    if (Array.isArray(material)) {
      for (const item of material) item.dispose()
    } else {
      material?.dispose()
    }
  })
  group.removeFromParent()
  group.clear()
}

type CommandComposerHudParts = Readonly<{
  edgeEnergy: GlowLineHandle
  corners: HudFrameHandle
  scannerPlane: Three.Mesh<Three.PlaneGeometry, Three.ShaderMaterial>
  dropcursorBeam: GlowLineHandle
  attachmentRail: Three.Group
  commandCard: Three.LineSegments<Three.BufferGeometry, Three.LineBasicMaterial>
  resizeGrip: Three.LineSegments<Three.BufferGeometry, Three.LineBasicMaterial>
  hardwareMarks: Three.LineSegments<Three.BufferGeometry, Three.LineBasicMaterial>
  dispose: () => void
}>

const buildParts = (
  group: Three.Group,
  projection: ResolvedCommandComposerHudOptions,
): CommandComposerHudParts => {
  const layout = projection.layout
  const z = projection.z

  const edgeEnergy = createGlowLine({
    points: rectanglePath(layout, z + 0.006),
    color: projection.edgeColor,
    envelopeColor: projection.accentColor,
    coreWidth: projection.dragActive ? 2.8 : 2,
    envelopeWidth: projection.dragActive ? 11 : 8,
    opacity: projection.focused || projection.dragActive ? 0.95 : 0.46,
    envelopeOpacity: projection.focused || projection.dragActive ? 0.24 : 0.12,
    emissiveStrength: projection.focused || projection.dragActive ? 2.4 : 1.2,
    resolution: projection.resolution,
    depthTest: false,
    depthWrite: false,
  })
  edgeEnergy.object3D.name = "command-composer-edge-energy"
  edgeEnergy.object3D.userData.openagentsRole = "edge-energy"
  group.add(edgeEnergy.object3D)

  const corners = createHudFrameCorners({
    width: layout.width,
    height: layout.height,
    color: projection.accentColor,
    cornerLength: Math.min(0.34, layout.width * 0.08, layout.height * 0.22),
    background: false,
    opacity: projection.focused ? 0.95 : 0.5,
    z: z + 0.012,
  })
  corners.group.name = "command-composer-corner-hardware"
  corners.group.userData.openagentsRole = "corner-hardware"
  group.add(corners.group)

  const scannerPlane = createScannerPlane(layout, projection)
  group.add(scannerPlane)

  const dropcursorBeam = createGlowLine({
    points: [
      [projection.dropcursor.x, -layout.height / 2 + layout.padding, z + 0.025],
      [projection.dropcursor.x, layout.height / 2 - layout.padding, z + 0.025],
    ],
    color: projection.accentColor,
    coreWidth: 1.8,
    envelopeWidth: 10,
    opacity: projection.dropcursor.intensity,
    envelopeOpacity: 0.24 * projection.dropcursor.intensity,
    emissiveStrength: 2.8,
    resolution: projection.resolution,
    depthTest: false,
    depthWrite: false,
  })
  dropcursorBeam.object3D.name = "command-composer-dropcursor-beam"
  dropcursorBeam.object3D.userData.openagentsRole = "dropcursor-beam"
  setGlowLineVisible(dropcursorBeam, projection.dropcursor.visible)
  group.add(dropcursorBeam.object3D)

  const attachmentRail = createAttachmentRail(
    projection.attachments,
    layout,
    projection,
  )
  group.add(attachmentRail)

  const commandCard = createLineSegments(
    "command-card-affordance",
    commandCardSegments(layout, z + 0.018),
    projection.accentColor,
    projection.focused ? 0.72 : 0.4,
  )
  group.add(commandCard)

  const resizeGrip = createLineSegments(
    "resize-grip-hardware",
    resizeGripSegments(layout, z + 0.02),
    projection.accentColor,
    0.68,
  )
  group.add(resizeGrip)

  const hardwareMarks = createLineSegments(
    "hardware-registration-marks",
    hardwareSegments(layout, z + 0.014),
    HUD_STATUS_COLORS.neutral,
    0.42,
  )
  group.add(hardwareMarks)

  return {
    edgeEnergy,
    corners,
    scannerPlane,
    dropcursorBeam,
    attachmentRail,
    commandCard,
    resizeGrip,
    hardwareMarks,
    dispose: () => {
      edgeEnergy.dispose()
      corners.dispose()
      scannerPlane.geometry.dispose()
      scannerPlane.material.dispose()
      scannerPlane.removeFromParent()
      dropcursorBeam.dispose()
      disposeGroupResources(attachmentRail)
      commandCard.geometry.dispose()
      commandCard.material.dispose()
      commandCard.removeFromParent()
      resizeGrip.geometry.dispose()
      resizeGrip.material.dispose()
      resizeGrip.removeFromParent()
      hardwareMarks.geometry.dispose()
      hardwareMarks.material.dispose()
      hardwareMarks.removeFromParent()
    },
  }
}

const applyScannerMotion = (
  scannerPlane: Three.Mesh<Three.PlaneGeometry, Three.ShaderMaterial>,
  reducedMotion: boolean,
): void => {
  scannerPlane.material.uniforms.uSpeed.value = reducedMotion ? 0 : 0.18
  scannerPlane.material.uniforms.uOpacity.value = reducedMotion ? 0.012 : 0.024
}

const pulseEdgeOpacity = (
  edge: GlowLineHandle,
  projection: ResolvedCommandComposerHudOptions,
  elapsed: number,
): void => {
  if (projection.reducedMotion) {
    setGlowLineOpacity(edge, projection.focused || projection.dragActive ? 0.9 : 0.46)
    return
  }
  const base = projection.focused || projection.dragActive ? 0.72 : 0.38
  const amp = projection.focused || projection.dragActive ? 0.2 : 0.08
  const pulse = 0.5 + 0.5 * Math.sin(elapsed * Math.PI * 2 * 0.65)
  setGlowLineOpacity(edge, base + amp * pulse)
}

/**
 * Create the reusable HUD projection for the OpenAgents command composer.
 *
 * Hosts should place the returned group on a transparent canvas layered over
 * the DOM composer, then call `setLayout(commandComposerHudLayoutFromCssRect())`
 * during resize. The returned visuals do not include labels, buttons, file
 * names, text content, or focusable controls.
 */
export const createCommandComposerHud = (
  options: CommandComposerHudOptions = {},
): CommandComposerHudHandle => {
  let projection = resolveCommandComposerHudOptions(options)
  const group = new Three.Group()
  group.name = "command-composer-hud"
  group.userData.openagentsPrimitive = "command_composer_hud"
  group.position.copy(projection.position)

  let elapsed = 0
  let disposed = false
  let parts = buildParts(group, projection)

  const rebuild = (): void => {
    if (disposed) return
    parts.dispose()
    group.clear()
    group.position.copy(projection.position)
    parts = buildParts(group, projection)
  }

  const setProjection = (next: CommandComposerHudProjection): void => {
    projection = {
      ...projection,
      focused: next.focused ?? projection.focused,
      dragActive: next.dragActive ?? projection.dragActive,
      reducedMotion: next.reducedMotion ?? projection.reducedMotion,
      layout: next.layout ? resolveLayout(next.layout) : projection.layout,
      attachments: next.attachments ? [...next.attachments] : projection.attachments,
      dropcursor: next.dropcursor
        ? { ...projection.dropcursor, ...next.dropcursor }
        : projection.dropcursor,
    }
    rebuild()
  }

  return {
    object3D: group,
    get edgeEnergy() {
      return parts.edgeEnergy
    },
    get dropcursorBeam() {
      return parts.dropcursorBeam
    },
    get scannerPlane() {
      return parts.scannerPlane
    },
    projection: () => projection,
    setProjection,
    setLayout: (layout) => setProjection({ layout }),
    setFocus: (focused) => setProjection({ focused }),
    setDragActive: (dragActive) => setProjection({ dragActive }),
    setReducedMotion: (reducedMotion) => {
      projection = { ...projection, reducedMotion }
      applyScannerMotion(parts.scannerPlane, reducedMotion)
    },
    setDropcursor: (dropcursor) => setProjection({ dropcursor }),
    setAttachments: (attachments) => setProjection({ attachments }),
    setResolution: (width, height) => {
      projection = { ...projection, resolution: [width, height] }
      parts.edgeEnergy.setResolution(width, height)
      parts.dropcursorBeam.setResolution(width, height)
    },
    update: (deltaSeconds) => {
      if (disposed) return
      const delta = Math.max(0, deltaSeconds)
      if (!projection.reducedMotion) {
        elapsed += delta
        parts.scannerPlane.material.uniforms.uTime.value += delta
      }
      pulseEdgeOpacity(parts.edgeEnergy, projection, elapsed)
      const dropcursorOpacity =
        projection.dropcursor.visible && (projection.dragActive || projection.focused)
          ? hudClamp01(projection.dropcursor.intensity)
          : 0
      setGlowLineVisible(parts.dropcursorBeam, dropcursorOpacity > 0)
      if (dropcursorOpacity > 0) setGlowLineOpacity(parts.dropcursorBeam, dropcursorOpacity)
    },
    attachmentNodes: () =>
      parts.attachmentRail.children.filter(
        (child) => child.userData.openagentsRole === "attachment-node",
      ),
    dispose: () => {
      if (disposed) return
      disposed = true
      parts.dispose()
      group.removeFromParent()
      group.clear()
    },
  }
}

export const commandComposerHudCoreOpacity = (
  handle: CommandComposerHudHandle,
): number => (handle.edgeEnergy.core.material as LineMaterial).opacity
