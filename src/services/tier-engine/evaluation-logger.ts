/**
 * Evaluation Logger
 * Logs tier evaluation attempts to JSON file with timestamps
 */

import { existsSync, mkdirSync } from "fs";
import { writeFile, readFile } from "fs/promises";
import { join } from "path";
import type { EvaluationRequest } from "../../types/input-types";
import type { EvaluationResult } from "../../types/evaluation-result-types";

const LOGS_DIR = join(process.cwd(), "logs");
const EVALUATIONS_LOG = join(LOGS_DIR, "evaluations.json");

interface EvaluationLogEntry {
  timestamp: string;
  request: EvaluationRequest;
  result: EvaluationResult;
}

interface EvaluationLog {
  evaluations: EvaluationLogEntry[];
}

/**
 * Initialize logs directory if it doesn't exist
 */
function initializeLogsDirectory(): void {
  if (!existsSync(LOGS_DIR)) {
    mkdirSync(LOGS_DIR, { recursive: true });
  }
}

/**
 * Read existing evaluation logs
 */
async function readEvaluationLogs(): Promise<EvaluationLog> {
  try {
    if (!existsSync(EVALUATIONS_LOG)) {
      return { evaluations: [] };
    }

    const content = await readFile(EVALUATIONS_LOG, "utf-8");
    return JSON.parse(content) as EvaluationLog;
  } catch (error) {
    console.error("Error reading evaluation logs:", error);
    return { evaluations: [] };
  }
}

/**
 * Write evaluation logs to file
 */
async function writeEvaluationLogs(log: EvaluationLog): Promise<void> {
  try {
    initializeLogsDirectory();
    await writeFile(
      EVALUATIONS_LOG,
      JSON.stringify(log, null, 2),
      "utf-8"
    );
  } catch (error) {
    console.error("Error writing evaluation logs:", error);
    throw error;
  }
}

/**
 * Log an evaluation attempt
 */
export async function logEvaluation(
  request: EvaluationRequest,
  result: EvaluationResult
): Promise<void> {
  try {
    const logs = await readEvaluationLogs();

    const entry: EvaluationLogEntry = {
      timestamp: new Date().toISOString(),
      request,
      result,
    };

    logs.evaluations.push(entry);

    // Keep only last 1000 evaluations to prevent file from growing too large
    if (logs.evaluations.length > 1000) {
      logs.evaluations = logs.evaluations.slice(-1000);
    }

    await writeEvaluationLogs(logs);
  } catch (error) {
    console.error("Failed to log evaluation:", error);
    // Don't throw - logging failure shouldn't break the evaluation
  }
}

/**
 * Get recent evaluation logs
 */
export async function getRecentEvaluations(
  limit: number = 10
): Promise<EvaluationLogEntry[]> {
  const logs = await readEvaluationLogs();
  return logs.evaluations.slice(-limit).reverse();
}

/**
 * Get evaluations by VAT number
 */
export async function getEvaluationsByVatNumber(
  vatNumber: string
): Promise<EvaluationLogEntry[]> {
  const logs = await readEvaluationLogs();
  return logs.evaluations
    .filter((entry) => entry.request.company.vatNumber === vatNumber)
    .reverse();
}

/**
 * Get evaluation statistics
 */
export async function getEvaluationStats(): Promise<{
  total: number;
  byTier: Record<string, number>;
  byDate: Record<string, number>;
}> {
  const logs = await readEvaluationLogs();

  const byTier: Record<string, number> = {};
  const byDate: Record<string, number> = {};

  for (const entry of logs.evaluations) {
    // Count by tier
    const tier = entry.result.tier;
    byTier[tier] = (byTier[tier] || 0) + 1;

    // Count by date
    const date = entry.timestamp.split("T")[0];
    byDate[date] = (byDate[date] || 0) + 1;
  }

  return {
    total: logs.evaluations.length,
    byTier,
    byDate,
  };
}
