import { Rule, RuleResult, RuleContext } from "../../types/rules";
import { Tier } from "../../types/tiers";

/**
 * Calculate age from date of birth.
 */
function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/**
 * Rule: Contact must be at least 18 years old.
 *
 * - Under 18 → REJECTED (hard rejection, no tier allows minors)
 * - 18 or older → EXCELLENT (doesn't restrict tier)
 */
export const minimumAgeRule: Rule = {
  id: "minimum-age",
  category: "general",

  evaluate(context: RuleContext): RuleResult {
    const dateOfBirth = context.questionnaire.contact.dateOfBirth;
    const age = calculateAge(dateOfBirth);
    const minimumAge = 18;

    if (age < minimumAge) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.REJECTED,
        passed: false,
        reason: `Contact is ${age} years old, minimum age is ${minimumAge}`,
        actualValue: age,
        expectedValue: `>= ${minimumAge}`,
      };
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.EXCELLENT,
      passed: true,
      reason: `Contact is ${age} years old, meets minimum age requirement`,
      actualValue: age,
      expectedValue: `>= ${minimumAge}`,
    };
  },
};

/**
 * Rule: Contact must be a Belgium resident.
 *
 * - Not resident → REJECTED
 * - Resident → EXCELLENT (doesn't restrict tier)
 */
export const belgiumResidencyRule: Rule = {
  id: "belgium-residency",
  category: "general",

  evaluate(context: RuleContext): RuleResult {
    const isResident = context.questionnaire.contact.belgiumResident;

    if (!isResident) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.REJECTED,
        passed: false,
        reason: "Contact must be a Belgium resident",
        actualValue: isResident,
        expectedValue: true,
      };
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.EXCELLENT,
      passed: true,
      reason: "Contact is a Belgium resident",
      actualValue: isResident,
      expectedValue: true,
    };
  },
};

/**
 * Rule: Contact must be an administrator of the company.
 *
 * - Not administrator → REJECTED
 * - Administrator → EXCELLENT (doesn't restrict tier)
 */
export const isAdministratorRule: Rule = {
  id: "is-administrator",
  category: "general",

  evaluate(context: RuleContext): RuleResult {
    const isAdmin = context.questionnaire.contact.isAdministrator;

    if (!isAdmin) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.REJECTED,
        passed: false,
        reason: "Contact must be an administrator of the company",
        actualValue: isAdmin,
        expectedValue: true,
      };
    }

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.EXCELLENT,
      passed: true,
      reason: "Contact is an administrator of the company",
      actualValue: isAdmin,
      expectedValue: true,
    };
  },
};
