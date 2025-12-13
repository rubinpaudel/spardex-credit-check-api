import { env } from "../../config/env";
import {
  CreditsafeAuthResponse,
  CreditsafeCompanyReport,
  CreditsafeCompanySearchResult,
  CreditsafeErrorResponse,
} from "./types";

const TIMEOUT_MS = 10000;

// Token cache
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Authenticate with Creditsafe and get JWT token.
 * Token is cached for 55 minutes (expires after 60).
 */
export async function authenticate(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const url = `${env.creditsafe.baseUrl}/authenticate`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: env.creditsafe.username,
        password: env.creditsafe.password,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = (await response.json()) as CreditsafeErrorResponse;
      throw new Error(`Creditsafe auth failed: ${error.message}`);
    }

    const data = (await response.json()) as CreditsafeAuthResponse;

    // Cache token for 55 minutes
    cachedToken = data.token;
    tokenExpiresAt = Date.now() + 55 * 60 * 1000;

    return data.token;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Creditsafe authentication timeout");
    }
    throw error;
  }
}

/**
 * Make authenticated request to Creditsafe API.
 */
export async function creditsafeFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await authenticate();

  const url = `${env.creditsafe.baseUrl}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = (await response.json()) as CreditsafeErrorResponse;
      throw new Error(`Creditsafe API error: ${error.message}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Creditsafe API timeout");
    }
    throw error;
  }
}

/**
 * Clear the cached token (useful for testing or forced re-auth).
 */
export function clearTokenCache(): void {
  cachedToken = null;
  tokenExpiresAt = 0;
}

/**
 * Check if Creditsafe credentials are configured.
 */
export function isCreditsafeConfigured(): boolean {
  return !!(env.creditsafe.username && env.creditsafe.password);
}

/**
 * Search for a Belgian company by VAT number.
 *
 * @param vatNumber - Belgian VAT number (with or without BE prefix)
 * @returns Company search results, or null if not found
 */
export async function searchCompanyByVat(
  vatNumber: string
): Promise<CreditsafeCompanySearchResult | null> {
  // Normalize VAT number - remove BE prefix if present
  let cleanVat = vatNumber.toUpperCase();
  if (cleanVat.startsWith("BE")) {
    cleanVat = cleanVat.substring(2);
  }

  // Creditsafe uses country code "BE" for Belgium
  const params = new URLSearchParams({
    countries: "BE",
    vatNo: cleanVat,
    pageSize: "1",
  });

  try {
    const result = await creditsafeFetch<CreditsafeCompanySearchResult>(
      `/companies?${params.toString()}`
    );

    if (!result.companies || result.companies.length === 0) {
      return null;
    }

    return result;
  } catch (error) {
    console.error("Company search failed:", error);
    throw error;
  }
}

/**
 * Get the connectId for a Belgian company by VAT number.
 * This ID is needed to fetch the full company report.
 *
 * @param vatNumber - Belgian VAT number
 * @returns connectId string, or null if not found
 */
export async function getConnectIdByVat(
  vatNumber: string
): Promise<string | null> {
  const searchResult = await searchCompanyByVat(vatNumber);

  if (!searchResult || searchResult.companies.length === 0) {
    return null;
  }

  return searchResult.companies[0].id;
}

/**
 * Fetch full company report by connectId.
 *
 * @param connectId - The company's Creditsafe ID (from search)
 * @returns Full company report
 */
export async function getCompanyReport(
  connectId: string
): Promise<CreditsafeCompanyReport> {
  // Request all available data
  const params = new URLSearchParams({
    customData: "true",
  });

  return creditsafeFetch<CreditsafeCompanyReport>(
    `/companies/${connectId}?${params.toString()}`
  );
}

/**
 * Convenience function: Get company report by VAT number.
 * Combines search + report fetch.
 *
 * @param vatNumber - Belgian VAT number
 * @returns Full company report, or null if not found
 */
export async function getCompanyReportByVat(
  vatNumber: string
): Promise<CreditsafeCompanyReport | null> {
  const connectId = await getConnectIdByVat(vatNumber);

  if (!connectId) {
    return null;
  }

  return getCompanyReport(connectId);
}
