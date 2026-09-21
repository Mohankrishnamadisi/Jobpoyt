import React from 'react';
import { Box } from '@mui/material';
import { MobileBottomNavigation } from './MobileBottomNavigation';

interface MobileAppShellProps {
  children: React.ReactNode;
}

export const MobileAppShell: React.FC<MobileAppShellProps> = ({ children }) => (
  <Box
    sx={{
      minHeight: '100dvh',
      bgcolor: 'background.default',
      color: 'text.primary',
      position: 'relative',
      pb: 0,
    }}
  >
    <Box
      component="main"
      className="jobpoyt-mobile-shell"
      sx={{
        width: '100%',
        minHeight: '100dvh',
        minWidth: 0,
      }}
    >
      {children}
    </Box>

    <MobileBottomNavigation />
  </Box>
);
