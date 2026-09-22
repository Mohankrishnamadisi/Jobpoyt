import React from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { RecruiterSidebar } from './RecruiterSidebar';
import { RecruiterTopbar } from './RecruiterTopbar';
import SupportWidget from '@components/common/SupportWidget';

const MotionBox = motion(Box);

interface RecruiterLayoutProps {
  children: React.ReactNode;
  onTabChange?: (tabId: string) => void;
  currentTab?: string;
  companyName?: string;
  companyLogo?: string;
  notificationCount?: number;
  unreadMessagesCount?: number;
  credits?: number;
  planName?: string;
  onNotificationsClick?: () => void;
  onMessagesClick?: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  readOnly?: boolean;
}

export const RecruiterLayout: React.FC<RecruiterLayoutProps> = ({
  children,
  onTabChange,
  currentTab = 'overview',
  companyName = 'Your Company',
  companyLogo,
  notificationCount = 0,
  unreadMessagesCount = 0,
  credits = 0,
  planName = 'Free',
  onNotificationsClick,
  onMessagesClick,
  onProfileClick,
  onSettingsClick,
  readOnly = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [supportOpen, setSupportOpen] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <Box
      className="recruiter-dashboard-shell"
      sx={{
        position: 'relative',
        display: 'flex',
        height: '100vh',
        background: 'radial-gradient(circle at top left, rgba(91,140,255,0.22), transparent 18%), radial-gradient(circle at bottom right, rgba(139,92,246,0.18), transparent 24%), linear-gradient(135deg, #f5f7ff 0%, #edf3ff 42%, #f8fbff 100%)',
        overflow: 'hidden',
      }}
    >
      <MotionBox
        animate={{ x: [0, 18, 0], y: [0, -12, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        sx={{
          position: 'absolute',
          top: 60,
          right: 10,
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(91,140,255,0.22), rgba(91,140,255,0.02) 62%, transparent 72%)',
          filter: 'blur(12px)',
          pointerEvents: 'none',
        }}
      />
      <MotionBox
        animate={{ x: [0, -18, 0], y: [0, 16, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        sx={{
          position: 'absolute',
          bottom: 30,
          left: 260,
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.16), rgba(139,92,246,0.02) 60%, transparent 72%)',
          filter: 'blur(16px)',
          pointerEvents: 'none',
        }}
      />

      {!isMobile && (
        <Box
          sx={{
            width: 290,
            height: '100vh',
            overflowY: 'auto',
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <RecruiterSidebar
            onTabChange={onTabChange}
            currentTab={currentTab}
            companyName={companyName}
            companyLogo={companyLogo}
            credits={credits}
            planName={planName}
            readOnly={readOnly}
          />
        </Box>
      )}

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <RecruiterTopbar
          recruiterLogo={companyLogo}
          companyName={companyName}
          notificationCount={notificationCount}
          unreadMessagesCount={unreadMessagesCount}
          credits={credits}
          planName={planName}
          onNotificationsClick={onNotificationsClick}
          onMessagesClick={onMessagesClick}
          onProfileClick={onProfileClick}
          onSettingsClick={onSettingsClick || onProfileClick}
          onCustomerCareClick={() => setSupportOpen(true)}
          onMobileMenuClick={() => setMobileMenuOpen(true)}
        />

        {isMobile && (
          <RecruiterSidebar
            onTabChange={onTabChange}
            currentTab={currentTab}
            companyName={companyName}
            companyLogo={companyLogo}
            credits={credits}
            planName={planName}
            readOnly={readOnly}
            mobileOpen={mobileMenuOpen}
            onMobileOpenChange={setMobileMenuOpen}
            hideMobileTrigger
          />
        )}

        <MotionBox
          className="recruiter-workspace"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: { xs: 1.5, md: 3 },
            '& .MuiTypography-h1': { fontSize: { xs: '1.65rem', md: '2rem' }, lineHeight: 1.2 },
            '& .MuiTypography-h2': { fontSize: { xs: '1.5rem', md: '1.8rem' }, lineHeight: 1.25 },
            '& .MuiTypography-h3': { fontSize: { xs: '1.3rem', md: '1.55rem' }, lineHeight: 1.3 },
            '& .MuiTypography-h4': { fontSize: { xs: '1.15rem', md: '1.35rem' }, lineHeight: 1.35 },
            '& .MuiTypography-h5': { fontSize: { xs: '0.98rem', md: '1.08rem' }, lineHeight: 1.4 },
            '& .MuiTypography-h6': { fontSize: '0.92rem', lineHeight: 1.45 },
            '& .MuiTypography-body1': { fontSize: '0.88rem', lineHeight: 1.55 },
            '& .MuiTypography-body2': { fontSize: '0.78rem', lineHeight: 1.5 },
            '& .MuiTypography-subtitle1': { fontSize: '0.86rem', lineHeight: 1.45 },
            '& .MuiTypography-subtitle2': { fontSize: '0.76rem', lineHeight: 1.45 },
            '& .MuiTypography-caption': { fontSize: '0.68rem', lineHeight: 1.4 },
            '& .MuiButton-root': {
              minHeight: 36,
              borderRadius: 1,
              px: 1.5,
              py: 0.75,
              fontSize: '0.76rem',
              fontWeight: 750,
              letterSpacing: 0,
              boxShadow: 'none',
              textTransform: 'none',
            },
            '& .MuiButton-sizeSmall': { minHeight: 30, px: 1.15, py: 0.5, fontSize: '0.7rem' },
            '& .MuiButton-contained': {
              color: '#FFFFFF',
              background: 'linear-gradient(135deg, #0B1325 0%, #1D3764 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #121E37 0%, #28508A 100%)',
                boxShadow: '0 8px 18px rgba(11, 19, 37, 0.2)',
              },
            },
            '& .MuiButton-containedError': { background: '#C2414C', '&:hover': { background: '#A9323D' } },
            '& .MuiButton-containedSuccess': { background: '#087F73', '&:hover': { background: '#06665D' } },
            '& .MuiButton-outlined': {
              borderColor: '#B8C9E2',
              color: '#16325C',
              backgroundColor: 'rgba(255,255,255,0.72)',
              '&:hover': { borderColor: '#28508A', backgroundColor: '#EDF4FF' },
            },
            '& .MuiButton-text': { color: '#1D4B86', '&:hover': { backgroundColor: '#EDF4FF' } },
            '& .MuiIconButton-root': { width: 36, height: 36, borderRadius: 1 },
            '& .MuiTabs-root': { minHeight: 42 },
            '& .MuiTab-root': { minHeight: 42, minWidth: 0, px: 1.35, py: 0.7, fontSize: '0.74rem', fontWeight: 750 },
            '& .MuiChip-root': { height: 26, borderRadius: 1, fontSize: '0.68rem', fontWeight: 750 },
            '& .MuiTextField-root .MuiInputBase-root, & .MuiFormControl-root .MuiInputBase-root': {
              minHeight: 40,
              borderRadius: 1,
              fontSize: '0.78rem',
            },
            '& .MuiInputLabel-root': { fontSize: '0.78rem' },
            '& .MuiMenuItem-root': { minHeight: 36, fontSize: '0.78rem' },
            '& .MuiCard-root': {
              borderRadius: 1,
              borderColor: 'rgba(148, 163, 184, 0.25)',
              boxShadow: '0 10px 28px rgba(15, 39, 75, 0.07)',
              '&:hover': { borderColor: 'rgba(40, 80, 138, 0.42)', boxShadow: '0 14px 32px rgba(15, 39, 75, 0.11)' },
            },
            '& .MuiCardContent-root': { p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } },
            '& .MuiTableCell-root': { px: 1.25, py: 1, fontSize: '0.76rem' },
            '& .MuiTableCell-head': { fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' },
            '&::-webkit-scrollbar': { width: 9 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(100,116,139,0.32)', borderRadius: 99, border: '2px solid #EEF3FF' },
          }}
        >
          {children}
        </MotionBox>
      </Box>

      <SupportWidget
        audience="recruiter"
        showFab={false}
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
      />
    </Box>
  );
};
