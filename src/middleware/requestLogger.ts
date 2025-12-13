import { Elysia } from "elysia";
import { logger } from "../config";

export const requestLogger = new Elysia({ name: "request-logger" })
  .onRequest(({ request }) => {
    const url = new URL(request.url);
    logger.info(
      {
        method: request.method,
        path: url.pathname,
        ip: request.headers.get("x-forwarded-for") || "unknown",
      },
      "Incoming request"
    );
  })
  .onAfterHandle(({ request, set }) => {
    const url = new URL(request.url);
    logger.info(
      {
        method: request.method,
        path: url.pathname,
        status: set.status || 200,
      },
      "Request completed"
    );
  });
