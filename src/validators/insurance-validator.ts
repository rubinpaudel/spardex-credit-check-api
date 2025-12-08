/**
 * Insurance Validator
 * Validates insurance and driver data against tier criteria
 */

import type { InsuranceInput, AssetInput } from "../types/input-types";
import type { InsuranceCriteria } from "../types/criteria-types";
import type { FailedCriterion } from "../types/evaluation-result-types";
import { Category } from "../types/tier-types";

export interface InsuranceValidationResult {
  passed: boolean;
  failures: FailedCriterion[];
  manualReviewReasons: string[];
}

export function validateInsurance(
  input: InsuranceInput,
  assetInput: AssetInput,
  criteria: InsuranceCriteria
): InsuranceValidationResult {
  const failures: FailedCriterion[] = [];
  const manualReviewReasons: string[] = [];

  // License Since Years
  if (input.licenseSinceYears < criteria.licenseSinceYears) {
    failures.push({
      category: Category.INSURANCE,
      criterion: "licenseSinceYears",
      actualValue: input.licenseSinceYears,
      requiredValue: criteria.licenseSinceYears,
      message: `Driver has license for ${input.licenseSinceYears} years, requires at least ${criteria.licenseSinceYears} years`,
    });
  }

  // Max At-Fault Accidents
  if (input.atFaultAccidents > criteria.maxAtFaultAccidents) {
    failures.push({
      category: Category.INSURANCE,
      criterion: "maxAtFaultAccidents",
      actualValue: input.atFaultAccidents,
      requiredValue: criteria.maxAtFaultAccidents,
      message: `Driver has ${input.atFaultAccidents} at-fault accidents, maximum allowed is ${criteria.maxAtFaultAccidents}`,
    });
  }

  // Max Not-At-Fault Accidents
  if (input.notAtFaultAccidents > criteria.maxNotAtFaultAccidents) {
    failures.push({
      category: Category.INSURANCE,
      criterion: "maxNotAtFaultAccidents",
      actualValue: input.notAtFaultAccidents,
      requiredValue: criteria.maxNotAtFaultAccidents,
      message: `Driver has ${input.notAtFaultAccidents} not-at-fault accidents, maximum allowed is ${criteria.maxNotAtFaultAccidents}`,
    });
  }

  // Note: accidentScope is used to determine which accidents to count
  // This should be handled by the data provider when fetching accident data
  // We assume input accidents already reflect accidents within the scope

  // Max Vehicle Horsepower
  if (assetInput.horsepower > criteria.maxVehicleHorsepower) {
    failures.push({
      category: Category.INSURANCE,
      criterion: "maxVehicleHorsepower",
      actualValue: assetInput.horsepower,
      requiredValue: criteria.maxVehicleHorsepower,
      message: `Vehicle horsepower ${assetInput.horsepower} exceeds maximum ${criteria.maxVehicleHorsepower}`,
    });
  }

  // Min Driver Age
  if (input.driverAge < criteria.minDriverAge) {
    failures.push({
      category: Category.INSURANCE,
      criterion: "minDriverAge",
      actualValue: input.driverAge,
      requiredValue: criteria.minDriverAge,
      message: `Driver age ${input.driverAge} is below minimum ${criteria.minDriverAge}`,
    });
  }

  return {
    passed: failures.length === 0,
    failures,
    manualReviewReasons,
  };
}
