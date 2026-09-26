import { supabase } from './supabase';

export interface DailyCareerBriefContext {
  userName?: string;
}

export interface BriefSummaryCard {
  id: string;
  label: string;
  value: string;
  hint: string;
}

export interface OpportunityAlert {
  id: string;
  title: string;
  description: string;
  suggestedAction: string;
  actionKey: BriefActionKey;
}

export interface FocusAction {
  id: string;
  title: string;
  description: string;
  actionKey: BriefActionKey;
}

export interface DailyCareerBrief {
  dateLabel: string;
  source: 'ai' | 'rules';
  summary: string | null;
  summaryCards: BriefSummaryCard[];
  recommendations: string[];
  alerts: OpportunityAlert[];
  focusActions: FocusAction[];
  missingProfileFields: string[];
  upcomingInterviews: number;
}

export type BriefActionKey =
  | 'improve_resume'
  | 'find_better_jobs'
  | 'ai_career_coach'
  | 'mock_interview'
  | 'resume_review'
  | 'complete_assessment'
  | 'update_profile'
  | 'apply_jobs'
  | 'improve_skills'
  | 'open_notifications';

export interface AiDailyCareerBriefProvider {
  generateBrief(context: DailyCareerBriefContext): Promise<DailyCareerBrief>;
}

const dailyCareerBriefProvider: AiDailyCareerBriefProvider = {
  async generateBrief() {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const token = sessionData.session?.access_token;
    if (!token) {
      throw new Error('Please sign in to view your daily career brief.');
    }

    const { data, error } = await supabase.functions.invoke('daily-career-brief', {
      body: { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      headers: { Authorization: `Bearer ${token}` },
    });
    if (error) {
      const response = 'context' in error && error.context instanceof Response ? error.context : null;
      if (response) {
        try {
          const payload = await response.clone().json();
          if (payload?.error) throw new Error(String(payload.error));
        } catch (parseError) {
          if (parseError instanceof Error && parseError.message !== 'Unexpected end of JSON input') throw parseError;
        }
      }
      throw error;
    }
    if (data?.error) throw new Error(String(data.error));
    return data as DailyCareerBrief;
  },
};

export const aiDailyCareerBriefService = dailyCareerBriefProvider;
