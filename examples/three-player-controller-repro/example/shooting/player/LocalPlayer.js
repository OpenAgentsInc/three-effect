import { MathUtils, Quaternion, Vector3, AnimationMixer, AnimationClip, LoopOnce, LoopRepeat } from "three";
import { playerController } from "../../../src/playerController";
import { SpineIK } from "./spineIK.js";

const spineBoneNames = ["mixamorigSpine", "mixamorigSpine1", "mixamorigSpine2"];

// 运动状态集合（用于判断 isMoving）
const locomotionStates = new Set([
    "idle",
    "walking",
    "walking_backward",
    "left_walking",
    "right_walking",
    "running",
    "jumping",
    "flyidle",
    "flying",
]);

// 允许执行战斗逻辑的运动状态（上半身分离后，奔跑时也可开火/换弹）
const combatAllowedLocomotion = new Set([
    "idle", "walking", "walking_backward", "left_walking", "right_walking", "running",
]);

const minPitchAngle = -Math.PI * (60 / 180); // 俯仰最小角（向下）
const maxPitchAngle = Math.PI * (40 / 180);  // 俯仰最大角（向上）

export class LocalPlayer {
    constructor({ scene, camera, controls }) {
        // ==================== 场景引用 ====================
        this._scene = scene;
        this._camera = camera;
        this._controls = controls;

        // ==================== 核心对象 ====================
        this._player = null; // playerController 实例
        this.spineIK = null; // 脊椎 IK 实例

        // ==================== 运动状态 ====================
        this.pitchTarget1P = 0; // 第一人称俯仰累积值
        this.isMoving = false; // 当前帧是否处于移动状态（由 onAnimationChange 更新）
        this._locomotionState = "idle"; // 当前运动动画状态名

        // ==================== 配置 ====================
        this._mouseSensitivity = 5;
        this._firstPersonPitchOffset = 0; // 第一人称相机俯仰初始偏移

        // ==================== 外部注入 ====================
        this._isGunEngagedFn = null; // 由 WeaponController 注入，判断是否持枪

        // ==================== 上半身动画层 ====================
        this._upperMixer = null;          // 上半身专用 AnimationMixer（root = 模型根节点）
        this._upperBodyBoneNames = null;  // 脊椎以上所有骨骼名称集合，用于过滤 partial clip
        this._upperBodyBones = null;      // 脊椎以上骨骼引用数组（缓存，避免每帧 getObjectByName）
        this._upperBoneSnapshots = null;  // 主 mixer 骨骼值快照
        this._upperActions = new Map();   // key → AnimationAction
        this._upperState = null;          // 当前上半身动作

        // ==================== 走路瞄准修正 ====================
        this._idleHipsQ = null; // 静止时保存的 hips 本地四元数，用于走路时抵消 hips 走路偏移
    }

    // ==================== 初始化 ====================

    // 初始化 playerController、骨骼 IK、事件回调
    async init(config) {
        const { mouseSensitivity = 5, ...rest } = config;
        this._mouseSensitivity = mouseSensitivity;
        this._firstPersonPitchOffset = config.playerModelConfig?.firstPersonPitchOffset
            ?? this._firstPersonPitchOffset;

        this._player = new playerController();
        await this._player.init({
            scene: this._scene,
            camera: this._camera,
            controls: this._controls,
            mouseSensitivity,
            ...rest,
        });

        // 绑定脊椎 & 头部骨骼
        const model = this._player.getPlayerModel();
        const spineBones = spineBoneNames
            .map((n) => model?.getObjectByName(n))
            .filter(Boolean);
        const headBoneName = config.playerModelConfig?.headBoneName;
        const headBone = model?.getObjectByName(headBoneName) ?? null;
        this.spineIK = new SpineIK(spineBones, headBone);

        // 上半身 mixer：root = 模型根节点（与主 mixer 一致，路径解析最可靠）
        // 通过 partial clip（只含脊椎以上骨骼的 track）来限制写入范围，
        // 主 mixer 更新后再更新 upper mixer，后者覆写脊椎以上骨骼，下半身保持 locomotion 值。
        if (spineBones.length > 0) {
            this._upperBodyBoneNames = new Set();
            this._upperBodyBones = [];
            spineBones[0].traverse(b => {
                this._upperBodyBoneNames.add(b.name);
                this._upperBodyBones.push(b);
            });
            // 预分配快照数组，避免每帧 GC
            this._upperBoneSnapshots = this._upperBodyBones.map(() => new Quaternion());
            this._upperMixer = new AnimationMixer(model);
        }

        // 监听动画切换，更新 isMoving
        this._player.onAnimationChange = (name) => {
            if (locomotionStates.has(name)) this._locomotionState = name;
            this.isMoving =
                name === "walking" ||
                name === "left_walking" ||
                name === "right_walking" ||
                name === "walking_backward" ||
                name === "running";
        };

        // 接管第一人称鼠标移动
        this._player.onTowardChange = (dx, dy, speed) => {
            if (!this._player.getIsFirstPerson()) return;

            // 水平朝向
            this._player.getPlayerCapsule().rotateY(
                -dx * speed * this._mouseSensitivity
            );

            // 俯仰角累积
            this.pitchTarget1P = MathUtils.clamp(
                this.pitchTarget1P + (-dy * speed * this._mouseSensitivity),
                minPitchAngle,
                maxPitchAngle
            );

            // 未持枪时直接驱动相机
            if (!this._isGunEngagedFn?.()) {
                this._camera.rotation.x = MathUtils.clamp(
                    this._camera.rotation.x + (-dy * speed * this._mouseSensitivity),
                    minPitchAngle,
                    maxPitchAngle
                );
            }
        };

        // 视角切换
        this._player.onViewChange = (isFirstPerson) => {
            this.onViewChange?.(isFirstPerson);
            if (isFirstPerson) {
                if (headBoneName) {
                    this._camera.position.z = 8;
                    this._camera.position.x = 15;
                } else {
                    this._camera.position.z = 0;
                    this._camera.position.x = 0;
                }
                this._camera.rotation.x = this._firstPersonPitchOffset;
                this._player.setEnableToward(false);
                // 同步控制器俯仰角
                const targetPolar = this._controls.getPolarAngle() - Math.PI / 2 + Math.PI * (7.5 / 180);
                this.pitchTarget1P = targetPolar;
                // 航向角偏移
                this._player.getPlayerCapsule().rotateY(-Math.PI * (17 / 180));
            } else {
                this._player.setEnableToward(true);
                // 持枪瞄准状态下刷新一次动画，保证骨骼复原
                if (this._player.getCurrentPlayerAnimationName().includes("rifle_idle_aim")) {
                    this._player.playAnimation("idle");
                }
                // 同步第一人称俯仰角
                const targetPolar = Math.PI / 2 + this.pitchTarget1P - Math.PI * (7.5 / 180);
                this._controls.minPolarAngle = targetPolar;
                this._controls.maxPolarAngle = targetPolar;
                this._controls.update();
                this._controls.minPolarAngle = minPitchAngle + Math.PI / 2;
                this._controls.maxPolarAngle = maxPitchAngle + Math.PI / 2;
                // 航向角偏移
                const delta = Math.PI * (17 / 180);
                const offset = this._camera.position.clone().sub(this._controls.target);
                offset.applyAxisAngle(new Vector3(0, 1, 0), delta);
                this._camera.position.copy(this._controls.target).add(offset);
                this._controls.update();
            }
        };

        // 限制第三人称俯仰角
        this._controls.minPolarAngle = minPitchAngle + Math.PI / 2;
        this._controls.maxPolarAngle = maxPitchAngle + Math.PI / 2;
    }

    // ==================== 外部注入 ====================

    // 由 WeaponController 注入，让 1P 俯仰驱动能感知持枪状态
    setGunEngagedGetter(fn) {
        this._isGunEngagedFn = fn;
    }

    // ==================== 主循环 ====================

    // 每帧驱动动画与物理
    // dt 须由主循环传入，上半身 mixer 在主 mixer 之后更新才能正确覆写骨骼
    update(dt) {
        this._player?.update(dt);

        if (this._upperMixer && dt != null) {
            const ua = this._upperState;
            if (!ua) return;

            // Three.js PropertyMixer.apply() 有变更检测优化：仅当 accu0 ≠ accu1 时
            // 才调用 setValue() 写入骨骼。对于完全相同帧的动画（两帧值一致），
            // 两个 accu buffer 永远相等，导致 setValue() 被跳过，主 mixer 的
            // locomotion 动画透过来。修复：每帧更新前把两个 accu buffer 填为 NaN，
            // 使比较永远不相等，强制 setValue() 每帧执行，确保上半身覆盖生效。
            if (ua._propertyBindings) {
                for (const pm of ua._propertyBindings) {
                    if (pm?.buffer) {
                        const s = pm.valueSize;
                        pm.buffer.fill(NaN, s, s * 3); // dirty accu0 + accu1
                    }
                }
            }
            this._upperMixer.update(dt);
        }
    }

    // ==================== 上半身动画层 ====================

    // 从指定 clip 的 t=0 帧直接读取 hips 四元数
    initIdleHipsQ(clipName) {
        const clip = this._player?.animation?.clips?.find(c => c.name === clipName);
        if (!clip) { console.warn(`initIdleHipsQ: 找不到 "${clipName}"`); return; }
        const track = clip.tracks.find(t => t.name === 'mixamorigHips.quaternion');
        if (!track || track.values.length < 4) return;
        this._idleHipsQ = new Quaternion(track.values[0], track.values[1], track.values[2], track.values[3]);
    }

    // 在上半身 mixer 上注册一个动画
    registerUpperAnimation(key, clipName, opts = {}) {
        if (!this._upperMixer || !this._upperBodyBoneNames) return;
        const clips = this._player?.animation?.clips;
        if (!clips) return;
        const clip = clips.find(c => c.name === clipName);
        if (!clip) { console.warn(`registerUpperAnimation: 找不到 "${clipName}"`); return; }

        // 只保留脊椎以上骨骼的 track，其余 track（hips、腿部等）丢弃
        const upperTracks = clip.tracks.filter(t => {
            const boneName = t.name.split('.')[0];
            return this._upperBodyBoneNames.has(boneName);
        });
        const partialClip = new AnimationClip(clip.name + '_upper_' + key, clip.duration, upperTracks);

        const action = this._upperMixer.clipAction(partialClip);
        action.setLoop(opts.loop === false ? LoopOnce : LoopRepeat, Infinity);
        action.clampWhenFinished = opts.clampWhenFinished ?? false;
        const ts = opts.duration ? clip.duration / opts.duration : (opts.timeScale ?? 1);
        action.setEffectiveTimeScale(ts);
        action.enabled = true;
        action.setEffectiveWeight(0);
        this._upperActions.set(key, action);

        if (opts.onFinished) {
            this._upperMixer.addEventListener("finished", (ev) => {
                if (ev.action === action) opts.onFinished();
            });
        }
    }

    // 播放上半身动画（仅覆写脊椎以上骨骼）
    playUpperBody(key, opts = {}) {
        if (!this._upperMixer) return;
        const next = this._upperActions.get(key);
        if (!next) { console.warn(`playUpperBody: "${key}" 未注册`); return; }

        const fade = opts.fade ?? 0.18;
        const prev = this._upperState;

        if (!opts.force && prev === next) return;

        // 直接设为 1，从第一帧起就以满权重覆盖主 mixer。
        if (prev && prev !== next) prev.fadeOut(fade);

        next.reset();
        next.setEffectiveWeight(1);
        next.play();

        this._upperState = next;
    }

    // 走路/奔跑时修正 spine[0] 四元数，抵消 hips 走路旋转偏移
    // 使 spine0 的世界朝向等效于静止时（idle hips × spine_local），
    applyHipsCorrection() {
        if (!this._idleHipsQ || !this.spineIK?.spineBones?.length) return;
        const hipsBone = this._player?.getPlayerModel()?.getObjectByName("mixamorigHips");
        if (!hipsBone) return;

        // correction = hips_walk_local⁻¹ × hips_idle_local
        const correction = new Quaternion().copy(hipsBone.quaternion).invert().multiply(this._idleHipsQ);
        const spine0 = this.spineIK.spineBones[0];
        spine0.quaternion.premultiply(correction);
        spine0.updateWorldMatrix(false, false);
    }

    // 停止上半身动画，让下半身（全身）动画完全接管
    stopUpperBody(fade = 0.18) {
        if (!this._upperState) return;
        this._upperState.fadeOut(fade);
        this._upperState = null;
    }

    // ==================== 工具方法 ====================

    isCombatLocomotionAllowed() { return combatAllowedLocomotion.has(this._locomotionState); }

    // ==================== playerController 代理 ====================

    getIsFirstPerson() { return this._player?.getIsFirstPerson() ?? false; }
    getIsFlying() { return this._player?.getIsFlying() ?? false; }
    getPosition() { return this._player?.getPosition?.() ?? null; }
    getFirstPersonPitchOffset() { return this._firstPersonPitchOffset; }
    getPlayerModel() { return this._player?.getPlayerModel(); }
    getCollider() { return this._player?.getCollider?.() ?? null; }
    getCenterScreenRaycastHit() { return this._player?.getCenterScreenRaycastHit() ?? null; }
    playAnimation(name, opts) { return this._player?.playAnimation(name, opts); }
    registerAnimation(key, clipName, opts) { return this._player?.registerAnimation(key, clipName, opts); }
    registerLocomotionSet(...a) { return this._player?.registerLocomotionSet(...a); }
    switchLocomotionSet(name) { return this._player?.switchLocomotionSet(name); }
    setMaxCamDistance(d) { return this._player?.setMaxCamDistance(d); }
    setPlayerSpeed(s) { return this._player?.setPlayerSpeed(s); }
    setEnableToward(v) { return this._player?.setEnableToward(v); }
    setThirdMouseMode(mode) { return this._player?.setThirdMouseMode(mode); }
    onAllEvent() { return this._player?.onAllEvent(); }
    offAllEvent() { return this._player?.offAllEvent(); }
    onViewChange(isFirstPerson) { return this._player?.onViewChange(isFirstPerson); }
}
