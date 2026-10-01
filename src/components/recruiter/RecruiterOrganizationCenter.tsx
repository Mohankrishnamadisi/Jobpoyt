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
  Apartment as OrgIcon,
  CloudUpload as ImportIcon,
  Download as DownloadIcon,
  Domain as DomainIcon,
  Lock as IsolationIcon,
  Palette as BrandingIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { themeColors } from '@styles/recruiterTheme';
import { organizationSaasService } from '@services/organizationSaas';

interface RecruiterOrganizationCenterProps {
  ownerId: string;
  currentUserId: string;
}

type OrgTab =
  | 'dashboard'
  | 'profile'
  | 'isolation'
  | 'branding'
  | 'domain'
  | 'career-portal'
  | 'settings'
  | 'departments'
  | 'business-units'
  | 'workspace'
  | 'roles'
  | 'storage'
  | 'analytics'
  | 'emails-notifications'
  | 'features'
  | 'billing'
  | 'security'
  | 'reports'
  | 'backup'
  | 'import'
  | 'api'
  | 'super-admin';

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
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const RecruiterOrganizationCenter: React.FC<RecruiterOrganizationCenterProps> = ({ ownerId, currentUserId }) => {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const tenantId = useMemo(() => `tenant_${ownerId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)}`, [ownerId]);

  const [tab, setTab] = useState<OrgTab>('dashboard');
  const [loading, setLoading] = useState(true);

  const [dashboard, setDashboard] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isolation, setIsolation] = useState<any>(null);
  const [branding, setBranding] = useState<any>(null);
  const [domains, setDomains] = useState<any[]>([]);
  const [careerPortal, setCareerPortal] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [businessUnits, setBusinessUnits] = useState<any[]>([]);
  const [workspace, setWorkspace] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [storage, setStorage] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [whiteLabel, setWhiteLabel] = useState<any>(null);
  const [features, setFeatures] = useState<any>(null);
  const [billing, setBilling] = useState<any>(null);
  const [security, setSecurity] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [backup, setBackup] = useState<any>(null);
  const [orgApi, setOrgApi] = useState<any>(null);
  const [superOrgs, setSuperOrgs] = useState<any[]>([]);
  const [platformStats, setPlatformStats] = useState<any>(null);
  const [scaleReadiness, setScaleReadiness] = useState<any>(null);

  const [newDomain, setNewDomain] = useState('careers.company.com');
  const [importEntity, setImportEntity] = useState<'recruiters' | 'candidates' | 'jobs' | 'departments' | 'tags'>('departments');
  const [importCsv, setImportCsv] = useState('name\nEngineering\nProduct\nDesign');
  const [newDepartment, setNewDepartment] = useState('Custom Department');
  const [newBusinessUnit, setNewBusinessUnit] = useState('Global Hiring Unit');
  const [newWebhookUrl, setNewWebhookUrl] = useState('https://hooks.example.com/org/events');
  const [allowedDomainsInput, setAllowedDomainsInput] = useState('company.com,subsidiary.com');
  const [superAdminNote, setSuperAdminNote] = useState('Need onboarding support for API migration.');

  const canManage = useMemo(() => {
    try {
      return organizationSaasService.getOrganizationRoles().includes('owner') && true;
    } catch {
      return false;
    }
  }, []);

  const loadAll = async (): Promise<void> => {
    setLoading(true);
    try {
      organizationSaasService.ensureTenant(tenantId, ownerId, 'Organization');
      const [
        nextDashboard,
        nextProfile,
        nextIsolation,
        nextBranding,
        nextDomains,
        nextCareer,
        nextSettings,
        nextDepartments,
        nextBusinessUnits,
        nextWorkspace,
        nextStorage,
        nextAnalytics,
        nextWhiteLabel,
        nextFeatures,
        nextBilling,
        nextSecurity,
        nextReports,
        nextBackup,
        nextOrgApi,
        nextSuperOrgs,
        nextPlatform,
        nextScale,
      ] = await Promise.all([
        organizationSaasService.getOrganizationDashboard(tenantId, ownerId),
        Promise.resolve(organizationSaasService.getOrganizationProfile(tenantId, ownerId)),
        Promise.resolve(organizationSaasService.getTenantIsolationCheck(tenantId, ownerId)),
        Promise.resolve(organizationSaasService.getBranding(tenantId, ownerId)),
        Promise.resolve(organizationSaasService.listCustomDomains(tenantId, ownerId)),
        organizationSaasService.getCareerPortalPreview(tenantId, ownerId),
        Promise.resolve(organizationSaasService.getOrganizationSettings(tenantId, ownerId)),
        Promise.resolve(organizationSaasService.listDepartments(tenantId, ownerId)),
        Promise.resolve(organizationSaasService.listBusinessUnits(tenantId, ownerId)),
        Promise.resolve(organizationSaasService.getRecruiterWorkspace(tenantId, ownerId, currentUserId)),
        organizationSaasService.getStorageStats(tenantId, ownerId),
        organizationSaasService.getOrganizationAnalytics(tenantId, ownerId),
        organizationSaasService.getWhiteLabelArtifacts(tenantId, ownerId),
        Promise.resolve(organizationSaasService.getFeatureFlags(tenantId, ownerId)),
        organizationSaasService.getOrganizationBillingSummary(tenantId, ownerId),
        Promise.resolve(organizationSaasService.getOrganizationSecuritySummary(tenantId, ownerId)),
        organizationSaasService.generateOrganizationReports(tenantId, ownerId),
        organizationSaasService.getBackupStatus(tenantId, ownerId),
        Promise.resolve(organizationSaasService.getOrganizationApi(tenantId, ownerId)),
        organizationSaasService.listSuperAdminOrganizations(),
        organizationSaasService.getPlatformAnalytics(),
        organizationSaasService.getTenantScalabilityReadiness(),
      ]);

      setDashboard(nextDashboard);
      setProfile(nextProfile);
      setIsolation(nextIsolation);
      setBranding(nextBranding);
      setDomains(nextDomains);
      setCareerPortal(nextCareer);
      setSettings(nextSettings);
      setDepartments(nextDepartments);
      setBusinessUnits(nextBusinessUnits);
      setWorkspace(nextWorkspace);
      setRoles(organizationSaasService.getOrganizationRoles());
      setStorage(nextStorage);
      setAnalytics(nextAnalytics);
      setWhiteLabel(nextWhiteLabel);
      setFeatures(nextFeatures);
      setBilling(nextBilling);
      setSecurity(nextSecurity);
      setReports(nextReports);
      setBackup(nextBackup);
      setOrgApi(nextOrgApi);
      setSuperOrgs(nextSuperOrgs);
      setPlatformStats(nextPlatform);
      setScaleReadiness(nextScale);
      setAllowedDomainsInput(organizationSaasService.getAllowedDomains(tenantId, ownerId).join(','));
    } catch (error) {
      console.error('organization center load failed', error);
      toast.error('Failed to load organization center');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [ownerId, currentUserId]);

  if (loading || !dashboard || !profile || !isolation || !branding || !careerPortal || !settings || !workspace || !storage || !analytics || !whiteLabel || !features || !billing || !security || !reports || !backup || !orgApi || !platformStats || !scaleReadiness) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>Loading organization center...</Typography>
      </Box>
    );
  }

  return (
    <MotionBox initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <RecruiterPageHero
        eyebrow="Company"
        icon={<OrgIcon />}
        title="Organization Platform"
        description="Organization controls, tenant isolation, white-label branding, domain, API, billing, security, analytics, and super-admin architecture."
        stats={[
          { label: 'Tenant', value: tenantId },
          { label: 'Isolation score', value: isolation.score, tone: 'ok' },
        ]}
      />

      <Paper sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}`, mb: 2 }}>
        <Tabs value={tab} onChange={(_, value: OrgTab) => setTab(value)} variant={isTablet ? 'scrollable' : 'scrollable'} scrollButtons="auto" allowScrollButtonsMobile sx={{ minHeight: 54, px: 0.5, '& .MuiTabs-scroller': { overflowX: 'auto !important' }, '& .MuiTabs-scrollButtons': { width: 34, borderRadius: 1, mx: 0.5 }, '& .MuiTab-root': { textTransform: 'none', whiteSpace: 'nowrap', minHeight: 54, minWidth: 'max-content', px: 1.8, fontWeight: 700, fontSize: '0.82rem' } }}>
          <Tab value="dashboard" label="Dashboard" />
          <Tab value="profile" label="Organization Profile" />
          <Tab value="isolation" label="Isolation" />
          <Tab value="branding" label="Branding" />
          <Tab value="domain" label="Custom Domain" />
          <Tab value="career-portal" label="Career Portal" />
          <Tab value="settings" label="Settings" />
          <Tab value="departments" label="Departments" />
          <Tab value="business-units" label="Business Units" />
          <Tab value="workspace" label="Recruiter Workspace" />
          <Tab value="roles" label="Org Roles" />
          <Tab value="storage" label="Storage" />
          <Tab value="analytics" label="Org Analytics" />
          <Tab value="emails-notifications" label="White-label" />
          <Tab value="features" label="Feature Mgmt" />
          <Tab value="billing" label="Org Billing" />
          <Tab value="security" label="Org Security" />
          <Tab value="reports" label="Org Reports" />
          <Tab value="backup" label="Backup" />
          <Tab value="import" label="Import" />
          <Tab value="api" label="Organization API" />
          <Tab value="super-admin" label="Super Admin" />
        </Tabs>
      </Paper>

      {tab === 'dashboard' && (
        <Grid container spacing={1.4}>
          <Grid item xs={12} sm={6} md={4}>{statCard('Organization Name', dashboard.organizationName, '#1D4ED8')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Current Plan', dashboard.currentPlan, '#0F766E')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Active Recruiters', dashboard.activeRecruiters, '#9333EA')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Open Jobs', dashboard.openJobs, '#0369A1')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Applications', dashboard.applications, '#0E7490')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Credits Remaining', dashboard.creditsRemaining, '#C2410C')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Storage Used', `${dashboard.storageUsedGb} GB`, '#D97706')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('AI Usage', dashboard.aiUsage, '#7C3AED')}</Grid>
        </Grid>
      )}

      {tab === 'profile' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Organization Profile</Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} md={3}><TextField fullWidth label="Organization Name" value={profile.organizationName} onChange={(e) => setProfile((cur: any) => ({ ...cur, organizationName: e.target.value }))} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="Legal Name" value={profile.legalName} onChange={(e) => setProfile((cur: any) => ({ ...cur, legalName: e.target.value }))} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="Company Logo" value={profile.logoUrl} onChange={(e) => setProfile((cur: any) => ({ ...cur, logoUrl: e.target.value }))} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="Favicon" value={profile.faviconUrl} onChange={(e) => setProfile((cur: any) => ({ ...cur, faviconUrl: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth label="Brand Color" value={profile.brandColor} onChange={(e) => setProfile((cur: any) => ({ ...cur, brandColor: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth label="Secondary Color" value={profile.secondaryColor} onChange={(e) => setProfile((cur: any) => ({ ...cur, secondaryColor: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth label="Website" value={profile.website} onChange={(e) => setProfile((cur: any) => ({ ...cur, website: e.target.value }))} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="Career Domain" value={profile.careerDomain} onChange={(e) => setProfile((cur: any) => ({ ...cur, careerDomain: e.target.value }))} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="Support Email" value={profile.supportEmail} onChange={(e) => setProfile((cur: any) => ({ ...cur, supportEmail: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth label="Phone" value={profile.phone} onChange={(e) => setProfile((cur: any) => ({ ...cur, phone: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth label="Address" value={profile.address} onChange={(e) => setProfile((cur: any) => ({ ...cur, address: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth label="Country" value={profile.country} onChange={(e) => setProfile((cur: any) => ({ ...cur, country: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth label="Timezone" value={profile.timezone} onChange={(e) => setProfile((cur: any) => ({ ...cur, timezone: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth label="Currency" value={profile.currency} onChange={(e) => setProfile((cur: any) => ({ ...cur, currency: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth label="Language" value={profile.language} onChange={(e) => setProfile((cur: any) => ({ ...cur, language: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth label="Tax Details" value={profile.taxDetails} onChange={(e) => setProfile((cur: any) => ({ ...cur, taxDetails: e.target.value }))} /></Grid>
              <Grid item xs={12}><Button variant="contained" onClick={() => {
                try {
                  const next = organizationSaasService.updateOrganizationProfile(tenantId, ownerId, currentUserId, profile);
                  setProfile(next);
                  toast.success('Organization profile updated');
                } catch (error: any) {
                  toast.error(error?.message || 'Unable to update profile');
                }
              }}>Save Profile</Button></Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {tab === 'isolation' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}>{statCard('Isolation Score', isolation.score, '#0F766E')}</Grid>
          <Grid item xs={12} md={8}><Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Isolation Matrix</Typography><Stack direction="row" spacing={0.6} sx={{ flexWrap: 'wrap' }}>{Object.entries(isolation.isolatedEntities).map(([k, v]) => <Chip key={k} label={`${k}: ${v ? 'Isolated' : 'Risk'}`} color={v ? 'success' : 'error'} size="small" />)}</Stack><Stack spacing={0.7} sx={{ mt: 1 }}>{isolation.notes.map((n: string) => <Alert key={n} severity="info" icon={<IsolationIcon />}>{n}</Alert>)}</Stack></CardContent></Card></Grid>
        </Grid>
      )}

      {tab === 'branding' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Custom Branding</Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} md={3}><TextField fullWidth label="Logo" value={branding.logoUrl} onChange={(e) => setBranding((cur: any) => ({ ...cur, logoUrl: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth label="Primary Color" value={branding.primaryColor} onChange={(e) => setBranding((cur: any) => ({ ...cur, primaryColor: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth label="Secondary Color" value={branding.secondaryColor} onChange={(e) => setBranding((cur: any) => ({ ...cur, secondaryColor: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth label="Fonts" value={branding.fontFamily} onChange={(e) => setBranding((cur: any) => ({ ...cur, fontFamily: e.target.value }))} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="Login Page" value={branding.loginPageTheme} onChange={(e) => setBranding((cur: any) => ({ ...cur, loginPageTheme: e.target.value }))} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="Dashboard Theme" value={branding.recruiterDashboardTheme} onChange={(e) => setBranding((cur: any) => ({ ...cur, recruiterDashboardTheme: e.target.value }))} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="Career Theme" value={branding.careerPageTheme} onChange={(e) => setBranding((cur: any) => ({ ...cur, careerPageTheme: e.target.value }))} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="Email Template" value={branding.emailTemplateStyle} onChange={(e) => setBranding((cur: any) => ({ ...cur, emailTemplateStyle: e.target.value }))} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="Email Footer" value={branding.emailFooter} onChange={(e) => setBranding((cur: any) => ({ ...cur, emailFooter: e.target.value }))} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="Reply-To" value={branding.replyToEmail} onChange={(e) => setBranding((cur: any) => ({ ...cur, replyToEmail: e.target.value }))} /></Grid>
              <Grid item xs={12} md={3}><FormControl fullWidth><InputLabel>Button Style</InputLabel><Select label="Button Style" value={branding.buttonStyle} onChange={(e) => setBranding((cur: any) => ({ ...cur, buttonStyle: e.target.value }))}><MenuItem value="rounded">Rounded</MenuItem><MenuItem value="square">Square</MenuItem><MenuItem value="pill">Pill</MenuItem></Select></FormControl></Grid>
              <Grid item xs={12} md={3}><Button fullWidth variant="contained" startIcon={<BrandingIcon />} onClick={() => {
                try {
                  const next = organizationSaasService.updateBranding(tenantId, ownerId, currentUserId, branding);
                  setBranding(next);
                  toast.success('Branding updated');
                  loadAll();
                } catch (error: any) {
                  toast.error(error?.message || 'Unable to update branding');
                }
              }}>Save Branding</Button></Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {tab === 'domain' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}><Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Add Custom Domain</Typography><TextField fullWidth label="Domain" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} /><Button sx={{ mt: 1 }} variant="contained" startIcon={<DomainIcon />} onClick={() => {
            try {
              organizationSaasService.addCustomDomain(tenantId, ownerId, currentUserId, newDomain);
              toast.success('Domain added');
              loadAll();
            } catch (error: any) {
              toast.error(error?.message || 'Unable to add domain');
            }
          }}>Add Domain</Button></CardContent></Card></Grid>
          <Grid item xs={12} md={8}><TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}><Table size="small"><TableHead><TableRow><TableCell>Domain</TableCell><TableCell>SSL</TableCell><TableCell>Verified</TableCell><TableCell>DNS Instructions</TableCell><TableCell align="right">Action</TableCell></TableRow></TableHead><TableBody>{domains.map((d) => <TableRow key={d.id}><TableCell>{d.domain}</TableCell><TableCell>{d.sslEnabled ? 'Enabled' : 'Pending'}</TableCell><TableCell>{d.verified ? 'Yes' : 'No'}</TableCell><TableCell>{(d.dnsInstructions || []).join(' | ')}</TableCell><TableCell align="right"><Button size="small" variant="outlined" onClick={() => {
            try {
              organizationSaasService.verifyDomain(tenantId, ownerId, currentUserId, d.id);
              toast.success('Domain verified and SSL enabled');
              loadAll();
            } catch (error: any) {
              toast.error(error?.message || 'Unable to verify domain');
            }
          }} disabled={d.verified}>Verify</Button></TableCell></TableRow>)}</TableBody></Table></TableContainer></Grid>
        </Grid>
      )}

      {tab === 'career-portal' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Career Portal Preview</Typography>
            <Typography variant="body2" sx={{ mb: 1, color: themeColors.text.secondary }}>Domain: {careerPortal.domain}</Typography>
            <Stack direction="row" spacing={0.7} sx={{ mb: 1, flexWrap: 'wrap' }}>
              {careerPortal.departments.map((d: string) => <Chip key={d} label={d} size="small" />)}
            </Stack>
            <TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}` }}>
              <Table size="small"><TableHead><TableRow><TableCell>Job</TableCell><TableCell>Department</TableCell><TableCell>Location</TableCell></TableRow></TableHead><TableBody>{careerPortal.jobs.map((j: any) => <TableRow key={j.id}><TableCell>{j.title}</TableCell><TableCell>{j.department}</TableCell><TableCell>{j.location}</TableCell></TableRow>)}</TableBody></Table>
            </TableContainer>
            <Alert severity="info" sx={{ mt: 1 }}>Career portal includes branding, open jobs, departments, search, benefits, culture, and apply flow.</Alert>
          </CardContent>
        </Card>
      )}

      {tab === 'settings' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Organization Settings</Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} md={3}><TextField fullWidth label="Business Hours" value={settings.businessHours} onChange={(e) => setSettings((cur: any) => ({ ...cur, businessHours: e.target.value }))} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="Timezone" value={settings.timezone} onChange={(e) => setSettings((cur: any) => ({ ...cur, timezone: e.target.value }))} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="Working Days (comma)" value={settings.workingDays.join(',')} onChange={(e) => setSettings((cur: any) => ({ ...cur, workingDays: e.target.value.split(',').map((x: string) => x.trim()).filter(Boolean) }))} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="Default Language" value={settings.defaultLanguage} onChange={(e) => setSettings((cur: any) => ({ ...cur, defaultLanguage: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth label="Retention Days" value={settings.dataRetentionDays} onChange={(e) => setSettings((cur: any) => ({ ...cur, dataRetentionDays: Number(e.target.value) }))} /></Grid>
              <Grid item xs={12} md={10}><Stack direction="row" spacing={1.2} sx={{ flexWrap: 'wrap' }}><Stack direction="row" spacing={0.6} alignItems="center"><Typography variant="body2">Email</Typography><Switch checked={settings.notificationSettings.email} onChange={(e) => setSettings((cur: any) => ({ ...cur, notificationSettings: { ...cur.notificationSettings, email: e.target.checked } }))} /></Stack><Stack direction="row" spacing={0.6} alignItems="center"><Typography variant="body2">Push</Typography><Switch checked={settings.notificationSettings.push} onChange={(e) => setSettings((cur: any) => ({ ...cur, notificationSettings: { ...cur.notificationSettings, push: e.target.checked } }))} /></Stack><Stack direction="row" spacing={0.6} alignItems="center"><Typography variant="body2">Slack</Typography><Switch checked={settings.notificationSettings.slack} onChange={(e) => setSettings((cur: any) => ({ ...cur, notificationSettings: { ...cur.notificationSettings, slack: e.target.checked } }))} /></Stack><Stack direction="row" spacing={0.6} alignItems="center"><Typography variant="body2">PII Masking</Typography><Switch checked={settings.privacySettings.piiMasking} onChange={(e) => setSettings((cur: any) => ({ ...cur, privacySettings: { ...cur.privacySettings, piiMasking: e.target.checked } }))} /></Stack></Stack></Grid>
              <Grid item xs={12}><Button variant="contained" startIcon={<SettingsIcon />} onClick={() => {
                try {
                  const next = organizationSaasService.updateOrganizationSettings(tenantId, ownerId, currentUserId, settings);
                  setSettings(next);
                  toast.success('Organization settings updated');
                } catch (error: any) {
                  toast.error(error?.message || 'Unable to update settings');
                }
              }}>Save Settings</Button></Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {tab === 'departments' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}><Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Create Department</Typography><TextField fullWidth label="Department Name" value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} /><Button sx={{ mt: 1 }} variant="contained" onClick={() => {
            try {
              organizationSaasService.createDepartment(tenantId, ownerId, currentUserId, newDepartment);
              toast.success('Department created');
              loadAll();
            } catch (error: any) {
              toast.error(error?.message || 'Unable to create department');
            }
          }}>Create</Button></CardContent></Card></Grid>
          <Grid item xs={12} md={8}><TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}><Table size="small"><TableHead><TableRow><TableCell>Department</TableCell><TableCell>Recruiters</TableCell><TableCell>Jobs</TableCell></TableRow></TableHead><TableBody>{departments.map((d: any) => <TableRow key={d.id}><TableCell>{d.name}</TableCell><TableCell>{d.recruiterUserIds.length}</TableCell><TableCell>{d.jobIds.length}</TableCell></TableRow>)}</TableBody></Table></TableContainer></Grid>
        </Grid>
      )}

      {tab === 'business-units' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}><Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Create Business Unit</Typography><TextField fullWidth label="Business Unit Name" value={newBusinessUnit} onChange={(e) => setNewBusinessUnit(e.target.value)} /><Button sx={{ mt: 1 }} variant="contained" onClick={() => {
            try {
              organizationSaasService.createBusinessUnit(tenantId, ownerId, currentUserId, { name: newBusinessUnit });
              toast.success('Business unit created');
              loadAll();
            } catch (error: any) {
              toast.error(error?.message || 'Unable to create business unit');
            }
          }}>Create</Button></CardContent></Card></Grid>
          <Grid item xs={12} md={8}><TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}><Table size="small"><TableHead><TableRow><TableCell>Business Unit</TableCell><TableCell>Recruiters</TableCell><TableCell>Managers</TableCell><TableCell>Jobs</TableCell></TableRow></TableHead><TableBody>{businessUnits.map((u: any) => <TableRow key={u.id}><TableCell>{u.name}</TableCell><TableCell>{u.recruiterUserIds.length}</TableCell><TableCell>{u.managerUserIds.length}</TableCell><TableCell>{u.jobIds.length}</TableCell></TableRow>)}</TableBody></Table></TableContainer></Grid>
        </Grid>
      )}

      {tab === 'workspace' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={4}>{statCard('Assigned Jobs', workspace.assignedJobs.length, '#1D4ED8')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Assigned Candidates', workspace.assignedCandidates.length, '#0F766E')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Assigned Departments', workspace.assignedDepartments.length, '#9333EA')}</Grid>
          <Grid item xs={12}><Alert severity="info">Recruiter workspace is tenant scoped and shows only assigned jobs, candidates, departments, and organization branding.</Alert></Grid>
        </Grid>
      )}

      {tab === 'roles' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Organization Roles</Typography><Stack direction="row" spacing={0.7} sx={{ flexWrap: 'wrap' }}>{roles.map((r: string) => <Chip key={r} label={r} size="small" />)}</Stack></CardContent></Card>
      )}

      {tab === 'storage' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={4}>{statCard('Documents Used', `${storage.documentsUsedMb} MB`, '#1D4ED8')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Resume Storage', `${storage.resumeStorageMb} MB`, '#0F766E')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Images', `${storage.imagesMb} MB`, '#9333EA')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Videos', `${storage.videosMb} MB`, '#0369A1')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Reports', `${storage.reportsMb} MB`, '#C2410C')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Remaining Storage', `${storage.remainingStorageMb} MB`, '#D97706')}</Grid>
        </Grid>
      )}

      {tab === 'analytics' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={4}>{statCard('Hiring Growth', `${analytics.hiringGrowth}%`, '#1D4ED8')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Applications', analytics.applications, '#0F766E')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Interview Success', `${analytics.interviewSuccess}%`, '#9333EA')}</Grid>
          <Grid item xs={12} md={6}><TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}><Table size="small"><TableHead><TableRow><TableCell>Funnel Stage</TableCell><TableCell>Count</TableCell></TableRow></TableHead><TableBody>{analytics.hiringFunnel.map((f: any) => <TableRow key={f.stage}><TableCell>{f.stage}</TableCell><TableCell>{f.count}</TableCell></TableRow>)}</TableBody></Table></TableContainer></Grid>
          <Grid item xs={12} md={6}><TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}><Table size="small"><TableHead><TableRow><TableCell>Month</TableCell><TableCell>Hires</TableCell></TableRow></TableHead><TableBody>{analytics.monthlyHiring.map((m: any) => <TableRow key={m.month}><TableCell>{m.month}</TableCell><TableCell>{m.hires}</TableCell></TableRow>)}</TableBody></Table></TableContainer></Grid>
        </Grid>
      )}

      {tab === 'emails-notifications' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={6}><Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>White-label Emails</Typography><Typography variant="body2">Logo: {whiteLabel.email.logo || '-'}</Typography><Typography variant="body2">Brand Color: {whiteLabel.email.brandColor}</Typography><Typography variant="body2">Footer: {whiteLabel.email.footer}</Typography><Typography variant="body2">Reply-To: {whiteLabel.email.replyTo}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} md={6}><Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>White-label Notifications</Typography><Typography variant="body2">Logo: {whiteLabel.notifications.logo || '-'}</Typography><Typography variant="body2">Brand: {whiteLabel.notifications.brandColor}</Typography><Typography variant="body2">Secondary: {whiteLabel.notifications.secondaryColor}</Typography><Typography variant="body2">Template: {whiteLabel.notifications.templateStyle}</Typography></CardContent></Card></Grid>
        </Grid>
      )}

      {tab === 'features' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Feature Management</Typography><Grid container spacing={1}>{Object.entries(features).map(([k, v]) => <Grid key={k} item xs={12} sm={6} md={3}><Paper sx={{ p: 1, border: `1px solid ${themeColors.border}` }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="body2">{k}</Typography><Switch checked={Boolean(v)} onChange={(e) => setFeatures((cur: any) => ({ ...cur, [k]: e.target.checked }))} /></Stack></Paper></Grid>)}<Grid item xs={12}><Button variant="contained" onClick={() => {
            try {
              const next = organizationSaasService.updateFeatureFlags(tenantId, ownerId, currentUserId, features);
              setFeatures(next);
              toast.success('Feature flags updated');
            } catch (error: any) {
              toast.error(error?.message || 'Unable to update features');
            }
          }}>Save Feature Flags</Button></Grid></Grid></CardContent></Card>
      )}

      {tab === 'billing' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={4}>{statCard('Subscription', billing.subscription, '#1D4ED8')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Invoices', billing.invoices, '#0F766E')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Credits', billing.credits, '#9333EA')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Payment History', billing.paymentHistory, '#0369A1')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Usage Spend', billing.usageSpend, '#C2410C')}</Grid>
        </Grid>
      )}

      {tab === 'security' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={3}>{statCard('SSO Ready', security.ssoReady ? 'Yes' : 'No', '#1D4ED8')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Google Login', security.googleLogin ? 'Enabled' : 'Disabled', '#0F766E')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Microsoft Login', security.microsoftLogin ? 'Enabled' : 'Disabled', '#9333EA')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('SAML', security.samlReady ? 'Ready' : 'Future Ready', '#0369A1')}</Grid>
          <Grid item xs={12}><Typography variant="body2">Password Policies: {security.passwordPolicies}</Typography></Grid>
          <Grid item xs={12}><TextField fullWidth label="Allowed Domains" value={allowedDomainsInput} onChange={(e) => setAllowedDomainsInput(e.target.value)} helperText="Comma separated domains" /></Grid>
          <Grid item xs={12}><Button variant="contained" onClick={() => {
            try {
              organizationSaasService.updateAllowedDomains(tenantId, ownerId, currentUserId, allowedDomainsInput.split(',').map((x) => x.trim()).filter(Boolean));
              toast.success('Allowed domains updated');
              loadAll();
            } catch (error: any) {
              toast.error(error?.message || 'Unable to update allowed domains');
            }
          }}>Save Domain Policy</Button></Grid>
        </Grid>
      )}

      {tab === 'reports' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Organization Reports</Typography><Stack direction="row" spacing={0.8} flexWrap="wrap"><Button variant="contained" startIcon={<DownloadIcon />} onClick={() => downloadText('hiring_report.md', reports.hiringReport)}>Hiring Report</Button><Button variant="outlined" onClick={() => downloadText('recruiter_report.md', reports.recruiterReport)}>Recruiter Report</Button><Button variant="outlined" onClick={() => downloadText('department_report.md', reports.departmentReport)}>Department Report</Button><Button variant="outlined" onClick={() => downloadText('monthly_report.md', reports.monthlyReport)}>Monthly Report</Button><Button variant="outlined" onClick={() => downloadText('executive_report.md', reports.executiveReport)}>Executive Report</Button></Stack><Alert sx={{ mt: 1 }} severity="info">Download format architecture supports PDF, Excel, CSV via export adapters.</Alert></CardContent></Card>
      )}

      {tab === 'backup' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={4}>{statCard('Backup Status', backup.status, backup.status === 'healthy' ? '#0F766E' : '#DC2626')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Restore Points', backup.restorePoints.length, '#1D4ED8')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Last Backup', format(new Date(backup.lastBackup), 'dd MMM yyyy, hh:mm a'), '#9333EA')}</Grid>
          <Grid item xs={12}><Button variant="outlined" onClick={async () => {
            const payload = await organizationSaasService.exportOrganizationData(tenantId, ownerId);
            downloadText('organization_export.json', payload);
            toast.success('Organization data exported');
          }}>Export Organization Data</Button></Grid>
        </Grid>
      )}

      {tab === 'import' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Organization Import</Typography><Grid container spacing={1}><Grid item xs={12} md={3}><FormControl fullWidth><InputLabel>Entity</InputLabel><Select value={importEntity} label="Entity" onChange={(e) => setImportEntity(e.target.value as any)}><MenuItem value="recruiters">Recruiters</MenuItem><MenuItem value="candidates">Candidates</MenuItem><MenuItem value="jobs">Jobs</MenuItem><MenuItem value="departments">Departments</MenuItem><MenuItem value="tags">Tags</MenuItem></Select></FormControl></Grid><Grid item xs={12} md={9}><TextField fullWidth multiline minRows={5} label="CSV" value={importCsv} onChange={(e) => setImportCsv(e.target.value)} /></Grid><Grid item xs={12}><Button variant="contained" startIcon={<ImportIcon />} onClick={() => {
            try {
              const res = organizationSaasService.importOrganizationCsv(tenantId, ownerId, currentUserId, importEntity, importCsv);
              toast.success(`Imported ${res.imported}, skipped ${res.skipped}`);
              loadAll();
            } catch (error: any) {
              toast.error(error?.message || 'Import failed');
            }
          }}>Run Import</Button></Grid></Grid></CardContent></Card>
      )}

      {tab === 'api' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={5}><Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Organization API</Typography><Typography variant="body2" sx={{ mb: 1 }}>Usage Limit Per Day: {orgApi.usageLimitPerDay}</Typography><TextField fullWidth label="Webhook URL" value={newWebhookUrl} onChange={(e) => setNewWebhookUrl(e.target.value)} /><Button sx={{ mt: 1 }} variant="contained" onClick={() => {
            try {
              const next = organizationSaasService.updateOrganizationApi(tenantId, ownerId, currentUserId, {
                webhookUrls: [...(orgApi.webhookUrls || []), newWebhookUrl],
                usageLimitPerDay: orgApi.usageLimitPerDay,
              });
              setOrgApi(next);
              toast.success('Webhook URL added');
            } catch (error: any) {
              toast.error(error?.message || 'Unable to update API config');
            }
          }}>Add Webhook URL</Button><Button sx={{ mt: 1, ml: 1 }} variant="outlined" onClick={() => {
            try {
              const next = organizationSaasService.createOrganizationApiKey(tenantId, ownerId, currentUserId);
              setOrgApi(next);
              toast.success('API key generated');
            } catch (error: any) {
              toast.error(error?.message || 'Unable to generate key');
            }
          }}>Generate API Key</Button></CardContent></Card></Grid>
          <Grid item xs={12} md={7}><TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}><Table size="small"><TableHead><TableRow><TableCell>Key</TableCell><TableCell>Rate</TableCell><TableCell>Status</TableCell><TableCell>Created</TableCell><TableCell align="right">Action</TableCell></TableRow></TableHead><TableBody>{orgApi.apiKeys.map((k: any) => <TableRow key={k.id}><TableCell>{k.keyMasked}</TableCell><TableCell>{k.usageLimitPerMin}/min</TableCell><TableCell>{k.active ? 'Active' : 'Revoked'}</TableCell><TableCell>{format(new Date(k.createdAt), 'dd MMM yyyy')}</TableCell><TableCell align="right"><Button size="small" variant="outlined" color="error" disabled={!k.active} onClick={() => {
            try {
              const next = organizationSaasService.revokeOrganizationApiKey(tenantId, ownerId, currentUserId, k.id);
              setOrgApi(next);
              toast.success('API key revoked');
            } catch (error: any) {
              toast.error(error?.message || 'Unable to revoke key');
            }
          }}>Revoke</Button></TableCell></TableRow>)}</TableBody></Table></TableContainer><Alert severity="info" sx={{ mt: 1 }}>Webhook URLs: {(orgApi.webhookUrls || []).join(', ') || 'None'}</Alert></Grid>
        </Grid>
      )}

      {tab === 'super-admin' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={3}>{statCard('Organizations', platformStats.organizations, '#1D4ED8')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Active Orgs', platformStats.activeOrganizations, '#0F766E')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Suspended Orgs', platformStats.suspendedOrganizations, '#DC2626')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Platform Revenue', platformStats.totalRevenue, '#9333EA')}</Grid>
          <Grid item xs={12}><TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}><Table size="small"><TableHead><TableRow><TableCell>Organization</TableCell><TableCell>Status</TableCell><TableCell>Plan</TableCell><TableCell>Recruiters</TableCell><TableCell>Open Jobs</TableCell><TableCell>Revenue</TableCell><TableCell align="right">Action</TableCell></TableRow></TableHead><TableBody>{superOrgs.map((o: any) => <TableRow key={o.tenantId}><TableCell>{o.organizationName}</TableCell><TableCell>{o.status}</TableCell><TableCell>{o.plan}</TableCell><TableCell>{o.recruiters}</TableCell><TableCell>{o.openJobs}</TableCell><TableCell>{o.revenue}</TableCell><TableCell align="right"><Stack direction="row" spacing={0.5} justifyContent="flex-end"><Button size="small" variant="outlined" color="error" onClick={() => {organizationSaasService.suspendOrganization(o.tenantId); toast.success('Organization suspended'); loadAll();}}>Suspend</Button><Button size="small" variant="outlined" color="success" onClick={() => {organizationSaasService.activateOrganization(o.tenantId); toast.success('Organization activated'); loadAll();}}>Activate</Button></Stack></TableCell></TableRow>)}</TableBody></Table></TableContainer></Grid>
          <Grid item xs={12}><Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Super Admin Notes</Typography><TextField fullWidth label="Note" value={superAdminNote} onChange={(e) => setSuperAdminNote(e.target.value)} /><Button sx={{ mt: 1 }} variant="contained" onClick={() => {
            const notes = organizationSaasService.addSuperAdminNote(tenantId, superAdminNote);
            toast.success(`Note added (${notes.length} total)`);
          }}>Add Note</Button><Stack spacing={0.6} sx={{ mt: 1 }}>{organizationSaasService.getSuperAdminNotes(tenantId).map((n) => <Alert key={n} severity="info">{n}</Alert>)}</Stack></CardContent></Card></Grid>
          <Grid item xs={12}><Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Scalability Architecture</Typography><Stack spacing={0.6}>{scaleReadiness.architecture.map((a: string) => <Alert key={a} severity="success">{a}</Alert>)}{scaleReadiness.notes.map((n: string) => <Alert key={n} severity="info">{n}</Alert>)}</Stack></CardContent></Card></Grid>
        </Grid>
      )}

      <Alert sx={{ mt: 2 }} severity={canManage ? 'success' : 'warning'}>
        Multi-tenant architecture enforces tenant-level scoping for jobs, applicants, recruiters, talent pools, tags, messages, interviews, analytics, credits, billing, automation, AI history, reports, and settings.
      </Alert>
    </MotionBox>
  );
};
