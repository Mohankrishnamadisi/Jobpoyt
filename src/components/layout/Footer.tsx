import React, { Suspense } from 'react';
import { Box, Container, Grid, Typography, Link, Divider, Button, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  ArrowForward as ArrowForwardIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { ROUTES, USER_ROLES } from '@constants/index';
import { useAuthStore } from '@store/index';
import usePWAInstall from '@hooks/usePWAInstall';
import PWAInstallBanner from '@components/InstallApp/PWAInstallBanner';
import '../../styles/footerSocialIcons.css';
import { knownSocialUrls } from '@config/site';

const PWAInstallModal = React.lazy(() => import('@components/InstallApp/PWAInstallModal'));

export const Footer: React.FC = () => {
  const { user } = useAuthStore();
  const {
    isInstalled,
    shouldShowBanner,
    isUnsupported,
    unsupportedTip,
    promptInstall,
    platform,
    iosModalOpen,
    closeIosInstructions,
    hideInstallBanner,
    remindMeLater,
    neverShowAgain,
  } = usePWAInstall();
  const currentYear = new Date().getFullYear();

  const handleInstallClick = async () => {
    await promptInstall();
  };

  const recruiterLinks = [
    { label: 'Post a Job', to: ROUTES.RECRUITER_REGISTER },
    { label: 'Recruiter Dashboard', to: ROUTES.RECRUITER_DASHBOARD },
    { label: 'Pricing', to: ROUTES.PRICING },
    { label: 'Register', to: ROUTES.SIGNUP },
  ];

  const footerSections = [
    {
      title: 'Quick Links',
      items: [
        { label: 'Jobs', to: ROUTES.JOBS },
        { label: 'Pricing', to: ROUTES.PRICING },
        { label: 'Privacy Policy', to: ROUTES.PRIVACY_POLICY },
        { label: 'Terms & Conditions', to: ROUTES.TERMS_CONDITIONS },
      ],
    },
    ...(user?.role !== USER_ROLES.JOB_SEEKER
      ? [
          {
            title: 'For Recruiters',
            items: [
              { label: 'Post a Job', to: ROUTES.RECRUITER_REGISTER },
              { label: 'Recruiter Dashboard', to: ROUTES.RECRUITER_DASHBOARD },
              { label: 'Pricing', to: ROUTES.PRICING },
              { label: 'Register', to: ROUTES.SIGNUP },
            ],
          },
        ]
      : []),
    {
      title: 'Legal',
      items: [
        { label: 'Privacy Policy', to: ROUTES.PRIVACY_POLICY },
        { label: 'Terms & Conditions', to: ROUTES.TERMS_CONDITIONS },
        { label: 'Cookie Policy', to: '#' },
      ],
    },
  ];

  return (
    <Box
      component="footer"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        background:
          'radial-gradient(circle at 14% 20%, rgba(56, 189, 248, 0.20), transparent 36%), radial-gradient(circle at 86% 12%, rgba(20, 184, 166, 0.20), transparent 40%), linear-gradient(180deg, #0B1220 0%, #111827 100%)',
        color: '#E2E8F0',
        borderTop: '1px solid rgba(148, 163, 184, 0.22)',
        py: { xs: 6, md: 8 },
        mt: 10,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(120deg, rgba(15, 23, 42, 0.1) 0%, rgba(15, 23, 42, 0.42) 40%, rgba(15, 23, 42, 0.64) 100%)',
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="lg">
        <Paper
          sx={{
            mb: 3.5,
            p: { xs: 2, md: 2.6 },
            borderRadius: 3,
            border: '1px solid rgba(148, 163, 184, 0.26)',
            background: 'rgba(15, 23, 42, 0.42)',
            backdropFilter: 'blur(8px)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  color: '#F8FAFC',
                  mb: 0.8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: { xs: '1.25rem', md: '1.45rem' },
                }}
              >
                <TrendingUpIcon sx={{ color: '#34D399' }} />
                Built For Faster Hiring And Better Careers
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(226, 232, 240, 0.9)' }}>
                Jobpoyt helps candidates and recruiters discover the right opportunities with modern tools, better matching, and seamless workflows.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                <Button
                  component={RouterLink}
                  to={ROUTES.JOBS}
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 2.2,
                    px: 2,
                    py: 1,
                    background: 'linear-gradient(90deg, #0ea5e9, #2563eb)',
                    boxShadow: 'none',
                    '&:hover': {
                      background: 'linear-gradient(90deg, #0284c7, #1d4ed8)',
                      boxShadow: 'none',
                    },
                  }}
                >
                  Explore Jobs
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {shouldShowBanner && !isInstalled ? (
          <Box sx={{ mb: 3.2, position: 'relative', zIndex: 1 }}>
            <PWAInstallBanner
              appName="Jobpoyt"
              description="Install for faster load, offline access, and instant recruiter updates."
              isUnsupported={isUnsupported}
              unsupportedTip={unsupportedTip}
              onInstallNow={handleInstallClick}
              onRemindLater={() => remindMeLater(24)}
              onHide={hideInstallBanner}
              onNeverShowAgain={neverShowAgain}
            />
          </Box>
        ) : null}

        <Grid container spacing={4} sx={{ mb: 2, position: 'relative', zIndex: 1 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="h6" sx={{ fontWeight: 750, mb: 1.5, color: '#FFFFFF' }}>
              Jobpoyt
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(226, 232, 240, 0.88)', mb: 2.2, maxWidth: 380, lineHeight: 1.75 }}>
              Discover premium hiring and job search experiences with modern analytics, growth tools, and design-forward workflows.
            </Typography>
            <div className="footer-social-parent" style={{ display: knownSocialUrls.length > 0 ? undefined : 'none' }}>
              <div className="footer-social-child footer-social-child-1">
                <button className="footer-social-button footer-social-btn-1" aria-label="Twitter">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="#1e90ff">
                    <path d="M459.37 151.716c.325 4.548.325 9.097.325 13.645 0 138.72-105.583 298.558-298.558 298.558-59.452 0-114.68-17.219-161.137-47.106 8.447.974 16.568 1.299 25.34 1.299 49.055 0 94.213-16.568 130.274-44.832-46.132-.975-84.792-31.188-98.112-72.772 6.498.974 12.995 1.624 19.818 1.624 9.421 0 18.843-1.3 27.614-3.573-48.081-9.747-84.143-51.98-84.143-102.985v-1.299c13.969 7.797 30.214 12.67 47.431 13.319-28.264-18.843-46.781-51.005-46.781-87.391 0-19.492 5.197-37.36 14.294-52.954 51.655 63.675 129.3 105.258 216.365 109.807-1.624-7.797-2.599-15.918-2.599-24.04 0-57.828 46.782-104.934 104.934-104.934 30.213 0 57.502 12.67 76.67 33.137 23.715-4.548 46.456-13.32 66.599-25.34-7.798 24.366-24.366 44.833-46.132 57.827 21.117-2.273 41.584-8.122 60.426-16.243-14.292 20.791-32.161 39.308-52.628 54.253z"></path>
                  </svg>
                </button>
              </div>
              <div className="footer-social-child footer-social-child-2">
                <button className="footer-social-button footer-social-btn-2" aria-label="Instagram">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="#ff00ff">
                    <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"></path>
                  </svg>
                </button>
              </div>
              <div className="footer-social-child footer-social-child-3">
                <button className="footer-social-button footer-social-btn-3" aria-label="GitHub">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512" fill="#111111">
                    <path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z"></path>
                  </svg>
                </button>
              </div>
              <div className="footer-social-child footer-social-child-4">
                <button className="footer-social-button footer-social-btn-4" aria-label="Facebook">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" fill="#4267B2">
                    <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"></path>
                  </svg>
                </button>
              </div>
            </div>
          </Grid>

          {footerSections.map((section) => (
            <Grid item xs={12} sm={6} md={2.6} key={section.title}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.8, color: '#F8FAFC' }}>
                {section.title}
              </Typography>
              <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                {section.items.map((item) => (
                  <Typography key={item.label} component="li" variant="body2" sx={{ mb: 1.1 }}>
                    <Link
                      component={RouterLink}
                      to={item.to}
                      sx={{
                        color: 'rgba(203, 213, 225, 0.92)',
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                        display: 'inline-flex',
                        alignItems: 'center',
                        '&:hover': {
                          color: '#7dd3fc',
                          transform: 'translateX(3px)',
                        },
                      }}
                    >
                      {item.label}
                    </Link>
                  </Typography>
                ))}
              </Box>
            </Grid>
          ))}

          {user?.role === 'recruiter' && (
            <Grid item xs={12} sm={6} md={2.8}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.8, color: '#F8FAFC' }}>
                Recruiter Links
              </Typography>
              <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                {recruiterLinks.map((item) => (
                  <Typography key={item.label} component="li" variant="body2" sx={{ mb: 1.1 }}>
                    <Link
                      component={RouterLink}
                      to={item.to}
                      sx={{
                        color: 'rgba(203, 213, 225, 0.92)',
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                        display: 'inline-flex',
                        alignItems: 'center',
                        '&:hover': {
                          color: '#7dd3fc',
                          transform: 'translateX(3px)',
                        },
                      }}
                    >
                      {item.label}
                    </Link>
                  </Typography>
                ))}
              </Box>
            </Grid>
          )}
        </Grid>

        <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.28)', my: 3, position: 'relative', zIndex: 1 }} />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
            pt: 1,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Typography variant="body2" sx={{ color: 'rgba(226, 232, 240, 0.84)' }}>
            © {currentYear} Jobpoyt. Designed for premium hiring experiences.
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(226, 232, 240, 0.72)' }}>
            Modern talent marketplace for candidates and recruiters.
          </Typography>
        </Box>
      </Container>

      <Suspense fallback={null}>
        <PWAInstallModal
          open={iosModalOpen}
          platform={platform}
          onClose={closeIosInstructions}
        />
      </Suspense>
    </Box>
  );
};
