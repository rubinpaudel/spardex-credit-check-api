import { Elysia } from "elysia";
import { healthRoutes } from "./health";
import { creditCheckRoutes } from "./credit-check";

export const routes = new Elysia()
  .use(healthRoutes)
  .use(creditCheckRoutes)
  .get(
    "/",
    () => ({
      message: "Welcome to Spardex API",
      version: "1.0.0",
      documentation: "/swagger",
    }),
    {
      detail: {
        tags: ["API"],
        summary: "API root",
        description: "Returns basic API information",
      },
    }
  );
