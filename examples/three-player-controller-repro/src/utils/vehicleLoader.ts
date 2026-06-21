import * as THREE from "three";
import type { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PathPlanner, type ObstacleChecker } from "./pathPlanner";
import { createVehicleController } from "./vehicleController";
import type { VehicleOptions, VehicleInstance } from "../types";

export type VehicleLoaderContext = {
    loader: GLTFLoader;
    scene: THREE.Scene;
    world: any;
    RAPIER: any;
    vehicleParams: {
        debug: { showPhysicsBox: boolean };
        chassis: { linearDamping: number; angularDamping: number };
        model: { rotation: number };
        power: { accelerateForce: number; brakeForce: number; maxSpeed: number };
        steering: { maxSteerAngle: number; steerSpeed: number; steerReturnSpeed: number };
        followVehicleDirection: boolean;
    };
    vehicleLength: number;
    playerScale: number;
};

// ==================== 工具函数 ====================

// 获取包围盒
function getBbox(object: THREE.Object3D) {
    const bbox = new THREE.Box3().setFromObject(object);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    bbox.getCenter(center);
    bbox.getSize(size);
    return { bbox, center, size };
}

// 创建障碍物检测器
function createObstacleChecker(
    vehicleGroup: THREE.Group,
    bbox: THREE.Box3,
    scale: number,
    playerScale: number,
): ObstacleChecker {
    return {
        // 射线检测路径是否被车辆遮挡
        isBlocked(start: THREE.Vector3, end: THREE.Vector3): boolean {
            const vehiclePos = vehicleGroup.position;
            const vehicleQuat = vehicleGroup.quaternion;
            const center = new THREE.Vector3();
            const size = new THREE.Vector3();
            bbox.getCenter(center);
            bbox.getSize(size);
            center.applyQuaternion(vehicleQuat).add(vehiclePos);

            // 构建旋转后的包围盒角点
            const halfSize = size.clone().multiplyScalar(0.5 * scale);
            const corners: THREE.Vector3[] = [];
            for (let x = -1; x <= 1; x += 2)
                for (let y = -1; y <= 1; y += 2)
                    for (let z = -1; z <= 1; z += 2)
                        corners.push(
                            new THREE.Vector3(halfSize.x * x, halfSize.y * y, halfSize.z * z)
                                .applyQuaternion(vehicleQuat)
                                .add(center),
                        );

            // 扩展包围盒并做射线检测
            const expandedBBox = new THREE.Box3();
            corners.forEach(c => expandedBBox.expandByPoint(c));
            expandedBBox.expandByScalar(100 * playerScale);

            const direction = new THREE.Vector3().subVectors(end, start);
            const length = direction.length();
            const ray = new THREE.Ray(start, direction.normalize());
            const intersects = ray.intersectBox(expandedBBox, new THREE.Vector3());
            return intersects !== null && start.distanceTo(intersects) < length;
        },

        // 生成绕行导航节点
        getNavigationNodes(start: THREE.Vector3, _goal: THREE.Vector3): THREE.Vector3[] {
            const nodes = [] as THREE.Vector3[];
            const vehiclePos = vehicleGroup.position;
            const vehicleQuat = vehicleGroup.quaternion;
            const bboxSize = new THREE.Vector3();
            bbox.getSize(bboxSize);

            const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(vehicleQuat);
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(vehicleQuat);
            const halfLen = (bboxSize.z / 2) * scale;
            const halfWidth = (bboxSize.x / 2) * scale;
            const groundY = start.y;

            // 两个距离层级各生成四个角点
            for (const margin of [300 * playerScale, 500 * playerScale]) {
                nodes.push(vehiclePos.clone().add(fwd.clone().multiplyScalar(halfLen + margin)).add(right.clone().multiplyScalar(-halfWidth - margin)).setY(groundY));
                nodes.push(vehiclePos.clone().add(fwd.clone().multiplyScalar(halfLen + margin)).add(right.clone().multiplyScalar(halfWidth + margin)).setY(groundY));
                nodes.push(vehiclePos.clone().add(fwd.clone().multiplyScalar(-halfLen - margin)).add(right.clone().multiplyScalar(-halfWidth - margin)).setY(groundY));
                nodes.push(vehiclePos.clone().add(fwd.clone().multiplyScalar(-halfLen - margin)).add(right.clone().multiplyScalar(halfWidth + margin)).setY(groundY));
            }
            return nodes;
        },
    };
}

// ==================== 主函数 ====================

// 加载车辆模型
export async function loadVehicleModel(
    opts: VehicleOptions,
    ctx: VehicleLoaderContext,
): Promise<VehicleInstance> {
    const { loader, scene, world, RAPIER, vehicleParams, vehicleLength, playerScale } = ctx;

    const scale = opts.scale ?? 1;
    const chassisRatio = opts.chassisRatio ?? 0.2;
    const suspensionRestLengthRatio = opts.suspensionRestLengthRatio ?? 0.2;
    const speedMultiplier = opts.speedMultiplier ?? 1;

    // 更新车辆物理参数
    vehicleParams.power.accelerateForce = 50 * scale;
    vehicleParams.power.brakeForce = 200 * scale;
    vehicleParams.power.maxSpeed = 10000 * scale;
    vehicleParams.followVehicleDirection = opts.followVehicleDirection ?? true;

    const vehicleModel = await loader.loadAsync(opts.url);

    // 计算模型缩放比
    const { size: originalSize } = getBbox(vehicleModel.scene);
    const modelScale = vehicleLength / Math.max(originalSize.x, originalSize.y, originalSize.z);

    // 绑定开门动画
    const vehicleMixer = new THREE.AnimationMixer(vehicleModel.scene);
    const vehicleActions = new Map<string, THREE.AnimationAction>();
    const animations = vehicleModel.animations ?? [];
    const openDoorClip = animations.find(a => a.name === (opts.animations?.openDoorAnim ?? ""));
    if (openDoorClip) {
        const action = vehicleMixer.clipAction(openDoorClip);
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.setEffectiveTimeScale(openDoorClip.duration);
        action.enabled = true;
        action.setEffectiveWeight(0);
        vehicleActions.set("openDoor", action);
    }

    // 查找轮子节点
    const wheelObjects: THREE.Object3D[] = [];
    for (const name of opts.wheelsNames) {
        let found = false;
        vehicleModel.scene.traverse(child => {
            if (child.name === name && !found) { wheelObjects.push(child); found = true; }
        });
        if (!found) console.warn(`未找到轮子: ${name}`);
    }

    // 临时挂载获取世界坐标
    const tempGroup = new THREE.Group();
    scene.add(tempGroup);
    vehicleModel.scene.scale.multiplyScalar(modelScale * scale);
    vehicleModel.scene.rotateY(vehicleParams.model.rotation);
    const { size, bbox, center } = getBbox(vehicleModel.scene);
    vehicleModel.scene.position.set(-center.x, -center.y, -center.z);
    tempGroup.add(vehicleModel.scene);
    tempGroup.updateMatrixWorld(true);

    // 收集轮子世界变换信息
    let wheelRadius = 0, wheelWidth = 0, suspensionRestLength = 0, chassisHeight = 0, wheelSizeInit = false;
    const wheelsInfo: any[] = [];

    for (const wheel of wheelObjects) {
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();
        wheel.getWorldPosition(worldPos);
        wheel.getWorldQuaternion(worldQuat);
        wheel.getWorldScale(worldScale);

        // 只计算一次轮子尺寸
        if (!wheelSizeInit) {
            const { size: ws } = getBbox(wheel);
            wheelRadius = Number((Math.max(ws.x, ws.y, ws.z) / 2).toFixed(2));
            wheelWidth = Number(Math.min(ws.x, ws.y, ws.z).toFixed(2));
            suspensionRestLength = Number((wheelRadius * 2 * suspensionRestLengthRatio).toFixed(2));
            chassisHeight = Number((wheelRadius * 2 * chassisRatio).toFixed(2));
            wheelSizeInit = true;
        }

        wheelsInfo.push({ axleCs: new THREE.Vector3(0, 0, -1), position: worldPos, quaternion: worldQuat, scale: worldScale, radius: wheelRadius, width: wheelWidth, suspensionRestLength, object: wheel });
    }

    tempGroup.remove(vehicleModel.scene);
    scene.remove(tempGroup);

    // 创建车辆根节点
    const vehicleGroup = new THREE.Group();
    scene.add(vehicleGroup);
    vehicleGroup.add(vehicleModel.scene);
    vehicleGroup.updateMatrixWorld(true);

    // 轮子包装组（独立旋转）
    const wheelWrappers: THREE.Group[] = [];
    for (let i = 0; i < wheelsInfo.length; i++) {
        const wheel = wheelsInfo[i];
        const wheelWrapper = new THREE.Group();
        wheelWrapper.position.copy(vehicleGroup.worldToLocal(wheel.position.clone()));

        const wheelObj = wheel.object;
        wheelObj.parent?.remove(wheelObj);
        wheelObj.position.set(0, 0, 0);
        wheelObj.quaternion.copy(wheel.quaternion);
        wheelObj.scale.copy(wheel.scale);
        wheelObj.updateMatrixWorld();

        wheelWrapper.add(wheelObj);
        vehicleGroup.add(wheelWrapper);
        wheelWrappers.push(wheelWrapper);
    }

    // 创建车身物理碰撞体
    const halfExtents = size.clone().multiplyScalar(0.5);
    halfExtents.y -= chassisHeight / 2;
    vehicleModel.scene.position.y -= chassisHeight / 2;
    halfExtents.x *= 0.95;
    halfExtents.z *= 0.95;

    const chassisBody = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(opts.position.x, opts.position.y, opts.position.z)
            .setLinearDamping(vehicleParams.chassis.linearDamping)
            .setAngularDamping(vehicleParams.chassis.angularDamping)
            .setCanSleep(true)
            .setAdditionalMass(10),
    );
    world.createCollider(RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z), chassisBody);

    // 物理调试盒
    const physicsBoxMesh = new THREE.Mesh(
        new THREE.BoxGeometry(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.3 }),
    );
    if (vehicleParams.debug.showPhysicsBox) vehicleGroup.add(physicsBoxMesh);

    vehicleGroup.position.copy(opts.position);
    vehicleGroup.updateMatrixWorld(true);

    const { vehicle, updateWheelVisuals } = createVehicleController(world, chassisBody, wheelWrappers, wheelsInfo);

    return {
        vehicleGroup,
        chassisBody,
        vehicleController: vehicle,
        updateWheelVisuals,
        vehicleMixer,
        vehicleActions,
        vehiclIsOpenDoor: false,
        vehicleBBox: bbox.clone(),
        pathPlanner: new PathPlanner(
            createObstacleChecker(vehicleGroup, bbox, scale, playerScale),
            { debugEnabled: false, scene, scale: playerScale },
        ),
        scale,
        boardingPoint: opts.boardingPoint,
        seatOffset: opts.seatOffset ?? new THREE.Vector3(),
        enterVehicleTime: 1.5,
        chassisRatio,
        suspensionRestLengthRatio,
        size: { l: Math.max(size.x, size.z), w: Math.min(size.x, size.z), h: size.y },
        speedMultiplier,
        physicsBoxMesh,
    };
}