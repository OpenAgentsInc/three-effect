import { Data, Effect } from "effect";
import * as Three from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

import { createPointerLockControls } from "./extraControlsPrimitives";

export const pmndrsPlayerControllerPrimitiveSourceRefs = [
  "projects/repos/drei/src/core/PointerLockControls.tsx",
  "projects/repos/drei/src/web/KeyboardControls.tsx",
  "projects/repos/three-player-controller/src/playerController.ts",
  "projects/repos/three-player-controller/src/systems/CameraSystem.ts",
  "projects/repos/three-player-controller/src/systems/InputSystem.ts",
  "projects/repos/three-player-controller/src/utils/capsuleCollision.ts",
  "projects/repos/Quick_3D_MMORPG/client/src/player-input.js",
  "projects/repos/Quick_3D_MMORPG/client/src/player-entity.js",
  "projects/repos/Quick_3D_MMORPG/client/src/player-state.js",
  "projects/repos/Quick_3D_MMORPG/client/src/third-person-camera.js",
] as const;

export class ThreePlayerControllerCreateError extends Data.TaggedError(
  "ThreePlayerControllerCreateError",
)<{
  readonly reason: string;
}> {}

const reason = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export type WasdAction =
  | "backward"
  | "fall"
  | "forward"
  | "left"
  | "right"
  | "rise"
  | "sprint";

export type WasdKeyboardState = Readonly<Record<WasdAction, boolean>>;

export type MutableWasdKeyboardState = Record<WasdAction, boolean>;

export type WasdMouseLookDebugSnapshot = Readonly<{
  event:
    | "lock"
    | "lock_error"
    | "unlock"
    | "mousemove"
    | "pointermove"
    | "pointerrawupdate";
  applied: boolean;
  locked: boolean;
  movementX: number;
  movementY: number;
  pitch: number;
  reason?: string;
  source: "controller" | "fallback" | "state" | "stock";
  yaw: number;
}>;

export type WasdMovementBounds = Readonly<{
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}>;

export type ThirdPersonCameraTarget = Readonly<{
  position: Three.Vector3;
  quaternion: Three.Quaternion;
}>;

export type ThirdPersonFollowCameraOptions = Readonly<{
  offset?: readonly [number, number, number];
  lookAtOffset?: readonly [number, number, number];
  smoothing?: number;
  minGroundClearance?: number;
  groundHeightAt?: (x: number, z: number) => number;
}>;

export type ResolvedThirdPersonFollowCameraOptions = Readonly<{
  offset: readonly [number, number, number];
  lookAtOffset: readonly [number, number, number];
  smoothing: number;
  minGroundClearance: number;
  groundHeightAt: (x: number, z: number) => number;
}>;

export type ThirdPersonFollowCameraState = Readonly<{
  currentPosition: Three.Vector3;
  currentLookAt: Three.Vector3;
}>;

export type ThirdPersonFollowCameraHandle = Readonly<{
  state: ThirdPersonFollowCameraState;
  update: (delta: number) => Effect.Effect<void>;
  snap: Effect.Effect<void>;
}>;

export type ThreePlayerControllerAvatarAction =
  | "idle"
  | "jump"
  | "run"
  | "walk";

export type MmorpgCharacterAction = "idle" | "run" | "walk";

export type MmorpgCharacterForwardAxis = "negativeZ" | "positiveZ";

export type MmorpgCharacterControllerState = {
  action: MmorpgCharacterAction;
  velocity: Three.Vector3;
};

export type MmorpgCharacterControllerOptions = Readonly<{
  acceleration?: number;
  damping?: number;
  walkSpeed?: number;
  runSpeed?: number;
  backwardSpeedMultiplier?: number;
  turnSpeed?: number;
  forwardAxis?: MmorpgCharacterForwardAxis;
  bounds?: WasdMovementBounds;
  groundHeightAt?: (x: number, z: number) => number;
  canMoveTo?: (next: Three.Vector3, previous: Three.Vector3) => boolean;
}>;

export type ResolvedMmorpgCharacterControllerOptions = Readonly<{
  acceleration: number;
  damping: number;
  walkSpeed: number;
  runSpeed: number;
  backwardSpeedMultiplier: number;
  turnSpeed: number;
  forwardAxis: MmorpgCharacterForwardAxis;
  bounds?: WasdMovementBounds;
  groundHeightAt: (x: number, z: number) => number;
  canMoveTo: (next: Three.Vector3, previous: Three.Vector3) => boolean;
}>;

export type MmorpgCharacterControllerSnapshot = Readonly<{
  action: MmorpgCharacterAction;
  blocked: boolean;
  position: Three.Vector3;
  quaternion: Three.Quaternion;
  velocity: Three.Vector3;
}>;

export type ThreePlayerControllerOptions = Readonly<{
  enabled?: boolean;
  inputTarget?: HTMLElement | Window;
  initialPosition?: readonly [number, number, number];
  camera?: ThirdPersonFollowCameraOptions;
  character?: MmorpgCharacterControllerOptions;
  jumpHeight?: number;
  gravity?: number;
  groundHeightAt?: (x: number, z: number) => number;
  onActionChange?: (action: ThreePlayerControllerAvatarAction) => void;
}>;

export type ResolvedThreePlayerControllerOptions = Readonly<{
  enabled: boolean;
  inputTarget: HTMLElement | Window;
  initialPosition: readonly [number, number, number];
  camera: ThirdPersonFollowCameraOptions;
  character: MmorpgCharacterControllerOptions;
  jumpHeight: number;
  gravity: number;
  groundHeightAt: (x: number, z: number) => number;
  onActionChange?: (action: ThreePlayerControllerAvatarAction) => void;
}>;

export type ThreePlayerControllerHandle = Readonly<{
  keyboard: WasdKeyboardState;
  update: (delta: number) => Effect.Effect<void>;
  getPosition: Effect.Effect<Three.Vector3>;
  setPosition: (position: Three.Vector3) => Effect.Effect<void>;
  dispose: Effect.Effect<void>;
}>;

export type WasdMouseLookControllerOptions = Readonly<{
  enabled?: boolean;
  lockSelector?: string;
  inputTarget?: HTMLElement | Window;
  initialPosition?: readonly [number, number, number];
  eyeHeight?: number;
  movementSpeed?: number;
  sprintMultiplier?: number;
  acceleration?: number;
  damping?: number;
  pointerSensitivity?: number;
  debug?: boolean | ((snapshot: WasdMouseLookDebugSnapshot) => void);
  pitchMin?: number;
  pitchMax?: number;
  bounds?: WasdMovementBounds;
  groundHeightAt?: (x: number, z: number) => number;
  onLockChange?: (locked: boolean) => void;
}>;

export type ResolvedWasdMouseLookControllerOptions = Readonly<{
  enabled: boolean;
  lockSelector?: string;
  inputTarget: HTMLElement | Window;
  initialPosition: readonly [number, number, number];
  eyeHeight: number;
  movementSpeed: number;
  sprintMultiplier: number;
  acceleration: number;
  damping: number;
  pointerSensitivity: number;
  debug: boolean | ((snapshot: WasdMouseLookDebugSnapshot) => void);
  pitchMin: number;
  pitchMax: number;
  bounds?: WasdMovementBounds;
  groundHeightAt: (x: number, z: number) => number;
  onLockChange?: (locked: boolean) => void;
}>;

export type WasdMouseLookControllerHandle = Readonly<{
  controls: PointerLockControls;
  keyboard: WasdKeyboardState;
  update: (delta: number) => Effect.Effect<void>;
  lock: Effect.Effect<void>;
  unlock: Effect.Effect<void>;
  isLocked: Effect.Effect<boolean>;
  getPosition: Effect.Effect<Three.Vector3>;
  setPosition: (position: Three.Vector3) => Effect.Effect<void>;
  dispose: Effect.Effect<void>;
}>;

export const defaultWasdKeyboardState = (): MutableWasdKeyboardState => ({
  backward: false,
  fall: false,
  forward: false,
  left: false,
  right: false,
  rise: false,
  sprint: false,
});

export const defaultWasdMouseLookControllerOptions = (
  inputTarget: HTMLElement | Window,
): ResolvedWasdMouseLookControllerOptions => ({
  enabled: true,
  inputTarget,
  initialPosition: [0, 1.65, 6],
  eyeHeight: 1.65,
  movementSpeed: 4,
  sprintMultiplier: 1.8,
  acceleration: 18,
  damping: 12,
  pointerSensitivity: 0.002,
  debug: false,
  pitchMin: -Math.PI / 2 + 0.05,
  pitchMax: Math.PI / 2 - 0.05,
  groundHeightAt: () => 0,
});

export const defaultThirdPersonFollowCameraOptions: ResolvedThirdPersonFollowCameraOptions =
  {
    offset: [0, 3.2, 6.2],
    lookAtOffset: [0, 1.25, -2.2],
    smoothing: 0.01,
    minGroundClearance: 1.25,
    groundHeightAt: () => Number.NEGATIVE_INFINITY,
  };

export const defaultMmorpgCharacterControllerOptions: ResolvedMmorpgCharacterControllerOptions =
  {
    acceleration: 18,
    damping: 14,
    walkSpeed: 3.8,
    runSpeed: 7.2,
    backwardSpeedMultiplier: 0.55,
    turnSpeed: Math.PI * 1.15,
    forwardAxis: "negativeZ",
    groundHeightAt: () => 0,
    canMoveTo: () => true,
  };

export const defaultThreePlayerControllerOptions = (
  inputTarget: HTMLElement | Window,
): ResolvedThreePlayerControllerOptions => ({
  enabled: true,
  inputTarget,
  initialPosition: [0, 0, 4.4],
  camera: {
    offset: [0, 2.4, 4.8],
    lookAtOffset: [0, 0.9, -1.5],
    smoothing: 0.035,
  },
  character: {
    acceleration: 22,
    damping: 16,
    walkSpeed: 3.4,
    runSpeed: 6.2,
    backwardSpeedMultiplier: 0.5,
    turnSpeed: Math.PI * 1.15,
    forwardAxis: "negativeZ",
  },
  jumpHeight: 4.8,
  gravity: -13.5,
  groundHeightAt: () => 0,
});

export const resolveWasdMouseLookControllerOptions = (
  inputTarget: HTMLElement | Window,
  options: WasdMouseLookControllerOptions = {},
): ResolvedWasdMouseLookControllerOptions => ({
  ...defaultWasdMouseLookControllerOptions(inputTarget),
  ...options,
  inputTarget: options.inputTarget ?? inputTarget,
  groundHeightAt:
    options.groundHeightAt ??
    defaultWasdMouseLookControllerOptions(inputTarget).groundHeightAt,
});

export const resolveThirdPersonFollowCameraOptions = (
  options: ThirdPersonFollowCameraOptions = {},
): ResolvedThirdPersonFollowCameraOptions => ({
  ...defaultThirdPersonFollowCameraOptions,
  ...options,
  offset: options.offset ?? defaultThirdPersonFollowCameraOptions.offset,
  lookAtOffset:
    options.lookAtOffset ?? defaultThirdPersonFollowCameraOptions.lookAtOffset,
  groundHeightAt:
    options.groundHeightAt ??
    defaultThirdPersonFollowCameraOptions.groundHeightAt,
});

export const resolveMmorpgCharacterControllerOptions = (
  options: MmorpgCharacterControllerOptions = {},
): ResolvedMmorpgCharacterControllerOptions => ({
  ...defaultMmorpgCharacterControllerOptions,
  ...options,
  groundHeightAt:
    options.groundHeightAt ??
    defaultMmorpgCharacterControllerOptions.groundHeightAt,
  canMoveTo:
    options.canMoveTo ?? defaultMmorpgCharacterControllerOptions.canMoveTo,
});

export const resolveThreePlayerControllerOptions = (
  inputTarget: HTMLElement | Window,
  options: ThreePlayerControllerOptions = {},
): ResolvedThreePlayerControllerOptions => {
  const defaults = defaultThreePlayerControllerOptions(inputTarget);
  const groundHeightAt = options.groundHeightAt ?? defaults.groundHeightAt;
  return {
    ...defaults,
    ...options,
    inputTarget: options.inputTarget ?? inputTarget,
    initialPosition: options.initialPosition ?? defaults.initialPosition,
    camera: {
      ...defaults.camera,
      ...(options.camera ?? {}),
      groundHeightAt:
        options.camera?.groundHeightAt ??
        options.groundHeightAt ??
        defaults.groundHeightAt,
    },
    character: {
      ...defaults.character,
      ...(options.character ?? {}),
      groundHeightAt:
        options.character?.groundHeightAt ??
        options.groundHeightAt ??
        defaults.groundHeightAt,
    },
    groundHeightAt,
  };
};

export const keyCodeToWasdAction = (code: string): WasdAction | undefined => {
  switch (code) {
    case "KeyW":
    case "ArrowUp":
      return "forward";
    case "KeyS":
    case "ArrowDown":
      return "backward";
    case "KeyA":
    case "ArrowLeft":
      return "left";
    case "KeyD":
    case "ArrowRight":
      return "right";
    case "ShiftLeft":
    case "ShiftRight":
      return "sprint";
    case "Space":
      return "rise";
    case "KeyC":
      return "fall";
    default:
      return undefined;
  }
};

export const isEditableInputTarget = (target: EventTarget | null): boolean => {
  if (typeof HTMLElement === "undefined") return false;
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
};

export const setWasdKeyState = (
  state: MutableWasdKeyboardState,
  code: string,
  pressed: boolean,
): boolean => {
  const action = keyCodeToWasdAction(code);
  if (action === undefined) return false;
  state[action] = pressed;
  return true;
};

const yawForward = new Three.Vector3();
const yawRight = new Three.Vector3();
const thirdPersonOffset = new Three.Vector3();
const thirdPersonLookAt = new Three.Vector3();
const characterForward = new Three.Vector3();
const characterNextPosition = new Three.Vector3();
const characterPreviousPosition = new Three.Vector3();
const characterTurnAxis = new Three.Vector3(0, 1, 0);
const characterTurnDelta = new Three.Quaternion();
const mouseLookEuler = new Three.Euler(0, 0, 0, "YXZ");

export const wasdMouseMovementFromEvent = (
  event: MouseEvent | PointerEvent,
): readonly [number, number] => [
  event.movementX ||
    (event as MouseEvent & { webkitMovementX?: number }).webkitMovementX ||
    (event as MouseEvent & { mozMovementX?: number }).mozMovementX ||
    0,
  event.movementY ||
    (event as MouseEvent & { webkitMovementY?: number }).webkitMovementY ||
    (event as MouseEvent & { mozMovementY?: number }).mozMovementY ||
    0,
];

const cameraYawPitch = (
  camera: Three.PerspectiveCamera,
): readonly [number, number] => {
  mouseLookEuler.setFromQuaternion(camera.quaternion);
  return [mouseLookEuler.y, mouseLookEuler.x];
};

export const applyMouseLookDelta = (
  camera: Three.PerspectiveCamera,
  movementX: number,
  movementY: number,
  options: Pick<
    ResolvedWasdMouseLookControllerOptions,
    "pitchMax" | "pitchMin" | "pointerSensitivity"
  >,
): Three.PerspectiveCamera => {
  if (movementX === 0 && movementY === 0) return camera;
  mouseLookEuler.setFromQuaternion(camera.quaternion);
  mouseLookEuler.y -= movementX * options.pointerSensitivity;
  mouseLookEuler.x = Three.MathUtils.clamp(
    mouseLookEuler.x - movementY * options.pointerSensitivity,
    options.pitchMin,
    options.pitchMax,
  );
  mouseLookEuler.z = 0;
  camera.quaternion.setFromEuler(mouseLookEuler);
  camera.updateMatrixWorld();
  return camera;
};

const pointerLockActive = (
  controls: PointerLockControls,
  domElement: HTMLElement,
): boolean =>
  controls.isLocked || domElement.ownerDocument.pointerLockElement !== null;

export const wasdDesiredDirection = (
  camera: Three.Camera,
  state: WasdKeyboardState,
): Three.Vector3 => {
  yawForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
  yawForward.y = 0;
  if (yawForward.lengthSq() === 0) yawForward.set(0, 0, -1);
  yawForward.normalize();

  yawRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
  yawRight.y = 0;
  if (yawRight.lengthSq() === 0) yawRight.set(1, 0, 0);
  yawRight.normalize();

  const direction = new Three.Vector3();
  if (state.forward && !state.backward) direction.add(yawForward);
  if (state.backward && !state.forward) direction.addScaledVector(yawForward, -1);
  if (state.right && !state.left) direction.add(yawRight);
  if (state.left && !state.right) direction.addScaledVector(yawRight, -1);
  if (direction.lengthSq() > 1) direction.normalize();
  return direction;
};

export const clampWasdPosition = (
  position: Three.Vector3,
  bounds: WasdMovementBounds | undefined,
): Three.Vector3 => {
  if (bounds === undefined) return position;
  position.x = Three.MathUtils.clamp(position.x, bounds.minX, bounds.maxX);
  position.z = Three.MathUtils.clamp(position.z, bounds.minZ, bounds.maxZ);
  return position;
};

export const thirdPersonIdealOffset = (
  target: ThirdPersonCameraTarget,
  options: ResolvedThirdPersonFollowCameraOptions,
): Three.Vector3 => {
  thirdPersonOffset
    .set(options.offset[0], options.offset[1], options.offset[2])
    .applyQuaternion(target.quaternion)
    .add(target.position);
  thirdPersonOffset.y = Math.max(
    thirdPersonOffset.y,
    options.groundHeightAt(thirdPersonOffset.x, thirdPersonOffset.z) +
      options.minGroundClearance,
  );
  return thirdPersonOffset.clone();
};

export const thirdPersonIdealLookAt = (
  target: ThirdPersonCameraTarget,
  options: ResolvedThirdPersonFollowCameraOptions,
): Three.Vector3 => {
  thirdPersonLookAt
    .set(
      options.lookAtOffset[0],
      options.lookAtOffset[1],
      options.lookAtOffset[2],
    )
    .applyQuaternion(target.quaternion)
    .add(target.position);
  return thirdPersonLookAt.clone();
};

export const thirdPersonFollowSmoothingFactor = (
  delta: number,
  smoothing: number,
): number => 1 - Math.pow(Three.MathUtils.clamp(smoothing, 0.0001, 1), delta);

export const createThirdPersonFollowCameraState = (
  camera: Three.Camera,
  target: ThirdPersonCameraTarget,
  options: ThirdPersonFollowCameraOptions = {},
): ThirdPersonFollowCameraState => {
  const resolved = resolveThirdPersonFollowCameraOptions(options);
  const currentPosition = thirdPersonIdealOffset(target, resolved);
  const currentLookAt = thirdPersonIdealLookAt(target, resolved);
  camera.position.copy(currentPosition);
  camera.lookAt(currentLookAt);
  camera.updateMatrixWorld();
  return { currentLookAt, currentPosition };
};

export const updateThirdPersonFollowCamera = (
  camera: Three.Camera,
  target: ThirdPersonCameraTarget,
  state: ThirdPersonFollowCameraState,
  delta: number,
  options: ThirdPersonFollowCameraOptions = {},
): ThirdPersonFollowCameraState => {
  const resolved = resolveThirdPersonFollowCameraOptions(options);
  const factor = thirdPersonFollowSmoothingFactor(delta, resolved.smoothing);
  state.currentPosition.lerp(thirdPersonIdealOffset(target, resolved), factor);
  state.currentLookAt.lerp(thirdPersonIdealLookAt(target, resolved), factor);
  camera.position.copy(state.currentPosition);
  camera.lookAt(state.currentLookAt);
  camera.updateMatrixWorld();
  return state;
};

export const createThirdPersonFollowCamera = (
  camera: Three.Camera,
  target: ThirdPersonCameraTarget,
  options: ThirdPersonFollowCameraOptions = {},
): ThirdPersonFollowCameraHandle => {
  const resolved = resolveThirdPersonFollowCameraOptions(options);
  const state = createThirdPersonFollowCameraState(camera, target, resolved);
  const snap = Effect.sync(() => {
    state.currentPosition.copy(thirdPersonIdealOffset(target, resolved));
    state.currentLookAt.copy(thirdPersonIdealLookAt(target, resolved));
    camera.position.copy(state.currentPosition);
    camera.lookAt(state.currentLookAt);
    camera.updateMatrixWorld();
  });
  return {
    state,
    snap,
    update: (delta: number) =>
      Effect.sync(() => {
        updateThirdPersonFollowCamera(camera, target, state, delta, resolved);
      }),
  };
};

export const defaultMmorpgCharacterControllerState =
  (): MmorpgCharacterControllerState => ({
    action: "idle",
    velocity: new Three.Vector3(),
  });

export const mmorpgCharacterActionForKeyboard = (
  keyboard: WasdKeyboardState,
): MmorpgCharacterAction => {
  if (!keyboard.forward && !keyboard.backward) return "idle";
  return keyboard.sprint && keyboard.forward ? "run" : "walk";
};

export const mmorpgCharacterForwardDirection = (
  object: Three.Object3D,
  axis: MmorpgCharacterForwardAxis = "negativeZ",
): Three.Vector3 => {
  characterForward.set(0, 0, axis === "negativeZ" ? -1 : 1);
  characterForward.applyQuaternion(object.quaternion);
  characterForward.y = 0;
  if (characterForward.lengthSq() === 0) {
    characterForward.set(0, 0, axis === "negativeZ" ? -1 : 1);
  }
  return characterForward.normalize().clone();
};

export const updateMmorpgCharacterController = (
  object: Three.Object3D,
  keyboard: WasdKeyboardState,
  state: MmorpgCharacterControllerState,
  delta: number,
  options: MmorpgCharacterControllerOptions = {},
): MmorpgCharacterControllerSnapshot => {
  const resolved = resolveMmorpgCharacterControllerOptions(options);
  const safeDelta = Math.max(0, Math.min(delta, 0.1));
  const turnInput =
    (keyboard.left && !keyboard.right ? 1 : 0) +
    (keyboard.right && !keyboard.left ? -1 : 0);
  if (turnInput !== 0 && safeDelta > 0) {
    characterTurnDelta.setFromAxisAngle(
      characterTurnAxis,
      turnInput * resolved.turnSpeed * safeDelta,
    );
    object.quaternion.multiply(characterTurnDelta).normalize();
  }

  const targetAction = mmorpgCharacterActionForKeyboard(keyboard);
  const targetSpeed =
    targetAction === "idle"
      ? 0
      : targetAction === "run"
        ? resolved.runSpeed
        : resolved.walkSpeed;
  const directionSign = keyboard.backward && !keyboard.forward ? -1 : 1;
  const speedMultiplier =
    directionSign < 0 ? resolved.backwardSpeedMultiplier : 1;
  const targetVelocityZ =
    targetAction === "idle" ? 0 : directionSign * targetSpeed * speedMultiplier;
  const factor =
    targetAction === "idle"
      ? 1 - Math.exp(-resolved.damping * safeDelta)
      : 1 - Math.exp(-resolved.acceleration * safeDelta);
  state.velocity.z = Three.MathUtils.lerp(
    state.velocity.z,
    targetVelocityZ,
    factor,
  );
  if (Math.abs(state.velocity.z) < 0.000001) state.velocity.z = 0;
  state.action = targetAction;

  characterPreviousPosition.copy(object.position);
  characterNextPosition.copy(object.position);
  const forward = mmorpgCharacterForwardDirection(object, resolved.forwardAxis);
  characterNextPosition.addScaledVector(forward, state.velocity.z * safeDelta);
  clampWasdPosition(characterNextPosition, resolved.bounds);
  characterNextPosition.y = resolved.groundHeightAt(
    characterNextPosition.x,
    characterNextPosition.z,
  );
  const blocked = !resolved.canMoveTo(
    characterNextPosition,
    characterPreviousPosition,
  );
  if (blocked) {
    state.velocity.z = 0;
  } else {
    object.position.copy(characterNextPosition);
    object.updateMatrixWorld();
  }

  return {
    action: state.action,
    blocked,
    position: object.position.clone(),
    quaternion: object.quaternion.clone(),
    velocity: state.velocity.clone(),
  };
};

export const integrateWasdVelocity = (
  velocity: Three.Vector3,
  desiredDirection: Three.Vector3,
  delta: number,
  options: Pick<
    ResolvedWasdMouseLookControllerOptions,
    "acceleration" | "damping" | "movementSpeed" | "sprintMultiplier"
  >,
  sprinting: boolean,
): Three.Vector3 => {
  const safeDelta = Math.max(0, Math.min(delta, 0.1));
  const targetSpeed =
    options.movementSpeed * (sprinting ? options.sprintMultiplier : 1);
  const targetVelocity = desiredDirection.clone().multiplyScalar(targetSpeed);
  const factor =
    desiredDirection.lengthSq() > 0
      ? 1 - Math.exp(-options.acceleration * safeDelta)
      : 1 - Math.exp(-options.damping * safeDelta);
  velocity.lerp(targetVelocity, factor);
  if (velocity.lengthSq() < 0.000001) velocity.set(0, 0, 0);
  return velocity;
};

const addEvent = <K extends keyof HTMLElementEventMap>(
  target: HTMLElement | Document | Window,
  type: K,
  listener: (event: HTMLElementEventMap[K]) => void,
): (() => void) => {
  target.addEventListener(type, listener as EventListener, { passive: false });
  return () => target.removeEventListener(type, listener as EventListener);
};

export const createWasdMouseLookController = (
  camera: Three.PerspectiveCamera,
  domElement: HTMLElement,
  options: WasdMouseLookControllerOptions = {},
): Effect.Effect<
  WasdMouseLookControllerHandle,
  ThreePlayerControllerCreateError
> =>
  Effect.try({
    try: () => {
      const pointerLockHandle = Effect.runSync(
        createPointerLockControls(camera, domElement),
      );
      pointerLockHandle.controls.pointerSpeed = 0;
      const resolved = resolveWasdMouseLookControllerOptions(
        typeof window === "undefined" ? domElement : window,
        options,
      );
      const keyboard = defaultWasdKeyboardState();
      const velocity = new Three.Vector3();
      const initialPosition = resolved.initialPosition;
      camera.position.set(
        initialPosition[0],
        initialPosition[1],
        initialPosition[2],
      );
      const lastCameraQuaternion = camera.quaternion.clone();
      let debugEventCount = 0;
      let lastUnlockAt = 0;
      let lastAppliedMotionStamp = Number.NaN;
      let lastAppliedMotionX = 0;
      let lastAppliedMotionY = 0;
      let disposed = false;

      const removers: Array<() => void> = [];
      const keyTarget = resolved.inputTarget;
      const emitDebug = (
        event: WasdMouseLookDebugSnapshot["event"],
        source: WasdMouseLookDebugSnapshot["source"],
        movementX: number,
        movementY: number,
        applied: boolean,
        reason?: string,
        locked?: boolean,
      ) => {
        if (resolved.debug === false) return;
        const [yaw, pitch] = cameraYawPitch(camera);
        const snapshot: WasdMouseLookDebugSnapshot = {
          event,
          applied,
          locked:
            locked ?? pointerLockActive(pointerLockHandle.controls, domElement),
          movementX,
          movementY,
          pitch,
          source,
          yaw,
          ...(reason === undefined ? {} : { reason }),
        };
        if (typeof resolved.debug === "function") {
          resolved.debug(snapshot);
        } else if (typeof console !== "undefined") {
          debugEventCount += 1;
          const motionEvent =
            event === "mousemove" ||
            event === "pointermove" ||
            event === "pointerrawupdate";
          if (
            !motionEvent ||
            debugEventCount <= 40 ||
            debugEventCount % 60 === 0
          ) {
            console.warn("[three-effect:wasd_mouselook]", snapshot);
          }
        }
      };
      const onKeyDown = (event: KeyboardEvent) => {
        if (!resolved.enabled || isEditableInputTarget(event.target)) return;
        if (setWasdKeyState(keyboard, event.code, true)) event.preventDefault();
      };
      const onKeyUp = (event: KeyboardEvent) => {
        if (setWasdKeyState(keyboard, event.code, false)) event.preventDefault();
      };
      keyTarget.addEventListener("keydown", onKeyDown as EventListener, {
        passive: false,
      });
      keyTarget.addEventListener("keyup", onKeyUp as EventListener, {
        passive: false,
      });
      removers.push(() => {
        keyTarget.removeEventListener("keydown", onKeyDown as EventListener);
        keyTarget.removeEventListener("keyup", onKeyUp as EventListener);
      });

      const applyMotionEvent = (
        event: MouseEvent | PointerEvent,
        eventName: Extract<
          WasdMouseLookDebugSnapshot["event"],
          "mousemove" | "pointermove" | "pointerrawupdate"
        >,
      ) => {
        if (
          !resolved.enabled ||
          !pointerLockActive(pointerLockHandle.controls, domElement)
        ) {
          return;
        }
        const [movementX, movementY] = wasdMouseMovementFromEvent(event);
        if (
          event.timeStamp === lastAppliedMotionStamp &&
          movementX === lastAppliedMotionX &&
          movementY === lastAppliedMotionY
        ) {
          emitDebug(eventName, "fallback", movementX, movementY, false);
          return;
        }
        lastAppliedMotionStamp = event.timeStamp;
        lastAppliedMotionX = movementX;
        lastAppliedMotionY = movementY;
        if (movementX === 0 && movementY === 0) {
          emitDebug(eventName, "controller", movementX, movementY, false);
          return;
        }
        event.preventDefault();
        applyMouseLookDelta(camera, movementX, movementY, resolved);
        lastCameraQuaternion.copy(camera.quaternion);
        emitDebug(eventName, "controller", movementX, movementY, true);
      };
      const addMotionEvent = (
        type: "mousemove" | "pointermove" | "pointerrawupdate",
      ) => {
        const listener = (event: Event) => {
          applyMotionEvent(event as MouseEvent | PointerEvent, type);
        };
        domElement.ownerDocument.addEventListener(type, listener, {
          capture: true,
          passive: false,
        });
        removers.push(() => {
          domElement.ownerDocument.removeEventListener(type, listener, {
            capture: true,
          });
        });
      };
      addMotionEvent("mousemove");
      addMotionEvent("pointermove");
      addMotionEvent("pointerrawupdate");

      const requestLock = () => {
        if (
          disposed ||
          pointerLockActive(pointerLockHandle.controls, domElement)
        ) {
          return;
        }
        const now =
          typeof performance === "undefined" ? Date.now() : performance.now();
        if (lastUnlockAt > 0 && now - lastUnlockAt < 300) {
          emitDebug("lock_error", "state", 0, 0, false, "reenter-cooldown");
          return;
        }
        try {
          const request = domElement.requestPointerLock({
            unadjustedMovement: false,
          });
          void Promise.resolve(request).catch((error: unknown) => {
            emitDebug(
              "lock_error",
              "state",
              0,
              0,
              false,
              reason(error),
            );
          });
        } catch (error) {
          emitDebug("lock_error", "state", 0, 0, false, reason(error));
        }
      };

      const onPointerLockError = () => {
        emitDebug("lock_error", "state", 0, 0, false, "pointerlockerror");
      };
      domElement.ownerDocument.addEventListener(
        "pointerlockerror",
        onPointerLockError,
      );
      removers.push(() => {
        domElement.ownerDocument.removeEventListener(
          "pointerlockerror",
          onPointerLockError,
        );
      });

      if (resolved.lockSelector !== undefined) {
        if (typeof document !== "undefined") {
          const lockTargets = [
            ...document.querySelectorAll<HTMLElement>(resolved.lockSelector),
          ];
          for (const target of lockTargets) {
            removers.push(addEvent(target, "click", requestLock));
          }
        }
      }

      const onLock = () => {
        lastCameraQuaternion.copy(camera.quaternion);
        emitDebug("lock", "state", 0, 0, false, undefined, true);
        resolved.onLockChange?.(true);
      };
      const onUnlock = () => {
        lastUnlockAt =
          typeof performance === "undefined" ? Date.now() : performance.now();
        emitDebug("unlock", "state", 0, 0, false, undefined, false);
        resolved.onLockChange?.(false);
      };
      pointerLockHandle.controls.addEventListener("lock", onLock);
      pointerLockHandle.controls.addEventListener("unlock", onUnlock);
      removers.push(() => {
        pointerLockHandle.controls.removeEventListener("lock", onLock);
        pointerLockHandle.controls.removeEventListener("unlock", onUnlock);
      });

      return {
        controls: pointerLockHandle.controls,
        keyboard,
        update: (delta: number) =>
          Effect.sync(() => {
            if (disposed || !resolved.enabled) return;
            lastCameraQuaternion.copy(camera.quaternion);
            const desired = wasdDesiredDirection(camera, keyboard);
            integrateWasdVelocity(
              velocity,
              desired,
              delta,
              resolved,
              keyboard.sprint,
            );
            camera.position.addScaledVector(velocity, Math.max(0, delta));
            clampWasdPosition(camera.position, resolved.bounds);
            camera.position.y =
              resolved.groundHeightAt(camera.position.x, camera.position.z) +
              resolved.eyeHeight;
            camera.updateMatrixWorld();
          }),
        lock: Effect.sync(requestLock),
        unlock: pointerLockHandle.unlock,
        isLocked: pointerLockHandle.isLocked,
        getPosition: Effect.sync(() => camera.position.clone()),
        setPosition: (position: Three.Vector3) =>
          Effect.sync(() => {
            camera.position.copy(position);
            camera.updateMatrixWorld();
          }),
        dispose: Effect.sync(() => {
          if (disposed) return;
          disposed = true;
          for (const remove of removers.splice(0)) remove();
          for (const key of Object.keys(keyboard) as WasdAction[]) {
            keyboard[key] = false;
          }
          pointerLockHandle.controls.unlock();
          Effect.runSync(pointerLockHandle.dispose);
        }),
      };
    },
    catch: (error) =>
      new ThreePlayerControllerCreateError({ reason: reason(error) }),
  });

export const createThreePlayerController = (
  camera: Three.PerspectiveCamera,
  target: Three.Object3D,
  domElement: HTMLElement,
  options: ThreePlayerControllerOptions = {},
): Effect.Effect<ThreePlayerControllerHandle, ThreePlayerControllerCreateError> =>
  Effect.try({
    try: () => {
      const resolved = resolveThreePlayerControllerOptions(
        typeof window === "undefined" ? domElement : window,
        options,
      );
      const keyboard = defaultWasdKeyboardState();
      const characterState = defaultMmorpgCharacterControllerState();
      const cameraHandle = createThirdPersonFollowCamera(
        camera,
        target,
        resolved.camera,
      );
      const removers: Array<() => void> = [];
      let disposed = false;
      let verticalVelocity = 0;
      let lastAction: ThreePlayerControllerAvatarAction = "idle";

      target.position.set(
        resolved.initialPosition[0],
        resolved.initialPosition[1],
        resolved.initialPosition[2],
      );
      target.updateMatrixWorld();
      Effect.runSync(cameraHandle.snap);

      const emitAction = (action: ThreePlayerControllerAvatarAction) => {
        if (action === lastAction) return;
        lastAction = action;
        resolved.onActionChange?.(action);
      };
      const onKeyDown = (event: KeyboardEvent) => {
        if (!resolved.enabled || isEditableInputTarget(event.target)) return;
        if (setWasdKeyState(keyboard, event.code, true)) {
          event.preventDefault();
        }
      };
      const onKeyUp = (event: KeyboardEvent) => {
        if (setWasdKeyState(keyboard, event.code, false)) {
          event.preventDefault();
        }
      };
      resolved.inputTarget.addEventListener("keydown", onKeyDown as EventListener, {
        passive: false,
      });
      resolved.inputTarget.addEventListener("keyup", onKeyUp as EventListener, {
        passive: false,
      });
      removers.push(() => {
        resolved.inputTarget.removeEventListener("keydown", onKeyDown as EventListener);
        resolved.inputTarget.removeEventListener("keyup", onKeyUp as EventListener);
      });

      return {
        keyboard,
        update: (delta: number) =>
          Effect.sync(() => {
            if (disposed || !resolved.enabled) return;
            const safeDelta = Math.max(0, Math.min(delta, 0.1));
            const groundY = resolved.groundHeightAt(
              target.position.x,
              target.position.z,
            );
            const grounded = target.position.y <= groundY + 0.001;
            if (keyboard.rise && grounded) {
              verticalVelocity = resolved.jumpHeight;
            }
            verticalVelocity += resolved.gravity * safeDelta;
            const beforeY = target.position.y;
            const snapshot = updateMmorpgCharacterController(
              target,
              keyboard,
              characterState,
              safeDelta,
              resolved.character,
            );
            target.position.y = Math.max(
              groundY,
              beforeY + verticalVelocity * safeDelta,
            );
            if (target.position.y <= groundY + 0.001 && verticalVelocity < 0) {
              target.position.y = groundY;
              verticalVelocity = 0;
            }
            target.updateMatrixWorld();
            Effect.runSync(cameraHandle.update(safeDelta));
            emitAction(target.position.y > groundY + 0.01 ? "jump" : snapshot.action);
          }),
        getPosition: Effect.sync(() => target.position.clone()),
        setPosition: (position: Three.Vector3) =>
          Effect.sync(() => {
            target.position.copy(position);
            verticalVelocity = 0;
            target.updateMatrixWorld();
            Effect.runSync(cameraHandle.snap);
          }),
        dispose: Effect.sync(() => {
          if (disposed) return;
          disposed = true;
          for (const remove of removers.splice(0)) remove();
          for (const key of Object.keys(keyboard) as WasdAction[]) {
            keyboard[key] = false;
          }
        }),
      };
    },
    catch: (error) =>
      new ThreePlayerControllerCreateError({ reason: reason(error) }),
  });
