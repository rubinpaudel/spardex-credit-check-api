/**
 * KYC Protect Mapper
 *
 * Maps KYC Protect API responses to normalized data for rule evaluation.
 */

import {
  KycBusinessSearchResponse,
  KycHit,
  KycHitCategory,
  KycProtectData,
} from "./types";

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
  // Check for specific hit categories
  const hasSanctionHit = hits.some((hit) =>
    hit.categories.includes("sanctions")
  );
  const hasEnforcementHit = hits.some(
    (hit) =>
      hit.categories.includes("enforcement") ||
      hit.categories.includes("regulatory")
  );
  const hasPepHit = hits.some((hit) => hit.categories.includes("pep"));
  const hasAdverseMediaHit = hits.some((hit) =>
    hit.categories.includes("adverseMedia")
  );

  return {
    searchId: searchResponse.id,
    companyName,
    hasSanctionHit,
    hasEnforcementHit,
    hasPepHit,
    hasAdverseMediaHit,
    totalHits: hits.length,
    hits,
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
 * Get hit categories as a readable string.
 */
export function getHitCategoriesDescription(hits: KycHit[]): string {
  const allCategories = new Set<KycHitCategory>();

  for (const hit of hits) {
    for (const category of hit.categories) {
      allCategories.add(category);
    }
  }

  if (allCategories.size === 0) {
    return "None";
  }

  const categoryLabels: Record<KycHitCategory, string> = {
    sanctions: "Sanctions",
    pep: "PEP",
    adverseMedia: "Adverse Media",
    enforcement: "Enforcement",
    regulatory: "Regulatory",
    stateOwned: "State Owned",
    other: "Other",
  };

  return Array.from(allCategories)
    .map((cat) => categoryLabels[cat] || cat)
    .join(", ");
}
