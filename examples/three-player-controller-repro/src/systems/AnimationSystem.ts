import * as THREE from "three";
import type { playerController } from "../playerController";

export class AnimationSystem {
    private ctrl: playerController; // 主控制器引用

    mixer?: THREE.AnimationMixer; // 动画混合器
    mixerCb?: (ev: any) => void; // 完成事件回调
    actions?: Map<string, THREE.AnimationAction>; // 动作映射表
    state!: THREE.AnimationAction; // 当前播放状态
    sets = new Map<string, Map<string, THREE.AnimationAction>>(); // 动作集合组
    currentLocomotionSet: string | null = null; // 当前激活的动作集合名
    recheckTimer: any = null; // 延迟重检定时器
    clips: THREE.AnimationClip[] = []; // 原始动画片段
    hasThreePartJump = false; // 是否使用三段跳跃动画
    isOverrideAnimationPlaying = false; // 动画锁，用于防止覆盖型动画被移动动画打断
    private overrideInputSnapshot: Record<string, any> | null = null; // 覆盖动画播放时的输入快照，用于检测打断

    constructor(ctrl: playerController) {
        this.ctrl = ctrl;
    }

    // 按名切换动画
    playByName(name: string, fade = 0.18) {
        if (!this.actions) return;
        const next = this.actions.get(name);
        // 如果动画不存在，或已在播放，则忽略
        if (!next || this.state === next) return;

        const prev = this.state;
        next.reset();
        next.setEffectiveWeight(1);

        // 上下车动画特殊处理：根据配置的上下车时间调整动画速度
        if (name === "enterCar" || name === "exitCar") {
            const duration = next.getClip().duration;
            const enterTime = this.ctrl.vehicle.active?.enterVehicleTime ?? 1.5;
            next.setEffectiveTimeScale(duration / enterTime);
            next.setLoop(THREE.LoopOnce, 1);
            next.clampWhenFinished = true;
        }

        next.play();
        // 平滑过渡动画
        if (prev && prev !== next) { prev.fadeOut(fade); next.fadeIn(fade); }
        else next.fadeIn(fade);

        this.state = next;
        this.ctrl.onAnimationChange?.(name, next);
    }

    // 注册自定义动画
    register(key: string, clipName: string, opts?: {
        loop?: boolean;
        timeScale?: number;
        duration?: number;
        clampWhenFinished?: boolean;
        onFinished?: () => void;
    }) {
        if (!this.mixer || !this.actions) return;
        const clip = this.clips.find(c => c.name === clipName);
        if (!clip) { console.warn(`找不到 "${clipName}" 动画`); return; }

        const action = this.mixer.clipAction(clip);
        // duration 优先于 timeScale，如果指定了 duration，则据此计算 timeScale
        const timeScale = opts?.duration ? clip.duration / opts.duration : (opts?.timeScale ?? 1);
        action.setLoop(opts?.loop === false ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
        action.clampWhenFinished = opts?.clampWhenFinished ?? false;
        action.setEffectiveTimeScale(timeScale);
        action.enabled = true;
        action.setEffectiveWeight(0);
        this.actions.set(key, action);

        // 如果有 onFinished 回调，则监听动画完成事件
        if (opts?.onFinished) {
            this.mixer.addEventListener("finished", (ev: any) => {
                if (ev.action === action) opts.onFinished!();
            });
        }
    }

    // 注册移动动作组
    registerLocomotionSet(setName: string, map: Partial<Record<"idle" | "walking" | "walking_backward" | "running" | "jumping" | "flyidle" | "flying", string>>) {
        if (!this.mixer) return;
        const set = new Map<string, THREE.AnimationAction>();
        for (const [key, clipName] of Object.entries(map) as [string, string][]) {
            const clip = this.clips.find(c => c.name === clipName);
            if (!clip) { console.warn(`registerLocomotionSet: 找不到 "${clipName}"`); continue; }
            const action = this.mixer.clipAction(clip);
            // 跳跃动画特殊处理：只播放一次
            if (key === "jumping") {
                action.setLoop(THREE.LoopOnce, 1);
                action.clampWhenFinished = true;
                action.setEffectiveTimeScale(1.2);
            } else {
                action.setLoop(THREE.LoopRepeat, Infinity);
                action.setEffectiveTimeScale(1);
            }
            action.enabled = true;
            action.setEffectiveWeight(0);
            set.set(key, action);
        }
        this.sets.set(setName, set);
    }

    // 切换移动动作组
    switchLocomotionSet(setName: string, fade = 0.18) {
        if (!this.actions) return;
        const set = this.sets.get(setName);
        if (!set) { console.warn(`switchLocomotionSet: 未找到集合 "${setName}"`); return; }
        this.currentLocomotionSet = setName;
        for (const [key, newAction] of set.entries()) {
            const oldAction = this.actions.get(key);
            if (oldAction === newAction) continue;
            // 将旧动作淡出
            if (oldAction) oldAction.fadeOut(fade);
            // 替换当前动作表中的动作为新集合中的动作
            this.actions.set(key, newAction);
            // 如果正在播放的动画被替换，则立即切换到新动画
            if (this.state === oldAction) {
                newAction.reset();
                newAction.setEffectiveWeight(1);
                newAction.fadeIn(fade);
                newAction.play();
                this.state = newAction;
                this.ctrl.onAnimationChange?.(key, newAction);
            }
        }
    }

    // 播放已注册动画
    play(key: string, opts?: { fade?: number; force?: boolean; returnToPrev?: boolean }) {
        if (!this.actions) return;
        const action = this.actions.get(key);
        if (!action) { console.warn(`playAnimation: "${key}" 未注册`); return; }

        // 如果是播放一次的动画，则设置动画锁
        if (action.loop === THREE.LoopOnce) {
            // 设置动画锁
            this.isOverrideAnimationPlaying = true;

            // 记录当前完整输入状态快照
            this.overrideInputSnapshot = { ...this.ctrl.input };

            // 设置动画播放完毕后的自动解锁
            const onFinish = (e: any) => {
                if (e.action === action) {
                    // 仅当锁仍然激活时才解锁
                    if (this.isOverrideAnimationPlaying && this.overrideInputSnapshot) {
                        this.isOverrideAnimationPlaying = false;
                        this.overrideInputSnapshot = null;
                    }
                    this.mixer!.removeEventListener('finished', onFinish);
                }
            };
            this.mixer!.addEventListener('finished', onFinish);
        }

        if (opts?.force) action.reset();

        // 记录初始动画状态以便返回
        const prevState = opts?.returnToPrev ? this.state : null;
        // 播放目标动画
        this.playByName(key, opts?.fade ?? 0.18);

        // 如果设置 returnToPrev，则在动画播放完毕后返回之前的动画状态
        if (opts?.returnToPrev && prevState && this.mixer) {
            // 存储当前动画状态
            const action = this.actions.get(key)!;
            const fade = opts?.fade ?? 0.18;
            // 定义一个一次性的事件处理器
            const handler = (ev: any) => {
                if (ev.action === action && this.state === action) {
                    this.mixer!.removeEventListener("finished", handler);
                    const cur = this.state;
                    // 停止当前动画
                    cur.stop();
                    // 重置前一个状态
                    prevState.reset();
                    // 将权重设置为1并播放前一个状态动画
                    prevState.setEffectiveWeight(1);
                    prevState.play();
                    // 更新状态
                    this.state = prevState;
                    this.ctrl.onAnimationChange?.(prevState.getClip().name, prevState);
                }
            };
            // 监听动画完成事件
            this.mixer.addEventListener("finished", handler);
        }
    }

    // 触发跳跃动画（统一入口）
    startJump(inAir = false) {
        // 根据是否配置了三段跳跃，播放不同动画
        if (this.hasThreePartJump) {
            this.playByName(inAir ? "jumpLoop" : "jumpStart");
        } else {
            this.playByName("jumping");
        }
    }

    // 离地时触发 jumpLoop（三段模式专用）
    onBecomeAirborne() {
        if (!this.hasThreePartJump) return;
        const s = this.state;
        const a = this.actions;
        // 如果当前已经在跳跃动画中，则不打断
        if (s === a?.get("jumpStart") || s === a?.get("jumpLoop") || s === a?.get("jumpEnd")) return;
        this.playByName("jumpLoop");
    }

    // 落地时触发 jumpEnd（三段模式专用）
    onLand() {
        if (!this.hasThreePartJump) return;
        const s = this.state;
        const a = this.actions;
        // 只有在起跳或跳跃循环中才触发落地
        if (s === a?.get("jumpStart") || s === a?.get("jumpLoop")) {
            this.playByName("jumpEnd");
        }
    }

    // 是否处于任意跳跃动画中（用于防止在跳跃动画播放时重复起跳）
    isJumping(): boolean {
        const s = this.state;
        const a = this.actions;
        if (!a) return false;
        return s === a.get("jumping") || s === a.get("jumpStart") ||
            s === a.get("jumpLoop") || s === a.get("jumpEnd");
    }

    // 获取当前动画名
    getCurrentName(): string | null {
        return this.state?.getClip()?.name ?? null;
    }

    // 更新所有混合器
    updateMixers(delta: number) {
        this.mixer?.update(delta);
        for (const v of this.ctrl.vehicle.list) v.vehicleMixer?.update(delta);
    }

    // 按键状态触发动画
    setAnimationByPressed() {
        // 检查并处理覆盖动画中断逻辑
        if (this.isOverrideAnimationPlaying) {
            const currentInput = this.ctrl.input as Record<string, any>;
            const snapshot = this.overrideInputSnapshot;
            let inputChanged = false;

            if (snapshot) {
                // 遍历快照中的所有键，与当前输入状态进行比较
                for (const key in snapshot) {
                    if (snapshot[key] !== currentInput[key]) {
                        inputChanged = true;
                        break; // 不匹配，中断
                    }
                }
            }

            // 如果输入状态发生变化，则解除动画锁，并继续执行后续的移动动画逻辑
            if (inputChanged) {
                this.isOverrideAnimationPlaying = false;
                this.overrideInputSnapshot = null;
            } else {
                // 如果输入状态未变，则保持覆盖动画，不执行移动动画
                return;
            }
        }

        // 恢复相机距离
        this.ctrl.cam.maxDist = this.ctrl.cam.originMaxDist;

        const v = this.ctrl.vehicle;
        // 上下车流程中：有移动键输入才允许打断，否则不干预
        if (v.isMovingToBoarding || v.isBoardingAnim || v.isExitAnim) {
            const { fwd, bkd, lft, rgt } = this.ctrl.input;
            if (!fwd && !bkd && !lft && !rgt) return;
        }

        // 取消上下车过程
        v.cancelBoarding();
        if (v.isExitAnim) { v.isExitAnim = false; v.exitDoorClosed = false; }
        if (v.isBoardingAnim) { v.isBoardingAnim = false; v.doorClosed = false; }
        if (v.doorTimer) { clearTimeout(v.doorTimer); v.doorTimer = null; }

        const { fwd, bkd, lft, rgt, shift, space } = this.ctrl.input;

        // 飞行状态下的动画逻辑
        if (this.ctrl.isFlying) {
            if (fwd) {
                if (shift) {
                    this.playByName("flying");
                    // 加速飞行时，拉远相机
                    if (!this.ctrl.cam.enableSpringCamera) this.ctrl.cam.maxDist = this.ctrl.cam.originMaxDist * 2;
                } else {
                    this.playByName("flyHoverForward");
                }
                return;
            }
            if (bkd) { this.playByName("flyHoverBack"); return; }
            if (lft) { this.playByName("flyHoverLeft"); return; }
            if (rgt) { this.playByName("flyHoverRight"); return; }
            if (space) { this.playByName("flyHoverUp"); return; }
            // 无任何操作时，播放悬停动画
            this.playByName("flyidle");
            return;
        }

        // 地面状态下的动画逻辑
        if (this.ctrl.playerIsOnGround) {
            // 如果是三段跳的落地动画，则等待其播放完毕
            if (this.hasThreePartJump && this.state === this.actions?.get("jumpEnd")) return;
            // 无方向键输入，播放站立动画
            if (!fwd && !bkd && !lft && !rgt) { this.playByName("idle"); return; }
            // 向前走或跑
            if (fwd) { this.playByName(shift ? "running" : "walking"); return; }
            // 第三人称下，左、右、后退也播放走/跑动画（模型会自动转向）
            if (!this.ctrl.isFirstPerson && (lft || rgt || bkd)) {
                this.playByName(shift ? "running" : "walking"); return;
            }
            // 第一人称下的平移和后退
            if (lft) { this.playByName("left_walking"); return; }
            if (rgt) { this.playByName("right_walking"); return; }
            if (bkd) { this.playByName("walking_backward"); return; }
        }
    }
}