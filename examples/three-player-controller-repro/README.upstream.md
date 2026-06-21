[中文](README.md) | English

# three-player-controller

[![NPM Package][npm]][npm-url]
[![Github][github]][github-url]
[![X][x]][x-url]

A lightweight player controller for three.js, ready out of the box. It provides capsule-based character collision, animation, first/third-person view switching, and camera obstacle avoidance, with three-mesh-bvh accelerating collision detection for high performance in large scenes.

# Demo

[![Demo](https://github.com/hh-hang/three-player-controller/blob/master/example/public/img/readme/preview.jpg)](https://hh-hang.github.io/three-player-controller/index.html)

### Standard Control

![Standard Control Demo](https://github.com/hh-hang/three-player-controller/blob/master/example/public/img/readme/standard.gif)

### Flight Control

![Flight Control Demo](https://github.com/hh-hang/three-player-controller/blob/master/example/public/img/readme/flight.gif)

### Vehicle Control

![Vehicle Control Demo](https://github.com/hh-hang/three-player-controller/blob/master/example/public/img/readme/vehicle.gif)

### Mobile Control

![Mobile Control Demo](https://github.com/hh-hang/three-player-controller/blob/master/example/public/img/readme/mobile.gif)

# Installation

```bash
npm install three-player-controller three three-mesh-bvh
```

## Optional Dependency

Vehicle support requires Rapier:

```bash
npm install @dimforge/rapier3d-compat
```

# Run Locally

```bash
git clone https://github.com/hh-hang/three-player-controller.git
npm install
npm run dev
```

Open `http://localhost:5173/three-player-controller/`.

# Usage

```ts
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { playerController } from "three-player-controller";

// Set up the three.js environment (scene / camera / renderer / controls)
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);

// playerController core usage
const player = new playerController();

// Player controller initialization
await player.init({
    scene,    // three.js scene instance
    camera,   // three.js camera instance
    controls, // external camera controller
    playerModelConfig: {
        url: "./glb/person.glb",   // model path (GLB/GLTF)
        scale: 0.001,              // model scale
        idleAnim: "idle",          // idle clip name
        walkAnim: "walk",          // walk clip name
        runAnim: "run",            // run clip name
        jumpAnim: "jump",          // jump clip name; or pass ["start", "loop", "land"] for a three-phase jump
    },
    initPos: new THREE.Vector3(0, 0, 0),  // initial spawn position
});

// Vehicle controller initialization (optional)
await player.loadVehicleModel({
    url: "./glb/bugatti.glb",                                      // vehicle model URL
    position: new THREE.Vector3(0, 0, 0),                          // vehicle position
    wheelsNames: ["Wheel_LF", "Wheel_RF", "Wheel_LR", "Wheel_RR"], // order: front-left, front-right, rear-left, rear-right
    boardingPoint: new THREE.Vector3(0.5, 0, 1.8),                 // boarding trigger point, local coordinates
});

// Called every frame
function animate() {
    requestAnimationFrame(animate);
    player.update();
    renderer.render(scene, camera);
}
animate();
```

> `player.update()` already drives the camera controller you passed in. Do not call `controls.update()` again in your render loop, or it will conflict with the internal camera logic.

### Full Parameter Example

#### `init()`

```ts
await player.init({
    // Required
    scene,    // three.js scene instance
    camera,   // three.js camera instance
    controls, // external camera controller
    playerModelConfig: {
        url: "./glb/person.glb",   // model path (GLB/GLTF)
        scale: 0.001,              // model scale
        idleAnim: "idle",          // idle clip name
        walkAnim: "walk",          // walk clip name
        runAnim: "run",            // run clip name
        jumpAnim: "jump",          // jump clip name; or pass ["start", "loop", "land"] for a three-phase jump

        // Directional animations (optional; each falls back to the matching default)
        leftWalkAnim: "leftWalk",         // falls back to walkAnim
        rightWalkAnim: "rightWalk",       // falls back to walkAnim
        backwardAnim: "walkBack",         // falls back to walkAnim
        flyAnim: "fly",                   // falls back to idleAnim
        flyIdleAnim: "flyIdle",           // falls back to idleAnim
        flyHoverForwardAnim: "flyFwd",    // falls back to flyAnim
        flyHoverBackAnim: "flyBack",      // falls back to flyIdleAnim
        flyHoverLeftAnim: "flyLeft",      // falls back to flyIdleAnim
        flyHoverRightAnim: "flyRight",    // falls back to flyIdleAnim
        flyHoverUpAnim: "flyUp",          // falls back to flyIdleAnim
        flyHoverDownAnim: "flyDown",      // falls back to flyIdleAnim
        enterCarAnim: "enterCar",         // enter-vehicle clip (recommended when using vehicle support)
        exitCarAnim: "exitCar",           // exit-vehicle clip (recommended when using vehicle support)

        // Physics params (optional)
        gravity: -2400,     // gravity base value, scaled by scale
        jumpHeight: 600,    // jump height base value, scaled by scale
        speed: 300,         // move speed base value, scaled by scale
        flySpeed: 2100,     // fly speed base value, scaled by scale
        acceleration: 30,   // XZ acceleration response speed
        deceleration: 30,   // XZ deceleration response speed

        // Model params (optional)
        rotateY: 0,                            // initial character facing (radians), changes the model's initial facing direction
        headBoneName: "Head",                  // head bone name, used for first-person camera attachment
        firstPersonCameraOffset: [0, 40, 30],  // first-person camera local offset
        capsuleRadiusRatio: 1,                 // capsule radius multiplier
    },

    // Scene & collision (optional)
    initPos: new THREE.Vector3(0, 0, 0),       // initial spawn position
    staticCollider: mesh,                      // static collider source; if omitted, the whole scene is traversed
    dynamicCollider: platform,                 // dynamic colliders registered at init

    // Camera (optional)
    minCamDistance: 100,           // minimum third-person camera distance
    maxCamDistance: 440,           // maximum third-person camera distance
    camLookAtHeightRatio: 0.8,     // camera look-at height ratio, 0 = bottom, 1 = top
    thirdMouseMode: 1,             // mouse control mode 0-5, see Field Reference
    enableZoom: false,             // whether wheel zoom is allowed
    enableOverShoulderView: false, // whether over-shoulder view is enabled
    isFirstPerson: false,          // whether to start in first-person
    enableSpringCamera: false,     // whether to enable spring camera
    springCameraTime: 0.05,        // spring camera smooth time (seconds); lower = tighter tracking

    // Misc (optional)
    mouseSensitivity: 5,           // mouse sensitivity
    timeScale: 1,                  // time scale multiplier; < 1 slow motion, > 1 fast forward
    keyMap: {                      // custom key bindings (defaults shown; rebind, bind multiple via array, or null to disable — see Custom Key Mapping)
        forward: ["KeyW", "ArrowUp"],        // move forward
        backward: ["KeyS", "ArrowDown"],     // move backward
        left: ["KeyA", "ArrowLeft"],         // move left
        right: ["KeyD", "ArrowRight"],       // move right
        sprint: ["ShiftLeft", "ShiftRight"], // sprint
        jump: ["Space"],                     // jump
        toggleView: ["KeyV"],                // toggle view
        toggleFly: ["KeyF"],                 // toggle flight mode
        toggleVehicle: ["KeyE"],             // enter / exit vehicle
    },
    isShowMobileControls: true,    // whether to show virtual controls on mobile
    mobileControls: {              // mobile button visibility (all shown by default)
        joystick: true,             // show joystick, default true
        jump: true,                 // show jump button, default true
        fly: true,                  // show fly button, default true
        view: true,                 // show view button, default true
        vehicle: true,              // show vehicle button, default true
    },
});
```

#### `loadVehicleModel()`

```ts
await player.loadVehicleModel({
    // Required
    url: "./glb/bugatti.glb",                                      // vehicle model URL
    position: new THREE.Vector3(0, 0, 0),                          // vehicle position
    wheelsNames: ["Wheel_LF", "Wheel_RF", "Wheel_LR", "Wheel_RR"], // order: front-left, front-right, rear-left, rear-right
    boardingPoint: new THREE.Vector3(0.5, 0, 1.8),                 // boarding trigger point, local coordinates

    // Optional
    scale: 0.1,                                // vehicle model scale, default 1
    animations: {
        openDoorAnim: "openDoorLF",            // door open/close clip name
    },
    seatOffset: new THREE.Vector3(0, 0.6, 0),  // seat offset, default (0,0,0)
    chassisRatio: 0.15,                        // chassis height ratio, default 0.2
    suspensionRestLengthRatio: 0.2,            // suspension rest length ratio, default 0.2
    followVehicleDirection: true,              // camera follows vehicle direction while driving, default true
    speedMultiplier: 1,                        // per-vehicle speed multiplier, default 1
});
```

# API

## Lifecycle

| Method | Description |
| --- | --- |
| `init(opts, callback?)` | Initialize the controller. `callback` runs after loading completes. |
| `update(dt?)` | Update movement, collision, and animation each frame. It already drives the camera controller you passed in, so you don't need to call `controls.update()` in your loop. |
| `destroy()` | Dispose the controller and remove listeners. |
| `reset(pos?)` | Reset the character to `pos` or the initial position. |
| `switchPlayerModel(model)` | Swap the current player model while preserving position and facing. |
| `loadVehicleModel(opts)` | Load a vehicle. Can be called multiple times for multiple vehicles. |
| `changeView()` | Toggle first-person / third-person. |
| `setFirstPersonCamera(vertAngle?)` | Switch directly to first-person with an optional initial vertical angle. |
| `buildStaticCollider(sources?)` | Build the static collider. If omitted, traverses the whole scene. |
| `addDynamicCollider(source)` | Register a dynamic collider (e.g. a moving platform). |
| `removeDynamicCollider(source)` | Unregister a previously added dynamic collider. |
| `clearDynamicColliders()` | Remove all dynamic colliders. |

## State Getters

| Method | Return |
| --- | --- |
| `getPosition()` | Current player position. |
| `getVelocity()` | Current player velocity as `THREE.Vector3`. |
| `getIsFirstPerson()` | Whether first-person mode is active. |
| `getIsFlying()` | Whether flight mode is active. |
| `getIsOnGround()` | Whether the player is grounded. |
| `getControllerMode()` | `0` for player mode, `1` for vehicle mode. |
| `getPlayerModel()` | The loaded player model object. |
| `getPlayerCapsule()` | The player capsule mesh. |
| `getActiveVehicle()` | The current vehicle instance in use. |
| `getAllVehicles()` | All loaded vehicle instances. |
| `getCollider()` | The merged collider mesh used for BVH checks. |
| `getCurrentPlayerAnimationName()` | The current animation clip name, or `null`. |
| `getCenterScreenRaycastHit()` | Center-screen raycast result, useful for aiming or interaction. |
| `getActiveDynamicCollider()` | The dynamic collider the player is currently standing on, or `null`. |
| `getCurrentLocomotionSet()` | The name of the currently active locomotion set. |

## Input And Runtime Controls

| Method | Description |
| --- | --- |
| `setInput(input)` | Feed custom input state, useful for gamepads or your own key mapping. |
| `setKeyMap(map?)` | Customize key bindings at runtime; omit the argument to restore defaults (see [Custom Key Mapping](#custom-key-mapping)). |
| `setMouseSensitivity(v)` | Set mouse sensitivity. |
| `setPlayerScale(v)` | Rescale the player and update collider-related values. |
| `setPlayerSpeed(v)` | Set move speed. |
| `setPlayerFlySpeed(v)` | Set fly speed. |
| `setJumpHeight(v)` | Set jump height. |
| `setGravity(v)` | Set gravity. |
| `setMinCamDistance(v)` | Set minimum third-person camera distance. |
| `setMaxCamDistance(v)` | Set maximum third-person camera distance. |
| `setCamLookAtHeightRatio(v)` | Set the third-person camera look-at height ratio (0 = bottom, 1 = top). |
| `setThirdMouseMode(v)` | Set third-person mouse mode: [0 | 1 | 2 | 3 | 4 | 5]. |
| `setEnableZoom(v)` | Enable or disable camera zoom. |
| `setOverShoulderView(v)` | Enable or disable over-shoulder view offset. |
| `setDebug(v)` | Show or hide collider debug display. |
| `setEnableToward(v)` | Enable or disable mouse-driven facing / look updates. |

### Input Listeners

Keyboard and mouse listeners are enabled by default once `init()` completes — no manual call needed. The two methods below let you temporarily disable and re-enable listening at runtime.

```ts
player.offAllEvent(); // disable keyboard / mouse listeners
player.onAllEvent();  // re-enable keyboard / mouse listeners
```

### Default Keyboard Controls

| Action | Default Key | Function |
| --- | --- | --- |
| `forward` | `W` / `ArrowUp` | Move forward |
| `backward` | `S` / `ArrowDown` | Move backward |
| `left` | `A` / `ArrowLeft` | Move left |
| `right` | `D` / `ArrowRight` | Move right |
| `sprint` | `Shift` | Sprint |
| `jump` | `Space` | Jump |
| `toggleView` | `V` | Toggle view |
| `toggleFly` | `F` | Toggle flight mode |
| `toggleVehicle` | `E` | Enter / exit vehicle |
| — | Mouse move | Look / rotate camera |

### Custom Key Mapping

Use `keyMap` to rebind any action above to other keys, or disable an action entirely. Key names use [`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code) (e.g. `"KeyE"`, `"ArrowUp"`, `"Space"` — note it's `"KeyE"`, not `"e"`).

Each action accepts one of three values:

- **Omitted** → use the default key(s)
- **String / string array** → replace with the given key(s) (an array binds multiple keys)
- **`null`** → disable the action (no key triggers it)

Configure at init:

```ts
await player.init({
    // ...
    keyMap: {
        forward: "KeyE",          // press E to move forward (replaces default W / ↑)
        jump: null,               // disable jump
        left: ["KeyA", "KeyJ"],   // bind both A and J
        // other actions omitted, keep defaults
    },
});
```

Switch key bindings at runtime:

```ts
player.setKeyMap({ forward: "KeyI", backward: "KeyK" }); // apply new bindings
player.setKeyMap();                                      // restore all defaults
```

### `setInput`

```ts
player.setInput({
    moveX: 1 | 0 | -1,    // horizontal move, 1 = right, -1 = left
    moveY: 1 | 0 | -1,    // forward/back move, 1 = forward, -1 = back
    lookDeltaX: number,   // horizontal look delta, typically from mousemove's movementX
    lookDeltaY: number,   // vertical look delta, typically from mousemove's movementY
    jump: boolean,        // jump, held state (true = pressed, false = released); ascends while flying
    shift: boolean,       // sprint, held state (true = pressed, false = released)
    toggleView: boolean,  // trigger: pass true to toggle first/third-person view
    toggleFly: boolean,   // trigger: pass true to toggle flight mode
    toggleVehicle: boolean, // trigger: pass true to enter / exit vehicle
});
```

## Animation

| Method | Description |
| --- | --- |
| `playPlayerAnimationByName(name, fade?)` | Play a player animation directly by clip name. |
| `registerAnimation(key, clipName, opts?)` | Register a custom animation clip. |
| `playAnimation(key, opts?)` | Play a registered custom animation. |
| `registerLocomotionSet(setName, map)` | Register a locomotion set to replace built-in movement animations. |
| `switchLocomotionSet(setName, fade?)` | Switch to a registered locomotion set. |

### `registerAnimation`

```ts
player.registerAnimation(key, clipName, {
    loop?: boolean,              // whether to loop, default true
    timeScale?: number,          // playback time scale, default 1
    duration?: number,           // playback duration, default 0
    clampWhenFinished?: boolean, // whether to reset the animation time to 0 after finishing, default false
    onFinished?: () => void,     // fired after the animation finishes
});
```

When both `duration` and `timeScale` are set, `duration` takes precedence.

### `playAnimation`

```ts
player.playAnimation(key, {
    fade?: number,          // transition time (seconds), default 0.18
    force?: boolean,        // when true, force a restart even if this animation is already playing
    returnToPrev?: boolean, // LoopOnce clips only; auto-restores the previous animation state after finishing
});
```

### `registerLocomotionSet`

Supported keys: `idle` | `walking` | `walking_backward` | `running` | `jumping` | `flyidle` | `flying`. Provided keys replace the matching built-in animation; omitted keys keep the original.

```ts
player.registerLocomotionSet("combat", {
    idle: "CombatIdle",
    walking: "CombatWalk",
    walking_backward: "CombatBack",
    running: "CombatRun",
    jumping: "CombatJump",
    flyidle: "CombatFlyIdle",
    flying: "CombatFly",
});
```

## Events

```ts
player.onAnimationChange = (name, action) => {};   // fired when the active player animation changes
player.onBeforeViewChange = (isFirstPerson) => {}; // fired before first/third-person toggles
player.onViewChange = (isFirstPerson) => {};       // fired after first/third-person toggles
player.onGroundChange = (onGround) => {};          // fired when grounded state changes
player.onVehicleEnter = (vehicle) => {};           // fired after entering a vehicle
player.onVehicleExit = (vehicle) => {};            // fired after exiting a vehicle
player.onTowardChange = (dx, dy, speed) => {};     // fired when look / facing input updates
```

## Field Reference

### `PlayerControllerOptions`

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `scene` | `THREE.Scene` | Yes | — | three.js scene instance. |
| `camera` | `THREE.PerspectiveCamera` | Yes | — | three.js camera instance. |
| `controls` | `any` | Yes | — | External camera controller, typically `OrbitControls`. |
| `playerModelConfig` | `PlayerModelOptions` | Yes | — | Player model and movement config. |
| `initPos` | `THREE.Vector3` | No | `(0, 0, 0)` | Initial spawn position. |
| `mouseSensitivity` | `number` | No | `5` | Mouse sensitivity. |
| `minCamDistance` | `number` | No | `100` | Minimum third-person camera distance. |
| `maxCamDistance` | `number` | No | `440` | Maximum third-person camera distance. |
| `staticCollider` | `THREE.Object3D \| THREE.Object3D[]` | No | — | Source(s) for the static collider; if omitted, the whole scene is traversed. |
| `dynamicCollider` | `THREE.Object3D \| THREE.Object3D[]` | No | — | Dynamic colliders registered at init time. |
| `isShowMobileControls` | `boolean` | No | `true` | Whether to show virtual controls on mobile. |
| `mobileControls` | `MobileControlsOptions` | No | all shown | Mobile button visibility config. |
| `thirdMouseMode` | `0 \| 1 \| 2 \| 3 \| 4 \| 5` | No | `1` | Mouse control mode in third-person view (0: hide cursor, control facing and camera; 1: hide cursor, camera only; 2: show cursor, drag to control facing and camera; 3: show cursor, drag to control camera only; 4: show cursor, drag to control camera, character facing follows camera horizontal direction; 5: hide cursor, control camera, character facing follows camera horizontal direction). |
| `enableZoom` | `boolean` | No | `false` | Whether wheel zoom is enabled. |
| `enableOverShoulderView` | `boolean` | No | `false` | Whether over-shoulder view is enabled. |
| `isFirstPerson` | `boolean` | No | `false` | Whether to start directly in first-person. |
| `enableSpringCamera` | `boolean` | No | `false` | Whether to enable spring camera (the target follows the character with spring-damper smoothing). |
| `springCameraTime` | `number` | No | `0.05` | Spring smooth time (seconds); lower = tighter tracking. |
| `camLookAtHeightRatio` | `number` | No | `0.8` | Third-person camera look-at height ratio (0 = capsule bottom, 1 = top). |
| `timeScale` | `number` | No | `1` | Time scale multiplier; < 1 slow motion, > 1 fast forward. |
| `keyMap` | `KeyMap` | No | default bindings | Custom key binding map. See [Custom Key Mapping](#custom-key-mapping). |

### `PlayerModelOptions`

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `url` | `string` | Yes | — | Player model path (GLB/GLTF). |
| `scale` | `number` | Yes | — | Player model scale. |
| `idleAnim` | `string` | Yes | — | Idle clip name. |
| `walkAnim` | `string` | Yes | — | Walk clip name. |
| `runAnim` | `string` | Yes | — | Run clip name. |
| `jumpAnim` | `string \| [string, string, string]` | Yes | — | Jump clip name. Pass a string for a single clip; pass `[start, loop, land]` for a three-phase jump that auto-transitions back to movement on landing. |
| `leftWalkAnim` | `string` | No | `walkAnim` | Left strafe clip; falls back to `walkAnim`. |
| `rightWalkAnim` | `string` | No | `walkAnim` | Right strafe clip; falls back to `walkAnim`. |
| `backwardAnim` | `string` | No | `walkAnim` | Backward walk clip; falls back to `walkAnim`. |
| `flyAnim` | `string` | No | `idleAnim` | Flying clip; falls back to `idleAnim`. |
| `flyIdleAnim` | `string` | No | `idleAnim` | Fly-idle clip; falls back to `idleAnim`. |
| `flyHoverForwardAnim` | `string` | No | `flyAnim` | Hover clip while flying forward; falls back to `flyAnim`. |
| `flyHoverBackAnim` | `string` | No | `flyIdleAnim` | Hover clip while flying backward; falls back to `flyIdleAnim`. |
| `flyHoverLeftAnim` | `string` | No | `flyIdleAnim` | Hover clip while flying left; falls back to `flyIdleAnim`. |
| `flyHoverRightAnim` | `string` | No | `flyIdleAnim` | Hover clip while flying right; falls back to `flyIdleAnim`. |
| `flyHoverUpAnim` | `string` | No | `flyIdleAnim` | Hover clip while ascending; falls back to `flyIdleAnim`. |
| `flyHoverDownAnim` | `string` | No | `flyIdleAnim` | Hover clip while descending; falls back to `flyIdleAnim`. |
| `enterCarAnim` | `string` | No | — | Enter-vehicle clip; recommended when using vehicle support. |
| `exitCarAnim` | `string` | No | — | Exit-vehicle clip; recommended when using vehicle support. |
| `gravity` | `number` | No | `-2400` | Gravity base value (scaled by `scale`). |
| `jumpHeight` | `number` | No | `600` | Jump height base value (scaled by `scale`). |
| `speed` | `number` | No | `300` | Move speed base value (scaled by `scale`). |
| `flySpeed` | `number` | No | `2100` | Fly speed base value (scaled by `scale`). |
| `rotateY` | `number` | No | `0` | Initial character facing (radians); changes the model's initial facing direction. |
| `headBoneName` | `string` | No | — | Head bone or node name, used for first-person camera attachment. |
| `firstPersonCameraOffset` | `[number, number, number]` | No | built-in fallback | Local first-person camera offset; relative to the head bone if `headBoneName` is set, otherwise to the capsule. |
| `capsuleRadiusRatio` | `number` | No | `1` | Capsule radius multiplier for collision tuning. |
| `acceleration` | `number` | No | `30` | XZ acceleration response speed; higher values mean faster acceleration. |
| `deceleration` | `number` | No | `30` | XZ deceleration response speed; higher values mean the character stops faster. |

### `MobileControlsOptions`

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `joystick` | `boolean` | No | `true` | Show joystick. |
| `jump` | `boolean` | No | `true` | Show jump button. |
| `fly` | `boolean` | No | `true` | Show fly button. |
| `view` | `boolean` | No | `true` | Show view toggle button. |
| `vehicle` | `boolean` | No | `true` | Show enter/exit vehicle button. |

### `VehicleOptions`

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `url` | `string` | Yes | — | Vehicle model path (GLB/GLTF). |
| `position` | `THREE.Vector3` | Yes | — | Initial world position. |
| `wheelsNames` | `string[]` | Yes | — | Wheel node names in order: front-left, front-right, rear-left, rear-right. |
| `scale` | `number` | No | `1` | Vehicle model scale. |
| `animations.openDoorAnim` | `string` | No | — | Door open/close clip name. |
| `boardingPoint` | `THREE.Vector3` | Yes | — | Boarding point in local space. |
| `seatOffset` | `THREE.Vector3` | No | `(0, 0, 0)` | Seat offset applied after entering the vehicle. |
| `chassisRatio` | `number` | No | `0.2` | Chassis height ratio. |
| `suspensionRestLengthRatio` | `number` | No | `0.2` | Suspension rest length ratio. |
| `followVehicleDirection` | `boolean` | No | `true` | Whether the camera follows the vehicle direction while driving. |
| `speedMultiplier` | `number` | No | `1` | Per-vehicle speed multiplier. |

# Feedback

If you have any questions or good ideas, feel free to submit an [issue](https://github.com/hh-hang/three-player-controller/issues).

# Credits

[three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh)

[three](https://github.com/mrdoob/three.js)

[npm]: https://img.shields.io/npm/v/three-player-controller
[npm-url]: https://www.npmjs.com/package/three-player-controller
[github]: https://img.shields.io/badge/-hh--hang-181717?style=flat&logo=github&logoColor=white&labelColor=888
[github-url]: https://github.com/hh-hang
[x]: https://img.shields.io/badge/-vgyuvhang-000000?style=flat&logo=x&logoColor=white&labelColor=888
[x-url]: https://x.com/vgyuvhang
