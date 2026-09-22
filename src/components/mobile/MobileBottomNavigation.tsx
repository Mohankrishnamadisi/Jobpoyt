import React from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import {
  Work as JobsIcon,
  Home as HomeIcon,
  MoreHoriz as MoreIcon,
  Person as ProfileIcon,
  School as LearnIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@constants/index';
import { useAuthStore } from '@store/index';
import { recruiterService } from '@services/api';

interface NavItem {
  label: string;
  icon: typeof HomeIcon;
  to?: string;
  action?: () => void;
  disabled?: boolean;
}

export const MobileBottomNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [recruiterProfileCompletion, setRecruiterProfileCompletion] = React.useState(0);

  React.useEffect(() => {
    if (user?.role !== 'recruiter' || !user.id) {
      setRecruiterProfileCompletion(0);
      return;
    }

    let active = true;
    recruiterService.getRecruiterProfile(user.id).then((profile) => {
      if (!active) return;
      const fields = [
        profile?.company_name,
        profile?.company_email,
        profile?.company_phone,
        profile?.company_website,
        profile?.company_address || profile?.location,
        profile?.industry,
        profile?.description,
        profile?.gst_number,
        profile?.hr_name,
        profile?.hr_email,
        profile?.hr_phone,
      ];
      setRecruiterProfileCompletion(
        Math.round((fields.filter((field) => String(field || '').trim().length > 0).length / fields.length) * 100)
      );
    }).catch(() => {
      if (active) setRecruiterProfileCompletion(0);
    });

    return () => {
      active = false;
    };
  }, [location.pathname, user?.id, user?.role]);

  const navItems: NavItem[] = user?.role === 'recruiter'
    ? [
        { label: 'Home', icon: HomeIcon, to: ROUTES.HOME },
        { label: 'Dashboard', icon: DashboardIcon, to: ROUTES.RECRUITER_DASHBOARD },
        {
          label: 'Post a Job',
          icon: JobsIcon,
          disabled: recruiterProfileCompletion < 80,
          action: () => navigate(ROUTES.RECRUITER_DASHBOARD, { state: { openPostJob: true } }),
        },
        { label: 'My Profile', icon: ProfileIcon, action: () => navigate(ROUTES.RECRUITER_DASHBOARD, { state: { tab: 'company-profile' } }) },
      ]
    : [
        { label: 'Home', icon: HomeIcon, to: ROUTES.HOME },
        { label: 'Jobs', icon: JobsIcon, to: ROUTES.JOBS },
        { label: 'Learn', icon: LearnIcon, to: ROUTES.DASHBOARD_LEARNING },
        { label: 'Profile', icon: ProfileIcon, to: user ? ROUTES.DASHBOARD_PROFILE : ROUTES.LOGIN },
        { label: 'Dashboard', icon: DashboardIcon, to: user ? ROUTES.DASHBOARD : ROUTES.LOGIN },
      ];

  const isActive = (item: NavItem) => {
    if (item.to === ROUTES.HOME) {
      return location.pathname === ROUTES.HOME || location.pathname === '/';
    }

    return item.to ? location.pathname.startsWith(item.to) || location.pathname === item.to : false;
  };

  return (
    <Box
      component="nav"
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
        px: 1,
        pb: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
        minHeight: 'calc(var(--jobpoyt-bottom-nav-height) + env(safe-area-inset-bottom, 0px))',
        boxSizing: 'border-box',
        pt: 0.5,
        background: 'rgba(255,255,255,0.95)',
        borderTop: '1px solid',
        borderColor: 'divider',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: '0px -12px 28px rgba(15, 23, 42, 0.08)',
      }}
    >
      <Stack
        direction="row"
        alignItems="stretch"
        justifyContent="space-between"
        spacing={0.5}
        sx={{ width: '100%' }}
      >
        {navItems.map(({ label, icon: Icon, to, action, disabled }) => {
          const active = isActive({ label, icon: Icon, to });

          return (
            <Box key={label} sx={{ flex: 1 }}>
              <IconButton
                onClick={(event) => {
                  if (label === 'More') {
                    window.dispatchEvent(new CustomEvent('jobpoyt:open-mobile-menu', { detail: event.currentTarget }));
                    return;
                  }
                  if (disabled) return;
                  action ? action() : navigate(to!);
                }}
                disabled={disabled}
                sx={{
                  width: '100%',
                  minHeight: 52,
                  borderRadius: 2,
                  color: disabled ? 'text.disabled' : active ? 'primary.main' : 'text.secondary',
                  bgcolor: active ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                  px: 0.5,
                  py: 0.75,
                  '&:hover': {
                    bgcolor: disabled ? 'transparent' : active ? 'rgba(37, 99, 235, 0.12)' : 'rgba(15, 23, 42, 0.04)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                  <Icon fontSize="small" />
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: 11,
                      fontWeight: active ? 700 : 500,
                      lineHeight: 1.2,
                    }}
                  >
                    {label}
                  </Typography>
                </Box>
              </IconButton>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};
