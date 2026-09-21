import React, { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import {
  AddToHomeScreen as AddToHomeScreenIcon,
  Close as CloseIcon,
  IosShare as IosShareIcon,
  MoreVert as MoreVertIcon,
  InstallMobile as InstallMobileIcon,
  SwipeUp as SwipeUpIcon,
  TouchApp as TouchAppIcon,
} from '@mui/icons-material';
import type { PwaPlatform } from '@hooks/usePWAInstall';

interface PWAInstallModalProps {
  open: boolean;
  platform: PwaPlatform;
  onClose: (dontShowAgain: boolean) => void;
}

const steps = [
  {
    id: 1,
    title: 'Tap the Share button',
    description: 'In Safari toolbar, tap the Share icon.',
    icon: IosShareIcon,
  },
  {
    id: 2,
    title: 'Scroll down in the sheet',
    description: 'Swipe up to see all actions.',
    icon: SwipeUpIcon,
  },
  {
    id: 3,
    title: 'Tap Add to Home Screen',
    description: 'Select Add to Home Screen from the options.',
    icon: AddToHomeScreenIcon,
  },
  {
    id: 4,
    title: 'Tap Add',
    description: 'Confirm and launch from your home screen.',
    icon: TouchAppIcon,
  },
];

const androidSteps = [
  { id: 1, title: 'Open the browser menu', description: 'Tap the three dots in Chrome or Samsung Internet.', icon: MoreVertIcon },
  { id: 2, title: 'Choose Install app', description: 'Tap Install app or Add to Home screen.', icon: InstallMobileIcon },
  { id: 3, title: 'Confirm installation', description: 'Tap Install and launch JobPoyt from your home screen.', icon: AddToHomeScreenIcon },
];

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ open, platform, onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    onClose(dontShowAgain);
  };

  const isAndroid = platform === 'android';
  const platformLabel = isAndroid ? 'Android' : platform === 'ipados' ? 'iPad' : 'iPhone';
  const platformSteps = isAndroid ? androidSteps : steps;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="ios-install-guide-title"
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid rgba(148,163,184,0.28)',
          background: 'linear-gradient(170deg, rgba(15,23,42,0.92), rgba(30,41,59,0.92))',
          backdropFilter: 'blur(14px)',
          color: '#F8FAFC',
        },
      }}
    >
      <DialogTitle
        id="ios-install-guide-title"
        sx={{
          pb: 1.1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(148,163,184,0.28)',
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Install on {platformLabel}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(226,232,240,0.9)' }}>
            {isAndroid ? 'Install JobPoyt from your browser menu for a native-like experience.' : 'Add this app to Home Screen for a native-like experience.'}
          </Typography>
        </Box>
        <IconButton aria-label="Close install instructions" onClick={handleClose} sx={{ color: '#CBD5E1' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 1.5, md: 2 } }}>
        <Grid container spacing={1.2}>
          {platformSteps.map((step) => (
            <Grid item xs={12} sm={6} key={step.id}>
              <Box
                sx={{
                  p: 1.4,
                  height: '100%',
                  borderRadius: 2,
                  border: '1px solid rgba(148,163,184,0.25)',
                  background: 'linear-gradient(140deg, rgba(15,23,42,0.7), rgba(30,41,59,0.62))',
                  animation: 'iosStepFade 280ms ease-out',
                  '@keyframes iosStepFade': {
                    '0%': { opacity: 0, transform: 'translateY(8px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' },
                  },
                }}
              >
                <Stack direction="row" spacing={1.1} alignItems="center" sx={{ mb: 0.7 }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: 'rgba(14,165,233,0.24)',
                      border: '1px solid rgba(125,211,252,0.46)',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                    aria-hidden="true"
                  >
                    {step.id}
                  </Box>
                  <step.icon sx={{ color: '#7DD3FC' }} />
                </Stack>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.35 }}>
                  {step.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(226,232,240,0.9)' }}>
                  {step.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <FormControlLabel
          sx={{ mt: 1.2 }}
          control={
            <Checkbox
              checked={dontShowAgain}
              onChange={(event) => setDontShowAgain(event.target.checked)}
              color="primary"
              inputProps={{ 'aria-label': 'Do not show install instructions again' }}
            />
          }
          label={<Typography variant="body2">Don&apos;t show again</Typography>}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.4 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={handleClose}
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(90deg, #0284C7, #1D4ED8)',
            }}
          >
            Got It
          </Button>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleClose}
            sx={{
              fontWeight: 700,
              color: '#E2E8F0',
              borderColor: 'rgba(148,163,184,0.42)',
            }}
          >
            Close
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default PWAInstallModal;
