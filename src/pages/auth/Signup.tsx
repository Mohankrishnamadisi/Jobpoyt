import React, { useState } from 'react';
import { Alert, Box, Button, Card, Container, IconButton, InputAdornment, Link, Snackbar, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowForward, CheckCircle, Visibility, VisibilityOff } from '@mui/icons-material';
import { Layout } from '@components/layout/Layout';
import { useAuthStore } from '@store/index';
import { authService } from '@services/supabase';
import { ROUTES, USER_ROLES } from '@constants/index';
import { validateEmail, validatePassword, validatePhone } from '@utils/index';

const SIGNUP_VIDEO_URL = 'https://ydvnozzigjihcachxnah.supabase.co/storage/v1/object/sign/website%20public/singup.mp4?token=eyJraWQiOiJjNjk4MjVmYS1iN2I5LTQ5OWItODBjMi1hZjRkNTQ4ZWQ3YjIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ3ZWJzaXRlIHB1YmxpYy9zaW5ndXAubXA0Iiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4OTg0NjY2OCwiZXhwIjoyMTA1MjA2NjY4fQ.34VwgNA90yUBx1OhyUtmDU7ryzyhcGfh46CKCo05CcY';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { setLoading } = useAuthStore();
  const [loading, setLoadingState] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [existingAccount, setExistingAccount] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) return 'Please enter your first name and last name.';
    if (!validateEmail(formData.email)) return 'Please enter a valid email address.';
    if (!validatePhone(formData.phone)) return 'Please enter a valid 10-digit mobile number.';
    if (!validatePassword(formData.password)) return 'Password must contain at least 8 characters, uppercase, lowercase, and a number.';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match.';
    return '';
  };

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationMessage = validateForm();
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
    setLoadingState(true);
    setLoading(true);
    try {
      const response = await authService.signUp(formData.email, formData.password, {
        name: fullName,
        role: USER_ROLES.JOB_SEEKER,
        candidateProfile: { name: fullName, email: formData.email, phone: formData.phone },
      });
      if (response.user) {
        localStorage.setItem('jobpoyt_pending_verification_email', formData.email);
        navigate(`${ROUTES.VERIFY_EMAIL}?email=${encodeURIComponent(formData.email)}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';
      if (/already/i.test(errorMessage)) setExistingAccount(true);
      else setMessage('We could not complete registration. Please check your details and try again.');
    } finally {
      setLoadingState(false);
      setLoading(false);
    }
  };

  return (
    <Layout footer={false}>
      <Box sx={{ height: { xs: 'calc(100dvh - 64px)', md: 'calc(100dvh - 72px)' }, minHeight: 0, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-start', mt: { xs: 0, md: 0 }, pt: { xs: 1.5, md: 5 }, pb: 0, mb: { xs: -2, md: -4 } }}>
        <Box component="video" src={SIGNUP_VIDEO_URL} autoPlay muted loop playsInline aria-hidden="true" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(90deg, rgba(4,16,39,0.86), rgba(9,31,68,0.64) 52%, rgba(3,12,30,0.42))' }} />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, height: '100%' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 3, md: 8 }} alignItems={{ xs: 'stretch', md: 'flex-start' }} justifyContent="space-between" sx={{ height: '100%' }}>
            <Box sx={{ color: '#fff', maxWidth: 470, display: { xs: 'none', md: 'block' }, pt: 14 }}>
              <Typography sx={{ color: '#93C5FD', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', mb: 1.5 }}>Your next chapter starts here</Typography>
              <Typography variant="h2" sx={{ fontWeight: 850, fontSize: { md: '2.6rem', lg: '3rem' }, lineHeight: 1.08, mb: 1.5 }}>Build a career that moves with you.</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.78)', fontSize: '1.1rem' }}>Create your JobPoyt account and discover better opportunities, faster.</Typography>
              <Stack spacing={1.2} sx={{ mt: 3 }}>{['Personalized job discovery', 'A profile recruiters can find', 'One secure account for your journey'].map((item) => <Box key={item} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><CheckCircle sx={{ color: '#60A5FA', fontSize: 20 }} /><Typography>{item}</Typography></Box>)}</Stack>
            </Box>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="w-full max-w-[360px] lg:max-w-[450px] mx-auto">
              <Card component="form" onSubmit={handleSignup} sx={{
                mt: { xs: 0.5, lg: 2 },
                p: { xs: 1.5, lg: 3.75 },
                borderRadius: { xs: 3, lg: 4 },
                background: 'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(219,234,254,0.9))',
                border: '1px solid rgba(147,197,253,0.72)',
                backdropFilter: 'blur(18px)',
                boxShadow: '0 24px 70px rgba(2,12,32,0.42), 0 0 0 1px rgba(96,165,250,0.14)',
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: 'rgba(239,246,255,0.8)',
                  '& fieldset': { borderColor: 'rgba(37,99,235,0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(37,99,235,0.45)' },
                  '&.Mui-focused fieldset': { borderColor: '#2563EB' },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#2563EB' },
              }}>
                <Typography variant="h5" sx={{ fontWeight: 850, color: '#0B1B3A', mb: 0.35, fontSize: { xs: '1.15rem', lg: '1.5rem' } }}>Create your account</Typography>
                <Typography sx={{ color: '#475569', mb: { xs: 1.25, lg: 2.25 }, fontSize: { xs: '0.78rem', lg: '0.92rem' } }}>Start your JobPoyt journey in less than a minute.</Typography>
                <Stack spacing={{ xs: 0.8, lg: 1.45 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.8, lg: 1.45 }}><TextField fullWidth size="small" label="First name" name="firstName" value={formData.firstName} onChange={handleChange} required autoComplete="given-name" sx={{ '& .MuiInputBase-root': { height: { xs: 42, lg: 52 } }, '& .MuiInputLabel-root': { fontSize: { xs: '0.82rem', lg: '1rem' } } }} /><TextField fullWidth size="small" label="Last name" name="lastName" value={formData.lastName} onChange={handleChange} required autoComplete="family-name" sx={{ '& .MuiInputBase-root': { height: { xs: 42, lg: 52 } }, '& .MuiInputLabel-root': { fontSize: { xs: '0.82rem', lg: '1rem' } } }} /></Stack>
                  <TextField fullWidth size="small" label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required autoComplete="email" sx={{ '& .MuiInputBase-root': { height: { xs: 42, lg: 52 } }, '& .MuiInputLabel-root': { fontSize: { xs: '0.82rem', lg: '1rem' } } }} />
                  <TextField fullWidth size="small" label="Mobile Number" name="phone" value={formData.phone} onChange={handleChange} required autoComplete="tel" inputProps={{ inputMode: 'numeric', maxLength: 10 }} sx={{ '& .MuiInputBase-root': { height: { xs: 42, lg: 52 } }, '& .MuiInputLabel-root': { fontSize: { xs: '0.82rem', lg: '1rem' } } }} />
                  <TextField fullWidth size="small" label="Password" name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange} required autoComplete="new-password" sx={{ '& .MuiInputBase-root': { height: { xs: 42, lg: 52 } }, '& .MuiInputLabel-root': { fontSize: { xs: '0.82rem', lg: '1rem' } } }} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)} edge="end">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }} />
                  <TextField fullWidth size="small" label="Confirm Password" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleChange} required autoComplete="new-password" sx={{ '& .MuiInputBase-root': { height: { xs: 42, lg: 52 } }, '& .MuiInputLabel-root': { fontSize: { xs: '0.82rem', lg: '1rem' } } }} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show password'} onClick={() => setShowConfirmPassword((visible) => !visible)} edge="end">{showConfirmPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }} />
                  <Button type="submit" variant="contained" size="large" disabled={loading} endIcon={<ArrowForward />} sx={{ mt: 0.25, py: { xs: 0.85, lg: 1.5 }, borderRadius: 2, fontWeight: 800, fontSize: { xs: '0.82rem', lg: '1rem' }, textTransform: 'none', background: 'linear-gradient(135deg, #2563EB 0%, #0EA5E9 55%, #4F46E5 100%)', boxShadow: '0 12px 24px rgba(37,99,235,0.25)', '&:hover': { background: 'linear-gradient(135deg, #1D4ED8 0%, #0284C7 55%, #4338CA 100%)' } }}>{loading ? 'Creating Account...' : 'Register'}</Button>
                </Stack>
                <Typography variant="body2" sx={{ color: '#64748B', textAlign: 'center', mt: { xs: 1.25, lg: 2 }, fontSize: { xs: '0.72rem', lg: '0.875rem' } }}>Already have an account? <Link component={RouterLink} to={ROUTES.LOGIN} sx={{ color: '#1D4ED8', fontWeight: 700 }}>Login</Link></Typography>
              </Card>
            </motion.div>
          </Stack>
        </Container>
      </Box>
      <Snackbar open={Boolean(message)} autoHideDuration={5000} onClose={() => setMessage('')}><Alert severity="error" onClose={() => setMessage('')}>{message}</Alert></Snackbar>
      <Snackbar open={existingAccount} autoHideDuration={7000} onClose={() => setExistingAccount(false)}><Alert severity="info" action={<Button color="inherit" size="small" onClick={() => navigate(ROUTES.LOGIN)}>Login</Button>}>An account with this email already exists.</Alert></Snackbar>
    </Layout>
  );
};
