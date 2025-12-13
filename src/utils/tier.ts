import { Tier } from "../types/tiers";

// Compare tiers: returns true if `a` is worse than `b`
export function isWorseTier(a: Tier, b: Tier): boolean {
  return a < b;
}

// Get the worse of two tiers
export function getWorseTier(a: Tier, b: Tier): Tier {
  return a < b ? a : b;
}
