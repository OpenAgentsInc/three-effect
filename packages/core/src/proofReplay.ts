import { Data, Effect } from "effect";
import * as Three from "three";

import { createFlowBeam, type FlowBeamHandle } from "./flowEffectPrimitives";
import {
  createPointsFromAttributes,
  createStarfieldAttributes,
} from "./mediaParticlePrimitives";
import { createTextLabel, type TextLabelHandle } from "./textLabelPrimitives";

export class ProofReplayMountError extends Data.TaggedError(
  "ProofReplayMountError",
)<{
  readonly reason: string;
}> {}

export type ProofReplayVector =
  | Three.Vector3
  | readonly [number, number, number]
  | Readonly<{ x: number; y: number; z: number }>;

export type ProofReplayCameraPose = Readonly<{
  cameraRef?: string;
  fov?: number;
  mode?: string;
  position: ProofReplayVector;
  target: ProofReplayVector;
  second?: number;
  sourceRefs?: readonly string[];
}>;

export type ProofReplayStageDefinition = Readonly<{
  id: string;
  kind: string;
  label: string;
  position: ProofReplayVector;
  sourceRefs?: readonly string[];
}>;

export type ProofReplayActorDefinition = Readonly<{
  id: string;
  label: string;
  position: ProofReplayVector;
  role: string;
  sourceRefs?: readonly string[];
  state?: string;
}>;

export type ProofReplayEventDefinition = Readonly<{
  actorIds?: readonly string[];
  amountSats?: number;
  id: string;
  kind: string;
  label: string;
  rail?: string;
  second: number;
  sourceRefs?: readonly string[];
  targetIds?: readonly string[];
}>;

export type ProofReplayFlowDefinition = Readonly<{
  fromId: string;
  id: string;
  kind?: string;
  sourceRefs?: readonly string[];
  toId: string;
}>;

export type ProofReplayVisualizationFrame = Readonly<{
  activeEvents?: readonly ProofReplayEventDefinition[];
  actors?: readonly ProofReplayActorDefinition[];
  camera: ProofReplayCameraPose;
  second: number;
}>;

export type ProofReplayVisualizationOptions = Readonly<{
  actors?: readonly ProofReplayActorDefinition[];
  backgroundColor?: number;
  camera?: ProofReplayCameraPose;
  durationSecond?: number;
  events?: readonly ProofReplayEventDefinition[];
  flows?: readonly ProofReplayFlowDefinition[];
  labels?: boolean;
  pixelRatio?: number;
  stages?: readonly ProofReplayStageDefinition[];
  title?: string;
}>;

export type ResolvedProofReplayVisualizationOptions = Readonly<{
  actors: readonly ProofReplayActorDefinition[];
  backgroundColor: number;
  camera: ProofReplayCameraPose;
  durationSecond: number;
  events: readonly ProofReplayEventDefinition[];
  flows: readonly ProofReplayFlowDefinition[];
  labels: boolean;
  pixelRatio: number;
  stages: readonly ProofReplayStageDefinition[];
  title: string;
}>;

export type ProofReplayVisualizationHandle = Readonly<{
  canvas: HTMLCanvasElement;
  dispose: Effect.Effect<void>;
  element: HTMLElement;
  renderNow: () => void;
  resize: Effect.Effect<void>;
  setFrame: (frame: ProofReplayVisualizationFrame) => void;
  webglAvailable: boolean;
}>;

export const defaultProofReplayCameraPose: ProofReplayCameraPose = {
  cameraRef: "proof_replay.default_camera",
  fov: 52,
  mode: "overview",
  position: [0, 7.8, 10.5],
  target: [0, 0, 0],
  second: 0,
  sourceRefs: [],
};

export const defaultProofReplayVisualizationOptions: ResolvedProofReplayVisualizationOptions = {
  actors: [],
  backgroundColor: 0x000000,
  camera: defaultProofReplayCameraPose,
  durationSecond: 60,
  events: [],
  flows: [],
  labels: true,
  pixelRatio: 2,
  stages: [],
  title: "Proof replay",
};

export const resolveProofReplayVisualizationOptions = (
  options: ProofReplayVisualizationOptions = {},
): ResolvedProofReplayVisualizationOptions => ({
  ...defaultProofReplayVisualizationOptions,
  ...options,
  actors: options.actors ?? defaultProofReplayVisualizationOptions.actors,
  camera: options.camera ?? defaultProofReplayVisualizationOptions.camera,
  events: options.events ?? defaultProofReplayVisualizationOptions.events,
  flows: options.flows ?? defaultProofReplayVisualizationOptions.flows,
  labels: options.labels ?? defaultProofReplayVisualizationOptions.labels,
  stages: options.stages ?? defaultProofReplayVisualizationOptions.stages,
});

export const proofReplayCameraPoseWithOverride = (
  base: ProofReplayCameraPose,
  override?: Partial<Pick<ProofReplayCameraPose, "fov" | "position" | "target">>,
): ProofReplayCameraPose => ({
  ...base,
  ...(override?.fov === undefined ? {} : { fov: override.fov }),
  position: override?.position ?? base.position,
  target: override?.target ?? base.target,
});

const isTupleVector = (
  value: ProofReplayVector,
): value is readonly [number, number, number] => Array.isArray(value);

const vector = (value: ProofReplayVector): Three.Vector3 => {
  if (value instanceof Three.Vector3) return value.clone();
  if (isTupleVector(value)) return new Three.Vector3(value[0], value[1], value[2]);
  return new Three.Vector3(value.x, value.y, value.z);
};

const hostSize = (element: HTMLElement): { width: number; height: number } => {
  const rect = element.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width || element.clientWidth || 320));
  const height = Math.max(1, Math.floor(rect.height || element.clientHeight || 220));
  return { width, height };
};

const sourceRefs = (
  value: { readonly sourceRefs?: readonly string[] },
): readonly string[] => value.sourceRefs?.filter(ref => ref.trim() !== "") ?? [];

const hasEvidence = (value: { readonly sourceRefs?: readonly string[] }): boolean =>
  sourceRefs(value).length > 0;

const colorForStage = (kind: string): number => {
  if (kind.includes("proof")) return 0x7dd3fc;
  if (kind.includes("settlement") || kind.includes("terminal")) return 0xffd166;
  if (kind.includes("gap") || kind.includes("blocked")) return 0xff7070;
  if (kind.includes("recognition")) return 0xb7f7d4;
  if (kind.includes("run_core")) return 0xf9ffe8;
  return 0xa7f3d0;
};

const colorForActor = (actor: ProofReplayActorDefinition): number => {
  const value = `${actor.role} ${actor.state ?? ""}`;
  if (value.includes("validator") || value.includes("verify")) return 0x7dd3fc;
  if (value.includes("settle") || value.includes("terminal")) return 0xffd166;
  if (value.includes("blocked") || value.includes("rejected")) return 0xff7070;
  if (value.includes("recognition") || value.includes("recipient")) return 0xb7f7d4;
  return 0xf1efe8;
};

const colorForEvent = (event: ProofReplayEventDefinition): number => {
  if (event.kind.includes("payment") || event.kind.includes("settlement")) return 0xffd166;
  if (event.kind.includes("verified") || event.kind.includes("proof")) return 0x7dd3fc;
  if (event.kind.includes("blocked") || event.kind.includes("rejected")) return 0xff7070;
  if (event.kind.includes("recognition") || event.kind.includes("recipient")) return 0xb7f7d4;
  return 0xffffff;
};

const disposeMaterial = (material: Three.Material | Three.Material[]): void => {
  if (Array.isArray(material)) {
    for (const item of material) item.dispose();
    return;
  }
  const mapped = material as Three.Material & { map?: Three.Texture | null };
  mapped.map?.dispose();
  material.dispose();
};

const disposeObject = (object: Three.Object3D): void => {
  object.traverse(child => {
    const renderable = child as Three.Object3D & {
      geometry?: Three.BufferGeometry;
      material?: Three.Material | Three.Material[];
    };
    renderable.geometry?.dispose();
    if (renderable.material !== undefined) disposeMaterial(renderable.material);
  });
};

const makeHalo = (
  radius: number,
  color: number,
  opacity: number,
): Three.Mesh<Three.TorusGeometry, Three.MeshBasicMaterial> => {
  const ring = new Three.Mesh(
    new Three.TorusGeometry(radius, Math.max(0.01, radius * 0.015), 10, 72),
    new Three.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  return ring;
};

const makeStageObject = (stage: ProofReplayStageDefinition): Three.Group => {
  const group = new Three.Group();
  const color = colorForStage(stage.kind);
  const core = stage.kind.includes("run_core");
  const proof = stage.kind.includes("proof");
  const terminal = stage.kind.includes("settlement") || stage.kind.includes("terminal");
  const radius = core ? 0.64 : terminal ? 0.42 : proof ? 0.5 : 0.34;

  group.position.copy(vector(stage.position));
  group.add(makeHalo(radius * 1.55, color, core ? 0.56 : 0.34));
  group.add(makeHalo(radius * 2.25, color, core ? 0.22 : 0.13));

  const geometry = terminal
    ? new Three.CylinderGeometry(radius * 0.66, radius * 0.82, radius * 1.45, 8, 1)
    : proof
      ? new Three.TorusKnotGeometry(radius * 0.52, radius * 0.055, 72, 8)
      : new Three.IcosahedronGeometry(radius, core ? 3 : 1);
  const material = new Three.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: core ? 1.1 : 0.42,
    metalness: terminal ? 0.62 : 0.2,
    roughness: terminal ? 0.24 : 0.46,
    transparent: true,
    opacity: core ? 0.95 : 0.86,
  });
  const mesh = new Three.Mesh(geometry, material);
  mesh.position.y = radius * 0.35;
  group.add(mesh);

  if (proof || terminal) {
    const axis = makeHalo(radius * 0.82, color, 0.45);
    axis.rotation.y = Math.PI / 2;
    axis.position.y = radius * 0.34;
    group.add(axis);
  }

  return group;
};

const makeActorObject = (actor: ProofReplayActorDefinition): Three.Group => {
  const group = new Three.Group();
  const color = colorForActor(actor);
  const material = new Three.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.38,
    metalness: 0.18,
    roughness: 0.34,
  });
  const body = new Three.Mesh(new Three.OctahedronGeometry(0.22, 1), material);
  body.position.y = 0.34;
  group.add(body);

  const ring = makeHalo(0.28, color, 0.5);
  ring.position.y = 0.12;
  group.add(ring);

  group.position.copy(vector(actor.position));
  return group;
};

const actorLabelText = (actor: ProofReplayActorDefinition): string =>
  actor.state === undefined || actor.state === "idle"
    ? actor.label
    : `${actor.label} / ${actor.state}`;

const applyCameraPose = (
  camera: Three.PerspectiveCamera,
  pose: ProofReplayCameraPose,
): void => {
  camera.position.copy(vector(pose.position));
  camera.lookAt(vector(pose.target));
  if (pose.fov !== undefined && Number.isFinite(pose.fov)) {
    camera.fov = Three.MathUtils.clamp(pose.fov, 24, 86);
  }
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
};

const anchorForId = (
  id: string,
  stageObjects: ReadonlyMap<string, Three.Group>,
  actorObjects: ReadonlyMap<string, Three.Group>,
): Three.Vector3 | undefined => {
  const actor = actorObjects.get(id);
  if (actor !== undefined) return actor.position.clone().add(new Three.Vector3(0, 0.34, 0));
  const stage = stageObjects.get(id);
  if (stage !== undefined) return stage.position.clone().add(new Three.Vector3(0, 0.42, 0));
  return undefined;
};

export const mountProofReplayVisualization = (
  element: HTMLElement,
  options: ProofReplayVisualizationOptions = {},
): Effect.Effect<ProofReplayVisualizationHandle, ProofReplayMountError> =>
  Effect.try({
    try: () => {
      const resolved = resolveProofReplayVisualizationOptions(options);
      const canvas = document.createElement("canvas");
      canvas.style.display = "block";
      canvas.style.height = "100%";
      canvas.style.inset = "0";
      canvas.style.position = "absolute";
      canvas.style.width = "100%";
      canvas.setAttribute("data-proof-replay-webgl", "pending");
      element.replaceChildren(canvas);
      element.style.position = "relative";
      element.style.overflow = "hidden";
      element.style.background = "#000";

      let renderer: Three.WebGLRenderer;
      try {
        renderer = new Three.WebGLRenderer({
          alpha: false,
          antialias: true,
          canvas,
        });
      } catch {
        canvas.setAttribute("data-proof-replay-webgl", "unavailable");
        const fallbackHandle: ProofReplayVisualizationHandle = {
          canvas,
          element,
          renderNow: () => undefined,
          resize: Effect.sync(() => undefined),
          setFrame: frame => {
            canvas.setAttribute("data-proof-replay-second", frame.second.toFixed(3));
            canvas.setAttribute("data-proof-replay-camera", frame.camera.mode ?? "custom");
          },
          dispose: Effect.sync(() => {
            canvas.remove();
          }),
          webglAvailable: false,
        };
        return fallbackHandle;
      }

      canvas.setAttribute("data-proof-replay-webgl", "available");
      renderer.outputColorSpace = Three.SRGBColorSpace;
      renderer.setClearColor(resolved.backgroundColor, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, resolved.pixelRatio));

      const scene = new Three.Scene();
      scene.fog = new Three.FogExp2(0x000000, 0.023);
      const camera = new Three.PerspectiveCamera(52, 1, 0.05, 250);
      applyCameraPose(camera, resolved.camera);

      const root = new Three.Group();
      scene.add(root);

      scene.add(new Three.HemisphereLight(0xe8f8ff, 0x050505, 1.25));
      const key = new Three.DirectionalLight(0xffffff, 3.1);
      key.position.set(4, 8, 6);
      scene.add(key);
      const rim = new Three.PointLight(0x7dd3fc, 4.4, 32);
      rim.position.set(-5.5, 4.2, -4.5);
      scene.add(rim);
      const gold = new Three.PointLight(0xffd166, 2.2, 28);
      gold.position.set(4.8, 2.8, 4.2);
      scene.add(gold);

      const grid = new Three.GridHelper(18, 36, 0x35524d, 0x15201d);
      grid.position.y = -0.42;
      root.add(grid);
      const floor = new Three.Mesh(
        new Three.CircleGeometry(9.2, 96),
        new Three.MeshBasicMaterial({
          color: 0x08110e,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
        }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.44;
      root.add(floor);

      const stars = createPointsFromAttributes(
        createStarfieldAttributes({
          count: 900,
          depth: 24,
          radius: 22,
          saturation: 0.2,
          seed: 5353,
          size: 0.025,
        }),
        new Three.PointsMaterial({
          color: 0xdffcff,
          size: 0.035,
          transparent: true,
          opacity: 0.72,
          depthWrite: false,
          sizeAttenuation: true,
        }),
      );
      root.add(stars);

      const stageObjects = new Map<string, Three.Group>();
      const actorObjects = new Map<string, Three.Group>();
      const labels: TextLabelHandle[] = [];

      for (const stage of resolved.stages) {
        const object = makeStageObject(stage);
        stageObjects.set(stage.id, object);
        root.add(object);
        if (resolved.labels) {
          const label = createTextLabel({
            text: stage.label,
            color: "#f1efe8",
            fontSize: stage.kind.includes("run_core") ? 34 : 26,
            position: [object.position.x, object.position.y + 0.92, object.position.z],
            worldHeight: stage.kind.includes("run_core") ? 0.22 : 0.16,
            billboard: true,
          });
          root.add(label.object3D);
          labels.push(label);
        }
      }

      for (const actor of resolved.actors) {
        const object = makeActorObject(actor);
        actorObjects.set(actor.id, object);
        root.add(object);
        if (resolved.labels) {
          const label = createTextLabel({
            text: actorLabelText(actor),
            color: "#e5e7eb",
            fontSize: 28,
            position: [object.position.x, object.position.y + 0.84, object.position.z],
            worldHeight: 0.14,
            billboard: true,
          });
          root.add(label.object3D);
          labels.push(label);
        }
      }

      const structuralBeams: FlowBeamHandle[] = [];
      for (const flow of resolved.flows) {
        if (!hasEvidence(flow)) continue;
        const from = anchorForId(flow.fromId, stageObjects, actorObjects);
        const to = anchorForId(flow.toId, stageObjects, actorObjects);
        if (from === undefined || to === undefined) continue;
        const beam = createFlowBeam({
          from,
          to,
          bend: 0.55,
          color: 0x7dd3fc,
          opacity: 0.18,
          pulseCount: 2,
          pulseRadius: 0.034,
          rate: 0.22,
          radius: 0.008,
        });
        root.add(beam.object3D);
        structuralBeams.push(beam);
      }

      let activeBeams: FlowBeamHandle[] = [];
      let currentFrame: ProofReplayVisualizationFrame = {
        actors: resolved.actors,
        activeEvents: [],
        camera: resolved.camera,
        second: resolved.camera.second ?? 0,
      };

      const clearActiveBeams = (): void => {
        for (const beam of activeBeams) beam.dispose();
        activeBeams = [];
      };

      const rebuildActiveBeams = (events: readonly ProofReplayEventDefinition[]): void => {
        clearActiveBeams();
        for (const event of events) {
          if (!hasEvidence(event)) continue;
          const actors = event.actorIds ?? [];
          const targets = event.targetIds ?? [];
          const color = colorForEvent(event);
          const firstActor = actors
            .map(id => anchorForId(id, stageObjects, actorObjects))
            .find(point => point !== undefined);
          for (const targetId of targets) {
            const target = anchorForId(targetId, stageObjects, actorObjects);
            if (firstActor === undefined || target === undefined) continue;
            const beam = createFlowBeam({
              from: firstActor,
              to: target,
              bend: event.kind.includes("payment") ? 1.1 : 0.72,
              color,
              opacity: event.kind.includes("blocked") ? 0.18 : 0.38,
              pulseCount: event.kind.includes("payment") ? 5 : 3,
              pulseRadius: event.kind.includes("payment") ? 0.065 : 0.043,
              rate: event.kind.includes("payment") ? 0.84 : 0.48,
              radius: event.kind.includes("payment") ? 0.018 : 0.011,
            });
            root.add(beam.object3D);
            activeBeams.push(beam);
          }
        }
      };

      const setFrame = (frame: ProofReplayVisualizationFrame): void => {
        currentFrame = frame;
        canvas.setAttribute("data-proof-replay-second", frame.second.toFixed(3));
        canvas.setAttribute("data-proof-replay-camera", frame.camera.mode ?? "custom");
        applyCameraPose(camera, frame.camera);

        for (const actor of frame.actors ?? []) {
          const object = actorObjects.get(actor.id);
          if (object === undefined) continue;
          object.position.copy(vector(actor.position));
          const color = colorForActor(actor);
          object.traverse(child => {
            const mesh = child as Three.Mesh & { material?: Three.Material };
            if (mesh.material instanceof Three.MeshStandardMaterial) {
              mesh.material.color.set(color);
              mesh.material.emissive.set(color);
            }
          });
        }
        rebuildActiveBeams(frame.activeEvents ?? []);
        renderNow();
      };

      let disposed = false;
      let frameHandle = 0;
      let lastTime = 0;

      const resize = (): void => {
        const { width, height } = hostSize(element);
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
        camera.updateProjectionMatrix();
      };

      const renderNow = (): void => {
        for (const stage of stageObjects.values()) {
          stage.rotation.y += 0.002;
        }
        const actorValues = [...actorObjects.values()];
        for (const [index, actor] of actorValues.entries()) {
          actor.rotation.y += 0.006 + index * 0.0005;
        }
        for (const label of labels) {
          label.faceCamera(camera);
        }
        renderer.render(scene, camera);
      };

      const animate = (time: number): void => {
        if (disposed) return;
        const delta = lastTime === 0 ? 0 : Math.min(0.1, (time - lastTime) / 1000);
        lastTime = time;
        const beat = currentFrame.second + time * 0.00016;
        stars.rotation.y = beat * 0.022;
        root.rotation.y = Math.sin(beat * 0.12) * 0.018;
        for (const beam of structuralBeams) beam.update(delta);
        for (const beam of activeBeams) beam.update(delta);
        for (const [id, object] of stageObjects.entries()) {
          const stage = resolved.stages.find(value => value.id === id);
          if (stage?.kind.includes("proof")) object.rotation.y += delta * 0.52;
          if (stage?.kind.includes("run_core")) object.rotation.y += delta * 0.18;
        }
        for (const label of labels) {
          label.faceCamera(camera);
        }
        renderer.render(scene, camera);
        frameHandle = requestAnimationFrame(animate);
      };

      const observer =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(() => resize());

      resize();
      observer?.observe(element);
      setFrame(currentFrame);
      frameHandle = requestAnimationFrame(animate);

      const dispose = Effect.sync(() => {
        if (disposed) return;
        disposed = true;
        cancelAnimationFrame(frameHandle);
        observer?.disconnect();
        clearActiveBeams();
        for (const beam of structuralBeams) beam.dispose();
        for (const label of labels) label.dispose();
        disposeObject(scene);
        renderer.dispose();
        canvas.remove();
      });

      return {
        canvas,
        dispose,
        element,
        renderNow,
        resize: Effect.sync(resize),
        setFrame,
        webglAvailable: true,
      };
    },
    catch: error =>
      new ProofReplayMountError({
        reason: error instanceof Error ? error.message : String(error),
      }),
  });
