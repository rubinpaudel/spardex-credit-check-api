/**
 * Delta configuration for credit score adjustments.
 *
 * This file contains the delta lookup tables for:
 * - Postcode (based on Belgian postal code prefixes)
 * - NACE codes (industry sectors)
 * - Company age (time since incorporation)
 *
 * Deltas are applied to the base Creditsafe credit score to calculate
 * an adjusted score used for tier determination.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * A delta outcome can be:
 * - A number: Applied to the score (positive or negative)
 * - "reject": Causes immediate rejection for this tier
 * - "manual": Triggers manual review for this tier
 */
export type DeltaOutcome = number | "reject" | "manual";

/**
 * Postcode delta configuration entry.
 * Uses prefix matching - more specific prefixes are matched first.
 */
export interface PostcodeDelta {
  prefix: string;
  region: string;
  delta: number;
}

/**
 * NACE code delta configuration entry.
 * Supports both exact matches (e.g., "46.72") and prefix matches (e.g., "55").
 */
export interface NaceDelta {
  codes: string[];
  sector: string;
  excellent: DeltaOutcome;
  good: DeltaOutcome;
  fair: DeltaOutcome;
  poor: DeltaOutcome;
}

/**
 * Company age delta configuration entry.
 * Ages are specified in months.
 */
export interface AgeDelta {
  minMonths: number; // Inclusive
  maxMonths: number; // Exclusive (use Infinity for "5+ years")
  label: string;
  excellent: DeltaOutcome;
  good: DeltaOutcome;
  fair: DeltaOutcome;
  poor: DeltaOutcome;
}

// ============================================================================
// Postcode Deltas
// ============================================================================

/**
 * Postcode deltas based on Belgian postal code prefixes.
 * Order matters: more specific prefixes should come first.
 */
export const postcodeDeltas: PostcodeDelta[] = [
  // Most specific first (4-digit prefixes)
  { prefix: "1340", region: "Louvain-la-Neuve", delta: 20 },
  { prefix: "8300", region: "Knokke-Heist", delta: 20 },

  // 3-digit prefixes
  { prefix: "200", region: "Antwerpen stad", delta: -30 },
  { prefix: "100", region: "Brussel stad", delta: -30 },
  { prefix: "108", region: "Molenbeek", delta: -30 },

  // 2-digit prefixes - Brussels Rand (10, 11, 12)
  { prefix: "10", region: "Brussel Rand", delta: -20 },
  { prefix: "11", region: "Brussel Rand", delta: -20 },
  { prefix: "12", region: "Brussel Rand", delta: -20 },

  // Antwerpen Haven (20, 21)
  { prefix: "20", region: "Antwerpen Haven", delta: -15 },
  { prefix: "21", region: "Antwerpen Haven", delta: -15 },

  // Antwerpse Kempen / Rand (22-29) - 0 delta
  { prefix: "22", region: "Antwerpse Kempen", delta: 0 },
  { prefix: "23", region: "Antwerpse Kempen", delta: 0 },
  { prefix: "24", region: "Antwerpse Kempen", delta: 0 },
  { prefix: "25", region: "Antwerpse Kempen", delta: 0 },
  { prefix: "26", region: "Antwerpse Kempen", delta: 0 },
  { prefix: "27", region: "Antwerpse Kempen", delta: 0 },
  { prefix: "28", region: "Antwerpse Kempen", delta: 0 },
  { prefix: "29", region: "Antwerpse Kempen", delta: 0 },

  // Vlaams-Brabant / Leuven (30-34)
  { prefix: "30", region: "Vlaams-Brabant", delta: 10 },
  { prefix: "31", region: "Vlaams-Brabant", delta: 10 },
  { prefix: "32", region: "Vlaams-Brabant", delta: 10 },
  { prefix: "33", region: "Vlaams-Brabant", delta: 10 },
  { prefix: "34", region: "Vlaams-Brabant", delta: 10 },

  // Luik & Omgeving (40-49)
  { prefix: "40", region: "Luik", delta: -20 },
  { prefix: "41", region: "Luik", delta: -20 },
  { prefix: "42", region: "Luik", delta: -20 },
  { prefix: "43", region: "Luik", delta: -20 },
  { prefix: "44", region: "Luik", delta: -20 },
  { prefix: "45", region: "Luik", delta: -20 },
  { prefix: "46", region: "Luik", delta: -20 },
  { prefix: "47", region: "Luik", delta: -20 },
  { prefix: "48", region: "Luik", delta: -20 },
  { prefix: "49", region: "Luik", delta: -20 },

  // Namen & Waals-Brabant (50-59) - 0 delta
  { prefix: "50", region: "Namen", delta: 0 },
  { prefix: "51", region: "Namen", delta: 0 },
  { prefix: "52", region: "Namen", delta: 0 },
  { prefix: "53", region: "Namen", delta: 0 },
  { prefix: "54", region: "Namen", delta: 0 },
  { prefix: "55", region: "Namen", delta: 0 },
  { prefix: "56", region: "Namen", delta: 0 },
  { prefix: "57", region: "Namen", delta: 0 },
  { prefix: "58", region: "Namen", delta: 0 },
  { prefix: "59", region: "Namen", delta: 0 },

  // Charleroi & Henegouwen (60-65)
  { prefix: "60", region: "Charleroi", delta: -25 },
  { prefix: "61", region: "Charleroi", delta: -25 },
  { prefix: "62", region: "Charleroi", delta: -25 },
  { prefix: "63", region: "Charleroi", delta: -25 },
  { prefix: "64", region: "Charleroi", delta: -25 },
  { prefix: "65", region: "Charleroi", delta: -25 },

  // Rest of Henegouwen (66-79) - default 0
  // (not explicitly in the config, will use default)

  // West-Vlaanderen (80-89)
  { prefix: "80", region: "West-Vlaanderen", delta: 10 },
  { prefix: "81", region: "West-Vlaanderen", delta: 10 },
  { prefix: "82", region: "West-Vlaanderen", delta: 10 },
  { prefix: "83", region: "West-Vlaanderen", delta: 10 },
  { prefix: "84", region: "West-Vlaanderen", delta: 10 },
  { prefix: "85", region: "West-Vlaanderen", delta: 10 },
  { prefix: "86", region: "West-Vlaanderen", delta: 10 },
  { prefix: "87", region: "West-Vlaanderen", delta: 10 },
  { prefix: "88", region: "West-Vlaanderen", delta: 10 },
  { prefix: "89", region: "West-Vlaanderen", delta: 10 },

  // Oost-Vlaanderen / Gent (90-99) - 0 delta
  { prefix: "90", region: "Oost-Vlaanderen", delta: 0 },
  { prefix: "91", region: "Oost-Vlaanderen", delta: 0 },
  { prefix: "92", region: "Oost-Vlaanderen", delta: 0 },
  { prefix: "93", region: "Oost-Vlaanderen", delta: 0 },
  { prefix: "94", region: "Oost-Vlaanderen", delta: 0 },
  { prefix: "95", region: "Oost-Vlaanderen", delta: 0 },
  { prefix: "96", region: "Oost-Vlaanderen", delta: 0 },
  { prefix: "97", region: "Oost-Vlaanderen", delta: 0 },
  { prefix: "98", region: "Oost-Vlaanderen", delta: 0 },
  { prefix: "99", region: "Oost-Vlaanderen", delta: 0 },
];

// ============================================================================
// NACE Code Deltas
// ============================================================================

/**
 * NACE code deltas with tier-specific outcomes.
 * Uses prefix matching for 2-digit codes (e.g., "55" matches "55.10").
 */
export const naceDeltas: NaceDelta[] = [
  {
    codes: ["46.72"],
    sector: "Diamanthandel",
    excellent: "reject",
    good: "reject",
    fair: "reject",
    poor: "manual",
  },
  {
    codes: ["45.11", "45.19"],
    sector: "Autohandel",
    excellent: -20,
    good: -20,
    fair: 0,
    poor: "reject",
  },
  {
    codes: ["49.32"],
    sector: "Taxi's",
    excellent: -20,
    good: -20,
    fair: 0,
    poor: "reject",
  },
  {
    codes: ["77.11"],
    sector: "Autoverhuur",
    excellent: -20,
    good: -20,
    fair: 0,
    poor: "reject",
  },
  {
    codes: ["55", "56"], // Prefix match: 55.xx and 56.xx
    sector: "Horeca",
    excellent: -20,
    good: -20,
    fair: 0,
    poor: 0,
  },
  {
    codes: ["92", "93"], // Prefix match: 92.xx and 93.xx
    sector: "Gokken, Sport & Recreatie",
    excellent: "reject",
    good: "reject",
    fair: 0,
    poor: "manual",
  },
];

// ============================================================================
// Company Age Deltas
// ============================================================================

/**
 * Company age deltas with tier-specific outcomes.
 * Ages are specified in months for precision.
 */
export const ageDeltas: AgeDelta[] = [
  {
    minMonths: 0,
    maxMonths: 3,
    label: "<3m",
    excellent: "reject",
    good: "reject",
    fair: "reject",
    poor: 0,
  },
  {
    minMonths: 3,
    maxMonths: 6,
    label: "3-6m",
    excellent: "reject",
    good: "reject",
    fair: "reject",
    poor: 0,
  },
  {
    minMonths: 6,
    maxMonths: 12,
    label: "6-12m",
    excellent: "reject",
    good: "reject",
    fair: -30,
    poor: 0,
  },
  {
    minMonths: 12,
    maxMonths: 24,
    label: "12-24m (1-2j)",
    excellent: "reject",
    good: -20,
    fair: -20,
    poor: 0,
  },
  {
    minMonths: 24,
    maxMonths: 36,
    label: "24-36m (2-3j)",
    excellent: -20,
    good: -15,
    fair: -10,
    poor: 0,
  },
  {
    minMonths: 36,
    maxMonths: 48,
    label: "36-48m (3-4j)",
    excellent: -15,
    good: -15,
    fair: 0,
    poor: 0,
  },
  {
    minMonths: 48,
    maxMonths: 60,
    label: "48-60m (4-5j)",
    excellent: -5,
    good: 0,
    fair: 0,
    poor: 0,
  },
  {
    minMonths: 60,
    maxMonths: Infinity,
    label: "5+ years",
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0,
  },
];
