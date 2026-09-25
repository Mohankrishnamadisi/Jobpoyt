import { supabase } from './supabase';

export type SkillTestQuestion = {
  id: string;
  kind: 'theory' | 'coding';
  question: string;
  options?: string[];
  problem?: string;
  starterCode?: string;
  correctAnswer?: string;
  explanation?: string;
  expectedApproach?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  marks: 3 | 8;
};

export type SkillTestResult = {
  theoryScore: number;
  codingScore: number;
  totalScore: number;
  correctTheory: number;
  wrongTheory: number;
  codingEvaluations: Array<{ id: string; score: number; feedback: string }>;
  insights?: {
    strengths: string[];
    areasToImprove: string[];
    recommendedPractice: string[];
  };
};

export type SkillTestAttempt = {
  id: string;
  test_date: string;
  mode: 'profile' | 'custom';
  skill_focus: string;
  status: 'generated' | 'in_progress' | 'completed';
  generated_at: string;
  submitted_at?: string | null;
  questions?: SkillTestQuestion[];
  answers?: Record<string, string>;
  result?: SkillTestResult | null;
};

const invoke = async (body: Record<string, unknown>) => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session?.access_token) throw new Error('Please sign in to use Skill Test.');
  const { data, error } = await supabase.functions.invoke('skill-test', {
    body: { ...body, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
  });
  if (error) {
    const responseContext = 'context' in error ? error.context : null;
    if (responseContext instanceof Response) {
      if (responseContext.status === 404) {
        throw new Error('Skill Test service is not deployed in Supabase yet. Deploy the skill-test Edge Function first.');
      }
      let responseMessage: string | null = null;
      try {
        const payload = await responseContext.clone().json();
        responseMessage = payload?.message || payload?.error ? String(payload.message || payload.error) : null;
      } catch {
        // Fall through to the SDK error when the response is not JSON.
      }
      if (responseMessage) throw new Error(responseMessage);
    }
    throw error;
  }
  if (data?.error) throw new Error(String(data.error));
  return data as { history?: SkillTestAttempt[]; attempt?: SkillTestAttempt; dailyLocked?: boolean };
};

export const skillTestService = {
  getHistory: async () => (await invoke({ action: 'history' })).history || [],
  getResultReview: async (attemptId: string) => {
    const { data, error } = await supabase
      .from('skill_test_attempts')
      .select('questions, answers')
      .eq('id', attemptId)
      .single();
    if (error) throw error;
    return data as Pick<SkillTestAttempt, 'questions' | 'answers'>;
  },
  generate: async (mode: 'profile' | 'custom', customSkill?: string) => {
    const response = await invoke({ action: 'generate', mode, customSkill });
    if (!response.attempt) throw new Error('No Skill Test was generated.');
    return response.attempt;
  },
  submit: async (answers: Record<string, string>) => {
    const response = await invoke({ action: 'submit', answers });
    if (!response.attempt) throw new Error('Skill Test submission failed.');
    return response.attempt;
  },
};
