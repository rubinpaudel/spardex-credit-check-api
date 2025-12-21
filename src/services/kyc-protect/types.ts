/**
 * KYC Protect API Types
 *
 * Types for Creditsafe's KYC Protect compliance screening API.
 */

// ============================================================================
// Request Types
// ============================================================================

/**
 * Request body for business screening search.
 */
export interface KycBusinessSearchRequest {
  name: string;
  countryCode?: string;
  registrationNumber?: string;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Response from POST /compliance/kyc-protect/searches/businesses
 */
export interface KycBusinessSearchResponse {
  id: string; // Search ID
  searchCriteria: {
    name: string;
    countryCode?: string;
  };
  hitCount: number;
  created: string; // ISO date
}

/**
 * Individual hit from a KYC screening search.
 */
export interface KycHit {
  hitId: string;
  matchScore: number; // 0-100
  name: string;
  countries: string[];
  categories: KycHitCategory[];
  decision?: KycHitDecision;
  modifiedAt?: string;
}

/**
 * Category of a KYC hit.
 */
export type KycHitCategory =
  | "sanctions"
  | "pep"
  | "adverseMedia"
  | "enforcement"
  | "regulatory"
  | "stateOwned"
  | "other";

/**
 * Decision status for a hit.
 */
export type KycHitDecision =
  | "undecided"
  | "trueMatch"
  | "falsePositive"
  | "discarded";

/**
 * Response from GET /compliance/kyc-protect/searches/businesses/{searchId}/hits
 */
export interface KycHitsResponse {
  hits: KycHit[];
  totalHits: number;
}

// ============================================================================
// Normalized Data Types (used by rules)
// ============================================================================

/**
 * Normalized KYC Protect data for rule evaluation.
 */
export interface KycProtectData {
  searchId: string;
  companyName: string;

  // Hit flags (simplified for rule evaluation)
  hasSanctionHit: boolean;
  hasEnforcementHit: boolean;
  hasPepHit: boolean;
  hasAdverseMediaHit: boolean;

  // Total hit count
  totalHits: number;

  // Full hits for detailed inspection
  hits: KycHit[];
}

// ============================================================================
// Error Types
// ============================================================================

export interface KycProtectErrorResponse {
  correlationId?: string;
  message: string;
  details?: string;
}
