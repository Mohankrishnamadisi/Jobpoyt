import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { RecruiterPageHero } from './RecruiterPageHero';
import {
  Add as AddIcon,
  Download as DownloadIcon,
  Psychology as AiIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import {
  assessmentPlatformService,
  type AssessmentCategory,
  type Difficulty,
  type QuestionType,
} from '@services/assessmentPlatform';

type RecruiterTab =
  | 'dashboard'
  | 'assessment-builder'
  | 'question-bank'
  | 'ai-question-generator'
  | 'invitations'
  | 'results'
  | 'skill-verification'
  | 'proctoring'
  | 'reports'
  | 'analytics'
  | 'integration';

interface RecruiterAssessmentsCenterProps {
  recruiterId: string;
}

const downloadText = (name: string, content: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const statCard = (label: string, value: string | number) => (
  <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
    <CardContent>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>{value}</Typography>
    </CardContent>
  </Card>
);

export const RecruiterAssessmentsCenter: React.FC<RecruiterAssessmentsCenterProps> = ({ recruiterId }) => {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const [tab, setTab] = useState<RecruiterTab>('dashboard');
  const [candidateId, setCandidateId] = useState('candidate_demo_001');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [aiTopic, setAiTopic] = useState('TypeScript');
  const [aiDifficulty, setAiDifficulty] = useState<Difficulty>('Medium');
  const [aiStyle, setAiStyle] = useState<'MCQs' | 'Coding Problems' | 'HR Questions' | 'Scenario Questions' | 'System Design' | 'Behavioral Questions'>('MCQs');

  const [builder, setBuilder] = useState({
    title: 'Custom Frontend Screening',
    description: 'Screening for modern frontend development.',
    durationMin: 60,
    passingScore: 70,
    difficulty: 'Medium' as Difficulty,
    category: 'Frontend' as AssessmentCategory,
    skills: 'React, TypeScript, Testing',
    instructions: 'Attempt all sections. Avoid tab switching.',
    negativeMarking: false,
    shuffleQuestions: true,
    questionType: 'Multiple Choice' as QuestionType,
  });

  const recruiterDashboard = useMemo(() => assessmentPlatformService.getRecruiterDashboard(recruiterId), [recruiterId]);
  const library = useMemo(() => assessmentPlatformService.listLibrary(), [tab]);
  const questions = useMemo(() => assessmentPlatformService.listQuestionBank(), [tab]);
  const invitations = useMemo(() => assessmentPlatformService.listRecruiterInvitations(recruiterId), [recruiterId, tab]);
  const allResults = useMemo(() => assessmentPlatformService.listAllResults(), [tab, invitations.length]);
  const analytics = useMemo(() => assessmentPlatformService.getPlatformAnalytics(), [tab, allResults.length]);
  const reports = useMemo(() => assessmentPlatformService.generateReports(), [allResults.length]);
  const permissions = useMemo(() => assessmentPlatformService.getPermissions(), []);

  return (
    <Box>
      <RecruiterPageHero
        eyebrow="Candidates"
        icon={<VerifiedIcon />}
        title="Recruiter Assessments"
        description="Create, assign, evaluate and certify candidate skills with AI-powered assessment workflows."
        actions={<Chip icon={<VerifiedIcon />} label="Skill Verification Active" color="success" />}
      />

      <Paper sx={{ border: '1px solid #e2e8f0', borderRadius: 2, mb: 2 }}>
        <Tabs value={tab} onChange={(_, value: RecruiterTab) => setTab(value)} variant={isTablet ? 'scrollable' : 'scrollable'} scrollButtons="auto" allowScrollButtonsMobile sx={{ minHeight: 54, px: 0.5, '& .MuiTabs-scroller': { overflowX: 'auto !important' }, '& .MuiTabs-scrollButtons': { width: 34, borderRadius: 1, mx: 0.5 }, '& .MuiTab-root': { textTransform: 'none', whiteSpace: 'nowrap', minHeight: 54, minWidth: 'max-content', px: 1.8, fontWeight: 700, fontSize: '0.82rem' } }}>
          <Tab value="dashboard" label="Assessment Dashboard" />
          <Tab value="assessment-builder" label="Assessment Builder" />
          <Tab value="question-bank" label="Question Bank" />
          <Tab value="ai-question-generator" label="AI Question Generator" />
          <Tab value="invitations" label="Invitations" />
          <Tab value="results" label="Assessment Results" />
          <Tab value="skill-verification" label="Skill Verification" />
          <Tab value="proctoring" label="Proctoring Architecture" />
          <Tab value="reports" label="Reports" />
          <Tab value="analytics" label="Analytics" />
          <Tab value="integration" label="Recruiter Integration" />
        </Tabs>
      </Paper>

      {tab === 'dashboard' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={4}>{statCard('Total Assessments', recruiterDashboard.totalAssessments)}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Custom Assessments', recruiterDashboard.customAssessments)}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Invitations Sent', recruiterDashboard.invitationsSent)}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Completion Rate', `${recruiterDashboard.completionRate}%`)}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Pass Percentage', `${recruiterDashboard.passPercentage}%`)}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Average Score', `${recruiterDashboard.averageScore}%`)}</Grid>
        </Grid>
      )}

      {tab === 'assessment-builder' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={6}><TextField fullWidth label="Title" value={builder.title} onChange={(e) => setBuilder((cur) => ({ ...cur, title: e.target.value }))} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Description" value={builder.description} onChange={(e) => setBuilder((cur) => ({ ...cur, description: e.target.value }))} /></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth type="number" label="Duration" value={builder.durationMin} onChange={(e) => setBuilder((cur) => ({ ...cur, durationMin: Number(e.target.value) || 60 }))} /></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth type="number" label="Passing Score" value={builder.passingScore} onChange={(e) => setBuilder((cur) => ({ ...cur, passingScore: Number(e.target.value) || 70 }))} /></Grid>
          <Grid item xs={12} md={3}><FormControl fullWidth><InputLabel>Difficulty</InputLabel><Select value={builder.difficulty} label="Difficulty" onChange={(e) => setBuilder((cur) => ({ ...cur, difficulty: e.target.value as Difficulty }))}><MenuItem value="Easy">Easy</MenuItem><MenuItem value="Medium">Medium</MenuItem><MenuItem value="Hard">Hard</MenuItem></Select></FormControl></Grid>
          <Grid item xs={12} md={3}><FormControl fullWidth><InputLabel>Category</InputLabel><Select value={builder.category} label="Category" onChange={(e) => setBuilder((cur) => ({ ...cur, category: e.target.value as AssessmentCategory }))}>{assessmentPlatformService.getCategories().map((cat) => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Skills (comma separated)" value={builder.skills} onChange={(e) => setBuilder((cur) => ({ ...cur, skills: e.target.value }))} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Instructions" value={builder.instructions} onChange={(e) => setBuilder((cur) => ({ ...cur, instructions: e.target.value }))} /></Grid>
          <Grid item xs={12} md={6}><FormControl fullWidth><InputLabel>Question Type Focus</InputLabel><Select value={builder.questionType} label="Question Type Focus" onChange={(e) => setBuilder((cur) => ({ ...cur, questionType: e.target.value as QuestionType }))}>{assessmentPlatformService.getQuestionTypes().map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={12} md={6}><Stack direction="row" spacing={1} alignItems="center"><Chip label={`Negative Marking: ${builder.negativeMarking ? 'ON' : 'OFF'}`} onClick={() => setBuilder((cur) => ({ ...cur, negativeMarking: !cur.negativeMarking }))} /><Chip label={`Shuffle Questions: ${builder.shuffleQuestions ? 'ON' : 'OFF'}`} onClick={() => setBuilder((cur) => ({ ...cur, shuffleQuestions: !cur.shuffleQuestions }))} /></Stack></Grid>
          <Grid item xs={12}><Button variant="contained" startIcon={<AddIcon />} onClick={() => {
            const created = assessmentPlatformService.createCustomAssessment({
              title: builder.title,
              description: builder.description,
              durationMin: builder.durationMin,
              passingScore: builder.passingScore,
              difficulty: builder.difficulty,
              category: builder.category,
              skills: builder.skills.split(',').map((s) => s.trim()).filter(Boolean),
              instructions: builder.instructions,
              negativeMarking: builder.negativeMarking,
              shuffleQuestions: builder.shuffleQuestions,
              questionBankIds: assessmentPlatformService.listQuestionBank().slice(0, 8).map((q) => q.id),
              createdBy: recruiterId,
              codingConfig: {
                enabled: true,
                languages: ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go'],
                hiddenTestCases: 6,
                sampleTestCases: 3,
                timeLimitSec: 2,
                memoryLimitMb: 256,
              },
            });
            setSelectedAssessmentId(created.id);
            toast.success('Custom assessment created');
          }}>Create Assessment</Button></Grid>
        </Grid>
      )}

      {tab === 'question-bank' && (
        <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Question</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Difficulty</TableCell>
                <TableCell>Tags</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {questions.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.title}</TableCell>
                  <TableCell>{item.questionType}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.difficulty}</TableCell>
                  <TableCell>{item.tags.join(', ')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 'ai-question-generator' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}><TextField fullWidth label="Topic" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><FormControl fullWidth><InputLabel>Difficulty</InputLabel><Select value={aiDifficulty} label="Difficulty" onChange={(e) => setAiDifficulty(e.target.value as Difficulty)}><MenuItem value="Easy">Easy</MenuItem><MenuItem value="Medium">Medium</MenuItem><MenuItem value="Hard">Hard</MenuItem></Select></FormControl></Grid>
          <Grid item xs={12} md={4}><FormControl fullWidth><InputLabel>Type</InputLabel><Select value={aiStyle} label="Type" onChange={(e) => setAiStyle(e.target.value as typeof aiStyle)}>{['MCQs', 'Coding Problems', 'HR Questions', 'Scenario Questions', 'System Design', 'Behavioral Questions'].map((style) => <MenuItem key={style} value={style}>{style}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={12}><Button variant="contained" startIcon={<AiIcon />} onClick={() => {
            assessmentPlatformService.generateAiQuestions(aiTopic, aiDifficulty, 5, aiStyle);
            toast.success('AI generated 5 questions and added to bank');
          }}>Generate AI Questions</Button></Grid>
        </Grid>
      )}

      {tab === 'invitations' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={5}><FormControl fullWidth><InputLabel>Assessment</InputLabel><Select value={selectedAssessmentId} label="Assessment" onChange={(e) => setSelectedAssessmentId(e.target.value)}>{library.map((item) => <MenuItem key={item.id} value={item.id}>{item.title}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth label="Candidate ID" value={candidateId} onChange={(e) => setCandidateId(e.target.value)} /></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="contained" onClick={() => {
            if (!selectedAssessmentId) {
              toast.error('Select an assessment');
              return;
            }
            const now = new Date();
            const scheduledAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
            const deadlineAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
            assessmentPlatformService.inviteCandidate(recruiterId, candidateId, selectedAssessmentId, scheduledAt, deadlineAt);
            toast.success('Candidate invited for assessment');
          }}>Invite Candidate</Button></Grid>
          <Grid item xs={12}>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead><TableRow><TableCell>Candidate</TableCell><TableCell>Assessment</TableCell><TableCell>Deadline</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
                <TableBody>
                  {invitations.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.candidateId}</TableCell>
                      <TableCell>{library.find((a) => a.id === item.assessmentId)?.title || item.assessmentId}</TableCell>
                      <TableCell>{new Date(item.deadlineAt).toLocaleString()}</TableCell>
                      <TableCell><Chip size="small" label={item.status.toUpperCase()} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {tab === 'results' && (
        <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0' }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Candidate</TableCell><TableCell>Assessment</TableCell><TableCell>Overall</TableCell><TableCell>Coding</TableCell><TableCell>Accuracy</TableCell><TableCell>Time</TableCell><TableCell>Rank</TableCell><TableCell>Percentile</TableCell></TableRow></TableHead>
            <TableBody>
              {allResults.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.candidateId}</TableCell>
                  <TableCell>{library.find((a) => a.id === row.assessmentId)?.title || row.assessmentId}</TableCell>
                  <TableCell>{row.overallScore}%</TableCell>
                  <TableCell>{row.codingScore}%</TableCell>
                  <TableCell>{row.accuracy}%</TableCell>
                  <TableCell>{row.timeTakenMin}m</TableCell>
                  <TableCell>{row.rank}</TableCell>
                  <TableCell>{row.percentile}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 'skill-verification' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="success">After passing assessments, verified skill badges and certificates are generated automatically with level mapping (Beginner, Intermediate, Advanced, Expert).</Alert></Grid>
          <Grid item xs={12}><Alert severity="info">Certificate includes candidate name, skill, score, completion date, certificate id, QR code and verification URL with PDF download option.</Alert></Grid>
        </Grid>
      )}

      {tab === 'proctoring' && (
        <Grid container spacing={1.2}>
          {Object.entries(assessmentPlatformService.getProctoringArchitecture()).map(([key, value]) => (
            <Grid item xs={12} md={6} key={key}>
              <Card sx={{ border: '1px solid #e2e8f0' }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ textTransform: 'capitalize', fontWeight: 700 }}>{key.replace(/([A-Z])/g, ' $1')}</Typography>
                  <Typography variant="body2" color="text.secondary">{value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 'reports' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={3}><Button fullWidth variant="contained" startIcon={<DownloadIcon />} onClick={() => downloadText('assessment-report.md', reports.assessmentReport)}>Assessment Report</Button></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="outlined" onClick={() => downloadText('skill-report.md', reports.skillReport)}>Skill Report</Button></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="outlined" onClick={() => downloadText('company-skill-report.md', reports.companySkillReport)}>Company Skill Report</Button></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="outlined" onClick={() => downloadText('hiring-readiness-report.md', reports.hiringReadinessReport)}>Hiring Readiness</Button></Grid>
        </Grid>
      )}

      {tab === 'analytics' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={3}>{statCard('Completion Rate', `${analytics.assessmentCompletionRate}%`)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Pass Percentage', `${analytics.passPercentage}%`)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Average Scores', `${analytics.averageScores}%`)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Recruiter Usage', analytics.recruiterUsage)}</Grid>
          <Grid item xs={12}><Alert severity="info">Top Skills: {analytics.topSkills.join(', ')} | Weak Skills: {analytics.weakSkills.join(', ')} | Candidate Participation: {analytics.candidateParticipation}</Alert></Grid>
        </Grid>
      )}

      {tab === 'integration' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="success">Candidate profiles can expose verified skills, assessment scores, certificates, coding scores, communication scores. Recruiter filters can consume these signals for better shortlisting.</Alert></Grid>
          <Grid item xs={12}><Alert severity="info">Permissions: {permissions.candidate} | {permissions.recruiter} | {permissions.admin}</Alert></Grid>
        </Grid>
      )}
    </Box>
  );
};

export default RecruiterAssessmentsCenter;
