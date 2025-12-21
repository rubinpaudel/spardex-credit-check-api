import { Rule, RuleResult, RuleContext } from "../../types/rules";
import { Tier } from "../../types/tiers";

/**
 * Rule: Blocklist/Enforcement hit.
 *
 * Checks for enforcement or regulatory action hits from KYC Protect.
 * This is a HARD REJECTION - no tier allows enforcement hits.
 *
 * - No hit → EXCELLENT (doesn't restrict)
 * - Enforcement hit → REJECTED (always)
 */
export const blocklistRule: Rule = {
  id: "blocklist",
  category: "blocklist",

  evaluate(context: RuleContext): RuleResult {
    // If KYC Protect failed, we can't verify - trigger manual review
    if (context.kycProtectFailed) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.MANUAL_REVIEW,
        passed: false,
        reason: "KYC Protect check unavailable - manual review required",
        actualValue: null,
        expectedValue: "No enforcement hits",
      };
    }

    // If no KYC data available (e.g., no company name), default to no hit
    if (!context.kycProtect) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.EXCELLENT,
        passed: true,
        reason: "KYC screening not performed - no enforcement check",
        actualValue: false,
        expectedValue: false,
      };
    }

    const hasEnforcementHit = context.kycProtect.hasEnforcementHit;

    if (hasEnforcementHit) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.REJECTED,
        passed: false,
        reason: "Enforcement/regulatory hit detected - application rejected",
        actualValue: {
          hasEnforcementHit: true,
          totalHits: context.kycProtect.totalHits,
        },
        expectedValue: false,
      };
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.EXCELLENT,
      passed: true,
      reason: "No enforcement/regulatory hits",
      actualValue: {
        hasEnforcementHit: false,
        totalHits: context.kycProtect.totalHits,
      },
      expectedValue: false,
    };
  },
};
