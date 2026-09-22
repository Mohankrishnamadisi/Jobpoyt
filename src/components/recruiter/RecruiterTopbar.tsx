import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  IconButton,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  AccountCircle as AccountCircleIcon,
  Notifications as NotificationsIcon,
  Chat as ChatIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  Logout as LogoutIcon,
  CreditScore as CreditScoreIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { themeColors } from '@styles/recruiterTheme';
import { useAuthStore } from '@store/index';
import { authService } from '@services/supabase';
import { ROUTES } from '@constants/index';
import { supportService } from '@services/support';

interface RecruiterTopbarProps {
  recruiterLogo?: string;
  companyName?: string;
  notificationCount?: number;
  unreadMessagesCount?: number;
  credits?: number;
  planName?: string;
  onNotificationsClick?: () => void;
  onMessagesClick?: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onCustomerCareClick?: () => void;
}

const MotionBox = motion(Box);

export const RecruiterTopbar: React.FC<RecruiterTopbarProps> = ({
  recruiterLogo,
  companyName = 'Jobpoyt',
  notificationCount = 0,
  unreadMessagesCount = 0,
  credits = 0,
  planName = 'Free',
  onNotificationsClick,
  onMessagesClick,
  onProfileClick,
  onSettingsClick,
  onCustomerCareClick,
}) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [ticketNotifCount, setTicketNotifCount] = React.useState(0);

  React.useEffect(() => {
    if (!user?.id) return;
    supportService.getUnseenAdminResponseCount(user.id).then(setTicketNotifCount).catch(() => {});
  }, [user?.id]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignout = async () => {
    handleMenuClose();
    try {
      await authService.signOut();
    } catch {
      // noop
    } finally {
      logout();
      navigate(ROUTES.LOGIN, { replace: true });
    }
  };

  return (
    <>
      <AppBar
        className="recruiter-topbar"
        position="sticky"
        elevation={0}
        sx={{
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(18px)',
          borderBottom: '1px solid rgba(148,163,184,0.18)',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: { xs: 1.5, md: 3 },
            py: 1.15,
            minHeight: 'auto',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1, minWidth: 0 }}>
            <MotionBox
              component="button"
              type="button"
              onClick={() => navigate('/')}
              aria-label="Go to home"
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              sx={{
                width: 38,
                height: 38,
                flexShrink: 0,
                borderRadius: 1.8,
                display: 'grid',
                placeItems: 'center',
                border: '1px solid rgba(91,140,255,0.28)',
                overflow: 'hidden',
                p: 0,
                cursor: 'pointer',
                bgcolor: '#FFFFFF',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 24px rgba(91,140,255,0.22)' },
                background: 'linear-gradient(135deg, #5B8CFF 0%, #8B5CF6 100%)',
                boxShadow: '0 10px 24px rgba(91,140,255,0.26)',
              }}
            >
              <Avatar src={recruiterLogo} alt={`${companyName} logo`} sx={{ width: '100%', height: '100%', bgcolor: 'transparent', color: '#FFFFFF', fontWeight: 900, fontSize: 14 }}>
                {companyName.charAt(0).toUpperCase()}
              </Avatar>
            </MotionBox>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                color: themeColors.text.primary,
                fontSize: '1rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {companyName} - {' '}
              Dashboard
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {!isMobile && (
              <Chip
                label={planName}
                variant="filled"
                size="small"
                sx={{
                  background: 'linear-gradient(135deg, #5B8CFF 0%, #8B5CF6 100%)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  px: 1.1,
                  boxShadow: '0 10px 24px rgba(91,140,255,0.18)',
                }}
              />
            )}

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <IconButton
                onClick={() => navigate('/')}
                aria-label="Go to home"
                sx={{
                  color: themeColors.text.secondary,
                  border: '1px solid rgba(148,163,184,0.18)',
                  bgcolor: '#FFFFFF',
                  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)',
                  '&:hover': { color: '#4F8CFF', bgcolor: 'rgba(91,140,255,0.06)' },
                }}
              >
                <HomeIcon sx={{ fontSize: '1.25rem' }} />
              </IconButton>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <IconButton
                onClick={onNotificationsClick}
                sx={{
                  color: themeColors.text.secondary,
                  border: '1px solid rgba(148,163,184,0.18)',
                  bgcolor: '#FFFFFF',
                  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)',
                  '&:hover': { color: '#4F8CFF', bgcolor: 'rgba(91,140,255,0.06)' },
                }}
              >
                <Badge badgeContent={notificationCount} color="error">
                  <NotificationsIcon sx={{ fontSize: '1.25rem' }} />
                </Badge>
              </IconButton>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <IconButton
                onClick={onMessagesClick}
                sx={{
                  color: themeColors.text.secondary,
                  border: '1px solid rgba(148,163,184,0.18)',
                  bgcolor: '#FFFFFF',
                  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)',
                  '&:hover': { color: '#8B5CF6', bgcolor: 'rgba(139,92,246,0.06)' },
                }}
              >
                <Badge badgeContent={unreadMessagesCount} color="error">
                  <ChatIcon sx={{ fontSize: '1.25rem' }} />
                </Badge>
              </IconButton>
            </motion.div>

            {!isMobile && (
              <IconButton
                sx={{
                  color: themeColors.text.secondary,
                  border: '1px solid rgba(148,163,184,0.18)',
                  bgcolor: '#fff',
                  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)',
                  '&:hover': { color: '#0F172A', bgcolor: 'rgba(15,23,42,0.02)' },
                }}
              >
                <HelpIcon sx={{ fontSize: '1.25rem' }} />
              </IconButton>
            )}

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <IconButton
                onClick={handleMenuOpen}
                sx={{
                  p: 0,
                  ml: 1,
                }}
              >
                <Avatar
                  src={recruiterLogo || user?.avatar}
                  sx={{
                    width: 38,
                    height: 38,
                    background: 'linear-gradient(135deg, #5B8CFF 0%, #8B5CF6 100%)',
                    fontWeight: 800,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    border: '2px solid rgba(91,140,255,0.26)',
                    boxShadow: '0 14px 28px rgba(91,140,255,0.24)',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      borderColor: '#8B5CF6',
                    },
                  }}
                >
                  {user?.name?.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </motion.div>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Profile Menu Dropdown */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            borderRadius: '12px',
            border: `1px solid ${themeColors.border}`,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          },
        }}
      >
        <MenuItem
          sx={{
            py: 1.5,
            px: 2,
            '&:hover': { backgroundColor: themeColors.hover },
          }}
        >
          <Box>
            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: themeColors.text.tertiary }}>
              Signed in as
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {user?.name || 'User'}
            </Typography>
          </Box>
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleMenuClose();
            onProfileClick?.();
          }}
          sx={{ '&:hover': { backgroundColor: themeColors.hover } }}
        >
          <AccountCircleIcon sx={{ mr: 1.5, fontSize: '1.1rem' }} />
          My Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleMenuClose();
            onSettingsClick?.();
          }}
          sx={{ '&:hover': { backgroundColor: themeColors.hover } }}
        >
          <SettingsIcon sx={{ mr: 1.5, fontSize: '1.1rem' }} />
          Settings
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleMenuClose();
            onCustomerCareClick?.();
          }}
          sx={{ '&:hover': { backgroundColor: themeColors.hover } }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HelpIcon sx={{ fontSize: '1.1rem' }} />
            Customer Care
            {ticketNotifCount > 0 ? (
              <Box component="span" sx={{ bgcolor: '#EF4444', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, ml: 0.5 }}>{ticketNotifCount}</Box>
            ) : null}
          </Box>
        </MenuItem>
        <MenuItem onClick={handleSignout} sx={{ color: 'error.main', '&:hover': { backgroundColor: themeColors.hover } }}>
          <LogoutIcon sx={{ mr: 1.5, fontSize: '1.1rem' }} />
          Sign out
        </MenuItem>
      </Menu>
    </>
  );
};
