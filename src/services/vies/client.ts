import { ViesResponse, ViesResult } from "./types";

const VIES_BASE_URL = "https://ec.europa.eu/taxation_customs/vies/rest-api";
const TIMEOUT_MS = 5000;

/**
 * Validate a Belgian VAT number using EU VIES service.
 *
 * @param vatNumber - Full VAT number with country code, e.g., "BE0123456789"
 * @returns Validation result
 */
export async function validateVatNumber(
  vatNumber: string
): Promise<ViesResult> {
  try {
    // Parse country code and number
    // Belgian format: BE + 10 digits (e.g., BE0123456789)
    const countryCode = vatNumber.substring(0, 2).toUpperCase();
    const number = vatNumber.substring(2);

    if (countryCode !== "BE") {
      return {
        valid: false,
        error: `Only Belgian VAT numbers supported. Got country code: ${countryCode}`,
      };
    }

    // Call VIES API
    const url = `${VIES_BASE_URL}/ms/${countryCode}/vat/${number}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        valid: false,
        error: `VIES API returned status ${response.status}`,
      };
    }

    const data = (await response.json()) as ViesResponse;

    return {
      valid: data.isValid,
      companyName: data.name,
      companyAddress: data.address,
      error: data.userError,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        valid: false,
        error: "VIES API timeout",
      };
    }

    return {
      valid: false,
      error: `VIES API error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
