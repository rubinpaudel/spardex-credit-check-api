/**
 * Company Validator
 * Validates company data against tier criteria
 */

import type { CompanyInput } from "../types/input-types";
import type { CompanyCriteria } from "../types/criteria-types";
import type { FailedCriterion } from "../types/evaluation-result-types";
import type { CreditsafeCompanyResponse } from "../config/creditsafe-config";
import type { ViesValidationResponse } from "../config/vies-config";
import { Category } from "../types/tier-types";

export interface CompanyValidationResult {
  passed: boolean;
  failures: FailedCriterion[];
  manualReviewReasons: string[];
}

export function validateCompany(
  input: CompanyInput,
  criteria: CompanyCriteria,
  creditsafeData: CreditsafeCompanyResponse,
  viesData: ViesValidationResponse
): CompanyValidationResult {
  const failures: FailedCriterion[] = [];
  const manualReviewReasons: string[] = [];

  // Credit Rating Threshold
  if (creditsafeData.creditRating < criteria.creditRatingThreshold) {
    failures.push({
      category: Category.COMPANY,
      criterion: "creditRatingThreshold",
      actualValue: creditsafeData.creditRating,
      requiredValue: criteria.creditRatingThreshold,
      message: `Credit rating ${creditsafeData.creditRating} is below required threshold ${criteria.creditRatingThreshold}`,
    });
  }

  // Minimum Company Years
  if (creditsafeData.yearsActive < criteria.minCompanyYears) {
    failures.push({
      category: Category.COMPANY,
      criterion: "minCompanyYears",
      actualValue: creditsafeData.yearsActive,
      requiredValue: criteria.minCompanyYears,
      message: `Company active for ${creditsafeData.yearsActive} years, requires at least ${criteria.minCompanyYears} years`,
    });
  }

  // Financial Disclosure Required
  if (
    criteria.financialDisclosureRequired &&
    !creditsafeData.financialDisclosure
  ) {
    failures.push({
      category: Category.COMPANY,
      criterion: "financialDisclosureRequired",
      actualValue: creditsafeData.financialDisclosure,
      requiredValue: true,
      message: "Financial disclosure is required for this tier",
    });
  }

  // Company Active
  if (criteria.companyActive && !creditsafeData.companyActive) {
    failures.push({
      category: Category.COMPANY,
      criterion: "companyActive",
      actualValue: creditsafeData.companyActive,
      requiredValue: true,
      message: "Company must be active",
    });
  }

  // Tax Withholding Hit
  if (
    creditsafeData.taxWithholdingHit &&
    criteria.taxWithholdingHit === "NOT_ALLOWED"
  ) {
    failures.push({
      category: Category.COMPANY,
      criterion: "taxWithholdingHit",
      actualValue: true,
      requiredValue: false,
      message: "Tax withholding obligation not allowed for this tier",
    });
  }

  // VAT Number Validation
  if (!viesData.valid) {
    if (criteria.vatNumberValid === "REQUIRED") {
      failures.push({
        category: Category.COMPANY,
        criterion: "vatNumberValid",
        actualValue: viesData.valid,
        requiredValue: true,
        message: "Valid VAT number is required for this tier",
      });
    } else if (criteria.vatNumberValid === "MANUAL") {
      manualReviewReasons.push("Invalid VAT number requires manual review");
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    manualReviewReasons,
  };
}
