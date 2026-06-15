import * as Three from "three"
import type { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js"
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js"
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js"
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js"

export const threejsSandboxConditionalLineSourceRefs = [
  "projects/repos/threejs-sandbox/conditional-lines/src/ConditionalEdgesGeometry.js",
  "projects/repos/threejs-sandbox/conditional-lines/src/ConditionalEdgesShader.js",
  "projects/repos/threejs-sandbox/conditional-lines/src/Lines2/ConditionalLineSegmentsGeometry.js",
  "projects/repos/threejs-sandbox/conditional-lines/src/Lines2/ConditionalLineMaterial.js",
] as const

export type ConditionalEdgesGeometryOptions = Readonly<{
  mergeTolerance?: number
  normalDotThreshold?: number
}>

export type ConditionalLineOptions = Readonly<{
  color?: Three.ColorRepresentation
  depthTest?: boolean
  depthWrite?: boolean
  linewidth?: number
  opacity?: number
  resolution?: readonly [number, number]
  transparent?: boolean
}>

export type ConditionalLineSegmentsHandle = Readonly<{
  dispose: () => void
  edgesGeometry: Three.BufferGeometry
  geometry: ConditionalLineSegmentsGeometry
  line: LineSegments2
  material: ConditionalLineMaterial
  setResolution: (width: number, height: number) => void
}>

type EdgeInfo = {
  controlIndex0: number
  controlIndex1: number | null
  index0: number
  index1: number
  tri0: number
  tri1: number | null
}

type ConditionalLineUniforms = {
  diffuse: { value: Three.Color }
  gapSize: { value: number }
  linewidth: { value: number }
  opacity: { value: number }
  resolution: { value: Three.Vector2 }
}

const conditionalLineUniforms = {
  gapSize: { value: 1 },
  linewidth: { value: 1 },
  opacity: { value: 1 },
  resolution: { value: new Three.Vector2(1, 1) },
}

const conditionalLineShader = {
  fragmentShader: `
    uniform vec3 diffuse;
    uniform float opacity;
    varying vec2 vUv;
    #include <common>
    #include <color_pars_fragment>
    #include <fog_pars_fragment>
    #include <logdepthbuf_pars_fragment>
    #include <clipping_planes_pars_fragment>
    void main() {
      #include <clipping_planes_fragment>
      if (abs(vUv.y) > 1.0) {
        float a = vUv.x;
        float b = (vUv.y > 0.0) ? vUv.y - 1.0 : vUv.y + 1.0;
        float len2 = a * a + b * b;
        if (len2 > 1.0) discard;
      }
      vec4 diffuseColor = vec4(diffuse, opacity);
      #include <logdepthbuf_fragment>
      #include <color_fragment>
      gl_FragColor = vec4(diffuseColor.rgb, diffuseColor.a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
      #include <premultiplied_alpha_fragment>
    }
  `,
  uniforms: Three.UniformsUtils.merge([
    Three.UniformsLib.common,
    Three.UniformsLib.fog,
    conditionalLineUniforms,
  ]) as ConditionalLineUniforms,
  vertexShader: `
    #include <common>
    #include <color_pars_vertex>
    #include <fog_pars_vertex>
    #include <logdepthbuf_pars_vertex>
    #include <clipping_planes_pars_vertex>
    uniform float linewidth;
    uniform vec2 resolution;
    attribute vec3 control0;
    attribute vec3 control1;
    attribute vec3 direction;
    attribute vec3 instanceStart;
    attribute vec3 instanceEnd;
    attribute vec3 instanceColorStart;
    attribute vec3 instanceColorEnd;
    varying vec2 vUv;
    void trimSegment(const in vec4 start, inout vec4 end) {
      float a = projectionMatrix[2][2];
      float b = projectionMatrix[3][2];
      float nearEstimate = -0.5 * b / a;
      float alpha = (nearEstimate - start.z) / (end.z - start.z);
      end.xyz = mix(start.xyz, end.xyz, alpha);
    }
    void main() {
      #ifdef USE_COLOR
        vColor.xyz = (position.y < 0.5) ? instanceColorStart : instanceColorEnd;
      #endif
      float aspect = resolution.x / resolution.y;
      vUv = uv;
      vec4 start = modelViewMatrix * vec4(instanceStart, 1.0);
      vec4 end = modelViewMatrix * vec4(instanceEnd, 1.0);
      bool perspective = (projectionMatrix[2][3] == -1.0);
      if (perspective) {
        if (start.z < 0.0 && end.z >= 0.0) {
          trimSegment(start, end);
        } else if (end.z < 0.0 && start.z >= 0.0) {
          trimSegment(end, start);
        }
      }
      vec4 clipStart = projectionMatrix * start;
      vec4 clipEnd = projectionMatrix * end;
      vec2 ndcStart = clipStart.xy / clipStart.w;
      vec2 ndcEnd = clipEnd.xy / clipEnd.w;
      vec2 dir = ndcEnd - ndcStart;
      dir.x *= aspect;
      dir = normalize(dir);
      vec2 offset = vec2(dir.y, -dir.x);
      dir.x /= aspect;
      offset.x /= aspect;
      if (position.x < 0.0) offset *= -1.0;
      if (position.y < 0.0) {
        offset += -dir;
      } else if (position.y > 1.0) {
        offset += dir;
      }
      offset *= linewidth;
      offset /= resolution.y;
      vec4 clip = (position.y < 0.5) ? clipStart : clipEnd;
      offset *= clip.w;
      clip.xy += offset;
      gl_Position = clip;
      vec4 mvPosition = (position.y < 0.5) ? start : end;
      #include <logdepthbuf_vertex>
      #include <clipping_planes_vertex>
      #include <fog_vertex>
      vec4 c0 = projectionMatrix * modelViewMatrix * vec4(control0, 1.0);
      vec4 c1 = projectionMatrix * modelViewMatrix * vec4(control1, 1.0);
      vec4 p0 = projectionMatrix * modelViewMatrix * vec4(instanceStart, 1.0);
      vec4 p1 = projectionMatrix * modelViewMatrix * vec4(instanceStart + direction, 1.0);
      c0 /= c0.w;
      c1 /= c1.w;
      p0 /= p0.w;
      p1 /= p1.w;
      vec2 segDir = p1.xy - p0.xy;
      vec2 norm = vec2(-segDir.y, segDir.x);
      vec2 c0dir = c0.xy - p1.xy;
      vec2 c1dir = c1.xy - p1.xy;
      float d0 = dot(normalize(norm), normalize(c0dir));
      float d1 = dot(normalize(norm), normalize(c1dir));
      float discardFlag = float(sign(d0) != sign(d1));
      gl_Position = discardFlag > 0.5 ? c0 : gl_Position;
    }
  `,
}

const copyPositionOnlyGeometry = (
  geometry: Three.BufferGeometry,
): Three.BufferGeometry => {
  const copy = new Three.BufferGeometry()
  copy.setAttribute("position", geometry.getAttribute("position").clone())
  if (geometry.index !== null) {
    copy.setIndex(geometry.index.clone())
  }
  return copy
}

const indexedGeometryForConditionalEdges = (
  geometry: Three.BufferGeometry,
  mergeTolerance: number,
): Three.BufferGeometry => {
  const copy = copyPositionOnlyGeometry(geometry)
  const merged = BufferGeometryUtils.mergeVertices(copy, mergeTolerance)
  copy.dispose()
  return merged
}

export const createConditionalEdgesGeometry = (
  sourceGeometry: Three.BufferGeometry,
  options: ConditionalEdgesGeometryOptions = {},
): Three.BufferGeometry => {
  const geometry = indexedGeometryForConditionalEdges(
    sourceGeometry,
    options.mergeTolerance ?? 1e-3,
  )
  const position = geometry.getAttribute("position")
  const index =
    geometry.index ??
    new Three.BufferAttribute(
      new Uint32Array(Array.from({ length: position.count }, (_, index) => index)),
      1,
    )
  const edgeInfo = new Map<string, EdgeInfo>()

  for (let indexOffset = 0; indexOffset < index.count; indexOffset += 3) {
    const indices = [
      index.getX(indexOffset),
      index.getX(indexOffset + 1),
      index.getX(indexOffset + 2),
    ] as const

    for (let edgeIndex = 0; edgeIndex < 3; edgeIndex += 1) {
      const index0 = indices[edgeIndex]
      const index1 = indices[(edgeIndex + 1) % 3]
      const controlIndex = indices[(edgeIndex + 2) % 3]
      const hash = `${index0}_${index1}`
      const reverseHash = `${index1}_${index0}`
      const reverse = edgeInfo.get(reverseHash)

      if (reverse !== undefined) {
        reverse.controlIndex1 = controlIndex
        reverse.tri1 = indexOffset / 3
      } else {
        edgeInfo.set(hash, {
          controlIndex0: controlIndex,
          controlIndex1: null,
          index0,
          index1,
          tri0: indexOffset / 3,
          tri1: null,
        })
      }
    }
  }

  const edgePositions: number[] = []
  const edgeDirections: number[] = []
  const edgeControl0: number[] = []
  const edgeControl1: number[] = []
  const normalDotThreshold = options.normalDotThreshold ?? 0.01
  const triangle0 = new Three.Triangle()
  const triangle1 = new Three.Triangle()
  const normal0 = new Three.Vector3()
  const normal1 = new Three.Vector3()
  const start = new Three.Vector3()
  const end = new Three.Vector3()
  const direction = new Three.Vector3()
  const control0 = new Three.Vector3()
  const control1 = new Three.Vector3()

  for (const edge of edgeInfo.values()) {
    if (edge.controlIndex1 === null || edge.tri1 === null) {
      continue
    }

    triangle0.a.fromBufferAttribute(position, index.getX(edge.tri0 * 3))
    triangle0.b.fromBufferAttribute(position, index.getX(edge.tri0 * 3 + 1))
    triangle0.c.fromBufferAttribute(position, index.getX(edge.tri0 * 3 + 2))
    triangle1.a.fromBufferAttribute(position, index.getX(edge.tri1 * 3))
    triangle1.b.fromBufferAttribute(position, index.getX(edge.tri1 * 3 + 1))
    triangle1.c.fromBufferAttribute(position, index.getX(edge.tri1 * 3 + 2))

    triangle0.getNormal(normal0).normalize()
    triangle1.getNormal(normal1).normalize()
    if (normal0.dot(normal1) < normalDotThreshold) {
      continue
    }

    start.fromBufferAttribute(position, edge.index0)
    end.fromBufferAttribute(position, edge.index1)
    direction.subVectors(start, end)
    control0.fromBufferAttribute(position, edge.controlIndex0)
    control1.fromBufferAttribute(position, edge.controlIndex1)

    edgePositions.push(start.x, start.y, start.z, end.x, end.y, end.z)
    edgeDirections.push(
      direction.x,
      direction.y,
      direction.z,
      direction.x,
      direction.y,
      direction.z,
    )
    edgeControl0.push(
      control0.x,
      control0.y,
      control0.z,
      control0.x,
      control0.y,
      control0.z,
    )
    edgeControl1.push(
      control1.x,
      control1.y,
      control1.z,
      control1.x,
      control1.y,
      control1.z,
    )
  }

  geometry.dispose()

  const conditionalGeometry = new Three.BufferGeometry()
  conditionalGeometry.setAttribute(
    "position",
    new Three.BufferAttribute(new Float32Array(edgePositions), 3),
  )
  conditionalGeometry.setAttribute(
    "direction",
    new Three.BufferAttribute(new Float32Array(edgeDirections), 3),
  )
  conditionalGeometry.setAttribute(
    "control0",
    new Three.BufferAttribute(new Float32Array(edgeControl0), 3),
  )
  conditionalGeometry.setAttribute(
    "control1",
    new Three.BufferAttribute(new Float32Array(edgeControl1), 3),
  )
  return conditionalGeometry
}

export class ConditionalLineSegmentsGeometry extends LineSegmentsGeometry {
  fromConditionalEdgesGeometry(geometry: Three.BufferGeometry): this {
    super.fromEdgesGeometry(
      geometry as unknown as Three.EdgesGeometry<Three.BufferGeometry>,
    )

    const direction = geometry.getAttribute("direction")
    const control0 = geometry.getAttribute("control0")
    const control1 = geometry.getAttribute("control1")

    this.setAttribute(
      "direction",
      new Three.InterleavedBufferAttribute(
        new Three.InstancedInterleavedBuffer(direction.array, 6, 1),
        3,
        0,
      ),
    )
    this.setAttribute(
      "control0",
      new Three.InterleavedBufferAttribute(
        new Three.InstancedInterleavedBuffer(control0.array, 6, 1),
        3,
        0,
      ),
    )
    this.setAttribute(
      "control1",
      new Three.InterleavedBufferAttribute(
        new Three.InstancedInterleavedBuffer(control1.array, 6, 1),
        3,
        0,
      ),
    )

    return this
  }
}

export class ConditionalLineMaterial extends Three.ShaderMaterial {
  declare color: Three.Color
  declare linewidth: number
  declare resolution: Three.Vector2

  constructor(options: ConditionalLineOptions = {}) {
    super({
      clipping: true,
      depthTest: options.depthTest ?? true,
      depthWrite: options.depthWrite ?? false,
      fragmentShader: conditionalLineShader.fragmentShader,
      transparent: options.transparent ?? ((options.opacity ?? 1) < 1),
      uniforms: Three.UniformsUtils.clone(conditionalLineShader.uniforms),
      vertexShader: conditionalLineShader.vertexShader,
    })

    this.type = "ConditionalLineMaterial"
    Object.defineProperties(this, {
      color: {
        enumerable: true,
        get: function (this: ConditionalLineMaterial): Three.Color {
          return this.conditionalUniforms.diffuse.value
        },
        set: function (
          this: ConditionalLineMaterial,
          value: Three.ColorRepresentation,
        ): void {
          this.conditionalUniforms.diffuse.value.set(value)
        },
      },
      linewidth: {
        enumerable: true,
        get: function (this: ConditionalLineMaterial): number {
          return this.conditionalUniforms.linewidth.value
        },
        set: function (this: ConditionalLineMaterial, value: number): void {
          this.conditionalUniforms.linewidth.value = value
        },
      },
      opacity: {
        enumerable: true,
        get: function (this: ConditionalLineMaterial): number {
          return this.conditionalUniforms.opacity.value
        },
        set: function (this: ConditionalLineMaterial, value: number): void {
          this.conditionalUniforms.opacity.value = value
        },
      },
      resolution: {
        enumerable: true,
        get: function (this: ConditionalLineMaterial): Three.Vector2 {
          return this.conditionalUniforms.resolution.value
        },
      },
    })

    this.color = new Three.Color(options.color ?? 0xffffff)
    this.linewidth = options.linewidth ?? 1
    this.opacity = options.opacity ?? 1
    if (options.resolution !== undefined) {
      this.resolution.set(options.resolution[0], options.resolution[1])
    }
  }

  get conditionalUniforms(): ConditionalLineUniforms {
    return this.uniforms as unknown as ConditionalLineUniforms
  }

  setResolution(width: number, height: number): void {
    this.resolution.set(width, height)
  }
}

export const createConditionalLineSegments = (
  geometry: Three.BufferGeometry,
  options: ConditionalLineOptions & ConditionalEdgesGeometryOptions = {},
): ConditionalLineSegmentsHandle => {
  const edgesGeometry = createConditionalEdgesGeometry(geometry, options)
  const lineGeometry = new ConditionalLineSegmentsGeometry()
    .fromConditionalEdgesGeometry(edgesGeometry)
  const material = new ConditionalLineMaterial(options)
  const line = new LineSegments2(lineGeometry, material as unknown as LineMaterial)
  line.computeLineDistances()

  const dispose = (): void => {
    lineGeometry.dispose()
    edgesGeometry.dispose()
    material.dispose()
  }

  return {
    dispose,
    edgesGeometry,
    geometry: lineGeometry,
    line,
    material,
    setResolution: (width, height) => material.setResolution(width, height),
  }
}
