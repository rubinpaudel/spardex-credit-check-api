import { Elysia, t } from "elysia";
import { creditCheckSchema } from "../validation/credit-check.validation";
import { CreditCheckResponse } from "../types/response";
import { Tier, tierToString } from "../types/tiers";
import { getFinancialTerms } from "../config";
import { stringToTier } from "../utils";
import { allRules, evaluateAllRules, aggregateResults } from "../rules";
import { enrichData, buildRuleContext } from "../services/data-enrichment";
import { logger } from "../config/logger";

export const creditCheckRoutes = new Elysia({ prefix: "/api/v1" }).post(
  "/credit-check",
  async ({ body }): Promise<CreditCheckResponse> => {
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Enrich data from external APIs (Creditsafe + VIES + KYC Protect in parallel)
    // Note: KYC Protect needs company name - we pass it via enrichData which
    // will use the Creditsafe company name if available
    const enrichment = await enrichData(body.company.vatNumber);

    // Build rule context
    const context = buildRuleContext(body, enrichment);

    // Run all rules
    const ruleResults = evaluateAllRules(allRules, context);

    // Aggregate to final tier
    const { finalTier } = aggregateResults(ruleResults);

    // Get financial terms for the tier
    const financialTerms = getFinancialTerms(finalTier);

    const response: CreditCheckResponse = {
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
      enrichedData: {
        creditsafe: enrichment.creditsafe,
        vies: enrichment.vies,
        kycProtect: enrichment.kycProtect,
        errors: enrichment.errors,
      },
      requestId,
      timestamp,
    };

    // Log request and response to file for debugging
    logger.info({
      type: "credit-check",
      requestId,
      request: {
        vatNumber: body.company.vatNumber,
        contact: `${body.questionnaire.contact.firstName} ${body.questionnaire.contact.lastName}`,
      },
      response: {
        tier: response.result.tier,
        requiresManualReview: response.result.requiresManualReview,
        ruleResults: response.result.ruleResults.map((r) => ({
          ruleId: r.ruleId,
          tier: r.tier,
          passed: r.passed,
          reason: r.reason,
        })),
      },
      enrichedData: {
        creditsafe: enrichment.creditsafe
          ? {
              companyName: enrichment.creditsafe.companyName,
              creditRating: enrichment.creditsafe.creditRating,
              isActive: enrichment.creditsafe.isActive,
              hasFinancialDisclosure: enrichment.creditsafe.hasFinancialDisclosure,
            }
          : null,
        vies: enrichment.vies,
        kycProtect: enrichment.kycProtect
          ? {
              hasSanctionHit: enrichment.kycProtect.hasSanctionHit,
              hasEnforcementHit: enrichment.kycProtect.hasEnforcementHit,
              hasAdverseMediaHit: enrichment.kycProtect.hasAdverseMediaHit,
              totalHits: enrichment.kycProtect.totalHits,
            }
          : null,
        errors: enrichment.errors,
      },
    });

    return response;
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
        "Evaluates a company's creditworthiness for vehicle leasing and returns tier classification with financial terms.",
    },
  }
);
