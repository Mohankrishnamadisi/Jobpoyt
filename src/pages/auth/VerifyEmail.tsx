import React, { useMemo, useState } from 'react';
import { Box, Button, Card, Container, Stack, Typography, Alert } from '@mui/material';
import { CheckCircle, Circle, Email, OpenInNew, ArrowBack } from '@mui/icons-material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '@components/layout/Layout';
import { authService } from '@services/supabase';
import { ROUTES } from '@constants/index';

const PENDING_EMAIL_KEY = 'jobpoyt_pending_verification_email';

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
      <Box sx={{ minHeight: '100vh', py: { xs: 6, md: 10 }, background: 'linear-gradient(180deg, #F8FAFC 0%, #EFF6FF 100%)' }}>
        <Container maxWidth="sm">
          <Card sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, border: '1px solid rgba(37, 99, 235, 0.14)', boxShadow: '0 24px 70px rgba(15, 23, 42, 0.1)' }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: verified ? '#DCFCE7' : '#DBEAFE', color: verified ? '#15803D' : '#1D4ED8', mb: 3 }}>
              <Email sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              {verified ? 'Email Verified Successfully!' : 'Registration Successful!'}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.secondary', mb: 2 }}>
              {verified ? 'Your JobPoyt account is now active.' : 'Your JobPoyt account has been created.'}
            </Typography>

            {!verified ? (
              <>
                <Typography sx={{ mb: 1 }}>We've sent a verification email to <strong>{email || 'your email address'}</strong>.</Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>Please check your inbox and click the confirmation link to activate your JobPoyt account.</Typography>
                <Stack spacing={1.5} sx={{ mb: 4 }}>
                  {['Account created', 'Verification email sent'].map((label) => <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><CheckCircle color="success" fontSize="small" /><Typography>{label}</Typography></Box>)}
                  {['Email verification pending', 'Account activation'].map((label) => <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}><Circle fontSize="small" /><Typography>{label}</Typography></Box>)}
                </Stack>
              </>
            ) : (
              <Stack spacing={1.5} sx={{ mb: 4 }}>
                {['Account created', 'Verification email sent', 'Email verified', 'Account active'].map((label) => <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><CheckCircle color="success" fontSize="small" /><Typography>{label}</Typography></Box>)}
              </Stack>
            )}

            {message && <Alert severity={message.severity} sx={{ mb: 2 }}>{message.text}</Alert>}
            {!verified && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1.5 }}>
              <Button fullWidth variant="contained" startIcon={<OpenInNew />} onClick={() => window.open('https://mail.google.com', '_blank')}>Open Email</Button>
              <Button fullWidth variant="outlined" onClick={handleResend} disabled={resending}>{resending ? 'Sending...' : 'Resend Verification Email'}</Button>
            </Stack>}
            {verified ? <Button fullWidth variant="contained" onClick={() => navigate(ROUTES.DASHBOARD)}>Continue to JobPoyt</Button> : <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button fullWidth variant="text" component={RouterLink} to={ROUTES.SIGNUP}>Change Email</Button>
              <Button fullWidth variant="text" startIcon={<ArrowBack />} component={RouterLink} to={ROUTES.LOGIN}>Back to Login</Button>
            </Stack>}
          </Card>
        </Container>
      </Box>
    </Layout>
  );
};

export default VerifyEmail;
