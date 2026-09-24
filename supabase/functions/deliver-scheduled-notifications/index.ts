// Supabase Edge Function: deliver-scheduled-notifications
// Runs periodically (e.g., every hour via cron)
// Delivers notifications that are scheduled for delivery

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

/**
 * Build notification content
 */
function buildNotificationContent(
  jobTitle: string,
  companyName: string,
  matchedSkills: string[],
  matchedTitles: string[],
  isPremium: boolean
): {
  title: string;
  message: string;
  cta: string;
} {
  if (isPremium) {
    const title = '🔥 New Job Match — Apply Fast';

    let message = `${jobTitle} at ${companyName} matches your profile.`;

    if (matchedSkills.length > 0) {
      const skillsText =
        matchedSkills.length === 1
          ? `your ${matchedSkills[0]} skill`
          : `your ${matchedSkills.slice(0, 2).join(' and ')} skills`;
      message = `${jobTitle} at ${companyName} matches ${skillsText}.`;
    } else if (matchedTitles.length > 0) {
      message = `${jobTitle} at ${companyName} matches your ${matchedTitles[0]} profile.`;
    }

    const cta = 'Apply Fast';

    return { title, message, cta };
  } else {
    const title = '🎯 Job Match For You';

    let message = `${jobTitle} at ${companyName} matches your profile.`;

    if (matchedSkills.length > 0) {
      const skillsText =
        matchedSkills.length === 1
          ? `your ${matchedSkills[0]} skill`
          : `your ${matchedSkills.slice(0, 2).join(' and ')} skills`;
      message = `${jobTitle} at ${companyName} matches ${skillsText}.`;
    } else if (matchedTitles.length > 0) {
      message = `${jobTitle} at ${companyName} aligns with your ${matchedTitles[0]} experience.`;
    }

    const cta = 'View Job';

    return { title, message, cta };
  }
}

/**
 * Deliver a single job match notification
 */
async function deliverJobMatchNotification(
  jobMatchNotificationId: string,
  candidateId: string,
  jobId: string,
  jobTitle: string,
  companyName: string,
  matchType: string,
  matchedSkills: string[],
  matchedTitles: string[],
  isPremium: boolean,
  matchScore: number
): Promise<boolean> {
  try {
    // candidateId = profiles.id = auth.users.id
    const { title, message, cta } = buildNotificationContent(
      jobTitle,
      companyName,
      matchedSkills,
      matchedTitles,
      isPremium
    );

    const notificationMetadata = {
      jobId,
      jobTitle,
      companyName,
      matchType,
      matchedSkills,
      matchedTitles,
      matchScore,
      cta,
      isPremium,
    };

    // The partial unique index on (user_id, data.jobId) makes retries and
    // concurrent delivery attempts idempotent for job-match notifications.
    const { data: notification, error: createError } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: candidateId,
          type: 'job_match',
          title,
          message,
          data: {
            jobId,
            matchType,
            matchedSkills,
            matchCount: matchedSkills.length,
            cta,
          },
          notification_metadata: notificationMetadata,
          read: false,
        },
      ])
      .select()
      .single();

    if (createError?.code === '23505') {
      const { data: existingNotification, error: existingError } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', candidateId)
        .eq('type', 'job_match')
        .filter('data->>jobId', 'eq', jobId)
        .maybeSingle();

      if (!existingError && existingNotification?.id) {
        const { error: markDeliveredError } = await supabase
          .from('job_match_notifications')
          .update({
            notification_id: existingNotification.id,
            is_delivered: true,
          })
          .eq('id', jobMatchNotificationId);

        if (!markDeliveredError) return true;
      }
    }

    if (createError || !notification?.id) {
      console.error('Error creating notification:', createError);
      return false;
    }

    // Update job_match_notification
    const { error: updateError } = await supabase
      .from('job_match_notifications')
      .update({
        notification_id: notification.id,
        is_delivered: true,
      })
      .eq('id', jobMatchNotificationId);

    if (updateError) {
      console.error('Error updating job_match_notification:', updateError);
      return false;
    }

    console.log(`Delivered notification for match ${jobMatchNotificationId}`);
    return true;
  } catch (error) {
    console.error('Error delivering notification:', error);
    return false;
  }
}

/**
 * Main handler
 */
Deno.serve(async (req) => {
  // Allow both POST and GET for flexibility
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Only POST/GET requests are supported', { status: 405 });
  }

  try {
    // STEP 1: Verify service-to-service credentials.
    // Current Supabase recommendation: use the `apikey` header with a secret key,
    // and keep verify_jwt = false on the function. Accept the legacy Authorization
    // bearer format only as a temporary compatibility fallback.
    const requestApiKey = req.headers.get('apikey') || '';
    const authHeader = req.headers.get('Authorization');
    const legacyToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : '';

    const isAuthorized =
      Boolean(requestApiKey && requestApiKey === supabaseServiceKey) ||
      Boolean(legacyToken && legacyToken === supabaseServiceKey);

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid service key' }),
        { status: 401 }
      );
    }

    console.log(`[deliver-scheduled-notifications] Authorized delivery request`);

    const now = new Date().toISOString();

    console.log(`Delivering scheduled notifications as of ${now}`);

    // Get all notifications ready for delivery
    // 1. Premium notifications (scheduled_for IS NULL, not delivered)
    // 2. Scheduled notifications (scheduled_for <= now, not delivered)
    const { data: matches, error } = await supabase
      .from('job_match_notifications')
      .select(
        `
        id,
        job_id,
        candidate_id,
        match_type,
        matched_skills,
        matched_titles,
        match_score,
        notification_tier,
        jobs!job_match_notifications_job_id (title, company_name)
      `
      )
      .eq('is_delivered', false)
      .or(`scheduled_for.is.null,scheduled_for.lte.${now}`);

    if (error) {
      console.error('Error fetching notifications:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch notifications' }), { status: 500 });
    }

    let delivered = 0;
    let failed = 0;

    for (const match of matches || []) {
      const jobData = match.jobs as any;
      const isPremium = match.notification_tier === 'premium';

      const success = await deliverJobMatchNotification(
        match.id,
        match.candidate_id,
        match.job_id,
        jobData?.title || 'New Job',
        jobData?.company_name || 'Company',
        match.match_type,
        match.matched_skills || [],
        match.matched_titles || [],
        isPremium,
        match.match_score || 0
      );

      if (success) {
        delivered++;
      } else {
        failed++;
      }
    }

    console.log(`Notification delivery complete: ${delivered} delivered, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        delivered,
        failed,
        total: (matches || []).length,
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
