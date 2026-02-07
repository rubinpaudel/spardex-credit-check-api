export { calculateAdjustedScore } from "./calculator";
export type { ScoreCalculationInput } from "./calculator";
export type { ScoreCalculationResult, DeltaResult, TierKey } from "./types";
export { getTierKey } from "./types";
export { getPostcodeDelta } from "./postcode-delta";
export { getWorstNumericNaceDelta, getNaceOutcomeForTier } from "./nace-delta";
export { getWorstNumericAgeDelta, getAgeOutcomeForTier } from "./age-delta";
