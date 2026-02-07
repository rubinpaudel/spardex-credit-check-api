import { Rule } from "../types/rules";
import {
  minimumAgeRule,
  belgiumResidencyRule,
  isAdministratorRule,
} from "./categories/general";
import {
  contactWithLegalAuthoritiesRule,
  troubleWithPaymentRule,
  blacklistedBanksRule,
} from "./categories/legal-history";
import {
  creditRatingRule,
  companyAgeRule,
  withholdingObligationRule,
  vatValidRule,
  companyActiveRule,
  financialDisclosureRule,
  naceAgeRestrictionRule,
} from "./categories/company";
import {
  adminBankruptciesRule,
  adminTrackRecordRule,
} from "./categories/admin";
import {
  fraudScoreRule,
  sanctionListRule,
  adverseMediaRule,
} from "./categories/fraud";
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
  // Legal history rules
  contactWithLegalAuthoritiesRule,
  troubleWithPaymentRule,
  blacklistedBanksRule,
  // Company rules
  vatValidRule,
  companyActiveRule,
  creditRatingRule,
  naceAgeRestrictionRule, // Must come after creditRatingRule - checks restrictions for determined tier
  companyAgeRule,
  withholdingObligationRule,
  financialDisclosureRule,
  // Admin rules
  adminBankruptciesRule,
  adminTrackRecordRule,
  // Fraud rules
  fraudScoreRule,
  sanctionListRule,
  adverseMediaRule,
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
