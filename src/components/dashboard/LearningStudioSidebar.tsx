import React from 'react';
import { Box, Button, Chip, LinearProgress, Paper, Stack, Tooltip, Typography } from '@mui/material';
import {
  BookMarked,
  BookOpen,
  Clock3,
  Download,
  Flame,
  Home,
  LayoutGrid,
  Lightbulb,
  Palette,
  UserRound,
} from 'lucide-react';

export type LearningView = 'overview' | 'courses' | 'bookmarks' | 'notes' | 'history' | 'downloads';

export interface LearningSidebarCounts {
  courses: number;
  bookmarks: number;
  notes: number;
  history: number;
  downloads: number;
}

export interface LearningCategory {
  label: string;
  query: string;
}

export const LEARNING_CATEGORIES: LearningCategory[] = [
  { label: 'Development', query: 'full stack web development tutorial' },
  { label: 'Data Science', query: 'data science and machine learning tutorial' },
  { label: 'Design', query: 'ui ux design tutorial' },
  { label: 'Personal Growth', query: 'career growth and communication skills' },
];

const quickLinks: Array<{
  view: LearningView;
  label: string;
  Icon: typeof Home;
  countKey?: keyof LearningSidebarCounts;
}> = [
  { view: 'overview', label: 'Overview', Icon: Home },
  { view: 'courses', label: 'My Courses', Icon: BookOpen, countKey: 'courses' },
  { view: 'bookmarks', label: 'Bookmarks', Icon: BookMarked, countKey: 'bookmarks' },
  { view: 'notes', label: 'My Notes', Icon: LayoutGrid, countKey: 'notes' },
  { view: 'history', label: 'History', Icon: Clock3, countKey: 'history' },
  { view: 'downloads', label: 'Downloads', Icon: Download, countKey: 'downloads' },
];

const categoryIcons: Record<string, typeof Home> = {
  Development: LayoutGrid,
  'Data Science': Lightbulb,
  Design: Palette,
  'Personal Growth': UserRound,
};

interface LearningStudioSidebarProps {
  activeView: LearningView;
  onViewChange: (view: LearningView) => void;
  counts: LearningSidebarCounts;
  activeCategory: string;
  onCategorySelect: (category: LearningCategory) => void;
  onUpgrade: () => void;
  streak: number;
  todayMinutes: number;
  dailyGoalMinutes: number;
  isPremium?: boolean;
}

export const LearningStudioSidebar: React.FC<LearningStudioSidebarProps> = ({
  activeView,
  onViewChange,
  counts,
  activeCategory,
  onCategorySelect,
  onUpgrade,
  streak,
  todayMinutes,
  dailyGoalMinutes,
  isPremium = false,
}) => {
  const goalProgress = Math.min(100, Math.round((todayMinutes / Math.max(1, dailyGoalMinutes)) * 100));

  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          border: (theme) => `1px solid ${theme.palette.divider}`,
          p: { xs: 1, sm: 1.25 },
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: 0.9,
              textTransform: 'uppercase',
              color: 'text.secondary',
              flexShrink: 0,
            }}
          >
            Learning Studio
          </Typography>

          <Stack
            direction="row"
            sx={{
              flex: 1,
              minWidth: 0,
              overflowX: 'auto',
              gap: 0.5,
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            {quickLinks.map(({ view, label, Icon, countKey }) => {
              const active = activeView === view;
              const count = countKey ? counts[countKey] : 0;
              return (
                <Box
                  key={label}
                  component="button"
                  type="button"
                  onClick={() => onViewChange(view)}
                  aria-current={active ? 'page' : undefined}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.7,
                    px: 1.1,
                    py: 0.8,
                    flexShrink: 0,
                    border: 'none',
                    borderRadius: 1.5,
                    bgcolor: active
                      ? (theme) => (theme.palette.mode === 'dark' ? 'rgba(88, 101, 242, 0.2)' : 'rgba(79, 70, 229, 0.1)')
                      : 'transparent',
                    color: active ? 'primary.main' : 'text.primary',
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.82rem',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: (theme) => theme.palette.action.hover },
                  }}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                  {countKey && count > 0 && (
                    <Box component="span" sx={{ fontSize: '0.66rem', fontWeight: 800, color: 'text.secondary' }}>
                      {count > 99 ? '99+' : count}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Stack>

          <Tooltip title={`${streak} day learning streak`}>
            <Chip
              size="small"
              icon={<Flame size={13} />}
              label={streak}
              color={streak > 0 ? 'warning' : 'default'}
              variant={streak > 0 ? 'filled' : 'outlined'}
              sx={{ height: 24, flexShrink: 0, fontWeight: 800, fontSize: '0.7rem', '& .MuiChip-icon': { ml: 0.6 } }}
            />
          </Tooltip>
        </Stack>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          sx={{
            mt: 1,
            pt: 1,
            gap: 1.5,
            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack direction="row" sx={{ flex: 1, minWidth: 0, overflowX: 'auto', gap: 0.4 }}>
            {LEARNING_CATEGORIES.map((category) => {
              const Icon = categoryIcons[category.label] || LayoutGrid;
              const active = activeCategory === category.label;
              return (
                <Box
                  key={category.label}
                  component="button"
                  type="button"
                  onClick={() => onCategorySelect(category)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.7,
                    px: 1,
                    py: 0.65,
                    flexShrink: 0,
                    border: 'none',
                    borderRadius: 1.4,
                    bgcolor: active ? (theme) => theme.palette.action.selected : 'transparent',
                    color: active ? 'primary.main' : 'text.secondary',
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.78rem',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: (theme) => theme.palette.action.hover },
                  }}
                >
                  <Icon size={14} />
                  <span>{category.label}</span>
                </Box>
              );
            })}
          </Stack>

          <Box
          sx={{
            width: { xs: '100%', md: 190 },
            flexShrink: 0,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 800 }}>Today&apos;s goal</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 700 }}>
              {todayMinutes}/{dailyGoalMinutes} min
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={goalProgress}
            color={goalProgress >= 100 ? 'success' : 'primary'}
            sx={{ height: 5, borderRadius: 3 }}
          />
          </Box>

          {!isPremium && (
            <Button
              size="small"
              variant="contained"
              onClick={onUpgrade}
              sx={{ flexShrink: 0, textTransform: 'none', fontWeight: 700 }}
            >
              Upgrade
            </Button>
          )}
        </Stack>
      </Paper>
    </Box>
  );
};
