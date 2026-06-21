import {
    ACESFilmicToneMapping,
    AmbientLight,
    CircleGeometry,
    DoubleSide,
    Clock,
    EquirectangularReflectionMapping,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    PerspectiveCamera,
    Raycaster,
    Scene,
    SkeletonHelper,
    SphereGeometry,
    Vector2,
    Vector3,
    WebGLRenderer,
} from "three";
import { MapControls } from "three/examples/jsm/Addons.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { playerController } from "../src/playerController";
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { CSM } from "three/examples/jsm/csm/CSM.js";
import { createVolumeCloud, disposeVolumeCloud, updateVolumeCloud } from "./volumeCloud.js";

let player;
const scene = new Scene();

let camera;
let renderer;
let controls;
let gltfLoader;
let guiParams = null;
let raycastSphere = null;

let stats = null;
let csm = null;
let skeletonHelper = null;
let currentBlobUrl = null;
let platform = null;
let platformCloud = null;
let dynamicPlatforms = [];
const dynamicPlatformXPath = [
    new Vector3(20.94, 3.70, 14.89),
    new Vector3(-1.32, 7.65, 14.83),
    new Vector3(-19.85, 14.38, 8.77),
];
const dynamicPlatformXSegments = dynamicPlatformXPath.slice(0, -1).map((point, index) => ({
    from: point,
    to: dynamicPlatformXPath[index + 1],
    length: point.distanceTo(dynamicPlatformXPath[index + 1]),
}));
const dynamicPlatformXLength = dynamicPlatformXSegments.reduce((sum, segment) => sum + segment.length, 0);
const animClock = new Clock();

let globalScale = 1;
let previewMesh = null;
let previewMode = false;
let previewHintEl = null;

// CSM 基准参数
const CSM_BASE = { maxFar: 30, lightNear: 0.1, lightFar: 50, lightMargin: 30, lightIntensity: 10 };
const previewRaycaster = new Raycaster();
const previewMouse = new Vector2();

const modelUrl = "./glb/burnout_revenge_-_central_route_crash_junction.glb";
const pos = new Vector3(21.5, 4, 15);

// 人物模型配置
function easeEndsLinearMiddle(progress, easeRatio = 0.18) {
    const ease = Math.min(Math.max(easeRatio, 0.001), 0.49);
    const maxSpeed = 1 / (1 - ease);
    if (progress < ease) return (maxSpeed * progress * progress) / (2 * ease);
    if (progress > 1 - ease) return 1 - (maxSpeed * (1 - progress) * (1 - progress)) / (2 * ease);
    return maxSpeed * (progress - ease / 2);
}

// 根据整条路径的总长度定位平台
function setPositionOnXPath(mesh, progress) {
    if (!dynamicPlatformXSegments.length || dynamicPlatformXLength <= 0) return;

    let targetDistance = progress * dynamicPlatformXLength;
    for (const segment of dynamicPlatformXSegments) {
        if (targetDistance <= segment.length) {
            mesh.position.lerpVectors(segment.from, segment.to, targetDistance / segment.length);
            return;
        }
        targetDistance -= segment.length;
    }

    mesh.position.copy(dynamicPlatformXPath[dynamicPlatformXPath.length - 1]);
}

const PLAYER_MODELS = {
    person1: {
        url: "./glb/person1.glb",
        scale: 0.001,
        idleAnim: "idle1",
        walkAnim: "walk",
        runAnim: "run",
        jumpAnim: "jump",
        flyAnim: "flying",
        flyIdleAnim: "flyidle",
        enterCarAnim: "enterCar",
        exitCarAnim: "exitCar",
        headBoneName: "mixamorigHead",
        rotateY: Math.PI,
    },
    person2: {
        url: "./glb/person2.glb",
        scale: 0.001,
        idleAnim: "idle1",
        walkAnim: "walk",
        runAnim: "run",
        jumpAnim: "jump",
        flyAnim: "flying",
        flyIdleAnim: "flyidle",
        enterCarAnim: "enterCar",
        exitCarAnim: "exitCar",
        headBoneName: "mixamorigHead",
        rotateY: Math.PI,
    },
    person3: {
        url: "./glb/person3.glb",
        scale: 0.005,
        idleAnim: "idle",
        walkAnim: "walk",
        runAnim: "run",
        jumpAnim: "jump",
        flyAnim: "flying",
        flyIdleAnim: "flyidle",
        enterCarAnim: "enterCar",
        exitCarAnim: "exitCar",
        headBoneName: "mixamorigHead",
        rotateY: Math.PI,
    },
    person4: {
        url: "./glb/UEPerson.glb",
        scale: 0.001,
        idleAnim: "idle",
        walkAnim: "walk",
        runAnim: "run",
        jumpAnim: ["jumpStart", "jumpLoop", "jumpEnd"],
        flyAnim: "fly",
        flyIdleAnim: "flyIdle",
        flyHoverForwardAnim: "flyHoverForward",
        flyHoverBackAnim: "flyHoverBack",
        flyHoverLeftAnim: "flyHoverLeft",
        flyHoverRightAnim: "flyHoverRight",
        flyHoverUpAnim: "flyHoverUp",
        flyHoverDownAnim: "flyHoverDown",
        // headBoneName: "head",
        // firstPersonCameraOffset: [0, 0, 0],
        rotateY: Math.PI,
    },
};

// 车辆配置
const VEHICLE_CONFIGS = {
    bugatti: {
        url: "./glb/bugatti.glb",
        scale: 0.1,
        wheelsNames: ["Wheel_LF", "Wheel_RF", "Wheel_LR", "Wheel_RR"],
        animations: { openDoorAnim: "openDoorLF" },
        boardingPoint: new Vector3(0.6, 0, 1.8),
        seatOffset: new Vector3(0, 0.6, 0),
        chassisRatio: 0.15,
        suspensionRestLengthRatio: 0.2,
    },
    landRover: {
        url: "./glb/landRover.glb",
        scale: 0.08,
        wheelsNames: ["WheelFL", "WheelFR", "WheelBL", "WheelBR"],
        animations: { openDoorAnim: "opendoor" },
        boardingPoint: new Vector3(0.95, 0, 2.15),
        seatOffset: new Vector3(0, 0.7, 0),
        chassisRatio: 0.4,
        suspensionRestLengthRatio: 0.2,
    },
    tesla: {
        url: "./glb/tesla2.glb",
        scale: 0.09,
        wheelsNames: ["WHEEL_LF", "WHEEL_RF", "WHEEL_LR", "WHEEL_RR"],
        animations: { openDoorAnim: "opendoor" },
        boardingPoint: new Vector3(1, 0, 1.9),
        seatOffset: new Vector3(0.1, 0.5, 0),
        chassisRatio: 0.4,
        suspensionRestLengthRatio: 0.2,
        followVehicleDirection: false,
    },
};

init();

function setupCSMMaterial(material) {
    if (!material || !csm) return;
    const mats = Array.isArray(material) ? material : [material];
    mats.forEach((m) => csm.setupMaterial(m));
}

function createCSM(shadowMapSize, scale) {
    const c = new CSM({
        maxFar: CSM_BASE.maxFar * scale,
        cascades: 3,
        mode: "practical",
        parent: scene,
        shadowMapSize,
        shadowBias: -0.00001,
        lightDirection: new Vector3(-1, -2, -1).normalize(),
        lightIntensity: CSM_BASE.lightIntensity,
        lightNear: CSM_BASE.lightNear * scale,
        lightFar: CSM_BASE.lightFar * scale,
        camera,
        fade: true,
        lightMargin: CSM_BASE.lightMargin * scale,
    });
    c.lights.forEach((light, index) => {
        const biasMult = Math.pow(2, index);
        light.shadow.bias = -0.0001 * biasMult;
        light.shadow.normalBias = 0.002 * biasMult;
    });
    return c;
}

function recreateCSM(scale) {
    csm.remove();
    csm.dispose();
    const maxTextureSize = renderer.capabilities.maxTextureSize;
    csm = createCSM(Math.min(2048, maxTextureSize), scale);
    // 重新绑定场景内所有网格的材质
    scene.traverse((child) => {
        if (child.isMesh) setupCSMMaterial(child.material);
    });
}

function getScaledModel(key) {
    const m = PLAYER_MODELS[key];
    return { ...m, scale: m.scale * globalScale };
}

function getScaledVehicle(key) {
    const v = VEHICLE_CONFIGS[key];
    return { ...v, scale: v.scale * globalScale };
}

// 创建动态平台
function createDynamicPlatform({
    position,
    radius = 0.16,
    cloudScale = [0.32, 0.15, 0.32],
    motion = null,
}) {
    // 网格
    const mesh = new Mesh(
        new CircleGeometry(radius, 32),
        new MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.7, metalness: 0, roughness: 0.5, side: DoubleSide }),
    );
    mesh.position.copy(position);
    mesh.rotation.x = -Math.PI / 2;
    mesh.material.visible = false;
    scene.add(mesh);
    player.addDynamicCollider(mesh);

    // 体积云
    const cloud = createVolumeCloud({
        scale: cloudScale,
        opacity: 0.28,
        steps: 80,
    });
    cloud.position.set(0, 0, 0);
    cloud.rotation.x = Math.PI / 2;
    mesh.add(cloud);

    // 缓存数据
    const entry = {
        mesh,
        cloud,
        basePosition: position.clone(),
        motion,
    };
    dynamicPlatforms.push(entry);
    return entry;
}

// 更新动态平台
function updateDynamicPlatforms() {
    const t = animClock.getElapsedTime();
    dynamicPlatforms.forEach((entry) => {
        const { mesh, basePosition, motion, cloud } = entry;
        if (motion) {
            // 还原基点
            if (motion.axis === "y") {
                mesh.position.copy(basePosition);
                const amount = Math.sin(t * motion.speed) * motion.distance;
                // 纵向往返
                mesh.position.y = basePosition.y + amount + motion.distance;
            } else if (motion.axis === "x") {
                if (player.getActiveDynamicCollider()?.source === mesh && player.getIsOnGround()) {
                    const delta = entry.lastMotionTime === undefined ? 0 : t - entry.lastMotionTime;
                    entry.motionElapsed = (entry.motionElapsed ?? 0) + delta;

                    const phase = (entry.motionElapsed * motion.speed / Math.PI) % 2;
                    const rawProgress = phase <= 1 ? phase : 2 - phase;
                    const progress = easeEndsLinearMiddle(rawProgress);

                    setPositionOnXPath(mesh, progress);
                }
                entry.lastMotionTime = t;
            }
        }
        // 更新体积云
        updateVolumeCloud(cloud, camera);
    });
}

// 移除平台
function removeDynamicPlatforms() {
    dynamicPlatforms.forEach(({ mesh, cloud }) => {
        // 清理碰撞
        player?.removeDynamicCollider(mesh);
        disposeVolumeCloud(cloud);
        scene.remove(mesh);
    });
    dynamicPlatforms = [];
    platform = null;
    platformCloud = null;
}

async function init() {
    const cont = document.querySelector("#container");

    // 渲染器
    renderer = new WebGLRenderer({ antialias: true });
    renderer.setSize(cont.clientWidth, cont.clientHeight);
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setAnimationLoop(animate);
    cont.appendChild(renderer.domElement);

    // 相机
    camera = new PerspectiveCamera(60, cont.clientWidth / cont.clientHeight, 0.01, 1000);
    camera.position.copy(pos);
    camera.lookAt(pos.x, pos.y, pos.z + 1);

    // 控制器
    controls = new MapControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxDistance = 2000;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 1;
    controls.maxPolarAngle = Math.PI / 2;
    controls.target.set(pos.x, pos.y, pos.z + 1);

    const maxTextureSize = renderer.capabilities.maxTextureSize;
    const shadowMapSize = Math.min(2048, maxTextureSize);
    // 级联阴影
    csm = createCSM(shadowMapSize, 1);
    csm.lights.forEach((light, index) => {
        const biasMult = Math.pow(2, index);
        light.shadow.bias = -0.0001 * biasMult;
        light.shadow.normalBias = 0.002 * biasMult;
    });

    // 环境光
    const ambient = new AmbientLight(0xffffff, 5);
    scene.add(ambient);

    // 背景
    new HDRLoader().load(
        "./img/1.hdr",
        (texture) => {
            texture.mapping = EquirectangularReflectionMapping;
            scene.background = texture;
        },
        undefined,
        (err) => console.warn("HDR 加载失败：", err)
    );

    // 帧率显示
    stats = new Stats();
    Object.assign(stats.dom.style, {
        position: "fixed",
        bottom: "0",
        left: "0",
        top: "auto",
        zIndex: "9998",
    });
    document.body.appendChild(stats.dom);

    // 射线交点可视化小球
    const sphereGeo = new SphereGeometry(0.05, 16, 16);
    const sphereMat = new MeshBasicMaterial({ color: 0x00ffff, opacity: 0.8, transparent: true, depthTest: false });
    raycastSphere = new Mesh(sphereGeo, sphereMat);
    raycastSphere.visible = false;
    raycastSphere.renderOrder = 999;
    scene.add(raycastSphere);

    // 加载场景
    initGltfLoader();
    await initGLBScene(modelUrl);
    renderer.render(scene, camera);

    // 人物控制器
    player = new playerController();
    await player.init({
        scene,
        camera,
        controls,
        playerModelConfig: PLAYER_MODELS.person1,
        initPos: pos,
        minCamDistance: 50,
        maxCamDistance: 220,
        enableOverShoulderView: true,
    });

    // 骨骼可视化
    const playerModel = player.getPlayerModel();
    if (playerModel) {
        skeletonHelper = new SkeletonHelper(playerModel);
        skeletonHelper.visible = false;
        scene.add(skeletonHelper);
    }

    // 创建动态平台
    const liftPlatform = createDynamicPlatform({
        position: new Vector3(22, 2.76, 9.7),
        motion: { axis: "y", distance: 4, speed: 0.5 },
    });
    platform = liftPlatform.mesh;
    platformCloud = liftPlatform.cloud;

    createDynamicPlatform({
        position: dynamicPlatformXPath[0],
        motion: { axis: "x", distance: 3, speed: 0.1 },
    });

    // 阴影
    player.getPlayerModel()?.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            setupCSMMaterial(child.material);
        }
    });

    // 调试
    initGUI();

    window.addEventListener("resize", onWindowResize, false);

    // 关闭加载页面
    window.hideLoader();
}

// 初始化glb加载器
function initGltfLoader() {
    gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("https://unpkg.com/three@0.180.0/examples/jsm/libs/draco/");
    gltfLoader.setDRACOLoader(dracoLoader);
    const ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath("https://unpkg.com/three@0.180.0/examples/jsm/libs/basis/");
    ktx2Loader.detectSupport(renderer);
    gltfLoader.setKTX2Loader(ktx2Loader);
}

// 加载场景
async function initGLBScene(url, modelScale = [10, 10, 10]) {
    try {
        const gltf = await gltfLoader.loadAsync(url);
        const model = gltf.scene;
        model.name = "sceneGLB";
        model.scale.set(...modelScale);
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                setupCSMMaterial(child.material);
            }
        });
        scene.add(model);
    } catch (e) {
        console.error("GLB 加载失败：", e);
    }
}

// 更换场景
async function replaceScene(file) {
    const blobUrl = URL.createObjectURL(file);

    // 退出指针锁定
    if (document.pointerLockElement) {
        await new Promise((resolve) => {
            document.addEventListener("pointerlockchange", resolve, { once: true });
            document.exitPointerLock();
        });
    }

    // 移除旧场景并释放 GPU 资源
    const old = scene.getObjectByName("sceneGLB");
    if (old) {
        old.traverse((child) => {
            if (child.isMesh) {
                child.geometry?.dispose();
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach((m) => m?.dispose());
            }
        });
        scene.remove(old);
    }

    // 销毁旧玩家
    removeDynamicPlatforms();
    player?.destroy();
    player = null;

    // 加载新场景
    await initGLBScene(blobUrl, [1, 1, 1]);

    // 释放上一个 blob URL，保存新的
    if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = blobUrl;

    // 进入预览模式
    await enterPreviewMode(guiParams?.playerModel ?? "person1");
}

// 进入预览模式
async function enterPreviewMode(playerModelKey) {
    previewMode = true;

    const modelConfig = PLAYER_MODELS[playerModelKey];
    const gltf = await gltfLoader.loadAsync(modelConfig.url);
    previewMesh = gltf.scene;
    previewMesh.scale.setScalar(modelConfig.scale * globalScale);
    previewMesh.visible = false;
    previewMesh.traverse((child) => {
        if (child.isMesh) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m) => {
                m.transparent = true;
                m.opacity = 0.5;
                m.depthWrite = false;
            });
        }
    });
    scene.add(previewMesh);

    if (!previewHintEl) {
        previewHintEl = document.createElement("div");
        Object.assign(previewHintEl.style, {
            position: "fixed", bottom: "20px", left: "50%",
            transform: "translateX(-50%)", background: "rgba(0,0,0,0.65)",
            color: "#fff", padding: "12px 24px", borderRadius: "8px",
            fontSize: "14px", zIndex: "9999", textAlign: "center",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
        });
        const tip = document.createElement("span");
        tip.textContent = "移动鼠标预览人物位置 · 双击确认放置";
        const sliderRow = document.createElement("div");
        Object.assign(sliderRow.style, { display: "flex", alignItems: "center", gap: "8px" });
        const label = document.createElement("span");
        label.textContent = "人物比例：";
        // 对数刻度：slider在log10空间线性滑动，0.01~1000 各数量级间距相同
        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = "-2";   // log10(0.01)
        slider.max = "3";    // log10(1000)
        slider.step = "0.01";
        slider.value = String(Math.log10(globalScale));
        slider.style.width = "160px";
        const sliderVal = document.createElement("span");
        sliderVal.textContent = globalScale.toFixed(2);
        slider.addEventListener("input", () => {
            globalScale = Math.pow(10, parseFloat(slider.value));
            sliderVal.textContent = globalScale.toFixed(2);
            if (previewMesh) {
                previewMesh.scale.setScalar(modelConfig.scale * globalScale);
            }
        });
        sliderRow.append(label, slider, sliderVal);
        previewHintEl.append(tip, sliderRow);
        document.body.appendChild(previewHintEl);
    } else {
        // 重置滑块值
        const slider = previewHintEl.querySelector("input[type=range]");
        const sliderVal = previewHintEl.querySelector("span:last-child");
        if (slider) { slider.value = String(Math.log10(globalScale)); }
        if (sliderVal) { sliderVal.textContent = globalScale.toFixed(2); }
    }
    previewHintEl.style.display = "flex";

    renderer.domElement.addEventListener("mousemove", onPreviewMouseMove);
    renderer.domElement.addEventListener("dblclick", onPreviewDblClick);
}

// 退出预览模式
function exitPreviewMode() {
    previewMode = false;
    controls.enableZoom = true;

    if (previewMesh) {
        previewMesh.traverse((child) => {
            if (child.isMesh) {
                child.geometry?.dispose();
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach((m) => m?.dispose());
            }
        });
        scene.remove(previewMesh);
        previewMesh = null;
    }

    if (previewHintEl) previewHintEl.style.display = "none";

    renderer.domElement.removeEventListener("mousemove", onPreviewMouseMove);
    renderer.domElement.removeEventListener("dblclick", onPreviewDblClick);
}

// 预览：鼠标移动 → 射线交点跟随
function onPreviewMouseMove(e) {
    if (!previewMode || !previewMesh) return;
    previewMouse.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
    );
    previewRaycaster.setFromCamera(previewMouse, camera);
    const sceneModel = scene.getObjectByName("sceneGLB");
    if (!sceneModel) return;
    const hits = previewRaycaster.intersectObject(sceneModel, true);
    if (hits.length > 0) {
        previewMesh.position.copy(hits[0].point);
        previewMesh.visible = true;
    } else {
        previewMesh.visible = false;
    }
}

// 预览：双击 → 确认位置，初始化玩家
async function onPreviewDblClick() {
    if (!previewMode || !previewMesh?.visible) return;
    const initPos = previewMesh.position.clone();
    const spawnModel = getScaledModel(guiParams?.playerModel ?? "person1");
    initPos.y += 180 * spawnModel.scale * 0.75;
    exitPreviewMode();

    recreateCSM(globalScale);

    player = new playerController();
    await player.init({
        scene,
        camera,
        controls,
        playerModelConfig: getScaledModel(guiParams?.playerModel ?? "person1"),
        initPos,
        minCamDistance: 50,
        maxCamDistance: 220,
        colliderMeshUrl: currentBlobUrl,
        enableOverShoulderView: guiParams?.enableOverShoulderView ?? true,
        thirdMouseMode: guiParams?.thirdMouseMode ?? 1,
    });

    player.getPlayerModel()?.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            setupCSMMaterial(child.material);
        }
    });
}

// 每帧调用
function animate() {
    if (player) {
        player.update();
        updateCenterRaycast();
    } else {
        controls.update();
    }

    updateDynamicPlatforms();

    csm?.update();

    renderer.render(scene, camera);

    stats?.update();
}

// 更新中心射线交点
function updateCenterRaycast() {
    if (!guiParams?.centerRaycast) return;
    const hit = player.getCenterScreenRaycastHit();
    if (hit) {
        raycastSphere.position.copy(hit.point);
        raycastSphere.visible = true;
    } else {
        raycastSphere.visible = false;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(window.devicePixelRatio * 1);
}

// 调试
function initGUI() {
    const gui = new GUI({ title: "Debug Panel", width: 280 });
    Object.assign(gui.domElement.style, {
        position: "fixed",
        top: "12px",
        right: "12px",
        zIndex: "9999",
    });

    ["pointerdown", "mousedown", "click"].forEach((type) => {
        gui.domElement.addEventListener(type, (e) => e.stopPropagation());
    });

    // 上传场景按钮
    const uploadInput = document.createElement("input");
    uploadInput.type = "file";
    uploadInput.accept = ".gltf,.glb";
    uploadInput.style.display = "none";
    document.body.appendChild(uploadInput);
    uploadInput.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await replaceScene(file);
        uploadInput.value = ""; // 允许重复上传同名文件
    });
    gui.add({ upload: () => uploadInput.click() }, "upload").name("Change Scene (.glb/.gltf)");

    const params = {
        playerModel: "person1",
        vehicleType: "bugatti",
        showFPS: true,
        showShadow: false,
        mouseSensitivity: 5,
        gravity: -2400,
        jumpHeight: 600,
        playerSpeed: 300,
        flySpeed: 2100,
        playerAcceleration: 30,
        playerDeceleration: 30,
        timeScale: 1,
        minCamDistance: 50,
        maxCamDistance: 220,
        camLookAtHeightRatio: 0.8,
        enableSpringCamera: false,
        springCameraTime: 0.05,
        thirdMouseMode: 1,
        enableZoom: false,
        debug: false,
        enableOverShoulderView: true,
        centerRaycast: false,
        showSkeleton: false,
    };

    const defaults = { ...params };

    gui.add(params, "playerModel", Object.keys(PLAYER_MODELS))
        .name("Player Model")
        .onChange(async (v) => {
            await player.switchPlayerModel(getScaledModel(v));
            player.getPlayerModel()?.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    setupCSMMaterial(child.material);
                    if (v == "person4") {
                        child.material.metalness = 0.8;
                        child.material.roughness = 0.0;
                    }
                }
            });
            if (v == "person4") {
                player.registerAnimation("dodgeD", "dodgeD", {
                    loop: false,
                    clamp: true,
                });
                document.addEventListener("keydown", (e) => {
                    if (e.key.toLowerCase() === "q" && player.isFlying) {
                        player.playAnimation("dodgeD", { returnToPrev: true });
                    }
                });
            }

            // 重建骨骼可视化
            if (skeletonHelper) {
                scene.remove(skeletonHelper);
                skeletonHelper.dispose();
            }
            const newModel = player.getPlayerModel();
            if (newModel) {
                skeletonHelper = new SkeletonHelper(newModel);
                skeletonHelper.visible = params.showSkeleton;
                scene.add(skeletonHelper);
            }
        });

    const vehicleFolder = gui.addFolder("Add Vehicle");
    ["pointerdown", "mousedown", "click"].forEach((type) => {
        vehicleFolder.domElement.addEventListener(type, (e) => e.stopPropagation());
    });

    vehicleFolder.add(params, "vehicleType", Object.keys(VEHICLE_CONFIGS)).name("Vehicle Type");

    const spawnController = vehicleFolder.add(
        {
            spawn: async () => {
                if (player.getAllVehicles().length >= 5) {
                    alert("For performance reasons, the demo supports a maximum of 5 vehicles.");
                    return;
                }

                const cfg = VEHICLE_CONFIGS[params.vehicleType];
                if (!cfg) return;
                const playerPos = player.getPosition();

                // 取相机朝向的水平分量，沿该方向偏移生成车辆
                const camDir = new Vector3();
                camera.getWorldDirection(camDir);
                camDir.y = 0;
                camDir.normalize();

                const spawnPos = playerPos.clone().addScaledVector(camDir, 0.5);
                spawnPos.y = playerPos.y;

                await player.loadVehicleModel({ ...getScaledVehicle(params.vehicleType), position: spawnPos });
                player.getAllVehicles().at(-1)?.vehicleGroup?.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        setupCSMMaterial(child.material);
                        // 设置金属材质
                        child.material.metalness = 0.8;
                        child.material.roughness = 0.0;
                    }
                });
            },
        },
        "spawn"
    ).name("Spawn Vehicle");

    ["pointerdown", "mousedown", "click"].forEach((type) => {
        spawnController.domElement.addEventListener(type, (e) => e.stopPropagation());
    });

    gui.add(params, "showFPS").name("Show FPS").onChange((v) => stats.dom.style.display = v ? "block" : "none");
    gui.add(params, "showShadow").name("Show Shadow").onChange((v) => {
        renderer.shadowMap.enabled = v;
        scene.traverse((child) => {
            if (child.isMesh) {
                child.material.needsUpdate = true;
            }
        });
    });
    gui.add(params, "mouseSensitivity", 1, 20, 0.1).onChange((v) => player.setMouseSensitivity(v));
    gui.add(params, "gravity", -6000, 0, 50).onChange((v) => player.setGravity(v));
    gui.add(params, "jumpHeight", 0, 2000, 10).onChange((v) => player.setJumpHeight(v));
    gui.add(params, "playerSpeed", 0, 10000, 10).onChange((v) => player.setPlayerSpeed(v));
    gui.add(params, "flySpeed", 0, 5000, 10).onChange((v) => player.setPlayerFlySpeed(v));
    gui.add(params, "playerAcceleration", 1, 100, 1).name("Acceleration").onChange((v) => player.playerAcceleration = v);
    gui.add(params, "playerDeceleration", 1, 100, 1).name("Deceleration").onChange((v) => player.playerDeceleration = v);
    gui.add(params, "timeScale", 0, 3, 0.05).name("Time Scale").onChange((v) => player.timeScale = v);
    gui.add(params, "minCamDistance", 0, 200, 1).onChange((v) => player.setMinCamDistance(v));
    gui.add(params, "maxCamDistance", 50, 1000, 1).onChange((v) => player.setMaxCamDistance(v));
    gui.add(params, "camLookAtHeightRatio", 0, 1, 0.01).onChange((v) => player.setCamLookAtHeightRatio(v));
    gui.add(params, "enableSpringCamera").name("Spring Camera").onChange((v) => player.cam.enableSpringCamera = v);
    gui.add(params, "springCameraTime", 0.01, 1, 0.01).name("Spring Time").onChange((v) => player.cam.springCameraTime = v);
    gui.add(params, "thirdMouseMode", { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }).onChange((v) => player.setThirdMouseMode(Number(v)));
    gui.add(params, "enableZoom").onChange((v) => player.setEnableZoom(v));
    gui.add(params, "debug").onChange((v) => player.setDebug(v));
    gui.add(params, "enableOverShoulderView").onChange((v) => player.setOverShoulderView(v));
    gui.add(params, "centerRaycast").name("Center Raycast Debug")
        .onChange((v) => { if (!v) raycastSphere.visible = false; });
    gui.add(params, "showSkeleton").name("Show Skeleton")
        .onChange((v) => { if (skeletonHelper) skeletonHelper.visible = v; });

    const resetController = gui.add(
        {
            resetToDefault: () => {
                Object.assign(params, defaults);
                gui.controllers.forEach((c) => c.updateDisplay());
                gui.folders.forEach((f) => f.controllers.forEach((c) => c.updateDisplay()));

                player.setMouseSensitivity(defaults.mouseSensitivity);
                player.setGravity(defaults.gravity);
                player.setJumpHeight(defaults.jumpHeight);
                player.setPlayerSpeed(defaults.playerSpeed);
                player.setPlayerFlySpeed(defaults.flySpeed);
                player.timeScale = defaults.timeScale;
                player.setMinCamDistance(defaults.minCamDistance);
                player.setMaxCamDistance(defaults.maxCamDistance);
                player.setThirdMouseMode(defaults.thirdMouseMode);
                player.setEnableZoom(defaults.enableZoom);
                player.setDebug(defaults.debug);
                player.setOverShoulderView(defaults.enableOverShoulderView);
                raycastSphere.visible = false;

                if (stats) stats.dom.style.display = "none";
            },
        },
        "resetToDefault"
    ).name("Reset to Default");

    ["pointerdown", "mousedown", "click"].forEach((type) => {
        resetController.domElement.addEventListener(type, (e) => e.stopPropagation());
    });

    guiParams = params;
}
