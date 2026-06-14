import * as Three from "three"

export const pmndrsMotionPrimitiveSourceRefs = [
  "projects/repos/examples/demos/camera-shake/src/App.jsx",
  "projects/repos/drei/src/core/Float.tsx",
  "projects/repos/drei/src/core/CameraShake.tsx",
] as const

export type FloatTransformOptions = Readonly<{
  speed?: number
  rotationIntensity?: number
  floatIntensity?: number
  floatingRange?: readonly [number, number]
  phase?: number
}>

export type FloatTransform = Readonly<{
  position: Three.Vector3
  rotation: Three.Euler
}>

export type CameraShakeOptions = Readonly<{
  intensity?: number
  maxYaw?: number
  maxPitch?: number
  maxRoll?: number
  yawFrequency?: number
  pitchFrequency?: number
  rollFrequency?: number
  phase?: number
}>

export const defaultFloatTransformOptions: Required<FloatTransformOptions> = {
  speed: 1,
  rotationIntensity: 1,
  floatIntensity: 1,
  floatingRange: [-0.1, 0.1],
  phase: 0,
}

export const defaultCameraShakeOptions: Required<CameraShakeOptions> = {
  intensity: 1,
  maxYaw: 0.1,
  maxPitch: 0.1,
  maxRoll: 0.1,
  yawFrequency: 0.1,
  pitchFrequency: 0.1,
  rollFrequency: 0.1,
  phase: 0,
}

export const resolveFloatTransformOptions = (
  options: FloatTransformOptions = {},
): Required<FloatTransformOptions> => ({
  ...defaultFloatTransformOptions,
  ...options,
})

export const resolveCameraShakeOptions = (
  options: CameraShakeOptions = {},
): Required<CameraShakeOptions> => ({
  ...defaultCameraShakeOptions,
  ...options,
})

export const floatTransformAtTime = (
  timeSeconds: number,
  options: FloatTransformOptions = {},
): FloatTransform => {
  const resolved = resolveFloatTransformOptions(options)
  const t = resolved.phase + timeSeconds
  const speed = resolved.speed
  const baseY = Math.sin((t / 4) * speed) / 10
  const y = Three.MathUtils.mapLinear(
    baseY,
    -0.1,
    0.1,
    resolved.floatingRange[0],
    resolved.floatingRange[1],
  )

  return {
    position: new Three.Vector3(0, y * resolved.floatIntensity, 0),
    rotation: new Three.Euler(
      (Math.cos((t / 4) * speed) / 8) * resolved.rotationIntensity,
      (Math.sin((t / 4) * speed) / 8) * resolved.rotationIntensity,
      (Math.sin((t / 4) * speed) / 20) * resolved.rotationIntensity,
    ),
  }
}

export const applyFloatTransform = (
  object: Three.Object3D,
  timeSeconds: number,
  options: FloatTransformOptions = {},
): FloatTransform => {
  const transform = floatTransformAtTime(timeSeconds, options)
  object.position.y = transform.position.y
  object.rotation.copy(transform.rotation)
  object.updateMatrix()
  return transform
}

export const cameraShakeRotationAtTime = (
  timeSeconds: number,
  options: CameraShakeOptions = {},
): Three.Euler => {
  const resolved = resolveCameraShakeOptions(options)
  const intensity = Three.MathUtils.clamp(resolved.intensity, 0, 1)
  const shake = intensity * intensity
  const phase = resolved.phase
  const tau = Math.PI * 2

  return new Three.Euler(
    resolved.maxPitch *
      shake *
      Math.sin(timeSeconds * resolved.pitchFrequency * tau + phase + 1.7),
    resolved.maxYaw *
      shake *
      Math.sin(timeSeconds * resolved.yawFrequency * tau + phase),
    resolved.maxRoll *
      shake *
      Math.sin(timeSeconds * resolved.rollFrequency * tau + phase + 3.1),
  )
}

export const applyCameraShake = (
  camera: Three.Camera,
  baseRotation: Three.Euler,
  timeSeconds: number,
  options: CameraShakeOptions = {},
): Three.Euler => {
  const shake = cameraShakeRotationAtTime(timeSeconds, options)
  camera.rotation.set(
    baseRotation.x + shake.x,
    baseRotation.y + shake.y,
    baseRotation.z + shake.z,
  )
  return shake
}
