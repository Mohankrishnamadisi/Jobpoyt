import React from 'react';
import { Box, Toolbar } from '@mui/material';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { useTheme } from '@mui/material/styles';

interface LayoutProps {
  children: React.ReactNode;
  footer?: boolean;
  backTo?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, footer = true, backTo }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: isDarkMode
          ? 'linear-gradient(180deg, #111827 0%, #0b1120 42%, #111827 100%)'
          : 'linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(241,245,249,0.85) 40%, rgba(255,255,255,0.95) 100%)',
        overflowX: 'hidden',
      }}
    >
      <Navbar backTo={backTo} />
      <Toolbar sx={{ minHeight: { xs: 10, sm: 68 } }} />
      <Box component="main" sx={{ flex: 1, pt: 0, pb: { xs: 0.5, md: 1.5 }, position: 'relative', zIndex: 1 }}>
        {children}
      </Box>
      {footer && <Footer />}
    </Box>
  );
};
