import React from 'react';
import { Box, Container, Typography, Link, Divider } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
} from '@mui/icons-material';
import { ROUTES } from '@constants/index';
import { useAuthStore } from '@store/index';
import { useTheme } from '@mui/material/styles';
import { siteConfig } from '@config/site';

export const MobileFooter: React.FC = () => {
  const { user } = useAuthStore();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        background: isDarkMode ? '#0B0F17' : '#FFFFFF',
        borderTop: '1px solid',
        borderColor: 'divider',
        py: 1.25,
        mt: 2,
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ mb: 1 }}>
          <Typography sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary', fontSize: '0.72rem' }}>
            Jobpoyt
          </Typography>
          <Typography sx={{ color: 'text.secondary', display: 'block', mb: 0.7, fontSize: '0.62rem', lineHeight: 1.3 }}>
            Find your dream job or hire top talent. A modern platform for job seekers and recruiters.
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            {[
              { Icon: FacebookIcon, href: siteConfig.social.facebookUrl, label: 'Facebook' },
              { Icon: TwitterIcon, href: siteConfig.social.twitterUrl, label: 'Twitter' },
              { Icon: LinkedInIcon, href: siteConfig.social.linkedinUrl, label: 'LinkedIn' },
            ].filter(({ href }) => Boolean(href)).map(({ Icon, href, label }) => (
              <Link
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                sx={{
                  color: 'text.secondary',
                  display: 'inline-flex',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                <Icon sx={{ fontSize: 15 }} />
              </Link>
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 0.9 }} />

        <Box sx={{ mb: 1 }}>
          <Typography sx={{ fontWeight: 600, color: 'text.primary', display: 'block', mb: 0.35, fontSize: '0.64rem' }}>
            Quick Links
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <Link
              component={RouterLink}
              to={ROUTES.JOBS}
              sx={{ color: 'text.secondary', textDecoration: 'none', fontSize: '0.62rem', lineHeight: 1.3, '&:hover': { color: 'primary.main' } }}
            >
              Jobs
            </Link>
            <Link
              component={RouterLink}
              to={ROUTES.PRICING}
              sx={{ color: 'text.secondary', textDecoration: 'none', fontSize: '0.62rem', lineHeight: 1.3, '&:hover': { color: 'primary.main' } }}
            >
              Pricing
            </Link>
            <Link
              component={RouterLink}
              to={ROUTES.PRIVACY_POLICY}
              sx={{ color: 'text.secondary', textDecoration: 'none', fontSize: '0.62rem', lineHeight: 1.3, '&:hover': { color: 'primary.main' } }}
            >
              Privacy Policy
            </Link>
            <Link
              component={RouterLink}
              to={ROUTES.TERMS_CONDITIONS}
              sx={{ color: 'text.secondary', textDecoration: 'none', fontSize: '0.62rem', lineHeight: 1.3, '&:hover': { color: 'primary.main' } }}
            >
              Terms & Conditions
            </Link>
          </Box>
        </Box>

        <Divider sx={{ my: 0.9 }} />

        <Box sx={{ mb: 1, textAlign: 'center' }}>
          <Typography sx={{ color: 'text.primary', fontWeight: 700, mb: 0.25, fontSize: '0.64rem' }}>
            Contact
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.6rem', lineHeight: 1.35 }}>
            Raise a ticket{' '}
            <Link component={RouterLink} to={ROUTES.CONTACT} sx={{ color: 'primary.main', fontWeight: 600 }}>
              here
            </Link>
            {' '}or email{' '}
            <Link href="mailto:info@jobpoyt.com" sx={{ color: 'primary.main', fontWeight: 600 }}>
              info@jobpoyt.com
            </Link>
            .
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.58rem' }}>
            © {currentYear} Jobpoyt. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};
