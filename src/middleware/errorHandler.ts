import { Elysia } from "elysia";
import { env, logger } from "../config";
import { CreditCheckError } from "../utils/errors";

export const errorHandler = new Elysia({ name: "error-handler" }).onError(
  ({ code, error, set }) => {
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Handle our custom CreditCheckError
    if (error instanceof CreditCheckError) {
      logger.error(
        { code: error.code, error: error.message, details: error.details },
        "Credit check error"
      );

      set.status = error.statusCode;
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: env.isProduction ? undefined : error.details,
        },
        requestId,
        timestamp,
      };
    }

    logger.error({ code, error: errorMessage, stack: errorStack }, "Request error");

    // Handle Elysia built-in errors
    if (code === "VALIDATION") {
      set.status = 400;
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: errorMessage,
        },
        requestId,
        timestamp,
      };
    }

    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "The requested resource was not found",
        },
        requestId,
        timestamp,
      };
    }

    // Unknown errors - don't expose details in production
    set.status = 500;
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: env.isProduction ? "An unexpected error occurred" : errorMessage,
      },
      requestId,
      timestamp,
    };
  }
);
