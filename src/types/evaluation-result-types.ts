/**
 * Evaluation Result Types
 * Defines the structure of evaluation responses
 */

import { Tier, Category } from "./tier-types";

export interface FailedCriterion {
  category: Category | string;
  criterion: string;
  actualValue: any;
  requiredValue: any;
  message: string;
}

export interface ExternalDataResult {
  creditsafe?: {
    creditRating: number;
    yearsActive: number;
    financialDisclosure: boolean;
    companyActive: boolean;
    taxWithholdingHit: boolean;
    success: boolean;
  };
  vies?: {
    valid: boolean;
    name?: string;
    address?: string;
    success: boolean;
  };
}

export interface EvaluationResult {
  tier: Tier;
  reasoning: string[];
  failedCriteria: FailedCriterion[];
  manualReviewReasons?: string[];
  timestamp: string;
  externalData: ExternalDataResult;
  interestRate: number | null;
}

export interface EvaluationError {
  error: "API_ERROR" | "VALIDATION_ERROR" | "EXTERNAL_SERVICE_FAILURE";
  message: string;
  context?: {
    service?: string;
    details?: any;
  };
  timestamp: string;
}
