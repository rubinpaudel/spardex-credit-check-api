import { Tier } from "../../types/tiers";
import { tierThresholds } from "../../config/tier-config";
import { DeltaOutcome } from "../../config/delta-config";
import { ScoreCalculationResult, DeltaResult } from "./types";
import { getPostcodeDelta } from "./postcode-delta";
import { getWorstNumericNaceDelta, getNaceOutcomeForTier } from "./nace-delta";
import { getWorstNumericAgeDelta, getAgeOutcomeForTier } from "./age-delta";

/**
 * Data required for score calculation.
 */
export interface ScoreCalculationInput {
  creditRating: number; // Base score from Creditsafe (0-100)
  postalCode: string | null; // Company postal code
  naceCodes: string[]; // Company NACE codes
  companyAgeYears: number; // Company age in years
}

/**
 * Determine tier from adjusted score using new thresholds.
 *
 * Thresholds (from logica sheet):
 * - >= 70 → EXCELLENT
 * - >= 55 → GOOD
 * - >= 35 → FAIR
 * - >= 0  → POOR
 */
function determineTierFromScore(adjustedScore: number): Tier {
  if (adjustedScore >= tierThresholds[Tier.EXCELLENT].creditRatingMin) {
    return Tier.EXCELLENT;
  }
  if (adjustedScore >= tierThresholds[Tier.GOOD].creditRatingMin) {
    return Tier.GOOD;
  }
  if (adjustedScore >= tierThresholds[Tier.FAIR].creditRatingMin) {
    return Tier.FAIR;
  }
  if (adjustedScore >= tierThresholds[Tier.POOR].creditRatingMin) {
    return Tier.POOR;
  }
  return Tier.REJECTED;
}

/**
 * Calculate the adjusted credit score and determine final tier.
 *
 * Algorithm (Two-Phase):
 *
 * PHASE 1: Calculate Adjusted Score
 * 1. Get base score from Creditsafe
 * 2. Get postcode delta (same for all tiers)
 * 3. Get worst numeric NACE delta (most negative, ignore reject/manual)
 * 4. Get worst numeric Age delta (most negative, ignore reject/manual)
 * 5. adjustedScore = base + postcode + nace + age (clamped 0-100)
 *
 * PHASE 2: Determine Tier & Validate
 * 6. Determine tier from adjustedScore using thresholds
 * 7. Check NACE outcome for the determined tier (reject/manual)
 * 8. Check Age outcome for the determined tier (reject/manual)
 * 9. Return final tier
 */
export function calculateAdjustedScore(
  input: ScoreCalculationInput
): ScoreCalculationResult {
  const { creditRating, postalCode, naceCodes, companyAgeYears } = input;
  const deltas: DeltaResult[] = [];

  // =========================================================================
  // PHASE 1: Calculate Adjusted Score
  // =========================================================================

  // Step 1: Base score
  const baseScore = creditRating;

  // Step 2: Postcode delta (same for all tiers)
  const postcodeDelta = getPostcodeDelta(postalCode);
  deltas.push(postcodeDelta);

  // Step 3: Worst numeric NACE delta
  const naceDelta = getWorstNumericNaceDelta(naceCodes);
  deltas.push(naceDelta);

  // Step 4: Worst numeric Age delta
  const ageDelta = getWorstNumericAgeDelta(companyAgeYears);
  deltas.push(ageDelta);

  // Step 5: Calculate adjusted score (clamped 0-100)
  const totalNumericDelta =
    (typeof postcodeDelta.delta === "number" ? postcodeDelta.delta : 0) +
    (typeof naceDelta.delta === "number" ? naceDelta.delta : 0) +
    (typeof ageDelta.delta === "number" ? ageDelta.delta : 0);

  const adjustedScore = Math.max(0, Math.min(100, baseScore + totalNumericDelta));

  // Step 6: Determine tier from adjusted score
  const determinedTier = determineTierFromScore(adjustedScore);

  // If already rejected by score, no need to check restrictions
  if (determinedTier === Tier.REJECTED) {
    return {
      baseScore,
      adjustedScore,
      deltas,
      totalNumericDelta,
      determinedTier,
      naceRestriction: null,
      ageRestriction: null,
      finalTier: Tier.REJECTED,
      hasReject: true,
      hasManualReview: false,
    };
  }

  // Step 7: Check NACE outcome for the determined tier
  const naceResult = getNaceOutcomeForTier(naceCodes, determinedTier);
  const naceRestriction: DeltaOutcome | null = naceResult?.outcome ?? null;

  // Step 8: Check Age outcome for the determined tier
  const ageResult = getAgeOutcomeForTier(companyAgeYears, determinedTier);
  const ageRestriction: DeltaOutcome | null = ageResult?.outcome ?? null;

  // Step 9: Determine final tier based on restrictions
  let finalTier: Tier = determinedTier;
  let hasReject = false;
  let hasManualReview = false;

  // Check for rejection first (takes precedence)
  if (naceRestriction === "reject" || ageRestriction === "reject") {
    finalTier = Tier.REJECTED;
    hasReject = true;

    // Add detailed reason to deltas
    if (naceRestriction === "reject" && naceResult) {
      deltas.push({
        source: "nace",
        sourceValue: naceResult.code,
        delta: "reject",
        description: `NACE ${naceResult.code} (${naceResult.entry.sector}) causes rejection for ${tierName(determinedTier)} tier`,
      });
    }
    if (ageRestriction === "reject" && ageResult) {
      deltas.push({
        source: "age",
        sourceValue: companyAgeYears,
        delta: "reject",
        description: `Company age ${companyAgeYears.toFixed(1)} years (${ageResult.bracket.label}) causes rejection for ${tierName(determinedTier)} tier`,
      });
    }
  }
  // Check for manual review
  else if (naceRestriction === "manual" || ageRestriction === "manual") {
    finalTier = Tier.MANUAL_REVIEW;
    hasManualReview = true;

    // Add detailed reason to deltas
    if (naceRestriction === "manual" && naceResult) {
      deltas.push({
        source: "nace",
        sourceValue: naceResult.code,
        delta: "manual",
        description: `NACE ${naceResult.code} (${naceResult.entry.sector}) requires manual review for ${tierName(determinedTier)} tier`,
      });
    }
    if (ageRestriction === "manual" && ageResult) {
      deltas.push({
        source: "age",
        sourceValue: companyAgeYears,
        delta: "manual",
        description: `Company age ${companyAgeYears.toFixed(1)} years (${ageResult.bracket.label}) requires manual review for ${tierName(determinedTier)} tier`,
      });
    }
  }

  return {
    baseScore,
    adjustedScore,
    deltas,
    totalNumericDelta,
    determinedTier,
    naceRestriction,
    ageRestriction,
    finalTier,
    hasReject,
    hasManualReview,
  };
}

/**
 * Helper to convert tier enum to readable name.
 */
function tierName(tier: Tier): string {
  switch (tier) {
    case Tier.EXCELLENT:
      return "EXCELLENT";
    case Tier.GOOD:
      return "GOOD";
    case Tier.FAIR:
      return "FAIR";
    case Tier.POOR:
      return "POOR";
    case Tier.REJECTED:
      return "REJECTED";
    case Tier.MANUAL_REVIEW:
      return "MANUAL_REVIEW";
    default:
      return "UNKNOWN";
  }
}
