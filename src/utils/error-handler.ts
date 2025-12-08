/**
 * Error Handler Utility
 * Provides structured error responses with context for frontend consumption
 */

import type { EvaluationError } from "../types/evaluation-result-types";

/**
 * Create a standardized API error response
 */
export function createApiError(
  type: "API_ERROR" | "VALIDATION_ERROR" | "EXTERNAL_SERVICE_FAILURE",
  message: string,
  context?: {
    service?: string;
    details?: any;
  }
): EvaluationError {
  return {
    error: type,
    message,
    context,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create validation error
 */
export function createValidationError(
  message: string,
  details?: any
): EvaluationError {
  return createApiError("VALIDATION_ERROR", message, { details });
}

/**
 * Create external service failure error
 */
export function createExternalServiceError(
  service: string,
  message: string,
  details?: any
): EvaluationError {
  return createApiError("EXTERNAL_SERVICE_FAILURE", message, {
    service,
    details,
  });
}

/**
 * Create generic API error
 */
export function createGenericError(
  message: string,
  details?: any
): EvaluationError {
  return createApiError("API_ERROR", message, { details });
}

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred";
}

/**
 * Check if error is from Creditsafe service
 */
export function isCreditsafeError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return (
    message.toLowerCase().includes("creditsafe") ||
    message.toLowerCase().includes("credit score")
  );
}

/**
 * Check if error is from VIES service
 */
export function isViesError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return (
    message.toLowerCase().includes("vies") ||
    message.toLowerCase().includes("vat")
  );
}

/**
 * Convert unknown error to EvaluationError
 */
export function toEvaluationError(error: unknown): EvaluationError {
  const message = getErrorMessage(error);

  if (isCreditsafeError(error)) {
    return createExternalServiceError(
      "Creditsafe",
      `Failed to fetch company data: ${message}`
    );
  }

  if (isViesError(error)) {
    return createExternalServiceError(
      "VIES",
      `Failed to validate VAT number: ${message}`
    );
  }

  return createGenericError(message);
}
