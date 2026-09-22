import React, { useState } from 'react';
import {
  Box,
  Container,
  Card,
  TextField,
  Button,
  Typography,
  Link,
  Divider,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon } from '@mui/icons-material';
import { Layout } from '@components/layout/Layout';
import { useAuthStore } from '@store/index';
import { authService } from '@services/supabase';
import { userService } from '@services/api';
import type { Recruiter } from '@types';
import { ROUTES, USER_ROLES } from '@constants/index';
import { validateEmail } from '@utils/index';
import toast from 'react-hot-toast';
import '../../styles/loginGoogleButton.css';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, setLoading, setError } = useAuthStore();
  const isCandidateLogin = searchParams.get('role') !== USER_ROLES.RECRUITER;
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoadingState] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoadingState(true);
    setLoading(true);

    try {
      const response = await authService.signIn(formData.email, formData.password);

      if (response.user) {
        if (!response.user.email_confirmed_at) {
          navigate(`${ROUTES.VERIFY_EMAIL}?email=${encodeURIComponent(response.user.email || formData.email)}`);
          return;
        }
        // Try to load profile from our profiles table to get authoritative role
        let profile: any = null;
        try {
          profile = await userService.getProfile(response.user.id);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('Failed to load profile after login', err);
        }
        const roleFromProfile = profile?.role;
        const roleFromAuth = response.user.user_metadata?.role;
        const finalRole = roleFromProfile || roleFromAuth || 'job_seeker';

        if (!profile && finalRole === 'recruiter') {
          try {
            await userService.ensureRecruiterProfile(response.user.id, {
              name: response.user.user_metadata?.name || 'Recruiter',
              email: response.user.email,
            } as Partial<Recruiter> & Record<string, unknown>);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Failed to ensure recruiter profile on login', err);
          }
        }

        setUser({
          id: response.user.id,
          email: response.user.email || formData.email,
          name: profile?.name || response.user.user_metadata?.name || 'User',
          role: finalRole,
          createdAt: profile?.created_at || new Date().toISOString(),
          updatedAt: profile?.updated_at || new Date().toISOString(),
          emailVerified: true,
        });

        toast.success('Login successful!');

        // Route based on role
        if (finalRole === 'admin') {
          navigate(ROUTES.ADMIN_DASHBOARD);
        } else if (finalRole === 'recruiter') {
          navigate(ROUTES.RECRUITER_DASHBOARD);
        } else {
          navigate(ROUTES.DASHBOARD);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error && /confirm|verified/i.test(error.message)
        ? 'Please verify your email before logging in.'
        : 'Login failed. Please check your email and password and try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoadingState(false);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoadingState(true);
    try {
      await authService.signInWithGoogle(isCandidateLogin ? 'candidate' : 'recruiter');
      toast.success('Logged in with Google');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Google login failed';
      toast.error(errorMessage);
    } finally {
      setLoadingState(false);
    }
  };

  return (
    <Layout footer={false}>
      <Box
        sx={{
          height: '100%',
          minHeight: { xs: 'calc(100dvh - 145px)', sm: 'calc(100dvh - 80px)' },
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          py: { xs: 1, lg: 2 },
        }}
      >
        <Box
          component="video"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
          src={isCandidateLogin
            ? 'https://ydvnozzigjihcachxnah.supabase.co/storage/v1/object/sign/website%20public/login.mp4?token=eyJraWQiOiJjNjk4MjVmYS1iN2I5LTQ5OWItODBjMi1hZjRkNTQ4ZWQ3YjIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ3ZWJzaXRlIHB1YmxpYy9sb2dpbi5tcDQiLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzg5ODgyODEwLCJleHAiOjIxMDUyNDI4MTB9.M_q3TjQ7kNDQY6j95WQBGyH6DZCDaBp01w2ZAgX8Lvo'
            : 'https://ydvnozzigjihcachxnah.supabase.co/storage/v1/object/sign/website%20public/login2.mp4?token=eyJraWQiOiJjNjk4MjVmYS1iN2I5LTQ5OWItODBjMi1hZjRkNTQ4ZWQ3YjIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ3ZWJzaXRlIHB1YmxpYy9sb2dpbjIubXA0Iiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4OTkwNjk4NCwiZXhwIjoyMTA1MjY2OTg0fQ.fi62OqB0PblOq314Ycp4pSLcqFoWydFdxo_1Wq8UBvI'}
          sx={{
            position: 'fixed',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
          }}
        />
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            background: 'linear-gradient(90deg, rgba(2, 6, 23, 0.06), rgba(2, 6, 23, 0.02)), linear-gradient(180deg, rgba(2, 6, 23, 0.02), rgba(2, 6, 23, 0.06))',
          }}
        />
        <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1, px: { xs: 1, lg: 0 }, maxWidth: { xs: 360, lg: 500 } }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card
              sx={{
                p: { xs: 1.5, lg: 3.25 },
                borderRadius: { xs: 3, lg: 4 },
                border: '1px solid rgba(255, 255, 255, 0.82)',
                boxShadow: '0 28px 80px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(96, 165, 250, 0.2)',
                backdropFilter: 'blur(18px)',
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(145deg, rgba(255,255,255,0.94), rgba(239,246,255,0.86))',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(circle at top right, rgba(14,165,233,0.2), transparent 32%), radial-gradient(circle at bottom left, rgba(236,72,153,0.16), transparent 30%)',
                  pointerEvents: 'none',
                }}
              />
              <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', mb: { xs: 1.25, lg: 2.5 } }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 850,
                    fontSize: { xs: '1.35rem', lg: '1.95rem' },
                    letterSpacing: '-0.02em',
                    mb: 0.75,
                    background: 'linear-gradient(135deg, #0F172A 0%, #2563EB 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Welcome Back
                </Typography>
                <Typography variant="body2" sx={{ color: '#475569', mb: 0.35, fontSize: { xs: '0.75rem', lg: '0.875rem' } }}>
                  {isCandidateLogin
                    ? 'Securely access your dashboard and discover premium opportunities.'
                    : 'Securely access your recruiter dashboard and manage your hiring workflow.'}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#475569',
                    whiteSpace: 'nowrap',
                    fontSize: { xs: '0.65rem', lg: '0.875rem' },
                  }}
                >
                  {isCandidateLogin
                    ? 'Premium jobs, smart matching, and lightning-fast applications.'
                    : 'Post jobs, review candidates, and connect with top talent.'}
                </Typography>
              </Box>

              <form onSubmit={handleLogin}>
                <TextField
                  fullWidth
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={!!errors.email}
                  helperText={errors.email}
                  size="small"
                  sx={{
                    mb: { xs: 1, lg: 1.75 },
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: 'rgba(239,246,255,0.78)',
                      '& fieldset': { borderColor: 'rgba(37,99,235,0.18)' },
                      '&:hover fieldset': { borderColor: 'rgba(37,99,235,0.42)' },
                      '&.Mui-focused fieldset': { borderColor: '#2563EB' },
                    },
                    '& .MuiInputBase-input': {
                      fontSize: { xs: '0.82rem', lg: '1rem' },
                      py: { xs: 0.9, lg: 1 },
                    },
                    '& .MuiInputLabel-root': { fontSize: { xs: '0.78rem', lg: '1rem' } },
                  }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  error={!!errors.password}
                  helperText={errors.password}
                  size="small"
                  sx={{
                    mb: { xs: 0.75, lg: 1 },
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: 'rgba(239,246,255,0.78)',
                      '& fieldset': { borderColor: 'rgba(37,99,235,0.18)' },
                      '&:hover fieldset': { borderColor: 'rgba(37,99,235,0.42)' },
                      '&.Mui-focused fieldset': { borderColor: '#2563EB' },
                    },
                    '& .MuiInputBase-input': {
                      fontSize: { xs: '0.82rem', lg: '1rem' },
                      py: { xs: 0.9, lg: 1 },
                    },
                    '& .MuiInputLabel-root': { fontSize: { xs: '0.78rem', lg: '1rem' } },
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPassword((visible) => !visible)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Link
                  component={RouterLink}
                  to={ROUTES.FORGOT_PASSWORD}
                  sx={{ fontSize: { xs: '0.7rem', lg: '0.8rem' }, display: 'block', mb: { xs: 1.25, lg: 2 }, color: '#1D4ED8', fontWeight: 600 }}
                >
                  Forgot Password?
                </Link>

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading}
                  sx={{
                    py: { xs: 0.85, lg: 1.25 },
                    mb: { xs: 1, lg: 1.5 },
                    borderRadius: 2,
                    fontWeight: 800,
                    textTransform: 'none',
                    fontSize: { xs: '0.82rem', lg: '0.98rem' },
                    background: 'linear-gradient(135deg, #2563EB 0%, #0EA5E9 55%, #7C3AED 100%)',
                    boxShadow: '0 14px 30px rgba(37, 99, 235, 0.28)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #1D4ED8 0%, #0284C7 55%, #6D28D9 100%)',
                    },
                  }}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
              </form>

              {isCandidateLogin && (
                <>
                  <Divider sx={{ my: { xs: 1.25, lg: 2 }, color: '#64748B', fontSize: { xs: '0.8rem', lg: '1rem' }, '&::before, &::after': { borderColor: 'rgba(100,116,139,0.28)' } }}>OR</Divider>

                  <button
                    type="button"
                    className="login-google-button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    aria-label="Continue with Google"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" viewBox="0 0 256 262" className="login-google-svg" aria-hidden="true">
                      <path fill="#4285F4" d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" className="login-google-blue"></path>
                      <path fill="#34A853" d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" className="login-google-green"></path>
                      <path fill="#FBBC05" d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" className="login-google-yellow"></path>
                      <path fill="#EB4335" d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" className="login-google-red"></path>
                    </svg>
                    <span className="login-google-text">Continue with Google</span>
                  </button>
                </>
              )}

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Don't have an account?{' '}
                  <Link component={RouterLink} to={ROUTES.SIGNUP}>
                    Sign Up
                  </Link>
                </Typography>
              </Box>
            </Card>
          </motion.div>
        </Container>
      </Box>
    </Layout>
  );
};
