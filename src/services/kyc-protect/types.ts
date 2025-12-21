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
  id: string;
  name: string;
  threshold: number;
  type: string;
  datasets: string[];
  status: string;
  totalHitCount: number;
  truePositiveHitsCount: number;
  falsePositiveHitsCount: number;
  undecidedHitsCount: number;
  createdAt: string;
  modifiedAt: string;
}

/**
 * Dataset codes from the KYC Protect API.
 */
export type KycDataset =
  | "SAN" // Sanctions
  | "AM" // Adverse Media
  | "PEP" // Politically Exposed Persons
  | "ENF" // Enforcement
  | "POI" // Persons of Interest
  | "INS" // Insolvency
  | "SOE"; // State-Owned Enterprises

/**
 * Individual hit from a KYC screening search.
 */
export interface KycHit {
  id: string;
  hitScore: number;
  name: string;
  match: string;
  countries: string[];
  datasets: KycDataset[];
  decision: KycHitDecision;
  note: string | null;
  modifiedById: number;
  modifiedBy: string;
  modifiedAt: string;
  createdAt: string;
  supersededHit: KycHit | null;
}

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
  items: KycHit[];
  totalSize: number;
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
