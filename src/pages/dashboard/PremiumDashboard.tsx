import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  ButtonBase,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
  TextField,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  Chat as ChatIcon,
  Close as CloseIcon,
  Description as DescriptionIcon,
  Download as DownloadIcon,
  ListAlt as ListAltIcon,
  Notifications as NotificationsIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Videocam as VideocamIcon,
  Visibility as VisibilityIcon,
  Work as WorkIcon,
  WorkspacePremium as WorkspacePremiumIcon,
  Favorite as FavoriteIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Public as PublicIcon,
  FlightTakeoff as FlightTakeoffIcon,
  AutoAwesome as AutoAwesomeIcon,
  Insights as InsightsIcon,
  Bolt as BoltIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarTodayIcon,
  Assessment as AssessmentIcon,
  PeopleAlt as PeopleIcon,
  LocationOn as LocationOnIcon,
  TrackChanges as TrackChangesIcon,
  Tune as TuneIcon,
  StickyNote2 as StickyNote2Icon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import toast from 'react-hot-toast';

import { Layout } from '@components/layout/Layout';
import RecruiterActivityCenter, { type RecruiterActivityQuickAction } from '@components/dashboard/RecruiterActivityCenter';
import { SubscriptionSummaryCard } from '@components/common/SubscriptionSummaryCard';
import { FreeNotesPage } from '@pages/dashboard/tools/FreeNotes';
import AssessmentsPage from '@pages/dashboard/Assessments';
import { PremiumToolDashboards } from '@components/dashboard/PremiumToolDashboards';
import { useAuthStore } from '@store/index';
import { authService } from '@services/supabase';
import { userService, applicationService, savedService, notificationService, jobService, subscriptionService } from '@services/api';
import { useSubscription } from '@hooks/index';
import { messagingService } from '@services/messaging';
import {
  getCandidateProfileViewCount,
  getCandidateProfileViewRecruiters,
  getCandidateResumeUnlockCount,
  getCandidateResumeUnlockRecruiters,
} from '@utils/resumeUnlocks';
import { ROUTES } from '@constants/index';
import { formatDate } from '@utils/index';
import {
  getWeightsForRole,
  mergePremiumDashboardConfig,
  readLocalPreferencesRole,
  readLocalPremiumConfig,
  type DemandWeights,
  type WeeklyGoalTargets,
} from '@utils/premiumDashboardConfig';
import type { AiMatchCandidateContext } from '@services/aiMatchCenter';
import type { BriefActionKey, DailyCareerBriefContext } from '@services/aiDailyCareerBrief';
import type { RecruiterActivityContext } from '@services/recruiterActivity';
import './PremiumHeroStars.css';
import '../../styles/spaceButton.css';
import '../../styles/sparkleButton.css';
import '../../styles/ctaButton.css';
import '../../styles/opportunitySignalButton.css';

const getJobList = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const matchValues = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(matchValues);
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    return matchValues(record.name || record.label || record.title || record.value);
  }
  if (typeof value !== 'string') return value == null ? [] : [String(value)];
  const trimmed = value.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.flatMap(matchValues);
    } catch {
      // Fall back to delimiter parsing for legacy profile/job values.
    }
  }
  return trimmed.split(/[,|;\/\n]/).map((item) => item.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
};

const normalizeMatchValue = (value: unknown): string => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();

const premiumToolOrder: Record<string, number> = {
  'Saved Jobs': 1,
  'Profile Views': 2,
  'Resume Downloads': 3,
  'Priority Apply': 4,
  'Resume Builder': 5,
  'Skill Test': 6,
  Assessments: 7,
  'Interview Preparation': 8,
  'Free Notes': 9,
  Certificates: 10,
  'Interview Invites': 11,
  'My Subscription': 12,
  Community: 13,
  Portfolio: 14,
  Referrals: 16,
};

const hasPriorityProfileMatch = (job: any, profile: any): boolean => {
  const candidateSkills = matchValues(profile?.skills).map(normalizeMatchValue).filter(Boolean);
  const jobSkills = matchValues(job?.skills).map(normalizeMatchValue).filter(Boolean);
  const jobTitle = normalizeMatchValue(job?.title);
  const titleSignals = [profile?.current_designation, ...(matchValues(profile?.preferred_job_titles))]
    .map(normalizeMatchValue)
    .filter(Boolean);

  const skillMatch = candidateSkills.some((candidateSkill) =>
    jobSkills.some((jobSkill) => candidateSkill === jobSkill || candidateSkill.includes(jobSkill) || jobSkill.includes(candidateSkill))
  );
  const titleMatch = titleSignals.some((title) => jobTitle && (jobTitle.includes(title) || title.includes(jobTitle)));
  return skillMatch || titleMatch;
};

const MotionCard = motion(Card);
const candidateHeroGradient = 'linear-gradient(310deg, rgba(15,23,42,0.95) 0%, rgba(30,64,175,0.93) 45%, rgba(14,116,144,0.92) 100%)';
const AiDailyCareerBrief = React.lazy(() => import('@components/dashboard/AiDailyCareerBrief'));
const AiMatchCenter = React.lazy(() => import('@components/dashboard/AiMatchCenter'));

type RecentApplication = {
  id: string;
  status: string;
  applied_at?: string;
  jobs?: {
    id?: string;
    title?: string;
    company_name?: string;
    location?: string;
  };
};

type SavedPremiumJob = {
  id: string;
  job_id?: string;
  jobs?: {
    id?: string;
    title?: string;
    company_name?: string;
    company_logo_url?: string;
    location?: string;
    work_mode?: string;
    job_type?: string;
    created_at?: string;
  };
};

type OpportunitySignal = {
  title: string;
  description: string;
  cta: string;
  action: () => void;
  tone: 'success' | 'warning' | 'primary';
  observedAt?: string;
  priorityScore: number;
};

type PremiumSectionKey =
  | 'applications'
  | 'savedJobs'
  | 'resumeDownloads'
  | 'profileViews'
  | 'dailyBrief'
  | 'intelligence'
  | 'remoteHub'
  | 'premiumTools'
  | 'recruiterActivity'
  | 'matchCenter'
  | 'recentApplications';

type PremiumToolPopup = {
  label: string;
  description: string;
  accent: string;
};

const sectionTabs: Array<{ key: PremiumSectionKey; label: string; icon: React.ElementType }> = [
  { key: 'dailyBrief', label: 'AI Daily Career Brief', icon: DescriptionIcon },
  { key: 'intelligence', label: 'Premium Intelligence Center', icon: InsightsIcon },
  { key: 'remoteHub', label: 'Remote Job Hub', icon: PublicIcon },
  { key: 'premiumTools', label: 'Exclusive Premium Tools', icon: AutoAwesomeIcon },
  { key: 'recruiterActivity', label: 'Recruiter Activity', icon: ChatIcon },
  { key: 'matchCenter', label: 'AI Match Center', icon: TrendingUpIcon },
  { key: 'recentApplications', label: 'Recent Applications', icon: ListAltIcon },
];

export const PremiumDashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { subscription, loading: subscriptionLoading, refetch: refetchSubscription } = useSubscription(user?.id || null);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const theme = useTheme();
  const navigate = useNavigate();
  const isDarkMode = theme.palette.mode === 'dark';
  const [profileMenuAnchorEl, setProfileMenuAnchorEl] = useState<null | HTMLElement>(null);

  const [applicationCount, setApplicationCount] = useState(0);
  const [savedJobsCount, setSavedJobsCount] = useState(0);
  const [savedJobs, setSavedJobs] = useState<SavedPremiumJob[]>([]);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [candidateProfile, setCandidateProfile] = useState<any>(null);
  const [profileStrength, setProfileStrength] = useState(0);
  const [resumeDownloadCount, setResumeDownloadCount] = useState<number>(0);
  const [profileViewCount, setProfileViewCount] = useState<number>(0);
  const [priorityJobs, setPriorityJobs] = useState<any[]>([]);
  const [priorityJobsLoading, setPriorityJobsLoading] = useState(false);
  const [profileViewRecruiters, setProfileViewRecruiters] = useState<any[]>([]);
  const [resumeUnlockRecruiters, setResumeUnlockRecruiters] = useState<any[]>([]);
  const [interactionModalOpen, setInteractionModalOpen] = useState(false);
  const [quickNoteDialogOpen, setQuickNoteDialogOpen] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  const [premiumToolPopup, setPremiumToolPopup] = useState<PremiumToolPopup | null>(null);
  const [freeNotesNewNoteHandler, setFreeNotesNewNoteHandler] = useState<(() => void) | null>(null);
  const skillTestHeaderActionRef = useRef<(() => void) | null>(null);
  const [skillTestHeaderState, setSkillTestHeaderState] = useState({ available: false, disabled: false, completed: false });
  const [savedJobSearch, setSavedJobSearch] = useState('');
  const [savedJobFilter, setSavedJobFilter] = useState('all');
  const [interactionModalTitle, setInteractionModalTitle] = useState('');
  const [interactionType, setInteractionType] = useState<'downloads' | 'views'>('downloads');
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [interactionItems, setInteractionItems] = useState<any[]>([]);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);
  const [selectedSection, setSelectedSection] = useState<PremiumSectionKey>('premiumTools');
  const [selectedRoleModel, setSelectedRoleModel] = useState('General');
  const [roleWeightMap, setRoleWeightMap] = useState<Record<string, DemandWeights>>({});
  const [weeklyTargets, setWeeklyTargets] = useState<WeeklyGoalTargets>({ applications: 6, interactions: 10, pipeline: 4 });

  useEffect(() => {
    if (!user?.id) return;
    setQuickNote(window.localStorage.getItem(`jobpoyt-premium-note-${user.id}`) || '');
  }, [user?.id]);

  const saveQuickNote = () => {
    if (user?.id) {
      window.localStorage.setItem(`jobpoyt-premium-note-${user.id}`, quickNote.trim());
    }
    setQuickNoteDialogOpen(false);
    toast.success('Note saved');
  };

  const openPremiumTool = (label: string, description: string, accent: string) => {
    setPremiumToolPopup({ label, description, accent });
  };

  const filteredSavedJobs = useMemo(() => {
    const query = savedJobSearch.trim().toLowerCase();
    return savedJobs.filter((savedJob) => {
      const job = savedJob.jobs;
      const searchable = [job?.title, job?.company_name, job?.location, job?.work_mode, job?.job_type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const workMode = String(job?.work_mode || '').toLowerCase();
      const matchesFilter = savedJobFilter === 'all' || workMode === savedJobFilter;
      return matchesSearch && matchesFilter;
    });
  }, [savedJobFilter, savedJobSearch, savedJobs]);

  useEffect(() => {
    if (!user?.id) return undefined;

    let mounted = true;
    const refreshUnreadNotifications = async () => {
      try {
        const unread = await notificationService.getUnreadNotifications(user.id);
        if (!mounted) return;
        setNotificationsCount((unread || []).length);
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

  const closeProfileMenu = () => {
    setProfileMenuAnchorEl(null);
  };

  const handleSignout = async () => {
    closeProfileMenu();
    try {
      await authService.signOut();
    } catch {
      // noop
    } finally {
      logout();
      navigate(ROUTES.LOGIN, { replace: true });
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const profile = await userService.getProfile(user.id);

        if (profile) {
          setCandidateProfile(profile);
          const skills = Array.isArray(profile.skills) ? profile.skills : [];
          setUserSkills(skills);

          const apiConfig = (profile.dashboard_preferences || profile.premium_dashboard_config || profile.dashboard_config || {}) as Record<string, any>;
          const localConfig = readLocalPremiumConfig();
          const roleFromPreferences = readLocalPreferencesRole();

          const mergedConfig = mergePremiumDashboardConfig(
            apiConfig,
            localConfig,
            roleFromPreferences || (Array.isArray(profile.preferred_job_titles) ? profile.preferred_job_titles[0] : 'General'),
          );

          setSelectedRoleModel(mergedConfig.selectedRole);
          setRoleWeightMap(mergedConfig.roleWeights);
          setWeeklyTargets(mergedConfig.weeklyTargets);

          const strength = Math.min(
            100,
            (
              (skills.length * 10)
              + (profile.resumeUrl || profile.resume_url ? 20 : 0)
              + (profile.experience ? 15 : 0)
              + (profile.phone ? 10 : 0)
              + (profile.bio ? 10 : 0)
              + ((profile.workExperience || profile.work_experience || []).length * 10)
              + ((profile.education || profile.education_details || []).length * 10)
            ) / 10,
          );

          setProfileStrength(Math.round(strength));

          if (skills.length > 0) {
            const recRes = await jobService.getJobsBySkills(skills, 1, 6);
            setRecommendedJobs(getJobList(recRes));
          } else {
            setRecommendedJobs([]);
          }

          setPriorityJobsLoading(true);
          try {
            const [findJobsResponse, skillJobsResponse] = await Promise.all([
              jobService.getJobs({}, 1, 50, { includeTotal: false }),
              skills.length > 0 ? jobService.getJobsBySkills(matchValues(profile.skills), 1, 50) : Promise.resolve({ data: [] }),
            ]);
            const combinedJobs = [...getJobList(findJobsResponse), ...getJobList(skillJobsResponse)];
            const uniqueJobs = Array.from(new Map(combinedJobs.filter((job) => job?.id).map((job) => [job.id, job])).values());
            setPriorityJobs(uniqueJobs.filter((job) => hasPriorityProfileMatch(job, profile)));
          } catch {
            setPriorityJobs([]);
          } finally {
            setPriorityJobsLoading(false);
          }
        }

        const [applications, saved, unreadNotifications, conversations] = await Promise.all([
          applicationService.getUserApplications(user.id),
          savedService.getUserSavedJobs(user.id),
          notificationService.getUnreadNotifications(user.id),
          messagingService.getConversations(user.id),
        ]);

        setRecentApplications(applications || []);
        setApplicationCount(applications?.length || 0);
        setSavedJobs(saved || []);
        setSavedJobsCount(saved?.length || 0);
        setNotificationsCount((unreadNotifications || []).length);
        setUnreadMessagesCount(
          (((conversations as any[]) || []).reduce((count, conv) => count + (conv.unreadCount || 0), 0)),
        );

        const [downloadCount, viewCount, viewRecruiters, unlockRecruiters] = await Promise.all([
          getCandidateResumeUnlockCount(user.id),
          getCandidateProfileViewCount(user.id),
          getCandidateProfileViewRecruiters(user.id),
          getCandidateResumeUnlockRecruiters(user.id),
        ]);

        setResumeDownloadCount(downloadCount);
        setProfileViewCount(viewCount);
        setProfileViewRecruiters(viewRecruiters || []);
        setResumeUnlockRecruiters(unlockRecruiters || []);
      } catch (error) {
        console.error('Error fetching premium dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user?.id]);

  const premiumInsights = useMemo(() => {
    const views = Number(profileViewCount || 0);
    const downloads = Number(resumeDownloadCount || 0);
    const interactions = views + downloads;
    const activeWeights = getWeightsForRole(selectedRoleModel, roleWeightMap);

    const demandScore = Math.min(
      100,
      Math.round(
        (profileStrength * activeWeights.profileStrength)
        + (Math.min(applicationCount, 30) * activeWeights.applications)
        + (Math.min(interactions, 50) * activeWeights.interactions)
        + (Math.min(userSkills.length, 12) * activeWeights.skills),
      ),
    );

    const recentApplications7d = recentApplications.filter((item) => {
      if (!item.applied_at) return false;
      const applied = new Date(item.applied_at).getTime();
      if (Number.isNaN(applied)) return false;
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      return applied >= sevenDaysAgo;
    }).length;

    const interviewPipelineCount = recentApplications.filter(
      (item) => item.status === 'shortlisted' || item.status === 'under_review' || item.status === 'accepted',
    ).length;

    const weeklyGoals = [
      {
        label: 'Weekly applications',
        current: recentApplications7d,
        target: weeklyTargets.applications,
      },
      {
        label: 'Recruiter interactions',
        current: interactions,
        target: weeklyTargets.interactions,
      },
      {
        label: 'Pipeline interviews',
        current: interviewPipelineCount,
        target: weeklyTargets.pipeline,
      },
    ];

    const strengths = [
      profileStrength >= 80 ? 'Profile is highly optimized' : null,
      userSkills.length >= 5 ? 'Skill stack is strong for matching' : null,
      downloads > 0 ? 'Resume already attracting recruiters' : null,
    ].filter(Boolean) as string[];

    return {
      demandScore,
      recentApplications7d,
      interviewPipelineCount,
      weeklyGoals,
      strengths,
      activeWeights,
    };
  }, [applicationCount, profileStrength, profileViewCount, recentApplications, resumeDownloadCount, roleWeightMap, selectedRoleModel, userSkills.length, weeklyTargets.applications, weeklyTargets.interactions, weeklyTargets.pipeline]);

  const aiDailyBriefContext = useMemo<DailyCareerBriefContext>(() => ({
    userId: user?.id || '',
    userName: user?.name,
    profileStrength,
    applicationsCount: applicationCount,
    recentApplications7d: premiumInsights.recentApplications7d,
    recommendedJobsCount: recommendedJobs.length,
    recruiterViews: profileViewCount,
    resumeDownloads: resumeDownloadCount,
    userSkills,
    weeklyApplicationGoal: weeklyTargets.applications,
  }), [applicationCount, premiumInsights.recentApplications7d, profileStrength, profileViewCount, recommendedJobs.length, resumeDownloadCount, user?.id, user?.name, userSkills, weeklyTargets.applications]);

  const handleAiDailyBriefAction = (actionKey: BriefActionKey) => {
    switch (actionKey) {
      case 'improve_resume':
      case 'resume_review':
        navigate('/dashboard/resume-review');
        return;
      case 'find_better_jobs':
        navigate('/dashboard/recommended-jobs?minMatch=60');
        return;
      case 'ai_career_coach':
        navigate(ROUTES.DASHBOARD_AI_CAREER_HUB);
        return;
      case 'mock_interview':
        navigate('/dashboard/mock-interviews');
        return;
      case 'complete_assessment':
        navigate(ROUTES.DASHBOARD_ASSESSMENTS);
        return;
      case 'update_profile':
        navigate(ROUTES.DASHBOARD_PROFILE);
        return;
      case 'apply_jobs':
        navigate(ROUTES.JOBS);
        return;
      case 'open_notifications':
        navigate(ROUTES.DASHBOARD_NOTIFICATIONS);
        return;
      case 'improve_skills':
        navigate(ROUTES.DASHBOARD_AI_CAREER_HUB);
        return;
      default:
        navigate(ROUTES.DASHBOARD_AI_CAREER_HUB);
    }
  };

  const handleAiMatchApplyNow = (jobId: string) => {
    navigate(`/jobs/${jobId}`);
  };

  const handleAiMatchSaveJob = async (jobId: string) => {
    if (!user?.id) return;
    try {
      await savedService.saveJob(user.id, jobId);
      toast.success('Job saved');
      const saved = await savedService.getUserSavedJobs(user.id);
      setSavedJobsCount(saved?.length || 0);
    } catch {
      toast.error('Unable to save job');
    }
  };

  const handleAiMatchImproveMatch = () => {
    navigate(ROUTES.DASHBOARD_PROFILE);
  };

  const handleRecruiterActivityQuickAction = (action: RecruiterActivityQuickAction) => {
    switch (action) {
      case 'improve-profile':
        navigate(ROUTES.DASHBOARD_PROFILE);
        break;
      case 'update-resume':
        navigate('/dashboard/resume-review');
        break;
      case 'take-assessment':
        navigate(ROUTES.DASHBOARD_ASSESSMENTS);
        break;
      case 'browse-jobs':
        navigate(ROUTES.JOBS);
        break;
      case 'ai-career-hub':
        navigate(ROUTES.DASHBOARD_AI_CAREER_HUB);
        break;
      case 'messages':
        navigate(ROUTES.MESSAGING);
        break;
      case 'applications':
        navigate(ROUTES.DASHBOARD_APPLICATIONS);
        break;
      default:
        break;
    }
  };

  const aiMatchContext = useMemo<AiMatchCandidateContext>(() => {
    const profileEducation = ((Array.isArray(candidateProfile?.education) ? candidateProfile.education : []) as any[])
      .map((item) => String(item?.degree || item?.qualification || item || '').trim())
      .filter(Boolean);
    const profileLocations = [
      String(candidateProfile?.location || '').trim(),
      String(candidateProfile?.city || '').trim(),
      String(candidateProfile?.preferred_location || '').trim(),
    ].filter(Boolean);

    const parseMoney = (value: unknown): number | undefined => {
      const raw = String(value || '').replace(/[^\d.]/g, '');
      const numeric = Number(raw);
      return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
    };

    const parseExperienceYears = (value: unknown): number => {
      const str = String(value || '').trim();
      const nums = str.match(/\d+/g);
      if (!nums || nums.length === 0) return 0;
      return Number(nums[0]) || 0;
    };

    return {
      userId: user?.id || '',
      skills: userSkills,
      experienceYears: parseExperienceYears(candidateProfile?.experience || candidateProfile?.experienceYears),
      education: profileEducation,
      preferredLocations: profileLocations,
      preferredSalaryMin: parseMoney(candidateProfile?.expected_ctc || candidateProfile?.expectedCtc),
      preferredSalaryMax: parseMoney(candidateProfile?.expected_ctc || candidateProfile?.expectedCtc),
      preferredWorkMode: String(candidateProfile?.preferred_work_mode || '').trim() as 'Remote' | 'Hybrid' | 'Onsite' | '',
      resumeScore: Math.min(100, Math.max(35, profileStrength + 4)),
      assessmentScore: Math.min(100, Math.max(40, 58 + Math.round((applicationCount + resumeDownloadCount) * 1.8))),
      profileCompletion: profileStrength,
      communicationScore: Math.min(100, Math.max(45, 55 + Math.round(profileViewCount * 1.2))),
    };
  }, [applicationCount, candidateProfile, profileStrength, profileViewCount, resumeDownloadCount, user?.id, userSkills]);

  const opportunitySignals = useMemo<OpportunitySignal[]>(() => {
    const now = Date.now();
    const latestAppliedAt = recentApplications
      .map((item) => item.applied_at)
      .filter(Boolean)
      .sort((a, b) => new Date(String(b)).getTime() - new Date(String(a)).getTime())[0];

    const computePriority = (base: number, observedAt?: string) => {
      if (!observedAt) return base;
      const observedMs = new Date(observedAt).getTime();
      if (Number.isNaN(observedMs)) return base;
      const hoursSince = Math.max(0, (now - observedMs) / (1000 * 60 * 60));
      const timeBoost = Math.max(0, 72 - hoursSince);
      return Math.round(base + (timeBoost * 0.4));
    };

    const signals: OpportunitySignal[] = [];

    if (profileStrength < 75) {
      signals.push({
        title: 'Boost profile completion',
        description: 'Profiles above 75% generally receive more recruiter callbacks.',
        cta: 'Improve profile',
        action: () => navigate(ROUTES.DASHBOARD_PROFILE),
        tone: 'warning',
        observedAt: latestAppliedAt,
        priorityScore: computePriority(70, latestAppliedAt),
      });
    }

    if (recommendedJobs.length > 0) {
      const topMatchObservedAt = String(recommendedJobs[0]?.created_at || recommendedJobs[0]?.createdAt || new Date().toISOString());
      signals.push({
        title: `${recommendedJobs.length} fresh AI matches available`,
        description: 'High-match roles are ready. Apply early to improve shortlist chances.',
        cta: 'Open matches',
        action: () => navigate('/dashboard/recommended-jobs?minMatch=60'),
        tone: 'success',
        observedAt: topMatchObservedAt,
        priorityScore: computePriority(86, topMatchObservedAt),
      });
    }

    if ((unreadMessagesCount || 0) > 0 || (notificationsCount || 0) > 0) {
      signals.push({
        title: 'Recruiter conversations need response',
        description: 'Unread activity detected. Faster replies can improve interview conversion.',
        cta: 'Check inbox',
        action: () => navigate(ROUTES.MESSAGING),
        tone: 'primary',
        observedAt: new Date().toISOString(),
        priorityScore: computePriority(93, new Date().toISOString()),
      });
    }

    if (recentApplications.length === 0) {
      const observedAt = new Date(now - (2 * 24 * 60 * 60 * 1000)).toISOString();
      signals.push({
        title: 'Application cadence is low this week',
        description: 'Start this week with at least 2 targeted applications for better momentum.',
        cta: 'Browse jobs',
        action: () => navigate(ROUTES.JOBS),
        tone: 'warning',
        observedAt,
        priorityScore: computePriority(78, observedAt),
      });
    }

    return signals
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 3);
  }, [navigate, notificationsCount, profileStrength, recentApplications, recommendedJobs, unreadMessagesCount]);

  const recruiterActivityContext = useMemo<RecruiterActivityContext>(() => {
    const assessmentsCompleted = Array.isArray(candidateProfile?.assessments)
      ? candidateProfile.assessments.length
      : Array.isArray(candidateProfile?.assessment_history)
      ? candidateProfile.assessment_history.length
      : 0;

    return {
      userId: user?.id || '',
      isPremium: true,
      profileCompletion: profileStrength,
      resumeDownloads: resumeDownloadCount || 0,
      profileViews: profileViewCount || 0,
      recruiterMessages: unreadMessagesCount,
      savedJobs: savedJobsCount,
      skillsCount: userSkills.length,
      assessmentsCompleted,
      hasResume: Boolean(candidateProfile?.resume_url || candidateProfile?.resumeUrl),
      recentApplications: recentApplications.map((item, index) => ({
        id: item.jobs?.id || `premium-app-${index}`,
        status: item.status,
        appliedAt: item.applied_at,
        title: item.jobs?.title,
        companyName: item.jobs?.company_name,
      })),
    };
  }, [candidateProfile, profileStrength, profileViewCount, recentApplications, resumeDownloadCount, savedJobsCount, unreadMessagesCount, user?.id, userSkills.length]);

  const activeRoleWeights = useMemo(() => getWeightsForRole(selectedRoleModel, roleWeightMap), [roleWeightMap, selectedRoleModel]);

  if (loading) {
    return (
      <Layout>
        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box
        className="premium-candidate-dashboard"
        sx={{
          px: { xs: 2, md: 4 },
          py: { xs: 3, md: 4 },
          maxWidth: 1440,
          mx: 'auto',
          backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            width: 280,
            height: 280,
            borderRadius: '50%',
            top: { xs: 10, md: 20 },
            right: { xs: -120, md: -80 },
            background: isDarkMode
              ? 'radial-gradient(circle, rgba(56,189,248,0.22) 0%, rgba(56,189,248,0) 72%)'
              : 'none',
            pointerEvents: 'none',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            width: 260,
            height: 260,
            borderRadius: '50%',
            bottom: 70,
            left: { xs: -120, md: -90 },
            background: isDarkMode
              ? 'radial-gradient(circle, rgba(168,85,247,0.2) 0%, rgba(168,85,247,0) 72%)'
              : 'none',
            pointerEvents: 'none',
          },
        }}
      >
        <Card
          sx={{
            mb: 3,
            borderRadius: 6,
            position: 'relative',
            overflow: 'hidden',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(148, 163, 184, 0.32)',
            background: isDarkMode ? '#050608' : 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)',
            color: '#E2E8F0',
            boxShadow: 'none',
          }}
        >
          <Box className="premium-hero-stars-container" aria-hidden>
            <div className="premium-hero-stars" />
            <div className="premium-hero-stars2" />
            <div className="premium-hero-stars3" />
          </Box>

          <CardContent sx={{ p: { xs: 2.5, md: 4 }, position: 'relative', zIndex: 1 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={8}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  <Chip
                    icon={<StarIcon />}
                    label="Premium Candidate"
                    sx={{
                      fontWeight: 700,
                      bgcolor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255, 248, 230, 0.2)',
                      color: isDarkMode ? '#FFFFFF' : '#FFF7E6',
                      '& .MuiChip-icon': { color: '#F59E0B' },
                    }}
                  />
                  <Chip
                    icon={<TrendingUpIcon />}
                    label={`Profile strength ${profileStrength}%`}
                    sx={{
                      fontWeight: 700,
                      bgcolor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255, 248, 230, 0.2)',
                      color: isDarkMode ? '#FFFFFF' : '#FFF7E6',
                      '& .MuiChip-icon': { color: '#F59E0B' },
                    }}
                  />
                </Box>

                <Box sx={{ mb: 1.2 }}>
                  <Typography sx={{ color: '#F7D774', fontSize: { xs: 9, md: 10 }, fontWeight: 800, letterSpacing: 1.8, textTransform: 'uppercase', mb: 0.5 }}>
                    Welcome back, {user?.name || 'Candidate'}
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: 0, lineHeight: 1.08, color: '#FFFFFF', fontSize: { xs: 26, md: 36 } }}>
                    Premium <Box component="span" sx={{ color: '#F7D774' }}>career</Box> command center
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ color: '#FFFFFF', mb: 2.4, maxWidth: 760 }}>
                  Built for high-intent job hunting with exclusive insights, remote pipelines, and premium tools.
                </Typography>

                <Box className="premium-hero-actions" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2 }}>
                  <button className="sparkle-button premium-action-matched" style={{ transform: 'scale(0.85)' }} onClick={() => navigate('/dashboard/recommended-jobs?minMatch=50')}>
                    <div className="dots-border"></div>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="sparkle-icon">
                      <path className="path" strokeLinejoin="round" strokeLinecap="round" stroke="currentColor" fill="currentColor" d="M14.187 8.096L15 5.25L15.813 8.096C16.0231 8.83114 16.4171 9.50062 16.9577 10.0413C17.4984 10.5819 18.1679 10.9759 18.903 11.186L21.75 12L18.904 12.813C18.1689 13.0231 17.4994 13.4171 16.9587 13.9577C16.4181 14.4984 16.0241 15.1679 15.814 15.903L15 18.75L14.187 15.904C13.9769 15.1689 13.5829 14.4994 13.0423 13.9587C12.5016 13.4181 11.8321 13.0241 11.097 12.814L8.25 12L11.096 11.187C11.8311 10.9769 12.5006 10.5829 13.0413 10.0423C13.5819 9.50162 13.9759 8.83214 14.186 8.097L14.187 8.096Z" />
                      <path className="path" strokeLinejoin="round" strokeLinecap="round" stroke="currentColor" fill="currentColor" d="M6 14.25L5.741 15.285C5.59267 15.8785 5.28579 16.4206 4.85319 16.8532C4.42059 17.2858 3.87853 17.5927 3.285 17.741L2.25 18L3.285 18.259C3.87853 18.4073 4.42059 18.7142 4.85319 19.1468C5.28579 19.5794 5.59267 20.1215 5.741 20.715L6 21.75L6.259 20.715C6.40725 20.1216 6.71398 19.5796 7.14639 19.147C7.5788 18.7144 8.12065 18.4075 8.714 18.259L9.75 18L8.714 17.741C8.12065 17.5925 7.5788 17.2856 7.14639 16.853C6.71398 16.4204 6.40725 15.8784 6.259 15.285L6 14.25Z" />
                      <path className="path" strokeLinejoin="round" strokeLinecap="round" stroke="currentColor" fill="currentColor" d="M6.5 4L6.303 4.5915C6.24777 4.75718 6.15472 4.90774 6.03123 5.03123C5.90774 5.15472 5.75718 5.24777 5.5915 5.303L5 5.5L5.5915 5.697C5.75718 5.75223 5.90774 5.84528 6.03123 5.96877C6.15472 6.09226 6.24777 6.24282 6.303 6.4085L6.5 7L6.697 6.4085C6.75223 6.24282 6.84528 6.09226 6.96877 5.96877C7.09226 5.84528 7.24282 5.75223 7.4085 5.697L8 5.5L7.4085 5.303C7.24282 5.24777 7.09226 5.15472 6.96877 5.03123C6.84528 4.90774 6.75223 4.75718 6.697 4.5915L6.5 4Z" />
                    </svg>
                    <span className="text-button">AI Matched Jobs</span>
                  </button>
                  <Box className="space-btn premium-action-remote" sx={{ position: 'relative', display: 'inline-block' }}>
                    <div className="space-container-stars">
                      <div className="space-stars"></div>
                      <div className="space-glow">
                        <div className="space-circle"></div>
                        <div className="space-circle"></div>
                      </div>
                    </div>
                    <Button variant="contained" onClick={() => navigate('/dashboard/remote-jobs')} sx={{ position: 'relative', zIndex: 2, border: 'none', bgcolor: 'transparent', color: '#FFFFFF', fontWeight: 700, '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}>
                      Remote Hub
                    </Button>
                  </Box>
                  <Box className="space-btn premium-action-edit" sx={{ position: 'relative', display: 'inline-block' }}>
                    <div className="space-container-stars">
                      <div className="space-stars"></div>
                      <div className="space-glow">
                        <div className="space-circle"></div>
                        <div className="space-circle"></div>
                      </div>
                    </div>
                    <Button variant="contained" onClick={() => navigate(ROUTES.DASHBOARD_PROFILE)} sx={{ position: 'relative', zIndex: 2, border: 'none', bgcolor: 'transparent', color: '#FFFFFF', fontWeight: 700, '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}>
                      Edit Profile
                    </Button>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card
                  sx={{
                    borderRadius: 3,
                    background: isDarkMode ? '#050608' : 'rgba(10, 15, 28, 0.72)',
                    border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(148, 163, 184, 0.22)',
                    backdropFilter: 'blur(14px)',
                    boxShadow: isDarkMode ? '0 8px 24px rgba(0, 0, 0, 0.45)' : 'inset 0 1px 0 rgba(148,163,184,0.1), 0 8px 24px rgba(2,6,23,0.5)',
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#E2E8F0', mb: 2 }}>
                      Premium communication
                    </Typography>
                    <Box sx={{ display: 'grid', gap: 1.2, mb: 2.2 }}>
                      {[
                        { label: 'Applications', value: applicationCount },
                        { label: 'Saved Jobs', value: savedJobsCount },
                        { label: 'Resume Downloads', value: resumeDownloadCount },
                        { label: 'Profile Views', value: profileViewCount },
                      ].map((item) => (
                        <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography sx={{ color: '#E5E7EB', fontWeight: 600 }}>{item.label}</Typography>
                          <Typography sx={{ color: '#FFFFFF', fontWeight: 800 }}>{item.value}</Typography>
                        </Box>
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton onClick={() => navigate(ROUTES.MESSAGING)} sx={{ bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.14)' } }}>
                        <Badge badgeContent={unreadMessagesCount} color="warning">
                          <ChatIcon sx={{ color: '#3B82F6' }} />
                        </Badge>
                      </IconButton>
                      <IconButton onClick={() => navigate(ROUTES.DASHBOARD_NOTIFICATIONS)} sx={{ bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.14)' } }}>
                        <Badge badgeContent={notificationsCount} color="primary">
                          <NotificationsIcon sx={{ color: '#3B82F6' }} />
                        </Badge>
                      </IconButton>
                      <IconButton
                        onClick={() => setQuickNoteDialogOpen(true)}
                        aria-label="Open quick note"
                        sx={{ bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.14)' } }}
                      >
                        <StickyNote2Icon sx={{ color: '#F59E0B' }} />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>

                <Menu
                  anchorEl={profileMenuAnchorEl}
                  open={Boolean(profileMenuAnchorEl)}
                  onClose={closeProfileMenu}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem
                    onClick={() => {
                      closeProfileMenu();
                      navigate(ROUTES.DASHBOARD_PROFILE);
                    }}
                  >
                    Profile
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      closeProfileMenu();
                      navigate(ROUTES.DASHBOARD_SETTINGS);
                    }}
                  >
                    <SettingsIcon sx={{ mr: 1, fontSize: 18 }} />
                    Settings
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleSignout} sx={{ color: 'error.main' }}>
                    <LogoutIcon sx={{ mr: 1, fontSize: 18 }} />
                    Sign out
                  </MenuItem>
                </Menu>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Dialog
          open={quickNoteDialogOpen}
          onClose={() => setQuickNoteDialogOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 800 }}>Quick note</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              multiline
              minRows={4}
              maxRows={8}
              value={quickNote}
              onChange={(event) => setQuickNote(event.target.value)}
              placeholder="Capture an application idea, follow-up, or career reminder..."
              inputProps={{ maxLength: 500 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setQuickNoteDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={saveQuickNote}>Save note</Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={Boolean(premiumToolPopup)}
          onClose={() => setPremiumToolPopup(null)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              width: premiumToolPopup?.label === 'Skill Test' ? 'calc(100vw - 20px)' : 'calc(100vw - 32px)',
              maxWidth: 'none',
              height: premiumToolPopup?.label === 'Skill Test' ? 'min(calc(100dvh - 20px), 900px)' : 'calc(100vh - 32px)',
              maxHeight: premiumToolPopup?.label === 'Skill Test' ? 900 : 'none',
              borderRadius: { xs: 3, md: 4 },
              overflow: 'hidden',
              background: isDarkMode ? '#0B1220' : '#F8FAFC',
            },
          }}
        >
          <DialogTitle
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              px: { xs: 2, md: 3.5 },
              py: { xs: 1.5, md: 2 },
              color: '#FFFFFF',
              background: `linear-gradient(115deg, #071D35 0%, #0B3558 62%, ${premiumToolPopup?.accent || '#126B8F'} 100%)`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,0.14)', color: '#F7D774' }}>
                <AutoAwesomeIcon sx={{ fontSize: 20 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: { xs: 10, md: 11 }, letterSpacing: 1.5, fontWeight: 900, color: '#F7D774', textTransform: 'uppercase' }}>
                  Premium workspace
                </Typography>
                <Typography sx={{ fontSize: { xs: 18, md: 25 }, fontWeight: 900, lineHeight: 1.15 }}>
                  {premiumToolPopup?.label === 'Resume Builder' ? 'AI Resume Builder' : premiumToolPopup?.label}
                </Typography>
                {premiumToolPopup?.label === 'Skill Test' ? <Typography variant="body2" sx={{ mt: 0.25, color: 'rgba(255,255,255,0.78)' }}>AI-generated assessments based on your JobPoyt skills.</Typography> : null}
                {premiumToolPopup?.label === 'Resume Builder' ? <Typography variant="body2" sx={{ mt: 0.25, color: 'rgba(255,255,255,0.78)' }}>Build an ATS-friendly resume powered by your JobPoyt profile and AI.</Typography> : null}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
              {premiumToolPopup?.label === 'Skill Test' && skillTestHeaderState.available ? (
                <Button
                  size="small"
                  variant="contained"
                  disabled={skillTestHeaderState.disabled}
                  onClick={() => skillTestHeaderActionRef.current?.()}
                  sx={{ minHeight: 36, px: 1.5, borderRadius: 1.5, bgcolor: '#2563EB', color: '#FFFFFF', textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap', '&:hover': { bgcolor: '#1D4ED8' }, '&.Mui-disabled': { color: 'rgba(255,255,255,0.75)', bgcolor: 'rgba(255,255,255,0.16)' } }}
                >
                  {skillTestHeaderState.completed ? <><Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Today's Skill Test Completed</Box><Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Completed Today</Box></> : 'Start New Test'}
                </Button>
              ) : null}
              {premiumToolPopup?.label === 'Free Notes' ? (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<StickyNote2Icon sx={{ fontSize: 16 }} />}
                  onClick={() => freeNotesNewNoteHandler?.()}
                  sx={{ minHeight: 32, px: 1.2, borderRadius: 1.5, bgcolor: '#2563EB', color: '#FFFFFF', textTransform: 'none', fontWeight: 800, '&:hover': { bgcolor: '#1D4ED8' } }}
                >
                  New Note
                </Button>
              ) : null}
              <IconButton aria-label="Close premium tool" onClick={() => setPremiumToolPopup(null)} sx={{ width: 40, height: 40, color: '#FFFFFF', bgcolor: '#DC2626', '&:hover': { bgcolor: '#B91C1C' } }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers sx={{ px: { xs: 2, md: 4 }, py: { xs: 2, md: 3 }, background: isDarkMode ? 'linear-gradient(180deg, #0F1B2D 0%, #0B1220 100%)' : 'linear-gradient(180deg, #F8FAFC 0%, #EEF4F8 100%)' }}>
            {premiumToolPopup?.label === 'Saved Jobs' ? (
              savedJobs.length > 0 ? (
                <Box sx={{ maxWidth: 1120, width: '100%', mx: 'auto' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 2 }}>
                    <Typography sx={{ color: isDarkMode ? '#F8FAFC' : '#0F172A', fontWeight: 900, fontSize: { xs: 17, md: 21 } }}>
                      Saved Jobs
                    </Typography>
                    <Chip label={`${savedJobs.length} saved`} size="small" sx={{ fontWeight: 800, bgcolor: isDarkMode ? 'rgba(247,215,116,0.16)' : '#FFF4D6', color: isDarkMode ? '#F7D774' : '#8A6412' }} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
                    <TextField
                      fullWidth
                      size="small"
                      value={savedJobSearch}
                      onChange={(event) => setSavedJobSearch(event.target.value)}
                      placeholder="Search saved jobs, companies, or locations"
                      sx={{ bgcolor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF', borderRadius: 1.5 }}
                    />
                    <TextField
                      select
                      size="small"
                      value={savedJobFilter}
                      onChange={(event) => setSavedJobFilter(event.target.value)}
                      SelectProps={{ native: true }}
                      sx={{ minWidth: { sm: 150 }, bgcolor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF', borderRadius: 1.5 }}
                    >
                      <option value="all">All work modes</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">On-site</option>
                    </TextField>
                  </Box>
                  <List sx={{ p: 0, display: 'grid', gap: 1 }}>
                    {filteredSavedJobs.map((savedJob) => (
                      <ListItem
                        key={savedJob.id}
                        onClick={() => {
                          const jobId = savedJob.jobs?.id || savedJob.job_id;
                          if (jobId) {
                            window.open(ROUTES.JOB_DETAILS.replace(':id', String(jobId)), '_blank', 'noopener,noreferrer');
                          }
                        }}
                        sx={{
                          px: { xs: 1.2, md: 1.8 },
                          py: { xs: 0.8, md: 1.2 },
                          borderRadius: 2.5,
                          border: `1px solid ${isDarkMode ? 'rgba(148,163,184,0.25)' : '#E2E8F0'}`,
                          bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                          boxShadow: isDarkMode ? '0 10px 24px rgba(0,0,0,0.18)' : '0 8px 20px rgba(15,23,42,0.06)',
                          cursor: savedJob.jobs?.id || savedJob.job_id ? 'pointer' : 'default',
                          '&:hover': { borderColor: '#2563EB', transform: 'translateY(-1px)' },
                          transition: 'border-color 160ms ease, transform 160ms ease',
                        }}
                      >
                        <Avatar
                          src={savedJob.jobs?.company_logo_url || undefined}
                          variant="rounded"
                          sx={{ width: 34, height: 34, mr: 1.2, flexShrink: 0, bgcolor: '#EFF6FF', color: '#2563EB', fontSize: 14, fontWeight: 800 }}
                        >
                          {(savedJob.jobs?.company_name || 'C').charAt(0).toUpperCase()}
                        </Avatar>
                        <ListItemText
                          primary={savedJob.jobs?.title || 'Saved job'}
                          secondary={(
                            <Box sx={{ display: 'flex', gap: { xs: 1, md: 1.8 }, flexWrap: 'wrap', mt: 0.35 }}>
                              <Typography component="span" variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.45, color: isDarkMode ? '#CBD5E1' : '#64748B' }}>
                                <BusinessIcon sx={{ fontSize: 14 }} />
                                {savedJob.jobs?.company_name || 'Company not available'}
                              </Typography>
                              <Typography component="span" variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.45, color: isDarkMode ? '#CBD5E1' : '#64748B' }}>
                                <LocationOnIcon sx={{ fontSize: 14 }} />
                                {savedJob.jobs?.location || 'Location not specified'}
                              </Typography>
                              <Typography component="span" variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.45, color: isDarkMode ? '#CBD5E1' : '#64748B' }}>
                                <WorkIcon sx={{ fontSize: 14 }} />
                                {savedJob.jobs?.work_mode || savedJob.jobs?.job_type || 'Work mode not specified'}
                              </Typography>
                              <Typography component="span" variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.45, color: isDarkMode ? '#CBD5E1' : '#64748B' }}>
                                <CalendarTodayIcon sx={{ fontSize: 13 }} />
                                Posted {savedJob.jobs?.created_at ? formatDate(savedJob.jobs.created_at) : 'date unavailable'}
                              </Typography>
                            </Box>
                          )}
                          primaryTypographyProps={{ fontWeight: 800, fontSize: { xs: 13, md: 15 }, color: isDarkMode ? '#F8FAFC' : '#0F172A' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                  {filteredSavedJobs.length === 0 ? (
                    <Typography sx={{ py: 3, textAlign: 'center', color: isDarkMode ? '#CBD5E1' : '#64748B', fontSize: 14 }}>
                      No saved jobs match your search or filter.
                    </Typography>
                  ) : null}
                </Box>
              ) : (
                <Box sx={{ maxWidth: 680, mx: 'auto', mt: 3, p: { xs: 2, md: 3 }, textAlign: 'center', borderRadius: 3, border: `1px dashed ${isDarkMode ? '#475569' : '#CBD5E1'}`, bgcolor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }}>
                  <Typography sx={{ color: isDarkMode ? '#CBD5E1' : '#64748B', fontSize: { xs: 15, md: 18 } }}>
                  No saved jobs yet. Save a job to see it here.
                  </Typography>
                </Box>
              )
            ) : premiumToolPopup?.label === 'Profile Views' ? (
              profileViewRecruiters.length > 0 ? (
                <Box sx={{ maxWidth: 1120, width: '100%', mx: 'auto' }}>
                  <Typography sx={{ color: isDarkMode ? '#F8FAFC' : '#0F172A', fontWeight: 900, fontSize: { xs: 17, md: 21 }, mb: 1.5 }}>
                    Recruiters who viewed your profile
                  </Typography>
                  <List sx={{ p: 0, display: 'grid', gap: 1 }}>
                    {profileViewRecruiters.map((viewer) => (
                      <ListItem
                        key={viewer.recruiter_id}
                        sx={{
                          px: { xs: 1.2, md: 1.8 },
                          py: { xs: 0.8, md: 1.2 },
                          borderRadius: 2.5,
                          border: `1px solid ${isDarkMode ? 'rgba(148,163,184,0.25)' : '#E2E8F0'}`,
                          bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                          boxShadow: isDarkMode ? '0 10px 24px rgba(0,0,0,0.18)' : '0 8px 20px rgba(15,23,42,0.06)',
                        }}
                      >
                        <Avatar
                          src={viewer.company_logo_url || undefined}
                          variant="rounded"
                          sx={{ width: 34, height: 34, mr: 1.2, flexShrink: 0, bgcolor: '#EFF6FF', color: '#2563EB', fontSize: 14, fontWeight: 800 }}
                        >
                          {(viewer.company_name || viewer.recruiter_name || 'C').charAt(0).toUpperCase()}
                        </Avatar>
                        <ListItemText
                          primary={viewer.company_name || viewer.recruiter_name || 'Recruiter'}
                          secondary={(
                            <Box sx={{ display: 'flex', gap: { xs: 1, md: 1.8 }, flexWrap: 'wrap', mt: 0.25 }}>
                              <Typography component="span" variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.45, color: isDarkMode ? '#CBD5E1' : '#64748B' }}>
                                <VisibilityIcon sx={{ fontSize: 14 }} />
                                {viewer.total_views || 1} {viewer.total_views === 1 ? 'profile view' : 'profile views'}
                              </Typography>
                              <Typography component="span" variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.45, color: isDarkMode ? '#CBD5E1' : '#64748B' }}>
                                <CalendarTodayIcon sx={{ fontSize: 13 }} />
                                Viewed {viewer.last_viewed_at ? new Date(viewer.last_viewed_at).toLocaleString() : 'time unavailable'}
                              </Typography>
                            </Box>
                          )}
                          primaryTypographyProps={{ fontWeight: 800, fontSize: { xs: 13, md: 15 }, color: isDarkMode ? '#F8FAFC' : '#0F172A' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ) : (
                <Box sx={{ maxWidth: 680, mx: 'auto', mt: 3, p: { xs: 2, md: 3 }, textAlign: 'center', borderRadius: 3, border: `1px dashed ${isDarkMode ? '#475569' : '#CBD5E1'}`, bgcolor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }}>
                  <Typography sx={{ color: isDarkMode ? '#CBD5E1' : '#64748B', fontSize: { xs: 14, md: 16 } }}>
                    No detailed profile-view records are available yet.
                  </Typography>
                </Box>
              )
            ) : premiumToolPopup?.label === 'Resume Downloads' ? (
              resumeUnlockRecruiters.length > 0 ? (
                <Box sx={{ maxWidth: 1120, width: '100%', mx: 'auto' }}>
                  <Typography sx={{ color: isDarkMode ? '#F8FAFC' : '#0F172A', fontWeight: 900, fontSize: { xs: 17, md: 21 }, mb: 1.5 }}>
                    Recruiters who downloaded your resume
                  </Typography>
                  <List sx={{ p: 0, display: 'grid', gap: 1 }}>
                    {resumeUnlockRecruiters.map((recruiter) => (
                      <ListItem
                        key={recruiter.recruiter_id}
                        sx={{
                          px: { xs: 1.2, md: 1.8 },
                          py: { xs: 0.8, md: 1.2 },
                          borderRadius: 2.5,
                          border: `1px solid ${isDarkMode ? 'rgba(148,163,184,0.25)' : '#E2E8F0'}`,
                          bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                          boxShadow: isDarkMode ? '0 10px 24px rgba(0,0,0,0.18)' : '0 8px 20px rgba(15,23,42,0.06)',
                        }}
                      >
                        <Avatar
                          src={recruiter.company_logo_url || undefined}
                          variant="rounded"
                          sx={{ width: 34, height: 34, mr: 1.2, flexShrink: 0, bgcolor: '#ECFDF5', color: '#16A34A', fontSize: 14, fontWeight: 800 }}
                        >
                          {(recruiter.company_name || recruiter.recruiter_name || 'C').charAt(0).toUpperCase()}
                        </Avatar>
                        <ListItemText
                          primary={recruiter.company_name || recruiter.recruiter_name || 'Recruiter'}
                          secondary={(
                            <Box sx={{ display: 'flex', gap: { xs: 1, md: 1.8 }, flexWrap: 'wrap', mt: 0.25 }}>
                              <Typography component="span" variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.45, color: isDarkMode ? '#CBD5E1' : '#64748B' }}>
                                <DownloadIcon sx={{ fontSize: 14 }} />
                                {recruiter.total_unlocks || 1} {recruiter.total_unlocks === 1 ? 'resume download' : 'resume downloads'}
                              </Typography>
                              <Typography component="span" variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.45, color: isDarkMode ? '#CBD5E1' : '#64748B' }}>
                                <CalendarTodayIcon sx={{ fontSize: 13 }} />
                                Downloaded {recruiter.last_unlocked_at ? new Date(recruiter.last_unlocked_at).toLocaleString() : 'time unavailable'}
                              </Typography>
                            </Box>
                          )}
                          primaryTypographyProps={{ fontWeight: 800, fontSize: { xs: 13, md: 15 }, color: isDarkMode ? '#F8FAFC' : '#0F172A' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ) : (
                <Box sx={{ maxWidth: 680, mx: 'auto', mt: 3, p: { xs: 2, md: 3 }, textAlign: 'center', borderRadius: 3, border: `1px dashed ${isDarkMode ? '#475569' : '#CBD5E1'}`, bgcolor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }}>
                  <Typography sx={{ color: isDarkMode ? '#CBD5E1' : '#64748B', fontSize: { xs: 14, md: 16 } }}>
                    No detailed resume-download records are available yet.
                  </Typography>
                </Box>
              )
            ) : premiumToolPopup?.label === 'Priority Apply' ? (
              priorityJobsLoading ? (
                <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : priorityJobs.length > 0 ? (
                <Box sx={{ maxWidth: 1120, width: '100%', mx: 'auto' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 2 }}>
                    <Typography sx={{ color: isDarkMode ? '#F8FAFC' : '#0F172A', fontWeight: 900, fontSize: { xs: 17, md: 21 } }}>
                      Priority matches from Find Jobs
                    </Typography>
                    <Chip label={`${priorityJobs.length} matches`} size="small" sx={{ fontWeight: 800, bgcolor: '#FFF4D6', color: '#8A6412' }} />
                  </Box>
                  <List sx={{ p: 0, display: 'grid', gap: 1 }}>
                    {priorityJobs.map((job) => (
                      <ListItem
                        key={job.id}
                        onClick={() => window.open(ROUTES.JOB_DETAILS.replace(':id', String(job.id)), '_blank', 'noopener,noreferrer')}
                        sx={{
                          px: { xs: 1.2, md: 1.8 },
                          py: { xs: 0.8, md: 1.2 },
                          borderRadius: 2.5,
                          border: `1px solid ${isDarkMode ? 'rgba(148,163,184,0.25)' : '#E2E8F0'}`,
                          bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                          cursor: 'pointer',
                          '&:hover': { borderColor: '#D6A73A', transform: 'translateY(-1px)' },
                          transition: 'border-color 160ms ease, transform 160ms ease',
                        }}
                      >
                        <Avatar
                          src={job.company_logo_url || job.company_logo || undefined}
                          variant="rounded"
                          sx={{ width: 34, height: 34, mr: 1.2, flexShrink: 0, bgcolor: '#FFF7E6', color: '#B7791F', fontSize: 14, fontWeight: 800 }}
                        >
                          {(job.company_name || 'C').charAt(0).toUpperCase()}
                        </Avatar>
                        <ListItemText
                          primary={job.title || 'Untitled job'}
                          secondary={(
                            <Box sx={{ display: 'flex', gap: { xs: 1, md: 1.8 }, flexWrap: 'wrap', mt: 0.25 }}>
                              <Typography component="span" variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.45 }}><BusinessIcon sx={{ fontSize: 14 }} />{job.company_name || 'Company not available'}</Typography>
                              <Typography component="span" variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.45 }}><LocationOnIcon sx={{ fontSize: 14 }} />{job.location || 'Location not specified'}</Typography>
                              <Typography component="span" variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.45 }}><WorkIcon sx={{ fontSize: 14 }} />{job.work_mode || job.workMode || 'Work mode not specified'}</Typography>
                              <Typography component="span" variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.45 }}><CalendarTodayIcon sx={{ fontSize: 13 }} />Posted {job.created_at ? formatDate(job.created_at) : 'date unavailable'}</Typography>
                            </Box>
                          )}
                          primaryTypographyProps={{ fontWeight: 800, fontSize: { xs: 13, md: 15 }, color: isDarkMode ? '#F8FAFC' : '#0F172A' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ) : (
                <Box sx={{ maxWidth: 680, mx: 'auto', mt: 3, p: { xs: 2, md: 3 }, textAlign: 'center', borderRadius: 3, border: '1px dashed #CBD5E1', bgcolor: '#FFFFFF' }}>
                  <Typography sx={{ color: '#64748B', fontSize: { xs: 14, md: 16 } }}>
                    No Find Jobs posts match your skills, designation, or preferred job titles yet.
                  </Typography>
                </Box>
              )
            ) : premiumToolPopup?.label === 'Assessments' ? (
              <AssessmentsPage embedded onOpenCertificates={() => openPremiumTool('Certificates', 'Showcase your verified JobPoyt assessment achievements.', '#D97706')} />
            ) : premiumToolPopup?.label === 'Free Notes' ? (
              <Box sx={{ mx: { xs: -1, md: 0 }, '& > .MuiBox-root': { maxWidth: 'none', px: 0, py: 0 } }}>
                <FreeNotesPage embedded onNewNoteReady={(handler) => setFreeNotesNewNoteHandler(() => handler)} />
              </Box>
            ) : ['Interview Preparation', 'Skill Test', 'Resume Builder', 'Certificates', 'Interview Invites'].includes(premiumToolPopup?.label || '') ? (
              <PremiumToolDashboards tool={premiumToolPopup?.label as 'Interview Preparation' | 'Skill Test' | 'Resume Builder' | 'Certificates' | 'Interview Invites'} skillTestHeaderActionRef={skillTestHeaderActionRef} onSkillTestHeaderStateChange={setSkillTestHeaderState} />
            ) : (
              <>
                <Box sx={{ maxWidth: 880, mx: 'auto', mt: { xs: 2, md: 4 }, p: { xs: 2.5, md: 3.5 }, borderRadius: 4, bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF', border: `1px solid ${isDarkMode ? 'rgba(148,163,184,0.25)' : '#E2E8F0'}`, boxShadow: isDarkMode ? '0 20px 40px rgba(0,0,0,0.2)' : '0 16px 34px rgba(15,23,42,0.07)', textAlign: 'center' }}>
                  <Typography sx={{ color: isDarkMode ? '#E5E7EB' : '#334155', lineHeight: 1.6, fontSize: { xs: 15, md: 18 }, fontWeight: 700 }}>
                    {premiumToolPopup?.description}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1.5, color: isDarkMode ? '#CBD5E1' : '#64748B', fontWeight: 700, fontSize: { xs: 12, md: 14 } }}>
                    This premium tool is available inside your Jobpoyt workspace.
                  </Typography>
                </Box>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={subscriptionDialogOpen} onClose={() => setSubscriptionDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogContent sx={{ p: { xs: 1.5, md: 2 } }}>
            <SubscriptionSummaryCard
              subscription={subscription}
              loading={subscriptionLoading}
              onRenew={() => {
                setSubscriptionDialogOpen(false);
                navigate(ROUTES.PRICING);
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

        <Box
          className="premium-section-tabs"
          sx={{
            mb: 3,
            borderRadius: 3,
            bgcolor: isDarkMode ? '#000000' : '#F8FAFC',
            p: 1,
            display: 'flex',
            gap: 1,
            flexWrap: 'nowrap',
            overflow: 'hidden',
            '&:hover > button:not(:hover)': {
              flex: '0.75 1 0',
            },
          }}
        >
          {sectionTabs.map((tab) => {
            const SelectedIcon = tab.icon;
            const selected = selectedSection === tab.key;
            return (
              <ButtonBase
                key={tab.key}
                onClick={() => setSelectedSection(tab.key)}
                focusRipple
                sx={{
                  flex: '1 1 0',
                  minWidth: 0,
                  width: 0,
                  borderRadius: 3,
                  overflow: 'hidden',
                  border: selected ? `1px solid ${theme.palette.primary.main}` : '1px solid transparent',
                  bgcolor: selected ? (isDarkMode ? 'rgba(56,189,248,0.18)' : '#EFF6FF') : isDarkMode ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                  color: selected ? (isDarkMode ? '#FFFFFF' : '#0F172A') : isDarkMode ? '#E5E7EB' : 'rgba(51,65,85,0.9)',
                  boxShadow: isDarkMode ? '0 1px 3px rgba(0,0,0,0.16)' : '0 1px 2px rgba(15,23,42,0.08)',
                  transition: 'flex 180ms ease, transform 180ms ease, background 180ms ease, border 180ms ease',
                  '&:hover': {
                    flex: '2 1 0',
                    transform: 'translateY(-2px)',
                    bgcolor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                    border: '1px solid lightgray',
                  },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.8,
                    textAlign: 'center',
                    p: 2,
                    width: '100%',
                  }}
                >
                  <SelectedIcon sx={{ fontSize: 28 }} />
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13 }}>
                    {tab.label}
                  </Typography>
                </Box>
              </ButtonBase>
            );
          })}
        </Box>

        {selectedSection === 'dailyBrief' && (
          <Suspense
            fallback={(
              <Card sx={{ borderRadius: 4, mb: 3 }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Generating AI Daily Career Brief...</Typography>
                  <LinearProgress sx={{ mt: 1.2 }} />
                </CardContent>
              </Card>
            )}
          >
            <AiDailyCareerBrief context={aiDailyBriefContext} onAction={handleAiDailyBriefAction} />
          </Suspense>
        )}

        {selectedSection === 'intelligence' && (
          <Card
            sx={{
              mb: 3,
              borderRadius: 4,
              border: isDarkMode ? '1px solid rgba(148,163,184,0.2)' : `1px solid ${theme.palette.divider}`,
              background: isDarkMode
                ? 'linear-gradient(138deg, rgba(2,6,23,0.95), rgba(30,41,59,0.95))'
                : 'linear-gradient(140deg, #BFDBFE 0%, #DBEAFE 55%, #EFF6FF 100%)',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1.2, mb: 2.2 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    Premium Intelligence Center
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
                    Live signals based on your activity, recruiter interactions, and match momentum.
                  </Typography>
                </Box>
                <Chip icon={<InsightsIcon />} label={`Demand score ${premiumInsights.demandScore}/100`} color={premiumInsights.demandScore >= 70 ? 'success' : 'warning'} sx={{ fontWeight: 700 }} />
              </Box>

              <Grid container spacing={2} sx={{ mb: 2.2 }}>
                <Grid item xs={12} md={4}>
                  <Card sx={{ borderRadius: 3, border: isDarkMode ? '1px solid rgba(148,163,184,0.18)' : `1px solid ${theme.palette.divider}`, height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.1 }}>
                        <BoltIcon color="warning" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          Weekly velocity
                        </Typography>
                      </Box>
                      <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>
                        {premiumInsights.recentApplications7d}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        applications in last 7 days
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card sx={{ borderRadius: 3, border: isDarkMode ? '1px solid rgba(148,163,184,0.18)' : `1px solid ${theme.palette.divider}`, height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.1 }}>
                        <TrackChangesIcon color="primary" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          Interview pipeline
                        </Typography>
                      </Box>
                      <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>
                        {premiumInsights.interviewPipelineCount}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        active under review or shortlisted
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card sx={{ borderRadius: 3, border: isDarkMode ? '1px solid rgba(148,163,184,0.18)' : `1px solid ${theme.palette.divider}`, height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.1 }}>
                        Strategic strengths
                      </Typography>
                      <List sx={{ p: 0, display: 'grid', gap: 0.6 }}>
                        {(premiumInsights.strengths.length > 0 ? premiumInsights.strengths : ['Add skills and update profile to unlock stronger signals.']).map((point) => (
                          <ListItem key={point} sx={{ px: 0, py: 0.1 }}>
                            <ListItemText
                              primary={point}
                              primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ borderRadius: 3, background: isDarkMode ? '#050608' : '#FFFFFF', border: isDarkMode ? '1px solid rgba(148,163,184,0.18)' : `1px solid ${theme.palette.divider}` }}>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.2, color: isDarkMode ? '#F8FAFC' : undefined }}>
                        Weekly Sprint Tracker
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', color: isDarkMode ? '#FFFFFF' : 'text.secondary', fontWeight: 700, mb: 1.1 }}>
                        Active model: {selectedRoleModel} ({activeRoleWeights.profileStrength.toFixed(2)} / {activeRoleWeights.applications.toFixed(2)} / {activeRoleWeights.interactions.toFixed(2)} / {activeRoleWeights.skills.toFixed(2)})
                      </Typography>
                      <Box sx={{ display: 'grid', gap: 1.1 }}>
                        {premiumInsights.weeklyGoals.map((goal) => {
                          const progress = Math.min(100, Math.round((goal.current / goal.target) * 100));
                          return (
                            <Box key={goal.label}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.45 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: isDarkMode ? '#F8FAFC' : undefined }}>
                                  {goal.label}
                                </Typography>
                                <Typography variant="caption" sx={{ color: isDarkMode ? '#FFFFFF' : 'text.secondary', fontWeight: 700 }}>
                                  {goal.current}/{goal.target}
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={progress}
                                sx={{
                                  height: 8,
                                  borderRadius: 8,
                                  bgcolor: isDarkMode ? 'rgba(148,163,184,0.24)' : 'rgba(148,163,184,0.2)',
                                  '& .MuiLinearProgress-bar': {
                                    borderRadius: 8,
                                  },
                                }}
                              />
                            </Box>
                          );
                        })}
                      </Box>
                      <Box sx={{ mt: 1.4, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button size="small" variant="outlined" startIcon={<TuneIcon />} onClick={() => navigate(ROUTES.DASHBOARD_SETTINGS_PREMIUM)} sx={{ fontWeight: 700 }}>
                          Customize Intelligence
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card sx={{ borderRadius: 3, background: isDarkMode ? '#050608' : '#FFFFFF', border: isDarkMode ? '1px solid rgba(148,163,184,0.18)' : `1px solid ${theme.palette.divider}` }}>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.2, color: isDarkMode ? '#F8FAFC' : undefined }}>
                        Opportunity Signals
                      </Typography>
                      <List sx={{ p: 0, display: 'grid', gap: 1 }}>
                        {opportunitySignals.length > 0 ? opportunitySignals.map((signal) => (
                          <ListItem key={signal.title} sx={{ borderRadius: 1.8, border: isDarkMode ? '1px solid rgba(148,163,184,0.2)' : `1px solid ${theme.palette.divider}`, bgcolor: isDarkMode ? 'rgba(15,23,42,0.7)' : '#FFFFFF', px: 1.4, py: 1.1, display: 'block' }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.35, color: isDarkMode ? '#F8FAFC' : undefined }}>
                              {signal.title}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', color: isDarkMode ? '#FFFFFF' : 'text.secondary', mb: 1 }}>
                              {signal.description}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', color: isDarkMode ? '#FFFFFF' : 'text.secondary', mb: 1, fontWeight: 600 }}>
                              Priority {signal.priorityScore}
                              {signal.observedAt ? ` • Updated ${formatDate(signal.observedAt)}` : ''}
                            </Typography>
                            <Button
                              size="small"
                              variant="contained"
                              color={signal.tone}
                              onClick={signal.action}
                              className="opportunity-signal-btn"
                              sx={{
                                fontWeight: 700,
                              }}
                            >
                              <span className="opportunity-signal-text">{signal.cta}</span>
                            </Button>
                          </ListItem>
                        )) : (
                          <ListItem sx={{ borderRadius: 1.8, border: isDarkMode ? '1px solid rgba(148,163,184,0.2)' : `1px solid ${theme.palette.divider}`, bgcolor: isDarkMode ? 'rgba(15,23,42,0.7)' : '#FFFFFF', px: 1.4, py: 1.1 }}>
                            <ListItemText
                              primary="No urgent signals"
                              secondary="Your dashboard is stable. Keep applying consistently this week."
                              primaryTypographyProps={{ fontWeight: 700, color: isDarkMode ? '#F8FAFC' : undefined }}
                              secondaryTypographyProps={{ color: isDarkMode ? '#94A3B8' : undefined }}
                            />
                          </ListItem>
                        )}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {selectedSection === 'remoteHub' && (
          <Card
            sx={{
              mb: 3,
              borderRadius: 4,
              border: isDarkMode ? '1px solid rgba(148,163,184,0.2)' : `1px solid ${theme.palette.divider}`,
              background: isDarkMode
                ? 'linear-gradient(138deg, rgba(2,6,23,0.95), rgba(30,41,59,0.95))'
                : 'linear-gradient(140deg, #BFDBFE 0%, #DBEAFE 55%, #EFF6FF 100%)',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2.6 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.6 }}>
                    Remote Job Hub
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 660 }}>
                    Premium remote opportunities in one place. Explore remote roles, track remote applications, and jump to high-match options.
                  </Typography>
                </Box>
                <Chip label="Remote Focus" color="success" sx={{ fontWeight: 700 }} />
              </Box>

              <Grid container spacing={2}>
                {[
                  {
                    title: 'Explore Remote Jobs',
                    description: 'Browse remote roles tailored to your profile.',
                    action: () => navigate('/dashboard/remote-jobs'),
                    icon: PublicIcon,
                  },
                  {
                    title: 'Remote Applications',
                    description: 'Track remote jobs you already applied to.',
                    action: () => navigate(`${ROUTES.DASHBOARD_APPLICATIONS}?filter=remote`),
                    icon: FlightTakeoffIcon,
                  },
                  {
                    title: 'Priority Remote Matches',
                    description: 'Open newly matched premium remote opportunities.',
                    action: () => navigate('/dashboard/remote-jobs'),
                    icon: AutoAwesomeIcon,
                  },
                ].map((item) => (
                  <Grid item xs={12} md={4} key={item.title}>
                    <Card sx={{ borderRadius: 3, height: '100%', border: isDarkMode ? '1px solid rgba(148,163,184,0.18)' : `1px solid ${theme.palette.divider}`, background: isDarkMode ? 'linear-gradient(180deg, rgba(15,23,42,0.9), rgba(30,41,59,0.9))' : '#FFFFFF' }}>
                      <CardContent>
                        <item.icon color="success" sx={{ mb: 1 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.8 }}>
                          {item.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                          {item.description}
                        </Typography>
                        <button
                          className="cta"
                          onClick={item.action}
                          type="button"
                          style={{
                            background: candidateHeroGradient,
                            borderColor: 'rgba(255,255,255,0.2)',
                            boxShadow: '0 10px 22px rgba(2,6,23,0.16)',
                          }}
                        >
                          <span style={{ color: '#FFFFFF' }}>Open&nbsp;</span>
                          <svg viewBox="0 0 13 10" height="10px" width="15px" aria-hidden="true" style={{ stroke: '#FFFFFF' }}>
                            <path d="M1,5 L11,5"></path>
                            <polyline points="8 1 12 5 8 9"></polyline>
                          </svg>
                        </button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        {selectedSection === 'premiumTools' && (
          <Box
            sx={{
              mb: 3,
              borderRadius: 5,
              border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(226,232,240,0.8)',
              bgcolor: isDarkMode ? '#000000' : '#F8FAFF',
              boxShadow: isDarkMode ? '0 24px 60px rgba(0,0,0,0.34)' : '0 20px 60px rgba(15,23,42,0.08)',
              overflow: 'hidden',
              position: 'relative',
              '&:before': {
                display: 'none',
              },
              '&:after': {
                display: 'none',
              },
            }}
          >
            <Box
              component="video"
              autoPlay
              loop
              muted
              playsInline
              aria-hidden="true"
              src="https://ydvnozzigjihcachxnah.supabase.co/storage/v1/object/sign/website%20public/premium%20site1.mp4?token=eyJraWQiOiJjNjk4MjVmYS1iN2I5LTQ5OWItODBjMi1hZjRkNTQ4ZWQ3YjIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ3ZWJzaXRlIHB1YmxpYy9wcmVtaXVtIHNpdGUxLm1wNCIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3OTAzNTIyMTMsImV4cCI6MjQyMTA3MjIxM30.eixDBdpBeQkJhdP4yA4wO4OxAgk5GlUR6ZhpPdNueOQ"
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 1,
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />
            <Box sx={{ position: 'relative', zIndex: 1, px: { xs: 3, md: 4 }, pt: { xs: 3, md: 4 }, pb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: isDarkMode ? '#FFFFFF' : '#0F172A', textAlign: 'center' }}>
                ✨ Explore Premium Workspace ✨
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: isDarkMode ? '#FFFFFF' : '#475569',
                  textAlign: 'center',
                  maxWidth: 680,
                  mx: 'auto',
                  mt: 1,
                }}
              >
                Powerful tools and insights to accelerate your career growth
              </Typography>
              <Box
                sx={{
                  height: 4,
                  width: 120,
                  mx: 'auto',
                  mt: 3,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, rgba(37,99,235,0.85), rgba(124,58,237,0.85))',
                }}
              />
            </Box>

            <Grid container spacing={2} sx={{ position: 'relative', zIndex: 1, px: { xs: 2, md: 3 }, pb: { xs: 3, md: 3 } }}>
              <Grid item xs={12}>
                <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
                  {[
                    {
                      label: 'Saved Jobs',
                      icon: FavoriteIcon,
                      action: () => openPremiumTool('Saved Jobs', `${savedJobsCount} saved ${savedJobsCount === 1 ? 'job' : 'jobs'} are waiting in your shortlist.`, '#E11D48'),
                      iconGradient: 'linear-gradient(135deg, rgba(244,63,94,0.16), rgba(255,228,230,0.34))',
                      accent: '#E11D48',
                    },
                    {
                      label: 'Profile Views',
                      icon: VisibilityIcon,
                      action: () => openPremiumTool('Profile Views', `${profileViewCount} recruiter ${profileViewCount === 1 ? 'view' : 'views'} of your profile recorded.`, '#2563EB'),
                      iconGradient: 'linear-gradient(135deg, rgba(59,130,246,0.16), rgba(191,219,254,0.35))',
                      accent: '#2563EB',
                    },
                    {
                      label: 'Resume Downloads',
                      icon: DownloadIcon,
                      action: () => openPremiumTool('Resume Downloads', `${resumeDownloadCount} recruiter ${resumeDownloadCount === 1 ? 'download' : 'downloads'} of your resume recorded.`, '#16A34A'),
                      iconGradient: 'linear-gradient(135deg, rgba(34,197,94,0.16), rgba(209,250,229,0.34))',
                      accent: '#16A34A',
                    },
                    {
                      label: 'Resume Builder',
                      icon: DescriptionIcon,
                      action: () => openPremiumTool('Resume Builder', 'Build, edit, tailor, and download an ATS-friendly resume.', '#7C3AED'),
                      iconGradient: 'linear-gradient(135deg, rgba(124,58,237,0.16), rgba(233,213,255,0.3))',
                      accent: '#7C3AED',
                    },
                    {
                      label: 'Priority Apply',
                      icon: WorkIcon,
                      action: () => openPremiumTool('Priority Apply', 'Find high-intent opportunities and keep your strongest applications moving forward.', '#F59E0B'),
                      iconGradient: 'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(254,243,199,0.32))',
                      accent: '#F59E0B',
                    },
                    {
                      label: 'Interview Preparation',
                      icon: ChatIcon,
                      action: () => openPremiumTool('Interview Preparation', 'Prepare answers, sharpen your communication, and get ready for recruiter conversations.', '#0284C7'),
                      iconGradient: 'linear-gradient(135deg, rgba(14,165,233,0.16), rgba(204,242,254,0.3))',
                      accent: '#0284C7',
                    },
                    {
                      label: 'Free Notes',
                      icon: StickyNote2Icon,
                      action: () => openPremiumTool('Free Notes', 'Capture application ideas, follow-ups, and career reminders inside your dashboard.', '#16A34A'),
                      iconGradient: 'linear-gradient(135deg, rgba(34,197,94,0.16), rgba(209,250,229,0.3))',
                      accent: '#16A34A',
                    },
                    {
                      label: 'Assessments',
                      icon: TrackChangesIcon,
                      action: () => openPremiumTool('Assessments', 'Measure your strengths with assessments designed to improve your career readiness.', '#7C3AED'),
                      iconGradient: 'linear-gradient(135deg, rgba(168,85,247,0.16), rgba(244,231,255,0.32))',
                      accent: '#7C3AED',
                    },
                    {
                      label: 'Community',
                      icon: PublicIcon,
                      action: () => openPremiumTool('Community', 'Connect with the Jobpoyt career community and discover new professional opportunities.', '#0EA5E9'),
                      iconGradient: 'linear-gradient(135deg, rgba(34,211,238,0.16), rgba(192,232,249,0.34))',
                      accent: '#0EA5E9',
                    },
                    {
                      label: 'My Subscription',
                      icon: WorkspacePremiumIcon,
                      action: () => setSubscriptionDialogOpen(true),
                      iconGradient: 'linear-gradient(135deg, rgba(251,191,36,0.16), rgba(254,243,199,0.34))',
                      accent: '#F59E0B',
                    },
                    {
                      label: 'Skill Test',
                      icon: AssessmentIcon,
                      action: () => openPremiumTool('Skill Test', 'Test your job-ready skills and understand where to focus your next improvement sprint.', '#2563EB'),
                      iconGradient: 'linear-gradient(135deg, rgba(37,99,235,0.16), rgba(191,219,254,0.35))',
                      accent: '#2563EB',
                    },
                    {
                      label: 'Certificates',
                      icon: WorkspacePremiumIcon,
                      action: () => openPremiumTool('Certificates', 'Review the certificates and verified achievements that strengthen your professional profile.', '#D97706'),
                      iconGradient: 'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(254,243,199,0.34))',
                      accent: '#D97706',
                    },
                    {
                      label: 'Portfolio',
                      icon: PublicIcon,
                      action: () => openPremiumTool('Portfolio', 'Build a stronger professional presence by organizing your work, links, and career highlights.', '#0EA5E9'),
                      iconGradient: 'linear-gradient(135deg, rgba(14,165,233,0.16), rgba(186,230,253,0.34))',
                      accent: '#0EA5E9',
                    },
                    {
                      label: 'Interview Invites',
                      icon: VideocamIcon,
                      action: () => openPremiumTool('Interview Invites', 'Keep track of interview opportunities and be ready to respond quickly to recruiters.', '#16A34A'),
                      iconGradient: 'linear-gradient(135deg, rgba(34,197,94,0.16), rgba(209,250,229,0.34))',
                      accent: '#16A34A',
                    },
                    {
                      label: 'Referrals',
                      icon: PeopleIcon,
                      action: () => openPremiumTool('Referrals', 'Explore referral opportunities and grow your path to relevant roles through your network.', '#0891B2'),
                      iconGradient: 'linear-gradient(135deg, rgba(8,145,178,0.16), rgba(207,250,254,0.34))',
                      accent: '#0891B2',
                    },
                  ].map((tool) => {
                    const ToolIcon = tool.icon;
                    return (
                      <Grid item xs={12} sm={6} md={3} key={tool.label} sx={{ display: 'flex', order: premiumToolOrder[tool.label] ?? 99 }}>
                        <MotionCard
                          whileHover={{ y: -4 }}
                          transition={{ duration: 0.25 }}
                          onClick={tool.action}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              tool.action();
                            }
                          }}
                          sx={{
                            width: '100%',
                            height: '100%',
                            minHeight: 128,
                            borderRadius: 3,
                            border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(226,232,240,0.9)',
                            bgcolor: isDarkMode ? '#050608' : 'rgba(255,255,255,0.94)',
                            backdropFilter: 'blur(10px)',
                            boxShadow: isDarkMode ? '0 14px 28px rgba(0,0,0,0.32)' : '0 12px 26px rgba(15,23,42,0.12)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: 1.4,
                            cursor: 'pointer',
                            '&:hover': {
                              boxShadow: isDarkMode ? '0 18px 34px rgba(0,0,0,0.38)' : '0 16px 32px rgba(15,23,42,0.12)',
                            },
                          }}
                        >
                          <Box
                            sx={{
                              width: 42,
                              height: 42,
                              borderRadius: 2.5,
                              bgcolor: tool.iconGradient,
                              display: 'grid',
                              placeItems: 'center',
                              boxShadow: isDarkMode ? '0 12px 28px rgba(59,130,246,0.08)' : '0 12px 28px rgba(59,130,246,0.12)',
                            }}
                          >
                            <ToolIcon sx={{ fontSize: 19, color: tool.accent }} />
                          </Box>
                          <Typography variant="subtitle1" sx={{ mt: 1.2, fontWeight: 800, fontSize: { xs: 13, md: 14 }, color: isDarkMode ? '#F8FAFC' : '#0F172A', textAlign: 'center', lineHeight: 1.2 }}>
                            {tool.label}
                          </Typography>
                        </MotionCard>
                      </Grid>
                    );
                  })}
                </Grid>

              </Grid>
            </Grid>
          </Box>
        )}

        {selectedSection === 'recruiterActivity' && (
          <RecruiterActivityCenter
            context={recruiterActivityContext}
            onQuickAction={handleRecruiterActivityQuickAction}
          />
        )}

        {selectedSection === 'recentApplications' && (
          <Card
            sx={{
              mt: 3,
              borderRadius: 4,
              border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(180, 122, 20, 0.24)',
              background: isDarkMode
                ? 'linear-gradient(138deg, rgba(5,6,8,0.95), rgba(15,23,42,0.95))'
                : 'linear-gradient(140deg, #BFDBFE 0%, #DBEAFE 55%, #EFF6FF 100%)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                background: isDarkMode
                  ? 'radial-gradient(circle at 90% 12%, rgba(56,189,248,0.12), transparent 35%)'
                  : 'radial-gradient(circle at 90% 12%, rgba(245,158,11,0.16), transparent 35%)',
                pointerEvents: 'none',
              },
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                  pb: 1.6,
                  borderBottom: isDarkMode ? '1px dashed rgba(148,163,184,0.32)' : '1px dashed rgba(180, 122, 20, 0.35)',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800, color: isDarkMode ? '#E2E8F0' : '#000000' }}>
                  Recent Applications
                </Typography>
                <Button
                  onClick={() => navigate(ROUTES.DASHBOARD_APPLICATIONS)}
                  className="opportunity-signal-btn"
                  sx={{
                    fontWeight: 700,
                  }}
                >
                  <span className="opportunity-signal-text">View all ({recentApplications.length})</span>
                </Button>
              </Box>

              <List sx={{ p: 0, display: 'grid', gap: 1.2 }}>
                {recentApplications.length === 0 ? (
                  <ListItem
                    sx={{
                      px: 2,
                      py: 2,
                      borderRadius: 2.5,
                      border: isDarkMode ? '1px solid rgba(148,163,184,0.24)' : '1px solid rgba(180, 122, 20, 0.25)',
                      background: isDarkMode
                        ? 'linear-gradient(140deg, rgba(30,41,59,0.75), rgba(15,23,42,0.76))'
                        : '#FFFFFF',
                    }}
                  >
                    <ListItemText primary="No applications yet" secondary="Apply to jobs to track your application history." />
                  </ListItem>
                ) : (
                  recentApplications.slice(0, 3).map((application) => (
                    <ListItem
                      key={application.id}
                      sx={{
                        px: 2,
                        py: 1.6,
                        borderRadius: 2.5,
                        border: isDarkMode ? '1px solid rgba(148,163,184,0.2)' : '1px solid rgba(180, 122, 20, 0.24)',
                        background: isDarkMode
                          ? 'linear-gradient(145deg, rgba(30,41,59,0.8), rgba(15,23,42,0.84))'
                          : '#FFFFFF',
                        alignItems: 'flex-start',
                        gap: 1.4,
                      }}
                    >
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          mt: 1,
                          bgcolor:
                            application.status === 'shortlisted'
                              ? '#22C55E'
                              : application.status === 'under_review'
                              ? '#F59E0B'
                              : application.status === 'rejected'
                              ? '#EF4444'
                              : application.status === 'accepted'
                              ? '#3B82F6'
                              : isDarkMode
                              ? '#94A3B8'
                              : '#B7791F',
                          boxShadow: '0 0 0 4px rgba(148,163,184,0.12)',
                          flexShrink: 0,
                        }}
                      />

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: isDarkMode ? '#F8FAFC' : '#000000', lineHeight: 1.2 }}>
                          {application.jobs?.title || 'Unknown role'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: isDarkMode ? '#FFFFFF' : '#000000', fontWeight: 600, mt: 0.35 }}>
                          {application.jobs?.company_name || 'Unknown company'}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: isDarkMode ? '#FFFFFF' : '#000000', mt: 0.55 }}>
                          {application.jobs?.location || 'Location not specified'}
                        </Typography>
                      </Box>

                      <Box sx={{ textAlign: 'right', minWidth: 128 }}>
                        <Chip
                          label={(application.status || 'applied').replace('_', ' ').toUpperCase()}
                          size="small"
                          color={
                            application.status === 'shortlisted'
                              ? 'success'
                              : application.status === 'under_review'
                              ? 'warning'
                              : application.status === 'rejected'
                              ? 'error'
                              : application.status === 'accepted'
                              ? 'primary'
                              : 'default'
                          }
                          sx={{ fontWeight: 700 }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            color: isDarkMode ? '#FFFFFF' : '#000000',
                            mt: 0.75,
                            fontWeight: 600,
                          }}
                        >
                          {application.applied_at ? formatDate(application.applied_at) : 'Date unavailable'}
                        </Typography>
                      </Box>
                    </ListItem>
                  ))
                )}
              </List>
            </CardContent>
          </Card>
        )}

        {selectedSection === 'matchCenter' && (
          <Suspense
            fallback={(
              <Card sx={{ borderRadius: 4, mb: 3 }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Loading AI Match Center...</Typography>
                  <LinearProgress sx={{ mt: 1.2 }} />
                </CardContent>
              </Card>
            )}
          >
            <AiMatchCenter
              jobs={recommendedJobs}
              context={aiMatchContext}
              onApplyNow={handleAiMatchApplyNow}
              onSaveJob={handleAiMatchSaveJob}
              onImproveMatch={handleAiMatchImproveMatch}
              onResumeOptimizer={() => navigate('/dashboard/resume-review')}
              onMockInterview={() => navigate('/dashboard/mock-interviews')}
              onViewDetails={(jobId) => navigate(`/jobs/${jobId}`)}
            />
          </Suspense>
        )}

        <Dialog
          open={interactionModalOpen}
          onClose={() => setInteractionModalOpen(false)}
          fullWidth
          maxWidth="sm"
          PaperProps={{
            sx: {
              borderRadius: 3,
              border: isDarkMode ? '1px solid rgba(148,163,184,0.24)' : '1px solid rgba(180,122,20,0.25)',
              overflow: 'hidden',
            },
          }}
        >
          <DialogTitle
            sx={{
              pb: 1.4,
              borderBottom: isDarkMode ? '1px solid rgba(148,163,184,0.2)' : '1px solid rgba(180,122,20,0.2)',
              background: isDarkMode
                ? 'linear-gradient(140deg, rgba(15,23,42,0.98), rgba(30,41,59,0.95))'
                : 'linear-gradient(140deg, #FFF9EA, #FFEDC7)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.8,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: interactionType === 'downloads'
                      ? (isDarkMode ? 'rgba(34,197,94,0.18)' : 'rgba(22,163,74,0.14)')
                      : (isDarkMode ? 'rgba(59,130,246,0.2)' : 'rgba(37,99,235,0.14)'),
                  }}
                >
                  {interactionType === 'downloads' ? (
                    <VideocamIcon sx={{ fontSize: 20, color: interactionType === 'downloads' ? '#16A34A' : '#2563EB' }} />
                  ) : (
                    <VisibilityIcon sx={{ fontSize: 20, color: '#2563EB' }} />
                  )}
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                    {interactionModalTitle}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {interactionType === 'downloads' ? 'Resume engagement analytics' : 'Profile visibility analytics'}
                  </Typography>
                </Box>
              </Box>
              <Chip
                size="small"
                label={`${interactionItems.length} recruiters`}
                sx={{
                  fontWeight: 700,
                  bgcolor: isDarkMode ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.72)',
                }}
              />
            </Box>
          </DialogTitle>
          <DialogContent
            dividers
            sx={{
              background: isDarkMode
                ? 'linear-gradient(160deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))'
                : 'linear-gradient(160deg, #FFFCF4, #FFF7E7)',
              borderTop: 'none',
            }}
          >
            {interactionLoading ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }}>
                Loading recruiters...
              </Typography>
            ) : interactionItems.length === 0 ? (
              <Box
                sx={{
                  borderRadius: 2,
                  border: isDarkMode ? '1px solid rgba(148,163,184,0.22)' : '1px solid rgba(180,122,20,0.2)',
                  p: 2,
                  background: isDarkMode ? 'rgba(30,41,59,0.56)' : 'rgba(255,255,255,0.8)',
                }}
              >
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No recruiter interactions found yet.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gap: 1.2 }}>
                {interactionItems.map((item, index) => (
                  <Card
                    key={item.recruiter_id || index}
                    sx={{
                      p: 1.6,
                      borderRadius: 2,
                      border: isDarkMode ? '1px solid rgba(148,163,184,0.22)' : '1px solid rgba(180,122,20,0.22)',
                      background: isDarkMode
                        ? 'linear-gradient(150deg, rgba(30,41,59,0.88), rgba(15,23,42,0.86))'
                        : 'linear-gradient(150deg, rgba(255,255,255,0.94), rgba(255,248,232,0.96))',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                          {item.recruiter_name || 'Recruiter'}
                        </Typography>
                        {item.company_name ? (
                          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.2 }}>
                            {item.company_name}
                          </Typography>
                        ) : null}
                      </Box>
                      <Chip
                        size="small"
                        label={item.total_unlocks != null ? `${item.total_unlocks} downloads` : `${item.total_views || 0} views`}
                        color={interactionType === 'downloads' ? 'success' : 'primary'}
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>

                    <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block', fontWeight: 600 }}>
                      Last activity: {item.last_unlocked_at || item.last_viewed_at ? formatDate(item.last_unlocked_at || item.last_viewed_at) : 'Recent'}
                    </Typography>
                  </Card>
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 2.2, py: 1.5, borderTop: isDarkMode ? '1px solid rgba(148,163,184,0.2)' : '1px solid rgba(180,122,20,0.2)' }}>
            <Button onClick={() => setInteractionModalOpen(false)} sx={{ fontWeight: 700 }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default PremiumDashboard;
