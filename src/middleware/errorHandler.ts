import { Elysia } from "elysia";
import { env, logger } from "../config";

export const errorHandler = new Elysia({ name: "error-handler" }).onError(
  ({ code, error, set }) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error({ code, error: errorMessage, stack: errorStack }, "Request error");

    if (code === "VALIDATION") {
      set.status = 400;
      return { error: "Validation Error", message: errorMessage };
    }

    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: "Not Found", message: "The requested resource was not found" };
    }

    set.status = 500;
    return {
      error: "Internal Server Error",
      message: env.isProduction ? "An error occurred" : errorMessage,
    };
  }
);
