import React from 'react';
import { Box, Toolbar } from '@mui/material';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { useTheme } from '@mui/material/styles';

interface LayoutProps {
  children: React.ReactNode;
  footer?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, footer = true }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: isDarkMode
          ? 'linear-gradient(180deg, #111827 0%, #0b1120 42%, #111827 100%)'
          : 'linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(241,245,249,0.85) 40%, rgba(255,255,255,0.95) 100%)',
        overflowX: 'hidden',
      }}
    >
      <Navbar />
      <Toolbar
        aria-hidden="true"
        sx={{
          display: { xs: 'block', md: 'none' },
          minHeight: { xs: 'var(--jobpoyt-header-height)', md: 0 },
          height: { xs: 'var(--jobpoyt-header-height)', md: 0 },
        }}
      />
      <Toolbar aria-hidden="true" sx={{ display: { xs: 'none', md: 'block' }, minHeight: 72, height: 72 }} />
      <Box
        component="main"
        className="jobpoyt-main"
        sx={{
          flex: 1,
          pt: 0,
          pb: { xs: 'calc(var(--jobpoyt-bottom-nav-height) + env(safe-area-inset-bottom, 0px))', md: 1.5 },
          position: 'relative',
          zIndex: 1,
          minWidth: 0,
        }}
      >
        {children}
      </Box>
      {footer && <Footer />}
    </Box>
  );
};
