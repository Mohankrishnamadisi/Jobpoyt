import { supabase } from './supabase';

export type InviteResponse = 'pending' | 'accepted' | 'declined' | 'reschedule_requested';
export type InviteInterviewStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled' | 'No Show';
export type InterviewPreparationContext = {
  interviewId: string;
  jobId?: string;
  applicationId?: string;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  requiredSkills: string[];
  interviewRound: string;
  interviewDate: string;
  interviewTime: string;
  timezone: string;
  interviewMode: 'Video' | 'Phone' | 'In-person';
  interviewer: string;
};

export type CandidateInterviewInvite = {
  id: string;
  recruiter_id: string;
  candidate_id: string;
  job_id: string | null;
  application_id: string | null;
  job_title: string;
  company_name: string;
  job_description: string;
  required_skills: string[];
  round: string;
  interview_type: 'Video' | 'Phone' | 'In-person';
  date: string;
  time: string;
  duration: number;
  timezone: string;
  meeting_link: string | null;
  location: string | null;
  interviewer: string;
  interviewer_email: string | null;
  recruiter_message: string;
  status: InviteInterviewStatus;
  candidate_response: InviteResponse;
  candidate_response_at: string | null;
  decline_reason: string | null;
  reschedule_date: string | null;
  reschedule_time: string | null;
  reschedule_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  feedback: unknown | null;
  feedback_visible_to_candidate: boolean;
};

const invoke = async <T>(body: Record<string, unknown>): Promise<T> => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Please sign in to view your interview invitations.');

  const { data, error } = await supabase.functions.invoke('candidate-interview-invites', {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) {
    const context = 'context' in error ? error.context : null;
    let responseMessage = '';
    const status = context instanceof Response ? context.status : undefined;
    if (context instanceof Response) {
      try {
        const payload = await context.clone().json();
        responseMessage = String(payload?.error || payload?.message || '');
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message !== 'Unexpected end of JSON input') responseMessage = parseError.message;
      }
    }
    console.error('Candidate interview invite request failed', { action: body.action, errorType: error.name, status, responseMessage });
    if (status === 401) throw new Error('Please sign in to view your interview invitations.');
    if (status === 404) throw new Error('Interview invitations service is not deployed yet.');
    if (responseMessage) throw new Error(responseMessage);
    if (status && status >= 500) throw new Error('Interview invitations are temporarily unavailable. Please try again.');
    if (error.name === 'FunctionsFetchError' || error.name === 'FunctionsRelayError') {
      throw new Error('Interview invitations are temporarily unavailable. Please try again.');
    }
    throw error;
  }
  if (data?.error) throw new Error(String(data.error));
  return data as T;
};

export const candidateInterviewInvitesService = {
  list: () => invoke<{ interviews: CandidateInterviewInvite[] }>({ action: 'list' }),
  respond: (interviewId: string, response: Exclude<InviteResponse, 'pending'>, options: { reason?: string; date?: string; time?: string; message?: string } = {}) =>
    invoke<{ interview: CandidateInterviewInvite }>({ action: 'respond', interviewId, response, ...options }),
  notifyCandidate: (interviewId: string) => invoke<{ notified: boolean }>({ action: 'notify_candidate', interviewId }),
};
