import React, { Suspense, useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Button,
  Typography,
  Chip,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
  Divider,
  Stack,
  LinearProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LocationOn as LocationOnIcon,
  Work as WorkIcon,
  MonetizationOn as MonetizationOnIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Bookmark as BookmarkIcon,
  Share as ShareIcon,
  CalendarMonth as CalendarMonthIcon,
  Bolt as BoltIcon,
  WorkspacePremium as WorkspacePremiumIcon,
} from '@mui/icons-material';
import { Layout } from '@components/layout/Layout';
import { Loading } from '@components/common/Loading';
import { jobService, userService, applicationService, savedService, chatService } from '@services/api';
import { isCandidatePremium, isSubscriptionActive } from '@utils/candidateSubscriptionHelpers';
import { useAuthStore } from '@store/index';
import { USER_ROLES } from '@constants/index';
import { useSubscription } from '@hooks/index';
import { formatDate, formatJobSalary } from '@utils/index';
import computeAIMatch from '@utils/aiJobMatch';
import { ROUTES } from '@constants/index';
import Swal from '@utils/sweetAlert';
import toast from 'react-hot-toast';
import type { Job } from '../types';
import { SEO } from '@components/seo/SEO';
import { siteConfig } from '@config/site';

const RecommendedCandidates = React.lazy(() =>
  import('@components/recruiter/RecommendedCandidates').then((module) => ({
    default: module.RecommendedCandidates,
  }))
);

export const JobDetails: React.FC = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { subscription } = useSubscription(user?.id || null);

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState('');
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [currentCtc, setCurrentCtc] = useState('');
  const [expectedCtc, setExpectedCtc] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('');
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(false);
  const [savedLoading, setSavedLoading] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [jobDetailsTab, setJobDetailsTab] = useState(0);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState<{ id: string; name: string } | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchJob = async () => {
      try {
        const data = await jobService.getJobById(id);
        setJob(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load job');
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id]);

  useEffect(() => {
    const checkApplied = async () => {
      if (!id || !user?.id) return;
      try {
        const [applied, saved] = await Promise.all([
          applicationService.hasUserApplied(id, user.id),
          savedService.isJobSaved(user.id, id),
        ]);
        setHasApplied(!!applied);
        setIsSaved(!!saved);
      } catch (err) {
        console.error('Failed to check application or saved status:', err);
      }
    };
    checkApplied();
  }, [id, user?.id]);

  useEffect(() => {
    const loadProfileData = async () => {
      if (!user?.id) return;
      try {
        const profile = await userService.getProfile(user.id);
        if (profile) {
          setProfile(profile);
          setResumeUrl(profile.resume_url || profile.resumeUrl || '');
          setCurrentCtc(profile.current_ctc || profile.currentCtc || '');
          setExpectedCtc(profile.expected_ctc || profile.expectedCtc || '');
          setNoticePeriod(profile.notice_period || profile.noticePeriod || '');
        }
      } catch (err) {
        console.error('Failed to load candidate profile for application:', err);
      }
    };

    loadProfileData();
  }, [user?.id]);

  const [aiMatch, setAiMatch] = useState<any | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);

  useEffect(() => {
    const compute = async () => {
      if (!job) return;
      // Only show compute for job seekers
      if (!user || user.role !== USER_ROLES.JOB_SEEKER) return;
      setMatchLoading(true);
      try {
        const profileToUse = profile || (user?.id ? await userService.getProfile(user.id) : null);
        if (!profileToUse) {
          setAiMatch(null);
          return;
        }
        const result = computeAIMatch(profileToUse, job as any);
        setAiMatch(result);
      } catch (err) {
        console.error('Failed to compute AI match:', err);
        setAiMatch(null);
      } finally {
        setMatchLoading(false);
      }
    };

    compute();
  }, [job, profile, user]);

  if (loading) return <Loading />;
  if (!job || error)
    return (
      <Layout>
        <Container>
          <Typography color="error">{error || 'Job not found'}</Typography>
        </Container>
      </Layout>
    );

  const jobTypeLabel = job.jobType || job.job_type || 'Job';
  const workModeLabel = job.workMode || job.work_mode || 'Onsite';
  const requiresSubscription = workModeLabel === 'Remote';
  const hasAccess = !requiresSubscription || !!subscription;
  const showRemotePremium = workModeLabel === 'Remote' && !subscription;
  const isRecruiterOwner = Boolean(user?.id && job.posted_by === user.id);
  const postedOn = formatDate(job.createdAt || job.created_at || new Date().toISOString());
  const companyName = String(job.company_name || '').trim();
  const jobTitle = String(job.title || '').trim();
  const jobDescription = String(job.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const jobCanonical = `${siteConfig.url}/jobs/${encodeURIComponent(String(job.id))}`;
  const employmentTypeMap: Record<string, string> = {
    'Full-Time': 'FULL_TIME',
    'Part-Time': 'PART_TIME',
    Contract: 'CONTRACTOR',
    Internship: 'INTERN',
    Freelance: 'OTHER',
  };
  const salaryUnit = typeof job.salary_period === 'string' ? job.salary_period.trim() : '';
  const hasSalary = Boolean(
    job.currency &&
      salaryUnit &&
      [job.salaryMin || job.salary_min, job.salaryMax || job.salary_max].some((value) => Number.isFinite(Number(value)))
  );
  const jobPostingSchema: Record<string, unknown> | null = jobTitle && jobDescription && companyName && (job.createdAt || job.created_at)
    ? {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    ...(jobTitle ? { title: jobTitle } : {}),
    ...(jobDescription ? { description: jobDescription } : {}),
    ...(job.createdAt || job.created_at ? { datePosted: job.createdAt || job.created_at } : {}),
    ...(job.application_deadline ? { validThrough: job.application_deadline } : {}),
    ...(employmentTypeMap[String(jobTypeLabel)] ? { employmentType: employmentTypeMap[String(jobTypeLabel)] } : {}),
    ...(companyName ? { hiringOrganization: { '@type': 'Organization', name: companyName } } : {}),
    ...(workModeLabel.toLowerCase() === 'remote'
      ? { jobLocationType: 'TELECOMMUTE', ...(job.location ? { applicantLocationRequirements: { '@type': 'Country', name: String(job.location) } } : {}) }
      : job.location
        ? { jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: String(job.location) } } }
        : {}),
    ...(hasSalary
      ? {
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: String(job.currency),
            value: {
              '@type': 'QuantitativeValue',
              ...(job.salaryMin || job.salary_min ? { minValue: Number(job.salaryMin || job.salary_min) } : {}),
              ...(job.salaryMax || job.salary_max ? { maxValue: Number(job.salaryMax || job.salary_max) } : {}),
              unitText: salaryUnit,
            },
          },
        }
      : {}),
  }
    : null;
  const jobBreadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteConfig.url}/` },
      { '@type': 'ListItem', position: 2, name: 'Jobs', item: `${siteConfig.url}/jobs` },
      { '@type': 'ListItem', position: 3, name: jobTitle || 'Job Details', item: jobCanonical },
    ],
  };
  const screeningQuestions = job.screeningQuestions || [];
  const applicationsCount = job.applicationsCount || 0;
  const canUseNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleRecommendedMessage = (candidateId: string, candidateName: string) => {
    setSelectedChatUser({ id: candidateId, name: candidateName });
    setChatDialogOpen(true);
  };

  const handleSendRecommendedMessage = async () => {
    if (!selectedChatUser || !chatMessage.trim() || !user?.id) return;

    setSendingMessage(true);
    try {
      await chatService.sendMessage(user.id, selectedChatUser.id, chatMessage, 'recruiter');
      setChatMessage('');
      toast.success('Message sent successfully!');
    } catch (err) {
      console.error('Failed to send candidate message:', err);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSaveToggle = async () => {
    if (!user?.id || !job?.id) {
      Swal.fire({
        icon: 'info',
        title: 'Login required',
        text: 'Please login to save this job.',
        timer: 1800,
        showConfirmButton: false,
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
      });
      return;
    }

    setSavedLoading(true);
    try {
      if (isSaved) {
        await savedService.unsaveJob(user.id, job.id);
        setIsSaved(false);
        Swal.fire({
          icon: 'success',
          title: 'Removed from saved jobs',
          timer: 1400,
          showConfirmButton: false,
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
        });
      } else {
        await savedService.saveJob(user.id, job.id);
        setIsSaved(true);
        Swal.fire({
          icon: 'success',
          title: 'Job saved successfully',
          timer: 1400,
          showConfirmButton: false,
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
        });
      }
    } catch (err) {
      console.error('Failed to update saved job:', err);
      Swal.fire({
        icon: 'error',
        title: 'Unable to update saved job',
        text: 'Please try again later.',
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
      });
    } finally {
      setSavedLoading(false);
    }
  };

  const handleApplyClick = () => {
    if (!user) {
      Swal.fire({
        icon: 'info',
        title: 'Login required',
        text: 'Login to apply and unlock job opportunities.',
        timer: 1800,
        showConfirmButton: false,
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
      }).then(() => navigate(ROUTES.LOGIN));
      return;
    }

    const externalApplyUrl =
      job.applicationLink || job.application_link || job.applicationUrl || job.application_url;

    if (externalApplyUrl) {
      window.open(externalApplyUrl as string, '_blank', 'noopener,noreferrer');
      return;
    }

    if (requiresSubscription && !subscription) {
      Swal.fire({
        icon: 'warning',
        title: 'Premium access required',
        text: 'Remote Jobs are available only for Premium Members.',
        confirmButtonText: 'View pricing',
        confirmButtonColor: '#1D4ED8',
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
      }).then((result) => {
        if (result.isConfirmed) {
          navigate(ROUTES.PRICING);
        }
      });
      return;
    }

    if (hasApplied) {
      Swal.fire({
        icon: 'info',
        title: 'Already applied',
        text: 'You have already applied for this job.',
        timer: 1600,
        showConfirmButton: false,
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
      });
      return;
    }

    setApplyDialogOpen(true);
  };

  const handleApply = async () => {
    if (!user) {
      Swal.fire({
        icon: 'info',
        title: 'Login required',
        text: 'Login to apply and unlock job opportunities.',
        timer: 1800,
        showConfirmButton: false,
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
      }).then(() => navigate(ROUTES.LOGIN));
      return;
    }

    if (requiresSubscription && !subscription) {
      Swal.fire({
        icon: 'warning',
        title: 'Premium access required',
        text: 'Remote Jobs are available only for Premium Members.',
        confirmButtonText: 'View pricing',
        confirmButtonColor: '#1D4ED8',
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
      }).then((result) => {
        if (result.isConfirmed) {
          navigate(ROUTES.PRICING);
        }
      });
      return;
    }

    if (hasApplied) {
      Swal.fire({
        icon: 'info',
        title: 'Already applied',
        text: 'You have already applied for this job.',
        timer: 1600,
        showConfirmButton: false,
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
      });
      return;
    }

    setApplyLoading(true);
    try {
      let finalResumeUrl = resumeUrl;
      if (resumeFile) {
        finalResumeUrl = await userService.uploadResume(user.id, resumeFile);
        await userService.updateProfile(user.id, { resume_url: finalResumeUrl });
        setResumeUrl(finalResumeUrl);
      }

      if (!finalResumeUrl) {
        Swal.fire({
          icon: 'error',
          title: 'Resume required',
          text: 'Please upload a resume before applying.',
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
        });
        return;
      }

      const answers = job.screeningQuestions?.map((question) => ({
        question,
        answer: screeningAnswers[question] || '',
      }))?.filter((item) => item.answer.trim()) || [];

      const applicationResult = await applicationService.applyForJob(
        job.id,
        user.id,
        finalResumeUrl,
        coverLetter,
        answers,
        currentCtc,
        expectedCtc,
        noticePeriod
      );

      if (applicationResult && (applicationResult.priority_application || applicationResult.priorityApplication)) {
        await Swal.fire({
          icon: 'success',
          title: '⭐ Priority Application Submitted',
          text: 'Your priority application has been submitted and will be shown to the recruiter first.',
          timer: 2000,
          showConfirmButton: false,
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
        });
      } else {
        await Swal.fire({
          icon: 'success',
          title: 'Application submitted!',
          text: 'Your application has been sent successfully.',
          timer: 1800,
          showConfirmButton: false,
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
        });
      }
      setHasApplied(true);
      setApplyDialogOpen(false);
      navigate(ROUTES.JOBS);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Application failed',
        text: error instanceof Error ? error.message : 'Failed to apply',
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
      });
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <Layout>
      <SEO
        title={jobTitle && companyName ? `${jobTitle} at ${companyName} | JobPoyt` : 'Job Details | JobPoyt'}
        description={jobDescription ? jobDescription.slice(0, 160) : 'View job details and application information on JobPoyt.'}
        canonical={jobCanonical}
        type="article"
        structuredData={jobPostingSchema ? [jobPostingSchema, jobBreadcrumbSchema] : jobBreadcrumbSchema}
      />
      <Container maxWidth="xl" sx={{ py: { xs: 2.5, md: 4 } }}>
        <Card
          sx={{
            mb: 3,
            borderRadius: 4,
            border: '1px solid rgba(148, 163, 184, 0.28)',
            background:
              'radial-gradient(circle at 18% 20%, rgba(56, 189, 248, 0.24), transparent 36%), radial-gradient(circle at 88% 12%, rgba(37, 99, 235, 0.20), transparent 38%), linear-gradient(135deg, #0f172a, #1e293b)',
            color: '#f8fafc',
            boxShadow: '0 30px 70px rgba(15, 23, 42, 0.24)',
          }}
        >
          <CardContent sx={{ p: { xs: 2.2, md: 3.2 } }}>
            <Grid container spacing={2.5} alignItems="center">
              <Grid item xs={12} md={8}>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 800,
                    lineHeight: 1.12,
                    fontSize: { xs: '1.65rem', md: '2.3rem' },
                    mb: 1,
                  }}
                >
                  {job.title}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'rgba(226, 232, 240, 0.92)',
                    mb: 1.5,
                    ...(showRemotePremium ? { filter: 'blur(4px)', userSelect: 'none' } : {}),
                  }}
                >
                  {showRemotePremium ? 'Upgrade to view company' : job.company_name}
                </Typography>

                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.6 }}>
                  <Chip label={jobTypeLabel} sx={{ bgcolor: 'rgba(56, 189, 248, 0.2)', color: '#e0f2fe', fontWeight: 700 }} />
                  <Chip label={workModeLabel} sx={{ bgcolor: 'rgba(59, 130, 246, 0.22)', color: '#dbeafe', fontWeight: 700 }} />
                  <Chip
                    icon={<CalendarMonthIcon sx={{ color: '#bfdbfe !important' }} />}
                    label={`Posted ${postedOn}`}
                    sx={{ bgcolor: 'rgba(148, 163, 184, 0.18)', color: '#e2e8f0', fontWeight: 600 }}
                  />
                </Stack>

                <Stack direction="row" spacing={2.2} useFlexGap flexWrap="wrap">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <LocationOnIcon sx={{ color: '#7dd3fc' }} />
                    <Typography variant="body2" sx={{ color: '#e2e8f0' }}>{job.location}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <MonetizationOnIcon sx={{ color: '#86efac' }} />
                    <Typography variant="body2" sx={{ color: '#bbf7d0', fontWeight: 700 }}>
                      {formatJobSalary(job.salaryMin, job.salaryMax)}
                    </Typography>
                  </Box>
                  {(job.positionsAvailable || job.positions_available) ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <WorkIcon sx={{ color: '#93c5fd' }} />
                      <Typography variant="body2" sx={{ color: '#dbeafe', ...(showRemotePremium ? { filter: 'blur(4px)', userSelect: 'none' } : {}) }}>
                        {showRemotePremium ? 'Positions hidden - Upgrade' : `Hiring ${job.positionsAvailable || job.positions_available} position${(job.positionsAvailable || job.positions_available) === 1 ? '' : 's'}`}
                      </Typography>
                    </Box>
                  ) : null}
                </Stack>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: '1px solid rgba(148, 163, 184, 0.34)',
                    background: 'rgba(15, 23, 42, 0.28)',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <Button
                    variant={isSaved ? 'contained' : 'outlined'}
                    fullWidth
                    startIcon={isSaved ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                    onClick={handleSaveToggle}
                    disabled={savedLoading}
                    sx={{
                      mb: 1.2,
                      color: isSaved ? '#e0f2fe' : '#e2e8f0',
                      borderColor: 'rgba(148, 163, 184, 0.45)',
                      bgcolor: isSaved ? 'rgba(37, 99, 235, 0.62)' : 'rgba(30, 41, 59, 0.55)',
                      textTransform: 'none',
                      fontWeight: 700,
                      '&:hover': {
                        bgcolor: isSaved ? 'rgba(29, 78, 216, 0.72)' : 'rgba(51, 65, 85, 0.72)',
                        borderColor: 'rgba(148, 163, 184, 0.62)',
                      },
                    }}
                  >
                    {isSaved ? 'Saved to Favorites' : 'Save Job'}
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<ShareIcon />}
                    onClick={() => {
                      if (!hasAccess) {
                        toast.error('Upgrade to premium to share remote jobs');
                        return;
                      }

                      if (canUseNativeShare) {
                        navigator.share({
                          title: job.title,
                          text: `Check out this job: ${job.title} at ${job.company_name}`,
                          url: window.location.href,
                        });
                        return;
                      }

                      navigator.clipboard.writeText(window.location.href)
                        .then(() => toast.success('Job link copied to clipboard'))
                        .catch(() => toast.error('Unable to share this link right now'));
                    }}
                    sx={{
                      color: '#e2e8f0',
                      borderColor: 'rgba(148, 163, 184, 0.45)',
                      bgcolor: 'rgba(2, 132, 199, 0.34)',
                      textTransform: 'none',
                      fontWeight: 700,
                      '&:hover': {
                        bgcolor: 'rgba(3, 105, 161, 0.48)',
                        borderColor: 'rgba(148, 163, 184, 0.62)',
                      },
                    }}
                    disabled={!hasAccess}
                  >
                    Share Job
                  </Button>
                  {!hasAccess ? (
                    <Alert severity="info" sx={{ mt: 1.3, bgcolor: isDarkMode ? 'rgba(30, 64, 175, 0.28)' : 'rgba(224, 242, 254, 0.95)' }}>
                      Remote job details are available only for premium members.
                    </Alert>
                  ) : null}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card
              sx={{
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
                background: isDarkMode ? 'linear-gradient(180deg, #111827, #0F172A)' : 'linear-gradient(180deg, #ffffff, #f8fbff)',
                boxShadow: '0 18px 40px rgba(15, 23, 42, 0.07)',
              }}
            >
              <CardContent sx={{ p: { xs: 2, md: 2.8 } }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.3 }}>
                  Required Skills
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2.4 }}>
                  {job.skills.map((skill) => (
                    <Chip key={skill} label={skill} variant="outlined" sx={{ fontWeight: 600, bgcolor: isDarkMode ? 'rgba(96, 165, 250, 0.16)' : 'rgba(224, 242, 254, 0.45)', color: isDarkMode ? '#BFDBFE' : undefined }} />
                  ))}
                </Stack>

                {isRecruiterOwner && (
                  <Tabs
                    value={jobDetailsTab}
                    onChange={(_, value) => setJobDetailsTab(value)}
                    sx={{
                      mb: 2.4,
                      borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
                      '& .MuiTab-root': { textTransform: 'none', fontWeight: 700 },
                    }}
                  >
                    <Tab label="Job Details" />
                    <Tab label="Recommended Candidates" />
                  </Tabs>
                )}

                {isRecruiterOwner && jobDetailsTab === 1 ? (
                  <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>}>
                    <RecommendedCandidates
                      recruiterId={user?.id || ''}
                      jobId={job.id}
                      compact
                      onMessageClick={handleRecommendedMessage}
                    />
                  </Suspense>
                ) : !hasAccess && requiresSubscription ? (
                  <Box sx={{ p: 3, border: `1px solid ${isDarkMode ? 'rgba(96, 165, 250, 0.38)' : 'rgba(191, 219, 254, 1)'}`, borderRadius: 3, background: isDarkMode ? 'linear-gradient(180deg, #172554, #1E293B)' : 'linear-gradient(180deg, #eff6ff, #dbeafe)' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.8 }}>
                      Premium Remote Job
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.4 }}>
                      Remote jobs are available only for premium members. Upgrade to unlock full details and apply instantly.
                    </Typography>
                    <Button variant="contained" onClick={() => navigate(ROUTES.PRICING)}>
                      Upgrade Now
                    </Button>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#ffffff' }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.4 }}>
                          Job Description
                        </Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: 'text.secondary', lineHeight: 1.7 }}>
                          {job.description}
                        </Typography>
                      </CardContent>
                    </Card>

                    <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#ffffff' }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.2 }}>
                          Screening Questions
                        </Typography>
                        {screeningQuestions.length ? (
                          <Stack spacing={1}>
                            {screeningQuestions.map((question, index) => (
                              <Box key={question} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                <Chip label={index + 1} size="small" sx={{ minWidth: 28, fontWeight: 700 }} />
                                <Typography variant="body2" sx={{ color: 'text.secondary', pt: 0.25 }}>
                                  {question}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            No screening questions for this role.
                          </Typography>
                        )}
                      </CardContent>
                    </Card>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: 'text.secondary', px: 0.4 }}>
                      <CalendarMonthIcon sx={{ fontSize: 18 }} />
                      <Typography variant="caption">Posted on {postedOn}</Typography>
                    </Box>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                position: 'sticky',
                top: 80,
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
                background: isDarkMode ? 'linear-gradient(180deg, #111827, #0F172A)' : 'linear-gradient(180deg, #ffffff, #f8fbff)',
                boxShadow: '0 20px 42px rgba(15, 23, 42, 0.09)',
              }}
            >
              <CardContent sx={{ p: 2.2 }}>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleApplyClick}
                  disabled={!hasAccess || hasApplied}
                  sx={{
                    mb: 1.3,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 800,
                    py: 1.2,
                    background: 'linear-gradient(90deg, #0284c7, #2563eb)',
                    boxShadow: 'none',
                    '&:hover': {
                      background: 'linear-gradient(90deg, #0369a1, #1d4ed8)',
                      boxShadow: 'none',
                    },
                  }}
                >
                  {hasApplied ? 'Already Applied' : 'Apply Now'}
                </Button>

                {subscription && isCandidatePremium(subscription.plan) && isSubscriptionActive(subscription.end_date) && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.4 }}>
                    <Chip
                      icon={<BoltIcon sx={{ color: '#fff !important' }} />}
                      label="Priority Apply Enabled"
                      sx={{ background: 'linear-gradient(90deg,#f59e0b,#f97316)', color: '#fff', fontWeight: 800 }}
                    />
                  </Box>
                )}

                <Divider sx={{ my: 1.6 }} />

                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.4 }}>
                  Quick Snapshot
                </Typography>
                <Stack spacing={1.2} sx={{ mb: 2.2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Experience</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{job.experience || 'Not specified'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Applications</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{applicationsCount}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Work Mode</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{workModeLabel}</Typography>
                  </Box>
                </Stack>

                {user?.role === USER_ROLES.JOB_SEEKER && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.4, display: 'flex', alignItems: 'center', gap: 0.7 }}>
                      <WorkspacePremiumIcon sx={{ color: 'primary.main' }} />
                      AI Match Score
                    </Typography>

                    {matchLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                        <CircularProgress size={28} />
                      </Box>
                    ) : subscription ? (
                      aiMatch ? (
                        <Card variant="outlined" sx={{ p: 1.6, borderRadius: 2.5, bgcolor: isDarkMode ? '#111827' : '#fff' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography
                              variant="h4"
                              sx={{
                                fontWeight: 800,
                                color: aiMatch.color === 'success' ? 'success.main' : aiMatch.color === 'warning' ? 'warning.main' : 'error.main',
                              }}
                            >
                              {aiMatch.score}%
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {aiMatch.label}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={Math.max(0, Math.min(100, Number(aiMatch.score) || 0))}
                            sx={{ height: 8, borderRadius: 99, mb: 1.3 }}
                          />
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Matching Skills</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{aiMatch.matchedSkills.join(', ') || 'None'}</Typography>
                          </Box>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Missing Skills</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{aiMatch.missingSkills.join(', ') || 'None'}</Typography>
                          </Box>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Experience Match</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{aiMatch.experiencePercent}%</Typography>
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Suggestions</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{aiMatch.suggestions.join(' • ')}</Typography>
                          </Box>
                        </Card>
                      ) : (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>No profile data to compute match.</Typography>
                      )
                    ) : (
                      <Card variant="outlined" sx={{ p: 2, borderRadius: 2.5, position: 'relative', overflow: 'hidden', background: isDarkMode ? 'linear-gradient(180deg, #111827, #172033)' : 'linear-gradient(180deg,#f8fafc,#eef2ff)' }}>
                        <Box sx={{ filter: 'blur(4px)', userSelect: 'none' }}>
                          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.8 }}>Premium Feature</Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.8 }}>Know how well your profile matches this job.</Typography>
                          <Button variant="contained" fullWidth onClick={() => navigate(ROUTES.PRICING)}>Upgrade to Premium</Button>
                        </Box>
                      </Card>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Recommended Candidate Message Dialog */}
        <Dialog open={chatDialogOpen} onClose={() => setChatDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Message {selectedChatUser?.name}</DialogTitle>
          <DialogContent dividers>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Write a message to this candidate..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              disabled={sendingMessage}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setChatDialogOpen(false)} disabled={sendingMessage}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSendRecommendedMessage}
              disabled={!chatMessage.trim() || sendingMessage}
              endIcon={sendingMessage ? <CircularProgress size={18} /> : undefined}
            >
              {sendingMessage ? 'Sending...' : 'Send Message'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Apply Dialog */}
        <Dialog open={applyDialogOpen} onClose={() => setApplyDialogOpen(false)} maxWidth="sm" fullWidth>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Apply for {job.title}
            </Typography>

            <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Resume Upload / Update
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Upload your latest resume or use the resume already saved to your profile.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button variant="outlined" component="label">
                  {resumeFile ? 'Update Resume' : 'Upload Resume'}
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => e.target.files?.[0] && setResumeFile(e.target.files[0])}
                  />
                </Button>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {resumeFile ? resumeFile.name : resumeUrl ? 'Using saved resume' : 'No resume uploaded yet'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 3, display: 'grid', gap: 2 }}>
              <TextField
                fullWidth
                label="Current CTC"
                value={currentCtc}
                onChange={(e) => setCurrentCtc(e.target.value)}
              />
              <TextField
                fullWidth
                label="Expected CTC"
                value={expectedCtc}
                onChange={(e) => setExpectedCtc(e.target.value)}
              />
              <TextField
                fullWidth
                label="Notice Period"
                value={noticePeriod}
                onChange={(e) => setNoticePeriod(e.target.value)}
              />
            </Box>

            {job.screeningQuestions?.length ? (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Screening Questions
                </Typography>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  {job.screeningQuestions.map((question) => (
                    <TextField
                      key={question}
                      fullWidth
                      label={question}
                      multiline
                      rows={2}
                      value={screeningAnswers[question] || ''}
                      onChange={(e) => setScreeningAnswers((prev) => ({ ...prev, [question]: e.target.value }))}
                    />
                  ))}
                </Box>
              </Box>
            ) : null}

            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Write a cover letter (optional)"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" fullWidth onClick={() => setApplyDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="contained" fullWidth onClick={handleApply} disabled={applyLoading || hasApplied}>
                {hasApplied ? 'Already Applied' : applyLoading ? 'Applying...' : 'Submit Application'}
              </Button>
            </Box>
          </Box>
        </Dialog>
      </Container>
    </Layout>
  );
};
