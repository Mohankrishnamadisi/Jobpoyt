import React, { useEffect, useMemo, useState } from 'react';
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
  Switch,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { RecruiterPageHero } from './RecruiterPageHero';
import {
  Api as ApiIcon,
  Hub as GraphQlIcon,
  Key as KeyIcon,
  Webhook as WebhookIcon,
  Store as MarketplaceIcon,
  Insights as AnalyticsIcon,
  Download as DownloadIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { enterpriseApiPlatformService } from '@services/enterpriseApiPlatform';

type PortalTab =
  | 'developer-dashboard'
  | 'api-management'
  | 'marketplace'
  | 'webhooks'
  | 'documentation'
  | 'authentication'
  | 'api-explorer'
  | 'analytics'
  | 'usage-plans'
  | 'organization-settings'
  | 'audit-logs'
  | 'security'
  | 'reports'
  | 'permissions';

const statCard = (label: string, value: string | number) => (
  <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
    <CardContent>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>{value}</Typography>
    </CardContent>
  </Card>
);

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

interface RecruiterDeveloperApiCenterProps {
  mode?: 'developer-portal' | 'api-management' | 'marketplace' | 'webhooks';
}

const initialTabFromMode = (mode: RecruiterDeveloperApiCenterProps['mode']): PortalTab => {
  if (mode === 'api-management') return 'api-management';
  if (mode === 'marketplace') return 'marketplace';
  if (mode === 'webhooks') return 'webhooks';
  return 'developer-dashboard';
};

export const RecruiterDeveloperApiCenter: React.FC<RecruiterDeveloperApiCenterProps> = ({ mode = 'developer-portal' }) => {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const [tab, setTab] = useState<PortalTab>(initialTabFromMode(mode));
  const [keyName, setKeyName] = useState('Internal Integration Key');
  const [keyScopes, setKeyScopes] = useState('jobs.read,applications.read,webhooks.write');
  const [oauthName, setOauthName] = useState('Partner OAuth App');
  const [oauthRedirect, setOauthRedirect] = useState('https://partner.example.com/oauth/callback');
  const [webhookName, setWebhookName] = useState('Hiring Events Hook');
  const [webhookUrl, setWebhookUrl] = useState('https://partner.example.com/hooks/hiring');
  const [integrationName, setIntegrationName] = useState('Custom ATS Bridge');
  const [integrationProvider, setIntegrationProvider] = useState('Partner Inc');
  const [integrationCategory, setIntegrationCategory] = useState<'ATS' | 'HRMS' | 'CRM' | 'Calendar' | 'Communication' | 'Storage' | 'AI' | 'Productivity' | 'Payments' | 'Identity'>('ATS');
  const [explorerEndpoint, setExplorerEndpoint] = useState('/v1/jobs');
  const [explorerMethod, setExplorerMethod] = useState<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('GET');
  const [explorerTokenType, setExplorerTokenType] = useState<'api_key' | 'oauth2' | 'jwt' | 'service_account'>('api_key');

  const dashboard = useMemo(() => enterpriseApiPlatformService.getDeveloperDashboard(), [tab]);
  const endpoints = useMemo(() => enterpriseApiPlatformService.listEndpoints(), [tab]);
  const apiKeys = useMemo(() => enterpriseApiPlatformService.listApiKeys(), [tab]);
  const oauthApps = useMemo(() => enterpriseApiPlatformService.listOAuthApps(), [tab]);
  const webhooks = useMemo(() => enterpriseApiPlatformService.listWebhooks(), [tab]);
  const webhookLogs = useMemo(() => enterpriseApiPlatformService.listWebhookLogs(), [tab]);
  const integrations = useMemo(() => enterpriseApiPlatformService.listIntegrations(), [tab]);
  const docs = useMemo(() => enterpriseApiPlatformService.getApiDocumentation(), []);
  const graphql = useMemo(() => enterpriseApiPlatformService.getGraphQlArchitecture(), []);
  const usagePlans = useMemo(() => enterpriseApiPlatformService.getUsagePlans(), []);
  const orgSettings = useMemo(() => enterpriseApiPlatformService.getOrgSettings('default_org'), [tab]);
  const auditLogs = useMemo(() => enterpriseApiPlatformService.listAuditLogs(), [tab]);
  const security = useMemo(() => enterpriseApiPlatformService.getSecurityArchitecture(), []);
  const versioning = useMemo(() => enterpriseApiPlatformService.getVersioning(), []);
  const reports = useMemo(() => enterpriseApiPlatformService.generateReports(), [tab]);
  const permissions = useMemo(() => enterpriseApiPlatformService.getPermissions(), []);

  const [explorerResult, setExplorerResult] = useState<any>(null);
  const [mutableSettings, setMutableSettings] = useState(orgSettings);

  useEffect(() => {
    setTab(initialTabFromMode(mode));
  }, [mode]);

  return (
    <Box>
      <RecruiterPageHero
        eyebrow="Company"
        icon={<ApiIcon />}
        title="Enterprise API Platform"
        description="Developer Portal, API Management, Integration Marketplace and Webhooks for enterprise-scale integrations."
        actions={(
          <>
            <Chip icon={<ApiIcon />} label="REST v1/v2" />
            <Chip icon={<GraphQlIcon />} label="GraphQL Ready" />
            <Chip icon={<SecurityIcon />} label="Enterprise Security" />
          </>
        )}
      />

      <Paper sx={{ border: '1px solid #e2e8f0', borderRadius: 2, mb: 2 }}>
        <Tabs value={tab} onChange={(_, v: PortalTab) => setTab(v)} variant={isTablet ? 'scrollable' : 'scrollable'} scrollButtons="auto" allowScrollButtonsMobile sx={{ minHeight: 54, px: 0.5, '& .MuiTabs-scroller': { overflowX: 'auto !important' }, '& .MuiTabs-scrollButtons': { width: 34, borderRadius: 1, mx: 0.5 }, '& .MuiTab-root': { textTransform: 'none', whiteSpace: 'nowrap', minHeight: 54, minWidth: 'max-content', px: 1.8, fontWeight: 700, fontSize: '0.82rem' } }}>
          <Tab value="developer-dashboard" label="Developer Dashboard" />
          <Tab value="api-management" label="API Management" />
          <Tab value="marketplace" label="Marketplace" />
          <Tab value="webhooks" label="Webhooks" />
          <Tab value="documentation" label="API Docs" />
          <Tab value="authentication" label="Authentication" />
          <Tab value="api-explorer" label="API Explorer" />
          <Tab value="analytics" label="API Analytics" />
          <Tab value="usage-plans" label="Usage Plans" />
          <Tab value="organization-settings" label="Org Settings" />
          <Tab value="audit-logs" label="Audit Logs" />
          <Tab value="security" label="Security" />
          <Tab value="reports" label="Reports" />
          <Tab value="permissions" label="Permissions" />
        </Tabs>
      </Paper>

      {tab === 'developer-dashboard' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={3}>{statCard('API Requests Today', dashboard.requestsToday.toLocaleString())}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('API Requests This Month', dashboard.requestsMonth.toLocaleString())}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Active API Keys', dashboard.activeApiKeys)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Webhook Deliveries', dashboard.webhookDeliveries)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Failed Requests', dashboard.failedRequests)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Rate Limit Usage', `${dashboard.rateLimitUsage}%`)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('OAuth Applications', dashboard.oauthApplications)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('SDK Downloads', dashboard.sdkDownloads.toLocaleString())}</Grid>
        </Grid>
      )}

      {tab === 'api-management' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="info">REST API Platform supports versioned endpoints: /v1/jobs, /v1/candidates, /v1/recruiters, /v1/applications, /v1/interviews, /v1/messages, /v1/assessments, /v1/analytics, /v1/organizations.</Alert></Grid>
          <Grid item xs={12} md={8}>
            <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0' }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>Method</TableCell><TableCell>Path</TableCell><TableCell>Version</TableCell><TableCell>Auth</TableCell><TableCell>Rate/Min</TableCell><TableCell>Summary</TableCell></TableRow></TableHead>
                <TableBody>
                  {endpoints.map((ep) => (
                    <TableRow key={ep.id}>
                      <TableCell>{ep.method}</TableCell>
                      <TableCell>{ep.path}</TableCell>
                      <TableCell>{ep.version}</TableCell>
                      <TableCell>{ep.auth}</TableCell>
                      <TableCell>{ep.rateLimitPerMinute}</TableCell>
                      <TableCell>{ep.summary}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ border: '1px solid #e2e8f0' }}><CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>API Versioning</Typography>
              <Typography variant="body2">Versions: {versioning.versions.join(', ')}</Typography>
              <Typography variant="body2">Deprecation: {versioning.deprecationNotices.join(' | ')}</Typography>
              <Typography variant="body2">Migration Guides: {versioning.migrationGuides.join(' | ')}</Typography>
            </CardContent></Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid #e2e8f0' }}><CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>API Key Management</Typography>
              <TextField fullWidth size="small" label="Key Name" value={keyName} onChange={(e) => setKeyName(e.target.value)} sx={{ mb: 1 }} />
              <TextField fullWidth size="small" label="Scopes" value={keyScopes} onChange={(e) => setKeyScopes(e.target.value)} sx={{ mb: 1 }} />
              <Button variant="contained" startIcon={<KeyIcon />} onClick={() => {
                enterpriseApiPlatformService.createApiKey(keyName, keyScopes.split(',').map((x) => x.trim()).filter(Boolean));
                toast.success('API key created');
              }}>Create Key</Button>
              <Stack spacing={0.8} sx={{ mt: 1 }}>
                {apiKeys.slice(0, 5).map((key) => (
                  <Paper key={key.id} sx={{ p: 1, border: '1px solid #e2e8f0' }}>
                    <Typography variant="subtitle2">{key.name} ({key.maskedKey})</Typography>
                    <Typography variant="caption" display="block">Usage Today: {key.usageToday} | Last Access: {new Date(key.lastAccessAt).toLocaleString()}</Typography>
                    <Stack direction="row" spacing={0.5}>
                      <Button size="small" onClick={() => { enterpriseApiPlatformService.rotateApiKey(key.id); toast.success('Key rotated'); }}>Rotate</Button>
                      <Button size="small" onClick={() => { enterpriseApiPlatformService.updateApiKeyStatus(key.id, key.status === 'active' ? 'disabled' : 'active'); toast.success('Key status updated'); }}>{key.status === 'active' ? 'Disable' : 'Enable'}</Button>
                      <Button size="small" color="error" onClick={() => { enterpriseApiPlatformService.deleteApiKey(key.id); toast.success('Key deleted'); }}>Delete</Button>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </CardContent></Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid #e2e8f0' }}><CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>OAuth Applications</Typography>
              <TextField fullWidth size="small" label="App Name" value={oauthName} onChange={(e) => setOauthName(e.target.value)} sx={{ mb: 1 }} />
              <TextField fullWidth size="small" label="Redirect URI" value={oauthRedirect} onChange={(e) => setOauthRedirect(e.target.value)} sx={{ mb: 1 }} />
              <Button variant="contained" onClick={() => { enterpriseApiPlatformService.createOAuthApp(oauthName, oauthRedirect, ['jobs.read', 'messages.read']); toast.success('OAuth app created'); }}>Create OAuth App</Button>
              <Stack spacing={0.8} sx={{ mt: 1 }}>
                {oauthApps.map((app) => (
                  <Paper key={app.id} sx={{ p: 1, border: '1px solid #e2e8f0' }}>
                    <Typography variant="subtitle2">{app.name}</Typography>
                    <Typography variant="caption" display="block">Client ID: {app.clientId}</Typography>
                    <Typography variant="caption" display="block">Scopes: {app.scopes.join(', ')}</Typography>
                  </Paper>
                ))}
              </Stack>
            </CardContent></Card>
          </Grid>
        </Grid>
      )}

      {tab === 'marketplace' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="info">Integration Marketplace categories: ATS, HRMS, CRM, Calendar, Communication, Storage, AI, Productivity, Payments, Identity.</Alert></Grid>
          <Grid item xs={12} md={5}>
            <Card sx={{ border: '1px solid #e2e8f0' }}><CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Publish Integration</Typography>
              <TextField fullWidth size="small" label="Integration Name" value={integrationName} onChange={(e) => setIntegrationName(e.target.value)} sx={{ mb: 1 }} />
              <TextField fullWidth size="small" label="Provider" value={integrationProvider} onChange={(e) => setIntegrationProvider(e.target.value)} sx={{ mb: 1 }} />
              <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                <InputLabel>Category</InputLabel>
                <Select value={integrationCategory} label="Category" onChange={(e) => setIntegrationCategory(e.target.value as any)}>
                  {['ATS', 'HRMS', 'CRM', 'Calendar', 'Communication', 'Storage', 'AI', 'Productivity', 'Payments', 'Identity'].map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="contained" startIcon={<MarketplaceIcon />} onClick={() => {
                enterpriseApiPlatformService.publishIntegration(integrationName, integrationCategory, integrationProvider);
                toast.success('Integration submitted for review');
              }}>Publish</Button>
            </CardContent></Card>
          </Grid>
          <Grid item xs={12} md={7}>
            <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0' }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Category</TableCell><TableCell>Provider</TableCell><TableCell>Installs</TableCell><TableCell>Rating</TableCell><TableCell>Status</TableCell><TableCell>Actions</TableCell></TableRow></TableHead>
                <TableBody>
                  {integrations.slice(0, 18).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>{row.provider}</TableCell>
                      <TableCell>{row.installs}</TableCell>
                      <TableCell>{row.rating.toFixed(1)}</TableCell>
                      <TableCell>{row.status}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Button size="small" onClick={() => { enterpriseApiPlatformService.updateIntegrationStatus(row.id, 'published'); toast.success('Published'); }}>Publish</Button>
                          <Button size="small" onClick={() => { enterpriseApiPlatformService.updateIntegrationStatus(row.id, 'pending_review'); toast.success('Queued review'); }}>Update</Button>
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

      {tab === 'webhooks' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="info">Webhook events: {enterpriseApiPlatformService.listWebhookEvents().join(', ')}</Alert></Grid>
          <Grid item xs={12} md={5}>
            <Card sx={{ border: '1px solid #e2e8f0' }}><CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Webhook Management</Typography>
              <TextField fullWidth size="small" label="Webhook Name" value={webhookName} onChange={(e) => setWebhookName(e.target.value)} sx={{ mb: 1 }} />
              <TextField fullWidth size="small" label="Webhook URL" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} sx={{ mb: 1 }} />
              <Button variant="contained" startIcon={<WebhookIcon />} onClick={() => {
                enterpriseApiPlatformService.createWebhook(webhookName, webhookUrl, ['Application Submitted', 'Interview Scheduled', 'Assessment Completed']);
                toast.success('Webhook created');
              }}>Create</Button>
              <Stack spacing={0.7} sx={{ mt: 1 }}>
                {webhooks.map((wh) => (
                  <Paper key={wh.id} sx={{ p: 1, border: '1px solid #e2e8f0' }}>
                    <Typography variant="subtitle2">{wh.name}</Typography>
                    <Typography variant="caption" display="block">{wh.url}</Typography>
                    <Typography variant="caption" display="block">Events: {wh.events.join(', ')}</Typography>
                    <Stack direction="row" spacing={0.5}>
                      <Button size="small" onClick={() => { enterpriseApiPlatformService.updateWebhookStatus(wh.id, wh.status === 'active' ? 'paused' : 'active'); toast.success('Webhook status updated'); }}>{wh.status === 'active' ? 'Pause' : 'Resume'}</Button>
                      <Button size="small" color="error" onClick={() => { enterpriseApiPlatformService.deleteWebhook(wh.id); toast.success('Webhook deleted'); }}>Delete</Button>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </CardContent></Card>
          </Grid>
          <Grid item xs={12} md={7}>
            <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0' }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>Timestamp</TableCell><TableCell>Event</TableCell><TableCell>Status</TableCell><TableCell>Response Time</TableCell><TableCell>Retry</TableCell><TableCell>Response Code</TableCell><TableCell>Action</TableCell></TableRow></TableHead>
                <TableBody>
                  {webhookLogs.slice(0, 20).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{log.eventType}</TableCell>
                      <TableCell>{log.status}</TableCell>
                      <TableCell>{log.responseTimeMs} ms</TableCell>
                      <TableCell>{log.retryCount}</TableCell>
                      <TableCell>{log.responseCode}</TableCell>
                      <TableCell>
                        {log.status === 'failed' ? <Button size="small" onClick={() => { enterpriseApiPlatformService.retryFailedDelivery(log.id); toast.success('Retry triggered'); }}>Retry</Button> : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {tab === 'documentation' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="success">Interactive API docs include authentication, endpoints, parameters, examples, response samples, error codes and rate limits.</Alert></Grid>
          <Grid item xs={12} md={6}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Authentication</Typography>{docs.authentication.map((x) => <Typography key={x} variant="body2">- {x}</Typography>)}</CardContent></Card></Grid>
          <Grid item xs={12} md={6}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Error Codes</Typography>{docs.errorCodes.map((x) => <Typography key={x} variant="body2">- {x}</Typography>)}</CardContent></Card></Grid>
          <Grid item xs={12}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Response Samples</Typography>{docs.responseSamples.map((x) => <Typography key={x} variant="body2">- {x}</Typography>)}</CardContent></Card></Grid>
        </Grid>
      )}

      {tab === 'authentication' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="info">Authentication supports API Keys, OAuth 2.0, JWT, Service Accounts with scoped permissions, expiration and revocation.</Alert></Grid>
          <Grid item xs={12}><TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0' }}><Table size="small"><TableHead><TableRow><TableCell>Method</TableCell><TableCell>Use Case</TableCell><TableCell>Token Expiration</TableCell><TableCell>Revocation</TableCell></TableRow></TableHead><TableBody><TableRow><TableCell>API Keys</TableCell><TableCell>Server integrations</TableCell><TableCell>Manual rotation</TableCell><TableCell>Immediate disable/delete</TableCell></TableRow><TableRow><TableCell>OAuth 2.0</TableCell><TableCell>User delegated access</TableCell><TableCell>1 hour access token</TableCell><TableCell>Token revocation endpoint</TableCell></TableRow><TableRow><TableCell>JWT</TableCell><TableCell>Service-to-service auth</TableCell><TableCell>15 min TTL</TableCell><TableCell>Signing key rotation</TableCell></TableRow><TableRow><TableCell>Service Accounts</TableCell><TableCell>Automations and daemons</TableCell><TableCell>Configurable</TableCell><TableCell>Role removal</TableCell></TableRow></TableBody></Table></TableContainer></Grid>
        </Grid>
      )}

      {tab === 'api-explorer' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Endpoint" value={explorerEndpoint} onChange={(e) => setExplorerEndpoint(e.target.value)} /></Grid>
          <Grid item xs={12} md={2}><FormControl fullWidth size="small"><InputLabel>Method</InputLabel><Select value={explorerMethod} label="Method" onChange={(e) => setExplorerMethod(e.target.value as any)}>{['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={12} md={3}><FormControl fullWidth size="small"><InputLabel>Auth</InputLabel><Select value={explorerTokenType} label="Auth" onChange={(e) => setExplorerTokenType(e.target.value as any)}>{['api_key', 'oauth2', 'jwt', 'service_account'].map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={12} md={4}><Button fullWidth variant="contained" onClick={() => setExplorerResult(enterpriseApiPlatformService.executeApiExplorer(explorerEndpoint, explorerMethod, explorerTokenType))}>Execute Request</Button></Grid>
          {explorerResult && (
            <>
              <Grid item xs={12}><Alert severity={explorerResult.statusCode === 200 ? 'success' : 'warning'}>Status {explorerResult.statusCode} | Latency {explorerResult.latency}ms</Alert></Grid>
              <Grid item xs={12} md={6}><Paper sx={{ p: 1, border: '1px solid #e2e8f0' }}><Typography variant="subtitle2">Response</Typography><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(explorerResult.response, null, 2)}</Typography></Paper></Grid>
              <Grid item xs={12} md={6}><Paper sx={{ p: 1, border: '1px solid #e2e8f0' }}><Typography variant="subtitle2">Copy Code</Typography><Typography variant="caption" display="block" sx={{ whiteSpace: 'pre-wrap' }}>{explorerResult.curl}</Typography><Typography variant="caption" display="block" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>{explorerResult.jsSnippet}</Typography></Paper></Grid>
            </>
          )}
        </Grid>
      )}

      {tab === 'analytics' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={6}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Top Endpoints</Typography>{dashboard.topEndpoints.map((ep) => <Typography key={ep.endpoint} variant="body2">{ep.endpoint}: {ep.hits.toLocaleString()}</Typography>)}</CardContent></Card></Grid>
          <Grid item xs={12} md={6}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Most Active Organizations</Typography>{dashboard.mostActiveOrganizations.map((org) => <Typography key={org.org} variant="body2">{org.org}: {org.requests.toLocaleString()}</Typography>)}</CardContent></Card></Grid>
          <Grid item xs={12} md={4}>{statCard('Avg Latency', `${dashboard.averageLatencyMs} ms`)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Error Rate', `${dashboard.errorRate}%`)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Traffic Trend Points', dashboard.trafficTrend.length)}</Grid>
        </Grid>
      )}

      {tab === 'usage-plans' && (
        <Grid container spacing={1.2}>
          {usagePlans.map((plan) => (
            <Grid item xs={12} md={3} key={plan.name}>
              <Card sx={{ border: '1px solid #e2e8f0' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{plan.name}</Typography>
                  <Typography variant="body2">Per Day: {plan.quotaPerDay.toLocaleString()}</Typography>
                  <Typography variant="body2">Per Month: {plan.quotaPerMonth.toLocaleString()}</Typography>
                  <Typography variant="body2">Burst/Min: {plan.burstPerMinute.toLocaleString()}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 'organization-settings' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="info">Organization Admin controls API enablement, webhooks, API access and IP allow list.</Alert></Grid>
          <Grid item xs={12} md={4}><Stack direction="row" spacing={1} alignItems="center"><Typography variant="body2">Enable APIs</Typography><Switch checked={mutableSettings.apisEnabled} onChange={(e) => setMutableSettings((s) => ({ ...s, apisEnabled: e.target.checked }))} /></Stack></Grid>
          <Grid item xs={12} md={4}><Stack direction="row" spacing={1} alignItems="center"><Typography variant="body2">Enable Webhooks</Typography><Switch checked={mutableSettings.webhooksEnabled} onChange={(e) => setMutableSettings((s) => ({ ...s, webhooksEnabled: e.target.checked }))} /></Stack></Grid>
          <Grid item xs={12} md={4}><Stack direction="row" spacing={1} alignItems="center"><Typography variant="body2">Enable API Access</Typography><Switch checked={mutableSettings.apiAccessEnabled} onChange={(e) => setMutableSettings((s) => ({ ...s, apiAccessEnabled: e.target.checked }))} /></Stack></Grid>
          <Grid item xs={12} md={4}><Stack direction="row" spacing={1} alignItems="center"><Typography variant="body2">Request Signing</Typography><Switch checked={mutableSettings.requestSigning} onChange={(e) => setMutableSettings((s) => ({ ...s, requestSigning: e.target.checked }))} /></Stack></Grid>
          <Grid item xs={12} md={4}><Stack direction="row" spacing={1} alignItems="center"><Typography variant="body2">Webhook Signature Validation</Typography><Switch checked={mutableSettings.webhookSignatureValidation} onChange={(e) => setMutableSettings((s) => ({ ...s, webhookSignatureValidation: e.target.checked }))} /></Stack></Grid>
          <Grid item xs={12} md={4}><Stack direction="row" spacing={1} alignItems="center"><Typography variant="body2">Abuse Detection</Typography><Switch checked={mutableSettings.abuseDetection} onChange={(e) => setMutableSettings((s) => ({ ...s, abuseDetection: e.target.checked }))} /></Stack></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth size="small" label="IP Allow List (comma separated)" value={mutableSettings.ipAllowList.join(', ')} onChange={(e) => setMutableSettings((s) => ({ ...s, ipAllowList: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) }))} /></Grid>
          <Grid item xs={12} md={3}><FormControl fullWidth size="small"><InputLabel>Plan</InputLabel><Select value={mutableSettings.plan} label="Plan" onChange={(e) => setMutableSettings((s) => ({ ...s, plan: e.target.value as any }))}>{['Free', 'Starter', 'Professional', 'Enterprise'].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="contained" onClick={() => { enterpriseApiPlatformService.updateOrgSettings('default_org', mutableSettings); toast.success('Organization API settings updated'); }}>Save Settings</Button></Grid>
        </Grid>
      )}

      {tab === 'audit-logs' && (
        <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0' }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Timestamp</TableCell><TableCell>Actor</TableCell><TableCell>Action</TableCell><TableCell>Entity</TableCell><TableCell>Details</TableCell></TableRow></TableHead>
            <TableBody>
              {auditLogs.slice(0, 40).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{new Date(row.timestamp).toLocaleString()}</TableCell>
                  <TableCell>{row.actor}</TableCell>
                  <TableCell>{row.action}</TableCell>
                  <TableCell>{row.entity}</TableCell>
                  <TableCell>{row.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 'security' && (
        <Grid container spacing={1.2}>
          {Object.entries(security).map(([key, value]) => (
            <Grid item xs={12} md={6} key={key}>
              <Card sx={{ border: '1px solid #e2e8f0' }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ textTransform: 'capitalize', fontWeight: 700 }}>{key.replace(/([A-Z])/g, ' $1')}</Typography>
                  <Typography variant="body2" color="text.secondary">{String(value)}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 'reports' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="success">API Usage, Integration, Webhook and Marketplace reports are available in PDF/Excel/CSV.</Alert></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="contained" startIcon={<DownloadIcon />} onClick={() => downloadText('api-usage-report.md', reports.apiUsageReport)}>API Usage Report</Button></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="outlined" onClick={() => downloadText('integration-report.md', reports.integrationReport)}>Integration Report</Button></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="outlined" onClick={() => downloadText('webhook-report.md', reports.webhookReport)}>Webhook Report</Button></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="outlined" onClick={() => downloadText('marketplace-report.md', reports.marketplaceReport)}>Marketplace Report</Button></Grid>
          <Grid item xs={12} md={4}><Button fullWidth variant="outlined" onClick={() => downloadText('api-usage-report.pdf.txt', enterpriseApiPlatformService.downloadReport(reports.apiUsageReport, 'pdf'))}>PDF</Button></Grid>
          <Grid item xs={12} md={4}><Button fullWidth variant="outlined" onClick={() => downloadText('api-usage-report.excel.txt', enterpriseApiPlatformService.downloadReport(reports.apiUsageReport, 'excel'))}>Excel</Button></Grid>
          <Grid item xs={12} md={4}><Button fullWidth variant="outlined" onClick={() => downloadText('api-usage-report.csv', enterpriseApiPlatformService.downloadReport(reports.apiUsageReport, 'csv'))}>CSV</Button></Grid>
        </Grid>
      )}

      {tab === 'permissions' && (
        <Alert severity="info">
          Platform Owner: {permissions.platformOwner} | Super Admin: {permissions.superAdmin} | Organization Admin: {permissions.organizationAdmin} | Developer: {permissions.developer} | Integration Manager: {permissions.integrationManager}
        </Alert>
      )}

      <Alert severity="info" sx={{ mt: 2 }} icon={<AnalyticsIcon />}>
        Built to support thousands of organizations and millions of API requests with enterprise-grade controls, observability and secure integration lifecycle.
      </Alert>
    </Box>
  );
};

export default RecruiterDeveloperApiCenter;
