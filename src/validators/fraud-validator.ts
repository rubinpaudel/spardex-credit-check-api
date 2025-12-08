/**
 * Fraud Validator
 * Validates fraud check data against tier criteria
 */

import type { FraudInput } from "../types/input-types";
import type { FraudCriteria } from "../types/criteria-types";
import type { FailedCriterion } from "../types/evaluation-result-types";
import { Category } from "../types/tier-types";

export interface FraudValidationResult {
  passed: boolean;
  failures: FailedCriterion[];
  manualReviewReasons: string[];
}

export function validateFraud(
  input: FraudInput,
  criteria: FraudCriteria
): FraudValidationResult {
  const failures: FailedCriterion[] = [];
  const manualReviewReasons: string[] = [];

  // Max Fraud Score
  if (input.score > criteria.maxFraudScore) {
    failures.push({
      category: Category.FRAUD,
      criterion: "maxFraudScore",
      actualValue: input.score,
      requiredValue: criteria.maxFraudScore,
      message: `Fraud score ${input.score} exceeds maximum ${criteria.maxFraudScore}`,
    });
  }

  // Adverse Media
  if (input.adverseMedia && criteria.adverseMedia === "NOT_ALLOWED") {
    failures.push({
      category: Category.FRAUD,
      criterion: "adverseMedia",
      actualValue: true,
      requiredValue: false,
      message: "Adverse media hits are not allowed for this tier",
    });
  }

  // Sanction List Hit
  if (input.sanctionList && criteria.sanctionListHit === "NOT_ALLOWED") {
    failures.push({
      category: Category.FRAUD,
      criterion: "sanctionListHit",
      actualValue: true,
      requiredValue: false,
      message: "Sanction list hits are not allowed for this tier",
    });
  }

  return {
    passed: failures.length === 0,
    failures,
    manualReviewReasons,
  };
}
