import { Tier } from "../../types/tiers";
import { DeltaOutcome } from "../../config/delta-config";

/**
 * Result of a single delta calculation.
 */
export interface DeltaResult {
  source: "postcode" | "nace" | "age";
  sourceValue: string | number; // The actual postcode/NACE/age value
  delta: DeltaOutcome; // The delta or special outcome
  description: string; // Human-readable explanation
}

/**
 * Complete score calculation result.
 */
export interface ScoreCalculationResult {
  baseScore: number; // Raw Creditsafe credit rating
  adjustedScore: number; // Score after applying numeric deltas
  deltas: DeltaResult[]; // All applied deltas
  totalNumericDelta: number; // Sum of numeric deltas only

  // Tier determination
  determinedTier: Tier; // Tier based on adjusted score

  // Restriction check results (for the determined tier)
  naceRestriction: DeltaOutcome | null; // NACE outcome for the determined tier
  ageRestriction: DeltaOutcome | null; // Age outcome for the determined tier

  // Final outcome after applying restrictions
  finalTier: Tier; // May be REJECTED or MANUAL_REVIEW if restrictions apply
  hasReject: boolean; // True if NACE/Age caused rejection
  hasManualReview: boolean; // True if NACE/Age caused manual review
}

/**
 * Tier key for accessing tier-specific deltas.
 */
export type TierKey = "excellent" | "good" | "fair" | "poor";

/**
 * Map Tier enum to tier key string.
 */
export function getTierKey(tier: Tier): TierKey | null {
  switch (tier) {
    case Tier.EXCELLENT:
      return "excellent";
    case Tier.GOOD:
      return "good";
    case Tier.FAIR:
      return "fair";
    case Tier.POOR:
      return "poor";
    default:
      return null;
  }
}
