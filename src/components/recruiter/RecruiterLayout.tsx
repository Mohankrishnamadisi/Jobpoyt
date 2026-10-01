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
        background: 'radial-gradient(circle at top left, rgba(37,99,235,0.08), transparent 22%), radial-gradient(circle at bottom right, rgba(124,58,237,0.07), transparent 26%), #F4F7FB',
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
          onTabChange={onTabChange}
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
              minHeight: 38,
              borderRadius: '12px',
              px: 1.75,
              py: 0.75,
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: 0,
              boxShadow: 'none',
              textTransform: 'none',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease',
            },
            '& .MuiButton-sizeSmall': { minHeight: 32, px: 1.25, py: 0.5, fontSize: '0.74rem', borderRadius: '10px' },
            '& .MuiButton-contained': {
              color: '#FFFFFF',
              background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 60%, #7C3AED 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1D4ED8 0%, #4338CA 60%, #6D28D9 100%)',
                boxShadow: '0 10px 22px rgba(79, 70, 229, 0.28)',
                transform: 'translateY(-1px)',
              },
              '&.Mui-disabled': { background: '#E2E8F0', color: '#94A3B8' },
            },
            '& .MuiButton-containedError': { background: '#DC2626', '&:hover': { background: '#B91C1C' } },
            '& .MuiButton-containedSuccess': { background: '#16A34A', '&:hover': { background: '#15803D' } },
            '& .MuiButton-outlined': {
              borderColor: '#DCE3EE',
              color: '#1E3A8A',
              backgroundColor: '#FFFFFF',
              '&:hover': { borderColor: 'rgba(37, 99, 235, 0.45)', backgroundColor: '#F5F8FF' },
            },
            '& .MuiButton-text': { color: '#1D4ED8', '&:hover': { backgroundColor: 'rgba(37, 99, 235, 0.08)' } },
            '& .MuiIconButton-root': { width: 36, height: 36, borderRadius: '10px' },
            '& .MuiTabs-root': { minHeight: 44 },
            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0', background: 'linear-gradient(90deg, #2563EB, #7C3AED)' },
            '& .MuiTab-root': { minHeight: 44, minWidth: 0, px: 1.5, py: 0.7, fontSize: '0.78rem', fontWeight: 600, textTransform: 'none', color: '#64748B', '&.Mui-selected': { color: '#1D4ED8' } },
            '& .MuiChip-root': { height: 26, borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600 },
            '& .MuiChip-outlined': { borderColor: '#DCE3EE' },
            '& .MuiTextField-root .MuiInputBase-root, & .MuiFormControl-root .MuiInputBase-root': {
              minHeight: 40,
              borderRadius: '12px',
              fontSize: '0.8rem',
              backgroundColor: '#FFFFFF',
            },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DCE3EE' },
            '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(37, 99, 235, 0.45)' },
            '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2563EB', borderWidth: 1.5 },
            '& .MuiInputLabel-root': { fontSize: '0.8rem' },
            '& .MuiMenuItem-root': { minHeight: 36, fontSize: '0.8rem' },
            '& .MuiCard-root, & .MuiPaper-outlined, & .MuiTableContainer-root.MuiPaper-root': {
              borderRadius: '20px',
              border: '1px solid #E5EAF2',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 32px rgba(15, 23, 42, 0.06)',
              transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
              '&:hover': { borderColor: 'rgba(37, 99, 235, 0.22)', boxShadow: '0 16px 38px rgba(15, 23, 42, 0.09)' },
            },
            '& .MuiCardContent-root': { p: { xs: 1.75, md: 2.25 }, '&:last-child': { pb: { xs: 1.75, md: 2.25 } } },
            '& .MuiLinearProgress-root': { height: 8, borderRadius: 99, backgroundColor: '#EEF2F7' },
            '& .MuiLinearProgress-bar': { borderRadius: 99, background: 'linear-gradient(90deg, #2563EB, #7C3AED)' },
            '& .MuiAlert-root': { borderRadius: '14px', alignItems: 'center' },
            '& .MuiTableCell-root': { px: 1.5, py: 1.1, fontSize: '0.8rem', borderColor: '#F1F5F9', color: '#334155' },
            '& .MuiTableCell-head': { fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5EAF2' },
            '& .MuiTableBody-root .MuiTableRow-root:hover': { backgroundColor: '#F8FAFF' },
            '& .MuiTableBody-root .MuiTableRow-root:last-child .MuiTableCell-root': { borderBottom: 0 },
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
