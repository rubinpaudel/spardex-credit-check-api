import { Elysia } from "elysia";
import { env, logger } from "../config";

const PUBLIC_PATHS = ["/health", "/swagger"];

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

export const authMiddleware = new Elysia({ name: "auth" }).derive(
  { as: "global" },
  ({ headers, path, set, request }) => {
    if (isPublicPath(path)) {
      return {};
    }

    const apiKey = headers["x-api-key"];

    if (!apiKey || apiKey !== env.API_KEY) {
      logger.warn(
        { path, ip: request.headers.get("x-forwarded-for") },
        "Unauthorized API request"
      );
      set.status = 401;
      return {
        error: "Unauthorized",
        message: "Valid API key required in x-api-key header",
      };
    }

    logger.debug({ path }, "Request authenticated");
    return {};
  }
);
