import { Data, Effect } from "effect";
import * as Three from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

import { createPointerLockControls } from "./extraControlsPrimitives";

export const pmndrsPlayerControllerPrimitiveSourceRefs = [
  "projects/repos/drei/src/core/PointerLockControls.tsx",
  "projects/repos/drei/src/web/KeyboardControls.tsx",
  "projects/repos/Quick_3D_MMORPG/client/src/player-input.js",
  "projects/repos/Quick_3D_MMORPG/client/src/player-entity.js",
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

export type WasdMovementBounds = Readonly<{
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
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
  pitchMin: -Math.PI / 2 + 0.05,
  pitchMax: Math.PI / 2 - 0.05,
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

      const removers: Array<() => void> = [];
      const keyTarget = resolved.inputTarget;
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

      if (resolved.lockSelector !== undefined) {
        if (typeof document !== "undefined") {
          const lockTargets = [
            ...document.querySelectorAll<HTMLElement>(resolved.lockSelector),
          ];
          const lock = () => pointerLockHandle.controls.lock();
          for (const target of lockTargets) {
            removers.push(addEvent(target, "click", lock));
          }
        }
      }

      if (resolved.onLockChange !== undefined) {
        const onLock = () => resolved.onLockChange?.(true);
        const onUnlock = () => resolved.onLockChange?.(false);
        pointerLockHandle.controls.addEventListener("lock", onLock);
        pointerLockHandle.controls.addEventListener("unlock", onUnlock);
        removers.push(() => {
          pointerLockHandle.controls.removeEventListener("lock", onLock);
          pointerLockHandle.controls.removeEventListener("unlock", onUnlock);
        });
      }

      let disposed = false;
      return {
        controls: pointerLockHandle.controls,
        keyboard,
        update: (delta: number) =>
          Effect.sync(() => {
            if (disposed || !resolved.enabled) return;
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
        lock: pointerLockHandle.lock,
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
