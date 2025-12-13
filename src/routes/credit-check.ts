import { Elysia } from "elysia";
import { creditCheckSchema } from "../validation/credit-check.validation";

export const creditCheckRoutes = new Elysia({ prefix: "/api/v1" }).post(
  "/credit-check",
  async ({ body }) => {
    // body is now typed and validated
    return {
      success: true,
      result: {
        tier: "excellent",
        financialTerms: {
          yearlyInterestPercent: 3,
          minDownpaymentPercent: 0,
          maxFinancingPeriodMonths: 60,
          maxResidualValuePercent: 15,
          canFinanceRegistrationTax: true,
        },
      },
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
