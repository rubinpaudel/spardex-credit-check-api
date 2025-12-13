import { Elysia, t } from "elysia";
import { creditCheckSchema } from "../validation/credit-check.validation";
import { CreditCheckResponse } from "../types/response";
import { Tier, tierToString } from "../types/tiers";
import { RuleContext } from "../types/rules";
import { getFinancialTerms } from "../config";
import { stringToTier } from "../utils";
import { allRules, evaluateAllRules, aggregateResults } from "../rules";

export const creditCheckRoutes = new Elysia({ prefix: "/api/v1" }).post(
  "/credit-check",
  async ({ body, query }): Promise<CreditCheckResponse> => {
    // If tier query param provided, use it for testing (bypass rules)
    if (query.tier) {
      const tier = stringToTier(query.tier);
      const financialTerms = getFinancialTerms(tier);

      return {
        success: true,
        result: {
          tier: tierToString(tier),
          requiresManualReview: tier === Tier.MANUAL_REVIEW,
          financialTerms: financialTerms!,
          ruleResults: [],
        },
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };
    }

    // Create rule context from request
    const context: RuleContext = {
      questionnaire: body.questionnaire,
      company: body.company,
    };

    // Run all rules
    const ruleResults = evaluateAllRules(allRules, context);

    // Aggregate to final tier
    const { finalTier } = aggregateResults(ruleResults);

    // Get financial terms for the tier
    const financialTerms = getFinancialTerms(finalTier);

    return {
      success: true,
      result: {
        tier: tierToString(finalTier),
        requiresManualReview: finalTier === Tier.MANUAL_REVIEW,
        financialTerms: financialTerms!,
        ruleResults: ruleResults.map((r) => ({
          ...r,
          tier: tierToString(r.tier),
        })),
      },
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
  },
  {
    body: creditCheckSchema,
    query: t.Object({
      tier: t.Optional(
        t.Union([
          t.Literal("excellent"),
          t.Literal("good"),
          t.Literal("fair"),
          t.Literal("poor"),
          t.Literal("manual_review"),
          t.Literal("rejected"),
        ])
      ),
    }),
    detail: {
      tags: ["Credit Check"],
      summary: "Perform credit check",
      description:
        "Evaluates a company's creditworthiness for vehicle leasing and returns tier classification with financial terms. Use ?tier=poor|fair|good|excellent for testing.",
    },
  }
);
