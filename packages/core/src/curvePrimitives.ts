import * as Three from "three"

export type BezierVectorTuple = readonly [number, number, number]

export type CubicBezierSegmentDefinition = Readonly<{
  v0: BezierVectorTuple
  v1: BezierVectorTuple
  v2: BezierVectorTuple
  v3: BezierVectorTuple
}>

export type CubicBezierPresetDefinition = Readonly<{
  id: string
  label: string
  segments: readonly CubicBezierSegmentDefinition[]
}>

export const pmndrsBezierNodesSourceRefs = [
  "projects/repos/examples/demos/bezier-curves-and-nodes/src/App.jsx",
  "projects/repos/examples/demos/bezier-curves-and-nodes/src/Nodes.jsx",
  "projects/repos/drei/src/core/QuadraticBezierLine.tsx",
  "projects/repos/drei/src/web/DragControls.tsx",
] as const

export const dreiQuadraticBezierMidpoint = (
  start: BezierVectorTuple,
  end: BezierVectorTuple,
): BezierVectorTuple => [end[0], start[1], end[2]]

const tupleToVector = (point: BezierVectorTuple): Three.Vector3 =>
  new Three.Vector3(point[0], point[1], point[2])

const vectorToTuple = (point: Three.Vector3): BezierVectorTuple => [
  point.x,
  point.y,
  point.z,
]

export const quadraticBezierPoints = (
  start: BezierVectorTuple,
  end: BezierVectorTuple,
  segments = 20,
  mid: BezierVectorTuple = dreiQuadraticBezierMidpoint(start, end),
): readonly BezierVectorTuple[] =>
  new Three.QuadraticBezierCurve3(
    tupleToVector(start),
    tupleToVector(mid),
    tupleToVector(end),
  )
    .getPoints(segments)
    .map(vectorToTuple)

export const cubicBezierPoints = (
  segment: CubicBezierSegmentDefinition,
  segments = 20,
): readonly BezierVectorTuple[] =>
  new Three.CubicBezierCurve3(
    tupleToVector(segment.v0),
    tupleToVector(segment.v1),
    tupleToVector(segment.v2),
    tupleToVector(segment.v3),
  )
    .getPoints(segments)
    .map(vectorToTuple)

const scaleSegment = (
  segment: CubicBezierSegmentDefinition,
  scale: number,
): CubicBezierSegmentDefinition => ({
  v0: [segment.v0[0] * scale, segment.v0[1] * scale, segment.v0[2] * scale],
  v1: [segment.v1[0] * scale, segment.v1[1] * scale, segment.v1[2] * scale],
  v2: [segment.v2[0] * scale, segment.v2[1] * scale, segment.v2[2] * scale],
  v3: [segment.v3[0] * scale, segment.v3[1] * scale, segment.v3[2] * scale],
})

const mirrorSegmentX = (
  segment: CubicBezierSegmentDefinition,
): CubicBezierSegmentDefinition => ({
  v0: [-segment.v0[0], segment.v0[1], segment.v0[2]],
  v1: [-segment.v1[0], segment.v1[1], segment.v1[2]],
  v2: [-segment.v2[0], segment.v2[1], segment.v2[2]],
  v3: [-segment.v3[0], segment.v3[1], segment.v3[2]],
})

const infinitySegments = (): readonly CubicBezierSegmentDefinition[] => {
  const curves: CubicBezierSegmentDefinition[] = []
  const radius = 5
  const segments = 8
  const amplitude = 5

  for (let index = 0; index < segments; index += 1) {
    const startAngle = (index / segments) * Math.PI * 2
    const endAngle = ((index + 1) / segments) * Math.PI * 2
    const controlAngleA = startAngle + Math.PI / (2 * segments)
    const controlAngleB = endAngle - Math.PI / (2 * segments)

    curves.push({
      v0: [
        radius * Math.cos(startAngle),
        amplitude * Math.sin(2 * startAngle),
        radius * Math.sin(startAngle),
      ],
      v1: [
        radius * Math.cos(controlAngleA),
        amplitude * Math.sin(2 * controlAngleA),
        radius * Math.sin(controlAngleA),
      ],
      v2: [
        radius * Math.cos(controlAngleB),
        amplitude * Math.sin(2 * controlAngleB),
        radius * Math.sin(controlAngleB),
      ],
      v3: [
        radius * Math.cos(endAngle),
        amplitude * Math.sin(2 * endAngle),
        radius * Math.sin(endAngle),
      ],
    })
  }

  return curves
}

const heartLeft = scaleSegment(
  {
    v0: [0, 0, 0],
    v1: [1, 1, 0],
    v2: [1, 3, 0],
    v3: [0, 2, 0],
  },
  2,
)

export const pmndrsMotionPathCurvePresets: readonly CubicBezierPresetDefinition[] =
  [
    {
      id: "heart",
      label: "Heart",
      segments: [heartLeft, mirrorSegmentX(heartLeft)],
    },
    {
      id: "circle",
      label: "Circle",
      segments: [
        {
          v0: [5, 0, 0],
          v1: [5, 0, 5],
          v2: [-5, 0, 5],
          v3: [-5, 0, 0],
        },
        {
          v0: [-5, 0, 0],
          v1: [-5, 0, -5],
          v2: [5, 0, -5],
          v3: [5, 0, 0],
        },
      ],
    },
    {
      id: "rollercoaster",
      label: "Rollercoaster",
      segments: [
        {
          v0: [-5, -5, 0],
          v1: [-10, 0, 0],
          v2: [0, 3, 0],
          v3: [6, 3, 0],
        },
        {
          v0: [6, 3, 0],
          v1: [10, 5, 5],
          v2: [5, 3, 5],
          v3: [5, 5, 5],
        },
      ],
    },
    {
      id: "infinity",
      label: "Infinity",
      segments: infinitySegments(),
    },
  ] as const
