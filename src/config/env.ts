const env = {
  PORT: parseInt(process.env.PORT || "3000"),
  NODE_ENV: process.env.NODE_ENV || "development",
  API_KEY: process.env.API_KEY,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV !== "production",

  // Creditsafe API
  creditsafe: {
    username: process.env.CREDITSAFE_USERNAME ?? "",
    password: process.env.CREDITSAFE_PASSWORD ?? "",
    baseUrl:
      process.env.CREDITSAFE_BASE_URL ??
      "https://connect.sandbox.creditsafe.com/v1",
  },
} as const;

function validateEnv() {
  const required = ["API_KEY", "CORS_ORIGIN"] as const;
  const missing = required.filter((key) => !env[key]);

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}

validateEnv();

export { env };
