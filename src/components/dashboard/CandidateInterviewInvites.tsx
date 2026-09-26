import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  BusinessCenterOutlined as BusinessCenterOutlinedIcon,
  CalendarMonthOutlined as CalendarMonthOutlinedIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  EventBusyOutlined as EventBusyOutlinedIcon,
  GroupsOutlined as GroupsOutlinedIcon,
  HistoryOutlined as HistoryOutlinedIcon,
  LinkOutlined as LinkOutlinedIcon,
  LocationOnOutlined as LocationOnOutlinedIcon,
  ScheduleOutlined as ScheduleOutlinedIcon,
  VideoCallOutlined as VideoCallOutlinedIcon,
  VideocamOutlined as VideocamOutlinedIcon,
  AutoAwesome as AutoAwesomeIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import {
  candidateInterviewInvitesService,
  type CandidateInterviewInvite,
  type InviteResponse,
} from '@services/candidateInterviewInvites';
import type { InterviewPreparationContext } from '@services/candidateInterviewInvites';

const ink = '#14243A';
const muted = '#64748B';
const border = '#E2E8F0';
const panel = { border: `1px solid ${border}`, borderRadius: 2, boxShadow: '0 2px 8px rgba(15,23,42,0.035)', bgcolor: '#FFFFFF' };

type InviteTab = 'upcoming' | 'pending' | 'past' | 'all';
type ActionDialog = { kind: 'accept' | 'decline' | 'reschedule'; invite: CandidateInterviewInvite } | null;
type CandidateInterviewInvitesProps = { onPrepareInterview: (context: InterviewPreparationContext) => void };

const startMillis = (invite: CandidateInterviewInvite) => {
  const [year, month, day] = invite.date.split('-').map(Number);
  const [hour, minute] = invite.time.slice(0, 5).split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return Number.NaN;
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let guess = target;
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: invite.timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    });
    for (let pass = 0; pass < 2; pass += 1) {
      const values = Object.fromEntries(formatter.formatToParts(new Date(guess)).map((part) => [part.type, part.value]));
      const shown = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second));
      guess += target - shown;
    }
  } catch {
    return Number.NaN;
  }
  return guess;
};

const formatDate = (date: string) => {
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(parsed);
};
const formatClock = (instant: number, timeZone: string) => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone }).format(new Date(instant));
const interviewModeLabel = (invite: CandidateInterviewInvite) => {
  if (invite.interview_type !== 'Video' || !invite.meeting_link) return invite.interview_type;
  try {
    const host = new URL(invite.meeting_link).hostname.toLowerCase();
    if (host.includes('meet.google.com')) return 'Google Meet';
    if (host.includes('teams.microsoft.com')) return 'Microsoft Teams';
    if (host.includes('zoom.us')) return 'Zoom';
  } catch {
    return 'Video';
  }
  return 'Video';
};
const formatSpan = (invite: CandidateInterviewInvite) => {
  const start = startMillis(invite);
  if (!Number.isFinite(start)) return `${invite.time} · ${invite.duration} min`;
  return `${formatClock(start, invite.timezone)} – ${formatClock(start + invite.duration * 60000, invite.timezone)}`;
};
const relativeDate = (instant: number) => {
  const delta = Math.ceil((new Date(new Date().toDateString()).getTime() - new Date(new Date(instant).toDateString()).getTime()) / 86400000);
  if (delta === -1) return 'Tomorrow';
  if (delta === 0) return 'Today';
  if (delta > 0) return `${delta} days ago`;
  if (delta < -1) return `In ${Math.abs(delta)} days`;
  return '';
};
const isFinishedStatus = (status: string) => ['Completed', 'Cancelled', 'No Show'].includes(status);
const isPast = (invite: CandidateInterviewInvite, now: number) => {
  if (isFinishedStatus(invite.status) || invite.candidate_response === 'declined') return true;
  const start = startMillis(invite);
  return invite.candidate_response === 'accepted' ? start + invite.duration * 60000 <= now : start <= now;
};
const isPending = (invite: CandidateInterviewInvite, now: number) => !isPast(invite, now) && ['pending', 'reschedule_requested'].includes(invite.candidate_response);
const isUpcoming = (invite: CandidateInterviewInvite, now: number) => !isPast(invite, now) && invite.candidate_response === 'accepted';
const inviteStatusLabel = (invite: CandidateInterviewInvite) => {
  if (invite.status === 'Cancelled' || invite.status === 'Completed' || invite.status === 'No Show') return invite.status;
  if (invite.candidate_response === 'accepted') return 'Confirmed';
  if (invite.candidate_response === 'declined') return 'Declined';
  if (invite.candidate_response === 'reschedule_requested') return 'Reschedule requested';
  return 'Pending response';
};
const statusTone = (invite: CandidateInterviewInvite) => {
  const status = inviteStatusLabel(invite);
  if (status === 'Confirmed' || status === 'Completed') return { color: '#166534', bgcolor: '#ECFDF3' };
  if (status === 'Cancelled' || status === 'Declined' || status === 'No Show') return { color: '#B42318', bgcolor: '#FEF3F2' };
  return { color: '#8A5A12', bgcolor: '#FFF7E6' };
};
const prepareContext = (invite: CandidateInterviewInvite): InterviewPreparationContext => ({
  interviewId: invite.id,
  jobId: invite.job_id || undefined,
  applicationId: invite.application_id || undefined,
  jobTitle: invite.job_title,
  companyName: invite.company_name,
  jobDescription: invite.job_description,
  requiredSkills: invite.required_skills,
  interviewRound: invite.round,
  interviewDate: invite.date,
  interviewTime: invite.time,
  timezone: invite.timezone,
  interviewMode: invite.interview_type,
  interviewer: invite.interviewer,
});

export const CandidateInterviewInvites: React.FC<CandidateInterviewInvitesProps> = ({ onPrepareInterview }) => {
  const [interviews, setInterviews] = useState<CandidateInterviewInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<InviteTab>('upcoming');
  const [dialog, setDialog] = useState<ActionDialog>(null);
  const [details, setDetails] = useState<CandidateInterviewInvite | null>(null);
  const [declineReason, setDeclineReason] = useState('Schedule conflict');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleMessage, setRescheduleMessage] = useState('');
  const [now, setNow] = useState(Date.now());

  const refresh = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError('');
    try {
      const result = await candidateInterviewInvitesService.list();
      setInterviews(result.interviews);
    } catch (loadError) {
      console.error('Unable to load candidate interview invites:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Interview invitations could not be loaded.');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => { void refresh(true); }, []);

  useEffect(() => {
    const boundaries = interviews.flatMap((invite) => {
      if (invite.status !== 'Scheduled' && invite.status !== 'Rescheduled') return [];
      const start = startMillis(invite);
      if (!Number.isFinite(start)) return [];
      const boundary = invite.candidate_response === 'accepted'
        ? start - 10 * 60000 > now ? start - 10 * 60000 : start + invite.duration * 60000
        : start;
      return boundary > now ? [boundary] : [];
    });
    if (!boundaries.length) return undefined;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(Math.min(...boundaries) - now + 50, 2147483000));
    return () => window.clearTimeout(timer);
  }, [interviews, now]);

  const summary = useMemo(() => ({
    upcoming: interviews.filter((item) => !isPast(item, now)).length,
    pending: interviews.filter((item) => isPending(item, now)).length,
    confirmed: interviews.filter((item) => isUpcoming(item, now)).length,
    completed: interviews.filter((item) => item.status === 'Completed').length,
  }), [interviews, now]);

  const nextInterview = useMemo(() => interviews
    .filter((item) => isUpcoming(item, now) && startMillis(item) > now)
    .sort((first, second) => startMillis(first) - startMillis(second))[0] || null, [interviews, now]);

  const visible = useMemo(() => {
    const filtered = interviews.filter((item) => {
      if (tab === 'upcoming') return isUpcoming(item, now);
      if (tab === 'pending') return isPending(item, now);
      if (tab === 'past') return isPast(item, now);
      return true;
    });
    return filtered.sort((first, second) => startMillis(first) - startMillis(second));
  }, [interviews, now, tab]);

  const submitResponse = async () => {
    if (!dialog || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = dialog.kind === 'accept' ? 'accepted' : dialog.kind === 'decline' ? 'declined' : 'reschedule_requested';
      const options = dialog.kind === 'decline'
        ? { reason: declineReason }
        : dialog.kind === 'reschedule'
          ? { date: rescheduleDate, time: rescheduleTime, message: rescheduleMessage }
          : {};
      const result = await candidateInterviewInvitesService.respond(dialog.invite.id, response, options);
      setInterviews((current) => current.map((item) => item.id === result.interview.id ? result.interview : item));
      setDialog(null);
      toast.success(response === 'accepted' ? 'Interview confirmed successfully.' : response === 'declined' ? 'Interview invitation declined.' : 'Reschedule request sent to the recruiter.');
    } catch (actionError) {
      console.error('Unable to update interview invite:', actionError);
      setError(actionError instanceof Error ? actionError.message : 'Your response could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const statusChip = (invite: CandidateInterviewInvite) => <Chip size="small" label={inviteStatusLabel(invite)} sx={{ fontWeight: 750, color: statusTone(invite).color, bgcolor: statusTone(invite).bgcolor }} />;
  const canJoin = (invite: CandidateInterviewInvite) => {
    const start = startMillis(invite);
    return invite.candidate_response === 'accepted' && invite.status !== 'Cancelled' && invite.status !== 'Completed' && invite.status !== 'No Show' && Boolean(invite.meeting_link) && Number.isFinite(start) && now >= start - 10 * 60000 && now < start + invite.duration * 60000;
  };
  const actions = (invite: CandidateInterviewInvite) => {
    const pending = isPending(invite, now);
    const confirmed = invite.candidate_response === 'accepted' && !isPast(invite, now);
    const online = invite.interview_type === 'Video' || Boolean(invite.meeting_link);
    const joinAllowed = canJoin(invite);
    return <Stack direction="row" flexWrap="wrap" gap={0.8}>
      {pending ? <>
        {invite.candidate_response === 'pending' ? <Button size="small" variant="contained" disabled={busy} onClick={() => setDialog({ kind: 'accept', invite })} sx={{ minHeight: 34, textTransform: 'none', bgcolor: '#174A7C' }}>Accept</Button> : null}
        <Button size="small" variant="outlined" disabled={busy} onClick={() => { setDeclineReason('Schedule conflict'); setDialog({ kind: 'decline', invite }); }} sx={{ minHeight: 34, textTransform: 'none' }}>Decline</Button>
        <Button size="small" variant="outlined" disabled={busy} onClick={() => { setRescheduleDate(''); setRescheduleTime(''); setRescheduleMessage(''); setDialog({ kind: 'reschedule', invite }); }} sx={{ minHeight: 34, textTransform: 'none' }}>Request Reschedule</Button>
      </> : null}
      {confirmed && online ? <Button size="small" variant="contained" disabled={!joinAllowed} onClick={() => invite.meeting_link && window.open(invite.meeting_link, '_blank', 'noopener,noreferrer')} startIcon={<VideoCallOutlinedIcon />} sx={{ minHeight: 34, textTransform: 'none', bgcolor: '#174A7C' }}>{joinAllowed ? 'Join Interview' : invite.meeting_link ? 'Join Interview' : 'Meeting link unavailable'}</Button> : null}
      {confirmed ? <Button size="small" variant="outlined" onClick={() => onPrepareInterview(prepareContext(invite))} startIcon={<AutoAwesomeIcon />} sx={{ minHeight: 34, textTransform: 'none' }}>Prepare with AI</Button> : null}
      <Button size="small" onClick={() => setDetails(invite)} sx={{ minHeight: 34, textTransform: 'none' }}>View Details</Button>
      {confirmed && online && !joinAllowed && invite.meeting_link ? <Typography variant="caption" sx={{ alignSelf: 'center', color: muted }}>Join available 10 minutes before the interview.</Typography> : null}
    </Stack>;
  };

  const inviteCard = (invite: CandidateInterviewInvite, highlighted = false) => (
    <Card key={invite.id} sx={{ ...panel, p: { xs: 1.4, md: 1.75 }, borderColor: highlighted ? '#8FB9DD' : border, boxShadow: highlighted ? '0 8px 22px rgba(23,74,124,0.09)' : panel.boxShadow }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1.2}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {highlighted ? <Typography variant="caption" sx={{ display: 'block', mb: 0.45, color: '#1D4ED8', fontWeight: 850, letterSpacing: 0.5 }}>NEXT INTERVIEW</Typography> : null}
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
            <Box sx={{ minWidth: 0 }}><Typography variant="caption" sx={{ color: '#1D4ED8', fontWeight: 800 }}>{invite.round}</Typography><Typography variant="subtitle1" sx={{ mt: 0.15, color: ink, fontWeight: 850, lineHeight: 1.25 }}>{invite.job_title}</Typography><Typography variant="body2" sx={{ color: muted, mt: 0.2 }}>{invite.company_name || 'Company not listed'}</Typography></Box>
            {statusChip(invite)}
          </Stack>
          <Box className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.1" sx={{ mt: 1.1 }}>
            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.6, color: '#475569' }}><CalendarMonthOutlinedIcon sx={{ fontSize: 16, color: muted }} />{formatDate(invite.date)} · {relativeDate(startMillis(invite))}</Typography>
            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.6, color: '#475569' }}><ScheduleOutlinedIcon sx={{ fontSize: 16, color: muted }} />{formatSpan(invite)} · {invite.timezone}</Typography>
            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.6, color: '#475569' }}><VideocamOutlinedIcon sx={{ fontSize: 16, color: muted }} />{interviewModeLabel(invite)}{invite.location ? ` · ${invite.location}` : ''}</Typography>
            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.6, color: '#475569' }}><GroupsOutlinedIcon sx={{ fontSize: 16, color: muted }} />{invite.interviewer || 'Interviewer details not provided'}</Typography>
          </Box>
          {invite.candidate_response === 'reschedule_requested' && invite.reschedule_date ? <Typography variant="caption" sx={{ display: 'block', mt: 0.8, color: '#8A5A12' }}>Requested: {formatDate(invite.reschedule_date)} at {invite.reschedule_time}{invite.reschedule_message ? ` · ${invite.reschedule_message}` : ''}</Typography> : null}
          {invite.recruiter_message ? <Typography variant="body2" sx={{ mt: 0.8, color: '#475569', lineHeight: 1.45 }}>{invite.recruiter_message}</Typography> : null}
        </Box>
        <Box sx={{ alignSelf: { md: 'flex-end' }, flexShrink: 0 }}>{actions(invite)}</Box>
      </Stack>
    </Card>
  );

  const empty = tab === 'pending'
    ? { title: 'No pending invitations', detail: "You don't have any interview invitations waiting for your response.", Icon: EventBusyOutlinedIcon }
    : tab === 'past'
      ? { title: 'No past interviews', detail: 'Your completed and previous interviews will appear here.', Icon: HistoryOutlinedIcon }
      : tab === 'all'
        ? { title: 'No interview invitations yet', detail: 'Recruiter interview invitations will appear here when an interview is scheduled with you.', Icon: CalendarMonthOutlinedIcon }
        : { title: 'No upcoming interviews', detail: 'Recruiter interview invitations will appear here when a recruiter schedules an interview with you.', Icon: CalendarMonthOutlinedIcon };

  const detailRows = details ? [
    ['Job title', details.job_title], ['Company', details.company_name || 'Not provided'], ['Interview round', details.round], ['Status', inviteStatusLabel(details)],
    ['Date', formatDate(details.date)], ['Time', formatSpan(details)], ['Duration', `${details.duration} minutes`], ['Timezone', details.timezone],
    ['Interview mode', interviewModeLabel(details)], ['Meeting link', details.meeting_link || 'Not provided'], ['Location', details.location || 'Not provided'],
    ['Interviewer', details.interviewer || 'Not provided'], ['Interviewer email', details.interviewer_email || 'Not provided'],
    ['Recruiter message', details.recruiter_message || 'No message'],
    ['Candidate response', details.candidate_response === 'accepted' ? `Accepted${details.candidate_response_at ? ` · ${new Date(details.candidate_response_at).toLocaleString()}` : ''}` : details.candidate_response === 'declined' ? `Declined${details.decline_reason ? ` · ${details.decline_reason}` : ''}` : details.candidate_response === 'reschedule_requested' ? `Reschedule requested${details.reschedule_date ? ` · ${formatDate(details.reschedule_date)} ${details.reschedule_time || ''}` : ''}` : 'Awaiting your response'],
    ['Created', new Date(details.created_at).toLocaleString()], ['Updated', new Date(details.updated_at).toLocaleString()],
  ] : [];

  return <Stack spacing={1.6} sx={{ minWidth: 0 }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1}>
      <Box><Typography variant="h5" sx={{ color: ink, fontWeight: 850, fontSize: { xs: 20, sm: 23 } }}>Interview Invites</Typography><Typography variant="body2" sx={{ mt: 0.35, color: muted }}>Manage recruiter invitations, upcoming interviews, and your interview history.</Typography></Box>
      <Chip icon={<CalendarMonthOutlinedIcon />} label={`Upcoming interviews: ${summary.upcoming}`} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, bgcolor: '#EEF4FF', color: '#174A7C', fontWeight: 800 }} />
    </Stack>

    <Box className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {[
        ['Upcoming', summary.upcoming, CalendarMonthOutlinedIcon, '#174A7C'],
        ['Pending Response', summary.pending, ScheduleOutlinedIcon, '#8A5A12'],
        ['Confirmed', summary.confirmed, CheckCircleOutlineIcon, '#16704A'],
        ['Completed', summary.completed, HistoryOutlinedIcon, '#475569'],
      ].map(([label, value, Icon, color]) => <Card key={String(label)} sx={{ ...panel, p: { xs: 1.15, sm: 1.3 }, borderTop: `3px solid ${color}` }}><Stack direction="row" alignItems="center" justifyContent="space-between" gap={0.5}><Box><Typography variant="caption" sx={{ color: muted, fontWeight: 700 }}>{label}</Typography><Typography variant="h6" sx={{ mt: 0.1, color: ink, fontWeight: 850 }}>{value}</Typography></Box><Avatar sx={{ width: 32, height: 32, bgcolor: '#F1F5F9', color }}><Icon sx={{ fontSize: 18 }} /></Avatar></Stack></Card>)}
    </Box>

    {nextInterview ? inviteCard(nextInterview, true) : null}
    {error ? <Alert severity="error" action={<Button size="small" onClick={() => void refresh()} sx={{ textTransform: 'none' }}>Retry</Button>}>{error}</Alert> : null}

    <Card sx={{ ...panel, overflow: 'hidden' }}>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ px: 0.5, minHeight: 44, borderBottom: `1px solid ${border}`, '& .MuiTab-root': { minHeight: 44, textTransform: 'none', fontWeight: 750 } }}>
        <Tab value="upcoming" label={`Upcoming (${summary.confirmed})`} />
        <Tab value="pending" label={`Pending Response (${summary.pending})`} />
        <Tab value="past" label="Past Interviews" />
        <Tab value="all" label="All" />
      </Tabs>
      <Box sx={{ p: { xs: 1.2, sm: 1.5 }, minWidth: 0 }}>
        {loading ? <Stack spacing={1.1}><Typography variant="caption" sx={{ color: muted }}>Loading invitations...</Typography>{[0, 1].map((key) => <Card key={key} sx={{ ...panel, p: 1.5 }}><Skeleton width="36%" /><Skeleton width="55%" /><Skeleton width="80%" /></Card>)}</Stack> : visible.filter((item) => tab !== 'upcoming' || item.id !== nextInterview?.id).length ? <Stack spacing={1}>{visible.filter((item) => tab !== 'upcoming' || item.id !== nextInterview?.id).map((item) => inviteCard(item))}</Stack> : tab === 'upcoming' && nextInterview ? <Box sx={{ py: 1.4, textAlign: 'center' }}><Typography variant="caption" sx={{ color: muted }}>No other confirmed upcoming interviews.</Typography></Box> : <Box sx={{ py: { xs: 3, md: 4 }, px: 2, textAlign: 'center' }}><Avatar sx={{ width: 48, height: 48, mx: 'auto', bgcolor: '#EEF4FF', color: '#174A7C' }}><empty.Icon /></Avatar><Typography variant="subtitle1" sx={{ mt: 1, color: ink, fontWeight: 850 }}>{empty.title}</Typography><Typography variant="body2" sx={{ mt: 0.35, color: muted, maxWidth: 460, mx: 'auto' }}>{empty.detail}</Typography></Box>}
      </Box>
    </Card>

    <Dialog open={Boolean(dialog)} onClose={() => !busy && setDialog(null)} fullWidth maxWidth="sm">
      {dialog ? <>
        <DialogTitle sx={{ color: ink, fontWeight: 850 }}>{dialog.kind === 'accept' ? 'Confirm Interview' : dialog.kind === 'decline' ? 'Decline Interview?' : 'Request Interview Reschedule'}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 1.2, color: muted }}>{dialog.kind === 'accept' ? 'Are you sure you want to confirm your attendance for this interview?' : dialog.kind === 'decline' ? 'Are you sure you want to decline this interview invitation?' : 'Share a preferred date and time with the recruiter. The original interview remains scheduled until they respond.'}</Typography>
          <Card sx={{ ...panel, mb: 1.4, p: 1.2, bgcolor: '#F8FAFC' }}><Typography variant="body2" sx={{ color: ink, fontWeight: 800 }}>{dialog.invite.job_title} · {dialog.invite.company_name || 'Company not listed'}</Typography><Typography variant="caption" sx={{ color: muted }}>{dialog.invite.round} · {formatDate(dialog.invite.date)} · {formatSpan(dialog.invite)} · {dialog.invite.timezone}</Typography></Card>
          {dialog.kind === 'decline' ? <TextField select fullWidth size="small" label="Reason (optional)" value={declineReason} onChange={(event) => setDeclineReason(event.target.value)}>{['Schedule conflict', 'No longer interested', 'Unable to attend', 'Other'].map((item) => <MenuItem value={item} key={item}>{item}</MenuItem>)}</TextField> : null}
          {dialog.kind === 'reschedule' ? <Stack spacing={1.2}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}><TextField fullWidth size="small" type="date" label="Preferred date" InputLabelProps={{ shrink: true }} inputProps={{ min: new Date().toISOString().slice(0, 10) }} value={rescheduleDate} onChange={(event) => setRescheduleDate(event.target.value)} /><TextField fullWidth size="small" type="time" label="Preferred time" InputLabelProps={{ shrink: true }} value={rescheduleTime} onChange={(event) => setRescheduleTime(event.target.value)} /></Stack><TextField fullWidth size="small" multiline minRows={3} label="Message" placeholder="Please let the recruiter know why you would like to reschedule." value={rescheduleMessage} onChange={(event) => setRescheduleMessage(event.target.value)} inputProps={{ maxLength: 1200 }} /></Stack> : null}
          {error ? <Alert severity="error" sx={{ mt: 1.2 }}>{error}</Alert> : null}
        </DialogContent>
        <DialogActions sx={{ p: 1.5 }}><Button disabled={busy} onClick={() => setDialog(null)} sx={{ textTransform: 'none' }}>Cancel</Button><Button disabled={busy || (dialog.kind === 'reschedule' && (!rescheduleDate || !rescheduleTime))} onClick={() => void submitResponse()} variant="contained" color={dialog.kind === 'decline' ? 'error' : 'primary'} sx={{ textTransform: 'none', fontWeight: 750 }}>{busy ? <CircularProgress size={18} color="inherit" /> : dialog.kind === 'accept' ? 'Confirm Interview' : dialog.kind === 'decline' ? 'Decline Interview' : 'Send Request'}</Button></DialogActions>
      </> : null}
    </Dialog>

    <Dialog open={Boolean(details)} onClose={() => setDetails(null)} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, color: ink, fontWeight: 850 }}>Interview Details<Button aria-label="Close details" onClick={() => setDetails(null)} sx={{ minWidth: 32, p: 0.5 }}><CloseIcon fontSize="small" /></Button></DialogTitle>
      <DialogContent dividers>
        {details ? <><Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ mb: 1.2 }}><Box><Typography variant="h6" sx={{ color: ink, fontWeight: 850 }}>{details.job_title}</Typography><Typography variant="body2" sx={{ color: muted }}>{details.company_name || 'Company not listed'} · {details.round}</Typography></Box>{statusChip(details)}</Stack><Box className="grid grid-cols-1 sm:grid-cols-2 gap-2">{detailRows.map(([label, value]) => <Box key={label} sx={{ minWidth: 0, p: 1, border: `1px solid ${border}`, borderRadius: 1.5, bgcolor: '#FFFFFF' }}><Typography variant="caption" sx={{ color: muted, fontWeight: 750 }}>{label}</Typography><Typography variant="body2" sx={{ mt: 0.2, color: ink, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{value}</Typography></Box>)}</Box>{details.feedback_visible_to_candidate && details.feedback ? <Card sx={{ ...panel, mt: 1.5, p: 1.4 }}><Typography variant="subtitle2" sx={{ color: ink, fontWeight: 850 }}>Recruiter feedback</Typography><Typography variant="body2" sx={{ mt: 0.5, color: muted, whiteSpace: 'pre-wrap' }}>{typeof details.feedback === 'string' ? details.feedback : JSON.stringify(details.feedback, null, 2)}</Typography></Card> : null}</> : null}
      </DialogContent>
      <DialogActions sx={{ p: 1.5 }}>{details && details.candidate_response === 'accepted' && (details.interview_type === 'Video' || details.meeting_link) ? <Button disabled={!canJoin(details) || !details.meeting_link} onClick={() => details.meeting_link && window.open(details.meeting_link, '_blank', 'noopener,noreferrer')} startIcon={<LinkOutlinedIcon />} variant="contained" sx={{ textTransform: 'none' }}>{canJoin(details) ? 'Join Interview' : 'Join available 10 minutes before the interview'}</Button> : null}<Button onClick={() => setDetails(null)} sx={{ textTransform: 'none' }}>Close</Button></DialogActions>
    </Dialog>
  </Stack>;
};
