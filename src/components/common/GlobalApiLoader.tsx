import React, { useEffect, useState } from 'react';
import { Backdrop, Box, Typography } from '@mui/material';

type RequestLoadingDetail = {
  active?: boolean;
};

export const GlobalApiLoader: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleRequestState = (event: Event) => {
      const { active } = (event as CustomEvent<RequestLoadingDetail>).detail || {};
      setIsLoading(Boolean(active));
    };

    window.addEventListener('jobpoyt:api-loading', handleRequestState);
    return () => window.removeEventListener('jobpoyt:api-loading', handleRequestState);
  }, []);

  return (
    <Backdrop
      open={isLoading}
      sx={{
        zIndex: (theme) => theme.zIndex.modal + 2,
        color: 'primary.main',
        backgroundColor: 'rgba(255, 255, 255, 0.62)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <Box
        role="status"
        aria-live="polite"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.2,
          px: 3,
          py: 2.2,
          borderRadius: 2,
          backgroundColor: 'background.paper',
          boxShadow: '0 12px 35px rgba(15, 23, 42, 0.16)',
        }}
      >
        <Box
          component="img"
          src="/jobpoyttitle.png"
          alt="JobPoyt loading"
          sx={{
            width: { xs: 52, sm: 60 },
            height: 'auto',
            objectFit: 'contain',
            transformOrigin: 'center',
            animation: 'jobpoytHeartbeat 1.35s ease-in-out infinite',
            '@keyframes jobpoytHeartbeat': {
              '0%, 100%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.06)' },
            },
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
            },
          }}
        />
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    </Backdrop>
  );
};
