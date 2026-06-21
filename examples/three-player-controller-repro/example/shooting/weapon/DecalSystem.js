import {
    Matrix3,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    PlaneGeometry,
    TextureLoader,
} from "three";

const _normalMatrix = new Matrix3(); // 法线矩阵
const _decalHelper = new Object3D(); // 弹孔朝向辅助体

// 弹孔贴花系统（对象池）
export class DecalSystem {
    constructor(scene, maxDecals = 60, decalSize = 0.02) {
        // ==================== 场景引用 ====================
        this._scene = scene;

        // ==================== 对象池配置 ====================
        this._maxDecals = maxDecals; // 最大弹孔数量，超出后移除最旧的
        this._pool = []; // 场景中现存的弹孔 Mesh
        this._mats = []; // 可用的弹痕材质（多张随机选取）
        this._geo = new PlaneGeometry(decalSize, decalSize); // 弹孔平面几何体
        this.onSpawn = null; // (hitPoint, hitNormal) => void，多人模式注入广播回调
    }

    // ==================== 初始化 ====================

    // 批量加载弹痕贴图，生成对应材质
    async loadMaterials(files, baseUrl) {
        const loader = new TextureLoader();
        await Promise.all(
            files.map(async (f) => {
                const tex = await loader.loadAsync(baseUrl + f);
                this._mats.push(
                    new MeshBasicMaterial({
                        map: tex,
                        transparent: true,
                        depthTest: true,
                        depthWrite: false,
                        polygonOffset: true,
                        polygonOffsetFactor: -4, // 防止与墙面 Z-fighting
                    })
                );
            })
        );
    }

    // ==================== 生成 / 清除 ====================

    // 在射线命中点生成弹孔，并触发命中硝烟特效
    spawn(hit, effects) {
        if (!hit?.face || !hit?.object) return;
        if (!this._mats.length) return;

        // 计算世界法线
        _normalMatrix.getNormalMatrix(hit.object.matrixWorld);
        const hitNormal = hit.face.normal.clone().applyMatrix3(_normalMatrix).normalize();
        const hitPoint = hit.point.clone();

        // 计算弹孔朝向（面向法线 + 随机旋转）
        _decalHelper.position.copy(hitPoint);
        _decalHelper.lookAt(hitPoint.clone().add(hitNormal));
        _decalHelper.rotation.z = Math.random() * Math.PI * 2;

        // 创建弹孔 Mesh，沿法线微偏移以避免 Z-fighting
        const mat = this._mats[Math.floor(Math.random() * this._mats.length)];
        const decal = new Mesh(this._geo, mat);
        decal.position.copy(hitPoint).addScaledVector(hitNormal, 0.001);
        decal.rotation.copy(_decalHelper.rotation);
        decal.renderOrder = 1;
        this._scene.add(decal);

        // 超出上限时移除最旧弹孔
        this._pool.push(decal);
        if (this._pool.length > this._maxDecals) {
            this._scene.remove(this._pool.shift());
        }

        // 命中硝烟特效
        effects?.triggerHitSmoke(hitPoint, hitNormal);

        // 广播给其他客户端（多人模式注入）
        this.onSpawn?.(hitPoint, hitNormal);
    }

    // 根据世界坐标和法线直接生成弹孔（接收远程弹痕时使用，不触发硝烟）
    spawnAtPoint(hitPoint, hitNormal) {
        if (!this._mats.length) return;

        _decalHelper.position.copy(hitPoint);
        _decalHelper.lookAt(hitPoint.clone().add(hitNormal));
        _decalHelper.rotation.z = Math.random() * Math.PI * 2;

        const mat = this._mats[Math.floor(Math.random() * this._mats.length)];
        const decal = new Mesh(this._geo, mat);
        decal.position.copy(hitPoint).addScaledVector(hitNormal, 0.001);
        decal.rotation.copy(_decalHelper.rotation);
        decal.renderOrder = 1;
        this._scene.add(decal);

        this._pool.push(decal);
        if (this._pool.length > this._maxDecals) {
            this._scene.remove(this._pool.shift());
        }
    }

    // 清空所有弹孔
    clear() {
        for (const d of this._pool) this._scene.remove(d);
        this._pool.length = 0;
    }
}
