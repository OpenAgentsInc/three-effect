import {
    ACESFilmicToneMapping,
    DirectionalLight,
    MathUtils,
    Matrix3,
    Matrix4,
    PerspectiveCamera,
    Raycaster,
    Scene,
    Sphere,
    Vector2,
    Vector3,
    VSMShadowMap,
    WebGLRenderer,
    MeshPhysicalMaterial,
    PMREMGenerator
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Sky } from "three/addons/objects/Sky.js";
import { LightProbeGrid } from "three/addons/lighting/LightProbeGrid.js";
import { LightProbeGridHelper } from "three/addons/helpers/LightProbeGridHelper.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

import { TilesRenderer } from "3d-tiles-renderer";
import { TilesFadePlugin } from "3d-tiles-renderer/plugins";
import { playerController } from "../src/playerController";

const floorUrls = [
    "bim/1F/tileset.json",
    "bim/2F/tileset.json",
    "bim/3F/tileset.json",
    "bim/4F/tileset.json",
    "bim/5F/tileset.json",
    "bim/6F/tileset.json",
    "bim/7F/tileset.json",
    "bim/8F/tileset.json",
    "bim/9F/tileset.json",
    "bim/10F/tileset.json",
];

//  楼层 Mesh 材质配置
const floorMeshConfig = [
    // 0: 1F
    {
        mesh_0_29: 'glass',
    },
    // 1: 2F
    {
        mesh_0_12: 'glass',
    },
    // 2: 3F
    {
        mesh_0_8: 'glass',
    },
    // 3: 4F
    {
        mesh_0_9: 'glass',
    },
    // 4: 5F
    {
        mesh_0_5: 'glass',
    },
    // 5: 6F
    {
        mesh_0_6: 'glass',
    },
    // 6: 7F
    {
        mesh_0_16: 'glass',
    },
    // 7: 8F
    {
        mesh_0_6: 'glass',
    },
    // 8: 9F
    {
        mesh_0_13: 'glass',
    },
    // 9: 10F
    {
        mesh_0_11: 'glass',
    },
];

//  材质处理函数 
const materialHandlers = {
    glass(c) {
        const orig = c.material;
        c.material = new MeshPhysicalMaterial({
            map: orig.map || null,
            normalMap: orig.normalMap || null,
            roughnessMap: orig.roughnessMap || null,
            metalnessMap: orig.metalnessMap || null,
            aoMap: orig.aoMap || null,
            metalness: 0,
            roughness: 0.0,
            transmission: 0.9,
            ior: 1.6,
            transparent: true,
            opacity: 0.85,
            envMapIntensity: 1.0,
            thickness: 0.1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
        });
        c.material.needsUpdate = true;
    },
    floor(c) {
        const orig = c.material;
        c.material = new MeshPhysicalMaterial({
            map: orig.map || null,
            normalMap: orig.normalMap || null,
            roughnessMap: orig.roughnessMap || null,
            aoMap: orig.aoMap || null,
            metalness: 0.0,
            roughness: 0.3,
            envMapIntensity: 0.8,
            clearcoat: 0.6,
            clearcoatRoughness: 0.1,
        });
        c.material.needsUpdate = true;
        c.castShadow = params.shadows;
        c.receiveShadow = params.shadows;
        c.frustumCulled = false;
    },
    metal(c) {
        const orig = c.material;
        c.material = new MeshPhysicalMaterial({
            map: orig.map || null,
            normalMap: orig.normalMap || null,
            roughnessMap: orig.roughnessMap || null,
            metalnessMap: orig.metalnessMap || null,
            aoMap: orig.aoMap || null,
            metalness: 1.0,
            roughness: 0.0,
            envMapIntensity: 1.5,
        });
        c.material.needsUpdate = true;
        c.castShadow = params.shadows;
        c.receiveShadow = params.shadows;
        c.frustumCulled = false;
    },
    hidden(c) {
        c.geometry?.dispose();
        if (Array.isArray(c.material)) {
            c.material.forEach(m => m.dispose());
        } else {
            c.material?.dispose();
        }
        c.removeFromParent();
    },
    _default(c) {
        c.castShadow = params.shadows;
        c.receiveShadow = params.shadows;
        c.frustumCulled = false;
    },
};

const scene = new Scene();
const gltfLoader = new GLTFLoader();
const stats = new Stats();

let camera;
let renderer;
let controls;
const tilesList = [];
let tilesUpdateEnabled = true;
let player = null;
let isUpdatePlayer = false;
let gui;

let probes = null;
let probesHelper = null;
let sky;
let pmremGenerator = null;
const sun = new Vector3();
let dirLight;

const params = {
    enabled: true,
    showProbes: false,
    skyEnvMap: false,
    probeSize: 0.25,
    boundsX: 0,
    boundsY: 19,
    boundsZ: -8,
    sizeX: 60,
    sizeY: 37,
    sizeZ: 20,
    countX: 14,
    countY: 12,
    countZ: 5,
    lightAzimuth: 45,
    lightElevation: 19,
    lightIntensity: 50,
    shadows: true,
};

init();

async function init() {
    const cont = document.querySelector("#container");

    // 渲染器
    renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = VSMShadowMap;
    cont.appendChild(renderer.domElement);

    // 帧率
    Object.assign(stats.dom.style, {
        position: "fixed",
        bottom: "0",
        left: "0",
        top: "auto",
        zIndex: "9998",
    });
    document.body.appendChild(stats.dom);

    // 相机
    camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.rotation.order = "YXZ";

    // 控制器
    controls = new OrbitControls(camera, renderer.domElement);
    controls.maxDistance = 2000;
    controls.maxPolarAngle = Math.PI / 2;
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.target.set(0, 0, 0);
    controls.update();

    // 平行光
    dirLight = new DirectionalLight(0xfff2dc, params.lightIntensity);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.setScalar(2048);
    const shadowExtent = Math.max(params.sizeX, params.sizeZ) * 0.7;
    dirLight.shadow.camera.left = -shadowExtent;
    dirLight.shadow.camera.right = shadowExtent;
    dirLight.shadow.camera.top = shadowExtent;
    dirLight.shadow.camera.bottom = -shadowExtent;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = params.sizeY * 4.0;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);
    scene.add(dirLight.target);

    // 天空
    sky = new Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);
    const skyUniforms = sky.material.uniforms;
    skyUniforms["turbidity"].value = 10;
    skyUniforms["rayleigh"].value = 2;
    skyUniforms["mieCoefficient"].value = 0.005;
    skyUniforms["mieDirectionalG"].value = 0.8;
    pmremGenerator = new PMREMGenerator(renderer);
    pmremGenerator.compileCubemapShader();
    updateLightPosition();

    // 模型加载器
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("https://unpkg.com/three@0.180.0/examples/jsm/libs/draco/");
    gltfLoader.setDRACOLoader(dracoLoader);
    const ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath("https://unpkg.com/three@0.180.0/examples/jsm/libs/basis/");
    ktx2Loader.detectSupport(renderer);
    gltfLoader.setKTX2Loader(ktx2Loader);

    // 渲染循环
    renderer.setAnimationLoop(animate);

    window.hideLoader();

    // 加载 3D Tiles
    await initTiles(floorUrls);
    tilesUpdateEnabled = false;

    // GUI
    initGUI();

    scene.environment = pmremGenerator.fromScene(sky).texture;

    // 初始烘焙
    await bakeWithSettings();

    scene.environment = params.skyEnvMap ? pmremGenerator.fromScene(sky).texture : null;

    // 进入角色控制按钮
    const btn = document.getElementById("start-btn");
    btn.addEventListener("click", async () => {
        btn.style.display = "none";
        document.getElementById("hints").style.display = "block";
        await initPlayer();
    });

    window.addEventListener("resize", onWindowResize);
    initClickPick();
}

// 动画循环
function animate() {
    if (isUpdatePlayer && player) {
        player.update();
    } else {
        controls.update();
    }
    if (tilesUpdateEnabled) {
        tilesList.forEach((t) => t.update());
    }
    renderer.render(scene, camera);
    stats.update();
}

// 初始化玩家
async function initPlayer() {
    renderer.render(scene, camera);
    isUpdatePlayer = true;

    player = new playerController();
    await player.init({
        scene,
        camera,
        controls,
        playerModelConfig: {
            url: "./glb/UEPerson.glb",
            scale: 0.01,
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
            rotateY: Math.PI,
        },
        initPos: new Vector3(1.27, 0, 11.524),
        minCamDistance: 50,
        maxCamDistance: 220,
        enableOverShoulderView: true,
    });

    player.getPlayerModel()?.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    player.onViewChange = (isFirstPerson) => {
        camera.fov = isFirstPerson ? 75 : 60;
        camera.updateProjectionMatrix();
    };
}

// 更新灯光位置
function updateLightPosition() {
    const azimuth = MathUtils.degToRad(params.lightAzimuth);
    const elevation = MathUtils.degToRad(params.lightElevation);
    const radius = 100;
    const horizontal = Math.cos(elevation) * radius;
    const vertical = Math.sin(elevation) * radius;

    dirLight.position.set(Math.cos(azimuth) * horizontal, vertical, Math.sin(azimuth) * horizontal);
    dirLight.target.position.set(0, 0, 0);
    dirLight.target.updateMatrixWorld();

    const phi = MathUtils.degToRad(90 - params.lightElevation);
    const theta = MathUtils.degToRad(params.lightAzimuth);
    sun.setFromSphericalCoords(1, phi, theta);
    sky.material.uniforms["sunPosition"].value.copy(sun);

}

let rebakeTimer = null;
// 安排重新烘焙
function scheduleRebake() {
    if (rebakeTimer !== null) clearTimeout(rebakeTimer);
    rebakeTimer = setTimeout(() => {
        rebakeTimer = null;
        bakeWithSettings();
    }, 250);
}

let isBaking = false;
let bakeQueued = false;
// 烘焙场景
async function bakeWithSettings() {
    if (isBaking) {
        bakeQueued = true;
        return;
    }
    isBaking = true;
    document.getElementById("bake-overlay").classList.add("visible");
    // 双帧等待，确保浏览器先渲染出进度条再开始烘焙
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    do {
        bakeQueued = false;
        if (probes) {
            scene.remove(probes);
            probes.dispose();
        }

        probes = new LightProbeGrid(
            params.sizeX, params.sizeY, params.sizeZ,
            params.countX, params.countY, params.countZ
        );
        probes.position.set(params.boundsX, params.boundsY, params.boundsZ);

        if (probesHelper) probesHelper.visible = false;

        const probeFar = Math.max(params.sizeX, params.sizeY, params.sizeZ) * 2.0;
        probes.bake(renderer, scene, { cubemapSize: 32, near: 0.05, far: probeFar });

        probes.visible = params.enabled;
        scene.add(probes);

        if (!probesHelper) {
            probesHelper = new LightProbeGridHelper(probes, params.probeSize);
            scene.add(probesHelper);
        } else {
            probesHelper.probes = probes;
            probesHelper.update();
        }
        probesHelper.visible = params.showProbes;
    } while (bakeQueued);
    isBaking = false;
    document.getElementById("bake-overlay").classList.remove("visible");
}

// 初始化 GUI
function initGUI() {
    gui = new GUI();

    const envFolder = gui.addFolder("Environment");
    envFolder.add(params, "skyEnvMap").name("Sky Env Map").onChange((v) => {
        scene.environment = v ? pmremGenerator.fromScene(sky).texture : null;
    });
    envFolder.open();

    const giFolder = gui.addFolder("Global Illumination (GI)");
    giFolder.add(params, "enabled").name("Enable GI").onChange((v) => {
        if (probes) probes.visible = v;
    });
    giFolder.add(params, "showProbes").name("Show Probes").onChange((v) => {
        if (probesHelper) probesHelper.visible = v;
    });
    giFolder.add(params, "probeSize", 0.05, 2, 0.05).name("Probe Size").onChange((v) => {
        if (probesHelper) {
            scene.remove(probesHelper);
            probesHelper.dispose();
            probesHelper = new LightProbeGridHelper(probes, v);
            probesHelper.visible = params.showProbes;
            scene.add(probesHelper);
        }
    });

    const lightFolder = gui.addFolder("Sun Settings");
    lightFolder.add(params, "lightAzimuth", -180, 180, 1).name("Azimuth")
        .onChange(() => { updateLightPosition(); })
        .onFinishChange(() => { scheduleRebake(); });
    lightFolder.add(params, "lightElevation", 0, 90, 1).name("Elevation")
        .onChange(() => { updateLightPosition(); })
        .onFinishChange(() => { scheduleRebake(); });
    lightFolder.add(params, "lightIntensity", 0, 100, 0.1).name("Intensity")
        .onChange((v) => { dirLight.intensity = v; })
        .onFinishChange(() => { scheduleRebake(); });
    lightFolder.add(params, "shadows").name("Shadows").onFinishChange((v) => {
        renderer.shadowMap.enabled = v;
        dirLight.castShadow = v;
        tilesList.forEach((t) => {
            t.group.traverse((c) => {
                if (c.isMesh) {
                    c.castShadow = v;
                    c.receiveShadow = v;
                }
            });
        });
        scheduleRebake();
    });
    lightFolder.open();
}

// 创建楼层 Tile
function createTiles(url, floorIndex) {
    const t = new TilesRenderer(url);
    t.manager.addHandler(/\.(gltf|glb)$/g, gltfLoader);
    t.errorTarget = 4;
    t.displayActiveTiles = true;
    t.registerPlugin(new TilesFadePlugin());
    const meshConfig = floorMeshConfig[floorIndex] ?? {};
    t.addEventListener("load-model", ({ scene: tileScene }) => {
        if (!tileScene) return;
        const toRemove = [];
        tileScene.traverse((c) => {
            if (c.isMesh) {
                // console.log(`load-model [${floorIndex}F]`, c.name);
                const type = meshConfig[c.name];
                if (type === 'hidden') {
                    toRemove.push(c);
                } else {
                    const handler = materialHandlers[type] ?? materialHandlers._default;
                    handler(c);
                }
            }
        });
        toRemove.forEach((c) => materialHandlers.hidden(c));
    });
    scene.add(t.group);
    t.setCamera(camera);
    t.setResolutionFromRenderer(camera, renderer);
    tilesList.push(t);
    return t;
}

// 初始化楼层 Tile
async function initTiles(urls) {
    // 首层解算坐标变换矩阵，其余楼层复用
    const primary = createTiles(urls[0], 0);

    const finalMatrix = await new Promise((resolve) => {
        const onLoad = () => {
            const sphere = new Sphere();
            primary.getBoundingSphere(sphere);
            const center = sphere.center.clone();
            const radius = sphere.radius;
            const offset = new Vector3(radius * 1.2, radius, radius * 1.2);
            const root = primary.root;

            let m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
            if (root?.children?.length > 1 && root?.children[0].content?.uri?.includes("tileset.json")) {
                if (root?.children[0]?.children) {
                    m = root.children[0].children[0].transform ?? m;
                }
            } else if (root?.transform) {
                m = root.transform;
            }

            const rotationMat3 = new Matrix3().set(m[0], m[1], m[2], m[8], m[9], m[10], -m[4], -m[5], -m[6]);
            const rotationMat4 = new Matrix4().setFromMatrix3(rotationMat3);
            const t1 = new Matrix4().makeTranslation(center.x, center.y, center.z);
            const t2 = new Matrix4().makeTranslation(-center.x, -center.y, -center.z);
            let mat = new Matrix4().multiplyMatrices(t1, rotationMat4).multiply(t2);
            mat = new Matrix4().makeTranslation(-center.x, -center.y, -center.z).multiply(mat);

            primary.group.matrix.copy(mat);
            primary.group.matrixAutoUpdate = false;
            primary.group.updateMatrixWorld(true);

            controls.target.set(0, 0, 0);
            camera.position.copy(offset);
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();

            primary.removeEventListener("load-tileset", onLoad);
            resolve(mat);
        };
        primary.addEventListener("load-tileset", onLoad);
    });

    // 其余楼层直接套用首层矩阵
    for (let i = 1; i < urls.length; i++) {
        const t = createTiles(urls[i], i);
        t.group.matrix.copy(finalMatrix);
        t.group.matrixAutoUpdate = false;
        t.group.updateMatrixWorld(true);
    }

    // 等待所有楼层瓦片几何体完全加载
    await waitForAllTilesLoaded();
}

// 等待所有楼层瓦片几何体完全加载
function waitForAllTilesLoaded() {
    return new Promise((resolve) => {
        let stableFrames = 0;
        const STABLE_THRESHOLD = 30;
        let hasStartedLoading = false;

        function check() {
            const downloading = tilesList.reduce((s, t) => s + t.stats.downloading, 0);
            const parsing = tilesList.reduce((s, t) => s + t.stats.parsing, 0);

            if (!hasStartedLoading && (downloading > 0 || parsing > 0)) {
                hasStartedLoading = true;
            }

            if (hasStartedLoading && downloading === 0 && parsing === 0) {
                stableFrames++;
                if (stableFrames >= STABLE_THRESHOLD) {
                    resolve();
                    return;
                }
            } else {
                stableFrames = 0;
            }

            requestAnimationFrame(check);
        }

        requestAnimationFrame(check);
    });
}

const _raycaster = new Raycaster();
const _pointer = new Vector2();
// 初始化点击选择
function initClickPick() {
    renderer.domElement.addEventListener("click", (e) => {
        const rect = renderer.domElement.getBoundingClientRect();
        _pointer.set(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        _raycaster.setFromCamera(_pointer, camera);

        const objects = [];
        tilesList.forEach((t) => t.group.traverse((c) => { if (c.isMesh) objects.push(c); }));
        const hits = _raycaster.intersectObjects(objects, false);
        if (hits.length > 0) {
            const mesh = hits[0].object;
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    tilesList.forEach((t) => t.setResolutionFromRenderer(camera, renderer));
}
