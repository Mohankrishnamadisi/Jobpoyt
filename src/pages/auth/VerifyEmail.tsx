import React, { useMemo, useState } from 'react';
import { Box, Button, Card, Container, Stack, Typography, Alert } from '@mui/material';
import { CheckCircle, Circle, Email, OpenInNew, ArrowBack } from '@mui/icons-material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '@components/layout/Layout';
import { authService } from '@services/supabase';
import { ROUTES } from '@constants/index';

const PENDING_EMAIL_KEY = 'jobpoyt_pending_verification_email';
const SIGNUP_VIDEO_URL = 'https://ydvnozzigjihcachxnah.supabase.co/storage/v1/object/sign/website%20public/singup.mp4?token=eyJraWQiOiJjNjk4MjVmYS1iN2I5LTQ5OWItODBjMi1hZjRkNTQ4ZWQ3YjIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ3ZWJzaXRlIHB1YmxpYy9zaW5ndXAubXA0Iiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4OTg0NjY2OCwiZXhwIjoyMTA1MjA2NjY4fQ.34VwgNA90yUBx1OhyUtmDU7ryzyhcGfh46CKCo05CcY';

export const VerifyEmail: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);
  const verified = new URLSearchParams(location.search).get('verified') === '1';
  const email = useMemo(() => {
    const queryEmail = new URLSearchParams(location.search).get('email');
    return queryEmail || localStorage.getItem(PENDING_EMAIL_KEY) || '';
  }, [location.search]);

  const handleResend = async () => {
    if (!email) {
      setMessage({ severity: 'error', text: 'Enter your email on the registration page to request a new verification email.' });
      return;
    }
    setResending(true);
    setMessage(null);
    try {
      await authService.resendVerificationEmail(email);
      setMessage({ severity: 'success', text: 'A new verification email has been sent. Please check your inbox.' });
    } catch {
      setMessage({ severity: 'error', text: 'We could not resend the email right now. Please wait a moment and try again.' });
    } finally {
      setResending(false);
    }
  };

  return (
    <Layout footer={false}>
      <Box sx={{ height: { xs: 'calc(100dvh - 64px)', md: 'calc(100dvh - 72px)' }, minHeight: 0, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', mb: { xs: -2, md: -4 } }}>
        <Box component="video" src={SIGNUP_VIDEO_URL} autoPlay muted loop playsInline aria-hidden="true" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(90deg, rgba(4,16,39,0.88), rgba(9,31,68,0.7) 52%, rgba(3,12,30,0.58))' }} />
        <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 2 }}>
          <Card sx={{ position: 'relative', overflow: 'hidden', p: { xs: 2.5, sm: 3.5 }, borderRadius: 5, border: '1px solid rgba(255,255,255,0.55)', background: 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(241,247,255,0.94))', backdropFilter: 'blur(16px)', boxShadow: '0 30px 90px rgba(2,12,32,0.46)' }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: verified ? 'linear-gradient(90deg, #16A34A, #4ADE80)' : 'linear-gradient(90deg, #2563EB, #60A5FA)' }} />
            <Box sx={{ width: 58, height: 58, borderRadius: '18px', display: 'grid', placeItems: 'center', bgcolor: verified ? '#DCFCE7' : '#DBEAFE', color: verified ? '#15803D' : '#1D4ED8', mb: 2.25, boxShadow: verified ? '0 10px 24px rgba(22,163,74,0.16)' : '0 10px 24px rgba(37,99,235,0.16)' }}>
              <Email sx={{ fontSize: 28 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 850, mb: 0.75, color: '#0F172A' }}>
              {verified ? 'Email Verified Successfully!' : 'Registration Successful!'}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.secondary', mb: 1.75 }}>
              {verified ? 'Your JobPoyt account is now active.' : 'Your JobPoyt account has been created.'}
            </Typography>

            {!verified ? (
              <>
                <Typography sx={{ mb: 0.75, fontSize: '0.95rem' }}>We've sent a verification email to <strong>{email || 'your email address'}</strong>.</Typography>
                <Typography color="text.secondary" sx={{ mb: 2, fontSize: '0.92rem' }}>Please check your inbox and click the confirmation link to activate your JobPoyt account.</Typography>
                <Stack spacing={0.75} sx={{ mb: 2.5, p: 1.25, borderRadius: 3, bgcolor: 'rgba(226,232,240,0.46)', border: '1px solid rgba(148,163,184,0.16)' }}>
                  {['Account created', 'Verification email sent'].map((label) => <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1, py: 0.65, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.66)' }}><CheckCircle sx={{ color: '#16A34A', fontSize: 19 }} /><Typography sx={{ fontSize: '0.94rem', fontWeight: 600 }}>{label}</Typography></Box>)}
                  {['Email verification pending', 'Account activation'].map((label) => <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1, py: 0.65, color: 'text.secondary' }}><Circle sx={{ fontSize: 19 }} /><Typography sx={{ fontSize: '0.94rem' }}>{label}</Typography></Box>)}
                </Stack>
              </>
            ) : (
              <Stack spacing={0.75} sx={{ mb: 2.5, p: 1.25, borderRadius: 3, bgcolor: 'rgba(220,252,231,0.58)', border: '1px solid rgba(22,163,74,0.14)' }}>
                {['Account created', 'Verification email sent', 'Email verified', 'Account active'].map((label) => <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1, py: 0.65, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.62)' }}><CheckCircle sx={{ color: '#16A34A', fontSize: 19 }} /><Typography sx={{ fontSize: '0.94rem', fontWeight: 600 }}>{label}</Typography></Box>)}
              </Stack>
            )}

            {message && <Alert severity={message.severity} sx={{ mb: 2 }}>{message.text}</Alert>}
            {!verified && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mb: 1 }}>
              <Button fullWidth variant="contained" size="small" startIcon={<OpenInNew />} onClick={() => window.open('https://mail.google.com', '_blank')} sx={{ py: 1.25, borderRadius: 2.5, fontWeight: 800, background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 10px 22px rgba(37,99,235,0.25)', '&:hover': { background: 'linear-gradient(135deg, #1D4ED8, #1E40AF)', boxShadow: '0 12px 26px rgba(37,99,235,0.34)', transform: 'translateY(-1px)' }, transition: 'all 160ms ease' }}>Open Email</Button>
              <Button fullWidth variant="outlined" size="small" onClick={handleResend} disabled={resending} sx={{ py: 1.25, borderRadius: 2.5, fontWeight: 800, color: '#1D4ED8', borderColor: 'rgba(37,99,235,0.3)', background: 'rgba(255,255,255,0.7)', '&:hover': { borderColor: '#2563EB', background: '#EFF6FF', transform: 'translateY(-1px)' }, transition: 'all 160ms ease' }}>{resending ? 'Sending...' : 'Resend Verification Email'}</Button>
            </Stack>}
            {verified ? <Button fullWidth variant="contained" onClick={() => navigate(ROUTES.DASHBOARD)} sx={{ py: 1.25, borderRadius: 2.5, fontWeight: 800, background: 'linear-gradient(135deg, #16A34A, #15803D)' }}>Continue to JobPoyt</Button> : <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button fullWidth variant="text" component={RouterLink} to={ROUTES.SIGNUP} sx={{ borderRadius: 2, fontWeight: 700, color: '#1D4ED8', '&:hover': { bgcolor: '#EFF6FF' } }}>Change Email</Button>
              <Button fullWidth variant="text" startIcon={<ArrowBack />} component={RouterLink} to={ROUTES.LOGIN} sx={{ borderRadius: 2, fontWeight: 700, color: '#1D4ED8', '&:hover': { bgcolor: '#EFF6FF' } }}>Back to Login</Button>
            </Stack>}
          </Card>
        </Container>
      </Box>
    </Layout>
  );
};

export default VerifyEmail;
