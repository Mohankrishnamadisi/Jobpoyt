import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tabs,
  Tab,
  TextField,
  Tooltip,
  Typography,
  Checkbox,
  Divider,
  useMediaQuery,
  useTheme,
  CircularProgress,
} from '@mui/material';
import { RecruiterPageHero } from './RecruiterPageHero';
import {
  CalendarMonth as CalendarMonthIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Event as EventIcon,
  EventAvailable as EventAvailableIcon,
  EventBusy as EventBusyIcon,
  Feedback as FeedbackIcon,
  FilterAlt as FilterAltIcon,
  NotificationsActive as NotificationsActiveIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { format, isToday, isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addDays, addMonths, addWeeks, subDays, subMonths, subWeeks } from 'date-fns';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { themeColors } from '@styles/recruiterTheme';
import {
  AtsOutcomeStage,
  createInterview,
  exportInterviewsCsv,
  getInterviewReminders,
  getRecruiterInterviewContext,
  InterviewFeedback,
  InterviewRecord,
  InterviewStatus,
  InterviewType,
  listInterviews,
  RecruiterInterviewContext,
  rescheduleInterview,
  sendInterviewReminderMessage,
  submitInterviewFeedback,
  triggerCsvDownload,
  updateInterview,
  bulkUpdateInterviewStatus,
  cancelInterview,
  completeInterview,
} from '@services/interviewManagement';

interface InterviewManagementProps {
  recruiterId: string;
}

type ViewMode = 'dashboard' | 'list' | 'calendar';
type CalendarMode = 'monthly' | 'weekly' | 'daily';

interface InterviewFormState {
  candidateRef: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  candidateResumeUrl: string;
  applicationId: string;
  jobId: string;
  jobTitle: string;
  round: string;
  interviewType: InterviewType;
  date: string;
  time: string;
  duration: number;
  timezone: string;
  interviewer: string;
  meetingLink: string;
  location: string;
  instructions: string;
  notes: string;
  attachmentsText: string;
}

const MotionBox = motion(Box);

const statusColorMap: Record<InterviewStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  Scheduled: 'info',
  Completed: 'success',
  Cancelled: 'error',
  Rescheduled: 'warning',
  'No Show': 'default',
};

const defaultForm = (): InterviewFormState => ({
  candidateRef: '',
  candidateId: '',
  candidateName: '',
  candidateEmail: '',
  candidatePhone: '',
  candidateResumeUrl: '',
  applicationId: '',
  jobId: '',
  jobTitle: '',
  round: 'Round 1',
  interviewType: 'Video',
  date: format(new Date(), 'yyyy-MM-dd'),
  time: '10:00',
  duration: 45,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  interviewer: '',
  meetingLink: '',
  location: '',
  instructions: '',
  notes: '',
  attachmentsText: '',
});

const feedbackDefaults = (): InterviewFeedback => ({
  technicalRating: 3,
  communication: 3,
  problemSolving: 3,
  cultureFit: 3,
  overallRating: 3,
  decision: 'Next Round',
  comments: '',
});

function interviewDateTime(interview: InterviewRecord): number {
  return new Date(`${interview.date}T${interview.time || '00:00'}:00`).getTime();
}

function toAttachmentList(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDateTime(interview: InterviewRecord): string {
  const when = new Date(`${interview.date}T${interview.time || '00:00'}:00`);
  if (Number.isNaN(when.getTime())) return `${interview.date} ${interview.time}`;
  return format(when, 'dd MMM yyyy, hh:mm a');
}

function toFormState(interview: InterviewRecord): InterviewFormState {
  return {
    candidateRef: interview.applicationId || interview.candidateId,
    candidateId: interview.candidateId,
    candidateName: interview.candidateName,
    candidateEmail: interview.candidateEmail || '',
    candidatePhone: interview.candidatePhone || '',
    candidateResumeUrl: interview.candidateResumeUrl || '',
    applicationId: interview.applicationId || '',
    jobId: interview.jobId,
    jobTitle: interview.jobTitle,
    round: interview.round,
    interviewType: interview.interviewType,
    date: interview.date,
    time: interview.time,
    duration: interview.duration,
    timezone: interview.timezone,
    interviewer: interview.interviewer,
    meetingLink: interview.meetingLink || '',
    location: interview.location || '',
    instructions: interview.instructions || '',
    notes: interview.notes || '',
    attachmentsText: (interview.attachments || []).join('\n'),
  };
}

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string }> = ({
  title,
  value,
  icon,
  color,
}) => (
  <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>
            {title}
          </Typography>
          <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 800, color: themeColors.text.primary }}>
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 1.5,
            display: 'grid',
            placeItems: 'center',
            bgcolor: `${color}1a`,
            color,
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const InterviewManagement: React.FC<InterviewManagementProps> = ({ recruiterId }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [context, setContext] = useState<RecruiterInterviewContext>({ jobs: [], candidates: [] });
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('monthly');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InterviewStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | InterviewType>('all');
  const [jobFilter, setJobFilter] = useState('all');
  const [interviewerFilter, setInterviewerFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [listPage, setListPage] = useState(0);
  const [listRowsPerPage, setListRowsPerPage] = useState(25);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState<InterviewRecord | null>(null);
  const [form, setForm] = useState<InterviewFormState>(defaultForm());
  const [saving, setSaving] = useState(false);

  const [detailsInterview, setDetailsInterview] = useState<InterviewRecord | null>(null);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackInterview, setFeedbackInterview] = useState<InterviewRecord | null>(null);
  const [feedback, setFeedback] = useState<InterviewFeedback>(feedbackDefaults());
  const [feedbackAtsOutcome, setFeedbackAtsOutcome] = useState<AtsOutcomeStage>('Interview Completed');

  const [bulkRescheduleOpen, setBulkRescheduleOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bulkTime, setBulkTime] = useState('10:00');

  const notifiedRemindersRef = useRef<Set<string>>(new Set());
  const remindedInterviewMessageRef = useRef<Set<string>>(new Set());

  const refreshData = async () => {
    setLoading(true);
    try {
      const [ctx, rows] = await Promise.all([
        getRecruiterInterviewContext(recruiterId),
        listInterviews(recruiterId),
      ]);
      setContext(ctx);
      setInterviews(rows);
    } catch (error) {
      console.error('Failed to load interviews:', error);
      toast.error('Failed to load interview management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshData();
  }, [recruiterId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const reminders = getInterviewReminders(interviews);
      reminders.forEach((item) => {
        if (!notifiedRemindersRef.current.has(item.id) && (item.kind === 'start_30' || item.kind === 'completion')) {
          notifiedRemindersRef.current.add(item.id);
          toast(item.message, { icon: item.kind === 'start_30' ? '⏰' : '✅' });

          if (item.kind === 'start_30' && !remindedInterviewMessageRef.current.has(item.interviewId)) {
            const interview = interviews.find((row) => row.id === item.interviewId);
            if (interview) {
              remindedInterviewMessageRef.current.add(item.interviewId);
              void sendInterviewReminderMessage(recruiterId, interview);
            }
          }
        }
      });
    }, 60000);

    return () => window.clearInterval(timer);
  }, [interviews]);

  const reminders = useMemo(() => getInterviewReminders(interviews), [interviews]);

  const interviewerOptions = useMemo(
    () => Array.from(new Set(interviews.map((item) => item.interviewer).filter(Boolean))).sort(),
    [interviews]
  );

  const filteredInterviews = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return interviews
      .filter((item) => {
        if (statusFilter !== 'all' && item.status !== statusFilter) return false;
        if (typeFilter !== 'all' && item.interviewType !== typeFilter) return false;
        if (jobFilter !== 'all' && item.jobId !== jobFilter) return false;
        if (interviewerFilter !== 'all' && item.interviewer !== interviewerFilter) return false;
        if (dateFrom && item.date < dateFrom) return false;
        if (dateTo && item.date > dateTo) return false;
        if (!keyword) return true;

        const haystack = [
          item.candidateName,
          item.jobTitle,
          item.interviewer,
          item.date,
          item.status,
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(keyword);
      })
      .sort((a, b) => interviewDateTime(a) - interviewDateTime(b));
  }, [interviews, search, statusFilter, typeFilter, jobFilter, interviewerFilter, dateFrom, dateTo]);

  const paginatedInterviews = useMemo(
    () => filteredInterviews.slice(listPage * listRowsPerPage, listPage * listRowsPerPage + listRowsPerPage),
    [filteredInterviews, listPage, listRowsPerPage]
  );

  useEffect(() => {
    setListPage(0);
  }, [search, statusFilter, typeFilter, jobFilter, interviewerFilter, dateFrom, dateTo]);

  useEffect(() => {
    const pageCount = Math.max(1, Math.ceil(filteredInterviews.length / listRowsPerPage));
    if (listPage >= pageCount) setListPage(pageCount - 1);
  }, [filteredInterviews.length, listPage, listRowsPerPage]);

  const summary = useMemo(() => {
    const now = Date.now();

    const upcoming = interviews.filter((item) => {
      if (item.status !== 'Scheduled' && item.status !== 'Rescheduled') return false;
      return interviewDateTime(item) >= now;
    }).length;

    const todayCount = interviews.filter((item) => {
      const dt = new Date(`${item.date}T${item.time || '00:00'}:00`);
      return isToday(dt);
    }).length;

    const completed = interviews.filter((item) => item.status === 'Completed').length;
    const cancelled = interviews.filter((item) => item.status === 'Cancelled').length;
    const pendingFeedback = interviews.filter((item) => item.status === 'Completed' && !item.feedbackSubmittedAt).length;

    return { upcoming, todayCount, completed, cancelled, pendingFeedback };
  }, [interviews]);

  const allFilteredSelected = filteredInterviews.length > 0
    && filteredInterviews.every((item) => selectedIds.has(item.id));
  const someFilteredSelected = filteredInterviews.some((item) => selectedIds.has(item.id));

  const openCreateDialog = () => {
    setEditingInterview(null);
    setForm(defaultForm());
    setScheduleOpen(true);
  };

  const openEditDialog = (item: InterviewRecord) => {
    setEditingInterview(item);
    setForm(toFormState(item));
    setScheduleOpen(true);
  };

  const onCandidateRefChange = (candidateRef: string) => {
    const selected = context.candidates.find((item) => item.applicationId === candidateRef || item.candidateId === candidateRef);

    if (!selected) {
      setForm((current) => ({ ...current, candidateRef }));
      return;
    }

    setForm((current) => ({
      ...current,
      candidateRef: selected.applicationId,
      candidateId: selected.candidateId,
      candidateName: selected.candidateName,
      candidateEmail: selected.candidateEmail || '',
      candidatePhone: selected.candidatePhone || '',
      candidateResumeUrl: selected.candidateResumeUrl || '',
      applicationId: selected.applicationId,
      jobId: selected.jobId,
      jobTitle: selected.jobTitle,
    }));
  };

  const onJobChange = (jobId: string) => {
    const matched = context.jobs.find((job) => job.id === jobId);
    setForm((current) => ({
      ...current,
      jobId,
      jobTitle: matched?.title || current.jobTitle,
    }));
  };

  const saveInterview = async () => {
    if (!form.candidateId || !form.jobId || !form.date || !form.time || !form.interviewer.trim()) {
      toast.error('Please fill candidate, job, date, time and interviewer');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        candidateId: form.candidateId,
        candidateName: form.candidateName,
        candidateEmail: form.candidateEmail || undefined,
        candidatePhone: form.candidatePhone || undefined,
        candidateResumeUrl: form.candidateResumeUrl || undefined,
        applicationId: form.applicationId || undefined,
        jobId: form.jobId,
        jobTitle: form.jobTitle,
        round: form.round,
        interviewType: form.interviewType,
        date: form.date,
        time: form.time,
        duration: Number(form.duration) || 30,
        timezone: form.timezone,
        interviewer: form.interviewer,
        meetingLink: form.meetingLink || undefined,
        location: form.location || undefined,
        instructions: form.instructions || undefined,
        notes: form.notes || undefined,
        attachments: toAttachmentList(form.attachmentsText),
      };

      if (!editingInterview) {
        await createInterview(recruiterId, payload);
        toast.success('Interview scheduled successfully');
      } else {
        const timingChanged = editingInterview.date !== form.date || editingInterview.time !== form.time;
        if (timingChanged) {
          await rescheduleInterview(recruiterId, editingInterview.id, payload);
          toast.success('Interview rescheduled');
        } else {
          await updateInterview(recruiterId, editingInterview.id, payload);
          toast.success('Interview updated');
        }
      }

      setScheduleOpen(false);
      setEditingInterview(null);
      setForm(defaultForm());
      await refreshData();
    } catch (error) {
      console.error('Failed to save interview:', error);
      toast.error('Failed to save interview');
    } finally {
      setSaving(false);
    }
  };

  const onToggleSelectAllFiltered = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allFilteredSelected) {
        filteredInterviews.forEach((item) => next.delete(item.id));
      } else {
        filteredInterviews.forEach((item) => next.add(item.id));
      }
      return next;
    });
  };

  const onToggleRow = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onCancelSingle = async (item: InterviewRecord) => {
    try {
      await cancelInterview(recruiterId, item.id, 'Cancelled from interview list');
      toast.success('Interview cancelled');
      await refreshData();
    } catch (error) {
      console.error('Failed to cancel interview:', error);
      toast.error('Failed to cancel interview');
    }
  };

  const onCompleteSingle = async (item: InterviewRecord) => {
    try {
      await completeInterview(recruiterId, item.id, 'Interview Completed');
      toast.success('Interview marked as completed');
      await refreshData();
    } catch (error) {
      console.error('Failed to complete interview:', error);
      toast.error('Failed to mark interview completed');
    }
  };

  const openFeedbackDialog = (item: InterviewRecord) => {
    setFeedbackInterview(item);
    setFeedback(item.feedback || feedbackDefaults());
    if (item.feedback?.decision === 'Hire') setFeedbackAtsOutcome('Offer Sent');
    else if (item.feedback?.decision === 'Reject') setFeedbackAtsOutcome('Rejected');
    else setFeedbackAtsOutcome('Interview Completed');
    setFeedbackOpen(true);
  };

  const submitFeedback = async () => {
    if (!feedbackInterview) return;

    try {
      await submitInterviewFeedback(recruiterId, feedbackInterview.id, feedback, feedbackAtsOutcome);
      toast.success('Feedback submitted and ATS updated');
      setFeedbackOpen(false);
      setFeedbackInterview(null);
      await refreshData();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error('Failed to submit feedback');
    }
  };

  const selectedInterviews = filteredInterviews.filter((item) => selectedIds.has(item.id));

  const exportRows = (rows: InterviewRecord[]) => {
    const csv = exportInterviewsCsv(rows);
    triggerCsvDownload(`interviews-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`, csv);
  };

  const runBulkCancel = async () => {
    if (selectedInterviews.length === 0) return;
    try {
      await bulkUpdateInterviewStatus(recruiterId, selectedInterviews.map((item) => item.id), 'Cancelled');
      toast.success(`Cancelled ${selectedInterviews.length} interview(s)`);
      setSelectedIds(new Set());
      await refreshData();
    } catch (error) {
      console.error('Bulk cancel failed:', error);
      toast.error('Bulk cancel failed');
    }
  };

  const runBulkReschedule = async () => {
    if (selectedInterviews.length === 0 || !bulkDate || !bulkTime) return;

    try {
      await Promise.all(
        selectedInterviews.map((item) => rescheduleInterview(recruiterId, item.id, {
          date: bulkDate,
          time: bulkTime,
          duration: item.duration,
          timezone: item.timezone,
          interviewer: item.interviewer,
        }))
      );
      toast.success(`Rescheduled ${selectedInterviews.length} interview(s)`);
      setBulkRescheduleOpen(false);
      setSelectedIds(new Set());
      await refreshData();
    } catch (error) {
      console.error('Bulk reschedule failed:', error);
      toast.error('Bulk reschedule failed');
    }
  };

  const monthlyDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(calendarDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [calendarDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(calendarDate, { weekStartsOn: 1 });
    const end = endOfWeek(calendarDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [calendarDate]);

  const dayInterviews = useMemo(() => {
    const dayKey = format(calendarDate, 'yyyy-MM-dd');
    return filteredInterviews
      .filter((item) => item.date === dayKey)
      .sort((a, b) => interviewDateTime(a) - interviewDateTime(b));
  }, [filteredInterviews, calendarDate]);

  const moveCalendar = (direction: 'previous' | 'next') => {
    const amount = direction === 'next' ? 1 : -1;
    if (calendarMode === 'daily') {
      setCalendarDate((current) => (amount > 0 ? addDays(current, 1) : subDays(current, 1)));
    } else if (calendarMode === 'weekly') {
      setCalendarDate((current) => (amount > 0 ? addWeeks(current, 1) : subWeeks(current, 1)));
    } else {
      setCalendarDate((current) => (amount > 0 ? addMonths(current, 1) : subMonths(current, 1)));
    }
  };

  const renderDashboardView = () => (
    <>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} lg={2.4 as any}>
          <StatCard title="Upcoming Interviews" value={summary.upcoming} icon={<EventAvailableIcon />} color={themeColors.primary} />
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4 as any}>
          <StatCard title="Today's Interviews" value={summary.todayCount} icon={<CalendarMonthIcon />} color={themeColors.info} />
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4 as any}>
          <StatCard title="Completed Interviews" value={summary.completed} icon={<CheckCircleIcon />} color={themeColors.success} />
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4 as any}>
          <StatCard title="Cancelled Interviews" value={summary.cancelled} icon={<EventBusyIcon />} color={themeColors.danger} />
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4 as any}>
          <StatCard title="Pending Feedback" value={summary.pendingFeedback} icon={<FeedbackIcon />} color={themeColors.warning} />
        </Grid>
      </Grid>

      <Card sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
            <NotificationsActiveIcon color="primary" fontSize="small" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Notifications</Typography>
          </Box>

          {reminders.length === 0 ? (
            <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>
              No interview reminders right now.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {reminders.slice(0, 6).map((item) => (
                <Alert key={item.id} severity={item.severity} variant="outlined">
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.title}</Typography>
                  <Typography variant="body2">{item.message}</Typography>
                </Alert>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.25 }}>
            Upcoming Interview List
          </Typography>
          {filteredInterviews.length === 0 ? (
            <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>
              No interviews found.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {filteredInterviews.slice(0, 8).map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    py: 1,
                    borderBottom: `1px solid ${themeColors.border}`,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.candidateName}</Typography>
                    <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>
                      {item.jobTitle} • {item.round} • {formatDateTime(item)}
                    </Typography>
                  </Box>
                  <Chip size="small" label={item.status} color={statusColorMap[item.status]} />
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </>
  );

  const renderListView = () => (
    <Card sx={{ borderRadius: 3, border: '1px solid rgba(96,165,250,0.24)', background: 'linear-gradient(145deg, #FFFFFF 0%, #F4F8FF 100%)', boxShadow: '0 18px 46px rgba(15,39,75,0.1)', overflow: 'hidden' }}>
      <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h6" sx={{ color: '#16325C', fontWeight: 850 }}>Interview pipeline</Typography>
            <Typography variant="body2" sx={{ color: '#71839B' }}>{filteredInterviews.length.toLocaleString()} interviews match your current view</Typography>
          </Box>
          <Chip label={loading ? 'Syncing...' : 'Live schedule'} color={loading ? 'default' : 'success'} size="small" sx={{ fontWeight: 800 }} />
        </Box>
        <Stack direction={isMobile ? 'column' : 'row'} spacing={1} sx={{ mb: 1.5 }}>
          <TextField
            fullWidth
            placeholder="Search by candidate, job, interviewer, date, status"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: '#5B8CFF' }} /> }}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#FFFFFF', borderRadius: 2 } }}
          />
          <Button variant="outlined" size="small" startIcon={<FilterAltIcon />} onClick={() => {
            setStatusFilter('all');
            setTypeFilter('all');
            setJobFilter('all');
            setInterviewerFilter('all');
            setDateFrom('');
            setDateTo('');
          }}>
            Clear Filters
          </Button>
        </Stack>

        <Grid container spacing={1.25} sx={{ mb: 1.5 }}>
          <Grid item xs={12} sm={6} md={2.4 as any}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(event) => setStatusFilter(event.target.value as any)}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="Scheduled">Scheduled</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
                <MenuItem value="Rescheduled">Rescheduled</MenuItem>
                <MenuItem value="No Show">No Show</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4 as any}>
            <FormControl fullWidth size="small">
              <InputLabel>Interview Type</InputLabel>
              <Select value={typeFilter} label="Interview Type" onChange={(event) => setTypeFilter(event.target.value as any)}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="Video">Video</MenuItem>
                <MenuItem value="Phone">Phone</MenuItem>
                <MenuItem value="In-person">In-person</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4 as any}>
            <FormControl fullWidth size="small">
              <InputLabel>Job</InputLabel>
              <Select value={jobFilter} label="Job" onChange={(event) => setJobFilter(event.target.value)}>
                <MenuItem value="all">All</MenuItem>
                {context.jobs.map((job) => (
                  <MenuItem key={job.id} value={job.id}>{job.title}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4 as any}>
            <FormControl fullWidth size="small">
              <InputLabel>Interviewer</InputLabel>
              <Select value={interviewerFilter} label="Interviewer" onChange={(event) => setInterviewerFilter(event.target.value)}>
                <MenuItem value="all">All</MenuItem>
                {interviewerOptions.map((name) => (
                  <MenuItem key={name} value={name}>{name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={1.2 as any}>
            <TextField
              type="date"
              label="From"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={1.2 as any}>
            <TextField
              type="date"
              label="To"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </Grid>
        </Grid>

        {selectedInterviews.length > 0 && (
          <Box
            sx={{
              mb: 1.5,
              p: 1,
              border: `1px solid ${themeColors.border}`,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {selectedInterviews.length} selected
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" color="error" onClick={runBulkCancel}>Cancel</Button>
              <Button variant="outlined" onClick={() => setBulkRescheduleOpen(true)}>Reschedule</Button>
              <Button variant="outlined" onClick={() => exportRows(selectedInterviews)}>Export CSV</Button>
            </Stack>
          </Box>
        )}

        <TableContainer sx={{ border: '1px solid #D8E5F2', borderRadius: 2.5, overflowX: 'auto', bgcolor: '#FFFFFF', boxShadow: '0 8px 20px rgba(15,39,75,0.04)' }}>
          <Table size="small" sx={{ minWidth: 1060 }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={allFilteredSelected}
                    indeterminate={!allFilteredSelected && someFilteredSelected}
                    onChange={onToggleSelectAllFiltered}
                  />
                </TableCell>
                <TableCell>Candidate</TableCell>
                <TableCell>Job</TableCell>
                <TableCell>Interview Round</TableCell>
                <TableCell>Interview Type</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Interviewer</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedInterviews.map((item) => (
                <TableRow key={item.id} hover sx={{ '&:nth-of-type(even)': { bgcolor: '#FBFDFF' }, '&:hover': { bgcolor: '#F1F7FF' } }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onChange={() => onToggleRow(item.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.candidateName}</Typography>
                    <Typography variant="caption" sx={{ color: themeColors.text.secondary }}>{item.candidateEmail || '-'}</Typography>
                  </TableCell>
                  <TableCell>{item.jobTitle}</TableCell>
                  <TableCell>{item.round}</TableCell>
                  <TableCell>{item.interviewType}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>{item.time}</TableCell>
                  <TableCell>{item.duration} min</TableCell>
                  <TableCell>{item.interviewer}</TableCell>
                  <TableCell><Chip size="small" label={item.status} color={statusColorMap[item.status]} /></TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Details">
                        <IconButton size="small" onClick={() => setDetailsInterview(item)}><VisibilityIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Edit / Reschedule">
                        <IconButton size="small" onClick={() => openEditDialog(item)}><RefreshIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Feedback">
                        <IconButton size="small" onClick={() => openFeedbackDialog(item)}><FeedbackIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Cancel">
                        <IconButton size="small" color="error" onClick={() => onCancelSingle(item)}><CloseIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {filteredInterviews.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11}>
                    <Typography variant="body2" sx={{ py: 2, textAlign: 'center', color: themeColors.text.secondary }}>
                      No interviews match current search/filter.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredInterviews.length}
          page={listPage}
          onPageChange={(_, nextPage) => setListPage(nextPage)}
          rowsPerPage={listRowsPerPage}
          rowsPerPageOptions={[25, 50, 100]}
          onRowsPerPageChange={(event) => {
            setListRowsPerPage(Number(event.target.value));
            setListPage(0);
          }}
          labelRowsPerPage="Rows"
          sx={{ border: '1px solid #D8E5F2', borderTop: 0, borderRadius: '0 0 12px 12px', bgcolor: '#FBFDFF' }}
        />
      </CardContent>
    </Card>
  );

  const renderCalendarView = () => (
    <Card sx={{ borderRadius: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.25 }}>
          <Tabs value={calendarMode} onChange={(_, value) => setCalendarMode(value)}>
            <Tab value="monthly" label="Monthly" />
            <Tab value="weekly" label="Weekly" />
            <Tab value="daily" label="Daily" />
          </Tabs>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => moveCalendar('previous')}>Prev</Button>
            <Button variant="outlined" onClick={() => setCalendarDate(new Date())}>Today</Button>
            <Button variant="outlined" onClick={() => moveCalendar('next')}>Next</Button>
          </Stack>
        </Box>

        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>{format(calendarDate, 'MMMM yyyy')}</Typography>

        {calendarMode === 'monthly' && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 1 }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <Typography key={day} variant="caption" sx={{ fontWeight: 800, color: themeColors.text.secondary }}>
                {day}
              </Typography>
            ))}
            {monthlyDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayItems = filteredInterviews.filter((item) => item.date === key);
              return (
                <Box
                  key={key}
                  sx={{
                    minHeight: 90,
                    border: `1px solid ${themeColors.border}`,
                    borderRadius: 1,
                    p: 0.75,
                    bgcolor: isToday(day) ? `${themeColors.primary}08` : '#fff',
                    opacity: isSameMonth(day, calendarDate) ? 1 : 0.52,
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>{format(day, 'd')}</Typography>
                  <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                    {dayItems.slice(0, 2).map((item) => (
                      <Chip
                        key={item.id}
                        size="small"
                        label={`${item.time} ${item.candidateName}`}
                        onClick={() => setDetailsInterview(item)}
                        color={statusColorMap[item.status]}
                      />
                    ))}
                    {dayItems.length > 2 && (
                      <Typography variant="caption" sx={{ color: themeColors.text.secondary }}>
                        +{dayItems.length - 2} more
                      </Typography>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        )}

        {calendarMode === 'weekly' && (
          <Grid container spacing={1}>
            {weekDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayItems = filteredInterviews.filter((item) => item.date === key);
              return (
                <Grid item xs={12} md={12 / 7} key={key}>
                  <Card variant="outlined" sx={{ borderRadius: 1.5, minHeight: 200 }}>
                    <CardContent sx={{ p: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
                        {format(day, 'EEE dd')}
                      </Typography>
                      <Stack spacing={0.75}>
                        {dayItems.map((item) => (
                          <Box key={item.id} sx={{ p: 0.75, borderRadius: 1, bgcolor: `${themeColors.primary}0d` }}>
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>{item.time} • {item.candidateName}</Typography>
                            <Typography variant="caption" sx={{ display: 'block', color: themeColors.text.secondary }}>{item.round}</Typography>
                          </Box>
                        ))}
                        {dayItems.length === 0 && (
                          <Typography variant="caption" sx={{ color: themeColors.text.secondary }}>
                            No interviews
                          </Typography>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {calendarMode === 'daily' && (
          <Stack spacing={1}>
            {dayInterviews.map((item) => (
              <Box
                key={item.id}
                sx={{
                  p: 1.25,
                  borderRadius: 1.5,
                  border: `1px solid ${themeColors.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {item.time} • {item.candidateName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>
                    {item.jobTitle} • {item.round} • {item.interviewType}
                  </Typography>
                </Box>
                <Chip label={item.status} size="small" color={statusColorMap[item.status]} />
              </Box>
            ))}
            {dayInterviews.length === 0 && (
              <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>
                No interviews scheduled for this day.
              </Typography>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );

  return (
    <MotionBox initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      <RecruiterPageHero
        eyebrow="Workspace"
        icon={<EventIcon />}
        title="Interview Management"
        description="Schedule, track, and evaluate interviews across your ATS pipeline."
        actions={(
          <>
            <Button variant="contained" startIcon={<EventIcon />} onClick={openCreateDialog}>
              Schedule Interview
            </Button>
            <Button variant="outlined" onClick={() => exportRows(filteredInterviews)}>Export CSV</Button>
          </>
        )}
      />

      <Tabs value={viewMode} onChange={(_, value) => setViewMode(value)} sx={{ mb: 2 }}>
        <Tab value="dashboard" label="Dashboard" />
        <Tab value="list" label="Interview List" />
        <Tab value="calendar" label="Calendar View" icon={<CalendarMonthIcon />} iconPosition="start" />
      </Tabs>

      {loading ? (
        <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
      ) : (
        <>
          {viewMode === 'dashboard' && renderDashboardView()}
          {viewMode === 'list' && renderListView()}
          {viewMode === 'calendar' && renderCalendarView()}
        </>
      )}

      <Dialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingInterview ? 'Reschedule / Edit Interview' : 'Schedule Interview'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.25}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Candidate</InputLabel>
                <Select
                  value={form.candidateRef}
                  label="Candidate"
                  onChange={(event) => onCandidateRefChange(event.target.value)}
                >
                  {context.candidates.map((candidate) => (
                    <MenuItem key={candidate.applicationId} value={candidate.applicationId}>
                      {candidate.candidateName} - {candidate.jobTitle}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Job</InputLabel>
                <Select value={form.jobId} label="Job" onChange={(event) => onJobChange(event.target.value)}>
                  {context.jobs.map((job) => (
                    <MenuItem key={job.id} value={job.id}>{job.title}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField label="Round" size="small" fullWidth value={form.round} onChange={(event) => setForm((current) => ({ ...current, round: event.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Interview Type</InputLabel>
                <Select
                  value={form.interviewType}
                  label="Interview Type"
                  onChange={(event) => setForm((current) => ({ ...current, interviewType: event.target.value as InterviewType }))}
                >
                  <MenuItem value="Video">Video</MenuItem>
                  <MenuItem value="Phone">Phone</MenuItem>
                  <MenuItem value="In-person">In-person</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Interviewer" size="small" fullWidth value={form.interviewer} onChange={(event) => setForm((current) => ({ ...current, interviewer: event.target.value }))} />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField type="date" label="Date" InputLabelProps={{ shrink: true }} size="small" fullWidth value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField type="time" label="Time" InputLabelProps={{ shrink: true }} size="small" fullWidth value={form.time} onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField type="number" label="Duration (minutes)" size="small" fullWidth value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: Number(event.target.value) }))} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField label="Timezone" size="small" fullWidth value={form.timezone} onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Meeting Link" size="small" fullWidth value={form.meetingLink} onChange={(event) => setForm((current) => ({ ...current, meetingLink: event.target.value }))} />
            </Grid>

            <Grid item xs={12}>
              <TextField label="Location" size="small" fullWidth value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Instructions"
                size="small"
                fullWidth
                multiline
                minRows={2}
                value={form.instructions}
                onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                size="small"
                fullWidth
                multiline
                minRows={2}
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Attachments (comma or new-line URLs)"
                size="small"
                fullWidth
                multiline
                minRows={2}
                value={form.attachmentsText}
                onChange={(event) => setForm((current) => ({ ...current, attachmentsText: event.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleOpen(false)}>Cancel</Button>
          <Button onClick={saveInterview} disabled={saving} startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}>
            {editingInterview ? 'Save Changes' : 'Schedule'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(detailsInterview)} onClose={() => setDetailsInterview(null)} fullWidth maxWidth="md">
        <DialogTitle>Interview Details</DialogTitle>
        <DialogContent dividers>
          {detailsInterview && (
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Candidate Info</Typography>
                <Typography variant="body2">{detailsInterview.candidateName}</Typography>
                <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>
                  {detailsInterview.candidateEmail || '-'} • {detailsInterview.candidatePhone || '-'}
                </Typography>
                {detailsInterview.candidateResumeUrl && (
                  <Button size="small" href={detailsInterview.candidateResumeUrl} target="_blank" rel="noreferrer" sx={{ mt: 0.5 }}>
                    View Resume
                  </Button>
                )}
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Interview</Typography>
                <Typography variant="body2">{detailsInterview.jobTitle} • {detailsInterview.round}</Typography>
                <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>
                  {formatDateTime(detailsInterview)} • {detailsInterview.interviewType} • {detailsInterview.duration} min
                </Typography>
                <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>
                  Interviewer: {detailsInterview.interviewer} • Timezone: {detailsInterview.timezone}
                </Typography>
                {detailsInterview.meetingLink && (
                  <Typography variant="body2">
                    Meeting Link: <a href={detailsInterview.meetingLink} target="_blank" rel="noreferrer">{detailsInterview.meetingLink}</a>
                  </Typography>
                )}
                {detailsInterview.location && (
                  <Typography variant="body2">Location: {detailsInterview.location}</Typography>
                )}
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Notes</Typography>
                <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>
                  {detailsInterview.notes || detailsInterview.instructions || 'No notes available.'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Attachments</Typography>
                {detailsInterview.attachments.length === 0 ? (
                  <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>No attachments.</Typography>
                ) : (
                  <Stack spacing={0.5}>
                    {detailsInterview.attachments.map((url, index) => (
                      <Typography key={`${detailsInterview.id}-attachment-${index}`} variant="body2">
                        <a href={url} target="_blank" rel="noreferrer">{url}</a>
                      </Typography>
                    ))}
                  </Stack>
                )}
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Interview History</Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {detailsInterview.timeline.map((event) => (
                    <Box key={event.id} sx={{ p: 1, border: `1px solid ${themeColors.border}`, borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{event.title}</Typography>
                      <Typography variant="caption" sx={{ color: themeColors.text.secondary }}>
                        {format(new Date(event.at), 'dd MMM yyyy, hh:mm a')} • {event.by}
                      </Typography>
                      {event.description && (
                        <Typography variant="body2" sx={{ mt: 0.5 }}>{event.description}</Typography>
                      )}
                    </Box>
                  ))}
                  {detailsInterview.timeline.length === 0 && (
                    <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>
                      No timeline events yet.
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {detailsInterview && detailsInterview.status !== 'Completed' && (
            <Button onClick={() => void onCompleteSingle(detailsInterview)}>
              Mark Completed
            </Button>
          )}
          {detailsInterview && (
            <Button onClick={() => openFeedbackDialog(detailsInterview)}>
              Submit Feedback
            </Button>
          )}
          <Button onClick={() => setDetailsInterview(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Interview Feedback</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.25}>
            <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>
              Submit evaluation and decision. Candidate will move in ATS after submission.
            </Typography>

            <Grid container spacing={1.25}>
              {[
                { key: 'technicalRating', label: 'Technical Rating' },
                { key: 'communication', label: 'Communication' },
                { key: 'problemSolving', label: 'Problem Solving' },
                { key: 'cultureFit', label: 'Culture Fit' },
                { key: 'overallRating', label: 'Overall Rating' },
              ].map((field) => (
                <Grid item xs={12} sm={6} key={field.key}>
                  <TextField
                    type="number"
                    size="small"
                    label={field.label}
                    fullWidth
                    inputProps={{ min: 1, max: 5 }}
                    value={(feedback as any)[field.key]}
                    onChange={(event) => setFeedback((current) => ({
                      ...current,
                      [field.key]: Math.min(5, Math.max(1, Number(event.target.value) || 1)),
                    }))}
                  />
                </Grid>
              ))}
            </Grid>

            <FormControl fullWidth size="small">
              <InputLabel>Decision</InputLabel>
              <Select
                value={feedback.decision}
                label="Decision"
                onChange={(event) => {
                  const decision = event.target.value as InterviewFeedback['decision'];
                  setFeedback((current) => ({ ...current, decision }));
                  setFeedbackAtsOutcome(
                    decision === 'Hire' ? 'Offer Sent' : decision === 'Reject' ? 'Rejected' : 'Interview Completed'
                  );
                }}
              >
                <MenuItem value="Hire">Hire</MenuItem>
                <MenuItem value="Next Round">Next Round</MenuItem>
                <MenuItem value="Reject">Reject</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>ATS Outcome</InputLabel>
              <Select
                value={feedbackAtsOutcome}
                label="ATS Outcome"
                onChange={(event) => setFeedbackAtsOutcome(event.target.value as AtsOutcomeStage)}
              >
                <MenuItem value="Interview Completed">Interview Completed</MenuItem>
                <MenuItem value="Offer Sent">Offer Sent</MenuItem>
                <MenuItem value="Rejected">Rejected</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Comments"
              multiline
              minRows={3}
              fullWidth
              size="small"
              value={feedback.comments}
              onChange={(event) => setFeedback((current) => ({ ...current, comments: event.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackOpen(false)}>Cancel</Button>
          <Button onClick={submitFeedback}>Submit Feedback</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkRescheduleOpen} onClose={() => setBulkRescheduleOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Bulk Reschedule</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.25}>
            <TextField type="date" label="Date" size="small" InputLabelProps={{ shrink: true }} value={bulkDate} onChange={(event) => setBulkDate(event.target.value)} />
            <TextField type="time" label="Time" size="small" InputLabelProps={{ shrink: true }} value={bulkTime} onChange={(event) => setBulkTime(event.target.value)} />
            <Typography variant="caption" sx={{ color: themeColors.text.secondary }}>
              This updates the selected interviews and records timeline events as rescheduled.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkRescheduleOpen(false)}>Cancel</Button>
          <Button onClick={runBulkReschedule}>Apply</Button>
        </DialogActions>
      </Dialog>
    </MotionBox>
  );
};

export default InterviewManagement;
