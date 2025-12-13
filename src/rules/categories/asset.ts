import { Rule, RuleResult, RuleContext } from "../../types/rules";
import { Tier } from "../../types/tiers";
import { tierThresholds } from "../../config/tier-config";

/**
 * Rule: Vehicle type (new vs second-hand).
 *
 * - New vehicles → allowed for all tiers
 * - Second-hand → NOT allowed for EXCELLENT (best tier is GOOD)
 */
export const vehicleTypeRule: Rule = {
  id: "vehicle-type",
  category: "asset",

  evaluate(context: RuleContext): RuleResult {
    const vehicleType = context.questionnaire.vehicle.type;

    if (vehicleType === "new") {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.EXCELLENT,
        passed: true,
        reason: "New vehicle - allowed for all tiers",
        actualValue: vehicleType,
        expectedValue: "new or secondHand (with restrictions)",
      };
    }

    // Second-hand vehicle
    // Find best tier that allows second-hand
    const tiers = [Tier.EXCELLENT, Tier.GOOD, Tier.FAIR, Tier.POOR] as const;

    for (const tier of tiers) {
      if (tierThresholds[tier].allowsSecondHand) {
        return {
          ruleId: this.id,
          category: this.category,
          tier,
          passed: true,
          reason: `Second-hand vehicle - best available tier is ${tier}`,
          actualValue: vehicleType,
          expectedValue: {
            excellent: "new only",
            good: "new or secondHand",
            fair: "new or secondHand",
            poor: "new or secondHand",
          },
        };
      }
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.REJECTED,
      passed: false,
      reason: "Second-hand vehicles not allowed",
      actualValue: vehicleType,
      expectedValue: "new",
    };
  },
};

/**
 * Rule: Minimum vehicle value.
 *
 * Thresholds:
 * - EXCELLENT/GOOD/FAIR: >= €10,000
 * - POOR: >= €20,000 (HIGHER - more collateral required)
 */
export const vehicleValueRule: Rule = {
  id: "vehicle-value",
  category: "asset",

  evaluate(context: RuleContext): RuleResult {
    const vehicleValue = context.questionnaire.vehicle.value;

    // Check tiers from best to worst
    const tiers = [Tier.EXCELLENT, Tier.GOOD, Tier.FAIR, Tier.POOR] as const;

    for (const tier of tiers) {
      const minValue = tierThresholds[tier].minVehicleValue;
      if (vehicleValue >= minValue) {
        return {
          ruleId: this.id,
          category: this.category,
          tier,
          passed: true,
          reason: `Vehicle value €${vehicleValue.toLocaleString()} meets ${tier} minimum (>= €${minValue.toLocaleString()})`,
          actualValue: vehicleValue,
          expectedValue: {
            excellent: `>= €${tierThresholds[Tier.EXCELLENT].minVehicleValue.toLocaleString()}`,
            good: `>= €${tierThresholds[Tier.GOOD].minVehicleValue.toLocaleString()}`,
            fair: `>= €${tierThresholds[Tier.FAIR].minVehicleValue.toLocaleString()}`,
            poor: `>= €${tierThresholds[Tier.POOR].minVehicleValue.toLocaleString()}`,
          },
        };
      }
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.REJECTED,
      passed: false,
      reason: `Vehicle value €${vehicleValue.toLocaleString()} is below minimum €${tierThresholds[Tier.POOR].minVehicleValue.toLocaleString()}`,
      actualValue: vehicleValue,
      expectedValue: `>= €${tierThresholds[Tier.POOR].minVehicleValue.toLocaleString()}`,
    };
  },
};

/**
 * Rule: Second-hand vehicle mileage.
 *
 * Only applies to second-hand vehicles.
 *
 * Thresholds:
 * - GOOD/FAIR: max 6,000 km
 * - POOR: max 50,000 km
 */
export const vehicleMileageRule: Rule = {
  id: "vehicle-mileage",
  category: "asset",

  evaluate(context: RuleContext): RuleResult {
    const { type, mileage } = context.questionnaire.vehicle;

    // Only applies to second-hand
    if (type === "new") {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.EXCELLENT,
        passed: true,
        reason: "New vehicle - mileage check not applicable",
        actualValue: { type, mileage },
        expectedValue: "N/A for new vehicles",
      };
    }

    // Second-hand - check mileage limits
    // Note: Excellent doesn't allow second-hand, so start from Good
    const tiers = [Tier.GOOD, Tier.FAIR, Tier.POOR] as const;

    for (const tier of tiers) {
      const maxMileage = tierThresholds[tier].maxSecondHandMileage;
      if (maxMileage !== null && mileage <= maxMileage) {
        return {
          ruleId: this.id,
          category: this.category,
          tier,
          passed: true,
          reason: `Second-hand mileage ${mileage.toLocaleString()} km within ${tier} limit (<= ${maxMileage.toLocaleString()} km)`,
          actualValue: mileage,
          expectedValue: {
            good: `<= ${tierThresholds[Tier.GOOD].maxSecondHandMileage?.toLocaleString()} km`,
            fair: `<= ${tierThresholds[Tier.FAIR].maxSecondHandMileage?.toLocaleString()} km`,
            poor: `<= ${tierThresholds[Tier.POOR].maxSecondHandMileage?.toLocaleString()} km`,
          },
        };
      }
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.REJECTED,
      passed: false,
      reason: `Second-hand mileage ${mileage.toLocaleString()} km exceeds maximum ${tierThresholds[Tier.POOR].maxSecondHandMileage?.toLocaleString()} km`,
      actualValue: mileage,
      expectedValue: `<= ${tierThresholds[Tier.POOR].maxSecondHandMileage?.toLocaleString()} km`,
    };
  },
};

/**
 * Rule: Second-hand vehicle age.
 *
 * Only applies to second-hand vehicles.
 *
 * Thresholds:
 * - GOOD/FAIR: max 0.5 years (6 months)
 * - POOR: max 3 years
 */
export const vehicleAgeRule: Rule = {
  id: "vehicle-age",
  category: "asset",

  evaluate(context: RuleContext): RuleResult {
    const { type, ageYears } = context.questionnaire.vehicle;

    // Only applies to second-hand
    if (type === "new") {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.EXCELLENT,
        passed: true,
        reason: "New vehicle - age check not applicable",
        actualValue: { type, ageYears },
        expectedValue: "N/A for new vehicles",
      };
    }

    const tiers = [Tier.GOOD, Tier.FAIR, Tier.POOR] as const;

    for (const tier of tiers) {
      const maxAge = tierThresholds[tier].maxSecondHandAge;
      if (maxAge !== null && ageYears <= maxAge) {
        return {
          ruleId: this.id,
          category: this.category,
          tier,
          passed: true,
          reason: `Second-hand age ${ageYears} years within ${tier} limit (<= ${maxAge} years)`,
          actualValue: ageYears,
          expectedValue: {
            good: `<= ${tierThresholds[Tier.GOOD].maxSecondHandAge} years`,
            fair: `<= ${tierThresholds[Tier.FAIR].maxSecondHandAge} years`,
            poor: `<= ${tierThresholds[Tier.POOR].maxSecondHandAge} years`,
          },
        };
      }
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.REJECTED,
      passed: false,
      reason: `Second-hand age ${ageYears} years exceeds maximum ${tierThresholds[Tier.POOR].maxSecondHandAge} years`,
      actualValue: ageYears,
      expectedValue: `<= ${tierThresholds[Tier.POOR].maxSecondHandAge} years`,
    };
  },
};
