import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  AutoAwesome as AutoAwesomeIcon,
  BusinessCenter as BusinessCenterIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  ChatBubbleOutline as ChatBubbleOutlineIcon,
  Code as CodeIcon,
  GroupsOutlined as GroupsOutlinedIcon,
  LightbulbOutlined as LightbulbOutlinedIcon,
  RecordVoiceOverOutlined as RecordVoiceOverOutlinedIcon,
  Replay as ReplayIcon,
  Send as SendIcon,
  TipsAndUpdatesOutlined as TipsAndUpdatesOutlinedIcon,
} from '@mui/icons-material';
import {
  candidateInterviewCoachService,
  type CandidateInterviewDashboard,
  type InterviewDifficulty,
  type InterviewPracticeType,
  type InterviewQuestionBankResult,
  type InterviewSession,
  type StartInterviewOptions,
} from '@services/candidateInterviewCoach';
import type { InterviewPreparationContext } from '@services/candidateInterviewInvites';

type CoachView = 'dashboard' | 'setup' | 'interview' | 'result' | 'feedback' | 'questionBank';
type SetupSource = StartInterviewOptions['source'];

const ink = '#14243A';
const muted = '#64748B';
const border = '#E2E8F0';
const practiceTypes: Array<{ type: InterviewPracticeType; description: string; Icon: React.ElementType }> = [
  { type: 'HR', description: 'Introductions, motivation and career goals.', Icon: RecordVoiceOverOutlinedIcon },
  { type: 'Technical', description: 'Practical role-specific reasoning and decisions.', Icon: CodeIcon },
  { type: 'Behavioral', description: 'Teamwork, ownership and real examples.', Icon: GroupsOutlinedIcon },
  { type: 'Managerial', description: 'Leadership, prioritization and judgment.', Icon: BusinessCenterIcon },
  { type: 'Mixed', description: 'A realistic blend of interview rounds.', Icon: ChatBubbleOutlineIcon },
];
const experienceOptions = ['Fresher', '1–3 years', '3–5 years', '5+ years'];
const difficultyOptions: InterviewDifficulty[] = ['Easy', 'Medium', 'Hard'];
const typeLabel = (type: InterviewPracticeType) => `${type} Interview`;
const formatDate = (value: string) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
const durationLabel = (session: InterviewSession) => {
  if (!session.completedAt) return 'Duration unavailable';
  const minutes = Math.max(1, Math.round((new Date(session.completedAt).getTime() - new Date(session.createdAt).getTime()) / 60000));
  return `${minutes} min`;
};
const practiceTypeForRound = (round: string): InterviewPracticeType => {
  const value = round.toLowerCase();
  if (value.includes('technical') || value.includes('coding') || value.includes('system design')) return 'Technical';
  if (value.includes('behavior') || value.includes('culture')) return 'Behavioral';
  if (value.includes('manager') || value.includes('leadership')) return 'Managerial';
  if (value.includes('hr') || value.includes('recruiter') || value.includes('screen')) return 'HR';
  return 'Mixed';
};
const compactPanel = { border: `1px solid ${border}`, borderRadius: 2, boxShadow: '0 2px 8px rgba(15,23,42,0.035)', bgcolor: '#FFFFFF' };

export const CandidateInterviewCoach: React.FC<{ preparationContext?: InterviewPreparationContext | null }> = ({ preparationContext }) => {
  const [view, setView] = useState<CoachView>(preparationContext ? 'setup' : 'dashboard');
  const [dashboard, setDashboard] = useState<CandidateInterviewDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [source, setSource] = useState<SetupSource>(preparationContext ? 'manual' : 'application');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [manualTitle, setManualTitle] = useState(preparationContext?.jobTitle || '');
  const [manualDescription, setManualDescription] = useState(preparationContext?.jobDescription || '');
  const [interviewType, setInterviewType] = useState<InterviewPracticeType>(preparationContext ? practiceTypeForRound(preparationContext.interviewRound) : 'Technical');
  const [experienceLevel, setExperienceLevel] = useState('Fresher');
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>('Medium');
  const [answerDraft, setAnswerDraft] = useState('');
  const [bank, setBank] = useState<InterviewQuestionBankResult | null>(null);
  const [bankTitle, setBankTitle] = useState('');
  const [tipQuestionId, setTipQuestionId] = useState('');
  const [tips, setTips] = useState<string[]>([]);

  const refreshDashboard = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError('');
    try {
      setDashboard(await candidateInterviewCoachService.dashboard());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Interview Coach.');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => { void refreshDashboard(); }, []);

  const allJobs = useMemo(() => ({
    applications: dashboard?.applications || [],
    savedJobs: dashboard?.savedJobs || [],
  }), [dashboard]);
  const activeOptions = source === 'application' ? allJobs.applications : allJobs.savedJobs;
  const selectedJob = activeOptions.find((job) => (source === 'application' ? job.applicationId : job.id) === selectedJobId);
  const question = session?.questions[session.currentQuestion];
  const completedCount = dashboard?.stats.completed || 0;
  const todayComplete = Boolean(dashboard?.completedToday);

  const openSetup = (type: InterviewPracticeType = 'Technical', title = '') => {
    setInterviewType(type);
    setManualTitle(title || dashboard?.profile.designation || '');
    setError('');
    setView('setup');
  };

  const startInterview = async () => {
    if (source === 'manual' && !manualTitle.trim()) {
      setError('Enter the job title you are preparing for.');
      return;
    }
    if (source !== 'manual' && !selectedJob) {
      setError(source === 'application' ? 'Select one of your applications.' : 'Select one of your saved jobs.');
      return;
    }
    setWorking(true);
    setError('');
    try {
      const result = await candidateInterviewCoachService.start({
        source,
        preparationInviteId: source === 'manual' ? preparationContext?.interviewId : undefined,
        applicationId: source === 'application' ? selectedJob?.applicationId : undefined,
        jobId: source === 'saved' ? selectedJob?.id : undefined,
        jobTitle: source === 'manual' ? manualTitle.trim() : selectedJob?.title,
        companyName: source === 'manual' ? preparationContext?.companyName : selectedJob?.companyName,
        jobDescription: source === 'manual' ? manualDescription.trim() : selectedJob?.description,
        interviewType,
        experienceLevel,
        difficulty,
      });
      setSession(result.session);
      setAnswerDraft('');
      setView(result.session.status === 'completed' ? 'result' : 'interview');
      setDashboard((current) => current ? { ...current, activeSession: result.session } : current);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'We could not start your interview. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  const continueInterview = async (active: InterviewSession) => {
    setWorking(true);
    setError('');
    try {
      const result = await candidateInterviewCoachService.resume(active.id);
      setSession(result.session);
      setView(result.session.status === 'completed' ? 'result' : 'interview');
      setDashboard((current) => current ? { ...current, activeSession: result.session.status === 'completed' ? null : result.session } : current);
    } catch (resumeError) {
      setError(resumeError instanceof Error ? resumeError.message : 'Unable to continue this interview. Please retry.');
    } finally {
      setWorking(false);
    }
  };

  const startNewAfterAbandon = async () => {
    const active = dashboard?.activeSession;
    setWorking(true);
    setError('');
    try {
      if (active) await candidateInterviewCoachService.abandon(active.id);
      setDashboard((current) => current ? { ...current, activeSession: null } : current);
      openSetup();
    } catch (abandonError) {
      setError(abandonError instanceof Error ? abandonError.message : 'Could not close the active session.');
    } finally {
      setWorking(false);
    }
  };

  const submitAnswer = async () => {
    if (!session || !question || answerDraft.trim().length < 2 || working) return;
    setWorking(true);
    setError('');
    try {
      const result = await candidateInterviewCoachService.answer(session.id, question.id, answerDraft.trim());
      setSession(result.session);
      setAnswerDraft('');
      if (result.session.status === 'completed') {
        setView('result');
        void refreshDashboard(false);
      }
    } catch (answerError) {
      setError(answerError instanceof Error ? answerError.message : "We couldn't generate the next interview question right now. Please try again.");
    } finally {
      setWorking(false);
    }
  };

  const getAnswerCoach = async (questionId: string) => {
    if (!session || working) return;
    setWorking(true);
    setError('');
    try {
      const result = await candidateInterviewCoachService.coach(session.id, questionId);
      setSession(result.session);
    } catch (coachError) {
      setError(coachError instanceof Error ? coachError.message : 'Answer feedback could not be prepared.');
    } finally {
      setWorking(false);
    }
  };

  const generateQuestionBank = async () => {
    const title = source === 'manual' ? manualTitle.trim() : selectedJob?.title || '';
    if (!title) {
      setError('Choose a job or enter a role before generating questions.');
      return;
    }
    setWorking(true);
    setError('');
    try {
      const result = await candidateInterviewCoachService.questionBank({
        source,
        applicationId: source === 'application' ? selectedJob?.applicationId : undefined,
        jobId: source === 'saved' ? selectedJob?.id : undefined,
        jobTitle: title,
        jobDescription: source === 'manual' ? manualDescription : selectedJob?.description,
        interviewType,
        experienceLevel,
        difficulty,
      });
      setBank(result);
      setBankTitle(title);
      setView('questionBank');
    } catch (bankError) {
      setError(bankError instanceof Error ? bankError.message : 'Question generation failed. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  const getTips = async (questionId: string, prompt: string) => {
    if (tipQuestionId === questionId || working) return;
    setTipQuestionId(questionId);
    setWorking(true);
    setError('');
    try {
      const result = await candidateInterviewCoachService.answerTips(prompt, bankTitle, interviewType);
      setTips(result.tips);
    } catch (tipsError) {
      setError(tipsError instanceof Error ? tipsError.message : 'Answer tips could not be prepared.');
    } finally {
      setWorking(false);
    }
  };

  const goDashboard = () => {
    setView('dashboard');
    setError('');
    setTips([]);
    setTipQuestionId('');
    void refreshDashboard();
  };

  const header = (eyebrow: string, title: string, subtitle: string, onBack?: () => void) => (
    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1.5} sx={{ mb: 2.25 }}>
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={0.8} sx={{ mb: 0.45 }}>
          {onBack ? <Button onClick={onBack} size="small" startIcon={<ArrowBackIcon />} sx={{ minWidth: 0, p: 0.3, color: muted, textTransform: 'none' }}>Back</Button> : null}
          <Chip size="small" icon={<AutoAwesomeIcon sx={{ fontSize: '15px !important' }} />} label={eyebrow} sx={{ bgcolor: '#EEF4FF', color: '#214F8B', fontWeight: 750 }} />
        </Stack>
        <Typography variant="h6" sx={{ color: ink, fontWeight: 850, lineHeight: 1.25 }}>{title}</Typography>
        <Typography variant="body2" sx={{ mt: 0.4, color: muted, lineHeight: 1.45 }}>{subtitle}</Typography>
      </Box>
    </Stack>
  );

  if (loading) return <Box sx={{ py: 5, maxWidth: 560, mx: 'auto' }}><LinearProgress /><Typography variant="body2" sx={{ mt: 1.2, textAlign: 'center', color: muted }}>Preparing your Interview Coach...</Typography></Box>;

  if (view === 'setup') return (
    <Stack spacing={1.6} sx={{ minWidth: 0 }}>
      {header('Setup', 'Build your mock interview', 'Set the context first. We’ll use your JobPoyt details when they’re available.', () => setView('dashboard'))}
      <Card sx={{ ...compactPanel, p: { xs: 1.5, md: 2 } }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: ink, fontWeight: 800 }}>1. What are you preparing for?</Typography>
        <Stack direction="row" flexWrap="wrap" gap={0.8} sx={{ mb: 1.4 }}>
          {([
            ['application', 'My applications'], ['saved', 'Saved jobs'], ['manual', 'Enter job details'],
          ] as Array<[SetupSource, string]>).map(([value, label]) => <Chip key={value} clickable onClick={() => { setSource(value); setSelectedJobId(''); }} variant={source === value ? 'filled' : 'outlined'} color={source === value ? 'primary' : 'default'} label={label} />)}
        </Stack>
        {source !== 'manual' ? (
          <TextField select fullWidth size="small" label={source === 'application' ? 'Select an application' : 'Select a saved job'} value={selectedJobId} onChange={(event) => setSelectedJobId(event.target.value)}>
            {activeOptions.map((job) => <MenuItem key={source === 'application' ? job.applicationId : job.id} value={source === 'application' ? job.applicationId : job.id}>{job.title} · {job.companyName || 'Company not listed'}</MenuItem>)}
            {activeOptions.length === 0 ? <MenuItem disabled value="">No {source === 'application' ? 'applications' : 'saved jobs'} found</MenuItem> : null}
          </TextField>
        ) : <Stack spacing={1}><TextField size="small" fullWidth label="Job title" value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} placeholder="e.g. Frontend Developer" /><TextField size="small" fullWidth multiline minRows={3} maxRows={6} label="Job description (optional)" value={manualDescription} onChange={(event) => setManualDescription(event.target.value)} placeholder="Paste role requirements or responsibilities for more targeted questions." /></Stack>}
        {source === 'manual' && preparationContext ? <Alert severity="info" sx={{ mt: 1 }}>Preparing for {preparationContext.interviewRound} · {preparationContext.interviewDate} at {preparationContext.interviewTime} ({preparationContext.timezone}). Job and interview details are verified from this invitation.</Alert> : null}
        {source !== 'manual' && selectedJob ? <Box sx={{ mt: 1, p: 1, borderRadius: 1.5, bgcolor: '#F8FAFC' }}><Typography variant="body2" sx={{ fontWeight: 750, color: ink }}>{selectedJob.title} · {selectedJob.companyName || 'Company not listed'}</Typography><Typography variant="caption" sx={{ color: muted }}>{selectedJob.skills.slice(0, 6).join(' · ') || selectedJob.experience || 'Role details will guide your questions.'}</Typography></Box> : null}
      </Card>
      <Card sx={{ ...compactPanel, p: { xs: 1.5, md: 2 } }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: ink, fontWeight: 800 }}>2. Interview type</Typography>
        <Box className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {practiceTypes.map(({ type, description, Icon }) => <Button key={type} onClick={() => setInterviewType(type)} variant="outlined" sx={{ minHeight: 74, px: 1.2, py: 1, justifyContent: 'flex-start', alignItems: 'flex-start', textAlign: 'left', borderColor: interviewType === type ? '#2563EB' : border, borderWidth: interviewType === type ? 2 : 1, bgcolor: interviewType === type ? '#F3F7FF' : '#FFFFFF', color: ink, textTransform: 'none' }}><Avatar variant="rounded" sx={{ mr: 1, width: 32, height: 32, bgcolor: interviewType === type ? '#DBEAFE' : '#F1F5F9', color: '#1D4ED8' }}><Icon sx={{ fontSize: 18 }} /></Avatar><Box><Typography variant="body2" sx={{ fontWeight: 800 }}>{typeLabel(type)}</Typography><Typography variant="caption" sx={{ display: 'block', color: muted, lineHeight: 1.35, mt: 0.2 }}>{description}</Typography></Box></Button>)}
        </Box>
      </Card>
      <Box className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Card sx={{ ...compactPanel, p: { xs: 1.5, md: 2 } }}><Typography variant="subtitle2" sx={{ mb: 1, color: ink, fontWeight: 800 }}>3. Your experience</Typography><Stack direction="row" flexWrap="wrap" gap={0.7}>{experienceOptions.map((option) => <Chip key={option} clickable label={option} variant={experienceLevel === option ? 'filled' : 'outlined'} color={experienceLevel === option ? 'primary' : 'default'} onClick={() => setExperienceLevel(option)} />)}</Stack></Card>
        <Card sx={{ ...compactPanel, p: { xs: 1.5, md: 2 } }}><Typography variant="subtitle2" sx={{ mb: 1, color: ink, fontWeight: 800 }}>4. Difficulty</Typography><Stack direction="row" flexWrap="wrap" gap={0.7}>{difficultyOptions.map((option) => <Chip key={option} clickable label={option} variant={difficulty === option ? 'filled' : 'outlined'} color={difficulty === option ? 'primary' : 'default'} onClick={() => setDifficulty(option)} />)}</Stack></Card>
      </Box>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" gap={1}>
        <Button variant="outlined" onClick={generateQuestionBank} disabled={working} sx={{ minHeight: 38, textTransform: 'none' }}>{working ? 'Generating questions...' : 'Generate Question Bank'}</Button>
        <Button variant="contained" onClick={startInterview} disabled={working} startIcon={working ? <CircularProgress size={16} color="inherit" /> : <ChatBubbleOutlineIcon />} sx={{ minHeight: 38, px: 2, textTransform: 'none', fontWeight: 750, bgcolor: '#174A7C' }}>{working ? 'Preparing your interview...' : 'Start Interview'}</Button>
      </Stack>
    </Stack>
  );

  if (view === 'interview' && session) return (
    <Stack spacing={1.5} sx={{ maxWidth: 900, mx: 'auto', minWidth: 0 }}>
      {header('AI Interview Coach', session.jobTitle, `${typeLabel(session.interviewType)}${session.companyName ? ` · ${session.companyName}` : ''}`, () => setView('dashboard'))}
      <Card sx={{ ...compactPanel, p: { xs: 1.5, md: 2.25 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
          <Stack direction="row" alignItems="center" spacing={1}><Avatar sx={{ width: 34, height: 34, bgcolor: '#EAF1FB', color: '#174A7C' }}><AutoAwesomeIcon sx={{ fontSize: 19 }} /></Avatar><Box><Typography variant="caption" sx={{ color: '#1D4ED8', fontWeight: 800, textTransform: 'uppercase' }}>AI interviewer</Typography><Typography variant="body2" sx={{ color: muted }}>{session.interviewType} round</Typography></Box></Stack>
          <Chip size="small" label={`Question ${Math.min(session.currentQuestion + 1, 10)} of 10`} sx={{ fontWeight: 750, color: '#174A7C', bgcolor: '#EFF6FF' }} />
        </Stack>
        <Divider sx={{ my: 1.5 }} />
        <Typography variant="body1" sx={{ color: ink, fontSize: { xs: 16, md: 18 }, lineHeight: 1.6, fontWeight: 700 }}>{question?.question || 'Your next question is being prepared.'}</Typography>
        {session.answers.length > 0 ? <Stack spacing={1} sx={{ mt: 1.6, maxHeight: 210, overflowY: 'auto' }}>{session.answers.slice(-3).map((item) => <Box key={item.questionId} sx={{ p: 1.1, borderRadius: 1.5, bgcolor: '#F8FAFC', border: `1px solid ${border}` }}><Typography variant="caption" sx={{ fontWeight: 800, color: '#475569' }}>{item.question}</Typography><Typography variant="body2" sx={{ mt: 0.35, color: '#334155', whiteSpace: 'pre-wrap' }}>{item.answer}</Typography>{item.evaluation ? <Button size="small" onClick={() => void getAnswerCoach(item.questionId)} sx={{ mt: 0.3, p: 0, minHeight: 26, textTransform: 'none' }}>View AI answer coaching</Button> : <Button size="small" onClick={() => void getAnswerCoach(item.questionId)} disabled={working} sx={{ mt: 0.3, p: 0, minHeight: 26, textTransform: 'none' }}>Get AI feedback</Button>}{item.evaluation ? <Typography variant="caption" sx={{ display: 'block', color: muted }}>{item.evaluation.strengths.join(' · ')}{item.evaluation.improvements.length ? ` | To improve: ${item.evaluation.improvements.join(' · ')}` : ''}</Typography> : null}{item.evaluation?.star ? <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: muted }}>STAR: {(['situation', 'task', 'action', 'result'] as const).map((part) => `${part[0].toUpperCase()}${part.slice(1)} ${item.evaluation?.star?.[part] ? '✓' : '△'}`).join(' · ')}</Typography> : null}{item.evaluation?.exampleImprovedAnswer ? <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#475569' }}><strong>Example improved answer:</strong> {item.evaluation.exampleImprovedAnswer}</Typography> : null}</Box>)}</Stack> : null}
        <TextField fullWidth multiline minRows={5} maxRows={10} value={answerDraft} onChange={(event) => setAnswerDraft(event.target.value)} placeholder="Answer as you would in a real interview..." sx={{ mt: 1.6, '& .MuiOutlinedInput-root': { alignItems: 'flex-start' } }} inputProps={{ maxLength: 6000 }} />
        {error ? <Alert severity="error" sx={{ mt: 1.2 }} action={<Button size="small" onClick={() => void submitAnswer()} sx={{ textTransform: 'none' }}>Retry</Button>}>{error}</Alert> : null}
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ mt: 1.1 }}><Typography variant="caption" sx={{ color: muted }}>{working ? 'Analyzing your response...' : 'Your feedback and readiness summary arrive after the interview.'}</Typography><Button variant="contained" endIcon={working ? <CircularProgress size={15} color="inherit" /> : <SendIcon />} disabled={working || answerDraft.trim().length < 2} onClick={() => void submitAnswer()} sx={{ minHeight: 36, px: 1.6, textTransform: 'none', fontWeight: 750, bgcolor: '#174A7C' }}>Submit Answer</Button></Stack>
      </Card>
      <Card sx={{ ...compactPanel, p: 1.5 }}><Stack direction="row" spacing={0.65} alignItems="center" aria-label={`Interview question ${session.currentQuestion + 1} of 10`}>{Array.from({ length: 10 }, (_, index) => <Box key={index} sx={{ flex: 1, height: 6, borderRadius: 9, bgcolor: index < session.currentQuestion ? '#174A7C' : index === session.currentQuestion ? '#60A5FA' : '#E2E8F0' }} />)}</Stack><Typography variant="caption" sx={{ display: 'block', mt: 0.7, color: muted }}>{session.answers.length} answers submitted · Question {session.currentQuestion + 1} of 10</Typography></Card>
    </Stack>
  );

  if ((view === 'result' || view === 'feedback') && session) {
    const score = session.score ?? 0;
    return <Stack spacing={1.5} sx={{ minWidth: 0 }}>
      {header(view === 'result' ? 'Session complete' : 'Interview feedback', session.jobTitle, `${typeLabel(session.interviewType)}${session.companyName ? ` · ${session.companyName}` : ''}`, goDashboard)}
      {view === 'result' ? <Card sx={{ ...compactPanel, p: { xs: 2, md: 2.5 }, display: 'flex', alignItems: 'center', gap: 2 }}><Box sx={{ width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, bgcolor: '#EAF2FB', color: '#174A7C' }}><Typography variant="h5" sx={{ fontWeight: 850 }}>{score}%</Typography></Box><Box><Typography variant="h6" sx={{ color: ink, fontWeight: 850 }}>Interview Complete</Typography><Typography variant="body2" sx={{ color: muted, mt: 0.3 }}>Overall readiness · {session.answers.length} questions · {session.completedAt ? formatDate(session.completedAt) : ''}</Typography></Box></Card> : null}
      <Card sx={{ ...compactPanel, p: { xs: 1.5, md: 2 } }}><Typography variant="subtitle1" sx={{ color: ink, fontWeight: 850, mb: 1.2 }}>Readiness by area</Typography><Box className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">{Object.entries(session.categoryScores).map(([name, value]) => <Box key={name}><Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}><Typography variant="body2" sx={{ color: '#475569' }}>{name}</Typography><Typography variant="body2" sx={{ color: ink, fontWeight: 750 }}>{value}%</Typography></Stack><LinearProgress variant="determinate" value={value} sx={{ height: 6, borderRadius: 5, bgcolor: '#EAF0F6', '& .MuiLinearProgress-bar': { borderRadius: 5, bgcolor: '#2563EB' } }} /></Box>)}</Box></Card>
      <Box className="grid grid-cols-1 md:grid-cols-2 gap-3"><Card sx={{ ...compactPanel, p: 1.6 }}><Typography variant="subtitle2" sx={{ fontWeight: 850, color: '#16704A' }}>What you did well</Typography>{(session.feedback?.strengths || []).map((item) => <Typography key={item} variant="body2" sx={{ mt: 0.7, color: '#475569' }}>• {item}</Typography>)}</Card><Card sx={{ ...compactPanel, p: 1.6 }}><Typography variant="subtitle2" sx={{ fontWeight: 850, color: '#94541A' }}>Areas to improve</Typography>{(session.feedback?.improvements || []).map((item) => <Typography key={item} variant="body2" sx={{ mt: 0.7, color: '#475569' }}>• {item}</Typography>)}</Card></Box>
      {view === 'feedback' ? (
        <Card sx={{ ...compactPanel, p: { xs: 1.4, md: 1.8 } }}>
          <Typography variant="subtitle1" sx={{ mb: 1, color: ink, fontWeight: 850 }}>Questions and answers</Typography>
          <Stack divider={<Divider flexItem />} spacing={0}>
            {session.answers.map((item, index) => (
              <Box key={item.questionId} sx={{ py: 1 }}>
                <Typography variant="caption" sx={{ color: '#1D4ED8', fontWeight: 800 }}>Question {index + 1}</Typography>
                <Typography variant="body2" sx={{ mt: 0.25, color: ink, fontWeight: 750 }}>{item.question}</Typography>
                <Typography variant="body2" sx={{ mt: 0.7, color: muted, whiteSpace: 'pre-wrap' }}>{item.answer}</Typography>
                {item.evaluation ? (
                  <>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.7, color: '#16704A', fontWeight: 750 }}>What worked: {item.evaluation.strengths.join(' · ') || 'Relevant response'}</Typography>
                    {item.evaluation.improvements.length ? <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: '#94541A' }}>Could improve: {item.evaluation.improvements.join(' · ')}</Typography> : null}
                    {item.evaluation.star ? <Typography variant="caption" sx={{ display: 'block', mt: 0.3, color: muted }}>STAR structure: {(['situation', 'task', 'action', 'result'] as const).map((part) => `${part[0].toUpperCase()}${part.slice(1)} ${item.evaluation?.star?.[part] ? '✓' : '△'}`).join(' · ')}</Typography> : null}
                    {item.evaluation.exampleImprovedAnswer ? (
                      <Box sx={{ mt: 0.7, p: 1, borderRadius: 1, bgcolor: '#F8FAFC' }}>
                        <Typography variant="caption" sx={{ display: 'block', color: '#174A7C', fontWeight: 800 }}>How You Could Improve Your Answer</Typography>
                        <Typography variant="body2" sx={{ mt: 0.25, color: '#475569' }}><strong>Example improved answer:</strong> {item.evaluation.exampleImprovedAnswer}</Typography>
                      </Box>
                    ) : null}
                  </>
                ) : null}
              </Box>
            ))}
          </Stack>
        </Card>
      ) : null}
      <Card sx={{ ...compactPanel, p: 1.6, bgcolor: '#F7FAFE' }}><Stack direction="row" spacing={1} alignItems="flex-start"><LightbulbOutlinedIcon sx={{ color: '#1D4ED8', mt: 0.2 }} /><Box><Typography variant="subtitle2" sx={{ fontWeight: 850, color: ink }}>AI coach recommendation</Typography><Typography variant="body2" sx={{ color: '#475569', mt: 0.3 }}>{session.feedback?.coachRecommendation}</Typography>{session.feedback?.nextPractice ? <Typography variant="caption" sx={{ display: 'block', mt: 0.6, color: '#174A7C', fontWeight: 750 }}>Next practice: {session.feedback.nextPractice}</Typography> : null}</Box></Stack></Card>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" gap={1}><Button variant="outlined" onClick={() => setView('feedback')} sx={{ minHeight: 36, textTransform: 'none' }}>View Detailed Feedback</Button><Button variant="contained" onClick={() => openSetup(session.interviewType, session.jobTitle)} startIcon={<ReplayIcon />} sx={{ minHeight: 36, textTransform: 'none', bgcolor: '#174A7C' }}>Practice Again</Button></Stack>
    </Stack>;
  }

  if (view === 'questionBank' && bank) return <Stack spacing={1.5} sx={{ minWidth: 0 }}>
    {header('Question bank', bankTitle, `${typeLabel(interviewType)} · Generated for ${difficulty.toLowerCase()} difficulty`, () => setView('setup'))}
    {bank.questions.map((item, index) => <Card key={item.id} sx={{ ...compactPanel, p: { xs: 1.4, md: 1.8 } }}><Stack direction="row" alignItems="flex-start" spacing={1}><Avatar sx={{ width: 27, height: 27, fontSize: 13, bgcolor: '#EEF4FF', color: '#174A7C' }}>{index + 1}</Avatar><Box sx={{ minWidth: 0, flex: 1 }}><Typography variant="body2" sx={{ color: ink, fontWeight: 750 }}>{item.question}</Typography><Typography variant="caption" sx={{ display: 'block', mt: 0.3, color: muted }}>{item.focus}</Typography>{tipQuestionId === item.id && tips.length ? <Box sx={{ mt: 0.8, p: 1, borderRadius: 1.2, bgcolor: '#F8FAFC' }}>{tips.map((tip) => <Typography key={tip} variant="body2" sx={{ color: '#475569', mt: 0.25 }}>• {tip}</Typography>)}</Box> : null}<Stack direction="row" flexWrap="wrap" gap={0.8} sx={{ mt: 0.8 }}><Button size="small" onClick={() => openSetup(interviewType, bankTitle)} startIcon={<ChatBubbleOutlineIcon />} sx={{ textTransform: 'none' }}>Practice</Button><Button size="small" disabled={working} onClick={() => void getTips(item.id, item.question)} startIcon={<TipsAndUpdatesOutlinedIcon />} sx={{ textTransform: 'none' }}>Get Answer Tips</Button></Stack></Box></Stack></Card>)}
    {error ? <Alert severity="error">{error}</Alert> : null}
  </Stack>;

  return <Stack spacing={1.6} sx={{ minWidth: 0 }}>
    <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 1.2, flexDirection: { xs: 'column', sm: 'row' } }}>
      <Box><Stack direction="row" alignItems="center" spacing={0.8}><AutoAwesomeIcon sx={{ color: '#1D4ED8', fontSize: 19 }} /><Typography variant="caption" sx={{ color: '#1D4ED8', fontWeight: 800, textTransform: 'uppercase' }}>AI Interview Coach · Premium</Typography></Stack><Typography variant="h5" sx={{ mt: 0.35, fontSize: { xs: 20, sm: 23 }, lineHeight: 1.2, color: ink, fontWeight: 850 }}>Interview Preparation</Typography><Typography variant="body2" sx={{ mt: 0.4, color: muted }}>Prepare smarter. Practice realistically. Interview confidently.</Typography></Box>
      <Button variant="contained" onClick={() => dashboard?.activeSession ? continueInterview(dashboard.activeSession) : openSetup()} disabled={loading || (todayComplete && !dashboard?.activeSession) || working} startIcon={<ChatBubbleOutlineIcon />} sx={{ minHeight: 38, px: 1.8, whiteSpace: 'nowrap', textTransform: 'none', fontWeight: 800, bgcolor: '#174A7C' }}>{todayComplete && !dashboard?.activeSession ? "Today's interview complete" : dashboard?.activeSession ? 'Continue Interview' : 'Start AI Mock Interview'}</Button>
    </Box>
    {error ? <Alert severity="error" action={loading ? null : <Button size="small" onClick={() => void refreshDashboard()} sx={{ textTransform: 'none' }}>Retry</Button>}>{error}</Alert> : null}
    {todayComplete ? <Alert severity="success" icon={<CheckCircleOutlineIcon />}>Today’s mock interview is complete. <Button size="small" onClick={() => { setSession(dashboard?.completedToday || null); setView('result'); }} sx={{ ml: 0.5, textTransform: 'none' }}>View today’s feedback</Button></Alert> : null}
    {dashboard?.activeSession ? <Alert severity="info" action={<Stack direction="row"><Button size="small" onClick={() => continueInterview(dashboard.activeSession!)} sx={{ textTransform: 'none' }}>Continue</Button><Button size="small" disabled={working} onClick={() => void startNewAfterAbandon()} sx={{ textTransform: 'none' }}>Start New</Button></Stack>}>You have an interview in progress. Continue where you left off or abandon it to start again.</Alert> : null}
    <Box className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {[
        ['Mock interviews', completedCount, 'Completed practice'], ['Completed sessions', completedCount, 'Full 10-question sessions'], ['Practice streak', `${dashboard?.stats.streakDays || 0} days`, 'Based on completed sessions'],
      ].map(([label, value, note]) => <Card key={String(label)} sx={{ ...compactPanel, p: 1.35 }}><Typography variant="caption" sx={{ color: muted }}>{label}</Typography><Typography variant="h6" sx={{ mt: 0.1, color: ink, fontWeight: 850 }}>{value}</Typography><Typography variant="caption" sx={{ color: muted }}>{note}</Typography></Card>)}
    </Box>
    <Box>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 0.9 }}><Typography variant="subtitle1" sx={{ color: ink, fontWeight: 850 }}>Choose your practice</Typography><Button size="small" onClick={() => openSetup()} sx={{ textTransform: 'none' }}>Question bank</Button></Stack>
      <Box className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {practiceTypes.map(({ type, description, Icon }) => <Button key={type} onClick={() => openSetup(type)} sx={{ ...compactPanel, px: 1.3, py: 1.25, justifyContent: 'flex-start', textAlign: 'left', textTransform: 'none', color: ink, '&:hover': { borderColor: '#93B4D8', bgcolor: '#F8FAFC' } }}><Avatar variant="rounded" sx={{ mr: 1, width: 33, height: 33, bgcolor: '#EEF4FF', color: '#174A7C' }}><Icon sx={{ fontSize: 19 }} /></Avatar><Box><Typography variant="body2" sx={{ fontWeight: 800 }}>{typeLabel(type)}</Typography><Typography variant="caption" sx={{ color: muted }}>{description}</Typography></Box></Button>)}
        <Button onClick={() => { setSource('application'); setSelectedJobId(''); openSetup('Technical'); }} sx={{ ...compactPanel, px: 1.3, py: 1.25, justifyContent: 'flex-start', textAlign: 'left', textTransform: 'none', color: ink, '&:hover': { borderColor: '#93B4D8', bgcolor: '#F8FAFC' } }}><Avatar variant="rounded" sx={{ mr: 1, width: 33, height: 33, bgcolor: '#F2EEFF', color: '#5B4BA5' }}><BusinessCenterIcon sx={{ fontSize: 19 }} /></Avatar><Box><Typography variant="body2" sx={{ fontWeight: 800 }}>Job-Specific Interview</Typography><Typography variant="caption" sx={{ color: muted }}>Use an application or saved role.</Typography></Box></Button>
      </Box>
    </Box>
    <Box className="grid grid-cols-1 lg:grid-cols-5 gap-3">
      <Card sx={{ ...compactPanel, p: 1.5, gridColumn: { lg: 'span 3' } }}><Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.8 }}><Typography variant="subtitle1" sx={{ color: ink, fontWeight: 850 }}>Recent sessions</Typography><Typography variant="caption" sx={{ color: muted }}>Your completed practice</Typography></Stack>{(dashboard?.sessions || []).length ? <Stack divider={<Divider flexItem />} spacing={0}>{dashboard!.sessions.slice(0, 4).map((item) => <Stack key={item.id} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1} sx={{ py: 1 }}><Box><Typography variant="body2" sx={{ color: ink, fontWeight: 800 }}>{item.jobTitle}</Typography><Typography variant="caption" sx={{ color: muted }}>{typeLabel(item.interviewType)} · {formatDate(item.completedAt || item.createdAt)} · {durationLabel(item)}</Typography></Box><Stack direction="row" alignItems="center" spacing={0.8}><Chip size="small" label={`${item.score ?? 0}%`} sx={{ bgcolor: '#EEF4FF', color: '#174A7C', fontWeight: 800 }} /><Button size="small" onClick={() => { setSession(item); setView('feedback'); }} sx={{ textTransform: 'none' }}>View Feedback</Button></Stack></Stack>)}</Stack> : <Box sx={{ py: 2, textAlign: 'center' }}><ChatBubbleOutlineIcon sx={{ color: '#94A3B8' }} /><Typography variant="body2" sx={{ mt: 0.5, color: ink, fontWeight: 800 }}>No interview sessions yet</Typography><Typography variant="caption" sx={{ display: 'block', mt: 0.3, color: muted }}>Start a mock interview and practice for your next opportunity.</Typography><Button size="small" onClick={() => openSetup()} sx={{ mt: 0.6, textTransform: 'none' }}>Start your first interview</Button></Box>}</Card>
      <Card sx={{ ...compactPanel, p: 1.5, gridColumn: { lg: 'span 2' } }}><Stack direction="row" spacing={0.8} alignItems="center"><LightbulbOutlinedIcon sx={{ color: '#1D4ED8' }} /><Typography variant="subtitle1" sx={{ color: ink, fontWeight: 850 }}>AI Interview Coach</Typography></Stack>{dashboard?.sessions.length ? <><Typography variant="body2" sx={{ mt: 1, color: '#475569' }}>{dashboard.coach.improvement}</Typography><Divider sx={{ my: 1 }} /><Typography variant="caption" sx={{ color: muted, fontWeight: 750 }}>Top strengths</Typography>{dashboard.coach.strengths.slice(0, 2).map((item) => <Typography key={item} variant="body2" sx={{ mt: 0.45, color: '#475569' }}>• {item}</Typography>)}<Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#174A7C', fontWeight: 800 }}>Recommended practice</Typography><Typography variant="body2" sx={{ mt: 0.3, color: '#475569' }}>{dashboard.coach.recommendedPractice}</Typography></> : <><Typography variant="body2" sx={{ mt: 0.9, color: '#475569' }}>Your coach insights will be based on your interview answers and completed sessions.</Typography><Typography variant="caption" sx={{ display: 'block', mt: 1, color: muted }}>Top strength · Not enough practice data</Typography><Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: muted }}>Recommended practice · Complete your first mock interview</Typography></>}</Card>
    </Box>
    <Button variant="outlined" startIcon={<TipsAndUpdatesOutlinedIcon />} onClick={() => openSetup()} sx={{ alignSelf: 'flex-start', minHeight: 34, textTransform: 'none' }}>Open AI Question Bank</Button>
  </Stack>;
};