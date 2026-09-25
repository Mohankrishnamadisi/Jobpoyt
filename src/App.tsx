import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { Box, CircularProgress, CssBaseline, useMediaQuery } from '@mui/material';
import { Toaster, toast } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { AnimatePresence } from 'framer-motion';

import { MobileAppShell } from '@components/mobile';

import { getTheme } from './styles/theme';
import { useAuthStore } from '@store/index';
import { authService } from '@services/supabase';
import { ROUTES, USER_ROLES } from '@constants/index';
import { ProtectedRoute } from '@components/common/ProtectedRoute';
import { ErrorBoundary } from '@components/common/ErrorBoundary';
import { GlobalApiLoader } from '@components/common/GlobalApiLoader';
import { ThemeModeProvider, useThemeMode } from './context/ThemeContext';

import { Home } from '@pages/Home';
import { Jobs } from '@pages/Jobs';
import { JobDetails } from '@pages/JobDetails';
import { Pricing } from '@pages/Pricing';
import { PrivacyPolicy } from '@pages/PrivacyPolicy';
import { TermsConditions } from '@pages/TermsConditions';
import { Login } from '@pages/auth/Login';
import { Signup } from '@pages/auth/Signup';
import { ForgotPassword } from '@pages/auth/ForgotPassword';
import { ResetPassword } from '@pages/auth/ResetPassword';
import { AuthCallback } from '@pages/auth/AuthCallback';
import { VerifyEmail } from '@pages/auth/VerifyEmail';
import { Dashboard } from '@pages/dashboard/Dashboard';
import { ProfilePage } from '@pages/dashboard/Profile';
import { ApplicationsPage } from '@pages/dashboard/Applications';
import { SavedJobsPage } from '@pages/dashboard/SavedJobs';
import { NotificationsPage } from '@pages/dashboard/Notifications';
import { RecruiterRegister } from '@pages/recruiter/RecruiterRegister';
import { RecruiterDashboard } from '@pages/recruiter/RecruiterDashboard';
import PremiumDashboard from '@pages/dashboard/PremiumDashboard';
import { SettingsLayout } from '@pages/dashboard/settings/SettingsLayout';
import { AccountSettings } from '@pages/dashboard/settings/AccountSettings';
import { CommunicationPrivacySettings } from '@pages/dashboard/settings/CommunicationPrivacySettings';
import { JobPreferencesSettings } from '@pages/dashboard/settings/JobPreferencesSettings';
import { BlockedCompaniesSettings } from '@pages/dashboard/settings/BlockedCompaniesSettings';
import PremiumIntelligenceSettings from '@pages/dashboard/settings/PremiumIntelligenceSettings';
import { useSubscription } from '@hooks/index';
import { useNotificationAlerts } from '@hooks/useNotificationAlerts';
import { useSubscriptionRenewalAlerts } from '@hooks/useSubscriptionRenewalAlerts';
import RecommendedJobs from '@pages/dashboard/RecommendedJobs';
import RemoteJobs from '@pages/dashboard/RemoteJobs';
import MockInterviews from '@pages/dashboard/tools/MockInterviews';
import ResumeReview from '@pages/dashboard/tools/ResumeReview';
import PriorityApply from '@pages/dashboard/tools/PriorityApply';
import FreeNotesPage from '@pages/dashboard/tools/FreeNotes';
import AiCareerHub from '@pages/dashboard/AiCareerHub';
import AssessmentsPage from '@pages/dashboard/Assessments';
import VerifyAssessmentCertificate from '@pages/VerifyAssessmentCertificate';
import CommunityNetworkingHub from '@pages/dashboard/CommunityNetworkingHub';
import LearningPage from '@pages/dashboard/Learning';
import MessagingPage from '@pages/Messaging';
import { CompanyCareerPage } from '@pages/CompanyCareerPage';
import { About } from '@pages/About';
import { Contact } from '@pages/Contact';
import AdminLayout from './admin/AdminLayout';
import DashboardOverview from './admin/pages/DashboardOverview';
import UsersPage from './admin/pages/UsersPage';
import RecruitersPage from './admin/pages/RecruitersPage';
import CandidatesPage from './admin/pages/CandidatesPage';
import JobsPage from './admin/pages/JobsPage';
import AdminApplicationsPage from './admin/pages/ApplicationsPage';
import AnalyticsPage from './admin/pages/Analytics';
import BulkImport from './admin/pages/BulkImport';
import DataIntegrity from './admin/pages/DataIntegrity';
import SystemHealthPage from './admin/pages/SystemHealth';
import SettingsPage from './admin/pages/Settings';
import AdminControlCenter from './admin/pages/AdminControlCenter';
import AssessmentLibrary from './admin/pages/AssessmentLibrary';
import PlatformCommunities from './admin/pages/PlatformCommunities';
import GlobalEnterprisePlatform from './admin/pages/GlobalEnterprisePlatform';
import { RecruiterSubscriptionPage } from '@pages/recruiter/RecruiterSubscriptionPage';
import AdminBillingManagement from './admin/pages/AdminBillingManagement';
import { SEO } from '@components/seo/SEO';

const BUILD_VERSION_STORAGE_KEY = 'actro_build_id';

const getLatestBuildId = async () => {
  try {
    const response = await fetch('/build-meta.json', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!response.ok) return null;
    const payload = await response.json();
    return typeof payload?.buildId === 'string' ? payload.buildId : null;
  } catch (error) {
    console.warn('Failed to fetch deploy build metadata', error);
    return null;
  }
};

const refreshNow = () => {
  window.location.reload();
};

const RouteScrollRestoration: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.key]);

  return null;
};

const AppNotificationAlerts: React.FC<{ userId: string | null }> = ({ userId }) => {
  useNotificationAlerts(userId);
  return null;
};

const RoleDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { subscription, loading: subscriptionLoading } = useSubscription(user?.id || null);

  if (user?.role === USER_ROLES.ADMIN) {
    return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
  }

  if (user?.role === USER_ROLES.RECRUITER) {
    return <Navigate to={ROUTES.RECRUITER_DASHBOARD} replace />;
  }

  if (subscriptionLoading || typeof subscription === 'undefined') {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (subscription) {
    return <PremiumDashboard />;
  }

  return <Dashboard />;
};

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path={ROUTES.HOME} element={<Home />} />
        <Route path={ROUTES.JOBS} element={<Jobs />} />
        <Route path={ROUTES.JOB_DETAILS} element={<JobDetails />} />
        <Route path={ROUTES.COMPANY_CAREER_PAGE} element={<CompanyCareerPage />} />
        <Route path={ROUTES.PRICING} element={<Pricing />} />
        <Route path={ROUTES.ABOUT} element={<About />} />
        <Route path={ROUTES.CONTACT} element={<Contact />} />
        <Route path={ROUTES.PRIVACY_POLICY} element={<PrivacyPolicy />} />
        <Route path={ROUTES.TERMS_CONDITIONS} element={<TermsConditions />} />

        <Route path={ROUTES.LOGIN} element={<><SEO title="Login | JobPoyt" description="Sign in to your JobPoyt account." robots="noindex,nofollow" /><Login /></>} />
        <Route path={ROUTES.SIGNUP} element={<><SEO title="Create an Account | JobPoyt" description="Create a JobPoyt account." robots="noindex,nofollow" /><Signup /></>} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<><SEO title="Forgot Password | JobPoyt" description="Reset your JobPoyt account password." robots="noindex,nofollow" /><ForgotPassword /></>} />
        <Route path={ROUTES.RESET_PASSWORD} element={<><SEO title="Reset Password | JobPoyt" description="Set a new password for your JobPoyt account." robots="noindex,nofollow" /><ResetPassword /></>} />
        <Route path={ROUTES.AUTH_CALLBACK} element={<><SEO title="Authentication | JobPoyt" description="Completing JobPoyt authentication." robots="noindex,nofollow" /><AuthCallback /></>} />
        <Route path={ROUTES.VERIFY_EMAIL} element={<><SEO title="Verify Your Email | JobPoyt" description="Verify your JobPoyt email address." robots="noindex,nofollow" /><VerifyEmail /></>} />
        <Route path={ROUTES.RECRUITER_REGISTER} element={<><SEO title="Recruiter Registration | JobPoyt" description="Register as a recruiter on JobPoyt." robots="noindex,nofollow" /><RecruiterRegister /></>} />

        <Route
          path={ROUTES.DASHBOARD}
          element={
            <ProtectedRoute>
              <RoleDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.DASHBOARD_PROFILE}
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.DASHBOARD_RESUME}
          element={
            <ProtectedRoute>
              <ResumeReview />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.DASHBOARD_APPLICATIONS}
          element={
            <ProtectedRoute>
              <ApplicationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.DASHBOARD_SAVED_JOBS}
          element={
            <ProtectedRoute>
              <SavedJobsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.DASHBOARD_NOTIFICATIONS}
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.DASHBOARD_SETTINGS}
          element={
            <ProtectedRoute>
              <SettingsLayout />
            </ProtectedRoute>
          }
        >
          <Route path="account" element={<AccountSettings />} />
          <Route path="privacy" element={<CommunicationPrivacySettings />} />
          <Route path="preferences" element={<JobPreferencesSettings />} />
          <Route path="blocked-companies" element={<BlockedCompaniesSettings />} />
          <Route path="premium-intelligence" element={<PremiumIntelligenceSettings />} />
        </Route>
        <Route
          path="/dashboard/recommended-jobs"
          element={
            <ProtectedRoute>
              <RecommendedJobs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/remote-jobs"
          element={
            <ProtectedRoute>
              <RemoteJobs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/mock-interviews"
          element={
            <ProtectedRoute>
              <MockInterviews />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/resume-review"
          element={
            <ProtectedRoute>
              <ResumeReview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/priority-apply"
          element={
            <ProtectedRoute>
              <PriorityApply />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.DASHBOARD_ASSESSMENTS}
          element={
            <ProtectedRoute>
              <AssessmentsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/verify-certificate/:verificationId" element={<VerifyAssessmentCertificate />} />
        <Route
          path={ROUTES.DASHBOARD_COMMUNITY}
          element={
            <ProtectedRoute>
              <CommunityNetworkingHub />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.DASHBOARD_REFERRALS}
          element={
            <ProtectedRoute>
              <CommunityNetworkingHub />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.DASHBOARD_MENTORSHIP}
          element={
            <ProtectedRoute>
              <CommunityNetworkingHub />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.DASHBOARD_EVENTS}
          element={
            <ProtectedRoute>
              <CommunityNetworkingHub />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.DASHBOARD_AI_CAREER_HUB}
          element={
            <ProtectedRoute>
              <AiCareerHub />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.DASHBOARD_LEARNING}
          element={<><SEO title="Learning | JobPoyt" description="Private JobPoyt learning area." robots="noindex,nofollow" /><LearningPage /></>}
        />
        <Route
          path={ROUTES.DASHBOARD_FREE_NOTES}
          element={
            <ProtectedRoute>
              <FreeNotesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.RECRUITER_DASHBOARD}
          element={
            <ProtectedRoute requiredRole={USER_ROLES.RECRUITER}>
              <RecruiterDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.RECRUITER_SUBSCRIPTION}
          element={
            <ProtectedRoute requiredRole={USER_ROLES.RECRUITER}>
              <RecruiterSubscriptionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole={USER_ROLES.ADMIN}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminControlCenter />} />
          <Route path={ROUTES.ADMIN_USERS} element={<AdminControlCenter />} />
          <Route path={ROUTES.ADMIN_RECRUITERS} element={<AdminControlCenter />} />
          <Route path={ROUTES.ADMIN_CANDIDATES} element={<AdminControlCenter />} />
          <Route path={ROUTES.ADMIN_JOBS} element={<AdminControlCenter />} />
          <Route path={ROUTES.ADMIN_APPLICATIONS} element={<AdminControlCenter />} />
          <Route path={ROUTES.ADMIN_CUSTOMER_CARE} element={<AdminControlCenter />} />
          <Route path={ROUTES.ADMIN_SUBSCRIPTIONS} element={<AdminControlCenter />} />
          <Route path={ROUTES.ADMIN_PAYMENTS} element={<AdminControlCenter />} />
          <Route path={ROUTES.ADMIN_ANALYTICS} element={<AdminControlCenter />} />
          <Route path={ROUTES.ADMIN_BULK_IMPORT} element={<BulkImport />} />
          <Route path={ROUTES.ADMIN_DATA_INTEGRITY} element={<AdminControlCenter />} />
          <Route path={ROUTES.ADMIN_SYSTEM_HEALTH} element={<AdminControlCenter />} />
          <Route path={ROUTES.ADMIN_SETTINGS} element={<AdminControlCenter />} />
          <Route path={ROUTES.ADMIN_ASSESSMENT_LIBRARY} element={<AssessmentLibrary />} />
          <Route path={ROUTES.ADMIN_COMMUNITIES} element={<PlatformCommunities />} />
          <Route path={ROUTES.ADMIN_GLOBAL_SETTINGS} element={<GlobalEnterprisePlatform mode="global-settings" />} />
          <Route path={ROUTES.ADMIN_LOCALIZATION} element={<GlobalEnterprisePlatform mode="localization" />} />
          <Route path={ROUTES.ADMIN_COMPLIANCE} element={<GlobalEnterprisePlatform mode="compliance" />} />
          <Route path={ROUTES.ADMIN_REGIONAL_MANAGEMENT} element={<GlobalEnterprisePlatform mode="regional-management" />} />
          <Route path={ROUTES.ADMIN_BILLING_MANAGEMENT} element={<AdminBillingManagement />} />
        </Route>
        <Route
          path={ROUTES.MESSAGING}
          element={
            <ProtectedRoute>
              <MessagingPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </AnimatePresence>
  );
};

const AppContent: React.FC = () => {
  const { themeMode, setThemeMode } = useThemeMode();
  const { setUser, setLoading, user } = useAuthStore();
  const isMobileView = useMediaQuery('(max-width: 767.95px)');

  useSubscriptionRenewalAlerts(user?.id || null);

  useEffect(() => {
    let active = true;

    const showUpdateToast = (nextBuildId: string) => {
      const storedBuildId = localStorage.getItem(BUILD_VERSION_STORAGE_KEY);
      if (!storedBuildId) {
        localStorage.setItem(BUILD_VERSION_STORAGE_KEY, nextBuildId);
        return;
      }

      if (storedBuildId === nextBuildId) return;

      localStorage.setItem(BUILD_VERSION_STORAGE_KEY, nextBuildId);
      toast.custom(
        (t) => (
          <div style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            background: '#111827',
            color: '#fff',
            borderRadius: 12,
            padding: '10px 14px',
            boxShadow: '0 18px 30px rgba(15, 23, 42, 0.28)',
            maxWidth: 360,
          }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>New version available</div>
              <div style={{ fontSize: 12, opacity: 0.82 }}>Refresh to use the latest build.</div>
            </div>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(t.id);
                refreshNow();
              }}
              style={{
                border: 'none',
                borderRadius: 8,
                background: '#2563eb',
                color: '#fff',
                padding: '8px 12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Refresh Now
            </button>
          </div>
        ),
        { id: 'app-update-toast', duration: Infinity, position: 'bottom-right' }
      );
    };

    const checkForUpdatedBuild = async () => {
      const latestBuildId = await getLatestBuildId();
      if (!latestBuildId || !active) return;
      showUpdateToast(latestBuildId);
    };

    const onSwUpdateAvailable = () => {
      if (!active) return;
      getLatestBuildId().then((latestBuildId) => {
        if (latestBuildId) showUpdateToast(latestBuildId);
      });
    };

    checkForUpdatedBuild();
    const timer = window.setInterval(checkForUpdatedBuild, 15 * 60 * 1000);
    window.addEventListener('app-sw-update-available', onSwUpdateAvailable);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('app-sw-update-available', onSwUpdateAvailable);
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.update().catch(() => undefined);
      });
    });
  }, []);

  useEffect(() => {
    if (!user && themeMode === 'dark') {
      setThemeMode('light');
    }
  }, [themeMode, setThemeMode, user]);

  useEffect(() => {
    const hash = window.location.hash || '';
    const nestedHashIndex = hash.indexOf('#', 1);
    if (nestedHashIndex > 0) {
      const tokenHash = hash.slice(nestedHashIndex);
      if (tokenHash.startsWith('#access_token=') || tokenHash.startsWith('#error=')) {
        window.location.replace(`${window.location.origin}${ROUTES.AUTH_CALLBACK}${tokenHash}`);
      }
    } else if (hash.startsWith('#access_token=') || hash.startsWith('#error=')) {
      window.location.replace(`${window.location.origin}${ROUTES.AUTH_CALLBACK}${hash}`);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      try {
        try {
          const session = await authService.getSession();
          if (session?.user) {
            let profile: any = null;
            try {
              const { userService } = await import('./services/api');
              profile = await userService.getProfile(session.user.id);
              if (!profile && session.user.user_metadata?.role === USER_ROLES.RECRUITER) {
                await userService.ensureRecruiterProfile(session.user.id, {
                  name: session.user.user_metadata?.name || 'Recruiter',
                  email: session.user.email,
                } as Record<string, unknown>);
                profile = await userService.getProfile(session.user.id);
              }
            } catch (err) {
              // eslint-disable-next-line no-console
              console.warn('Failed to load or create profile on initAuth', err);
            }
            const finalRole = profile?.role || session.user.user_metadata?.role || USER_ROLES.JOB_SEEKER;

            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: profile?.name || session.user.user_metadata?.name || 'User',
              role: finalRole,
              avatar: profile?.avatar_url || profile?.profile_image_url || session.user.user_metadata?.avatar_url,
              createdAt: profile?.created_at || session.user.created_at || new Date().toISOString(),
              updatedAt: profile?.updated_at || session.user.updated_at || new Date().toISOString(),
              emailVerified: Boolean(session.user.email_confirmed_at),
            });
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    let subscription: { data?: { subscription?: { unsubscribe: () => void } } } | null = null;
    try {
      subscription = authService.onAuthStateChange(async (session) => {
        const s = session as { user?: { id: string; email?: string; user_metadata?: Record<string, string>; created_at?: string; updated_at?: string } } | null;
        if (s?.user) {
          let profile: any = null;
          try {
            const { userService } = await import('./services/api');
            profile = await userService.getProfile(s.user.id);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Failed to load profile onAuthStateChange', err);
          }
          const finalRole = profile?.role || (s.user.user_metadata?.role as 'job_seeker' | 'recruiter' | 'admin') || USER_ROLES.JOB_SEEKER;

          setUser({
            id: s.user.id,
            email: s.user.email || '',
            name: profile?.name || s.user.user_metadata?.name || 'User',
            role: finalRole,
            avatar: profile?.avatar_url || profile?.profile_image_url || s.user.user_metadata?.avatar_url,
            createdAt: profile?.created_at || s.user.created_at || new Date().toISOString(),
            updatedAt: profile?.updated_at || s.user.updated_at || new Date().toISOString(),
            emailVerified: Boolean((s.user as any).email_confirmed_at),
          });
        } else {
          setUser(null);
        }
      });
    } catch (error) {
      console.error('Auth state listener error:', error);
    }

    return () => {
      try {
        const sub = subscription as { data?: { subscription?: { unsubscribe: () => void } } };
        sub?.data?.subscription?.unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing from auth:', error);
      }
    };
  }, [setUser, setLoading]);

  return (
    <ThemeProvider theme={getTheme(themeMode)}>
      <CssBaseline />
      <Toaster position="top-center" />
      <GlobalApiLoader />
      <Router>
        <AppNotificationAlerts userId={user?.id || null} />
        <RouteScrollRestoration />
        {isMobileView ? (
          <MobileAppShell>
            <AnimatedRoutes />
          </MobileAppShell>
        ) : (
          <AnimatedRoutes />
        )}
      </Router>
    </ThemeProvider>
  );
};

export const App: React.FC = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <ThemeModeProvider>
        <AppContent />
      </ThemeModeProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
