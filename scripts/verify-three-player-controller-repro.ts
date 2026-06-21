import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const reproRoot = join(root, "examples", "three-player-controller-repro");

const requiredFiles = [
  "LICENSE.upstream",
  "README.upstream.md",
  "THIRD_PARTY_NOTICES.md",
  "src/playerController.ts",
  "src/systems/InputSystem.ts",
  "src/systems/CameraSystem.ts",
  "src/systems/VehicleSystem.ts",
  "src/utils/capsuleCollision.ts",
  "example/index.html",
  "example/glTF.html",
  "example/glTF.js",
  "example/ShinChan.html",
  "example/ShinChan.js",
  "example/OfficeBuilding.html",
  "example/OfficeBuilding.js",
  "example/3dgs.html",
  "example/3dgs.js",
  "example/3dtilesScene.html",
  "example/3dtilesScene.js",
  "example/multiplayer-gltf.html",
  "example/multiplayer-gltf.js",
  "example/multiplayer-3dgs.html",
  "example/multiplayer-3dgs.js",
  "example/shooting/shooting.html",
  "example/shooting/shooting.js",
  "example/public/glb/person1.glb",
  "example/public/glb/person2.glb",
  "example/public/glb/person3.glb",
  "example/public/glb/person4.glb",
  "example/public/glb/person5.glb",
  "example/public/glb/person15.glb",
  "example/public/glb/UEPerson.glb",
  "example/public/glb/ShinChan.glb",
  "example/public/glb/bugatti.glb",
  "example/public/glb/tesla.glb",
  "example/public/glb/tesla2.glb",
  "example/public/glb/landRover.glb",
  "example/public/glb/horror_corridor.glb",
  "example/public/glb/ak47.glb",
  "example/public/glb/zombie.glb",
  "example/public/3DGS/3DGS.sog",
  "example/public/3DGS/outdoor4.sog",
  "example/public/audio/gun_shot.mp3",
  "assets/imgs/jump.png",
  "assets/imgs/fly.png",
  "assets/imgs/view.png",
  "assets/imgs/break.png",
  "assets/imgs/vehicle.png",
];

const missing: string[] = [];
const empty: string[] = [];

for (const relativePath of requiredFiles) {
  const absolutePath = join(reproRoot, relativePath);
  if (!existsSync(absolutePath)) {
    missing.push(relativePath);
    continue;
  }

  if (statSync(absolutePath).size === 0) {
    empty.push(relativePath);
  }
}

if (missing.length > 0 || empty.length > 0) {
  if (missing.length > 0) {
    console.error("Missing three-player-controller reproduction files:");
    for (const file of missing) console.error(`- ${file}`);
  }

  if (empty.length > 0) {
    console.error("Empty three-player-controller reproduction files:");
    for (const file of empty) console.error(`- ${file}`);
  }

  process.exit(1);
}

const build = await Bun.build({
  entrypoints: [
    join(reproRoot, "example", "glTF.js"),
    join(reproRoot, "example", "ShinChan.js"),
    join(reproRoot, "example", "OfficeBuilding.js"),
    join(reproRoot, "example", "3dgs.js"),
    join(reproRoot, "example", "3dtilesScene.js"),
    join(reproRoot, "example", "multiplayer-gltf.js"),
    join(reproRoot, "example", "multiplayer-3dgs.js"),
    join(reproRoot, "example", "shooting", "shooting.js"),
  ],
  outdir: join(reproRoot, "dist"),
  target: "browser",
  sourcemap: "none",
  minify: false,
  splitting: false,
  loader: {
    ".glb": "file",
    ".hdr": "file",
    ".jpg": "file",
    ".jpeg": "file",
    ".ktx2": "file",
    ".mp3": "file",
    ".png": "file",
    ".sog": "file",
    ".wasm": "file",
  },
});

if (!build.success) {
  console.error("Failed to bundle three-player-controller reproduction examples.");
  for (const log of build.logs) console.error(log);
  process.exit(1);
}

console.log(
  `three-player-controller reproduction verified: ${requiredFiles.length} files checked, ${build.outputs.length} bundles emitted.`,
);
