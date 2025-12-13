// All possible tiers, ordered from worst to best
// The numeric values are used for comparison (lower = worse)
export enum Tier {
  REJECTED = 0, // Hard rejection, cannot proceed
  MANUAL_REVIEW = 1, // Needs human assessment
  POOR = 2, // High risk: 22% interest, 20% downpayment
  FAIR = 3, // Moderate risk: 12% interest, 10% downpayment
  GOOD = 4, // Low risk: 5.5% interest, 0% downpayment
  EXCELLENT = 5, // Best tier: 3% interest, 0% downpayment
}

// String versions for API responses
export type TierName =
  | "rejected"
  | "manual_review"
  | "poor"
  | "fair"
  | "good"
  | "excellent";

// Convert enum to string
export function tierToString(tier: Tier): TierName {
  const map: Record<Tier, TierName> = {
    [Tier.REJECTED]: "rejected",
    [Tier.MANUAL_REVIEW]: "manual_review",
    [Tier.POOR]: "poor",
    [Tier.FAIR]: "fair",
    [Tier.GOOD]: "good",
    [Tier.EXCELLENT]: "excellent",
  };
  return map[tier];
}
