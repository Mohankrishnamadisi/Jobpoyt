import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY') || '';
const supabase = createClient(supabaseUrl, serviceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

type Question = {
  id: string;
  kind: 'theory' | 'coding';
  question: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  problem?: string;
  starterCode?: string;
  expectedApproach?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  marks: 3 | 8;
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const normalizeSkills = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(normalizeSkills);
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    return normalizeSkills(record.name || record.label || record.title || record.value);
  }
  if (typeof value !== 'string') return [];
  const text = value.trim();
  if (text.startsWith('[') && text.endsWith(']')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.flatMap(normalizeSkills);
    } catch {
      // Legacy delimited value.
    }
  }
  return text.split(/[,|;\/\n]/).map((item) => item.trim()).filter(Boolean);
};

const testDateFor = (timeZone: string): string => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

const authUserId = async (request: Request): Promise<string | null> => {
  const token = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (!anonKey) throw new Error('Supabase authentication is not configured on the server.');
  const authClient = createClient(supabaseUrl, anonKey);
  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error) return null;
  return user?.id || null;
};

const callGroq = async (messages: Array<{ role: string; content: string }>, maxTokens: number) => {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) throw new Error('Groq is not configured on the server.');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: Deno.env.get('GROQ_MODEL') || 'openai/gpt-oss-20b',
      messages,
      temperature: 0.35,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) throw new Error(`Groq request failed (${response.status}).`);
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq returned an empty response.');
  try {
    return JSON.parse(content);
  } catch {
    throw new Error('Groq returned invalid assessment JSON.');
  }
};

const stripAnswers = (questions: Question[]) => questions.map(({ correctAnswer: _answer, explanation: _explanation, expectedApproach: _approach, ...question }) => question);
const validateQuestions = (questions: unknown): Question[] => {
  if (!Array.isArray(questions) || questions.length !== 25) throw new Error('The generated test did not contain exactly 25 questions.');
  const normalized = questions.map((item, index) => {
    const value = item as Record<string, unknown>;
    const isCoding = value.kind === 'coding' || index >= 20;
    const question: Question = {
      id: String(value.id || `q${index + 1}`),
      kind: isCoding ? 'coding' : 'theory',
      question: String(value.question || ''),
      difficulty: value.difficulty === 'Easy' || value.difficulty === 'Hard' ? value.difficulty : 'Medium',
      marks: isCoding ? 8 : 3,
      ...(isCoding ? {
        problem: String(value.problem || value.question || ''),
        starterCode: String(value.starterCode || ''),
        expectedApproach: String(value.expectedApproach || ''),
      } : {
        options: Array.isArray(value.options) ? value.options.map(String).slice(0, 4) : [],
        correctAnswer: String(value.correctAnswer || ''),
        explanation: String(value.explanation || ''),
      }),
    };
    if (!question.question || (!isCoding && question.options?.length !== 4) || (isCoding && !question.problem)) throw new Error(`Question ${index + 1} is incomplete.`);
    return question;
  });
  if (normalized.slice(0, 20).some((question) => question.kind !== 'theory') || normalized.slice(20).some((question) => question.kind !== 'coding')) throw new Error('The generated test sections are invalid.');
  return normalized;
};

const generateQuestions = async (skills: string[], skillFocus: string) => {
  const prompt = `You are a senior technical assessment author. Generate a candidate-specific assessment for these skills: ${skills.join(', ')}. Focus: ${skillFocus}. Return JSON only with key questions.
Rules: exactly 25 questions; first exactly 20 are theory multiple-choice with exactly 4 options, correctAnswer as the option letter A/B/C/D, explanation, difficulty and 3 marks; final exactly 5 are genuinely technical coding/debugging/implementation questions with problem, starterCode where useful, expectedApproach, difficulty and 8 marks. Total is exactly 100 marks. Difficulty distribution should be approximately 25% Easy, 50% Medium, 25% Hard. Avoid duplicates and generic unrelated questions. Use the selected skills intelligently, include practical reasoning, debugging, performance and architecture where relevant. Never omit required fields.
Schema: {"questions":[{"id":"q1","kind":"theory|coding","question":"...","options":["...","...","...","..."],"correctAnswer":"A","explanation":"...","problem":"...","starterCode":"...","expectedApproach":"...","difficulty":"Easy|Medium|Hard","marks":3} ]}`;
  const configuredTokens = Number(Deno.env.get('GROQ_MAX_TOKENS') || 1600);
  const result = await callGroq([{ role: 'system', content: 'Return only valid JSON.' }, { role: 'user', content: prompt }], Math.max(configuredTokens, 12000));
  return validateQuestions(result.questions);
};

const evaluateCoding = async (codingQuestions: Question[], answers: Record<string, string>) => {
  if (codingQuestions.length === 0) return { evaluations: [], insights: null };
  const prompt = `Evaluate these candidate coding answers with a strict but fair rubric. Return JSON only: {"evaluations":[{"id":"question id","score":0,"feedback":"..."}],"insights":{"strengths":["..."],"areasToImprove":["..."],"recommendedPractice":["..."]}}. Each score must be an integer from 0 to 8. Rubric: correctness 0-3, logic/technical understanding 0-2, edge cases 0-1, code quality 0-1, relevance/completeness 0-1. Do not award full marks for empty or unrelated answers. Insights must refer to the submitted answers and observed performance, not generic advice.
${JSON.stringify(codingQuestions.map((question) => ({ id: question.id, problem: question.problem, expectedApproach: question.expectedApproach, answer: answers[question.id] || '' })))} `;
  const result = await callGroq([{ role: 'system', content: 'Return only valid JSON.' }, { role: 'user', content: prompt }], 3000);
  return {
    evaluations: Array.isArray(result.evaluations) ? result.evaluations : [],
    insights: result.insights || null,
  };
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const userId = await authUserId(request);
    if (!userId) return json({ error: 'Authentication required.' }, 401);
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'history');
    const timeZone = String(body.timeZone || 'UTC');
    const testDate = testDateFor(timeZone);

    if (action === 'history') {
      const { data, error } = await supabase.from('skill_test_attempts').select('id, test_date, mode, skill_focus, status, questions, result, generated_at, submitted_at').eq('user_id', userId).order('test_date', { ascending: false }).limit(30);
      if (error) throw error;
      return json({ history: (data || []).map((item) => ({ ...item, questions: stripAnswers(item.questions || []) })) });
    }

    const { data: existing, error: existingError } = await supabase.from('skill_test_attempts').select('*').eq('user_id', userId).eq('test_date', testDate).maybeSingle();
    if (existingError) throw existingError;

    if (action === 'generate') {
      if (existing) return json({ attempt: { ...existing, questions: stripAnswers(existing.questions || []) }, dailyLocked: true });
      const { data: profile, error: profileError } = await supabase.from('profiles').select('skills, current_designation, preferred_job_titles').eq('id', userId).single();
      if (profileError) throw profileError;
      const profileSkills = normalizeSkills(profile?.skills);
      const mode = body.mode === 'custom' ? 'custom' : 'profile';
      const customSkill = String(body.customSkill || '').trim();
      const skills = mode === 'custom' && customSkill ? [customSkill] : profileSkills;
      if (skills.length === 0) return json({ error: 'No skills found. Please update your profile before generating a personalized test.' }, 400);
      const skillFocus = mode === 'custom' ? customSkill : [...skills, profile?.current_designation, ...normalizeSkills(profile?.preferred_job_titles)].filter(Boolean).join(', ');
      const questions = await generateQuestions(skills, skillFocus);
      const { data: inserted, error } = await supabase.from('skill_test_attempts').insert({ user_id: userId, test_date: testDate, mode, skill_focus: skillFocus, candidate_skills: skills, questions, status: 'generated' }).select('*').single();
      if (error) throw error;
      return json({ attempt: { ...inserted, questions: stripAnswers(questions) }, dailyLocked: true });
    }

    if (action === 'submit') {
      if (!existing) return json({ error: 'No generated test exists for today.' }, 400);
      if (existing.status === 'completed') return json({ attempt: existing });
      const questions = validateQuestions(existing.questions);
      const answers = (body.answers || {}) as Record<string, string>;
      const theory = questions.slice(0, 20);
      const coding = questions.slice(20);
      const correctTheory = theory.filter((question) => String(answers[question.id] || '').toUpperCase() === String(question.correctAnswer || '').toUpperCase()).length;
      const codingEvaluation = await evaluateCoding(coding, answers);
      const codingEvaluations = codingEvaluation.evaluations;
      const codingScore = codingEvaluations.reduce((sum: number, item: { score?: number }) => sum + Math.max(0, Math.min(8, Number(item.score) || 0)), 0);
      const theoryScore = correctTheory * 3;
      const totalScore = theoryScore + codingScore;
      const result = { theoryScore, codingScore, totalScore, correctTheory, wrongTheory: theory.length - correctTheory, codingEvaluations, insights: codingEvaluation.insights || { strengths: [`You answered ${correctTheory} of 20 theory questions correctly.`], areasToImprove: codingScore < 24 ? ['Practice coding accuracy and edge-case handling.'] : ['Keep extending your practical problem-solving depth.'], recommendedPractice: ['Review missed theory concepts and revisit each coding solution.'] } };
      const { data: updated, error } = await supabase.from('skill_test_attempts').update({ answers, result, status: 'completed', submitted_at: new Date().toISOString() }).eq('id', existing.id).eq('user_id', userId).select('*').single();
      if (error) throw error;
      return json({ attempt: updated });
    }

    return json({ error: 'Unsupported action.' }, 400);
  } catch (error) {
    console.error('skill-test error', error);
    return json({ error: error instanceof Error ? error.message : 'Skill Test request failed.' }, 500);
  }
});
