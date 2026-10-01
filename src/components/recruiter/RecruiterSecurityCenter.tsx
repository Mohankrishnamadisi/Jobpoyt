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
  AdminPanelSettings as SecurityIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Key as KeyIcon,
  NotificationsActive as NotificationIcon,
  Shield as ShieldIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { themeColors } from '@styles/recruiterTheme';
import { securityCenterService, type AuditSeverity, type AuditStatus } from '@services/securityCenter';

type SecurityTab =
  | 'overview'
  | 'score'
  | 'audit'
  | 'sessions'
  | 'devices'
  | 'login-history'
  | 'twofa'
  | 'password-policy'
  | 'permission-audit'
  | 'sensitive-actions'
  | 'export-logs'
  | 'notifications'
  | 'api-security'
  | 'backup-recovery'
  | 'compliance'
  | 'privacy-controls'
  | 'reports'
  | 'alerts'
  | 'integration';

interface RecruiterSecurityCenterProps {
  ownerId: string;
  currentUserId: string;
}

const MotionBox = motion(Box);

const statCard = (title: string, value: string | number, color = '#1D4ED8') => (
  <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
    <CardContent>
      <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>{title}</Typography>
      <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 800, color }}>{value}</Typography>
    </CardContent>
  </Card>
);

const downloadText = (fileName: string, content: string): void => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const RecruiterSecurityCenter: React.FC<RecruiterSecurityCenterProps> = ({ ownerId, currentUserId }) => {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const [tab, setTab] = useState<SecurityTab>('overview');
  const [loading, setLoading] = useState(true);

  const [overview, setOverview] = useState<any>(null);
  const [score, setScore] = useState<any>(null);
  const [auditRows, setAuditRows] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [trustedDevices, setTrustedDevices] = useState<any[]>([]);
  const [deviceHistory, setDeviceHistory] = useState<any[]>([]);
  const [unknownDeviceAlerts, setUnknownDeviceAlerts] = useState<any[]>([]);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [twoFa, setTwoFa] = useState<any>(null);
  const [passwordPolicy, setPasswordPolicy] = useState<any>(null);
  const [permissionAudit, setPermissionAudit] = useState<any>(null);
  const [sensitiveActions, setSensitiveActions] = useState<any[]>([]);
  const [exportLogs, setExportLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [backup, setBackup] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [privacy, setPrivacy] = useState<any>(null);
  const [alertsDashboard, setAlertsDashboard] = useState<any>(null);
  const [integrationSignals, setIntegrationSignals] = useState<any>(null);

  const [search, setSearch] = useState('');
  const dateRange = useMemo(() => securityCenterService.getDefaultDateRange(), []);
  const [dateStart, setDateStart] = useState(dateRange.start);
  const [dateEnd, setDateEnd] = useState(dateRange.end);
  const [filterUser, setFilterUser] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState<'all' | AuditSeverity>('all');
  const [filterActionType, setFilterActionType] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | AuditStatus>('all');

  const [newDeviceName, setNewDeviceName] = useState('My Laptop');
  const [newDeviceBrowser, setNewDeviceBrowser] = useState('Chrome');
  const [newDeviceOs, setNewDeviceOs] = useState('Windows');

  const [newApiKeyName, setNewApiKeyName] = useState('Security API Key');
  const [newApiKeyExpiry, setNewApiKeyExpiry] = useState('');
  const [newApiKeyIps, setNewApiKeyIps] = useState('103.44.22.11,103.44.22.12');
  const [newApiKeyRate, setNewApiKeyRate] = useState('180');

  const [reportFormat, setReportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');

  const ctx = useMemo(() => securityCenterService.getPermissionContext(ownerId, currentUserId), [ownerId, currentUserId]);

  const loadAll = async (): Promise<void> => {
    setLoading(true);
    try {
      securityCenterService.initialize(ownerId, currentUserId);

      const [
        ov,
        sc,
        aud,
        ses,
        dev,
        devHist,
        unknown,
        logins,
        perm,
        exp,
        alert,
        integ,
      ] = await Promise.all([
        securityCenterService.getOverview(ownerId, currentUserId),
        securityCenterService.getSecurityScore(ownerId, currentUserId),
        securityCenterService.listAuditLogs(ownerId, currentUserId, search, {
          dateStart,
          dateEnd,
          user: filterUser || undefined,
          module: filterModule,
          severity: filterSeverity,
          actionType: filterActionType || undefined,
          status: filterStatus,
        }),
        Promise.resolve(securityCenterService.listSessions(ownerId, currentUserId)),
        Promise.resolve(securityCenterService.listTrustedDevices(ownerId, currentUserId)),
        Promise.resolve(securityCenterService.listDeviceHistory(ownerId, currentUserId)),
        Promise.resolve(securityCenterService.detectUnknownDeviceAlerts(ownerId)),
        Promise.resolve(securityCenterService.listLoginHistory(ownerId)),
        securityCenterService.getPermissionAudit(ownerId),
        securityCenterService.listDataExportLogs(ownerId, currentUserId),
        securityCenterService.getAlertsDashboard(ownerId, currentUserId),
        securityCenterService.getIntegrationSignals(ownerId),
      ]);

      setOverview(ov);
      setScore(sc);
      setAuditRows(aud);
      setSessions(ses);
      setTrustedDevices(dev);
      setDeviceHistory(devHist);
      setUnknownDeviceAlerts(unknown);
      setLoginHistory(logins);
      setPermissionAudit(perm);
      setExportLogs(exp);
      setAlertsDashboard(alert);
      setIntegrationSignals(integ);

      setTwoFa(securityCenterService.getTwoFactorSettings(currentUserId));
      setPasswordPolicy(securityCenterService.getPasswordPolicy(ownerId));
      setSensitiveActions(securityCenterService.listSensitiveActions(ownerId));
      setNotifications(securityCenterService.listNotifications(ownerId, currentUserId));
      setApiKeys(securityCenterService.listApiSecurityKeys(ownerId));
      setBackup(securityCenterService.getBackupRecovery(ownerId));
      setCompliance(securityCenterService.getComplianceConfig(ownerId));
      setPrivacy(securityCenterService.getPrivacyControls(currentUserId));
    } catch (error) {
      console.error('security center load failed', error);
      toast.error('Failed to load security center data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [ownerId, currentUserId]);

  const refreshAudit = async (): Promise<void> => {
    try {
      const rows = await securityCenterService.listAuditLogs(ownerId, currentUserId, search, {
        dateStart,
        dateEnd,
        user: filterUser || undefined,
        module: filterModule,
        severity: filterSeverity,
        actionType: filterActionType || undefined,
        status: filterStatus,
      });
      setAuditRows(rows);
      toast.success('Audit logs updated');
    } catch {
      toast.error('Unable to refresh audit logs');
    }
  };

  const guardManage = (): boolean => {
    if (ctx.canManageSecurity) return true;
    toast.error('Only Company Owner and Security Admin can manage security');
    return false;
  };

  if (loading || !overview || !score || !twoFa || !passwordPolicy || !permissionAudit || !backup || !compliance || !privacy || !alertsDashboard || !integrationSignals) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>Loading security center...</Typography>
      </Box>
    );
  }

  return (
    <MotionBox initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <RecruiterPageHero
        eyebrow="Account"
        icon={<SecurityIcon />}
        title="Security Center, Compliance & Audit Logs"
        description="Centralized security posture, audit visibility, session/device control, API security, and compliance operations."
        actions={<Chip icon={<SecurityIcon />} color={ctx.canManageSecurity ? 'success' : 'warning'} label={ctx.canManageSecurity ? 'Manage Access: Owner/Security Admin' : 'Recruiter: Own Session & Settings Only'} />}
      />

      {!ctx.canManageSecurity && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You can manage only your sessions and personal security settings. Audit logs, API security, and organization-level security controls are restricted.
        </Alert>
      )}

      <Paper sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}`, mb: 2 }}>
        <Tabs value={tab} onChange={(_, value: SecurityTab) => setTab(value)} variant={isTablet ? 'scrollable' : 'scrollable'} scrollButtons="auto" allowScrollButtonsMobile sx={{ minHeight: 54, px: 0.5, '& .MuiTabs-scroller': { overflowX: 'auto !important' }, '& .MuiTabs-scrollButtons': { width: 34, borderRadius: 1, mx: 0.5 }, '& .MuiTab-root': { textTransform: 'none', whiteSpace: 'nowrap', minHeight: 54, minWidth: 'max-content', px: 1.8, fontWeight: 700, fontSize: '0.82rem' } }}>
          <Tab value="overview" label="Overview" />
          <Tab value="score" label="Security Score" />
          <Tab value="audit" label="Audit Logs" />
          <Tab value="sessions" label="Sessions" />
          <Tab value="devices" label="Devices" />
          <Tab value="login-history" label="Login History" />
          <Tab value="twofa" label="2FA" />
          <Tab value="password-policy" label="Password Policy" />
          <Tab value="permission-audit" label="Permission Audit" />
          <Tab value="sensitive-actions" label="Sensitive Actions" />
          <Tab value="export-logs" label="Data Export Logs" />
          <Tab value="notifications" label="Notifications" />
          <Tab value="api-security" label="API Security" />
          <Tab value="backup-recovery" label="Backup & Recovery" />
          <Tab value="compliance" label="Compliance" />
          <Tab value="privacy-controls" label="Privacy Controls" />
          <Tab value="reports" label="Reports" />
          <Tab value="alerts" label="Alerts Dashboard" />
          <Tab value="integration" label="Integration" />
        </Tabs>
      </Paper>

      {tab === 'overview' && (
        <Grid container spacing={1.4}>
          <Grid item xs={12} sm={6} md={3}>{statCard('Security Score', overview.securityScore, '#1D4ED8')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Active Sessions', overview.activeSessions, '#0F766E')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Trusted Devices', overview.trustedDevices, '#9333EA')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Failed Login Attempts', overview.failedLoginAttempts, '#DC2626')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Audit Events Today', overview.auditEventsToday, '#0369A1')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Pending Security Alerts', overview.pendingSecurityAlerts, '#C2410C')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Password Age', `${overview.passwordAgeDays} days`, '#D97706')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Last Backup', overview.lastBackup, '#0E7490')}</Grid>
        </Grid>
      )}

      {tab === 'score' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={3}>{statCard('Total Score', score.total, '#1D4ED8')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Strong Password', score.strongPassword, '#0F766E')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('2FA Enabled', score.twoFactorEnabled, '#9333EA')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Verified Email', score.verifiedEmail, '#0369A1')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Verified Phone', score.verifiedPhone, '#0E7490')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Trusted Devices', score.trustedDevices, '#D97706')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Active Sessions', score.activeSessions, '#C2410C')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('API Security', score.apiSecurity, '#7C3AED')}</Grid>
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Recommendations</Typography>
                <Stack spacing={0.7}>
                  {score.recommendations.map((rec: string) => (
                    <Alert key={rec} icon={<ShieldIcon />} severity="info">{rec}</Alert>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'audit' && (
        <Box>
          <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}`, mb: 1.2 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Search & Filters</Typography>
              <Grid container spacing={1}>
                <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Search" value={search} onChange={(e) => setSearch(e.target.value)} /></Grid>
                <Grid item xs={12} md={2}><TextField fullWidth size="small" type="date" label="Date Start" value={dateStart} onChange={(e) => setDateStart(e.target.value)} InputLabelProps={{ shrink: true }} /></Grid>
                <Grid item xs={12} md={2}><TextField fullWidth size="small" type="date" label="Date End" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} InputLabelProps={{ shrink: true }} /></Grid>
                <Grid item xs={12} md={2}><TextField fullWidth size="small" label="User" value={filterUser} onChange={(e) => setFilterUser(e.target.value)} /></Grid>
                <Grid item xs={12} md={2}><FormControl fullWidth size="small"><InputLabel>Module</InputLabel><Select label="Module" value={filterModule} onChange={(e) => setFilterModule(e.target.value)}><MenuItem value="all">All</MenuItem>{securityCenterService.listModules().map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}</Select></FormControl></Grid>
                <Grid item xs={12} md={2}><FormControl fullWidth size="small"><InputLabel>Severity</InputLabel><Select label="Severity" value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value as any)}><MenuItem value="all">All</MenuItem><MenuItem value="low">Low</MenuItem><MenuItem value="medium">Medium</MenuItem><MenuItem value="high">High</MenuItem><MenuItem value="critical">Critical</MenuItem></Select></FormControl></Grid>
                <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Action Type" value={filterActionType} onChange={(e) => setFilterActionType(e.target.value)} helperText="Login, Job, Candidate, Billing, API..." /></Grid>
                <Grid item xs={12} md={3}><FormControl fullWidth size="small"><InputLabel>Status</InputLabel><Select label="Status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}><MenuItem value="all">All</MenuItem><MenuItem value="success">Success</MenuItem><MenuItem value="failed">Failed</MenuItem></Select></FormControl></Grid>
                <Grid item xs={12} md={6}><Button variant="contained" onClick={refreshAudit} disabled={!ctx.canViewAuditLogs}>Apply Filters</Button></Grid>
              </Grid>
            </CardContent>
          </Card>

          <TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Module</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>Device</TableCell>
                  <TableCell>Browser</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{format(new Date(row.timestamp), 'dd MMM yyyy, hh:mm a')}</TableCell>
                    <TableCell>{row.user}</TableCell>
                    <TableCell>{row.role}</TableCell>
                    <TableCell>{row.action}</TableCell>
                    <TableCell>{row.module}</TableCell>
                    <TableCell>{row.ipAddress}</TableCell>
                    <TableCell>{row.device}</TableCell>
                    <TableCell>{row.browser}</TableCell>
                    <TableCell>{row.location}</TableCell>
                    <TableCell><Chip size="small" label={row.status} color={row.status === 'success' ? 'success' : 'error'} /></TableCell>
                    <TableCell>{row.details}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tab === 'sessions' && (
        <TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Browser</TableCell>
                <TableCell>Operating System</TableCell>
                <TableCell>IP Address</TableCell>
                <TableCell>Country</TableCell>
                <TableCell>City</TableCell>
                <TableCell>Device</TableCell>
                <TableCell>Last Activity</TableCell>
                <TableCell>Login Time</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{session.browser}</TableCell>
                  <TableCell>{session.operatingSystem}</TableCell>
                  <TableCell>{session.ipAddress}</TableCell>
                  <TableCell>{session.country}</TableCell>
                  <TableCell>{session.city}</TableCell>
                  <TableCell>{session.device}</TableCell>
                  <TableCell>{format(new Date(session.lastActivity), 'dd MMM, hh:mm a')}</TableCell>
                  <TableCell>{format(new Date(session.loginTime), 'dd MMM, hh:mm a')}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.6} justifyContent="flex-end">
                      <Button size="small" variant="outlined" onClick={() => {
                        try {
                          const closed = securityCenterService.logoutOtherDevices(ownerId, currentUserId, session.id);
                          toast.success(`${closed} other sessions logged out`);
                          loadAll();
                        } catch {
                          toast.error('Unable to logout other devices');
                        }
                      }}>Logout Other Devices</Button>
                      <Button size="small" color="error" variant="outlined" onClick={() => {
                        try {
                          if (!ctx.canManageSessions && session.userId !== currentUserId) {
                            toast.error('You can terminate only your own session');
                            return;
                          }
                          securityCenterService.terminateSession(ownerId, currentUserId, session.id);
                          toast.success('Session terminated');
                          loadAll();
                        } catch (error: any) {
                          toast.error(error?.message || 'Failed to terminate session');
                        }
                      }}>Terminate Session</Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 'devices' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Trusted Devices</Typography>
                <Stack spacing={0.8}>
                  {trustedDevices.map((d) => (
                    <Paper key={d.id} sx={{ p: 1, border: `1px solid ${themeColors.border}` }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{d.name}</Typography>
                      <Typography variant="caption">{d.browser} â€¢ {d.operatingSystem}</Typography>
                      <Typography variant="caption" display="block">Last seen: {format(new Date(d.lastSeenAt), 'dd MMM yyyy, hh:mm a')}</Typography>
                      <Button size="small" color="error" variant="outlined" sx={{ mt: 0.7 }} onClick={() => {
                        try {
                          securityCenterService.removeTrustedDevice(ownerId, currentUserId, d.id);
                          toast.success('Trusted device removed');
                          loadAll();
                        } catch (error: any) {
                          toast.error(error?.message || 'Unable to remove device');
                        }
                      }}>Remove Device</Button>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={7}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}`, mb: 1.2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Add Device</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={4}><TextField fullWidth label="Device Name" value={newDeviceName} onChange={(e) => setNewDeviceName(e.target.value)} /></Grid>
                  <Grid item xs={12} md={3}><TextField fullWidth label="Browser" value={newDeviceBrowser} onChange={(e) => setNewDeviceBrowser(e.target.value)} /></Grid>
                  <Grid item xs={12} md={3}><TextField fullWidth label="Operating System" value={newDeviceOs} onChange={(e) => setNewDeviceOs(e.target.value)} /></Grid>
                  <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={() => {
                    securityCenterService.addTrustedDevice(ownerId, currentUserId, {
                      name: newDeviceName,
                      deviceId: `${newDeviceBrowser}_${newDeviceOs}_${newDeviceName.replace(/\s+/g, '_')}`,
                      browser: newDeviceBrowser,
                      operatingSystem: newDeviceOs,
                    });
                    toast.success('Device added');
                    loadAll();
                  }}>Add</Button></Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}`, mb: 1.2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Device History</Typography>
                <TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}` }}>
                  <Table size="small">
                    <TableHead><TableRow><TableCell>Time</TableCell><TableCell>Type</TableCell><TableCell>Device</TableCell><TableCell>Details</TableCell></TableRow></TableHead>
                    <TableBody>
                      {deviceHistory.map((h) => (
                        <TableRow key={h.id}><TableCell>{format(new Date(h.at), 'dd MMM yyyy, hh:mm a')}</TableCell><TableCell>{h.type}</TableCell><TableCell>{h.device}</TableCell><TableCell>{h.details}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Unknown Device Alerts</Typography>
                <Stack spacing={0.7}>
                  {unknownDeviceAlerts.length === 0 ? <Alert severity="success">No unknown device alerts.</Alert> : unknownDeviceAlerts.map((u) => (
                    <Alert key={u.id} severity="warning" icon={<WarningIcon />}>{u.details} ({format(new Date(u.at), 'dd MMM, hh:mm a')})</Alert>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'login-history' && (
        <TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Event</TableCell>
                <TableCell>Successful</TableCell>
                <TableCell>Device</TableCell>
                <TableCell>Browser</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>IP</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loginHistory.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{format(new Date(row.time), 'dd MMM yyyy, hh:mm a')}</TableCell>
                  <TableCell>{row.user}</TableCell>
                  <TableCell>{row.eventType}</TableCell>
                  <TableCell><Chip size="small" label={row.successful ? 'Success' : 'Failed'} color={row.successful ? 'success' : 'error'} /></TableCell>
                  <TableCell>{row.device}</TableCell>
                  <TableCell>{row.browser}</TableCell>
                  <TableCell>{row.location}</TableCell>
                  <TableCell>{row.ipAddress}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 'twofa' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Two-Factor Authentication</Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} md={3}><FormControl fullWidth><InputLabel>Method</InputLabel><Select value={twoFa.method} label="Method" onChange={(e) => {
                const next = securityCenterService.updateTwoFactorSettings(currentUserId, { method: e.target.value as any });
                setTwoFa(next);
              }}><MenuItem value="authenticator_app">Authenticator App</MenuItem><MenuItem value="email_otp">Email OTP</MenuItem><MenuItem value="sms_otp">SMS OTP (future ready)</MenuItem></Select></FormControl></Grid>
              <Grid item xs={12} md={3}><Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ height: '100%' }}><Typography variant="body2">Enable 2FA</Typography><Switch checked={twoFa.enabled} onChange={(e) => {
                const next = securityCenterService.updateTwoFactorSettings(currentUserId, { enabled: e.target.checked });
                setTwoFa(next);
                toast.success(e.target.checked ? '2FA enabled' : '2FA disabled');
              }} /></Stack></Grid>
              <Grid item xs={12} md={3}><Button fullWidth variant="outlined" onClick={() => {
                const codes = securityCenterService.regenerateRecoveryCodes(currentUserId);
                setTwoFa(securityCenterService.getTwoFactorSettings(currentUserId));
                toast.success(`Recovery codes regenerated (${codes.length})`);
              }}>Regenerate Codes</Button></Grid>
              <Grid item xs={12} md={3}><Button fullWidth variant="contained" startIcon={<CopyIcon />} onClick={() => {
                navigator.clipboard.writeText((twoFa.backupRecoveryCodes || []).join('\n'));
                toast.success('Recovery codes copied');
              }}>Copy Codes</Button></Grid>
            </Grid>
            <Stack direction="row" spacing={0.6} sx={{ mt: 1.2, flexWrap: 'wrap' }}>
              {(twoFa.backupRecoveryCodes || []).map((code: string) => <Chip key={code} label={code} size="small" />)}
            </Stack>
          </CardContent>
        </Card>
      )}

      {tab === 'password-policy' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Password Policy</Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} md={2}><TextField fullWidth label="Minimum Length" value={passwordPolicy.minimumLength} onChange={(e) => setPasswordPolicy((cur: any) => ({ ...cur, minimumLength: Number(e.target.value) }))} /></Grid>
              <Grid item xs={12} md={2}><Stack direction="row" alignItems="center" spacing={1}><Typography variant="body2">Uppercase</Typography><Switch checked={passwordPolicy.uppercase} onChange={(e) => setPasswordPolicy((cur: any) => ({ ...cur, uppercase: e.target.checked }))} /></Stack></Grid>
              <Grid item xs={12} md={2}><Stack direction="row" alignItems="center" spacing={1}><Typography variant="body2">Lowercase</Typography><Switch checked={passwordPolicy.lowercase} onChange={(e) => setPasswordPolicy((cur: any) => ({ ...cur, lowercase: e.target.checked }))} /></Stack></Grid>
              <Grid item xs={12} md={2}><Stack direction="row" alignItems="center" spacing={1}><Typography variant="body2">Number</Typography><Switch checked={passwordPolicy.number} onChange={(e) => setPasswordPolicy((cur: any) => ({ ...cur, number: e.target.checked }))} /></Stack></Grid>
              <Grid item xs={12} md={2}><Stack direction="row" alignItems="center" spacing={1}><Typography variant="body2">Special Character</Typography><Switch checked={passwordPolicy.specialCharacter} onChange={(e) => setPasswordPolicy((cur: any) => ({ ...cur, specialCharacter: e.target.checked }))} /></Stack></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth label="Expiry Days" value={passwordPolicy.passwordExpiryDays} onChange={(e) => setPasswordPolicy((cur: any) => ({ ...cur, passwordExpiryDays: Number(e.target.value) }))} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="Password History" value={passwordPolicy.passwordHistoryCount} onChange={(e) => setPasswordPolicy((cur: any) => ({ ...cur, passwordHistoryCount: Number(e.target.value) }))} /></Grid>
              <Grid item xs={12} md={9}><Button variant="contained" onClick={() => {
                if (!guardManage()) return;
                const next = securityCenterService.updatePasswordPolicy(ownerId, passwordPolicy);
                setPasswordPolicy(next);
                toast.success('Password policy updated');
                loadAll();
              }}>Save Password Policy</Button></Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {tab === 'permission-audit' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={4}>{statCard('Permission Changes', permissionAudit.permissionChanges, '#1D4ED8')}</Grid>
          <Grid item xs={12} sm={4}>{statCard('Unauthorized Attempts', permissionAudit.unauthorizedAttempts, '#DC2626')}</Grid>
          <Grid item xs={12} sm={4}>{statCard('Admin Actions', permissionAudit.adminActions, '#0F766E')}</Grid>
          <Grid item xs={12}>
            <TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>User</TableCell><TableCell>Role</TableCell><TableCell>Permission Count</TableCell></TableRow></TableHead>
                <TableBody>
                  {permissionAudit.users.map((row: any) => (
                    <TableRow key={`${row.user}_${row.role}`}><TableCell>{row.user}</TableCell><TableCell>{row.role}</TableCell><TableCell>{row.permissions}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {tab === 'sensitive-actions' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Sensitive Actions Confirmation Policy</Typography>
            <Stack spacing={0.7}>
              {sensitiveActions.map((row: any) => (
                <Paper key={row.key} sx={{ p: 1, border: `1px solid ${themeColors.border}` }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.label}</Typography>
                    <Switch checked={row.requireAdditionalConfirmation} onChange={(e) => {
                      if (!guardManage()) return;
                      const next = securityCenterService.updateSensitiveAction(ownerId, row.key, e.target.checked);
                      setSensitiveActions(next);
                      toast.success('Sensitive action policy updated');
                    }} disabled={!ctx.canManageSecurity} />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {tab === 'export-logs' && (
        <Box>
          <TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2, mb: 1.2 }}>
            <Table size="small">
              <TableHead><TableRow><TableCell>Timestamp</TableCell><TableCell>User</TableCell><TableCell>Action</TableCell><TableCell>Module</TableCell><TableCell>Status</TableCell><TableCell>Details</TableCell></TableRow></TableHead>
              <TableBody>
                {exportLogs.map((row) => (
                  <TableRow key={row.id}><TableCell>{format(new Date(row.timestamp), 'dd MMM yyyy, hh:mm a')}</TableCell><TableCell>{row.user}</TableCell><TableCell>{row.action}</TableCell><TableCell>{row.module}</TableCell><TableCell>{row.status}</TableCell><TableCell>{row.details}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => {
              if (!ctx.canExportAuditReports) {
                toast.error('Only Owner and Security Admin can export audit reports');
                return;
              }
              const csv = securityCenterService.toCsvAudit(exportLogs);
              downloadText('data_export_logs.csv', csv);
            }}>Export CSV</Button>
          </Stack>
        </Box>
      )}

      {tab === 'notifications' && (
        <Stack spacing={0.7}>
          {notifications.map((note) => (
            <Alert key={note.id} icon={<NotificationIcon />} severity={note.severity} onClose={() => {
              securityCenterService.markNotificationRead(ownerId, note.id);
              setNotifications((prev) => prev.filter((item) => item.id !== note.id));
            }}>{note.message}</Alert>
          ))}
        </Stack>
      )}

      {tab === 'api-security' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Manage API Security</Typography>
                <Stack spacing={1}>
                  <TextField fullWidth label="API Key Name" value={newApiKeyName} onChange={(e) => setNewApiKeyName(e.target.value)} />
                  <TextField fullWidth type="datetime-local" label="Expiration" value={newApiKeyExpiry} onChange={(e) => setNewApiKeyExpiry(e.target.value)} InputLabelProps={{ shrink: true }} />
                  <TextField fullWidth label="IP Restrictions" value={newApiKeyIps} onChange={(e) => setNewApiKeyIps(e.target.value)} helperText="Comma separated IPs" />
                  <TextField fullWidth label="Rate Limit / min" value={newApiKeyRate} onChange={(e) => setNewApiKeyRate(e.target.value)} />
                  <Button variant="contained" startIcon={<KeyIcon />} onClick={() => {
                    if (!guardManage()) return;
                    securityCenterService.createApiSecurityKey(ownerId, {
                      name: newApiKeyName,
                      expiresAt: newApiKeyExpiry ? new Date(newApiKeyExpiry).toISOString() : undefined,
                      ipRestrictions: newApiKeyIps.split(',').map((ip) => ip.trim()).filter(Boolean),
                      rateLimitPerMin: Number(newApiKeyRate),
                    });
                    toast.success('API key created');
                    loadAll();
                  }} disabled={!ctx.canManageApiKeys}>Create API Key</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={7}>
            <TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Key</TableCell><TableCell>Expires</TableCell><TableCell>IP Restrictions</TableCell><TableCell>Rate</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell>{key.name}</TableCell>
                      <TableCell>{key.keyMasked}</TableCell>
                      <TableCell>{key.expiresAt ? format(new Date(key.expiresAt), 'dd MMM yyyy') : '-'}</TableCell>
                      <TableCell>{(key.ipRestrictions || []).join(', ') || '-'}</TableCell>
                      <TableCell>{key.rateLimitPerMin}/min</TableCell>
                      <TableCell><Chip size="small" label={key.active ? 'Active' : 'Revoked'} color={key.active ? 'success' : 'default'} /></TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Button size="small" variant="outlined" onClick={() => {
                            if (!guardManage()) return;
                            securityCenterService.regenerateApiSecurityKey(ownerId, key.id);
                            toast.success('API key regenerated');
                            loadAll();
                          }} disabled={!ctx.canManageApiKeys || !key.active}>Regenerate</Button>
                          <Button size="small" variant="outlined" color="error" onClick={() => {
                            if (!guardManage()) return;
                            securityCenterService.revokeApiSecurityKey(ownerId, key.id);
                            toast.success('API key revoked');
                            loadAll();
                          }} disabled={!ctx.canManageApiKeys || !key.active}>Revoke</Button>
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

      {tab === 'backup-recovery' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={3}>{statCard('Last Backup', format(new Date(backup.lastBackup), 'dd MMM yyyy, hh:mm a'), '#1D4ED8')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Backup Status', backup.backupStatus, backup.backupStatus === 'healthy' ? '#0F766E' : '#DC2626')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Restore Points', backup.restorePoints.length, '#9333EA')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('DB Backup Status', backup.databaseBackupStatus, backup.databaseBackupStatus === 'healthy' ? '#0F766E' : '#DC2626')}</Grid>
          <Grid item xs={12}><Button variant="contained" onClick={() => {
            if (!guardManage()) return;
            securityCenterService.createRestorePoint(ownerId);
            toast.success('Restore point created');
            loadAll();
          }}>Create Restore Point</Button></Grid>
          <Grid item xs={12}>
            <TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}>
              <Table size="small"><TableHead><TableRow><TableCell>Restore Point</TableCell><TableCell>Created At</TableCell><TableCell>Status</TableCell></TableRow></TableHead><TableBody>{backup.restorePoints.map((rp: any) => <TableRow key={rp.id}><TableCell>{rp.id}</TableCell><TableCell>{format(new Date(rp.at), 'dd MMM yyyy, hh:mm a')}</TableCell><TableCell>{rp.status}</TableCell></TableRow>)}</TableBody></Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {tab === 'compliance' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Compliance</Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} md={2}><Stack direction="row" alignItems="center" spacing={1}><Typography variant="body2">GDPR</Typography><Switch checked={compliance.gdpr} onChange={(e) => setCompliance((cur: any) => ({ ...cur, gdpr: e.target.checked }))} /></Stack></Grid>
              <Grid item xs={12} md={2}><Stack direction="row" alignItems="center" spacing={1}><Typography variant="body2">CCPA</Typography><Switch checked={compliance.ccpa} onChange={(e) => setCompliance((cur: any) => ({ ...cur, ccpa: e.target.checked }))} /></Stack></Grid>
              <Grid item xs={12} md={2}><Stack direction="row" alignItems="center" spacing={1}><Typography variant="body2">SOC 2</Typography><Switch checked={compliance.soc2} onChange={(e) => setCompliance((cur: any) => ({ ...cur, soc2: e.target.checked }))} /></Stack></Grid>
              <Grid item xs={12} md={2}><Stack direction="row" alignItems="center" spacing={1}><Typography variant="body2">ISO 27001</Typography><Switch checked={compliance.iso27001} onChange={(e) => setCompliance((cur: any) => ({ ...cur, iso27001: e.target.checked }))} /></Stack></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth label="Retention Days" value={compliance.dataRetentionDays} onChange={(e) => setCompliance((cur: any) => ({ ...cur, dataRetentionDays: Number(e.target.value) }))} /></Grid>
              <Grid item xs={12} md={2}><Stack direction="row" alignItems="center" spacing={1}><Typography variant="body2">Consent Mgmt</Typography><Switch checked={compliance.consentManagementEnabled} onChange={(e) => setCompliance((cur: any) => ({ ...cur, consentManagementEnabled: e.target.checked }))} /></Stack></Grid>
              <Grid item xs={12}><Button variant="contained" onClick={() => {
                if (!guardManage()) return;
                const next = securityCenterService.updateComplianceConfig(ownerId, compliance);
                setCompliance(next);
                toast.success('Compliance configuration updated');
              }}>Save Compliance</Button></Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {tab === 'privacy-controls' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Privacy Controls</Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} md={3}><Stack direction="row" alignItems="center" spacing={1}><Typography variant="body2">Cookies</Typography><Switch checked={privacy.cookiesEnabled} onChange={(e) => setPrivacy((cur: any) => ({ ...cur, cookiesEnabled: e.target.checked }))} /></Stack></Grid>
              <Grid item xs={12} md={3}><Stack direction="row" alignItems="center" spacing={1}><Typography variant="body2">Consent</Typography><Switch checked={privacy.consentGiven} onChange={(e) => setPrivacy((cur: any) => ({ ...cur, consentGiven: e.target.checked }))} /></Stack></Grid>
              <Grid item xs={12} md={6}><Button variant="outlined" onClick={() => {
                const next = securityCenterService.updatePrivacyControls(currentUserId, privacy);
                setPrivacy(next);
                toast.success('Privacy preferences updated');
              }}>Save Preferences</Button></Grid>
              <Grid item xs={12} md={4}><Button fullWidth variant="outlined" onClick={async () => {
                const text = await securityCenterService.downloadPersonalData(ownerId, currentUserId);
                downloadText('personal_data_export.txt', text);
                toast.success('Personal data export downloaded');
              }}>Download Personal Data</Button></Grid>
              <Grid item xs={12} md={4}><Button fullWidth variant="outlined" color="warning" onClick={() => {
                securityCenterService.requestDeleteAccount(currentUserId);
                toast.success('Delete account request submitted');
              }}>Delete Account</Button></Grid>
              <Grid item xs={12} md={4}><Button fullWidth variant="outlined" color="error" onClick={() => {
                securityCenterService.requestDeleteCompanyData(currentUserId);
                toast.success('Delete company data request submitted');
              }}>Delete Company Data</Button></Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {tab === 'reports' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Reports</Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} md={3}><FormControl fullWidth><InputLabel>Format</InputLabel><Select value={reportFormat} label="Format" onChange={(e) => setReportFormat(e.target.value as any)}><MenuItem value="pdf">PDF</MenuItem><MenuItem value="excel">Excel</MenuItem><MenuItem value="csv">CSV</MenuItem></Select></FormControl></Grid>
              <Grid item xs={12} md={9}><Alert severity="info">Generate Security Report, Audit Report, Login Report, Permission Report, and Compliance Report.</Alert></Grid>
              <Grid item xs={12}><Stack direction="row" spacing={0.8} flexWrap="wrap">
                <Button variant="contained" startIcon={<DownloadIcon />} onClick={async () => {
                  if (!ctx.canExportAuditReports) {
                    toast.error('Only Owner and Security Admin can export reports');
                    return;
                  }
                  const reports = await securityCenterService.generateReports(ownerId, currentUserId);
                  downloadText(`security_report.${reportFormat}`, securityCenterService.getExportFormatPayload(reports.securityReport, reportFormat));
                }}>Security Report</Button>
                <Button variant="outlined" onClick={async () => {
                  if (!ctx.canExportAuditReports) {
                    toast.error('Only Owner and Security Admin can export reports');
                    return;
                  }
                  const reports = await securityCenterService.generateReports(ownerId, currentUserId);
                  downloadText(`audit_report.${reportFormat}`, securityCenterService.getExportFormatPayload(reports.auditReport, reportFormat));
                }}>Audit Report</Button>
                <Button variant="outlined" onClick={async () => {
                  if (!ctx.canExportAuditReports) {
                    toast.error('Only Owner and Security Admin can export reports');
                    return;
                  }
                  const reports = await securityCenterService.generateReports(ownerId, currentUserId);
                  downloadText(`login_report.${reportFormat}`, securityCenterService.getExportFormatPayload(reports.loginReport, reportFormat));
                }}>Login Report</Button>
                <Button variant="outlined" onClick={async () => {
                  if (!ctx.canExportAuditReports) {
                    toast.error('Only Owner and Security Admin can export reports');
                    return;
                  }
                  const reports = await securityCenterService.generateReports(ownerId, currentUserId);
                  downloadText(`permission_report.${reportFormat}`, securityCenterService.getExportFormatPayload(reports.permissionReport, reportFormat));
                }}>Permission Report</Button>
                <Button variant="outlined" onClick={async () => {
                  if (!ctx.canExportAuditReports) {
                    toast.error('Only Owner and Security Admin can export reports');
                    return;
                  }
                  const reports = await securityCenterService.generateReports(ownerId, currentUserId);
                  downloadText(`compliance_report.${reportFormat}`, securityCenterService.getExportFormatPayload(reports.complianceReport, reportFormat));
                }}>Compliance Report</Button>
              </Stack></Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {tab === 'alerts' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={4}>{statCard('High Risk Login', alertsDashboard.highRiskLogin, '#DC2626')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Multiple Failed Attempts', alertsDashboard.multipleFailedAttempts, '#C2410C')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Large Data Export', alertsDashboard.largeDataExport, '#D97706')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Permission Escalation', alertsDashboard.permissionEscalation, '#9333EA')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('API Abuse', alertsDashboard.apiAbuse, '#0E7490')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Inactive Accounts', alertsDashboard.inactiveAccounts, '#0369A1')}</Grid>
        </Grid>
      )}

      {tab === 'integration' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Cross-Module Integration Signals</Typography>
                <Stack spacing={0.7}>
                  <Alert severity="success">Team Management: {integrationSignals.teamMembers} members tracked for permission and security monitoring.</Alert>
                  <Alert severity="success">Billing: {integrationSignals.billingEvents} billing events included in audit trace.</Alert>
                  <Alert severity="success">AI Assistant: {integrationSignals.aiRequests} AI requests included in usage and security tracking.</Alert>
                  <Alert severity="success">Messaging: {integrationSignals.messages} conversation records observed for security events.</Alert>
                  <Alert severity="success">Interview Management: {integrationSignals.interviews} interview events mapped to audit history.</Alert>
                  <Alert severity="success">Automation Center: {integrationSignals.automationRuns} automation runs monitored for security actions.</Alert>
                  <Alert severity="success">Analytics: {integrationSignals.analyticsApplicationVolume} application analytics signal linked to dashboard risk.</Alert>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Dashboard Risk Signal</Typography>
                <Typography variant="h3" sx={{ fontWeight: 800, color: '#1D4ED8' }}>{integrationSignals.dashboardRiskSignal}</Typography>
                <Typography variant="body2" sx={{ color: themeColors.text.secondary, mt: 1 }}>
                  Composite signal based on billing events, AI usage, automation runs, and activity patterns.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </MotionBox>
  );
};
