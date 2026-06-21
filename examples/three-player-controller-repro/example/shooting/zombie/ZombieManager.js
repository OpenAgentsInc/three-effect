import { Vector3 } from "three";
import { ZombieEntity } from "./ZombieEntity.js";

export class ZombieManager {
    constructor(scene, options = {}) {
        // ==================== 场景引用 ====================
        this._scene = scene;

        // ==================== 丧尸配置 ====================
        this._loader = options.loader ?? null; // GLTF 加载器
        this._collider = options.collider ?? null; // 静态碰撞体
        this._modelUrl = options.modelUrl ?? ""; // 模型路径
        this._scale = options.scale ?? 0.01; // 模型缩放
        this._rotateY = options.rotateY ?? Math.PI; // 模型初始朝向
        this._speed = options.speed ?? 120; // 移速基准值
        this._walkAnim = options.walkAnim ?? "walking"; // 行走动画名
        this._runAnim = options.runAnim ?? "running"; // 奔跑动画名
        this._idleAnim = options.idleAnim ?? "Idle"; // 待机动画名
        this._punchAnim = options.punchAnim ?? "punching"; // 攻击动画名
        this._deathAnim = options.deathAnim ?? "dying"; // 死亡动画名
        // ==================== 运行状态 ====================
        this._zombies = new Map(); // id → ZombieEntity
        this._wave = 0; // 当前波次
        this._nextId = 0; // 自增 id 计数器
    }

    // ==================== 波次 / 生成 ====================

    // 按波次配置批量生成丧尸
    async startWave(waveConfig = {}) {
        if (!this._loader || !this._collider || !this._modelUrl) {
            console.warn("[ZombieManager] Missing loader, collider or modelUrl");
            return;
        }

        this._wave += 1;

        const origin = waveConfig.origin?.clone?.() ?? waveConfig.origin ?? new Vector3();
        const count = waveConfig.count ?? 5;
        const radius = waveConfig.radius ?? 10; // 默认半径 10
        const spawnHeight = waveConfig.spawnHeight ?? 0.5; // 对应参数 y

        let spawnPoints = waveConfig.spawnPoints;

        // 如果没有预设点，则根据半径和高度生成随机点
        if (!spawnPoints) {
            spawnPoints = [];
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const r = Math.sqrt(Math.random()) * radius; // 使用开方确保在圆盘内分布均匀
                const x = Math.cos(angle) * r;
                const z = Math.sin(angle) * r;
                spawnPoints.push(new Vector3(origin.x + x, origin.y + spawnHeight, origin.z + z));
            }
        }

        await Promise.all(spawnPoints.map((point) => this.spawnZombie(point)));
    }

    // 在指定位置生成单个丧尸，返回其 id
    async spawnZombie(position) {
        const id = `zombie_${this._nextId++}`;
        const entity = new ZombieEntity(this._scene, id);
        await entity.load(this._loader, {
            modelUrl: this._modelUrl,
            collider: this._collider,
            position: position.clone?.() ?? new Vector3(position.x, position.y, position.z),
            scale: this._scale,
            walkAnim: this._walkAnim,
            runAnim: this._runAnim,
            idleAnim: this._idleAnim,
            punchAnim: this._punchAnim,
            deathAnim: this._deathAnim,
            rotateY: this._rotateY,
            speed: this._speed,
        });
        this._zombies.set(id, entity);
        return id;
    }

    // ==================== 命中 ====================

    // 武器命中回调，转发伤害给对应实体
    onHit(id, damage) {
        const entity = this._zombies.get(id);
        if (!entity || entity.isDead) return;
        entity.takeDamage(damage);
    }

    // ==================== 主循环 ====================

    update(dt, playerPos) {
        if (!playerPos) return;

        for (const [id, entity] of this._zombies.entries()) {
            entity.update(dt, playerPos);

            // 如果丧尸已死亡且超过10秒，则彻底移除
            if (entity.isDead && entity.getDeathTime() >= 10) {
                entity.destroy();
                this._zombies.delete(id);
            }
        }

        this._resolveZombieOverlaps();
    }

    // 解决丧尸之间的胶囊重叠（两两推开，仅处理水平方向）
    _resolveZombieOverlaps() {
        const entities = Array.from(this._zombies.values()).filter(e => !e.isDead);
        for (let i = 0; i < entities.length; i++) {
            const a = entities[i];
            const aCapsule = a.getCapsule();
            const aInfo = a.getCapsuleInfo();
            if (!aCapsule || !aInfo) continue;

            for (let j = i + 1; j < entities.length; j++) {
                const b = entities[j];
                const bCapsule = b.getCapsule();
                const bInfo = b.getCapsuleInfo();
                if (!bCapsule || !bInfo) continue;

                const dx = bCapsule.position.x - aCapsule.position.x;
                const dz = bCapsule.position.z - aCapsule.position.z;
                const distSq = dx * dx + dz * dz;
                const minDist = aInfo.radius + bInfo.radius;

                if (distSq >= minDist * minDist || distSq <= 1e-10) continue;

                const dist = Math.sqrt(distSq);
                const half = (minDist - dist) * 0.5; // 各推开一半
                const nx = dx / dist;
                const nz = dz / dist;
                aCapsule.position.x -= nx * half;
                aCapsule.position.z -= nz * half;
                bCapsule.position.x += nx * half;
                bCapsule.position.z += nz * half;
            }
        }
    }

    // ==================== 销毁 ====================

    destroy() {
        for (const entity of this._zombies.values()) {
            entity.destroy();
        }
        this._zombies.clear();
    }
}
