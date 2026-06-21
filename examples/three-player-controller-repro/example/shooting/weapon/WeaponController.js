import { AnimationMixer, LoopOnce, Object3D, Quaternion, Vector3 } from "three";

export const MODE = Object.freeze({ NORMAL: "normal", PRIMARY: "primary" });

const _muzzleWorldPos = new Vector3(); // 枪口世界坐标

export class WeaponController {
    constructor({ scene, camera, localPlayer, decalSystem, effects, hud, zombieManager }) {
        // ==================== 场景引用 ====================
        this._scene = scene;
        this._camera = camera;
        this._player = localPlayer;
        this._decalSystem = decalSystem;
        this._effects = effects;
        this._hud = hud;
        this._zombieManager = zombieManager;

        // ==================== 武器配置 ====================
        this._gunScale = 0.1; // 枪模型缩放
        this._gunPos = [1, 26.5, 2]; // 枪挂载到右手骨骼的位置偏移
        this._gunBarrelDir = new Vector3(0, 0, -1); // 枪管沿模型局部 -Z
        this._gunTargetDir = new Vector3(0, 1, 0); // 手骨 +Y = 手指方向
        this._gunRoll = Math.PI / 2;
        this._gunMuzzleOffset = [0, 80, -480]; // 枪口偏移 [左, 上, 前]

        // ==================== 武器模型 ====================
        this._weaponModel = null; // 枪模型根节点
        this._muzzlePoint = null; // 枪口标记点（供特效定位）
        this._weaponMixer = null; // 武器动画混合器
        this._weaponReloadAction = null; // 换弹动画
        this._weaponShootAction = null; // 射击动画
        this._shotSound = null; // 射击音效
        this._shakeIntensity = 0; // 当前镜头抖动强度
        this._shakeDecay = 10; // 抖动衰减系数

        // ==================== 模式 & 武器槽 ====================
        this._currentMode = MODE.NORMAL;
        this._weaponSlots = [
            { key: "1", mode: MODE.PRIMARY, label: "Rifle" },
            { key: "4", mode: MODE.NORMAL, label: "Fists" },
        ];

        // ==================== 相机距离限制 ====================
        this._normalMaxCam = 220; // 徒手模式最远距离
        this._armedMaxCam = 100; // 瞄准模式最远距离

        // ==================== 移速配置 ====================
        this._baseSpeed = 300;
        this._armedSpeed = 240; // 持枪移速 = baseSpeed * 0.8

        // ==================== 开火状态机 ====================
        this._isAiming = false; // 是否瞄准中（RMB 触发，含视角缩放）
        this._isSoftAiming = false; // 是否软瞄准中（单击开火触发，不缩放视角）
        this._isFiring = false; // 是否连射中
        this._isTriggerDown = false; // 鼠标左键是否按住
        this._isReloading = false; // 是否换弹中
        this._magSize = 30; // 弹夹容量
        this._currentAmmo = 30; // 当前子弹数
        this._totalAmmo = 300; // 总备用弹药量
        this._firstShotTimer = null; // 180ms 后必出一枪的计时器
        this._holdAimTimer = null; // 停火后 2s 才放枪的计时器
        this._lastFireTime = 0;
        this._elapsed = 0; // 由 update() 每帧更新，供 setTimeout 回调读取

        this._reloadTimer1 = null; // 换弹半程计时器
        this._reloadTimer2 = null; // 换弹完成计时器
        this._RELOAD_DURATION_MS = 2000; // 换弹动画时长，需根据实际模型动画调整
        this._FIRE_RATE_S = 0.1; // 连射间隔（秒）
        this._FIRE_ANIM_FADE_MS = 180; // 与 playAnimation 默认 fade(0.18s) 对齐
        this._HOLD_AIM_DURATION = 2000; // 停火后保持瞄准状态时长（ms）

        // ==================== 射线命中缓存 ====================
        this._frameHit = null; // 每帧射线命中结果

        // ==================== 多人扩展 ====================
        this.onHitPlayer = null; // (playerId, damage) => void，由外部注入
    }

    // ==================== 初始化 ====================

    // 加载武器模型并挂载到右手骨骼
    async load(gltfLoader, baseUrl) {
        const gltf = await gltfLoader.loadAsync(baseUrl + "./glb/ak47.glb");
        this._weaponModel = gltf.scene;

        const person = this._player.getPlayerModel();
        const rightHand = person?.getObjectByName("mixamorigRightHand");
        if (!rightHand) {
            console.warn("[WeaponController] 未找到右手骨骼 mixamorigRightHand");
            return;
        }

        this._weaponModel.scale.setScalar(this._gunScale);
        this._weaponModel.position.set(...this._gunPos);

        this._magazineBone = null;
        this._weaponModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.frustumCulled = false;
            }
        });

        // 找到备用弹夹骨骼，初始缩为 0 隐藏
        this._magazineBone = this._weaponModel.getObjectByName("Bone002_01");
        if (this._magazineBone) this._magazineBone.scale.setScalar(0.0001);

        // 对齐枪管方向并附加滚转
        const alignQ = new Quaternion().setFromUnitVectors(this._gunBarrelDir, this._gunTargetDir);
        const rollQ = new Quaternion().setFromAxisAngle(this._gunTargetDir, this._gunRoll);
        this._weaponModel.quaternion.copy(rollQ.multiply(alignQ));

        this._weaponModel.visible = false;
        rightHand.add(this._weaponModel);

        // 枪口标记点（供特效定位）
        this._muzzlePoint = new Object3D();
        this._muzzlePoint.position.set(...this._gunMuzzleOffset);
        this._weaponModel.add(this._muzzlePoint);

        // 初始化武器动画
        this._weaponMixer = new AnimationMixer(this._weaponModel);
        const reloadClip = gltf.animations.find(a => a.name === "Armature.003|reload");
        if (reloadClip) {
            this._weaponReloadAction = this._weaponMixer.clipAction(reloadClip);
            this._weaponReloadAction.setLoop(LoopOnce);
            // 关键修改：取消锁定在最后一帧。
            // 这样动画结束后，骨骼会自动通过 Mixer 的权重回归到 Bind Pose（初始插在枪上的位置）。
            this._weaponReloadAction.clampWhenFinished = false;
            this._weaponReloadAction.timeScale = 1.3;
        }

    }

    // 注册所有射击相关动画集
    setupAnimations() {
        this._player.registerLocomotionSet("primary", {
            idle: "rifle_idle",
            walking: "rifle_walk",
            running: "rifle_run",
            jumping: "rifle_jump",
        });
        this._player.registerLocomotionSet("primary_aim", {
            idle: "rifle_idle_aim3",
            walking: "rifle_walk",
            running: "rifle_run",
            jumping: "rifle_jump",
        });

        // 上半身专用动画：仅覆写脊椎以上骨骼，下半身继续播放移动动画
        this._player.registerUpperAnimation("upper_shoot", "rifle_shoot3", { loop: true, timeScale: 0.5 });
        this._player.registerUpperAnimation("upper_reload", "reload", { loop: false, timeScale: 1.5 });
        this._player.registerUpperAnimation("upper_aim", "rifle_idle_aim3", { loop: true, timeScale: 0.5 });

        this._player.initIdleHipsQ("rifle_idle_aim3");
    }

    // 绑定键鼠输入
    bindInput() {
        document.addEventListener("mousedown", (e) => {
            if (!this._canRunCombatLogic()) return;
            if (e.button === 2 && !this._player.getIsFirstPerson()) {
                this.enterAim();
            }
            if (e.button === 0) {
                if (!this._firstShotTimer && !this._isFiring) this._triggerShootAnim();
                this._startFiring();
            }
        });

        document.addEventListener("mouseup", (e) => {
            if (e.button === 2 && !this._player.getIsFirstPerson()) this.exitAim();
            if (e.button === 0) this._stopFiring();
        });

        document.addEventListener("keydown", (e) => {
            const k = e.key.toLowerCase();
            if (k === "1") this.switchMode(MODE.PRIMARY);
            if (k === "4") this.switchMode(MODE.NORMAL);
            if (k === "q") this.switchMode(this._currentMode === MODE.PRIMARY ? MODE.NORMAL : MODE.PRIMARY);
            if (k === "r") this.reload();
        });

        document.addEventListener("wheel", (e) => {
            if (this._isReloading) return;
            const idx = this._weaponSlots.findIndex((s) => s.mode === this._currentMode);
            const next = (idx + (e.deltaY > 0 ? 1 : -1) + this._weaponSlots.length) % this._weaponSlots.length;
            this.switchMode(this._weaponSlots[next].mode);
        }, { passive: true });
    }

    // ==================== 主循环 ====================

    // 每帧由 shooting.js 主循环调用
    update(elapsed, dt) {
        this._elapsed = elapsed;
        const canRunCombatLogic = this._canRunCombatLogic();

        // 飞行时强制取消换弹
        if (this._currentMode === MODE.PRIMARY && this._isReloading && this._player.getIsFlying()) {
            this._cancelReload();
        }
        // 飞行/跳跃等不可战斗状态时强制中断武器逻辑（换弹中不打断，由换弹自己管）
        if (this._currentMode === MODE.PRIMARY && !canRunCombatLogic && !this._isReloading) {
            this._forceStopCombatLogic();
        }

        // 第一人称：静止时自动进入瞄准，移动时退出
        if (this._currentMode === MODE.PRIMARY && this._player.getIsFirstPerson()) {
            if (canRunCombatLogic && !this._isAiming) this.enterAim();
            else if (!canRunCombatLogic && this._isAiming) this.exitAim();
        }

        // 更新粒子特效
        this._effects?.update(dt);

        // 更新武器动画混合器
        if (this._weaponMixer) this._weaponMixer.update(dt);

        // 非换弹时每帧强制隐藏备用弹夹骨骼（mixer 更新后覆写）
        if (this._magazineBone && !this._isReloading) this._magazineBone.scale.setScalar(0.0001);

        // 镜头抖动（指数衰减）
        if (this._shakeIntensity > 0.0001) {
            this._camera.rotation.x += (Math.random() - 0.5) * this._shakeIntensity;
            this._camera.rotation.y += (Math.random() - 0.5) * this._shakeIntensity * 0.4;
            this._shakeIntensity *= Math.exp(-this._shakeDecay * dt);
        } else {
            this._shakeIntensity = 0;
        }

        // 更新射线命中缓存
        this._frameHit = this._player.getCenterScreenRaycastHit();

        // 连射节拍
        if (canRunCombatLogic && this._isFiring && elapsed - this._lastFireTime >= this._FIRE_RATE_S) {
            if (this._currentAmmo <= 0) {
                this._stopFiring();
                // 只有总弹药大于0时才触发自动换弹
                if (this._totalAmmo > 0) this.reload();
            } else {
                this._lastFireTime = elapsed;
                this._fireOnce();
            }
        }
    }

    // ==================== 状态查询 ====================

    // 是否处于任意武器激活状态（等待首发 / 连射 / hold-aim 冷却 / 瞄准）
    // SpineIK 和主循环通过此方法判断是否需要驱动 IK
    isGunEngaged() {
        return (
            this._isAiming ||
            this._isSoftAiming ||
            this._isFiring ||
            this._isReloading ||
            this._firstShotTimer !== null ||
            this._holdAimTimer !== null
        );
    }

    getMode() { return this._currentMode; }

    resetAmmo() {
        this._currentAmmo = this._magSize;
        this._totalAmmo = 300;
        this._hud.updateAmmo?.(this._currentAmmo, this._totalAmmo);
    }

    _canRunCombatLogic() {
        if (this._currentMode !== MODE.PRIMARY) return false;
        if (this._isReloading) return false;
        if (this._player.getIsFlying()) return false;
        if (typeof this._player.isCombatLocomotionAllowed === "function") {
            return this._player.isCombatLocomotionAllowed();
        }
        return true;
    }

    _forceStopCombatLogic() {
        this._isTriggerDown = false;
        if (this._firstShotTimer) {
            clearTimeout(this._firstShotTimer);
            this._firstShotTimer = null;
        }
        this._isFiring = false;
        if (this._weaponShootAction) this._weaponShootAction.stop();
        this._player.stopUpperBody(0.18);
        this._cancelHoldAimTimer();
        if (this._isAiming) this.exitAim();
        else {
            this._isSoftAiming = false;
            this._hud.hideCrosshair();
        }
    }

    // ==================== 模式切换 & 瞄准 ====================

    switchMode(newMode) {
        if (this._currentMode === newMode || this._isReloading) return;

        // 退出旧模式
        if (this._currentMode === MODE.PRIMARY) {
            this.exitAim();
            this._isSoftAiming = false;
            this._isTriggerDown = false;
            this._isFiring = false;
            if (this._weaponShootAction) this._weaponShootAction.stop();
            this._player.stopUpperBody(0.18);
            if (this._firstShotTimer) { clearTimeout(this._firstShotTimer); this._firstShotTimer = null; }
            this._cancelHoldAimTimer();
            this._hud.hideCrosshair();
            this._hud.hideAmmo?.();
            this._player.switchLocomotionSet("default");
            this._player.setMaxCamDistance(this._normalMaxCam);
            this._player.setPlayerSpeed(this._baseSpeed);
        }

        this._currentMode = newMode;

        // 进入新模式
        if (this._currentMode === MODE.PRIMARY) {
            this._player.switchLocomotionSet("primary");
            this._player.setPlayerSpeed(this._armedSpeed);
            this._hud.updateAmmo?.(this._currentAmmo, this._totalAmmo);
            this._hud.showAmmo?.();
        }

        if (this._weaponModel) this._weaponModel.visible = (this._currentMode === MODE.PRIMARY);
    }

    // 进入瞄准模式；soft=true 时为软瞄准，跳过视角缩放
    enterAim(soft = false) {
        if (soft) {
            if (this._isSoftAiming) return;
            this._isSoftAiming = true;
        } else {
            if (!this._canRunCombatLogic() || this._isAiming) return;
            this._isAiming = true;
            this._isSoftAiming = false;
            this._player.setMaxCamDistance(this._armedMaxCam);
        }
        this._player.switchLocomotionSet("primary_aim");
        this._hud.showCrosshair();
        this._player.playUpperBody("upper_aim", { fade: 0.18 });
        if (this._player.getIsFirstPerson()) {
            this._camera.rotation.x = this._player.getFirstPersonPitchOffset();
        }
    }

    // 退出瞄准模式；soft=true 时为软瞄准，跳过视角还原
    exitAim(soft = false) {
        if (soft) {
            if (!this._isSoftAiming) return;
            this._isSoftAiming = false;
        } else {
            if (!this._isAiming) return;
            this._isAiming = false;
            this._player.setMaxCamDistance(this._normalMaxCam);
            this._cancelHoldAimTimer();
        }
        this._player.switchLocomotionSet(
            this._currentMode === MODE.PRIMARY ? "primary" : "default"
        );
        this._player.stopUpperBody(0.18);
        this._hud.hideCrosshair();
        if (this._player.getIsFirstPerson()) {
            this._camera.rotation.x = this._player.pitchTarget1P;
        }
    }

    // 换弹
    reload() {
        if (this._currentMode !== MODE.PRIMARY || this._isReloading || this._totalAmmo <= 0 || this._currentAmmo === this._magSize) return;
        if (this._player.getIsFlying()) return;

        this._isReloading = true;

        // 1. 中断当前所有攻击状态
        this._isTriggerDown = false;
        this._isFiring = false;
        if (this._weaponShootAction) this._weaponShootAction.stop();
        if (this._firstShotTimer) { clearTimeout(this._firstShotTimer); this._firstShotTimer = null; }
        this._cancelHoldAimTimer();
        this.exitAim(); // 换弹时强制退出瞄准

        // 2. 播放换弹动画（仅上半身，下半身继续播放移动动画）
        this._player.playUpperBody("upper_reload", { force: true, fade: 0.18 });

        // 换弹音效
        this._effects?.triggerReloadSound();

        // 显示备用弹夹骨骼
        if (this._magazineBone) this._magazineBone.scale.setScalar(1);

        // 播放武器自身的换弹动画
        if (this._weaponReloadAction) {
            this._weaponReloadAction.reset();
            this._weaponReloadAction.play();
        }

        // 动画播放到一半时停止，同时隐藏备用弹夹骨骼（避免 snap-back 到悬空位置时可见）
        this._reloadTimer1 = setTimeout(() => {
            this._reloadTimer1 = null;
            if (this._isReloading && this._weaponReloadAction) {
                this._weaponReloadAction.stop();
            }
            if (this._magazineBone) this._magazineBone.scale.setScalar(0.0001);
        }, this._RELOAD_DURATION_MS / 2);

        // 3. 锁定状态直到动画结束
        this._reloadTimer2 = setTimeout(() => {
            this._reloadTimer2 = null;
            // 此时 _isReloading 变回 false，允许开火
            this._isReloading = false;

            // 停止上半身换弹动画，让全身 locomotion 动画重新完整接管上半身
            this._player.stopUpperBody(0.18);

            // 确保动画彻底停止（以防上面的一半时间停止没触发成功）
            if (this._weaponReloadAction) this._weaponReloadAction.stop();

            // 计算需要补充的子弹数量
            const need = this._magSize - this._currentAmmo;
            const transfer = Math.min(need, this._totalAmmo);
            this._currentAmmo += transfer;
            this._totalAmmo -= transfer;
            this._hud.updateAmmo?.(this._currentAmmo, this._totalAmmo);

            // 换弹结束后，衔接回持枪状态
            if (this._currentMode === MODE.PRIMARY) {
                this._player.switchLocomotionSet("primary_aim");
                if (this._isAiming || this._isSoftAiming || !this._player.isMoving) {
                    this._player.playUpperBody("upper_aim", { fade: 0.18 });
                    this._scheduleHoldAim();
                } else {
                    this._player.stopUpperBody(0.18);
                }
            }
        }, this._RELOAD_DURATION_MS);
    }

    // ==================== 开火状态机 ====================

    _startFiring() {
        if (!this._canRunCombatLogic()) return;
        if (this._firstShotTimer || this._isFiring) return;

        // 没子弹时按左键，直接触发换弹
        if (this._currentAmmo <= 0) {
            if (this._totalAmmo > 0) this.reload();
            return;
        }

        // 切换到软瞄准状态
        if (!this._isAiming && !this._isSoftAiming) {
            this.enterAim(true);
        }

        this._cancelHoldAimTimer();
        this._isTriggerDown = true;

        // 无论鼠标是否松开，180ms 后必定打出第一枪
        this._firstShotTimer = setTimeout(() => {
            this._firstShotTimer = null;
            if (!this._canRunCombatLogic()) {
                this._forceStopCombatLogic();
                return;
            }
            this._fireOnce();
            this._lastFireTime = this._elapsed;

            if (this._isTriggerDown) {
                this._isFiring = true; // 持续按住 → 连射
            } else {
                // 单击松开：打出第一枪后处理后续状态
                if (this._weaponShootAction) this._weaponShootAction.stop();
                if (this._isAiming || this._isSoftAiming || !this._player.isMoving) {
                    this._scheduleHoldAim();
                } else {
                    this._player.stopUpperBody(0.18);
                }
            }
        }, this._FIRE_ANIM_FADE_MS);
    }

    _stopFiring() {
        this._isTriggerDown = false;
        if (this._weaponShootAction) this._weaponShootAction.stop();

        if (!this._isFiring) {
            // 换弹中或 hold-aim 缓冲期内松开鼠标，不打断上半身动画
            if (this._isReloading || this._holdAimTimer) return;

            // 单发（鼠标在 180ms 定时器触发前就松开）：恢复或停止上半身
            if (this._isAiming || this._isSoftAiming) {
                this._player.playUpperBody("upper_aim", { fade: 0.18 });
            } else {
                this._player.stopUpperBody(0.18);
            }
            return;
        }

        this._isFiring = false;
        if (this._isAiming || this._isSoftAiming || !this._player.isMoving) {
            this._player.playUpperBody("upper_aim", { fade: 0.18 });
            this._scheduleHoldAim();
        } else {
            this._player.stopUpperBody(0.18);
        }
    }

    _fireOnce() {
        if (!this._canRunCombatLogic()) return;

        // 播放音效
        if (this._shotSound && this._shotSound.buffer) {
            if (this._shotSound.isPlaying) this._shotSound.stop();
            this._shotSound.play();
        }

        // 第三人称触发镜头抖动
        if (!this._player.getIsFirstPerson()) {
            this._shakeIntensity = 0.01; // 弧度单位，0.02 约为 1.1 度
        }

        this._currentAmmo--;
        this._hud.updateAmmo?.(this._currentAmmo, this._totalAmmo);

        // 枪口火焰 + 音效：无论命中什么都必须先触发
        if (this._effects && this._muzzlePoint) {
            this._muzzlePoint.updateWorldMatrix(true, false);
            this._muzzlePoint.getWorldPosition(_muzzleWorldPos);
            this._effects.triggerMuzzleFlash(_muzzleWorldPos, this._camera);
        }

        // 多人模式：检测是否命中远程玩家（dmgMult 由命中部位决定：头×2，躯干×1，四肢×0.75）
        const hitPlayerId = this._frameHit?.object?.userData?.playerId;
        if (hitPlayerId && this.onHitPlayer) {
            const dmgMult = this._frameHit.object.userData.dmgMult ?? 1.0;
            this.onHitPlayer(hitPlayerId, Math.round(30 * dmgMult));
            this._hud.flashHit();
            return;
        }

        const zombieId = this._frameHit?.object?.userData?.zombieId;
        if (zombieId && this._zombieManager) {
            this._zombieManager.onHit(zombieId, 30);
            this._hud.flashHit();
        } else {
            this._decalSystem.spawn(this._frameHit, this._effects);
        }
    }

    _triggerShootAnim() {
        if (!this._canRunCombatLogic()) return;
        // 上半身播放开火动画，下半身继续播放当前移动动画
        this._player.playUpperBody("upper_shoot", { force: true, fade: 0.18 });
        if (this._weaponShootAction) this._weaponShootAction.play();
    }

    // 停火后延迟 2s 自动退出瞄准姿态
    _scheduleHoldAim() {
        this._cancelHoldAimTimer();
        this._holdAimTimer = setTimeout(() => {
            this._holdAimTimer = null;
            if (!this._isAiming) {
                this.exitAim(true);
            }
        }, this._HOLD_AIM_DURATION);
    }

    _cancelReload() {
        if (!this._isReloading) return;
        this._isReloading = false;
        if (this._reloadTimer1) { clearTimeout(this._reloadTimer1); this._reloadTimer1 = null; }
        if (this._reloadTimer2) { clearTimeout(this._reloadTimer2); this._reloadTimer2 = null; }
        if (this._weaponReloadAction) this._weaponReloadAction.stop();
        if (this._magazineBone) this._magazineBone.scale.setScalar(0.0001);
        this._effects?.stopReloadSound();
        this._player.stopUpperBody(0.18);
        this._hud.hideCrosshair();
    }

    _cancelHoldAimTimer() {
        if (this._holdAimTimer) { clearTimeout(this._holdAimTimer); this._holdAimTimer = null; }
    }
}
