import { Rule, RuleResult, RuleContext } from "../../types/rules";
import { Tier } from "../../types/tiers";
import { tierThresholds } from "../../config/tier-config";
import {
  countBankruptciesInScope,
  findDirectorByName,
} from "../../services/creditsafe/mapper";

/**
 * Rule: Administrator bankruptcy count determines tier.
 *
 * Uses real Creditsafe data with scope filtering by tier:
 * - EXCELLENT: last 10 years, max 0
 * - GOOD: last 7 years, max 1
 * - FAIR: last 5 years, max 2
 * - POOR: last 3 years, max 3
 */
export const adminBankruptciesRule: Rule = {
  id: "admin-bankruptcies",
  category: "admin",

  evaluate(context: RuleContext): RuleResult {
    if (!context.creditsafe) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.MANUAL_REVIEW,
        passed: false,
        reason: "Bankruptcy information unavailable",
        actualValue: null,
        expectedValue: "Bankruptcy check required",
      };
    }

    const bankruptcies = context.creditsafe.bankruptcies;
    const tiers = [Tier.EXCELLENT, Tier.GOOD, Tier.FAIR, Tier.POOR] as const;

    for (const tier of tiers) {
      const maxAllowed = tierThresholds[tier].maxAdminBankruptcies;
      const scopeYears = tierThresholds[tier].bankruptcyScopeYears;
      const bankruptciesInScope = countBankruptciesInScope(
        bankruptcies,
        scopeYears
      );

      if (bankruptciesInScope <= maxAllowed) {
        return {
          ruleId: this.id,
          category: this.category,
          tier,
          passed: true,
          reason: `${bankruptciesInScope} bankruptcies in last ${scopeYears} years, within ${tier} limit (<= ${maxAllowed})`,
          actualValue: {
            count: bankruptciesInScope,
            scopeYears,
            bankruptcies: bankruptcies.filter((b) => b.yearsAgo <= scopeYears),
          },
          expectedValue: {
            excellent: `<= ${tierThresholds[Tier.EXCELLENT].maxAdminBankruptcies} in ${tierThresholds[Tier.EXCELLENT].bankruptcyScopeYears}yr`,
            good: `<= ${tierThresholds[Tier.GOOD].maxAdminBankruptcies} in ${tierThresholds[Tier.GOOD].bankruptcyScopeYears}yr`,
            fair: `<= ${tierThresholds[Tier.FAIR].maxAdminBankruptcies} in ${tierThresholds[Tier.FAIR].bankruptcyScopeYears}yr`,
            poor: `<= ${tierThresholds[Tier.POOR].maxAdminBankruptcies} in ${tierThresholds[Tier.POOR].bankruptcyScopeYears}yr`,
          },
        };
      }
    }

    const poorScope = tierThresholds[Tier.POOR].bankruptcyScopeYears;
    const countInPoorScope = countBankruptciesInScope(bankruptcies, poorScope);

    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.REJECTED,
      passed: false,
      reason: `${countInPoorScope} bankruptcies in last ${poorScope} years exceeds maximum of ${tierThresholds[Tier.POOR].maxAdminBankruptcies}`,
      actualValue: countInPoorScope,
      expectedValue: `<= ${tierThresholds[Tier.POOR].maxAdminBankruptcies}`,
    };
  },
};

/**
 * Rule: Administrator track record years determines tier.
 *
 * Matches contact to company director and checks how long they've been appointed.
 *
 * Thresholds (minimum years as admin at current company):
 * - EXCELLENT: 3 years
 * - GOOD: 3 years
 * - FAIR: 3 years
 * - POOR: 0.5 years (6 months)
 *
 * If contact cannot be matched to a director → MANUAL_REVIEW
 */
export const adminTrackRecordRule: Rule = {
  id: "admin-track-record",
  category: "admin",

  evaluate(context: RuleContext): RuleResult {
    // If no Creditsafe data, we can't verify track record
    if (!context.creditsafe) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.MANUAL_REVIEW,
        passed: false,
        reason: "Creditsafe data unavailable - cannot verify admin track record",
        actualValue: null,
        expectedValue: "Admin track record check required",
      };
    }

    const { firstName, lastName } = context.questionnaire.contact;
    const director = findDirectorByName(
      context.creditsafe.directors,
      firstName,
      lastName
    );

    // If contact is not found in directors, require manual review
    if (!director) {
      return {
        ruleId: this.id,
        category: this.category,
        tier: Tier.MANUAL_REVIEW,
        passed: false,
        reason: `Contact "${firstName} ${lastName}" not found in company directors`,
        actualValue: {
          searchedName: `${firstName} ${lastName}`,
          availableDirectors: context.creditsafe.directors.map((d) => d.name),
        },
        expectedValue: "Contact must be a company director",
      };
    }

    // For Eenmanszaak (sole proprietorship), if dateAppointed is missing,
    // use company age instead since the owner IS the company
    let yearsAsAdmin = director.appointedYearsAgo;
    const isEenmanszaak = context.creditsafe.legalForm === "Eenmanszaak";
    const usedCompanyAge = isEenmanszaak && !director.dateAppointed;

    if (usedCompanyAge) {
      yearsAsAdmin = context.creditsafe.companyAgeYears;
    }
    const tiers = [Tier.EXCELLENT, Tier.GOOD, Tier.FAIR, Tier.POOR] as const;

    for (const tier of tiers) {
      const minRequired = tierThresholds[tier].minAdminTrackRecordYears;
      if (yearsAsAdmin >= minRequired) {
        const reasonPrefix = usedCompanyAge
          ? `Eenmanszaak company age ${yearsAsAdmin.toFixed(1)} years`
          : `Admin track record ${yearsAsAdmin.toFixed(1)} years`;
        return {
          ruleId: this.id,
          category: this.category,
          tier,
          passed: true,
          reason: `${reasonPrefix} meets ${tier} requirement (>= ${minRequired} years)`,
          actualValue: {
            directorName: director.name,
            yearsAsAdmin: yearsAsAdmin,
            dateAppointed: director.dateAppointed || null,
            usedCompanyAge,
          },
          expectedValue: {
            excellent: `>= ${tierThresholds[Tier.EXCELLENT].minAdminTrackRecordYears} years`,
            good: `>= ${tierThresholds[Tier.GOOD].minAdminTrackRecordYears} years`,
            fair: `>= ${tierThresholds[Tier.FAIR].minAdminTrackRecordYears} years`,
            poor: `>= ${tierThresholds[Tier.POOR].minAdminTrackRecordYears} years`,
          },
        };
      }
    }

    // Doesn't meet even Poor tier requirement
    const reasonPrefix = usedCompanyAge
      ? `Eenmanszaak company age ${yearsAsAdmin.toFixed(1)} years`
      : `Admin track record ${yearsAsAdmin.toFixed(1)} years`;
    return {
      ruleId: this.id,
      category: this.category,
      tier: Tier.REJECTED,
      passed: false,
      reason: `${reasonPrefix} is below minimum of ${tierThresholds[Tier.POOR].minAdminTrackRecordYears} years`,
      actualValue: {
        directorName: director.name,
        yearsAsAdmin: yearsAsAdmin,
        dateAppointed: director.dateAppointed || null,
        usedCompanyAge,
      },
      expectedValue: `>= ${tierThresholds[Tier.POOR].minAdminTrackRecordYears} years`,
    };
  },
};
