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

type JsonRecord = Record<string, unknown>;
type ResumeData = {
  personal: { fullName: string; title: string; email: string; phone: string; location: string; linkedin: string; github: string; portfolio: string };
  summary: string;
  experience: Array<{ company: string; title: string; location: string; startDate: string; endDate: string; current: boolean; bullets: string[] }>;
  skills: string[];
  education: Array<{ degree: string; institution: string; location: string; startDate: string; endDate: string; grade: string }>;
  projects: Array<{ name: string; role: string; description: string; technologies: string[]; url: string }>;
  certifications: Array<{ name: string; issuer: string; issueDate: string; credentialId: string; url: string }>;
  customSections: Array<{ title: string; items: string[] }>;
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const stringArray = (value: unknown): string[] => Array.isArray(value) ? value.map(text).filter(Boolean) : typeof value === 'string' ? value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean) : [];
const safeObject = (value: unknown): JsonRecord => value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};

const normalizeResume = (input: unknown): ResumeData => {
  const value = safeObject(input);
  const personal = safeObject(value.personal);
  const mapItems = <T extends JsonRecord>(items: unknown, mapper: (item: JsonRecord) => T): T[] => Array.isArray(items) ? items.map((item) => mapper(safeObject(item))) : [];
  return {
    personal: {
      fullName: text(personal.fullName), title: text(personal.title), email: text(personal.email), phone: text(personal.phone), location: text(personal.location),
      linkedin: text(personal.linkedin), github: text(personal.github), portfolio: text(personal.portfolio),
    },
    summary: text(value.summary),
    experience: mapItems(value.experience, (item) => ({ company: text(item.company), title: text(item.title), location: text(item.location), startDate: text(item.startDate), endDate: text(item.endDate), current: item.current === true, bullets: stringArray(item.bullets) })),
    skills: stringArray(value.skills),
    education: mapItems(value.education, (item) => ({ degree: text(item.degree), institution: text(item.institution), location: text(item.location), startDate: text(item.startDate), endDate: text(item.endDate), grade: text(item.grade) })),
    projects: mapItems(value.projects, (item) => ({ name: text(item.name), role: text(item.role), description: text(item.description), technologies: stringArray(item.technologies), url: text(item.url) })),
    certifications: mapItems(value.certifications, (item) => ({ name: text(item.name), issuer: text(item.issuer), issueDate: text(item.issueDate), credentialId: text(item.credentialId), url: text(item.url) })),
    customSections: mapItems(value.customSections, (item) => ({ title: text(item.title), items: stringArray(item.items) })),
  };
};

const authUserId = async (request: Request): Promise<string | null> => {
  const token = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !anonKey) return null;
  const authClient = createClient(supabaseUrl, anonKey);
  const { data: { user }, error } = await authClient.auth.getUser(token);
  return error ? null : user?.id || null;
};

const buildDateFor = () => new Date().toISOString().slice(0, 10);

const callGroq = async (system: string, prompt: string, maxTokens = 5000) => {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) throw new Error('Resume AI is not configured right now.');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: Deno.env.get('GROQ_MODEL') || 'openai/gpt-oss-20b',
      messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) throw new Error('Resume AI could not complete that request. Please try again.');
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('Resume AI returned an empty response. Please try again.');
  try {
    return JSON.parse(content);
  } catch {
    throw new Error('Resume AI returned an invalid response. Please try again.');
  }
};

const getProfileResumeData = (profile: JsonRecord, email: string): ResumeData => {
  const work = Array.isArray(profile.work_experience) ? profile.work_experience : [];
  const education = Array.isArray(profile.education_details) ? profile.education_details : [];
  const projects = Array.isArray(profile.projects) ? profile.projects : [];
  const certifications = Array.isArray(profile.certifications) ? profile.certifications : [];
  const location = [profile.city, profile.state, profile.country].filter(Boolean).join(', ') || text(profile.location);
  return normalizeResume({
    personal: {
      fullName: profile.name, title: profile.current_designation, email: profile.email || email, phone: profile.phone, location,
      linkedin: profile.linkedin_url, github: profile.github_url, portfolio: profile.portfolio_url,
    },
    summary: profile.bio,
    skills: profile.skills,
    experience: work.map((item: JsonRecord) => ({
      company: item.company || item.organization, title: item.position || item.title || item.role,
      location: item.location, startDate: item.start_date || item.startDate, endDate: item.end_date || item.endDate || item.duration,
      current: item.current === true || item.is_current === true,
      bullets: [...stringArray(item.responsibilities), ...stringArray(item.achievements), ...stringArray(item.description)],
    })),
    education: education.map((item: JsonRecord) => ({
      degree: [item.degree, item.field].filter(Boolean).join(' '), institution: item.school || item.institution,
      location: item.location, startDate: item.start_date || item.startDate, endDate: item.end_date || item.endDate || item.year, grade: item.grade || item.gpa,
    })),
    projects: projects.map((item: JsonRecord) => ({ name: item.title || item.name, role: item.role, description: item.description, technologies: item.technologies, url: item.url || item.project_url })),
    certifications: certifications.map((item: JsonRecord) => ({ name: item.name || item.title, issuer: item.issuer || item.organization, issueDate: item.issue_date || item.year, credentialId: item.credential_id, url: item.url })),
  });
};

const hasResumeFacts = (resume: ResumeData) => Boolean(
  resume.personal.fullName || resume.personal.title || resume.summary || resume.skills.length || resume.experience.length || resume.education.length || resume.projects.length || resume.certifications.length,
);

const hasPremiumAccess = async (userId: string) => {
  const { data } = await admin.from('subscriptions').select('id').eq('user_id', userId).eq('status', 'active').in('plan', ['premium', 'pro']).gt('end_date', new Date().toISOString()).limit(1);
  return Boolean(data?.length);
};

const loadResume = async (resumeId: string, userId: string) => {
  const { data, error } = await admin.from('resumes').select('*').eq('id', resumeId).eq('user_id', userId).single();
  if (error) throw new Error('Resume not found.');
  return data;
};

const reserveBuild = async (userId: string, buildDate: string, name: string, template: string, source: string, target: JsonRecord = {}) => {
  const { data, error } = await admin.from('resumes').insert({
    user_id: userId,
    build_date: buildDate,
    name,
    version_name: name,
    template,
    source,
    status: 'building',
    target_job_id: text(target.jobId) || null,
    target_job_title: text(target.title) || null,
    target_company: text(target.company) || null,
    target_job_description: text(target.description) || null,
    resume_data: {},
  }).select('*').single();
  if (error?.code === '23505') throw new Error('DAILY_BUILD_USED');
  if (error || !data) throw new Error('Unable to reserve today\'s resume build. Please try again.');
  return data;
};

const finishBuild = async (id: string, resumeData: ResumeData, analysis: unknown = null) => {
  const title = resumeData.personal.title || 'Professional Resume';
  const { data, error } = await admin.from('resumes').update({
    name: `${title} Resume`, version_name: `${title} Resume`, resume_data: resumeData, ats_analysis: analysis, status: 'ready', updated_at: new Date().toISOString(),
  }).eq('id', id).select('*').single();
  if (error || !data) throw new Error('Unable to save the generated resume. Please try again.');
  return data;
};

const tailorResumeData = async (facts: ResumeData, target: JsonRecord) => {
  const description = text(target.description);
  if (description.length < 80) throw new Error('Add a job description with enough detail to tailor the resume.');
  const factualRules = 'Return JSON {"resumeData": <same resumeData shape>, "analysis":{"matchedSkills":[],"notFoundInResume":[],"keywords":[],"suggestions":[]}}. Use only facts present in the supplied resume. Missing skills are not candidate claims and must never be added to resumeData.skills. Rephrase and reorganize only; do not invent any details. Candidate may add missing skills manually only if true.';
  const tailored = await callGroq(factualRules, `Tailor this candidate resume to the target job, emphasizing only existing relevant experience, skills, and projects. Candidate resume: ${JSON.stringify(facts)}\nTarget job: ${JSON.stringify({ title: target.title, company: target.company, description })}`, 5000);
  const resumeData = normalizeResume(safeObject(tailored).resumeData);
  if (!hasResumeFacts(resumeData)) throw new Error('Resume AI could not create a valid tailored version. Please try again.');
  return { resumeData, analysis: safeObject(tailored).analysis };
};

const createResume = async (body: JsonRecord, userId: string, userEmail: string, buildDate: string) => {
  const source = text(body.source);
  const template = ['professional', 'modern', 'executive', 'minimal', 'technical'].includes(text(body.template)) ? text(body.template) : 'professional';
  const target = safeObject(body.target);
  let facts: unknown;
  let profile: JsonRecord | null = null;

  if (source === 'profile' || source === 'tailor') {
    if (source === 'tailor' && text(body.resumeId)) {
      const existing = await loadResume(text(body.resumeId), userId);
      facts = normalizeResume(existing.resume_data);
    } else {
      const { data, error } = await admin.from('profiles').select('*').eq('id', userId).single();
      if (error || !data) throw new Error('Your JobPoyt profile could not be loaded. Please try again.');
      profile = data as JsonRecord;
      facts = getProfileResumeData(profile, userEmail);
      if (source === 'profile' && !hasResumeFacts(facts as ResumeData)) throw new Error('Add a name, professional title, skills, experience, education, or projects to your profile before building a resume.');
    }
  } else if (source === 'upload') {
    const resumeText = text(body.resumeText).slice(0, 40000);
    if (resumeText.length < 80) throw new Error('The resume file could not be read. Please upload a valid PDF or DOCX with selectable text.');
    facts = resumeText;
  } else {
    throw new Error('Choose a valid resume creation option.');
  }

  const displayName = source === 'tailor' && text(target.title) ? `${text(target.title)} Resume` : `${text(profile?.current_designation) || text(profile?.name) || 'Professional'} Resume`;
  let reserved;
  try {
    reserved = await reserveBuild(userId, buildDate, displayName, template, source, target);
  } catch (error) {
    if (error instanceof Error && error.message === 'DAILY_BUILD_USED') throw error;
    throw error;
  }

  try {
    const factualRules = 'Return one JSON object matching the requested shape. Use ONLY facts present in the supplied source. Never invent names, employers, titles, dates, degrees, skills, certifications, responsibilities, achievements, metrics, technologies, or URLs. Rephrase and organize only. Keep uncertain or absent facts empty. Do not infer skills from a job description.';
    let resumeData: ResumeData;
    let analysis: unknown = null;
    if (source === 'profile') {
      resumeData = normalizeResume(facts);
      if (!resumeData.summary && (resumeData.personal.title || resumeData.skills.length)) {
        const summaryResult = await callGroq(factualRules, `Write a concise ATS-friendly professional summary using only these verified candidate facts. Return JSON {"summary":"..."}. Facts: ${JSON.stringify({ title: resumeData.personal.title, skills: resumeData.skills, experience: resumeData.experience })}`, 700);
        resumeData.summary = text(safeObject(summaryResult).summary);
      }
    } else if (source === 'upload') {
      const parsed = await callGroq(`${factualRules} Preserve uncertain original phrases in a custom section titled "Review from imported resume" rather than deleting them.`, `Structure this resume text into JSON with keys resumeData and reviewNotes. resumeData must use this shape: {personal:{fullName,title,email,phone,location,linkedin,github,portfolio},summary,experience:[{company,title,location,startDate,endDate,current,bullets:[]}],skills:[],education:[{degree,institution,location,startDate,endDate,grade}],projects:[{name,role,description,technologies:[],url}],certifications:[{name,issuer,issueDate,credentialId,url}],customSections:[{title,items:[]}]}. Source text:\n${String(facts)}`, 5000);
      resumeData = normalizeResume(safeObject(parsed).resumeData);
      if (!hasResumeFacts(resumeData)) throw new Error('We could not identify resume details in that file. Try a text-based PDF or DOCX with selectable text.');
      const notes = stringArray(safeObject(parsed).reviewNotes);
      if (notes.length) resumeData.customSections.push({ title: 'Review imported details', items: notes });
    } else {
      const tailored = await tailorResumeData(normalizeResume(facts), target);
      resumeData = tailored.resumeData;
      analysis = tailored.analysis;
    }
    return await finishBuild(reserved.id, resumeData, analysis);
  } catch (error) {
    await admin.from('resumes').delete().eq('id', reserved.id).eq('user_id', userId);
    throw error;
  }
};

const aiAction = async (body: JsonRecord) => {
  const action = text(body.aiAction);
  const data = normalizeResume(body.resumeData);
  const value = text(body.value);
  const style = text(body.style) || 'professional';
  const facts = JSON.stringify(data);
  if (action === 'generate_summary' || action === 'improve_summary') {
    const result = await callGroq('Return JSON {"value":"..."}. Use only the verified resume facts supplied. Do not create new claims, years, metrics, skills, or qualifications. Keep the summary to 2-4 sentences.', `${action === 'improve_summary' ? 'Improve' : 'Write'} the resume summary in a ${style} style. Current text: ${value}\nVerified resume facts: ${facts}`, 700);
    return { value: text(safeObject(result).value) };
  }
  if (action === 'improve_bullet' || action === 'improve_project') {
    const result = await callGroq('Return JSON {"value":"..."}. Rewrite only the provided text. Preserve its exact factual meaning. Never add results, percentages, technologies, or details.', `Rewrite in a ${style} style: ${value}`, 500);
    return { value: text(safeObject(result).value) };
  }
  if (action === 'generate_bullet') {
    if (!value) throw new Error('Add a rough responsibility or achievement first so AI can rewrite your verified experience.');
    const result = await callGroq('Return JSON {"value":"..."}. Make the supplied fact clearer and action-led without adding outcomes or details.', `Rewrite as one resume bullet: ${value}`, 500);
    return { value: text(safeObject(result).value) };
  }
  if (action === 'organize_skills') {
    const result = await callGroq('Return JSON {"categories":[{"name":"Frontend","skills":[]} ]}. Use only the exact skills in the input; do not add, remove, or rename skills.', `Organize these skills into relevant categories: ${JSON.stringify(data.skills)}`, 900);
    const categories = Array.isArray(safeObject(result).categories) ? safeObject(result).categories : [];
    return { categories };
  }
  if (action === 'analyze_resume') {
    const result = await callGroq('Return JSON {"scores":{"atsCompatibility":0,"contentQuality":0,"keywordAlignment":0,"readability":0},"strengths":[],"improvements":[]}. Scores are advisory indicators, never guarantees. Suggestions must not claim missing facts.', `Analyze this resume${body.jobDescription ? ` against this target description: ${text(body.jobDescription)}` : ''}. Resume: ${facts}`, 1200);
    return { analysis: safeObject(result) };
  }
  if (action === 'generate_cover_letter' || action === 'improve_cover_letter') {
    const result = await callGroq('Return JSON {"value":"..."}. Use only candidate facts in the resume and facts in the job description. Never imply experience or accomplishments not stated. Do not invent a hiring manager name.', `${action === 'improve_cover_letter' ? 'Improve' : 'Write'} a concise professional cover letter. Existing letter: ${value}\nResume facts: ${facts}\nTarget job: ${JSON.stringify(safeObject(body.target))}`, 1400);
    return { value: text(safeObject(result).value) };
  }
  throw new Error('Unsupported AI action.');
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  try {
    const userId = await authUserId(request);
    if (!userId) return json({ error: 'Your session has expired. Please sign in again.' }, 401);
    if (!(await hasPremiumAccess(userId))) return json({ error: 'Resume Studio is available to candidates with an active Premium plan.' }, 403);
    const { data: authData } = await createClient(supabaseUrl, anonKey).auth.getUser(request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]);
    const userEmail = authData.user?.email || '';
    const body = safeObject(await request.json().catch(() => ({})));
    const action = text(body.action);
    const buildDate = buildDateFor();

    if (action === 'dashboard') {
      const { data: resumes, error } = await admin.from('resumes').select('id,name,version_name,tailored_version_name,tailored_resume_data,tailored_ats_analysis,template,source,status,build_date,target_job_id,target_job_title,target_company,target_job_description,is_master,updated_at,created_at,ats_analysis,cover_letter,resume_data,ats_friendly').eq('user_id', userId).order('updated_at', { ascending: false });
      if (error) throw new Error('Unable to load your resumes. Please try again.');
      const { data: profile } = await admin.from('profiles').select('name,email,phone,current_designation,skills,work_experience,education_details').eq('id', userId).maybeSingle();
      const profileData = safeObject(profile);
      const missingProfileInfo = [
        !text(profileData.name) ? 'name' : '',
        !text(profileData.email) ? 'email' : '',
        !text(profileData.current_designation) ? 'professional title' : '',
        stringArray(profileData.skills).length === 0 ? 'skills' : '',
        !Array.isArray(profileData.work_experience) || profileData.work_experience.length === 0 ? 'experience' : '',
      ].filter(Boolean);
      return json({ resumes: resumes || [], buildDate, buildAvailable: !(resumes || []).some((resume) => resume.build_date === buildDate), missingProfileInfo });
    }

    if (action === 'create') {
      const resume = await createResume(body, userId, userEmail, buildDate);
      return json({ resume, buildDate, buildAvailable: false });
    }

    if (action === 'tailor_existing') {
      const existing = await loadResume(text(body.resumeId), userId);
      const target = safeObject(body.target);
      const tailored = await tailorResumeData(normalizeResume(existing.resume_data), target);
      const versionName = `${text(target.title) || 'Job'}${text(target.company) ? ` · ${text(target.company)}` : ''} Resume`;
      const { data: updated, error } = await admin.from('resumes').update({
        tailored_resume_data: tailored.resumeData,
        tailored_version_name: versionName,
        tailored_ats_analysis: tailored.analysis,
        target_job_id: text(target.jobId) || null,
        target_job_title: text(target.title) || null,
        target_company: text(target.company) || null,
        target_job_description: text(target.description),
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id).eq('user_id', userId).select('*').single();
      if (error || !updated) throw new Error('Unable to save the tailored resume. Please try again.');
      return json({ resume: updated });
    }

    if (action === 'save') {
      const resumeId = text(body.resumeId);
      const data = normalizeResume(body.resumeData);
      const updates: JsonRecord = {
        template: text(body.template) || 'professional',
        ats_friendly: body.atsFriendly !== false,
        cover_letter: text(body.coverLetter),
        updated_at: new Date().toISOString(),
      };
      if (body.variant === 'tailored') {
        updates.tailored_resume_data = data;
        updates.tailored_version_name = text(body.name) || 'Tailored Resume';
        updates.target_job_id = text(safeObject(body.target).jobId) || null;
        updates.target_job_title = text(safeObject(body.target).title) || null;
        updates.target_company = text(safeObject(body.target).company) || null;
        updates.target_job_description = text(safeObject(body.target).description) || null;
        updates.tailored_ats_analysis = body.atsAnalysis || null;
      } else {
        updates.resume_data = data;
        updates.name = text(body.name) || `${data.personal.title || 'Professional'} Resume`;
        updates.version_name = text(body.name) || `${data.personal.title || 'Professional'} Resume`;
        updates.ats_analysis = body.atsAnalysis || null;
      }
      const { data: resume, error } = await admin.from('resumes').update(updates).eq('id', resumeId).eq('user_id', userId).select('*').single();
      if (error || !resume) throw new Error('Unable to save your resume. Please try again.');
      return json({ resume });
    }

    if (action === 'ai') return json(await aiAction(body));

    if (action === 'set_template') {
      const { data, error } = await admin.from('resumes').update({ template: text(body.template), updated_at: new Date().toISOString() }).eq('id', text(body.resumeId)).eq('user_id', userId).select('*').single();
      if (error || !data) throw new Error('Unable to update resume template.');
      return json({ resume: data });
    }

    return json({ error: 'Unsupported Resume Studio action.' }, 400);
  } catch (error) {
    if (error instanceof Error && error.message === 'DAILY_BUILD_USED') {
      return json({ code: 'DAILY_BUILD_USED', error: 'Your resume build for today has already been used. Your existing resume is still available to edit and download.' }, 409);
    }
    console.error('resume-studio request failed', error instanceof Error ? error.message : 'unknown error');
    return json({ error: error instanceof Error ? error.message : 'Unable to complete this resume request. Please try again.' }, 400);
  }
});
