import { afterEach, describe, expect, test } from "bun:test"
import * as Three from "three"

import {
  createCanvasScreenBoard,
  gameScreenCanvasFor,
  registerGameScreenCanvas,
  unregisterGameScreenCanvas,
} from "./gameScreenPrimitives"

// A minimal stand-in for an HTMLCanvasElement — three's CanvasTexture only needs
// an object with width/height/(get)Context for construction in a headless test;
// the registry only stores/returns the reference.
const fakeCanvas = (): HTMLCanvasElement => {
  const obj = {
    width: 320,
    height: 200,
    getContext: () => null,
  }
  return obj as unknown as HTMLCanvasElement
}

afterEach(() => {
  unregisterGameScreenCanvas("test:screen")
})

describe("game screen canvas registry", () => {
  test("register/lookup/unregister round-trips a canvas by id", () => {
    expect(gameScreenCanvasFor("test:screen")).toBeNull()
    const canvas = fakeCanvas()
    registerGameScreenCanvas("test:screen", canvas)
    expect(gameScreenCanvasFor("test:screen")).toBe(canvas)
    unregisterGameScreenCanvas("test:screen")
    expect(gameScreenCanvasFor("test:screen")).toBeNull()
  })

  test("re-registering replaces the canvas for an id", () => {
    const a = fakeCanvas()
    const b = fakeCanvas()
    registerGameScreenCanvas("test:screen", a)
    registerGameScreenCanvas("test:screen", b)
    expect(gameScreenCanvasFor("test:screen")).toBe(b)
  })
})

describe("createCanvasScreenBoard", () => {
  test("no source canvas → placeholder face, no live source, disposes clean", () => {
    const board = createCanvasScreenBoard({ canvas: null })
    expect(board.object3D).toBeInstanceOf(Three.Group)
    expect(board.hasLiveSource()).toBe(false)
    // update() is a safe no-op without a live texture.
    expect(() => board.update()).not.toThrow()
    expect(() => board.dispose()).not.toThrow()
    // Double dispose is safe.
    expect(() => board.dispose()).not.toThrow()
  })

  test("a live source canvas drives the face texture (hasLiveSource true)", () => {
    const board = createCanvasScreenBoard({
      canvas: fakeCanvas(),
      width: 3,
      height: 2,
    })
    expect(board.hasLiveSource()).toBe(true)
    // The face plane carries a map (CanvasTexture). Find the textured mesh.
    const textured = board.object3D.children.find(
      (child): child is Three.Mesh =>
        child instanceof Three.Mesh &&
        (child.material as Three.MeshBasicMaterial).map !== null &&
        (child.material as Three.MeshBasicMaterial).map !== undefined,
    )
    expect(textured).toBeDefined()
    const map = (textured!.material as Three.MeshBasicMaterial).map
    expect(map).toBeInstanceOf(Three.CanvasTexture)
    // `needsUpdate` is a write-only accessor that bumps the texture version, so
    // we observe the version increment rather than reading the flag back.
    const versionBefore = map!.version
    board.update()
    expect(map!.version).toBeGreaterThan(versionBefore)
    board.dispose()
  })

  test("canvasId late-binds: a board built before the canvas registers picks it up on update()", () => {
    // Build with NO canvas yet, only an id — the common in-Verse case.
    expect(gameScreenCanvasFor("test:screen")).toBeNull()
    const board = createCanvasScreenBoard({ canvas: null, canvasId: "test:screen" })
    expect(board.hasLiveSource()).toBe(false)

    // Now the game canvas registers (async, after the iframe booted).
    registerGameScreenCanvas("test:screen", fakeCanvas())
    // The next update() swaps the placeholder face to the live canvas texture.
    board.update()
    expect(board.hasLiveSource()).toBe(true)

    const textured = board.object3D.children.find(
      (child): child is Three.Mesh =>
        child instanceof Three.Mesh &&
        (child.material as Three.MeshBasicMaterial).map instanceof Three.CanvasTexture,
    )
    expect(textured).toBeDefined()
    board.dispose()
  })
})
