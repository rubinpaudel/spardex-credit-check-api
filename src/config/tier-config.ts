import { FinancialTerms } from "../types/response";
import { Tier } from "../types/tiers";

const financialTermsByTier: Record<Tier, FinancialTerms | null> = {
  [Tier.REJECTED]: null,
  [Tier.MANUAL_REVIEW]: null,
  [Tier.POOR]: {
    yearlyInterestPercent: 22,
    minDownpaymentPercent: 20,
    maxFinancingPeriodMonths: 60,
    maxResidualValuePercent: 5,
    canFinanceRegistrationTax: false,
  },
  [Tier.FAIR]: {
    yearlyInterestPercent: 12,
    minDownpaymentPercent: 10,
    maxFinancingPeriodMonths: 60,
    maxResidualValuePercent: 15,
    canFinanceRegistrationTax: false,
  },
  [Tier.GOOD]: {
    yearlyInterestPercent: 5.5,
    minDownpaymentPercent: 0,
    maxFinancingPeriodMonths: 60,
    maxResidualValuePercent: 15,
    canFinanceRegistrationTax: true,
  },
  [Tier.EXCELLENT]: {
    yearlyInterestPercent: 3,
    minDownpaymentPercent: 0,
    maxFinancingPeriodMonths: 60,
    maxResidualValuePercent: 15,
    canFinanceRegistrationTax: true,
  },
};

export function getFinancialTerms(tier: Tier): FinancialTerms | null {
  return financialTermsByTier[tier];
}
