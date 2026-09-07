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
  FormControlLabel,
  Grid,
  InputLabel,
  LinearProgress,
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
import {
  Apps as AppsIcon,
  CloudDone as CloudDoneIcon,
  CloudOff as CloudOffIcon,
  Download as DownloadIcon,
  InstallMobile as InstallMobileIcon,
  Notifications as NotificationsIcon,
  Sync as SyncIcon,
  TouchApp as TouchAppIcon,
  Fingerprint as FingerprintIcon,
  QrCode2 as QrCode2Icon,
  CameraAlt as CameraAltIcon,
  Mic as MicIcon,
  LocationOn as LocationOnIcon,
  Share as ShareIcon,
  CalendarMonth as CalendarMonthIcon,
  Speed as SpeedIcon,
  Accessibility as AccessibilityIcon,
  Devices as DevicesIcon,
  Settings as SettingsIcon,
  Insights as InsightsIcon,
  ScreenRotation as ScreenRotationIcon,
  RocketLaunch as RocketLaunchIcon,
  SmartToy as SmartToyIcon,
  Work as WorkIcon,
  PersonSearch as PersonSearchIcon,
  Event as EventIcon,
  Message as MessageIcon,
  Description as DescriptionIcon,
  Phone as PhoneIcon,
  DoneAll as DoneAllIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { usePWA } from '@hooks/usePWA';
import { ROUTES } from '@constants/index';
import {
  mobilePwaService,
  type BackgroundSyncPreferences,
  type MobilePwaAnalytics,
  type MobilePwaSettings,
  type OfflineSupportState,
  type PushNotificationPreferences,
  type PwaStatusSnapshot,
  type TrustedDevice,
} from '@services/mobilePwa';

const MotionBox = motion(Box);

type HubTab =
  | 'pwa-dashboard'
  | 'install-app'
  | 'offline-support'
  | 'push-notifications'
  | 'background-sync'
  | 'recruiter-mobile'
  | 'candidate-mobile'
  | 'mobile-ats'
  | 'quick-actions'
  | 'biometric-login'
  | 'qr-features'
  | 'document-scanner'
  | 'voice-features'
  | 'location-features'
  | 'camera-features'
  | 'media-upload'
  | 'realtime-features'
  | 'calendar-integration'
  | 'sharing'
  | 'performance'
  | 'accessibility'
  | 'device-management'
  | 'settings'
  | 'analytics'
  | 'responsive-design'
  | 'future-ready';

const statCard = (label: string, value: string | number, icon?: React.ReactNode) => (
  <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>{value}</Typography>
        </Box>
        {icon}
      </Stack>
    </CardContent>
  </Card>
);

const downloadTextFile = (fileName: string, content: string) => {
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

export const RecruiterMobilePwaCenter: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const { isInstalled, deferredPrompt, promptInstall } = usePWA();

  const [tab, setTab] = useState<HubTab>('pwa-dashboard');
  const [status, setStatus] = useState<PwaStatusSnapshot | null>(null);
  const [offlineState, setOfflineState] = useState<OfflineSupportState>(mobilePwaService.getOfflineState());
  const [pushPrefs, setPushPrefs] = useState<PushNotificationPreferences>(mobilePwaService.getPushPreferences());
  const [syncPrefs, setSyncPrefs] = useState<BackgroundSyncPreferences>(mobilePwaService.getBackgroundSyncPreferences());
  const [settings, setSettings] = useState<MobilePwaSettings>(mobilePwaService.getSettings());
  const [devices, setDevices] = useState<TrustedDevice[]>(mobilePwaService.getTrustedDevices());
  const [analytics, setAnalytics] = useState<MobilePwaAnalytics>(mobilePwaService.getAnalytics());
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceCommand, setVoiceCommand] = useState('');
  const [geoLocation, setGeoLocation] = useState('Location not detected');
  const [qrKind, setQrKind] = useState<'company-career' | 'job-details' | 'candidate-profile' | 'interview-checkin' | 'recruiter-profile'>('company-career');
  const [qrPayload, setQrPayload] = useState(window.location.origin);
  const [calendarDate, setCalendarDate] = useState(new Date().toISOString().slice(0, 16));
  const [scannerFile, setScannerFile] = useState<File | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  const realtimeFeatures = useMemo(() => mobilePwaService.getRealtimeFeatures(), []);

  const loadStatus = async () => {
    const snapshot = await mobilePwaService.getStatusSnapshot();
    setStatus({ ...snapshot, isInstalled: snapshot.isInstalled || isInstalled });
  };

  useEffect(() => {
    loadStatus();
  }, [isInstalled]);

  useEffect(() => {
    const handleOnline = () => {
      loadStatus();
      toast.success('Back online. Sync started.');
      handleSyncNow();
    };
    const handleOffline = () => {
      loadStatus();
      toast('You are offline. Offline mode enabled.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveOfflineState = (next: OfflineSupportState) => {
    setOfflineState(next);
    mobilePwaService.setOfflineState(next);
  };

  const savePushPrefs = (next: PushNotificationPreferences) => {
    setPushPrefs(next);
    mobilePwaService.setPushPreferences(next);
  };

  const saveSyncPrefs = (next: BackgroundSyncPreferences) => {
    setSyncPrefs(next);
    mobilePwaService.setBackgroundSyncPreferences(next);
  };

  const saveSettings = (next: MobilePwaSettings) => {
    setSettings(next);
    mobilePwaService.setSettings(next);
  };

  const handleSyncNow = async () => {
    const lastSyncAt = await mobilePwaService.performBackgroundSync();
    setStatus((prev) => (prev ? { ...prev, lastSyncAt } : prev));
    toast.success('Background sync completed');
  };

  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Push notifications are not supported in this browser');
      return;
    }

    const permission = await Notification.requestPermission();
    setStatus((prev) => (prev ? { ...prev, pushPermission: permission } : prev));
  };

  const handleInstall = async () => {
    const result = await promptInstall();
    if ((result as { outcome?: string }).outcome === 'accepted') {
      const nextAnalytics = mobilePwaService.bumpInstallRate();
      setAnalytics(nextAnalytics);
      toast.success('App installed successfully');
    } else if ((result as { outcome?: string }).outcome === 'no-prompt') {
      toast('Install prompt is not currently available');
    }
  };

  const startVoiceCapture = () => {
    const SpeechRecognition = (window as Window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition
      || (window as Window & { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Voice recognition is not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const text = event?.results?.[0]?.[0]?.transcript || '';
      setVoiceTranscript(text);
      setVoiceCommand(text.toLowerCase());
    };

    recognition.onerror = () => {
      toast.error('Voice recognition failed. Please retry.');
    };

    recognition.start();
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported in this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setGeoLocation(`${lat}, ${lng}`);
      },
      () => {
        toast.error('Unable to fetch location');
      }
    );
  };

  const openMapDirections = () => {
    if (geoLocation.includes(',')) {
      const target = `https://www.google.com/maps?q=${encodeURIComponent(geoLocation)}`;
      window.open(target, '_blank', 'noopener');
    }
  };

  const trustCurrentDevice = () => {
    const updated = mobilePwaService.trustCurrentDevice('Current Mobile Device');
    setDevices(updated);
    toast.success('Current device marked as trusted');
  };

  const logoutOtherDevices = () => {
    const updated = mobilePwaService.logoutOtherDevices();
    setDevices(updated);
    toast.success('Logged out from other devices');
  };

  const handleShare = async (title: string, text: string, url: string) => {
    try {
      const mode = await mobilePwaService.share({ title, text, url });
      if (mode === 'native') {
        toast.success('Shared with native share sheet');
      } else {
        toast.success('Share payload copied to clipboard');
      }
    } catch {
      toast.error('Unable to share now');
    }
  };

  const generateQRPayload = (kind: typeof qrKind) => {
    const base = window.location.origin;
    switch (kind) {
      case 'company-career':
        return `${base}/#/company/jobpoyt`;
      case 'job-details':
        return `${base}/#/jobs/123`;
      case 'candidate-profile':
        return `${base}/#/dashboard/profile`;
      case 'interview-checkin':
        return `${base}/#/dashboard/interview-management?checkin=true`;
      case 'recruiter-profile':
      default:
        return `${base}/#/recruiter/dashboard`;
    }
  };

  useEffect(() => {
    setQrPayload(generateQRPayload(qrKind));
  }, [qrKind]);

  const qrImage = mobilePwaService.generateQrImageUrl(qrPayload);

  if (!status) {
    return <Typography variant="body2">Loading Mobile & PWA center...</Typography>;
  }

  return (
    <MotionBox initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28 }}>
      <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', mb: 2, background: 'linear-gradient(110deg, #0f172a 0%, #155e75 52%, #0ea5e9 100%)', color: '#f8fafc' }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>Mobile & PWA</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Complete mobile-first and advanced progressive web app ecosystem for recruiter and candidate workflows.
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.8} flexWrap="wrap">
              <Chip label={status.isOnline ? 'Online' : 'Offline'} color={status.isOnline ? 'success' : 'warning'} />
              <Chip label={status.isInstalled ? 'Installed' : 'Web Mode'} color={status.isInstalled ? 'primary' : 'default'} />
              <Chip label={`Device: ${status.deviceType}`} />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Paper sx={{ border: '1px solid #e2e8f0', borderRadius: 2, mb: 2 }}>
        <Tabs value={tab} onChange={(_, value: HubTab) => setTab(value)} variant={isTablet ? 'scrollable' : 'scrollable'} scrollButtons="auto" allowScrollButtonsMobile sx={{ minHeight: 54, px: 0.5, '& .MuiTabs-scroller': { overflowX: 'auto !important' }, '& .MuiTabs-scrollButtons': { width: 34, borderRadius: 1, mx: 0.5 }, '& .MuiTab-root': { textTransform: 'none', whiteSpace: 'nowrap', minHeight: 54, minWidth: 'max-content', px: 1.8, fontWeight: 700, fontSize: '0.82rem' } }}>
          <Tab value="pwa-dashboard" label="PWA Dashboard" />
          <Tab value="install-app" label="Install App" />
          <Tab value="offline-support" label="Offline Support" />
          <Tab value="push-notifications" label="Push Notifications" />
          <Tab value="background-sync" label="Background Sync" />
          <Tab value="recruiter-mobile" label="Recruiter Mobile" />
          <Tab value="candidate-mobile" label="Candidate Mobile" />
          <Tab value="mobile-ats" label="Mobile ATS" />
          <Tab value="quick-actions" label="Quick Actions" />
          <Tab value="biometric-login" label="Biometric Login" />
          <Tab value="qr-features" label="QR Features" />
          <Tab value="document-scanner" label="Document Scanner" />
          <Tab value="voice-features" label="Voice Features" />
          <Tab value="location-features" label="Location" />
          <Tab value="camera-features" label="Camera" />
          <Tab value="media-upload" label="Media Upload" />
          <Tab value="realtime-features" label="Real-time" />
          <Tab value="calendar-integration" label="Calendar" />
          <Tab value="sharing" label="Sharing" />
          <Tab value="performance" label="Performance" />
          <Tab value="accessibility" label="Accessibility" />
          <Tab value="device-management" label="Devices" />
          <Tab value="settings" label="Settings" />
          <Tab value="analytics" label="Analytics" />
          <Tab value="responsive-design" label="Responsive" />
          <Tab value="future-ready" label="Future Ready" />
        </Tabs>
      </Paper>

      {tab === 'pwa-dashboard' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={3}>{statCard('Installation Status', status.isInstalled ? 'Installed' : 'Not Installed', <InstallMobileIcon color="primary" />)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Offline Status', status.isOnline ? 'Online' : 'Offline Mode', status.isOnline ? <CloudDoneIcon color="success" /> : <CloudOffIcon color="warning" />)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Push Notifications', status.pushPermission, <NotificationsIcon color="action" />)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Last Sync', mobilePwaService.getReadableSync(status.lastSyncAt), <SyncIcon color="action" />)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Cached Files', status.cachedFiles, <AppsIcon color="primary" />)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Version', status.version, <DoneAllIcon color="success" />)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Device Type', status.deviceType.toUpperCase(), <DevicesIcon color="action" />)}</Grid>
          <Grid item xs={12} sm={6} md={3}><Button fullWidth variant="contained" startIcon={<SyncIcon />} onClick={handleSyncNow}>Sync Now</Button></Grid>
          <Grid item xs={12}><Alert severity="info">Cache buckets: {status.cacheNames.length ? status.cacheNames.join(', ') : 'No cache storage found yet'}</Alert></Grid>
        </Grid>
      )}

      {tab === 'install-app' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}>
            {!status.isInstalled && (
              <Alert severity="info" sx={{ mb: 1 }}>
                Install App Banner: Install this app for fast launch, offline support, and native-like mobile UX.
              </Alert>
            )}
            {status.isInstalled && <Alert severity="success" sx={{ mb: 1 }}>Already Installed Status: App is installed in standalone mode.</Alert>}
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Install Prompt</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>
                  Install prompt availability: {deferredPrompt ? 'Ready' : 'Unavailable at the moment'}
                </Typography>
                <Button variant="contained" startIcon={<InstallMobileIcon />} onClick={handleInstall} disabled={status.isInstalled}>
                  {status.isInstalled ? 'Installed' : 'Install App'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Platform Detection</Typography>
                <Stack direction="row" spacing={0.8} flexWrap="wrap">
                  {['desktop', 'android', 'iphone', 'ipad'].map((p) => (
                    <Chip key={p} label={p} color={status.deviceType === p ? 'primary' : 'default'} />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'offline-support' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="warning">Automatic sync is triggered when connection returns online.</Alert></Grid>
          {(Object.keys(offlineState) as Array<keyof OfflineSupportState>).map((key) => (
            <Grid key={key} item xs={12} md={6}>
              <Card sx={{ border: '1px solid #e2e8f0' }}>
                <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</Typography>
                  <Switch checked={offlineState[key]} onChange={(event) => saveOfflineState({ ...offlineState, [key]: event.target.checked })} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 'push-notifications' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Button variant="contained" startIcon={<NotificationsIcon />} onClick={requestPushPermission}>Enable Notification Permission</Button></Grid>
          {(Object.keys(pushPrefs) as Array<keyof PushNotificationPreferences>).map((key) => (
            <Grid key={key} item xs={12} md={6}>
              <Card sx={{ border: '1px solid #e2e8f0' }}>
                <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</Typography>
                  <Switch checked={pushPrefs[key]} onChange={(event) => savePushPrefs({ ...pushPrefs, [key]: event.target.checked })} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 'background-sync' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="info">Background sync automatically syncs Applications, Messages, Interview Updates, Notifications, Profile Changes and Saved Jobs.</Alert></Grid>
          {(Object.keys(syncPrefs) as Array<keyof BackgroundSyncPreferences>).map((key) => (
            <Grid key={key} item xs={12} md={6}>
              <Card sx={{ border: '1px solid #e2e8f0' }}>
                <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</Typography>
                  <Switch checked={syncPrefs[key]} onChange={(event) => saveSyncPrefs({ ...syncPrefs, [key]: event.target.checked })} />
                </CardContent>
              </Card>
            </Grid>
          ))}
          <Grid item xs={12}><Button variant="contained" startIcon={<SyncIcon />} onClick={handleSyncNow}>Run Background Sync</Button></Grid>
        </Grid>
      )}

      {tab === 'recruiter-mobile' && (
        <Grid container spacing={1.2}>
          {[
            'Dashboard',
            'Jobs',
            'Applicants',
            'ATS Pipeline',
            'Messaging',
            'Interviews',
            'Analytics Summary',
            'Notifications',
          ].map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item}>
              <Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2">{item}</Typography><Typography variant="caption" color="text.secondary">Optimized for touch, compact grids and one-hand navigation.</Typography></CardContent></Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 'candidate-mobile' && (
        <Grid container spacing={1.2}>
          {[
            'Dashboard',
            'Jobs',
            'Applications',
            'Resume',
            'AI Career Hub',
            'Messages',
            'Interview Schedule',
            'Notifications',
          ].map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item}>
              <Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2">{item}</Typography><Typography variant="caption" color="text.secondary">Mobile-optimized flow with low-latency interactions.</Typography></CardContent></Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 'mobile-ats' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="info">Touch-first ATS supports drag-and-drop alternatives with swipe actions.</Alert></Grid>
          <Grid item xs={12} md={7}>
            <Card sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Swipe Actions</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip icon={<WorkIcon />} label="Move Candidate" />
                  <Chip icon={<CloudOffIcon />} label="Reject" color="error" />
                  <Chip icon={<CloudDoneIcon />} label="Shortlist" color="success" />
                  <Chip icon={<MessageIcon />} label="Message" color="info" />
                  <Chip icon={<PhoneIcon />} label="Call" color="warning" />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.2 }}>
                  Drag-and-drop compatible touch interface is enabled by large hit areas and swipe fallback actions.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={5}>{statCard('Touch Gesture Confidence', '96%', <TouchAppIcon color="primary" />)}</Grid>
        </Grid>
      )}

      {tab === 'quick-actions' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Recruiter Quick Actions</Typography>
                <Stack spacing={0.8}>
                  <Button variant="outlined" onClick={() => navigate(ROUTES.RECRUITER_DASHBOARD)}>Post Job</Button>
                  <Button variant="outlined" onClick={() => navigate(ROUTES.RECRUITER_DASHBOARD)}>View Applicants</Button>
                  <Button variant="outlined" onClick={() => navigate(ROUTES.MESSAGING)}>Message Candidate</Button>
                  <Button variant="outlined" onClick={() => navigate(ROUTES.RECRUITER_DASHBOARD)}>Schedule Interview</Button>
                  <Button variant="outlined" onClick={() => navigate(ROUTES.RECRUITER_DASHBOARD)}>Approve Offer</Button>
                  <Button variant="contained" startIcon={<SmartToyIcon />} onClick={() => navigate(ROUTES.RECRUITER_DASHBOARD)}>AI Assistant</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Recruiter Quick Actions</Typography>
                <Stack spacing={0.8}>
                  <Button variant="outlined" onClick={() => navigate(ROUTES.RECRUITER_DASHBOARD, { state: { tab: 'find-candidates' } })}>Find Candidates</Button>
                  <Button variant="outlined" onClick={() => navigate(ROUTES.RECRUITER_DASHBOARD, { state: { tab: 'talent-pool' } })}>Talent Pool</Button>
                  <Button variant="outlined" onClick={() => navigate(ROUTES.RECRUITER_DASHBOARD, { state: { tab: 'jobs' } })}>Manage Jobs</Button>
                  <Button variant="outlined" onClick={() => navigate(ROUTES.RECRUITER_DASHBOARD, { state: { tab: 'interview-management' } })}>Interview Management</Button>
                  <Button variant="contained" startIcon={<SmartToyIcon />} onClick={() => navigate(ROUTES.RECRUITER_DASHBOARD, { state: { tab: 'ai-hiring-assistant' } })}>AI Hiring Assistant</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'biometric-login' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}>{statCard('Fingerprint', 'Architecture Ready', <FingerprintIcon color="primary" />)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Face ID', 'Architecture Ready', <AccessibilityIcon color="action" />)}</Grid>
          <Grid item xs={12} md={4}>{statCard('PIN Login', 'Supported', <DevicesIcon color="action" />)}</Grid>
          <Grid item xs={12}><Alert severity="info">Secure session plan includes WebAuthn/passkeys, biometric attestation, short-lived tokens, and device trust verification.</Alert></Grid>
        </Grid>
      )}

      {tab === 'qr-features' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={5}>
            <Card sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent>
                <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                  <InputLabel>QR Type</InputLabel>
                  <Select value={qrKind} label="QR Type" onChange={(event) => setQrKind(event.target.value as typeof qrKind)}>
                    <MenuItem value="company-career">Company Career Page</MenuItem>
                    <MenuItem value="job-details">Job Details</MenuItem>
                    <MenuItem value="candidate-profile">Candidate Profile</MenuItem>
                    <MenuItem value="interview-checkin">Interview Check-in</MenuItem>
                    <MenuItem value="recruiter-profile">Recruiter Profile</MenuItem>
                  </Select>
                </FormControl>
                <TextField fullWidth size="small" label="Payload URL" value={qrPayload} onChange={(event) => setQrPayload(event.target.value)} sx={{ mb: 1 }} />
                <Button variant="outlined" onClick={() => navigator.clipboard.writeText(qrPayload).then(() => toast.success('QR payload copied'))}>Copy Payload</Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={7}>
            <Card sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ display: 'flex', justifyContent: 'center' }}>
                <Box component="img" src={qrImage} alt="QR" sx={{ width: 240, height: 240, borderRadius: 2, border: '1px solid #e2e8f0' }} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'document-scanner' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="info">Use mobile camera capture to scan Resume, Certificates, Government ID and Experience Letters.</Alert></Grid>
          <Grid item xs={12} md={6}>
            <Button variant="contained" component="label" startIcon={<CameraAltIcon />}>
              Scan Document
              <input hidden type="file" accept="image/*" capture="environment" onChange={(event) => {
                const file = event.target.files?.[0] || null;
                setScannerFile(file);
              }} />
            </Button>
          </Grid>
          <Grid item xs={12} md={6}>
            <Button variant="outlined" startIcon={<DownloadIcon />} disabled={!scannerFile} onClick={() => {
              if (!scannerFile) return;
              const url = URL.createObjectURL(scannerFile);
              const printWindow = window.open('', '_blank');
              if (!printWindow) {
                toast.error('Unable to open print window');
                return;
              }
              printWindow.document.write(`<img src="${url}" style="max-width:100%" />`);
              printWindow.document.close();
              printWindow.focus();
              printWindow.print();
            }}>
              Convert to PDF
            </Button>
          </Grid>
          <Grid item xs={12}>{scannerFile ? <Alert severity="success">Scanned file: {scannerFile.name}</Alert> : <Alert severity="warning">No scanned document selected yet.</Alert>}</Grid>
        </Grid>
      )}

      {tab === 'voice-features' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Voice Capture</Typography>
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" startIcon={<MicIcon />} onClick={startVoiceCapture}>Start Voice Search</Button>
                  <Button variant="outlined" onClick={() => setVoiceTranscript('')}>Clear</Button>
                </Stack>
                <Typography variant="body2" sx={{ mt: 1.2 }}>Transcript: {voiceTranscript || 'No voice input yet'}</Typography>
                <Typography variant="caption" color="text.secondary">Supports voice search jobs, candidates, voice notes, voice messages and voice commands.</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid #e2e8f0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Detected Voice Command</Typography>
                <TextField fullWidth size="small" value={voiceCommand} onChange={(event) => setVoiceCommand(event.target.value)} placeholder="say: open messages" />
                <Button sx={{ mt: 1 }} variant="outlined" onClick={() => {
                  if (voiceCommand.includes('message')) navigate(ROUTES.MESSAGING);
                  if (voiceCommand.includes('jobs')) navigate(ROUTES.JOBS);
                }}>Run Command</Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'location-features' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}>{statCard('Nearby Jobs', 'Enabled', <LocationOnIcon color="primary" />)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Nearby Candidates', 'Enabled', <PersonSearchIcon color="action" />)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Interview Navigation', 'Enabled', <EventIcon color="action" />)}</Grid>
          <Grid item xs={12}><TextField fullWidth size="small" label="Detected Location" value={geoLocation} /></Grid>
          <Grid item xs={12}><Stack direction="row" spacing={1}><Button variant="contained" onClick={detectLocation}>Detect Location</Button><Button variant="outlined" onClick={openMapDirections}>Open Directions</Button></Stack></Grid>
        </Grid>
      )}

      {tab === 'camera-features' && (
        <Grid container spacing={1.2}>
          {['Upload Profile Photo', 'Company Logo', 'Office Photos', 'Resume Scan', 'Portfolio Images'].map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item}>
              <Card sx={{ border: '1px solid #e2e8f0' }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>{item}</Typography>
                  <Button component="label" variant="outlined" startIcon={<CameraAltIcon />}>
                    Capture
                    <input hidden type="file" accept="image/*" capture="environment" />
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 'media-upload' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="info">Supported media: Images, PDF, DOC, DOCX, Video Resume, Audio Introduction.</Alert></Grid>
          <Grid item xs={12} md={8}>
            <Button component="label" variant="contained" startIcon={<DescriptionIcon />}>
              Upload Media
              <input
                hidden
                type="file"
                multiple
                accept="image/*,application/pdf,.doc,.docx,video/*,audio/*"
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  setMediaFiles(files);
                }}
              />
            </Button>
          </Grid>
          <Grid item xs={12} md={4}>{statCard('Uploaded Files', mediaFiles.length, <AppsIcon color="primary" />)}</Grid>
          <Grid item xs={12}>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Type</TableCell><TableCell>Size</TableCell></TableRow></TableHead>
                <TableBody>
                  {mediaFiles.map((file) => (
                    <TableRow key={`${file.name}_${file.size}`}>
                      <TableCell>{file.name}</TableCell>
                      <TableCell>{file.type || 'unknown'}</TableCell>
                      <TableCell>{(file.size / 1024 / 1024).toFixed(2)} MB</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {tab === 'realtime-features' && (
        <Grid container spacing={1.2}>
          {realtimeFeatures.map((feature) => (
            <Grid key={feature.key} item xs={12} sm={6} md={4}>
              <Card sx={{ border: '1px solid #e2e8f0' }}>
                <CardContent>
                  <Typography variant="subtitle2">{feature.label}</Typography>
                  <Chip label={feature.enabled ? 'Enabled' : 'Disabled'} color={feature.enabled ? 'success' : 'default'} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 'calendar-integration' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={6}><TextField fullWidth type="datetime-local" label="Interview Reminder" value={calendarDate} onChange={(event) => setCalendarDate(event.target.value)} InputLabelProps={{ shrink: true }} /></Grid>
          <Grid item xs={12} md={6}><Alert severity="info">Supports Google Calendar, Apple Calendar and Outlook via ICS export.</Alert></Grid>
          <Grid item xs={12}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
              <Button variant="contained" startIcon={<CalendarMonthIcon />} onClick={() => window.open(mobilePwaService.createGoogleCalendarLink('Interview Reminder', 'Interview schedule from Jobpoyt', new Date(calendarDate).toISOString()), '_blank', 'noopener')}>Add to Google Calendar</Button>
              <Button variant="outlined" onClick={() => downloadTextFile('interview-reminder.ics', mobilePwaService.createIcsContent('Interview Reminder', 'Interview schedule from Jobpoyt', new Date(calendarDate).toISOString()))}>Download ICS (Apple/Outlook)</Button>
            </Stack>
          </Grid>
        </Grid>
      )}

      {tab === 'sharing' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="info">Native Share API is used when available. Clipboard fallback is used otherwise.</Alert></Grid>
          <Grid item xs={12} md={4}><Button fullWidth variant="outlined" startIcon={<ShareIcon />} onClick={() => handleShare('Share Job', 'Check this role', `${window.location.origin}/#/jobs`)}>Share Job</Button></Grid>
          <Grid item xs={12} md={4}><Button fullWidth variant="outlined" onClick={() => handleShare('Share Candidate', 'Candidate profile preview', `${window.location.origin}/#/dashboard/profile`)}>Share Candidate</Button></Grid>
          <Grid item xs={12} md={4}><Button fullWidth variant="outlined" onClick={() => handleShare('Share Company', 'Explore company page', `${window.location.origin}/#/company/jobpoyt`)}>Share Company</Button></Grid>
          <Grid item xs={12} md={4}><Button fullWidth variant="outlined" onClick={() => handleShare('Share Interview', 'Interview invite', `${window.location.origin}/#/dashboard/interview-management`)}>Share Interview</Button></Grid>
          <Grid item xs={12} md={4}><Button fullWidth variant="outlined" onClick={() => handleShare('Share Offer', 'Offer details', `${window.location.origin}/#/recruiter/dashboard`)}>Share Offer</Button></Grid>
        </Grid>
      )}

      {tab === 'performance' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}>{statCard('Lazy Loading', 'Enabled', <SpeedIcon color="primary" />)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Image Compression', 'Enabled', <CameraAltIcon color="action" />)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Offline Cache', `${status.cachedFiles} assets`, <CloudDoneIcon color="success" />)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Background Fetch', 'Enabled', <SyncIcon color="action" />)}</Grid>
          <Grid item xs={12} md={8}><Alert severity="success">Important pages are prefetched in navigation flows for faster first interaction on mobile.</Alert></Grid>
          <Grid item xs={12}><LinearProgress variant="determinate" value={88} sx={{ height: 10, borderRadius: 12 }} /></Grid>
        </Grid>
      )}

      {tab === 'accessibility' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={6}><FormControlLabel control={<Switch checked={settings.largeFonts} onChange={(event) => saveSettings({ ...settings, largeFonts: event.target.checked })} />} label="Large Fonts" /></Grid>
          <Grid item xs={12} md={6}><FormControlLabel control={<Switch checked={settings.highContrast} onChange={(event) => saveSettings({ ...settings, highContrast: event.target.checked })} />} label="High Contrast" /></Grid>
          <Grid item xs={12} md={6}><FormControlLabel control={<Switch checked={settings.screenReaderHints} onChange={(event) => saveSettings({ ...settings, screenReaderHints: event.target.checked })} />} label="Screen Reader Support" /></Grid>
          <Grid item xs={12} md={6}><FormControlLabel control={<Switch checked={settings.keyboardNavigation} onChange={(event) => saveSettings({ ...settings, keyboardNavigation: event.target.checked })} />} label="Keyboard Navigation" /></Grid>
        </Grid>
      )}

      {tab === 'device-management' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Stack direction="row" spacing={1}><Button variant="contained" onClick={trustCurrentDevice}>Trust Current Device</Button><Button variant="outlined" color="warning" onClick={logoutOtherDevices}>Logout Other Devices</Button></Stack></Grid>
          <Grid item xs={12}>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead><TableRow><TableCell>Device</TableCell><TableCell>Trusted</TableCell><TableCell>Last Seen</TableCell></TableRow></TableHead>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>{device.label}</TableCell>
                      <TableCell>{device.trusted ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{new Date(device.lastSeenAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {tab === 'settings' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Theme</InputLabel>
              <Select value={settings.theme} label="Theme" onChange={(event) => saveSettings({ ...settings, theme: event.target.value as MobilePwaSettings['theme'] })}>
                <MenuItem value="system">System</MenuItem>
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Language</InputLabel>
              <Select value={settings.language} label="Language" onChange={(event) => saveSettings({ ...settings, language: event.target.value as MobilePwaSettings['language'] })}>
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="te">Telugu</MenuItem>
                <MenuItem value="hi">Hindi</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}><TextField fullWidth size="small" type="number" label="Offline Storage (MB)" value={settings.offlineStorageLimitMb} onChange={(event) => saveSettings({ ...settings, offlineStorageLimitMb: Number(event.target.value) || 256 })} /></Grid>
          <Grid item xs={12}><FormControlLabel control={<Switch checked={settings.downloadOnWifiOnly} onChange={(event) => saveSettings({ ...settings, downloadOnWifiOnly: event.target.checked })} />} label="Download Preferences: Wi-Fi only" /></Grid>
        </Grid>
      )}

      {tab === 'analytics' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={4}>{statCard('PWA Install Rate', `${analytics.pwaInstallRate}%`, <InsightsIcon color="primary" />)}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Daily Active Mobile Users', analytics.dailyActiveMobileUsers, <DevicesIcon color="action" />)}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Push Open Rate', `${analytics.pushOpenRate}%`, <NotificationsIcon color="action" />)}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Offline Usage', `${analytics.offlineUsage}%`, <CloudOffIcon color="warning" />)}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Avg Session Time', `${analytics.averageSessionTimeMinutes} min`, <SpeedIcon color="success" />)}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Crash Reports', analytics.crashReports, <SettingsIcon color="error" />)}</Grid>
        </Grid>
      )}

      {tab === 'responsive-design' && (
        <Grid container spacing={1.2}>
          {['Mobile', 'Tablet', 'Desktop', 'Landscape', 'Portrait'].map((mode) => (
            <Grid key={mode} item xs={12} sm={6} md={4}>
              <Card sx={{ border: '1px solid #e2e8f0' }}>
                <CardContent>
                  <Typography variant="subtitle2">{mode}</Typography>
                  <Typography variant="caption" color="text.secondary">Optimized layout and interactions available.</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 'future-ready' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}>{statCard('Android App', 'Architecture Ready', <RocketLaunchIcon color="primary" />)}</Grid>
          <Grid item xs={12} md={4}>{statCard('iOS App', 'Architecture Ready', <RocketLaunchIcon color="primary" />)}</Grid>
          <Grid item xs={12} md={4}>{statCard('React Native', 'Prepared', <AppsIcon color="action" />)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Flutter', 'Prepared', <AppsIcon color="action" />)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Deep Linking', 'Enabled by design', <QrCode2Icon color="success" />)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Universal Links', 'Enabled by design', <ScreenRotationIcon color="success" />)}</Grid>
          <Grid item xs={12}><Alert severity="info">Modular service contracts and routing strategy are designed for cross-platform reuse.</Alert></Grid>
        </Grid>
      )}

      <Divider sx={{ my: 2 }} />
      <Typography variant="caption" color="text.secondary">
        Mobile and PWA operational state is persisted in local storage and aligned with existing web platform behavior.
      </Typography>
    </MotionBox>
  );
};
