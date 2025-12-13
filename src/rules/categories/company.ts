import { Rule, RuleResult, RuleContext } from "../../types/rules";
import { Tier } from "../../types/tiers";
import { tierThresholds } from "../../config/tier-config";

/**
 * Rule: Credit rating determines tier.
 *
 * Uses real Creditsafe data. Falls back to MANUAL_REVIEW if unavailable.
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
    // Check if Creditsafe data is available
    if (!context.creditsafe) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.MANUAL_REVIEW,
        passed: false,
        reason: "Credit rating unavailable - Creditsafe data not available",
        actualValue: null,
        expectedValue: "Credit rating required",
      };
    }

    const creditRating = context.creditsafe.creditRating;

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
          actualValue: {
            creditRating,
            grade: context.creditsafe.creditRatingGrade,
            description: context.creditsafe.creditRatingDescription,
          },
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
      actualValue: {
        creditRating,
        grade: context.creditsafe.creditRatingGrade,
        description: context.creditsafe.creditRatingDescription,
      },
      expectedValue: `>= ${tierThresholds[Tier.POOR].creditRatingMin}`,
    };
  },
};

/**
 * Rule: Company age determines tier.
 *
 * Uses real Creditsafe data (companyAgeYears). Falls back to MANUAL_REVIEW if unavailable.
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
    if (!context.creditsafe) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.MANUAL_REVIEW,
        passed: false,
        reason: "Company age unavailable - Creditsafe data not available",
        actualValue: null,
        expectedValue: "Company age required",
      };
    }

    const companyAgeYears = context.creditsafe.companyAgeYears;

    const tiers = [Tier.EXCELLENT, Tier.GOOD, Tier.FAIR, Tier.POOR] as const;

    for (const tier of tiers) {
      const threshold = tierThresholds[tier].minCompanyYears;
      if (companyAgeYears >= threshold) {
        return {
          ruleId: this.id,
          category: this.category,
          tier,
          passed: true,
          reason: `Company is ${companyAgeYears.toFixed(1)} years old, meets ${tier} threshold (>= ${threshold})`,
          actualValue: {
            years: companyAgeYears,
            incorporationDate: context.creditsafe.incorporationDate,
          },
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
      reason: `Company is ${companyAgeYears.toFixed(1)} years old, below minimum of ${tierThresholds[Tier.POOR].minCompanyYears} year`,
      actualValue: {
        years: companyAgeYears,
        incorporationDate: context.creditsafe.incorporationDate,
      },
      expectedValue: `>= ${tierThresholds[Tier.POOR].minCompanyYears}`,
    };
  },
};

/**
 * Rule: Withholding obligation (debt to RSZ/FOD Financiën).
 *
 * This is self-declared in the questionnaire since we don't have API access.
 *
 * - No debt → EXCELLENT (doesn't restrict)
 * - Has debt → POOR (only tier that allows it)
 */
export const withholdingObligationRule: Rule = {
  id: "withholding-obligation",
  category: "company",

  evaluate(context: RuleContext): RuleResult {
    const hasDebt = context.questionnaire.withholdingObligation.selfDeclaredDebt;

    if (!hasDebt) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.EXCELLENT,
        passed: true,
        reason: "No self-declared debt to RSZ/FOD Financiën",
        actualValue: hasDebt,
        expectedValue: false,
      };
    }

    // Has debt - only Poor tier allows this
    if (tierThresholds[Tier.POOR].witholdingObligationAllowed) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.POOR,
        passed: true,
        reason:
          "Self-declared debt to RSZ/FOD Financiën - only POOR tier allows this",
        actualValue: hasDebt,
        expectedValue: "Only allowed for POOR tier",
      };
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.REJECTED,
      passed: false,
      reason: "Debt to RSZ/FOD Financiën not allowed",
      actualValue: hasDebt,
      expectedValue: false,
    };
  },
};

/**
 * Rule: VAT number must be valid.
 *
 * - Valid → EXCELLENT
 * - Invalid → MANUAL_REVIEW
 * - API failed → MANUAL_REVIEW (don't reject due to API issues)
 */
export const vatValidRule: Rule = {
  id: "vat-valid",
  category: "company",

  evaluate(context: RuleContext): RuleResult {
    const vies = context.vies;

    // If no VIES data, API wasn't called (shouldn't happen)
    if (!vies) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.MANUAL_REVIEW,
        passed: false,
        reason: "VAT validation not performed",
        actualValue: null,
        expectedValue: "Valid VAT number",
      };
    }

    // If API call failed, don't reject - manual review
    if (vies.apiCallFailed) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.MANUAL_REVIEW,
        passed: false,
        reason: `VAT validation failed: ${vies.error}. Requires manual review.`,
        actualValue: vies.error,
        expectedValue: "Valid VAT number",
      };
    }

    // VAT is valid
    if (vies.valid) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.EXCELLENT,
        passed: true,
        reason: `VAT number valid. Company: ${vies.companyName}`,
        actualValue: { valid: true, name: vies.companyName },
        expectedValue: "Valid VAT number",
      };
    }

    // VAT is invalid - manual review
    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.MANUAL_REVIEW,
      passed: false,
      reason: "VAT number is invalid. Requires manual review.",
      actualValue: { valid: false },
      expectedValue: "Valid VAT number",
    };
  },
};

/**
 * Rule: Company must be active.
 *
 * Uses Creditsafe isActive field.
 *
 * - Active → EXCELLENT (doesn't restrict)
 * - Inactive → REJECTED
 */
export const companyActiveRule: Rule = {
  id: "company-active",
  category: "company",

  evaluate(context: RuleContext): RuleResult {
    if (!context.creditsafe) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.MANUAL_REVIEW,
        passed: false,
        reason: "Company status unavailable",
        actualValue: null,
        expectedValue: "Active company status",
      };
    }

    if (!context.creditsafe.isActive) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.REJECTED,
        passed: false,
        reason: `Company is not active (status: ${context.creditsafe.companyStatus})`,
        actualValue: context.creditsafe.companyStatus,
        expectedValue: "Active",
      };
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.EXCELLENT,
      passed: true,
      reason: "Company is active",
      actualValue: context.creditsafe.companyStatus,
      expectedValue: "Active",
    };
  },
};
