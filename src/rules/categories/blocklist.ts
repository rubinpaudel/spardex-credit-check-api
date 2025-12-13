import { Rule, RuleResult, RuleContext } from "../../types/rules";
import { Tier } from "../../types/tiers";

/**
 * Rule: Blocklist hit.
 *
 * This is a HARD REJECTION - no tier allows blocklist hits.
 *
 * - No hit → EXCELLENT (doesn't restrict)
 * - Hit → REJECTED (always)
 */
export const blocklistRule: Rule = {
  id: "blocklist",
  category: "blocklist",

  evaluate(context: RuleContext): RuleResult {
    const hasHit = context.questionnaire._mock?.blocklistHit ?? false;

    if (hasHit) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.REJECTED,
        passed: false,
        reason: "Blocklist hit - application rejected",
        actualValue: hasHit,
        expectedValue: false,
      };
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.EXCELLENT,
      passed: true,
      reason: "No blocklist hit",
      actualValue: hasHit,
      expectedValue: false,
    };
  },
};
