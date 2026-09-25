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

type Difficulty = 'Easy' | 'Medium' | 'Hard';
type AssessmentKey = 'job-readiness' | 'workplace-communication' | 'problem-solving' | 'situational-judgment' | 'aptitude-analytical' | 'role-based' | 'career-readiness';
type QuestionType = 'single_choice' | 'multiple_select' | 'short_response';
type Competency = { name: string; weight: number };
type AssessmentBlueprint = { key: AssessmentKey; title: string; category: string; description: string; questionCount: number; durationMin: number; competencies: Competency[]; mix: Record<QuestionType, number> };
type AssessmentQuestion = { id: string; type: QuestionType; competency: string; difficulty: Difficulty; question: string; options?: string[]; correctAnswer?: string; correctAnswers?: string[]; explanation?: string; points: number; rubric?: string; evaluationCriteria?: string[] };
type RecordValue = Record<string, unknown>;
type ScoreDetails = { totalQuestions: number; answered: number; correct: number; incorrect: number; skipped: number; difficultyBreakdown: Record<Difficulty, number>; durationMinutes: number };

const BLUEPRINTS: Record<AssessmentKey, AssessmentBlueprint> = {
  'job-readiness': { key: 'job-readiness', title: 'Job Readiness Assessment', category: 'Job Readiness', description: 'Real-world work decisions, ownership, collaboration and delivery judgment.', questionCount: 25, durationMin: 35, competencies: [{ name: 'Problem Solving', weight: 20 }, { name: 'Investigation & Debugging', weight: 20 }, { name: 'Professional Judgment', weight: 20 }, { name: 'Review & Quality', weight: 15 }, { name: 'Collaboration', weight: 15 }, { name: 'Delivery & Ownership', weight: 10 }], mix: { single_choice: 19, multiple_select: 3, short_response: 3 } },
  'workplace-communication': { key: 'workplace-communication', title: 'Workplace Communication Assessment', category: 'Workplace Communication', description: 'Professional writing, clarification, feedback and stakeholder communication.', questionCount: 20, durationMin: 25, competencies: [{ name: 'Clear Communication', weight: 30 }, { name: 'Collaboration', weight: 25 }, { name: 'Conflict Handling', weight: 20 }, { name: 'Professional Writing', weight: 15 }, { name: 'Stakeholder Management', weight: 10 }], mix: { single_choice: 13, multiple_select: 2, short_response: 5 } },
  'problem-solving': { key: 'problem-solving', title: 'Problem Solving & Analytical Reasoning', category: 'Problem Solving', description: 'Structured reasoning, analysis, prioritization and root-cause thinking.', questionCount: 25, durationMin: 30, competencies: [{ name: 'Logical Reasoning', weight: 30 }, { name: 'Analytical Thinking', weight: 25 }, { name: 'Decision Making', weight: 25 }, { name: 'Root Cause Analysis', weight: 20 }], mix: { single_choice: 19, multiple_select: 4, short_response: 2 } },
  'situational-judgment': { key: 'situational-judgment', title: 'Situational Judgment Assessment', category: 'Situational Judgment', description: 'Practical choices under competing priorities, pressure and changing context.', questionCount: 20, durationMin: 25, competencies: [{ name: 'Prioritization', weight: 25 }, { name: 'Decision Making', weight: 25 }, { name: 'Ownership', weight: 25 }, { name: 'Professional Judgment', weight: 25 }], mix: { single_choice: 15, multiple_select: 3, short_response: 2 } },
  'aptitude-analytical': { key: 'aptitude-analytical', title: 'Aptitude & Analytical Reasoning', category: 'Aptitude & Analytical Reasoning', description: 'Numerical reasoning, data interpretation, patterns and critical thinking.', questionCount: 25, durationMin: 30, competencies: [{ name: 'Numerical Reasoning', weight: 30 }, { name: 'Data Interpretation', weight: 25 }, { name: 'Logical Reasoning', weight: 25 }, { name: 'Critical Thinking', weight: 20 }], mix: { single_choice: 21, multiple_select: 3, short_response: 1 } },
  'role-based': { key: 'role-based', title: 'Role-Based Assessment', category: 'Role-Based Assessment', description: 'Role-context workplace scenarios and professional decisions, not a technical knowledge quiz.', questionCount: 25, durationMin: 35, competencies: [{ name: 'Role Problem Solving', weight: 25 }, { name: 'Decision Making', weight: 25 }, { name: 'Collaboration', weight: 20 }, { name: 'Quality & Risk Judgment', weight: 15 }, { name: 'Communication & Ownership', weight: 15 }], mix: { single_choice: 19, multiple_select: 3, short_response: 3 } },
  'career-readiness': { key: 'career-readiness', title: 'Career Readiness Assessment', category: 'Career Readiness', description: 'Workplace adaptability, communication, collaboration and professional ownership.', questionCount: 20, durationMin: 25, competencies: [{ name: 'Adaptability', weight: 20 }, { name: 'Problem Solving', weight: 20 }, { name: 'Communication', weight: 20 }, { name: 'Collaboration', weight: 20 }, { name: 'Ownership', weight: 20 }], mix: { single_choice: 14, multiple_select: 2, short_response: 4 } },
};
const ROLE_OPTIONS = ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'UI Developer', 'QA Engineer', 'Data Analyst', 'Software Engineer', 'Product Designer', 'Product Manager', 'Customer Success Specialist', 'Project Coordinator'];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const record = (value: unknown): RecordValue => value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
const text = (value: unknown, max = 1000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const validDifficulty = (value: unknown): Difficulty => value === 'Easy' || value === 'Hard' ? value : 'Medium';

const authUserId = async (request: Request) => {
  const token = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !anonKey) return null;
  const client = createClient(supabaseUrl, anonKey);
  const { data: { user }, error } = await client.auth.getUser(token);
  return error ? null : user?.id || null;
};

const hasPremiumAccess = async (userId: string) => {
  const { data } = await admin.from('subscriptions').select('id').eq('user_id', userId).eq('status', 'active').in('plan', ['premium', 'pro']).gt('end_date', new Date().toISOString()).limit(1);
  return Boolean(data?.length);
};

const callGroq = async (system: string, prompt: string, maxTokens = 6500) => {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) throw new Error('Assessment AI is not configured right now.');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: Deno.env.get('GROQ_MODEL') || 'openai/gpt-oss-20b', messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], temperature: 0.3, max_tokens: maxTokens, response_format: { type: 'json_object' } }),
  });
  if (!response.ok) throw new Error('Unable to prepare or evaluate this assessment right now. Please try again.');
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('Assessment AI returned an empty response. Please try again.');
  try { return JSON.parse(content); } catch { throw new Error('Assessment AI returned an invalid response. Please try again.'); }
};

const generateQuestions = async (blueprint: AssessmentBlueprint, role: string, difficulty: Difficulty): Promise<AssessmentQuestion[]> => {
  const competencies = blueprint.competencies.map((item) => `${item.name}: ${item.weight}%`).join('\n');
  const mix = Object.entries(blueprint.mix).map(([type, count]) => `${type}: ${count}`).join(', ');
  const system = 'You design fair job-readiness and professional capability assessments. Return valid JSON only. Never create syntax, API, framework, programming-language trivia, or recall questions. Technical context is allowed only as a realistic workplace scenario; evaluate investigation, judgment, communication and decisions, not technical memorization.';
  const prompt = `Create the blueprint-aligned candidate assessment below. Return JSON {"questions":[...]}.\nAssessment: ${blueprint.title}\nPurpose: ${blueprint.description}\nRole context: ${role || 'General professional role'} (context for realistic workplace scenarios only; do not test technical facts)\nDifficulty: ${difficulty} (means scenario ambiguity/decision complexity, not obscure knowledge)\nQuestion count: exactly ${blueprint.questionCount}; question type mix: ${mix}.\nCompetency blueprint and approximate share of total points:\n${competencies}\nRequirements: realistic work scenarios; avoid generic repeats; no candidate skill list is provided or to be requested; each competency name must exactly match one of the blueprint names; points must be positive integers and sum to exactly 100; distribute difficulty consistently; for single_choice include exactly 4 plausible options and correctAnswer as A/B/C/D; for multiple_select include 4-6 options and correctAnswers as an array of option letters; for short_response include a concise rubric and evaluationCriteria; include a concise technically sound explanation for objective questions. Use the selected competency blueprint, not a technical skills list.\nQuestion shape: {"id":"q1","type":"single_choice|multiple_select|short_response","competency":"exact blueprint name","difficulty":"${difficulty}","question":"...","options":["..."],"correctAnswer":"A","correctAnswers":["A","C"],"explanation":"...","points":4,"rubric":"...","evaluationCriteria":["..."]}`;
  const result = await callGroq(system, prompt, 8500);
  if (!Array.isArray(result.questions) || result.questions.length !== blueprint.questionCount) throw new Error('Assessment AI returned an invalid question set. Please try again.');
  const allowedCompetencies = new Set(blueprint.competencies.map((item) => item.name));
  const questions: AssessmentQuestion[] = result.questions.map((item: unknown, index: number) => {
    const value = record(item);
    const type = value.type as QuestionType;
    const options = Array.isArray(value.options) ? value.options.map((option) => text(option, 500)).filter(Boolean) : [];
    const correctAnswer = text(value.correctAnswer, 8).toUpperCase();
    const correctAnswers = Array.isArray(value.correctAnswers) ? value.correctAnswers.map((answer) => text(answer, 8).toUpperCase()) : [];
    const points = Number(value.points);
    const competency = text(value.competency, 100);
    if (!['single_choice', 'multiple_select', 'short_response'].includes(type) || !allowedCompetencies.has(competency) || !text(value.question, 1500) || !Number.isInteger(points) || points < 1) throw new Error('Assessment AI returned malformed question data. Please try again.');
    if (type === 'single_choice' && (options.length !== 4 || !['A', 'B', 'C', 'D'].includes(correctAnswer))) throw new Error('Assessment AI returned malformed answer options. Please try again.');
    if (type === 'multiple_select' && (options.length < 4 || options.length > 6 || correctAnswers.length < 2 || correctAnswers.some((answer) => !/^[A-F]$/.test(answer)))) throw new Error('Assessment AI returned malformed multi-select options. Please try again.');
    if (type === 'short_response' && (!text(value.rubric, 800) || !Array.isArray(value.evaluationCriteria))) throw new Error('Assessment AI returned an incomplete evaluation rubric. Please try again.');
    const difficultyValue = value.difficulty === 'Easy' || value.difficulty === 'Hard' ? value.difficulty : difficulty;
    return { id: `q${index + 1}`, type, competency, difficulty: difficultyValue, question: text(value.question, 1500), ...(type !== 'short_response' ? { options } : {}), ...(type === 'single_choice' ? { correctAnswer } : {}), ...(type === 'multiple_select' ? { correctAnswers } : {}), explanation: text(value.explanation, 1000), points, ...(type === 'short_response' ? { rubric: text(value.rubric, 800), evaluationCriteria: (value.evaluationCriteria as unknown[]).map((item) => text(item, 250)).filter(Boolean).slice(0, 6) } : {}) };
  });
  if (questions.reduce((sum, question) => sum + question.points, 0) !== 100) throw new Error('Assessment AI returned an invalid points total. Please try again.');
  return questions;
};

const publicQuestion = (question: AssessmentQuestion) => {
  const { correctAnswer: _correctAnswer, correctAnswers: _correctAnswers, explanation: _explanation, rubric: _rubric, evaluationCriteria: _criteria, ...display } = question;
  return display;
};
const publicAttempt = (attempt: RecordValue) => ({
  id: attempt.id,
  assessmentKey: attempt.assessment_key,
  assessmentType: attempt.assessment_type,
  title: attempt.title,
  role: attempt.role_context,
  difficulty: attempt.difficulty,
  blueprint: attempt.blueprint,
  questions: Array.isArray(attempt.questions) ? attempt.questions.map(publicQuestion) : [],
  answers: attempt.answers || {},
  currentQuestion: attempt.current_question || 0,
  status: attempt.status,
  score: attempt.score,
  competencyScores: attempt.competency_scores || [],
  scoreDetails: attempt.score_details || {},
  insights: attempt.insights || {},
  readinessLevel: attempt.readiness_level,
  startedAt: attempt.started_at,
  completedAt: attempt.completed_at,
});

const userRole = async (userId: string, requestedRole: unknown, profile: RecordValue | null) => {
  const role = text(requestedRole, 100);
  if (role) return role;
  const preferred = Array.isArray(profile?.preferred_job_titles) ? text(profile?.preferred_job_titles[0], 100) : '';
  return text(profile?.current_designation, 100) || preferred || 'General professional role';
};

const scoreShortResponse = (responseValue: unknown, criteria: string[], points: number) => {
  const response = text(responseValue, 4000).toLowerCase();
  if (!response || criteria.length === 0) return 0;
  const stopWords = new Set(['about', 'after', 'again', 'also', 'an', 'and', 'are', 'as', 'at', 'be', 'before', 'but', 'by', 'can', 'could', 'do', 'for', 'from', 'have', 'how', 'if', 'in', 'into', 'is', 'it', 'its', 'make', 'of', 'on', 'or', 'our', 'should', 'so', 'such', 'that', 'the', 'their', 'then', 'there', 'these', 'this', 'to', 'use', 'was', 'what', 'when', 'where', 'which', 'with', 'would', 'you']);
  const responseWords = new Set(response.match(/[a-z0-9]+/g) || []);
  let matchedCriteria = 0;
  for (const criterion of criteria) {
    const terms = (criterion.toLowerCase().match(/[a-z0-9]+/g) || []).filter((word) => word.length > 2 && !stopWords.has(word));
    if (terms.length === 0) continue;
    const matched = terms.filter((word) => responseWords.has(word)).length;
    const needed = Math.max(1, Math.ceil(Math.min(terms.length, 5) * 0.4));
    if (matched >= needed) matchedCriteria += 1;
  }
  return Math.max(0, Math.min(points, Math.round(points * matchedCriteria / criteria.length)));
};

const calculateAssessmentScores = (questions: AssessmentQuestion[], answers: RecordValue, startedAt: string) => {
  const competency = new Map<string, { earned: number; possible: number }>();
  let correct = 0;
  let incorrect = 0;
  let skipped = 0;
  const difficultyBreakdown: Record<Difficulty, number> = { Easy: 0, Medium: 0, Hard: 0 };
  for (const question of questions) {
    const stats = competency.get(question.competency) || { earned: 0, possible: 0 };
    stats.possible += question.points;
    const answer = answers[question.id];
    difficultyBreakdown[question.difficulty] += 1;
    const hasAnswer = Array.isArray(answer) ? answer.length > 0 : text(answer, 4000).length > 0;
    if (!hasAnswer) {
      skipped += 1;
      competency.set(question.competency, stats);
      continue;
    }
    let earned = 0;
    if (question.type === 'single_choice') {
      if (text(answer, 20).toUpperCase() === question.correctAnswer) earned = question.points;
    } else if (question.type === 'multiple_select') {
      const selected = Array.isArray(answer) ? answer.map((item) => text(item, 8).toUpperCase()) : [];
      const correct = question.correctAnswers || [];
      const hits = selected.filter((item) => correct.includes(item)).length;
      const misses = selected.filter((item) => !correct.includes(item)).length;
      earned = Math.max(0, Math.round(question.points * Math.max(0, hits - misses) / correct.length));
    } else {
      earned = scoreShortResponse(answer, question.evaluationCriteria || [], question.points);
    }
    stats.earned += earned;
    if (earned === question.points) correct += 1;
    else incorrect += 1;
    competency.set(question.competency, stats);
  }
  const started = new Date(startedAt).getTime();
  const durationMinutes = Number.isFinite(started) ? Math.max(1, Math.ceil((Date.now() - started) / 60000)) : 1;
  return { competency, scoreDetails: { totalQuestions: questions.length, answered: correct + incorrect, correct, incorrect, skipped, difficultyBreakdown, durationMinutes } satisfies ScoreDetails };
};

const randomCode = (length: number) => {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
};

const ensureCertificate = async (attempt: RecordValue, userId: string) => {
  const attemptId = text(attempt.id);
  if (attempt.status !== 'completed' || !Number.isFinite(Number(attempt.score))) throw new Error('Only a completed, scored assessment can receive a certificate.');
  const { data: existing } = await admin.from('assessment_certificates').select('*').eq('assessment_attempt_id', attemptId).maybeSingle();
  if (existing) return existing;
  const { data: profile } = await admin.from('profiles').select('name').eq('id', userId).maybeSingle();
  const candidateName = text(profile?.name, 160);
  if (!candidateName) throw new Error('Candidate profile name is missing; certificate issuance can be retried after profile completion.');
  const issuedAt = new Date().toISOString();
  const year = new Date(issuedAt).getUTCFullYear();
  const payload = {
    user_id: userId,
    assessment_attempt_id: attemptId,
    certificate_id: `JP-CERT-${year}-${randomCode(8)}`,
    verification_id: randomCode(20),
    candidate_name_snapshot: candidateName,
    assessment_title: text(attempt.title, 200),
    assessment_type: text(attempt.assessment_type, 100),
    assessment_category: text(attempt.assessment_type, 100),
    difficulty: text(attempt.difficulty, 12),
    score: Number(attempt.score || 0),
    max_score: 100,
    competency_scores: attempt.competency_scores || [],
    score_details: attempt.score_details || {},
    insights: attempt.insights || {},
    completion_date: text(attempt.completed_at) || issuedAt,
    issue_date: issuedAt,
    status: 'issued',
  };
  const { data: created, error } = await admin.from('assessment_certificates').insert(payload).select('*').single();
  if (error?.code === '23505') {
    const { data: winner } = await admin.from('assessment_certificates').select('*').eq('assessment_attempt_id', attemptId).maybeSingle();
    if (winner) return winner;
  }
  if (error || !created) throw new Error('Unable to issue assessment certificate.');
  return created;
};

const certificateView = (certificate: RecordValue) => ({
  id: certificate.id,
  certificateId: certificate.certificate_id,
  candidateName: certificate.candidate_name_snapshot,
  assessmentTitle: certificate.assessment_title,
  assessmentType: certificate.assessment_type,
  assessmentCategory: certificate.assessment_category,
  difficulty: certificate.difficulty,
  score: certificate.score,
  maxScore: certificate.max_score,
  competencyScores: certificate.competency_scores || [],
  scoreDetails: certificate.score_details || {},
  insights: certificate.insights || {},
  completionDate: certificate.completion_date,
  issueDate: certificate.issue_date,
  status: certificate.status,
  verificationId: certificate.verification_id,
});

const submitAttempt = async (attempt: RecordValue, submittedAnswers: RecordValue, userId: string) => {
  const questions = attempt.questions as AssessmentQuestion[];
  const answers = { ...record(attempt.answers), ...submittedAnswers };
  const { competency, scoreDetails } = calculateAssessmentScores(questions, answers, text(attempt.started_at));
  const shortQuestions = questions.filter((question) => question.type === 'short_response');
  const shortPrompts = shortQuestions.map((question) => ({
    id: question.id,
    competency: question.competency,
    prompt: question.question,
    rubric: question.rubric,
    criteria: question.evaluationCriteria,
    response: text(answers[question.id], 4000),
    points: question.points,
  }));
  const preEvaluationScores = Array.from(competency.entries()).map(([name, scores]) => ({ name, score: scores.possible ? Math.round(scores.earned / scores.possible * 100) : 0 }));
  let evaluated: RecordValue = {};
  if (shortPrompts.length) {
    try {
      evaluated = record(await callGroq(
        'Provide qualitative feedback only. Never assign or suggest numeric points or scores. Evaluate only the submitted professional responses against the supplied rubric. Never infer traits beyond the responses. Return JSON {"shortEvaluations":[{"id":"...","feedback":"..."}],"strengths":[],"improvements":[],"nextStep":"..."}. All insights must be directly supported by submitted answers and score breakdown. No hiring guarantees.',
        `Assessment title: ${text(attempt.title)}. Candidate responses to evaluate qualitatively: ${JSON.stringify(shortPrompts)}. Backend-calculated competency scores: ${JSON.stringify(preEvaluationScores)}.`,
        1800,
      ));
    } catch {
      evaluated = {};
    }
  }
  const evaluations = Array.isArray(evaluated.shortEvaluations) ? evaluated.shortEvaluations : [];
  for (const question of shortQuestions) {
    const evaluation = evaluations.find((item: unknown) => text(record(item).id) === question.id);
    const stats = competency.get(question.competency);
    if (stats) stats.earned += scoreShortResponse(answers[question.id], question.evaluationCriteria || [], question.points);
  }
  const totalPossible = questions.reduce((sum, question) => sum + question.points, 0) || 100;
  const totalEarned = Array.from(competency.values()).reduce((sum, item) => sum + item.earned, 0);
  const score = Math.max(0, Math.min(100, Math.round(totalEarned / totalPossible * 100)));
  const competencyScores = Array.from(competency.entries()).map(([name, scores]) => ({ name, score: scores.possible ? Math.round(scores.earned / scores.possible * 100) : 0, earned: scores.earned, possible: scores.possible })).sort((a, b) => b.score - a.score);
  const insights = {
    strengths: Array.isArray(evaluated.strengths) ? evaluated.strengths.map((item: unknown) => text(item, 240)).filter(Boolean).slice(0, 4) : [],
    improvements: Array.isArray(evaluated.improvements) ? evaluated.improvements.map((item: unknown) => text(item, 240)).filter(Boolean).slice(0, 4) : [],
    nextStep: text(evaluated.nextStep, 320),
    shortEvaluations: evaluations.map((item: unknown) => ({ id: text(record(item).id), feedback: text(record(item).feedback, 500) })),
  };
  const readinessLevel = score >= 80 ? 'Strong' : score >= 60 ? 'Developing' : 'Building';
  const completedAt = new Date().toISOString();
  const { data, error } = await admin.from('candidate_assessment_attempts').update({ answers, status: 'completed', score, competency_scores: competencyScores, score_details: scoreDetails, insights, readiness_level: readinessLevel, completed_at: completedAt, updated_at: completedAt }).eq('id', text(attempt.id)).eq('user_id', userId).select('*').single();
  if (error || !data) throw new Error('Unable to save your assessment result. Please try again.');
  await ensureCertificate(data as RecordValue, userId).catch((certificateError) => console.error('Assessment certificate issuance deferred', certificateError instanceof Error ? certificateError.message : 'unknown error'));
  return publicAttempt(data as RecordValue);
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  try {
    const body = record(await request.json().catch(() => ({})));
    const action = text(body.action);
    if (action === 'verify') {
      const verificationId = text(body.verificationId, 80);
      if (!verificationId) return json({ error: 'Certificate not found.' }, 404);
      const { data: certificate } = await admin.from('assessment_certificates').select('certificate_id,assessment_title,assessment_category,candidate_name_snapshot,score,max_score,issue_date,status,verification_id').eq('verification_id', verificationId).maybeSingle();
      if (!certificate || certificate.status !== 'issued') return json({ error: 'Certificate not found or no longer valid.' }, 404);
      return json({ verified: true, certificate: { certificateId: certificate.certificate_id, assessmentTitle: certificate.assessment_title, assessmentCategory: certificate.assessment_category, candidateName: certificate.candidate_name_snapshot, score: certificate.score, maxScore: certificate.max_score, issueDate: certificate.issue_date, status: 'Valid' } });
    }
    const userId = await authUserId(request);
    if (!userId) return json({ error: 'Your session has expired. Please sign in again.' }, 401);
    const { data: subscription } = await admin.from('subscriptions').select('id').eq('user_id', userId).eq('status', 'active').in('plan', ['premium', 'pro']).gt('end_date', new Date().toISOString()).limit(1);
    if (!subscription?.length) return json({ error: 'Assessments are available to candidates with an active Premium plan.' }, 403);
    if (action === 'dashboard') {
      const [{ data: profile }, { data: attempts, error }] = await Promise.all([
        admin.from('profiles').select('current_designation,preferred_job_titles,experience').eq('id', userId).maybeSingle(),
        admin.from('candidate_assessment_attempts').select('*').eq('user_id', userId).order('started_at', { ascending: false }),
      ]);
      if (error) throw new Error('Unable to load your assessments. Please try again.');
      const rows = (attempts || []) as RecordValue[];
      const completed = rows.filter((attempt) => attempt.status === 'completed');
      const { data: currentCertificates } = await admin.from('assessment_certificates').select('assessment_attempt_id').eq('user_id', userId);
      const certificateAttemptIds = new Set((currentCertificates || []).map((item) => text(item.assessment_attempt_id)));
      for (const completedAttempt of completed) {
        if (!certificateAttemptIds.has(text(completedAttempt.id))) await ensureCertificate(completedAttempt, userId).catch((issueError) => console.error('Assessment certificate repair deferred', issueError instanceof Error ? issueError.message : 'unknown error'));
      }
      const { count: certificateCount } = await admin.from('assessment_certificates').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'issued');
      const scores = completed.map((attempt) => Number(attempt.score || 0));
      const competencyTotals = new Map<string, { total: number; count: number }>();
      for (const attempt of completed) for (const item of Array.isArray(attempt.competency_scores) ? attempt.competency_scores as Array<RecordValue> : []) {
        const name = text(item.name);
        if (!name) continue;
        const current = competencyTotals.get(name) || { total: 0, count: 0 };
        current.total += Number(item.score || 0); current.count += 1; competencyTotals.set(name, current);
      }
      const averages = Array.from(competencyTotals.entries()).map(([name, value]) => ({ name, score: Math.round(value.total / value.count) })).sort((a, b) => b.score - a.score);
      const role = await userRole(userId, '', (profile || {}) as RecordValue);
      const recommended = [
        { key: 'job-readiness', role, title: role === 'General professional role' ? 'Job Readiness Assessment' : `${role} Job Readiness`, category: 'Job Readiness', description: 'Workplace scenarios covering ownership, investigation, decision making and delivery.', difficulty: 'Medium', questionCount: 25, durationMin: 35, points: 100 },
        { key: 'workplace-communication', role: '', title: 'Workplace Communication', category: 'Workplace Communication', description: 'Practice clear updates, collaboration, feedback and stakeholder judgment.', difficulty: 'Medium', questionCount: 20, durationMin: 25, points: 100 },
        { key: 'problem-solving', role: '', title: 'Problem Solving & Analytical Reasoning', category: 'Problem Solving', description: 'Evaluate structured thinking, analysis, prioritization and root-cause reasoning.', difficulty: 'Medium', questionCount: 25, durationMin: 30, points: 100 },
      ];
      const active = rows.find((attempt) => attempt.status === 'in_progress');
      return json({
        stats: { taken: rows.length, passed: completed.filter((attempt) => Number(attempt.score || 0) >= 70).length, average: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0, certificates: certificateCount || 0 },
        role,
        recommended,
        recent: rows.slice(0, 6).map(publicAttempt),
        active: active ? publicAttempt(active) : null,
        insights: { strongest: averages[0] || null, developing: averages.length ? [...averages].sort((a, b) => a.score - b.score)[0] : null, suggested: averages.length ? 'situational-judgment' : 'workplace-communication' },
        achievements: completed.filter((attempt) => Number(attempt.score || 0) >= 80).slice(0, 3).map((attempt) => ({ id: attempt.id, title: text(attempt.title), score: attempt.score, date: attempt.completed_at })),
      });
    }

    if (action === 'certificates') {
      const [{ data: completedAttempts }, { data: currentCertificates }] = await Promise.all([
        admin.from('candidate_assessment_attempts').select('*').eq('user_id', userId).eq('status', 'completed'),
        admin.from('assessment_certificates').select('assessment_attempt_id').eq('user_id', userId),
      ]);
      const certificateAttemptIds = new Set((currentCertificates || []).map((item) => text(item.assessment_attempt_id)));
      for (const completedAttempt of completedAttempts || []) {
        if (!certificateAttemptIds.has(text(completedAttempt.id))) await ensureCertificate(completedAttempt as RecordValue, userId).catch((issueError) => console.error('Assessment certificate repair deferred', issueError instanceof Error ? issueError.message : 'unknown error'));
      }
      const { data: rows, error } = await admin.from('assessment_certificates').select('*').eq('user_id', userId).order('issue_date', { ascending: false });
      if (error) throw new Error('Unable to load your certificates. Please try again.');
      const certificates = (rows || []).map((certificate) => ({ ...certificateView(certificate as RecordValue), scorecard: { competencyScores: certificate.competency_scores || [], scoreDetails: certificate.score_details || {}, insights: certificate.insights || {} } }));
      const { count: attemptsCompleted } = await admin.from('candidate_assessment_attempts').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed');
      const { data: attempts } = await admin.from('candidate_assessment_attempts').select('score').eq('user_id', userId).eq('status', 'completed');
      const scores = (attempts || []).map((item) => Number(item.score || 0));
      return json({ certificates, stats: { earned: certificates.filter((item) => item.status === 'issued').length, assessmentsCompleted: attemptsCompleted || 0, averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0, latestIssueDate: certificates[0]?.issueDate || null } });
    }

    if (action === 'start') {
      const key = text(body.assessmentKey) as AssessmentKey;
      const blueprint = BLUEPRINTS[key];
      if (!blueprint) return json({ error: 'Choose a valid assessment category.' }, 400);
      const difficulty = validDifficulty(body.difficulty);
      const { data: profile } = await admin.from('profiles').select('current_designation,preferred_job_titles,experience').eq('id', userId).maybeSingle();
      const role = await userRole(userId, body.role, (profile || {}) as RecordValue);
      if (key === 'role-based' && (role === 'General professional role' || !text(body.role))) return json({ error: 'Choose a role for the role-based assessment.' }, 400);
      const title = key === 'job-readiness' || key === 'role-based' ? `${role} ${key === 'job-readiness' ? 'Job Readiness' : 'Role-Based Assessment'}` : blueprint.title;
      const { data: existing } = await admin.from('candidate_assessment_attempts').select('*').eq('user_id', userId).eq('assessment_key', key).eq('role_context', role).eq('difficulty', difficulty).eq('status', 'in_progress').maybeSingle();
      if (existing) return json({ attempt: publicAttempt(existing as RecordValue), resumed: true });
      const questions = await generateQuestions(blueprint, role, difficulty);
      const { data: created, error } = await admin.from('candidate_assessment_attempts').insert({ user_id: userId, assessment_key: key, assessment_type: blueprint.category, title, role_context: role, difficulty, blueprint: { competencies: blueprint.competencies, durationMin: blueprint.durationMin, questionCount: blueprint.questionCount }, questions, answers: {}, current_question: 0, status: 'in_progress' }).select('*').single();
      if (error?.code === '23505') {
        const { data: raceWinner } = await admin.from('candidate_assessment_attempts').select('*').eq('user_id', userId).eq('assessment_key', key).eq('role_context', role).eq('difficulty', difficulty).eq('status', 'in_progress').single();
        if (raceWinner) return json({ attempt: publicAttempt(raceWinner as RecordValue), resumed: true });
      }
      if (error || !created) throw new Error('Unable to start this assessment. Please try again.');
      return json({ attempt: publicAttempt(created as RecordValue), resumed: false });
    }

    if (action === 'progress') {
      const attemptId = text(body.attemptId);
      const { data: attempt, error: readError } = await admin.from('candidate_assessment_attempts').select('questions,answers,status').eq('id', attemptId).eq('user_id', userId).single();
      if (readError || !attempt) return json({ error: 'Assessment attempt not found.' }, 404);
      if (attempt.status !== 'in_progress') return json({ error: 'This assessment has already been submitted.' }, 409);
      const validIds = new Set((attempt.questions as AssessmentQuestion[]).map((question) => question.id));
      const incoming = record(body.answers);
      const answers: RecordValue = { ...record(attempt.answers) };
      for (const [id, answer] of Object.entries(incoming)) if (validIds.has(id) && (typeof answer === 'string' || (Array.isArray(answer) && answer.every((item) => typeof item === 'string')))) answers[id] = answer;
      const currentQuestion = Math.max(0, Math.min(Number(body.currentQuestion) || 0, (attempt.questions as AssessmentQuestion[]).length - 1));
      const { error } = await admin.from('candidate_assessment_attempts').update({ answers, current_question: currentQuestion, updated_at: new Date().toISOString() }).eq('id', attemptId).eq('user_id', userId).eq('status', 'in_progress');
      if (error) throw new Error('Unable to save assessment progress.');
      return json({ saved: true });
    }

    if (action === 'submit') {
      const { data: attempt, error } = await admin.from('candidate_assessment_attempts').select('*').eq('id', text(body.attemptId)).eq('user_id', userId).single();
      if (error || !attempt) return json({ error: 'Assessment attempt not found.' }, 404);
      if (attempt.status === 'completed') return json({ attempt: publicAttempt(attempt as RecordValue), alreadyCompleted: true });
      const result = await submitAttempt(attempt as RecordValue, record(body.answers), userId);
      return json({ attempt: result });
    }

    return json({ error: 'Unsupported assessment action.' }, 400);
  } catch (error) {
    console.error('career-assessments request failed', error instanceof Error ? error.message : 'unknown error');
    return json({ error: error instanceof Error ? error.message : 'Unable to complete this assessment request. Please try again.' }, 400);
  }
});
