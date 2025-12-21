/**
 * KYC Protect API Client
 *
 * Client for Creditsafe's KYC Protect compliance screening API.
 * Uses the same authentication as the main Creditsafe API.
 */

import { creditsafeFetch } from "../creditsafe/client";
import {
  KycBusinessSearchRequest,
  KycBusinessSearchResponse,
  KycHitsResponse,
  KycProtectErrorResponse,
} from "./types";

const TIMEOUT_MS = 15000; // KYC searches can take longer

/**
 * Search for a business in KYC Protect.
 * Returns a search ID and initial hit count.
 *
 * @param request - Search criteria
 * @returns Search response with ID and hit count
 */
export async function searchBusiness(
  request: KycBusinessSearchRequest
): Promise<KycBusinessSearchResponse> {
  const body = {
    name: request.name,
    ...(request.countryCode && { countries: [request.countryCode] }),
    ...(request.registrationNumber && {
      registrationNumber: request.registrationNumber,
    }),
  };

  return creditsafeFetch<KycBusinessSearchResponse>(
    "/compliance/kyc-protect/searches/businesses",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

/**
 * Get hits for a business search.
 *
 * @param searchId - The search ID from searchBusiness()
 * @returns List of hits with categories and match scores
 */
export async function getBusinessSearchHits(
  searchId: string
): Promise<KycHitsResponse> {
  return creditsafeFetch<KycHitsResponse>(
    `/compliance/kyc-protect/searches/businesses/${searchId}/hits`
  );
}

/**
 * Convenience function: Search business and get hits in one call.
 *
 * @param name - Business name to search
 * @param countryCode - Optional 2-letter country code (e.g., "BE")
 * @returns Full search results with hits
 */
export async function searchBusinessWithHits(
  name: string,
  countryCode?: string
): Promise<KycBusinessSearchResponse & { hits: KycHitsResponse["items"] }> {
  // First, create the search
  const searchResponse = await searchBusiness({
    name,
    countryCode,
  });

  // If no hits, return early
  if (searchResponse.totalHitCount === 0) {
    return {
      ...searchResponse,
      hits: [],
    };
  }

  // Get the hits
  const hitsResponse = await getBusinessSearchHits(searchResponse.id);

  return {
    ...searchResponse,
    hits: hitsResponse.items,
  };
}
