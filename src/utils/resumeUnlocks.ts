import { supabase } from '@services/supabase';
import type {
  RecruiterCredits,
  ResumeUnlock,
  ResumeUnlockCandidateStat,
  ResumeUnlockContext,
  ResumeUnlockResult,
  Subscription,
} from '@types';
import {
  ensureRecruiterWelcomeBenefit,
  reserveRecruiterWelcomeResumeView,
  restoreRecruiterWelcomeResumeView,
} from '@utils/recruiterWelcomeBenefits';

const DEFAULT_CREDITS = 100;

export async function getRecruiterCredits(recruiterId: string): Promise<RecruiterCredits | null> {
  const { data, error } = await supabase
    .from('recruiter_credits')
    .select('*')
    .eq('recruiter_id', recruiterId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function ensureRecruiterCredits(recruiterId: string): Promise<RecruiterCredits> {
  const subscription = await getActiveRecruiterSubscription(recruiterId);
  const isUnlimited = isUnlimitedPlan(subscription?.plan);
  const existing = await getRecruiterCredits(recruiterId);
  if (existing) {
    if (isUnlimited && existing.available_credits !== -1) {
      const { data, error } = await supabase
        .from('recruiter_credits')
        .update({ available_credits: -1 })
        .eq('recruiter_id', recruiterId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    }
    return existing;
  }

  const { data, error } = await supabase
    .from('recruiter_credits')
    .insert({ recruiter_id: recruiterId, available_credits: isUnlimited ? -1 : DEFAULT_CREDITS, used_credits: 0 })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function getResumeUnlock(
  recruiterId: string,
  candidateId: string
): Promise<ResumeUnlock | null> {
  const { data, error } = await supabase
    .from('resume_unlocks')
    .select('*')
    .eq('recruiter_id', recruiterId)
    .eq('candidate_id', candidateId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function getResumeUnlockMap(
  recruiterId: string,
  candidateIds: string[]
): Promise<Record<string, boolean>> {
  const uniqueIds = [...new Set(candidateIds.filter(Boolean))];
  if (!recruiterId || uniqueIds.length === 0) return {};

  const { data, error } = await supabase
    .from('resume_unlocks')
    .select('candidate_id')
    .eq('recruiter_id', recruiterId)
    .in('candidate_id', uniqueIds);

  if (error) throw error;
  return (data || []).reduce<Record<string, boolean>>((map, row) => {
    map[row.candidate_id] = true;
    return map;
  }, {});
}

export async function getCandidateResumeUnlockCount(candidateId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('resume_unlocks')
      .select('id', { count: 'exact' })
      .eq('candidate_id', candidateId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Failed to load candidate resume unlock count:', error);
    return 0;
  }
}

export async function getCandidateProfileViewCount(candidateId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('profile_views')
      .select('id', { count: 'exact' })
      .eq('candidate_id', candidateId);

    if (error) {
      // Table may not exist yet or no tracking is available.
      console.warn('Profile views table missing or not available:', error.message || error);
      return 0;
    }
    return count || 0;
  } catch (error) {
    console.error('Failed to load candidate profile view count:', error);
    return 0;
  }
}

export async function trackCandidateProfileView(payload: {
  recruiterId: string;
  candidateId: string;
  jobId?: string | null;
  source?: string | null;
}): Promise<void> {
  const { recruiterId, candidateId, jobId, source } = payload;
  if (!recruiterId || !candidateId) return;

  const { error } = await supabase
    .from('profile_views')
    .insert({
      recruiter_id: recruiterId,
      candidate_id: candidateId,
      job_id: jobId || null,
      source: source || null,
      viewed_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Failed to track candidate profile view:', error);
  }
}

export async function getCandidateResumeUnlockRecruiters(candidateId: string) {
  try {
    const { data, error } = await supabase
      .from('resume_unlocks')
      .select('recruiter_id, unlocked_at')
      .eq('candidate_id', candidateId)
      .order('unlocked_at', { ascending: false });

    if (error) {
      console.error('Failed to load resume unlock recruiters:', error);
      return [];
    }

    const rows = (data || []) as Array<{ recruiter_id: string; unlocked_at?: string | null }>;
    const recruiterIds = [...new Set(rows.map((row) => row.recruiter_id))].filter(Boolean);
    if (recruiterIds.length === 0) return [];

    const { data: recruiters, error: recruiterError } = await supabase
      .from('profiles')
      .select('id, name, company_name, company_logo_url, company_email')
      .in('id', recruiterIds);

    if (recruiterError) {
      console.error('Failed to load recruiter profiles for resume unlocks:', recruiterError);
      return [];
    }

    const recruiterMap = new Map((recruiters || []).map((profile: any) => [profile.id, profile]));
    const grouped = new Map<string, { recruiter_id: string; recruiter_name: string; company_name?: string; company_logo_url?: string; total_unlocks: number; last_unlocked_at?: string | null }>();

    rows.forEach((row) => {
      const recruiterId = row.recruiter_id;
      const recruiter = recruiterMap.get(recruiterId) || {};
      const current = grouped.get(recruiterId);
      const recruiterName = recruiter.company_name || recruiter.name || 'Recruiter';
      if (current) {
        current.total_unlocks += 1;
        if (row.unlocked_at && (!current.last_unlocked_at || row.unlocked_at > current.last_unlocked_at)) {
          current.last_unlocked_at = row.unlocked_at;
        }
      } else {
        grouped.set(recruiterId, {
          recruiter_id: recruiterId,
          recruiter_name: recruiterName,
          company_name: recruiter.company_name,
          company_logo_url: recruiter.company_logo_url,
          total_unlocks: 1,
          last_unlocked_at: row.unlocked_at || null,
        });
      }
    });

    return Array.from(grouped.values()).sort((a, b) => b.total_unlocks - a.total_unlocks);
  } catch (error) {
    console.error('Failed to get recruiter list for resume unlocks:', error);
    return [];
  }
}

export async function getCandidateProfileViewRecruiters(candidateId: string) {
  try {
    const { data, error } = await supabase
      .from('profile_views')
      .select('recruiter_id, viewed_at, created_at')
      .eq('candidate_id', candidateId)
      .order('viewed_at', { ascending: false });

    if (error) {
      console.error('Failed to load profile view recruiters:', error);
      return [];
    }

    const rows = (data || []) as Array<{ recruiter_id: string; viewed_at?: string | null; created_at?: string | null }>;
    const recruiterIds = [...new Set(rows.map((row) => row.recruiter_id))].filter(Boolean);
    if (recruiterIds.length === 0) return [];

    const { data: recruiters, error: recruiterError } = await supabase
      .from('profiles')
      .select('id, name, company_name, company_logo_url, company_email')
      .in('id', recruiterIds);

    if (recruiterError) {
      console.error('Failed to load recruiter profiles for profile views:', recruiterError);
      return [];
    }

    const recruiterMap = new Map((recruiters || []).map((profile: any) => [profile.id, profile]));
    const grouped = new Map<string, { recruiter_id: string; recruiter_name: string; company_name?: string; company_logo_url?: string; total_views: number; last_viewed_at?: string | null }>();

    rows.forEach((row) => {
      const recruiterId = row.recruiter_id;
      const recruiter = recruiterMap.get(recruiterId) || {};
      const current = grouped.get(recruiterId);
      const recruiterName = recruiter.company_name || recruiter.name || 'Recruiter';
      const lastViewedAt = row.viewed_at || row.created_at || null;
      if (current) {
        current.total_views += 1;
        if (lastViewedAt && (!current.last_viewed_at || lastViewedAt > current.last_viewed_at)) {
          current.last_viewed_at = lastViewedAt;
        }
      } else {
        grouped.set(recruiterId, {
          recruiter_id: recruiterId,
          recruiter_name: recruiterName,
          company_name: recruiter.company_name,
          company_logo_url: recruiter.company_logo_url,
          total_views: 1,
          last_viewed_at: lastViewedAt,
        });
      }
    });

    return Array.from(grouped.values()).sort((a, b) => b.total_views - a.total_views);
  } catch (error) {
    console.error('Failed to get recruiter list for profile views:', error);
    return [];
  }
}

export async function getActiveRecruiterSubscription(recruiterId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', recruiterId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export function normalizePlanLabel(plan?: string | null): 'FREE' | 'PREMIUM' | 'PRO' | 'ENTERPRISE' {
  const normalized = String(plan || '').toLowerCase();
  if (normalized === 'premium') return 'PREMIUM';
  if (normalized === 'pro') return 'PRO';
  if (normalized === 'enterprise') return 'ENTERPRISE';
  return 'FREE';
}

export function isUnlimitedPlan(plan?: string | null): boolean {
  const label = normalizePlanLabel(plan);
  return label === 'PREMIUM' || label === 'PRO' || label === 'ENTERPRISE';
}

export async function getResumeUnlockContext(
  recruiterId: string,
  candidateId: string
): Promise<ResumeUnlockContext> {
  const [credits, unlock] = await Promise.all([
    ensureRecruiterCredits(recruiterId),
    getResumeUnlock(recruiterId, candidateId),
  ]);

  return { credits, unlock, isUnlocked: Boolean(unlock) };
}

export async function unlockCandidateContact(
  candidateId: string,
  jobId?: string | null,
  recruiterIdOverride?: string | null
): Promise<ResumeUnlockResult> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const recruiterId = recruiterIdOverride || userData?.user?.id || null;

  if (!recruiterId) {
    throw new Error('Recruiter session is required to unlock contact details.');
  }

  const activeSub = await getActiveRecruiterSubscription(recruiterId).catch(() => null);
  const isUnlimited = isUnlimitedPlan(activeSub?.plan);

  if (!isUnlimited) {
    const benefit = await ensureRecruiterWelcomeBenefit(recruiterId).catch(() => null);
    const freeViewsRemaining = benefit ? Math.max(0, Number(benefit.free_resume_views_total || 0) - Number(benefit.free_resume_views_used || 0)) : 0;

    if (benefit && freeViewsRemaining > 0) {
      const reservation = await reserveRecruiterWelcomeResumeView(recruiterId);
      if (!reservation.allowed) {
        throw new Error('Your complimentary resume access has been used.');
      }

      try {
        const { data, error } = await supabase.rpc('unlock_candidate_contact', {
          p_candidate_id: candidateId,
          p_job_id: jobId || null,
        });
        if (error) {
          await restoreRecruiterWelcomeResumeView(recruiterId, 1).catch(() => undefined);
          throw error;
        }
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) {
          await restoreRecruiterWelcomeResumeView(recruiterId, 1).catch(() => undefined);
          throw new Error('Resume unlock failed.');
        }
        return row as ResumeUnlockResult;
      } catch (error) {
        await restoreRecruiterWelcomeResumeView(recruiterId, 1).catch(() => undefined);
        throw error;
      }
    }
  }

  const { data, error } = await supabase.rpc('unlock_candidate_contact', {
    p_candidate_id: candidateId,
    p_job_id: jobId || null,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as ResumeUnlockResult;
}

export async function getResumeUnlockAnalytics(
  recruiterId: string
): Promise<{
  totalCreditsUsed: number;
  totalUnlocks: number;
  mostViewedCandidates: ResumeUnlockCandidateStat[];
}> {
  const { data, error } = await supabase
    .from('resume_unlocks')
    .select(`
      id,
      candidate_id,
      credits_used,
      unlocked_at,
      profiles!resume_unlocks_candidate_id_fkey (
        id,
        name
      )
    `)
    .eq('recruiter_id', recruiterId)
    .order('unlocked_at', { ascending: false });

  if (error) throw error;

  const rows = (data || []) as Array<{
    candidate_id: string;
    credits_used: number;
    unlocked_at?: string | null;
    profiles?: { id?: string; name?: string | null } | null;
  }>;

  const candidateMap = new Map<string, ResumeUnlockCandidateStat>();
  rows.forEach((row) => {
    const current = candidateMap.get(row.candidate_id);
    const profile = row.profiles;
    if (current) {
      current.unlock_count += 1;
      if (!current.last_unlocked_at || (row.unlocked_at && row.unlocked_at > current.last_unlocked_at)) {
        current.last_unlocked_at = row.unlocked_at || null;
      }
      return;
    }

    candidateMap.set(row.candidate_id, {
      candidate_id: row.candidate_id,
      candidate_name: profile?.name || 'Candidate',
      candidate_email: null,
      unlock_count: 1,
      last_unlocked_at: row.unlocked_at || null,
    });
  });

  return {
    totalCreditsUsed: rows.reduce((sum, row) => sum + (row.credits_used || 0), 0),
    totalUnlocks: rows.length,
    mostViewedCandidates: Array.from(candidateMap.values())
      .sort((a, b) => b.unlock_count - a.unlock_count)
      .slice(0, 5),
  };
}

export const resumeUnlockService = {
  getRecruiterCredits,
  ensureRecruiterCredits,
  getResumeUnlock,
  getResumeUnlockMap,
  getResumeUnlockContext,
  unlockCandidateContact,
  trackCandidateProfileView,
  getResumeUnlockAnalytics,
  getActiveRecruiterSubscription,
  normalizePlanLabel,
  isUnlimitedPlan,
};
