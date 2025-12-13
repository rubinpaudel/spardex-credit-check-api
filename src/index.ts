import { Elysia } from "elysia";
import { env, logger, swaggerConfig, corsConfig } from "./config";
import { authMiddleware, requestLogger, errorHandler } from "./middleware";
import { routes } from "./routes";

const app = new Elysia()
  .use(corsConfig)
  .use(swaggerConfig)
  .use(requestLogger)
  .use(errorHandler)
  .use(authMiddleware)
  .use(routes)
  .listen(env.PORT);

logger.info(
  { port: app.server?.port, hostname: app.server?.hostname, environment: env.NODE_ENV },
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  app.server?.stop();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export type App = typeof app;
