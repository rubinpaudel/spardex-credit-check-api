const env = {
  PORT: parseInt(process.env.PORT || "3000"),
  NODE_ENV: process.env.NODE_ENV || "development",
  API_KEY: process.env.API_KEY,
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()) ?? [],
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
  if (!env.API_KEY) {
    console.error("Missing required environment variable: API_KEY");
    process.exit(1);
  }

  if (env.CORS_ORIGINS.length === 0) {
    console.error("Missing required environment variable: CORS_ORIGINS");
    process.exit(1);
  }
}

validateEnv();

export { env };
