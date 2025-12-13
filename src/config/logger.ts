import pino from "pino";
import { env } from "./env";

export const logger = pino({
  level: env.isProduction ? "info" : "debug",
  transport: env.isDevelopment
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
