import { Elysia } from "elysia";
import { healthRoutes } from "./health";
import { creditCheckRoutes } from "./credit-check";

export const routes = new Elysia()
  .use(healthRoutes)
  .use(creditCheckRoutes);
