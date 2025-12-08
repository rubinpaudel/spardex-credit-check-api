/**
 * Asset Validator
 * Validates vehicle asset data against tier criteria
 */

import type { AssetInput } from "../types/input-types";
import type { AssetCriteria } from "../types/criteria-types";
import type { FailedCriterion } from "../types/evaluation-result-types";
import { Category } from "../types/tier-types";

export interface AssetValidationResult {
  passed: boolean;
  failures: FailedCriterion[];
  manualReviewReasons: string[];
}

export function validateAsset(
  input: AssetInput,
  criteria: AssetCriteria
): AssetValidationResult {
  const failures: FailedCriterion[] = [];
  const manualReviewReasons: string[] = [];

  // New Vehicles Allowed
  if (input.isNew && !criteria.newVehiclesAllowed) {
    failures.push({
      category: Category.ASSET,
      criterion: "newVehiclesAllowed",
      actualValue: true,
      requiredValue: false,
      message: "New vehicles are not allowed for this tier",
    });
  }

  // Second Hand Allowed
  if (!input.isNew && !criteria.secondHandAllowed) {
    failures.push({
      category: Category.ASSET,
      criterion: "secondHandAllowed",
      actualValue: true,
      requiredValue: false,
      message: "Second-hand vehicles are not allowed for this tier",
    });
  }

  // Max Second Hand Age
  if (
    !input.isNew &&
    criteria.maxSecondHandAge !== null &&
    input.vehicleAge !== undefined
  ) {
    if (input.vehicleAge > criteria.maxSecondHandAge) {
      failures.push({
        category: Category.ASSET,
        criterion: "maxSecondHandAge",
        actualValue: input.vehicleAge,
        requiredValue: criteria.maxSecondHandAge,
        message: `Vehicle age ${input.vehicleAge} years exceeds maximum ${criteria.maxSecondHandAge} years for second-hand vehicles`,
      });
    }
  }

  // Min Vehicle Value
  if (input.value < criteria.minVehicleValue) {
    failures.push({
      category: Category.ASSET,
      criterion: "minVehicleValue",
      actualValue: input.value,
      requiredValue: criteria.minVehicleValue,
      message: `Vehicle value €${input.value} is below minimum €${criteria.minVehicleValue}`,
    });
  }

  // Max Mileage (for second-hand vehicles)
  if (!input.isNew && input.mileage !== undefined) {
    if (input.mileage > criteria.maxMileage) {
      failures.push({
        category: Category.ASSET,
        criterion: "maxMileage",
        actualValue: input.mileage,
        requiredValue: criteria.maxMileage,
        message: `Vehicle mileage ${input.mileage} km exceeds maximum ${criteria.maxMileage} km`,
      });
    }
  }

  // Validate required fields for second-hand vehicles
  if (!input.isNew) {
    if (input.vehicleAge === undefined) {
      failures.push({
        category: Category.ASSET,
        criterion: "vehicleAge",
        actualValue: undefined,
        requiredValue: "required",
        message: "Vehicle age is required for second-hand vehicles",
      });
    }
    if (input.mileage === undefined) {
      failures.push({
        category: Category.ASSET,
        criterion: "mileage",
        actualValue: undefined,
        requiredValue: "required",
        message: "Mileage is required for second-hand vehicles",
      });
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    manualReviewReasons,
  };
}
