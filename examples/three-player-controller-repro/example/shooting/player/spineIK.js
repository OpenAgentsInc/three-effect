import { Euler, Quaternion, Vector3 } from "three";

// 复用的临时量（避免每帧 GC）
const _aimQ = new Quaternion();
const _yawQ = new Quaternion();
const _localPitchQ = new Quaternion();
const _parentWorldQ = new Quaternion();
const _cameraWorldQ = new Quaternion();
const _aimAxis = new Vector3(1, 0, 0);
const _yawAxis = new Vector3(0, 1, 0);

const _headWorldQ = new Quaternion();
const _headParentWorldQ = new Quaternion();
const _headEuler = new Euler();

// 脊椎骨骼 IK
export class SpineIK {
    constructor(spineBones, headBone) {
        // ==================== 骨骼引用 ====================
        this.spineBones = spineBones; // 脊椎骨骼数组（从下到上）
        this.headBone = headBone; // 头部骨骼

        // 每帧 IK 应用前保存的"干净动画姿态"，下一帧先恢复再驱动
        this.baseQuats = spineBones.map(() => new Quaternion());
    }

    // ==================== 骨骼保存 / 恢复 ====================

    // 将脊椎骨骼恢复到上一帧保存的干净动画姿态
    // 在 player.update()（动画驱动）之前调用，防止 IK 残留影响动画混合
    restoreBones() {
        for (let i = 0; i < this.spineBones.length; i++) {
            this.spineBones[i].quaternion.copy(this.baseQuats[i]);
        }
    }

    // 清除头骨骼的横滚（roll），防止第一人称下相机随动画倾斜
    clearHeadRoll() {
        const head = this.headBone;
        if (!head) return;
        head.updateWorldMatrix(true, false);
        head.getWorldQuaternion(_headWorldQ);
        _headEuler.setFromQuaternion(_headWorldQ, "YXZ");
        _headEuler.z = 0;
        _headWorldQ.setFromEuler(_headEuler);
        head.parent.getWorldQuaternion(_headParentWorldQ);
        head.quaternion.copy(_headParentWorldQ).invert().multiply(_headWorldQ);
        head.updateWorldMatrix(false, false);
    }

    // ==================== IK 应用 ====================

    // 第一人称脊椎俯仰 IK
    // 将 pitchTarget 均分到每根脊椎骨骼，使持枪手臂跟随鼠标上下瞄准
    applyAim1P(camera, pitchTarget) {
        if (!this.spineBones.length) return;
        this.clearHeadRoll();

        camera.getWorldQuaternion(_cameraWorldQ);
        _aimAxis.set(1, 0, 0).applyQuaternion(_cameraWorldQ);
        _aimQ.setFromAxisAngle(_aimAxis, pitchTarget / this.spineBones.length);

        this.spineBones[0].parent.updateWorldMatrix(true, false);
        for (let i = 0; i < this.spineBones.length; i++) {
            this.baseQuats[i].copy(this.spineBones[i].quaternion); // 保存干净姿态
            // 转到父骨骼局部空间后叠加
            this.spineBones[i].parent.getWorldQuaternion(_parentWorldQ);
            _localPitchQ.copy(_parentWorldQ).invert().multiply(_aimQ).multiply(_parentWorldQ);
            this.spineBones[i].quaternion.premultiply(_localPitchQ);
            this.spineBones[i].updateWorldMatrix(false, false);
        }
        // 传播到头骨骼，让相机挂点跟随
        this.spineBones[this.spineBones.length - 1].updateWorldMatrix(false, true);
    }

    // 第三人称脊椎俯仰 + 偏航 IK，同时对 camera.rotation.x 做视觉补偿偏移
    applyAim3P(camera, isGunEngaged) {
        if (!this.spineBones.length) return;

        // 归一化俯仰（-1 ~ +1），用于二次曲线补偿
        const normalizedPitch = camera.rotation.x / (Math.PI * (50 / 180));
        const pitchSq = Math.pow(Math.abs(normalizedPitch), 2.0);

        const pitchTarget = isGunEngaged ? camera.rotation.x : 0;
        // 相机视角补偿：向下看时额外抬高，向上看时额外压低，使瞄准更自然
        camera.rotation.x += normalizedPitch > 0 ? pitchSq * 0.35 : -pitchSq * 0.1;

        // 人物朝向补偿：需要往屏幕中心方向旋转
        const yawTarget = isGunEngaged ? -Math.PI * ((10 * (1 + pitchSq * 0.35)) / 180) : 0;

        _aimAxis.set(1, 0, 0).applyQuaternion(camera.quaternion);
        _aimQ.setFromAxisAngle(_aimAxis, pitchTarget / this.spineBones.length);
        _yawQ.setFromAxisAngle(_yawAxis, yawTarget);
        _aimQ.premultiply(_yawQ);

        this.spineBones[0].parent.updateWorldMatrix(true, false);
        for (let i = 0; i < this.spineBones.length; i++) {
            this.baseQuats[i].copy(this.spineBones[i].quaternion);
            this.spineBones[i].parent.getWorldQuaternion(_parentWorldQ);
            _localPitchQ.copy(_parentWorldQ).invert().multiply(_aimQ).multiply(_parentWorldQ);
            this.spineBones[i].quaternion.premultiply(_localPitchQ);
            this.spineBones[i].updateWorldMatrix(false, false);
        }
    }
}
