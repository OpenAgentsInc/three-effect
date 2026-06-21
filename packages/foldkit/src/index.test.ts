import { describe, expect, test } from "bun:test"

import {
  activeTrainingRunStagingPointerEvents,
  trainingRunStagingPointerEvents,
} from "./trainingRunStaging"

describe("training run Foldkit element", () => {
  test("keeps the active staged canvas interactive for drag and wheel controls", () => {
    expect(trainingRunStagingPointerEvents(false)).toBe("auto")
    expect(activeTrainingRunStagingPointerEvents).toBe("auto")
  })

  test("keeps a hidden replacement stage inert until it swaps in", () => {
    expect(trainingRunStagingPointerEvents(true)).toBe("none")
  })
})
