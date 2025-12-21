import { CreditCheckRequest } from "../types/request";
import { RuleContext, ViesData } from "../types/rules";
import { getCompanyReportByVat } from "./creditsafe/client";
import { mapCreditsafeResponse, CreditsafeData } from "./creditsafe/mapper";
import { validateVatNumber } from "./vies/client";
import { ViesResult } from "./vies/types";
import { searchBusinessWithHits } from "./kyc-protect/client";
import { mapKycProtectResponse, KycProtectData } from "./kyc-protect/mapper";

export interface EnrichmentResult {
  creditsafe: CreditsafeData | null;
  vies: ViesResult | null;
  kycProtect: KycProtectData | null;
  creditsafeFailed: boolean;
  viesFailed: boolean;
  kycProtectFailed: boolean;
  errors: string[];
}

/**
 * Enrich request data with external API calls.
 * Calls Creditsafe and VIES in parallel first, then KYC Protect
 * (which needs company name from Creditsafe/VIES).
 *
 * @param vatNumber - The VAT number to look up
 * @returns Enriched data from external sources
 */
export async function enrichData(vatNumber: string): Promise<EnrichmentResult> {
  const errors: string[] = [];
  let creditsafe: CreditsafeData | null = null;
  let vies: ViesResult | null = null;
  let kycProtect: KycProtectData | null = null;
  let creditsafeFailed = false;
  let viesFailed = false;
  let kycProtectFailed = false;

  // Step 1: Call Creditsafe and VIES in parallel
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
    // Only treat as error if there's an error message that's not "VALID"
    // (VIES API returns "VALID" as userError when VAT is valid - confusing API design)
    if (viesResult.value.error && viesResult.value.error !== "VALID") {
      viesFailed = true;
      errors.push(`VIES error: ${viesResult.value.error}`);
    }
  } else {
    viesFailed = true;
    errors.push(`VIES API error: ${viesResult.reason}`);
  }

  // Step 2: Call KYC Protect with company name (prefer Creditsafe, fallback to VIES)
  const companyName = creditsafe?.companyName || vies?.companyName;

  if (companyName) {
    try {
      const searchResult = await searchBusinessWithHits(companyName, "BE");
      kycProtect = mapKycProtectResponse(
        searchResult,
        searchResult.hits,
        companyName
      );
    } catch (error) {
      kycProtectFailed = true;
      errors.push(`KYC Protect API error: ${error}`);
    }
  }
  // If no company name available, we don't mark kycProtect as failed
  // since we couldn't call it - rules will handle this gracefully

  return {
    creditsafe,
    vies,
    kycProtect,
    creditsafeFailed,
    viesFailed,
    kycProtectFailed,
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
    kycProtect: enrichment.kycProtect,
    creditsafeFailed: enrichment.creditsafeFailed,
    viesFailed: enrichment.viesFailed,
    kycProtectFailed: enrichment.kycProtectFailed,
  };
}
