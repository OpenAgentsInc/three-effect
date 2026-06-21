import {
    ACESFilmicToneMapping,
    AmbientLight,
    EquirectangularReflectionMapping,
    PerspectiveCamera,
    Scene,
    Vector3,
    WebGLRenderer,
} from "three";
import { MapControls } from "three/examples/jsm/Addons.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { playerController } from "../src/playerController";
import { SplatMesh, SparkRenderer } from "@sparkjsdev/spark";
import Stats from 'three/examples/jsm/libs/stats.module.js';

let player;
const scene = new Scene();

let camera;
let renderer;
let controls;
let gltfLoader;
let stats;

const pos = new Vector3(1.235, 1.21, -3.9);

const scaleNormal = 0.009;
const scaleSmall = 0.001;
let isSmallScale = false;
let scaleAnimFrame = null;
let isScaling = false;

init();

async function init() {
    const cont = document.querySelector("#container");

    // 渲染器
    renderer = new WebGLRenderer({ antialias: true });
    renderer.setSize(cont.clientWidth, cont.clientHeight);
    renderer.shadowMap.enabled = true;
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

    // 环境光
    const ambient = new AmbientLight(0xffffff, 10);
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

    // 帧率
    stats = new Stats();
    Object.assign(stats.dom.style, {
        position: "fixed",
        bottom: "0px",
        left: "0px",
        top: "auto",
        zIndex: "9998",
        display: "block",
    });
    document.body.appendChild(stats.dom);

    // 加载3DGS场景
    initGltfLoader();
    const spark = new SparkRenderer({ renderer });
    scene.add(spark);
    const splatURL = './3DGS/3DGS.sog'
    const splat = new SplatMesh({
        url: splatURL,
        onProgress: (e) => window.setLoaderProgress?.(e.loaded, e.total),
        onLoad: (mesh) => { mesh.rotateX(-Math.PI / 2); },
    });
    scene.add(splat);

    // 加载碰撞体
    const colliderGltf = await gltfLoader.loadAsync("./glb/3dgsCollider.glb");

    // 人物控制器
    player = new playerController();
    await player.init({
        scene,
        camera,
        controls,
        playerModelConfig: {
            url: "./glb/person5.glb",
            scale: scaleNormal,
            idleAnim: "Idle_4",
            walkAnim: "Walking_3",
            runAnim: "Run_2",
            jumpAnim: "Jump_1",
            flyAnim: "flying",
            flyIdleAnim: "flyIdle",
            headBoneName: "mixamorigHead",
            speed: 150,
            flySpeed: 1000,
            jumpHeight: 400,
        },
        initPos: pos,
        minCamDistance: 50,
        maxCamDistance: 180,
        camLookAtHeightRatio: 0.9,
        staticCollider: colliderGltf.scene,
        enableOverShoulderView: true,
    });

    // 设置材质
    player.getPlayerModel()?.traverse((child) => {
        if (child.isMesh) {
            // 设置金属材质
            child.material.metalness = 0.8;
            child.material.roughness = 0.0;
        }
    });

    window.addEventListener("resize", onWindowResize, false);
    // 监听按键
    window.addEventListener("keydown", (e) => {
        if (e.code !== "KeyZ") return;
        if (isScaling) return; // 缩放中不运行
        isSmallScale = !isSmallScale;
        animateToScale(isSmallScale ? scaleSmall : scaleNormal, 1);
    });
    // 等待高斯泼溅模型加载完毕再隐藏 loader
    await splat.initialized.catch(() => { });
    window.hideLoader();
}

function animateToScale(targetScale, duration = 0.5) {
    if (scaleAnimFrame !== null) {
        cancelAnimationFrame(scaleAnimFrame);
        scaleAnimFrame = null;
    }

    isScaling = true;
    const fromScale = player.getScale?.() ?? (isSmallScale ? scaleNormal : scaleSmall);
    const startTime = performance.now();

    const tick = (now) => {
        const t = Math.min((now - startTime) / (duration * 1000), 1);
        const current = fromScale + (targetScale - fromScale) * t;
        player.setPlayerScale(current);

        if (t < 1) {
            scaleAnimFrame = requestAnimationFrame(tick);
        } else {
            scaleAnimFrame = null;
            isScaling = false;
        }
    };

    scaleAnimFrame = requestAnimationFrame(tick);
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


// 每帧调用
function animate() {
    if (player) {
        player.update();
    } else {
        controls.update();
    }
    renderer.render(scene, camera);
    stats?.update();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(window.devicePixelRatio * 1);
}
