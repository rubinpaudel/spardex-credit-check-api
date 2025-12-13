import { Rule, RuleResult, RuleContext } from "../../types/rules";
import { Tier } from "../../types/tiers";
import { tierThresholds } from "../../config/tier-config";

/**
 * Rule: Credit rating determines tier.
 *
 * Thresholds:
 * - >= 90 → EXCELLENT
 * - >= 70 → GOOD
 * - >= 50 → FAIR
 * - >= 30 → POOR
 * - < 30  → REJECTED
 */
export const creditRatingRule: Rule = {
  id: "credit-rating",
  category: "company",

  evaluate(context: RuleContext): RuleResult {
    // Get credit rating from mock data (later: from Creditsafe)
    const creditRating = context.questionnaire._mock?.creditRating ?? 100;

    // Check each tier from best to worst
    const tiers = [Tier.EXCELLENT, Tier.GOOD, Tier.FAIR, Tier.POOR] as const;

    for (const tier of tiers) {
      const threshold = tierThresholds[tier].creditRatingMin;
      if (creditRating >= threshold) {
        return {
          ruleId: this.id,
          category: this.category,
          tier,
          passed: true,
          reason: `Credit rating ${creditRating} meets ${tier} threshold (>= ${threshold})`,
          actualValue: creditRating,
          expectedValue: {
            excellent: tierThresholds[Tier.EXCELLENT].creditRatingMin,
            good: tierThresholds[Tier.GOOD].creditRatingMin,
            fair: tierThresholds[Tier.FAIR].creditRatingMin,
            poor: tierThresholds[Tier.POOR].creditRatingMin,
          },
        };
      }
    }

    // Below minimum threshold
    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.REJECTED,
      passed: false,
      reason: `Credit rating ${creditRating} is below minimum threshold of ${tierThresholds[Tier.POOR].creditRatingMin}`,
      actualValue: creditRating,
      expectedValue: `>= ${tierThresholds[Tier.POOR].creditRatingMin}`,
    };
  },
};

/**
 * Rule: Company age determines tier.
 *
 * Thresholds:
 * - >= 5 years → EXCELLENT
 * - >= 3 years → GOOD
 * - >= 2 years → FAIR
 * - >= 1 year  → POOR
 * - < 1 year   → REJECTED
 */
export const companyAgeRule: Rule = {
  id: "company-age",
  category: "company",

  evaluate(context: RuleContext): RuleResult {
    // Get company age from mock data (later: calculated from Creditsafe incorporationDate)
    const companyAgeYears = context.questionnaire._mock?.companyAgeYears ?? 10;

    const tiers = [Tier.EXCELLENT, Tier.GOOD, Tier.FAIR, Tier.POOR] as const;

    for (const tier of tiers) {
      const threshold = tierThresholds[tier].minCompanyYears;
      if (companyAgeYears >= threshold) {
        return {
          ruleId: this.id,
          category: this.category,
          tier,
          passed: true,
          reason: `Company is ${companyAgeYears} years old, meets ${tier} threshold (>= ${threshold})`,
          actualValue: companyAgeYears,
          expectedValue: {
            excellent: tierThresholds[Tier.EXCELLENT].minCompanyYears,
            good: tierThresholds[Tier.GOOD].minCompanyYears,
            fair: tierThresholds[Tier.FAIR].minCompanyYears,
            poor: tierThresholds[Tier.POOR].minCompanyYears,
          },
        };
      }
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.REJECTED,
      passed: false,
      reason: `Company is ${companyAgeYears} years old, below minimum of ${tierThresholds[Tier.POOR].minCompanyYears} year`,
      actualValue: companyAgeYears,
      expectedValue: `>= ${tierThresholds[Tier.POOR].minCompanyYears}`,
    };
  },
};
