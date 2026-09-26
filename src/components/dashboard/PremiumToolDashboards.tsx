import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  Description as DescriptionIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import { skillTestService, type SkillTestAttempt } from '@services/skillTest';
import type { InterviewPreparationContext } from '@services/candidateInterviewInvites';

const LazyResumeStudio = React.lazy(() => import('./ResumeStudio').then((module) => ({ default: module.ResumeStudio })));
const LazyAssessmentCertifications = React.lazy(() => import('./AssessmentCertifications').then((module) => ({ default: module.AssessmentCertifications })));
const LazyCandidateInterviewCoach = React.lazy(() => import('./CandidateInterviewCoach').then((module) => ({ default: module.CandidateInterviewCoach })));
const LazyCandidateInterviewInvites = React.lazy(() => import('./CandidateInterviewInvites').then((module) => ({ default: module.CandidateInterviewInvites })));

type PremiumToolDashboardsProps = {
  tool: 'Interview Preparation' | 'Skill Test' | 'Resume Builder' | 'Certificates' | 'Interview Invites';
  skillTestHeaderActionRef?: React.MutableRefObject<(() => void) | null>;
  onSkillTestHeaderStateChange?: React.Dispatch<React.SetStateAction<{ available: boolean; disabled: boolean; completed: boolean }>>;
  interviewPreparationContext?: InterviewPreparationContext | null;
  onPrepareInterview?: (context: InterviewPreparationContext) => void;
};

const panelSx = {
  p: { xs: 2, md: 3 },
  borderRadius: 3,
  border: '1px solid #E2E8F0',
  background: '#FFFFFF',
};

type SkillTestMode = 'profile' | 'custom';
type SkillTestView = 'history' | 'choose' | 'test' | 'result';

const localDateKey = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const summarizeSkills = (value?: string) => {
  const skills = (value || '').split(/[,|;]/).map((skill) => skill.trim()).filter(Boolean);
  if (skills.length <= 3) return skills.join(' • ') || 'Personalized Skill Test';
  return `${skills.slice(0, 3).join(' • ')} + ${skills.length - 3} more`;
};

const cleanOption = (value: string) => value.replace(/^\s*(?:\(?[A-D]\)?[.)\]:-])\s*/i, '').trim();
const compactText = (value: string, limit = 360) => {
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}...` : text;
};

const answerText = (question: NonNullable<SkillTestAttempt['questions']>[number], answer?: string) => {
  if (!answer) return 'No answer selected';
  if (question.kind === 'coding') return answer;
  const options = question.options || [];
  const letter = answer.trim().match(/^[A-D]$/i)?.[0]?.toUpperCase();
  const index = letter ? letter.charCodeAt(0) - 65 : options.findIndex((option) => cleanOption(option).toLowerCase() === cleanOption(answer).toLowerCase());
  if (index < 0 || index >= options.length) return answer;
  return `${String.fromCharCode(65 + index)}. ${cleanOption(options[index])}`;
};

const formatTestDate = (value: string) => new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric',
}).format(new Date(`${value}T00:00:00`));

const SkillTestDashboard: React.FC<Pick<PremiumToolDashboardsProps, 'skillTestHeaderActionRef' | 'onSkillTestHeaderStateChange'>> = ({ skillTestHeaderActionRef, onSkillTestHeaderStateChange }) => {
  const [view, setView] = useState<SkillTestView>('history');
  const [history, setHistory] = useState<SkillTestAttempt[]>([]);
  const [attempt, setAttempt] = useState<SkillTestAttempt | null>(null);
  const [mode, setMode] = useState<SkillTestMode>('profile');
  const [customSkill, setCustomSkill] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const submittingRef = useRef(false);

  const refreshHistory = async () => {
    setLoading(true);
    setError('');
    try {
      setHistory(await skillTestService.getHistory());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Skill Test history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshHistory();
  }, []);

  const todayAttempt = useMemo(() => history.find((item) => item.test_date === localDateKey()), [history]);

  useEffect(() => {
    const available = view === 'history';
    if (available && !loading && !todayAttempt && skillTestHeaderActionRef) {
      skillTestHeaderActionRef.current = () => {
        setError('');
        setView('choose');
      };
    } else if (skillTestHeaderActionRef) {
      skillTestHeaderActionRef.current = null;
    }
    onSkillTestHeaderStateChange?.({ available, disabled: loading || Boolean(todayAttempt), completed: Boolean(todayAttempt) });
    return () => {
      if (skillTestHeaderActionRef) skillTestHeaderActionRef.current = null;
    };
  }, [view, loading, todayAttempt, skillTestHeaderActionRef, onSkillTestHeaderStateChange]);

  const questions = attempt?.questions || [];
  const currentQuestion = questions[questionIndex];
  const isFinalQuestion = questionIndex === questions.length - 1;

  const startGeneration = async () => {
    if (mode === 'custom' && !customSkill.trim()) {
      setError('Enter one skill before generating your focused test.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const generated = await skillTestService.generate(mode, customSkill.trim());
      setAttempt(generated);
      setAnswers({});
      setQuestionIndex(0);
      setView('test');
      setHistory((current) => [generated, ...current.filter((item) => item.id !== generated.id)]);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Unable to generate your Skill Test.');
    } finally {
      setLoading(false);
    }
  };

  const submitTest = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError('');
    try {
      const completed = await skillTestService.submit(answers);
      setAttempt(completed);
      setHistory((current) => current.map((item) => item.id === completed.id ? completed : item));
      setConfirmSubmit(false);
      setView('result');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit your Skill Test.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const openResult = async (item: SkillTestAttempt) => {
    setAttempt(item);
    setView('result');
    setReviewLoading(true);
    setError('');
    try {
      const review = await skillTestService.getResultReview(item.id);
      setAttempt((current) => current?.id === item.id ? { ...current, ...review } : current);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Unable to load answer review.');
    } finally {
      setReviewLoading(false);
    }
  };

  const resumeAttempt = (item: SkillTestAttempt) => {
    setAttempt(item);
    setAnswers({});
    setQuestionIndex(0);
    setView('test');
  };

  if (view === 'choose') {
    return (
      <Stack spacing={1.5}>
        <Box sx={{ ...panelSx, p: { xs: 1.75, md: 2.25 } }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Choose your assessment focus</Typography>
          <Typography variant="body2" sx={{ mt: 0.35, color: '#64748B' }}>Generate a test from your profile or focus on one specific skill.</Typography>
        </Box>
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={6}>
            <Card sx={{ ...panelSx, height: '100%', p: 1, borderColor: mode === 'profile' ? '#2563EB' : '#E2E8F0', bgcolor: mode === 'profile' ? '#F5F9FF' : '#FFFFFF' }}>
              <Button fullWidth aria-pressed={mode === 'profile'} onClick={() => setMode('profile')} sx={{ justifyContent: 'flex-start', p: 1, textAlign: 'left', color: '#172033', textTransform: 'none', '&:focus-visible': { outline: '3px solid #93C5FD', outlineOffset: 1 } }}>
                <AutoAwesomeIcon color="primary" fontSize="small" sx={{ mr: 1.2 }} />
                <Box><Typography variant="body2" sx={{ fontWeight: 800 }}>Use My Skills</Typography><Typography variant="caption" sx={{ display: 'block', mt: 0.2, color: '#64748B' }}>Personalized from your JobPoyt profile.</Typography></Box>
              </Button>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ ...panelSx, height: '100%', p: 1, borderColor: mode === 'custom' ? '#2563EB' : '#E2E8F0', bgcolor: mode === 'custom' ? '#F5F9FF' : '#FFFFFF' }}>
              <Button fullWidth aria-pressed={mode === 'custom'} onClick={() => setMode('custom')} sx={{ justifyContent: 'flex-start', p: 1, textAlign: 'left', color: '#172033', textTransform: 'none', '&:focus-visible': { outline: '3px solid #93C5FD', outlineOffset: 1 } }}>
                <DescriptionIcon color="primary" fontSize="small" sx={{ mr: 1.2 }} />
                <Box><Typography variant="body2" sx={{ fontWeight: 800 }}>Choose a Skill</Typography><Typography variant="caption" sx={{ display: 'block', mt: 0.2, color: '#64748B' }}>Focus on one technical skill.</Typography></Box>
              </Button>
              <TextField fullWidth size="small" label="Skill" placeholder="React, Python, SQL..." value={customSkill} onFocus={() => setMode('custom')} onChange={(event) => { setMode('custom'); setCustomSkill(event.target.value); }} sx={{ mt: 0.8 }} />
            </Card>
          </Grid>
        </Grid>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Stack direction="row" justifyContent="space-between" gap={1}>
          <Button size="small" onClick={() => setView('history')} sx={{ textTransform: 'none' }}>Back to history</Button>
          <Button size="small" variant="contained" onClick={startGeneration} disabled={loading} startIcon={loading ? <CircularProgress size={15} color="inherit" /> : <PlayArrowIcon />} sx={{ textTransform: 'none', fontWeight: 700 }}>{loading ? 'Generating...' : 'Generate Test'}</Button>
        </Stack>
      </Stack>
    );
  }

  if (view === 'test' && currentQuestion) {
    const selectedAnswer = answers[currentQuestion.id] || '';
    const progress = ((questionIndex + 1) / questions.length) * 100;
    return (
      <Stack spacing={1.5} sx={{ minWidth: 0 }}>
        <Box sx={{ ...panelSx, p: { xs: 1.5, md: 2 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={0.8}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.3 }}>Skill Test</Typography>
              <Typography variant="body2" noWrap title={attempt?.skill_focus} sx={{ color: '#64748B', maxWidth: '100%' }}>{summarizeSkills(attempt?.skill_focus)}</Typography>
            </Box>
            <Typography variant="body2" aria-live="polite" sx={{ flexShrink: 0, fontWeight: 700, color: '#334155' }}>Question {questionIndex + 1} of {questions.length}</Typography>
          </Stack>
          <LinearProgress aria-label={`Test progress ${Math.round(progress)} percent`} variant="determinate" value={progress} sx={{ mt: 1.25, height: 5, borderRadius: 4, bgcolor: '#EAF0F8' }} />
        </Box>
        <Card sx={{ ...panelSx, p: { xs: 1.5, md: 2 } }}>
          <CardContent sx={{ p: '0 !important' }}>
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
              <Chip size="small" label={`${currentQuestion.kind === 'theory' ? 'Theory' : 'Coding'} · ${currentQuestion.marks} marks`} color="primary" variant="outlined" />
              <Chip size="small" label={currentQuestion.difficulty} variant="outlined" />
            </Stack>
            <Typography component="h2" sx={{ mt: 1.5, fontSize: { xs: 16, sm: 19 }, lineHeight: 1.5, fontWeight: 700, color: '#172033' }}>{currentQuestion.question}</Typography>
            {currentQuestion.kind === 'theory' ? (
              <Stack role="radiogroup" aria-label="Answer options" spacing={0.8} sx={{ mt: 1.5 }}>
                {(currentQuestion.options || []).map((option, index) => {
                  const letter = String.fromCharCode(65 + index);
                  const isSelected = selectedAnswer === letter;
                  return (
                    <Button key={letter} type="button" role="radio" aria-checked={isSelected} onClick={() => setAnswers((previous) => ({ ...previous, [currentQuestion.id]: letter }))} variant="outlined" sx={{ justifyContent: 'flex-start', gap: 1.2, minHeight: 46, p: '8px 12px', borderRadius: 1.5, borderColor: isSelected ? '#2563EB' : '#E2E8F0', bgcolor: isSelected ? '#EFF6FF' : '#FFFFFF', color: '#1E293B', textAlign: 'left', whiteSpace: 'normal', transition: 'border-color 140ms ease, background-color 140ms ease', '&:hover': { borderColor: '#60A5FA', bgcolor: isSelected ? '#EFF6FF' : '#F8FBFF' }, '&:focus-visible': { outline: '3px solid #93C5FD', outlineOffset: 1 } }}>
                      <Box component="span" sx={{ display: 'grid', placeItems: 'center', flex: '0 0 26px', width: 26, height: 26, borderRadius: '50%', border: '1px solid', borderColor: isSelected ? '#2563EB' : '#CBD5E1', bgcolor: isSelected ? '#2563EB' : '#FFFFFF', color: isSelected ? '#FFFFFF' : '#475569', fontSize: 12, fontWeight: 800 }}>{letter}</Box>
                      <Typography component="span" variant="body2" sx={{ fontWeight: isSelected ? 650 : 500, lineHeight: 1.45 }}>{cleanOption(option)}</Typography>
                    </Button>
                  );
                })}
              </Stack>
            ) : (
              <>
                {currentQuestion.problem && currentQuestion.problem !== currentQuestion.question ? <Typography variant="body2" sx={{ mt: 1, color: '#475569', whiteSpace: 'pre-wrap' }}>{currentQuestion.problem}</Typography> : null}
                {currentQuestion.starterCode ? <Box component="pre" sx={{ mt: 1, mb: 0, p: 1.25, overflowX: 'auto', borderRadius: 1.5, bgcolor: '#F1F5F9', color: '#334155', fontSize: 12 }}>{currentQuestion.starterCode}</Box> : null}
                <TextField fullWidth multiline minRows={8} maxRows={16} label="Your answer" sx={{ mt: 1.5, '& textarea': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13 } }} placeholder="Write your code or technical answer here..." value={selectedAnswer} onChange={(event) => setAnswers((previous) => ({ ...previous, [currentQuestion.id]: event.target.value }))} />
              </>
            )}
          </CardContent>
        </Card>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Stack direction="row" justifyContent="space-between" gap={1}>
          <Button size="small" disabled={questionIndex === 0} onClick={() => setQuestionIndex((current) => current - 1)} sx={{ minHeight: 36, px: 1.5, textTransform: 'none' }}>Previous</Button>
          {isFinalQuestion ? <Button size="small" variant="contained" onClick={() => setConfirmSubmit(true)} disabled={submitting} sx={{ minHeight: 36, px: 2, textTransform: 'none', fontWeight: 700 }}>Submit Test</Button> : <Button size="small" variant="contained" onClick={() => setQuestionIndex((current) => current + 1)} sx={{ minHeight: 36, px: 2, textTransform: 'none', fontWeight: 700 }}>Next</Button>}
        </Stack>
        <Dialog open={confirmSubmit} onClose={() => { if (!submitting) setConfirmSubmit(false); }} aria-labelledby="skill-test-submit-title" aria-describedby="skill-test-submit-description" maxWidth="xs" fullWidth>
          <DialogTitle id="skill-test-submit-title" sx={{ pb: 0.5, fontWeight: 800 }}>Submit your test?</DialogTitle>
          <DialogContent id="skill-test-submit-description" sx={{ color: '#64748B' }}>Are you sure you want to submit your test? Once submitted, your answers cannot be changed.</DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.25 }}>
            <Button size="small" disabled={submitting} onClick={() => setConfirmSubmit(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button size="small" variant="contained" disabled={submitting} onClick={submitTest} startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : undefined} sx={{ minWidth: 112, textTransform: 'none', fontWeight: 700 }}>{submitting ? 'Submitting...' : 'Submit Test'}</Button>
          </DialogActions>
        </Dialog>
      </Stack>
    );
  }

  if (view === 'result' && attempt?.result) {
    const result = attempt.result;
    const resultQuestions = attempt.questions || [];
    const resultAnswers = attempt.answers || {};
    const theoryReview = resultQuestions.map((question, index) => ({ question, index, answer: resultAnswers[question.id] || '' })).filter(({ question, answer }) => question.kind === 'theory' && answer.trim().toUpperCase() !== String(question.correctAnswer || '').trim().toUpperCase());
    const codingReview = resultQuestions.map((question, index) => ({ question, index, evaluation: result.codingEvaluations?.find((item) => item.id === question.id) })).filter(({ question, evaluation }) => question.kind === 'coding' && (evaluation?.score || 0) < 8);
    const performance = result.totalScore >= 85 ? 'Excellent performance' : result.totalScore >= 70 ? 'Strong performance' : result.totalScore >= 50 ? 'Good foundation' : 'Keep building your skills';
    const insightGroups = [
      { title: 'Strengths', items: result.insights?.strengths || [], color: '#15803D' },
      { title: 'Areas to improve', items: result.insights?.areasToImprove || [], color: '#B45309' },
      { title: 'Recommended practice', items: result.insights?.recommendedPractice || [], color: '#2563EB' },
    ];
    return (
      <Stack spacing={1.5} sx={{ minWidth: 0 }}>
        <Button size="small" onClick={() => { setView('history'); refreshHistory(); }} sx={{ alignSelf: 'flex-start', minHeight: 32, textTransform: 'none' }}>Back to Skill Test History</Button>
        <Box sx={{ ...panelSx, p: { xs: 1.75, md: 2.25 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1.5}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Skill Test Result</Typography>
              <Typography variant="body2" noWrap title={attempt.skill_focus} sx={{ mt: 0.25, color: '#64748B' }}>{summarizeSkills(attempt.skill_focus)}</Typography>
              <Chip size="small" color="primary" variant="outlined" label={performance} sx={{ mt: 1, fontWeight: 650 }} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress variant="determinate" value={100} size={68} thickness={4} sx={{ color: '#E2E8F0' }} />
                <CircularProgress variant="determinate" value={result.totalScore} size={68} thickness={4} sx={{ color: '#2563EB', position: 'absolute', left: 0 }} />
                <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 17, fontWeight: 800, color: '#0F172A' }}>{result.totalScore}</Box>
              </Box>
              <Box><Typography variant="h5" sx={{ lineHeight: 1.1, fontWeight: 800, color: '#1D4ED8' }}>{result.totalScore}<Typography component="span" sx={{ color: '#64748B', fontSize: 14, fontWeight: 600 }}> / 100</Typography></Typography><Typography variant="caption" sx={{ color: '#64748B' }}>Overall score</Typography></Box>
            </Box>
          </Stack>
        </Box>
        <Grid container spacing={1.25}>
          { [
            { label: 'Theory', score: result.theoryScore, max: 60 },
            { label: 'Coding', score: result.codingScore, max: 40 },
            { label: 'Overall', score: result.totalScore, max: 100 },
          ].map((item) => <Grid key={item.label} item xs={12} sm={4}><Card sx={{ ...panelSx, p: 1.5 }}><Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</Typography><Typography variant="h6" sx={{ mt: 0.3, fontWeight: 800, color: '#172033' }}>{item.score}<Typography component="span" sx={{ color: '#64748B', fontSize: 13, fontWeight: 600 }}> / {item.max}</Typography></Typography></Card></Grid>)}
        </Grid>
        {reviewLoading ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1, color: '#64748B' }}><CircularProgress size={17} />Loading answer review...</Box> : null}
        {!reviewLoading && theoryReview.length + codingReview.length > 0 ? (
          <Card sx={{ ...panelSx, p: { xs: 1.5, md: 2 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Questions to review</Typography>
            <Typography variant="body2" sx={{ mt: 0.25, color: '#64748B' }}>{theoryReview.length + codingReview.length} question{theoryReview.length + codingReview.length === 1 ? '' : 's'} to revisit</Typography>
            <Stack spacing={1} sx={{ mt: 1.25 }}>
              {theoryReview.map(({ question, index, answer }) => (
                <Box key={question.id} sx={{ p: 1.25, border: '1px solid #E2E8F0', borderRadius: 1.5, bgcolor: '#FFFFFF' }}>
                  <Stack direction="row" justifyContent="space-between" gap={1} alignItems="center"><Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>Question {index + 1}</Typography><Chip size="small" variant="outlined" label={`${question.difficulty} · ${question.marks} marks`} /></Stack>
                  <Typography variant="body2" sx={{ mt: 0.75, fontWeight: 700, color: '#172033' }}>{question.question}</Typography>
                  <Typography variant="body2" sx={{ mt: 0.8, p: 0.8, borderRadius: 1, bgcolor: '#FFF7F7', color: '#B42318' }}><strong>Your answer:</strong> {answerText(question, answer)}</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, p: 0.8, borderRadius: 1, bgcolor: '#F0FDF4', color: '#166534' }}><strong>Correct answer:</strong> {answerText(question, question.correctAnswer)}</Typography>
                  <Stack direction="row" justifyContent="space-between" gap={1} sx={{ mt: 0.75 }}><Typography variant="caption" sx={{ color: '#64748B' }}>Marks earned: 0 / {question.marks}</Typography><Typography variant="caption" sx={{ color: '#B42318', fontWeight: 700 }}>Marks lost: {question.marks}</Typography></Stack>
                  {question.explanation ? <Typography variant="body2" sx={{ mt: 0.7, color: '#475569' }}><strong>Why:</strong> {compactText(question.explanation)}</Typography> : null}
                </Box>
              ))}
              {codingReview.map(({ question, index, evaluation }) => (
                <Box key={question.id} sx={{ p: 1.25, border: '1px solid #E2E8F0', borderRadius: 1.5, bgcolor: '#FFFFFF' }}>
                  <Stack direction="row" justifyContent="space-between" gap={1} alignItems="center"><Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>Coding question {index + 1}</Typography><Chip size="small" variant="outlined" label={`${evaluation?.score || 0} / 8`} /></Stack>
                  <Typography variant="body2" sx={{ mt: 0.75, fontWeight: 700 }}>{question.problem || question.question}</Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.8, color: '#B42318', fontWeight: 700 }}>Your answer</Typography>
                  <Box component="pre" sx={{ maxHeight: 180, overflow: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', m: 0, mt: 0.35, p: 1, borderRadius: 1, bgcolor: '#F8FAFC', color: '#334155', fontSize: 12 }}>{resultAnswers[question.id] || 'No answer submitted'}</Box>
                  <Typography variant="body2" sx={{ mt: 0.75, color: '#475569' }}><strong>AI evaluation:</strong> {compactText(evaluation?.feedback || 'Review the problem requirements and edge cases.')}</Typography>
                  {question.expectedApproach ? <Typography variant="body2" sx={{ mt: 0.5, color: '#475569' }}><strong>How to improve:</strong> {compactText(question.expectedApproach, 240)}</Typography> : null}
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#B42318', fontWeight: 700 }}>Marks lost: {8 - (evaluation?.score || 0)}</Typography>
                </Box>
              ))}
            </Stack>
          </Card>
        ) : !reviewLoading ? <Card sx={{ ...panelSx, p: 1.5 }}><Typography variant="body2" sx={{ color: '#166534', fontWeight: 700 }}>No questions to review. Great work.</Typography></Card> : null}
        <Card sx={{ ...panelSx, p: { xs: 1.5, md: 2 } }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>AI Skill Analysis</Typography>
          <Grid container spacing={1.5} sx={{ mt: 0.1 }}>
            {insightGroups.map((group) => <Grid key={group.title} item xs={12} md={4}><Box sx={{ height: '100%', p: 1.1, border: '1px solid #E2E8F0', borderRadius: 1.5, bgcolor: '#FFFFFF' }}><Typography variant="body2" sx={{ fontWeight: 750, color: group.color }}>{group.title}</Typography><Stack component="ul" spacing={0.4} sx={{ pl: 2, mb: 0, mt: 0.75, color: '#475569' }}>{group.items.slice(0, 3).map((item, index) => <Typography component="li" key={`${group.title}-${index}`} variant="body2" sx={{ lineHeight: 1.45 }}>{compactText(item, 180)}</Typography>)}</Stack>{group.items.length === 0 ? <Typography variant="body2" sx={{ mt: 0.6, color: '#64748B' }}>No additional notes.</Typography> : null}</Box></Grid>)}
          </Grid>
        </Card>
        {error ? <Alert severity="warning">{error}</Alert> : null}
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5} sx={{ minWidth: 0 }}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {loading ? <Box sx={{ py: 3, textAlign: 'center' }}><LinearProgress sx={{ maxWidth: 440, mx: 'auto' }} /><Typography variant="body2" sx={{ mt: 1, color: '#64748B' }}>Loading Skill Test history...</Typography></Box> : history.length === 0 ? (
        <Card sx={{ ...panelSx, p: { xs: 2, md: 2.5 }, textAlign: 'center' }}>
          <AutoAwesomeIcon sx={{ color: '#2563EB' }} />
          <Typography variant="subtitle1" sx={{ mt: 0.5, fontWeight: 800 }}>No skill tests completed yet</Typography>
          <Typography variant="body2" sx={{ mt: 0.35, color: '#64748B' }}>Take your first AI-generated skill test based on your JobPoyt skills.</Typography>
          <Button size="small" variant="contained" onClick={() => setView('choose')} sx={{ mt: 1.5, minHeight: 36, textTransform: 'none', fontWeight: 700 }}>Start New Test</Button>
        </Card>
      ) : (
        <Stack spacing={0.9}>
          {history.map((item) => (
            <Card key={item.id} sx={{ ...panelSx, p: 0 }}>
              <CardContent sx={{ p: '12px 14px !important' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#172033' }}>{item.mode === 'profile' ? 'Personalized Skill Test' : summarizeSkills(item.skill_focus)}</Typography>
                      {item.status === 'completed' ? <Typography variant="subtitle1" sx={{ flexShrink: 0, fontWeight: 800, color: '#1D4ED8' }}>{item.result?.totalScore ?? 0}<Typography component="span" variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}> / 100</Typography></Typography> : null}
                    </Stack>
                    <Typography variant="caption" noWrap title={item.skill_focus} sx={{ display: 'block', mt: 0.2, color: '#64748B' }}>{summarizeSkills(item.skill_focus)}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#64748B' }}>{formatTestDate(item.test_date)} <Box component="span" sx={{ px: 0.4 }}>·</Box> {item.status === 'completed' ? 'Completed' : 'Generated'}</Typography>
                  </Box>
                  {item.status === 'completed' ? <Button size="small" variant="outlined" onClick={() => openResult(item)} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, minHeight: 32, px: 1.25, textTransform: 'none', fontWeight: 650 }}>View Result</Button> : <Button size="small" variant="outlined" onClick={() => resumeAttempt(item)} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, minHeight: 32, px: 1.25, textTransform: 'none', fontWeight: 650 }}>Resume Test</Button>}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
};

export const PremiumToolDashboards: React.FC<PremiumToolDashboardsProps> = ({ tool, skillTestHeaderActionRef, onSkillTestHeaderStateChange, interviewPreparationContext, onPrepareInterview }) => {
  if (tool === 'Interview Preparation') {
    return <React.Suspense fallback={<LinearProgress />}><LazyCandidateInterviewCoach preparationContext={interviewPreparationContext} /></React.Suspense>;
  }

  if (tool === 'Interview Invites') {
    return <React.Suspense fallback={<LinearProgress />}><LazyCandidateInterviewInvites onPrepareInterview={onPrepareInterview || (() => undefined)} /></React.Suspense>;
  }

  if (tool === 'Skill Test') {
    return <SkillTestDashboard skillTestHeaderActionRef={skillTestHeaderActionRef} onSkillTestHeaderStateChange={onSkillTestHeaderStateChange} />;
  }

  if (tool === 'Resume Builder') {
    return <React.Suspense fallback={<LinearProgress />}><LazyResumeStudio /></React.Suspense>;
  }

  if (tool === 'Certificates') {
    return <React.Suspense fallback={<LinearProgress />}><LazyAssessmentCertifications /></React.Suspense>;
  }

  return null;
};
