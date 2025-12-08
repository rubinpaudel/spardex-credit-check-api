/**
 * Tier Classification Types
 * Defines the core tier system enums and interfaces
 */

export enum Tier {
  EXCELLENT = "EXCELLENT",
  GOOD = "GOOD",
  FAIR = "FAIR",
  POOR = "POOR",
  MANUAL_REVIEW = "MANUAL_REVIEW",
  REJECTED = "REJECTED",
}

export enum Category {
  QUESTIONNAIRE = "questionnaire",
  COMPANY = "company",
  ADMIN = "admin",
  ASSET = "asset",
  INSURANCE = "insurance",
  LEGAL_STATUS = "legal_status",
  FRAUD = "fraud",
}

export interface TierCategoryConfig {
  questionnaire: boolean;
  company: boolean;
  admin: boolean;
  asset: boolean;
  insurance: boolean;
  legalStatus: boolean;
  fraud: boolean;
}

export interface TierInterestRate {
  tier: Tier;
  rate: number;
}

export const TIER_INTEREST_RATES: Record<Tier, number | null> = {
  [Tier.EXCELLENT]: 3.0,
  [Tier.GOOD]: 5.5,
  [Tier.FAIR]: 12.0,
  [Tier.POOR]: 22.0,
  [Tier.MANUAL_REVIEW]: null,
  [Tier.REJECTED]: null,
};
