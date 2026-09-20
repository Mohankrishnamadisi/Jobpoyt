import React, { useEffect } from 'react';
import { CircularProgress, Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { authService, supabase } from '@services/supabase';
import { userService } from '@services/api';
import { useAuthStore } from '@store/index';
import { ROUTES, USER_ROLES } from '@constants/index';

const restoreSessionFromHashToken = async () => {
  const fullHash = window.location.hash || '';
  const secondHashIndex = fullHash.indexOf('#', 1);
  const tokenFragment = secondHashIndex >= 0
    ? fullHash.slice(secondHashIndex + 1)
    : fullHash.replace(/^#/, '');
  const params = new URLSearchParams(tokenFragment);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (!accessToken || !refreshToken) {
    return;
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw error;
  }
};

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  useEffect(() => {
    (async () => {
      try {
        await restoreSessionFromHashToken();
        const session = await authService.getSession();
        const user = (session as any)?.user;
        if (!user) {
          navigate(ROUTES.LOGIN);
          return;
        }

        const userId = user.id;
        const role = user.user_metadata?.role || USER_ROLES.JOB_SEEKER;

        if (role === USER_ROLES.RECRUITER) {
          await authService.signOut();
          throw new Error('Recruiter accounts cannot sign in with Google.');
        }

        if (!user.email_confirmed_at) {
          navigate(`${ROUTES.VERIFY_EMAIL}?email=${encodeURIComponent(user.email || '')}`);
          return;
        }

        // The database trigger creates the base profile. Complete candidate fields only after verification.
        // Job seeker
        const profile = await userService.getProfile(userId);
        const candidateProfile = user.user_metadata?.candidateProfile;
        if (candidateProfile && typeof candidateProfile === 'object') {
          await userService.updateProfile(userId, candidateProfile as Record<string, unknown>);
        }
        const finalProfile = candidateProfile && typeof candidateProfile === 'object' ? { ...profile, ...candidateProfile } : profile;
        setUser({ id: userId, email: user.email || '', name: finalProfile?.name || user.user_metadata?.name || 'User', role: USER_ROLES.JOB_SEEKER, createdAt: finalProfile?.created_at || user.created_at || new Date().toISOString(), updatedAt: finalProfile?.updated_at || user.updated_at || new Date().toISOString(), emailVerified: true });
        navigate(`${ROUTES.VERIFY_EMAIL}?verified=1`);
      } catch (err) {
        console.error('OAuth callback handling failed:', err);
        navigate(ROUTES.LOGIN);
      }
    })();
  }, [navigate, setUser]);

  return (
    <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
      <CircularProgress />
      <Typography>Finalizing sign in... Redirecting shortly.</Typography>
    </Box>
  );
};

export default AuthCallback;
