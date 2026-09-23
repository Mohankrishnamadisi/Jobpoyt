import { supabase } from '@services/supabase';
import { jobService, notificationService } from '@services/api';
import {
  calculateMatchScore as calculateWeightedMatchScore,
  normalizeSkills,
} from '@utils/matchScore';
import type {
  Job,
  PaginatedResult,
  RecommendedCandidate,
  RecommendedCandidateFilters,
  RecommendedCandidateProfile,
} from '@types';

const PROFILE_SELECT = `
  id,
  name,
  email,
  bio,
  location,
  city,
  state,
  country,
  skills,
  experience,
  experience_years,
  experience_months,
  total_experience_months,
  preferred_job_titles,
  education,
  expected_ctc,
  current_ctc,
  avatar_url,
  role
`;

const CACHE_TTL_MS = 2 * 60 * 1000;
const recommendationCache = new Map<string, { expiresAt: number; value: PaginatedResult<RecommendedCandidate> }>();

export function calculateMatchScore(job: Job, candidate: RecommendedCandidateProfile) {
  return calculateWeightedMatchScore(candidate, job);
}

export async function getRecommendedCandidates(
  jobId: string,
  filters: RecommendedCandidateFilters = {},
  page = 1,
  pageSize = 10,
  extraExcludedCandidateIds: string[] = [],
  extraExcludedCandidateEmails: string[] = []
): Promise<PaginatedResult<RecommendedCandidate>> {
  const cacheKey = JSON.stringify({
    jobId,
    filters,
    page,
    pageSize,
    excluded: extraExcludedCandidateIds.slice().sort(),
    excludedEmails: extraExcludedCandidateEmails.slice().map((email) => email.toLowerCase()).sort(),
  });
  const cached = recommendationCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const job = await jobService.getJobById(jobId);
  const excludedCandidateIds = await getExcludedCandidateIds(jobId);
  const excludedCandidateEmails = new Set(
    extraExcludedCandidateEmails.map((email) => String(email || '').trim().toLowerCase()).filter(Boolean)
  );
  extraExcludedCandidateIds.forEach((candidateId) => {
    if (candidateId) excludedCandidateIds.add(candidateId);
  });

  let query = supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('role', 'job_seeker')
    .limit(250);

  if (filters.location?.trim()) {
    query = query.ilike('location', `%${filters.location.trim()}%`);
  }

  if (filters.minExperience !== undefined && filters.minExperience > 0) {
    query = query.gte('total_experience_months', filters.minExperience * 12);
  }

  const requestedSkills = normalizeSkills(filters.skills);
  if (requestedSkills.length > 0) {
    query = query.contains('skills', requestedSkills);
  }

  const { data, error } = await query;
  if (error) throw error;

  const candidates = ((data || []) as RecommendedCandidateProfile[])
    .filter((candidate) => {
      const email = String(candidate.email || '').trim().toLowerCase();
      return candidate.id && !excludedCandidateIds.has(candidate.id) && (!email || !excludedCandidateEmails.has(email));
    })
    .map((candidate) => ({
      candidate,
      job,
      matchScore: calculateMatchScore(job, candidate),
    }))
    .filter((item) =>
      filters.minMatchScore !== undefined ? item.matchScore.score >= filters.minMatchScore : true
    )
    .sort((a, b) => b.matchScore.score - a.matchScore.score);

  const total = candidates.length;
  const from = (page - 1) * pageSize;
  const value = {
    data: candidates.slice(from, from + pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };

  recommendationCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  return value;
}

export async function getTopCandidates(limit = 10): Promise<RecommendedCandidate[]> {
  const { data: jobs, error: jobsError } = await supabase
    .from('job_listings')
    .select('id, title, location, job_type, work_mode, experience, category, education, skills, created_at, featured, status')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(5);

  if (jobsError) throw jobsError;
  if (!jobs?.length) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('role', 'job_seeker')
    .limit(250);

  if (profilesError) throw profilesError;

  const recommendations = ((profiles || []) as RecommendedCandidateProfile[])
    .flatMap((candidate) =>
      (jobs as Job[]).map((job) => ({
        candidate,
        job,
        matchScore: calculateMatchScore(job, candidate),
      }))
    )
    .sort((a, b) => b.matchScore.score - a.matchScore.score);

  const seenCandidates = new Set<string>();
  return recommendations
    .filter((item) => {
      if (seenCandidates.has(item.candidate.id)) return false;
      seenCandidates.add(item.candidate.id);
      return true;
    })
    .slice(0, limit);
}

export async function inviteCandidateToApply(
  recruiterId: string,
  candidateId: string,
  job: Job,
  score: number
): Promise<void> {
  await notificationService.createNotification(
    candidateId,
    'job_match',
    `You are a ${score}% match`,
    `A recruiter invited you to apply for ${job.title} at ${job.company_name}.`,
    {
      jobId: job.id,
      recruiterId,
      matchScore: score,
      source: 'ai_recommended_candidates',
    }
  );
}

async function getExcludedCandidateIds(jobId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('job_applications')
    .select('user_id, status')
    .eq('job_id', jobId);

  if (error) throw error;
  return new Set((data || []).map((application) => application.user_id).filter(Boolean));
}

export const recommendationService = {
  calculateMatchScore,
  getRecommendedCandidates,
  getTopCandidates,
  inviteCandidateToApply,
};
