export type RecruiterActivityFilter = 'today' | '7d' | '30d' | '90d';
export type TrendRange = 'weekly' | 'monthly' | 'quarterly';

export type RecruiterActivityType =
  | 'profile_viewed'
  | 'resume_downloaded'
  | 'application_shortlisted'
  | 'recruiter_message'
  | 'interview_invite'
  | 'application_stage_update'
  | 'saved_by_recruiter'
  | 'assessment_viewed';

export type RecruiterActivityStatus = 'new' | 'in_progress' | 'completed';

export interface RecruiterActivityApplication {
  id: string;
  status?: string;
  appliedAt?: string;
  updatedAt?: string;
  title?: string;
  companyName?: string;
}

export interface RecruiterActivityContext {
  userId: string;
  isPremium: boolean;
  profileCompletion: number;
  resumeDownloads: number;
  profileViews: number;
  recruiterMessages: number;
  savedJobs: number;
  skillsCount: number;
  assessmentsCompleted: number;
  hasResume: boolean;
  recentApplications: RecruiterActivityApplication[];
  activityEvents?: RecruiterActivityEvent[];
  interviewInvitations?: number;
  projectCount?: number;
  experienceCount?: number;
  portfolioPresent?: boolean;
}

export interface RecruiterActivityEvent {
  id: string;
  type: RecruiterActivityType;
  title: string;
  subtitle: string;
  occurredAt: string;
  status: RecruiterActivityStatus;
  actionLabel: string;
  actionKey: string;
}

export interface RecruiterActivityOverview {
  profileViews: number;
  resumeDownloads: number;
  recruiterMessages: number;
  interviewInvitations: number;
  searchAppearances: number | null;
  shortlists: number;
  bookmarks: number | null;
}

export interface VisibilityBreakdown {
  profileCompletion: number;
  skillsCount: number;
  projectCount: number;
  assessmentsCompleted: number;
  hasResume: boolean;
  experienceCount: number;
  hasPortfolio: boolean;
}

export interface WeeklyComparisonRow {
  label: 'Profile Views' | 'Resume Downloads' | 'Messages';
  thisWeek: number;
  lastWeek: number;
  growth: number | null;
}

export interface RecruiterNotificationItem {
  id: string;
  text: string;
  occurredAt: string;
}

export interface VisibilityTrendPoint {
  label: string;
  score: number;
}

export interface RecruiterInterestCategory {
  category: string;
  level: 'Very High' | 'High' | 'Medium' | 'Low';
  score: number;
}

export interface RecruiterActivityInsights {
  visibilityScore: number;
  visibilityBreakdown: VisibilityBreakdown;
  overview: RecruiterActivityOverview;
  timeline: RecruiterActivityEvent[];
  weeklyComparison: WeeklyComparisonRow[];
  suggestions: string[];
  notifications: RecruiterNotificationItem[];
  engagementScore: number;
  interestCategories: RecruiterInterestCategory[];
  trend: Record<TrendRange, VisibilityTrendPoint[]>;
  profileRankingPercentile: number | null;
}

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, value));

const normalizeStatus = (status?: string): RecruiterActivityStatus => {
  if (!status) return 'new';
  if (status === 'accepted' || status === 'shortlisted') return 'completed';
  if (status === 'under_review') return 'in_progress';
  return 'new';
};

const buildTimelineFromApplications = (apps: RecruiterActivityApplication[]): RecruiterActivityEvent[] => {
  return apps.flatMap((item) => {
    const normalized = (item.status || '').toLowerCase();
    const isShortlisted = normalized === 'shortlisted';
    const isReview = normalized === 'under_review';
    const isAccepted = normalized === 'accepted';
    const occurredAt = item.updatedAt || item.appliedAt;
    if (!occurredAt) return [];
    const title = isShortlisted ? 'Application shortlisted' : isReview ? 'Application moved to review' : isAccepted ? 'Application accepted' : normalized === 'rejected' ? 'Application rejected' : 'Application submitted';
    return [{
      id: `application-${item.id}`,
      type: isShortlisted ? 'application_shortlisted' : 'application_stage_update',
      title,
      subtitle: `${item.title || 'Role'}${item.companyName ? ` at ${item.companyName}` : ''}`,
      occurredAt,
      status: normalizeStatus(item.status),
      actionLabel: 'View application',
      actionKey: 'applications',
    }];
  });
};

const buildBaseTimeline = (ctx: RecruiterActivityContext): RecruiterActivityEvent[] => {
  return [...(ctx.activityEvents || []), ...buildTimelineFromApplications(ctx.recentApplications)]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
};

const filterTimeline = (timeline: RecruiterActivityEvent[], filter: RecruiterActivityFilter): RecruiterActivityEvent[] => {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const days = filter === '7d' ? 7 : filter === '30d' ? 30 : 90;
  return timeline.filter((item) => {
    const occurredAt = new Date(item.occurredAt).getTime();
    if (filter === 'today') return Number.isFinite(occurredAt) && occurredAt >= todayStart.getTime() && occurredAt <= now;
    return Number.isFinite(occurredAt) && occurredAt <= now && now - occurredAt <= days * dayMs;
  });
};

const calculateVisibilityBreakdown = (ctx: RecruiterActivityContext): VisibilityBreakdown => ({
  profileCompletion: clamp(ctx.profileCompletion),
  skillsCount: ctx.skillsCount,
  projectCount: ctx.projectCount || 0,
  assessmentsCompleted: ctx.assessmentsCompleted,
  hasResume: ctx.hasResume,
  experienceCount: ctx.experienceCount || 0,
  hasPortfolio: ctx.portfolioPresent === true,
});

const buildOverview = (events: RecruiterActivityEvent[]): RecruiterActivityOverview => ({
  profileViews: events.filter((event) => event.type === 'profile_viewed').length,
  resumeDownloads: events.filter((event) => event.type === 'resume_downloaded').length,
  recruiterMessages: events.filter((event) => event.type === 'recruiter_message').length,
  interviewInvitations: events.filter((event) => event.type === 'interview_invite').length,
  searchAppearances: null,
  shortlists: events.filter((event) => event.type === 'application_shortlisted').length,
  bookmarks: null,
});

const percentageChange = (current: number, previous: number): number | null => (
  previous > 0 ? Math.round(((current - previous) / previous) * 100) : null
);

const buildWeeklyComparison = (events: RecruiterActivityEvent[]): WeeklyComparisonRow[] => {
  const now = Date.now();
  const week = 7 * 24 * 60 * 60 * 1000;
  const rows: Array<{ label: WeeklyComparisonRow['label']; type: RecruiterActivityType }> = [
    { label: 'Profile Views', type: 'profile_viewed' },
    { label: 'Resume Downloads', type: 'resume_downloaded' },
    { label: 'Messages', type: 'recruiter_message' },
  ];
  return rows.map(({ label, type }) => {
    const matching = events.filter((event) => event.type === type).map((event) => new Date(event.occurredAt).getTime()).filter(Number.isFinite);
    const thisWeek = matching.filter((at) => at <= now && now - at <= week).length;
    const lastWeek = matching.filter((at) => now - at > week && now - at <= week * 2).length;
    return { label, thisWeek, lastWeek, growth: percentageChange(thisWeek, lastWeek) };
  });
};

const buildSuggestions = (ctx: RecruiterActivityContext): string[] => {
  const suggestions: string[] = [];
  if (!ctx.hasResume) suggestions.push('Add a resume so recruiters can review your experience.');
  if (ctx.skillsCount === 0) suggestions.push('Add skills to help recruiters find relevant experience.');
  if (ctx.profileCompletion < 80) suggestions.push('Complete more of your profile to improve recruiter visibility.');
  if (ctx.assessmentsCompleted === 0) suggestions.push('Complete an assessment to add verified skills to your profile.');
  if (!ctx.portfolioPresent && (ctx.projectCount || 0) > 0) suggestions.push('Add a portfolio link to showcase your projects.');
  return suggestions.slice(0, ctx.isPremium ? 6 : 3);
};

const buildNotifications = (timeline: RecruiterActivityEvent[]): RecruiterNotificationItem[] => timeline
  .filter((event) => ['profile_viewed', 'resume_downloaded', 'interview_invite', 'recruiter_message', 'application_shortlisted'].includes(event.type))
  .slice(0, 5)
  .map((event) => ({ id: `activity-${event.id}`, text: event.title, occurredAt: event.occurredAt }));

const startOfWeek = (value: Date) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
};

const buildTrend = (events: RecruiterActivityEvent[], range: TrendRange): VisibilityTrendPoint[] => {
  const now = new Date();
  const buckets: Array<{ start: Date; end: Date; label: string }> = [];
  if (range === 'weekly') {
    const thisWeek = startOfWeek(now);
    for (let offset = 3; offset >= 0; offset -= 1) {
      const start = new Date(thisWeek);
      start.setDate(start.getDate() - offset * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      buckets.push({ start, end, label: `${start.getDate()} ${start.toLocaleDateString(undefined, { month: 'short' })}` });
    }
  } else if (range === 'monthly') {
    for (let offset = 5; offset >= 0; offset -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
      buckets.push({ start, end, label: start.toLocaleDateString(undefined, { month: 'short' }) });
    }
  } else {
    const currentQuarter = Math.floor(now.getMonth() / 3);
    for (let offset = 3; offset >= 0; offset -= 1) {
      const quarterStartMonth = (currentQuarter - offset) * 3;
      const start = new Date(now.getFullYear(), quarterStartMonth, 1);
      const end = new Date(now.getFullYear(), quarterStartMonth + 3, 1);
      buckets.push({ start, end, label: `Q${Math.floor(((quarterStartMonth % 12) + 12) % 12 / 3) + 1} ${start.getFullYear()}` });
    }
  }
  const validTimes = events.map((event) => new Date(event.occurredAt).getTime()).filter(Number.isFinite);
  return buckets.map(({ start, end, label }) => ({
    label,
    score: validTimes.filter((at) => at >= start.getTime() && at < end.getTime()).length,
  }));
};

const buildSuggestionsMessage = (context: RecruiterActivityContext) => buildSuggestions(context);

export const recruiterActivityService = {
  getInsights(context: RecruiterActivityContext, filter: RecruiterActivityFilter = '7d'): RecruiterActivityInsights {
    const timelineAll = buildBaseTimeline(context);
    const timeline = filterTimeline(timelineAll, filter);
    const overview = buildOverview(timeline);
    const visibilityBreakdown = calculateVisibilityBreakdown(context);
    const visibilityScore = clamp(context.profileCompletion);
    const weeklyComparison = buildWeeklyComparison(timelineAll);
    const suggestions = buildSuggestionsMessage(context);
    const notifications = buildNotifications(timeline);
    const engagementScore = overview.profileViews + overview.resumeDownloads + overview.recruiterMessages + overview.interviewInvitations + overview.shortlists;

    return {
      visibilityScore,
      visibilityBreakdown,
      overview,
      timeline,
      weeklyComparison,
      suggestions,
      notifications,
      engagementScore,
      interestCategories: [],
      trend: {
        weekly: buildTrend(timelineAll, 'weekly'),
        monthly: buildTrend(timelineAll, 'monthly'),
        quarterly: buildTrend(timelineAll, 'quarterly'),
      },
      profileRankingPercentile: null,
    };
  },
};
