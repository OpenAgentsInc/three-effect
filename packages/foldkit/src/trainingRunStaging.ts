export const trainingRunStagingPointerEvents = (
  hasPreviousScene: boolean,
): "auto" | "none" => (hasPreviousScene ? "none" : "auto")

export const activeTrainingRunStagingPointerEvents = "auto" as const
