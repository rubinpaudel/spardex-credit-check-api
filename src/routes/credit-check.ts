import { Elysia, t } from "elysia";
import { creditCheckSchema } from "../validation/credit-check.validation";
import { CreditCheckResponse } from "../types/response";
import { Tier, tierToString } from "../types/tiers";
import { getFinancialTerms } from "../config";
import { stringToTier } from "../utils";

export const creditCheckRoutes = new Elysia({ prefix: "/api/v1" }).post(
  "/credit-check",
  async ({ query }): Promise<CreditCheckResponse> => {
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
