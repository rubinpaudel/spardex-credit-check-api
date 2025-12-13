import { Rule, RuleResult, RuleContext } from "../../types/rules";
import { Tier } from "../../types/tiers";
import { tierThresholds } from "../../config/tier-config";
import { countBankruptciesInScope } from "../../services/creditsafe/mapper";

/**
 * Rule: Administrator bankruptcy count determines tier.
 *
 * Uses real Creditsafe data with scope filtering by tier:
 * - EXCELLENT: last 10 years, max 0
 * - GOOD: last 7 years, max 1
 * - FAIR: last 5 years, max 2
 * - POOR: last 3 years, max 3
 */
export const adminBankruptciesRule: Rule = {
  id: "admin-bankruptcies",
  category: "admin",

  evaluate(context: RuleContext): RuleResult {
    if (!context.creditsafe) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.MANUAL_REVIEW,
        passed: false,
        reason: "Bankruptcy information unavailable",
        actualValue: null,
        expectedValue: "Bankruptcy check required",
      };
    }

    const bankruptcies = context.creditsafe.bankruptcies;
    const tiers = [Tier.EXCELLENT, Tier.GOOD, Tier.FAIR, Tier.POOR] as const;

    for (const tier of tiers) {
      const maxAllowed = tierThresholds[tier].maxAdminBankruptcies;
      const scopeYears = tierThresholds[tier].bankruptcyScopeYears;
      const bankruptciesInScope = countBankruptciesInScope(
        bankruptcies,
        scopeYears
      );

      if (bankruptciesInScope <= maxAllowed) {
        return {
          ruleId: this.id,
          category: this.category,
          tier,
          passed: true,
          reason: `${bankruptciesInScope} bankruptcies in last ${scopeYears} years, within ${tier} limit (<= ${maxAllowed})`,
          actualValue: {
            count: bankruptciesInScope,
            scopeYears,
            bankruptcies: bankruptcies.filter((b) => b.yearsAgo <= scopeYears),
          },
          expectedValue: {
            excellent: `<= ${tierThresholds[Tier.EXCELLENT].maxAdminBankruptcies} in ${tierThresholds[Tier.EXCELLENT].bankruptcyScopeYears}yr`,
            good: `<= ${tierThresholds[Tier.GOOD].maxAdminBankruptcies} in ${tierThresholds[Tier.GOOD].bankruptcyScopeYears}yr`,
            fair: `<= ${tierThresholds[Tier.FAIR].maxAdminBankruptcies} in ${tierThresholds[Tier.FAIR].bankruptcyScopeYears}yr`,
            poor: `<= ${tierThresholds[Tier.POOR].maxAdminBankruptcies} in ${tierThresholds[Tier.POOR].bankruptcyScopeYears}yr`,
          },
        };
      }
    }

    const poorScope = tierThresholds[Tier.POOR].bankruptcyScopeYears;
    const countInPoorScope = countBankruptciesInScope(bankruptcies, poorScope);

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.REJECTED,
      passed: false,
      reason: `${countInPoorScope} bankruptcies in last ${poorScope} years exceeds maximum of ${tierThresholds[Tier.POOR].maxAdminBankruptcies}`,
      actualValue: countInPoorScope,
      expectedValue: `<= ${tierThresholds[Tier.POOR].maxAdminBankruptcies}`,
    };
  },
};
