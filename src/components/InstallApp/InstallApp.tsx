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
    isInstalled,
    promptInstall,
    availability,
    platform,
    iosModalOpen,
    closeIosInstructions,
  } = usePWAInstall();

  const handleInstall = async () => {
    await promptInstall();
  };

  if (isInstalled || availability === 'already_installed' || availability === 'unsupported') return null;

  if (isMobile) {
    return (
      <>
        <IconButton
          onClick={handleInstall}
          aria-label="Install app"
          title="Install app"
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            color: isDarkMode ? '#93C5FD' : '#1d4ed8',
            bgcolor: isDarkMode ? 'rgba(29, 78, 216, 0.22)' : 'rgba(29, 78, 216, 0.08)',
            border: `1px solid ${isDarkMode ? 'rgba(147, 197, 253, 0.35)' : 'rgba(29, 78, 216, 0.28)'}`,
          }}
        >
          <DownloadIcon sx={{ fontSize: 17 }} />
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
        aria-label="Install app"
        title="Install app"
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
