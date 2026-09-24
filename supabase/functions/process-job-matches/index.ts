// Supabase Edge Function: process-job-matches
// Triggered when a new job is published
// Evaluates the job against all candidate profiles and creates notifications

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';

function getConfiguredSecretKey(): string {
  try {
    const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
    if (secretKeys) {
      const parsed = JSON.parse(secretKeys);
      if (parsed.default) return String(parsed.default);
      const firstValue = Object.values(parsed)[0];
      if (firstValue) return String(firstValue);
    }
  } catch {
    // Ignore malformed JSON and fall back to the legacy env names.
  }

  return (
    Deno.env.get('SUPABASE_SECRET_KEY') ||
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
    Deno.env.get('SUPABASE_SERVICE_KEY') ||
    ''
  );
}

const supabaseServiceKey = getConfiguredSecretKey();
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface JobMatchResult {
  candidateId: string;
  matchType: 'skill' | 'designation' | 'both';
  matchedSkills: string[];
  matchedTitles: string[];
  matchScore: number;
  isPremium: boolean;
  scheduledFor: string | null;
}

/**
 * Normalize skills for matching
 */
function normalizeSkills(skills: unknown): string[] {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills.map((s) => String(s).trim()).filter(Boolean);
  if (typeof skills === 'string') {
    return skills
      .split(/[,|;\/\n]/)
      .map((s) => String(s).trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Simple skill matching
 */
function skillsMatch(candidateSkill: string, requiredSkill: string): boolean {
  const normalized1 = candidateSkill.toLowerCase().trim().replace(/[\s._\-/]+/g, '');
  const normalized2 = requiredSkill.toLowerCase().trim().replace(/[\s._\-/]+/g, '');
  return normalized1 === normalized2;
}

/**
 * Check if any job skill matches any candidate skill
 */
function checkSkillMatch(jobSkills: string[], candidateSkills: string[]): {
  matched: boolean;
  matchedSkills: string[];
} {
  if (!jobSkills?.length || !candidateSkills?.length) {
    return { matched: false, matchedSkills: [] };
  }

  const normalizedJobSkills = normalizeSkills(jobSkills);
  const normalizedCandidateSkills = normalizeSkills(candidateSkills).map((s) =>
    s.toLowerCase().trim().replace(/[\s._\-/]+/g, '')
  );

  const matchedSkills: string[] = [];

  normalizedJobSkills.forEach((jobSkill) => {
    const normalizedJob = jobSkill.toLowerCase().trim().replace(/[\s._\-/]+/g, '');
    if (normalizedCandidateSkills.some((candSkill) => skillsMatch(candSkill, normalizedJob))) {
      matchedSkills.push(jobSkill);
    }
  });

  return {
    matched: matchedSkills.length > 0,
    matchedSkills: matchedSkills.slice(0, 5),
  };
}

/**
 * Simple title matching
 */
function checkDesignationMatch(
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

  const normalized = (text: string) => text.toLowerCase().replace(/[\s._\-]+/g, ' ').trim();

  const jobTitleNorm = normalized(jobTitle);
  const matchedTitles: string[] = [];

  // Check current designation
  if (currentDesignation) {
    const currentDes_norm = normalized(currentDesignation);
    if (
      jobTitleNorm.includes(currentDes_norm) ||
      currentDes_norm.includes(jobTitleNorm) ||
      jobTitleNorm === currentDes_norm
    ) {
      matchedTitles.push(currentDesignation);
    }
  }

  // Check preferred titles
  if (preferredJobTitles?.length) {
    preferredJobTitles.forEach((title) => {
      const titleNorm = normalized(title);
      if (
        (jobTitleNorm.includes(titleNorm) ||
          titleNorm.includes(jobTitleNorm) ||
          jobTitleNorm === titleNorm) &&
        !matchedTitles.includes(title)
      ) {
        matchedTitles.push(title);
      }
    });
  }

  return {
    matched: matchedTitles.length > 0,
    matchedTitles: matchedTitles.slice(0, 3),
  };
}

/**
 * Check if candidate is premium
 * candidateId = profiles.id = auth.users.id = subscriptions.user_id
 */
async function isPremiumCandidate(candidateId: string): Promise<boolean> {
  try {
    // Query subscriptions directly using candidateId as user_id
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan, status, end_date')
      .eq('user_id', candidateId)
      .eq('status', 'active')
      .maybeSingle();

    if (!subscription) return false;

    const plan = String(subscription.plan || '').toLowerCase().trim();
    const endDate = subscription.end_date ? new Date(subscription.end_date) : null;
    const isUnexpired = !endDate || (!Number.isNaN(endDate.getTime()) && endDate.getTime() > Date.now());

    return isUnexpired && ['premium', 'pro', 'enterprise'].includes(plan);
  } catch {
    return false;
  }
}

/**
 * Main handler
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Only POST requests are supported', { status: 405 });
  }

  try {
    // STEP 1: Verify caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create a client with the user's token to verify authentication
    const userClient = createClient(supabaseUrl, token);
    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), { status: 401 });
    }

    console.log(`[process-job-matches] Processing request from user: ${user.id}`);

    const { jobId } = await req.json();

    if (!jobId) {
      return new Response(JSON.stringify({ error: 'jobId is required' }), { status: 400 });
    }

    console.log(`[process-job-matches] Processing job matches for job ${jobId}`);

    // STEP 2: Fetch job and verify ownership/permission
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, skills, company_name, created_at, posted_by')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404 });
    }

    // STEP 3: Verify authorization - user must be the job owner or an admin
    // For now, check if posted_by matches authenticated user
    // You can add admin role check here if needed
    if (job.posted_by !== user.id) {
      // Could add admin check: if (userRole !== 'admin') { return 403; }
      console.warn(`[process-job-matches] User ${user.id} attempted to process job posted by ${job.posted_by}`);
      return new Response(JSON.stringify({ error: 'Forbidden: You do not own this job' }), { status: 403 });
    }

    console.log(`[process-job-matches] Authorization verified for user ${user.id} on job ${jobId}`);

    // Fetch all job_seeker candidates
    const { data: candidates, error: candError } = await supabase
      .from('profiles')
      .select('id, skills, current_designation, preferred_job_titles, role')
      .eq('role', 'job_seeker');

    if (candError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch candidates' }), { status: 500 });
    }

    // Evaluate each candidate
    const matchesFound: JobMatchResult[] = [];

    for (const candidate of candidates || []) {
      const skillMatch = checkSkillMatch(job.skills || [], candidate.skills || []);
      const designationMatch = checkDesignationMatch(
        job.title,
        candidate.current_designation,
        candidate.preferred_job_titles
      );

      // A skill or designation match is sufficient for a job-match notification.
      if (skillMatch.matched || designationMatch.matched) {
        const isPremium = await isPremiumCandidate(candidate.id);

        let matchType: 'skill' | 'designation' | 'both' = 'skill';
        if (skillMatch.matched && designationMatch.matched) {
          matchType = 'both';
        } else if (designationMatch.matched) {
          matchType = 'designation';
        }

        const matchScore = matchType === 'both' ? 90 : matchType === 'skill' ? 75 : 60;

        const scheduledFor = isPremium
          ? null
          : new Date(new Date(job.created_at).getTime() + 4 * 60 * 60 * 1000).toISOString();

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

    // Insert matches into database
    // Use upsert with ignoreDuplicates to handle retries gracefully
    // If the same job_id+candidate_id pair exists, it will be skipped (not updated)
    if (matchesFound.length > 0) {
      const notificationsToInsert = matchesFound.map((match) => ({
        job_id: jobId,
        candidate_id: match.candidateId,
        match_type: match.matchType,
        matched_skills: match.matchedSkills,
        matched_titles: match.matchedTitles,
        match_score: match.matchScore,
        notification_tier: match.isPremium ? 'premium' : 'normal',
        scheduled_for: match.scheduledFor,
        is_delivered: false,
      }));

      // Upsert: Insert new rows, but ignore duplicates based on UNIQUE(job_id, candidate_id)
      // This makes the function idempotent - can be safely called multiple times
      const { error: insertError } = await supabase
        .from('job_match_notifications')
        .upsert(notificationsToInsert, {
          onConflict: 'job_id,candidate_id',
          ignoreDuplicates: true,
        });

      if (insertError) {
        console.error('Error inserting matches:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to insert matches' }), { status: 500 });
      }
    }

    console.log(`Found ${matchesFound.length} matches for job ${jobId}`);

    // If there are matches, trigger notification delivery for premium candidates
    if (matchesFound.length > 0) {
      try {
        // Call the deliver-scheduled-notifications Edge Function.
        // Current Supabase recommendation uses the `apikey` header for secret-based
        // service-to-service calls, not the legacy Authorization: Bearer pattern.
        const deliveryEndpoint = `${supabaseUrl}/functions/v1/deliver-scheduled-notifications`;

        const deliveryResponse = await fetch(deliveryEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseServiceKey,
          },
          body: JSON.stringify({}),
        });

        const deliveryResult = await deliveryResponse.json();
        console.log('Notification delivery result:', deliveryResult);
      } catch (deliveryError) {
        console.warn('Warning: Could not trigger immediate delivery, will be handled by scheduler:', deliveryError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        matchesFound: matchesFound.length,
        premiumMatches: matchesFound.filter((m) => m.isPremium).length,
        normalMatches: matchesFound.filter((m) => !m.isPremium).length,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
