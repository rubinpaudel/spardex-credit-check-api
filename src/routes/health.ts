import { Elysia } from "elysia";
import { env } from "../config";

export const healthRoutes = new Elysia({ prefix: "/health" }).get(
  "/",
  () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  }),
  {
    detail: {
      tags: ["Health"],
      summary: "Health check",
      description: "Returns the health status of the API",
    },
  }
);
