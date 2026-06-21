import * as THREE from "three";
import type { World } from "@dimforge/rapier3d-compat";
import type { playerController } from "../playerController";
import { loadVehicleModel as loadVehicleModelUtil } from "../utils/vehicleLoader";
import type { VehicleInstance, VehicleOptions } from "../types";

export class VehicleSystem {
    private ctrl: playerController; // 主控制器引用

    list: VehicleInstance[] = []; // 车辆实例列表
    active: VehicleInstance | null = null; // 当前乘坐车辆
    maxCount = 6; // 最大车辆数量
    RAPIER: any = null; // 物理引擎模块
    world: World | null = null; // 物理世界实例
    params = {
        debug: { showPhysicsBox: false }, // 调试显示
        chassis: { linearDamping: 0.5, angularDamping: 0.5 }, // 车身阻尼
        model: { rotation: -Math.PI / 2 }, // 模型旋转
        power: { accelerateForce: 50, brakeForce: 200, maxSpeed: 10000 }, // 动力参数
        steering: { maxSteerAngle: Math.PI / 4, steerSpeed: 0.5, steerReturnSpeed: 1 }, // 转向参数
        followVehicleDirection: true, // 相机跟随方向
    };

    steerQuat = new THREE.Quaternion(); // 转向四元数
    rotQuat = new THREE.Quaternion(); // 旋转四元数

    // ==================== 防卡死自动脱困 ====================
    stuckTimer = 0; // 卡住计时器
    stuckSpeedThreshold = 0.5; // 视为"几乎不动"的水平速度阈值
    stuckTimeThreshold = 1; // 持续多久判定卡住（秒）
    stuckHopRatio = 0.5; // 脱困向上冲量对应的抬升高度 = 车高 × 此值

    // ==================== 上车流程状态 ====================
    isMovingToBoarding = false; // 正在走向上车点
    waypoints: THREE.Vector3[] = []; // 路径节点列表
    waypointIdx = 0; // 当前路径节点
    targetDir: THREE.Vector3 | null = null; // 目标朝向
    moveSpeed = 300; // 自动移动速度
    rotSpeed = 10; // 自动旋转速度
    boardingPoint: THREE.Vector3 | null = null; // 上车位置
    isBoardingAnim = false; // 上车动画中
    doorClosed = false; // 上车门已关
    isExitAnim = false; // 下车动画中
    exitDoorClosed = false; // 下车门已关
    doorTimer: any = null; // 开关门定时器
    flip180 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI); // 180度翻转

    constructor(ctrl: playerController) {
        this.ctrl = ctrl;
    }

    // 初始化物理引擎
    async initRapier() {
        if (this.RAPIER) return;
        this.RAPIER = await import("@dimforge/rapier3d-compat");
        await this.RAPIER.init();

        this.world = new this.RAPIER.World(new this.RAPIER.Vector3(0, -9.81, 0)) as World;
        (this.world as any).maxCcdSubsteps = 2;

        // 构建三角网格碰撞体
        const addTrimesh = (RAPIER: any, world: any, geom: THREE.BufferGeometry) => {
            let g = geom.index ? geom.clone().toNonIndexed() : geom.clone();
            const pos = g.attributes.position;
            const count = pos.count;
            const verts = new Float32Array(count * 3);
            const tmp = new THREE.Vector3();
            for (let i = 0; i < count; i++) {
                tmp.fromBufferAttribute(pos, i);
                verts[i * 3] = tmp.x; verts[i * 3 + 1] = tmp.y; verts[i * 3 + 2] = tmp.z;
            }
            const indices = count > 65535 ? new Uint32Array(count) : new Uint16Array(count);
            for (let i = 0; i < count; i++) indices[i] = i;

            const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
            world.createCollider(
                RAPIER.ColliderDesc.trimesh(verts, indices).setRestitution(0).setFriction(0.8),
                body,
            );
        };

        for (const g of this.ctrl.collected) addTrimesh(this.RAPIER, this.world, g);

        // 添加地面刚体
        const groundBody = this.world.createRigidBody(this.RAPIER.RigidBodyDesc.fixed());
        groundBody.userData = { outOfBounds: true };

    }

    // 加载车辆模型
    async load(opts: VehicleOptions) {
        try {
            if (!this.ctrl.playerModelConfig.enterCarAnim) {
                return console.warn("未配置上车动画，不执行车辆相关逻辑");
            }
            await this.initRapier();
            if (!this.world) return;

            const instance = await loadVehicleModelUtil(opts, {
                loader: this.ctrl.loader,
                scene: this.ctrl.scene,
                world: this.world,
                RAPIER: this.RAPIER,
                vehicleParams: this.params,
                vehicleLength: this.maxCount,
                playerScale: this.ctrl.playerModelConfig.scale,
            });

            this.list.push(instance);
            this.ctrl.addDynamicCollider(instance.vehicleGroup);
            this.setTransition();
        } catch (e) {
            console.error("加载车辆模型失败:", e);
        }
    }

    // 控制车门开关
    openDoor(isOpen = true) {
        const v = this.active;
        if (!v?.vehicleActions) return;
        const next = v.vehicleActions.get("openDoor");
        if (!next) return;

        const duration = next.getClip().duration;
        next.reset();
        next.setEffectiveWeight(1);

        // 正向播放开门，反向播放关门
        if (isOpen) {
            next.setEffectiveTimeScale(duration * 2);
            next.time = 0;
            v.vehiclIsOpenDoor = true;
        } else {
            next.setEffectiveTimeScale(-duration * 2);
            next.time = duration;
            v.vehiclIsOpenDoor = false;
        }

        next.setLoop(THREE.LoopOnce, 1);
        next.clampWhenFinished = true;
        next.play();
    }

    // 触发上车流程
    enter() {
        if (!this.list.length || this.isMovingToBoarding) return;

        // 查找最近可上车的车辆
        let nearest: VehicleInstance | null = null;
        let nearestDist = Infinity;
        let nearBoardingPoint: THREE.Vector3 | null = null;

        for (const v of this.list) {
            const boardingLocal = v.boardingPoint.clone().multiplyScalar(v.scale);
            const boardingWorld = v.vehicleGroup.localToWorld(boardingLocal);
            const dist = this.ctrl.playerCapsule.position.distanceTo(boardingWorld);
            if (dist < 800 * this.ctrl.playerModelConfig.scale && dist < nearestDist) {
                nearestDist = dist;
                nearest = v;
                nearBoardingPoint = boardingWorld;
            }
        }

        if (!nearest || !nearBoardingPoint) return;
        this.active = nearest;
        const v = nearest;

        // 车辆移动中不允许上车
        const vel = v.chassisBody.linvel();
        if (Math.sqrt(vel.x ** 2 + vel.z ** 2) > 0.1) return;

        // 规划路径并开始移动
        this.boardingPoint = nearBoardingPoint;
        this.waypoints = v.pathPlanner.findPath(this.ctrl.playerCapsule.position.clone(), nearBoardingPoint);
        this.waypointIdx = 0;
        this.targetDir = new THREE.Vector3(0, 0, 1).applyQuaternion(v.vehicleGroup.quaternion).normalize();
        this.isMovingToBoarding = true;
        this.ctrl.animation.playByName("walking");
    }

    // 自动走向上车点
    updateMoveTo(delta: number) {
        const c = this.ctrl;
        if (!this.isMovingToBoarding || !this.targetDir || !this.waypoints.length) return;

        // 所有路径点已走完，进入对齐阶段
        if (this.waypointIdx >= this.waypoints.length) {
            this.finalizeBoarding(delta);
            return;
        }

        const waypoint = this.waypoints[this.waypointIdx];
        const currentPos = c.playerCapsule.position.clone();
        const isLast = this.waypointIdx === this.waypoints.length - 1;
        const threshold = isLast ? 0 : 10 * c.playerModelConfig.scale;
        const horizDist = new THREE.Vector2(waypoint.x - currentPos.x, waypoint.z - currentPos.z).length();

        // 移动并旋转朝向路径点
        if (horizDist > threshold) {
            const moveDir = new THREE.Vector3(waypoint.x - currentPos.x, 0, waypoint.z - currentPos.z).normalize();
            c.playerCapsule.position.add(moveDir.clone().multiplyScalar(Math.min(this.moveSpeed * c.playerModelConfig.scale * delta, horizDist)));
            c.targetMat.lookAt(c.playerCapsule.position, c.playerCapsule.position.clone().add(moveDir), c.playerCapsule.up);
            c.targetQuat.setFromRotationMatrix(c.targetMat).multiply(this.flip180);
            c.playerCapsule.quaternion.slerp(c.targetQuat, Math.min(1, this.rotSpeed * delta));
        } else {
            this.waypointIdx++;
        }
    }

    // 完成上车对齐
    finalizeBoarding(delta: number) {
        const c = this.ctrl;
        const v = this.active;
        if (!this.targetDir || !v || !this.isMovingToBoarding) return;

        // 旋转至与车辆同向
        const currentDir = new THREE.Vector3(0, 0, -1).applyQuaternion(c.playerCapsule.quaternion).normalize();
        if (currentDir.angleTo(this.targetDir) > 0.01) {
            const lookTarget = c.playerCapsule.position.clone().add(this.targetDir);
            c.targetMat.lookAt(c.playerCapsule.position, lookTarget, c.playerCapsule.up);
            c.targetQuat.setFromRotationMatrix(c.targetMat);
            c.playerCapsule.quaternion.slerp(c.targetQuat, Math.min(1, this.rotSpeed * delta));
        } else {
            // 对齐完成，触发上车动画
            this.waypoints = [];
            this.waypointIdx = 0;
            this.targetDir = null;
            v.pathPlanner?.clearVisualization();

            c.animation.playByName("enterCar");
            this.isBoardingAnim = true;
            this.doorClosed = false;
            if (!v.vehiclIsOpenDoor) this.openDoor();
            c.playerCapsule.rotation.copy(v.vehicleGroup.rotation);
            c.playerCapsule.quaternion.multiply(this.flip180);
        }
    }

    // 上车动画结束
    onEnterAnimFinished() {
        const c = this.ctrl;
        const v = this.active;
        if (!v || !this.isMovingToBoarding) return;
        c.playerCapsule.updateMatrixWorld(true);
        const offsetY = this.boardingPoint!.y - c.playerCapsule.position.y;

        // 挂载到车辆并设置座位偏移
        c.controllerMode = 1;
        c.mobileControls?.syncControllerModeBtn(1);
        c.cam.setOverShoulder(false);
        v.vehicleGroup.attach(c.playerCapsule);
        c.playerCapsule.position.add(v.seatOffset.clone().multiplyScalar(v.scale).add(new THREE.Vector3(0, offsetY, 0)));
        this.isMovingToBoarding = false;
        c.syncDebugVisibility();
        c.onVehicleEnter?.(v);
    }

    // 触发下车流程
    exit() {
        const c = this.ctrl;
        const v = this.active;
        if (!v) return;

        this.isMovingToBoarding = false;
        this.waypoints = [];
        this.waypointIdx = 0;
        this.targetDir = null;

        // 静止才播放下车动画
        const vel = v.chassisBody.linvel();
        if (Math.sqrt(vel.x ** 2 + vel.z ** 2) < 0.1) {
            c.animation.playByName("exitCar");
            this.isExitAnim = true;
            this.exitDoorClosed = false;
        } else {
            c.animation.playByName("idle");
        }

        this.openDoor(true);
        c.controllerMode = 0;
        c.mobileControls?.syncControllerModeBtn(0);
        c.cam.setOverShoulder(c.enableOverShoulderView);
        c.scene.attach(c.playerCapsule);
        if (c.isFirstPerson) c.cam.setFirstPerson();
        c.syncDebugVisibility();
        this.setTransition();
    }

    // 取消上车流程
    cancelBoarding() {
        this.isMovingToBoarding = false;
        this.waypoints = [];
        this.waypointIdx = 0;
        this.targetDir = null;
    }

    // 更新车辆驾驶
    updateVehicle(delta: number) {
        const c = this.ctrl;
        const v = this.active;
        if (!v || !this.world) return;
        const { vehicleController, chassisBody, vehicleGroup } = v;

        // 坡度补偿
        const rotation = chassisBody.rotation();
        const quat = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
        const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
        const slopeAngle = Math.asin(forward.y);
        const factor = (slopeAngle < -0.05 && c.input.fwd) ? -Math.sin(slopeAngle) * 10 : 1;

        // 驱动力
        const accelerateForce = this.params.power.accelerateForce * v.speedMultiplier;
        const engineForce = (Number(c.input.fwd) - Number(c.input.bkd)) * accelerateForce * factor;
        for (let i = 0; i < 4; i++) vehicleController.setWheelEngineForce(i, engineForce);

        // 制动
        const wheelBrake = Number(c.input.space) * this.params.power.brakeForce * delta;
        for (let i = 0; i < 4; i++) vehicleController.setWheelBrake(i, wheelBrake);

        // 转向
        const currentSteering = vehicleController.wheelSteering(0) || 0;
        const steerDir = Number(c.input.lft) - Number(c.input.rgt);
        const steerSpeed = steerDir === 0 ? this.params.steering.steerReturnSpeed : this.params.steering.steerSpeed;
        const steering = THREE.MathUtils.lerp(currentSteering, this.params.steering.maxSteerAngle * steerDir, 1 - Math.pow(1 - steerSpeed, delta));
        vehicleController.setWheelSteering(0, steering);
        vehicleController.setWheelSteering(1, steering);

        // 漂移摩擦
        const driftFriction = ((c.input.rgt || c.input.lft) && c.input.shift) ? 0.5 : 2;
        vehicleController.setWheelSideFrictionStiffness(2, driftFriction);
        vehicleController.setWheelSideFrictionStiffness(3, driftFriction);

        // 防卡死自动脱困：有油门却长时间几乎不动，沿行进方向施加向上+前向冲量顶离
        const linv = chassisBody.linvel();
        if ((c.input.fwd || c.input.bkd) && Math.hypot(linv.x, linv.z) < this.stuckSpeedThreshold) {
            this.stuckTimer += delta;
        } else {
            this.stuckTimer = 0;
        }
        if (this.stuckTimer > this.stuckTimeThreshold) {
            const g = 9.81;
            const vUp = Math.sqrt(2 * g * v.size.h * this.stuckHopRatio); // 抬升到约车高×ratio 所需的起跳速度
            const mass = chassisBody.mass();
            const dir = c.input.bkd ? -1 : 1;
            // 车身水平前向（局部 +X，与坡度补偿一致）
            const fl = Math.hypot(forward.x, forward.z);
            const fx = fl > 0.001 ? forward.x / fl : 0;
            const fz = fl > 0.001 ? forward.z / fl : 0;
            chassisBody.applyImpulse(
                new this.RAPIER.Vector3(fx * dir * mass * vUp * 0.6, mass * vUp, fz * dir * mass * vUp * 0.6),
                true,
            );
            this.stuckTimer = 0;
        }

        this.updateInertia(delta);

        // 相机跟随
        if (!c.isFirstPerson) {
            const lookTarget = c.cam.springTarget(vehicleGroup.position, delta).clone();
            c.camera.position.sub(c.controls.target);
            c.controls.target.copy(lookTarget);
            c.camera.position.add(lookTarget);
            c.controls.update();

            const baseDist = v.size.l * 0.8;
            const desiredDist = baseDist;

            c.cam.updateWithRaycast(c.controls.target, desiredDist);

            // 相机跟随车辆速度方向：绕 Y 轴把相机转到行进（速度）方向的正后方，高度不变
            if ((c.input.fwd || c.input.bkd) && this.params.followVehicleDirection) {
                const vel = chassisBody.linvel();
                if (Math.hypot(vel.x, vel.z) > 0.3) {
                    // 目标方位角：相机应位于速度方向的正后方
                    const targetAngle = Math.atan2(-vel.x, -vel.z);
                    // 当前相机相对看向点的水平方位角与半径
                    const offX = c.camera.position.x - c.controls.target.x;
                    const offZ = c.camera.position.z - c.controls.target.z;
                    const radius = Math.hypot(offX, offZ);
                    const curAngle = Math.atan2(offX, offZ);
                    // 沿最短弧插值
                    const diff = Math.atan2(Math.sin(targetAngle - curAngle), Math.cos(targetAngle - curAngle));
                    const newAngle = curAngle + diff * c.cam.vehicleTurnLerp;
                    // 修改改XZ，保持水平半径与 Y 高度不变
                    c.camera.position.x = c.controls.target.x + Math.sin(newAngle) * radius;
                    c.camera.position.z = c.controls.target.z + Math.cos(newAngle) * radius;
                    c.controls.update();
                }
            }
        }

        // 翻车自动复位
        const vehicleUp = c.upVector.clone().applyQuaternion(vehicleGroup.quaternion);
        if (vehicleUp.angleTo(c.upVector) > Math.PI / 2) {
            const size = new THREE.Vector3();
            v.vehicleBBox?.getSize(size);
            const t = chassisBody.translation();
            chassisBody.setTranslation(new this.RAPIER.Vector3(t.x, t.y + size.y, t.z), true);
            chassisBody.setRotation(new this.RAPIER.Quaternion(0, 0, 0, 1), true);
            chassisBody.setLinvel(new this.RAPIER.Vector3(0, 0, 0), true);
            chassisBody.setAngvel(new this.RAPIER.Vector3(0, 0, 0), true);
        }
    }

    // 步进物理世界
    updateInertia(delta: number) {
        if (!this.world) return;
        this.world.timestep = delta;
        this.world.step();

        for (const v of this.list) {
            const { vehicleController, chassisBody, vehicleGroup, updateWheelVisuals } = v;
            vehicleController.updateVehicle(delta);
            if (chassisBody.isSleeping()) continue;

            // 限制最大速度
            const vel = chassisBody.linvel();
            const speed = new THREE.Vector3(vel.x, vel.y, vel.z).length();
            const max = this.params.power.maxSpeed * v.speedMultiplier;
            if (speed > max) {
                const s = max / speed;
                chassisBody.setLinvel(new this.RAPIER.Vector3(vel.x * s, vel.y * s, vel.z * s), true);
            }

            // 同步视觉位置
            const t = chassisBody.translation();
            const r = chassisBody.rotation();
            vehicleGroup.position.set(t.x, t.y, t.z);
            vehicleGroup.quaternion.set(r.x, r.y, r.z, r.w);
            updateWheelVisuals?.();
        }
    }

    // 等待车辆停稳后清除速度
    setTransition() {
        if (this.ctrl.isChangeControllerTransitionTimer) {
            clearTimeout(this.ctrl.isChangeControllerTransitionTimer);
            this.ctrl.isChangeControllerTransitionTimer = null;
        }
        this.ctrl.isChangeControllerTransitionTimer = setTimeout(() => {
            this.ctrl.isChangeControllerTransitionTimer = null;
            this.list.forEach(v => this.clearVelocity(v));
        }, 3000);
    }

    // 清除车辆速度
    private clearVelocity(v: VehicleInstance) {
        if (!v || !this.world || !this.RAPIER) return;
        const { chassisBody, vehicleController } = v;
        const ZERO = new this.RAPIER.Vector3(0, 0, 0);
        chassisBody.setLinvel(ZERO, true);
        chassisBody.setAngvel(ZERO, true);
        for (let i = 0; i < 4; i++) { vehicleController.setWheelEngineForce(i, 0); vehicleController.setWheelBrake(i, 1e6); }
        vehicleController.updateVehicle(1 / 60);
        this.world.timestep = 1 / 60;
        this.world.step();
        chassisBody.setLinvel(ZERO, true);
        chassisBody.setAngvel(ZERO, true);
        for (let i = 0; i < 4; i++) vehicleController.setWheelBrake(i, 0);
    }
}
