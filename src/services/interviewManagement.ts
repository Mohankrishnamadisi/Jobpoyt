import { jobService, notificationService } from '@services/api';
import { messagingService } from '@services/messaging';
import { supabase } from '@services/supabase';

export type InterviewType = 'Video' | 'Phone' | 'In-person';
export type InterviewStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled' | 'No Show';
export type AtsOutcomeStage = 'Interview Scheduled' | 'Interview Completed' | 'Offer Sent' | 'Rejected';

export interface InterviewTimelineEvent {
  id: string;
  type: 'Interview Scheduled' | 'Interview Rescheduled' | 'Interview Completed' | 'Feedback Submitted';
  title: string;
  description?: string;
  at: string;
  by: string;
}

export interface InterviewFeedback {
  technicalRating: number;
  communication: number;
  problemSolving: number;
  cultureFit: number;
  overallRating: number;
  decision: 'Hire' | 'Next Round' | 'Reject';
  comments: string;
}

export interface InterviewRecord {
  id: string;
  recruiterId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateResumeUrl?: string;
  jobId: string;
  jobTitle: string;
  applicationId?: string;
  round: string;
  interviewType: InterviewType;
  date: string;
  time: string;
  duration: number;
  timezone: string;
  interviewer: string;
  interviewerEmail?: string;
  meetingLink?: string;
  location?: string;
  instructions?: string;
  notes?: string;
  attachments: string[];
  status: InterviewStatus;
  feedback?: InterviewFeedback;
  feedbackSubmittedAt?: string;
  timeline: InterviewTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface InterviewCandidateOption {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateResumeUrl?: string;
  jobId: string;
  jobTitle: string;
  atsStage?: string;
  status?: string;
}

export interface RecruiterInterviewContext {
  jobs: Array<{ id: string; title: string }>;
  candidates: InterviewCandidateOption[];
}

export interface InterviewReminder {
  id: string;
  interviewId: string;
  kind: 'upcoming' | 'start_30' | 'completion' | 'feedback';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'success';
  at: string;
}

const LOCAL_KEY_PREFIX = 'actro_recruiter_interviews_v1';

const ATS_STATUS_BY_STAGE: Record<AtsOutcomeStage, 'under_review' | 'accepted' | 'rejected'> = {
  'Interview Scheduled': 'under_review',
  'Interview Completed': 'under_review',
  'Offer Sent': 'accepted',
  Rejected: 'rejected',
};

function getLocalStorageKey(recruiterId: string): string {
  return `${LOCAL_KEY_PREFIX}:${recruiterId}`;
}

function safeParseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function loadLocalInterviews(recruiterId: string): InterviewRecord[] {
  if (!recruiterId) return [];
  const rows = safeParseJson<InterviewRecord[]>(localStorage.getItem(getLocalStorageKey(recruiterId)), []);
  return rows
    .map((item) => normalizeInterviewRow(item, recruiterId))
    .sort((a, b) => dateTimeToMillis(a.date, a.time) - dateTimeToMillis(b.date, b.time));
}

function saveLocalInterviews(recruiterId: string, interviews: InterviewRecord[]): void {
  localStorage.setItem(getLocalStorageKey(recruiterId), JSON.stringify(interviews));
}

function toIsoDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function normalizeNumber(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeInterviewRow(row: any, recruiterIdFallback: string): InterviewRecord {
  const nowIso = new Date().toISOString();
  const candidateName = String(
    row?.candidate_name
      || row?.candidateName
      || row?.candidate?.name
      || row?.candidate?.full_name
      || 'Candidate'
  );

  const timelineRaw = Array.isArray(row?.timeline) ? row.timeline : [];

  return {
    id: String(row?.id || createId()),
    recruiterId: String(row?.recruiter_id || row?.recruiterId || recruiterIdFallback),
    candidateId: String(row?.candidate_id || row?.candidateId || ''),
    candidateName,
    candidateEmail: row?.candidate_email || row?.candidateEmail || undefined,
    candidatePhone: row?.candidate_phone || row?.candidatePhone || undefined,
    candidateResumeUrl: row?.candidate_resume_url || row?.candidateResumeUrl || undefined,
    jobId: String(row?.job_id || row?.jobId || ''),
    jobTitle: String(row?.job_title || row?.jobTitle || 'Untitled Job'),
    applicationId: row?.application_id || row?.applicationId || undefined,
    round: String(row?.round || 'Round 1'),
    interviewType: ((row?.interview_type || row?.interviewType || 'Video') as InterviewType),
    date: String(row?.date || ''),
    time: String(row?.time || ''),
    duration: normalizeNumber(row?.duration, 30),
    timezone: String(row?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'),
    interviewer: String(row?.interviewer || ''),
    interviewerEmail: row?.interviewer_email || row?.interviewerEmail || undefined,
    meetingLink: row?.meeting_link || row?.meetingLink || undefined,
    location: row?.location || undefined,
    instructions: row?.instructions || undefined,
    notes: row?.notes || undefined,
    attachments: Array.isArray(row?.attachments)
      ? row.attachments.map((item: unknown) => String(item).trim()).filter(Boolean)
      : [],
    status: ((row?.status || 'Scheduled') as InterviewStatus),
    feedback: row?.feedback || undefined,
    feedbackSubmittedAt: row?.feedback_submitted_at || row?.feedbackSubmittedAt || undefined,
    timeline: timelineRaw.map((event: any) => ({
      id: String(event?.id || createId()),
      type: event?.type,
      title: String(event?.title || event?.type || 'Interview Event'),
      description: event?.description ? String(event.description) : undefined,
      at: toIsoDate(event?.at || event?.created_at || nowIso),
      by: String(event?.by || 'Recruiter'),
    })),
    createdAt: toIsoDate(row?.created_at || row?.createdAt || nowIso),
    updatedAt: toIsoDate(row?.updated_at || row?.updatedAt || nowIso),
  };
}

function serializeInterviewForRemote(interview: InterviewRecord): Record<string, unknown> {
  return {
    id: interview.id,
    recruiter_id: interview.recruiterId,
    candidate_id: interview.candidateId,
    candidate_name: interview.candidateName,
    candidate_email: interview.candidateEmail || null,
    candidate_phone: interview.candidatePhone || null,
    candidate_resume_url: interview.candidateResumeUrl || null,
    job_id: interview.jobId,
    job_title: interview.jobTitle,
    application_id: interview.applicationId || null,
    round: interview.round,
    interview_type: interview.interviewType,
    date: interview.date,
    time: interview.time,
    duration: interview.duration,
    timezone: interview.timezone,
    interviewer: interview.interviewer,
    interviewer_email: interview.interviewerEmail || null,
    meeting_link: interview.meetingLink || null,
    location: interview.location || null,
    instructions: interview.instructions || null,
    notes: interview.notes || null,
    attachments: interview.attachments,
    status: interview.status,
    feedback: interview.feedback || null,
    feedback_submitted_at: interview.feedbackSubmittedAt || null,
    timeline: interview.timeline,
    created_at: interview.createdAt,
    updated_at: interview.updatedAt,
  };
}

function createId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `int_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function dateTimeToMillis(date: string, time: string): number {
  return new Date(`${date}T${time || '00:00'}:00`).getTime();
}

function addTimelineEvent(
  interview: InterviewRecord,
  type: InterviewTimelineEvent['type'],
  title: string,
  description?: string,
  by = 'Recruiter'
): InterviewRecord {
  const event: InterviewTimelineEvent = {
    id: createId(),
    type,
    title,
    description,
    at: new Date().toISOString(),
    by,
  };
  return {
    ...interview,
    timeline: [event, ...(interview.timeline || [])],
    updatedAt: new Date().toISOString(),
  };
}

async function syncInterviewToRemote(interview: InterviewRecord): Promise<void> {
  const { error } = await supabase.from('interviews').upsert(serializeInterviewForRemote(interview));
  if (error) throw error;
}

async function syncInterviewsToRemote(interviews: InterviewRecord[]): Promise<void> {
  const { error } = await supabase
    .from('interviews')
    .upsert(interviews.map((item) => serializeInterviewForRemote(item)));
  if (error) throw error;
}

async function updateApplicationStage(
  applicationId: string,
  stage: AtsOutcomeStage,
  note?: string
): Promise<void> {
  if (!applicationId) return;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('job_applications')
    .update({
      ats_stage: stage,
      status: ATS_STATUS_BY_STAGE[stage],
      updated_at: now,
    })
    .eq('id', applicationId);

  if (error) {
    console.warn('Failed to update ATS stage from interview flow:', error.message);
    return;
  }

  try {
    await supabase.from('candidate_pipeline_history').insert({
      application_id: applicationId,
      new_stage: stage,
      notes: note || null,
      created_at: now,
    });
  } catch {
    // Timeline table can vary between environments; ignore write failures.
  }
}

function updateLocalCollection(
  recruiterId: string,
  updater: (rows: InterviewRecord[]) => InterviewRecord[]
): InterviewRecord[] {
  const current = loadLocalInterviews(recruiterId);
  const updated = updater(current).sort(
    (a, b) => dateTimeToMillis(a.date, a.time) - dateTimeToMillis(b.date, b.time)
  );
  saveLocalInterviews(recruiterId, updated);
  return updated;
}

function interviewCalendarNote(interview: InterviewRecord): string {
  const details = [
    `Interview: ${interview.round}`,
    `Date: ${interview.date}`,
    `Time: ${interview.time}`,
    `Timezone: ${interview.timezone}`,
    `Duration: ${interview.duration} minutes`,
  ];
  if (interview.meetingLink) details.push(`Meeting Link: ${interview.meetingLink}`);
  if (interview.location) details.push(`Location: ${interview.location}`);
  details.push('Calendar Invite: Please add this event to your calendar.');
  return details.join('\n');
}

async function sendInterviewLifecycleMessage(
  recruiterId: string,
  interview: InterviewRecord,
  kind: 'scheduled' | 'rescheduled' | 'cancelled' | 'reminder'
): Promise<void> {
  if (!recruiterId || !interview.candidateId) return;

  const candidateName = interview.candidateName || 'Candidate';
  let message = '';

  if (kind === 'scheduled') {
    message = [
      `Hi ${candidateName}, your interview for ${interview.jobTitle} has been scheduled.`,
      interviewCalendarNote(interview),
    ].join('\n\n');
  }

  if (kind === 'rescheduled') {
    message = [
      `Hi ${candidateName}, your interview for ${interview.jobTitle} has been rescheduled.`,
      interviewCalendarNote(interview),
    ].join('\n\n');
  }

  if (kind === 'cancelled') {
    message = [
      `Hi ${candidateName}, your interview for ${interview.jobTitle} has been cancelled.`,
      'Our team will reach out with updated next steps if applicable.',
    ].join('\n\n');
  }

  if (kind === 'reminder') {
    message = [
      `Reminder: Your interview for ${interview.jobTitle} starts soon.`,
      interviewCalendarNote(interview),
    ].join('\n\n');
  }

  if (!message.trim()) return;

  try {
    await messagingService.sendMessage(recruiterId, interview.candidateId, message, undefined, 'recruiter');
  } catch (error) {
    console.warn('Failed to send interview lifecycle message:', error);
  }
}

export async function getRecruiterInterviewContext(recruiterId: string): Promise<RecruiterInterviewContext> {
  const jobs = await jobService.getRecruiterJobs(recruiterId);
  const normalizedJobs = (jobs || []).map((job: any) => ({
    id: String(job.id),
    title: String(job.title || 'Untitled Job'),
  }));

  if (normalizedJobs.length === 0) {
    return { jobs: [], candidates: [] };
  }

  const jobIds = normalizedJobs.map((job) => job.id);
  const { data, error } = await supabase
    .from('job_applications')
    .select('id, job_id, user_id, status, ats_stage, resume_url, profiles(*), jobs(id, title)')
    .in('job_id', jobIds)
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn('Failed to load interview candidates from job applications:', error.message);
    return { jobs: normalizedJobs, candidates: [] };
  }

  const candidates = ((data || []) as any[]).map((row) => ({
    applicationId: String(row.id),
    candidateId: String(row.user_id),
    candidateName: String(row?.profiles?.name || row?.profiles?.full_name || 'Candidate'),
    candidateEmail: row?.profiles?.email ? String(row.profiles.email) : undefined,
    candidatePhone: row?.profiles?.phone ? String(row.profiles.phone) : undefined,
    candidateResumeUrl: row?.resume_url || row?.profiles?.resume_url || undefined,
    jobId: String(row?.job_id || ''),
    jobTitle: String(row?.jobs?.title || normalizedJobs.find((job) => job.id === row.job_id)?.title || 'Untitled Job'),
    atsStage: row?.ats_stage ? String(row.ats_stage) : undefined,
    status: row?.status ? String(row.status) : undefined,
  })) as InterviewCandidateOption[];

  return { jobs: normalizedJobs, candidates };
}

export async function listInterviews(recruiterId: string): Promise<InterviewRecord[]> {
  if (!recruiterId) return [];

  let remoteInterviews: InterviewRecord[] = [];
  try {
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('recruiter_id', recruiterId)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (!error && Array.isArray(data)) {
      remoteInterviews = data.map((row: any) => normalizeInterviewRow(row, recruiterId));
      if (remoteInterviews.length > 0) {
        saveLocalInterviews(recruiterId, remoteInterviews);
      }
    }
  } catch {
    // Remote table may not exist. We'll rely on local persistence.
  }

  if (remoteInterviews.length > 0) {
    return remoteInterviews;
  }

  return loadLocalInterviews(recruiterId);
}

export interface SaveInterviewPayload {
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateResumeUrl?: string;
  jobId: string;
  jobTitle: string;
  applicationId?: string;
  round: string;
  interviewType: InterviewType;
  date: string;
  time: string;
  duration: number;
  timezone: string;
  interviewer: string;
  interviewerEmail?: string;
  meetingLink?: string;
  location?: string;
  instructions?: string;
  notes?: string;
  attachments?: string[];
  status?: InterviewStatus;
}

export async function createInterview(recruiterId: string, payload: SaveInterviewPayload): Promise<InterviewRecord> {
  const nowIso = new Date().toISOString();
  const interviewBase: InterviewRecord = {
    id: createId(),
    recruiterId,
    candidateId: payload.candidateId,
    candidateName: payload.candidateName,
    candidateEmail: payload.candidateEmail,
    candidatePhone: payload.candidatePhone,
    candidateResumeUrl: payload.candidateResumeUrl,
    jobId: payload.jobId,
    jobTitle: payload.jobTitle,
    applicationId: payload.applicationId,
    round: payload.round,
    interviewType: payload.interviewType,
    date: payload.date,
    time: payload.time,
    duration: payload.duration,
    timezone: payload.timezone,
    interviewer: payload.interviewer,
    meetingLink: payload.meetingLink,
    location: payload.location,
    instructions: payload.instructions,
    notes: payload.notes,
    attachments: payload.attachments || [],
    status: payload.status || 'Scheduled',
    timeline: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const withEvent = addTimelineEvent(
    interviewBase,
    'Interview Scheduled',
    'Interview scheduled',
    `${payload.round} via ${payload.interviewType}`
  );

  updateLocalCollection(recruiterId, (rows) => [withEvent, ...rows]);
  await syncInterviewToRemote(withEvent);

  try {
    const { error } = await supabase.functions.invoke('candidate-interview-invites', {
      body: { action: 'notify_candidate', interviewId: withEvent.id },
    });
    if (error) console.warn('Candidate interview notification failed:', error.message);
  } catch (error) {
    console.warn('Candidate interview notification failed:', error);
  }

  await sendInterviewLifecycleMessage(recruiterId, withEvent, 'scheduled');

  if (withEvent.applicationId) {
    await updateApplicationStage(withEvent.applicationId, 'Interview Scheduled', 'Interview scheduled by recruiter');
  }

  try {
    await notificationService.createNotification(
      recruiterId,
      'application_status',
      'Interview Scheduled',
      `${withEvent.candidateName} interview is scheduled on ${withEvent.date} at ${withEvent.time}.`,
      { interviewId: withEvent.id, applicationId: withEvent.applicationId }
    );
  } catch {
    // Ignore notification failures.
  }

  return withEvent;
}

export async function updateInterview(
  recruiterId: string,
  interviewId: string,
  updates: Partial<SaveInterviewPayload & { status: InterviewStatus; feedback: InterviewFeedback; feedbackSubmittedAt: string }>
): Promise<InterviewRecord | null> {
  let nextItem: InterviewRecord | null = null;

  const updated = updateLocalCollection(recruiterId, (rows) => rows.map((item) => {
    if (item.id !== interviewId) return item;

    nextItem = {
      ...item,
      ...updates,
      attachments: updates.attachments || item.attachments,
      updatedAt: new Date().toISOString(),
    };

    return nextItem;
  }));

  if (!nextItem) return null;

  await syncInterviewToRemote(nextItem);

  // Keep remote cache and local sorted in sync.
  saveLocalInterviews(recruiterId, updated);

  return nextItem;
}

export async function cancelInterview(
  recruiterId: string,
  interviewId: string,
  reason?: string
): Promise<InterviewRecord | null> {
  const updated = await updateInterview(recruiterId, interviewId, { status: 'Cancelled' });
  if (!updated) return null;

  const withEvent = addTimelineEvent(
    updated,
    'Interview Rescheduled',
    'Interview cancelled',
    reason || 'Cancelled by recruiter'
  );

  await updateInterview(recruiterId, interviewId, {
    timeline: withEvent.timeline as any,
    updatedAt: withEvent.updatedAt,
  } as any);

  await sendInterviewLifecycleMessage(recruiterId, withEvent, 'cancelled');

  return withEvent;
}

export async function rescheduleInterview(
  recruiterId: string,
  interviewId: string,
  updates: Pick<SaveInterviewPayload, 'date' | 'time' | 'duration' | 'timezone' | 'interviewer'> &
    Partial<SaveInterviewPayload>
): Promise<InterviewRecord | null> {
  const updated = await updateInterview(recruiterId, interviewId, {
    ...updates,
    status: 'Rescheduled',
  });

  if (!updated) return null;

  const withEvent = addTimelineEvent(
    updated,
    'Interview Rescheduled',
    'Interview rescheduled',
    `Moved to ${updates.date} at ${updates.time}`
  );

  await updateInterview(recruiterId, interviewId, {
    timeline: withEvent.timeline as any,
    updatedAt: withEvent.updatedAt,
  } as any);

  await sendInterviewLifecycleMessage(recruiterId, withEvent, 'rescheduled');

  return withEvent;
}

export async function sendInterviewReminderMessage(
  recruiterId: string,
  interview: InterviewRecord
): Promise<void> {
  await sendInterviewLifecycleMessage(recruiterId, interview, 'reminder');
}

export async function completeInterview(
  recruiterId: string,
  interviewId: string,
  atsOutcome: AtsOutcomeStage = 'Interview Completed'
): Promise<InterviewRecord | null> {
  const updated = await updateInterview(recruiterId, interviewId, { status: 'Completed' });
  if (!updated) return null;

  const withEvent = addTimelineEvent(updated, 'Interview Completed', 'Interview completed');

  await updateInterview(recruiterId, interviewId, {
    timeline: withEvent.timeline as any,
    updatedAt: withEvent.updatedAt,
  } as any);

  if (withEvent.applicationId) {
    await updateApplicationStage(withEvent.applicationId, atsOutcome, 'Interview completed');
  }

  try {
    await notificationService.createNotification(
      recruiterId,
      'application_status',
      'Interview Completed',
      `Interview with ${withEvent.candidateName} has been marked completed.`,
      { interviewId: withEvent.id, applicationId: withEvent.applicationId }
    );
  } catch {
    // Ignore notification failures.
  }

  return withEvent;
}

export async function submitInterviewFeedback(
  recruiterId: string,
  interviewId: string,
  feedback: InterviewFeedback,
  atsOutcome?: AtsOutcomeStage
): Promise<InterviewRecord | null> {
  const targetOutcome: AtsOutcomeStage = atsOutcome
    || (feedback.decision === 'Hire' ? 'Offer Sent' : feedback.decision === 'Reject' ? 'Rejected' : 'Interview Completed');

  const completed = await completeInterview(recruiterId, interviewId, targetOutcome);
  if (!completed) return null;

  const updated = await updateInterview(recruiterId, interviewId, {
    feedback,
    feedbackSubmittedAt: new Date().toISOString(),
  });

  if (!updated) return null;

  const withEvent = addTimelineEvent(updated, 'Feedback Submitted', 'Feedback submitted', `Decision: ${feedback.decision}`);
  await updateInterview(recruiterId, interviewId, {
    timeline: withEvent.timeline as any,
    updatedAt: withEvent.updatedAt,
  } as any);

  return withEvent;
}

export async function bulkUpdateInterviewStatus(
  recruiterId: string,
  interviewIds: string[],
  status: InterviewStatus
): Promise<void> {
  if (!recruiterId || interviewIds.length === 0) return;

  const nextRows = updateLocalCollection(recruiterId, (rows) => rows.map((item) => (
    interviewIds.includes(item.id)
      ? {
          ...item,
          status,
          updatedAt: new Date().toISOString(),
        }
      : item
  )));

  await syncInterviewsToRemote(nextRows.filter((item) => interviewIds.includes(item.id)));
}

export function getInterviewReminders(interviews: InterviewRecord[], nowDate = new Date()): InterviewReminder[] {
  const now = nowDate.getTime();

  return interviews.flatMap((interview) => {
    const items: InterviewReminder[] = [];
    if (interview.status === 'Cancelled' || interview.status === 'No Show') return items;

    const start = dateTimeToMillis(interview.date, interview.time);
    if (!Number.isFinite(start)) return items;

    const minutesToStart = Math.floor((start - now) / 60000);
    const end = start + interview.duration * 60000;

    if ((interview.status === 'Scheduled' || interview.status === 'Rescheduled') && minutesToStart > 30 && minutesToStart <= 24 * 60) {
      items.push({
        id: `${interview.id}:upcoming`,
        interviewId: interview.id,
        kind: 'upcoming',
        title: 'Upcoming interview reminder',
        message: `${interview.candidateName} (${interview.jobTitle}) in ${Math.max(1, Math.floor(minutesToStart / 60))} hour(s).`,
        severity: 'info',
        at: interview.date,
      });
    }

    if ((interview.status === 'Scheduled' || interview.status === 'Rescheduled') && minutesToStart >= 0 && minutesToStart <= 30) {
      items.push({
        id: `${interview.id}:start_30`,
        interviewId: interview.id,
        kind: 'start_30',
        title: 'Interview starts in 30 mins',
        message: `${interview.candidateName} interview starts at ${interview.time}.`,
        severity: 'warning',
        at: interview.date,
      });
    }

    if ((interview.status === 'Scheduled' || interview.status === 'Rescheduled') && now >= end) {
      items.push({
        id: `${interview.id}:completion`,
        interviewId: interview.id,
        kind: 'completion',
        title: 'Interview completed reminder',
        message: `Mark ${interview.candidateName}'s interview as completed and submit feedback.`,
        severity: 'success',
        at: interview.date,
      });
    }

    if (interview.status === 'Completed' && !interview.feedbackSubmittedAt) {
      items.push({
        id: `${interview.id}:feedback`,
        interviewId: interview.id,
        kind: 'feedback',
        title: 'Pending feedback',
        message: `Feedback pending for ${interview.candidateName}.`,
        severity: 'warning',
        at: interview.date,
      });
    }

    return items;
  });
}

function escapeCsvValue(value: unknown): string {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function exportInterviewsCsv(interviews: InterviewRecord[]): string {
  const headers = [
    'Candidate',
    'Job',
    'Round',
    'Interview Type',
    'Date',
    'Time',
    'Duration',
    'Timezone',
    'Interviewer',
    'Status',
    'Meeting Link',
    'Location',
    'Decision',
    'Overall Rating',
  ];

  const rows = interviews.map((item) => [
    item.candidateName,
    item.jobTitle,
    item.round,
    item.interviewType,
    item.date,
    item.time,
    item.duration,
    item.timezone,
    item.interviewer,
    item.status,
    item.meetingLink || '',
    item.location || '',
    item.feedback?.decision || '',
    item.feedback?.overallRating ?? '',
  ]);

  return [headers, ...rows]
    .map((line) => line.map((cell) => escapeCsvValue(cell)).join(','))
    .join('\n');
}

export function triggerCsvDownload(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
