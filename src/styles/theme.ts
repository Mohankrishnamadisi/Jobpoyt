import { createTheme, ThemeProvider } from '@mui/material/styles';

type ThemeMode = 'light' | 'dark' | 'professional' | 'modern';

const createAppTheme = (themeMode: ThemeMode) => {
  const paletteByMode = {
    light: {
      mode: 'light',
      primary: { main: '#2563EB', dark: '#1D4ED8', light: '#BFDBFE', contrastText: '#FFFFFF' },
      secondary: { main: '#0F766E', dark: '#115E59', light: '#99F6E4', contrastText: '#FFFFFF' },
      success: { main: '#16A34A', light: '#DCFCE7', contrastText: '#0F172A' },
      warning: { main: '#F59E0B', light: '#FEF3C7', contrastText: '#0F172A' },
      error: { main: '#DC2626', light: '#FECACA', contrastText: '#FFFFFF' },
      background: { default: '#F8FAFC', paper: '#FFFFFF' },
      text: { primary: '#0F172A', secondary: '#475569' },
      divider: '#E2E8F0',
    },
    dark: {
      mode: 'dark',
      primary: { main: '#60A5FA', dark: '#2563EB', light: '#93C5FD', contrastText: '#0F172A' },
      secondary: { main: '#C084FC', dark: '#9333EA', light: '#E9D5FF', contrastText: '#0F172A' },
      success: { main: '#22C55E', light: '#A7F3D0', contrastText: '#0F172A' },
      warning: { main: '#FBBF24', light: '#FDE68A', contrastText: '#0F172A' },
      error: { main: '#F87171', light: '#FECACA', contrastText: '#0F172A' },
      background: { default: '#020617', paper: '#111827' },
      text: { primary: '#F8FAFC', secondary: '#CBD5E1' },
      divider: '#334155',
    },
    professional: {
      mode: 'light',
      primary: { main: '#1E40AF', dark: '#1D4ED8', light: '#93C5FD', contrastText: '#FFFFFF' },
      secondary: { main: '#475569', dark: '#0F172A', light: '#E2E8F0', contrastText: '#FFFFFF' },
      success: { main: '#15803D', light: '#D1FAE5', contrastText: '#0F172A' },
      warning: { main: '#B45309', light: '#FDE68A', contrastText: '#0F172A' },
      error: { main: '#B91C1C', light: '#FECACA', contrastText: '#FFFFFF' },
      background: { default: '#F3F4F6', paper: '#FFFFFF' },
      text: { primary: '#0F172A', secondary: '#475569' },
      divider: '#CBD5E1',
    },
    modern: {
      mode: 'light',
      primary: { main: '#7C3AED', dark: '#6D28D9', light: '#DDD6FE', contrastText: '#FFFFFF' },
      secondary: { main: '#0EA5E9', dark: '#0284C7', light: '#CFFAFE', contrastText: '#0F172A' },
      success: { main: '#14B8A6', light: '#CCFBF1', contrastText: '#0F172A' },
      warning: { main: '#F59E0B', light: '#FEF3C7', contrastText: '#0F172A' },
      error: { main: '#EF4444', light: '#FECACA', contrastText: '#FFFFFF' },
      background: { default: '#F7F3FF', paper: '#FFFFFF' },
      text: { primary: '#111827', secondary: '#4B5563' },
      divider: '#E5E7EB',
    },
  } as const;

  const palette = paletteByMode[themeMode];

  const appTheme = createTheme({
    palette,
    breakpoints: {
      values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
    },
    typography: {
      fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
      h1: {
        fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em',
        '@media (max-width:599.95px)': { fontSize: '2.1rem', lineHeight: 1.15, letterSpacing: '-0.02em' },
      },
      h2: {
        fontSize: '2.6rem', fontWeight: 800, lineHeight: 1.1,
        '@media (max-width:599.95px)': { fontSize: '1.7rem', lineHeight: 1.18 },
      },
      h3: {
        fontSize: '2rem', fontWeight: 700, lineHeight: 1.15,
        '@media (max-width:599.95px)': { fontSize: '1.4rem', lineHeight: 1.2 },
      },
      h4: {
        fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.3,
        '@media (max-width:599.95px)': { fontSize: '1.2rem' },
      },
      h5: {
        fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.35,
        '@media (max-width:599.95px)': { fontSize: '1.05rem' },
      },
      h6: {
        fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.45,
        '@media (max-width:599.95px)': { fontSize: '0.95rem' },
      },
      body1: { fontSize: '1rem', lineHeight: 1.7 },
      body2: { fontSize: '0.95rem', lineHeight: 1.65 },
      button: { textTransform: 'none', fontWeight: 700 },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            background: palette.mode === 'dark'
              ? palette.background.default
              : `radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), transparent 24%), radial-gradient(circle at right center, rgba(124, 58, 237, 0.08), transparent 22%), ${palette.background.default}`,
            backgroundColor: palette.background.default,
            color: palette.text.primary,
            minHeight: '100vh',
            fontSmooth: 'always',
          },
          '#root': {
            minHeight: '100vh',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.84)',
            backdropFilter: 'blur(18px)',
            borderBottom: `1px solid ${palette.divider}`,
            boxShadow: 'none',
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: 72,
            '@media (max-width:600px)': {
              minHeight: 56,
              paddingLeft: 12,
              paddingRight: 12,
            },
          },
        },
      },
      MuiContainer: {
        styleOverrides: {
          root: {
            '@media (max-width:600px)': {
              paddingLeft: 14,
              paddingRight: 14,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: palette.mode === 'dark'
              ? '0 24px 80px rgba(15, 23, 42, 0.42)'
              : '0 18px 70px rgba(15, 23, 42, 0.08)',
            backgroundColor: palette.mode === 'dark' ? '#111827' : '#FFFFFF',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            background: palette.mode === 'dark'
              ? 'linear-gradient(180deg, rgba(15,23,42,0.96), rgba(17,24,39,0.94))'
              : 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))',
            border: `1px solid ${palette.mode === 'dark' ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.16)'}`,
            borderRadius: 8,
            boxShadow: palette.mode === 'dark'
              ? '0 30px 90px rgba(15, 23, 42, 0.38)'
              : '0 24px 70px rgba(15, 23, 42, 0.08)',
            transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 8,
            padding: '12px 24px',
            boxShadow: 'none',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
            '@media (max-width:600px)': {
              padding: '9px 16px',
              fontSize: '0.875rem',
            },
          },
          containedPrimary: {
            background: palette.primary.main,
            color: palette.primary.contrastText,
            '&:hover': {
              background: palette.primary.dark,
              boxShadow: `0 16px 30px ${palette.mode === 'dark' ? 'rgba(96, 165, 250, 0.24)' : 'rgba(37, 99, 235, 0.24)'}`,
              transform: 'translateY(-1px)',
            },
          },
          containedSecondary: {
            background: palette.secondary.main,
            color: palette.secondary.contrastText,
            '&:hover': {
              background: palette.secondary.dark,
              transform: 'translateY(-1px)',
            },
          },
          outlined: {
            borderWidth: 1,
            borderColor: palette.divider,
            color: palette.text.primary,
            backgroundColor: palette.mode === 'dark' ? '#0F172A' : '#FFFFFF',
            '&:hover': {
              borderColor: palette.primary.main,
              backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(37,99,235,0.08)',
              transform: 'translateY(-1px)',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              backgroundColor: palette.mode === 'dark' ? '#111827' : '#FFFFFF',
              color: palette.text.primary,
              '& fieldset': {
                borderColor: palette.divider,
              },
              '&:hover fieldset': {
                borderColor: palette.primary.main,
              },
              '&.Mui-focused fieldset': {
                borderColor: palette.primary.main,
                borderWidth: 1.5,
              },
            },
            '& .MuiInputLabel-root': {
              color: palette.text.secondary,
            },
            '& .MuiInputBase-input': {
              color: palette.text.primary,
            },
            '& .MuiInputBase-input::placeholder': {
              color: palette.text.secondary,
              opacity: 1,
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          outlined: {
            backgroundColor: palette.mode === 'dark' ? '#111827' : '#FFFFFF',
            color: palette.text.primary,
            '& .MuiSelect-icon': {
              color: palette.text.secondary,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 700,
            color: palette.text.primary,
            backgroundColor: palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.12)' : 'rgba(37, 99, 235, 0.08)',
          },
          outlined: {
            borderColor: palette.divider,
            backgroundColor: palette.mode === 'dark' ? '#111827' : '#F8FAFC',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottomColor: palette.divider,
          },
          head: {
            color: palette.text.primary,
            backgroundColor: palette.mode === 'dark' ? '#111827' : '#F1F5F9',
          },
        },
      },
    },
  });

  return appTheme;
};

export const getTheme = createAppTheme;
export const theme = createAppTheme('professional');
export { ThemeProvider };
