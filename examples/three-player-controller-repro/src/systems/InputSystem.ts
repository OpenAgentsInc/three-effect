import type { playerController } from "../playerController";
import type { KeyAction, KeyMap } from "../types";

// 默认键位表（动作 -> KeyboardEvent.code 列表）
const defaultKeyMap: Record<KeyAction, string[]> = {
    forward: ["KeyW", "ArrowUp"],
    backward: ["KeyS", "ArrowDown"],
    left: ["KeyA", "ArrowLeft"],
    right: ["KeyD", "ArrowRight"],
    sprint: ["ShiftLeft", "ShiftRight"],
    jump: ["Space"],
    toggleView: ["KeyV"],
    toggleFly: ["KeyF"],
    toggleVehicle: ["KeyE"],
};

export class InputSystem {
    private ctrl: playerController; // 主控制器引用

    fwd = false; // 前进键
    bkd = false; // 后退键
    lft = false; // 左移键
    rgt = false; // 右移键
    space = false; // 跳跃键
    shift = false; // 加速键

    private boundKeydown = async (e: KeyboardEvent) => this.onKeydown(e); // 键盘按下绑定
    private boundKeyup = (e: KeyboardEvent) => this.onKeyup(e); // 键盘抬起绑定
    private boundMouseMove = (e: MouseEvent) => this.onMouseMove(e); // 鼠标移动绑定
    private boundMouseClick = (e: MouseEvent) => {
        if (e.target === this.ctrl.controls.domElement) this.ctrl.cam.setPointerLock(); // 鼠标点击绑定
    };
    private boundBlur = () => this.resetKeys(); // 页面失焦时重置按键状态

    private codeToAction = new Map<string, KeyAction>(); // 键码 -> 动作 反查表

    constructor(ctrl: playerController) {
        this.ctrl = ctrl;
        this.buildKeyMap();
    }

    // 构建键码：动作 反查表：未传的动作用默认键，传 string/数组则覆盖，传 null 则禁用
    buildKeyMap(userMap?: KeyMap) {
        this.codeToAction.clear();  // 清空旧表
        for (const action of Object.keys(defaultKeyMap) as KeyAction[]) {
            let codes: string[];
            if (userMap && action in userMap) {
                const v = userMap[action];
                if (v == null) continue; // null：禁用该动作
                codes = Array.isArray(v) ? v : [v]; // 覆盖默认键
            } else {
                codes = defaultKeyMap[action];  // 未传：用默认键
            }
            for (const code of codes) this.codeToAction.set(code, action);
        }
    }

    // 程序化输入接口
    setInput(input: Partial<{
        moveX: 1 | 0 | -1; moveY: 1 | 0 | -1;
        lookDeltaX: number; lookDeltaY: number;
        jump: boolean; shift: boolean;
        toggleView: boolean; toggleFly: boolean; toggleVehicle: boolean;
    }>) {
        const c = this.ctrl;

        // 移动方向
        if (typeof input.moveX === "number") { this.applyAction("left", input.moveX === -1); this.applyAction("right", input.moveX === 1); }
        if (typeof input.moveY === "number") { this.applyAction("forward", input.moveY === 1); this.applyAction("backward", input.moveY === -1); }

        // 视角朝向
        if (typeof input.lookDeltaX === "number" && typeof input.lookDeltaY === "number") {
            c.cam.setToward(input.lookDeltaX, input.lookDeltaY, 0.002);
        }

        // 持续状态
        if (typeof input.jump === "boolean") this.applyAction("jump", input.jump);
        if (typeof input.shift === "boolean") this.applyAction("sprint", input.shift);

        // 触发式切换
        if (input.toggleView) this.applyAction("toggleView", true);
        if (input.toggleFly) this.applyAction("toggleFly", true);
        if (input.toggleVehicle) this.applyAction("toggleVehicle", true);
    }

    // 绑定输入事件
    bindEvents() {
        this.ctrl.isupdate = true;
        this.ctrl.cam.setPointerLock();
        window.addEventListener("keydown", this.boundKeydown);
        window.addEventListener("keyup", this.boundKeyup);
        window.addEventListener("mousemove", this.boundMouseMove);
        window.addEventListener("click", this.boundMouseClick);
        window.addEventListener("blur", this.boundBlur);
    }

    // 解绑输入事件
    unbindEvents() {
        this.ctrl.isupdate = false;
        document.exitPointerLock();
        window.removeEventListener("keydown", this.boundKeydown);
        window.removeEventListener("keyup", this.boundKeyup);
        window.removeEventListener("mousemove", this.boundMouseMove);
        window.removeEventListener("click", this.boundMouseClick);
        window.removeEventListener("blur", this.boundBlur);
    }

    // 重置所有按键状态
    private resetKeys() {
        const c = this.ctrl;
        this.fwd = false;
        this.bkd = false;
        this.lft = false;
        this.rgt = false;
        this.space = false;
        this.shift = false;
        c.controls.mouseButtons = { LEFT: 0, MIDDLE: 1, RIGHT: 2 };
        c.animation.setAnimationByPressed();
    }

    // 统一动作派发
    private applyAction(action: KeyAction, pressed: boolean) {
        const c = this.ctrl;
        switch (action) {
            // 前进
            case "forward": this.fwd = pressed; c.animation.setAnimationByPressed(); break;
            // 后退
            case "backward": this.bkd = pressed; c.animation.setAnimationByPressed(); break;
            // 左移
            case "left": this.lft = pressed; c.animation.setAnimationByPressed(); break;
            // 右移
            case "right": this.rgt = pressed; c.animation.setAnimationByPressed(); break;
            // 冲刺
            case "sprint":
                this.shift = pressed;
                c.animation.setAnimationByPressed();
                // 切换轨道拖拽键位
                c.controls.mouseButtons = pressed
                    ? { LEFT: 2, MIDDLE: 1, RIGHT: 0 }
                    : { LEFT: 0, MIDDLE: 1, RIGHT: 2 };
                break;
            // 跳跃
            case "jump":
                if (pressed) {
                    c.vehicle.cancelBoarding(); // 取消载具模式下的下车
                    this.space = true;
                    if (c.controllerMode === 1) return; // 载具模式不跳跃
                    if (c.isFlying) { c.animation.setAnimationByPressed(); return; } // 飞行中仅切动画
                    if (!c.playerIsOnGround) return; // 不在地面不能跳
                    if (c.animation.isJumping()) return;  // 跳跃中不重复触发
                    c.animation.startJump();
                    c.playerVelocity.y = c.jumpHeight;
                    c.setOnGround(false); // 跳跃后设置为不在地面
                } else {
                    this.space = false;
                    if (c.isFlying) c.animation.setAnimationByPressed();
                }
                break;
            // 切换第一 / 第三人称视角
            case "toggleView":
                if (pressed) c.cam.changeView();
                break;
            // 切换飞行模式
            case "toggleFly":
                if (pressed && c.controllerMode === 0) {
                    c.isFlying = !c.isFlying;
                    if (c.isFlying) c.playerVelocity.set(0, 0, 0);
                    c.animation.setAnimationByPressed();
                    if (!c.isFlying && !c.playerIsOnGround) c.animation.startJump(true); 
                }
                break;
            // 上 / 下车
            case "toggleVehicle":
                if (pressed) {
                    if (c.isFlying) return;
                    if (c.controllerMode === 0) c.vehicle.enter(); else c.vehicle.exit();
                }
                break;
        }
    }

    // 键盘按下处理
    private onKeydown(e: KeyboardEvent) {
        const action = this.codeToAction.get(e.code);
        if (action) this.applyAction(action, true);
    }

    // 键盘抬起处理
    private onKeyup(e: KeyboardEvent) {
        const action = this.codeToAction.get(e.code);
        if (action) this.applyAction(action, false);
    }

    // 鼠标移动处理
    private onMouseMove(e: MouseEvent) {
        if (document.pointerLockElement === document.body) {
            this.ctrl.cam.setToward(e.movementX, e.movementY, 0.0001);
        }
    }
}
