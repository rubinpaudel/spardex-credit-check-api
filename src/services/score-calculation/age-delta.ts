import { ageDeltas, DeltaOutcome, AgeDelta } from "../../config/delta-config";
import { Tier } from "../../types/tiers";
import { DeltaResult, getTierKey } from "./types";

/**
 * Find the matching age bracket for a company's age.
 *
 * @param ageMonths - Company age in months
 * @returns The matching AgeDelta entry, or null if none found
 */
function findAgeBracket(ageMonths: number): AgeDelta | null {
  return (
    ageDeltas.find(
      (entry) => ageMonths >= entry.minMonths && ageMonths < entry.maxMonths
    ) ?? null
  );
}

/**
 * Get the worst (most negative) numeric delta for a company's age.
 * Ignores "reject" and "manual" outcomes - those are handled separately.
 *
 * @param companyAgeYears - Company age in years (can be fractional)
 * @returns DeltaResult with the worst numeric delta
 */
export function getWorstNumericAgeDelta(companyAgeYears: number): DeltaResult {
  const ageMonths = companyAgeYears * 12;
  const bracket = findAgeBracket(ageMonths);

  if (!bracket) {
    return {
      source: "age",
      sourceValue: companyAgeYears,
      delta: 0,
      description: `Company age ${companyAgeYears.toFixed(1)} years: no matching bracket`,
    };
  }

  // Find the worst numeric delta across all tiers
  const tierValues = [
    bracket.excellent,
    bracket.good,
    bracket.fair,
    bracket.poor,
  ];

  let worstDelta = 0;
  for (const value of tierValues) {
    if (typeof value === "number" && value < worstDelta) {
      worstDelta = value;
    }
  }

  if (worstDelta < 0) {
    return {
      source: "age",
      sourceValue: companyAgeYears,
      delta: worstDelta,
      description: `Company age ${companyAgeYears.toFixed(1)} years (${bracket.label}): ${worstDelta}`,
    };
  }

  return {
    source: "age",
    sourceValue: companyAgeYears,
    delta: 0,
    description: `Company age ${companyAgeYears.toFixed(1)} years (${bracket.label}): no adjustment`,
  };
}

/**
 * Get the age outcome for a specific tier.
 * Used after tier determination to check for reject/manual restrictions.
 *
 * @param companyAgeYears - Company age in years (can be fractional)
 * @param tier - The tier to check
 * @returns The outcome for this tier, or null if no bracket found
 */
export function getAgeOutcomeForTier(
  companyAgeYears: number,
  tier: Tier
): { outcome: DeltaOutcome; bracket: AgeDelta } | null {
  const ageMonths = companyAgeYears * 12;
  const bracket = findAgeBracket(ageMonths);

  if (!bracket) {
    return null;
  }

  const tierKey = getTierKey(tier);
  if (!tierKey) {
    return null;
  }

  return { outcome: bracket[tierKey], bracket };
}
