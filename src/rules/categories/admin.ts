import { Rule, RuleResult, RuleContext } from "../../types/rules";
import { Tier } from "../../types/tiers";
import { tierThresholds } from "../../config/tier-config";

/**
 * Rule: Administrator bankruptcy count determines tier.
 *
 * Note: This counts bankruptcies within the scope period, which varies by tier:
 * - EXCELLENT: last 10 years, max 0
 * - GOOD: last 7 years, max 1
 * - FAIR: last 5 years, max 2
 * - POOR: last 3 years, max 3
 *
 * For now using simple count. Later: filter by date from Creditsafe data.
 */
export const adminBankruptciesRule: Rule = {
  id: "admin-bankruptcies",
  category: "admin",

  evaluate(context: RuleContext): RuleResult {
    // Get bankruptcy count from mock data (later: from Creditsafe)
    const bankruptcyCount = context.questionnaire._mock?.adminBankruptcies ?? 0;

    const tiers = [Tier.EXCELLENT, Tier.GOOD, Tier.FAIR, Tier.POOR] as const;

    for (const tier of tiers) {
      const maxAllowed = tierThresholds[tier].maxAdminBankruptcies;
      if (bankruptcyCount <= maxAllowed) {
        return {
          ruleId: this.id,
          category: this.category,
          tier,
          passed: true,
          reason: `Administrator has ${bankruptcyCount} bankruptcies, within ${tier} limit (<= ${maxAllowed})`,
          actualValue: bankruptcyCount,
          expectedValue: {
            excellent: `<= ${tierThresholds[Tier.EXCELLENT].maxAdminBankruptcies}`,
            good: `<= ${tierThresholds[Tier.GOOD].maxAdminBankruptcies}`,
            fair: `<= ${tierThresholds[Tier.FAIR].maxAdminBankruptcies}`,
            poor: `<= ${tierThresholds[Tier.POOR].maxAdminBankruptcies}`,
          },
        };
      }
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.REJECTED,
      passed: false,
      reason: `Administrator has ${bankruptcyCount} bankruptcies, exceeds maximum of ${tierThresholds[Tier.POOR].maxAdminBankruptcies}`,
      actualValue: bankruptcyCount,
      expectedValue: `<= ${tierThresholds[Tier.POOR].maxAdminBankruptcies}`,
    };
  },
};
