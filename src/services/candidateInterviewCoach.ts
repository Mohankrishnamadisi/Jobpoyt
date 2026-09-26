import { supabase } from './supabase';

export type InterviewPracticeType = 'HR' | 'Technical' | 'Behavioral' | 'Managerial' | 'Mixed';
export type InterviewDifficulty = 'Easy' | 'Medium' | 'Hard';
export type InterviewSessionStatus = 'setup' | 'in_progress' | 'completed' | 'abandoned';

export type InterviewQuestion = {
  id: string;
  question: string;
  focus?: string;
};

export type InterviewAnswer = {
  questionId: string;
  question: string;
  answer: string;
  evaluation?: {
    communication: number;
    technicalDepth: number | null;
    relevance: number;
    problemSolving: number;
    structure: number;
    strengths: string[];
    improvements: string[];
    star?: { situation: boolean; task: boolean; action: boolean; result: boolean };
    exampleImprovedAnswer?: string;
  };
};

export type InterviewSession = {
  id: string;
  jobId: string | null;
  jobTitle: string;
  companyName: string | null;
  interviewType: InterviewPracticeType;
  experienceLevel: string;
  difficulty: InterviewDifficulty;
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  currentQuestion: number;
  status: InterviewSessionStatus;
  score: number | null;
  categoryScores: Record<string, number>;
  feedback: {
    strengths: string[];
    improvements: string[];
    recommendations: string[];
    coachRecommendation: string;
    nextPractice: string;
  } | null;
  createdAt: string;
  completedAt: string | null;
};

export type InterviewJobOption = {
  id: string;
  title: string;
  companyName: string;
  description: string;
  skills: string[];
  experience: string;
  applicationId?: string;
};

export type CandidateInterviewDashboard = {
  profile: { name: string; designation: string; experience: string; skills: string[] };
  applications: InterviewJobOption[];
  savedJobs: InterviewJobOption[];
  sessions: InterviewSession[];
  activeSession: InterviewSession | null;
  completedToday: InterviewSession | null;
  stats: { completed: number; streakDays: number };
  coach: { strengths: string[]; improvement: string; recommendedPractice: string };
};

export type StartInterviewOptions = {
  source: 'application' | 'saved' | 'manual';
  preparationInviteId?: string;
  applicationId?: string;
  jobId?: string;
  jobTitle?: string;
  companyName?: string;
  jobDescription?: string;
  interviewType: InterviewPracticeType;
  experienceLevel: string;
  difficulty: InterviewDifficulty;
};

export type InterviewQuestionBankResult = {
  questions: Array<{ id: string; question: string; focus: string }>;
};

const invoke = async <T>(body: Record<string, unknown>): Promise<T> => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Sign in again to use AI Interview Coach.');

  const { data, error } = await supabase.functions.invoke('candidate-interview-coach', {
    body: { ...body, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) {
    const context = 'context' in error ? error.context : null;
    const status = context instanceof Response ? context.status : undefined;
    const cause = context instanceof Error ? { name: context.name, message: context.message } : undefined;
    console.error('Interview Coach Edge Function request failed', {
      action: body.action || 'unknown',
      errorType: error.name,
      status,
      cause,
    });
    if (context instanceof Response) {
      let responseMessage = '';
      try {
        const payload = await context.clone().json();
        responseMessage = String(payload?.error || payload?.message || '');
      } catch {
        // Keep using the HTTP status when the gateway response is not JSON.
      }
      if (context.status === 401) throw new Error('Your sign-in session has expired. Please sign in again.');
      if (context.status === 404) throw new Error('Interview preparation service is not deployed to the configured Supabase project yet.');
      if (context.status >= 500) throw new Error('Interview preparation service is temporarily unavailable. Please try again.');
      if (responseMessage) throw new Error(responseMessage);
    }
    if (error.name === 'FunctionsFetchError' || error.name === 'FunctionsRelayError') {
      throw new Error('Interview preparation service is temporarily unavailable. Please try again.');
    }
    throw error;
  }
  if (data?.error) throw new Error(String(data.error));
  return data as T;
};

export const candidateInterviewCoachService = {
  dashboard: () => invoke<CandidateInterviewDashboard>({ action: 'dashboard' }),
  start: (options: StartInterviewOptions) => invoke<{ session: InterviewSession; resumed: boolean }>({ action: 'start', ...options }),
  resume: (sessionId: string) => invoke<{ session: InterviewSession }>({ action: 'resume', sessionId }),
  answer: (sessionId: string, questionId: string, answer: string) => invoke<{ session: InterviewSession }>({ action: 'answer', sessionId, questionId, answer }),
  coach: (sessionId: string, questionId: string) => invoke<{ session: InterviewSession }>({ action: 'coach', sessionId, questionId }),
  abandon: (sessionId: string) => invoke<{ abandoned: boolean }>({ action: 'abandon', sessionId }),
  questionBank: (options: Pick<StartInterviewOptions, 'applicationId' | 'jobTitle' | 'jobDescription' | 'interviewType' | 'experienceLevel' | 'difficulty' | 'jobId' | 'source'>) =>
    invoke<InterviewQuestionBankResult>({ action: 'question_bank', ...options }),
  answerTips: (question: string, jobTitle: string, interviewType: InterviewPracticeType) =>
    invoke<{ tips: string[] }>({ action: 'answer_tips', question, jobTitle, interviewType }),
};