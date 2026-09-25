import { supabase } from './supabase';

export type ResumeTemplate = 'professional' | 'modern' | 'executive' | 'minimal' | 'technical';
export type ResumeExperience = {
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
};
export type ResumeData = {
  personal: { fullName: string; title: string; email: string; phone: string; location: string; linkedin: string; github: string; portfolio: string };
  summary: string;
  experience: ResumeExperience[];
  skills: string[];
  education: Array<{ degree: string; institution: string; location: string; startDate: string; endDate: string; grade: string }>;
  projects: Array<{ name: string; role: string; description: string; technologies: string[]; url: string }>;
  certifications: Array<{ name: string; issuer: string; issueDate: string; credentialId: string; url: string }>;
  customSections: Array<{ title: string; items: string[] }>;
};
export type ResumeRecord = {
  id: string;
  name: string;
  version_name: string;
  template: ResumeTemplate;
  source: 'profile' | 'upload' | 'tailor';
  status: 'building' | 'ready';
  build_date: string;
  target_job_id?: string | null;
  target_job_title?: string | null;
  target_company?: string | null;
  target_job_description?: string | null;
  ats_friendly?: boolean;
  ats_analysis?: { scores?: Record<string, number>; strengths?: string[]; improvements?: string[]; matchedSkills?: string[]; notFoundInResume?: string[]; keywords?: string[]; suggestions?: string[] } | null;
  cover_letter?: string;
  resume_data: ResumeData;
  tailored_resume_data?: ResumeData | null;
  tailored_version_name?: string | null;
  tailored_ats_analysis?: ResumeRecord['ats_analysis'];
  updated_at: string;
  created_at: string;
};
type ResumeDashboard = { resumes: ResumeRecord[]; buildDate: string; buildAvailable: boolean; missingProfileInfo?: string[] };
type ResumeTarget = { jobId?: string; title?: string; company?: string; description?: string };

const invoke = async <T>(body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke('resume-studio', {
    body: { ...body, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  });
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

export const resumeBuilderService = {
  load: () => invoke<ResumeDashboard>({ action: 'dashboard' }),
  create: (source: 'profile' | 'upload' | 'tailor', template: ResumeTemplate, options: { resumeText?: string; target?: ResumeTarget; resumeId?: string } = {}) =>
    invoke<{ resume: ResumeRecord; buildDate: string; buildAvailable: boolean }>({ action: 'create', source, template, ...options }),
  tailorExisting: (resumeId: string, target: ResumeTarget) => invoke<{ resume: ResumeRecord }>({ action: 'tailor_existing', resumeId, target }),
  save: (resumeId: string, resumeData: ResumeData, options: { name: string; template: ResumeTemplate; atsFriendly: boolean; coverLetter: string; target: ResumeTarget; atsAnalysis?: ResumeRecord['ats_analysis']; variant: 'master' | 'tailored' }) =>
    invoke<{ resume: ResumeRecord }>({ action: 'save', resumeId, resumeData, ...options }),
  ai: (aiAction: string, resumeData: ResumeData, options: { value?: string; style?: string; jobDescription?: string; target?: ResumeTarget } = {}) =>
    invoke<Record<string, any>>({ action: 'ai', aiAction, resumeData, ...options }),
};
