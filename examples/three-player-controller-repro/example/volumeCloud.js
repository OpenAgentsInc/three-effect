// 来源：https://threejs.org/examples/?q=cloud#webgl_volume_cloud
import {
    BackSide,
    BoxGeometry,
    Color,
    Data3DTexture,
    GLSL3,
    LinearFilter,
    Mesh,
    RawShaderMaterial,
    RedFormat,
    Vector3,
} from "three";
import { ImprovedNoise } from "three/examples/jsm/math/ImprovedNoise.js";

const vertexShader = `
    in vec3 position;

    uniform mat4 modelMatrix;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform vec3 cameraPos;

    out vec3 vOrigin;
    out vec3 vDirection;

    void main() {
        vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

        vOrigin = vec3( inverse( modelMatrix ) * vec4( cameraPos, 1.0 ) ).xyz;
        vDirection = position - vOrigin;

        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fragmentShader = `
    precision highp float;
    precision highp sampler3D;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;

    in vec3 vOrigin;
    in vec3 vDirection;

    out vec4 color;

    uniform vec3 base;
    uniform sampler3D map;

    uniform float threshold;
    uniform float range;
    uniform float opacity;
    uniform float steps;
    uniform float frame;

    uint wang_hash(uint seed)
    {
        seed = (seed ^ 61u) ^ (seed >> 16u);
        seed *= 9u;
        seed = seed ^ (seed >> 4u);
        seed *= 0x27d4eb2du;
        seed = seed ^ (seed >> 15u);
        return seed;
    }

    float randomFloat(inout uint seed)
    {
        return float(wang_hash(seed)) / 4294967296.;
    }

    vec2 hitBox( vec3 orig, vec3 dir ) {
        const vec3 box_min = vec3( - 0.5 );
        const vec3 box_max = vec3( 0.5 );
        vec3 inv_dir = 1.0 / dir;
        vec3 tmin_tmp = ( box_min - orig ) * inv_dir;
        vec3 tmax_tmp = ( box_max - orig ) * inv_dir;
        vec3 tmin = min( tmin_tmp, tmax_tmp );
        vec3 tmax = max( tmin_tmp, tmax_tmp );
        float t0 = max( tmin.x, max( tmin.y, tmin.z ) );
        float t1 = min( tmax.x, min( tmax.y, tmax.z ) );
        return vec2( t0, t1 );
    }

    float sample1( vec3 p ) {
        return texture( map, p ).r;
    }

    float shading( vec3 coord ) {
        float step = 0.01;
        return sample1( coord + vec3( - step ) ) - sample1( coord + vec3( step ) );
    }

    vec4 linearToSRGB( in vec4 value ) {
        return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
    }

    void main(){
        vec3 rayDir = normalize( vDirection );
        vec2 bounds = hitBox( vOrigin, rayDir );

        if ( bounds.x > bounds.y ) discard;

        bounds.x = max( bounds.x, 0.0 );

        float stepSize = ( bounds.y - bounds.x ) / steps;

        uint seed = uint( gl_FragCoord.x ) * uint( 1973 ) + uint( gl_FragCoord.y ) * uint( 9277 ) + uint( frame ) * uint( 26699 );
        vec3 size = vec3( textureSize( map, 0 ) );
        float randNum = randomFloat( seed ) * 2.0 - 1.0;
        vec3 p = vOrigin + bounds.x * rayDir;
        p += rayDir * randNum * ( 1.0 / size );

        vec4 ac = vec4( base, 0.0 );

        for ( float i = 0.0; i < steps; i += 1.0 ) {
            float d = sample1( p + 0.5 );

            d = smoothstep( threshold - range, threshold + range, d ) * opacity;

            float col = shading( p + 0.5 ) * 3.0 + ( ( p.x + p.y ) * 0.25 ) + 0.2;

            ac.rgb += ( 1.0 - ac.a ) * d * col;
            ac.a += ( 1.0 - ac.a ) * d;

            if ( ac.a >= 0.95 ) break;

            p += rayDir * stepSize;
        }

        color = linearToSRGB( ac );

        if ( color.a == 0.0 ) discard;
    }
`;

// 生成云纹理
function createCloudTexture(size, noiseScale) {
    // 体素密度
    const data = new Uint8Array(size * size * size);
    const perlin = new ImprovedNoise();
    const vector = new Vector3();

    let i = 0;
    for (let z = 0; z < size; z++) {
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const d = 1.0 - vector.set(x, y, z).subScalar(size / 2).divideScalar(size).length();
                data[i] = (128 + 128 * perlin.noise(x * noiseScale / 1.5, y * noiseScale, z * noiseScale / 1.5)) * d * d;
                i++;
            }
        }
    }

    // 上传纹理
    const texture = new Data3DTexture(data, size, size, size);
    texture.format = RedFormat;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;
    return texture;
}

// 创建体积云
export function createVolumeCloud(options = {}) {
    // 默认参数
    const {
        size = 96,
        noiseScale = 0.05,
        color = 0x798aa0,
        threshold = 0.25,
        opacity = 0.25,
        range = 0.1,
        steps = 80,
        scale = [3, 1.5, 2.2],
    } = options;

    // 构造材质
    const texture = createCloudTexture(size, noiseScale);
    const material = new RawShaderMaterial({
        glslVersion: GLSL3,
        uniforms: {
            base: { value: new Color(color) },
            map: { value: texture },
            cameraPos: { value: new Vector3() },
            threshold: { value: threshold },
            opacity: { value: opacity },
            range: { value: range },
            steps: { value: steps },
            frame: { value: 0 },
        },
        vertexShader,
        fragmentShader,
        side: BackSide,
        transparent: true,
        depthWrite: true,
    });

    // 返回网格
    const cloud = new Mesh(new BoxGeometry(1, 1, 1), material);
    cloud.name = "volumeCloud";
    cloud.scale.set(...scale);
    cloud.frustumCulled = false;
    return cloud;
}

// 更新体积云
export function updateVolumeCloud(cloud, camera, rotationSpeed = 0) {
    if (!cloud?.material?.uniforms || !camera) return;
    if (!cloud.material.visible) return;

    // 同步相机
    const uniforms = cloud.material.uniforms;
    camera.getWorldPosition(uniforms.cameraPos.value);
    uniforms.frame.value += 1;
    // 可选旋转
    if (rotationSpeed !== 0) cloud.rotation.y += rotationSpeed / 60;
}

// 释放体积云
export function disposeVolumeCloud(cloud) {
    if (!cloud) return;

    // 释放显存
    cloud.geometry?.dispose();
    cloud.material?.uniforms?.map?.value?.dispose();
    cloud.material?.dispose();
}
