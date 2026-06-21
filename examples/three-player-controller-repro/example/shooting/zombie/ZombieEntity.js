import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export class ZombieEntity {
    constructor(scene, id) {
        // ==================== 场景引用 ====================
        this._scene = scene;
        this.id = id; // 唯一标识

        // ==================== 场景对象 ====================
        this._collider = null; // 静态碰撞体
        this._model = null; // 模型根节点
        this._capsule = null; // 碰撞胶囊体
        this._capsuleInfo = null; // 胶囊描述（radius + segment）
        this._mixer = null; // 动画混合器

        // ==================== 动画动作 ====================
        this._walkAction = null; // 行走
        this._runAction = null; // 奔跑
        this._idleAction = null; // 待机
        this._punchAction = null; // 攻击
        this._deathAction = null; // 死亡
        this._currentAction = null; // 当前播放动作
        this._punchLoopCb = null; // 攻击循环回调（用于 removeEventListener）

        // ==================== 生命状态 ====================
        this.hp = 100; // 血量
        this.isDead = false; // 是否已死亡
        this._deathTime = 0; // 死亡后累计时间（用于定时清除）
        this._isRunning = Math.random() > 0.5; // 随机决定是否为跑者
        this._state = "idle"; // 当前行为状态
        this._isPunching = false; // 是否正在攻击
        this._inAttackRange = false; // 是否在攻击范围内

        // ==================== 物理参数 ====================
        this._gravity = -2.4; // 重力加速度（load 时按 scale 重算）
        this._speed = 0.12; // 移速（load 时按 scale 重算）
        this._modelScale = 0.001; // 模型缩放
        this._capsuleHeight = 180; // 胶囊高度（模型空间，load 时重算）
        this._capsuleRadius = 45; // 胶囊半径（模型空间，load 时重算）
        this._velocity = new THREE.Vector3(); // 当前速度（主要用于重力累积）
        this._onGround = false; // 是否落地

        // ==================== 复用向量 ====================
        this._tempBox = new THREE.Box3();
        this._tempMat = new THREE.Matrix4();
        this._tempSeg = new THREE.Line3();
        this._tempV1 = new THREE.Vector3();
        this._tempV2 = new THREE.Vector3();
        this._moveDir = new THREE.Vector3(); // 水平移动方向（单位向量）
        this._lookTarget = new THREE.Vector3(); // 朝向目标（lookAt 复用）
        this._raycaster = new THREE.Raycaster(
            new THREE.Vector3(),
            new THREE.Vector3(0, -1, 0),
        );
        this._raycaster.firstHitOnly = true; // 只取最近地面交点
    }

    // 加载模型、绑定动画、构建胶囊体，挂入场景
    async load(gltfLoader, {
        modelUrl,
        collider,
        position,
        scale = 0.001,
        walkAnim,
        runAnim,
        idleAnim,
        punchAnim,
        deathAnim,
        rotateY = Math.PI,
        speed = 120,
    }) {
        this._collider = collider;
        this._modelScale = scale;
        this._gravity = -2400 * scale;
        // 基础移速增加随机扰动 (±15%)，使丧尸步频与步幅产生差异
        this._speed = speed * scale * (0.85 + Math.random() * 0.3);

        const gltf = await gltfLoader.loadAsync(modelUrl);
        this._model = gltf.scene;

        this._mixer = new THREE.AnimationMixer(this._model);
        const clips = gltf.animations ?? [];

        // 按名称或模糊匹配查找动画片段
        const findClip = (hint) => {
            if (!hint) return null;
            return (
                clips.find((clip) => clip.name === hint) ??
                clips.find((clip) => clip.name.toLowerCase().includes(hint.toLowerCase())) ??
                null
            );
        };

        const walkClip = findClip(walkAnim) ?? findClip("walk") ?? clips[0] ?? null;
        const runClip = findClip(runAnim) ?? findClip("run") ?? clips[0] ?? null;
        const idleClip = findClip(idleAnim) ?? findClip("idle") ?? clips[0] ?? null;
        const punchClip = findClip(punchAnim) ?? findClip("punch") ?? null;
        const deathClip = findClip(deathAnim) ?? findClip("dying") ?? findClip("death") ?? findClip("die") ?? null;

        // 创建循环动作并初始权重为 0（由 _playAnim 按需激活）
        const makeAction = (clip) => {
            if (!clip) return null;
            const action = this._mixer.clipAction(clip);
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.setEffectiveWeight(0);
            action.enabled = true;
            return action;
        };

        this._walkAction = makeAction(walkClip);
        if (this._walkAction) {
            // 随机播放速度 (±10%) 和 随机起始进度 (0-100%)
            this._walkAction.setEffectiveTimeScale(1.5 * (0.9 + Math.random() * 0.2));
            this._walkAction.time = Math.random() * walkClip.duration;
        }

        this._runAction = makeAction(runClip);
        if (this._runAction) {
            this._runAction.setEffectiveTimeScale(1.2 * (0.9 + Math.random() * 0.2));
            this._runAction.time = Math.random() * runClip.duration;
        }

        this._idleAction = idleClip !== walkClip ? makeAction(idleClip) : this._walkAction;
        if (this._idleAction) {
            // 即使是待机动作也打乱起始时间
            this._idleAction.time = Math.random() * (idleClip?.duration ?? 1);
        }

        if (punchClip) {
            this._punchAction = this._mixer.clipAction(punchClip);
            this._punchAction.setLoop(THREE.LoopRepeat, Infinity);
            this._punchAction.setEffectiveTimeScale(1.5);
            this._punchAction.setEffectiveWeight(0);
            this._punchAction.enabled = true;

            // 每次攻击循环结束时检查是否已离开攻击范围，若已离开则切回移动动画
            this._punchLoopCb = (event) => {
                if (event.action !== this._punchAction || !this._isPunching) return;
                if (!this._inAttackRange) {
                    this._isPunching = false;
                    this._playAnim(this._walkAction ?? this._idleAction);
                }
            };
            this._mixer.addEventListener("loop", this._punchLoopCb);
        }

        this._deathAction = makeAction(deathClip);
        if (this._deathAction) {
            this._deathAction.setLoop(THREE.LoopOnce, 1);
            this._deathAction.clampWhenFinished = true; // 停在最后一帧
        }

        // 驱动一帧使骨骼到位，再计算包围盒以得到准确尺寸
        this._mixer.update(0);
        this._model.updateMatrixWorld(true);

        const bbox = new THREE.Box3().setFromObject(this._model);
        const size = new THREE.Vector3();
        bbox.getSize(size);

        // 将模型归一化到参考高度 180，再乘以 scale 得到世界尺寸
        const refHeight = 180;
        const modelScaleFactor = refHeight / size.y;
        this._capsuleHeight = size.y * modelScaleFactor;
        this._capsuleRadius = Math.min(size.x, size.z) * modelScaleFactor;

        const radius = this._capsuleRadius * scale;
        const height = this._capsuleHeight * scale;

        // 胶囊体：透明网格，仅用于碰撞，不渲染
        this._capsule = new THREE.Mesh(
            new RoundedBoxGeometry(radius * 2, height, radius * 2, 1, 0.75),
            new THREE.MeshStandardMaterial({
                transparent: true,
                opacity: 0,
                depthWrite: false,
            }),
        );
        this._capsule.geometry.translate(0, -height * 0.25, 0);
        this._capsuleInfo = {
            radius,
            segment: new THREE.Line3(
                new THREE.Vector3(),
                new THREE.Vector3(0, -height * 0.5, 0),
            ),
        };
        this._capsule.name = "zombie_capsule";
        this._capsule.userData.zombieId = this.id;
        this._capsule.layers.enable(2);           // layer 2：可被武器射线检测到
        this._scene.add(this._capsule);
        this._capsule.position.copy(position);

        this._model.scale.setScalar(modelScaleFactor * scale);
        this._model.position.set(0, -height * 0.75, 0);
        this._model.rotation.y = rotateY;
        this._model.traverse((child) => {
            child.userData.zombieId = this.id;
            child.castShadow = true;
            child.receiveShadow = true;
        });
        this._capsule.add(this._model);

        this._playAnim(this._idleAction ?? this._walkAction);
    }

    // ==================== 主循环 ====================

    update(delta, playerPos) {
        if (!this._capsule || !this._collider) return;

        delta = Math.min(delta, 1 / 40); // 防止帧间隔过大导致穿透

        if (this.isDead) {
            this._deathTime += delta;
            this._mixer?.update(delta);
            return;
        }

        // 重力累积
        if (!this._onGround) {
            this._velocity.y += delta * this._gravity;
        }
        this._capsule.position.addScaledVector(this._velocity, delta);

        // 计算与玩家的水平距离，判断是否进入攻击范围
        const pos = this._capsule.position;
        const dx = playerPos.x - pos.x;
        const dz = playerPos.z - pos.z;
        const horizDist = Math.sqrt(dx * dx + dz * dz);
        const stopRadius = this._capsuleInfo.radius * 2;
        this._inAttackRange = horizDist <= stopRadius;

        // 朝向玩家（lookAt 反向，使模型正面对着玩家）
        this._lookTarget.set(
            2 * pos.x - playerPos.x,
            pos.y,
            2 * pos.z - playerPos.z,
        );
        this._capsule.lookAt(this._lookTarget);

        if (this._inAttackRange) {
            this._moveDir.set(0, 0, 0);
            if (!this._isPunching) {
                this._isPunching = true;
                this._state = "attack";
                this._playAnim(this._punchAction ?? this._idleAction ?? this._walkAction);
            }
        } else {
            // 只要不在攻击范围内，立即重置攻击标记以允许移动逻辑执行
            this._isPunching = false;

            if (horizDist > 1e-5) {
                this._moveDir.set(dx / horizDist, 0, dz / horizDist);
                this._state = this._isRunning ? "run" : "walk";
                const moveAnim = this._isRunning ? (this._runAction ?? this._walkAction) : this._walkAction;
                this._playAnim(moveAnim ?? this._idleAction);
            } else {
                this._moveDir.set(0, 0, 0);
                this._state = "idle";
                this._playAnim(this._idleAction ?? this._walkAction);
            }
        }

        const currentSpeed = this._isRunning ? this._speed * 1.5 : this._speed;
        this._applyEnvironmentCollision(delta, currentSpeed);
        this._applyGrounding(delta);
        this._mixer?.update(delta);
    }

    // ==================== 伤害 / 死亡 ====================

    takeDamage(damage) {
        if (this.isDead) return false;
        this.hp -= damage;
        if (this.hp <= 0) {
            this.die();
            return true; // 本次命中导致死亡
        }
        return false;
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this._state = "die";
        this._isPunching = false;
        this._deathTime = 0;
        this._velocity.set(0, 0, 0);

        if (this._deathAction) {
            this._playAnim(this._deathAction, 0.1);
        }

        // 禁用图层以便射线检测和自动瞄准忽略尸体
        this._capsule.layers.disable(2);
        this._model.traverse((child) => {
            if (child.isMesh) {
                child.layers.disable(2);
            }
        });
    }

    // ==================== Getter ====================

    getPosition() { return this._capsule?.position ?? null; }
    getCapsule() { return this._capsule; }
    getCapsuleInfo() { return this._capsuleInfo; }
    getDeathTime() { return this._deathTime; }

    // ==================== 私有方法 ====================

    // 切换动画，带淡入淡出
    _playAnim(action, fade = 0.2) {
        if (!action || this._currentAction === action) return;
        const prev = this._currentAction;
        action.reset().setEffectiveWeight(1).play();
        if (prev) {
            prev.fadeOut(fade);
            action.fadeIn(fade);
        } else {
            action.fadeIn(fade);
        }
        this._currentAction = action;
    }

    // 分步移动 + BVH 环境碰撞（只处理竖直面，水平面由 _applyGrounding 负责）
    _applyEnvironmentCollision(delta, speed) {
        const ci = this._capsuleInfo;
        const totalDist = speed * delta;
        const maxStep = ci.radius * 0.8;                          // 每步最大移动量，防止高速穿透
        const steps = Math.ceil(totalDist / maxStep) || 1;
        const stepDist = totalDist / steps;

        for (let i = 0; i < steps; i++) {
            this._capsule.position.addScaledVector(this._moveDir, stepDist);
            this._capsule.updateMatrixWorld();

            this._tempBox.makeEmpty();
            this._tempMat.copy(this._collider.matrixWorld).invert();
            this._tempSeg.copy(ci.segment);
            this._tempSeg.start
                .applyMatrix4(this._capsule.matrixWorld)
                .applyMatrix4(this._tempMat);
            this._tempSeg.end
                .applyMatrix4(this._capsule.matrixWorld)
                .applyMatrix4(this._tempMat);
            this._tempBox.expandByPoint(this._tempSeg.start).expandByPoint(this._tempSeg.end);
            this._tempBox.expandByScalar(ci.radius);

            this._collider.geometry?.boundsTree?.shapecast({
                intersectsBounds: (box) => box.intersectsBox(this._tempBox),
                intersectsTriangle: (tri) => {
                    const dist = tri.closestPointToSegment(
                        this._tempSeg,
                        this._tempV1,
                        this._tempV2,
                    );
                    if (dist >= ci.radius) return;
                    const normal = tri.getNormal(new THREE.Vector3());
                    if (Math.abs(normal.y) > 0.5) return; // 水平面交给 _applyGrounding 处理
                    const dir = this._tempV2.sub(this._tempV1).normalize();
                    const depth = ci.radius - dist;
                    this._tempSeg.start.addScaledVector(dir, depth);
                    this._tempSeg.end.addScaledVector(dir, depth);
                },
            });

            const newPos = this._tempV1
                .copy(this._tempSeg.start)
                .applyMatrix4(this._collider.matrixWorld);
            const deltaVec = this._tempV2.subVectors(newPos, this._capsule.position);
            const offset = Math.max(0, deltaVec.length() - 1e-5);
            if (offset > 0) {
                this._capsule.position.add(deltaVec.normalize().multiplyScalar(offset));
            }
        }
    }

    // 射线向下检测地面，吸附胶囊体到地面高度
    _applyGrounding(delta) {
        this._raycaster.ray.origin.copy(this._capsule.position);
        const hits = this._raycaster.intersectObject(this._collider, false);

        if (!hits.length) {
            this._onGround = false;
            return;
        }

        const groundY = hits[0].point.y;
        const scale = this._modelScale;
        const snapHeight = this._capsuleHeight * scale * 0.75; // 胶囊悬停高度
        const maxHeight = this._capsuleHeight * scale * 0.9;   // 超过此距离视为腾空
        const dist = this._capsule.position.y - groundY;

        if (dist >= maxHeight) {
            this._onGround = false;
            return;
        }

        this._velocity.set(0, 0, 0);
        this._onGround = true;

        if (dist >= snapHeight) {
            // 平滑吸附（走上斜坡时避免抖动）
            this._capsule.position.y = THREE.MathUtils.lerp(
                this._capsule.position.y,
                groundY + snapHeight,
                Math.min(1, 15 * delta),
            );
        } else {
            this._capsule.position.y = groundY + snapHeight;
        }
    }

    // ==================== 销毁 ====================

    destroy() {
        if (this._mixer) {
            if (this._punchLoopCb) {
                this._mixer.removeEventListener("loop", this._punchLoopCb);
                this._punchLoopCb = null;
            }
            this._mixer.stopAllAction();
            this._mixer.uncacheRoot(this._model);
            this._mixer = null;
        }
        if (this._capsule) {
            this._scene.remove(this._capsule);
            this._capsule.geometry?.dispose();
            this._capsule.material?.dispose?.();
            this._capsule = null;
        }
        this._model = null;
        this._collider = null;
    }
}
