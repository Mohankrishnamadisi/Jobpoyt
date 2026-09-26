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

type Row = Record<string, any>;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const text = (value: unknown, max = 4000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const record = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
const list = (value: unknown): string[] => Array.isArray(value) ? value.map((item) => text(item, 120)).filter(Boolean) : typeof value === 'string' ? value.split(/[,|;\/\n]/).map((item) => item.trim()).filter(Boolean) : [];
const localTimeToUtc = (date: string, time: string, timeZone: string) => {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return Number.NaN;
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let guess = target;
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  for (let pass = 0; pass < 2; pass += 1) {
    const values = Object.fromEntries(formatter.formatToParts(new Date(guess)).map((part) => [part.type, part.value]));
    const shown = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second));
    guess += target - shown;
  }
  return guess;
};

const authUser = async (request: Request) => {
  const token = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !anonKey) return null;
  const authClient = createClient(supabaseUrl, anonKey);
  const { data: { user }, error } = await authClient.auth.getUser(token);
  return error ? null : user || null;
};

const normalizeInvite = (row: Row, job: Row = {}) => ({
  id: String(row.id),
  recruiter_id: String(row.recruiter_id),
  candidate_id: String(row.candidate_id),
  job_id: row.job_id ? String(row.job_id) : null,
  application_id: row.application_id ? String(row.application_id) : null,
  job_title: String(row.job_title || job.title || 'Interview'),
  company_name: String(job.company_name || ''),
  job_description: [job.description, job.responsibilities, job.requirements]
    .map((value) => Array.isArray(value) ? value.map((item) => text(item, 1000)).join('\n') : text(value, 2500))
    .filter(Boolean).join('\n\n').slice(0, 6000),
  required_skills: list(job.skills),
  round: String(row.round || 'Interview'),
  interview_type: row.interview_type,
  date: String(row.date || ''),
  time: String(row.time || ''),
  duration: Number(row.duration || 30),
  timezone: String(row.timezone || 'UTC'),
  meeting_link: row.meeting_link || null,
  location: row.location || null,
  interviewer: String(row.interviewer || ''),
  interviewer_email: row.interviewer_email || null,
  recruiter_message: String(row.instructions || ''),
  status: row.status,
  candidate_response: row.candidate_response || 'pending',
  candidate_response_at: row.candidate_response_at || null,
  decline_reason: row.decline_reason || null,
  reschedule_date: row.reschedule_date || null,
  reschedule_time: row.reschedule_time || null,
  reschedule_message: row.reschedule_message || null,
  created_at: row.created_at,
  updated_at: row.updated_at,
  completed_at: row.completed_at || (row.status === 'Completed' ? row.updated_at : null),
  feedback: row.feedback_visible_to_candidate ? row.feedback || null : null,
  feedback_visible_to_candidate: row.feedback_visible_to_candidate === true,
});

const loadOwnedInterview = async (id: string, column: 'candidate_id' | 'recruiter_id', userId: string) => {
  const { data, error } = await admin.from('interviews').select('*').eq('id', id).eq(column, userId).maybeSingle();
  if (error) throw new Error('Unable to load this interview invitation.');
  if (!data) throw new Error('Interview invitation not found.');
  return data as Row;
};

const loadJobMap = async (rows: Row[]) => {
  const ids = [...new Set(rows.map((row) => row.job_id).filter(Boolean).map(String))];
  if (!ids.length) return new Map<string, Row>();
  const { data, error } = await admin.from('jobs').select('*').in('id', ids);
  if (error) return new Map<string, Row>();
  return new Map((data || []).map((job: Row) => [String(job.id), job]));
};

const notify = async (userId: string, title: string, message: string, data: Row) => {
  const { error } = await admin.from('notifications').insert({
    user_id: userId,
    type: 'application_status',
    title,
    message,
    data,
    read: false,
  });
  if (error) console.warn('Interview invite notification could not be created:', error.message);
};

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  try {
    const user = await authUser(request);
    if (!user) return json({ error: 'Your sign-in session has expired. Please sign in again.' }, 401);
    const body = record(await request.json().catch(() => ({})));
    const action = text(body.action, 40);

    if (action === 'list') {
      const { data, error } = await admin.from('interviews').select('*').eq('candidate_id', user.id).order('date', { ascending: true }).order('time', { ascending: true });
      if (error) throw new Error('Interview invitations could not be loaded.');
      const rows = data || [];
      const jobs = await loadJobMap(rows);
      return json({ interviews: rows.map((row: Row) => normalizeInvite(row, jobs.get(String(row.job_id)) || {})) });
    }

    if (action === 'respond') {
      const interviewId = text(body.interviewId, 80);
      const response = text(body.response, 40);
      if (!interviewId || !['accepted', 'declined', 'reschedule_requested'].includes(response)) return json({ error: 'Invalid interview response.' }, 400);
      const current = await loadOwnedInterview(interviewId, 'candidate_id', user.id);
      if (current.status === 'Cancelled' || current.status === 'Completed' || current.status === 'No Show') return json({ error: 'This interview is no longer accepting responses.' }, 409);
      const now = new Date().toISOString();
      const update: Row = { candidate_response: response, candidate_response_at: now, updated_at: now };
      if (response === 'declined') {
        update.decline_reason = text(body.reason, 100) || null;
      }
      if (response === 'reschedule_requested') {
        const requestedDate = text(body.date, 10);
        const requestedTime = text(body.time, 8);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || !/^\d{2}:\d{2}$/.test(requestedTime)) return json({ error: 'Choose a valid preferred date and time.' }, 400);
        let requestedAt = Number.NaN;
        try { requestedAt = localTimeToUtc(requestedDate, requestedTime, String(current.timezone || 'UTC')); } catch {}
        if (!Number.isFinite(requestedAt) || requestedAt <= Date.now()) return json({ error: 'Choose a future preferred date and time.' }, 400);
        update.reschedule_date = requestedDate;
        update.reschedule_time = requestedTime;
        update.reschedule_message = text(body.message, 1200);
        update.reschedule_requested_at = now;
      }
      const { data, error } = await admin.from('interviews').update(update).eq('id', interviewId).eq('candidate_id', user.id).eq('candidate_response', current.candidate_response || 'pending').select('*').maybeSingle();
      if (error) throw new Error('Your response could not be saved. Please try again.');
      if (!data) return json({ error: 'This invitation was updated elsewhere. Refresh and review its current status.' }, 409);
      const company = text((await loadJobMap([data as Row])).get(String(data.job_id))?.company_name, 180);
      const message = response === 'accepted'
        ? `${text(user.user_metadata?.name, 100) || 'The candidate'} confirmed the ${data.round} interview for ${data.job_title}.`
        : response === 'declined'
          ? `The candidate declined the ${data.round} interview for ${data.job_title}.`
          : `The candidate requested a new time for the ${data.round} interview for ${data.job_title}: ${update.reschedule_date} at ${update.reschedule_time}.${update.reschedule_message ? ` Message: ${update.reschedule_message}` : ''}`;
      await notify(String(data.recruiter_id), response === 'accepted' ? 'Interview Confirmed' : response === 'declined' ? 'Interview Declined' : 'Reschedule Requested', message, {
        interviewId,
        applicationId: data.application_id,
        companyName: company,
        candidateResponse: response,
        requestedDate: update.reschedule_date || null,
        requestedTime: update.reschedule_time || null,
        rescheduleMessage: update.reschedule_message || null,
      });
      const jobs = await loadJobMap([data as Row]);
      return json({ interview: normalizeInvite(data as Row, jobs.get(String(data.job_id)) || {}) });
    }

    if (action === 'notify_candidate') {
      const interviewId = text(body.interviewId, 80);
      if (!interviewId) return json({ error: 'Interview is missing.' }, 400);
      const row = await loadOwnedInterview(interviewId, 'recruiter_id', user.id);
      const profileResult = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (String(profileResult.data?.role || '').toLowerCase() !== 'recruiter') return json({ error: 'Only the recruiting account can send this invite.' }, 403);
      const jobMap = await loadJobMap([row]);
      const invite = normalizeInvite(row, jobMap.get(String(row.job_id)) || {});
      await notify(String(row.candidate_id), 'New Interview Invitation', `${invite.company_name ? `${invite.company_name} · ` : ''}${invite.job_title} · ${invite.round}`, { interviewId, premiumTool: 'Interview Invites' });
      return json({ notified: true });
    }

    return json({ error: 'Unsupported interview invite action.' }, 400);
  } catch (error) {
    console.error('candidate-interview-invites error', error);
    return json({ error: error instanceof Error ? error.message : 'Interview invitation request failed.' }, 500);
  }
});