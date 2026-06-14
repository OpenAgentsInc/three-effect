import { Data, Effect } from "effect"
import * as Three from "three"
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js"
import {
  FontLoader,
  type Font,
} from "three/examples/jsm/loaders/FontLoader.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"

export class MokshaMountError extends Data.TaggedError("MokshaMountError")<{
  readonly reason: string
}> {}

export type MokshaImageKey =
  | "district4"
  | "diamondRoad"
  | "catalina"
  | "building21"
  | "sector8"
  | "factory"

export type MokshaParagraphDefinition = Readonly<{
  aspect: number
  factor: number
  header: string
  imageKey: MokshaImageKey
  offset: number
  text: string
}>

export type MokshaStripeDefinition = Readonly<{
  color: number
  height: number
  offset: number
}>

export type MokshaDiamondDefinition = Readonly<{
  factor: number
  offset: number
  scale: number
  x: number
}>

export type MokshaAssetUrls = Readonly<{
  diamondModelUrl: string
  fontUrl: string
  images: Readonly<Record<MokshaImageKey, string>>
}>

export type MokshaAssetOverrides = Readonly<
  Partial<Omit<MokshaAssetUrls, "images">> & {
    images?: Partial<Record<MokshaImageKey, string>>
  }
>

export type MokshaCopyDefinition = Readonly<{
  closingCaption: string
  midTitleLines: readonly string[]
  openingCaption: string
  openingMobileCaption: string
  openingTitle: string
}>

export type MokshaOptions = Readonly<{
  assets?: MokshaAssetOverrides
  backgroundColor?: number
  copy?: Partial<MokshaCopyDefinition>
  diamonds?: readonly MokshaDiamondDefinition[]
  pages?: number
  paragraphs?: readonly MokshaParagraphDefinition[]
  pixelRatio?: number
  sections?: number
  stripes?: readonly MokshaStripeDefinition[]
  zoom?: number
}>

export type ResolvedMokshaOptions = Readonly<{
  assets: MokshaAssetUrls
  backgroundColor: number
  copy: MokshaCopyDefinition
  diamonds: readonly MokshaDiamondDefinition[]
  pages: number
  paragraphs: readonly MokshaParagraphDefinition[]
  pixelRatio: number
  sections: number
  stripes: readonly MokshaStripeDefinition[]
  zoom: number
}>

export type MokshaHandle = Readonly<{
  canvas: HTMLCanvasElement
  dispose: Effect.Effect<void>
  element: HTMLElement
  resize: Effect.Effect<void>
  scrollArea: HTMLDivElement
}>

export const pmndrsMokshaSourceRefs: readonly string[] = [
  "projects/repos/examples/demos/moksha/src/index.jsx",
  "projects/repos/examples/demos/moksha/src/blocks.jsx",
  "projects/repos/examples/demos/moksha/src/components/Plane.jsx",
  "projects/repos/examples/demos/moksha/src/components/Text.jsx",
  "projects/repos/examples/demos/moksha/src/components/CustomMaterial.js",
  "projects/repos/examples/demos/moksha/src/diamonds/Diamonds.jsx",
  "projects/repos/examples/demos/moksha/src/diamonds/BackfaceMaterial.js",
  "projects/repos/examples/demos/moksha/src/diamonds/RefractionMaterial.js",
  "projects/repos/examples/demos/moksha/src/store.js",
]

export const defaultMokshaAssetUrls: MokshaAssetUrls = {
  diamondModelUrl: new URL("./assets/moksha/diamond.glb", import.meta.url).href,
  fontUrl: new URL("./assets/moksha/MOONGET_Heavy.blob", import.meta.url).href,
  images: {
    building21: new URL("./assets/moksha/ph3.jpg", import.meta.url).href,
    catalina: new URL("./assets/moksha/ph1.jpg", import.meta.url).href,
    diamondRoad: new URL(
      "./assets/moksha/photo-1519608487953-e999c86e7455.jpeg",
      import.meta.url,
    ).href,
    district4: new URL(
      "./assets/moksha/photo-1515036551567-bf1198cccc35.jpeg",
      import.meta.url,
    ).href,
    factory: new URL(
      "./assets/moksha/photo-1548191265-cc70d3d45ba1.jpeg",
      import.meta.url,
    ).href,
    sector8: new URL(
      "./assets/moksha/photo-1533577116850-9cc66cad8a9b.jpeg",
      import.meta.url,
    ).href,
  },
}

export const defaultMokshaParagraphs: readonly MokshaParagraphDefinition[] = [
  {
    aspect: 1.51,
    factor: 1.75,
    header: "District 4",
    imageKey: "district4",
    offset: 1,
    text: "Two thousand pharmacologists and bio-chemists were subsidized. Six years later it was being produced commercially.",
  },
  {
    aspect: 1.5,
    factor: 2,
    header: "Diamond Road",
    imageKey: "diamondRoad",
    offset: 2,
    text: "The man who comes back through the Door in the Wall will never be quite the same as the man who went out. He will be wiser but less sure, happier but less self-satisfied, humbler in acknowledging his ignorance yet better equipped to understand the relationship of words to things, of systematic reasoning to the unfathomable mystery which it tries, forever vainly, to comprehend.",
  },
  {
    aspect: 1.5037,
    factor: 2.25,
    header: "Catalina",
    imageKey: "catalina",
    offset: 3,
    text: "The substance can take you to heaven but it can also take you to hell. Or else to both, together or alternately. Or else (if you're lucky, or if you've made yourself ready) beyond either of them. And then beyond the beyond, back to where you started from — back to here, back to New Rotham sted, back to business as usual. Only now, of course, business as usual is completely different.",
  },
  {
    aspect: 0.665,
    factor: 2,
    header: "Building 21",
    imageKey: "building21",
    offset: 4,
    text: "We’ve found that the people whose EEG doesn’t show any alpha-wave activity when they’re relaxed aren’t likely to respond significantly to the substance. That means that, for about fifteen percent of the population, we have to find other approaches to liberation.",
  },
  {
    aspect: 1.55,
    factor: 1.75,
    header: "Sector 8",
    imageKey: "sector8",
    offset: 5,
    text: "By cultivating the state of mind that makes it possible for the dazzling ecstatic insights to become permanent and habitual illuminations. By getting to know oneself to the point where one won’t be compelled by one’s unconscious to do all the ugly, absurd, self-stultifying things that one so often finds oneself doing.",
  },
  {
    aspect: 1.77,
    factor: 1.05,
    header: "The Factory",
    imageKey: "factory",
    offset: 7,
    text: "Education and enlightenment.",
  },
]

export const defaultMokshaStripes: readonly MokshaStripeDefinition[] = [
  { color: 0x000000, height: 13, offset: 0 },
  { color: 0x000000, height: 20, offset: 6.3 },
]

export const defaultMokshaDiamonds: readonly MokshaDiamondDefinition[] = [
  { factor: 4, offset: 0.15, scale: 14, x: 0 },
  { factor: 2.1, offset: 1.1, scale: 1.8, x: 2 },
  { factor: 2.5, offset: 2, scale: 1.8, x: -5 },
  { factor: 1.75, offset: 3.2, scale: 1.8, x: 0 },
  { factor: 2.5, offset: 4, scale: 1.8, x: 0 },
  { factor: 0.85, offset: 5.5, scale: 2.25, x: 2 },
  { factor: 2, offset: 7, scale: 1.8, x: -5 },
  { factor: 6, offset: 8, scale: 2.5, x: 0 },
]

export const defaultMokshaCopy: MokshaCopyDefinition = {
  closingCaption: "Culture is not your friend.",
  midTitleLines: ["four", "zero", "zero"],
  openingCaption: "It was the year 2076. The substance had arrived.",
  openingMobileCaption: "It was the year 2076.\nThe substance had arrived.",
  openingTitle: "MOKSHA",
}

export const defaultMokshaOptions: ResolvedMokshaOptions = {
  assets: defaultMokshaAssetUrls,
  backgroundColor: 0x0c0f13,
  copy: defaultMokshaCopy,
  diamonds: defaultMokshaDiamonds,
  pages: 8,
  paragraphs: defaultMokshaParagraphs,
  pixelRatio: 2,
  sections: 9,
  stripes: defaultMokshaStripes,
  zoom: 75,
}

export const resolveMokshaOptions = (
  options: MokshaOptions = {},
): ResolvedMokshaOptions => ({
  ...defaultMokshaOptions,
  ...options,
  assets: {
    ...defaultMokshaAssetUrls,
    ...(options.assets ?? {}),
    images: {
      ...defaultMokshaAssetUrls.images,
      ...(options.assets?.images ?? {}),
    },
  },
  copy: {
    ...defaultMokshaCopy,
    ...(options.copy ?? {}),
  },
  diamonds: options.diamonds ?? defaultMokshaOptions.diamonds,
  paragraphs: options.paragraphs ?? defaultMokshaOptions.paragraphs,
  stripes: options.stripes ?? defaultMokshaOptions.stripes,
})

type MokshaShaderUniforms = {
  color: { value: Three.Color }
  hasTexture: { value: number }
  opacity: { value: number }
  scale: { value: number }
  shift: { value: number }
  tex: { value: Three.Texture | null }
}

const mokshaPendingOpacity: unique symbol = Symbol("mokshaPendingOpacity")

type MokshaOpacityBootState = {
  [mokshaPendingOpacity]?: number
  uniforms?: Partial<MokshaShaderUniforms>
}

export class MokshaPlaneMaterial extends Three.ShaderMaterial {
  constructor(input: {
    color?: Three.ColorRepresentation | undefined
    depthWrite?: boolean | undefined
    map?: Three.Texture | null | undefined
    opacity?: number | undefined
    transparent?: boolean | undefined
  } = {}) {
    const transparent =
      input.transparent ?? ((input.opacity ?? 1) < 1 || input.map !== undefined)
    super({
      depthWrite: input.depthWrite ?? !transparent,
      fragmentShader: `
        uniform sampler2D tex;
        uniform float hasTexture;
        uniform float shift;
        uniform float scale;
        uniform vec3 color;
        uniform float opacity;
        varying vec2 vUv;
        void main() {
          float angle = 1.55;
          vec2 p = (vUv - vec2(0.5, 0.5)) * (1.0 - scale) + vec2(0.5, 0.5);
          vec2 offset = shift / 4.0 * vec2(cos(angle), sin(angle));
          vec4 cr = texture2D(tex, p + offset);
          vec4 cga = texture2D(tex, p);
          vec4 cb = texture2D(tex, p - offset);
          if (hasTexture == 1.0) {
            gl_FragColor = vec4(cr.r, cga.g, cb.b, cga.a * opacity);
          } else {
            gl_FragColor = vec4(color, opacity);
          }
        }
      `,
      transparent,
      uniforms: {
        color: { value: new Three.Color(input.color ?? 0xffffff) },
        hasTexture: { value: input.map === undefined || input.map === null ? 0 : 1 },
        opacity: { value: input.opacity ?? 1 },
        scale: { value: 0 },
        shift: { value: 0 },
        tex: { value: input.map ?? null },
      },
      vertexShader: `
        uniform float shift;
        varying vec2 vUv;
        void main() {
          vec3 pos = position;
          pos.y = pos.y + ((sin(uv.x * 3.1415926535897932384626433832795) * shift * 2.0) * 0.125);
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
    })

    this.opacity = input.opacity ?? this.opacity
    delete (this as MokshaOpacityBootState)[mokshaPendingOpacity]
  }

  get mokshaUniforms(): MokshaShaderUniforms {
    return this.uniforms as unknown as MokshaShaderUniforms
  }

  override get opacity(): number {
    return (
      (this as MokshaOpacityBootState).uniforms?.opacity?.value ??
      (this as MokshaOpacityBootState)[mokshaPendingOpacity] ??
      1
    )
  }

  override set opacity(value: number) {
    const opacityUniform = (this as MokshaOpacityBootState).uniforms?.opacity
    if (opacityUniform !== undefined) {
      opacityUniform.value = value
      return
    }

    Object.defineProperty(this, mokshaPendingOpacity, {
      configurable: true,
      value,
      writable: true,
    })
  }

  get scaleAmount(): number {
    return this.mokshaUniforms.scale.value
  }

  set scaleAmount(value: number) {
    this.mokshaUniforms.scale.value = value
  }

  get shift(): number {
    return this.mokshaUniforms.shift.value
  }

  set shift(value: number) {
    this.mokshaUniforms.shift.value = value
  }
}

class MokshaBackfaceMaterial extends Three.ShaderMaterial {
  constructor() {
    super({
      fragmentShader: `
        varying vec3 worldNormal;
        void main() {
          gl_FragColor = vec4(worldNormal, 1.0);
        }
      `,
      side: Three.BackSide,
      vertexShader: `
        varying vec3 worldNormal;
        void main() {
          vec4 transformedNormal = vec4(normal, 0.0);
          vec4 transformedPosition = vec4(position, 1.0);
          #ifdef USE_INSTANCING
            transformedNormal = instanceMatrix * transformedNormal;
            transformedPosition = instanceMatrix * transformedPosition;
          #endif
          worldNormal = normalize(modelViewMatrix * transformedNormal).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * transformedPosition;
        }
      `,
    })
  }
}

class MokshaRefractionMaterial extends Three.ShaderMaterial {
  constructor(options: {
    backfaceMap: Three.Texture
    envMap: Three.Texture
    resolution: readonly [number, number]
  }) {
    super({
      fragmentShader: `
        uniform sampler2D envMap;
        uniform sampler2D backfaceMap;
        uniform vec2 resolution;
        varying vec3 worldNormal;
        varying vec3 viewDirection;
        float fresnelFunc(vec3 viewDirection, vec3 worldNormal) {
          return pow(1.05 + dot(viewDirection, worldNormal), 100.0);
        }
        void main() {
          vec2 uv = gl_FragCoord.xy / resolution;
          vec3 normal = worldNormal * 0.3 - texture2D(backfaceMap, uv).rgb * 0.7;
          vec4 color = texture2D(envMap, uv + refract(viewDirection, normal, 1.0 / 1.5).xy);
          gl_FragColor = vec4(mix(color.rgb, vec3(0.4), fresnelFunc(viewDirection, normal)), 1.0);
        }
      `,
      uniforms: {
        backfaceMap: { value: options.backfaceMap },
        envMap: { value: options.envMap },
        resolution: { value: new Three.Vector2(...options.resolution) },
      },
      vertexShader: `
        varying vec3 worldNormal;
        varying vec3 viewDirection;
        void main() {
          vec4 transformedNormal = vec4(normal, 0.0);
          vec4 transformedPosition = vec4(position, 1.0);
          #ifdef USE_INSTANCING
            transformedNormal = instanceMatrix * transformedNormal;
            transformedPosition = instanceMatrix * transformedPosition;
          #endif
          worldNormal = normalize(modelViewMatrix * transformedNormal).xyz;
          viewDirection = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
          gl_Position = projectionMatrix * modelViewMatrix * transformedPosition;
        }
      `,
    })
  }

  setResolution(width: number, height: number): void {
    const uniform = this.uniforms.resolution?.value
    if (uniform instanceof Three.Vector2) {
      uniform.set(width, height)
    }
  }
}

const lerp = (from: number, to: number, alpha: number): number =>
  from + (to - from) * alpha

const hostSize = (element: HTMLElement): { height: number; width: number } => {
  const rect = element.getBoundingClientRect()
  const width = Math.max(1, Math.floor(rect.width || element.clientWidth || 320))
  const height = Math.max(1, Math.floor(rect.height || element.clientHeight || 420))
  return { height, width }
}

const disposeMaterial = (
  material: Three.Material | Three.Material[],
  disposeMaps = true,
): void => {
  if (Array.isArray(material)) {
    material.forEach(item => disposeMaterial(item, disposeMaps))
    return
  }
  if (disposeMaps) {
    const withMap = material as Three.Material & { map?: Three.Texture | null }
    withMap.map?.dispose()
  }
  material.dispose()
}

const disposeObject = (object: Three.Object3D, disposeMaps = true): void => {
  object.traverse(child => {
    const mesh = child as Three.Object3D & {
      geometry?: Three.BufferGeometry
      material?: Three.Material | Three.Material[]
    }
    mesh.geometry?.dispose()
    if (mesh.material !== undefined) {
      disposeMaterial(mesh.material, disposeMaps)
    }
  })
}

type MokshaLayout = Readonly<{
  canvasHeight: number
  canvasWidth: number
  contentMaxWidth: number
  height: number
  margin: number
  mobile: boolean
  sectionHeight: number
  width: number
}>

type MokshaScrollGroup = Readonly<{
  factor: number
  group: Three.Group
  offset: number
}>

type MokshaPlaneView = {
  lastTop: number
  material: MokshaPlaneMaterial
  offset: number
  shift: number
}

type MokshaDiamondView = {
  definition: MokshaDiamondDefinition
  position: Three.Vector3
}

const layoutFor = (
  size: { height: number; width: number },
  options: ResolvedMokshaOptions,
): MokshaLayout => {
  const canvasWidth = size.width / options.zoom
  const canvasHeight = size.height / options.zoom
  const mobile = size.width < 700
  return {
    canvasHeight,
    canvasWidth,
    contentMaxWidth: canvasWidth * (mobile ? 0.8 : 0.6),
    height: size.height,
    margin: canvasWidth * (mobile ? 0.2 : 0.1),
    mobile,
    sectionHeight:
      canvasHeight * ((options.pages - 1) / Math.max(1, options.sections - 1)),
    width: size.width,
  }
}

const makePlane = (input: {
  color?: Three.ColorRepresentation | undefined
  depthWrite?: boolean | undefined
  height: number
  opacity?: number | undefined
  texture?: Three.Texture | undefined
  transparent?: boolean | undefined
  width: number
}): Three.Mesh<Three.PlaneGeometry, MokshaPlaneMaterial> =>
  new Three.Mesh(
    new Three.PlaneGeometry(input.width, input.height, 32, 32),
    new MokshaPlaneMaterial({
      color: input.color,
      depthWrite: input.depthWrite,
      map: input.texture,
      opacity: input.opacity,
      transparent: input.transparent,
    }),
  )

const makeCanvasTextTexture = (input: {
  align?: CanvasTextAlign | undefined
  color?: string | undefined
  font?: string | undefined
  maxWidth: number
  text: string
}): { aspect: number; texture: Three.CanvasTexture } => {
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  const width = 1024
  const padding = 24
  const lineHeight = 43
  const font =
    input.font ??
    "38px 'Sulphur Point', Inter, ui-sans-serif, system-ui, sans-serif"
  canvas.width = 1024
  canvas.height = 256

  const wrapLine = (
    measuringContext: CanvasRenderingContext2D,
    value: string,
  ): string[] => {
    const words = value.split(/\s+/).filter(word => word.length > 0)
    if (words.length === 0) return [""]

    const lines: string[] = []
    let line = ""
    for (const word of words) {
      const next = line === "" ? word : `${line} ${word}`
      if (
        measuringContext.measureText(next).width > input.maxWidth &&
        line !== ""
      ) {
        lines.push(line)
        line = word
      } else {
        line = next
      }
    }
    if (line !== "") {
      lines.push(line)
    }
    return lines
  }

  if (context !== null) {
    context.font = font
    const lines = input.text
      .split("\n")
      .flatMap(line => wrapLine(context, line))

    canvas.width = width
    canvas.height = Math.max(128, padding * 2 + lines.length * lineHeight)
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = input.color ?? "rgba(255,255,255,0.78)"
    context.font = font
    context.textAlign = input.align ?? "left"
    context.textBaseline = "top"

    const x =
      input.align === "right"
        ? canvas.width - 24
        : input.align === "center"
          ? canvas.width / 2
          : 24
    lines.forEach((value, index) => {
      context.fillText(value, x, padding + index * lineHeight)
    })
  }

  const texture = new Three.CanvasTexture(canvas)
  texture.colorSpace = Three.SRGBColorSpace
  return { aspect: canvas.width / canvas.height, texture }
}

const makeCanvasTextPlane = (input: {
  align?: CanvasTextAlign | undefined
  color?: string | undefined
  maxPixelWidth?: number
  text: string
  width: number
}): Three.Mesh<Three.PlaneGeometry, Three.MeshBasicMaterial> => {
  const { aspect, texture } = makeCanvasTextTexture({
    align: input.align,
    color: input.color,
    maxWidth: input.maxPixelWidth ?? 760,
    text: input.text,
  })
  return new Three.Mesh(
    new Three.PlaneGeometry(input.width, input.width / aspect),
    new Three.MeshBasicMaterial({
      depthWrite: false,
      map: texture,
      transparent: true,
    }),
  )
}

const makeFontText = (input: {
  alignX: "center" | "left" | "right"
  alignY: "center" | "top"
  color: Three.ColorRepresentation
  font: Font | null
  opacity?: number | undefined
  size: number
  text: string
}): Three.Object3D => {
  if (input.font === null) {
    return makeCanvasTextPlane({
      align: input.alignX,
      color: new Three.Color(input.color).getStyle(),
      maxPixelWidth: 980,
      text: input.text,
      width: input.text.length * input.size * 0.62,
    })
  }

  const geometry = new TextGeometry(input.text, {
    curveSegments: 24,
    depth: 0.01,
    font: input.font,
    size: 1,
  })
  geometry.computeBoundingBox()
  const box = new Three.Vector3()
  geometry.boundingBox?.getSize(box)

  const mesh = new Three.Mesh(
    geometry,
    new MokshaPlaneMaterial({
      color: input.color,
      opacity: input.opacity,
    }),
  )
  mesh.frustumCulled = false
  mesh.position.x =
    input.alignX === "left" ? 0 : input.alignX === "right" ? -box.x : -box.x / 2
  mesh.position.y = input.alignY === "top" ? 0 : -box.y / 2

  const group = new Three.Group()
  group.scale.set(input.size, input.size, 0.1)
  group.add(mesh)
  return group
}

const firstMeshGeometry = (root: Three.Object3D): Three.BufferGeometry | null => {
  let found: Three.BufferGeometry | null = null
  root.traverse(child => {
    if (found !== null) return
    const mesh = child as Three.Object3D & { geometry?: Three.BufferGeometry }
    if (mesh.geometry !== undefined) {
      found = mesh.geometry.clone()
    }
  })
  if (found === null) return null
  const geometry: Three.BufferGeometry = found
  geometry.center()
  return geometry
}

export const mountMokshaExperience = (
  element: HTMLElement,
  options: MokshaOptions = {},
): Effect.Effect<MokshaHandle, MokshaMountError> =>
  Effect.try({
    try: () => {
      const resolved = resolveMokshaOptions(options)
      element.replaceChildren()
      element.style.position = "relative"
      element.style.overflow = "hidden"
      element.style.background = "#0c0f13"

      const canvas = document.createElement("canvas")
      canvas.style.display = "block"
      canvas.style.height = "100%"
      canvas.style.inset = "0"
      canvas.style.position = "absolute"
      canvas.style.width = "100%"

      const scrollArea = document.createElement("div")
      scrollArea.style.height = "100%"
      scrollArea.style.inset = "0"
      scrollArea.style.overflow = "auto"
      scrollArea.style.position = "absolute"
      scrollArea.style.width = "100%"
      scrollArea.style.zIndex = "2"

      for (let index = 0; index < resolved.sections; index += 1) {
        const section = document.createElement("div")
        section.id = `moksha-${String(index).padStart(2, "0")}`
        section.style.height = `${(resolved.pages / resolved.sections) * 100}vh`
        scrollArea.append(section)
      }

      element.append(canvas, scrollArea)

      const renderer = new Three.WebGLRenderer({
        alpha: false,
        antialias: true,
        canvas,
      })
      renderer.outputColorSpace = Three.SRGBColorSpace
      renderer.setClearColor(resolved.backgroundColor, 1)
      renderer.autoClear = false

      const scene = new Three.Scene()
      const camera = new Three.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
      camera.position.set(0, 0, 500)
      camera.lookAt(0, 0, 0)

      const contentGroup = new Three.Group()
      scene.add(contentGroup)

      let size = hostSize(element)
      let layout = layoutFor(size, resolved)
      let disposed = false
      let frame = 0
      let scrollTop = scrollArea.scrollTop
      let loadedFont: Font | null = null
      let startupMaterial: MokshaPlaneMaterial | null = null
      let scrollGroups: MokshaScrollGroup[] = []
      let planeViews: MokshaPlaneView[] = []
      const imageTextures = new Map<MokshaImageKey, Three.Texture>()

      const textureLoader = new Three.TextureLoader()
      for (const paragraph of resolved.paragraphs) {
        if (imageTextures.has(paragraph.imageKey)) continue
        const texture = textureLoader.load(resolved.assets.images[paragraph.imageKey])
        texture.colorSpace = Three.SRGBColorSpace
        texture.minFilter = Three.LinearFilter
        imageTextures.set(paragraph.imageKey, texture)
      }

      const makeScrollGroup = (offset: number, factor: number): Three.Group => {
        const group = new Three.Group()
        group.position.y = -layout.sectionHeight * offset * factor
        contentGroup.add(group)
        scrollGroups.push({ factor, group, offset })
        return group
      }

      const addPlaneView = (
        material: MokshaPlaneMaterial,
        offset: number,
        shift: number,
      ): void => {
        planeViews.push({ lastTop: scrollTop, material, offset, shift })
      }

      const clearContent = (): void => {
        for (const child of [...contentGroup.children]) {
          disposeObject(child, false)
          contentGroup.remove(child)
        }
        scrollGroups = []
        planeViews = []
        startupMaterial = null
      }

      const createOpeningCopy = (): void => {
        const titleGroup = makeScrollGroup(0, 1.2)
        const title = makeFontText({
          alignX: "left",
          alignY: "center",
          color: 0xd40749,
          font: loadedFont,
          size: layout.contentMaxWidth * 0.15,
          text: resolved.copy.openingTitle,
        })
        title.position.set(-layout.contentMaxWidth / 3.2, 0.5, -1)
        titleGroup.add(title)

        const captionGroup = makeScrollGroup(0, 1)
        const caption = makeCanvasTextPlane({
          color: "rgba(255,255,255,0.92)",
          maxPixelWidth: 900,
          text: layout.mobile
            ? resolved.copy.openingMobileCaption
            : resolved.copy.openingCaption,
          width: layout.mobile ? layout.canvasWidth * 0.75 : layout.canvasWidth * 0.48,
        })
        caption.position.set(
          -layout.canvasWidth / 2 + caption.geometry.parameters.width / 2 + 0.4,
          -layout.canvasHeight / 2 + 0.55,
          1,
        )
        captionGroup.add(caption)
      }

      const createMidTitle = (): void => {
        const group = makeScrollGroup(5.7, 1.2)
        resolved.copy.midTitleLines.forEach((line, index) => {
          const text = makeFontText({
            alignX: "left",
            alignY: "top",
            color: 0x2fe8c3,
            font: loadedFont,
            size: layout.contentMaxWidth * 0.15,
            text: line,
          })
          text.position.set(-layout.contentMaxWidth / 3.5, -index * (layout.contentMaxWidth / 5), -1)
          group.add(text)
        })
      }

      const createParagraph = (
        paragraph: MokshaParagraphDefinition,
        index: number,
      ): void => {
        const texture = imageTextures.get(paragraph.imageKey)
        const imageSize = paragraph.aspect < 1 && !layout.mobile ? 0.65 : 1
        const alignRight =
          (layout.canvasWidth - layout.contentMaxWidth * imageSize - layout.margin) /
          2
        const left = index % 2 === 0
        const group = makeScrollGroup(paragraph.offset, paragraph.factor)
        group.position.x = left ? -alignRight : alignRight

        const imageWidth = layout.contentMaxWidth * imageSize
        const imageHeight = imageWidth / paragraph.aspect
        const image = makePlane({
          height: imageHeight,
          texture,
          width: imageWidth,
        })
        image.frustumCulled = false
        group.add(image)
        addPlaneView(image.material, paragraph.offset, 75)

        const paragraphPlane = makeCanvasTextPlane({
          align: left ? "left" : "right",
          color: "rgba(255,255,255,0.68)",
          maxPixelWidth: layout.mobile ? 900 : 560,
          text: paragraph.text,
          width: layout.mobile ? imageWidth : imageWidth / 2,
        })
        paragraphPlane.position.set(
          left || layout.mobile ? -imageWidth / 2 + paragraphPlane.geometry.parameters.width / 2 : imageWidth / 4,
          -imageHeight / 2 - 0.48,
          1,
        )
        group.add(paragraphPlane)

        const header = makeFontText({
          alignX: left ? "left" : "right",
          alignY: "top",
          color: left ? 0x2fe8c3 : 0xd40749,
          font: loadedFont,
          size: layout.contentMaxWidth * 0.04,
          text: paragraph.header,
        })
        header.position.set(
          ((left ? -layout.contentMaxWidth : layout.contentMaxWidth) *
            imageSize) /
            2,
          imageHeight / 2 + 0.5,
          -1,
        )
        group.add(header)

        const numberGroup = makeScrollGroup(paragraph.offset, 0.2)
        const number = makeFontText({
          alignX: "center",
          alignY: "center",
          color: 0x1a1e2a,
          font: loadedFont,
          opacity: 0.5,
          size: layout.contentMaxWidth * 0.5,
          text: `0${index + 1}`,
        })
        number.position.set(
          ((left ? layout.contentMaxWidth : -layout.contentMaxWidth) / 2) *
            imageSize,
          imageHeight,
          -10,
        )
        numberGroup.add(number)
      }

      const createStripes = (): void => {
        resolved.stripes.forEach(stripe => {
          const group = makeScrollGroup(stripe.offset, -1.5)
          const plane = makePlane({
            color: stripe.color,
            height: stripe.height,
            width: 50,
          })
          plane.position.set(0, 0, -10)
          plane.rotation.z = Math.PI / 8
          group.add(plane)
          addPlaneView(plane.material, stripe.offset, -4)
        })
      }

      const createClosingCopy = (): void => {
        const group = makeScrollGroup(8, 1.25)
        const caption = makeCanvasTextPlane({
          color: "rgba(255,255,255,0.92)",
          maxPixelWidth: 760,
          text: resolved.copy.closingCaption,
          width: layout.mobile ? layout.canvasWidth * 0.75 : layout.canvasWidth * 0.36,
        })
        caption.position.set(
          -layout.canvasWidth / 2 + caption.geometry.parameters.width / 2 + 0.4,
          -layout.canvasHeight / 2 + 0.55,
          1,
        )
        group.add(caption)
      }

      const createStartupFade = (): void => {
        const plane = makePlane({
          color: 0x0e0e0f,
          depthWrite: false,
          height: 100,
          opacity: 1,
          transparent: true,
          width: 100,
        })
        plane.position.set(0, 0, 200)
        contentGroup.add(plane)
        startupMaterial = plane.material
      }

      const rebuildContent = (): void => {
        clearContent()
        createOpeningCopy()
        createMidTitle()
        resolved.paragraphs.forEach(createParagraph)
        createStripes()
        createClosingCopy()
        createStartupFade()
      }

      const ratio = () =>
        Math.min(window.devicePixelRatio || 1, resolved.pixelRatio)
      const renderTargetSize = () => ({
        height: Math.max(1, Math.floor(size.height * ratio())),
        width: Math.max(1, Math.floor(size.width * ratio())),
      })

      const targetSize = renderTargetSize()
      const envFbo = new Three.WebGLRenderTarget(
        targetSize.width,
        targetSize.height,
      )
      const backfaceFbo = new Three.WebGLRenderTarget(
        targetSize.width,
        targetSize.height,
      )
      const backfaceMaterial = new MokshaBackfaceMaterial()
      const refractionMaterial = new MokshaRefractionMaterial({
        backfaceMap: backfaceFbo.texture,
        envMap: envFbo.texture,
        resolution: [targetSize.width, targetSize.height],
      })

      const diamondViews: MokshaDiamondView[] = resolved.diamonds.map(definition => ({
        definition,
        position: new Three.Vector3(),
      }))
      const dummy = new Three.Object3D()
      const fallbackDiamondGeometry = new Three.OctahedronGeometry(1, 2)
      const diamondMesh = new Three.InstancedMesh<
        Three.BufferGeometry,
        Three.Material
      >(
        fallbackDiamondGeometry,
        refractionMaterial,
        diamondViews.length,
      )
      diamondMesh.layers.set(1)
      diamondMesh.position.set(0, 0, 50)
      scene.add(diamondMesh)

      const resize = (): void => {
        size = hostSize(element)
        layout = layoutFor(size, resolved)
        renderer.setPixelRatio(ratio())
        renderer.setSize(size.width, size.height, false)
        camera.left = -layout.canvasWidth / 2
        camera.right = layout.canvasWidth / 2
        camera.top = layout.canvasHeight / 2
        camera.bottom = -layout.canvasHeight / 2
        camera.updateProjectionMatrix()

        const fboSize = renderTargetSize()
        envFbo.setSize(fboSize.width, fboSize.height)
        backfaceFbo.setSize(fboSize.width, fboSize.height)
        refractionMaterial.setResolution(fboSize.width, fboSize.height)
        rebuildContent()
      }

      const updateScrollGroups = (): void => {
        for (const view of scrollGroups) {
          const targetY =
            -layout.sectionHeight * view.offset * view.factor +
            (scrollTop / resolved.zoom) * view.factor
          view.group.position.y = lerp(view.group.position.y, targetY, 0.1)
        }
      }

      const updatePlaneMaterials = (): void => {
        for (const view of planeViews) {
          const scaleTarget =
            (view.offset + 1) / resolved.sections -
            scrollTop / Math.max(1, (resolved.pages - 1) * layout.height)
          view.material.scaleAmount = lerp(
            view.material.scaleAmount,
            scaleTarget,
            0.1,
          )
          view.material.shift = lerp(
            view.material.shift,
            ((scrollTop - view.lastTop) / view.shift) * 1.5,
            0.1,
          )
          view.lastTop = scrollTop
        }
        if (startupMaterial !== null) {
          startupMaterial.opacity = lerp(startupMaterial.opacity, 0, 0.025)
        }
      }

      const updateDiamonds = (time: number): void => {
        diamondViews.forEach((view, index) => {
          const t = time / 2000
          const { definition, position } = view
          const scale = (layout.contentMaxWidth / 35) * definition.scale
          position.set(
            layout.mobile ? 0 : definition.x,
            lerp(
              position.y,
              -layout.sectionHeight * definition.offset * definition.factor +
                (scrollTop / resolved.zoom) * definition.factor,
              0.1,
            ),
            0,
          )
          dummy.position.copy(position)
          if (index === diamondViews.length - 1) {
            dummy.rotation.set(0, t, 0)
          } else {
            dummy.rotation.set(t, t, t)
          }
          dummy.scale.set(scale, scale, scale)
          dummy.updateMatrix()
          diamondMesh.setMatrixAt(index, dummy.matrix)
        })
        diamondMesh.instanceMatrix.needsUpdate = true
      }

      const renderScene = (time: number): void => {
        if (disposed) return
        scrollTop = scrollArea.scrollTop
        updateScrollGroups()
        updatePlaneMaterials()
        updateDiamonds(time)

        camera.layers.set(0)
        renderer.setRenderTarget(envFbo)
        renderer.clear()
        renderer.render(scene, camera)
        renderer.clearDepth()

        camera.layers.set(1)
        diamondMesh.material = backfaceMaterial
        renderer.setRenderTarget(backfaceFbo)
        renderer.clearDepth()
        renderer.render(scene, camera)

        camera.layers.set(0)
        renderer.setRenderTarget(null)
        renderer.clear()
        renderer.render(scene, camera)
        renderer.clearDepth()

        camera.layers.set(1)
        diamondMesh.material = refractionMaterial
        renderer.render(scene, camera)
        camera.layers.set(0)

        frame = requestAnimationFrame(renderScene)
      }

      const onScroll = (): void => {
        scrollTop = scrollArea.scrollTop
      }

      const observer =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(() => resize())

      const fontLoader = new FontLoader()
      fontLoader.load(
        resolved.assets.fontUrl,
        font => {
          if (disposed) return
          loadedFont = font
          rebuildContent()
        },
        undefined,
        () => {},
      )

      const gltfLoader = new GLTFLoader()
      gltfLoader.load(
        resolved.assets.diamondModelUrl,
        gltf => {
          if (disposed) return
          const geometry = firstMeshGeometry(gltf.scene)
          if (geometry === null) return
          diamondMesh.geometry.dispose()
          diamondMesh.geometry = geometry
        },
        undefined,
        () => {},
      )

      scrollArea.addEventListener("scroll", onScroll, { passive: true })
      resize()
      observer?.observe(element)
      frame = requestAnimationFrame(renderScene)

      const dispose = Effect.sync(() => {
        if (disposed) return
        disposed = true
        cancelAnimationFrame(frame)
        observer?.disconnect()
        scrollArea.removeEventListener("scroll", onScroll)
        clearContent()
        imageTextures.forEach(texture => texture.dispose())
        diamondMesh.geometry.dispose()
        backfaceMaterial.dispose()
        refractionMaterial.dispose()
        envFbo.dispose()
        backfaceFbo.dispose()
        renderer.dispose()
        element.replaceChildren()
      })

      return {
        canvas,
        dispose,
        element,
        resize: Effect.sync(resize),
        scrollArea,
      }
    },
    catch: error =>
      new MokshaMountError({
        reason: error instanceof Error ? error.message : String(error),
      }),
  })
