import { Elysia } from "elysia";
import { healthRoutes } from "./health";

export const routes = new Elysia()
  .use(healthRoutes)
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
