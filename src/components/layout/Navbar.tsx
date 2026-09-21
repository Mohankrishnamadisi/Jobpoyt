import React, { useEffect, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Container,
  Button,
  Menu,
  MenuItem,
  IconButton,
  Avatar,
  Typography,
  Divider,
  useMediaQuery,
} from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  WorkOutline as WorkIcon,
  Settings as SettingsIcon,
  ExitToApp as ExitToAppIcon,
  HeadsetMic as HeadsetMicIcon,
  Menu as MenuIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Apartment as ApartmentIcon,
  TravelExplore as TravelExploreIcon,
  Notifications as NotificationsIcon,
  ArrowForward as ArrowForwardIcon,
  PersonAddAlt1 as SignupIcon,
} from '@mui/icons-material';
import { Badge } from '@mui/material';
import { motion } from 'framer-motion';
import { useTheme } from '@mui/material/styles';
import Swal from '@utils/sweetAlert';
import { useAuthStore } from '@store/index';
import { authService } from '@services/supabase';
import { notificationService, recruiterService } from '@services/api';
import { ROUTES, USER_ROLES } from '@constants/index';
import { formatDate, generateInitials } from '@utils/index';
import { Logo } from '@components/common/Logo';
import InstallApp from '@components/InstallApp/InstallApp';
import { useSubscription, useThemeMode } from '@hooks/index';
import SupportWidget from '@components/common/SupportWidget';
import { supportService } from '@services/support';
import { AnimatedBackButton } from '@components/common/AnimatedBackButton';
import '../../styles/navbarPremiumButton.css';

const MotionBox = motion(Box);

export const Navbar: React.FC<{ backTo?: string }> = ({ backTo }) => {
  const { user, logout } = useAuthStore();
  const { subscription } = useSubscription(user?.id || null);
  const { setThemeMode } = useThemeMode();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const isRecruiter = user?.role === USER_ROLES.RECRUITER;
  const isDarkMode = theme.palette.mode === 'dark';
  const showPremiumThemeToggle = Boolean(
    user
      && user.role === USER_ROLES.JOB_SEEKER
      && subscription
  );
  const canGoBack = location.pathname !== ROUTES.HOME && location.pathname !== '/';
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileAnchor, setMobileAnchor] = useState<null | HTMLElement>(null);
  const [exploreAnchor, setExploreAnchor] = useState<null | HTMLElement>(null);
  const [recruiterAnchor, setRecruiterAnchor] = useState<null | HTMLElement>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [ticketNotifCount, setTicketNotifCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [recruiterAvatar, setRecruiterAvatar] = useState('');

  useEffect(() => {
    if (!user?.id) {
      setTicketNotifCount(0);
      setNotificationCount(0);
      return;
    }
    supportService.getUnseenAdminResponseCount(user.id).then(setTicketNotifCount).catch(() => setTicketNotifCount(0));
  }, [user?.id, supportOpen]);

  useEffect(() => {
    if (!user?.id) {
      setNotificationCount(0);
      return undefined;
    }

    let mounted = true;
    const refreshUnreadNotifications = async () => {
      try {
        const unread = await notificationService.getUnreadNotifications(user.id);
        if (!mounted) return;
        setNotifications(unread || []);
        setNotificationCount((unread || []).length);
      } catch {
        if (mounted) {
          setNotifications([]);
          setNotificationCount(0);
        }
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
    let mounted = true;
    const loadRecruiterAvatar = async () => {
      if (!user?.id || !isRecruiter) {
        setRecruiterAvatar('');
        return;
      }

      try {
        const profile = await recruiterService.getRecruiterProfile(user.id);
        if (!mounted) return;
        const logo = String(profile?.company_logo_url || profile?.logo_url || '').trim();
        setRecruiterAvatar(logo);
      } catch {
        if (mounted) setRecruiterAvatar('');
      }
    };

    loadRecruiterAvatar();
    return () => {
      mounted = false;
    };
  }, [isRecruiter, user?.id]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileAnchor(null);
  };

  const handleExploreMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExploreAnchor(event.currentTarget);
  };

  const handleExploreMenuClose = () => {
    setExploreAnchor(null);
  };

  const handleRecruiterMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setRecruiterAnchor(event.currentTarget);
  };

  const handleRecruiterMenuClose = () => {
    setRecruiterAnchor(null);
  };

  const mobileNavItems = [
    { label: 'Home', to: ROUTES.HOME },
    { label: 'Jobs', to: ROUTES.JOBS },
    { label: 'Learning', to: ROUTES.DASHBOARD_LEARNING },
  ];

  const desktopNavItems = [
    { label: 'Home', to: ROUTES.HOME },
    { label: 'Jobs', to: ROUTES.JOBS },
    { label: 'Learning', to: ROUTES.DASHBOARD_LEARNING },
  ];

  const featuredCompanies = [
    { label: 'TCS Jobs', to: `${ROUTES.JOBS}?keyword=TCS` },
    { label: 'Infosys Jobs', to: `${ROUTES.JOBS}?keyword=Infosys` },
    { label: 'Wipro Jobs', to: `${ROUTES.JOBS}?keyword=Wipro` },
    { label: 'Cognizant Jobs', to: `${ROUTES.JOBS}?keyword=Cognizant` },
    { label: 'Accenture Jobs', to: `${ROUTES.JOBS}?keyword=Accenture` },
    { label: 'Capgemini Jobs', to: `${ROUTES.JOBS}?keyword=Capgemini` },
  ];

  const jobCollections = [
    { label: 'Remote Roles', to: `${ROUTES.JOBS}?workMode=Remote` },
    { label: 'Hybrid Jobs', to: `${ROUTES.JOBS}?workMode=Hybrid` },
    { label: 'Internships', to: `${ROUTES.JOBS}?jobType=Internship` },
    { label: 'Fresher Openings', to: `${ROUTES.JOBS}?experience=0-1 years` },
    { label: 'Last 7 Days', to: `${ROUTES.JOBS}?freshness=7d` },
  ];

  const featureTools = [
    { label: 'Community', to: ROUTES.DASHBOARD_COMMUNITY },
    { label: 'Referrals', to: ROUTES.DASHBOARD_REFERRALS },
    { label: 'Mentorship', to: ROUTES.DASHBOARD_MENTORSHIP },
    { label: 'Events', to: ROUTES.DASHBOARD_EVENTS },
    { label: 'Assessments', to: ROUTES.DASHBOARD_ASSESSMENTS },
    { label: 'AI Career Hub', to: ROUTES.DASHBOARD_AI_CAREER_HUB },
    { label: 'Learning', to: ROUTES.DASHBOARD_LEARNING },
    { label: 'Recommended Jobs', to: '/dashboard/recommended-jobs' },
    { label: 'Remote Dashboard', to: '/dashboard/remote-jobs' },
    { label: 'Mock Interviews', to: '/dashboard/mock-interviews' },
    { label: 'Resume Review', to: '/dashboard/resume-review' },
    { label: 'Priority Apply', to: '/dashboard/priority-apply' },
  ];

  const goToFeature = (to: string) => {
    handleExploreMenuClose();
    handleMobileMenuClose();
    navigate(to);
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Logout?',
      text: 'Are you sure you want to logout?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1D4ED8',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Yes, logout',
      cancelButtonText: 'Cancel',
      background: '#FFFFFF',
      color: '#172033',
    });

    if (result.isConfirmed) {
      try {
        await authService.signOut();
        logout();
        navigate(ROUTES.HOME);
        Swal.fire({
          title: 'Logged out successfully!',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: '#FFFFFF',
          color: '#172033',
        });
      } catch (error) {
        console.error('Logout failed:', error);
        Swal.fire({
          title: 'Error!',
          text: 'Failed to logout',
          icon: 'error',
          background: '#FFFFFF',
          color: '#172033',
        });
      }
    }
  };

  const dashboardRoute =
    user?.role === USER_ROLES.RECRUITER
      ? ROUTES.RECRUITER_DASHBOARD
      : ROUTES.DASHBOARD;

  const getCurrentHashRoute = () => {
    const hash = window.location.hash || '';
    const route = hash.startsWith('#') ? hash.slice(1) : hash;
    return route || '/';
  };

  const handleNotificationsClick = async (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
    if (!user?.id) return;

    setNotificationsLoading(true);
    try {
      const unread = await notificationService.getUnreadNotifications(user.id);
      setNotifications(unread || []);
      setNotificationCount((unread || []).length);
    } catch {
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleNotificationsClose = () => setNotificationAnchor(null);

  const handleBackNavigation = () => {
    // If a specific back destination is provided, navigate directly to it
    if (backTo) {
      navigate(backTo, { replace: true });
      return;
    }

    const fallbackRoute = user ? dashboardRoute : ROUTES.HOME;

    if (user?.role === USER_ROLES.JOB_SEEKER && location.pathname.startsWith('/dashboard/')) {
      navigate(ROUTES.DASHBOARD, { replace: true });
      return;
    }

    if (window.history.length > 1) {
      const beforeRoute = getCurrentHashRoute();
      window.history.back();

      window.setTimeout(() => {
        const afterRoute = getCurrentHashRoute();
        if (afterRoute === beforeRoute) {
          navigate(fallbackRoute, { replace: true });
        }
      }, 180);
      return;
    }

    navigate(fallbackRoute, { replace: true });
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        background: isDarkMode ? 'rgba(10, 15, 30, 0.86)' : 'rgba(255, 255, 255, 0.9)',
        borderBottom: isDarkMode ? '1px solid rgba(71, 85, 105, 0.5)' : '1px solid rgba(226, 232, 240, 0.92)',
        top: 0,
        width: '100%',
        zIndex: 1200,
        pt: { xs: 'env(safe-area-inset-top, 0px)', md: 0 },
        backdropFilter: 'blur(10px)',
      }}
    >
      <Container maxWidth="xl">
        <Toolbar
          disableGutters
          sx={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: { xs: 0.9, md: 1.2 },
            py: { xs: 0.95, sm: 0.9 },
            px: { xs: 0.3, sm: 0.8 },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.2, md: 1 },
              flexShrink: 0,
            }}
          >
            {canGoBack && (
              <Box
                className={isDarkMode ? 'navbar-dark-mode' : undefined}
                onClick={handleBackNavigation}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  transform: { xs: 'none', md: 'scale(0.62)' },
                  transformOrigin: 'left center',
                  zoom: { xs: 0.62, md: 'normal' },
                  ml: { xs: -1, md: -1 },
                  cursor: 'pointer',
                  color: isDarkMode ? '#E2E8F0' : '#334155',
                }}
              >
                <AnimatedBackButton onClick={handleBackNavigation} ariaLabel="Go back" />
              </Box>
            )}
            <Logo size={isXs ? 'small' : 'medium'} />
          </Box>

          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            {desktopNavItems.map((item) => {
              const isActive = location.pathname === item.to;

              return (
                <Button
                  key={item.label}
                  component={RouterLink}
                  to={item.to}
                  sx={{
                    textTransform: 'none',
                    px: 1.4,
                    py: 0.5,
                    borderRadius: 2,
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: isActive ? 'primary.main' : 'text.primary',
                    bgcolor: isActive ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                    '&:hover': {
                      bgcolor: isActive ? 'rgba(37, 99, 235, 0.14)' : 'rgba(148, 163, 184, 0.14)',
                    },
                  }}
                >
                  {item.label}
                </Button>
              );
            })}

            <Button
              onClick={handleExploreMenuOpen}
              endIcon={<KeyboardArrowDownIcon />}
              sx={{
                textTransform: 'none',
                px: 1.4,
                py: 0.5,
                borderRadius: 2,
                fontWeight: 700,
                fontSize: '0.9rem',
                color: location.pathname === ROUTES.JOBS ? 'primary.main' : 'text.primary',
                bgcolor: location.pathname === ROUTES.JOBS ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                '&:hover': {
                  bgcolor: 'rgba(148, 163, 184, 0.14)',
                },
              }}
            >
              Explore
            </Button>
            <Menu
              anchorEl={exploreAnchor}
              open={Boolean(exploreAnchor)}
              onClose={handleExploreMenuClose}
              anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
              transformOrigin={{ horizontal: 'center', vertical: 'top' }}
              PaperProps={{
                sx: {
                  mt: 1,
                  minWidth: 320,
                  borderRadius: 2.5,
                  background: isDarkMode ? '#111827' : '#FFFFFF',
                  color: isDarkMode ? '#F8FAFC' : '#0F172A',
                  border: `1px solid ${isDarkMode ? '#334155' : '#E2E8F0'}`,
                  boxShadow: isDarkMode ? '0 18px 36px rgba(0, 0, 0, 0.5)' : '0 18px 36px rgba(15, 23, 42, 0.12)',
                  py: 0.6,
                },
              }}
            >
              <MenuItem disabled sx={{ opacity: 1, fontSize: '0.74rem', fontWeight: 800, color: '#64748B', letterSpacing: 0.8 }}>
                <ApartmentIcon sx={{ mr: 1, fontSize: 18 }} /> Posted Companies
              </MenuItem>
              {featuredCompanies.map((item) => (
                <MenuItem key={item.label} onClick={() => goToFeature(item.to)}>
                  {item.label}
                </MenuItem>
              ))}
              <Divider sx={{ my: 0.5 }} />
              <MenuItem disabled sx={{ opacity: 1, fontSize: '0.74rem', fontWeight: 800, color: '#64748B', letterSpacing: 0.8 }}>
                <TravelExploreIcon sx={{ mr: 1, fontSize: 18 }} /> Job Collections
              </MenuItem>
              {jobCollections.map((item) => (
                <MenuItem key={item.label} onClick={() => goToFeature(item.to)}>
                  {item.label}
                </MenuItem>
              ))}
            </Menu>
          </Box>

          <Box
            sx={{
              display: 'flex',
              gap: { xs: 'clamp(2px, 0.8vw, 4px)', sm: 0.85 },
              alignItems: 'center',
              justifyContent: 'flex-end',
              flexShrink: 0,
            }}
          >
            {showPremiumThemeToggle ? (
              <IconButton
                onClick={() => setThemeMode(isDarkMode ? 'light' : 'dark')}
                sx={{
                  bgcolor: isDarkMode ? 'rgba(250, 204, 21, 0.2)' : 'rgba(15, 23, 42, 0.08)',
                  color: isDarkMode ? '#FACC15' : '#0F172A',
                  border: `1px solid ${isDarkMode ? 'rgba(250, 204, 21, 0.35)' : 'rgba(15,23,42,0.16)'}`,
                  '&:hover': {
                    bgcolor: isDarkMode ? 'rgba(250, 204, 21, 0.28)' : 'rgba(15, 23, 42, 0.14)',
                  },
                }}
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            ) : null}
            <Menu
              anchorEl={mobileAnchor}
              open={Boolean(mobileAnchor)}
              onClose={handleMobileMenuClose}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            >
              {mobileNavItems.map((item) => (
                <MenuItem
                  key={item.label}
                  component={RouterLink}
                  to={item.to}
                  onClick={handleMobileMenuClose}
                >
                  {item.label}
                </MenuItem>
              ))}
              <Divider />
              <MenuItem disabled sx={{ opacity: 1, fontSize: '0.74rem', fontWeight: 800, color: '#64748B', letterSpacing: 0.8 }}>
                Posted Companies
              </MenuItem>
              {featuredCompanies.map((item) => (
                <MenuItem key={item.label} onClick={() => goToFeature(item.to)}>
                  {item.label}
                </MenuItem>
              ))}
              <Divider />
              <MenuItem disabled sx={{ opacity: 1, fontSize: '0.74rem', fontWeight: 800, color: '#64748B', letterSpacing: 0.8 }}>
                Collections & Tools
              </MenuItem>
              {jobCollections.map((item) => (
                <MenuItem key={item.label} onClick={() => goToFeature(item.to)}>
                  {item.label}
                </MenuItem>
              ))}
              {featureTools.map((item) => (
                <MenuItem key={item.label} onClick={() => goToFeature(item.to)}>
                  {item.label}
                </MenuItem>
              ))}
              {user ? (
                <>
                  <MenuItem
                    component={RouterLink}
                    to={dashboardRoute}
                    onClick={handleMobileMenuClose}
                  >
                    Dashboard
                  </MenuItem>
                  <MenuItem
                    component={RouterLink}
                    to={user?.role === USER_ROLES.RECRUITER ? ROUTES.RECRUITER_SUBSCRIPTION : ROUTES.PRICING}
                    onClick={handleMobileMenuClose}
                  >
                    Subscription
                  </MenuItem>
                  <MenuItem onClick={() => { handleMenuClose(); handleLogout(); }}>
                    Logout
                  </MenuItem>
                </>
              ) : null}
            </Menu>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                transform: { xs: 'scale(1)', sm: 'scale(0.9)', md: 'scale(1)' },
                transformOrigin: 'right center',
                mr: { sm: -0.3, md: 0 },
              }}
            >
              <InstallApp />
            </Box>
            {!user && (
              <MotionBox whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={handleRecruiterMenuOpen}
                  variant="outlined"
                  size="small"
                  startIcon={<WorkIcon sx={{ fontSize: { xs: 15, md: 18 }, display: { xs: 'none', sm: 'inline-flex' } }} />}
                  endIcon={<KeyboardArrowDownIcon sx={{ fontSize: { xs: 13, md: 18 }, display: { xs: 'none', sm: 'inline-flex' } }} />}
                  aria-haspopup="menu"
                  aria-expanded={Boolean(recruiterAnchor) ? 'true' : undefined}
                  aria-label="Recruiter"
                  title="Recruiter"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderColor: 'rgba(37, 99, 235, 0.32)',
                    color: '#1d4ed8',
                    px: { xs: 0, md: 1.5 },
                    py: { xs: 0, md: 0.72 },
                    width: { xs: 'clamp(40px, 11vw, 44px)', md: 'auto' },
                    height: { xs: 'clamp(40px, 11vw, 44px)', md: 'auto' },
                    minHeight: { xs: 'clamp(40px, 11vw, 44px)', md: 'auto' },
                    lineHeight: { xs: 1, md: 'inherit' },
                    minWidth: { xs: 'clamp(40px, 11vw, 44px)', md: 132 },
                    fontSize: { xs: '0.62rem', md: '0.86rem' },
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: { xs: 1.5, md: 999 },
                    bgcolor: { xs: '#FFFFFF', md: 'rgba(37, 99, 235, 0.05)' },
                    '& .MuiButton-startIcon': { mr: { xs: 0, md: 1 }, display: { xs: 'none', sm: 'inline-flex' } },
                    '&:hover': {
                      borderColor: '#2563EB',
                      background: 'rgba(59, 130, 246, 0.14)',
                    },
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'inline-flex', sm: 'none' } }}>
                    <WorkIcon sx={{ fontSize: 21 }} />
                  </Box>
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Hire Talent</Box>
                </Button>
                <Menu
                  anchorEl={recruiterAnchor}
                  open={Boolean(recruiterAnchor)}
                  onClose={handleRecruiterMenuClose}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                  slotProps={{ paper: { sx: { mt: 1, minWidth: 220, borderRadius: 2 } } }}
                >
                  <MenuItem
                    component={RouterLink}
                    to={`${ROUTES.LOGIN}?role=${USER_ROLES.RECRUITER}`}
                    onClick={handleRecruiterMenuClose}
                  >
                    🔐 Recruiter Sign In
                  </MenuItem>
                  <MenuItem
                    component={RouterLink}
                    to={ROUTES.RECRUITER_REGISTER}
                    onClick={handleRecruiterMenuClose}
                  >
                    ✨ Create Recruiter Account
                  </MenuItem>
                </Menu>
              </MotionBox>
            )}

            {!user ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 'clamp(2px, 0.8vw, 4px)', md: 1 }, flexShrink: 0 }}>
                <Button
                  component={RouterLink}
                  to={ROUTES.LOGIN}
                  variant="text"
                  aria-label="Login"
                  title="Login"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textTransform: 'none',
                    px: { xs: 0, md: 1.6 },
                    py: { xs: 0, md: 0.74 },
                    width: { xs: 'clamp(40px, 11vw, 44px)', md: 'auto' },
                    height: { xs: 'clamp(40px, 11vw, 44px)', md: 'auto' },
                    minHeight: { xs: 'clamp(40px, 11vw, 44px)', md: 'auto' },
                    lineHeight: { xs: 1, md: 'inherit' },
                    minWidth: { xs: 'clamp(40px, 11vw, 44px)', md: 64 },
                    fontSize: { xs: '0.62rem', md: '0.9rem' },
                    fontWeight: 700,
                    borderRadius: { xs: 1.5, md: 999 },
                    border: '1px solid rgba(37, 99, 235, 0.28)',
                    bgcolor: {
                      xs: isDarkMode ? '#1E40AF' : '#DBEAFE',
                      md: isDarkMode ? 'rgba(29, 78, 216, 0.22)' : 'rgba(219, 234, 254, 0.82)',
                    },
                    color: isDarkMode ? '#93C5FD' : '#2563EB',
                    '&:hover': {
                      bgcolor: isDarkMode ? 'rgba(29, 78, 216, 0.32)' : 'rgba(191, 219, 254, 0.95)',
                    },
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'inline-flex', md: 'none' } }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', height: 22 }}>
                      <PersonIcon sx={{ fontSize: 20 }} />
                      <ArrowForwardIcon sx={{ fontSize: 14, ml: -0.45 }} />
                    </Box>
                  </Box>
                  <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>Login</Box>
                </Button>
                <MotionBox whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    component={RouterLink}
                    to={ROUTES.SIGNUP}
                    variant="contained"
                    aria-label="Register"
                    title="Register"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textTransform: 'none',
                      px: { xs: 0, md: 2 },
                      py: { xs: 0, md: 0.82 },
                      width: { xs: 'clamp(40px, 11vw, 44px)', md: 'auto' },
                      height: { xs: 'clamp(40px, 11vw, 44px)', md: 'auto' },
                      minHeight: { xs: 'clamp(40px, 11vw, 44px)', md: 'auto' },
                      lineHeight: { xs: 1, md: 'inherit' },
                      minWidth: { xs: 'clamp(40px, 11vw, 44px)', md: 64 },
                      fontSize: { xs: '0.62rem', md: '0.9rem' },
                      fontWeight: 700,
                      borderRadius: { xs: 1.5, md: 999 },
                      background: 'linear-gradient(90deg, #0284c7, #2563eb)',
                      color: '#ffffff',
                      boxShadow: { xs: 'none', md: '0 10px 20px rgba(37, 99, 235, 0.24)' },
                      '&:hover': {
                        background: 'linear-gradient(90deg, #0369a1, #1d4ed8)',
                        color: '#ffffff',
                      },
                    }}
                  >
                    <Box component="span" sx={{ display: { xs: 'inline-flex', md: 'none' } }}>
                      <SignupIcon sx={{ fontSize: 21 }} />
                    </Box>
                    <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>Register</Box>
                  </Button>
                </MotionBox>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <IconButton
                  onClick={handleNotificationsClick}
                  aria-label="Notifications"
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    color: isDarkMode ? '#E2E8F0' : '#0F172A',
                    background: isDarkMode ? 'rgba(30, 41, 59, 0.82)' : 'rgba(248, 250, 252, 0.96)',
                    border: isDarkMode ? '1px solid rgba(148, 163, 184, 0.35)' : '1px solid rgba(148, 163, 184, 0.25)',
                    '&:hover': {
                      background: isDarkMode ? 'rgba(51, 65, 85, 0.86)' : 'rgba(241, 245, 249, 1)',
                    },
                  }}
                >
                  <Badge
                    badgeContent={notificationCount > 0 ? notificationCount : 0}
                    color="error"
                    overlap="circular"
                    invisible={notificationCount <= 0}
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: 10,
                        minWidth: 18,
                        height: 18,
                        padding: '0 4px',
                        borderRadius: 999,
                        fontWeight: 700,
                      },
                    }}
                  >
                    <NotificationsIcon fontSize="small" />
                  </Badge>
                </IconButton>
                <Menu
                  anchorEl={notificationAnchor}
                  open={Boolean(notificationAnchor)}
                  onClose={handleNotificationsClose}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  slotProps={{ paper: { sx: { mt: 1, width: 330, maxWidth: 'calc(100vw - 24px)', borderRadius: 2, boxShadow: '0 14px 35px rgba(15,23,42,0.16)', overflow: 'hidden' } } }}
                >
                  <Box sx={{ px: 2, py: 1.4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0' }}>
                    <Typography sx={{ fontWeight: 800, color: '#0F172A', fontSize: 14 }}>Notifications</Typography>
                    {notificationCount > 0 && <Typography sx={{ color: '#2563EB', fontWeight: 700, fontSize: 11 }}>{notificationCount} unread</Typography>}
                  </Box>
                  {notificationsLoading ? (
                    <MenuItem disabled sx={{ py: 2, fontSize: 13 }}>Loading notifications...</MenuItem>
                  ) : notifications.length === 0 ? (
                    <MenuItem disabled sx={{ py: 2, fontSize: 13, whiteSpace: 'normal' }}>No new notifications</MenuItem>
                  ) : (
                    notifications.slice(0, 5).map((notification) => (
                      <MenuItem key={notification.id} onClick={handleNotificationsClose} sx={{ display: 'block', px: 2, py: 1.2, whiteSpace: 'normal', borderBottom: '1px solid #F1F5F9' }}>
                        <Typography sx={{ color: '#0F172A', fontWeight: 750, fontSize: 12.5, lineHeight: 1.35 }}>{notification.title || 'Notification'}</Typography>
                        <Typography sx={{ color: '#64748B', fontSize: 11.5, mt: 0.35, lineHeight: 1.35 }}>{notification.message}</Typography>
                        <Typography sx={{ color: '#94A3B8', fontSize: 10.5, mt: 0.45 }}>{formatDate(notification.created_at || notification.createdAt || new Date().toISOString())}</Typography>
                      </MenuItem>
                    ))
                  )}
                  <MenuItem
                    onClick={() => {
                      handleNotificationsClose();
                      navigate(ROUTES.DASHBOARD_NOTIFICATIONS);
                    }}
                    sx={{ justifyContent: 'center', color: '#2563EB', fontWeight: 800, fontSize: 12.5, py: 1.2 }}
                  >
                    View all notifications
                  </MenuItem>
                </Menu>
                <button
                  className="navbar-premium-btn"
                  onClick={() => navigate(user?.role === USER_ROLES.RECRUITER ? ROUTES.RECRUITER_SUBSCRIPTION : ROUTES.PRICING)}
                  type="button"
                >
                  <img src="/crown.png" alt="Premium" className="navbar-premium-icon" />
                </button>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton
                  onClick={handleMenuOpen}
                  size="small"
                  sx={{
                    position: 'relative',
                    '&::after': isRecruiter
                      ? {
                          content: '""',
                          position: 'absolute',
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #FACC15, #F59E0B)',
                          border: '2px solid #ffffff',
                          right: 0,
                          top: 0,
                          boxShadow: '0 0 0 4px rgba(251, 191, 36, 0.15)',
                        }
                      : {},
                  }}
                >
                  <Avatar
                    src={isRecruiter ? (recruiterAvatar || user.avatar) : user.avatar}
                    sx={{
                      width: 38,
                      height: 38,
                      background: '#1D4ED8',
                      border: '2px solid #DBEAFE',
                      color: '#FFFFFF',
                    }}
                  >
                    {generateInitials(user.name)}
                  </Avatar>
                </IconButton>
                </Box>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  PaperProps={{
                    sx: {
                      background: isDarkMode ? '#111827' : '#FFFFFF',
                      color: isDarkMode ? '#F8FAFC' : '#10233F',
                      border: `1px solid ${isDarkMode ? '#334155' : '#E5EAF0'}`,
                      borderRadius: 2,
                      boxShadow: isDarkMode ? '0 18px 40px rgba(0, 0, 0, 0.55)' : '0 12px 35px rgba(15,23,42,0.12)',
                      minWidth: isRecruiter ? 200 : 310,
                      overflow: 'hidden',
                      mt: 1,
                          '& .MuiDivider-root': { borderColor: isDarkMode ? '#334155' : undefined },
                          '& .MuiMenuItem-root:hover': { backgroundColor: isDarkMode ? 'rgba(148, 163, 184, 0.14)' : undefined },
                    },
                  }}
                >
                  {!isRecruiter && (
                    <>
                      <Box
                        sx={{
                          height: 96,
                          position: 'relative',
                          backgroundImage: "linear-gradient(90deg, rgba(5,22,42,0.92), rgba(7,29,53,0.45)), url('/images/career-hero.png')",
                          backgroundSize: 'cover',
                          backgroundPosition: 'center 60%',
                        }}
                      >
                        <Box sx={{ position: 'absolute', left: 18, bottom: 14, width: 38, height: 2, bgcolor: '#D6A73A' }} />
                      </Box>
                      <Box sx={{ px: 2, pb: 1.5, pt: 0, position: 'relative' }}>
                        <Avatar
                          src={(user as any)?.avatar_url || (user as any)?.avatar || (user as any)?.user_metadata?.avatar_url || undefined}
                          sx={{ width: 54, height: 54, mt: -3.25, mb: 0.8, bgcolor: '#F0C75E', border: '3px solid #FFFFFF', fontWeight: 800 }}
                        >
                          {generateInitials(user.name)}
                        </Avatar>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#10233F', lineHeight: 1.2 }}>
                          {user.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>
                          {(user as any)?.current_designation || (user as any)?.designation || 'Career professional'}
                        </Typography>
                      </Box>
                    </>
                  )}
                  {isRecruiter && (
                    <Box sx={{ px: 2, py: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {user.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {user.email}
                      </Typography>
                    </Box>
                  )}
                  <Divider sx={{ borderColor: 'divider' }} />
                  <MenuItem
                    component={RouterLink}
                    to={dashboardRoute}
                    onClick={handleMenuClose}
                  >
                    <DashboardIcon sx={{ mr: 1.5, fontSize: 20 }} /> Dashboard
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      handleMenuClose();
                      if (isRecruiter) {
                        navigate(ROUTES.RECRUITER_DASHBOARD, { state: { tab: 'my-details' } });
                        return;
                      }
                      navigate(ROUTES.DASHBOARD_PROFILE);
                    }}
                  >
                    <PersonIcon sx={{ mr: 1.5, fontSize: 20 }} /> My Profile
                  </MenuItem>
                  <MenuItem
                    component={RouterLink}
                    to={isRecruiter ? ROUTES.RECRUITER_DASHBOARD : ROUTES.DASHBOARD_SETTINGS}
                    onClick={handleMenuClose}
                  >
                    <SettingsIcon sx={{ mr: 1.5, fontSize: 20 }} /> Settings
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      handleMenuClose();
                      setSupportOpen(true);
                    }}
                  >
                    <HeadsetMicIcon sx={{ mr: 1.5, fontSize: 20 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      Customer Care
                      {ticketNotifCount > 0 ? (
                        <Box component="span" sx={{ bgcolor: '#2563EB', color: '#FFFFFF', borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{ticketNotifCount}</Box>
                      ) : null}
                    </Box>
                  </MenuItem>
                  <Divider sx={{ borderColor: 'divider' }} />
                  <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                    <ExitToAppIcon sx={{ mr: 1.5, fontSize: 20 }} /> Logout
                  </MenuItem>
                </Menu>

                <SupportWidget
                  audience={isRecruiter ? 'recruiter' : 'candidate'}
                  showFab={false}
                  open={supportOpen}
                  onClose={() => setSupportOpen(false)}
                />
              </Box>
            )}
            {location.pathname === ROUTES.HOME && (
              <IconButton
                onClick={handleMobileMenuOpen}
                aria-label="Menu"
                title="Menu"
                sx={{
                  display: { xs: 'inline-flex', md: 'none' },
                  width: { xs: 'clamp(40px, 11vw, 44px)', md: 'auto' },
                  height: { xs: 'clamp(40px, 11vw, 44px)', md: 'auto' },
                  minWidth: { xs: 'clamp(40px, 11vw, 44px)', md: 'auto' },
                  minHeight: { xs: 'clamp(40px, 11vw, 44px)', md: 'auto' },
                  p: { xs: 0, md: 1 },
                  borderRadius: { xs: 1.5, md: 2 },
                  color: { xs: '#0F172A', md: isDarkMode ? '#E2E8F0' : '#0F172A' },
                  bgcolor: { xs: '#FFFFFF', md: isDarkMode ? 'rgba(30, 41, 59, 0.65)' : 'rgba(248, 250, 252, 0.96)' },
                  border: isDarkMode ? '1px solid rgba(100, 116, 139, 0.45)' : '1px solid rgba(148, 163, 184, 0.35)',
                  '&:hover': {
                    bgcolor: isDarkMode ? 'rgba(51, 65, 85, 0.78)' : 'rgba(241, 245, 249, 1)',
                  },
                }}
              >
                <MenuIcon sx={{ fontSize: { xs: 22, md: 24 } }} />
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};
