import { supabase } from './supabase';

export type CandidateAssessmentKey = 'job-readiness' | 'workplace-communication' | 'problem-solving' | 'situational-judgment' | 'aptitude-analytical' | 'role-based' | 'career-readiness';
export type CandidateAssessmentDifficulty = 'Easy' | 'Medium' | 'Hard';
export type CandidateQuestionType = 'single_choice' | 'multiple_select' | 'short_response';
export type CandidateAssessmentQuestion = {
  id: string;
  type: CandidateQuestionType;
  competency: string;
  difficulty: CandidateAssessmentDifficulty;
  question: string;
  options?: string[];
  points: number;
};
export type CandidateCompetencyScore = { name: string; score: number; earned?: number; possible?: number };
export type CandidateAssessmentInsights = { strengths: string[]; improvements: string[]; nextStep: string; shortEvaluations?: Array<{ id: string; feedback: string }> };
export type CandidateAssessmentAttempt = {
  id: string;
  assessmentKey: CandidateAssessmentKey;
  assessmentType: string;
  title: string;
  role: string;
  difficulty: CandidateAssessmentDifficulty;
  blueprint: { competencies: Array<{ name: string; weight: number }>; durationMin: number; questionCount: number };
  questions: CandidateAssessmentQuestion[];
  answers: Record<string, string | string[]>;
  currentQuestion: number;
  status: 'in_progress' | 'completed';
  score: number | null;
  competencyScores: CandidateCompetencyScore[];
  scoreDetails: AssessmentCertificate['scoreDetails'];
  insights: CandidateAssessmentInsights;
  readinessLevel: 'Strong' | 'Developing' | 'Building' | null;
  startedAt: string;
  completedAt: string | null;
};
export type RecommendedAssessment = {
  key: CandidateAssessmentKey;
  role: string;
  title: string;
  category: string;
  description: string;
  difficulty: CandidateAssessmentDifficulty;
  questionCount: number;
  durationMin: number;
  points: number;
};
export type CandidateAssessmentDashboard = {
  stats: { taken: number; passed: number; average: number; certificates: number };
  role: string;
  recommended: RecommendedAssessment[];
  recent: CandidateAssessmentAttempt[];
  active: CandidateAssessmentAttempt | null;
  insights: { strongest: { name: string; score: number } | null; developing: { name: string; score: number } | null; suggested: CandidateAssessmentKey };
  achievements: Array<{ id: string; title: string; score: number; date: string }>;
};
export type AssessmentCertificate = {
  id: string;
  certificateId: string;
  verificationId: string;
  candidateName: string;
  assessmentTitle: string;
  assessmentType: string;
  assessmentCategory: string;
  difficulty: CandidateAssessmentDifficulty;
  score: number;
  maxScore: number;
  competencyScores: CandidateCompetencyScore[];
  scoreDetails: { totalQuestions?: number; answered?: number; correct?: number; incorrect?: number; skipped?: number; difficultyBreakdown?: Record<CandidateAssessmentDifficulty, number>; durationMinutes?: number };
  insights: CandidateAssessmentInsights;
  completionDate: string;
  issueDate: string;
  status: 'Eligible' | 'Issued' | 'Revoked' | 'issued';
  scorecard?: { competencyScores: CandidateCompetencyScore[]; scoreDetails: AssessmentCertificate['scoreDetails']; insights: CandidateAssessmentInsights };
};

const invoke = async <T>(body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke('career-assessments', { body });
  if (error) {
    const context = 'context' in error ? error.context : null;
    if (context instanceof Response) {
      try {
        const payload = await context.clone().json();
        if (payload?.error) throw new Error(String(payload.error));
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message !== 'Unexpected end of JSON input') throw parseError;
      }
    }
    throw error;
  }
  if (data?.error) throw new Error(String(data.error));
  return data as T;
};

export const candidateAssessmentService = {
  dashboard: () => invoke<CandidateAssessmentDashboard>({ action: 'dashboard' }),
  start: (assessmentKey: CandidateAssessmentKey, difficulty: CandidateAssessmentDifficulty, role = '') =>
    invoke<{ attempt: CandidateAssessmentAttempt; resumed: boolean }>({ action: 'start', assessmentKey, difficulty, role }),
  saveProgress: (attemptId: string, answers: Record<string, string | string[]>, currentQuestion: number) =>
    invoke<{ saved: boolean }>({ action: 'progress', attemptId, answers, currentQuestion }),
  submit: (attemptId: string, answers: Record<string, string | string[]>) =>
    invoke<{ attempt: CandidateAssessmentAttempt; alreadyCompleted?: boolean }>({ action: 'submit', attemptId, answers }),
  certificates: () => invoke<{ certificates: AssessmentCertificate[]; stats: { earned: number; assessmentsCompleted: number; averageScore: number; latestIssueDate: string | null } }>({ action: 'certificates' }),
  verifyCertificate: (verificationId: string) => invoke<{ verified: boolean; certificate: Pick<AssessmentCertificate, 'certificateId' | 'assessmentTitle' | 'assessmentCategory' | 'candidateName' | 'score' | 'maxScore' | 'issueDate' | 'status'> }>({ action: 'verify', verificationId }),
};
