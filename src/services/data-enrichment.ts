import { CreditCheckRequest } from "../types/request";
import { RuleContext, ViesData } from "../types/rules";
import { getCompanyReportByVat } from "./creditsafe/client";
import { mapCreditsafeResponse, CreditsafeData } from "./creditsafe/mapper";
import { validateVatNumber } from "./vies/client";
import { ViesResult } from "./vies/types";

export interface EnrichmentResult {
  creditsafe: CreditsafeData | null;
  vies: ViesResult | null;
  creditsafeFailed: boolean;
  viesFailed: boolean;
  errors: string[];
}

/**
 * Enrich request data with external API calls.
 * Calls Creditsafe and VIES in parallel.
 *
 * @param vatNumber - The VAT number to look up
 * @returns Enriched data from external sources
 */
export async function enrichData(vatNumber: string): Promise<EnrichmentResult> {
  const errors: string[] = [];
  let creditsafe: CreditsafeData | null = null;
  let vies: ViesResult | null = null;
  let creditsafeFailed = false;
  let viesFailed = false;

  // Call APIs in parallel
  const [creditsafeResult, viesResult] = await Promise.allSettled([
    getCompanyReportByVat(vatNumber),
    validateVatNumber(vatNumber),
  ]);

  // Process Creditsafe result
  if (creditsafeResult.status === "fulfilled") {
    if (creditsafeResult.value) {
      creditsafe = mapCreditsafeResponse(creditsafeResult.value);
    } else {
      creditsafeFailed = true;
      errors.push(`Company not found in Creditsafe: ${vatNumber}`);
    }
  } else {
    creditsafeFailed = true;
    errors.push(`Creditsafe API error: ${creditsafeResult.reason}`);
  }

  // Process VIES result
  if (viesResult.status === "fulfilled") {
    vies = viesResult.value;
    if (viesResult.value.error) {
      viesFailed = true;
      errors.push(`VIES error: ${viesResult.value.error}`);
    }
  } else {
    viesFailed = true;
    errors.push(`VIES API error: ${viesResult.reason}`);
  }

  return {
    creditsafe,
    vies,
    creditsafeFailed,
    viesFailed,
    errors,
  };
}

/**
 * Build rule context from request and enriched data.
 */
export function buildRuleContext(
  request: CreditCheckRequest,
  enrichment: EnrichmentResult
): RuleContext {
  // Convert ViesResult to ViesData format
  const viesData: ViesData | undefined = enrichment.vies
    ? {
        valid: enrichment.vies.valid,
        companyName: enrichment.vies.companyName,
        companyAddress: enrichment.vies.companyAddress,
        error: enrichment.vies.error,
        apiCallFailed: enrichment.viesFailed,
      }
    : undefined;

  return {
    questionnaire: request.questionnaire,
    company: request.company,
    creditsafe: enrichment.creditsafe,
    vies: viesData,
    creditsafeFailed: enrichment.creditsafeFailed,
    viesFailed: enrichment.viesFailed,
  };
}
