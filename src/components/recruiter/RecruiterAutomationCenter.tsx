import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { RecruiterPageHero } from './RecruiterPageHero';
import {
  Add as AddIcon,
  AutoAwesome as AutoAwesomeIcon,
  ContentCopy as DuplicateIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  PlayArrow as RunIcon,
  Refresh as RefreshIcon,
  SaveAlt as ExportIcon,
  ToggleOff as DisableIcon,
  ToggleOn as EnableIcon,
  History as HistoryIcon,
  Notifications as NotificationsIcon,
  SmartToy as SmartToyIcon,
  SettingsSuggest as AutomationIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  AUTOMATION_TEMPLATES,
  AutomationAction,
  AutomationActionType,
  AutomationApplyTo,
  AutomationConditions,
  AutomationDefinition,
  AutomationSearchFilters,
  AutomationTrigger,
  AutomationTriggerType,
  automationCenterService,
  AutomationExecution,
  AutomationSummary,
} from '@services/automationCenter';
import { themeColors } from '@styles/recruiterTheme';

interface RecruiterAutomationCenterProps {
  recruiterId: string;
  recruiterName?: string;
  jobs: Array<{ id: string; title: string }>;
}

interface AutomationWizardState {
  name: string;
  description: string;
  applyTo: AutomationApplyTo;
  jobIds: string[];
  triggers: AutomationTrigger[];
  conditions: AutomationConditions;
  actions: AutomationAction[];
}

type AutomationTab = 'overview' | 'automations' | 'templates' | 'history' | 'logs' | 'notifications' | 'integrations';

const MotionBox = motion(Box);

const TRIGGER_OPTIONS: Array<{ value: AutomationTriggerType; label: string }> = [
  { value: 'candidate_applies', label: 'When Candidate Applies' },
  { value: 'match_score_reaches', label: 'When Match Score Reaches %' },
  { value: 'candidate_shortlisted', label: 'When Candidate Is Shortlisted' },
  { value: 'candidate_rejected', label: 'When Candidate Is Rejected' },
  { value: 'candidate_moved_stage', label: 'When Candidate Is Moved To ATS Stage' },
  { value: 'interview_scheduled', label: 'When Interview Is Scheduled' },
  { value: 'interview_completed', label: 'When Interview Is Completed' },
  { value: 'offer_sent', label: 'When Offer Is Sent' },
  { value: 'offer_accepted', label: 'When Offer Is Accepted' },
  { value: 'candidate_no_reply', label: 'When Candidate Does Not Reply' },
  { value: 'recruiter_no_response', label: 'When Recruiter Does Not Respond' },
  { value: 'scheduled_daily', label: 'Scheduled Daily' },
  { value: 'scheduled_weekly', label: 'Scheduled Weekly' },
  { value: 'scheduled_monthly', label: 'Scheduled Monthly' },
];

const ACTION_OPTIONS: Array<{ value: AutomationActionType; label: string }> = [
  { value: 'move_ats_stage', label: 'Move ATS Stage' },
  { value: 'assign_recruiter', label: 'Assign Recruiter' },
  { value: 'add_candidate_tag', label: 'Add Candidate Tag' },
  { value: 'remove_candidate_tag', label: 'Remove Candidate Tag' },
  { value: 'add_to_talent_pool', label: 'Add To Talent Pool' },
  { value: 'remove_from_talent_pool', label: 'Remove From Talent Pool' },
  { value: 'send_message', label: 'Send Message' },
  { value: 'send_email', label: 'Send Email' },
  { value: 'send_interview_invite', label: 'Send Interview Invite' },
  { value: 'send_reminder', label: 'Send Reminder' },
  { value: 'schedule_interview', label: 'Schedule Interview' },
  { value: 'reject_candidate', label: 'Reject Candidate' },
  { value: 'archive_candidate', label: 'Archive Candidate' },
  { value: 'star_candidate', label: 'Star Candidate' },
  { value: 'request_resume_update', label: 'Request Resume Update' },
  { value: 'request_documents', label: 'Request Documents' },
  { value: 'notify_recruiter', label: 'Notify Recruiter' },
  { value: 'notify_hiring_manager', label: 'Notify Hiring Manager' },
  { value: 'generate_ai_candidate_summary', label: 'Generate AI Candidate Summary' },
  { value: 'generate_ai_interview_questions', label: 'Generate AI Interview Questions' },
];

const defaultWizardState = (): AutomationWizardState => ({
  name: '',
  description: '',
  applyTo: 'all_jobs',
  jobIds: [],
  triggers: [],
  conditions: {},
  actions: [],
});

const formatWhen = (value?: string): string => {
  if (!value) return '-';
  return format(new Date(value), 'dd MMM yyyy, hh:mm a');
};

const saveTextFile = (filename: string, content: string, mimeType: string): void => {
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

const statCard = (title: string, value: string | number, color: string) => (
  <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
    <CardContent>
      <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>{title}</Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color, mt: 0.6 }}>{value}</Typography>
    </CardContent>
  </Card>
);

export const RecruiterAutomationCenter: React.FC<RecruiterAutomationCenterProps> = ({
  recruiterId,
  recruiterName = 'Recruiter',
  jobs,
}) => {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const [tab, setTab] = useState<AutomationTab>('overview');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardState, setWizardState] = useState<AutomationWizardState>(defaultWizardState());
  const [editingId, setEditingId] = useState<string | null>(null);

  const [automations, setAutomations] = useState<AutomationDefinition[]>([]);
  const [summary, setSummary] = useState<AutomationSummary>({
    activeAutomations: 0,
    jobsUsingAutomation: 0,
    candidatesProcessed: 0,
    messagesSentAutomatically: 0,
    interviewsScheduledAutomatically: 0,
    offersSentAutomatically: 0,
    successRate: 0,
  });
  const [executions, setExecutions] = useState<AutomationExecution[]>([]);

  const [filters, setFilters] = useState<AutomationSearchFilters>({
    search: '',
    status: 'all',
    jobId: '',
    trigger: '',
    action: '',
    creator: '',
  });

  const [selectedAutomationIds, setSelectedAutomationIds] = useState<Set<string>>(new Set());

  const refresh = (): void => {
    setAutomations(automationCenterService.listAutomations(recruiterId, filters));
    setSummary(automationCenterService.getSummary(recruiterId));
    setExecutions(automationCenterService.getExecutions(recruiterId));
  };

  useEffect(() => {
    refresh();
  }, [recruiterId, filters.search, filters.status, filters.jobId, filters.trigger, filters.action, filters.creator]);

  const notifications = useMemo(
    () => automationCenterService.getNotifications(recruiterId),
    [recruiterId, executions.length, automations.length]
  );

  const aiSuggestions = useMemo(
    () => automationCenterService.getAiSuggestions(recruiterId),
    [recruiterId, automations.length, executions.length]
  );

  const allSelected = automations.length > 0 && automations.every((item) => selectedAutomationIds.has(item.id));

  const failedExecutions = executions.filter((item) => item.status === 'failed').length;
  const totalDuration = executions.reduce((sum, item) => sum + item.durationMs, 0);
  const estimatedTimeSavedMinutes = Math.round((executions.filter((item) => item.status === 'success').length * 2.5) + (totalDuration / 1000 / 60));
  const mostUsedAutomation = useMemo(() => {
    const counts = new Map<string, number>();
    executions.forEach((item) => counts.set(item.automationName, (counts.get(item.automationName) || 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  }, [executions]);

  const openCreateWizard = (): void => {
    setEditingId(null);
    setWizardStep(0);
    setWizardState(defaultWizardState());
    setWizardOpen(true);
  };

  const openEditWizard = (automation: AutomationDefinition): void => {
    setEditingId(automation.id);
    setWizardStep(0);
    setWizardState({
      name: automation.name,
      description: automation.description,
      applyTo: automation.applyTo,
      jobIds: automation.jobIds,
      triggers: automation.triggers,
      conditions: automation.conditions,
      actions: automation.actions,
    });
    setWizardOpen(true);
  };

  const applyWizard = (): void => {
    if (!wizardState.name.trim()) {
      toast.error('Automation name is required');
      return;
    }
    if (wizardState.triggers.length === 0) {
      toast.error('At least one trigger is required');
      return;
    }
    if (wizardState.actions.length === 0) {
      toast.error('At least one action is required');
      return;
    }

    try {
      if (editingId) {
        automationCenterService.updateAutomation(recruiterId, editingId, {
          name: wizardState.name.trim(),
          description: wizardState.description.trim(),
          applyTo: wizardState.applyTo,
          jobIds: wizardState.applyTo === 'all_jobs' ? [] : wizardState.jobIds,
          triggers: wizardState.triggers,
          conditions: wizardState.conditions,
          actions: wizardState.actions,
          createdBy: recruiterName,
        } as Partial<AutomationDefinition>);
        toast.success('Automation updated');
      } else {
        automationCenterService.createAutomation(recruiterId, {
          name: wizardState.name.trim(),
          description: wizardState.description.trim(),
          applyTo: wizardState.applyTo,
          jobIds: wizardState.applyTo === 'all_jobs' ? [] : wizardState.jobIds,
          triggers: wizardState.triggers,
          conditions: wizardState.conditions,
          actions: wizardState.actions,
          status: 'enabled',
          createdBy: recruiterName,
        });
        toast.success('Automation created');
      }
      setWizardOpen(false);
      refresh();
    } catch (error: any) {
      toast.error(String(error?.message || 'Failed to save automation'));
    }
  };

  const toggleSelected = (id: string): void => {
    setSelectedAutomationIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (): void => {
    if (allSelected) {
      setSelectedAutomationIds(new Set());
      return;
    }
    setSelectedAutomationIds(new Set(automations.map((item) => item.id)));
  };

  const onBulkAction = (action: 'enable' | 'disable' | 'delete'): void => {
    const ids = Array.from(selectedAutomationIds);
    if (ids.length === 0) {
      toast.error('Select at least one automation');
      return;
    }

    automationCenterService.bulkAction(recruiterId, ids, action);
    toast.success(`Bulk ${action} applied`);
    setSelectedAutomationIds(new Set());
    refresh();
  };

  const runAutomation = async (automation: AutomationDefinition): Promise<void> => {
    try {
      await automationCenterService.executeAutomation(recruiterId, automation.id, {
        recruiterId,
        trigger: automation.triggers[0]?.type || 'scheduled_daily',
      });
      toast.success('Automation run completed');
      refresh();
    } catch (error: any) {
      toast.error(String(error?.message || 'Failed to run automation'));
    }
  };

  const retryExecution = async (executionId: string): Promise<void> => {
    try {
      await automationCenterService.retryExecution(recruiterId, executionId);
      toast.success('Retry completed');
      refresh();
    } catch (error: any) {
      toast.error(String(error?.message || 'Retry failed'));
    }
  };

  const exportCsv = (): void => {
    const csv = automationCenterService.exportAutomationsCsv(recruiterId);
    saveTextFile(`automation-center-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8;');
  };

  const attachTemplate = (templateName: string): void => {
    try {
      automationCenterService.createFromTemplate(recruiterId, recruiterName, templateName);
      toast.success('Template automation created');
      refresh();
    } catch (error: any) {
      toast.error(String(error?.message || 'Failed to create template'));
    }
  };

  return (
    <MotionBox initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <RecruiterPageHero
        eyebrow="Intelligence"
        title="Automation Center"
        description="Build workflow automations for applications, ATS, interviews, messaging, and offers."
        actions={(
          <>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateWizard}>Create Automation</Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh}>Refresh</Button>
            <Button variant="outlined" startIcon={<ExportIcon />} onClick={exportCsv}>Export</Button>
          </>
        )}
      />

      <Paper sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${themeColors.border}`, mb: 2 }}>
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              fullWidth
              size="small"
              label="Search"
              value={filters.search || ''}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="Automation Name"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={filters.status || 'all'} label="Status" onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value as any }))}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="enabled">Enabled</MenuItem>
                <MenuItem value="disabled">Disabled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl size="small" fullWidth>
              <InputLabel>Job</InputLabel>
              <Select value={filters.jobId || ''} label="Job" onChange={(event) => setFilters((prev) => ({ ...prev, jobId: event.target.value }))}>
                <MenuItem value="">All Jobs</MenuItem>
                {jobs.map((job) => <MenuItem key={job.id} value={job.id}>{job.title}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl size="small" fullWidth>
              <InputLabel>Trigger</InputLabel>
              <Select value={filters.trigger || ''} label="Trigger" onChange={(event) => setFilters((prev) => ({ ...prev, trigger: event.target.value }))}>
                <MenuItem value="">All Triggers</MenuItem>
                {TRIGGER_OPTIONS.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl size="small" fullWidth>
              <InputLabel>Action</InputLabel>
              <Select value={filters.action || ''} label="Action" onChange={(event) => setFilters((prev) => ({ ...prev, action: event.target.value }))}>
                <MenuItem value="">All Actions</MenuItem>
                {ACTION_OPTIONS.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}`, mb: 2 }}>
        <Tabs value={tab} onChange={(_, value: AutomationTab) => setTab(value)} variant={isTablet ? 'scrollable' : 'scrollable'} scrollButtons="auto" allowScrollButtonsMobile sx={{ minHeight: 54, px: 0.5, '& .MuiTabs-scroller': { overflowX: 'auto !important' }, '& .MuiTabs-scrollButtons': { width: 34, borderRadius: 1, mx: 0.5 }, '& .MuiTab-root': { textTransform: 'none', whiteSpace: 'nowrap', minHeight: 54, minWidth: 'max-content', px: 1.8, fontWeight: 700, fontSize: '0.82rem' } }}>
          <Tab value="overview" label="Overview" />
          <Tab value="automations" label="Automation List" />
          <Tab value="templates" label="Templates" />
          <Tab value="history" label="Execution History" />
          <Tab value="logs" label="Automation Logs" />
          <Tab value="notifications" label="Notifications" />
          <Tab value="integrations" label="AI Suggestions" />
        </Tabs>
      </Paper>

      {tab === 'overview' && (
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={3}>{statCard('Active Automations', summary.activeAutomations, '#2563EB')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Jobs Using Automation', summary.jobsUsingAutomation, '#0EA5E9')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Candidates Processed', summary.candidatesProcessed, '#10B981')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Messages Sent Automatically', summary.messagesSentAutomatically, '#7C3AED')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Interviews Scheduled Automatically', summary.interviewsScheduledAutomatically, '#F59E0B')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Offers Sent Automatically', summary.offersSentAutomatically, '#EF4444')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Automation Success Rate', `${summary.successRate}%`, '#14B8A6')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Failed Runs', failedExecutions, '#DC2626')}</Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.25 }}>Analytics Integration</Typography>
                <Stack spacing={0.8}>
                  <Typography variant="body2">Automation Success %: <strong>{summary.successRate}%</strong></Typography>
                  <Typography variant="body2">Time Saved: <strong>{estimatedTimeSavedMinutes} mins</strong></Typography>
                  <Typography variant="body2">Candidates Processed: <strong>{summary.candidatesProcessed}</strong></Typography>
                  <Typography variant="body2">Most Used Automation: <strong>{mostUsedAutomation}</strong></Typography>
                  <Typography variant="body2">Failed Runs: <strong>{failedExecutions}</strong></Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.25 }}>AI Automation Suggestions</Typography>
                <Stack spacing={0.7}>
                  {aiSuggestions.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No suggestions yet. Use automation workflows to get recommendations.</Typography>
                  ) : aiSuggestions.map((item) => (
                    <Alert key={item} severity="info" icon={<SmartToyIcon fontSize="inherit" />}>{item}</Alert>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'automations' && (
        <Box>
          <Paper sx={{ p: 1.2, borderRadius: 2, border: `1px solid ${themeColors.border}`, mb: 1.5 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button size="small" variant="outlined" startIcon={<EnableIcon />} onClick={() => onBulkAction('enable')}>Enable</Button>
              <Button size="small" variant="outlined" startIcon={<DisableIcon />} onClick={() => onBulkAction('disable')}>Disable</Button>
              <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => onBulkAction('delete')}>Delete</Button>
            </Stack>
          </Paper>

          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox checked={allSelected} indeterminate={!allSelected && selectedAutomationIds.size > 0} onChange={toggleAll} />
                  </TableCell>
                  <TableCell>Automation Name</TableCell>
                  <TableCell>Trigger</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Applied Jobs</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>Last Run</TableCell>
                  <TableCell>Next Run</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {automations.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox checked={selectedAutomationIds.has(item.id)} onChange={() => toggleSelected(item.id)} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.description || '-'}</Typography>
                    </TableCell>
                    <TableCell>{item.triggers[0]?.type.replace(/_/g, ' ') || '-'}</TableCell>
                    <TableCell>{item.actions[0]?.type.replace(/_/g, ' ') || '-'}</TableCell>
                    <TableCell>{item.applyTo === 'all_jobs' ? 'All Jobs' : item.jobIds.length}</TableCell>
                    <TableCell>
                      <Chip label={item.status} color={item.status === 'enabled' ? 'success' : 'default'} size="small" />
                    </TableCell>
                    <TableCell>{item.createdBy}</TableCell>
                    <TableCell>{formatWhen(item.lastRunAt)}</TableCell>
                    <TableCell>{formatWhen(item.nextRunAt)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Enable">
                        <IconButton size="small" onClick={() => { automationCenterService.toggleAutomation(recruiterId, item.id, true); refresh(); }}>
                          <EnableIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Disable">
                        <IconButton size="small" onClick={() => { automationCenterService.toggleAutomation(recruiterId, item.id, false); refresh(); }}>
                          <DisableIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Run">
                        <IconButton size="small" onClick={() => void runAutomation(item)}>
                          <RunIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEditWizard(item)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Duplicate">
                        <IconButton size="small" onClick={() => { automationCenterService.duplicateAutomation(recruiterId, item.id); refresh(); }}>
                          <DuplicateIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => { automationCenterService.deleteAutomation(recruiterId, item.id); refresh(); }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tab === 'templates' && (
        <Grid container spacing={1.5}>
          {AUTOMATION_TEMPLATES.map((template) => (
            <Grid item xs={12} md={6} lg={4} key={template.name}>
              <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{template.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.7 }}>{template.description}</Typography>
                  <Stack direction="row" spacing={0.8} flexWrap="wrap" sx={{ mt: 1.2 }}>
                    {template.triggers.map((trigger) => <Chip key={trigger.type} label={trigger.type.replace(/_/g, ' ')} size="small" />)}
                  </Stack>
                  <Button sx={{ mt: 1.4 }} variant="outlined" startIcon={<AutoAwesomeIcon />} onClick={() => attachTemplate(template.name)}>
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 'history' && (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Run Time</TableCell>
                <TableCell>Automation</TableCell>
                <TableCell>Trigger</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Error Message</TableCell>
                <TableCell>Retry</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {executions.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>{formatWhen(item.runTime)}</TableCell>
                  <TableCell>{item.automationName}</TableCell>
                  <TableCell>{item.trigger.replace(/_/g, ' ')}</TableCell>
                  <TableCell>{item.actionSummary}</TableCell>
                  <TableCell>
                    <Chip size="small" label={item.status} color={item.status === 'success' ? 'success' : item.status === 'failed' ? 'error' : 'default'} />
                  </TableCell>
                  <TableCell>{item.durationMs} ms</TableCell>
                  <TableCell>{item.errorMessage || '-'}</TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined" onClick={() => void retryExecution(item.id)}>Retry</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 'logs' && (
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={4}>{statCard('Success', executions.filter((item) => item.status === 'success').length, '#16A34A')}</Grid>
          <Grid item xs={12} sm={4}>{statCard('Failed', executions.filter((item) => item.status === 'failed').length, '#DC2626')}</Grid>
          <Grid item xs={12} sm={4}>{statCard('Skipped', executions.filter((item) => item.status === 'skipped').length, '#6B7280')}</Grid>
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.2 }}>Execution Logs</Typography>
                <Stack spacing={0.7}>
                  {executions.slice(0, 20).map((item) => (
                    <Alert
                      key={item.id}
                      severity={item.status === 'failed' ? 'error' : item.status === 'success' ? 'success' : 'info'}
                    >
                      {formatWhen(item.runTime)} - {item.automationName} - {item.status.toUpperCase()} {item.errorMessage ? `(${item.errorMessage})` : ''}
                    </Alert>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'notifications' && (
        <Stack spacing={1}>
          {notifications.length === 0 ? (
            <Alert severity="info">No automation notifications yet.</Alert>
          ) : notifications.map((item) => (
            <Alert
              key={item.id}
              severity={item.type === 'automation_failed' ? 'error' : 'success'}
              icon={<NotificationsIcon fontSize="inherit" />}
              action={
                item.read ? null : (
                  <Button
                    size="small"
                    onClick={() => {
                      automationCenterService.markNotificationRead(recruiterId, item.id);
                      refresh();
                    }}
                  >
                    Mark read
                  </Button>
                )
              }
            >
              {item.message}
            </Alert>
          ))}
        </Stack>
      )}

      {tab === 'integrations' && (
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.2 }}>
                  AI Suggestions
                </Typography>
                <Stack spacing={0.8}>
                  {aiSuggestions.map((item) => (
                    <Alert key={item} severity="info" icon={<SmartToyIcon fontSize="inherit" />}>
                      {item}
                    </Alert>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.2 }}>Job Integration</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>
                  Each job can attach one or more automations. Manage job-level mappings directly in Jobs tab.
                </Typography>
                <Stack spacing={0.8}>
                  {jobs.slice(0, 8).map((job) => {
                    const attached = automationCenterService.getJobAutomations(recruiterId, job.id).length;
                    return (
                      <Paper key={job.id} sx={{ p: 1, border: `1px solid ${themeColors.border}` }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{job.title}</Typography>
                          <Chip size="small" icon={<LinkIcon />} label={`${attached} automations`} />
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Dialog open={wizardOpen} onClose={() => setWizardOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingId ? 'Edit Automation' : 'Create Automation'} Wizard</DialogTitle>
        <DialogContent dividers>
          <Stepper activeStep={wizardStep} sx={{ mb: 2.5 }} alternativeLabel>
            <Step><StepLabel>Basic</StepLabel></Step>
            <Step><StepLabel>Trigger</StepLabel></Step>
            <Step><StepLabel>Conditions</StepLabel></Step>
            <Step><StepLabel>Actions</StepLabel></Step>
          </Stepper>

          {wizardStep === 0 && (
            <Grid container spacing={1.2}>
              <Grid item xs={12}>
                <TextField fullWidth label="Automation Name" value={wizardState.name} onChange={(event) => setWizardState((prev) => ({ ...prev, name: event.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline minRows={2} label="Description" value={wizardState.description} onChange={(event) => setWizardState((prev) => ({ ...prev, description: event.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Apply To</InputLabel>
                  <Select
                    label="Apply To"
                    value={wizardState.applyTo}
                    onChange={(event) => setWizardState((prev) => ({ ...prev, applyTo: event.target.value as AutomationApplyTo, jobIds: [] }))}
                  >
                    <MenuItem value="single_job">Single Job</MenuItem>
                    <MenuItem value="multiple_jobs">Multiple Jobs</MenuItem>
                    <MenuItem value="all_jobs">All Jobs</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {wizardState.applyTo !== 'all_jobs' && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Jobs</InputLabel>
                    <Select
                      multiple={wizardState.applyTo === 'multiple_jobs'}
                      label="Jobs"
                      value={wizardState.jobIds}
                      onChange={(event) => {
                        const raw = event.target.value;
                        const values = Array.isArray(raw) ? raw : [String(raw)];
                        setWizardState((prev) => ({ ...prev, jobIds: values }));
                      }}
                    >
                      {jobs.map((job) => <MenuItem key={job.id} value={job.id}>{job.title}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          )}

          {wizardStep === 1 && (
            <Grid container spacing={1.2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Choose Trigger</InputLabel>
                  <Select
                    multiple
                    label="Choose Trigger"
                    value={wizardState.triggers.map((item) => item.type)}
                    onChange={(event) => {
                      const selected = event.target.value as string[];
                      const next = selected.map((value) => ({ type: value as AutomationTriggerType }));
                      setWizardState((prev) => ({ ...prev, triggers: next }));
                    }}
                  >
                    {TRIGGER_OPTIONS.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  type="number"
                  label="Match Score Trigger %"
                  fullWidth
                  value={wizardState.conditions.matchScoreMin ?? ''}
                  onChange={(event) => setWizardState((prev) => ({ ...prev, conditions: { ...prev.conditions, matchScoreMin: event.target.value ? Number(event.target.value) : undefined } }))}
                />
              </Grid>
            </Grid>
          )}

          {wizardStep === 2 && (
            <Grid container spacing={1.2}>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Experience" value={wizardState.conditions.experience || ''} onChange={(event) => setWizardState((prev) => ({ ...prev, conditions: { ...prev.conditions, experience: event.target.value } }))} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Skills (comma separated)" value={(wizardState.conditions.skills || []).join(', ')} onChange={(event) => setWizardState((prev) => ({ ...prev, conditions: { ...prev.conditions, skills: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) } }))} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Location" value={wizardState.conditions.location || ''} onChange={(event) => setWizardState((prev) => ({ ...prev, conditions: { ...prev.conditions, location: event.target.value } }))} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Education" value={wizardState.conditions.education || ''} onChange={(event) => setWizardState((prev) => ({ ...prev, conditions: { ...prev.conditions, education: event.target.value } }))} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Work Mode" value={wizardState.conditions.workMode || ''} onChange={(event) => setWizardState((prev) => ({ ...prev, conditions: { ...prev.conditions, workMode: event.target.value } }))} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Employment Type" value={wizardState.conditions.employmentType || ''} onChange={(event) => setWizardState((prev) => ({ ...prev, conditions: { ...prev.conditions, employmentType: event.target.value } }))} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth type="number" label="Salary Min" value={wizardState.conditions.salaryMin ?? ''} onChange={(event) => setWizardState((prev) => ({ ...prev, conditions: { ...prev.conditions, salaryMin: event.target.value ? Number(event.target.value) : undefined } }))} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth type="number" label="Salary Max" value={wizardState.conditions.salaryMax ?? ''} onChange={(event) => setWizardState((prev) => ({ ...prev, conditions: { ...prev.conditions, salaryMax: event.target.value ? Number(event.target.value) : undefined } }))} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Notice Period" value={wizardState.conditions.noticePeriod || ''} onChange={(event) => setWizardState((prev) => ({ ...prev, conditions: { ...prev.conditions, noticePeriod: event.target.value } }))} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth type="number" label="Application Age (days)" value={wizardState.conditions.applicationAgeDays ?? ''} onChange={(event) => setWizardState((prev) => ({ ...prev, conditions: { ...prev.conditions, applicationAgeDays: event.target.value ? Number(event.target.value) : undefined } }))} /></Grid>
            </Grid>
          )}

          {wizardStep === 3 && (
            <Grid container spacing={1.2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Actions</InputLabel>
                  <Select
                    multiple
                    label="Actions"
                    value={wizardState.actions.map((item) => item.type)}
                    onChange={(event) => {
                      const selected = event.target.value as string[];
                      setWizardState((prev) => ({
                        ...prev,
                        actions: selected.map((value) => {
                          const existing = prev.actions.find((item) => item.type === value);
                          return existing || { type: value as AutomationActionType };
                        }),
                      }));
                    }}
                  >
                    {ACTION_OPTIONS.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Action Payload (for message/reminder/stage etc.)"
                  value={wizardState.actions[0]?.value || ''}
                  onChange={(event) => setWizardState((prev) => ({
                    ...prev,
                    actions: prev.actions.map((item, index) => index === 0 ? { ...item, value: event.target.value } : item),
                  }))}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWizardOpen(false)}>Cancel</Button>
          <Button onClick={() => setWizardStep((prev) => Math.max(0, prev - 1))} disabled={wizardStep === 0}>Back</Button>
          {wizardStep < 3 ? (
            <Button variant="contained" onClick={() => setWizardStep((prev) => Math.min(3, prev + 1))}>Next</Button>
          ) : (
            <Button variant="contained" onClick={applyWizard}>Save Automation</Button>
          )}
        </DialogActions>
      </Dialog>
    </MotionBox>
  );
};

interface JobAutomationPanelProps {
  recruiterId: string;
  jobId: string;
  jobTitle: string;
}

export const JobAutomationPanel: React.FC<JobAutomationPanelProps> = ({ recruiterId, jobId, jobTitle }) => {
  const [selectedAutomationId, setSelectedAutomationId] = useState('');
  const [attached, setAttached] = useState<AutomationDefinition[]>([]);

  const allAutomations = useMemo(
    () => automationCenterService.listAutomations(recruiterId),
    [recruiterId, attached.length]
  );

  const refresh = (): void => {
    setAttached(automationCenterService.getJobAutomations(recruiterId, jobId));
  };

  useEffect(() => {
    refresh();
  }, [recruiterId, jobId]);

  return (
    <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Automation - {jobTitle}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
          Attach one or more automations directly to this job.
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mb: 1.2 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Automation</InputLabel>
            <Select value={selectedAutomationId} label="Automation" onChange={(event) => setSelectedAutomationId(event.target.value)}>
              <MenuItem value="">Select automation</MenuItem>
              {allAutomations.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<LinkIcon />}
            onClick={() => {
              if (!selectedAutomationId) return;
              automationCenterService.attachAutomationToJob(recruiterId, selectedAutomationId, jobId);
              toast.success('Automation attached to job');
              setSelectedAutomationId('');
              refresh();
            }}
          >
            Attach
          </Button>
        </Stack>

        <Stack spacing={0.8}>
          {attached.length === 0 ? (
            <Alert severity="info">No automations attached to this job yet.</Alert>
          ) : attached.map((item) => (
            <Paper key={item.id} sx={{ p: 1, border: `1px solid ${themeColors.border}` }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.triggers.map((trigger) => trigger.type.replace(/_/g, ' ')).join(', ')}</Typography>
                </Box>
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  onClick={() => {
                    automationCenterService.detachAutomationFromJob(recruiterId, item.id, jobId);
                    toast.success('Automation detached');
                    refresh();
                  }}
                >
                  Detach
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};
