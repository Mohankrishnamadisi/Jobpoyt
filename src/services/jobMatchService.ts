import { isCandidatePremium, isSubscriptionActive } from '@utils/candidateSubscriptionHelpers';
import { normalizeSkills, calculateSkillMatchScore, calculateTitleMatchScore } from '@utils/matchScore';
import { supabase } from './supabase';

/**
 * Job Match Notification Service
 * 
 * Handles the matching of newly published jobs against candidate profiles
 * Creates immediate notifications for premium candidates
 * Creates delayed notifications for normal candidates (+4 hours)
 */

export interface CandidateProfile {
  id: string;
  user_id: string;
  skills: string[];
  current_designation?: string;
  currentDesignation?: string;
  preferred_job_titles?: string[];
  preferredJobTitles?: string[];
  role: string;
}

export interface JobMatchResult {
  candidateId: string;
  matchType: 'skill' | 'designation' | 'both';
  matchedSkills: string[];
  matchedTitles: string[];
  matchScore: number;
  isPremium: boolean;
  scheduledFor?: Date;
}

/**
 * Check if a candidate has a skill match with a job
 */
export function checkSkillMatch(jobSkills: string[], candidateSkills: string[]): {
  matched: boolean;
  matchedSkills: string[];
} {
  if (!jobSkills?.length || !candidateSkills?.length) {
    return { matched: false, matchedSkills: [] };
  }

  // Normalize both skill sets
  const normalizedJobSkills = normalizeSkills(jobSkills);
  const normalizedCandidateSkills = normalizeSkills(candidateSkills);

  // Get matched skills using existing utility
  const skillMatchScore = calculateSkillMatchScore(jobSkills, candidateSkills);
  
  // For matching, we just need ANY match (>0%)
  // Extract the actual matched skills for metadata
  const matchedSkills: string[] = [];
  
  if (skillMatchScore > 0) {
    // Find which specific skills matched
    normalizedJobSkills.forEach((jobSkill) => {
      normalizedCandidateSkills.forEach((candidateSkill) => {
        if (skillsMatch(candidateSkill, jobSkill)) {
          // Find original skill name from jobSkills
          const originalSkill = jobSkills.find((s) => {
            const normalized = normalizeSkills([s])[0];
            return normalized === jobSkill;
          });
          if (originalSkill && !matchedSkills.includes(originalSkill)) {
            matchedSkills.push(originalSkill);
          }
        }
      });
    });
  }

  return {
    matched: skillMatchScore > 0,
    matchedSkills: matchedSkills.slice(0, 5), // Limit to top 5 for UI
  };
}

/**
 * Check if a candidate's designation/preferred titles match job title
 */
export function checkDesignationMatch(
  jobTitle: string,
  currentDesignation: string | undefined,
  preferredJobTitles: string[] | undefined
): {
  matched: boolean;
  matchedTitles: string[];
} {
  if (!jobTitle) {
    return { matched: false, matchedTitles: [] };
  }

  // Create a mock candidate object for the existing title matching logic
  const mockCandidate = {
    preferred_job_titles: preferredJobTitles,
    headline: currentDesignation,
    title: currentDesignation,
  };

  // Use existing title matching utility
  const titleMatchScore = calculateTitleMatchScore(mockCandidate, { title: jobTitle });

  // For matching, we just need score > 0
  const matchedTitles: string[] = [];

  if (titleMatchScore > 0) {
    // Collect all titles that contributed to the match
    if (currentDesignation) {
      matchedTitles.push(currentDesignation);
    }
    if (preferredJobTitles?.length) {
      // Add unique preferred titles
      preferredJobTitles.forEach((title) => {
        if (!matchedTitles.includes(title) && titleMatchScoreForPair(title, jobTitle) > 0) {
          matchedTitles.push(title);
        }
      });
    }
  }

  return {
    matched: titleMatchScore > 0,
    matchedTitles: matchedTitles.slice(0, 3), // Limit to top 3 for UI
  };
}

/**
 * Check if a candidate is premium (has active premium subscription)
 * This determines if they get immediate notification or +4 hour delay
 * 
 * Checks for:
 * - New plans: premium_monthly, premium_3_month
 * - Legacy plans: premium, pro, enterprise (during migration)
 * - Must have active status and valid end_date
 */
export async function isPremiumCandidate(candidateId: string): Promise<boolean> {
  try {
    // Get candidate's user_id first
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', candidateId)
      .single();

    if (profileError || !profile?.user_id) {
      return false;
    }

    // Check if they have an active premium subscription
    const { data: subscription, error: subsError } = await supabase
      .from('subscriptions')
      .select('plan, status, end_date')
      .eq('user_id', profile.user_id)
      .eq('status', 'active')
      .maybeSingle();

    if (subsError || !subscription) {
      return false;
    }

    // Check if plan is premium AND subscription is not expired
    const isPremium = isCandidatePremium(subscription.plan);
    const isActive = isSubscriptionActive(subscription.end_date);

    return isPremium && isActive;
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
}

/**
 * Get all candidate profiles that should be evaluated for job match
 * Returns job_seekers only, excludes those who already have notifications for this job
 */
export async function getCandidatesToEvaluate(jobId: string): Promise<CandidateProfile[]> {
  try {
    // Get all job_seeker profiles
    const { data: candidates, error } = await supabase
      .from('profiles')
      .select('id, user_id, skills, current_designation, preferred_job_titles, role')
      .eq('role', 'job_seeker')
      .not('skills', 'is', null);

    if (error) {
      console.error('Error fetching candidates:', error);
      return [];
    }

    // Filter out candidates who already have a notification for this job
    if (!candidates?.length) {
      return [];
    }

    // Check which candidates don't already have notifications
    const { data: existingMatches, error: matchError } = await supabase
      .from('job_match_notifications')
      .select('candidate_id')
      .eq('job_id', jobId);

    if (matchError) {
      console.error('Error checking existing matches:', matchError);
      // Continue anyway with all candidates
    }

    const existingCandidateIds = new Set(existingMatches?.map((match: any) => match.candidate_id) || []);

    return (candidates || [])
      .filter((candidate: any) => !existingCandidateIds.has(candidate.id))
      .map((candidate: any) => ({
        id: candidate.id,
        user_id: candidate.user_id,
        skills: candidate.skills || [],
        current_designation: candidate.current_designation,
        currentDesignation: candidate.current_designation,
        preferred_job_titles: candidate.preferred_job_titles,
        preferredJobTitles: candidate.preferred_job_titles,
        role: candidate.role,
      }));
  } catch (error) {
    console.error('Error getting candidates to evaluate:', error);
    return [];
  }
}

/**
 * Evaluate a single job against all candidates
 * Creates job_match_notifications for matched candidates
 * 
 * RULE: A candidate matches if ANY skill matches OR ANY designation matches
 */
export async function evaluateJobForMatches(jobId: string): Promise<void> {
  try {

    // Fetch the job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, skills, company_name, created_at')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error(`Job ${jobId} not found:`, jobError);
      return;
    }


    // Get candidates to evaluate
    const candidates = await getCandidatesToEvaluate(jobId);

    if (candidates.length === 0) {
      return;
    }

    // Evaluate each candidate
    const matchesFound: JobMatchResult[] = [];

    for (const candidate of candidates) {
      // Check skill match
      const skillMatch = checkSkillMatch(job.skills || [], candidate.skills || []);

      // Check designation match
      const designationMatch = checkDesignationMatch(
        job.title,
        candidate.current_designation,
        candidate.preferred_job_titles
      );

      // RULE: Match if ANY skill matches OR ANY designation matches
      const isMatched = skillMatch.matched || designationMatch.matched;

      if (isMatched) {
        // Determine match type
        let matchType: 'skill' | 'designation' | 'both' = 'skill';
        if (skillMatch.matched && designationMatch.matched) {
          matchType = 'both';
        } else if (designationMatch.matched) {
          matchType = 'designation';
        }

        // Calculate match score for metadata
        const matchScore =
          skillMatch.matched && designationMatch.matched
            ? 90
            : skillMatch.matched
              ? 75
              : 60;

        // Check if premium
        const isPremium = await isPremiumCandidate(candidate.id);

        // Calculate scheduled delivery time for normal candidates
        const scheduledFor = isPremium
          ? undefined
          : new Date(new Date(job.created_at).getTime() + 4 * 60 * 60 * 1000); // +4 hours

        matchesFound.push({
          candidateId: candidate.id,
          matchType,
          matchedSkills: skillMatch.matchedSkills,
          matchedTitles: designationMatch.matchedTitles,
          matchScore,
          isPremium,
          scheduledFor,
        });

      }
    }

    // Insert all matches into job_match_notifications table
    if (matchesFound.length > 0) {
      const notificationsToInsert = matchesFound.map((match) => ({
        job_id: jobId,
        candidate_id: match.candidateId,
        match_type: match.matchType,
        matched_skills: match.matchedSkills,
        matched_titles: match.matchedTitles,
        match_score: match.matchScore,
        notification_tier: match.isPremium ? 'premium' : 'normal',
        scheduled_for: match.scheduledFor?.toISOString() || null,
        is_delivered: false,
      }));

      const { error: insertError } = await supabase.from('job_match_notifications').insert(notificationsToInsert);

      if (insertError) {
        console.error('Error inserting job match notifications:', insertError);
        throw insertError;
      }

    }
  } catch (error) {
    console.error('Error evaluating job for matches:', error);
    throw error;
  }
}

/**
 * Get job match notifications ready for delivery
 * For premium: all with scheduled_for IS NULL
 * For normal: all with scheduled_for <= now()
 */
export async function getNotificationsReadyForDelivery(jobId?: string): Promise<any[]> {
  try {
    let query = supabase
      .from('job_match_notifications')
      .select(
        `
        id,
        job_id,
        candidate_id,
        match_type,
        matched_skills,
        matched_titles,
        notification_tier,
        jobs!job_match_notifications_job_id (id, title, company_name),
        profiles!job_match_notifications_candidate_id (id, user_id)
      `
      )
      .eq('is_delivered', false)
      .or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()}`);

    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications for delivery:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting notifications ready for delivery:', error);
    return [];
  }
}

// ===== Helper Functions =====

function skillsMatch(candidateSkill: string, requiredSkill: string): boolean {
  return (
    candidateSkill === requiredSkill ||
    candidateSkill.includes(requiredSkill) ||
    requiredSkill.includes(candidateSkill)
  );
}

/**
 * Simple title match score for a single pair
 * Reuses the existing logic but for a single comparison
 */
function titleMatchScoreForPair(candidateTitle: string, jobTitle: string): number {
  const mockCandidate = { preferred_job_titles: [candidateTitle] };
  return calculateTitleMatchScore(mockCandidate, { title: jobTitle });
}
