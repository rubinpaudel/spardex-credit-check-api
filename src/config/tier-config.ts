import { FinancialTerms } from "../types/response";
import { Tier } from "../types/tiers";

// Thresholds for each tier - used by rules to determine tier qualification
export interface TierThresholds {
  // Company checks
  creditRatingMin: number; // Minimum credit score (0-100)
  minCompanyYears: number; // Minimum years since incorporation
  requiresFinancialDisclosure: boolean;

  // Admin checks
  maxAdminBankruptcies: number; // Max bankruptcies for administrator
  bankruptcyScopeYears: number; // How far back to check bankruptcies
  minAdminTrackRecordYears: number; // Min years as admin in Belgium

  // Fraud checks
  fraudScoreMax: number; // Maximum fraud score (0-100, higher = worse)
  sanctionListAllowed: boolean | "manualReview";
  adverseMediaAllowed: boolean;

  // Legal form
  allowedLegalForms: string[]; // Which company types allowed

  // Asset checks
  allowsSecondHand: boolean;
  minVehicleValue: number; // Minimum vehicle value in EUR
  maxSecondHandMileage: number | null; // null if N/A
  maxSecondHandAge: number | null; // In years, null if N/A

  // Boolean flags
  witholdingObligationAllowed: boolean;

  // Insurance (only applies to POOR tier)
  insuranceChecks?: {
    minDriverAge: number;
    minLicenseYears: number;
    maxAccidentsAtFault: number;
    maxAccidentsNotAtFault: number;
    maxVehicleHorsepower: number;
  };

  // Financial terms
  financialTerms: FinancialTerms;
}

export const tierThresholds: Record<
  Tier.EXCELLENT | Tier.GOOD | Tier.FAIR | Tier.POOR,
  TierThresholds
> = {
  [Tier.EXCELLENT]: {
    creditRatingMin: 70, // Was 90, now uses adjusted score with deltas
    minCompanyYears: 5,
    requiresFinancialDisclosure: true,

    maxAdminBankruptcies: 0,
    bankruptcyScopeYears: 10,
    minAdminTrackRecordYears: 3,

    fraudScoreMax: 30,
    sanctionListAllowed: false,
    adverseMediaAllowed: false,

    allowedLegalForms: ["BV", "NV", "VOF", "CommV"],

    allowsSecondHand: false, // Only new vehicles for Excellent
    minVehicleValue: 10000,
    maxSecondHandMileage: null, // N/A - no second hand allowed
    maxSecondHandAge: null,

    witholdingObligationAllowed: false,

    // No insurance checks for Excellent

    financialTerms: {
      yearlyInterestPercent: 3,
      minDownpaymentPercent: 0,
      maxFinancingPeriodMonths: 60,
      maxResidualValuePercent: 15,
      canFinanceRegistrationTax: true,
    },
  },

  [Tier.GOOD]: {
    creditRatingMin: 55, // Was 70, now uses adjusted score with deltas
    minCompanyYears: 3,
    requiresFinancialDisclosure: true,

    maxAdminBankruptcies: 1,
    bankruptcyScopeYears: 7,
    minAdminTrackRecordYears: 3,

    fraudScoreMax: 40,
    sanctionListAllowed: false,
    adverseMediaAllowed: false,

    allowedLegalForms: ["BV", "NV", "VOF", "CommV"],

    allowsSecondHand: true,
    minVehicleValue: 10000,
    maxSecondHandMileage: 6000, // Max 6,000 km
    maxSecondHandAge: 0.5, // Max 6 months old

    witholdingObligationAllowed: false,

    financialTerms: {
      yearlyInterestPercent: 5.5,
      minDownpaymentPercent: 0,
      maxFinancingPeriodMonths: 60,
      maxResidualValuePercent: 15,
      canFinanceRegistrationTax: true,
    },
  },

  [Tier.FAIR]: {
    creditRatingMin: 35, // Was 50, now uses adjusted score with deltas
    minCompanyYears: 2,
    requiresFinancialDisclosure: false,

    maxAdminBankruptcies: 2,
    bankruptcyScopeYears: 5,
    minAdminTrackRecordYears: 3,

    fraudScoreMax: 60,
    sanctionListAllowed: false,
    adverseMediaAllowed: false,

    allowedLegalForms: ["BV", "VOF", "CommV"], // No NV

    allowsSecondHand: true,
    minVehicleValue: 10000,
    maxSecondHandMileage: 6000,
    maxSecondHandAge: 0.5,

    witholdingObligationAllowed: false,

    financialTerms: {
      yearlyInterestPercent: 12,
      minDownpaymentPercent: 10,
      maxFinancingPeriodMonths: 60,
      maxResidualValuePercent: 15,
      canFinanceRegistrationTax: false,
    },
  },

  [Tier.POOR]: {
    creditRatingMin: 0, // Was 30, now uses adjusted score with deltas
    minCompanyYears: 1,
    requiresFinancialDisclosure: false,

    maxAdminBankruptcies: 3,
    bankruptcyScopeYears: 3,
    minAdminTrackRecordYears: 0.5,

    fraudScoreMax: 70,
    sanctionListAllowed: "manualReview", // Allowed but needs review
    adverseMediaAllowed: true,

    // Poor tier allows more legal forms
    allowedLegalForms: ["BV", "NV", "VOF", "CommV", "CV", "VZW", "Eenmanszaak"],

    allowsSecondHand: true,
    minVehicleValue: 20000, // HIGHER than other tiers!
    maxSecondHandMileage: 50000,
    maxSecondHandAge: 3,

    witholdingObligationAllowed: true, // Only tier that allows it

    // Insurance checks ONLY apply to Poor tier
    insuranceChecks: {
      minDriverAge: 25,
      minLicenseYears: 5,
      maxAccidentsAtFault: 3,
      maxAccidentsNotAtFault: 5,
      maxVehicleHorsepower: 150,
    },

    financialTerms: {
      yearlyInterestPercent: 22,
      minDownpaymentPercent: 20,
      maxFinancingPeriodMonths: 60,
      maxResidualValuePercent: 5,
      canFinanceRegistrationTax: false,
    },
  },
};

/**
 * Get thresholds for a specific tier.
 * Returns undefined for REJECTED and MANUAL_REVIEW.
 */
export function getTierThresholds(tier: Tier): TierThresholds | undefined {
  if (tier === Tier.REJECTED || tier === Tier.MANUAL_REVIEW) {
    return undefined;
  }
  return tierThresholds[tier];
}

/**
 * Get financial terms for a tier.
 */
export function getFinancialTerms(tier: Tier): FinancialTerms | null {
  const thresholds = getTierThresholds(tier);
  return thresholds?.financialTerms ?? null;
}
