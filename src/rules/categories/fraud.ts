import { Rule, RuleResult, RuleContext } from "../../types/rules";
import { Tier } from "../../types/tiers";
import { tierThresholds } from "../../config/tier-config";

/**
 * Rule: Fraud score determines tier.
 *
 * Note: LOWER is better for fraud score (opposite of credit rating)
 *
 * Thresholds (maximum allowed):
 * - <= 30 → EXCELLENT
 * - <= 40 → GOOD
 * - <= 60 → FAIR
 * - <= 70 → POOR
 * - > 70  → REJECTED
 */
export const fraudScoreRule: Rule = {
  id: "fraud-score",
  category: "fraud",

  evaluate(context: RuleContext): RuleResult {
    // Get fraud score from mock data (later: from Creditsafe)
    const fraudScore = context.questionnaire._mock?.fraudScore ?? 0;

    const tiers = [Tier.EXCELLENT, Tier.GOOD, Tier.FAIR, Tier.POOR] as const;

    for (const tier of tiers) {
      const maxAllowed = tierThresholds[tier].fraudScoreMax;
      if (fraudScore <= maxAllowed) {
        return {
          ruleId: this.id,
          category: this.category,
          tier,
          passed: true,
          reason: `Fraud score ${fraudScore} is within ${tier} limit (<= ${maxAllowed})`,
          actualValue: fraudScore,
          expectedValue: {
            excellent: `<= ${tierThresholds[Tier.EXCELLENT].fraudScoreMax}`,
            good: `<= ${tierThresholds[Tier.GOOD].fraudScoreMax}`,
            fair: `<= ${tierThresholds[Tier.FAIR].fraudScoreMax}`,
            poor: `<= ${tierThresholds[Tier.POOR].fraudScoreMax}`,
          },
        };
      }
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.REJECTED,
      passed: false,
      reason: `Fraud score ${fraudScore} exceeds maximum of ${tierThresholds[Tier.POOR].fraudScoreMax}`,
      actualValue: fraudScore,
      expectedValue: `<= ${tierThresholds[Tier.POOR].fraudScoreMax}`,
    };
  },
};

/**
 * Rule: Sanction list hit.
 *
 * - No hit → EXCELLENT (doesn't restrict)
 * - Hit → MANUAL_REVIEW (Poor tier allows with manual review)
 */
export const sanctionListRule: Rule = {
  id: "sanction-list",
  category: "fraud",

  evaluate(context: RuleContext): RuleResult {
    const hasHit = context.questionnaire._mock?.sanctionListHit ?? false;

    if (!hasHit) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.EXCELLENT,
        passed: true,
        reason: "No sanction list hit",
        actualValue: hasHit,
        expectedValue: false,
      };
    }

    // Has hit - check if any tier allows with manual review
    if (tierThresholds[Tier.POOR].sanctionListAllowed === "manualReview") {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.MANUAL_REVIEW,
        passed: true,
        reason: "Sanction list hit detected - requires manual review",
        actualValue: hasHit,
        expectedValue: "No hit, or manual review if hit",
      };
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.REJECTED,
      passed: false,
      reason: "Sanction list hit - not allowed",
      actualValue: hasHit,
      expectedValue: false,
    };
  },
};
