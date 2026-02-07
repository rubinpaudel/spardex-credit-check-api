import { Tier } from "./tiers";
import { QuestionnaireData, CompanyInfo } from "./request";
import { TierThresholds } from "../config/tier-config";
import { CreditsafeData } from "../services/creditsafe/mapper";
import { KycProtectData } from "../services/kyc-protect/types";
import { ScoreCalculationResult } from "../services/score-calculation/types";

// Categories of rules
export type RuleCategory =
  | "blocklist" // Hard rejections
  | "general" // Basic requirements (age, residency)
  | "company" // Company data (credit, age, status)
  | "admin" // Administrator checks (bankruptcies)
  | "legal_status" // Company type validation
  | "fraud" // Fraud indicators
  | "asset" // Vehicle constraints
  | "insurance"; // Poor tier specific

// Result of evaluating a single rule
export interface RuleResult {
  ruleId: string;
  category: RuleCategory;
  tier: Tier; // The tier this rule qualifies for
  passed: boolean; // false if rejected/doesn't meet minimum
  reason: string; // Human explanation
  actualValue: unknown;
  expectedValue: unknown;
}

// VIES validation data
export interface ViesData {
  valid: boolean;
  companyName?: string;
  companyAddress?: string;
  error?: string;
  apiCallFailed: boolean;
}

// Context passed to rules
export interface RuleContext {
  questionnaire: QuestionnaireData;
  company: CompanyInfo;

  // External data sources
  creditsafe: CreditsafeData | null;
  vies?: ViesData;
  kycProtect: KycProtectData | null;

  // Score calculation with deltas (computed before rules run)
  scoreCalculation?: ScoreCalculationResult;

  // Flags for API failures
  creditsafeFailed: boolean;
  viesFailed: boolean;
  kycProtectFailed: boolean;
}

// A rule that can be evaluated
export interface Rule {
  id: string;
  category: RuleCategory;
  evaluate(context: RuleContext, thresholds: Record<Tier.EXCELLENT | Tier.GOOD | Tier.FAIR | Tier.POOR, TierThresholds>): RuleResult;
}
