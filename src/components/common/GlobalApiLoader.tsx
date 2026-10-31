import React, { useEffect, useState } from 'react';
import { Box, LinearProgress } from '@mui/material';

type RequestLoadingDetail = {
  active?: boolean;
};

const LOADER_DELAY_MS = 250;

export const GlobalApiLoader: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let showLoaderTimeout: ReturnType<typeof setTimeout> | undefined;

    const handleRequestState = (event: Event) => {
      const { active } = (event as CustomEvent<RequestLoadingDetail>).detail || {};
      if (active) {
        if (!showLoaderTimeout) {
          showLoaderTimeout = setTimeout(() => {
            setIsLoading(true);
            showLoaderTimeout = undefined;
          }, LOADER_DELAY_MS);
        }
        return;
      }

      if (showLoaderTimeout) {
        clearTimeout(showLoaderTimeout);
        showLoaderTimeout = undefined;
      }
      setIsLoading(false);
    };

    window.addEventListener('jobpoyt:api-loading', handleRequestState);
    return () => {
      window.removeEventListener('jobpoyt:api-loading', handleRequestState);
      if (showLoaderTimeout) clearTimeout(showLoaderTimeout);
    };
  }, []);

  if (!isLoading) return null;

  return (
    <Box
      role="status"
      aria-label="Loading data"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.tooltip + 1,
        pointerEvents: 'none',
      }}
    >
      <LinearProgress />
    </Box>
  );
};
