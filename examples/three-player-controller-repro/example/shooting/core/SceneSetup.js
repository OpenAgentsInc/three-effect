import {
    ACESFilmicToneMapping,
    DirectionalLight,
    MathUtils,
    PerspectiveCamera,
    Scene,
    VSMShadowMap,
    WebGLRenderer,
} from "three";
import { MapControls } from "three/examples/jsm/Addons.js";
import { LightProbeGrid } from "three/addons/lighting/LightProbeGrid.js";
import { LightProbeGridHelper } from "three/addons/helpers/LightProbeGridHelper.js";


export function createSceneSetup({ container }) {
    // ==================== 渲染器 ====================
    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = VSMShadowMap;
    container.appendChild(renderer.domElement);

    // ==================== 场景 & 相机 ====================
    const scene = new Scene();
    const camera = new PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.1,
        2000
    );

    // ==================== 控制器 ====================
    const controls = new MapControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.maxDistance = 2000;

    // ==================== 参数 ====================
    const params = {
        showLightHelper: true,
        lightAzimuth: 45,
        lightElevation: 45,
        lightIntensity: 10,
        shadows: true,
        probesEnabled: true,
        showProbes: false,
        probeSize: 0.5,
        boundsX: 8, boundsY: 3.2, boundsZ: -2,
        sizeX: 40, sizeY: 3, sizeZ: 25,
        countX: 20, countY: 4, countZ: 10,
    };

    // ==================== 平行光 ====================
    const dirLight = new DirectionalLight(0xfff2dc, params.lightIntensity);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.setScalar(2048);
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);
    scene.add(dirLight.target);

    function updateLightPosition() {
        const azimuth = MathUtils.degToRad(params.lightAzimuth);
        const elevation = MathUtils.degToRad(params.lightElevation);
        const radius = 100;
        const h = Math.cos(elevation) * radius;
        const v = Math.sin(elevation) * radius;
        dirLight.position.set(Math.cos(azimuth) * h, v, Math.sin(azimuth) * h);
        dirLight.target.position.set(0, 0, 0);
        dirLight.target.updateMatrixWorld();
    }

    updateLightPosition();

    // ==================== 光探针 ====================
    let probes = null;
    let probesHelper = null;
    let isBaking = false;
    let bakeQueued = false;

    async function bakeProbes() {
        if (isBaking) { bakeQueued = true; return; }
        isBaking = true;
        do {
            bakeQueued = false;
            if (probes) { scene.remove(probes); probes.dispose(); }

            probes = new LightProbeGrid(
                params.sizeX, params.sizeY, params.sizeZ,
                params.countX, params.countY, params.countZ
            );
            probes.position.set(params.boundsX, params.boundsY, params.boundsZ);
            probes.updateMatrixWorld(true); // 强制更新世界矩阵，否则 bake() 读到旧位置
            if (probesHelper) probesHelper.visible = false;

            const far = Math.max(params.sizeX, params.sizeY, params.sizeZ) * 2;
            probes.bake(renderer, scene, { cubemapSize: 32, near: 0.05, far });
            probes.visible = params.probesEnabled;
            scene.add(probes);

            if (!probesHelper) {
                probesHelper = new LightProbeGridHelper(probes, params.probeSize);
                scene.add(probesHelper);
            } else {
                probesHelper.probes = probes;
                probesHelper.update();
            }
            probesHelper.position.set(params.boundsX, params.boundsY, params.boundsZ);
            probesHelper.visible = params.showProbes;
        } while (bakeQueued);
        isBaking = false;
    }


    return { scene, renderer, camera, controls, dirLight, bakeProbes };
}
