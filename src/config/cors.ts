import { cors } from "@elysiajs/cors";
import { env } from "./env";

export const corsConfig = cors({
  origin: env.CORS_ORIGIN!,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  credentials: true,
});
