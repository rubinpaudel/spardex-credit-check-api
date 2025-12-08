/**
 * Creditsafe API Integration Service
 * Fetches company credit data from Creditsafe API
 */

import {
  creditsafeConfig,
  type CreditsafeAuthResponse,
  type CreditsafeCompanyResponse,
} from "../../config/creditsafe-config";

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

/**
 * Authenticate with Creditsafe API and get access token
 */
async function authenticate(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  if (!creditsafeConfig.username || !creditsafeConfig.password) {
    throw new Error(
      "Creditsafe credentials not configured. Set CREDITSAFE_USERNAME and CREDITSAFE_PASSWORD environment variables."
    );
  }

  try {
    const response = await fetch(
      `${creditsafeConfig.baseUrl}/authenticate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: creditsafeConfig.username,
          password: creditsafeConfig.password,
        }),
        signal: AbortSignal.timeout(creditsafeConfig.timeout),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Creditsafe authentication failed: ${response.status} ${response.statusText}`
      );
    }

    const data: CreditsafeAuthResponse = await response.json();
    cachedToken = data.token;
    // Cache token for 55 minutes (tokens typically valid for 1 hour)
    tokenExpiry = Date.now() + 55 * 60 * 1000;

    return data.token;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Creditsafe authentication error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Fetch company data from Creditsafe by VAT number
 */
export async function getCompanyData(
  vatNumber: string
): Promise<CreditsafeCompanyResponse> {
  try {
    const token = await authenticate();

    // Extract country code and VAT number (format: BE0123456789)
    const countryCode = vatNumber.substring(0, 2);
    const vatOnly = vatNumber.substring(2);

    // Search for company by VAT number
    const searchResponse = await fetch(
      `${creditsafeConfig.baseUrl}/companies?countries=${countryCode}&vatNumber=${vatOnly}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(creditsafeConfig.timeout),
      }
    );

    if (!searchResponse.ok) {
      throw new Error(
        `Creditsafe company search failed: ${searchResponse.status} ${searchResponse.statusText}`
      );
    }

    const searchData = await searchResponse.json();

    if (!searchData.companies || searchData.companies.length === 0) {
      throw new Error(`Company not found in Creditsafe: ${vatNumber}`);
    }

    // Get the first matching company
    const companyId = searchData.companies[0].id;

    // Fetch full company report
    const reportResponse = await fetch(
      `${creditsafeConfig.baseUrl}/companies/${companyId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(creditsafeConfig.timeout),
      }
    );

    if (!reportResponse.ok) {
      throw new Error(
        `Creditsafe company report failed: ${reportResponse.status} ${reportResponse.statusText}`
      );
    }

    const reportData = await reportResponse.json();

    // Extract and transform data to our format
    return transformCreditsafeData(reportData);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Creditsafe API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Transform Creditsafe API response to our internal format
 */
function transformCreditsafeData(data: any): CreditsafeCompanyResponse {
  const report = data.report;
  const creditScore = report.creditScore || {};
  const companyIdentification = report.companyIdentification || {};
  const additionalInformation = report.additionalInformation || {};

  // Calculate years active
  const dateOfIncorporation = companyIdentification.dateOfIncorporation;
  let yearsActive = 0;
  if (dateOfIncorporation) {
    const incorporationDate = new Date(dateOfIncorporation);
    const now = new Date();
    yearsActive =
      (now.getTime() - incorporationDate.getTime()) /
      (1000 * 60 * 60 * 24 * 365);
  }

  return {
    creditRating: creditScore.currentCreditRating?.value || 0,
    yearsActive: Math.floor(yearsActive * 10) / 10, // Round to 1 decimal
    financialDisclosure:
      additionalInformation.latestAccountsDate !== undefined &&
      additionalInformation.latestAccountsDate !== null,
    companyActive:
      companyIdentification.activityCode !== "INACTIVE" &&
      companyIdentification.companyStatus !== "DISSOLVED",
    taxWithholdingHit: checkTaxWithholding(report),
  };
}

/**
 * Check for tax withholding obligations (Belgian "inhoudingsplicht") indicators
 */
function checkTaxWithholding(report: any): boolean {
  // Check for tax-related negative indicators
  const negativeInfo = report.negativeInformation || {};
  const judgements = negativeInfo.countCourtData || [];

  // Look for tax-related court cases or withholding obligations
  return judgements.some(
    (judgement: any) =>
      judgement.type?.toLowerCase().includes("tax") ||
      judgement.type?.toLowerCase().includes("withholding")
  );
}

/**
 * Mock implementation for testing without API credentials
 */
export function getMockCompanyData(
  vatNumber: string
): CreditsafeCompanyResponse {
  // Generate deterministic mock data based on VAT number
  const hash = vatNumber
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return {
    creditRating: 50 + (hash % 50), // Rating between 50-100
    yearsActive: 1 + (hash % 10), // 1-10 years
    financialDisclosure: hash % 2 === 0,
    companyActive: true,
    taxWithholdingHit: hash % 10 === 0, // 10% chance
  };
}
