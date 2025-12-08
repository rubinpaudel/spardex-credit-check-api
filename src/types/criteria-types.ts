/**
 * Criteria Types
 * Defines criteria configurations for each tier
 */

import { Tier } from "./tier-types";

export enum CriteriaType {
  HARD_REQUIREMENT = "HARD_REQUIREMENT", // Must be exact value
  BOOLEAN = "BOOLEAN", // True/false check
  THRESHOLD_ASCENDING = "THRESHOLD_ASCENDING", // Higher tier = higher threshold
  THRESHOLD_DESCENDING = "THRESHOLD_DESCENDING", // Higher tier = lower threshold
  NO_GO = "NO_GO", // Instant rejection
  MANUAL = "MANUAL", // Triggers manual review
}

export interface QuestionnaireCriteria {
  belgiumResidency: boolean;
  minAge: number;
  isAdmin: boolean;
  legalIssues: "NO_GO" | "MANUAL" | "ALLOWED";
  paymentIssuesElsewhere: "NO_GO" | "MANUAL" | "ALLOWED";
  bankBlacklist: "NO_GO" | "MANUAL" | "ALLOWED";
}

export interface CompanyCriteria {
  creditRatingThreshold: number;
  minCompanyYears: number;
  financialDisclosureRequired: boolean;
  companyActive: boolean;
  taxWithholdingHit: "NOT_ALLOWED" | "ALLOWED";
  vatNumberValid: "REQUIRED" | "MANUAL";
}

export interface AdminCriteria {
  maxBankruptcies: number;
  bankruptcyScope: number; // Years to look back
  trackRecordYears: number;
}

export interface AssetCriteria {
  newVehiclesAllowed: boolean;
  secondHandAllowed: boolean;
  maxSecondHandAge: number | null;
  minVehicleValue: number;
  maxMileage: number;
}

export interface InsuranceCriteria {
  licenseSinceYears: number;
  maxAtFaultAccidents: number;
  maxNotAtFaultAccidents: number;
  accidentScope: number;
  maxVehicleHorsepower: number;
  minDriverAge: number;
}

export interface FraudCriteria {
  maxFraudScore: number;
  adverseMedia: "NOT_ALLOWED" | "ALLOWED";
  sanctionListHit: "NOT_ALLOWED" | "ALLOWED";
}

export type LegalForm =
  | "SOLE_PROPRIETORSHIP"
  | "BV_SRL"
  | "NV_SA"
  | "CV_SC"
  | "VOF_SNC"
  | "COMMV_SCOMM"
  | "VZW_ASBL";

export interface LegalStatusCriteria {
  allowedLegalForms: LegalForm[];
}

export interface TierCriteria {
  tier: Tier;
  enabled: {
    questionnaire: boolean;
    company: boolean;
    admin: boolean;
    asset: boolean;
    insurance: boolean;
    legalStatus: boolean;
    fraud: boolean;
  };
  questionnaire: QuestionnaireCriteria;
  company: CompanyCriteria;
  admin: AdminCriteria;
  asset: AssetCriteria;
  insurance: InsuranceCriteria;
  fraud: FraudCriteria;
  legalStatus: LegalStatusCriteria;
}

export interface TierConfiguration {
  tiers: TierCriteria[];
}
