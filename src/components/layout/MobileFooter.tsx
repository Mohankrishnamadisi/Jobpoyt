import React from 'react';
import { Box, Container, Typography, Link, Divider, Button } from '@mui/material';
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
        py: 4,
        mt: 6,
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
            Jobpoyt
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
            Find your dream job or hire top talent. A modern platform for job seekers and recruiters.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
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
                <Icon fontSize="small" />
              </Link>
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', display: 'block', mb: 1 }}>
            Quick Links
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Link
              component={RouterLink}
              to={ROUTES.JOBS}
              variant="caption"
              sx={{ color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
            >
              Jobs
            </Link>
            <Link
              component={RouterLink}
              to={ROUTES.PRICING}
              variant="caption"
              sx={{ color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
            >
              Pricing
            </Link>
            <Link
              component={RouterLink}
              to={ROUTES.PRIVACY_POLICY}
              variant="caption"
              sx={{ color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
            >
              Privacy Policy
            </Link>
            <Link
              component={RouterLink}
              to={ROUTES.TERMS_CONDITIONS}
              variant="caption"
              sx={{ color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
            >
              Terms & Conditions
            </Link>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            © {currentYear} Jobpoyt. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};
