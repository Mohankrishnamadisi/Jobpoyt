import { supabase } from './supabase';
import { userService } from './api';

export interface LearningVideo {
  id?: string;
  search_key: string;
  video_id: string;
  title: string;
  description: string;
  thumbnail_url?: string | null;
  channel_name?: string | null;
  published_at?: string | null;
  video_url: string;
  embed_url: string;
  source_platform: string;
  created_at?: string;
  updated_at?: string;
}

export interface LearningProfile {
  name: string;
  skills: string[];
  technologies: string[];
  role: string;
  experience: string;
}

export class LearningVideosError extends Error {
  status: number | null;
  responseBody: unknown;
  kind: 'auth' | 'http' | 'invalid-response' | 'session';

  constructor(
    message: string,
    kind: LearningVideosError['kind'],
    status: number | null = null,
    responseBody: unknown = null,
  ) {
    super(message);
    this.name = 'LearningVideosError';
    this.kind = kind;
    this.status = status;
    this.responseBody = responseBody;
  }
}

const toList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string' || typeof item === 'number') return String(item);
        if (typeof item !== 'object' || item === null) return '';
        const skill = item as Record<string, unknown>;
        return String(skill.name || skill.skill || skill.label || skill.value || '');
      })
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') return value.split(/[,|;\/\n]/).map((item) => item.trim()).filter(Boolean);
  return [];
};

export const learningVideosService = {
  async getProfile(userId: string): Promise<LearningProfile> {
    const profile = await userService.getProfile(userId);
    const profileFields = (profile || {}) as Record<string, unknown>;
    const skills = [
      ...toList(profileFields.skills),
      ...toList(profileFields.technologies),
      ...toList(profileFields.key_skills),
      ...toList(profileFields.technical_skills),
    ];
    const preferredTitles = toList(profileFields.preferred_job_titles);
    return {
      name: String(profile?.full_name || profile?.fullName || profile?.name || 'there'),
      skills: Array.from(new Set(skills)),
      technologies: toList(profileFields.technologies),
      role: String(profile?.current_designation || profile?.currentDesignation || preferredTitles[0] || ''),
      experience: String(profile?.experience || profile?.experience_level || (profile?.is_fresher ? 'fresher' : '')),
    };
  },

  async getVideos(searchKey: string): Promise<LearningVideo[]> {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const session = sessionData.session;

    if (import.meta.env.DEV) {
    }

    if (sessionError) {
      throw new LearningVideosError(sessionError.message, 'session');
    }
    if (!session?.access_token) {
      throw new LearningVideosError('No active Supabase session', 'auth');
    }

    const { data, error, response } = await supabase.functions.invoke('learning-videos', {
      body: { searchKey },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const status = response?.status || (error && 'context' in error && error.context instanceof Response ? error.context.status : null);
    let responseBody: unknown = null;
    const responseContext = error && 'context' in error ? error.context : null;
    if (responseContext instanceof Response) {
      try {
        responseBody = await responseContext.clone().json();
      } catch {
        responseBody = await responseContext.clone().text().catch(() => null);
      }
    }

    if (import.meta.env.DEV) {
    }

    if (error) {
      const backendMessage = typeof responseBody === 'object' && responseBody !== null && 'error' in responseBody
        ? String((responseBody as { error: unknown }).error)
        : error.message;
      const kind = status === 401 || status === 403 ? 'auth' : 'http';
      throw new LearningVideosError(backendMessage, kind, status, responseBody);
    }
    if (typeof data !== 'object' || data === null || !Array.isArray((data as { videos?: unknown }).videos)) {
      throw new LearningVideosError('Learning function returned an invalid response', 'invalid-response', status, data);
    }

    return (data as { videos: LearningVideo[] }).videos;
  },
};
