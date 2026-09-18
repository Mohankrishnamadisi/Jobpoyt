import React, { Suspense, useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogContent,
  CircularProgress,
  Autocomplete,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  Add as AddIcon,
  ArrowRight as ArrowRightIcon,
  Search as SearchIcon,
  WorkOutline as WorkOutlineIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@store/index';
import { ROUTES } from '@constants/index';
import { recruiterService, statsService, notificationService, jobService, subscriptionService } from '@services/api';
import { useSubscription } from '@hooks/index';
import { SubscriptionSummaryCard } from '@components/common/SubscriptionSummaryCard';
import { messagingService } from '@services/messaging';
import { billingSubscriptionService } from '@services/billingSubscription';
import { getRecruiterWelcomeUsage } from '@utils/recruiterWelcomeBenefits';
import toast from 'react-hot-toast';
import type { Job } from '@types';
import { themeColors } from '@styles/recruiterTheme';
import { RecruiterLayout } from '@components/recruiter/RecruiterLayout';
import { DashboardOverview } from '@components/recruiter/DashboardOverview';
import { JobPostingForm } from '@components/recruiter/JobPostingForm';
import { ManageJobs } from '@components/recruiter/ManageJobs';
import { ViewApplicants } from '@components/recruiter/ViewApplicants';
import { CompanyProfile } from '@components/recruiter/CompanyProfile';
import { CandidateSearch } from '@components/recruiter/CandidateSearch';
import { TagManager } from '@components/recruiter/TagManager';
import { TalentPool } from '@components/recruiter/TalentPool';
import { RecruiterSettingsPanel } from '@components/recruiter/RecruiterSettings';
import { InterviewManagement } from '@components/recruiter/InterviewManagement';
import { RecruiterMessagingCenter, type PendingRecruiterChatTarget } from '@components/recruiter/RecruiterMessagingCenter';
import { RecruiterAnalyticsInsights } from '@components/recruiter/RecruiterAnalyticsInsights';
import { RecruiterAutomationCenter } from '@components/recruiter/RecruiterAutomationCenter';
import { EmployerBrandingCenter } from '@components/recruiter/EmployerBrandingCenter';
import { RecruiterAiHiringAssistant } from '@components/recruiter/RecruiterAiHiringAssistant';
import { RecruiterTeamManagement } from '@components/recruiter/RecruiterTeamManagement';
import { RecruiterIntegrationsHub } from '@components/recruiter/RecruiterIntegrationsHub';
import { RecruiterBillingSubscription } from '@components/recruiter/RecruiterBillingSubscription';
import { RecruiterMarketIntelligence } from '@components/recruiter/RecruiterMarketIntelligence';
import { RecruiterSecurityCenter } from '@components/recruiter/RecruiterSecurityCenter';
import { RecruiterOrganizationCenter } from '@components/recruiter/RecruiterOrganizationCenter';
import { RecruiterMobilePwaCenter } from '@components/recruiter/RecruiterMobilePwaCenter';
import { RecruiterAssessmentsCenter } from '@components/recruiter/RecruiterAssessmentsCenter';
import { RecruiterCommunityReferralsCenter } from '@components/recruiter/RecruiterCommunityReferralsCenter';
import { RecruiterDeveloperApiCenter } from '@components/recruiter/RecruiterDeveloperApiCenter';
import { RecruiterExecutiveIntelligenceCenter } from '@components/recruiter/RecruiterExecutiveIntelligenceCenter';
import PipelineBoard from '../../features/ats/PipelineBoard';


type DashboardTab =
  | 'overview'
  | 'jobs'
  | 'ai-hiring-assistant'
  | 'team-management'
  | 'integrations'
  | 'billing-subscription'
  | 'market-intelligence'
  | 'security-center'
  | 'organization'
  | 'assessments'
  | 'employee-referrals'
  | 'talent-community'
  | 'mobile-pwa'
  | 'developer-portal'
  | 'api-management'
  | 'marketplace'
  | 'webhooks'
  | 'executive-intelligence'
  | 'business-intelligence'
  | 'data-warehouse'
  | 'ai-insights'
  | 'forecasting'
  | 'analytics'
  | 'automation-center'
  | 'messages'
  | 'interview-management'
  | 'company-profile'
  | 'employer-branding'
  | 'applicants'
  | 'recommended'
  | 'find-candidates'
  | 'talent-pool'
  | 'tags'
  | 'ats-pipeline'
  | 'my-details'
  | 'settings';

const MotionBox = motion(Box);
const MotionCard = motion(Card);
const RecommendedCandidates = React.lazy(() =>
  import('@components/recruiter/RecommendedCandidates').then((module) => ({
    default: module.RecommendedCandidates,
  }))
);

export const RecruiterDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { subscription, loading: subscriptionLoading, refetch: refetchSubscription } = useSubscription(user?.id || null);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);

  // State
  const [currentTab, setCurrentTab] = useState<DashboardTab>('overview');
  const [jobPostingFormOpen, setJobPostingFormOpen] = useState(false);
  const [stats, setStats] = useState({
    active_jobs: 0,
    total_jobs: 0,
    total_applicants: 0,
    shortlisted: 0,
    rejected: 0,
    priority_applicants: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recruiterProfile, setRecruiterProfile] = useState<any>(null);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [layoutCredits, setLayoutCredits] = useState(0);
  const [layoutPlanName, setLayoutPlanName] = useState('Free');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [recommendedJobId, setRecommendedJobId] = useState('');
  const [pipelineJobId, setPipelineJobId] = useState('');
  const [pendingChatTarget, setPendingChatTarget] = useState<PendingRecruiterChatTarget | null>(null);
  const [welcomeBenefit, setWelcomeBenefit] = useState<any>(null);
  const [welcomeBannerDismissed, setWelcomeBannerDismissed] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  useEffect(() => {
    const requestedTab = (location.state as { tab?: DashboardTab } | null)?.tab;
    if (requestedTab) {
      setCurrentTab(requestedTab);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!user?.id) return undefined;

    let mounted = true;
    const refreshUnreadNotifications = async () => {
      try {
        const unreadNotif = await notificationService.getUnreadNotifications(user.id);
        if (!mounted) return;
        setNotificationsCount(unreadNotif?.length || 0);
      } catch {
        // noop
      }
    };

    refreshUnreadNotifications();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshUnreadNotifications();
      }
    }, 30000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!recommendedJobId && jobs.length > 0) {
      setRecommendedJobId(jobs[0].id);
    }
  }, [jobs, recommendedJobId]);

  useEffect(() => {
    if (!pipelineJobId && jobs.length > 0) {
      setPipelineJobId(jobs[0].id);
    }
  }, [jobs, pipelineJobId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const recruiterId = user?.id || '';
      billingSubscriptionService.initialize(recruiterId, recruiterId);

      const [statsData, profileData, unreadNotif, conversations, recruiterJobs, billingOverview, onboarding] =
        await Promise.all([
          statsService.getRecruiterStats(recruiterId).catch((error) => {
            console.error('Failed to load recruiter stats:', error);
            return null;
          }),
          recruiterService.getRecruiterProfile(recruiterId).catch((error) => {
            console.error('Failed to load recruiter profile:', error);
            return null;
          }),
          notificationService.getUnreadNotifications(recruiterId).catch((error) => {
            console.error('Failed to load notifications:', error);
            return [];
          }),
          messagingService.getConversations(recruiterId).catch((error) => {
            console.error('Failed to load conversations:', error);
            return [];
          }),
          jobService.getRecruiterJobs(recruiterId).catch((error) => {
            console.error('Failed to load recruiter jobs:', error);
            return [];
          }),
          billingSubscriptionService.getBillingOverview(recruiterId, recruiterId).catch((error) => {
            console.error('Failed to load billing overview:', error);
            return null;
          }),
          getRecruiterWelcomeUsage(recruiterId).catch(() => null),
        ]);

      if (statsData) {
        setStats((previous) => ({
          ...previous,
          ...statsData,
          priority_applicants: (statsData as any)?.priority_applicants || 0,
        }));
      }
      setRecruiterProfile(profileData);
      setJobs(recruiterJobs || []);
      setNotificationsCount(unreadNotif?.length || 0);
      setUnreadMessagesCount(
        (conversations || []).reduce((count: number, item: any) => count + Number(item?.unreadCount || 0), 0)
      );
      setLayoutCredits(Number(billingOverview?.creditsRemaining || 0));
      setLayoutPlanName(String(billingOverview?.currentPlan || 'Free'));
      setWelcomeBenefit(onboarding || null);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleChatClick = (
    candidateId: string,
    candidateName: string,
    source: PendingRecruiterChatTarget['source'] = 'manual',
    action: PendingRecruiterChatTarget['action'] = 'message'
  ) => {
    setPendingChatTarget({
      candidateId,
      candidateName,
      source,
      action,
    });
    setCurrentTab('messages');
  };

  const welcomeUsage = welcomeBenefit || {
    freeJobPostsRemaining: 0,
    freeResumeViewsRemaining: 0,
    freeJobPostsUsed: 0,
    freeResumeViewsUsed: 0,
    freeJobPostsTotal: 15,
    freeResumeViewsTotal: 150,
    claimed: false,
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: themeColors.backgroundAlt,
        }}
      >
        <CircularProgress size={60} sx={{ color: themeColors.primary }} />
      </Box>
    );
  }

  // Render Content Based on Tab
  const renderContent = () => {
    switch (currentTab) {
      case 'overview':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {!welcomeBannerDismissed && welcomeUsage.claimed && (
              <Card
                sx={{ mb: 3, borderRadius: 3, border: '1px solid rgba(59,130,246,0.18)', background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(168,85,247,0.06))' }}
              >
                <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: themeColors.text.primary }}>🎉 Welcome to Jobpoyt</Typography>
                    <Typography variant="body2" sx={{ color: themeColors.text.secondary, mt: 0.5 }}>
                      You have received 15 Free Job Posts and 150 Free Resume Views. Start hiring today — no subscription required.
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button variant="contained" size="small" onClick={() => setJobPostingFormOpen(true)} sx={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)', fontWeight: 700 }}>
                      Post Your First Job
                    </Button>
                    <Button variant="text" size="small" onClick={() => setWelcomeBannerDismissed(true)} sx={{ color: themeColors.text.secondary }}>
                      Dismiss
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}

            {welcomeUsage.claimed && (
              <Card sx={{ mb: 3, borderRadius: 3, border: `1px solid ${themeColors.border}`, background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.96))' }}>
                <CardContent>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: themeColors.text.primary }}>Welcome to Jobpoyt</Typography>
                  <Typography variant="body2" sx={{ color: themeColors.text.secondary, mb: 2 }}>
                    Start hiring with your complimentary recruiter benefits.
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Card sx={{ borderRadius: 3, background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <CardContent>
                          <Typography variant="h4" sx={{ fontWeight: 900, color: '#065F46' }}>🎁 15</Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Free Job Posts</Typography>
                          <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>
                            {welcomeUsage.freeJobPostsUsed} / {welcomeUsage.freeJobPostsTotal} used · {welcomeUsage.freeJobPostsRemaining} remaining
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Card sx={{ borderRadius: 3, background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.02))', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <CardContent>
                          <Typography variant="h4" sx={{ fontWeight: 900, color: '#1D4ED8' }}>📄 150</Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Free Resume Views</Typography>
                          <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>
                            {welcomeUsage.freeResumeViewsUsed} / {welcomeUsage.freeResumeViewsTotal} used · {welcomeUsage.freeResumeViewsRemaining} remaining
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            <DashboardOverview
              activeJobs={stats.active_jobs}
              totalApplicants={stats.total_applicants}
              shortlisted={stats.shortlisted}
              rejected={stats.rejected}
              priorityCandidates={stats.priority_applicants}
              onViewJobs={() => setCurrentTab('jobs')}
              onViewApplicants={() => setCurrentTab('applicants')}
              onPostJob={() => setJobPostingFormOpen(true)}
            />

            <Dialog open={subscriptionDialogOpen} onClose={() => setSubscriptionDialogOpen(false)} maxWidth="md" fullWidth>
              <DialogContent sx={{ p: { xs: 1.5, md: 2 } }}>
                <SubscriptionSummaryCard
                  subscription={subscription}
                  loading={subscriptionLoading}
                  onRenew={() => {
                    setSubscriptionDialogOpen(false);
                    navigate(ROUTES.RECRUITER_SUBSCRIPTION);
                  }}
                  onToggleAutoRenew={async (autoRenew) => {
                    if (!subscription?.id) return;
                    try {
                      await subscriptionService.setAutoRenew(subscription.id, autoRenew);
                      toast.success(autoRenew ? 'Auto-renewal enabled' : 'Auto-renewal disabled');
                      refetchSubscription();
                    } catch (error) {
                      console.error('Failed to update auto-renew:', error);
                      toast.error('Could not update auto-renewal. Please try again.');
                    }
                  }}
                />
              </DialogContent>
            </Dialog>

            {/* Quick Actions Section */}
            <Grid container spacing={3} sx={{ mt: 2 }}>
              {/* Post New Job Card */}
              <Grid item xs={12} md={6}>
                <MotionCard
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.08 }}
                  whileHover={{ y: -8, boxShadow: '0 18px 44px rgba(15, 23, 42, 0.14)' }}
                  onClick={() => setJobPostingFormOpen(true)}
                  sx={{
                    borderRadius: '22px',
                    border: `1px solid ${themeColors.border}`,
                    background: `linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(245,250,255,0.95) 100%)`,
                    cursor: 'pointer',
                    transition: 'all 0.25s ease-in-out',
                    minHeight: 180,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: 6,
                      background: `linear-gradient(90deg, ${themeColors.primary} 0%, #7C3AED 100%)`,
                    }}
                  />
                  <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 800,
                            color: themeColors.text.primary,
                            mb: 1,
                          }}
                        >
                          Post a New Job
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: themeColors.text.secondary,
                            fontSize: '0.9rem',
                            lineHeight: 1.6,
                          }}
                        >
                          Start recruiting for your open positions with a beautiful job listing experience.
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        sx={{
                          minWidth: 130,
                          background: `linear-gradient(135deg, ${themeColors.primary} 0%, #7C3AED 100%)`,
                          color: '#FFFFFF',
                          fontWeight: 700,
                          py: 1.25,
                        }}
                      >
                        Post Job
                      </Button>
                    </Box>
                  </CardContent>
                </MotionCard>
              </Grid>

              {/* View Pipeline Card */}
              <Grid item xs={12} md={6}>
                <MotionCard
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.12 }}
                  whileHover={{ y: -8, boxShadow: '0 18px 44px rgba(15, 23, 42, 0.14)' }}
                  onClick={() => setCurrentTab('ats-pipeline')}
                  sx={{
                    borderRadius: '22px',
                    border: `1px solid ${themeColors.border}`,
                    background: `linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(250,252,255,0.96) 100%)`,
                    cursor: 'pointer',
                    transition: 'all 0.25s ease-in-out',
                    minHeight: 180,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: 6,
                      background: `linear-gradient(90deg, ${themeColors.primary} 0%, ${themeColors.primaryLight} 100%)`,
                    }}
                  />
                  <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 800,
                            color: themeColors.text.primary,
                            mb: 1,
                          }}
                        >
                          View ATS Pipeline
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: themeColors.text.secondary,
                            fontSize: '0.9rem',
                            lineHeight: 1.6,
                          }}
                        >
                          Manage your hiring stages and candidate flow with confidence.
                        </Typography>
                      </Box>
                      <ArrowRightIcon sx={{ color: themeColors.primary, fontSize: '2rem' }} />
                    </Box>
                  </CardContent>
                </MotionCard>
              </Grid>

              {/* My Subscription Card */}
              <Grid item xs={12}>
                <MotionCard
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.16 }}
                  whileHover={{ y: -8, boxShadow: '0 18px 44px rgba(15, 23, 42, 0.14)' }}
                  onClick={() => setSubscriptionDialogOpen(true)}
                  sx={{
                    borderRadius: '22px',
                    border: `1px solid ${themeColors.border}`,
                    background: `linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,251,235,0.96) 100%)`,
                    cursor: 'pointer',
                    transition: 'all 0.25s ease-in-out',
                    minHeight: 120,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: 6,
                      background: 'linear-gradient(90deg, #D6A73A 0%, #B78317 100%)',
                    }}
                  />
                  <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: themeColors.text.primary, mb: 1 }}>
                          My Subscription
                        </Typography>
                        <Typography variant="body2" sx={{ color: themeColors.text.secondary, fontSize: '0.9rem', lineHeight: 1.6 }}>
                          View your plan, amount paid, and renewal date.
                        </Typography>
                      </Box>
                      <ArrowRightIcon sx={{ color: themeColors.primary, fontSize: '2rem' }} />
                    </Box>
                  </CardContent>
                </MotionCard>
              </Grid>
            </Grid>
          </MotionBox>
        );

      case 'jobs':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: themeColors.text.primary,
                }}
              >
                Jobs
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setJobPostingFormOpen(true)}
                sx={{
                  background: `linear-gradient(135deg, ${themeColors.primary} 0%, #7C3AED 100%)`,
                  color: '#FFFFFF',
                }}
              >
                Post Job
              </Button>
            </Box>
            {user?.id && <ManageJobs recruiterId={user.id} onJobsChange={fetchData} />}
          </MotionBox>
        );

      case 'analytics':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {user?.id && <RecruiterAnalyticsInsights recruiterId={user.id} />}
          </MotionBox>
        );

      case 'ai-hiring-assistant':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {user?.id && <RecruiterAiHiringAssistant recruiterId={user.id} />}
          </MotionBox>
        );

      case 'team-management':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {user?.id && (
              <RecruiterTeamManagement
                ownerId={user.id}
                currentUserId={user.id}
                ownerName={recruiterProfile?.company_name || recruiterProfile?.companyName || recruiterProfile?.hr_name || 'Company Owner'}
                ownerEmail={recruiterProfile?.company_email || recruiterProfile?.companyEmail || ''}
                jobs={jobs}
              />
            )}
          </MotionBox>
        );

      case 'integrations':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {user?.id && (
              <RecruiterIntegrationsHub
                ownerId={user.id}
                currentUserId={user.id}
              />
            )}
          </MotionBox>
        );

      case 'billing-subscription':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {user?.id && (
              <RecruiterBillingSubscription
                ownerId={user.id}
                currentUserId={user.id}
              />
            )}
          </MotionBox>
        );

      case 'market-intelligence':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {user?.id && (
              <RecruiterMarketIntelligence
                ownerId={user.id}
                currentUserId={user.id}
              />
            )}
          </MotionBox>
        );

      case 'security-center':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {user?.id && (
              <RecruiterSecurityCenter
                ownerId={user.id}
                currentUserId={user.id}
              />
            )}
          </MotionBox>
        );

      case 'organization':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {user?.id && (
              <RecruiterOrganizationCenter
                ownerId={user.id}
                currentUserId={user.id}
              />
            )}
          </MotionBox>
        );

      case 'assessments':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {user?.id && <RecruiterAssessmentsCenter recruiterId={user.id} />}
          </MotionBox>
        );

      case 'employee-referrals':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {user?.id && <RecruiterCommunityReferralsCenter recruiterId={user.id} mode="employee-referrals" />}
          </MotionBox>
        );

      case 'talent-community':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {user?.id && <RecruiterCommunityReferralsCenter recruiterId={user.id} mode="talent-community" />}
          </MotionBox>
        );

      case 'mobile-pwa':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <RecruiterMobilePwaCenter />
          </MotionBox>
        );

      case 'developer-portal':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <RecruiterDeveloperApiCenter mode="developer-portal" />
          </MotionBox>
        );

      case 'api-management':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <RecruiterDeveloperApiCenter mode="api-management" />
          </MotionBox>
        );

      case 'marketplace':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <RecruiterDeveloperApiCenter mode="marketplace" />
          </MotionBox>
        );

      case 'webhooks':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <RecruiterDeveloperApiCenter mode="webhooks" />
          </MotionBox>
        );

      case 'executive-intelligence':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <RecruiterExecutiveIntelligenceCenter mode="executive-intelligence" />
          </MotionBox>
        );

      case 'business-intelligence':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <RecruiterExecutiveIntelligenceCenter mode="business-intelligence" />
          </MotionBox>
        );

      case 'data-warehouse':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <RecruiterExecutiveIntelligenceCenter mode="data-warehouse" />
          </MotionBox>
        );

      case 'ai-insights':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <RecruiterExecutiveIntelligenceCenter mode="ai-insights" />
          </MotionBox>
        );

      case 'forecasting':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <RecruiterExecutiveIntelligenceCenter mode="forecasting" />
          </MotionBox>
        );

      case 'automation-center':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {user?.id && (
              <RecruiterAutomationCenter
                recruiterId={user.id}
                recruiterName={recruiterProfile?.hr_name || recruiterProfile?.company_name || 'Recruiter'}
                jobs={jobs.map((job) => ({ id: String(job.id), title: String(job.title || 'Untitled Job') }))}
              />
            )}
          </MotionBox>
        );

      case 'messages':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {user?.id && (
              <RecruiterMessagingCenter
                recruiterId={user.id}
                pendingTarget={pendingChatTarget}
                onPendingTargetHandled={() => setPendingChatTarget(null)}
                onOpenInterviewManagement={(payload) => {
                  setPendingChatTarget({
                    candidateId: payload.candidateId,
                    candidateName: payload.candidateName,
                    source: 'interview-management',
                    action: 'invite_interview',
                    jobId: payload.jobId,
                    jobTitle: payload.jobTitle,
                  });
                  setCurrentTab('interview-management');
                }}
              />
            )}
          </MotionBox>
        );

      case 'interview-management':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {user?.id && <InterviewManagement recruiterId={user.id} />}
          </MotionBox>
        );

      case 'applicants':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: themeColors.text.primary,
                mb: 3,
              }}
            >
              Applicants
            </Typography>
            {user?.id && <ViewApplicants recruiterId={user.id} onChatClick={(candidateId, candidateName) => handleChatClick(candidateId, candidateName, 'applicants', 'message')} />}
          </MotionBox>
        );

      case 'recommended':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: themeColors.text.primary,
                mb: 3,
              }}
            >
              Recommended Candidates
            </Typography>

            {jobs.length === 0 ? (
              <Card sx={{ borderRadius: '12px', border: `1px solid ${themeColors.border}` }}>
                <CardContent>
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                    No jobs available for recommendations
                  </Typography>
                  <Typography variant="body2" sx={{ color: themeColors.text.secondary, mb: 2 }}>
                    Post a job first to get AI-powered candidate recommendations.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setJobPostingFormOpen(true)}
                    sx={{ background: `linear-gradient(135deg, ${themeColors.primary} 0%, #7C3AED 100%)` }}
                  >
                    Post New Job
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card sx={{ mb: 2, borderRadius: '12px', border: `1px solid ${themeColors.border}` }}>
                  <CardContent>
                    <FormControl fullWidth size="small">
                      <InputLabel id="recommended-job-label">Recommend candidates for job</InputLabel>
                      <Select
                        labelId="recommended-job-label"
                        value={recommendedJobId}
                        label="Recommend candidates for job"
                        onChange={(event) => setRecommendedJobId(event.target.value)}
                      >
                        {jobs.map((job) => (
                          <MenuItem key={job.id} value={job.id}>
                            {job.title} - {job.location}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </CardContent>
                </Card>
                {user?.id && recommendedJobId && (
                  <Suspense fallback={<CircularProgress />}>
                    <RecommendedCandidates
                      recruiterId={user.id}
                      jobId={recommendedJobId}
                      onMessageClick={(candidateId, candidateName) => handleChatClick(candidateId, candidateName, 'recommended', 'message')}
                    />
                  </Suspense>
                )}
              </>
            )}
          </MotionBox>
        );

      case 'find-candidates':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: themeColors.text.primary,
                mb: 3,
              }}
            >
              Find Candidates
            </Typography>
            {user?.id && <CandidateSearch recruiterId={user.id} onChatClick={(candidateId, candidateName) => handleChatClick(candidateId, candidateName, 'find-candidates', 'message')} />}
          </MotionBox>
        );

      case 'talent-pool':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: themeColors.text.primary,
                mb: 3,
              }}
            >
              Talent Pool
            </Typography>
            {user?.id && <TalentPool recruiterId={user.id} onChatClick={(candidateId, candidateName) => handleChatClick(candidateId, candidateName, 'talent-pool', 'message')} />}
          </MotionBox>
        );

      case 'tags':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: themeColors.text.primary,
                mb: 3,
              }}
            >
              Candidate Tags
            </Typography>
            {user?.id && <TagManager recruiterId={user.id} inline onTagsChange={fetchData} />}
          </MotionBox>
        );

      case 'ats-pipeline':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: themeColors.text.primary,
                mb: 3,
              }}
            >
              ATS Pipeline
            </Typography>
            {jobs.length > 0 && (
              <Card sx={{ mb: 2, borderRadius: 3, border: '1px solid rgba(96,165,250,0.25)', background: 'linear-gradient(145deg, #ffffff 0%, #F2F7FF 100%)', boxShadow: '0 14px 34px rgba(15,39,75,0.08)' }}>
                <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2 }}>
                    <Box sx={{ width: 34, height: 34, borderRadius: 1.5, display: 'grid', placeItems: 'center', color: '#28508A', bgcolor: '#DCEBFF' }}>
                      <WorkOutlineIcon sx={{ fontSize: 18 }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 850, color: '#16325C', lineHeight: 1.2 }}>Choose a job pipeline</Typography>
                      <Typography variant="caption" sx={{ color: '#71839B' }}>{jobs.length.toLocaleString()} jobs available · search by title or location</Typography>
                    </Box>
                  </Box>
                  <Autocomplete
                    options={jobs}
                    value={jobs.find((job) => job.id === pipelineJobId) || null}
                    onChange={(_, job) => setPipelineJobId(job?.id || '')}
                    getOptionLabel={(job) => `${job.title} - ${job.location || 'Location not specified'}`}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    autoHighlight
                    openOnFocus={false}
                    filterOptions={(options, state) => {
                      const query = state.inputValue.trim().toLowerCase();
                      if (!query) return options;
                      return options.filter((job) => `${job.title} ${job.location || ''} ${job.job_type || ''}`.toLowerCase().includes(query));
                    }}
                    renderOption={(props, job) => (
                      <Box component="li" {...props} key={job.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1, px: 1.25, borderBottom: '1px solid #EEF3F8' }}>
                        <Box sx={{ width: 28, height: 28, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1, color: '#28508A', bgcolor: '#E7F0FF', fontSize: '0.72rem', fontWeight: 900 }}>
                          {String(job.title || 'J').charAt(0).toUpperCase()}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ color: '#16325C', fontSize: '0.78rem', fontWeight: 800 }} noWrap>{job.title}</Typography>
                          <Typography sx={{ color: '#71839B', fontSize: '0.68rem' }} noWrap>{job.location || 'Location not specified'} · {job.job_type || 'Job'}</Typography>
                        </Box>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Pipeline for job"
                        placeholder="Search 1,000+ jobs..."
                        InputProps={{ ...params.InputProps, startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#5B8CFF', fontSize: 19 }} /></InputAdornment> }}
                        sx={{ '& .MuiOutlinedInput-root': { minHeight: 48, borderRadius: 2, bgcolor: '#FFFFFF', '&:hover fieldset': { borderColor: '#5B8CFF' }, '&.Mui-focused fieldset': { borderColor: '#28508A' } } }}
                      />
                    )}
                    noOptionsText="No matching jobs found"
                    fullWidth
                  />
                </CardContent>
              </Card>
            )}
            <PipelineBoard jobId={pipelineJobId || undefined} />
          </MotionBox>
        );

      case 'company-profile':
      case 'my-details':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {user?.id && <CompanyProfile recruiterId={user.id} onProfileUpdate={fetchData} />}
          </MotionBox>
        );

      case 'employer-branding':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {user?.id && (
              <EmployerBrandingCenter
                recruiterId={user.id}
                recruiterName={recruiterProfile?.company_name || recruiterProfile?.companyName || 'Company'}
                recruiterEmail={recruiterProfile?.company_email || recruiterProfile?.companyEmail || ''}
                recruiterProfile={recruiterProfile}
                jobs={jobs as Array<Record<string, unknown>>}
              />
            )}
          </MotionBox>
        );

      case 'settings':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: themeColors.text.primary,
                mb: 3,
              }}
            >
              Settings
            </Typography>
            {user?.id && <RecruiterSettingsPanel recruiterId={user.id} />}
          </MotionBox>
        );

      default:
        return (
          <Card sx={{ borderRadius: 3, border: `1px solid ${themeColors.border}` }}>
            <CardContent sx={{ textAlign: 'center', py: 5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: themeColors.text.primary, mb: 0.75 }}>
                This dashboard view is unavailable
              </Typography>
              <Typography variant="body2" sx={{ color: themeColors.text.secondary, mb: 2 }}>
                Return to the overview to continue managing your hiring workflow.
              </Typography>
              <Button variant="contained" onClick={() => setCurrentTab('overview')}>
                Go to Overview
              </Button>
            </CardContent>
          </Card>
        );
    }
  };


  return (
    <RecruiterLayout
      currentTab={currentTab}
      onTabChange={(tab) => {
        if (tab === 'credits') {
          navigate(ROUTES.RECRUITER_SUBSCRIPTION);
          return;
        }
        setCurrentTab(tab as DashboardTab);
      }}
      companyName={recruiterProfile?.company_name || 'Your Company'}
      companyLogo={recruiterProfile?.company_logo_url || recruiterProfile?.logo_url}
      notificationCount={notificationsCount}
      unreadMessagesCount={unreadMessagesCount}
      credits={layoutCredits}
      planName={layoutPlanName}
      onNotificationsClick={() => navigate(ROUTES.DASHBOARD_NOTIFICATIONS)}
      onMessagesClick={() => setCurrentTab('messages')}
      onProfileClick={() => setCurrentTab('my-details')}
      onSettingsClick={() => setCurrentTab('settings')}
    >
      {renderContent()}

      {/* Job Posting Dialog */}
      <Dialog
        open={jobPostingFormOpen}
        onClose={() => setJobPostingFormOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <JobPostingForm
          open={jobPostingFormOpen}
          onClose={() => {
            setJobPostingFormOpen(false);
            fetchData();
          }}
          recruiterId={user?.id || ''}
          onJobCreated={fetchData}
        />
      </Dialog>
    </RecruiterLayout>
  );
};

