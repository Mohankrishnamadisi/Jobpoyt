import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  AutoAwesome as AutoAwesomeIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  PushPin as PinIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  SmartToy as SmartToyIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Send as SendIcon,
  UploadFile as UploadFileIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { themeColors } from '@styles/recruiterTheme';
import type { Job } from '@types';
import {
  aiHiringAssistantService,
  CandidateContextRow,
  CopilotConversation,
  RecruiterAiContext,
} from '@services/aiHiringAssistant';

interface RecruiterAiHiringAssistantProps {
  recruiterId: string;
}

type AssistantTab =
  | 'dashboard'
  | 'chat'
  | 'job-description'
  | 'resume-analyzer'
  | 'candidate-match'
  | 'interview-assistant'
  | 'offer-assistant'
  | 'message-assistant'
  | 'hiring-insights'
  | 'copilot-suggestions'
  | 'candidate-comparison'
  | 'ai-search'
  | 'meeting-summary'
  | 'reports'
  | 'saved-prompts'
  | 'ai-history';

const MotionBox = motion(Box);

const cardMetric = (title: string, value: string | number, color = themeColors.primary) => (
  <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
    <CardContent>
      <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>{title}</Typography>
      <Typography variant="h5" sx={{ mt: 0.6, fontWeight: 800, color }}>{value}</Typography>
    </CardContent>
  </Card>
);

const textBlobDownload = (filename: string, content: string, mimeType = 'text/plain;charset=utf-8'): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const printMarkdownAsPdf = (title: string, markdown: string): void => {
  const html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; }
          h1,h2,h3 { margin: 0 0 8px; }
          pre { white-space: pre-wrap; word-break: break-word; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <pre>${markdown.replace(/[<>&]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[char] || char))}</pre>
      </body>
    </html>
  `;

  const win = window.open('', '_blank', 'width=1200,height=900');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
};

const markdownPanel = (title: string, content: string) => (
  <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
    <CardContent>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.2 }}>{title}</Typography>
      <Paper sx={{ p: 1.2, backgroundColor: '#0F172A08', border: `1px solid ${themeColors.border}` }}>
        <ReactMarkdown>{content || 'No output generated yet.'}</ReactMarkdown>
      </Paper>
    </CardContent>
  </Card>
);

const ensureArray = <T,>(value: T[] | null | undefined): T[] => Array.isArray(value) ? value : [];

export const RecruiterAiHiringAssistant: React.FC<RecruiterAiHiringAssistantProps> = ({ recruiterId }) => {
  const tabSx = {
    textTransform: 'none',
    fontWeight: 700,
    fontSize: '0.82rem',
    minHeight: 54,
    minWidth: 'max-content',
    px: 1.8,
    whiteSpace: 'nowrap',
    color: themeColors.text.secondary,
    '&.Mui-selected': {
      color: themeColors.primary,
    },
  };

  const [tab, setTab] = useState<AssistantTab>('dashboard');
  const [context, setContext] = useState<RecruiterAiContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);

  const [conversationSearch, setConversationSearch] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [chatPrompt, setChatPrompt] = useState('');

  const [promptTitle, setPromptTitle] = useState('');
  const [promptText, setPromptText] = useState('');
  const [promptSearch, setPromptSearch] = useState('');

  const [historySearch, setHistorySearch] = useState('');

  const [jdTitle, setJdTitle] = useState('Frontend Developer');
  const [jdDepartment, setJdDepartment] = useState('Engineering');
  const [jdLocation, setJdLocation] = useState('Hyderabad');
  const [jdExperience, setJdExperience] = useState('3-5 years');
  const [jdEmploymentType, setJdEmploymentType] = useState('Full-Time');
  const [jdWorkMode, setJdWorkMode] = useState('Hybrid');
  const [jdSkills, setJdSkills] = useState('React, TypeScript, REST APIs, CSS');
  const [jdTone, setJdTone] = useState<'professional' | 'simple' | 'friendly'>('professional');
  const [jdExistingText, setJdExistingText] = useState('');
  const [jdOutput, setJdOutput] = useState('');

  const [resumeText, setResumeText] = useState('');
  const [resumeJobId, setResumeJobId] = useState('');
  const [resumeOutput, setResumeOutput] = useState('');

  const [matchCandidateId, setMatchCandidateId] = useState('');
  const [matchJobId, setMatchJobId] = useState('');
  const [matchOutput, setMatchOutput] = useState('');

  const [interviewRole, setInterviewRole] = useState('Software Engineer');
  const [interviewSkills, setInterviewSkills] = useState('React, TypeScript, Problem Solving');
  const [interviewDifficulty, setInterviewDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [interviewOutput, setInterviewOutput] = useState('');

  const [offerCandidateName, setOfferCandidateName] = useState('Candidate Name');
  const [offerRole, setOfferRole] = useState('Software Engineer');
  const [offerCompany, setOfferCompany] = useState('Jobpoyt');
  const [offerJoiningDate, setOfferJoiningDate] = useState('');
  const [offerCtc, setOfferCtc] = useState('₹12 LPA');
  const [offerOutput, setOfferOutput] = useState('');

  const [msgCandidateName, setMsgCandidateName] = useState('Candidate Name');
  const [msgRole, setMsgRole] = useState('Software Engineer');
  const [msgCompany, setMsgCompany] = useState('Jobpoyt');
  const [msgInterviewDate, setMsgInterviewDate] = useState('');
  const [existingMessage, setExistingMessage] = useState('');
  const [msgOutput, setMsgOutput] = useState('');

  const [comparisonJobId, setComparisonJobId] = useState('');
  const [comparisonCandidateIds, setComparisonCandidateIds] = useState<string[]>([]);
  const [comparisonOutput, setComparisonOutput] = useState('');

  const [searchQuery, setSearchQuery] = useState('Show React developers with 5+ years in Hyderabad');
  const [searchOutput, setSearchOutput] = useState('');

  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingOutput, setMeetingOutput] = useState('');

  const [reportsOutput, setReportsOutput] = useState('');
  const [insightsOutput, setInsightsOutput] = useState('');
  const [suggestionsOutput, setSuggestionsOutput] = useState('');

  const refreshContext = async (): Promise<void> => {
    setLoadingContext(true);
    try {
      const ctx = await aiHiringAssistantService.buildRecruiterContext(recruiterId);
      setContext(ctx);

      if (!selectedConversationId) {
        const convs = aiHiringAssistantService.listConversations(recruiterId);
        if (convs.length > 0) setSelectedConversationId(convs[0].id);
      }

      if (ctx.jobs.length > 0) {
        setResumeJobId((current) => current || String(ctx.jobs[0].id));
        setMatchJobId((current) => current || String(ctx.jobs[0].id));
        setComparisonJobId((current) => current || String(ctx.jobs[0].id));
      }

      if (ctx.candidates.length > 0) {
        setMatchCandidateId((current) => current || ctx.candidates[0].candidateId);
      }
    } catch (error) {
      console.error('Failed to load AI context:', error);
      toast.error('Failed to load recruiter AI context');
    } finally {
      setLoadingContext(false);
    }
  };

  useEffect(() => {
    void refreshContext();
  }, [recruiterId]);

  const conversations = useMemo(
    () => aiHiringAssistantService.listConversations(recruiterId, conversationSearch),
    [recruiterId, conversationSearch, context?.kpis.aiRequestsToday]
  );

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const savedPrompts = useMemo(
    () => aiHiringAssistantService.listSavedPrompts(recruiterId, promptSearch),
    [recruiterId, promptSearch, context?.kpis.aiRequestsToday]
  );

  const requestHistory = useMemo(
    () => aiHiringAssistantService.listRequestHistory(recruiterId, historySearch),
    [recruiterId, historySearch, context?.kpis.aiRequestsToday]
  );

  const jobs = context?.jobs || [];
  const candidates = context?.candidates || [];

  const candidateOptions = useMemo(() => {
    const map = new Map<string, CandidateContextRow>();
    candidates.forEach((item) => {
      if (!map.has(item.candidateId)) map.set(item.candidateId, item);
    });
    return Array.from(map.values());
  }, [candidates]);

  const newConversation = (): void => {
    const created = aiHiringAssistantService.createConversation(recruiterId, 'New Conversation');
    setSelectedConversationId(created.id);
  };

  const sendChat = (): void => {
    if (!context) {
      toast.error('Context not ready. Please refresh.');
      return;
    }
    const input = chatPrompt.trim();
    if (!input) return;

    let targetId = selectedConversationId;
    if (!targetId) {
      const created = aiHiringAssistantService.createConversation(recruiterId, 'New Conversation');
      targetId = created.id;
      setSelectedConversationId(created.id);
    }

    try {
      aiHiringAssistantService.askCopilot(recruiterId, targetId, input, context);
      setChatPrompt('');
      setTab('chat');
      setContext((current) => current ? { ...current, kpis: aiHiringAssistantService.getKpiSummary(recruiterId) } : current);
    } catch (error: any) {
      toast.error(String(error?.message || 'Failed to send message'));
    }
  };

  const renameConversation = (): void => {
    if (!selectedConversation) return;
    const next = window.prompt('Rename conversation', selectedConversation.title);
    if (!next) return;

    try {
      aiHiringAssistantService.renameConversation(recruiterId, selectedConversation.id, next);
      setContext((current) => current ? { ...current } : current);
    } catch (error: any) {
      toast.error(String(error?.message || 'Failed to rename conversation'));
    }
  };

  const deleteConversation = (): void => {
    if (!selectedConversation) return;
    if (!window.confirm('Delete this conversation?')) return;

    aiHiringAssistantService.deleteConversation(recruiterId, selectedConversation.id);
    const list = aiHiringAssistantService.listConversations(recruiterId);
    setSelectedConversationId(list[0]?.id || '');
    setContext((current) => current ? { ...current } : current);
  };

  const exportConversation = (): void => {
    if (!selectedConversation) return;
    const file = aiHiringAssistantService.exportConversation(recruiterId, selectedConversation.id);
    textBlobDownload(file.fileName, file.content, 'text/markdown;charset=utf-8');
  };

  const togglePinConversation = (): void => {
    if (!selectedConversation) return;
    aiHiringAssistantService.pinConversation(recruiterId, selectedConversation.id, !selectedConversation.pinned);
    setContext((current) => current ? { ...current } : current);
  };

  const savePrompt = (): void => {
    if (!promptText.trim()) {
      toast.error('Prompt text is required');
      return;
    }

    aiHiringAssistantService.savePrompt(recruiterId, {
      title: promptTitle.trim() || 'Saved Prompt',
      prompt: promptText.trim(),
    });

    setPromptTitle('');
    setPromptText('');
    setContext((current) => current ? { ...current } : current);
    toast.success('Prompt saved');
  };

  const generateJd = (): void => {
    const output = aiHiringAssistantService.generateJobDescription({
      title: jdTitle,
      department: jdDepartment,
      location: jdLocation,
      experience: jdExperience,
      employmentType: jdEmploymentType,
      workMode: jdWorkMode,
      skills: jdSkills.split(',').map((item) => item.trim()).filter(Boolean),
      tone: jdTone,
      existingText: jdExistingText,
    }, context || undefined);

    setJdOutput(output);
    aiHiringAssistantService.logRequest({
      recruiterId,
      type: 'job_description',
      title: `JD: ${jdTitle}`,
      input: jdTitle,
      output,
    });
    setContext((current) => current ? { ...current, kpis: aiHiringAssistantService.getKpiSummary(recruiterId) } : current);
  };

  const onResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setResumeText(text.slice(0, 20000));
      toast.success(`Loaded ${file.name}`);
    } catch {
      toast.error('Could not parse file. Paste resume text manually.');
    }
  };

  const analyzeResume = (): void => {
    const job = jobs.find((item) => String(item.id) === resumeJobId) || null;
    const report = aiHiringAssistantService.analyzeResume(resumeText, job);
    const output = [
      '# Resume Analyzer Output',
      `- Overall Score: **${report.overallScore}/100**`,
      `- Skill Match: **${report.skillMatch}%**`,
      '',
      '## Summary',
      report.summary,
      '',
      '## Strengths',
      ...report.strengths.map((item) => `- ${item}`),
      '',
      '## Weaknesses',
      ...report.weaknesses.map((item) => `- ${item}`),
      '',
      '## Matching Skills',
      report.matchingSkills.length > 0 ? report.matchingSkills.map((item) => `- ${item}`).join('\n') : '- No direct matches',
      '',
      '## Missing Skills',
      report.missingSkills.length > 0 ? report.missingSkills.map((item) => `- ${item}`).join('\n') : '- None',
      '',
      '## Experience Highlights',
      ...report.experienceHighlights.map((item) => `- ${item}`),
      '',
      `## Education Summary\n${report.educationSummary}`,
      '',
      `## Career Growth\n${report.careerGrowth}`,
      '',
      `## Recommendation\n${report.recommendation}`,
    ].join('\n');

    setResumeOutput(output);
    aiHiringAssistantService.logRequest({
      recruiterId,
      type: 'resume_analysis',
      title: `Resume Analysis: ${job?.title || 'General'}`,
      input: `Job=${job?.title || 'N/A'}`,
      output,
    });
    setContext((current) => current ? { ...current, kpis: aiHiringAssistantService.getKpiSummary(recruiterId) } : current);
  };

  const analyzeCandidateMatch = (): void => {
    const candidate = candidateOptions.find((item) => item.candidateId === matchCandidateId);
    const job = jobs.find((item) => String(item.id) === matchJobId);
    if (!candidate || !job) {
      toast.error('Select candidate and job');
      return;
    }

    const report = aiHiringAssistantService.analyzeCandidateMatch(candidate, job);
    const output = [
      '# Candidate Match Analysis',
      `Candidate: **${candidate.candidateName}**`,
      `Job: **${job.title}**`,
      `Match Score: **${report.matchScore}%**`,
      '',
      '## Match Score Explanation',
      report.explanation,
      '',
      '## Matching Skills',
      ...(report.matchingSkills.length > 0 ? report.matchingSkills.map((item) => `- ${item}`) : ['- None']),
      '',
      '## Missing Skills',
      ...(report.missingSkills.length > 0 ? report.missingSkills.map((item) => `- ${item}`) : ['- None']),
      '',
      '## Risk Factors',
      ...(report.riskFactors.length > 0 ? report.riskFactors.map((item) => `- ${item}`) : ['- No major risks detected']),
      '',
      '## Recommended Interview Topics',
      ...(report.interviewTopics.length > 0 ? report.interviewTopics.map((item) => `- ${item}`) : ['- General fit discussion']),
      '',
      `## Hiring Recommendation\n${report.hiringRecommendation}`,
    ].join('\n');

    setMatchOutput(output);
    aiHiringAssistantService.logRequest({
      recruiterId,
      type: 'candidate_match',
      title: `Match: ${candidate.candidateName}`,
      input: `${candidate.candidateName} vs ${job.title}`,
      output,
    });
    setContext((current) => current ? { ...current, kpis: aiHiringAssistantService.getKpiSummary(recruiterId) } : current);
  };

  const generateInterviewPack = (): void => {
    const pack = aiHiringAssistantService.generateInterviewQuestions({
      role: interviewRole,
      skills: interviewSkills.split(',').map((item) => item.trim()).filter(Boolean),
      difficulty: interviewDifficulty,
    });

    const output = [
      '# Interview Assistant',
      `Role: **${interviewRole}**`,
      `Difficulty: **${interviewDifficulty.toUpperCase()}**`,
      '',
      '## Technical Questions',
      ...pack.technical.map((item) => `- ${item}`),
      '',
      '## HR Questions',
      ...pack.hr.map((item) => `- ${item}`),
      '',
      '## Behavioral Questions',
      ...pack.behavioral.map((item) => `- ${item}`),
      '',
      '## Scenario Based Questions',
      ...pack.scenario.map((item) => `- ${item}`),
      '',
      '## Coding Questions',
      ...pack.coding.map((item) => `- ${item}`),
      '',
      '## Role Specific Questions',
      ...pack.roleSpecific.map((item) => `- ${item}`),
      '',
      '## Interview Scorecard',
      pack.scorecard,
    ].join('\n');

    setInterviewOutput(output);
    aiHiringAssistantService.logRequest({
      recruiterId,
      type: 'interview_questions',
      title: `Interview Pack: ${interviewRole}`,
      input: `${interviewRole} ${interviewDifficulty}`,
      output,
    });
    setContext((current) => current ? { ...current, kpis: aiHiringAssistantService.getKpiSummary(recruiterId) } : current);
  };

  const generateOffer = (): void => {
    const output = aiHiringAssistantService.generateOfferDraft({
      candidateName: offerCandidateName,
      role: offerRole,
      companyName: offerCompany,
      joiningDate: offerJoiningDate,
      ctc: offerCtc,
    });

    setOfferOutput(output);
    aiHiringAssistantService.logRequest({
      recruiterId,
      type: 'offer',
      title: `Offer Draft: ${offerCandidateName}`,
      input: `${offerCandidateName} ${offerRole}`,
      output,
    });
    setContext((current) => current ? { ...current, kpis: aiHiringAssistantService.getKpiSummary(recruiterId) } : current);
  };

  const generateMessageTemplates = (): void => {
    const base = aiHiringAssistantService.generateMessageTemplates({
      candidateName: msgCandidateName,
      role: msgRole,
      companyName: msgCompany,
      interviewDate: msgInterviewDate,
    });

    const improved = existingMessage.trim()
      ? [
          '',
          '## Improved Existing Message',
          `Original: ${existingMessage.trim()}`,
          '',
          `Improved: Hi ${msgCandidateName}, this is a quick update from ${msgCompany} regarding your application for ${msgRole}. ${existingMessage.trim()} Please reply if you need any clarification.`,
        ].join('\n')
      : '';

    const output = `${base}${improved}`;

    setMsgOutput(output);
    aiHiringAssistantService.logRequest({
      recruiterId,
      type: 'message',
      title: `Message Templates: ${msgRole}`,
      input: `${msgRole}`,
      output,
    });
    setContext((current) => current ? { ...current, kpis: aiHiringAssistantService.getKpiSummary(recruiterId) } : current);
  };

  const generateInsights = (): void => {
    if (!context) return;
    const output = aiHiringAssistantService.generateCopilotResponse('generate hiring insights and bottlenecks', context);
    setInsightsOutput(output);
    aiHiringAssistantService.logRequest({
      recruiterId,
      type: 'insights',
      title: 'Hiring Insights',
      input: 'generate hiring insights',
      output,
    });
    setContext((current) => current ? { ...current, kpis: aiHiringAssistantService.getKpiSummary(recruiterId) } : current);
  };

  const generateSuggestions = (): void => {
    if (!context) return;
    const output = aiHiringAssistantService.generateCopilotResponse('copilot suggestions', context);
    setSuggestionsOutput(output);
  };

  const generateComparison = (): void => {
    const selected = candidateOptions.filter((item) => comparisonCandidateIds.includes(item.candidateId));
    if (selected.length < 2) {
      toast.error('Select at least two candidates');
      return;
    }

    const job = jobs.find((item) => String(item.id) === comparisonJobId) || null;
    const result = aiHiringAssistantService.generateCandidateComparison(selected, job);

    const output = [
      '# Candidate Comparison',
      '',
      result.tableMarkdown,
      '',
      '## Pros',
      ...result.pros.map((item) => `- ${item}`),
      '',
      '## Cons',
      ...result.cons.map((item) => `- ${item}`),
      '',
      `## Best Fit\n${result.bestFit}`,
      '',
      `## Risk Analysis\n${result.riskAnalysis}`,
      '',
      `## Recommended Candidate\n**${result.recommendedCandidate}**`,
    ].join('\n');

    setComparisonOutput(output);
    aiHiringAssistantService.logRequest({
      recruiterId,
      type: 'comparison',
      title: `Comparison: ${selected.length} candidates`,
      input: selected.map((item) => item.candidateName).join(', '),
      output,
    });
    setContext((current) => current ? { ...current, kpis: aiHiringAssistantService.getKpiSummary(recruiterId) } : current);
  };

  const runAiSearch = (): void => {
    const result = aiHiringAssistantService.searchCandidates(searchQuery, candidates);
    const rows = ensureArray(result.rows).map((item) => ({
      Candidate: item.candidateName,
      Job: item.jobTitle,
      Experience: `${item.experienceYears}y`,
      Location: item.location || '-',
      Stage: item.atsStage,
      Match: `${item.matchScore}%`,
    }));

    const header = ['| Candidate | Job | Experience | Location | Stage | Match |', '|---|---|---:|---|---|---:|'];
    const body = rows.slice(0, 15).map((row) => `| ${row.Candidate} | ${row.Job} | ${row.Experience} | ${row.Location} | ${row.Stage} | ${row.Match} |`);

    const output = [
      '# AI Search',
      result.summary,
      '',
      ...header,
      ...body,
    ].join('\n');

    setSearchOutput(output);
    aiHiringAssistantService.logRequest({
      recruiterId,
      type: 'search',
      title: `Search: ${searchQuery}`,
      input: searchQuery,
      output,
    });
    setContext((current) => current ? { ...current, kpis: aiHiringAssistantService.getKpiSummary(recruiterId) } : current);
  };

  const generateMeetingSummary = (): void => {
    const output = aiHiringAssistantService.generateMeetingSummary(meetingNotes);
    setMeetingOutput(output);
    aiHiringAssistantService.logRequest({
      recruiterId,
      type: 'meeting_summary',
      title: 'Interview Meeting Summary',
      input: meetingNotes.slice(0, 120),
      output,
    });
    setContext((current) => current ? { ...current, kpis: aiHiringAssistantService.getKpiSummary(recruiterId) } : current);
  };

  const generateReports = (): void => {
    if (!context) return;
    const reports = aiHiringAssistantService.generateReports(context);
    const output = [
      reports.hiringReport,
      '',
      reports.recruiterReport,
      '',
      reports.jobPerformanceReport,
      '',
      reports.candidateQualityReport,
      '',
      reports.executiveSummary,
    ].join('\n\n');

    setReportsOutput(output);
    aiHiringAssistantService.logRequest({
      recruiterId,
      type: 'report',
      title: 'Recruiter AI Report Pack',
      input: 'generate all reports',
      output,
    });
    setContext((current) => current ? { ...current, kpis: aiHiringAssistantService.getKpiSummary(recruiterId) } : current);
  };

  const historyReuse = (value: string): void => {
    setChatPrompt(value);
    setTab('chat');
  };

  return (
    <MotionBox initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 1.5, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: themeColors.text.primary }}>AI Hiring Assistant</Typography>
          <Typography variant="body2" sx={{ color: themeColors.text.secondary, mt: 0.4 }}>
            Context-aware Recruiter Copilot integrated with jobs, applicants, ATS, interviews, messaging, analytics, and employer branding workflows.
          </Typography>
        </Box>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={() => void refreshContext()} disabled={loadingContext}>
          {loadingContext ? 'Refreshing...' : 'Refresh Context'}
        </Button>
      </Box>

      <Paper sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}`, mb: 2, overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, value: AssistantTab) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 54,
            px: 0.5,
            '& .MuiTabs-scroller': {
              overflowX: 'auto !important',
            },
            '& .MuiTabs-scrollButtons': {
              width: 34,
              borderRadius: 1,
              mx: 0.5,
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderTopLeftRadius: 3,
              borderTopRightRadius: 3,
            },
          }}
        >
          <Tab value="dashboard" label="Dashboard" sx={tabSx} />
          <Tab value="chat" label="AI Chat" sx={tabSx} />
          <Tab value="job-description" label="JD Assistant" sx={tabSx} />
          <Tab value="resume-analyzer" label="Resume Analyzer" sx={tabSx} />
          <Tab value="candidate-match" label="Candidate Match" sx={tabSx} />
          <Tab value="interview-assistant" label="Interview Assistant" sx={tabSx} />
          <Tab value="offer-assistant" label="Offer Assistant" sx={tabSx} />
          <Tab value="message-assistant" label="Message Assistant" sx={tabSx} />
          <Tab value="hiring-insights" label="Hiring Insights" sx={tabSx} />
          <Tab value="copilot-suggestions" label="Copilot Suggestions" sx={tabSx} />
          <Tab value="candidate-comparison" label="Comparison" sx={tabSx} />
          <Tab value="ai-search" label="AI Search" sx={tabSx} />
          <Tab value="meeting-summary" label="Meeting Summary" sx={tabSx} />
          <Tab value="reports" label="Reports" sx={tabSx} />
          <Tab value="saved-prompts" label="Saved Prompts" sx={tabSx} />
          <Tab value="ai-history" label="AI History" sx={tabSx} />
        </Tabs>
      </Paper>

      {!context && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Loading AI context for recruiter data...
        </Alert>
      )}

      {tab === 'dashboard' && context && (
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={3}>{cardMetric('AI Requests Today', context.kpis.aiRequestsToday, '#2563EB')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{cardMetric('Jobs Optimized', context.kpis.jobsOptimized, '#0F766E')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{cardMetric('Candidates Analyzed', context.kpis.candidatesAnalyzed, '#9333EA')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{cardMetric('Interview Questions Generated', context.kpis.interviewQuestionsGenerated, '#B45309')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{cardMetric('Resumes Reviewed', context.kpis.resumesReviewed, '#16A34A')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{cardMetric('Hiring Recommendations', context.kpis.hiringRecommendations, '#BE123C')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{cardMetric('Automation Suggestions', context.kpis.automationSuggestions, '#0369A1')}</Grid>
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Context Awareness Snapshot</Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  <Chip label={`Jobs: ${context.jobs.length}`} size="small" />
                  <Chip label={`Applicants: ${context.candidates.length}`} size="small" />
                  <Chip label={`Interviews: ${context.interviews.length}`} size="small" />
                  <Chip label={`Response Rate: ${context.analytics.responseRate}%`} size="small" />
                  <Chip label={`Rejection Rate: ${context.analytics.rejectionRate}%`} size="small" />
                  <Chip label={`Avg Time-to-Hire: ${context.analytics.avgTimeToHireDays}d`} size="small" />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'chat' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4} lg={3}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}`, height: '72vh', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ pb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search chats"
                  value={conversationSearch}
                  onChange={(event) => setConversationSearch(event.target.value)}
                  InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: themeColors.text.tertiary }} /> }}
                />
                <Button fullWidth sx={{ mt: 1 }} startIcon={<AddIcon />} onClick={newConversation}>
                  New Chat
                </Button>
              </CardContent>
              <Divider />
              <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>Pinned Chats</Typography>
                {conversations.filter((item) => item.pinned).map((item) => (
                  <Paper
                    key={item.id}
                    onClick={() => setSelectedConversationId(item.id)}
                    sx={{ p: 1, mt: 0.8, border: item.id === selectedConversationId ? `1px solid ${themeColors.primary}` : `1px solid ${themeColors.border}`, cursor: 'pointer' }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{format(new Date(item.updatedAt), 'dd MMM, hh:mm a')}</Typography>
                  </Paper>
                ))}

                <Typography variant="caption" color="text.secondary" sx={{ px: 1, mt: 1.2, display: 'block' }}>Recent Conversations</Typography>
                {conversations.filter((item) => !item.pinned).map((item) => (
                  <Paper
                    key={item.id}
                    onClick={() => setSelectedConversationId(item.id)}
                    sx={{ p: 1, mt: 0.8, border: item.id === selectedConversationId ? `1px solid ${themeColors.primary}` : `1px solid ${themeColors.border}`, cursor: 'pointer' }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{format(new Date(item.updatedAt), 'dd MMM, hh:mm a')}</Typography>
                  </Paper>
                ))}

                <Typography variant="caption" color="text.secondary" sx={{ px: 1, mt: 1.2, display: 'block' }}>Saved Prompts</Typography>
                {savedPrompts.slice(0, 6).map((item) => (
                  <Paper
                    key={item.id}
                    onClick={() => setChatPrompt(item.prompt)}
                    sx={{ p: 1, mt: 0.8, border: `1px solid ${themeColors.border}`, cursor: 'pointer' }}
                  >
                    <Stack direction="row" justifyContent="space-between" spacing={0.8}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.title}</Typography>
                      {item.favorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">{item.prompt}</Typography>
                  </Paper>
                ))}
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} md={8} lg={9}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}`, height: '72vh', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ py: 1.2, px: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {selectedConversation?.title || 'AI Chat Assistant'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Markdown, code blocks, tables, lists supported</Typography>
                  </Box>
                  <Stack direction="row" spacing={0.6}>
                    <Tooltip title="Pin"><span><IconButton size="small" onClick={togglePinConversation} disabled={!selectedConversation}><PinIcon fontSize="small" /></IconButton></span></Tooltip>
                    <Tooltip title="Rename"><span><IconButton size="small" onClick={renameConversation} disabled={!selectedConversation}><EditIcon fontSize="small" /></IconButton></span></Tooltip>
                    <Tooltip title="Export"><span><IconButton size="small" onClick={exportConversation} disabled={!selectedConversation}><DownloadIcon fontSize="small" /></IconButton></span></Tooltip>
                    <Tooltip title="Delete"><span><IconButton size="small" onClick={deleteConversation} disabled={!selectedConversation}><DeleteIcon fontSize="small" /></IconButton></span></Tooltip>
                  </Stack>
                </Stack>
              </CardContent>
              <Divider />

              <Box sx={{ flex: 1, overflowY: 'auto', p: 1.2, backgroundColor: '#F8FAFC' }}>
                {selectedConversation?.messages?.length ? selectedConversation.messages.map((message) => (
                  <Box key={message.id} sx={{ mb: 1.2, display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <Paper
                      sx={{
                        p: 1.2,
                        maxWidth: '88%',
                        backgroundColor: message.role === 'user' ? '#DBEAFE' : '#FFFFFF',
                        border: `1px solid ${themeColors.border}`,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.4 }}>
                        {message.role === 'user' ? 'You' : 'Recruiter Copilot'} • {format(new Date(message.createdAt), 'dd MMM, hh:mm a')}
                      </Typography>
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </Paper>
                  </Box>
                )) : (
                  <Alert severity="info">Start a new chat to get context-aware recruiting assistance.</Alert>
                )}
              </Box>

              <Divider />
              <Box sx={{ p: 1.2 }}>
                <Stack direction="row" spacing={1}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    maxRows={4}
                    placeholder="Ask anything: optimize this JD, compare top candidates, generate interview plan..."
                    value={chatPrompt}
                    onChange={(event) => setChatPrompt(event.target.value)}
                  />
                  <Button variant="contained" onClick={sendChat} startIcon={<SendIcon />}>
                    Send
                  </Button>
                </Stack>
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'job-description' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={6}><TextField fullWidth label="Job Title" value={jdTitle} onChange={(event) => setJdTitle(event.target.value)} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Department" value={jdDepartment} onChange={(event) => setJdDepartment(event.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth label="Location" value={jdLocation} onChange={(event) => setJdLocation(event.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth label="Experience" value={jdExperience} onChange={(event) => setJdExperience(event.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth label="Employment Type" value={jdEmploymentType} onChange={(event) => setJdEmploymentType(event.target.value)} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Work Mode" value={jdWorkMode} onChange={(event) => setJdWorkMode(event.target.value)} /></Grid>
          <Grid item xs={12} md={6}><FormControl fullWidth><InputLabel>Tone</InputLabel><Select value={jdTone} label="Tone" onChange={(event) => setJdTone(event.target.value as 'professional' | 'simple' | 'friendly')}><MenuItem value="professional">Professional</MenuItem><MenuItem value="simple">Simple</MenuItem><MenuItem value="friendly">Friendly</MenuItem></Select></FormControl></Grid>
          <Grid item xs={12}><TextField fullWidth label="Skills (comma separated)" value={jdSkills} onChange={(event) => setJdSkills(event.target.value)} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Existing JD (optional)" value={jdExistingText} onChange={(event) => setJdExistingText(event.target.value)} /></Grid>
          <Grid item xs={12}><Button variant="contained" startIcon={<AutoAwesomeIcon />} onClick={generateJd}>Generate Complete JD Pack</Button></Grid>
          <Grid item xs={12}>{markdownPanel('Job Description Assistant Output', jdOutput)}</Grid>
        </Grid>
      )}

      {tab === 'resume-analyzer' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={8}><TextField fullWidth multiline minRows={10} label="Resume Text" value={resumeText} onChange={(event) => setResumeText(event.target.value)} /></Grid>
          <Grid item xs={12} md={4}>
            <Stack spacing={1}>
              <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
                Upload Resume
                <input type="file" hidden onChange={(event) => void onResumeUpload(event)} />
              </Button>
              <FormControl fullWidth><InputLabel>Job Context</InputLabel><Select value={resumeJobId} label="Job Context" onChange={(event) => setResumeJobId(event.target.value)}>{jobs.map((job) => <MenuItem key={String(job.id)} value={String(job.id)}>{job.title}</MenuItem>)}</Select></FormControl>
              <Button variant="contained" onClick={analyzeResume}>Analyze Resume</Button>
            </Stack>
          </Grid>
          <Grid item xs={12}>{markdownPanel('Resume Analysis Output', resumeOutput)}</Grid>
        </Grid>
      )}

      {tab === 'candidate-match' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={5}><FormControl fullWidth><InputLabel>Candidate</InputLabel><Select value={matchCandidateId} label="Candidate" onChange={(event) => setMatchCandidateId(event.target.value)}>{candidateOptions.map((item) => <MenuItem key={item.candidateId} value={item.candidateId}>{item.candidateName} • {item.jobTitle}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={12} md={5}><FormControl fullWidth><InputLabel>Job</InputLabel><Select value={matchJobId} label="Job" onChange={(event) => setMatchJobId(event.target.value)}>{jobs.map((job) => <MenuItem key={String(job.id)} value={String(job.id)}>{job.title}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={analyzeCandidateMatch}>Analyze</Button></Grid>
          <Grid item xs={12}>{markdownPanel('Candidate Match Analysis', matchOutput)}</Grid>
        </Grid>
      )}

      {tab === 'interview-assistant' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}><TextField fullWidth label="Role" value={interviewRole} onChange={(event) => setInterviewRole(event.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth label="Skills" value={interviewSkills} onChange={(event) => setInterviewSkills(event.target.value)} /></Grid>
          <Grid item xs={12} md={4}><FormControl fullWidth><InputLabel>Difficulty</InputLabel><Select value={interviewDifficulty} label="Difficulty" onChange={(event) => setInterviewDifficulty(event.target.value as 'easy' | 'medium' | 'hard')}><MenuItem value="easy">Easy</MenuItem><MenuItem value="medium">Medium</MenuItem><MenuItem value="hard">Hard</MenuItem></Select></FormControl></Grid>
          <Grid item xs={12}><Button variant="contained" onClick={generateInterviewPack}>Generate Interview Pack</Button></Grid>
          <Grid item xs={12}>{markdownPanel('Interview Assistant Output', interviewOutput)}</Grid>
        </Grid>
      )}

      {tab === 'offer-assistant' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}><TextField fullWidth label="Candidate Name" value={offerCandidateName} onChange={(event) => setOfferCandidateName(event.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth label="Role" value={offerRole} onChange={(event) => setOfferRole(event.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth label="Company" value={offerCompany} onChange={(event) => setOfferCompany(event.target.value)} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Joining Date" value={offerJoiningDate} onChange={(event) => setOfferJoiningDate(event.target.value)} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="CTC" value={offerCtc} onChange={(event) => setOfferCtc(event.target.value)} /></Grid>
          <Grid item xs={12}><Button variant="contained" onClick={generateOffer}>Generate Offer Pack</Button></Grid>
          <Grid item xs={12}>{markdownPanel('Offer Assistant Output', offerOutput)}</Grid>
        </Grid>
      )}

      {tab === 'message-assistant' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={3}><TextField fullWidth label="Candidate" value={msgCandidateName} onChange={(event) => setMsgCandidateName(event.target.value)} /></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth label="Role" value={msgRole} onChange={(event) => setMsgRole(event.target.value)} /></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth label="Company" value={msgCompany} onChange={(event) => setMsgCompany(event.target.value)} /></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth label="Interview Date" value={msgInterviewDate} onChange={(event) => setMsgInterviewDate(event.target.value)} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Existing Message (optional for improvement)" value={existingMessage} onChange={(event) => setExistingMessage(event.target.value)} /></Grid>
          <Grid item xs={12}><Button variant="contained" onClick={generateMessageTemplates}>Generate Message Templates</Button></Grid>
          <Grid item xs={12}>{markdownPanel('Message Assistant Output', msgOutput)}</Grid>
        </Grid>
      )}

      {tab === 'hiring-insights' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Button variant="contained" onClick={generateInsights}>Generate Hiring Insights</Button></Grid>
          <Grid item xs={12}>{markdownPanel('Hiring Insights', insightsOutput)}</Grid>
        </Grid>
      )}

      {tab === 'copilot-suggestions' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Button variant="contained" onClick={generateSuggestions}>Generate Recruiter Copilot Suggestions</Button></Grid>
          <Grid item xs={12}>{markdownPanel('Copilot Suggestions', suggestionsOutput)}</Grid>
        </Grid>
      )}

      {tab === 'candidate-comparison' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={5}><FormControl fullWidth><InputLabel>Job</InputLabel><Select value={comparisonJobId} label="Job" onChange={(event) => setComparisonJobId(event.target.value)}>{jobs.map((job) => <MenuItem key={String(job.id)} value={String(job.id)}>{job.title}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={12} md={7}><FormControl fullWidth><InputLabel>Candidates</InputLabel><Select multiple value={comparisonCandidateIds} label="Candidates" onChange={(event) => setComparisonCandidateIds(event.target.value as string[])}>{candidateOptions.map((item) => <MenuItem key={item.candidateId} value={item.candidateId}>{item.candidateName} • {item.jobTitle}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={12}><Button variant="contained" onClick={generateComparison}>Generate Comparison</Button></Grid>
          <Grid item xs={12}>{markdownPanel('Candidate Comparison Output', comparisonOutput)}</Grid>
        </Grid>
      )}

      {tab === 'ai-search' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={10}><TextField fullWidth label="Natural Language Search Query" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /></Grid>
          <Grid item xs={12} md={2}><Button fullWidth variant="contained" startIcon={<SearchIcon />} onClick={runAiSearch}>Search</Button></Grid>
          <Grid item xs={12}>{markdownPanel('AI Search Output', searchOutput)}</Grid>
        </Grid>
      )}

      {tab === 'meeting-summary' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><TextField fullWidth multiline minRows={8} label="Interview Notes" value={meetingNotes} onChange={(event) => setMeetingNotes(event.target.value)} /></Grid>
          <Grid item xs={12}><Button variant="contained" onClick={generateMeetingSummary}>Generate Meeting Summary</Button></Grid>
          <Grid item xs={12}>{markdownPanel('Meeting Summary Output', meetingOutput)}</Grid>
        </Grid>
      )}

      {tab === 'reports' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" startIcon={<HistoryIcon />} onClick={generateReports}>Generate Report Pack</Button>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => printMarkdownAsPdf('AI Hiring Reports', reportsOutput)} disabled={!reportsOutput}>
                Download PDF
              </Button>
            </Stack>
          </Grid>
          <Grid item xs={12}>{markdownPanel('Reports Output', reportsOutput)}</Grid>
        </Grid>
      )}

      {tab === 'saved-prompts' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Save Prompt</Typography>
                <Stack spacing={1}>
                  <TextField label="Prompt Title" value={promptTitle} onChange={(event) => setPromptTitle(event.target.value)} />
                  <TextField multiline minRows={4} label="Prompt" value={promptText} onChange={(event) => setPromptText(event.target.value)} />
                  <Button variant="contained" onClick={savePrompt}>Save</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <TextField fullWidth size="small" placeholder="Search prompts" value={promptSearch} onChange={(event) => setPromptSearch(event.target.value)} sx={{ mb: 1.2 }} />
                <Stack spacing={0.8}>
                  {savedPrompts.length === 0 ? (
                    <Alert severity="info">No saved prompts.</Alert>
                  ) : savedPrompts.map((item) => (
                    <Paper key={item.id} sx={{ p: 1, border: `1px solid ${themeColors.border}` }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.title}</Typography>
                          <Typography variant="caption" color="text.secondary">{item.prompt}</Typography>
                        </Box>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              aiHiringAssistantService.togglePromptFavorite(recruiterId, item.id, !item.favorite);
                              setContext((current) => current ? { ...current } : current);
                            }}
                          >
                            {item.favorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                          </IconButton>
                          <Button size="small" onClick={() => setChatPrompt(item.prompt)}>Use</Button>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              aiHiringAssistantService.deletePrompt(recruiterId, item.id);
                              setContext((current) => current ? { ...current } : current);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'ai-history' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
          <CardContent>
            <TextField fullWidth size="small" placeholder="Search AI history" value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} sx={{ mb: 1.2 }} />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Input</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requestHistory.length === 0 ? (
                  <TableRow><TableCell colSpan={5}><Alert severity="info">No AI history yet.</Alert></TableCell></TableRow>
                ) : requestHistory.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{format(new Date(item.createdAt), 'dd MMM yyyy, hh:mm a')}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell>{item.title}</TableCell>
                    <TableCell sx={{ maxWidth: 380 }}><Typography variant="caption">{item.input}</Typography></TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Button size="small" onClick={() => historyReuse(item.input)}>Reuse</Button>
                        <Button size="small" startIcon={<DownloadIcon />} onClick={() => textBlobDownload(`${item.title.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.md`, item.output, 'text/markdown;charset=utf-8')}>Export</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab !== 'dashboard' && tab !== 'chat' && context && (
        <Paper sx={{ mt: 2, p: 1, border: `1px solid ${themeColors.border}` }}>
          <Typography variant="caption" color="text.secondary">
            Permissions: All conversations, prompts, and AI history are scoped to recruiter ID {recruiterId}. Only your own assistant data is visible.
          </Typography>
        </Paper>
      )}
    </MotionBox>
  );
};
