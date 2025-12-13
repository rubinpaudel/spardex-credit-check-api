/**
 * Base error class for credit check service.
 */
export class CreditCheckError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = "CreditCheckError";
  }
}

/**
 * Validation errors (400 Bad Request).
 */
export class ValidationError extends CreditCheckError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

/**
 * External API errors (502 Bad Gateway).
 */
export class ExternalApiError extends CreditCheckError {
  constructor(service: string, originalError?: Error) {
    super(`External API error: ${service}`, "EXTERNAL_API_ERROR", 502, {
      service,
      originalError: originalError?.message,
    });
    this.name = "ExternalApiError";
  }
}

/**
 * Not found errors (404).
 */
export class NotFoundError extends CreditCheckError {
  constructor(resource: string, identifier?: string) {
    super(
      identifier ? `${resource} not found: ${identifier}` : `${resource} not found`,
      "NOT_FOUND",
      404
    );
    this.name = "NotFoundError";
  }
}

/**
 * Authentication errors (401).
 */
export class AuthenticationError extends CreditCheckError {
  constructor(message: string = "Authentication required") {
    super(message, "AUTHENTICATION_ERROR", 401);
    this.name = "AuthenticationError";
  }
}
