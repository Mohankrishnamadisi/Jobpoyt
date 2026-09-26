import { supabase } from './supabase';

export type CareerAssistantRole = 'user' | 'assistant';
export type CareerAssistantCategory =
  | 'job_search'
  | 'career_advice'
  | 'resume'
  | 'interview'
  | 'assessment'
  | 'applications'
  | 'jobpoyt'
  | 'technical'
  | 'general'
  | 'current';

export type CareerAssistantJob = {
  id: string;
  title: string;
  companyName: string;
  location: string;
  workMode: string;
  experience: string;
  salary: string;
  matchedSkills: string[];
  postedAt: string;
};

export type CareerAssistantAction = {
  label: string;
  route: string;
};

export type CareerAssistantReply = {
  answer: string;
  category: CareerAssistantCategory;
  jobs: CareerAssistantJob[];
  actions: CareerAssistantAction[];
};

export type CareerAssistantMessage = {
  role: CareerAssistantRole;
  content: string;
};

export const careerAssistantService = {
  async ask(message: string, history: CareerAssistantMessage[]): Promise<CareerAssistantReply> {
    const { data, error } = await supabase.functions.invoke('career-assistant', {
      body: { message, history },
    });

    if (error) {
      const status = 'context' in error && error.context instanceof Response
        ? error.context.status
        : 0;
      if (status === 401) throw new Error('Your session has expired. Please sign in again.');
      if (status === 429) throw new Error('The assistant is busy right now. Please try again in a moment.');
      throw new Error('Sorry, I could not process that right now. Please try again.');
    }
    if (data?.error) {
      if (data.status === 401) throw new Error('Your session has expired. Please sign in again.');
      throw new Error('Sorry, I could not process that right now. Please try again.');
    }
    if (typeof data?.answer !== 'string' || !data.answer.trim()) {
      throw new Error('The assistant returned an empty response. Please try again.');
    }
    return data as CareerAssistantReply;
  },
};