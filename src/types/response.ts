import { TierName } from "./tiers";

// Financial terms that apply to a tier
export interface FinancialTerms {
  yearlyInterestPercent: number; // e.g., 3, 5.5, 12, 22
  minDownpaymentPercent: number; // e.g., 0, 10, 20
  maxFinancingPeriodMonths: number; // e.g., 60
  maxResidualValuePercent: number; // e.g., 15, 5
  canFinanceRegistrationTax: boolean;
}

// Result of a single rule evaluation
export interface RuleResult {
  ruleId: string; // e.g., "credit-rating"
  category: string; // e.g., "company", "admin", "fraud"
  tier: TierName; // What tier this rule maps to
  passed: boolean; // Did it meet minimum requirements?
  reason: string; // Human-readable explanation
  actualValue: unknown; // What we found
  expectedValue: unknown; // What was required
}

// The complete API response
export interface CreditCheckResponse {
  success: boolean;
  result: {
    tier: TierName;
    requiresManualReview: boolean;
    financialTerms: FinancialTerms;
    ruleResults: RuleResult[];
  };
  requestId: string; // UUID for tracking
  timestamp: string; // ISO datetime
}

// Error response
export interface CreditCheckErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
  timestamp: string;
}
