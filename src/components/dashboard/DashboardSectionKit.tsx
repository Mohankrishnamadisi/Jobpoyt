import React from 'react';
import { Box } from '@mui/material';

// Plain Box text (not Typography) so page-level `.MuiTypography-*` size overrides do not apply.
export const DashboardHero: React.FC<{
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  compact?: boolean;
  accent?: string;
  accent2?: string;
}> = ({ icon, eyebrow, title, subtitle, action, compact = false, accent = '#B45309', accent2 = '#FDE68A' }) => (
  <Box
    sx={{
      mb: compact ? 1.2 : 2,
      px: compact ? { xs: 1.6, md: 2.2 } : { xs: 2, md: 2.8 },
      py: compact ? { xs: 1.5, md: 1.8 } : { xs: 2.2, md: 2.6 },
      borderRadius: compact ? 3 : 4,
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 20px 44px rgba(7,29,53,0.2)',
      background: `radial-gradient(circle at 92% -20%, ${accent2}66, transparent 42%), radial-gradient(circle at 0% 120%, rgba(56,189,248,0.28), transparent 45%), linear-gradient(120deg, #071D35 0%, #0F2F55 55%, #163E6E 100%)`,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap', position: 'relative' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
        <Box
          sx={{
            width: compact ? 44 : 52,
            height: compact ? 44 : 52,
            borderRadius: 2.75,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            color: '#071D35',
            background: `linear-gradient(145deg, ${accent2}, ${accent})`,
            boxShadow: `0 0 0 5px rgba(255,255,255,0.08), 0 12px 24px ${accent}59`,
            '& svg': { fontSize: compact ? 22 : 26 },
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Box
            component="span"
            sx={{ display: 'inline-block', mb: 0.5, px: 1, py: 0.2, borderRadius: 99, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.12em', color: '#FDE68A', bgcolor: 'rgba(253,230,138,0.12)', border: '1px solid rgba(253,230,138,0.3)' }}
          >
            {eyebrow}
          </Box>
          <Box component="h2" sx={{ m: 0, fontSize: compact ? { xs: 19, md: 21 } : { xs: 23, md: 28 }, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            {title}
          </Box>
          <Box component="p" sx={{ m: 0, mt: 0.3, fontSize: compact ? { xs: 12, md: 13 } : { xs: 13, md: 14.5 }, color: 'rgba(226,232,240,0.82)' }}>
            {subtitle}
          </Box>
        </Box>
      </Box>
      {action}
    </Box>
  </Box>
);

export const heroGoldButtonSx = {
  position: 'relative',
  borderRadius: 2.5,
  px: 2,
  py: 0.9,
  color: '#071D35',
  textTransform: 'none',
  fontWeight: 800,
  fontSize: 13,
  background: 'linear-gradient(135deg, #FDE68A, #D6A73A)',
  boxShadow: '0 10px 22px rgba(214,167,58,0.35)',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  '&:hover': { background: 'linear-gradient(135deg, #FCD34D, #C99A2E)', transform: 'translateY(-2px)', boxShadow: '0 14px 26px rgba(214,167,58,0.45)' },
  '&.Mui-disabled': { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: 'none' },
} as const;

export const DashboardStatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  accent: string;
  accent2: string;
  compact?: boolean;
  smallValue?: boolean;
  darkMode?: boolean;
}> = ({ label, value, icon, accent, accent2, compact = false, smallValue = false, darkMode = false }) => (
  <Box
    sx={{
      position: 'relative',
      overflow: 'hidden',
      height: '100%',
      minHeight: compact ? 84 : 104,
      px: compact ? 1.75 : 2.1,
      py: compact ? 1.4 : 1.75,
      borderRadius: 3,
      border: '1px solid',
      borderColor: darkMode ? 'rgba(148,163,184,0.24)' : '#E5EAF0',
      bgcolor: darkMode ? '#0F172A' : '#FFFFFF',
      boxShadow: '0 4px 14px rgba(15,23,42,0.04)',
      transition: 'all 0.22s ease',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: `linear-gradient(90deg, ${accent}, ${accent2})`,
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        width: 100,
        height: 100,
        right: -36,
        bottom: -46,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}1A, transparent 70%)`,
        pointerEvents: 'none',
      },
      '&:hover': {
        borderColor: `${accent}80`,
        transform: 'translateY(-3px)',
        boxShadow: `0 16px 30px ${accent}26`,
      },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, position: 'relative', zIndex: 1 }}>
      <Box sx={{ fontSize: compact ? 10.5 : 11.5, fontWeight: 700, lineHeight: 1.25, color: darkMode ? '#CBD5E1' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </Box>
      <Box
        sx={{
          width: compact ? 30 : 36,
          height: compact ? 30 : 36,
          borderRadius: 2.25,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          color: '#fff',
          background: `linear-gradient(135deg, ${accent}, ${accent2})`,
          boxShadow: `0 8px 16px ${accent}40`,
          '& svg': { fontSize: compact ? 16 : 18 },
        }}
      >
        {icon}
      </Box>
    </Box>
    <Box sx={{ mt: 0.6, position: 'relative', zIndex: 1, fontSize: smallValue ? 15 : compact ? 24 : 28, fontWeight: 800, lineHeight: 1.15, letterSpacing: smallValue ? 0 : '-0.02em', color: darkMode ? '#F8FAFC' : '#0F172A' }}>
      {value}
    </Box>
  </Box>
);
