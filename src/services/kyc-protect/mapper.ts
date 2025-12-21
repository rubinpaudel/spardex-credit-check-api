/**
 * KYC Protect Mapper
 *
 * Maps KYC Protect API responses to normalized data for rule evaluation.
 */

import {
  KycBusinessSearchResponse,
  KycHit,
  KycDataset,
  KycProtectData,
} from "./types";

/**
 * Check if a hit is relevant for flagging.
 * A hit is only considered relevant if:
 * 1. It has been human-verified as a true match (decision === "trueMatch")
 * 2. The name exactly matches the searched company name (case-insensitive)
 *
 * @param hit - The hit to check
 * @param searchedName - The company name that was searched
 * @returns True if the hit should be considered for flagging
 */
function isRelevantHit(hit: KycHit, searchedName: string): boolean {
  // Must be human-verified as a true match
  if (hit.decision !== "trueMatch") {
    return false;
  }

  // Must be exact name match (case-insensitive)
  const normalizedHitName = hit.name.toLowerCase().trim();
  const normalizedSearchName = searchedName.toLowerCase().trim();

  return normalizedHitName === normalizedSearchName;
}

/**
 * Map KYC Protect search results to normalized data.
 *
 * @param searchResponse - The search response with ID
 * @param hits - The hits from the search
 * @param companyName - The company name searched
 * @returns Normalized KYC Protect data for rules
 */
export function mapKycProtectResponse(
  searchResponse: KycBusinessSearchResponse,
  hits: KycHit[],
  companyName: string
): KycProtectData {
  // Filter to only relevant hits (exact name match + trueMatch decision)
  const relevantHits = hits.filter((hit) => isRelevantHit(hit, companyName));

  // Check for specific dataset codes in relevant hits only
  const hasSanctionHit = relevantHits.some((hit) =>
    hit.datasets.includes("SAN")
  );
  const hasEnforcementHit = relevantHits.some((hit) =>
    hit.datasets.includes("ENF")
  );
  const hasPepHit = relevantHits.some((hit) => hit.datasets.includes("PEP"));
  const hasAdverseMediaHit = relevantHits.some((hit) =>
    hit.datasets.includes("AM")
  );

  return {
    searchId: searchResponse.id,
    companyName,
    hasSanctionHit,
    hasEnforcementHit,
    hasPepHit,
    hasAdverseMediaHit,
    totalHits: relevantHits.length,
    hits: relevantHits,
  };
}

/**
 * Create empty KYC Protect data when no search was performed.
 */
export function createEmptyKycProtectData(companyName: string): KycProtectData {
  return {
    searchId: "",
    companyName,
    hasSanctionHit: false,
    hasEnforcementHit: false,
    hasPepHit: false,
    hasAdverseMediaHit: false,
    totalHits: 0,
    hits: [],
  };
}

/**
 * Check if any high-risk hits are present.
 * High-risk = sanctions or enforcement hits.
 */
export function hasHighRiskHits(data: KycProtectData): boolean {
  return data.hasSanctionHit || data.hasEnforcementHit;
}

/**
 * Get hit datasets as a readable string.
 */
export function getHitDatasetsDescription(hits: KycHit[]): string {
  const allDatasets = new Set<KycDataset>();

  for (const hit of hits) {
    for (const dataset of hit.datasets) {
      allDatasets.add(dataset);
    }
  }

  if (allDatasets.size === 0) {
    return "None";
  }

  const datasetLabels: Record<KycDataset, string> = {
    SAN: "Sanctions",
    PEP: "PEP",
    AM: "Adverse Media",
    ENF: "Enforcement",
    POI: "Persons of Interest",
    INS: "Insolvency",
    SOE: "State-Owned Enterprises",
  };

  return Array.from(allDatasets)
    .map((ds) => datasetLabels[ds] || ds)
    .join(", ");
}
