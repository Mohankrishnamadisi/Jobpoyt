import React, { Suspense } from 'react';
import { IconButton, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Download as DownloadIcon } from '@mui/icons-material';
import usePWAInstall from '@hooks/usePWAInstall';
import '../../styles/installAppButton.css';

const PWAInstallModal = React.lazy(() => import('./PWAInstallModal'));

export const InstallApp: React.FC = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const {
    promptInstall,
    platform,
    iosModalOpen,
    closeIosInstructions,
  } = usePWAInstall();

  const handleInstall = async () => {
    await promptInstall();
  };

  if (isMobile) {
    return (
      <>
        <IconButton
          onClick={handleInstall}
          aria-label="Install App"
          title="Install App"
          sx={{
            width: 'clamp(40px, 11vw, 44px)',
            height: 'clamp(40px, 11vw, 44px)',
            minWidth: 'clamp(40px, 11vw, 44px)',
            minHeight: 'clamp(40px, 11vw, 44px)',
            p: 0,
            borderRadius: 1.5,
            color: '#1d4ed8',
            bgcolor: '#FFFFFF',
            border: '1px solid rgba(29, 78, 216, 0.28)',
          }}
        >
          <DownloadIcon sx={{ fontSize: 22 }} />
        </IconButton>
        <Suspense fallback={null}>
          <PWAInstallModal
            open={iosModalOpen}
            platform={platform}
            onClose={closeIosInstructions}
          />
        </Suspense>
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleInstall}
        type="button"
        className={`install-app-button install-app-type1${isDarkMode ? ' install-app-dark' : ''}`}
        aria-label="Install App"
        title="Install App"
      >
      </button>
      <Suspense fallback={null}>
        <PWAInstallModal
          open={iosModalOpen}
          platform={platform}
          onClose={closeIosInstructions}
        />
      </Suspense>
    </>
  );
};

export default InstallApp;
