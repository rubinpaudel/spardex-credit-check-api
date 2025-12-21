import { Rule, RuleResult, RuleContext } from "../../types/rules";
import { Tier } from "../../types/tiers";

/**
 * Rule: Contact with legal authorities.
 *
 * - No contact → EXCELLENT (doesn't restrict)
 * - Has contact → MANUAL_REVIEW
 */
export const contactWithLegalAuthoritiesRule: Rule = {
  id: "contact-with-legal-authorities",
  category: "general",

  evaluate(context: RuleContext): RuleResult {
    const hasContact =
      context.questionnaire.legalHistory.contactWithLegalAuthorities;

    if (!hasContact) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.EXCELLENT,
        passed: true,
        reason: "No contact with legal authorities",
        actualValue: hasContact,
        expectedValue: false,
      };
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.MANUAL_REVIEW,
      passed: true,
      reason: "Contact with legal authorities detected - requires manual review",
      actualValue: hasContact,
      expectedValue: "No contact, or manual review if contact",
    };
  },
};

/**
 * Rule: Trouble with payment at another financing company.
 *
 * - No trouble → EXCELLENT (doesn't restrict)
 * - Has trouble → MANUAL_REVIEW
 */
export const troubleWithPaymentRule: Rule = {
  id: "trouble-with-payment",
  category: "general",

  evaluate(context: RuleContext): RuleResult {
    const hasTrouble =
      context.questionnaire.legalHistory.troubleWithPaymentAtFinancingCompany;

    if (!hasTrouble) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.EXCELLENT,
        passed: true,
        reason: "No trouble with payment at other financing company",
        actualValue: hasTrouble,
        expectedValue: false,
      };
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.MANUAL_REVIEW,
      passed: true,
      reason:
        "Trouble with payment at other financing company detected - requires manual review",
      actualValue: hasTrouble,
      expectedValue: "No trouble, or manual review if trouble",
    };
  },
};

/**
 * Rule: Blacklisted banks (banks applicant doesn't want to work with).
 *
 * - Empty array → EXCELLENT (doesn't restrict)
 * - Non-empty array → MANUAL_REVIEW
 */
export const blacklistedBanksRule: Rule = {
  id: "blacklisted-banks",
  category: "general",

  evaluate(context: RuleContext): RuleResult {
    const blacklistedBanks =
      context.questionnaire.legalHistory.blacklistedBanks;
    const hasBlacklistedBanks = blacklistedBanks.length > 0;

    if (!hasBlacklistedBanks) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.EXCELLENT,
        passed: true,
        reason: "No blacklisted banks",
        actualValue: blacklistedBanks,
        expectedValue: [],
      };
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.MANUAL_REVIEW,
      passed: true,
      reason: `Blacklisted banks detected (${blacklistedBanks.join(", ")}) - requires manual review`,
      actualValue: blacklistedBanks,
      expectedValue: "No blacklisted banks, or manual review if present",
    };
  },
};
