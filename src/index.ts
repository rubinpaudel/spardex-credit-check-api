import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import pino from "pino";
import { ZodError } from "zod";
import { evaluateTier } from "./services/tier-engine/tier-evaluator";
import { logEvaluation } from "./services/tier-engine/evaluation-logger";
import { evaluationRequestSchema } from "./schemas/evaluation-schemas";
import {
  toEvaluationError,
  createValidationError,
} from "./utils/error-handler";

// Environment variable validation
const PORT = process.env.PORT || "3000";
const NODE_ENV = process.env.NODE_ENV || "development";
const API_KEY = process.env.API_KEY;
const CORS_ORIGIN = process.env.CORS_ORIGIN;

if (!API_KEY) {
  console.error("ERROR: API_KEY environment variable is required");
  process.exit(1);
}

if (!CORS_ORIGIN) {
  console.error("ERROR: CORS_ORIGIN environment variable is required");
  process.exit(1);
}

// Logger setup
const logger = pino({
  level: NODE_ENV === "production" ? "info" : "debug",
  transport:
    NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});

// API Key authentication middleware
const apiKeyAuth = (context: any) => {
  const requestPath = context.path;

  // Skip auth for health check and swagger endpoints
  if (requestPath === "/health" || requestPath.startsWith("/swagger")) {
    return;
  }

  const apiKey = context.headers["x-api-key"];

  if (!apiKey || apiKey !== API_KEY) {
    logger.warn({ path: requestPath, ip: context.request.headers.get("x-forwarded-for") }, "Unauthorized API request");
    context.set.status = 401;
    return {
      error: "Unauthorized",
      message: "Valid API key required in x-api-key header",
    };
  }

  logger.debug({ path: requestPath }, "Request authenticated");
};

// Create Elysia app
const app = new Elysia()
  // CORS configuration
  .use(
    cors({
      origin: CORS_ORIGIN,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
      credentials: true,
    })
  )
  // Swagger documentation
  .use(
    swagger({
      documentation: {
        info: {
          title: "Spardex API",
          version: "1.0.0",
          description: "Production-ready Elysia backend API",
        },
        tags: [
          { name: "Health", description: "Health check endpoints" },
          { name: "API", description: "Main API endpoints" },
          { name: "Tier Evaluation", description: "Vehicle financing tier classification endpoints" },
        ],
        components: {
          securitySchemes: {
            ApiKeyAuth: {
              type: "apiKey",
              in: "header",
              name: "x-api-key",
              description: "API key for authentication",
            },
          },
        },
        security: [{ ApiKeyAuth: [] }],
      },
    })
  )
  // Request logging middleware
  .onRequest((context) => {
    const url = new URL(context.request.url);
    logger.info(
      {
        method: context.request.method,
        path: url.pathname,
        ip: context.request.headers.get("x-forwarded-for") || "unknown",
      },
      "Incoming request"
    );
  })
  // Response logging middleware
  .onAfterHandle((context) => {
    const url = new URL(context.request.url);
    logger.info(
      {
        method: context.request.method,
        path: url.pathname,
        status: context.set.status || 200,
      },
      "Request completed"
    );
  })
  // Error handling
  .onError(({ code, error, set }) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error({ code, error: errorMessage, stack: errorStack }, "Request error");

    if (code === "VALIDATION") {
      set.status = 400;
      return {
        error: "Validation Error",
        message: errorMessage,
      };
    }

    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        error: "Not Found",
        message: "The requested resource was not found",
      };
    }

    set.status = 500;
    return {
      error: "Internal Server Error",
      message: NODE_ENV === "production" ? "An error occurred" : errorMessage,
    };
  })
  // Apply API key authentication
  .derive(apiKeyAuth)
  // Health check endpoint (no auth required)
  .get(
    "/health",
    () => ({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
    }),
    {
      detail: {
        tags: ["Health"],
        summary: "Health check",
        description: "Returns the health status of the API",
      },
    }
  )
  // Main API endpoint (auth required)
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
  )
  // Example authenticated endpoint
  .get(
    "/api/example",
    () => ({
      data: "This is a protected endpoint",
      timestamp: new Date().toISOString(),
    }),
    {
      detail: {
        tags: ["API"],
        summary: "Example endpoint",
        description: "Example of an authenticated endpoint",
      },
    }
  )
  // Tier evaluation - Evaluate endpoint
  .post(
    "/api/tiers/evaluate",
    async ({ body, set }) => {
      try {
        // Validate request with Zod
        const validationResult = evaluationRequestSchema.safeParse(body);

        if (!validationResult.success) {
          set.status = 400;
          return createValidationError(
            "Request validation failed",
            {
              errors: validationResult.error.issues.map((err) => ({
                path: err.path.join("."),
                message: err.message,
              })),
            }
          );
        }

        const request = validationResult.data;

        // Perform tier evaluation
        const result = await evaluateTier(request);

        // Log the evaluation
        await logEvaluation(request, result);

        return result;
      } catch (error) {
        console.error("Evaluation error:", error);
        set.status = 500;
        return toEvaluationError(error);
      }
    },
    {
      detail: {
        tags: ["Tier Evaluation"],
        summary: "Evaluate tier classification",
        description:
          "Evaluates a vehicle financing application and returns the assigned tier based on funnel-based criteria. Integrates with Creditsafe and VIES APIs to fetch company and VAT validation data.",
      },
    }
  )
  // Tier evaluation - Get config endpoint
  .get(
    "/api/tiers/config",
    async () => {
      const tierRules = await import("./config/tier-rules.json");
      return tierRules.default;
    },
    {
      detail: {
        tags: ["Tier Evaluation"],
        summary: "Get tier configuration",
        description:
          "Returns the current tier rules configuration including criteria for each tier level.",
      },
    }
  )
  // Start server
  .listen(parseInt(PORT));

logger.info(
  {
    port: app.server?.port,
    hostname: app.server?.hostname,
    environment: NODE_ENV,
  },
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

logger.info(`📚 Swagger documentation available at http://${app.server?.hostname}:${app.server?.port}/swagger`);

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("Received SIGINT, shutting down gracefully...");
  app.server?.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Received SIGTERM, shutting down gracefully...");
  app.server?.stop();
  process.exit(0);
});
