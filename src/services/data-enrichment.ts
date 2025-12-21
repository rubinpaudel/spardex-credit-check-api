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
 * Calls Creditsafe, VIES, and KYC Protect in parallel.
 *
 * @param vatNumber - The VAT number to look up
 * @param companyName - The company name for KYC screening
 * @returns Enriched data from external sources
 */
export async function enrichData(
  vatNumber: string,
  companyName?: string
): Promise<EnrichmentResult> {
  const errors: string[] = [];
  let creditsafe: CreditsafeData | null = null;
  let vies: ViesResult | null = null;
  let kycProtect: KycProtectData | null = null;
  let creditsafeFailed = false;
  let viesFailed = false;
  let kycProtectFailed = false;

  // Call APIs in parallel
  const [creditsafeResult, viesResult, kycProtectResult] =
    await Promise.allSettled([
      getCompanyReportByVat(vatNumber),
      validateVatNumber(vatNumber),
      // Only call KYC Protect if we have a company name
      companyName
        ? searchBusinessWithHits(companyName, "BE")
        : Promise.resolve(null),
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

  // Process KYC Protect result
  if (kycProtectResult.status === "fulfilled") {
    if (kycProtectResult.value) {
      const searchResult = kycProtectResult.value;
      kycProtect = mapKycProtectResponse(
        searchResult,
        searchResult.hits,
        companyName || ""
      );
    }
    // If null (no company name provided), we don't mark as failed
    // since it was intentionally skipped
  } else {
    kycProtectFailed = true;
    errors.push(`KYC Protect API error: ${kycProtectResult.reason}`);
  }

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
