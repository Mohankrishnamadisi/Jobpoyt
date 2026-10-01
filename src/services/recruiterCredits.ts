import { supabase } from './supabase';

export const JOB_POST_CREDIT_COST = 8;
export const CANDIDATE_UNLOCK_CREDIT_COST = 1;
export const FREE_RECRUITER_CREDITS = 20;

export type RecruiterPlanState = 'free' | 'active' | 'expired';

export interface RecruiterCreditStatus {
  availableCredits: number;
  usedCredits: number;
  unlimited: boolean;
  planState: RecruiterPlanState;
  plan: string | null;
  planEndDate: string | null;
  jobPostCost: number;
  unlockCost: number;
}

export const getRecruiterCreditStatus = async (): Promise<RecruiterCreditStatus> => {
  const { data, error } = await supabase.rpc('get_recruiter_credit_status');
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) || {};
  return {
    availableCredits: Number(row.available_credits ?? 0),
    usedCredits: Number(row.used_credits ?? 0),
    unlimited: Boolean(row.unlimited),
    planState: (row.plan_state as RecruiterPlanState) || 'free',
    plan: row.plan ?? null,
    planEndDate: row.plan_end_date ?? null,
    jobPostCost: Number(row.job_post_cost ?? JOB_POST_CREDIT_COST),
    unlockCost: Number(row.unlock_cost ?? CANDIDATE_UNLOCK_CREDIT_COST),
  };
};

export const canAfford = (status: RecruiterCreditStatus | null, cost: number) =>
  Boolean(status && (status.unlimited || (status.planState !== 'expired' && status.availableCredits >= cost)));

export const describeCreditError = (error: unknown): string | null => {
  const message = String((error as { message?: string } | null)?.message || '');
  if (message.includes('INSUFFICIENT_CREDITS')) return 'Not enough credits. Upgrade to Recruiter Pro for unlimited access.';
  if (message.includes('SUBSCRIPTION_EXPIRED')) return 'Your subscription has expired. Renew to continue.';
  return null;
};
