import { Elysia } from "elysia";
import { creditCheckSchema } from "../validation/credit-check.validation";
import { CreditCheckResponse } from "../types/response";
import { Tier, tierToString } from "../types/tiers";

export const creditCheckRoutes = new Elysia({ prefix: "/api/v1" }).post(
  "/credit-check",
  async ({ body }): Promise<CreditCheckResponse> => {
    const tier: Tier = Tier.EXCELLENT; // Still hardcoded

    return {
      success: true,
      result: {
        tier: tierToString(tier),
        requiresManualReview: false,
        financialTerms: {
          yearlyInterestPercent: 3,
          minDownpaymentPercent: 0,
          maxFinancingPeriodMonths: 60,
          maxResidualValuePercent: 15,
          canFinanceRegistrationTax: true,
        },
        ruleResults: [],
      },
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
  },
  {
    body: creditCheckSchema,
    detail: {
      tags: ["Credit Check"],
      summary: "Perform credit check",
      description:
        "Evaluates a company's creditworthiness for vehicle leasing and returns tier classification with financial terms",
    },
  }
);
