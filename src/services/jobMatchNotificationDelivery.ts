import { supabase } from './supabase';
import { notificationService } from './api';

/**
 * Job Match Notification Delivery Service
 * 
 * Handles creating actual notifications from job_match_notifications records
 * Manages the flow:
 * 1. Premium candidates (new: premium_monthly, premium_3_month; legacy: premium, pro): Immediate notification
 * 2. Normal/Free candidates: Create notification after 4-hour delay
 * 
 * The isPremium flag is set by jobMatchService.isPremiumCandidate() which checks:
 * - New plans: premium_monthly, premium_3_month
 * - Legacy plans: premium, pro, enterprise (during migration)
 * - Subscription must be active (end_date not expired)
 */

export interface NotificationDeliveryPayload {
  jobMatchNotificationId: string;
  candidateId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  matchType: 'skill' | 'designation' | 'both';
  matchedSkills: string[];
  matchedTitles: string[];
  isPremium: boolean;
  matchScore: number;
}

/**
 * Build notification title and message based on match type and metadata
 */
function buildNotificationContent(payload: NotificationDeliveryPayload): {
  title: string;
  message: string;
  cta: string;
} {
  const jobTitle = payload.jobTitle;
  const companyName = payload.companyName;

  if (payload.isPremium) {
    // Premium notification - emphasize urgency
    const title = '🔥 New Job Match — Apply Fast';

    let message = `${jobTitle} at ${companyName} matches your profile.`;

    // Add specific match reason
    if (payload.matchedSkills.length > 0) {
      const skillsText =
        payload.matchedSkills.length === 1
          ? `your ${payload.matchedSkills[0]} skill`
          : `your ${payload.matchedSkills.slice(0, 2).join(' and ')} skills`;
      message = `${jobTitle} at ${companyName} matches ${skillsText}.`;
    } else if (payload.matchedTitles.length > 0) {
      message = `${jobTitle} at ${companyName} matches your ${payload.matchedTitles[0]} profile.`;
    }

    const cta = 'Apply Fast';

    return { title, message, cta };
  } else {
    // Normal notification - standard format
    const title = '🎯 Job Match For You';

    let message = `${jobTitle} at ${companyName} matches your profile.`;

    // Add specific match reason
    if (payload.matchedSkills.length > 0) {
      const skillsText =
        payload.matchedSkills.length === 1
          ? `your ${payload.matchedSkills[0]} skill`
          : `your ${payload.matchedSkills.slice(0, 2).join(' and ')} skills`;
      message = `${jobTitle} at ${companyName} matches ${skillsText}.`;
    } else if (payload.matchedTitles.length > 0) {
      message = `${jobTitle} at ${companyName} aligns with your ${payload.matchedTitles[0]} experience.`;
    }

    const cta = 'View Job';

    return { title, message, cta };
  }
}

/**
 * Get candidate's user_id from profile_id
 */
async function getCandidateUserId(candidateId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', candidateId)
      .single();

    if (error || !data?.user_id) {
      console.error('Error getting candidate user_id:', error);
      return null;
    }

    return data.user_id;
  } catch (error) {
    console.error('Error in getCandidateUserId:', error);
    return null;
  }
}

/**
 * Create a notification for a job match
 * This is called for:
 * 1. Premium candidates immediately
 * 2. Normal candidates via scheduler after 4-hour delay
 */
export async function deliverJobMatchNotification(payload: NotificationDeliveryPayload): Promise<void> {
  try {
    // Get candidate's auth user_id
    const userId = await getCandidateUserId(payload.candidateId);

    if (!userId) {
      console.error(`Could not find user_id for candidate ${payload.candidateId}`);
      throw new Error(`Candidate ${payload.candidateId} not found`);
    }

    // Build notification content
    const { title, message, cta } = buildNotificationContent(payload);

    // Create notification metadata
    const notificationMetadata = {
      jobId: payload.jobId,
      jobTitle: payload.jobTitle,
      companyName: payload.companyName,
      matchType: payload.matchType,
      matchedSkills: payload.matchedSkills,
      matchedTitles: payload.matchedTitles,
      matchScore: payload.matchScore,
      cta: cta,
      isPremium: payload.isPremium,
    };

    // Create the notification
    const { data: notification, error: createError } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: userId,
          type: 'job_match',
          title,
          message,
          data: {
            jobId: payload.jobId,
            matchType: payload.matchType,
            cta: cta,
          },
          notification_metadata: notificationMetadata,
          read: false,
        },
      ])
      .select()
      .single();

    if (createError) {
      console.error('Error creating notification:', createError);
      throw createError;
    }

    if (!notification?.id) {
      throw new Error('Notification created but no ID returned');
    }

    // Update job_match_notification to link to created notification
    const { error: updateError } = await supabase
      .from('job_match_notifications')
      .update({
        notification_id: notification.id,
        is_delivered: true,
      })
      .eq('id', payload.jobMatchNotificationId);

    if (updateError) {
      console.error('Error updating job_match_notification:', updateError);
      // Don't throw, notification was created successfully
    }

  } catch (error) {
    console.error('Error delivering job match notification:', error);
    throw error;
  }
}

/**
 * Deliver all premium job match notifications immediately
 * (Those with scheduled_for IS NULL and notification_tier='premium')
 */
export async function deliverPremiumNotifications(): Promise<number> {
  try {
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
        notification_tier,
        jobs!job_match_notifications_job_id (title, company_name),
        profiles!job_match_notifications_candidate_id (user_id)
      `
      )
      .eq('notification_tier', 'premium')
      .eq('is_delivered', false)
      .is('scheduled_for', null);

    if (error) {
      console.error('Error fetching premium notifications:', error);
      return 0;
    }

    let delivered = 0;

    for (const match of matches || []) {
      try {
        const jobData = match.jobs as any;
        await deliverJobMatchNotification({
          jobMatchNotificationId: match.id,
          candidateId: match.candidate_id,
          jobId: match.job_id,
          jobTitle: jobData?.title || 'New Job',
          companyName: jobData?.company_name || 'Company',
          matchType: match.match_type,
          matchedSkills: match.matched_skills || [],
          matchedTitles: match.matched_titles || [],
          isPremium: true,
          matchScore: match.match_score || 0,
        });
        delivered++;
      } catch (error) {
        console.error(`Failed to deliver premium notification for match ${match.id}:`, error);
        // Continue with next match
      }
    }

    return delivered;
  } catch (error) {
    console.error('Error in deliverPremiumNotifications:', error);
    return 0;
  }
}

/**
 * Deliver all scheduled normal notifications that are due
 * (Those with scheduled_for <= now() and notification_tier='normal')
 */
export async function deliverScheduledNotifications(): Promise<number> {
  try {
    const now = new Date().toISOString();

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
        scheduled_for,
        jobs!job_match_notifications_job_id (title, company_name),
        profiles!job_match_notifications_candidate_id (user_id)
      `
      )
      .eq('notification_tier', 'normal')
      .eq('is_delivered', false)
      .not('scheduled_for', 'is', null)
      .lte('scheduled_for', now);

    if (error) {
      console.error('Error fetching scheduled notifications:', error);
      return 0;
    }

    let delivered = 0;

    for (const match of matches || []) {
      try {
        const jobData = match.jobs as any;
        await deliverJobMatchNotification({
          jobMatchNotificationId: match.id,
          candidateId: match.candidate_id,
          jobId: match.job_id,
          jobTitle: jobData?.title || 'New Job',
          companyName: jobData?.company_name || 'Company',
          matchType: match.match_type,
          matchedSkills: match.matched_skills || [],
          matchedTitles: match.matched_titles || [],
          isPremium: false,
          matchScore: match.match_score || 0,
        });
        delivered++;
      } catch (error) {
        console.error(`Failed to deliver scheduled notification for match ${match.id}:`, error);
        // Continue with next match
      }
    }

    return delivered;
  } catch (error) {
    console.error('Error in deliverScheduledNotifications:', error);
    return 0;
  }
}

/**
 * Run the complete notification delivery process
 * Should be called:
 * 1. Immediately after job publication (for premium candidates)
 * 2. Periodically via scheduler (for normal candidates after 4 hours)
 */
export async function runNotificationDeliveryProcess(): Promise<{ premium: number; scheduled: number }> {
  try {

    // Deliver premium notifications immediately
    const premiumDelivered = await deliverPremiumNotifications();

    // Deliver scheduled notifications that are due
    const scheduledDelivered = await deliverScheduledNotifications();


    return { premium: premiumDelivered, scheduled: scheduledDelivered };
  } catch (error) {
    console.error('Error in notification delivery process:', error);
    return { premium: 0, scheduled: 0 };
  }
}
