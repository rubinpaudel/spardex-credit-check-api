import { swagger } from "@elysiajs/swagger";

export const swaggerConfig = swagger({
  documentation: {
    info: {
      title: "Spardex API",
      version: "1.0.0",
      description: "Spardex credit check api",
    },
    tags: [
      { name: "Health", description: "Health check endpoints" },
      { name: "API", description: "Main API endpoints" },
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
});
