import * as THREE from "three";
import type { playerController } from "../playerController";

export class CameraSystem {
    private ctrl: playerController; // 主控制器引用

    collisionLerp = 0.18; // 碰撞插值速度
    epsilon = 35; // 安全距离偏移
    minDist = 100; // 最小相机距离
    maxDist = 440; // 最大相机距离
    originMaxDist = 440; // 初始最大距离
    sensitivity = 5; // 鼠标灵敏度
    mouseMode: 0 | 1 | 2 | 3 | 4 | 5 = 1; // 鼠标控制模式
    zoomEnabled = false; // 是否允许缩放
    lookAtHeightRatio = 0.8; // 第三人称看向点高度比例（0=底部，1=顶部）

    private lookAtPoint = new THREE.Vector3(); // 预分配的看向点向量

    enableSpringCamera = false;
    springCameraTime = 0.05;
    vehicleTurnLerp = 0.01;
    private _springVelocity = new THREE.Vector3();
    private _springResult = new THREE.Vector3();

    raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3()); // 相机碰撞射线
    centerRay = new THREE.Raycaster(); // 屏幕中心射线
    centerMouse = new THREE.Vector2(); // 屏幕中心坐标
    playerToCam = new THREE.Vector3(); // 玩家到相机向量

    constructor(ctrl: playerController) {
        this.ctrl = ctrl;
        (this.raycaster as any).firstHitOnly = true;
    }

    // 通用弹簧阻尼：把 controls.target 朝 dest 平滑跟随，返回本帧的目标点
    springTarget(dest: THREE.Vector3, delta: number): THREE.Vector3 {
        if (!this.enableSpringCamera) return dest;
        const cur = this.ctrl.controls.target;
        const v = this._springVelocity;
        const out = this._springResult;
        const smoothTime = Math.max(0.0001, this.springCameraTime);
        const omega = 2 / smoothTime;
        const x = omega * delta;
        const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
        const axes = ['x', 'y', 'z'] as const;
        for (const a of axes) {
            const change = cur[a] - dest[a];
            const temp = (v[a] + omega * change) * delta;
            v[a] = (v[a] - omega * temp) * exp;
            let o = dest[a] + (change + temp) * exp;
            if ((dest[a] - cur[a] > 0) === (o > dest[a])) {
                o = dest[a];
                v[a] = 0;
            }
            out[a] = o;
        }
        return out;
    }

    // 第三人称相机看向点
    getLookAtPoint(): THREE.Vector3 {
        const capsuleInfo = this.ctrl.playerCapsule.capsuleInfo;
        const r = capsuleInfo.radius;
        const totalH = -capsuleInfo.segment.end.y + 2 * r;
        const y = this.ctrl.playerCapsule.position.y + r - totalH * (1 - this.lookAtHeightRatio);
        return this.lookAtPoint.copy(this.ctrl.playerCapsule.position).setY(y);
    }

    // 设置越肩视角
    setOverShoulder(enable: boolean) {
        if (!enable || this.ctrl.controllerMode === 1) { this.ctrl.camera.clearViewOffset(); return; }
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.ctrl.camera.setViewOffset(w, h, w * 0.2, 0, w, h);
    }

    // 切换视角模式
    changeView() {
        this.ctrl.onBeforeViewChange?.(this.ctrl.isFirstPerson);
        this.ctrl.isFirstPerson = !this.ctrl.isFirstPerson;
        if (this.ctrl.isFirstPerson) {
            // 切到第一人称，先对齐胶囊体朝向
            const playerFwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.ctrl.playerCapsule.quaternion);
            const flatDir = new THREE.Vector3(playerFwd.x, 0, playerFwd.z).normalize();
            if (flatDir.lengthSq() > 0.001) {
                const yAngle = Math.atan2(flatDir.x, flatDir.z);
                this.ctrl.playerCapsule.rotation.set(0, yAngle, 0);
            }
            this.setFirstPerson();
            this.setOverShoulder(false);
        } else {
            // 切到第三人称，放置相机到玩家背后
            this.ctrl.controls.enabled = true;
            this.ctrl.scene.attach(this.ctrl.camera);
            const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.ctrl.playerCapsule.quaternion);
            const angle = Math.atan2(dir.z, dir.x);
            const s = this.ctrl.playerModelConfig.scale;
            const rawOffset = new THREE.Vector3(Math.cos(angle) * 400 * s, 200 * s, Math.sin(angle) * 400 * s);
            this.ctrl.controls.target.copy(this.getLookAtPoint());
            this.ctrl.camera.position.copy(this.ctrl.controls.target).add(rawOffset.normalize().multiplyScalar(this.maxDist));
            this.ctrl.controls.enableZoom = this.zoomEnabled;
            this.setOverShoulder(this.ctrl.enableOverShoulderView);
        }
        this.setPointerLock();
        this.ctrl.onViewChange?.(this.ctrl.isFirstPerson);
    }

    // 进入第一人称
    setFirstPerson(vertAngle = 0) {
        this.ctrl.controls.enabled = false;
        const s = this.ctrl.playerModelConfig.scale;
        const sharedOffset = this.ctrl.playerModelConfig.firstPersonCameraOffset;
        // 有头骨节点挂到头骨，否则挂到胶囊体
        if (this.ctrl.playerModelHead) {
            const [x, y, z] = sharedOffset ?? [0, 10, 20];
            this.ctrl.playerModelHead.attach(this.ctrl.camera);
            this.ctrl.camera.position.set(x, y, z);
        } else {
            const [x, y, z] = sharedOffset ?? [0, 40, 30];
            this.ctrl.playerCapsule.attach(this.ctrl.camera);
            this.ctrl.camera.position.set(x * s, y * s, z * s);
        }
        this.ctrl.camera.rotation.set(
            THREE.MathUtils.clamp(vertAngle, -1.1, 1.4),
            Math.PI,
            0,
        );
        this.ctrl.controls.enableZoom = false;
    }

    // 指针锁定控制
    setPointerLock() {
        if (!document.body.requestPointerLock) return;
        if (((this.mouseMode === 0 || this.mouseMode === 1 || this.mouseMode === 5) && !this.ctrl.isFirstPerson) || this.ctrl.isFirstPerson) {
            document.body.requestPointerLock();
        } else {
            document.exitPointerLock();
        }
    }

    // 初始相机位置
    setCamPos() {
        requestAnimationFrame(() => {
            if (!this.ctrl.isFirstPerson) {
                const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.ctrl.playerCapsule.quaternion);
                const angle = Math.atan2(dir.z, dir.x);
                const s = this.ctrl.playerModelConfig.scale;
                const rawOffset = new THREE.Vector3(Math.cos(angle) * 400 * s, 200 * s, Math.sin(angle) * 400 * s);
                this.ctrl.controls.target.copy(this.getLookAtPoint());
                this.ctrl.camera.position.copy(this.ctrl.controls.target).add(rawOffset.normalize().multiplyScalar(this.maxDist));
                this.ctrl.controls.enableZoom = this.zoomEnabled;
            } else {
                this.setFirstPerson();
            }
            this.ctrl.camera.updateProjectionMatrix();
        });
    }

    // 初始化轨道控制
    initControls() {
        this.ctrl.controls.enableZoom = this.zoomEnabled;
        this.ctrl.controls.rotateSpeed = this.sensitivity * 0.05;
        this.ctrl.controls.maxPolarAngle = Math.PI;
        this.ctrl.controls.mouseButtons = { LEFT: 0, MIDDLE: 1, RIGHT: 2 };
        // 防止相机轨道半径归零穿越目标点
        this.ctrl.controls.minDistance = this.minDist;
    }

    // 重置轨道控制
    resetControls() {
        if (!this.ctrl.controls) return;
        this.ctrl.controls.enabled = true;
        this.ctrl.controls.enablePan = true;
        this.ctrl.controls.maxPolarAngle = Math.PI / 2;
        this.ctrl.controls.rotateSpeed = 1;
        this.ctrl.controls.enableZoom = true;
        this.ctrl.controls.mouseButtons = { LEFT: 0, MIDDLE: 1, RIGHT: 2 };
    }

    // 处理鼠标朝向
    setToward(dx: number, dy: number, speed: number) {
        this.ctrl.onTowardChange?.(dx, dy, speed);
        if (!this.ctrl.enableToward || (this.ctrl.controllerMode === 0 && this.ctrl.isFirstPerson && this.ctrl.vehicle.isMovingToBoarding)) return;
        const sens = this.sensitivity;
        if (this.ctrl.controllerMode === 0) {
            // 步行第一人称
            if (this.ctrl.isFirstPerson) {
                this.ctrl.playerCapsule.rotateY(-dx * speed * sens);
                this.ctrl.camera.rotation.x = THREE.MathUtils.clamp(
                    this.ctrl.camera.rotation.x + (-dy * speed * sens),
                    -Math.PI * (60 / 180), Math.PI * (80 / 180),
                );
            } else {
                // 步行第三人称
                this.orbit(this.getLookAtPoint(), -dx * speed * sens, -dy * speed * sens);
            }
        } else {
            const v = this.ctrl.vehicle.active;
            if (!v) return;
            // 载具第一人称
            if (this.ctrl.isFirstPerson) {
                this.ctrl.camera.rotation.y = THREE.MathUtils.clamp(this.ctrl.camera.rotation.y + (-dx * speed * sens), Math.PI * (3 / 4), Math.PI * (5 / 4));
                this.ctrl.camera.rotation.x = THREE.MathUtils.clamp(this.ctrl.camera.rotation.x + (-dy * speed * sens), 0, Math.PI * (1 / 3));
            } else {
                // 载具第三人称
                this.orbit(v.vehicleGroup.position, -dx * speed * sens, -dy * speed * sens);
            }
        }
    }

    // 手动轨道旋转
    private orbit(target: THREE.Vector3, deltaX: number, deltaY: number) {
        const distance = this.ctrl.camera.position.distanceTo(target);
        const cur = this.ctrl.camera.position.clone().sub(target);
        let theta = Math.atan2(cur.x, cur.z) + deltaX;
        let phi = Math.acos(THREE.MathUtils.clamp(cur.y / distance, -1, 1)) + deltaY;
        // 限制仰角避免万向节死锁
        phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));
        this.ctrl.camera.position.set(
            target.x + distance * Math.sin(phi) * Math.sin(theta),
            target.y + distance * Math.cos(phi),
            target.z + distance * Math.sin(phi) * Math.cos(theta),
        );
        this.ctrl.camera.lookAt(target);
    }

    // 射线防穿墙
    updateWithRaycast(origin: THREE.Vector3, maxDist: number = this.maxDist, minDist = this.minDist) {
        this.playerToCam.subVectors(this.ctrl.camera.position, origin);
        const direction = this.playerToCam.clone().normalize();
        this.raycaster.set(origin, direction);
        this.raycaster.far = maxDist;

        const hits = this.raycaster.intersectObject(this.ctrl.collider!, false);
        // 有遮挡：贴近安全距离
        if (hits.length > 0) {
            const safeDist = Math.max(hits[0].distance - this.epsilon, minDist);
            this.ctrl.camera.position.lerp(origin.clone().add(direction.multiplyScalar(safeDist)), this.collisionLerp);
        } else {
            // 无遮挡：尝试拉到最大距离
            this.raycaster.far = maxDist;
            const maxHits = this.raycaster.intersectObject(this.ctrl.collider!, false);
            const safeDist = maxHits.length > 0 ? Math.min(maxDist, maxHits[0].distance - this.epsilon) : maxDist;
            this.ctrl.camera.position.lerp(origin.clone().add(direction.multiplyScalar(safeDist)), this.collisionLerp);
        }
    }

    // 屏幕中心检测
    getCenterHit(): THREE.Intersection | undefined {
        this.ctrl.camera.updateMatrixWorld();
        this.centerRay.setFromCamera(this.centerMouse, this.ctrl.camera);
        this.centerRay.layers.set(1);
        this.centerRay.layers.enable(2);

        const checkTargets = this.ctrl.collider ? [this.ctrl.collider, ...this.ctrl.scene.children] : this.ctrl.scene.children;
        const hits = this.centerRay.intersectObjects(checkTargets, true);
        hits.sort((a, b) => a.distance - b.distance);
        if (hits[0]) return hits[0];

        // 无命中返回1000距离的虚拟点
        const fallbackPoint = this.centerRay.ray.at(1000, new THREE.Vector3());
        return {
            distance: 1000, point: fallbackPoint, object: this.ctrl.camera,
            uv: null as any, normal: null as any, face: null as any,
            faceIndex: null as any, instanceId: undefined,
        } as THREE.Intersection;
    }
}
