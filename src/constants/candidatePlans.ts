/**
 * Candidate Plan Constants & Configuration
 * 
 * Defines the new two-plan candidate subscription model:
 * - Premium Monthly: ₹149 + 18% GST
 * - Premium 3 Months: ₹399 + 18% GST (Save ₹48)
 * 
 * Both plans unlock identical JOBPOYT PREMIUM features.
 */

export const CANDIDATE_PAID_PLANS = {
  PREMIUM_MONTHLY: 'premium_monthly',
  PREMIUM_3_MONTH: 'premium_3_month',
} as const;

export type CandidatePaidPlanType = typeof CANDIDATE_PAID_PLANS[keyof typeof CANDIDATE_PAID_PLANS];

/**
 * Plan configuration with pricing, duration, and labels
 */
export const CANDIDATE_PLAN_CONFIG = {
  premium_monthly: {
    id: 'premium_monthly',
    name: 'Jobpoyt Premium',
    displayName: 'Jobpoyt Premium',
    duration: 1, // months
    basePriceInr: 149,
    gstPercent: 18,
    durationLabel: 'Monthly',
    durationText: 'per month',
    description: 'Flexible monthly access',
  },
  premium_3_month: {
    id: 'premium_3_month',
    name: 'Jobpoyt Premium',
    displayName: 'Jobpoyt Premium',
    duration: 3, // months
    basePriceInr: 399,
    gstPercent: 18,
    durationLabel: '3 Months',
    durationText: 'for 3 months',
    description: 'Best value — save ₹48',
    badge: 'BEST VALUE',
    savingsInr: 48, // ₹149*3 - ₹399 = ₹48
    monthlyEquivalent: 133, // ₹399/3
  },
} as const;

export type CandidatePlanConfigType = typeof CANDIDATE_PLAN_CONFIG;

/**
 * Legacy plans (kept for backward compatibility with existing subscriptions)
 */
export const LEGACY_CANDIDATE_PLANS = ['basic', 'premium', 'pro', 'enterprise'] as const;

/**
 * All valid candidate plan types (new + legacy)
 */
export const ALL_CANDIDATE_PLANS = [
  ...Object.values(CANDIDATE_PAID_PLANS),
  ...LEGACY_CANDIDATE_PLANS,
  'free',
] as const;

/**
 * Premium features available to Jobpoyt Premium candidates
 */
export const PREMIUM_FEATURES = [
  // Job Access
  'remote_jobs',
  'hybrid_jobs',
  'full_remote_details',
  'full_hybrid_details',
  'apply_remote_jobs',
  'apply_hybrid_jobs',

  // Job Matching & Notifications
  'ai_matched_jobs',
  'personalized_matching',
  'priority_recommendations',
  'instant_job_notifications',
  'priority_job_alerts',

  // Applications
  'unlimited_saved_jobs',
  'apply_without_resume',
  'priority_apply',
  'premium_application_tracking',

  // AI Tools
  'ai_career_hub',
  'ai_daily_career_brief',
  'ai_match_center',
  'ai_career_coach',
  'mock_interviews',
  'resume_review',
  'interview_preparation',

  // Insights & Analytics
  'premium_intelligence_center',
  'recruiter_activity_insights',
  'profile_visibility_boost',
  'profile_view_analytics',
  'resume_download_analytics',

  // Communication & Discovery
  'remote_job_hub',
  'premium_communication',
  'weekly_job_digest',
  'premium_command_deck',

  // Additional
  'assessments',
  'community',
  'referrals',
] as const;

/**
 * Helper to get plan config
 */
export function getPlanConfig(planId: string | null | undefined): CandidatePlanConfigType[CandidatePaidPlanType] | null {
  if (!planId) return null;
  const normalized = String(planId).toLowerCase().trim();
  return CANDIDATE_PLAN_CONFIG[normalized as CandidatePaidPlanType] ?? null;
}

/**
 * Helper to check if a plan ID is a new paid plan
 */
export function isNewPaidPlan(planId: string | null | undefined): boolean {
  if (!planId) return false;
  const normalized = String(planId).toLowerCase().trim();
  return normalized in CANDIDATE_PLAN_CONFIG;
}

/**
 * Helper to check if a plan ID is a legacy plan
 */
export function isLegacyPlan(planId: string | null | undefined): boolean {
  if (!planId) return false;
  const normalized = String(planId).toLowerCase().trim();
  return LEGACY_CANDIDATE_PLANS.includes(normalized as any);
}
