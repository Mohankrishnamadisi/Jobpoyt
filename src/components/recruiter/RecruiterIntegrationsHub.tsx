import React, { useMemo, useState } from 'react';
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
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
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
  Autorenew as SyncIcon,
  CheckCircle as CheckCircleIcon,
  ContentPasteSearch as ImportIcon,
  Error as ErrorIcon,
  Hub as HubIcon,
  Key as KeyIcon,
  Link as LinkIcon,
  NotificationsActive as NotifyIcon,
  Science as TestIcon,
  Webhook as WebhookIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { themeColors } from '@styles/recruiterTheme';
import {
  ExportJob,
  ImportPreviewRow,
  IntegrationConnection,
  IntegrationDefinition,
  IntegrationStatus,
  integrationsHubService,
  StageMapping,
  SyncObjectType,
  SyncStatus,
  WebhookEndpoint,
} from '@services/integrationsHub';
import { teamManagementService } from '@services/teamManagement';

interface RecruiterIntegrationsHubProps {
  ownerId: string;
  currentUserId: string;
}

type IntegrationsTab =
  | 'overview'
  | 'marketplace'
  | 'connections'
  | 'job-sync'
  | 'candidate-sync'
  | 'stage-mapping'
  | 'interview-sync'
  | 'messaging-sync'
  | 'calendar'
  | 'video'
  | 'slack'
  | 'email'
  | 'webhooks'
  | 'api-keys'
  | 'import-center'
  | 'export-center'
  | 'sync-logs'
  | 'conflicts'
  | 'automation'
  | 'analytics'
  | 'ai-suggestions';

const MotionBox = motion(Box);

const statCard = (title: string, value: string | number, color = '#2563EB') => (
  <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
    <CardContent>
      <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>{title}</Typography>
      <Typography variant="h5" sx={{ mt: 0.6, fontWeight: 800, color }}>{value}</Typography>
    </CardContent>
  </Card>
);

const IntegrationStatusChip: React.FC<{ status: IntegrationStatus }> = ({ status }) => {
  const map: Record<IntegrationStatus, { label: string; color: 'success' | 'error' | 'warning' | 'default' }> = {
    connected: { label: 'Connected', color: 'success' },
    disconnected: { label: 'Disconnected', color: 'default' },
    error: { label: 'Error', color: 'error' },
    pending: { label: 'Pending', color: 'warning' },
  };
  const item = map[status];
  return <Chip size="small" label={item.label} color={item.color} />;
};

const SyncStatusChip: React.FC<{ status: SyncStatus }> = ({ status }) => {
  const map: Record<SyncStatus, { label: string; color: 'success' | 'error' | 'warning' | 'default' }> = {
    success: { label: 'Success', color: 'success' },
    failed: { label: 'Failed', color: 'error' },
    running: { label: 'Running', color: 'warning' },
    pending: { label: 'Pending', color: 'default' },
  };
  const item = map[status];
  return <Chip size="small" label={item.label} color={item.color} />;
};

const parseDate = (value?: string): string => {
  if (!value) return '-';
  try {
    return format(new Date(value), 'dd MMM yyyy, hh:mm a');
  } catch {
    return '-';
  }
};

const downloadText = (fileName: string, content: string, type = 'text/plain;charset=utf-8'): void => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const wizardSteps = ['Select Integration', 'Enter Credentials', 'Test Connection', 'Save'];

export const RecruiterIntegrationsHub: React.FC<RecruiterIntegrationsHubProps> = ({ ownerId, currentUserId }) => {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const access = useMemo(() => teamManagementService.getAccessContext(ownerId, currentUserId), [ownerId, currentUserId]);
  const canManageIntegrations = access.currentRole === 'owner' || access.currentRole === 'company_admin';

  const [tab, setTab] = useState<IntegrationsTab>('overview');

  const [marketplaceSearch, setMarketplaceSearch] = useState('');
  const [selectedIntegrationId, setSelectedIntegrationId] = useState('greenhouse');

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardIntegrationId, setWizardIntegrationId] = useState('greenhouse');
  const [credentials, setCredentials] = useState<Record<string, string>>({
    apiKey: '',
    oauth: '',
    webhookUrl: '',
    clientId: '',
    clientSecret: '',
    accessToken: '',
    refreshToken: '',
  });
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [syncIntegrationId, setSyncIntegrationId] = useState('greenhouse');
  const [syncObjectType, setSyncObjectType] = useState<SyncObjectType>('jobs');

  const [stageMapIntegrationId, setStageMapIntegrationId] = useState('greenhouse');
  const [externalStage, setExternalStage] = useState('Applied');
  const [internalStage, setInternalStage] = useState('Screening');

  const [webhookDirection, setWebhookDirection] = useState<'incoming' | 'outgoing'>('incoming');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookEvents, setWebhookEvents] = useState('candidate.created,interview.scheduled');

  const [apiKeyName, setApiKeyName] = useState('External ATS Key');
  const [apiKeyType, setApiKeyType] = useState<'read_only' | 'read_write'>('read_only');
  const [apiKeyPermissions, setApiKeyPermissions] = useState('jobs.read,candidates.read');
  const [apiKeyExpiry, setApiKeyExpiry] = useState('');

  const [importObjectType, setImportObjectType] = useState<ImportPreviewRow['objectType']>('jobs');
  const [importCsvText, setImportCsvText] = useState('id,title,location\n1,Frontend Developer,Hyderabad\n2,Frontend Developer,Hyderabad');
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);

  const [exportFormat, setExportFormat] = useState<ExportJob['format']>('csv');
  const [exportObjectType, setExportObjectType] = useState<ExportJob['objectType']>('jobs');
  const [scheduledExport, setScheduledExport] = useState(false);
  const [scheduledCron, setScheduledCron] = useState('0 9 * * 1');

  const [syncLogStatusFilter, setSyncLogStatusFilter] = useState<SyncStatus | 'all'>('all');
  const [syncLogObjectFilter, setSyncLogObjectFilter] = useState<SyncObjectType | 'all'>('all');

  const [conflictStrategy, setConflictStrategy] = useState<'merge' | 'overwrite' | 'skip_duplicate'>('merge');
  const [conflictSource, setConflictSource] = useState('{"name":"John","email":"john@example.com","phone":"9999999999"}');
  const [conflictExisting, setConflictExisting] = useState('{"name":"John K","email":"john@example.com","phone":"8888888888"}');
  const [conflictOutput, setConflictOutput] = useState('');

  const [autoTriggerJobs, setAutoTriggerJobs] = useState(true);
  const [autoTriggerCandidates, setAutoTriggerCandidates] = useState(true);
  const [autoTriggerInterviews, setAutoTriggerInterviews] = useState(true);
  const [autoTriggerOffers, setAutoTriggerOffers] = useState(true);

  const definitions = integrationsHubService.listSupportedIntegrations();
  const connections = integrationsHubService.listConnections(ownerId);
  const summary = integrationsHubService.getSummary(ownerId);
  const analytics = integrationsHubService.getAnalytics(ownerId);
  const stageMappings = integrationsHubService.listStageMappings(ownerId, stageMapIntegrationId);
  const syncLogs = integrationsHubService.listSyncLogs(ownerId, { status: syncLogStatusFilter, objectType: syncLogObjectFilter });
  const webhooks = integrationsHubService.listWebhooks(ownerId);
  const webhookLogs = integrationsHubService.listWebhookLogs(ownerId);
  const apiKeys = integrationsHubService.listApiKeys(ownerId);
  const exportJobs = integrationsHubService.listExportJobs(ownerId);
  const aiSuggestions = integrationsHubService.getAiSuggestions(ownerId);

  const integrationById = useMemo(() => Object.fromEntries(definitions.map((item) => [item.id, item])), [definitions]);

  const marketplaceItems = definitions.filter((item) => {
    if (!marketplaceSearch.trim()) return true;
    const search = marketplaceSearch.toLowerCase();
    return `${item.name} ${item.description} ${item.features.join(' ')}`.toLowerCase().includes(search);
  });

  const selectedIntegration = integrationById[selectedIntegrationId] || definitions[0];

  const connectStatus = (integrationId: string): IntegrationStatus => {
    const conn = connections.find((item) => item.integrationId === integrationId);
    return conn?.status || 'disconnected';
  };

  const openWizard = (integrationId: string): void => {
    if (!canManageIntegrations) {
      toast.error('Only Company Owner and Company Admin can manage integrations');
      return;
    }
    setWizardIntegrationId(integrationId);
    setWizardStep(0);
    setCredentials({ apiKey: '', oauth: '', webhookUrl: '', clientId: '', clientSecret: '', accessToken: '', refreshToken: '' });
    setTestResult(null);
    setWizardOpen(true);
  };

  const runTestConnection = (): void => {
    const result = integrationsHubService.testConnection(wizardIntegrationId, credentials);
    setTestResult(result);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  };

  const completeConnection = (): void => {
    if (!canManageIntegrations) {
      toast.error('Only Company Owner and Company Admin can manage integrations');
      return;
    }
    integrationsHubService.connectIntegration(ownerId, wizardIntegrationId, credentials);
    setWizardOpen(false);
    toast.success('Integration connected');
  };

  const disconnect = (integrationId: string): void => {
    if (!canManageIntegrations) {
      toast.error('Only Company Owner and Company Admin can manage integrations');
      return;
    }
    integrationsHubService.disconnectIntegration(ownerId, integrationId);
    toast.success('Integration disconnected');
  };

  const triggerSync = (objectType: SyncObjectType, direction: 'import' | 'export' | 'both', simulateFailure = false): void => {
    if (!canManageIntegrations) {
      toast.error('Only Company Owner and Company Admin can run sync actions');
      return;
    }
    integrationsHubService.triggerSync(ownerId, syncIntegrationId, objectType, direction, { simulateFailure });
    toast.success(`${objectType} ${direction} sync triggered`);
  };

  const saveStageMap = (): void => {
    if (!canManageIntegrations) {
      toast.error('Only Company Owner and Company Admin can update stage mappings');
      return;
    }
    integrationsHubService.upsertStageMapping(ownerId, stageMapIntegrationId, externalStage, internalStage);
    toast.success('Stage mapping saved');
  };

  const createWebhook = (): void => {
    if (!canManageIntegrations) {
      toast.error('Only Company Owner and Company Admin can manage webhooks');
      return;
    }
    integrationsHubService.createWebhook(ownerId, {
      direction: webhookDirection,
      url: webhookUrl,
      secret: webhookSecret,
      events: webhookEvents.split(',').map((item) => item.trim()).filter(Boolean),
    });
    toast.success('Webhook created');
    setWebhookUrl('');
    setWebhookSecret('');
  };

  const createApiKey = (): void => {
    if (!canManageIntegrations) {
      toast.error('Only Company Owner and Company Admin can manage API keys');
      return;
    }
    const key = integrationsHubService.createApiKey(ownerId, {
      name: apiKeyName,
      type: apiKeyType,
      permissions: apiKeyPermissions.split(',').map((item) => item.trim()).filter(Boolean),
      expiresAt: apiKeyExpiry || undefined,
    });
    toast.success(`API key created: ${key.keyMasked}`);
  };

  const previewImport = (): void => {
    if (!canManageIntegrations) {
      toast.error('Only Company Owner and Company Admin can run imports');
      return;
    }
    const preview = integrationsHubService.createImportPreview(ownerId, importObjectType, importCsvText);
    setImportPreview(preview);
    toast.success(`Generated preview for ${preview.length} rows`);
  };

  const createExport = (): void => {
    if (!canManageIntegrations) {
      toast.error('Only Company Owner and Company Admin can run exports');
      return;
    }
    integrationsHubService.createExportJob(ownerId, {
      format: exportFormat,
      objectType: exportObjectType,
      scheduled: scheduledExport,
      scheduledCron: scheduledExport ? scheduledCron : undefined,
    });
    toast.success('Export job created');
  };

  const retrySyncLog = (logId: string): void => {
    if (!canManageIntegrations) {
      toast.error('Only Company Owner and Company Admin can retry sync');
      return;
    }
    integrationsHubService.retrySync(ownerId, logId);
    toast.success('Sync retry triggered');
  };

  const runConflictResolution = (): void => {
    try {
      const source = JSON.parse(conflictSource) as Record<string, string>;
      const existing = JSON.parse(conflictExisting) as Record<string, string>;
      const resolved = integrationsHubService.resolveConflict(conflictStrategy, source, existing);
      setConflictOutput(JSON.stringify(resolved, null, 2));
    } catch {
      toast.error('Invalid JSON input in conflict resolver');
    }
  };

  const exportSyncLogs = (): void => {
    const headers = ['Time', 'Platform', 'Object', 'Status', 'Duration(ms)', 'Imported', 'Exported', 'Errors'];
    const rows = syncLogs.map((log) => [
      parseDate(log.startedAt),
      integrationById[log.integrationId]?.name || log.integrationId,
      log.objectType,
      log.status,
      log.durationMs,
      log.recordsImported,
      log.recordsExported,
      log.errors.join('; '),
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => JSON.stringify(String(cell))).join(','))].join('\n');
    downloadText('sync_logs.csv', csv, 'text/csv;charset=utf-8');
  };

  return (
    <MotionBox initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <RecruiterPageHero
        eyebrow="Company"
        title="Integrations Hub"
        description="Connect ATS, calendar, video, chat, email, webhooks, REST APIs, and import/export pipelines with sync visibility and AI-guided fixes."
        actions={<Chip color={canManageIntegrations ? 'success' : 'warning'} label={canManageIntegrations ? 'Manage Access: Owner/Admin' : 'View Only: Recruiter'} />}
      />

      {!canManageIntegrations && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You can view integration status. Only Company Owner and Company Admin can connect, configure, disconnect, sync, or manage credentials.
        </Alert>
      )}

      <Paper sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}`, mb: 2 }}>
        <Tabs value={tab} onChange={(_, value: IntegrationsTab) => setTab(value)} variant={isTablet ? 'scrollable' : 'scrollable'} scrollButtons="auto" allowScrollButtonsMobile sx={{ minHeight: 54, px: 0.5, '& .MuiTabs-scroller': { overflowX: 'auto !important' }, '& .MuiTabs-scrollButtons': { width: 34, borderRadius: 1, mx: 0.5 }, '& .MuiTab-root': { textTransform: 'none', whiteSpace: 'nowrap', minHeight: 54, minWidth: 'max-content', px: 1.8, fontWeight: 700, fontSize: '0.82rem' } }}>
          <Tab value="overview" label="Overview" />
          <Tab value="marketplace" label="Marketplace" />
          <Tab value="connections" label="Connection Wizard" />
          <Tab value="job-sync" label="Job Sync" />
          <Tab value="candidate-sync" label="Candidate Sync" />
          <Tab value="stage-mapping" label="Stage Mapping" />
          <Tab value="interview-sync" label="Interview Sync" />
          <Tab value="messaging-sync" label="Messaging Sync" />
          <Tab value="calendar" label="Calendar" />
          <Tab value="video" label="Video" />
          <Tab value="slack" label="Slack" />
          <Tab value="email" label="Email" />
          <Tab value="webhooks" label="Webhooks" />
          <Tab value="api-keys" label="REST API" />
          <Tab value="import-center" label="Import Center" />
          <Tab value="export-center" label="Export Center" />
          <Tab value="sync-logs" label="Sync Logs" />
          <Tab value="conflicts" label="Conflicts" />
          <Tab value="automation" label="Automation" />
          <Tab value="analytics" label="Analytics" />
          <Tab value="ai-suggestions" label="AI Suggestions" />
        </Tabs>
      </Paper>

      {tab === 'overview' && (
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={3}>{statCard('Connected Integrations', summary.connectedIntegrations, '#2563EB')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Available Integrations', summary.availableIntegrations, '#0F766E')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Sync Status', summary.syncStatus, '#7C3AED')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Last Sync Time', summary.lastSyncTime, '#C2410C')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Failed Syncs', summary.failedSyncs, '#DC2626')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Pending Imports', summary.pendingImports, '#D97706')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('API Usage', summary.apiUsage, '#0369A1')}</Grid>

          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Connected Integrations Snapshot</Typography>
                <Stack direction="row" spacing={0.7} sx={{ flexWrap: 'wrap' }}>
                  {connections.length === 0 ? (
                    <Alert severity="info">No integrations connected yet.</Alert>
                  ) : connections.map((connection) => (
                    <Chip key={connection.id} icon={<HubIcon />} label={`${integrationById[connection.integrationId]?.name || connection.integrationId} â€¢ ${connection.status}`} />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'marketplace' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><TextField fullWidth size="small" label="Search integrations" value={marketplaceSearch} onChange={(event) => setMarketplaceSearch(event.target.value)} /></Grid>
          {marketplaceItems.map((item) => {
            const status = connectStatus(item.id);
            const connection = connections.find((conn) => conn.integrationId === item.id);
            return (
              <Grid item xs={12} md={6} lg={4} key={item.id}>
                <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}`, height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{item.logo} {item.name}</Typography>
                      <IntegrationStatusChip status={status} />
                    </Stack>
                    <Typography variant="body2" sx={{ color: themeColors.text.secondary, mb: 1 }}>{item.description}</Typography>
                    <Typography variant="caption" sx={{ display: 'block' }}>Version: {item.version}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>Sync Frequency: {connection?.syncFrequencyMinutes || item.defaultFrequencyMinutes} mins</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', mb: 1 }}>
                      {item.features.map((feature) => <Chip key={feature} size="small" label={feature} />)}
                    </Stack>
                    <Stack direction="row" spacing={0.7}>
                      <Button size="small" variant="contained" disabled={!canManageIntegrations} onClick={() => openWizard(item.id)}>Connect</Button>
                      <Button size="small" variant="outlined" disabled={!canManageIntegrations} onClick={() => disconnect(item.id)}>Disconnect</Button>
                      <Button size="small" variant="outlined" disabled={!canManageIntegrations} onClick={() => {
                        const next = window.prompt('Sync frequency (minutes)', String(connection?.syncFrequencyMinutes || item.defaultFrequencyMinutes));
                        if (!next) return;
                        integrationsHubService.configureIntegration(ownerId, item.id, { syncFrequencyMinutes: Number(next) });
                        toast.success('Configuration updated');
                      }}>Configure</Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {tab === 'connections' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Connection Wizard</Typography>
            <Stepper activeStep={wizardOpen ? wizardStep : 0} alternativeLabel sx={{ mb: 2 }}>
              {wizardSteps.map((step) => <Step key={step}><StepLabel>{step}</StepLabel></Step>)}
            </Stepper>

            <Grid container spacing={1.2}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Select Integration</InputLabel>
                  <Select value={wizardIntegrationId} label="Select Integration" onChange={(event) => setWizardIntegrationId(event.target.value)}>
                    {definitions.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={8}>
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" onClick={() => { setWizardOpen(true); setWizardStep(1); }}>Start Wizard</Button>
                  <Button variant="outlined" startIcon={<TestIcon />} onClick={runTestConnection} disabled={!wizardOpen}>Test Connection</Button>
                  <Button variant="contained" onClick={completeConnection} disabled={!wizardOpen || !canManageIntegrations}>Save Connection</Button>
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}><TextField fullWidth label="API Key" value={credentials.apiKey} onChange={(event) => setCredentials((current) => ({ ...current, apiKey: event.target.value }))} /></Grid>
              <Grid item xs={12} md={6}><TextField fullWidth label="OAuth Token" value={credentials.oauth} onChange={(event) => setCredentials((current) => ({ ...current, oauth: event.target.value }))} /></Grid>
              <Grid item xs={12} md={6}><TextField fullWidth label="Webhook URL" value={credentials.webhookUrl} onChange={(event) => setCredentials((current) => ({ ...current, webhookUrl: event.target.value }))} /></Grid>
              <Grid item xs={12} md={6}><TextField fullWidth label="Client ID" value={credentials.clientId} onChange={(event) => setCredentials((current) => ({ ...current, clientId: event.target.value }))} /></Grid>
              <Grid item xs={12} md={6}><TextField fullWidth label="Client Secret" value={credentials.clientSecret} onChange={(event) => setCredentials((current) => ({ ...current, clientSecret: event.target.value }))} /></Grid>
              <Grid item xs={12} md={6}><TextField fullWidth label="Access Token" value={credentials.accessToken} onChange={(event) => setCredentials((current) => ({ ...current, accessToken: event.target.value }))} /></Grid>
              <Grid item xs={12} md={6}><TextField fullWidth label="Refresh Token" value={credentials.refreshToken} onChange={(event) => setCredentials((current) => ({ ...current, refreshToken: event.target.value }))} /></Grid>
              <Grid item xs={12}>{testResult && <Alert severity={testResult.ok ? 'success' : 'error'}>{testResult.message}</Alert>}</Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {(tab === 'job-sync' || tab === 'candidate-sync' || tab === 'interview-sync' || tab === 'messaging-sync') && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Integration</InputLabel>
              <Select value={syncIntegrationId} label="Integration" onChange={(event) => setSyncIntegrationId(event.target.value)}>
                {definitions.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Object</InputLabel>
              <Select value={syncObjectType} label="Object" onChange={(event) => setSyncObjectType(event.target.value as SyncObjectType)}>
                <MenuItem value="jobs">Jobs</MenuItem>
                <MenuItem value="candidates">Candidates</MenuItem>
                <MenuItem value="interviews">Interviews</MenuItem>
                <MenuItem value="messages">Messages</MenuItem>
                <MenuItem value="offers">Offers</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" startIcon={<ImportIcon />} onClick={() => triggerSync(syncObjectType, 'import')}>Import</Button>
              <Button variant="outlined" startIcon={<SyncIcon />} onClick={() => triggerSync(syncObjectType, 'export')}>Export</Button>
              <Button variant="outlined" color="error" startIcon={<ErrorIcon />} onClick={() => triggerSync(syncObjectType, 'both', true)}>Simulate Fail</Button>
            </Stack>
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                {tab === 'job-sync' && (
                  <>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Job Sync</Typography>
                    <Typography variant="body2" color="text.secondary">Import Jobs, Export Jobs, Auto Sync, Manual Sync, Conflict Resolution, Duplicate Detection, Sync Status.</Typography>
                  </>
                )}
                {tab === 'candidate-sync' && (
                  <>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Candidate Sync</Typography>
                    <Typography variant="body2" color="text.secondary">Import/Export candidates, resume sync, profile sync, notes sync, timeline sync.</Typography>
                  </>
                )}
                {tab === 'interview-sync' && (
                  <>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Interview Sync</Typography>
                    <Typography variant="body2" color="text.secondary">Interview schedule, calendar events, meeting links, feedback sync with interview module.</Typography>
                  </>
                )}
                {tab === 'messaging-sync' && (
                  <>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Messaging Sync</Typography>
                    <Typography variant="body2" color="text.secondary">Emails, invites, candidate replies, offer emails sync.</Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'stage-mapping' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Integration</InputLabel>
              <Select value={stageMapIntegrationId} label="Integration" onChange={(event) => setStageMapIntegrationId(event.target.value)}>
                {definitions.filter((item) => item.category === 'ats').map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}><TextField fullWidth label="External Stage" value={externalStage} onChange={(event) => setExternalStage(event.target.value)} /></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth label="Internal Stage" value={internalStage} onChange={(event) => setInternalStage(event.target.value)} /></Grid>
          <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={saveStageMap}>Save Mapping</Button></Grid>

          <Grid item xs={12}>
            <TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>External Stage</TableCell>
                    <TableCell>â†“</TableCell>
                    <TableCell>Internal ATS Stage</TableCell>
                    <TableCell>Updated</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stageMappings.map((mapping: StageMapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell>{mapping.externalStage}</TableCell>
                      <TableCell>â†“</TableCell>
                      <TableCell>{mapping.internalStage}</TableCell>
                      <TableCell>{parseDate(mapping.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {(tab === 'calendar' || tab === 'video' || tab === 'slack' || tab === 'email') && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
          <CardContent>
            {tab === 'calendar' && (
              <>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Calendar Integration (Google Calendar, Outlook)</Typography>
                <ListInfo lines={[
                  'Two-way Sync',
                  'Availability',
                  'Interview Booking',
                  'Reminders',
                  'Timezone Handling',
                ]} />
              </>
            )}
            {tab === 'video' && (
              <>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Video Meeting Integration (Zoom, Google Meet, Microsoft Teams)</Typography>
                <ListInfo lines={[
                  'Automatically generate meeting links',
                  'Store links in Interview module',
                  'Sync invite metadata',
                ]} />
              </>
            )}
            {tab === 'slack' && (
              <>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Slack / Teams Chat Notifications</Typography>
                <ListInfo lines={[
                  'New Applicant',
                  'Interview Scheduled',
                  'Offer Accepted',
                  'Automation Failed',
                  'Hiring Completed',
                ]} />
              </>
            )}
            {tab === 'email' && (
              <>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Email Integration (Gmail, Outlook)</Typography>
                <ListInfo lines={[
                  'Send emails from recruiter dashboard',
                  'Track delivery status',
                  'Track opens',
                  'Track replies',
                ]} />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'webhooks' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Create Webhook</Typography>
                <Stack spacing={1}>
                  <FormControl fullWidth>
                    <InputLabel>Direction</InputLabel>
                    <Select value={webhookDirection} label="Direction" onChange={(event) => setWebhookDirection(event.target.value as 'incoming' | 'outgoing')}>
                      <MenuItem value="incoming">Incoming</MenuItem>
                      <MenuItem value="outgoing">Outgoing</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField label="Webhook URL" value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} fullWidth />
                  <TextField label="Secret" value={webhookSecret} onChange={(event) => setWebhookSecret(event.target.value)} fullWidth />
                  <TextField label="Events (comma separated)" value={webhookEvents} onChange={(event) => setWebhookEvents(event.target.value)} fullWidth />
                  <Button variant="contained" startIcon={<WebhookIcon />} onClick={createWebhook}>Create Webhook</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Endpoints</Typography>
                <Stack spacing={0.8}>
                  {webhooks.length === 0 ? <Alert severity="info">No webhook endpoints.</Alert> : webhooks.map((endpoint: WebhookEndpoint) => (
                    <Paper key={endpoint.id} sx={{ p: 1, border: `1px solid ${themeColors.border}` }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{endpoint.direction.toUpperCase()} â€¢ {endpoint.url}</Typography>
                      <Typography variant="caption" color="text.secondary">Events: {endpoint.events.join(', ')}</Typography>
                      <Stack direction="row" spacing={0.6} sx={{ mt: 0.8 }}>
                        <Button size="small" variant="outlined" onClick={() => {
                          integrationsHubService.sendWebhookTest(ownerId, endpoint.id);
                          toast.success('Webhook test sent');
                        }}>Send Test</Button>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Direction</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Response</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {webhookLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{parseDate(log.createdAt)}</TableCell>
                      <TableCell>{log.direction}</TableCell>
                      <TableCell><Chip size="small" color={log.status === 'success' ? 'success' : 'error'} label={log.status} /></TableCell>
                      <TableCell>{log.response}</TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="outlined" disabled={log.status === 'success'} onClick={() => {
                          integrationsHubService.retryWebhook(ownerId, log.id);
                          toast.success('Webhook retried');
                        }}>Retry</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {tab === 'api-keys' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Generate API Key</Typography>
                <Stack spacing={1}>
                  <TextField label="Name" value={apiKeyName} onChange={(event) => setApiKeyName(event.target.value)} fullWidth />
                  <FormControl fullWidth>
                    <InputLabel>Type</InputLabel>
                    <Select value={apiKeyType} label="Type" onChange={(event) => setApiKeyType(event.target.value as 'read_only' | 'read_write')}>
                      <MenuItem value="read_only">Read Only</MenuItem>
                      <MenuItem value="read_write">Read/Write</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField label="Permissions (comma separated)" value={apiKeyPermissions} onChange={(event) => setApiKeyPermissions(event.target.value)} fullWidth />
                  <TextField label="Expiration (ISO datetime optional)" value={apiKeyExpiry} onChange={(event) => setApiKeyExpiry(event.target.value)} fullWidth />
                  <Button variant="contained" startIcon={<KeyIcon />} onClick={createApiKey}>Create Key</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={7}>
            <TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Masked Key</TableCell>
                    <TableCell>Expires</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell>{key.name}</TableCell>
                      <TableCell>{key.type}</TableCell>
                      <TableCell>{key.keyMasked}</TableCell>
                      <TableCell>{parseDate(key.expiresAt)}</TableCell>
                      <TableCell><Chip size="small" label={key.revoked ? 'Revoked' : 'Active'} color={key.revoked ? 'default' : 'success'} /></TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Button size="small" variant="outlined" disabled={key.revoked} onClick={() => {
                            const next = integrationsHubService.rotateApiKey(ownerId, key.id);
                            toast.success(`Key rotated: ${next.keyMasked}`);
                          }}>Rotate</Button>
                          <Button size="small" color="error" variant="outlined" disabled={key.revoked} onClick={() => {
                            integrationsHubService.revokeApiKey(ownerId, key.id);
                            toast.success('Key revoked');
                          }}>Revoke</Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {tab === 'import-center' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Object Type</InputLabel>
              <Select value={importObjectType} label="Object Type" onChange={(event) => setImportObjectType(event.target.value as ImportPreviewRow['objectType'])}>
                <MenuItem value="jobs">Jobs</MenuItem>
                <MenuItem value="candidates">Candidates</MenuItem>
                <MenuItem value="companies">Companies</MenuItem>
                <MenuItem value="recruiters">Recruiters</MenuItem>
                <MenuItem value="tags">Tags</MenuItem>
                <MenuItem value="talent_pools">Talent Pools</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={9}><TextField fullWidth multiline minRows={6} label="CSV Data" value={importCsvText} onChange={(event) => setImportCsvText(event.target.value)} /></Grid>
          <Grid item xs={12}><Button variant="contained" startIcon={<ImportIcon />} onClick={previewImport}>Preview Import</Button></Grid>

          <Grid item xs={12}>
            <TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Row</TableCell>
                    <TableCell>Duplicate</TableCell>
                    <TableCell>Warnings</TableCell>
                    <TableCell>Payload Preview</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {importPreview.map((row) => (
                    <TableRow key={row.rowNumber}>
                      <TableCell>{row.rowNumber}</TableCell>
                      <TableCell><Chip size="small" label={row.duplicate ? 'Yes' : 'No'} color={row.duplicate ? 'warning' : 'success'} /></TableCell>
                      <TableCell>{row.warnings.join(', ') || '-'}</TableCell>
                      <TableCell>{JSON.stringify(row.raw)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {tab === 'export-center' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={3}><FormControl fullWidth><InputLabel>Format</InputLabel><Select value={exportFormat} label="Format" onChange={(event) => setExportFormat(event.target.value as ExportJob['format'])}><MenuItem value="csv">CSV</MenuItem><MenuItem value="excel">Excel</MenuItem><MenuItem value="json">JSON</MenuItem><MenuItem value="pdf">PDF</MenuItem></Select></FormControl></Grid>
          <Grid item xs={12} md={3}><FormControl fullWidth><InputLabel>Object</InputLabel><Select value={exportObjectType} label="Object" onChange={(event) => setExportObjectType(event.target.value as ExportJob['objectType'])}><MenuItem value="jobs">Jobs</MenuItem><MenuItem value="candidates">Candidates</MenuItem><MenuItem value="reports">Reports</MenuItem><MenuItem value="analytics">Analytics</MenuItem></Select></FormControl></Grid>
          <Grid item xs={12} md={2}><Stack direction="row" alignItems="center" spacing={1}><Switch checked={scheduledExport} onChange={(event) => setScheduledExport(event.target.checked)} /><Typography variant="body2">Scheduled</Typography></Stack></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth label="Cron (if scheduled)" value={scheduledCron} onChange={(event) => setScheduledCron(event.target.value)} disabled={!scheduledExport} /></Grid>
          <Grid item xs={12}><Button variant="contained" onClick={createExport}>Create Export</Button></Grid>

          <Grid item xs={12}>
            <TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Format</TableCell>
                    <TableCell>Object</TableCell>
                    <TableCell>Scheduled</TableCell>
                    <TableCell>Cron</TableCell>
                    <TableCell>Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {exportJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>{job.format}</TableCell>
                      <TableCell>{job.objectType}</TableCell>
                      <TableCell>{job.scheduled ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{job.scheduledCron || '-'}</TableCell>
                      <TableCell>{parseDate(job.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {tab === 'sync-logs' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={3}><FormControl fullWidth><InputLabel>Status</InputLabel><Select value={syncLogStatusFilter} label="Status" onChange={(event) => setSyncLogStatusFilter(event.target.value as SyncStatus | 'all')}><MenuItem value="all">All</MenuItem><MenuItem value="success">Success</MenuItem><MenuItem value="failed">Failed</MenuItem><MenuItem value="running">Running</MenuItem><MenuItem value="pending">Pending</MenuItem></Select></FormControl></Grid>
          <Grid item xs={12} md={3}><FormControl fullWidth><InputLabel>Object</InputLabel><Select value={syncLogObjectFilter} label="Object" onChange={(event) => setSyncLogObjectFilter(event.target.value as SyncObjectType | 'all')}><MenuItem value="all">All</MenuItem><MenuItem value="jobs">Jobs</MenuItem><MenuItem value="candidates">Candidates</MenuItem><MenuItem value="interviews">Interviews</MenuItem><MenuItem value="offers">Offers</MenuItem><MenuItem value="messages">Messages</MenuItem><MenuItem value="calendar">Calendar</MenuItem></Select></FormControl></Grid>
          <Grid item xs={12} md={6}><Stack direction="row" spacing={1}><Button variant="outlined" onClick={exportSyncLogs}>Export Logs CSV</Button></Stack></Grid>

          <Grid item xs={12}>
            <TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Platform</TableCell>
                    <TableCell>Object</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Imported</TableCell>
                    <TableCell>Exported</TableCell>
                    <TableCell>Errors</TableCell>
                    <TableCell align="right">Retry</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {syncLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{parseDate(log.startedAt)}</TableCell>
                      <TableCell>{integrationById[log.integrationId]?.name || log.integrationId}</TableCell>
                      <TableCell>{log.objectType}</TableCell>
                      <TableCell><SyncStatusChip status={log.status} /></TableCell>
                      <TableCell>{log.durationMs} ms</TableCell>
                      <TableCell>{log.recordsImported}</TableCell>
                      <TableCell>{log.recordsExported}</TableCell>
                      <TableCell>{log.errors.join('; ') || '-'}</TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="outlined" disabled={log.status !== 'failed'} onClick={() => retrySyncLog(log.id)}>Retry</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {tab === 'conflicts' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}><FormControl fullWidth><InputLabel>Strategy</InputLabel><Select value={conflictStrategy} label="Strategy" onChange={(event) => setConflictStrategy(event.target.value as 'merge' | 'overwrite' | 'skip_duplicate')}><MenuItem value="merge">Merge Records</MenuItem><MenuItem value="overwrite">Overwrite Rules</MenuItem><MenuItem value="skip_duplicate">Skip Duplicate</MenuItem></Select></FormControl></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth multiline minRows={6} label="Source Record (JSON)" value={conflictSource} onChange={(event) => setConflictSource(event.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth multiline minRows={6} label="Existing Record (JSON)" value={conflictExisting} onChange={(event) => setConflictExisting(event.target.value)} /></Grid>
          <Grid item xs={12}><Button variant="contained" onClick={runConflictResolution}>Resolve Conflict</Button></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={6} label="Resolved Output" value={conflictOutput} onChange={() => undefined} /></Grid>
        </Grid>
      )}

      {tab === 'automation' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Automation Integration Triggers</Typography>
            <Stack spacing={1}>
              <ToggleLine label="Trigger automation after Job Imported" checked={autoTriggerJobs} onChange={setAutoTriggerJobs} />
              <ToggleLine label="Trigger automation after Candidate Imported" checked={autoTriggerCandidates} onChange={setAutoTriggerCandidates} />
              <ToggleLine label="Trigger automation after Interview Imported" checked={autoTriggerInterviews} onChange={setAutoTriggerInterviews} />
              <ToggleLine label="Trigger automation after Offer Imported" checked={autoTriggerOffers} onChange={setAutoTriggerOffers} />
            </Stack>
            <Alert severity="info" sx={{ mt: 1 }}>These trigger settings are ready to connect with Automation Center workflows.</Alert>
          </CardContent>
        </Card>
      )}

      {tab === 'analytics' && (
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={4}>{statCard('Most Used Integration', analytics.mostUsedIntegration, '#2563EB')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Import Count', analytics.importCount, '#0F766E')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Export Count', analytics.exportCount, '#9333EA')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Sync Success Rate', `${analytics.syncSuccessRate}%`, '#0369A1')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Average Sync Time', `${analytics.averageSyncTimeMs} ms`, '#D97706')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('API Usage', analytics.apiUsage, '#7C2D12')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Error Rate', `${analytics.errorRate}%`, '#DC2626')}</Grid>
        </Grid>
      )}

      {tab === 'ai-suggestions' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>AI Suggestions</Typography>
                <Stack spacing={0.8}>
                  {aiSuggestions.map((suggestion) => (
                    <Alert key={suggestion} severity="info" icon={<NotifyIcon />}>{suggestion}</Alert>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Divider sx={{ my: 2 }} />
      <Typography variant="caption" color="text.secondary">
        Permissions: only Company Owner and Company Admin can manage integrations; recruiters can view status and logs.
      </Typography>
    </MotionBox>
  );
};

const ListInfo: React.FC<{ lines: string[] }> = ({ lines }) => (
  <Stack spacing={0.5} sx={{ mt: 1 }}>
    {lines.map((line) => (
      <Stack key={line} direction="row" spacing={0.8} alignItems="center">
        <CheckCircleIcon fontSize="small" color="success" />
        <Typography variant="body2">{line}</Typography>
      </Stack>
    ))}
  </Stack>
);

const ToggleLine: React.FC<{ label: string; checked: boolean; onChange: (value: boolean) => void }> = ({ label, checked, onChange }) => (
  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
    <Typography variant="body2">{label}</Typography>
    <Switch checked={checked} onChange={(event) => onChange(event.target.checked)} />
  </Stack>
);
