import { Tier } from "../types/tiers";

// Compare tiers: returns true if `a` is worse than `b`
export function isWorseTier(a: Tier, b: Tier): boolean {
  return a < b;
}

// Get the worse of two tiers
export function getWorseTier(a: Tier, b: Tier): Tier {
  return a < b ? a : b;
}

// Convert string tier name to Tier enum
export function stringToTier(tierName: string | undefined): Tier {
  if (!tierName) return Tier.EXCELLENT;

  const map: Record<string, Tier> = {
    excellent: Tier.EXCELLENT,
    good: Tier.GOOD,
    fair: Tier.FAIR,
    poor: Tier.POOR,
    manual_review: Tier.MANUAL_REVIEW,
    rejected: Tier.REJECTED,
  };
  return map[tierName.toLowerCase()] ?? Tier.EXCELLENT;
}
