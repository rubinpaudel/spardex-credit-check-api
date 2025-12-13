import { Rule } from "../types/rules";
import {
  minimumAgeRule,
  belgiumResidencyRule,
  isAdministratorRule,
} from "./categories/general";

// All registered rules - we'll add to this list as rules are implemented
export const allRules: Rule[] = [
  minimumAgeRule,
  belgiumResidencyRule,
  isAdministratorRule,
];
