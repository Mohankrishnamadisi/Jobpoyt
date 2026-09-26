import { supabase } from './supabase';

export interface PremiumIntelligenceSnapshot {
  profileStrength: number;
  skills: string[];
  applicationsTotal: number;
  applicationsLastSevenDays: number;
  recruiterViews: number;
  resumeUnlocks: number;
  interviewPipeline: number;
  matchingJobs: number;
  selectedRole: string;
}

export interface PremiumIntelligenceNarrative {
  summary: string;
  strengths: string[];
  generatedBy: 'ai' | 'rules';
}

export const premiumIntelligenceService = {
  async generateNarrative(snapshot: PremiumIntelligenceSnapshot): Promise<PremiumIntelligenceNarrative> {
    const { data, error } = await supabase.functions.invoke('premium-intelligence', {
      body: snapshot,
    });
    if (error) throw error;
    if (data?.error) throw new Error(String(data.error));
    return data as PremiumIntelligenceNarrative;
  },
};
