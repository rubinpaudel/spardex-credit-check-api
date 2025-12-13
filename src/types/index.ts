export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface HealthResponse {
  status: "ok" | "error";
  timestamp: string;
  environment: string;
}

export * from "./rules";
