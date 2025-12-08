/**
 * Tier Evaluator
 * Main evaluation engine implementing the funnel-based tier classification logic
 */

import type { EvaluationRequest } from "../../types/input-types";
import type {
  EvaluationResult,
  ExternalDataResult,
  FailedCriterion,
} from "../../types/evaluation-result-types";
import type { TierConfiguration, TierCriteria } from "../../types/criteria-types";
import { Tier, TIER_INTEREST_RATES } from "../../types/tier-types";
import { validateQuestionnaire } from "../../validators/questionnaire-validator";
import { validateCompany } from "../../validators/company-validator";
import { validateAdministrator } from "../../validators/admin-validator";
import { validateAsset } from "../../validators/asset-validator";
import { validateInsurance } from "../../validators/insurance-validator";
import { validateLegalStatus } from "../../validators/legal-status-validator";
import { validateFraud } from "../../validators/fraud-validator";
import { getCompanyData } from "../integrations/creditsafe-service";
import { validateVatNumberWithFallback } from "../integrations/vies-service";
import tierRulesConfig from "../../config/tier-rules.json";

const tierConfig: TierConfiguration = tierRulesConfig as TierConfiguration;

// Tier evaluation order (funnel: start from best tier, demote on failure)
const TIER_ORDER: Tier[] = [Tier.EXCELLENT, Tier.GOOD, Tier.FAIR, Tier.POOR];

/**
 * Main evaluation function
 * Implements the funnel-based tier classification logic
 */
export async function evaluateTier(
  request: EvaluationRequest
): Promise<EvaluationResult> {
  const reasoning: string[] = [];
  const allFailedCriteria: FailedCriterion[] = [];
  const manualReviewReasons: string[] = [];

  // Step 1: Fetch external data
  reasoning.push("Fetching external data from Creditsafe and VIES...");

  const externalData: ExternalDataResult = {
    creditsafe: undefined,
    vies: undefined,
  };

  try {
    const creditsafeData = await getCompanyData(request.company.vatNumber);
    externalData.creditsafe = { ...creditsafeData, success: true };
    reasoning.push("✓ Creditsafe data fetched successfully");
  } catch (error) {
    externalData.creditsafe = {
      creditRating: 0,
      yearsActive: 0,
      financialDisclosure: false,
      companyActive: false,
      taxWithholdingHit: false,
      success: false,
    };
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    reasoning.push(`✗ Creditsafe data fetch failed: ${errorMessage}`);
    throw new Error(`Failed to fetch Creditsafe data: ${errorMessage}`);
  }

  try {
    const viesData = await validateVatNumberWithFallback(
      request.company.vatNumber
    );
    externalData.vies = { ...viesData, success: true };
    reasoning.push(
      `✓ VIES validation: ${viesData.valid ? "Valid" : "Invalid"}`
    );
  } catch (error) {
    externalData.vies = {
      valid: false,
      countryCode: request.company.vatNumber.substring(0, 2),
      vatNumber: request.company.vatNumber.substring(2),
      requestDate: new Date().toISOString(),
      success: false,
    };
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    reasoning.push(`✗ VIES validation failed: ${errorMessage}`);
    throw new Error(`Failed to validate VAT number: ${errorMessage}`);
  }

  // Step 2: Check for immediate manual review triggers
  reasoning.push("Checking for manual review triggers...");

  if (request.questionnaire.legalIssues) {
    manualReviewReasons.push(
      "Legal authority contact requires manual review"
    );
  }

  if (request.questionnaire.paymentIssuesElsewhere) {
    manualReviewReasons.push(
      "Payment issues at other financiers require manual review"
    );
  }

  if (request.questionnaire.bankBlacklist) {
    manualReviewReasons.push("Bank blacklist status requires manual review");
  }

  // If any manual review triggers, check if they're acceptable at ANY tier
  // If not acceptable at any tier (all are NO_GO), then reject
  if (manualReviewReasons.length > 0) {
    const hasAnyTierAllowingManualReview = tierConfig.tiers.some((tier) => {
      const questCriteria = tier.questionnaire;
      return (
        (request.questionnaire.legalIssues &&
          questCriteria.legalIssues === "MANUAL") ||
        (request.questionnaire.paymentIssuesElsewhere &&
          questCriteria.paymentIssuesElsewhere === "MANUAL") ||
        (request.questionnaire.bankBlacklist &&
          questCriteria.bankBlacklist === "MANUAL")
      );
    });

    if (!hasAnyTierAllowingManualReview) {
      reasoning.push("✗ Manual review triggers are NO-GO at all tiers");
      return {
        tier: Tier.REJECTED,
        reasoning,
        failedCriteria: allFailedCriteria,
        timestamp: new Date().toISOString(),
        externalData,
        interestRate: null,
      };
    }

    reasoning.push(
      `⚠ Manual review required: ${manualReviewReasons.join(", ")}`
    );
  }

  // Step 3: Funnel evaluation - start from EXCELLENT, demote on failure
  reasoning.push("Starting funnel evaluation from EXCELLENT tier...");

  for (const targetTier of TIER_ORDER) {
    const tierCriteria = tierConfig.tiers.find((t) => t.tier === targetTier);

    if (!tierCriteria) {
      continue;
    }

    reasoning.push(`\nEvaluating ${targetTier} tier criteria...`);

    const tierFailures: FailedCriterion[] = [];
    const tierManualReasons: string[] = [];
    let passedTier = true;

    // Validate each enabled category
    if (tierCriteria.enabled.questionnaire) {
      reasoning.push("  - Checking questionnaire...");
      const result = validateQuestionnaire(
        request.questionnaire,
        tierCriteria.questionnaire
      );
      if (!result.passed) {
        tierFailures.push(...result.failures);
        passedTier = false;
        reasoning.push(
          `    ✗ Failed: ${result.failures.map((f) => f.message).join(", ")}`
        );
      } else {
        reasoning.push("    ✓ Passed");
      }
      tierManualReasons.push(...result.manualReviewReasons);
    }

    if (tierCriteria.enabled.company && externalData.creditsafe) {
      reasoning.push("  - Checking company criteria...");
      const result = validateCompany(
        request.company,
        tierCriteria.company,
        externalData.creditsafe,
        externalData.vies!
      );
      if (!result.passed) {
        tierFailures.push(...result.failures);
        passedTier = false;
        reasoning.push(
          `    ✗ Failed: ${result.failures.map((f) => f.message).join(", ")}`
        );
      } else {
        reasoning.push("    ✓ Passed");
      }
      tierManualReasons.push(...result.manualReviewReasons);
    }

    if (tierCriteria.enabled.admin) {
      reasoning.push("  - Checking administrator criteria...");
      const result = validateAdministrator(
        request.administrator,
        tierCriteria.admin
      );
      if (!result.passed) {
        tierFailures.push(...result.failures);
        passedTier = false;
        reasoning.push(
          `    ✗ Failed: ${result.failures.map((f) => f.message).join(", ")}`
        );
      } else {
        reasoning.push("    ✓ Passed");
      }
      tierManualReasons.push(...result.manualReviewReasons);
    }

    if (tierCriteria.enabled.asset) {
      reasoning.push("  - Checking asset criteria...");
      const result = validateAsset(request.asset, tierCriteria.asset);
      if (!result.passed) {
        tierFailures.push(...result.failures);
        passedTier = false;
        reasoning.push(
          `    ✗ Failed: ${result.failures.map((f) => f.message).join(", ")}`
        );
      } else {
        reasoning.push("    ✓ Passed");
      }
      tierManualReasons.push(...result.manualReviewReasons);
    }

    if (tierCriteria.enabled.insurance && request.insurance) {
      reasoning.push("  - Checking insurance criteria...");
      const result = validateInsurance(
        request.insurance,
        request.asset,
        tierCriteria.insurance
      );
      if (!result.passed) {
        tierFailures.push(...result.failures);
        passedTier = false;
        reasoning.push(
          `    ✗ Failed: ${result.failures.map((f) => f.message).join(", ")}`
        );
      } else {
        reasoning.push("    ✓ Passed");
      }
      tierManualReasons.push(...result.manualReviewReasons);
    } else if (tierCriteria.enabled.insurance && !request.insurance) {
      reasoning.push(
        "  - ✗ Insurance data required but not provided for this tier"
      );
      tierFailures.push({
        category: "insurance",
        criterion: "insurance_data_required",
        actualValue: undefined,
        requiredValue: "required",
        message: "Insurance data is required for this tier",
      });
      passedTier = false;
    }

    if (tierCriteria.enabled.legalStatus) {
      reasoning.push("  - Checking legal status...");
      const result = validateLegalStatus(
        request.company,
        tierCriteria.legalStatus
      );
      if (!result.passed) {
        tierFailures.push(...result.failures);
        passedTier = false;
        reasoning.push(
          `    ✗ Failed: ${result.failures.map((f) => f.message).join(", ")}`
        );
      } else {
        reasoning.push("    ✓ Passed");
      }
      tierManualReasons.push(...result.manualReviewReasons);
    }

    if (tierCriteria.enabled.fraud && request.fraud) {
      reasoning.push("  - Checking fraud criteria...");
      const result = validateFraud(request.fraud, tierCriteria.fraud);
      if (!result.passed) {
        tierFailures.push(...result.failures);
        passedTier = false;
        reasoning.push(
          `    ✗ Failed: ${result.failures.map((f) => f.message).join(", ")}`
        );
      } else {
        reasoning.push("    ✓ Passed");
      }
      tierManualReasons.push(...result.manualReviewReasons);
    }

    // Accumulate manual review reasons
    manualReviewReasons.push(...tierManualReasons);

    // If passed all criteria for this tier, assign it
    if (passedTier) {
      reasoning.push(`\n✓ All criteria passed for ${targetTier} tier!`);

      // If there are manual review reasons, return MANUAL_REVIEW instead
      if (manualReviewReasons.length > 0) {
        reasoning.push(
          `⚠ However, manual review is required due to: ${manualReviewReasons.join(", ")}`
        );
        return {
          tier: Tier.MANUAL_REVIEW,
          reasoning,
          failedCriteria: allFailedCriteria,
          manualReviewReasons: [...new Set(manualReviewReasons)], // Deduplicate
          timestamp: new Date().toISOString(),
          externalData,
          interestRate: null,
        };
      }

      return {
        tier: targetTier,
        reasoning,
        failedCriteria: allFailedCriteria,
        timestamp: new Date().toISOString(),
        externalData,
        interestRate: TIER_INTEREST_RATES[targetTier],
      };
    }

    // Failed this tier, accumulate failures and try next tier
    allFailedCriteria.push(...tierFailures);
    reasoning.push(`✗ Failed ${targetTier} tier, trying next tier...`);
  }

  // Step 4: Failed all tiers
  reasoning.push("\n✗ Failed all tier criteria");

  // If there are manual review reasons, return MANUAL_REVIEW
  if (manualReviewReasons.length > 0) {
    reasoning.push("⚠ Routing to manual review");
    return {
      tier: Tier.MANUAL_REVIEW,
      reasoning,
      failedCriteria: allFailedCriteria,
      manualReviewReasons: [...new Set(manualReviewReasons)],
      timestamp: new Date().toISOString(),
      externalData,
      interestRate: null,
    };
  }

  // Otherwise, reject
  return {
    tier: Tier.REJECTED,
    reasoning,
    failedCriteria: allFailedCriteria,
    timestamp: new Date().toISOString(),
    externalData,
    interestRate: null,
  };
}
