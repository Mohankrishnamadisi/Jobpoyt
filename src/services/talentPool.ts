import { supabase } from './supabase';
import { userService } from './api';
import type {
  PaginatedResult,
  TalentPool,
  TalentPoolCandidate,
  TalentPoolFilters,
} from '@types';

export type { TalentPool, TalentPoolCandidate, TalentPoolFilters, PaginatedResult };

const POOL_SELECT = `
  *,
  talent_pool_candidates ( count )
`;

const CANDIDATE_SELECT = `
  *,
  profiles!talent_pool_candidates_candidate_id_fkey (
    id,
    name,
    email,
    headline,
    location,
    skills,
    experience_years,
    experience_months,
    total_experience_months,
    experience,
    avatar_url,
    role
  )
`;

function mapPool(row: Record<string, unknown>): TalentPool {
  const counts = row.talent_pool_candidates as { count: number }[] | undefined;
  return {
    ...(row as TalentPool),
    candidate_count: counts?.[0]?.count ?? 0,
  };
}

export async function getPools(recruiterId: string): Promise<TalentPool[]> {
  const { data, error } = await supabase
    .from('talent_pools')
    .select(POOL_SELECT)
    .eq('recruiter_id', recruiterId)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => mapPool(row as Record<string, unknown>));
}

export async function createPool(
  recruiterId: string,
  payload: { name: string; description?: string }
): Promise<TalentPool> {
  const sessionResponse = await supabase.auth.getSession();
  const authUser = sessionResponse?.data?.session?.user ?? null;
  const authUserId = authUser?.id ?? null;
  const authEmail = authUser?.email ?? null;
  const authName = authUser?.user_metadata?.name ?? null;
  const actualRecruiterId = authUserId || recruiterId;

  if (!authUserId) {
    throw new Error('No active authenticated user session available to create a talent pool.');
  }

  try {
    await userService.ensureRecruiterProfile(actualRecruiterId, {
      name: authName || 'Recruiter',
      email: authEmail || undefined,
    } as Record<string, unknown>);
  } catch (profileError) {
    throw profileError;
  }

  const { data, error } = await supabase
    .from('talent_pools')
    .insert({
      recruiter_id: actualRecruiterId,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
    })
    .select(POOL_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return mapPool(data as Record<string, unknown>);
}

export async function updatePool(
  poolId: string,
  updates: { name?: string; description?: string }
): Promise<TalentPool> {
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.description !== undefined) payload.description = updates.description.trim() || null;

  const { data, error } = await supabase
    .from('talent_pools')
    .update(payload)
    .eq('id', poolId)
    .select(POOL_SELECT)
    .single();

  if (error) throw error;
  return mapPool(data as Record<string, unknown>);
}

export async function deletePool(poolId: string): Promise<void> {
  const { error } = await supabase.from('talent_pools').delete().eq('id', poolId);
  if (error) throw error;
}

export async function getPoolCandidates(
  poolId: string,
  filters: TalentPoolFilters = {},
  page = 1,
  pageSize = 12
): Promise<PaginatedResult<TalentPoolCandidate>> {
  const hasProfileFilter = Boolean(
    filters.search?.trim() ||
      filters.location?.trim() ||
      (filters.minExperience !== undefined && filters.minExperience > 0) ||
      filters.skill?.trim()
  );

  const profileJoin = hasProfileFilter
    ? `profiles!talent_pool_candidates_candidate_id_fkey!inner (
    id,
    name,
    email,
    headline,
    location,
    skills,
    experience_years,
    experience_months,
    total_experience_months,
    experience,
    avatar_url,
    role
  )`
    : `profiles!talent_pool_candidates_candidate_id_fkey (
    id,
    name,
    email,
    headline,
    location,
    skills,
    experience_years,
    experience_months,
    total_experience_months,
    experience,
    avatar_url,
    role
  )`;

  let query = supabase
    .from('talent_pool_candidates')
    .select(`*, ${profileJoin}`, { count: 'exact' })
    .eq('pool_id', poolId);

  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`name.ilike.${term},headline.ilike.${term},email.ilike.${term}`, {
      referencedTable: 'profiles',
    });
  }

  if (filters.location?.trim()) {
    query = query.filter('profiles.location', 'ilike', `%${filters.location.trim()}%`);
  }

  if (filters.minExperience !== undefined && filters.minExperience > 0) {
    query = query.filter('profiles.total_experience_months', 'gte', filters.minExperience * 12);
  }

  if (filters.skill?.trim()) {
    query = query.contains('profiles.skills', [filters.skill.trim()]);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('added_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  const total = count || 0;
  return {
    data: (data || []) as TalentPoolCandidate[],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function addCandidateToPool(
  poolId: string,
  candidateId: string,
  notes?: string
): Promise<TalentPoolCandidate> {
  const { data, error } = await supabase
    .from('talent_pool_candidates')
    .upsert(
      {
        pool_id: poolId,
        candidate_id: candidateId,
        notes: notes?.trim() || null,
      },
      { onConflict: 'pool_id,candidate_id' }
    )
    .select(CANDIDATE_SELECT)
    .single();

  if (error) throw error;
  return data as TalentPoolCandidate;
}

export async function removeCandidateFromPool(entryId: string): Promise<void> {
  const { error } = await supabase.from('talent_pool_candidates').delete().eq('id', entryId);
  if (error) throw error;
}

export async function moveCandidateBetweenPools(
  entryId: string,
  targetPoolId: string
): Promise<TalentPoolCandidate> {
  const { data, error } = await supabase
    .from('talent_pool_candidates')
    .update({ pool_id: targetPoolId })
    .eq('id', entryId)
    .select(CANDIDATE_SELECT)
    .single();

  if (error) throw error;
  return data as TalentPoolCandidate;
}

export async function isCandidateInPool(poolId: string, candidateId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('talent_pool_candidates')
    .select('id')
    .eq('pool_id', poolId)
    .eq('candidate_id', candidateId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export const talentPoolService = {
  getPools,
  createPool,
  updatePool,
  deletePool,
  getPoolCandidates,
  addCandidateToPool,
  removeCandidateFromPool,
  moveCandidateBetweenPools,
  isCandidateInPool,
};
