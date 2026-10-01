import React, { Suspense, useEffect, useState } from 'react';
import {
  Box,
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
  Search as SearchIcon,
  WorkOutline as WorkOutlineIcon,
  PeopleOutline as PeopleOutlineIcon,
  AutoAwesome as AutoAwesomeIcon,
  Groups as GroupsIcon,
  LocalOfferOutlined as LocalOfferOutlinedIcon,
  AccountTreeOutlined as AccountTreeOutlinedIcon,
  SettingsOutlined as SettingsOutlinedIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@store/index';
import { ROUTES } from '@constants/index';
import { recruiterService, statsService, notificationService, jobService, subscriptionService } from '@services/api';
import { useSubscription } from '@hooks/index';
import { SubscriptionSummaryCard } from '@components/common/SubscriptionSummaryCard';
import { messagingService } from '@services/messaging';
import { billingSubscriptionService } from '@services/billingSubscription';
import { authService } from '@services/supabase';
import { canAfford, getRecruiterCreditStatus, JOB_POST_CREDIT_COST, type RecruiterCreditStatus } from '@services/recruiterCredits';
import { RecruiterPlanGuard } from '@components/recruiter/RecruiterPlanGuard';
import toast from 'react-hot-toast';
import type { Job } from '@types';
import { themeColors } from '@styles/recruiterTheme';
import { RecruiterLayout } from '@components/recruiter/RecruiterLayout';
import { DashboardOverview } from '@components/recruiter/DashboardOverview';
import RecruiterDashboardHome, { type RecruiterDashboardStats } from '@components/recruiter/RecruiterDashboardHome';
import { RecruiterPageHero } from '@components/recruiter/RecruiterPageHero';
import { ApplicantsByJobDonut, ApplicationStatusDonut, JobStatusDonut, PipelineFlowCard, WorkModeDonut } from '@components/recruiter/RecruiterInsights';
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
const RecommendedCandidates = React.lazy(() =>
  import('@components/recruiter/RecommendedCandidates').then((module) => ({
    default: module.RecommendedCandidates,
  }))
);

export const RecruiterDashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { subscription, loading: subscriptionLoading, refetch: refetchSubscription } = useSubscription(user?.id || null);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);

  // State
  const [currentTab, setCurrentTab] = useState<DashboardTab>('overview');
  const [jobPostingFormOpen, setJobPostingFormOpen] = useState(false);
  const [stats, setStats] = useState<RecruiterDashboardStats>({
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
  const [creditStatus, setCreditStatus] = useState<RecruiterCreditStatus | null>(null);
  const [welcomeBannerDismissed, setWelcomeBannerDismissed] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  useEffect(() => {
    const state = (location.state as { tab?: DashboardTab; openPostJob?: boolean } | null) || null;
    const requestedTab = state?.tab;
    const shouldOpenPostJob = Boolean(state?.openPostJob);

    if (requestedTab) {
      setCurrentTab(requestedTab);
    }

    if (shouldOpenPostJob) {
      setJobPostingFormOpen(true);
    }

    if (requestedTab || shouldOpenPostJob) {
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

      const [statsData, profileData, unreadNotif, conversations, recruiterJobs, credits] =
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
          getRecruiterCreditStatus().catch((error) => {
            console.error('Failed to load recruiter credits:', error);
            return null;
          }),
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
      setCreditStatus(credits);
      setLayoutCredits(credits ? (credits.unlimited ? -1 : credits.availableCredits) : 0);
      setLayoutPlanName(credits?.unlimited ? 'Recruiter Pro' : credits?.planState === 'expired' ? 'Expired' : 'Free');
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

  const canPostJob = canAfford(creditStatus, JOB_POST_CREDIT_COST);
  const openPostJob = () => {
    if (!canPostJob) {
      toast.error(`Posting a job needs ${JOB_POST_CREDIT_COST} credits. Upgrade to Recruiter Pro for unlimited job posts.`);
      navigate(ROUTES.RECRUITER_SUBSCRIPTION);
      return;
    }
    setJobPostingFormOpen(true);
  };

  const handlePlanGuardLogout = async () => {
    try {
      await authService.signOut();
    } catch {
      // Proceed with local logout even if Supabase sign-out fails.
    } finally {
      logout();
      navigate(ROUTES.LOGIN, { replace: true });
    }
  };

  const profileCompletionFields = [
    recruiterProfile?.company_name,
    recruiterProfile?.company_email,
    recruiterProfile?.company_phone,
    recruiterProfile?.company_website,
    recruiterProfile?.company_address || recruiterProfile?.location,
    recruiterProfile?.industry,
    recruiterProfile?.description,
    recruiterProfile?.gst_number,
    recruiterProfile?.hr_name,
    recruiterProfile?.hr_email,
    recruiterProfile?.hr_phone,
  ];
  const profileCompletion = Math.round(
    (profileCompletionFields.filter((field) => String(field || '').trim().length > 0).length / profileCompletionFields.length) * 100
  );
  const profileComplete = profileCompletion >= 80;

  useEffect(() => {
    if (!profileComplete && currentTab !== 'overview' && currentTab !== 'company-profile') {
      setCurrentTab('overview');
    }
  }, [currentTab, profileComplete]);

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
            {profileComplete && !welcomeBannerDismissed && creditStatus?.planState === 'free' && (
              <Card
                sx={{ mb: 3, borderRadius: 3, border: '1px solid rgba(59,130,246,0.18)', background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(168,85,247,0.06))' }}
              >
                <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: themeColors.text.primary }}>
                      {creditStatus.availableCredits} free credits remaining
                    </Typography>
                    <Typography variant="body2" sx={{ color: themeColors.text.secondary, mt: 0.5 }}>
                      Job post = {JOB_POST_CREDIT_COST} credits · Candidate unlock (contact + resume + full profile) = 1 credit. Upgrade to Recruiter Pro for unlimited access.
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button variant="contained" size="small" onClick={() => navigate(ROUTES.RECRUITER_SUBSCRIPTION)} sx={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)', fontWeight: 700 }}>
                      Upgrade to Pro
                    </Button>
                    <Button variant="text" size="small" onClick={() => setWelcomeBannerDismissed(true)} sx={{ color: themeColors.text.secondary }}>
                      Dismiss
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}

            {profileComplete ? (
              <RecruiterDashboardHome
                displayName={recruiterProfile?.hr_name || user?.name || user?.email || 'Recruiter'}
                companyName={recruiterProfile?.company_name}
                stats={stats}
                jobs={jobs}
                unreadMessages={unreadMessagesCount}
                unreadNotifications={notificationsCount}
                credits={layoutCredits}
                planName={layoutPlanName}
                creditStatus={creditStatus}
                canPostJob={canPostJob}
                onNavigate={(tab) => setCurrentTab(tab as DashboardTab)}
                onPostJob={openPostJob}
                onOpenSubscription={() => setSubscriptionDialogOpen(true)}
                onRefresh={fetchData}
              />
            ) : (
              <DashboardOverview
                profileCompletion={profileCompletion}
                profileComplete={profileComplete}
                onEditProfile={() => setCurrentTab('company-profile')}
              />
            )}

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
          </MotionBox>
        );

      case 'jobs':
        return (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <RecruiterPageHero
              eyebrow="Workspace"
              icon={<WorkOutlineIcon />}
              title="Jobs"
              description="Create, publish and manage every role you are hiring for."
              actions={(
                <>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={openPostJob} disabled={!canPostJob}>
                    {canPostJob ? `Post Job${creditStatus?.unlimited ? '' : ` · ${JOB_POST_CREDIT_COST} credits`}` : 'Not enough credits'}
                  </Button>
                  <Button variant="outlined" onClick={() => setCurrentTab('applicants')}>View applicants</Button>
                </>
              )}
              stats={[
                { label: 'Live jobs', value: stats.active_jobs.toLocaleString(), tone: 'ok' },
                { label: 'Total posted', value: stats.total_jobs.toLocaleString() },
                { label: 'Applicants', value: stats.total_applicants.toLocaleString() },
              ]}
            />
            {jobs.length > 0 && (
              <Box className="adm" sx={{ mb: 2.5 }}>
                <div className="adm-grid adm-grid--three">
                  <JobStatusDonut jobs={jobs} />
                  <WorkModeDonut jobs={jobs} />
                  <ApplicantsByJobDonut stats={stats} jobs={jobs} />
                </div>
              </Box>
            )}
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
            <RecruiterPageHero
              eyebrow="Workspace"
              icon={<PeopleOutlineIcon />}
              title="Applicants"
              description="Review, shortlist and move candidates forward for each of your jobs."
              actions={(
                <>
                  <Button variant="contained" onClick={() => setCurrentTab('ats-pipeline')}>Open ATS pipeline</Button>
                  <Button variant="outlined" onClick={() => setCurrentTab('interview-management')}>Interviews</Button>
                </>
              )}
              stats={[
                { label: 'Total applicants', value: stats.total_applicants.toLocaleString() },
                { label: 'Shortlisted', value: stats.shortlisted.toLocaleString(), tone: 'ok' },
                { label: 'Awaiting review', value: (stats.applied || 0).toLocaleString(), tone: (stats.applied || 0) > 0 ? 'warn' : 'ok' },
              ]}
            />
            {stats.total_applicants > 0 && (
              <Box className="adm" sx={{ mb: 2.5 }}>
                <div className="adm-grid adm-grid--wide">
                  <PipelineFlowCard stats={stats} onNavigate={(tab) => setCurrentTab(tab as DashboardTab)} />
                  <ApplicationStatusDonut stats={stats} />
                </div>
              </Box>
            )}
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
            <RecruiterPageHero
              eyebrow="Candidates"
              icon={<AutoAwesomeIcon />}
              title="Recommended Candidates"
              description="AI-matched profiles for your open roles, ranked by fit."
              stats={[
                { label: 'Jobs to match', value: jobs.length.toLocaleString() },
                { label: 'Live jobs', value: stats.active_jobs.toLocaleString(), tone: 'ok' },
              ]}
            />

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
                    onClick={openPostJob}
                    disabled={!canPostJob}
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
            <RecruiterPageHero
              eyebrow="Candidates"
              icon={<SearchIcon />}
              title="Find Candidates"
              description="Search the JobPoyt talent database by skills, experience and location."
              actions={(
                <>
                  <Button variant="contained" onClick={() => setCurrentTab('talent-pool')}>Talent pool</Button>
                  <Button variant="outlined" onClick={() => setCurrentTab('recommended')}>AI recommendations</Button>
                </>
              )}
              stats={[
                { label: 'Credits left', value: creditStatus?.unlimited ? 'Unlimited' : (creditStatus?.availableCredits ?? 0).toLocaleString(), tone: creditStatus?.unlimited || (creditStatus?.availableCredits ?? 0) > 0 ? 'ok' : 'warn' },
                { label: 'Unlock cost', value: creditStatus?.unlimited ? 'Free' : '1 credit' },
              ]}
            />
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
            <RecruiterPageHero
              eyebrow="Candidates"
              icon={<GroupsIcon />}
              title="Talent Pool"
              description="Organise your best candidates into pools and re-engage them for future roles."
              actions={<Button variant="contained" onClick={() => setCurrentTab('find-candidates')}>Find more candidates</Button>}
            />
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
            <RecruiterPageHero
              eyebrow="Candidates"
              icon={<LocalOfferOutlinedIcon />}
              title="Candidate Tags"
              description="Create colour-coded tags to label, filter and group candidates across jobs."
            />
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
            <RecruiterPageHero
              eyebrow="Workspace"
              icon={<AccountTreeOutlinedIcon />}
              title="ATS Pipeline"
              description="Drag candidates across stages — from applied to offer and hire."
              actions={(
                <>
                  <Button variant="contained" onClick={() => setCurrentTab('applicants')}>Review applicants</Button>
                  <Button variant="outlined" onClick={() => setCurrentTab('interview-management')}>Schedule interviews</Button>
                </>
              )}
              stats={[
                { label: 'Shortlisted', value: stats.shortlisted.toLocaleString() },
                { label: 'Hired', value: (stats.accepted || 0).toLocaleString(), tone: 'ok' },
                { label: 'Priority', value: stats.priority_applicants.toLocaleString() },
              ]}
            />
            {stats.total_applicants > 0 && (
              <Box className="adm" sx={{ mb: 2.5 }}>
                <PipelineFlowCard stats={stats} onNavigate={(tab) => setCurrentTab(tab as DashboardTab)} actionLabel="Review applicants" actionTab="applicants" />
              </Box>
            )}
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
            <RecruiterPageHero
              eyebrow="Account"
              icon={<SettingsOutlinedIcon />}
              title="Settings"
              description="Notifications, preferences and account controls for your recruiter workspace."
            />
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
      readOnly={!profileComplete}
      onNotificationsClick={() => navigate(ROUTES.DASHBOARD_NOTIFICATIONS)}
      onMessagesClick={() => setCurrentTab('messages')}
      onProfileClick={() => setCurrentTab('my-details')}
      onSettingsClick={() => setCurrentTab('settings')}
    >
      {renderContent()}

      <RecruiterPlanGuard
        status={creditStatus}
        onUpgrade={() => navigate(ROUTES.RECRUITER_SUBSCRIPTION)}
        onLogout={handlePlanGuardLogout}
      />

      {/* Job Posting Dialog */}
      <Dialog
        className="recruiter-job-dialog"
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

