import React from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { MobileNavbar } from './MobileNavbar';
import { MobileFooter } from './MobileFooter';

interface MobileLayoutProps {
  children: React.ReactNode;
  footer?: boolean;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children, footer = true }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        bgcolor: isDarkMode ? '#000000' : '#f6f8fb',
      }}
    >
      <MobileNavbar />
      <Box
        component="main"
        sx={{
          flex: 1,
          width: '100%',
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {children}
      </Box>
      {footer && <MobileFooter />}
    </Box>
  );
};
