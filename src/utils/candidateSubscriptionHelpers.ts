/**
 * Candidate Subscription Entitlement Helpers
 * 
 * Central location for all premium/entitlement checks.
 * Use these helpers instead of scattered plan comparisons throughout the codebase.
 */

/**
 * Check if a candidate subscription plan qualifies for premium entitlements
 * 
 * Returns true for:
 * - premium_monthly (new)
 * - premium_3_month (new)
 * - premium (legacy - during migration)
 * - pro (legacy - during migration)
 * - enterprise (for completeness)
 * 
 * Returns false for:
 * - free
 * - basic
 * - null/undefined
 */
export function isCandidatePremium(plan: string | null | undefined): boolean {
  if (!plan) return false;
  
  const normalizedPlan = String(plan).toLowerCase().trim();
  
  // New premium plans
  if (['premium_monthly', 'premium_3_month'].includes(normalizedPlan)) {
    return true;
  }
  
  // Legacy premium plans (for backward compatibility during migration)
  if (['premium', 'pro', 'enterprise'].includes(normalizedPlan)) {
    return true;
  }
  
  return false;
}

/**
 * Get the entitlement tier for a subscription plan
 * 
 * Returns 'premium' for any premium plan
 * Returns 'free' for everything else
 */
export function getCandidateEntitlement(plan: string | null | undefined): 'free' | 'premium' {
  return isCandidatePremium(plan) ? 'premium' : 'free';
}

/**
 * Check if a plan is the monthly paid plan
 */
export function isPremiumMonthlyPlan(plan: string | null | undefined): boolean {
  return String(plan).toLowerCase().trim() === 'premium_monthly';
}

/**
 * Check if a plan is the 3-month paid plan
 */
export function isPremium3MonthPlan(plan: string | null | undefined): boolean {
  return String(plan).toLowerCase().trim() === 'premium_3_month';
}

/**
 * Check if a plan is one of the new paid plans
 */
export function isNewPremiumPlan(plan: string | null | undefined): boolean {
  if (!plan) return false;
  const normalized = String(plan).toLowerCase().trim();
  return normalized === 'premium_monthly' || normalized === 'premium_3_month';
}

/**
 * Check if a plan is a legacy plan (for migration handling)
 */
export function isLegacyPremiumPlan(plan: string | null | undefined): boolean {
  if (!plan) return false;
  const normalized = String(plan).toLowerCase().trim();
  return ['premium', 'pro', 'enterprise'].includes(normalized);
}

/**
 * Check if a subscription is currently active (not expired)
 * 
 * @param endDate Subscription end date (ISO string or Date)
 * @returns true if subscription is still active, false if expired or no date
 */
export function isSubscriptionActive(endDate: string | Date | null | undefined): boolean {
  if (!endDate) return false;
  
  try {
    const end = new Date(endDate);
    const now = new Date();
    return end > now;
  } catch {
    return false;
  }
}

/**
 * Check if a subscription is expired
 */
export function isSubscriptionExpired(endDate: string | Date | null | undefined): boolean {
  return !isSubscriptionActive(endDate);
}

/**
 * Get days remaining in a subscription
 * 
 * @returns Number of days remaining, or 0 if expired/invalid
 */
export function getDaysRemaining(endDate: string | Date | null | undefined): number {
  if (!endDate) return 0;
  
  try {
    const end = new Date(endDate);
    const now = new Date();
    
    if (end <= now) return 0;
    
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  } catch {
    return 0;
  }
}

/**
 * Calculate gross price (base + GST)
 * 
 * @param basePriceInr Base price in Indian Rupees
 * @param gstPercent GST percentage (default 18)
 * @returns Total price including GST
 */
export function calculateCandidateGrossPrice(
  basePriceInr: number,
  gstPercent: number = 18
): number {
  return basePriceInr + (basePriceInr * gstPercent / 100);
}

/**
 * Format price as INR string
 */
export function formatCandidatePrice(priceInr: number): string {
  return `₹${priceInr.toFixed(2)}`;
}

/**
 * Format price with GST breakdown
 */
export function formatPriceWithGST(basePriceInr: number, gstPercent: number = 18): {
  base: string;
  gst: string;
  total: string;
} {
  const gstAmount = basePriceInr * (gstPercent / 100);
  const totalAmount = basePriceInr + gstAmount;
  
  return {
    base: formatCandidatePrice(basePriceInr),
    gst: formatCandidatePrice(gstAmount),
    total: formatCandidatePrice(totalAmount),
  };
}

/**
 * Get subscription duration in months from plan ID
 */
export function getSubscriptionDurationMonths(plan: string | null | undefined): number | null {
  if (!plan) return null;
  
  const normalized = String(plan).toLowerCase().trim();
  
  if (normalized === 'premium_monthly') return 1;
  if (normalized === 'premium_3_month') return 3;
  
  // Legacy plans (unknown duration, assume 1 month for safety)
  if (['premium', 'pro', 'enterprise'].includes(normalized)) return 1;
  
  return null;
}

/**
 * Get subscription plan display name
 */
export function getPlanDisplayName(plan: string | null | undefined): string {
  if (!plan) return 'Free';
  
  const normalized = String(plan).toLowerCase().trim();
  
  switch (normalized) {
    case 'premium_monthly':
      return 'Jobpoyt Premium • Monthly';
    case 'premium_3_month':
      return 'Jobpoyt Premium • 3 Months';
    case 'premium':
    case 'pro':
    case 'enterprise':
      return 'Jobpoyt Premium'; // Legacy
    case 'basic':
    case 'free':
    default:
      return 'Free';
  }
}

/**
 * Check if a user can access a premium feature
 * 
 * Takes into account:
 * - Plan type (must be premium)
 * - Subscription active status (must not be expired)
 */
export function canAccessPremiumFeature(
  plan: string | null | undefined,
  endDate?: string | Date | null
): boolean {
  // Must have a premium plan
  if (!isCandidatePremium(plan)) return false;
  
  // If end date provided, must be active
  if (endDate !== undefined && !isSubscriptionActive(endDate)) return false;
  
  return true;
}

/**
 * Comprehensive subscription status check
 * 
 * Returns detailed info about subscription state
 */
export interface SubscriptionStatus {
  isPremium: boolean;
  isActive: boolean;
  isExpired: boolean;
  daysRemaining: number;
  planName: string;
  entitlement: 'free' | 'premium';
}

export function getSubscriptionStatus(
  plan: string | null | undefined,
  endDate?: string | Date | null
): SubscriptionStatus {
  const isPremium = isCandidatePremium(plan);
  const isActive = isSubscriptionActive(endDate);
  const isExpired = isSubscriptionExpired(endDate);
  const daysRemaining = getDaysRemaining(endDate);
  const planName = getPlanDisplayName(plan);
  const entitlement = getCandidateEntitlement(plan);
  
  // Premium status only valid if subscription is active
  const effectiveIsPremium = isPremium && isActive;
  const effectiveEntitlement = effectiveIsPremium ? 'premium' : 'free';
  
  return {
    isPremium: effectiveIsPremium,
    isActive,
    isExpired,
    daysRemaining,
    planName,
    entitlement: effectiveEntitlement,
  };
}
