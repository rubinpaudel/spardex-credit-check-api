import { postcodeDeltas } from "../../config/delta-config";
import { DeltaResult } from "./types";

/**
 * Find the matching postcode delta for a given postal code.
 * Uses prefix matching - more specific (longer) prefixes are tried first.
 *
 * @param postalCode - The company's postal code (e.g., "1340", "2000")
 * @returns DeltaResult with the applicable delta
 */
export function getPostcodeDelta(postalCode: string | null): DeltaResult {
  if (!postalCode) {
    return {
      source: "postcode",
      sourceValue: "unknown",
      delta: 0,
      description: "Postal code unavailable: no adjustment applied",
    };
  }

  // Clean the postal code - remove spaces and non-digits
  const cleanCode = postalCode.replace(/\s+/g, "").replace(/\D/g, "").trim();

  if (!cleanCode) {
    return {
      source: "postcode",
      sourceValue: postalCode,
      delta: 0,
      description: `Invalid postal code "${postalCode}": no adjustment applied`,
    };
  }

  // Sort by prefix length descending (most specific first)
  const sortedDeltas = [...postcodeDeltas].sort(
    (a, b) => b.prefix.length - a.prefix.length
  );

  for (const entry of sortedDeltas) {
    if (cleanCode.startsWith(entry.prefix)) {
      const deltaStr =
        entry.delta >= 0 ? `+${entry.delta}` : `${entry.delta}`;
      return {
        source: "postcode",
        sourceValue: postalCode,
        delta: entry.delta,
        description: `Postal code ${postalCode} (${entry.region}): ${deltaStr}`,
      };
    }
  }

  // No match found - default to 0 delta
  return {
    source: "postcode",
    sourceValue: postalCode,
    delta: 0,
    description: `Postal code ${postalCode}: no adjustment (default region)`,
  };
}
