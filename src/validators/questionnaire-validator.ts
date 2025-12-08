/**
 * Questionnaire Validator
 * Validates questionnaire responses against tier criteria
 */

import type { QuestionnaireInput } from "../types/input-types";
import type {
  QuestionnaireCriteria,
  TierCriteria,
} from "../types/criteria-types";
import type { FailedCriterion } from "../types/evaluation-result-types";
import { Category } from "../types/tier-types";

export interface QuestionnaireValidationResult {
  passed: boolean;
  failures: FailedCriterion[];
  manualReviewReasons: string[];
}

export function validateQuestionnaire(
  input: QuestionnaireInput,
  criteria: QuestionnaireCriteria
): QuestionnaireValidationResult {
  const failures: FailedCriterion[] = [];
  const manualReviewReasons: string[] = [];

  // Belgium Residency - Hard Requirement
  if (input.belgiumResidency !== criteria.belgiumResidency) {
    failures.push({
      category: Category.QUESTIONNAIRE,
      criterion: "belgiumResidency",
      actualValue: input.belgiumResidency,
      requiredValue: criteria.belgiumResidency,
      message: "Applicant must be a Belgium resident",
    });
  }

  // Minimum Age - Threshold
  if (input.age < criteria.minAge) {
    failures.push({
      category: Category.QUESTIONNAIRE,
      criterion: "minAge",
      actualValue: input.age,
      requiredValue: criteria.minAge,
      message: `Applicant must be at least ${criteria.minAge} years old`,
    });
  }

  // Is Admin - Hard Requirement
  if (input.isAdmin !== criteria.isAdmin) {
    failures.push({
      category: Category.QUESTIONNAIRE,
      criterion: "isAdmin",
      actualValue: input.isAdmin,
      requiredValue: criteria.isAdmin,
      message: "Applicant must be an administrator of the company",
    });
  }

  // Legal Issues
  if (input.legalIssues) {
    if (criteria.legalIssues === "NO_GO") {
      failures.push({
        category: Category.QUESTIONNAIRE,
        criterion: "legalIssues",
        actualValue: true,
        requiredValue: false,
        message: "Legal authority contact is not allowed for this tier",
      });
    } else if (criteria.legalIssues === "MANUAL") {
      manualReviewReasons.push(
        "Legal authority contact requires manual review"
      );
    }
  }

  // Payment Issues at Other Financier
  if (input.paymentIssuesElsewhere) {
    if (criteria.paymentIssuesElsewhere === "NO_GO") {
      failures.push({
        category: Category.QUESTIONNAIRE,
        criterion: "paymentIssuesElsewhere",
        actualValue: true,
        requiredValue: false,
        message:
          "Payment issues at other financiers not allowed for this tier",
      });
    } else if (criteria.paymentIssuesElsewhere === "MANUAL") {
      manualReviewReasons.push(
        "Payment issues at other financiers require manual review"
      );
    }
  }

  // Bank Blacklist
  if (input.bankBlacklist) {
    if (criteria.bankBlacklist === "NO_GO") {
      failures.push({
        category: Category.QUESTIONNAIRE,
        criterion: "bankBlacklist",
        actualValue: true,
        requiredValue: false,
        message: "Bank blacklist status not allowed for this tier",
      });
    } else if (criteria.bankBlacklist === "MANUAL") {
      manualReviewReasons.push("Bank blacklist status requires manual review");
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    manualReviewReasons,
  };
}
