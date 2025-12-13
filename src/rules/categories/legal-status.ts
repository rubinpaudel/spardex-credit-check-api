import { Rule, RuleResult, RuleContext } from "../../types/rules";
import { Tier } from "../../types/tiers";
import { tierThresholds } from "../../config/tier-config";

/**
 * Rule: Company legal form must be allowed for the tier.
 *
 * Uses Creditsafe normalized legal form if available.
 *
 * Allowed forms:
 * - EXCELLENT/GOOD: BV, NV, VOF, CommV
 * - FAIR: BV, VOF, CommV (no NV)
 * - POOR: BV, NV, VOF, CommV, CV, VZW, Eenmanszaak
 *
 * Returns the BEST tier that allows this legal form.
 */
export const legalFormRule: Rule = {
  id: "legal-form",
  category: "legal_status",

  evaluate(context: RuleContext): RuleResult {
    // Use Creditsafe legal form if available (normalized), otherwise use company.legalForm
    const legalForm =
      context.creditsafe?.legalForm ?? context.company.legalForm;

    // Check tiers from best to worst
    const tiers = [Tier.EXCELLENT, Tier.GOOD, Tier.FAIR, Tier.POOR] as const;

    for (const tier of tiers) {
      const allowed = tierThresholds[tier].allowedLegalForms;
      if (allowed.includes(legalForm)) {
        return {
          ruleId: this.id,
          category: this.category,
          tier,
          passed: true,
          reason: `Legal form "${legalForm}" is allowed for ${tier} tier`,
          actualValue: legalForm,
          expectedValue: {
            excellent: tierThresholds[Tier.EXCELLENT].allowedLegalForms,
            good: tierThresholds[Tier.GOOD].allowedLegalForms,
            fair: tierThresholds[Tier.FAIR].allowedLegalForms,
            poor: tierThresholds[Tier.POOR].allowedLegalForms,
          },
        };
      }
    }

    // Not allowed in any tier
    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.REJECTED,
      passed: false,
      reason: `Legal form "${legalForm}" is not allowed for vehicle leasing`,
      actualValue: legalForm,
      expectedValue: tierThresholds[Tier.POOR].allowedLegalForms,
    };
  },
};
