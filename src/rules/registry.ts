import { Rule } from "../types/rules";
import {
  minimumAgeRule,
  belgiumResidencyRule,
  isAdministratorRule,
} from "./categories/general";
import {
  creditRatingRule,
  companyAgeRule,
  withholdingObligationRule,
  vatValidRule,
  companyActiveRule,
} from "./categories/company";
import { adminBankruptciesRule } from "./categories/admin";
import { fraudScoreRule, sanctionListRule } from "./categories/fraud";
import { legalFormRule } from "./categories/legal-status";
import { blocklistRule } from "./categories/blocklist";
import {
  vehicleTypeRule,
  vehicleValueRule,
  vehicleMileageRule,
  vehicleAgeRule,
} from "./categories/asset";
import {
  driverAgeRule,
  licenseDurationRule,
  accidentsAtFaultRule,
  accidentsNotAtFaultRule,
  vehicleHorsepowerRule,
} from "./categories/insurance";

// All registered rules - we'll add to this list as rules are implemented
export const allRules: Rule[] = [
  // Blocklist rules (check first - hard rejections)
  blocklistRule,
  // General rules
  minimumAgeRule,
  belgiumResidencyRule,
  isAdministratorRule,
  // Company rules
  vatValidRule,
  companyActiveRule,
  creditRatingRule,
  companyAgeRule,
  withholdingObligationRule,
  // Admin rules
  adminBankruptciesRule,
  // Fraud rules
  fraudScoreRule,
  sanctionListRule,
  // Legal status rules
  legalFormRule,
  // Asset rules
  vehicleTypeRule,
  vehicleValueRule,
  vehicleMileageRule,
  vehicleAgeRule,
  // Insurance rules (Poor tier only)
  driverAgeRule,
  licenseDurationRule,
  accidentsAtFaultRule,
  accidentsNotAtFaultRule,
  vehicleHorsepowerRule,
];
