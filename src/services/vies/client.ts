import { ViesResponse, ViesResult } from "./types";

const VIES_BASE_URL = "https://ec.europa.eu/taxation_customs/vies/rest-api";
const TIMEOUT_MS = 10000; // Increased from 5s to handle slow responses under load
const MAX_RETRIES = 4; // Total 5 attempts
const INITIAL_DELAY_MS = 1000; // 1 second
const MAX_DELAY_MS = 16000; // 16 seconds cap
const RETRYABLE_ERRORS = [
  "MS_MAX_CONCURRENT_REQ",
  "TIMEOUT",
  "SERVICE_UNAVAILABLE",
  "MS_UNAVAILABLE",
  "GLOBAL_MAX_CONCURRENT_REQ",
];

/**
 * Delay execution for a specified number of milliseconds.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter.
 * @param attempt - The current attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number): number {
  const exponentialDelay = INITIAL_DELAY_MS * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, MAX_DELAY_MS);
  // Add random jitter (0-500ms) to prevent thundering herd
  const jitter = Math.random() * 500;
  return cappedDelay + jitter;
}

/**
 * Check if an error message indicates a retryable error.
 */
function isRetryableError(errorMessage: string | undefined): boolean {
  if (!errorMessage) return false;
  return RETRYABLE_ERRORS.some((err) =>
    errorMessage.toUpperCase().includes(err)
  );
}

/**
 * Validate a Belgian VAT number using EU VIES service.
 * Implements exponential backoff retry for transient errors like MS_MAX_CONCURRENT_REQ.
 *
 * @param vatNumber - Full VAT number with country code, e.g., "BE0123456789"
 * @returns Validation result
 */
export async function validateVatNumber(
  vatNumber: string
): Promise<ViesResult> {
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

  const url = `${VIES_BASE_URL}/ms/${countryCode}/vat/${number}`;
  let lastError: string | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
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
        const errorMsg = `VIES API returned status ${response.status}`;
        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return { valid: false, error: errorMsg };
        }
        // Retry on server errors (5xx)
        lastError = errorMsg;
        if (attempt < MAX_RETRIES) {
          await delay(calculateBackoffDelay(attempt));
          continue;
        }
        return { valid: false, error: errorMsg };
      }

      const data = (await response.json()) as ViesResponse;

      // Check for retryable errors in the response
      if (data.userError && isRetryableError(data.userError)) {
        lastError = data.userError;
        if (attempt < MAX_RETRIES) {
          await delay(calculateBackoffDelay(attempt));
          continue;
        }
        // Final attempt failed
        return {
          valid: false,
          error: data.userError,
        };
      }

      // Success
      return {
        valid: data.isValid,
        companyName: data.name,
        companyAddress: data.address,
        // VIES API returns "VALID" as userError when VAT is valid - don't treat as error
        error: data.userError === "VALID" ? undefined : data.userError,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        lastError = "VIES API timeout";
        // Timeout is retryable
        if (attempt < MAX_RETRIES) {
          await delay(calculateBackoffDelay(attempt));
          continue;
        }
        return { valid: false, error: lastError };
      }

      const errorMsg = `VIES API error: ${error instanceof Error ? error.message : "Unknown error"}`;
      lastError = errorMsg;

      // Retry on network errors
      if (attempt < MAX_RETRIES) {
        await delay(calculateBackoffDelay(attempt));
        continue;
      }

      return { valid: false, error: errorMsg };
    }
  }

  // Should not reach here, but return last error if we do
  return { valid: false, error: lastError || "Unknown error after retries" };
}
