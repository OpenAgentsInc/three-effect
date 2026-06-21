import * as THREE from "three";

// ==================== 路径节点 ====================

// A* 路径节点
class PathNode {
    position: THREE.Vector3;
    g: number = Infinity; // 实际代价
    h: number = 0;        // 估计代价
    f: number = Infinity; // f = g + h
    parent: PathNode | null = null;

    constructor(position: THREE.Vector3) {
        this.position = position.clone();
    }

    // 判断节点相等
    equals(other: PathNode): boolean {
        return this.position.distanceTo(other.position) < 0.01;
    }
}

// ==================== 优先队列 ====================

// A* 开放列表用优先队列
class PriorityQueue<T> {
    elements: Array<{ priority: number; item: T }> = [];

    // 入队并排序
    enqueue(item: T, priority: number) {
        this.elements.push({ priority, item });
        this.elements.sort((a, b) => a.priority - b.priority);
    }

    // 出队最小优先级
    dequeue(): T | undefined {
        return this.elements.shift()?.item;
    }

    isEmpty(): boolean {
        return this.elements.length === 0;
    }

    contains(item: T, compareFn: (a: T, b: T) => boolean): boolean {
        return this.elements.some((e) => compareFn(e.item, item));
    }

    // 更新节点优先级
    update(item: T, newPriority: number, compareFn: (a: T, b: T) => boolean) {
        const index = this.elements.findIndex((e) => compareFn(e.item, item));
        if (index !== -1) {
            this.elements[index].priority = newPriority;
            this.elements.sort((a, b) => a.priority - b.priority);
        }
    }
}

// ==================== 接口定义 ====================

// 障碍物检测接口
export interface ObstacleChecker {
    // 检查两点间是否被障碍物阻挡
    isBlocked(start: THREE.Vector3, end: THREE.Vector3): boolean;
    // 获取障碍物周围导航节点
    getNavigationNodes(start: THREE.Vector3, goal: THREE.Vector3): THREE.Vector3[];
}

// 路径规划器配置
export interface PathPlannerConfig {
    debugEnabled?: boolean; // 路径可视化开关
    scene?: THREE.Scene; // 用于可视化的场景
    scale?: number;      // 缩放系数
}

// ==================== 路径规划器 ====================

// A* 路径规划器
export class PathPlanner {
    obstacleChecker: ObstacleChecker;
    config: PathPlannerConfig;
    debugLines: THREE.Line[] = [];
    debugPoints: THREE.Mesh[] = [];

    constructor(obstacleChecker: ObstacleChecker, config: PathPlannerConfig = {}) {
        this.obstacleChecker = obstacleChecker;
        this.config = { debugEnabled: false, scale: 1, ...config };
    }

    // 启发式距离
    private heuristic(a: THREE.Vector3, b: THREE.Vector3): number {
        return a.distanceTo(b);
    }

    // A* 寻路主入口
    findPath(start: THREE.Vector3, goal: THREE.Vector3): THREE.Vector3[] {
        // 直线可达则直接返回
        if (!this.obstacleChecker.isBlocked(start, goal)) return [goal];

        // 生成候选导航节点
        const navigationPoints = this.obstacleChecker.getNavigationNodes(start, goal);
        const allNodes = [new PathNode(start), new PathNode(goal), ...navigationPoints.map((p) => new PathNode(p))];

        if (allNodes.length < 2) {
            console.warn("导航节点不足，返回直线路径");
            return [goal];
        }

        const startNode = allNodes[0];
        const goalNode = allNodes[1];

        // 初始化起点代价
        startNode.g = 0;
        startNode.h = this.heuristic(startNode.position, goalNode.position);
        startNode.f = startNode.h;

        const openList = new PriorityQueue<PathNode>();
        const closedSet = new Set<PathNode>();
        const nodeEquals = (a: PathNode, b: PathNode) => a.equals(b);
        openList.enqueue(startNode, startNode.f);

        // A* 主循环
        while (!openList.isEmpty()) {
            const current = openList.dequeue();
            if (!current) break;

            // 到达目标，重建路径
            if (current.equals(goalNode)) {
                const path = this.reconstructPath(current);
                if (this.config.debugEnabled) this.visualizePath([start, ...path]);
                return path;
            }

            closedSet.add(current);

            // 遍历所有邻居节点
            for (const neighbor of allNodes) {
                if (closedSet.has(neighbor)) continue;
                if (this.obstacleChecker.isBlocked(current.position, neighbor.position)) continue;

                const tentativeG = current.g + current.position.distanceTo(neighbor.position);
                if (tentativeG < neighbor.g) {
                    neighbor.parent = current;
                    neighbor.g = tentativeG;
                    neighbor.h = this.heuristic(neighbor.position, goalNode.position);
                    neighbor.f = neighbor.g + neighbor.h;

                    if (openList.contains(neighbor, nodeEquals)) openList.update(neighbor, neighbor.f, nodeEquals);
                    else openList.enqueue(neighbor, neighbor.f);
                }
            }
        }

        console.warn("A* 未找到路径，使用直线路径");
        return [goal];
    }

    // 重建路径
    private reconstructPath(endNode: PathNode): THREE.Vector3[] {
        const path: THREE.Vector3[] = [];
        let current: PathNode | null = endNode;
        while (current !== null) {
            path.unshift(current.position.clone());
            current = current.parent;
        }
        // 移除起点，再平滑
        if (path.length > 0) path.shift();
        return this.smoothPath(path);
    }

    // 路径平滑优化
    private smoothPath(path: THREE.Vector3[]): THREE.Vector3[] {
        if (path.length <= 2) return path;
        const smoothed: THREE.Vector3[] = [path[0]];
        let current = 0;
        while (current < path.length - 1) {
            // 尽量跳过中间节点
            let farthest = current + 1;
            for (let i = path.length - 1; i > current + 1; i--) {
                if (!this.obstacleChecker.isBlocked(path[current], path[i])) { farthest = i; break; }
            }
            smoothed.push(path[farthest]);
            current = farthest;
        }
        return smoothed;
    }

    // 可视化路径
    private visualizePath(path: THREE.Vector3[]) {
        if (!this.config.scene || !this.config.debugEnabled) return;
        this.clearVisualization();
        const scale = this.config.scale || 1;

        // 绘制路径连线
        if (path.length > 1) {
            const geometry = new THREE.BufferGeometry().setFromPoints(path.map(p => p.clone()));
            const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 }));
            this.config.scene.add(line);
            this.debugLines.push(line);
        }

        // 绘制路径节点球体
        path.forEach((point, index) => {
            const sphere = new THREE.Mesh(
                new THREE.SphereGeometry(20 * scale),
                new THREE.MeshBasicMaterial({ color: index === path.length - 1 ? 0xff0000 : 0x00ff00 }),
            );
            sphere.position.copy(point);
            this.config.scene!.add(sphere);
            this.debugPoints.push(sphere);
        });
    }

    // 清除路径可视化
    clearVisualization() {
        if (!this.config.scene) return;
        this.debugLines.forEach(line => {
            this.config.scene!.remove(line);
            line.geometry.dispose();
            (line.material as THREE.Material).dispose();
        });
        this.debugLines = [];
        this.debugPoints.forEach(point => {
            this.config.scene!.remove(point);
            point.geometry.dispose();
            (point.material as THREE.Material).dispose();
        });
        this.debugPoints = [];
    }

    // 更新配置
    updateConfig(config: Partial<PathPlannerConfig>) {
        this.config = { ...this.config, ...config };
    }

    // 销毁规划器
    dispose() {
        this.clearVisualization();
    }
}