/**
 * Legal Status Validator
 * Validates company legal form against tier criteria
 */

import type { CompanyInput } from "../types/input-types";
import type {
  LegalStatusCriteria,
  LegalForm,
} from "../types/criteria-types";
import type { FailedCriterion } from "../types/evaluation-result-types";
import { Category } from "../types/tier-types";

export interface LegalStatusValidationResult {
  passed: boolean;
  failures: FailedCriterion[];
  manualReviewReasons: string[];
}

// Mapping from common Belgian legal form names to our enum
const LEGAL_FORM_MAPPING: Record<string, LegalForm> = {
  // Sole Proprietorship
  EENMANSZAAK: "SOLE_PROPRIETORSHIP",
  "SOLE PROPRIETORSHIP": "SOLE_PROPRIETORSHIP",
  EENMANSZAAK_ENTREPRISE_INDIVIDUELLE: "SOLE_PROPRIETORSHIP",

  // BV/SRL (Private Limited Company)
  BV: "BV_SRL",
  SRL: "BV_SRL",
  BVBA: "BV_SRL", // Old form, now BV
  SPRL: "BV_SRL", // Old form, now SRL
  "BV/SRL": "BV_SRL",

  // NV/SA (Public Limited Company)
  NV: "NV_SA",
  SA: "NV_SA",
  "NV/SA": "NV_SA",

  // CV/SC (Limited Partnership)
  CV: "CV_SC",
  SC: "CV_SC",
  "CV/SC": "CV_SC",
  COMM_V: "CV_SC",
  S_COMM: "CV_SC",

  // VOF/SNC (General Partnership)
  VOF: "VOF_SNC",
  SNC: "VOF_SNC",
  "VOF/SNC": "VOF_SNC",

  // CommV/SComm (Partnership Limited by Shares)
  COMMV: "COMMV_SCOMM",
  SCOMM: "COMMV_SCOMM",
  "COMMV/SCOMM": "COMMV_SCOMM",

  // VZW/ASBL (Non-profit Association)
  VZW: "VZW_ASBL",
  ASBL: "VZW_ASBL",
  "VZW/ASBL": "VZW_ASBL",
};

/**
 * Normalize legal form string to our LegalForm enum
 */
function normalizeLegalForm(legalForm: string): LegalForm | null {
  const normalized = legalForm.toUpperCase().trim();

  // Direct mapping
  if (normalized in LEGAL_FORM_MAPPING) {
    return LEGAL_FORM_MAPPING[normalized];
  }

  // Try to find partial match
  for (const [key, value] of Object.entries(LEGAL_FORM_MAPPING)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  return null;
}

export function validateLegalStatus(
  input: CompanyInput,
  criteria: LegalStatusCriteria
): LegalStatusValidationResult {
  const failures: FailedCriterion[] = [];
  const manualReviewReasons: string[] = [];

  const normalizedForm = normalizeLegalForm(input.legalForm);

  if (!normalizedForm) {
    failures.push({
      category: Category.LEGAL_STATUS,
      criterion: "legalForm",
      actualValue: input.legalForm,
      requiredValue: criteria.allowedLegalForms,
      message: `Unrecognized legal form: ${input.legalForm}`,
    });
    return {
      passed: false,
      failures,
      manualReviewReasons,
    };
  }

  // Check if legal form is allowed for this tier
  if (!criteria.allowedLegalForms.includes(normalizedForm)) {
    failures.push({
      category: Category.LEGAL_STATUS,
      criterion: "allowedLegalForms",
      actualValue: normalizedForm,
      requiredValue: criteria.allowedLegalForms,
      message: `Legal form ${normalizedForm} is not allowed for this tier. Allowed forms: ${criteria.allowedLegalForms.join(", ")}`,
    });
  }

  return {
    passed: failures.length === 0,
    failures,
    manualReviewReasons,
  };
}
