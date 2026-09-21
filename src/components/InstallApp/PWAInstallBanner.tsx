import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Close as CloseIcon,
  GetApp as GetAppIcon,
  InstallMobile as InstallMobileIcon,
  Schedule as ScheduleIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';

interface PWAInstallBannerProps {
  appName: string;
  description: string;
  isUnsupported?: boolean;
  unsupportedTip?: string;
  onInstallNow: () => void;
  onRemindLater: () => void;
  onHide: () => void;
  onNeverShowAgain: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  appName,
  description,
  onInstallNow,
  onRemindLater,
  onHide,
  onNeverShowAgain,
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  return (
    <Card
      role="region"
      aria-label="Install app banner"
      className="relative w-full overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm"
      sx={{
        borderRadius: 4,
        background: isDarkMode
          ? 'linear-gradient(135deg, #111827 0%, #0B1220 52%, #172033 100%)'
          : 'linear-gradient(135deg, rgba(239,246,255,0.94) 0%, rgba(255,255,255,0.98) 38%, rgba(224,242,254,0.94) 100%)',
        color: isDarkMode ? '#FFFFFF' : '#0F172A',
        borderColor: isDarkMode ? 'rgba(148, 163, 184, 0.28)' : undefined,
        boxShadow: isDarkMode ? '0 18px 45px rgba(0, 0, 0, 0.34)' : '0 18px 45px rgba(15, 23, 42, 0.08)',
        animation: 'installBannerReveal 320ms ease-out',
        '@keyframes installBannerReveal': {
          '0%': { opacity: 0, transform: 'translateY(8px) scale(0.99)' },
          '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
      }}
    >
      <CardContent sx={{ p: { xs: 1.5, md: 1.8 } }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1.5}
          sx={{ minHeight: 72 }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
            <Box
              className="flex items-center justify-center rounded-[18px] bg-gradient-to-br from-amber-200 via-yellow-100 to-sky-100 ring-1 ring-amber-300/70"
              sx={{
                width: 54,
                height: 54,
                flexShrink: 0,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 8px 18px rgba(59,130,246,0.12)',
              }}
              aria-hidden="true"
            >
              <InstallMobileIcon sx={{ fontSize: 26, color: '#1d4ed8' }} />
            </Box>

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 900,
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                  color: isDarkMode ? '#FFFFFF' : '#0f172a',
                  fontSize: { xs: '1.05rem', md: '1.2rem' },
                }}
              >
                Install {appName}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: isDarkMode ? '#FFFFFF' : '#475569',
                  mt: 0.3,
                  fontSize: '0.82rem',
                }}
              >
                {description}
              </Typography>
            </Box>
          </Stack>

          <Box
            className="flex items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 shadow-[0_8px_20px_rgba(37,99,235,0.28)]"
            sx={{
              width: 56,
              height: 56,
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <InstallMobileIcon sx={{ color: '#fff', fontSize: 26 }} />
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 1.6, flexWrap: 'wrap', rowGap: 1 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={onInstallNow}
            startIcon={<GetAppIcon />}
            aria-label="Install app now"
            className="!rounded-full !px-4 !py-2 !text-sm !font-semibold !shadow-[0_8px_18px_rgba(37,99,235,0.18)]"
            sx={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#fff',
              '&:hover': {
                background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
              },
            }}
          >
            Install Now
          </Button>

          <Button
            variant="outlined"
            onClick={onRemindLater}
            startIcon={<ScheduleIcon />}
            aria-label="Remind me later"
            className="!rounded-full !border-slate-200 !px-4 !py-2 !text-sm !font-semibold"
            sx={{
                borderColor: isDarkMode ? '#64748B' : '#cbd5e1',
                color: isDarkMode ? '#FFFFFF' : '#0f172a',
              '&:hover': {
                  borderColor: isDarkMode ? '#CBD5E1' : '#94a3b8',
                bgcolor: 'rgba(148, 163, 184, 0.08)',
              },
            }}
          >
            Remind Later
          </Button>

          <Button
            variant="text"
            onClick={onNeverShowAgain}
            startIcon={<VisibilityOffIcon />}
            aria-label="Never show install banner again"
            className="!rounded-full !px-3 !py-2 !text-sm !font-semibold"
            sx={{
                color: isDarkMode ? '#FFFFFF' : '#475569',
              '&:hover': {
                bgcolor: 'rgba(148, 163, 184, 0.08)',
              },
            }}
          >
            Never Show
          </Button>

        </Stack>

        <IconButton
          size="small"
          onClick={onHide}
          aria-label="Hide install banner"
          className="!absolute !right-3 !top-3 !rounded-full"
          sx={{
            position: 'absolute',
            right: 12,
            top: 12,
            color: isDarkMode ? '#FFFFFF' : '#64748B',
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.7)',
            boxShadow: isDarkMode ? '0 4px 12px rgba(0, 0, 0, 0.28)' : '0 4px 12px rgba(15, 23, 42, 0.08)',
            '&:hover': {
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : '#FFFFFF',
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </CardContent>
    </Card>
  );
};

export default PWAInstallBanner;
