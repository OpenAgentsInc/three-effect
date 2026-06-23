// In-world "game screen" surface — a flat board mesh whose face is a live
// THREE.CanvasTexture sourced from an external HTMLCanvasElement that is being
// drawn into by *another* renderer (e.g. a self-contained three.js game running
// in a hidden/offscreen container of the SAME document).
//
// WHY A REGISTRY: the desktop Verse host (`mountTrainingRunVisualization`) is fed
// a PURE, serializable `TrainingRunVisualizationOptions` object. A live
// HTMLCanvasElement cannot travel inside that options object (it is a DOM node,
// not data, and the options cross a Foldkit model boundary). So the host
// references a screen canvas BY ID, and the owning app registers the actual
// canvas here under that id. The host looks it up at mesh-build time. When the
// canvas is not yet registered (or never will be, e.g. headless without the
// game), the board renders a neutral "screen off" placeholder instead of
// throwing — the Verse never hard-fails because a screen source is missing.
//
// This is the "game on a screen IN the world" approach: we texture an existing
// game canvas onto a Verse surface and forward input to it. It is explicitly NOT
// a deep scene-graph merge of the two three.js scenes (a later lane).

import * as Three from "three";

// ── The canvas registry ───────────────────────────────────────────────────────

const canvasRegistry = new Map<string, HTMLCanvasElement>();

/** Register (or replace) the source canvas for a screen id. */
export const registerGameScreenCanvas = (
  id: string,
  canvas: HTMLCanvasElement,
): void => {
  canvasRegistry.set(id, canvas);
};

/** Remove a screen id's source canvas (e.g. when the game is torn down). */
export const unregisterGameScreenCanvas = (id: string): void => {
  canvasRegistry.delete(id);
};

/** The currently-registered source canvas for a screen id, or null. */
export const gameScreenCanvasFor = (
  id: string,
): HTMLCanvasElement | null => canvasRegistry.get(id) ?? null;

// ── The board mesh primitive ──────────────────────────────────────────────────

export type CanvasScreenBoardOptions = Readonly<{
  /** Live source canvas (already being drawn into). When null, a placeholder. */
  canvas: HTMLCanvasElement | null;
  /**
   * Optional registry id to LATE-BIND the source canvas: when `canvas` is null
   * at build time, `update()` polls `gameScreenCanvasFor(canvasId)` and swaps the
   * face texture's source the moment the canvas registers. This is essential when
   * the board mesh is created before the (async) game iframe canvas exists — the
   * common case for the in-Verse game screen.
   */
  canvasId?: string;
  /** Screen width in world units (the face plane width). */
  width?: number;
  /** Screen height in world units (the face plane height). */
  height?: number;
  /** Frame/bezel color around the screen. */
  frameColor?: number;
  /** Placeholder face color when there is no source canvas yet. */
  placeholderColor?: number;
}>;

export type CanvasScreenBoardHandle = Readonly<{
  /** The board group to add to the scene (face + bezel + stand). */
  object3D: Three.Group;
  /**
   * Mark the screen texture dirty so the next render samples the latest frame
   * the source canvas drew. Cheap no-op when there is no live texture.
   */
  update: () => void;
  /** Whether a live source canvas is currently driving the face. */
  hasLiveSource: () => boolean;
  /** Release the screen's geometry/material/texture. */
  dispose: () => void;
}>;

const PLACEHOLDER_LABEL = "screen off";

// Build a small offscreen 2D canvas showing a neutral "screen off" face, so the
// board is never an undefined/black void when no game is registered (headless,
// pre-spawn, or after teardown). Drawn once; no animation.
const makePlaceholderCanvas = (
  placeholderColor: number,
): HTMLCanvasElement | null => {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (ctx === null) return null;
  const hex = `#${placeholderColor.toString(16).padStart(6, "0")}`;
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.font = "600 26px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(PLACEHOLDER_LABEL, canvas.width / 2, canvas.height / 2);
  return canvas;
};

/**
 * A flat "arcade screen" board: a thin bezel box behind a face plane that shows
 * the provided `canvas` as a live CanvasTexture. Call `update()` each frame to
 * push the latest game frame. The group's local +Z faces "out" of the screen
 * (toward a viewer in front of the board); the host rotates the group as needed.
 */
export const createCanvasScreenBoard = (
  options: CanvasScreenBoardOptions,
): CanvasScreenBoardHandle => {
  const width = options.width ?? 2.6;
  const height = options.height ?? 1.7;
  const frameColor = options.frameColor ?? 0x101418;
  const placeholderColor = options.placeholderColor ?? 0x0b0d12;

  const group = new Three.Group();
  group.name = "game-screen-board";

  // Bezel (a thin slab the face sits on the front of).
  const bezelDepth = 0.08;
  const bezelPad = 0.14;
  const bezel = new Three.Mesh(
    new Three.BoxGeometry(width + bezelPad, height + bezelPad, bezelDepth),
    new Three.MeshStandardMaterial({
      color: frameColor,
      emissive: 0x05070a,
      metalness: 0.2,
      roughness: 0.6,
    }),
  );
  group.add(bezel);

  const tuneTexture = (texture: Three.CanvasTexture): Three.CanvasTexture => {
    // The game canvas is drawn with the conventional top-left origin; three's
    // default texture flipY already matches that for a front-facing plane.
    texture.colorSpace = Three.SRGBColorSpace;
    texture.minFilter = Three.LinearFilter;
    texture.magFilter = Three.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  };

  // The live face. Prefer the directly-provided canvas; otherwise the registered
  // canvas (by id); otherwise a neutral placeholder so the screen is never a void.
  // When neither is available yet but a `canvasId` was given, we late-bind in
  // `update()` (the common in-Verse case: the board is built before the async
  // game canvas exists).
  const initialCanvas =
    options.canvas ??
    (options.canvasId === undefined ? null : gameScreenCanvasFor(options.canvasId)) ??
    makePlaceholderCanvas(placeholderColor);
  let liveSourceCanvas: HTMLCanvasElement | null =
    options.canvas ??
    (options.canvasId === undefined ? null : gameScreenCanvasFor(options.canvasId));

  let texture =
    initialCanvas === null ? null : tuneTexture(new Three.CanvasTexture(initialCanvas));

  const faceMaterial =
    texture === null
      ? new Three.MeshBasicMaterial({ color: placeholderColor })
      : new Three.MeshBasicMaterial({ map: texture, toneMapped: false });

  const faceGeometry = new Three.PlaneGeometry(width, height);
  const face = new Three.Mesh(faceGeometry, faceMaterial);
  // Sit the face just in front of the bezel's front surface.
  face.position.z = bezelDepth / 2 + 0.002;
  group.add(face);

  let disposed = false;

  // Swap the face texture to a freshly-registered game canvas (late-bind).
  const attachCanvas = (canvas: HTMLCanvasElement): void => {
    const previous = texture;
    liveSourceCanvas = canvas;
    texture = tuneTexture(new Three.CanvasTexture(canvas));
    faceMaterial.map = texture;
    faceMaterial.toneMapped = false;
    faceMaterial.color.set(0xffffff);
    faceMaterial.needsUpdate = true;
    previous?.dispose();
  };

  return {
    object3D: group,
    update: () => {
      if (disposed) return;
      // Late-bind: if we don't yet have the live game canvas but were given an id,
      // try to pick it up now (it registers asynchronously after the iframe boots).
      if (liveSourceCanvas === null && options.canvasId !== undefined) {
        const found = gameScreenCanvasFor(options.canvasId);
        if (found !== null) attachCanvas(found);
      }
      if (texture === null || liveSourceCanvas === null) return;
      // Push the latest game frame to the GPU on the next render.
      texture.needsUpdate = true;
    },
    hasLiveSource: () => liveSourceCanvas !== null && texture !== null,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      faceGeometry.dispose();
      faceMaterial.dispose();
      texture?.dispose();
      bezel.geometry.dispose();
      (bezel.material as Three.Material).dispose();
    },
  };
};
