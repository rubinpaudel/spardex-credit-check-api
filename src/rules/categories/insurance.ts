import { Rule, RuleResult, RuleContext } from "../../types/rules";
import { Tier } from "../../types/tiers";
import { tierThresholds } from "../../config/tier-config";

/**
 * Insurance rules ONLY apply to Poor tier applicants.
 *
 * These rules return:
 * - EXCELLENT if the requirement doesn't restrict (passes easily)
 * - POOR if it meets the Poor tier requirement
 * - REJECTED if it fails the Poor tier requirement
 *
 * The logic is: if someone is destined for Poor tier (based on other rules),
 * these additional checks determine if they can stay in Poor or get rejected.
 */

const poorInsuranceChecks = tierThresholds[Tier.POOR].insuranceChecks!;

/**
 * Rule: Driver age (minimum 25 for Poor tier).
 *
 * - >= 25 → EXCELLENT (doesn't restrict)
 * - < 25 → REJECTED (Poor tier requires minimum 25)
 */
export const driverAgeRule: Rule = {
  id: "driver-age",
  category: "insurance",

  evaluate(context: RuleContext): RuleResult {
    const driverAge = context.questionnaire.insuranceHistory.driverAge;
    const minAge = poorInsuranceChecks.minDriverAge;

    if (driverAge >= minAge) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.EXCELLENT,
        passed: true,
        reason: `Driver age ${driverAge} meets minimum requirement (>= ${minAge})`,
        actualValue: driverAge,
        expectedValue: `>= ${minAge}`,
      };
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.REJECTED,
      passed: false,
      reason: `Driver age ${driverAge} is below minimum ${minAge} required for Poor tier`,
      actualValue: driverAge,
      expectedValue: `>= ${minAge}`,
    };
  },
};

/**
 * Rule: Driver's license duration (minimum 5 years for Poor tier).
 *
 * - >= 5 years → EXCELLENT (doesn't restrict)
 * - < 5 years → REJECTED (Poor tier requires minimum 5 years)
 */
export const licenseDurationRule: Rule = {
  id: "license-duration",
  category: "insurance",

  evaluate(context: RuleContext): RuleResult {
    const licenseYears = context.questionnaire.insuranceHistory.licenseYears;
    const minYears = poorInsuranceChecks.minLicenseYears;

    if (licenseYears >= minYears) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.EXCELLENT,
        passed: true,
        reason: `License duration ${licenseYears} years meets minimum (>= ${minYears})`,
        actualValue: licenseYears,
        expectedValue: `>= ${minYears}`,
      };
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.REJECTED,
      passed: false,
      reason: `License duration ${licenseYears} years is below minimum ${minYears} years required for Poor tier`,
      actualValue: licenseYears,
      expectedValue: `>= ${minYears}`,
    };
  },
};

/**
 * Rule: At-fault accidents (maximum 3 in last 2 years for Poor tier).
 *
 * - <= 3 → EXCELLENT (doesn't restrict)
 * - > 3 → REJECTED (Poor tier allows max 3)
 */
export const accidentsAtFaultRule: Rule = {
  id: "accidents-at-fault",
  category: "insurance",

  evaluate(context: RuleContext): RuleResult {
    const accidents = context.questionnaire.insuranceHistory.accidentsAtFault;
    const maxAllowed = poorInsuranceChecks.maxAccidentsAtFault;

    if (accidents <= maxAllowed) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.EXCELLENT,
        passed: true,
        reason: `At-fault accidents (${accidents}) within limit (<= ${maxAllowed})`,
        actualValue: accidents,
        expectedValue: `<= ${maxAllowed}`,
      };
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.REJECTED,
      passed: false,
      reason: `At-fault accidents (${accidents}) exceeds maximum ${maxAllowed} allowed for Poor tier`,
      actualValue: accidents,
      expectedValue: `<= ${maxAllowed}`,
    };
  },
};

/**
 * Rule: Not-at-fault accidents (maximum 5 in last 2 years for Poor tier).
 *
 * - <= 5 → EXCELLENT (doesn't restrict)
 * - > 5 → REJECTED (Poor tier allows max 5)
 */
export const accidentsNotAtFaultRule: Rule = {
  id: "accidents-not-at-fault",
  category: "insurance",

  evaluate(context: RuleContext): RuleResult {
    const accidents = context.questionnaire.insuranceHistory.accidentsNotAtFault;
    const maxAllowed = poorInsuranceChecks.maxAccidentsNotAtFault;

    if (accidents <= maxAllowed) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.EXCELLENT,
        passed: true,
        reason: `Not-at-fault accidents (${accidents}) within limit (<= ${maxAllowed})`,
        actualValue: accidents,
        expectedValue: `<= ${maxAllowed}`,
      };
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.REJECTED,
      passed: false,
      reason: `Not-at-fault accidents (${accidents}) exceeds maximum ${maxAllowed} allowed for Poor tier`,
      actualValue: accidents,
      expectedValue: `<= ${maxAllowed}`,
    };
  },
};

/**
 * Rule: Vehicle horsepower (maximum 150 HP for Poor tier).
 *
 * - <= 150 HP → EXCELLENT (doesn't restrict)
 * - > 150 HP → REJECTED (Poor tier allows max 150 HP)
 */
export const vehicleHorsepowerRule: Rule = {
  id: "vehicle-horsepower",
  category: "insurance",

  evaluate(context: RuleContext): RuleResult {
    const horsepower = context.questionnaire.vehicle.horsepower;
    const maxAllowed = poorInsuranceChecks.maxVehicleHorsepower;

    if (horsepower <= maxAllowed) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.EXCELLENT,
        passed: true,
        reason: `Vehicle horsepower (${horsepower} HP) within limit (<= ${maxAllowed} HP)`,
        actualValue: horsepower,
        expectedValue: `<= ${maxAllowed} HP`,
      };
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.REJECTED,
      passed: false,
      reason: `Vehicle horsepower (${horsepower} HP) exceeds maximum ${maxAllowed} HP allowed for Poor tier`,
      actualValue: horsepower,
      expectedValue: `<= ${maxAllowed} HP`,
    };
  },
};
