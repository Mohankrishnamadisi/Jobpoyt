import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  AccessTime,
  ArrowBack,
  ArrowForward,
  Assignment,
  BusinessCenterOutlined,
  CalendarTodayOutlined,
  Cancel,
  CheckCircle,
  EmojiEvents,
  HourglassTop,
  LocationOnOutlined,
  OpenInNew,
  Search,
  Send,
  StarRate,
  Timeline,
  TravelExplore,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Layout } from '@components/layout/Layout';
import { DashboardHero, DashboardStatCard, heroGoldButtonSx } from '@components/dashboard/DashboardSectionKit';
import { useAuthStore } from '@store/index';
import { applicationService } from '@services/api';
import { formatDate } from '@utils/index';
import { ROUTES } from '@constants/index';
import '../../styles/opportunitySignalButton.css';

type UserApplication = {
  id: string;
  job_id?: string;
  status?: string;
  applied_at?: string;
  updated_at?: string;
  resume_url?: string;
  cover_letter?: string;
  priority_application?: boolean;
  jobs?: {
    id?: string;
    title?: string;
    company_name?: string;
    company_logo_url?: string;
    logo_url?: string;
    application_link?: string;
    application_url?: string;
    location?: string;
    job_type?: string;
    work_mode?: string;
    experience?: string;
  };
};

type StatusKey = 'applied' | 'under_review' | 'shortlisted' | 'accepted' | 'rejected';

const statusOrder: StatusKey[] = ['applied', 'under_review', 'shortlisted', 'accepted'];
const statusLabels: Record<StatusKey, string> = {
  applied: 'Applied',
  under_review: 'Under Review',
  shortlisted: 'Shortlisted',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

const normalizeStatus = (value?: string): StatusKey => {
  const normalized = String(value || 'applied').toLowerCase().replace(/\s+/g, '_');
  if (normalized === 'shortlisted') return 'shortlisted';
  if (normalized === 'under_review' || normalized === 'screening' || normalized === 'interview') return 'under_review';
  if (normalized === 'accepted' || normalized === 'hired' || normalized === 'offer_sent') return 'accepted';
  if (normalized === 'rejected') return 'rejected';
  return 'applied';
};

const statusStyles: Record<StatusKey, { color: string; background: string }> = {
  applied: { color: '#475569', background: '#F1F5F9' },
  under_review: { color: '#B45309', background: '#FEF3C7' },
  shortlisted: { color: '#047857', background: '#D1FAE5' },
  accepted: { color: '#1D4ED8', background: '#DBEAFE' },
  rejected: { color: '#B91C1C', background: '#FEE2E2' },
};

const getCompanyInitials = (company?: string) => String(company || 'Company')
  .split(/\s+/)
  .map((part) => part[0])
  .join('')
  .slice(0, 2)
  .toUpperCase();

const getProgressIndex = (status: StatusKey) => {
  if (status === 'rejected') return -1;
  return statusOrder.indexOf(status);
};

const isExternalApplication = (application: UserApplication) => (
  String(application.resume_url || '').trim() === ''
  && String(application.cover_letter || '').trim().toLowerCase() === 'applied through the employer application link.'
);

const getExternalApplicationUrl = (application: UserApplication) => (
  application.jobs?.application_link || application.jobs?.application_url || ''
);

export const ApplicationsPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const Shell = embedded ? React.Fragment : Layout;
  const { user } = useAuthStore();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const location = useLocation();
  const remoteFilter = new URLSearchParams(location.search).get('filter') === 'remote';
  const [applications, setApplications] = useState<UserApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | StatusKey>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'internal' | 'external'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'activity'>('latest');

  useEffect(() => {
    let active = true;
    const loadApplications = async () => {
      if (!user?.id) {
        setApplications([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const data = await applicationService.getUserApplications(user.id);
        if (!active) return;
        setApplications((data || []) as UserApplication[]);
      } catch (requestError) {
        if (!active) return;
        setError(requestError instanceof Error ? requestError.message : 'Unable to load your applications.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadApplications();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const visibleApplications = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = applications.filter((application) => {
      const external = isExternalApplication(application);
      const status = external ? 'applied' : normalizeStatus(application.status);
      const locationValue = String(application.jobs?.location || '').toLowerCase();
      const workMode = String(application.jobs?.work_mode || '').toLowerCase();
      const searchable = `${application.jobs?.title || ''} ${application.jobs?.company_name || ''} ${locationValue}`.toLowerCase();
      return (!remoteFilter || locationValue.includes('remote') || workMode.includes('remote'))
        && (statusFilter === 'all' || status === statusFilter)
        && (typeFilter === 'all' || (typeFilter === 'external' ? external : !external))
        && (!term || searchable.includes(term));
    });

    return [...filtered].sort((a, b) => {
      const aDate = new Date(sortBy === 'activity' ? (a.updated_at || a.applied_at || 0) : (a.applied_at || a.updated_at || 0)).getTime();
      const bDate = new Date(sortBy === 'activity' ? (b.updated_at || b.applied_at || 0) : (b.applied_at || b.updated_at || 0)).getTime();
      return bDate - aDate;
    });
  }, [applications, remoteFilter, searchTerm, sortBy, statusFilter, typeFilter]);

  useEffect(() => {
    if (visibleApplications.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !visibleApplications.some((application) => application.id === selectedId)) {
      setSelectedId(visibleApplications[0].id);
    }
  }, [selectedId, visibleApplications]);

  const selectedApplication = visibleApplications.find((application) => application.id === selectedId) || null;

  const summary = useMemo(() => applications.reduce((counts, application) => {
    const status = isExternalApplication(application) ? 'applied' : normalizeStatus(application.status);
    counts.total += 1;
    counts[status] += 1;
    return counts;
  }, { total: 0, applied: 0, under_review: 0, shortlisted: 0, accepted: 0, rejected: 0 }), [applications]);

  const selectApplication = (application: UserApplication) => {
    setSelectedId(application.id);
    setMobileDetailOpen(true);
  };

  const renderStatus = (status: StatusKey) => (
    <Chip
      label={statusLabels[status]}
      size="small"
      sx={{ color: statusStyles[status].color, bgcolor: statusStyles[status].background, fontWeight: 800, borderRadius: 1.2 }}
    />
  );

  const renderTimeline = (application: UserApplication) => {
    const currentStatus = normalizeStatus(application.status);
    const currentIndex = getProgressIndex(currentStatus);
    const stages: StatusKey[] = ['applied', 'under_review', 'shortlisted', 'accepted'];

    return (
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: { xs: 0.6, sm: 1.2 } }}>
          {stages.map((stage, index) => {
            const complete = currentIndex >= index;
            const current = currentIndex === index;
            return (
              <Box key={stage} sx={{ minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, bgcolor: complete ? '#1D4ED8' : '#E2E8F0', color: complete ? '#fff' : '#94A3B8', border: current ? '3px solid #BFDBFE' : 'none' }}>
                    {complete ? <CheckCircle sx={{ fontSize: 16 }} /> : <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#94A3B8' }} />}
                  </Box>
                  {index < stages.length - 1 ? <Box sx={{ flex: 1, height: 2, mx: 0.5, bgcolor: currentIndex > index ? '#1D4ED8' : '#E2E8F0' }} /> : null}
                </Box>
                <Typography sx={{ mt: 0.7, fontSize: { xs: 10, sm: 12 }, fontWeight: current ? 800 : 600, color: current ? '#1D4ED8' : 'text.secondary', whiteSpace: { xs: 'normal', sm: 'nowrap' } }}>
                  {statusLabels[stage]}
                </Typography>
              </Box>
            );
          })}
        </Box>
        {currentStatus === 'rejected' ? <Alert severity="error" sx={{ mt: 2 }}>This application was marked as rejected. No additional status history is available.</Alert> : null}
      </Box>
    );
  };

  const renderDetails = (application: UserApplication) => {
    const status = normalizeStatus(application.status);
    const external = isExternalApplication(application);
    const externalUrl = getExternalApplicationUrl(application);
    const company = application.jobs?.company_name || 'Company unavailable';
    const jobId = application.jobs?.id || application.job_id;
    const appliedDate = application.applied_at ? formatDate(application.applied_at) : 'Date unavailable';
    const updatedDate = application.updated_at && application.updated_at !== application.applied_at ? formatDate(application.updated_at) : null;

    return (
      <Card sx={{ height: '100%', borderRadius: 4, border: `1px solid ${isDarkMode ? 'rgba(148,163,184,0.24)' : 'rgba(148,163,184,0.18)'}`, boxShadow: isDarkMode ? 'none' : '0 20px 44px rgba(15,23,42,0.07)', bgcolor: isDarkMode ? '#0F172A' : '#FFFFFF', overflow: 'hidden' }}>
        <Box sx={{ height: 5, background: 'linear-gradient(90deg, #4F46E5, #8B5CF6, #D6A73A)' }} />
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
            <Box sx={{ display: 'flex', gap: 1.4, minWidth: 0 }}>
              <Box sx={{ width: 54, height: 54, borderRadius: 2.75, display: 'grid', placeItems: 'center', flexShrink: 0, color: '#fff', background: 'linear-gradient(135deg, #4F46E5, #8B5CF6)', boxShadow: '0 10px 20px rgba(79,70,229,0.28)', border: '2px solid #fff', fontWeight: 900, fontSize: 18, overflow: 'hidden' }}>
                {application.jobs?.company_logo_url || application.jobs?.logo_url ? <Box component="img" src={application.jobs.company_logo_url || application.jobs.logo_url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : getCompanyInitials(company)}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 850, lineHeight: 1.2, color: isDarkMode ? '#F8FAFC' : '#0F172A' }}>{application.jobs?.title || 'Job title unavailable'}</Typography>
                <Typography sx={{ mt: 0.4, fontWeight: 700, color: isDarkMode ? '#CBD5E1' : '#475569' }}>{company}</Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={0.7} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
              {renderStatus(status)}
              {external ? <Chip label="Applied · External" size="small" icon={<OpenInNew sx={{ fontSize: 14 }} />} sx={{ color: '#075985', bgcolor: '#E0F2FE', fontWeight: 800, borderRadius: 1.2 }} /> : null}
            </Stack>
          </Box>

          <Stack direction="row" flexWrap="wrap" gap={1.4} sx={{ mt: 2, color: 'text.secondary', fontSize: 13 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><LocationOnOutlined sx={{ fontSize: 17 }} />{application.jobs?.location || 'Location unavailable'}</Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><BusinessCenterOutlined sx={{ fontSize: 17 }} />{application.jobs?.job_type || application.jobs?.work_mode || 'Employment type unavailable'}</Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><CalendarTodayOutlined sx={{ fontSize: 16 }} />Applied {appliedDate}</Box>
          </Stack>

          <Divider sx={{ my: 2.4 }} />
          <Typography sx={{ fontWeight: 850, color: isDarkMode ? '#F8FAFC' : '#0F172A', fontSize: 17 }}>{external ? 'Application journey' : 'Application progress'}</Typography>
          {external ? (
            <Stack spacing={1.3} sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'flex-start' }}><CheckCircle sx={{ color: '#16A34A', mt: 0.2 }} /><Box><Typography sx={{ fontWeight: 800 }}>Application submitted externally</Typography><Typography variant="body2" color="text.secondary">{appliedDate}</Typography></Box></Box>
              <Box sx={{ ml: 1.1, borderLeft: '2px solid #BAE6FD', height: 20 }} />
              <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'flex-start' }}><OpenInNew sx={{ color: '#0284C7', mt: 0.2 }} /><Box><Typography sx={{ fontWeight: 800 }}>Employer application system</Typography><Typography variant="body2" color="text.secondary">JobPoyt successfully directed you to the employer&apos;s application system.</Typography></Box></Box>
              <Box sx={{ ml: 1.1, borderLeft: '2px solid #E2E8F0', height: 20 }} />
              <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'flex-start' }}><AccessTime sx={{ color: '#94A3B8', mt: 0.2 }} /><Box><Typography sx={{ fontWeight: 800, color: '#64748B' }}>Recruiter status</Typography><Typography variant="body2" color="text.secondary">Updates are managed on the employer&apos;s application system.</Typography></Box></Box>
            </Stack>
          ) : renderTimeline(application)}

          {external ? <Alert severity="info" sx={{ mt: 2 }}><Typography sx={{ fontWeight: 800, fontSize: 13 }}>Status tracking</Typography><Typography variant="body2">Recruiter updates are managed on the employer&apos;s application system.</Typography></Alert> : null}

          <Divider sx={{ my: 2.4 }} />
          <Typography sx={{ fontWeight: 850, color: isDarkMode ? '#F8FAFC' : '#0F172A', mb: 1.2, fontSize: 17 }}>Activity on this job</Typography>
          <Stack spacing={1.1}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <AccessTime sx={{ mt: 0.15, fontSize: 18, color: '#2563EB' }} />
              <Box><Typography sx={{ fontWeight: 700, fontSize: 13 }}>{external ? 'Application initiated' : 'Application submitted'}</Typography><Typography variant="caption" color="text.secondary">{appliedDate}</Typography></Box>
            </Box>
            {external ? <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}><OpenInNew sx={{ mt: 0.15, fontSize: 18, color: '#0284C7' }} /><Box><Typography sx={{ fontWeight: 700, fontSize: 13 }}>Redirected to employer application</Typography><Typography variant="caption" color="text.secondary">{appliedDate}</Typography></Box></Box> : null}
            {updatedDate ? <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}><Timeline sx={{ mt: 0.15, fontSize: 18, color: '#D97706' }} /><Box><Typography sx={{ fontWeight: 700, fontSize: 13 }}>Application status updated</Typography><Typography variant="caption" color="text.secondary">{updatedDate} · {statusLabels[status]}</Typography></Box></Box> : null}
            {!updatedDate && !external ? <Typography variant="body2" color="text.secondary">No additional activity is available for this application yet.</Typography> : null}
            {external ? <Typography variant="body2" color="text.secondary">Further application activity is managed on the employer&apos;s website.</Typography> : null}
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2.8 }}>
            {jobId ? <Button component={RouterLink} to={ROUTES.JOB_DETAILS.replace(':id', String(jobId))} variant="outlined" sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2.5, borderColor: '#CBD5E1', color: '#334155', '&:hover': { borderColor: '#4F46E5', color: '#4F46E5', bgcolor: 'rgba(79,70,229,0.04)' } }}>View Job</Button> : null}
            {external && externalUrl ? <Button component="a" href={externalUrl} target="_blank" rel="noopener noreferrer" endIcon={<OpenInNew sx={{ fontSize: 16 }} />} variant="contained" sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2.5, background: 'linear-gradient(135deg, #1D4ED8, #4F46E5)', boxShadow: '0 10px 20px rgba(79,70,229,0.28)', '&:hover': { background: 'linear-gradient(135deg, #1E40AF, #4338CA)' } }}>View application site</Button> : null}
          </Stack>
        </CardContent>
      </Card>
    );
  };

  const summaryItems = [
    { label: 'Total Applications', value: summary.total, icon: <Assignment />, accent: '#4F46E5', accent2: '#8B5CF6' },
    { label: 'Submitted', value: summary.applied, icon: <Send />, accent: '#475569', accent2: '#94A3B8' },
    { label: 'Under Review', value: summary.under_review, icon: <HourglassTop />, accent: '#D97706', accent2: '#F59E0B' },
    { label: 'Shortlisted', value: summary.shortlisted, icon: <StarRate />, accent: '#059669', accent2: '#10B981' },
    { label: 'Accepted', value: summary.accepted, icon: <EmojiEvents />, accent: '#1D4ED8', accent2: '#38BDF8' },
    { label: 'Rejected', value: summary.rejected, icon: <Cancel />, accent: '#DC2626', accent2: '#F87171' },
  ];

  const controlSx = {
    '& .MuiOutlinedInput-root': {
      minHeight: embedded ? 38 : 50,
      borderRadius: 2.2,
      bgcolor: isDarkMode ? '#0F172A' : '#FFFFFF',
      color: isDarkMode ? '#F8FAFC' : '#17324D',
      '& fieldset': { borderColor: isDarkMode ? 'rgba(148,163,184,0.32)' : '#CBD8E5', borderWidth: 1 },
      '&:hover fieldset': { borderColor: '#7EA4C5' },
      '&.Mui-focused fieldset': { borderColor: '#D6A73A', borderWidth: 2 },
    },
    '& .MuiInputBase-input': { fontSize: embedded ? 12.5 : 15, fontWeight: 600 },
    '& .MuiSelect-select': { display: 'flex', alignItems: 'center', fontWeight: 700 },
    '& .MuiSvgIcon-root': { color: '#607D96' },
  };

  const menuItemSx = {
    mx: 0.6,
    my: 0.25,
    minHeight: 38,
    borderRadius: 1.5,
    color: '#17324D',
    fontSize: 14,
    fontWeight: 600,
    '&:hover': { bgcolor: '#EEF6FB', color: '#0F6B9A' },
    '&.Mui-selected': { bgcolor: '#FFF4D6', color: '#8A6412', fontWeight: 800 },
    '&.Mui-selected:hover': { bgcolor: '#FFEDB0' },
  };

  const menuProps = {
    PaperProps: {
      sx: {
        mt: 0.7,
        p: 0.45,
        border: '1px solid #D7E3EC',
        borderRadius: 2,
        boxShadow: '0 14px 28px rgba(15,35,63,0.14)',
        maxHeight: 280,
      },
    },
  };

  return (
    <Shell>
      <Container
        className={embedded ? 'applications-page applications-page-embedded' : 'applications-page'}
        maxWidth="xl"
        sx={{
          py: embedded ? { xs: 1, md: 1.4 } : { xs: 1.5, md: 2.2 },
          px: embedded ? { xs: 0.7, sm: 1, md: 1.2 } : { xs: 1.2, sm: 2, md: 3 },
          ...(embedded ? {
            '& .MuiTypography-h6': { fontSize: '1rem !important', lineHeight: '1.25 !important' },
            '& .MuiTypography-body1': { fontSize: '0.82rem !important' },
            '& .MuiTypography-body2': { fontSize: '0.74rem !important' },
            '& .MuiTypography-caption': { fontSize: '0.66rem !important' },
            '& .MuiButton-root': { minHeight: 32, px: 1.2, py: 0.5, fontSize: '0.74rem' },
            '& .MuiChip-root': { height: 22, fontSize: '0.64rem' },
          } : {}),
        }}
      >
        <DashboardHero
          compact={embedded}
          icon={<TravelExplore />}
          eyebrow="CAREER TRACKER"
          title="My Applications"
          subtitle="A clear view of every opportunity, every update, and your next move."
          action={(
            <Button component={RouterLink} to={ROUTES.JOBS} variant="contained" endIcon={<ArrowForward />} sx={heroGoldButtonSx}>
              Explore more jobs
            </Button>
          )}
        />

          <Grid container spacing={embedded ? 1 : 1.5} sx={{ mb: embedded ? 1.5 : 2 }}>
          {summaryItems.map((item) => (
            <Grid item xs={6} sm={4} md={2} key={item.label}>
              <DashboardStatCard compact darkMode={isDarkMode} label={item.label} value={item.value} icon={item.icon} accent={item.accent} accent2={item.accent2} />
            </Grid>
          ))}
        </Grid>

        {remoteFilter ? <Chip label="Remote filter active" size="small" sx={{ mb: 1.5, fontWeight: 800, bgcolor: '#E8F1FA', color: '#0F6B9A' }} /> : null}

          <Card sx={{ borderRadius: embedded ? 3 : 4, border: '1px solid', borderColor: isDarkMode ? 'rgba(148,163,184,0.24)' : 'rgba(148,163,184,0.18)', boxShadow: '0 20px 44px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
            <Box sx={{ px: embedded ? { xs: 1.1, md: 1.5 } : { xs: 1.4, md: 2.2 }, py: embedded ? 1 : 1.4, display: 'flex', alignItems: 'center', gap: embedded ? 0.8 : 1, flexWrap: 'wrap', borderBottom: '1px solid', borderColor: isDarkMode ? 'rgba(148,163,184,0.2)' : '#E7EEF5', background: isDarkMode ? '#111D30' : 'linear-gradient(90deg, rgba(79,70,229,0.06), rgba(255,255,255,0.6))' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.9, mr: { md: 1 } }}>
                <Box sx={{ width: 30, height: 30, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(135deg, #4F46E5, #8B5CF6)', boxShadow: '0 6px 14px rgba(79,70,229,0.3)' }}>
                  <Search sx={{ fontSize: 17 }} />
                </Box>
                <Typography sx={{ color: isDarkMode ? '#F8FAFC' : '#0B2745', fontWeight: 800, fontSize: embedded ? 13 : 15 }}>Find an application</Typography>
              </Box>
            <TextField size="small" placeholder="Search title or company" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} sx={{ ...controlSx, minWidth: { xs: '100%', sm: embedded ? 190 : 230 }, flex: { sm: 1 } }} InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: '#607D96', fontSize: embedded ? 17 : 21 }} /></InputAdornment> }} />
            <Select size="small" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | StatusKey)} sx={{ ...controlSx, minWidth: embedded ? 118 : 145 }} MenuProps={menuProps}>
              <MenuItem sx={menuItemSx} value="all">All statuses</MenuItem><MenuItem sx={menuItemSx} value="applied">Applied</MenuItem><MenuItem sx={menuItemSx} value="under_review">Under Review</MenuItem><MenuItem sx={menuItemSx} value="shortlisted">Shortlisted</MenuItem><MenuItem sx={menuItemSx} value="accepted">Accepted</MenuItem><MenuItem sx={menuItemSx} value="rejected">Rejected</MenuItem>
            </Select>
            <Select size="small" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | 'internal' | 'external')} sx={{ ...controlSx, minWidth: embedded ? 98 : 120 }} MenuProps={menuProps}>
              <MenuItem sx={menuItemSx} value="all">All types</MenuItem><MenuItem sx={menuItemSx} value="internal">Internal</MenuItem><MenuItem sx={menuItemSx} value="external">External</MenuItem>
            </Select>
            <Select size="small" value={sortBy} onChange={(event) => setSortBy(event.target.value as 'latest' | 'activity')} sx={{ ...controlSx, minWidth: embedded ? 112 : 135 }} MenuProps={menuProps}><MenuItem sx={menuItemSx} value="latest">Latest applied</MenuItem><MenuItem sx={menuItemSx} value="activity">Latest activity</MenuItem></Select>
          </Box>

          {loading ? <Box sx={{ minHeight: embedded ? 250 : 360, display: 'grid', placeItems: 'center' }}><Stack alignItems="center" spacing={1}><CircularProgress size={embedded ? 22 : 28} /><Typography variant={embedded ? 'body2' : 'body1'} color="text.secondary">Loading applications...</Typography></Stack></Box> : error ? <Box sx={{ p: embedded ? 1.5 : 3 }}><Alert severity="error">{error}</Alert></Box> : visibleApplications.length === 0 ? <Box sx={{ p: embedded ? 2.5 : 5, textAlign: 'center' }}><Box sx={{ width: 56, height: 56, mx: 'auto', mb: 1.5, borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(135deg, #4F46E5, #8B5CF6)', boxShadow: '0 0 0 8px rgba(99,102,241,0.1), 0 12px 24px rgba(79,70,229,0.3)' }}><Assignment /></Box><Typography variant="h6" sx={{ fontWeight: 800 }}>No applications found</Typography><Typography color="text.secondary" sx={{ mt: 0.6, mb: 2 }}>Try changing your filters or apply to a job to start tracking your progress.</Typography><Button component={RouterLink} to={ROUTES.JOBS} variant="contained" endIcon={<ArrowForward />} sx={{ ...heroGoldButtonSx, px: 2.4 }}>Explore Jobs</Button></Box> : <Box sx={{ display: { xs: 'block', md: 'grid' }, gridTemplateColumns: 'minmax(260px, 38%) minmax(0, 1fr)', minHeight: { md: embedded ? 620 : 820 }, background: isDarkMode ? '#0B1220' : '#F7FAFD' }}>
            <Box sx={{ display: { xs: mobileDetailOpen ? 'none' : 'block', md: 'block' }, p: { xs: 0.55, md: embedded ? 0.8 : 1.2 }, borderRight: { md: '1px solid' }, borderColor: isDarkMode ? 'rgba(148,163,184,0.2)' : '#E1EAF3', maxHeight: { md: embedded ? 620 : 820 }, overflowY: { md: 'auto' } }}>
              {visibleApplications.map((application) => { const status = normalizeStatus(application.status); const external = isExternalApplication(application); const selected = application.id === selectedId; return <Box key={application.id} component="button" onClick={() => selectApplication(application)} sx={{ position: 'relative', overflow: 'hidden', width: '100%', textAlign: 'left', border: '1px solid', borderColor: selected ? 'rgba(79,70,229,0.45)' : (isDarkMode ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.2)'), borderRadius: 3, mb: 1.1, bgcolor: selected ? (isDarkMode ? 'rgba(79,70,229,0.18)' : '#FFFFFF') : (isDarkMode ? 'rgba(15,23,42,0.52)' : '#FFFFFF'), background: selected && !isDarkMode ? 'linear-gradient(145deg, rgba(79,70,229,0.07) 0%, #FFFFFF 70%)' : undefined, px: { xs: 1.3, md: 1.6 }, py: 1.45, cursor: 'pointer', transition: 'all 0.22s ease', boxShadow: selected ? '0 0 0 3px rgba(79,70,229,0.12), 0 14px 28px rgba(79,70,229,0.14)' : '0 4px 14px rgba(15,23,42,0.04)', '&::before': { content: '""', position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'linear-gradient(180deg, #4F46E5, #D6A73A)', opacity: selected ? 1 : 0, transition: 'opacity 0.22s ease' }, '&:hover': { bgcolor: isDarkMode ? 'rgba(79,70,229,0.12)' : '#FFFFFF', borderColor: 'rgba(79,70,229,0.4)', transform: 'translateY(-2px)', boxShadow: '0 14px 26px rgba(79,70,229,0.12)', '&::before': { opacity: 1 } } }}><Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}><Box sx={{ minWidth: 0 }}><Typography noWrap sx={{ fontWeight: 850, color: isDarkMode ? '#F8FAFC' : '#0B2745' }}>{application.jobs?.title || 'Job title unavailable'}</Typography><Typography noWrap variant="body2" sx={{ color: isDarkMode ? '#CBD5E1' : '#64748B', mt: 0.25 }}>{application.jobs?.company_name || 'Company unavailable'}</Typography></Box><Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="flex-end">{renderStatus(status)}{external ? <Chip label="External" size="small" sx={{ color: '#075985', bgcolor: '#E0F2FE', fontWeight: 800, borderRadius: 1.2 }} /> : null}</Stack></Box><Stack direction="row" spacing={1} sx={{ mt: 1, color: isDarkMode ? '#94A3B8' : '#7A8EA3' }}><Typography variant="caption" noWrap>{application.jobs?.location || 'Location unavailable'}</Typography><Typography variant="caption">·</Typography><Typography variant="caption" noWrap>{application.applied_at ? formatDate(application.applied_at) : 'Date unavailable'}</Typography></Stack></Box>; })}
            </Box>
            <Box sx={{ display: { xs: mobileDetailOpen ? 'block' : 'none', md: 'block' }, p: embedded ? { xs: 0.7, md: 1 } : { xs: 1.2, md: 1.8 }, alignSelf: 'stretch', overflow: 'visible' }}>
              <Button onClick={() => setMobileDetailOpen(false)} startIcon={<ArrowBack />} sx={{ display: { xs: 'inline-flex', md: 'none' }, mb: 1, textTransform: 'none', fontWeight: 800 }}>Back to Applications</Button>
              {selectedApplication ? renderDetails(selectedApplication) : <Typography color="text.secondary">Select an application to view its details.</Typography>}
            </Box>
          </Box>}
        </Card>
      </Container>
    </Shell>
  );
};
