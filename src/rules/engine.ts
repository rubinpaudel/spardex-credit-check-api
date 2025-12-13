import { Rule, RuleResult, RuleContext } from "../types/rules";
import { Tier } from "../types/tiers";
import { tierThresholds } from "../config/tier-config";

/**
 * Run all rules and collect results.
 */
export function evaluateAllRules(
  rules: Rule[],
  context: RuleContext
): RuleResult[] {
  return rules.map((rule) => rule.evaluate(context, tierThresholds));
}

/**
 * Aggregate rule results to determine final tier.
 *
 * Logic:
 * 1. If ANY rule returns REJECTED → REJECTED
 * 2. If ANY rule returns MANUAL_REVIEW → MANUAL_REVIEW
 * 3. Otherwise → the WORST (lowest) tier from all rules
 */
export function aggregateResults(results: RuleResult[]): {
  finalTier: Tier;
  triggeringRule: RuleResult | null;
} {
  // Check for hard rejection first
  const rejection = results.find((r) => r.tier === Tier.REJECTED);
  if (rejection) {
    return { finalTier: Tier.REJECTED, triggeringRule: rejection };
  }

  // Check for manual review
  const manualReview = results.find((r) => r.tier === Tier.MANUAL_REVIEW);
  if (manualReview) {
    return { finalTier: Tier.MANUAL_REVIEW, triggeringRule: manualReview };
  }

  // Empty results means no restrictions - default to best tier
  if (results.length === 0) {
    return { finalTier: Tier.EXCELLENT, triggeringRule: null };
  }

  // Find worst tier (lowest number = worst)
  let worstTier = Tier.EXCELLENT;
  let worstRule: RuleResult | null = null;

  for (const result of results) {
    if (result.tier < worstTier) {
      worstTier = result.tier;
      worstRule = result;
    }
  }

  return { finalTier: worstTier, triggeringRule: worstRule };
}
