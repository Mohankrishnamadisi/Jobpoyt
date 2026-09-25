import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
  AutoAwesome as AiIcon,
  CheckCircleOutline as CompletedIcon,
  EmojiEvents as AwardIcon,
  ForumOutlined as CommunicationIcon,
  PsychologyOutlined as ReasoningIcon,
  QuizOutlined as AssessmentIcon,
  RocketLaunchOutlined as ReadinessIcon,
  ScaleOutlined as JudgmentIcon,
  WorkOutline as RoleIcon,
} from '@mui/icons-material';
import {
  candidateAssessmentService,
  type CandidateAssessmentAttempt,
  type CandidateAssessmentDashboard,
  type CandidateAssessmentDifficulty,
  type CandidateAssessmentKey,
  type RecommendedAssessment,
} from '@services/candidateAssessments';
import { useAuthStore } from '@store/index';

type View = 'dashboard' | 'attempt' | 'result';
type AnswerMap = Record<string, string | string[]>;
const ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'UI Developer',
  'QA Engineer',
  'Data Analyst',
  'Software Engineer',
  'Product Designer',
  'Product Manager',
  'Customer Success Specialist',
  'Project Coordinator',
];
const CATEGORIES: Array<{
  key: CandidateAssessmentKey;
  title: string;
  description: string;
  icon: React.ElementType;
}> = [
  { key: 'job-readiness', title: 'Job Readiness', description: 'Workplace decisions, ownership and delivery scenarios.', icon: ReadinessIcon },
  { key: 'problem-solving', title: 'Problem Solving', description: 'Structured reasoning, root cause and prioritization.', icon: ReasoningIcon },
  { key: 'situational-judgment', title: 'Situational Judgment', description: 'Choose thoughtful actions in realistic work situations.', icon: JudgmentIcon },
  { key: 'workplace-communication', title: 'Workplace Communication', description: 'Professional communication and collaboration.', icon: CommunicationIcon },
  { key: 'aptitude-analytical', title: 'Aptitude & Analytical Reasoning', description: 'Numerical reasoning, patterns and data interpretation.', icon: AnalyticsIcon },
  { key: 'role-based', title: 'Role-Based Assessment', description: 'Professional scenarios shaped around a selected role.', icon: RoleIcon },
  { key: 'career-readiness', title: 'Career Readiness', description: 'Adaptability, ownership and career-stage judgment.', icon: AssessmentIcon },
];
const difficultyColor = (difficulty: CandidateAssessmentDifficulty) =>
  difficulty === 'Easy' ? 'success' : difficulty === 'Hard' ? 'warning' : 'primary';

const statCard = (label: string, value: string | number, icon: React.ReactNode, action?: { label: string; onClick: () => void }) => (
  <Card variant="outlined" sx={{ height: '100%', borderColor: '#E2E8F0', borderRadius: 1.5, boxShadow: '0 2px 8px rgba(15,23,42,0.035)' }}>
    <CardContent sx={{ p: '13px !important' }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box sx={{ color: '#2563EB', display: 'grid', placeItems: 'center' }}>{icon}</Box>
        <Box>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          <Typography variant="h6" sx={{ fontSize: 20, lineHeight: 1.2, fontWeight: 750 }}>{value}</Typography>
          {action ? <Button size="small" onClick={action.onClick} sx={{ mt: 0.15, px: 0, minWidth: 0, textTransform: 'none', fontSize: 11 }}>{action.label}</Button> : null}
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

const readinessLabel = (score: number | null, level: string | null) => level || (score == null ? 'In progress' : score >= 80 ? 'Strong' : score >= 60 ? 'Developing' : 'Building');
const assessmentDate = (value: string | null) => value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const AssessmentsPage: React.FC<{ embedded?: boolean; onOpenCertificates?: () => void }> = ({ onOpenCertificates }) => {
  const { user } = useAuthStore();
  const [dashboard, setDashboard] = useState<CandidateAssessmentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>('dashboard');
  const [chooseOpen, setChooseOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<CandidateAssessmentKey>('job-readiness');
  const [difficulty, setDifficulty] = useState<CandidateAssessmentDifficulty>('Medium');
  const [role, setRole] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [attempt, setAttempt] = useState<CandidateAssessmentAttempt | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dirtyRef = useRef(false);
  const saveSequence = useRef(0);

  const loadDashboard = async (quiet = false) => {
    if (!user?.id) return;
    if (quiet) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const data = await candidateAssessmentService.dashboard();
      setDashboard(data);
      setRole((current) => current || data.role || '');
      if (!attempt && data.active) {
        setAttempt(data.active);
        setAnswers(data.active.answers || {});
        setQuestionIndex(data.active.currentQuestion || 0);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load assessments. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void loadDashboard(); }, [user?.id]);

  useEffect(() => {
    if (view !== 'attempt' || !attempt || attempt.status !== 'in_progress' || !dirtyRef.current) return undefined;
    const sequence = ++saveSequence.current;
    const timer = window.setTimeout(async () => {
      dirtyRef.current = false;
      try {
        await candidateAssessmentService.saveProgress(attempt.id, answers, questionIndex);
      } catch {
        dirtyRef.current = true;
      }
      if (sequence !== saveSequence.current) return;
    }, 700);
    return () => window.clearTimeout(timer);
  }, [view, attempt, answers, questionIndex]);

  const startAssessment = async (key: CandidateAssessmentKey, selectedDifficulty = difficulty, selectedRole = role) => {
    setPreparing(true);
    setError('');
    try {
      const response = await candidateAssessmentService.start(key, selectedDifficulty, selectedRole);
      dirtyRef.current = false;
      setAttempt(response.attempt);
      setAnswers(response.attempt.answers || {});
      setQuestionIndex(response.attempt.currentQuestion || 0);
      setChooseOpen(false);
      setView(response.attempt.status === 'completed' ? 'result' : 'attempt');
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Unable to prepare the assessment right now. Please try again.');
    } finally {
      setPreparing(false);
    }
  };

  const continueAssessment = (existing: CandidateAssessmentAttempt) => {
    dirtyRef.current = false;
    setAttempt(existing);
    setAnswers(existing.answers || {});
    setQuestionIndex(Math.min(existing.currentQuestion || 0, existing.questions.length - 1));
    setView(existing.status === 'completed' ? 'result' : 'attempt');
    setError('');
  };

  const submitAssessment = async () => {
    if (!attempt || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await candidateAssessmentService.submit(attempt.id, answers);
      dirtyRef.current = false;
      setAttempt(response.attempt);
      setAnswers(response.attempt.answers || answers);
      setSubmitOpen(false);
      setView('result');
      await loadDashboard(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit this assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateAnswer = (questionId: string, value: string | string[]) => {
    dirtyRef.current = true;
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  if (!user?.id) return <Alert severity="info">Please sign in to access your assessments.</Alert>;
  if (loading) return <Box sx={{ py: 3 }}><LinearProgress /><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Loading your assessment center...</Typography></Box>;

  if (view === 'attempt' && attempt) {
    const question = attempt.questions[questionIndex];
    const progress = attempt.questions.length ? ((questionIndex + 1) / attempt.questions.length) * 100 : 0;
    const response = answers[question?.id];
    const selected = Array.isArray(response) ? response : [];
    const isLast = questionIndex === attempt.questions.length - 1;
    return (
      <Stack spacing={1.2} sx={{ minWidth: 0 }}>
        {error ? <Alert severity="error" onClose={() => setError('')}>{error}</Alert> : null}
        <Paper variant="outlined" sx={{ p: 1.3, borderRadius: 1.5, bgcolor: '#FFFFFF' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={750} noWrap>{attempt.title}</Typography>
              <Typography variant="caption" color="text.secondary">{attempt.role} · {attempt.difficulty} · {attempt.blueprint.durationMin} min</Typography>
            </Box>
            <Typography variant="body2" fontWeight={700} sx={{ flexShrink: 0 }}>
              Question {questionIndex + 1} of {attempt.questions.length}
            </Typography>
          </Stack>
          <LinearProgress variant="determinate" value={progress} sx={{ mt: 1, height: 5, borderRadius: 4 }} />
        </Paper>
        {question ? (
          <Card variant="outlined" sx={{ borderColor: '#E2E8F0', borderRadius: 1.5 }}>
            <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
              <Stack direction="row" flexWrap="wrap" gap={0.6}>
                <Chip size="small" label={question.competency} color="primary" variant="outlined" />
                <Chip size="small" label={question.difficulty} color={difficultyColor(question.difficulty)} variant="outlined" />
                <Chip size="small" label={`${question.points} points`} variant="outlined" />
              </Stack>
              <Typography component="h2" sx={{ mt: 1.25, fontSize: { xs: 16, md: 18 }, lineHeight: 1.5, fontWeight: 700, color: '#172033' }}>{question.question}</Typography>
              {question.type === 'single_choice' ? (
                <Stack role="radiogroup" aria-label="Answer choices" spacing={0.7} sx={{ mt: 1.25 }}>
                  {(question.options || []).map((option, index) => {
                    const letter = String.fromCharCode(65 + index);
                    const checked = response === letter;
                    return (
                      <Button key={letter} role="radio" aria-checked={checked} variant="outlined" onClick={() => updateAnswer(question.id, letter)} sx={{ justifyContent: 'flex-start', gap: 1, px: 1, py: 0.8, minHeight: 42, borderColor: checked ? '#2563EB' : '#E2E8F0', bgcolor: checked ? '#EFF6FF' : '#FFFFFF', color: '#1E293B', textAlign: 'left', textTransform: 'none', whiteSpace: 'normal', '&:focus-visible': { outline: '3px solid #93C5FD', outlineOffset: 1 } }}>
                        <Box component="span" sx={{ display: 'grid', placeItems: 'center', width: 24, height: 24, flexShrink: 0, borderRadius: '50%', bgcolor: checked ? '#2563EB' : '#F1F5F9', color: checked ? '#FFFFFF' : '#475569', fontSize: 11, fontWeight: 750 }}>{letter}</Box>
                        <Typography variant="body2" component="span">{option}</Typography>
                      </Button>
                    );
                  })}
                </Stack>
              ) : null}
              {question.type === 'multiple_select' ? (
                <Stack spacing={0.35} sx={{ mt: 1 }}>
                  {(question.options || []).map((option, index) => {
                    const letter = String.fromCharCode(65 + index);
                    return (
                      <FormControlLabel key={letter} control={<Checkbox size="small" checked={selected.includes(letter)} onChange={(event) => updateAnswer(question.id, event.target.checked ? [...selected, letter] : selected.filter((value) => value !== letter))} />} label={<Typography variant="body2">{option}</Typography>} sx={{ m: 0, px: 0.8, border: '1px solid #E2E8F0', borderRadius: 1, bgcolor: selected.includes(letter) ? '#EFF6FF' : '#FFFFFF' }} />
                    );
                  })}
                </Stack>
              ) : null}
              {question.type === 'short_response' ? (
                <TextField fullWidth multiline minRows={4} maxRows={9} label="Your response" helperText="Use a few concise sentences. Your answer is saved as you go." value={typeof response === 'string' ? response : ''} onChange={(event) => updateAnswer(question.id, event.target.value)} sx={{ mt: 1.25 }} />
              ) : null}
            </CardContent>
          </Card>
        ) : null}
        <Stack direction="row" justifyContent="space-between" gap={0.8}>
          <Button size="small" startIcon={<BackIcon />} disabled={questionIndex === 0} onClick={() => setQuestionIndex((current) => current - 1)}>
            Previous
          </Button>
          {isLast ? (
            <Button size="small" variant="contained" onClick={() => setSubmitOpen(true)}>
              Submit Assessment
            </Button>
          ) : (
            <Button size="small" variant="contained" endIcon={<ForwardIcon />} onClick={() => setQuestionIndex((current) => current + 1)}>
              Next
            </Button>
          )}
        </Stack>
        <Dialog open={submitOpen} onClose={() => { if (!submitting) setSubmitOpen(false); }} maxWidth="xs" fullWidth>
          <DialogTitle>Submit assessment?</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">Your responses will be evaluated and saved. You can’t change them after submission.</Typography>
          </DialogContent>
          <DialogActions>
            <Button size="small" disabled={submitting} onClick={() => setSubmitOpen(false)}>
              Review Answers
            </Button>
            <Button size="small" variant="contained" disabled={submitting} onClick={() => void submitAssessment()} startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : undefined}>
              {submitting ? 'Evaluating...' : 'Submit Assessment'}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    );
  }

  if (view === 'result' && attempt) {
    const next = attempt.insights?.nextStep;
    return (
      <Stack spacing={1.2} sx={{ minWidth: 0 }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 1.5, bgcolor: '#F8FBFF' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1.5}>
            <Box>
              <Stack direction="row" alignItems="center" gap={0.7}>
                <CompletedIcon color="success" />
                <Typography variant="subtitle1" fontWeight={750}>Assessment Complete</Typography>
              </Stack>
              <Typography variant="body2" sx={{ mt: 0.4, color: '#334155' }}>{attempt.title}</Typography>
              <Typography variant="caption" color="text.secondary">{attempt.role} · {assessmentDate(attempt.completedAt)}</Typography>
            </Box>
            <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Typography variant="h4" sx={{ fontSize: 30, fontWeight: 800, color: '#1D4ED8', lineHeight: 1.1 }}>
                {attempt.score ?? 0}
                <Typography component="span" sx={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>
                  / 100
                </Typography>
              </Typography>
              <Chip size="small" variant="outlined" color={attempt.readinessLevel === 'Strong' ? 'success' : 'primary'} label={`${readinessLabel(attempt.score, attempt.readinessLevel)} Readiness`} sx={{ mt: 0.6 }} />
            </Box>
          </Stack>
        </Paper>
        <Card variant="outlined" sx={{ borderColor: '#E2E8F0', borderRadius: 1.5 }}>
          <CardContent sx={{ p: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={750}>Competency Breakdown</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {attempt.competencyScores.map((item) => (
                <Box key={item.name}>
                  <Stack direction="row" justifyContent="space-between" gap={1}>
                    <Typography variant="body2">{item.name}</Typography>
                    <Typography variant="body2" fontWeight={700}>{item.score}%</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={item.score} sx={{ mt: 0.45, height: 6, borderRadius: 4 }} />
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderColor: '#E2E8F0', borderRadius: 1.5 }}>
          <CardContent sx={{ p: 1.5 }}>
            <Stack direction="row" alignItems="center" gap={0.7}>
              <AiIcon color="primary" />
              <Typography variant="subtitle2" fontWeight={750}>AI Assessment Insights</Typography>
            </Stack>
            <Grid container spacing={1.2} sx={{ mt: 0.2 }}>
              {[{ title: 'Strengths', values: attempt.insights?.strengths || [], color: '#15803D' }, { title: 'Areas to improve', values: attempt.insights?.improvements || [], color: '#B45309' }].map((group) => (
                <Grid item xs={12} md={6} key={group.title}>
                  <Typography variant="body2" fontWeight={700} sx={{ color: group.color }}>{group.title}</Typography>
                  {group.values.length ? group.values.map((item, index) => (
                    <Typography key={index} variant="body2" sx={{ mt: 0.4, color: '#475569' }}>• {item}</Typography>
                  )) : <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>Not enough evidence to identify a pattern yet.</Typography>}
                </Grid>
              ))}
            </Grid>
            {next ? <Alert severity="info" sx={{ mt: 1 }}>Recommended next step: {next}</Alert> : null}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.7 }}>
              This assessment is career-development guidance, not a prediction of hiring outcomes.
            </Typography>
          </CardContent>
        </Card>
        <Button size="small" onClick={() => { setView('dashboard'); setAttempt(null); void loadDashboard(true); }}>Back to Assessment Center</Button>
      </Stack>
    );
  }

  const data = dashboard;
  if (!data) return <Alert severity="info">Assessment dashboard is unavailable.</Alert>;
  const openChooser = () => { setSelectedKey('job-readiness'); setDifficulty('Medium'); setRole(data.role); setChooseOpen(true); };
  const viewResult = (item: CandidateAssessmentAttempt) => { setAttempt(item); setView(item.status === 'completed' ? 'result' : 'attempt'); setAnswers(item.answers || {}); setQuestionIndex(item.currentQuestion || 0); };
  const suggestedKey = data.insights.suggested;

  return (
    <Box className="w-full max-w-none" sx={{ minWidth: 0 }}>
      {error ? <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>{error}</Alert> : null}
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
          <Box>
            <Typography variant="overline" sx={{ color: '#2563EB', fontWeight: 750, lineHeight: 1.4 }}>AI ASSESSMENT CENTER</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25 }}>Your professional readiness</Typography>
            <Typography variant="body2" sx={{ mt: 0.25, color: '#64748B' }}>Measure your job readiness, professional capabilities and real-world decision making.</Typography>
          </Box>
          <Button size="small" variant="contained" startIcon={<AssessmentIcon />} onClick={openChooser} sx={{ minHeight: 36, px: 1.5, flexShrink: 0 }}>Take Assessment</Button>
        </Stack>

        <Grid container spacing={0.9}>{[
          ['Assessments Taken', data.stats.taken, <AssessmentIcon fontSize="small" />],
          ['Assessments Passed', data.stats.passed, <CompletedIcon fontSize="small" />],
          ['Average Score', `${data.stats.average}%`, <AnalyticsIcon fontSize="small" />],
          ['Certificates', data.stats.certificates, <AwardIcon fontSize="small" />],
        ].map(([label, value, icon]) => <Grid key={String(label)} item xs={6} md={3}>{statCard(String(label), value as string | number, icon as React.ReactNode, String(label) === 'Certificates' && onOpenCertificates ? { label: 'View Certificates', onClick: onOpenCertificates } : undefined)}</Grid>)}</Grid>

        {data.active ? (
          <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 1.5, borderColor: '#BFDBFE', bgcolor: '#F8FBFF' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={0.8}>
              <Box>
                <Typography variant="caption" color="primary" fontWeight={750}>CONTINUE ASSESSMENT</Typography>
                <Typography variant="body2" fontWeight={700}>{data.active.title}</Typography>
                <Typography variant="caption" color="text.secondary">Question {data.active.currentQuestion + 1} of {data.active.questions.length} · {Math.round((data.active.currentQuestion / data.active.questions.length) * 100)}% complete</Typography>
                <LinearProgress variant="determinate" value={(data.active.currentQuestion / data.active.questions.length) * 100} sx={{ mt: 0.5, maxWidth: 360, height: 4, borderRadius: 3 }} />
              </Box>
              <Button size="small" variant="outlined" onClick={() => continueAssessment(data.active!)}>Continue</Button>
            </Stack>
          </Paper>
        ) : null}

        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1} sx={{ mb: 0.8 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={750}>Recommended For You</Typography>
              <Typography variant="caption" color="text.secondary">Competency assessments based on your role and prior results.</Typography>
            </Box>
            <Button size="small" onClick={openChooser}>Browse types</Button>
          </Stack>
          <Grid container spacing={1}>{data.recommended.map((item: RecommendedAssessment) => (
            <Grid item xs={12} md={6} xl={4} key={item.key}>
              <Card variant="outlined" sx={{ height: '100%', borderColor: '#E2E8F0', borderRadius: 1.5, transition: 'border-color 150ms ease, box-shadow 150ms ease', '&:hover': { borderColor: '#BFDBFE', boxShadow: '0 4px 14px rgba(37,99,235,0.07)' } }}>
                <CardContent sx={{ p: '13px !important' }}>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={0.7}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={750}>{item.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.category}</Typography>
                    </Box>
                    <Chip size="small" variant="outlined" color={difficultyColor(item.difficulty)} label={item.difficulty} />
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 0.7, minHeight: 40, color: '#64748B', lineHeight: 1.45 }}>{item.description}</Typography>
                  <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 0.8 }}>
                    <Chip size="small" label={`${item.questionCount} questions`} />
                    <Chip size="small" label={`${item.durationMin} min`} />
                    <Chip size="small" label={`${item.points} points`} />
                  </Stack>
                  <Button size="small" variant="contained" fullWidth sx={{ mt: 1, minHeight: 34 }} onClick={() => void startAssessment(item.key, item.difficulty, item.role)}>Start Assessment</Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Grid container spacing={1.2}>
        <Grid item xs={12} lg={7}>
          <Card variant="outlined" sx={{ borderColor: '#E2E8F0', borderRadius: 1.5 }}>
            <CardContent sx={{ p: 1.4 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" fontWeight={750}>Recent Assessments</Typography>
                <Button size="small" onClick={() => void loadDashboard(true)} disabled={refreshing}>{refreshing ? <CircularProgress size={16} /> : 'Refresh'}</Button>
              </Stack>
              {data.recent.length ? (
                <Stack divider={<Box sx={{ borderBottom: '1px solid #F1F5F9' }} />} sx={{ mt: 0.4 }}>
                  {data.recent.map((item) => (
                    <Stack key={item.id} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={0.5} sx={{ py: 0.8 }}>
                      <Box>
                        <Typography variant="body2" fontWeight={650}>{item.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.status === 'completed' ? `${readinessLabel(item.score, item.readinessLevel)} · ${assessmentDate(item.completedAt)}` : `In progress · Question ${item.currentQuestion + 1} of ${item.questions.length}`}</Typography>
                      </Box>
                      <Stack direction="row" alignItems="center" gap={0.8}>
                        {item.status === 'completed' ? (
                          <Typography variant="body2" fontWeight={750} color="primary">{item.score} / 100</Typography>
                        ) : null}
                        <Button size="small" onClick={() => viewResult(item)}>{item.status === 'completed' ? 'View Result' : 'Continue'}</Button>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Box sx={{ py: 1.2 }}>
                  <Typography variant="body2" fontWeight={700}>No assessments completed yet</Typography>
                  <Typography variant="caption" color="text.secondary">Take your first assessment to explore your professional strengths and growth areas.</Typography>
                  <Button size="small" onClick={openChooser} sx={{ display: 'flex', mt: 0.5 }}>Take Assessment</Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Card variant="outlined" sx={{ height: '100%', borderColor: '#E2E8F0', borderRadius: 1.5 }}>
            <CardContent sx={{ p: 1.4 }}>
              <Typography variant="subtitle1" fontWeight={750}>Your Assessment Insights</Typography>
              {data.insights.strongest ? (
                <Box sx={{ mt: 1 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Strongest capability</Typography>
                    <Typography variant="body2" fontWeight={700}>{data.insights.strongest.score}%</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">{data.insights.strongest.name}</Typography>
                  <LinearProgress variant="determinate" value={data.insights.strongest.score} color="success" sx={{ mt: 0.45, height: 5, borderRadius: 3 }} />
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Complete an assessment to see your strongest capability.</Typography>
              )}
              {data.insights.developing ? (
                <Box sx={{ mt: 1.1 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Needs development</Typography>
                    <Typography variant="body2" fontWeight={700}>{data.insights.developing.score}%</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">{data.insights.developing.name}</Typography>
                  <LinearProgress variant="determinate" value={data.insights.developing.score} sx={{ mt: 0.45, height: 5, borderRadius: 3 }} />
                </Box>
              ) : null}
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Recommended next</Typography>
                  <Typography variant="body2" fontWeight={700}>{CATEGORIES.find((item) => item.key === suggestedKey)?.title || 'Workplace Communication'}</Typography>
                </Box>
                <Button size="small" onClick={() => void startAssessment(suggestedKey, 'Medium', data.role)}>Start</Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 1.1, borderColor: '#E2E8F0', borderRadius: 1.5 }}>
        <Stack direction="row" alignItems="center" gap={0.7}>
          <AwardIcon fontSize="small" sx={{ color: '#B45309' }} />
          <Typography variant="body2" fontWeight={700}>Assessment Achievements</Typography>
        </Stack>
        {data.achievements.length ? (
          <Stack direction="row" flexWrap="wrap" gap={0.6} sx={{ mt: 0.8 }}>
            {data.achievements.map((item) => (
              <Chip key={item.id} size="small" icon={<AwardIcon />} label={`${item.title} · ${item.score}`} variant="outlined" />
            ))}
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.4 }}>
            Complete an assessment with a strong result to see your milestones here. These are personal progress markers, not certificates.
          </Typography>
        )}
      </Paper>
      <Dialog open={chooseOpen} onClose={() => { if (!preparing) setChooseOpen(false); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 0.4, fontWeight: 750 }}>Choose an Assessment</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>What would you like to evaluate? These focus on work situations and professional capabilities, not technical skill recall.</Typography>
          <Grid container spacing={0.7}>
            {CATEGORIES.map((item) => {
              const Icon = item.icon;
              const selectedCategory = selectedKey === item.key;
              return <Grid item xs={12} sm={6} key={item.key}><Card component="button" type="button" aria-pressed={selectedCategory} variant="outlined" onClick={() => setSelectedKey(item.key)} sx={{ width: '100%', p: 0.8, borderRadius: 1.25, cursor: 'pointer', textAlign: 'left', borderColor: selectedCategory ? '#2563EB' : '#E2E8F0', bgcolor: selectedCategory ? '#F8FBFF' : '#FFFFFF', '&:focus-visible': { outline: '3px solid #93C5FD', outlineOffset: 1 } }}><Stack direction="row" spacing={0.8} alignItems="center"><Box sx={{ width: 18, height: 18, display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: '50%', border: '2px solid', borderColor: selectedCategory ? '#2563EB' : '#94A3B8' }}>{selectedCategory ? <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2563EB' }} /> : null}</Box><Icon fontSize="small" color="primary" /><Box><Typography variant="body2" fontWeight={700}>{item.title}</Typography><Typography variant="caption" color="text.secondary">{item.description}</Typography></Box></Stack></Card></Grid>;
            })}
          </Grid>
          <Grid container spacing={0.9} sx={{ mt: 0.6 }}>
            <Grid item xs={12} sm={6}><FormControl fullWidth size="small"><Typography variant="caption" sx={{ mb: 0.35 }}>Difficulty</Typography><Select value={difficulty} onChange={(event) => setDifficulty(event.target.value as CandidateAssessmentDifficulty)}>{(['Easy', 'Medium', 'Hard'] as CandidateAssessmentDifficulty[]).map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></FormControl></Grid>
            {selectedKey === 'role-based' || selectedKey === 'job-readiness' ? <Grid item xs={12} sm={6}><FormControl fullWidth size="small"><Typography variant="caption" sx={{ mb: 0.35 }}>Role context</Typography><Select displayEmpty value={role} onChange={(event) => setRole(String(event.target.value))}><MenuItem value="">Use my profile role</MenuItem>{ROLES.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></FormControl></Grid> : null}
          </Grid>
          {error ? <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert> : null}
          {preparing ? <Paper variant="outlined" sx={{ p: 1, mt: 1, borderRadius: 1.25, bgcolor: '#F8FBFF' }}><Stack direction="row" spacing={0.8} alignItems="center"><CircularProgress size={18} /><Box><Typography variant="body2" fontWeight={700}>Preparing your assessment...</Typography><Typography variant="caption" color="text.secondary">Building the blueprint, creating realistic scenarios and balancing difficulty.</Typography></Box></Stack><LinearProgress sx={{ mt: 0.8, height: 4, borderRadius: 3 }} /></Paper> : null}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}><Button size="small" disabled={preparing} onClick={() => setChooseOpen(false)}>Cancel</Button><Button size="small" variant="contained" disabled={preparing || (selectedKey === 'role-based' && !role)} onClick={() => void startAssessment(selectedKey)}>{preparing ? 'Preparing...' : 'Start Assessment'}</Button></DialogActions>
      </Dialog>
      </Stack>
    </Box>
  );
};

export default AssessmentsPage;
