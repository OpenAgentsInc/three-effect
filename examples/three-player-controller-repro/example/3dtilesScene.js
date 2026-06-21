import { TilesRenderer } from "3d-tiles-renderer";
import { CesiumIonAuthPlugin } from "3d-tiles-renderer/core/plugins";
import { GLTFExtensionsPlugin, LoadRegionPlugin, ReorientationPlugin, SphereRegion, TileCompressionPlugin, TilesFadePlugin } from "3d-tiles-renderer/plugins";
import { ACESFilmicToneMapping, AmbientLight, DirectionalLight, EquirectangularReflectionMapping, MathUtils, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { playerController } from "../src/playerController";
import Stats from 'three/examples/jsm/libs/stats.module.js';

let player = null;

let camera;
let controls;
let tiles;
let renderer;
let scene;
let stats;

// 区域裁剪
let nearRegionPlugin = null;
let farRegionPlugin = null;
let nearRegion = null;
let farRegion = null;
const NEAR_RADIUS = 5;
const FAR_RADIUS = 20;

init();

async function init() {
    scene = new Scene();

    const cont = document.querySelector("#container");

    // 渲染器
    renderer = new WebGLRenderer({ antialias: true });
    renderer.setSize(cont.clientWidth, cont.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.6;
    renderer.setAnimationLoop(animate);
    cont.appendChild(renderer.domElement);

    // 相机
    camera = new PerspectiveCamera(60, cont.clientWidth / cont.clientHeight, 0.01, 10000);
    camera.position.set(1e3, 1e3, 1e3).multiplyScalar(0.5);

    // 控制器
    controls = new OrbitControls(camera, renderer.domElement);

    // 平行光
    const color = 0xffffff;
    const intensity = 10;
    const light = new DirectionalLight(color, intensity);
    light.position.set(50, 50, 50);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.camera.top = 40;
    light.shadow.camera.bottom = -40;
    light.shadow.camera.left = -40;
    light.shadow.camera.right = 40;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.bias = -0.0005;
    light.shadow.camera.near = 0;
    light.shadow.camera.far = 100;
    scene.add(light);
    scene.add(light.target);
    // 环境光
    const ambient = new AmbientLight(0xffffff, 3.0);
    scene.add(ambient);

    // 背景
    new HDRLoader().load(
        "./img/1.hdr",
        (texture) => {
            texture.mapping = EquirectangularReflectionMapping;
            scene.background = texture;
        },
        undefined,
        (err) => {
            console.warn("HDR 加载失败：", err);
        }
    );

    // 帧率
    stats = new Stats();
    Object.assign(stats.dom.style, {
        position: "fixed",
        bottom: "0",
        left: "0",
        top: "auto",
        zIndex: "9998",
        display: "block",
    });
    document.body.appendChild(stats.dom);

    // 3DTiles
    reinstantiateTiles();

    await initPlayer();

    // 窗口大小监听
    onWindowResize();
    window.addEventListener("resize", onWindowResize, false);

    // 关闭加载页面
    window.hideLoader();
}

// 初始化区域裁剪插件
function initRegionCull() {
    nearRegionPlugin = new LoadRegionPlugin();
    tiles.registerPlugin(nearRegionPlugin);
    farRegionPlugin = new LoadRegionPlugin();
    tiles.registerPlugin(farRegionPlugin);

    nearRegion = new SphereRegion();
    nearRegion.sphere.radius = NEAR_RADIUS;
    nearRegion.errorTarget = 0;
    nearRegionPlugin.addRegion(nearRegion);

    farRegion = new SphereRegion();
    farRegion.sphere.radius = FAR_RADIUS;
    farRegion.errorTarget = 2;
    farRegionPlugin.addRegion(farRegion);

}

// 初始化玩家控制器
async function initPlayer() {
    renderer.render(scene, camera);

    // 加载碰撞体
    const colliderGltf = await new GLTFLoader().loadAsync("./glb/EiffelCollider.glb");

    // 初始化玩家控制器
    player = new playerController();
    await player.init({
        scene,
        camera,
        controls,
        playerModelConfig: {
            url: "./glb/person2.glb",
            scale: 0.01,
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
        initPos: new Vector3(100, 100, 100),
        minCamDistance: 50,
        maxCamDistance: 250,
        staticCollider: colliderGltf.scene,
        thirdMouseMode: 1,
        enableOverShoulderView: true,
    });

    initRegionCull();

    await player.loadVehicleModel({
        url: "./glb/tesla.glb",
        scale: 0.9,
        position: new Vector3(80, 80, 80),
        wheelsNames: [
            "WHEEL_LF", // 前左
            "WHEEL_RF", // 前右
            "WHEEL_LR", // 后左
            "WHEEL_RR", // 后右
        ],
        animations: {
            openDoorAnim: "opendoor",
        },
        boardingPoint: new Vector3(1, 0, 1.9),
        seatOffset: new Vector3(0.1, 0.5, 0),
        chassisRatio: 0.4,
        suspensionRestLengthRatio: 0.2,
        followVehicleDirection: false,
        speedMultiplier: 1.5,
    });
}

// 创建3DTiles渲染器
function reinstantiateTiles() {
    tiles = new TilesRenderer();
    const apiToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmMzgwMGY3ZS1jOTMwLTQyNmQtOTkyNS03MDE4ZjlkYmY0MTYiLCJpZCI6MjIzMDk3LCJpYXQiOjE3MTg3NjgwNTN9.FcpK7jiFPzWZL8m6VxRbG7ly8LMecpXnDAMZJX_UehM";
    tiles.registerPlugin(
        new CesiumIonAuthPlugin({
            apiToken: apiToken,
            assetId: "2275207",
            autoRefreshToken: true,
        })
    );
    tiles.registerPlugin(new TileCompressionPlugin());
    tiles.registerPlugin(new TilesFadePlugin());
    tiles.registerPlugin(
        new GLTFExtensionsPlugin({
            dracoLoader: new DRACOLoader().setDecoderPath("https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/"),
        })
    );
    tiles.registerPlugin(
        new ReorientationPlugin({
            lat: 48.8584 * MathUtils.DEG2RAD,
            lon: 2.2945 * MathUtils.DEG2RAD,
        })
    );

    scene.add(tiles.group);
    tiles.setResolutionFromRenderer(camera, renderer);
    tiles.setCamera(camera);
}

// 渲染循环更新
function animate() {
    if (!tiles) return;

    tiles.setResolutionFromRenderer(camera, renderer);
    tiles.setCamera(camera);
    camera.updateMatrixWorld();
    tiles.update();

    if (player) {
        player.update();
        if (nearRegion && farRegion) {
            const pos = player.getPosition();
            nearRegion.sphere.center.copy(pos).applyMatrix4(tiles.group.matrixWorldInverse);
            farRegion.sphere.center.copy(pos).applyMatrix4(tiles.group.matrixWorldInverse);
        }
    }

    renderer.render(scene, camera);

    stats?.update();
}

// 响应窗口尺寸变化
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    renderer.setSize(window.innerWidth, window.innerHeight);

    camera.updateProjectionMatrix();
    renderer.setPixelRatio(window.devicePixelRatio);
    tiles.setResolutionFromRenderer(camera, renderer);
}
