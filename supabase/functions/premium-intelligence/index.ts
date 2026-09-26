import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const text = (value: unknown, max = 240) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

const authUserId = async (request: Request): Promise<string | null> => {
  const token = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !anonKey) return null;
  const client = createClient(supabaseUrl, anonKey);
  const { data: { user }, error } = await client.auth.getUser(token);
  return error ? null : user?.id || null;
};

const callGroq = async (snapshot: Record<string, unknown>) => {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) return null;
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('GROQ_MODEL') || 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: 'Return JSON with summary (one concise sentence) and strengths (2-3 concise strings). Use only supplied facts. Never invent benchmarks, scores, outcomes, or claims.' },
          { role: 'user', content: JSON.stringify(snapshot) },
        ],
        temperature: 0.2,
        max_tokens: 180,
        response_format: { type: 'json_object' },
      }),
    });
    if (!response.ok) {
      console.error('premium-intelligence Groq response:', response.status, await response.text());
      return null;
    }
    const content = (await response.json())?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return null;
    const parsed = JSON.parse(content);
    const summary = text(parsed?.summary, 300);
    const strengths = Array.isArray(parsed?.strengths) ? parsed.strengths.map((item: unknown) => text(item, 140)).filter(Boolean).slice(0, 3) : [];
    return summary ? { summary, strengths, generatedBy: 'ai' as const } : null;
  } catch (error) {
    console.error('premium-intelligence Groq error:', error);
    return null;
  }
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  if (!(await authUserId(request))) return json({ error: 'Your session has expired. Please sign in again.' }, 401);

  const body = await request.json().catch(() => ({}));
  const snapshot = {
    profileStrength: number(body.profileStrength),
    skills: Array.isArray(body.skills) ? body.skills.map((item: unknown) => text(item, 80)).filter(Boolean).slice(0, 20) : [],
    applicationsTotal: number(body.applicationsTotal),
    applicationsLastSevenDays: number(body.applicationsLastSevenDays),
    recruiterViews: number(body.recruiterViews),
    resumeUnlocks: number(body.resumeUnlocks),
    interviewPipeline: number(body.interviewPipeline),
    matchingJobs: number(body.matchingJobs),
    selectedRole: text(body.selectedRole, 80) || 'General',
  };
  const aiResult = await callGroq(snapshot);
  return json(aiResult || {
    summary: `Your ${snapshot.selectedRole} dashboard reflects ${snapshot.applicationsLastSevenDays} applications in the last 7 days and ${snapshot.matchingJobs} matching roles currently available.`,
    strengths: [
      `${snapshot.skills.length} skills are listed on your profile.`,
      `${snapshot.profileStrength}% of tracked profile signals are complete.`,
      `${snapshot.recruiterViews + snapshot.resumeUnlocks} recruiter activity signals were recorded.`,
    ],
    generatedBy: 'rules',
  });
});
