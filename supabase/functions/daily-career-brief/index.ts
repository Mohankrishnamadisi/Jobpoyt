import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY') || '';
const admin = createClient(supabaseUrl, serviceKey);
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

type JsonRecord = Record<string, any>;
type ActionKey = 'update_profile' | 'find_better_jobs' | 'complete_assessment' | 'mock_interview' | 'improve_resume';
type FocusAction = { id: string; title: string; description: string; actionKey: ActionKey };
type Brief = {
  dateLabel: string;
  source: 'ai' | 'rules';
  summary: string | null;
  summaryCards: Array<{ id: string; label: string; value: string; hint: string }>;
  recommendations: string[];
  alerts: Array<{ id: string; title: string; description: string; suggestedAction: string; actionKey: ActionKey }>;
  focusActions: FocusAction[];
  missingProfileFields: string[];
  upcomingInterviews: number;
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const record = (value: unknown): JsonRecord => value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
const text = (value: unknown, max = 240) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const list = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => typeof item === 'string' ? item.trim() : text(record(item).name || record(item).label)).filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try { return list(JSON.parse(trimmed)); } catch { /* Treat malformed stored JSON as delimited text. */ }
    }
    return trimmed.split(/[,;|\n]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
};
const hasValue = (value: unknown) => Array.isArray(value)
  ? value.length > 0
  : value && typeof value === 'object'
    ? Object.keys(value).length > 0
    : Boolean(text(value));

const authUserId = async (request: Request): Promise<string | null> => {
  const token = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !anonKey) return null;
  const authClient = createClient(supabaseUrl, anonKey);
  const { data: { user }, error } = await authClient.auth.getUser(token);
  return error ? null : user?.id || null;
};

const getDateKey = (timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
};
const getDateLabel = (timeZone: string) => new Intl.DateTimeFormat(undefined, { timeZone, weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());

const callGroq = async (snapshot: JsonRecord): Promise<string | null> => {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) return null;
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('GROQ_MODEL') || 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: 'Write one concise, supportive daily career briefing (2-3 sentences) using only the supplied candidate facts. Do not invent trends, scores, outcomes, benchmarks, skills, opportunities, or causal claims. If data is limited, say so plainly. Return a JSON object with a single string field named summary.' },
          { role: 'user', content: JSON.stringify(snapshot) },
        ],
        temperature: 0.2,
        max_tokens: 220,
        response_format: { type: 'json_object' },
      }),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return null;
    const summary = text(JSON.parse(content)?.summary, 600);
    return summary || null;
  } catch {
    return null;
  }
};

const createBrief = async (userId: string, dateKey: string, timeZone: string): Promise<Brief> => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [profileResult, totalApplications, recentApplications, profileViews, resumeUnlocks, assessments, interviews, resumes, jobs] = await Promise.all([
    admin.from('profiles').select('name,email,current_designation,skills,work_experience').eq('id', userId).maybeSingle(),
    admin.from('job_applications').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    admin.from('job_applications').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('applied_at', sevenDaysAgo),
    admin.from('profile_views').select('id', { count: 'exact', head: true }).eq('candidate_id', userId).gte('viewed_at', thirtyDaysAgo),
    admin.from('resume_unlocks').select('id', { count: 'exact', head: true }).eq('candidate_id', userId).gte('unlocked_at', thirtyDaysAgo),
    admin.from('candidate_assessment_attempts').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed'),
    admin.from('interviews').select('id,date,job_title,company_name,candidate_response', { count: 'exact' }).eq('candidate_id', userId).gte('date', dateKey).order('date', { ascending: true }).limit(10),
    admin.from('resumes').select('id').eq('user_id', userId).limit(1),
    admin.from('jobs').select('id,title,company_name,skills,description,created_at').eq('status', 'published').gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }).limit(200),
  ]);
  if (profileResult.error) throw new Error('Unable to load your candidate profile. Please try again.');

  const profile = record(profileResult.data);
  const skills = list(profile.skills).slice(0, 30);
  const requiredProfileFields = [
    { key: 'name', label: 'name' },
    { key: 'email', label: 'email' },
    { key: 'current_designation', label: 'professional title' },
    { key: 'skills', label: 'skills' },
    { key: 'work_experience', label: 'work experience' },
  ];
  const missingProfileFields = requiredProfileFields.filter((field) => !hasValue(profile[field.key])).map((field) => field.label);
  const interviewRows = interviews.error ? [] : interviews.data || [];
  const interviewCount = interviews.error ? 0 : interviews.count ?? interviewRows.length;
  const matchingJobs = !jobs.error && skills.length
    ? (jobs.data || []).filter((job: JsonRecord) => {
      const searchable = `${list(job.skills).join(' ')} ${text(job.description, 6000)}`.toLowerCase();
      return skills.some((skill) => skill.length > 1 && searchable.includes(skill.toLowerCase()));
    })
    : [];

  const metricValues: Array<[string, string, number | string | null | undefined, string]> = [
    ['applications', 'Applications', totalApplications.count, 'all time'],
    ['recent-applications', 'Applications', recentApplications.count, 'last 7 days'],
    ['matching-jobs', 'Recent listings mentioning your skills', jobs.error || !skills.length ? null : matchingJobs.length, 'among up to 200 published roles · last 30 days'],
    ['profile-views', 'Recruiter profile views', profileViews.count, 'last 30 days'],
    ['resume-unlocks', 'Resume unlocks', resumeUnlocks.count, 'last 30 days'],
    ['assessments', 'Completed assessments', assessments.count, 'all time'],
    ['profile', 'Profile fields complete', requiredProfileFields.length - missingProfileFields.length, `of ${requiredProfileFields.length} tracked fields`],
    ['resume', 'Resume on file', resumes.error ? null : (resumes.data || []).length > 0 ? 'Yes' : 'No', 'saved in Resume Studio'],
    ['interviews', 'Interview invitations', interviews.error ? null : interviewCount, 'dated today or later'],
  ];
  const summaryCards = metricValues.filter(([, , value]) => value !== null && value !== undefined).map(([id, label, value, hint]) => ({ id, label, value: String(value), hint }));
  const focusActions: FocusAction[] = [];
  const recommendations: string[] = [];
  if (missingProfileFields.length) {
    const details = `Your profile is missing ${missingProfileFields.join(', ')}.`;
    focusActions.push({ id: 'profile', title: 'Complete profile details', description: details, actionKey: 'update_profile' });
    recommendations.push(details);
  }
  if (!jobs.error && skills.length && matchingJobs.length) {
    const titles = matchingJobs.slice(0, 3).map((job: JsonRecord) => text(job.title)).filter(Boolean);
    const details = `Among up to 200 published roles from the last 30 days checked, ${matchingJobs.length} mention at least one of your listed skills${titles.length ? `, including ${titles.join(', ')}` : ''}.`;
    focusActions.push({ id: 'jobs', title: 'Review relevant published roles', description: details, actionKey: 'find_better_jobs' });
    recommendations.push(details);
  } else if (!skills.length) {
    recommendations.push('Add your skills to your profile to make skill-based role discovery more useful.');
  } else if (!jobs.error && matchingJobs.length === 0) {
    recommendations.push('No recently published role in the sampled listings mentioned your current profile skills. Review your skills or broaden your search.');
  }
  if ((assessments.count || 0) === 0) {
    const details = 'No completed career assessment is recorded yet.';
    focusActions.push({ id: 'assessment', title: 'Take a career assessment', description: details, actionKey: 'complete_assessment' });
    recommendations.push(details);
  }
  if (interviewCount > 0) {
    const nextInterview = interviewRows[0] as JsonRecord | undefined;
    const details = `${interviewCount} interview invitation${interviewCount === 1 ? '' : 's'} is dated today or later${text(nextInterview?.job_title) ? `; next listed role: ${text(nextInterview?.job_title)}` : ''}.`;
    focusActions.push({ id: 'interview', title: 'Prepare for an interview', description: details, actionKey: 'mock_interview' });
    recommendations.push(details);
  }
  if (!resumes.error && !(resumes.data || []).length) {
    const details = 'No resume is saved in Resume Studio.';
    focusActions.push({ id: 'resume', title: 'Create a resume', description: details, actionKey: 'improve_resume' });
    recommendations.push(details);
  }
  if (!recommendations.length) recommendations.push('Your profile and activity data are available. Review your current applications and update details as they change.');

  const alerts = focusActions.slice(0, 5).map((action) => ({
    id: action.id,
    title: action.title,
    description: action.description,
    suggestedAction: action.title,
    actionKey: action.actionKey,
  }));
  const snapshot = {
    date: dateKey,
    applicationCount: totalApplications.count ?? null,
    applicationsLastSevenDays: recentApplications.count ?? null,
    skillRelatedPublishedRolesLastThirtyDays: jobs.error || !skills.length ? null : matchingJobs.length,
    recruiterProfileViewsLastThirtyDays: profileViews.count ?? null,
    resumeUnlocksLastThirtyDays: resumeUnlocks.count ?? null,
    completedAssessments: assessments.count ?? null,
    upcomingInterviewInvitations: interviews.error ? null : interviewCount,
    profileFieldsMissing: missingProfileFields,
    listedSkills: skills.slice(0, 12),
  };
  const summary = await callGroq(snapshot);
  return {
    dateLabel: getDateLabel(timeZone),
    source: summary ? 'ai' : 'rules',
    summary,
    summaryCards,
    recommendations,
    alerts,
    focusActions: focusActions.slice(0, 4),
    missingProfileFields,
    upcomingInterviews: interviewCount,
  };
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  try {
    const userId = await authUserId(request);
    if (!userId) return json({ error: 'Your session has expired. Please sign in again.' }, 401);
    const { data: subscription } = await admin.from('subscriptions').select('id').eq('user_id', userId).eq('status', 'active').in('plan', ['premium', 'pro']).gt('end_date', new Date().toISOString()).limit(1);
    if (!subscription?.length) return json({ error: 'The AI Daily Career Brief is available to candidates with an active Premium plan.' }, 403);

    const body = await request.json().catch(() => ({}));
    let timeZone = text(body.timeZone, 100) || 'UTC';
    try { new Intl.DateTimeFormat('en-US', { timeZone }); } catch { timeZone = 'UTC'; }
    const dateKey = getDateKey(timeZone);
    const { data: cached, error: cacheError } = await admin.from('daily_career_briefs').select('brief').eq('user_id', userId).eq('date_key', dateKey).maybeSingle();
    if (cacheError) throw new Error('Daily brief storage is not ready. Apply the Supabase migration and try again.');
    if (cached?.brief) return json(cached.brief);

    const brief = await createBrief(userId, dateKey, timeZone);
    const { error: saveError } = await admin.from('daily_career_briefs').upsert({ user_id: userId, date_key: dateKey, brief }, { onConflict: 'user_id,date_key' });
    if (saveError) throw new Error('Unable to save your daily brief. Please try again.');
    return json(brief);
  } catch (error) {
    console.error('daily-career-brief error', error);
    return json({ error: error instanceof Error ? error.message : 'Daily career brief is temporarily unavailable.' }, 500);
  }
});
