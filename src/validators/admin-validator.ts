/**
 * Administrator Validator
 * Validates administrator data against tier criteria
 */

import type { AdministratorInput } from "../types/input-types";
import type { AdminCriteria } from "../types/criteria-types";
import type { FailedCriterion } from "../types/evaluation-result-types";
import { Category } from "../types/tier-types";

export interface AdminValidationResult {
  passed: boolean;
  failures: FailedCriterion[];
  manualReviewReasons: string[];
}

export function validateAdministrator(
  input: AdministratorInput,
  criteria: AdminCriteria
): AdminValidationResult {
  const failures: FailedCriterion[] = [];
  const manualReviewReasons: string[] = [];

  // Max Bankruptcies
  if (input.bankruptcies > criteria.maxBankruptcies) {
    failures.push({
      category: Category.ADMIN,
      criterion: "maxBankruptcies",
      actualValue: input.bankruptcies,
      requiredValue: criteria.maxBankruptcies,
      message: `Administrator has ${input.bankruptcies} bankruptcies, maximum allowed is ${criteria.maxBankruptcies}`,
    });
  }

  // Note: bankruptcyScope is used to determine which bankruptcies to count
  // This should be handled by the data provider when fetching bankruptcy data
  // We assume input.bankruptcies already reflects bankruptcies within the scope

  // Track Record Years
  if (input.trackRecordYears < criteria.trackRecordYears) {
    failures.push({
      category: Category.ADMIN,
      criterion: "trackRecordYears",
      actualValue: input.trackRecordYears,
      requiredValue: criteria.trackRecordYears,
      message: `Administrator has ${input.trackRecordYears} years track record in Belgium, requires at least ${criteria.trackRecordYears} years`,
    });
  }

  return {
    passed: failures.length === 0,
    failures,
    manualReviewReasons,
  };
}
