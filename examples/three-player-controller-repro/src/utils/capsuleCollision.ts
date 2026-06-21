import * as THREE from "three";

// 胶囊碰撞所需的临时对象
export interface CollisionTemps {
    invMat: THREE.Matrix4;    // 碰撞体世界矩阵的逆矩阵
    localSeg: THREE.Line3;    // 胶囊段在碰撞体本地空间的副本
    localBox: THREE.Box3;     // 胶囊段在碰撞体本地空间的包围盒
    closestSeg: THREE.Vector3; // 胶囊段最近点
    closestTri: THREE.Vector3; // 三角面最近点
}

// 创建一组预分配的临时对象
export function createCollisionTemps(): CollisionTemps {
    return {
        invMat: new THREE.Matrix4(),
        localSeg: new THREE.Line3(),
        localBox: new THREE.Box3(),
        closestSeg: new THREE.Vector3(),
        closestTri: new THREE.Vector3(),
    };
}

/**
 * 将胶囊与单个网格做 BVH 碰撞检测
 * @param capsule       胶囊所在的 Object3D（位置会被直接修改）
 * @param capsuleInfo   胶囊描述：局部空间线段 + 半径
 * @param collider      目标碰撞网格
 * @param temps         预分配临时对象
 * @param skipTri       可选：返回 true 则跳过该三角面
 */
export function applyCapsuleCollision(
    capsule: THREE.Object3D,
    capsuleInfo: { segment: THREE.Line3; radius: number },
    collider: THREE.Mesh,
    temps: CollisionTemps,
    skipTri?: (tri: any, dir: THREE.Vector3) => boolean,
): void {
    // 胶囊段变换到碰撞体本地空间
    temps.invMat.copy(collider.matrixWorld).invert();
    temps.localSeg.start.copy(capsuleInfo.segment.start).applyMatrix4(capsule.matrixWorld).applyMatrix4(temps.invMat);
    temps.localSeg.end.copy(capsuleInfo.segment.end).applyMatrix4(capsule.matrixWorld).applyMatrix4(temps.invMat);

    // 构建本地包围盒
    temps.localBox.makeEmpty();
    temps.localBox.expandByPoint(temps.localSeg.start).expandByPoint(temps.localSeg.end);
    temps.localBox.expandByScalar(capsuleInfo.radius);

    // 碰撞查询
    (collider.geometry as any)?.boundsTree?.shapecast({
        intersectsBounds: (box: THREE.Box3) => box.intersectsBox(temps.localBox),
        intersectsTriangle: (tri: any) => {
            // 初步筛选
            const distance = tri.closestPointToSegment(temps.localSeg, temps.closestSeg, temps.closestTri);
            if (distance >= capsuleInfo.radius) return;

            // 二次筛选
            const dir = temps.closestTri.clone().sub(temps.closestSeg).normalize();
            if (skipTri?.(tri, dir)) return;

            // 推开胶囊段
            temps.localSeg.start.addScaledVector(dir, capsuleInfo.radius - distance);
            temps.localSeg.end.addScaledVector(dir, capsuleInfo.radius - distance);
        },
    });

    // 应用碰撞修正
    const newPos = temps.closestSeg.copy(temps.localSeg.start).applyMatrix4(collider.matrixWorld);
    const delta = temps.closestTri.subVectors(newPos, capsule.position);
    const offset = Math.max(0, delta.length() - 1e-5);
    capsule.position.add(delta.normalize().multiplyScalar(offset));
}