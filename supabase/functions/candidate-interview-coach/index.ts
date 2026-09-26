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
type PracticeType = 'HR' | 'Technical' | 'Behavioral' | 'Managerial' | 'Mixed';
type Difficulty = 'Easy' | 'Medium' | 'Hard';
type Question = { id: string; question: string; focus: string };
type Evaluation = {
  communication: number;
  technicalDepth: number | null;
  relevance: number;
  problemSolving: number;
  structure: number;
  strengths: string[];
  improvements: string[];
  star?: { situation: boolean; task: boolean; action: boolean; result: boolean };
  exampleImprovedAnswer?: string;
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const record = (value: unknown): JsonRecord => value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
const text = (value: unknown, max = 5000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const asList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(asList);
  if (value && typeof value === 'object') {
    const item = record(value);
    return asList(item.name || item.label || item.title || item.value);
  }
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.flatMap(asList);
    } catch {
      return trimmed.split(/[,|;\/\n]/).map((item) => item.trim()).filter(Boolean);
    }
  }
  return trimmed.split(/[,|;\/\n]/).map((item) => item.trim()).filter(Boolean);
};
const boundedScore = (value: unknown) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
const strings = (value: unknown, limit = 4) => Array.isArray(value) ? value.map((item) => text(item, 360)).filter(Boolean).slice(0, limit) : [];
const normalizeQuestion = (value: unknown): Question => {
  const question = record(value);
  const wording = text(question.question, 600);
  if (wording.length < 12) throw new Error('Interview AI returned an invalid question. Please try again.');
  return { id: crypto.randomUUID(), question: wording, focus: text(question.focus, 160) };
};
const normalizedQuestion = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const validType = (value: unknown): PracticeType => ['HR', 'Technical', 'Behavioral', 'Managerial', 'Mixed'].includes(String(value)) ? value as PracticeType : 'Mixed';
const validDifficulty = (value: unknown): Difficulty => value === 'Easy' || value === 'Hard' ? value : 'Medium';
const dateUtc = () => new Date().toISOString().slice(0, 10);

const authUserId = async (request: Request): Promise<string | null> => {
  const token = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !anonKey) return null;
  const authClient = createClient(supabaseUrl, anonKey);
  const { data: { user }, error } = await authClient.auth.getUser(token);
  return error ? null : user?.id || null;
};

const hasPremiumAccess = async (userId: string) => {
  const { data } = await admin.from('subscriptions').select('id').eq('user_id', userId).eq('status', 'active').in('plan', ['premium', 'pro']).gt('end_date', new Date().toISOString()).limit(1);
  return Boolean(data?.length);
};

const callGroq = async (system: string, prompt: string, maxTokens = 1800) => {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) throw new Error('AI Interview Coach is not configured right now.');
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('GROQ_MODEL') || 'openai/gpt-oss-20b',
        messages: [{ role: 'system', content: `${system} Return valid JSON only.` }, { role: 'user', content: attempt ? `${prompt}\nReturn one valid JSON object matching the requested schema. Do not include markdown.` : prompt }],
        temperature: 0.35,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
    });
    if (!response.ok) throw new Error('AI Interview Coach could not complete that request. Please try again.');
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('Interview AI returned an empty response. Please retry.');
    try { return JSON.parse(content); } catch {
      if (attempt) throw new Error('Interview AI returned an invalid response. Please retry.');
    }
  }
  throw new Error('Interview AI returned an invalid response. Please retry.');
};

const sessionView = (row: JsonRecord, revealEvaluation = false) => {
  const isCompleted = row.status === 'completed';
  const answers = Array.isArray(row.answers) ? row.answers : [];
  return {
    id: String(row.id),
    jobId: row.job_id || null,
    jobTitle: String(row.job_title || 'Interview practice'),
    companyName: row.company_name || null,
    interviewType: validType(row.interview_type),
    experienceLevel: String(row.experience_level || ''),
    difficulty: validDifficulty(row.difficulty),
    questions: Array.isArray(row.questions) ? row.questions : [],
    answers: answers.map((answer: JsonRecord) => {
      const { evaluation, ...publicAnswer } = record(answer);
      return revealEvaluation || isCompleted ? { ...publicAnswer, ...(evaluation ? { evaluation } : {}) } : publicAnswer;
    }),
    currentQuestion: Number(row.current_question || 0),
    status: row.status,
    score: row.score == null ? null : Number(row.score),
    categoryScores: record(row.category_scores),
    feedback: row.feedback || null,
    createdAt: row.created_at,
    completedAt: row.completed_at || null,
  };
};

const profileContext = (profile: JsonRecord) => {
  const work = Array.isArray(profile.work_experience) ? profile.work_experience : [];
  const projects = Array.isArray(profile.projects) ? profile.projects : [];
  return {
    designation: text(profile.current_designation || profile.designation, 160),
    experience: text(profile.experience, 160),
    experienceYears: Number(profile.experience_years || profile.total_experience_years || 0) || null,
    skills: asList(profile.skills).slice(0, 30),
    work: work.slice(0, 6).map((item: unknown) => {
      const value = record(item);
      return { title: text(value.position || value.title || value.role, 120), responsibilities: asList(value.responsibilities || value.description).slice(0, 4) };
    }),
    projects: projects.slice(0, 4).map((item: unknown) => {
      const value = record(item);
      return { title: text(value.title || value.name, 120), description: text(value.description, 300), technologies: asList(value.technologies).slice(0, 8) };
    }),
    bio: text(profile.bio, 600),
  };
};

const normalizeJob = (value: unknown) => {
  const job = Array.isArray(value) ? record(value[0]) : record(value);
  const description = [job.description, job.responsibilities, job.requirements, job.qualifications]
    .map((item) => Array.isArray(item) ? item.map((part) => text(part, 1000)).filter(Boolean).join('\n') : text(item, 3000))
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 6000);
  return {
    id: String(job.id || ''),
    title: text(job.title, 180) || 'Untitled role',
    companyName: text(job.company_name || job.companyName, 180),
    description,
    skills: asList(job.skills).slice(0, 30),
    experience: text(job.experience, 160),
  };
};

const loadProfile = async (userId: string) => {
  const { data, error } = await admin.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error('Unable to load your candidate profile.');
  if (String(data?.role || '').toLowerCase() === 'recruiter') throw new Error('Interview Coach is available to candidate accounts.');
  return record(data);
};

const resolveJob = async (userId: string, body: JsonRecord) => {
  const source = body.source;
  if (source === 'application') {
    const applicationId = text(body.applicationId, 100);
    if (!applicationId) throw new Error('Select one of your applications.');
    const { data, error } = await admin.from('job_applications')
      .select('id, job_id, jobs(*)')
      .eq('id', applicationId).eq('user_id', userId).maybeSingle();
    if (error) throw new Error('Unable to verify that application.');
    if (!data) throw new Error('That application could not be found in your account.');
    return { ...normalizeJob(data.jobs), applicationId: String(data.id), jobId: String(data.job_id) };
  }
  if (source === 'saved') {
    const jobId = text(body.jobId, 100);
    if (!jobId) throw new Error('Select one of your saved jobs.');
    const { data: saved, error: savedError } = await admin.from('saved_jobs').select('job_id').eq('user_id', userId).eq('job_id', jobId).maybeSingle();
    if (savedError) throw new Error('Unable to verify that saved job.');
    if (!saved) throw new Error('That job is not in your saved jobs.');
    const { data, error } = await admin.from('jobs').select('*').eq('id', jobId).maybeSingle();
    if (error || !data) throw new Error('Unable to load the selected job details.');
    return { ...normalizeJob(data), jobId: String(data.id) };
  }
  if (source !== 'manual') throw new Error('Select an application, saved job, or enter a role.');
  const title = text(body.jobTitle, 180);
  if (!title) throw new Error('Enter the job title you are preparing for.');
  return { id: '', jobId: '', applicationId: '', title, companyName: text(body.companyName, 180), description: text(body.jobDescription, 6000), skills: [], experience: '' };
};

const publicJob = (row: JsonRecord) => {
  const job = normalizeJob(row.jobs);
  return { ...job, applicationId: String(row.id) };
};

const loadDashboard = async (userId: string) => {
  const [profile, appResult, savedResult, historyResult, activeResult, todayResult, countResult] = await Promise.all([
    loadProfile(userId),
    admin.from('job_applications').select('id, job_id, jobs(*)').eq('user_id', userId).order('applied_at', { ascending: false }).limit(30),
    admin.from('saved_jobs').select('job_id, jobs(*)').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
    admin.from('candidate_interview_sessions').select('*').eq('user_id', userId).eq('status', 'completed').order('completed_at', { ascending: false }).limit(30),
    admin.from('candidate_interview_sessions').select('*').eq('user_id', userId).in('status', ['setup', 'in_progress']).maybeSingle(),
    admin.from('candidate_interview_sessions').select('*').eq('user_id', userId).eq('session_date', dateUtc()).eq('status', 'completed').maybeSingle(),
    admin.from('candidate_interview_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed'),
  ]);
  for (const result of [appResult, savedResult, historyResult, activeResult, todayResult, countResult]) {
    if (result.error) throw new Error('Unable to load your interview history and job data.');
  }
  const rows = historyResult.data || [];
  const dates = [...new Set(rows.map((row: JsonRecord) => String(row.session_date || '')))];
  let streakDays = 0;
  const cursor = new Date(`${dateUtc()}T00:00:00Z`);
  if (!dates.includes(dateUtc())) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (dates.includes(cursor.toISOString().slice(0, 10))) {
    streakDays += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  const latestFeedback = rows.slice(0, 5).map((row: JsonRecord) => record(row.feedback));
  const strengthSet = [...new Set(latestFeedback.flatMap((item: JsonRecord) => strings(item.strengths, 3)))].slice(0, 3);
  const improvementSet = [...new Set(latestFeedback.flatMap((item: JsonRecord) => strings(item.improvements, 2)))];
  const latest = record(rows[0]);
  return {
    profile: {
      name: text(profile.name || profile.full_name, 160),
      designation: text(profile.current_designation || profile.designation, 160),
      experience: text(profile.experience, 100),
      skills: asList(profile.skills).slice(0, 30),
    },
    applications: (appResult.data || []).map(publicJob),
    savedJobs: (savedResult.data || []).map((row: JsonRecord) => normalizeJob(row.jobs)),
    sessions: rows.map((row: JsonRecord) => sessionView(row)),
    activeSession: activeResult.data ? sessionView(activeResult.data) : null,
    completedToday: todayResult.data ? sessionView(todayResult.data) : null,
    stats: { completed: countResult.count || 0, streakDays },
    coach: {
      strengths: strengthSet,
      improvement: improvementSet.length ? `Recent answers suggest focusing on ${improvementSet.slice(0, 2).join(' and ').toLowerCase()}.` : 'Keep practicing across different interview rounds to build a useful coaching profile.',
      recommendedPractice: strings(latest.feedback?.recommendations, 1)[0] || latest.feedback?.nextPractice || 'Complete a full mock interview to get a tailored recommendation.',
    },
  };
};

const interviewContext = (row: JsonRecord) => ({
  role: text(row.job_title, 180),
  company: text(row.company_name, 180),
  description: text(row.job_description, 6000),
  requiredSkills: asList(row.required_skills).slice(0, 30),
  experienceRequirement: text(row.candidate_context?.experienceRequirement, 160),
  candidate: record(row.candidate_context),
  type: validType(row.interview_type),
  experienceLevel: text(row.experience_level, 80),
  difficulty: validDifficulty(row.difficulty),
});

const generateQuestion = async (row: JsonRecord, previousAnswers: JsonRecord[], strict = false): Promise<Question> => {
  const context = interviewContext(row);
  const used = (Array.isArray(row.questions) ? row.questions : []).map((item: JsonRecord) => String(item.question || ''));
  const system = 'You are a concise, professional human interviewer. Ask one realistic open-ended interview question at a time. Never create multiple-choice or exam questions. Return JSON only with a question object containing question and focus.';
  const prompt = `Create the next ${context.type} interview question for ${context.role}${context.company ? ` at ${context.company}` : ''}.\nJob description and responsibilities: ${context.description || 'Not provided'}\nRequired skills: ${context.requiredSkills.join(', ') || 'Use the role context'}\nExperience requirement: ${context.experienceRequirement || 'Not stated'}\nCandidate experience level: ${context.experienceLevel}. Candidate profile facts (do not invent any history): ${JSON.stringify(context.candidate)}\nDifficulty: ${context.difficulty}. Interview type: ${context.type}.\nPreviously asked questions: ${JSON.stringify(used)}\nRecent answers: ${JSON.stringify(previousAnswers.slice(-4).map((item) => ({ question: item.question, answer: item.answer, areasToExplore: item.evaluation?.improvements })))}\n${strict ? 'The prior draft repeated a question. Create a clearly distinct question focused on another relevant scenario.' : ''}\nRequirements: realistic, concise, specific to the role and job requirements, not generic; use practical scenarios for technical interviews; explore candidate-provided answers with a relevant follow-up; do not assume achievements. JSON schema: {"question":{"question":"...","focus":"..."}}`;
  const result = await callGroq(system, prompt, 550);
  const question = normalizeQuestion(result.question);
  if (used.some((item: string) => normalizedQuestion(item) === normalizedQuestion(question.question))) throw new Error('Interview AI repeated a question. Retry to generate a different one.');
  return question;
};

const normalizeEvaluation = (value: unknown, interviewType: PracticeType): Evaluation => {
  const item = record(value);
  const star = record(item.star);
  return {
    communication: boundedScore(item.communication),
    technicalDepth: interviewType === 'Technical' || interviewType === 'Mixed' ? boundedScore(item.technicalDepth) : null,
    relevance: boundedScore(item.relevance),
    problemSolving: boundedScore(item.problemSolving),
    structure: boundedScore(item.structure),
    strengths: strings(item.strengths, 3),
    improvements: strings(item.improvements, 3),
    ...(interviewType === 'Behavioral' || interviewType === 'HR' ? { star: { situation: star.situation === true, task: star.task === true, action: star.action === true, result: star.result === true } } : {}),
    ...(text(item.exampleImprovedAnswer, 2000) ? { exampleImprovedAnswer: text(item.exampleImprovedAnswer, 2000) } : {}),
  };
};

const evaluateAnswer = async (row: JsonRecord, question: JsonRecord, answer: string): Promise<Evaluation> => {
  const context = interviewContext(row);
  const includeStar = context.type === 'Behavioral' || context.type === 'HR';
  const prompt = `Evaluate one real interview answer. Return JSON {"evaluation":{"communication":0,"technicalDepth":0,"relevance":0,"problemSolving":0,"structure":0,"strengths":[],"improvements":[],${includeStar ? '"star":{"situation":false,"task":false,"action":false,"result":false},' : ''}"exampleImprovedAnswer":""}}. Scores are integer 0..100 based on evidence in this answer, not a final interview score. If technical knowledge does not apply return technicalDepth null. Be fair to ${context.experienceLevel} experience. Consider role ${context.role}, interview type ${context.type}, difficulty ${context.difficulty}; relevant job skills ${context.requiredSkills.join(', ')}. Never treat invented candidate achievements as facts. Only provide exampleImprovedAnswer when a concrete, non-fabricated answer structure can be shown; use brackets for missing personal facts. Question: ${text(question.question, 1000)}\nCandidate answer: ${answer}\nUse short evidence-based strengths and improvements. Only evaluate STAR for HR/Behavioral interviews.`;
  const result = await callGroq('You are a fair interview coach. Evaluate candidate answers accurately and constructively. Return JSON only.', prompt, 850);
  if (!result.evaluation || !Array.isArray(result.evaluation.strengths) || !Array.isArray(result.evaluation.improvements)) throw new Error('Interview AI could not evaluate this answer. Please retry.');
  return normalizeEvaluation(result.evaluation, context.type);
};

const rollupScores = (answers: JsonRecord[]) => {
  const categories: Record<string, keyof Evaluation> = {
    Communication: 'communication',
    'Technical Depth': 'technicalDepth',
    'Answer Relevance': 'relevance',
    'Problem Solving': 'problemSolving',
    'Answer Structure': 'structure',
  };
  const categoryScores: Record<string, number> = {};
  for (const [label, key] of Object.entries(categories)) {
    const values = answers.map((item) => item.evaluation?.[key]).filter((value): value is number => typeof value === 'number');
    if (values.length) categoryScores[label] = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }
  const values = Object.values(categoryScores);
  return { categoryScores, score: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0 };
};

const summarizeInterview = async (row: JsonRecord, answers: JsonRecord[], categoryScores: Record<string, number>) => {
  const prompt = `Summarize a completed 10-question mock interview. Return JSON {"feedback":{"strengths":[],"improvements":[],"recommendations":[],"coachRecommendation":"...","nextPractice":"..."}}. Base all statements on the answer evidence and per-answer evaluations below. Do not invent candidate achievements, include no numeric overall score, and keep each list to at most 3 short items. Job: ${row.job_title}; interview type: ${row.interview_type}; readiness category scores calculated by the server: ${JSON.stringify(categoryScores)}. Evidence: ${JSON.stringify(answers.map((item) => ({ question: item.question, answer: String(item.answer).slice(0, 1600), evaluation: item.evaluation })))}.`;
  const result = await callGroq('You are an experienced interview coach. Give concise, evidence-based feedback. Return valid JSON only.', prompt, 1000);
  const value = record(result.feedback);
  return {
    strengths: strings(value.strengths, 3),
    improvements: strings(value.improvements, 3),
    recommendations: strings(value.recommendations, 3),
    coachRecommendation: text(value.coachRecommendation, 500),
    nextPractice: text(value.nextPractice, 200),
  };
};

const createFirstQuestion = async (row: JsonRecord) => {
  const question = await generateQuestion(row, []);
  const { data, error } = await admin.from('candidate_interview_sessions').update({
    questions: [question], status: 'in_progress', updated_at: new Date().toISOString(),
  }).eq('id', row.id).eq('user_id', row.user_id).eq('status', 'setup').select('*').single();
  if (error) throw new Error('Your interview was saved, but its first question could not be prepared. Try continuing again.');
  return data;
};

const loadSession = async (sessionId: string, userId: string) => {
  const { data, error } = await admin.from('candidate_interview_sessions').select('*').eq('id', sessionId).eq('user_id', userId).maybeSingle();
  if (error) throw new Error('Unable to load this interview session.');
  if (!data) throw new Error('Interview session not found.');
  return data as JsonRecord;
};

const startSession = async (userId: string, body: JsonRecord, profile: JsonRecord) => {
  const { data: active, error: activeError } = await admin.from('candidate_interview_sessions').select('*').eq('user_id', userId).in('status', ['setup', 'in_progress']).maybeSingle();
  if (activeError) throw new Error('Unable to check your active interview.');
  if (active) {
    const row = active.status === 'setup' && !(active.questions || []).length ? await createFirstQuestion(active) : active;
    return { session: sessionView(row), resumed: true };
  }
  const { data: completeToday, error: todayError } = await admin.from('candidate_interview_sessions').select('id').eq('user_id', userId).eq('session_date', dateUtc()).eq('status', 'completed').maybeSingle();
  if (todayError) throw new Error('Unable to check today’s interview limit.');
  if (completeToday) throw new Error('Today’s mock interview is complete. You can review its feedback and generate practice questions.');

  const preparationInviteId = text(body.preparationInviteId, 80);
  let job: JsonRecord;
  let inviteContext: JsonRecord | null = null;
  if (preparationInviteId) {
    const { data: invite, error: inviteError } = await admin.from('interviews').select('*').eq('id', preparationInviteId).eq('candidate_id', userId).maybeSingle();
    if (inviteError) throw new Error('Unable to verify the selected interview invitation.');
    if (!invite) throw new Error('The selected interview invitation was not found in your account.');
    if (invite.candidate_response !== 'accepted' || ['Cancelled', 'Completed', 'No Show'].includes(String(invite.status))) {
      throw new Error('Only a confirmed upcoming interview can be used for AI preparation.');
    }
    let jobDetails: JsonRecord = {};
    if (invite.job_id) {
      const { data } = await admin.from('jobs').select('*').eq('id', invite.job_id).maybeSingle();
      jobDetails = record(data);
    }
    const normalizedJob = normalizeJob({ ...jobDetails, title: invite.job_title || jobDetails.title, company_name: jobDetails.company_name });
    job = { ...normalizedJob, jobId: invite.job_id || '', applicationId: invite.application_id || '' };
    inviteContext = {
      round: text(invite.round, 160),
      scheduledDate: String(invite.date || ''),
      scheduledTime: String(invite.time || ''),
      timezone: text(invite.timezone, 80),
      interviewMode: text(invite.interview_type, 40),
      interviewer: text(invite.interviewer, 160),
      interviewerEmail: text(invite.interviewer_email, 200),
      recruiterInstructions: text(invite.instructions, 1500),
    };
  } else {
    job = await resolveJob(userId, body);
  }
  const profileSummary = profileContext(profile);
  const interviewType = validType(body.interviewType);
  const experienceLevel = text(body.experienceLevel, 80) || 'Fresher';
  const difficulty = validDifficulty(body.difficulty);
  const { data: inserted, error: insertError } = await admin.from('candidate_interview_sessions').insert({
    user_id: userId,
    application_id: job.applicationId || null,
    job_id: job.jobId || null,
    job_title: job.title,
    company_name: job.companyName || null,
    job_description: job.description,
    required_skills: job.skills,
    candidate_context: { ...profileSummary, experienceRequirement: job.experience, interviewInvite: inviteContext },
    interview_type: interviewType,
    experience_level: experienceLevel,
    difficulty,
    session_date: dateUtc(),
    status: 'setup',
  }).select('*').single();
  if (insertError) {
    const { data: duplicate } = await admin.from('candidate_interview_sessions').select('*').eq('user_id', userId).in('status', ['setup', 'in_progress']).maybeSingle();
    if (duplicate) return { session: sessionView(duplicate), resumed: true };
    if (String(insertError.code) === '23505') throw new Error('Today’s interview is already complete. Review your feedback before starting another.');
    throw new Error('Unable to create your interview session. Please try again.');
  }
  const firstQuestion = await createFirstQuestion(inserted);
  return { session: sessionView(firstQuestion), resumed: false };
};

const beginAnswer = async (row: JsonRecord, question: JsonRecord, answer: string) => {
  const answers = Array.isArray(row.answers) ? row.answers : [];
  const existing = answers.find((item: JsonRecord) => item.questionId === question.id);
  if (existing && existing.answer !== answer) throw new Error('This answer has already been submitted and cannot be edited.');
  if (existing && row.current_question > answers.findIndex((item: JsonRecord) => item.questionId === question.id)) return { row, answers, alreadyProcessed: true };
  if (row.processing_question_id === question.id) {
    const age = Date.now() - new Date(row.processing_started_at || 0).getTime();
    if (age < 90000) throw new Error('Your answer is still being analyzed. Please wait a moment.');
  } else if (row.processing_question_id) {
    throw new Error('Another response is being processed. Please wait a moment.');
  }
  const nextAnswers = existing ? answers : [...answers, { questionId: question.id, question: question.question, answer }];
  let query = admin.from('candidate_interview_sessions').update({
    answers: nextAnswers,
    processing_question_id: question.id,
    processing_started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', row.id).eq('user_id', row.user_id).eq('status', 'in_progress').eq('current_question', row.current_question);
  if (row.processing_question_id === question.id) query = query.eq('processing_question_id', question.id).lt('processing_started_at', new Date(Date.now() - 90000).toISOString());
  else query = query.is('processing_question_id', null);
  const { data, error } = await query.select('*').maybeSingle();
  if (error) throw new Error('Could not safely save your answer. Please retry.');
  if (!data) throw new Error('Your interview changed in another request. Reload the current session and continue.');
  return { row: data as JsonRecord, answers: nextAnswers, alreadyProcessed: false };
};

const processAnswer = async (userId: string, sessionId: string, questionId: string, answer: string) => {
  let row = await loadSession(sessionId, userId);
  if (row.status === 'completed') return { session: sessionView(row) };
  if (row.status !== 'in_progress') throw new Error('This interview is no longer active.');
  const persistedAnswers = Array.isArray(row.answers) ? row.answers : [];
  const submittedIndex = persistedAnswers.findIndex((item: JsonRecord) => item.questionId === questionId);
  if (submittedIndex >= 0 && Number(row.current_question) > submittedIndex) return { session: sessionView(row) };
  const question = (Array.isArray(row.questions) ? row.questions : [])[Number(row.current_question)];
  if (!question || question.id !== questionId) throw new Error('That is not the current interview question. Refresh and continue.');
  if (answer.length < 2) throw new Error('Add a little more detail before submitting your answer.');

  const locked = await beginAnswer(row, question, answer);
  if (locked.alreadyProcessed) return { session: sessionView(locked.row) };
  row = locked.row;
  try {
    const evaluation = await evaluateAnswer(row, question, answer);
    const answers = locked.answers.map((item: JsonRecord) => item.questionId === questionId ? { ...item, evaluation } : item);
    const currentQuestionIndex = Number(row.current_question);
    let update: JsonRecord;
    if (currentQuestionIndex === 9) {
      if (answers.length !== 10) throw new Error('Interview answer history is incomplete.');
      const { categoryScores, score } = rollupScores(answers);
      const feedback = await summarizeInterview(row, answers, categoryScores);
      update = { answers, category_scores: categoryScores, score, feedback, status: 'completed', completed_at: new Date().toISOString(), processing_question_id: null, processing_started_at: null, updated_at: new Date().toISOString() };
    } else {
      const nextQuestion = await generateQuestion({ ...row, questions: row.questions }, answers);
      update = { answers, questions: [...row.questions, nextQuestion], current_question: currentQuestionIndex + 1, processing_question_id: null, processing_started_at: null, updated_at: new Date().toISOString() };
    }
    const { data, error } = await admin.from('candidate_interview_sessions').update(update).eq('id', row.id).eq('user_id', userId).eq('processing_question_id', questionId).select('*').single();
    if (error) {
      if (String(error.code) === '23505') throw new Error('Today’s interview limit has been reached. Your answers are safely saved.');
      throw new Error('Your answer is saved, but the interview could not advance. Retry to continue.');
    }
    return { session: sessionView(data) };
  } catch (error) {
    await admin.from('candidate_interview_sessions').update({ processing_question_id: null, processing_started_at: null, updated_at: new Date().toISOString() }).eq('id', row.id).eq('user_id', userId).eq('processing_question_id', questionId);
    throw error;
  }
};

const generateQuestionBank = async (context: JsonRecord) => {
  const prompt = `Generate 5 realistic interview questions for ${text(context.jobTitle, 180) || context.role}. Interview type: ${validType(context.interviewType)}. Difficulty: ${validDifficulty(context.difficulty)}. Candidate experience level: ${text(context.experienceLevel, 80)}. Skills: ${asList(context.skills).join(', ')}. Job description: ${text(context.jobDescription, 6000)}. Return JSON {"questions":[{"question":"...","focus":"..."}]}. No multiple choice, no generic unrelated trivia, no duplicate questions.`;
  const result = await callGroq('You generate realistic questions for live interview practice. Never include expected answers. Return JSON only.', prompt, 1200);
  if (!Array.isArray(result.questions) || result.questions.length < 3) throw new Error('Question Bank generation returned too few questions. Please retry.');
  const seen = new Set<string>();
  const questions = result.questions.slice(0, 5).map((item: unknown) => {
    const question = normalizeQuestion(item);
    const normalized = normalizedQuestion(question.question);
    if (seen.has(normalized)) throw new Error('Question Bank returned duplicate questions. Please generate again.');
    seen.add(normalized);
    return question;
  });
  return { questions };
};

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  try {
    const userId = await authUserId(request);
    if (!userId) return json({ error: 'Your sign-in session has expired. Please sign in again.' }, 401);
    if (!await hasPremiumAccess(userId)) return json({ error: 'AI Interview Coach is available with an active Premium subscription.' }, 403);
    const body = record(await request.json().catch(() => ({})));
    const action = text(body.action, 40);
    const profile = action === 'dashboard' || action === 'start' || action === 'question_bank' ? await loadProfile(userId) : null;

    if (action === 'dashboard') return json(await loadDashboard(userId));

    if (action === 'start') return json(await startSession(userId, body, profile || {}));

    if (action === 'resume') {
      let row = await loadSession(text(body.sessionId, 80), userId);
      if (row.status === 'setup' && !(Array.isArray(row.questions) && row.questions.length)) row = await createFirstQuestion(row);
      if (row.status === 'abandoned') return json({ error: 'This interview was abandoned. Start a new session to practice again.' }, 409);
      return json({ session: sessionView(row) });
    }

    if (action === 'answer') {
      const sessionId = text(body.sessionId, 80);
      const questionId = text(body.questionId, 80);
      const answer = text(body.answer, 6000);
      if (!sessionId || !questionId) return json({ error: 'Interview session or question is missing.' }, 400);
      return json(await processAnswer(userId, sessionId, questionId, answer));
    }

    if (action === 'coach') {
      const row = await loadSession(text(body.sessionId, 80), userId);
      const questionId = text(body.questionId, 80);
      const answers = Array.isArray(row.answers) ? row.answers : [];
      const submitted = answers.find((item: JsonRecord) => item.questionId === questionId);
      if (!submitted) return json({ error: 'Submit an answer before asking for coaching.' }, 400);
      if (!submitted.evaluation) {
        const evaluation = await evaluateAnswer(row, { question: submitted.question }, submitted.answer);
        submitted.evaluation = evaluation;
        const { data, error } = await admin.from('candidate_interview_sessions').update({ answers, updated_at: new Date().toISOString() }).eq('id', row.id).eq('user_id', userId).select('*').single();
        if (error) throw new Error('Answer coaching could not be saved. Please retry.');
        return json({ session: sessionView(data, true) });
      }
      return json({ session: sessionView(row, true) });
    }

    if (action === 'abandon') {
      const { error } = await admin.from('candidate_interview_sessions').update({ status: 'abandoned', processing_question_id: null, processing_started_at: null, updated_at: new Date().toISOString() }).eq('id', text(body.sessionId, 80)).eq('user_id', userId).in('status', ['setup', 'in_progress']);
      if (error) throw new Error('Unable to close this interview session.');
      return json({ abandoned: true });
    }

    if (action === 'question_bank') {
      const job = body.source === 'manual'
        ? { title: text(body.jobTitle, 180), description: text(body.jobDescription, 6000), skills: [], experience: '' }
        : await resolveJob(userId, body);
      if (!job.title) return json({ error: 'Choose a job or enter a role before generating questions.' }, 400);
      const result = await generateQuestionBank({ ...job, interviewType: body.interviewType, difficulty: body.difficulty, experienceLevel: body.experienceLevel, candidate: profileContext(profile || {}) });
      return json(result);
    }

    if (action === 'answer_tips') {
      const question = text(body.question, 1200);
      if (!question) return json({ error: 'Select a question to get answer tips.' }, 400);
      const prompt = `Question: ${question}\nRole: ${text(body.jobTitle, 180)}\nInterview type: ${validType(body.interviewType)}. Return JSON {"tips":["..."]} with 3 concise prompts to structure a response. Do not reveal a complete sample answer.`;
      const result = await callGroq('You coach candidates without giving away a complete answer. Return valid JSON only.', prompt, 500);
      return json({ tips: strings(result.tips, 3) });
    }

    return json({ error: 'Unsupported interview coach action.' }, 400);
  } catch (error) {
    console.error('candidate-interview-coach error', error);
    return json({ error: error instanceof Error ? error.message : 'Interview Coach request failed. Please try again.' }, 500);
  }
});