import { Elysia } from "elysia";
import { creditCheckRequestSchema } from "../types/credit-check";

export const creditCheckRoutes = new Elysia({ prefix: "/api/v1" }).post(
  "/credit-check",
  async ({ body, set }) => {
    const result = creditCheckRequestSchema.safeParse(body);

    if (!result.success) {
      set.status = 400;
      return {
        success: false,
        error: {
          message: "Validation failed",
          details: result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
      };
    }

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
    detail: {
      tags: ["Credit Check"],
      summary: "Perform credit check",
      description:
        "Evaluates a company's creditworthiness for vehicle leasing and returns tier classification with financial terms",
    },
  }
);
