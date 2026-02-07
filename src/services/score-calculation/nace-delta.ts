import { naceDeltas, DeltaOutcome, NaceDelta } from "../../config/delta-config";
import { Tier } from "../../types/tiers";
import { DeltaResult, TierKey, getTierKey } from "./types";

/**
 * Check if a NACE code matches the config entry.
 * Supports both exact matches ("45.11") and prefix matches ("55" matches "55.10").
 */
function naceCodeMatches(code: string, patterns: string[]): boolean {
  const cleanCode = code.replace(/\s+/g, "");
  return patterns.some((pattern) => {
    // Exact match
    if (cleanCode === pattern) return true;

    // Prefix match for 2-digit codes (e.g., "55" matches "55.10")
    if (pattern.length === 2 && cleanCode.startsWith(pattern)) {
      // Ensure it's a proper prefix (followed by . or end of string)
      return (
        cleanCode.length === 2 ||
        cleanCode[2] === "." ||
        cleanCode.startsWith(pattern + ".")
      );
    }

    return false;
  });
}

/**
 * Find the matching NACE delta entry for a given NACE code.
 */
function findNaceEntry(naceCode: string): NaceDelta | null {
  for (const entry of naceDeltas) {
    if (naceCodeMatches(naceCode, entry.codes)) {
      return entry;
    }
  }
  return null;
}

/**
 * Get the worst (most negative) numeric delta from all matching NACE codes.
 * Ignores "reject" and "manual" outcomes - those are handled separately.
 *
 * @param naceCodes - Array of company's NACE codes
 * @returns DeltaResult with the worst numeric delta
 */
export function getWorstNumericNaceDelta(naceCodes: string[]): DeltaResult {
  if (!naceCodes || naceCodes.length === 0) {
    return {
      source: "nace",
      sourceValue: "none",
      delta: 0,
      description: "No NACE codes: no adjustment applied",
    };
  }

  let worstDelta = 0;
  let matchedEntry: NaceDelta | null = null;
  let matchedCode: string | null = null;

  for (const code of naceCodes) {
    const entry = findNaceEntry(code);
    if (!entry) continue;

    // Check all tier values for the worst numeric delta
    const tierValues = [
      entry.excellent,
      entry.good,
      entry.fair,
      entry.poor,
    ];

    for (const value of tierValues) {
      if (typeof value === "number" && value < worstDelta) {
        worstDelta = value;
        matchedEntry = entry;
        matchedCode = code;
      }
    }
  }

  if (matchedEntry && matchedCode) {
    return {
      source: "nace",
      sourceValue: matchedCode,
      delta: worstDelta,
      description: `NACE ${matchedCode} (${matchedEntry.sector}): ${worstDelta}`,
    };
  }

  return {
    source: "nace",
    sourceValue: naceCodes.join(", "),
    delta: 0,
    description: "No matching NACE delta rules: no adjustment applied",
  };
}

/**
 * Get the NACE outcome for a specific tier.
 * Used after tier determination to check for reject/manual restrictions.
 *
 * @param naceCodes - Array of company's NACE codes
 * @param tier - The tier to check
 * @returns The outcome for this tier, or null if no matching NACE codes
 */
export function getNaceOutcomeForTier(
  naceCodes: string[],
  tier: Tier
): { outcome: DeltaOutcome; entry: NaceDelta; code: string } | null {
  if (!naceCodes || naceCodes.length === 0) {
    return null;
  }

  const tierKey = getTierKey(tier);
  if (!tierKey) {
    return null;
  }

  // Find the worst outcome across all NACE codes
  let worstOutcome: DeltaOutcome | null = null;
  let worstEntry: NaceDelta | null = null;
  let worstCode: string | null = null;

  for (const code of naceCodes) {
    const entry = findNaceEntry(code);
    if (!entry) continue;

    const outcome = entry[tierKey];

    // Determine if this outcome is worse than the current worst
    if (worstOutcome === null) {
      worstOutcome = outcome;
      worstEntry = entry;
      worstCode = code;
    } else if (outcome === "reject") {
      // Reject is always the worst
      worstOutcome = "reject";
      worstEntry = entry;
      worstCode = code;
    } else if (outcome === "manual" && worstOutcome !== "reject") {
      // Manual is worse than numeric
      worstOutcome = "manual";
      worstEntry = entry;
      worstCode = code;
    } else if (
      typeof outcome === "number" &&
      typeof worstOutcome === "number" &&
      outcome < worstOutcome
    ) {
      // More negative is worse
      worstOutcome = outcome;
      worstEntry = entry;
      worstCode = code;
    }
  }

  if (worstOutcome !== null && worstEntry && worstCode) {
    return { outcome: worstOutcome, entry: worstEntry, code: worstCode };
  }

  return null;
}
