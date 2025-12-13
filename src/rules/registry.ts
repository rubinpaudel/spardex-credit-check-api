import { Rule } from "../types/rules";
import {
  minimumAgeRule,
  belgiumResidencyRule,
  isAdministratorRule,
} from "./categories/general";
import { creditRatingRule, companyAgeRule } from "./categories/company";
import { adminBankruptciesRule } from "./categories/admin";
import { fraudScoreRule } from "./categories/fraud";

// All registered rules - we'll add to this list as rules are implemented
export const allRules: Rule[] = [
  // General rules
  minimumAgeRule,
  belgiumResidencyRule,
  isAdministratorRule,
  // Company rules
  creditRatingRule,
  companyAgeRule,
  // Admin rules
  adminBankruptciesRule,
  // Fraud rules
  fraudScoreRule,
];
