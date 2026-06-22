import { describe, expect, test } from "bun:test"

import {
  clearVerseIconCaches,
  verseIconCacheStats,
  verseIconPrimitiveSourceRefs,
  verseIconRecipeFor,
  verseIconRecipeForId,
  verseIconRenderPlan,
  type VerseIconKind,
} from "./verseIconPrimitives"

const taxonomy: ReadonlyArray<VerseIconKind> = [
  "agent",
  "chat",
  "focus",
  "inspect",
  "proof",
  "pylon",
  "receipt",
  "run",
  "settlement",
  "training",
  "zap",
]

describe("Verse icon recipes", () => {
  test("cite the WoC HUD adaptation docs", () => {
    expect(
      verseIconPrimitiveSourceRefs.some(ref => ref.includes("woc/02-hud")),
    ).toBe(true)
    expect(
      verseIconPrimitiveSourceRefs.some(ref => ref.includes("adaptation-plan")),
    ).toBe(true)
  })

  test("cover the OpenAgents taxonomy with hand-authored recipes", () => {
    for (const kind of taxonomy) {
      const recipe = verseIconRecipeFor(kind)
      expect(recipe.kind).toBe(kind)
      expect(recipe.fallback).toBe(false)
      expect(recipe.primitives.length).toBeGreaterThanOrEqual(3)
      expect(recipe.seed).toBe(verseIconRecipeFor(kind).seed)
    }
  })

  test("use deterministic keyword fallback for unknown ids", () => {
    const pylon = verseIconRecipeForId("openagents-pylon-station-42")
    expect(pylon.kind).toBe("pylon")
    expect(pylon.fallback).toBe(false)

    const unknownA = verseIconRecipeForId("crystal-lantern")
    const unknownB = verseIconRecipeForId("crystal-lantern")
    expect(unknownA.kind).toBe("unknown")
    expect(unknownA.fallback).toBe(true)
    expect(unknownA).toEqual(unknownB)
  })

  test("render plans are deterministic and cache repeated output", () => {
    clearVerseIconCaches()
    const recipe = verseIconRecipeForId("proof:run:alpha")
    const first = verseIconRenderPlan(recipe, 128)
    const second = verseIconRenderPlan(recipe, 128)
    expect(second).toBe(first)
    expect(first.commands.length).toBeGreaterThan(0)
    expect(first).toEqual(second)
    expect(verseIconCacheStats()).toEqual({ recipes: 1, drawPlans: 1 })
  })

  test("size is clamped to a texture-safe lower bound", () => {
    const plan = verseIconRenderPlan(verseIconRecipeFor("zap"), 2)
    expect(plan.size).toBe(16)
  })
})
