import React, { useMemo, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  IconButton,
  InputBase,
  MenuItem,
  Paper,
  Popover,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpNarrowWide,
  BarChart3,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Clock4,
  Compass,
  Flame,
  GraduationCap,
  MessagesSquare,
  NotebookPen,
  Play,
  Rocket,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';

export type DifficultyFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';
export type DurationFilter = 'all' | 'short' | 'medium' | 'long';
export type SortFilter = 'relevance' | 'newest' | 'popular';

interface LearningCommandCenterProps {
  userName?: string;
  videosWatched?: number;
  learningStreak?: number;
  notesCreated?: number;
  topics: string[];
  activeTopic: string;
  onTopicChange: (topic: string) => void;
  onSearch: (query: string) => void;
  onFilterChange: (filters: {
    difficulty: DifficultyFilter;
    duration: DurationFilter;
    sort: SortFilter;
  }) => void;
  isLoading?: boolean;
}

const MotionPaper = motion(Paper);
const MotionBox = motion(Box);

const mapDurationLabel = (duration: DurationFilter) => {
  if (duration === 'short') return 'Under 10 min';
  if (duration === 'medium') return '10-30 min';
  if (duration === 'long') return '30+ min';
  return 'All';
};

const PATH_PALETTE = [
  { color: '#4F46E5', soft: 'rgba(79, 70, 229, 0.12)', gradient: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)' },
  { color: '#0EA5E9', soft: 'rgba(14, 165, 233, 0.12)', gradient: 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%)' },
  { color: '#059669', soft: 'rgba(5, 150, 105, 0.12)', gradient: 'linear-gradient(135deg, #047857 0%, #10B981 100%)' },
  { color: '#D97706', soft: 'rgba(217, 119, 6, 0.12)', gradient: 'linear-gradient(135deg, #B45309 0%, #F59E0B 100%)' },
  { color: '#DB2777', soft: 'rgba(219, 39, 119, 0.12)', gradient: 'linear-gradient(135deg, #BE185D 0%, #EC4899 100%)' },
  { color: '#7C3AED', soft: 'rgba(124, 58, 237, 0.12)', gradient: 'linear-gradient(135deg, #6D28D9 0%, #A855F7 100%)' },
];

/** Splits a raw topic string into a readable title + the kind of path it is. */const describeTopic = (topic: string) => {
  const value = topic.trim();
  const lower = value.toLowerCase();

  if (lower.endsWith('interview questions')) {
    return { title: value.slice(0, -'interview questions'.length).trim(), kind: 'Interview prep', Icon: MessagesSquare };
  }
  if (lower.endsWith('interview preparation')) {
    return { title: value.slice(0, -'interview preparation'.length).trim(), kind: 'Interview prep', Icon: MessagesSquare };
  }
  if (lower.endsWith('tutorial')) {
    return { title: value.slice(0, -'tutorial'.length).trim(), kind: 'Tutorial series', Icon: GraduationCap };
  }
  if (lower.endsWith('career skills')) {
    return { title: value.slice(0, -'career skills'.length).trim(), kind: 'Career skills', Icon: Rocket };
  }
  return { title: value, kind: 'Learning path', Icon: Compass };
};

interface FilterSectionProps<T extends string> {
  label: string;
  icon: React.ReactNode;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

const FilterSection = <T extends string>({ label, icon, value, options, onChange }: FilterSectionProps<T>) => (
  <Box>
    <Stack direction="row" alignItems="center" spacing={0.8} sx={{ mb: 0.9 }}>
      <Box sx={{ display: 'flex', color: '#64748B' }}>{icon}</Box>
      <Typography
        sx={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: 0.7, textTransform: 'uppercase', color: '#475569' }}
      >
        {label}
      </Typography>
    </Stack>

    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_, next) => {
        if (next) onChange(next as T);
      }}
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.7,
        '& .MuiToggleButtonGroup-grouped': {
          flex: '1 1 auto',
          m: 0,
          px: 1.4,
          py: 0.55,
          border: '1px solid rgba(148, 163, 184, 0.38) !important',
          borderRadius: '999px !important',
          textTransform: 'none',
          fontWeight: 700,
          fontSize: '0.78rem',
          color: '#475569',
          transition: 'all 0.18s ease',
          '&:hover': { borderColor: 'rgba(37, 99, 235, 0.6) !important', bgcolor: 'rgba(37, 99, 235, 0.06)' },
          '&.Mui-selected': {
            color: '#fff',
            borderColor: 'transparent !important',
            background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
            boxShadow: '0 6px 14px rgba(37, 99, 235, 0.3)',
            '&:hover': { background: 'linear-gradient(135deg, #1D4ED8 0%, #4338CA 100%)' },
          },
        },
      }}
    >
      {options.map((option) => (
        <ToggleButton key={option.value} value={option.value} disableRipple>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  </Box>
);

export const LearningCommandCenter: React.FC<LearningCommandCenterProps> = ({
  userName = 'there',
  videosWatched = 0,
  learningStreak = 0,
  notesCreated = 0,
  topics,
  activeTopic,
  onTopicChange,
  onSearch,
  onFilterChange,
  isLoading = false,
}) => {
  const firstName = userName && userName !== 'there' ? userName.split(' ')[0] : 'there';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [duration, setDuration] = useState<DurationFilter>('all');
  const [sort, setSort] = useState<SortFilter>('relevance');
  const [topicFilter, setTopicFilter] = useState('all');
  const pathScrollRef = useRef<HTMLDivElement | null>(null);

  const scrollPaths = (direction: -1 | 1) => {
    pathScrollRef.current?.scrollBy({ left: direction * 320, behavior: 'smooth' });
  };

  const filterOpen = Boolean(filterAnchorEl);
  const activeFiltersCount =
    (topicFilter !== 'all' ? 1 : 0) +
    (difficulty !== 'all' ? 1 : 0) +
    (duration !== 'all' ? 1 : 0) +
    (sort !== 'relevance' ? 1 : 0);

  const topicOptions = useMemo(() => {
    const base = ['React', 'HTML', 'JavaScript', 'Redux', 'TypeScript'];
    const merged = [...base, ...topics.map((topic) => topic.trim()).filter(Boolean)];
    return Array.from(new Set(merged)).slice(0, 12);
  }, [topics]);

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onDelete: () => void }> = [];

    if (topicFilter !== 'all') {
      chips.push({
        key: 'topic',
        label: topicFilter,
        onDelete: () => {
          setTopicFilter('all');
        },
      });
    }

    if (difficulty !== 'all') {
      chips.push({
        key: 'difficulty',
        label: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
        onDelete: () => {
          const nextDifficulty: DifficultyFilter = 'all';
          setDifficulty(nextDifficulty);
          onFilterChange({ difficulty: nextDifficulty, duration, sort });
        },
      });
    }

    if (duration !== 'all') {
      chips.push({
        key: 'duration',
        label: mapDurationLabel(duration),
        onDelete: () => {
          const nextDuration: DurationFilter = 'all';
          setDuration(nextDuration);
          onFilterChange({ difficulty, duration: nextDuration, sort });
        },
      });
    }

    if (sort !== 'relevance') {
      chips.push({
        key: 'sort',
        label: sort === 'newest' ? 'Newest' : 'Most Popular',
        onDelete: () => {
          const nextSort: SortFilter = 'relevance';
          setSort(nextSort);
          onFilterChange({ difficulty, duration, sort: nextSort });
        },
      });
    }

    return chips;
  }, [difficulty, duration, sort, topicFilter, onFilterChange]);

  const handleSearch = () => {
    const query = searchQuery.trim();
    if (query) onSearch(query);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleOpenFilters = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleCloseFilters = () => {
    setFilterAnchorEl(null);
  };

  const handleResetFilters = () => {
    const nextDifficulty: DifficultyFilter = 'all';
    const nextDuration: DurationFilter = 'all';
    const nextSort: SortFilter = 'relevance';
    setDifficulty(nextDifficulty);
    setDuration(nextDuration);
    setSort(nextSort);
    setTopicFilter('all');
    onFilterChange({ difficulty: nextDifficulty, duration: nextDuration, sort: nextSort });
  };

  const handleApplyFilters = () => {
    onFilterChange({ difficulty, duration, sort });
    handleCloseFilters();
  };

  const stats = [
    {
      key: 'watched',
      label: 'Videos Watched',
      value: videosWatched,
      Icon: Play,
      iconColor: '#60A5FA',
      glow: 'rgba(37, 99, 235, 0.4)',
    },
    {
      key: 'streak',
      label: 'Learning Streak',
      value: learningStreak,
      Icon: Flame,
      iconColor: '#FB923C',
      glow: 'rgba(249, 115, 22, 0.4)',
    },
    {
      key: 'notes',
      label: 'Notes Created',
      value: notesCreated,
      Icon: NotebookPen,
      iconColor: '#C4B5FD',
      glow: 'rgba(124, 58, 237, 0.42)',
    },
  ];

  return (
    <MotionPaper
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      elevation={0}
      sx={{
        position: 'relative',
        isolation: 'isolate',
        width: '100%',
        minHeight: { xs: 0, sm: 500, lg: 520 },
        mb: 2.5,
        borderRadius: { xs: '20px', sm: '26px' },
        overflow: 'hidden',
        border: '1px solid rgba(148, 197, 255, 0.28)',
        backgroundImage: "url('/images/learning-hero.png')",
        backgroundSize: 'cover',
        backgroundPosition: { xs: '66% center', sm: '62% center', lg: 'center center' },
        backgroundRepeat: 'no-repeat',
        boxShadow: '0 24px 60px rgba(3, 15, 35, 0.28)',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: -1,
          pointerEvents: 'none',
          background:
            'linear-gradient(90deg, rgba(3, 15, 35, 0.96) 0%, rgba(3, 15, 35, 0.88) 34%, rgba(4, 20, 42, 0.6) 58%, rgba(4, 20, 42, 0.16) 100%)',
          '@media (max-width: 899px)': {
            background:
              'linear-gradient(90deg, rgba(3, 15, 35, 0.96) 0%, rgba(3, 15, 35, 0.84) 58%, rgba(4, 20, 42, 0.48) 100%)',
          },
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          width: { xs: '100%', lg: '64%' },
          minHeight: 'inherit',
          p: { xs: 2, sm: 2.75, md: 3.25, lg: 3.5 },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.75,
              mb: 1.4,
              borderRadius: '999px',
              color: '#fff',
              bgcolor: 'rgba(7, 26, 51, 0.48)',
              border: '1px solid rgba(147, 197, 253, 0.35)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.16)',
            }}
          >
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  color: '#FBBF24',
                  bgcolor: 'rgba(251, 191, 36, 0.12)',
                  boxShadow: '0 0 18px rgba(251, 191, 36, 0.25)',
                }}
              >
                <BookOpenText size={14} />
              </Box>
              <Typography
                sx={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: 1.3,
                  textTransform: 'uppercase',
                  color: '#fff',
                }}
              >
                Learning Studio
              </Typography>
          </Box>

          <Typography
            component="h1"
            sx={{
              m: 0,
              maxWidth: 720,
              fontFamily: 'Sora, Manrope, sans-serif',
              fontSize: { xs: '1.85rem', sm: '2.3rem', md: '2.65rem', lg: '2.8rem' },
              fontWeight: 800,
              letterSpacing: 0,
              lineHeight: 1.06,
              color: '#fff',
              textShadow: '0 4px 24px rgba(0, 0, 0, 0.24)',
            }}
          >
            Learn Today,
            <Box component="span" sx={{ display: 'block', whiteSpace: { md: 'nowrap' } }}>
              Build a{' '}
              <Box
                component="span"
                sx={{
                  color: '#FBBF24',
                  background: 'linear-gradient(90deg, #FDE68A 0%, #FBBF24 58%, #F59E0B 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Brighter Tomorrow
              </Box>
            </Box>
          </Typography>

          <Typography
            sx={{
              mt: 1.1,
              color: 'rgba(255, 255, 255, 0.94)',
              fontSize: { xs: '0.9rem', sm: '0.96rem' },
              lineHeight: 1.5,
              maxWidth: 630,
              textShadow: '0 2px 14px rgba(0, 0, 0, 0.3)',
            }}
          >
            Gain in-demand skills, learn from industry experts and get closer to your dream career.
          </Typography>
          <Typography sx={{ mt: 0.45, color: '#BFDBFE', fontSize: '0.8rem', fontWeight: 600 }}>
            Continue your learning journey, {firstName}.
          </Typography>
        </Box>

        <MotionBox
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.18 }}
          sx={{ mt: { xs: 1.8, md: 2 } }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch">
              <Paper
                elevation={0}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: { xs: 52, sm: 54 },
                  p: 0.65,
                  pl: 1.5,
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  bgcolor: 'rgba(255, 255, 255, 0.94)',
                  flex: 1,
                  boxShadow: '0 14px 32px rgba(0, 0, 0, 0.2)',
                  transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                  '&:focus-within': {
                    borderColor: 'rgba(251, 191, 36, 0.85)',
                    boxShadow: '0 0 0 3px rgba(251, 191, 36, 0.2), 0 14px 32px rgba(0, 0, 0, 0.22)',
                  },
                }}
              >
                <Search size={19} color="#475569" />
                <InputBase
                  fullWidth
                  placeholder="Search for courses, skills, or topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  disabled={isLoading}
                  sx={{ ml: 1.1, fontSize: { xs: '0.88rem', sm: '0.95rem' }, color: '#0F172A' }}
                />
                {searchQuery && (
                  <Tooltip title="Clear search">
                    <IconButton onClick={handleClearSearch} size="small" sx={{ color: '#475569' }}>
                      <X size={16} />
                    </IconButton>
                  </Tooltip>
                )}
                <Button
                  variant="contained"
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || isLoading}
                  endIcon={<ArrowRight size={16} />}
                  sx={{
                    display: { xs: 'none', sm: 'inline-flex' },
                    minHeight: 42,
                    px: 2.2,
                    borderRadius: '12px',
                    color: '#172033',
                    bgcolor: '#FBBF24',
                    fontWeight: 800,
                    boxShadow: '0 8px 20px rgba(245, 158, 11, 0.3)',
                    '&:hover': { bgcolor: '#F59E0B', transform: 'scale(1.02)' },
                    '&.Mui-disabled': { bgcolor: 'rgba(251, 191, 36, 0.45)', color: 'rgba(23, 32, 51, 0.55)' },
                  }}
                >
                  Search
                </Button>
              </Paper>

              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || isLoading}
                  sx={{
                    display: { xs: 'inline-flex', sm: 'none' },
                    flex: 1,
                    minHeight: 52,
                    borderRadius: '14px',
                    color: '#172033',
                    bgcolor: '#FBBF24',
                    fontWeight: 800,
                    '&:hover': { bgcolor: '#F59E0B' },
                  }}
                  startIcon={<Search size={16} />}
                >
                  Search
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleOpenFilters}
                  sx={{
                    flex: { xs: 1, sm: '0 0 auto' },
                    minHeight: { xs: 48, sm: 54 },
                    px: 2,
                    borderRadius: '14px',
                    fontWeight: 800,
                    borderColor: 'rgba(255, 255, 255, 0.35)',
                    color: '#fff',
                    bgcolor: 'rgba(7, 26, 51, 0.46)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': { borderColor: '#FBBF24', bgcolor: 'rgba(7, 26, 51, 0.68)' },
                  }}
                  startIcon={
                    <Badge badgeContent={activeFiltersCount} color="primary" invisible={!activeFiltersCount}>
                      <SlidersHorizontal size={16} />
                    </Badge>
                  }
                >
                  Filters
                </Button>
              </Stack>
          </Stack>

            {activeFilterChips.length > 0 && (
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.3 }}>
                {activeFilterChips.map((chip) => (
                  <Chip
                    key={chip.key}
                    label={chip.label}
                    onDelete={chip.onDelete}
                    size="small"
                    sx={{
                      color: '#fff',
                      fontWeight: 700,
                      bgcolor: 'rgba(37, 99, 235, 0.32)',
                      border: '1px solid rgba(147, 197, 253, 0.38)',
                      backdropFilter: 'blur(8px)',
                      '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.8)' },
                    }}
                  />
                ))}
              </Stack>
            )}
        </MotionBox>

        <MotionBox
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.24 }}
          sx={{ mt: { xs: 1.5, md: 1.6 }, minWidth: 0 }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            sx={{ mb: 0.8 }}
          >
            <Stack direction="row" alignItems="center" spacing={1.1}>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: '#fff' }}>Popular:</Typography>
              <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontSize: '0.74rem', color: 'rgba(255,255,255,0.64)' }}>
                Personalized learning paths
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', sm: 'flex' } }}>
              <IconButton
                size="small"
                onClick={() => scrollPaths(-1)}
                aria-label="Scroll learning paths left"
                sx={{
                  border: '1px solid rgba(148, 163, 184, 0.35)',
                  color: '#fff',
                  bgcolor: 'rgba(7, 26, 51, 0.45)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.14)', borderColor: '#FBBF24', color: '#FBBF24' },
                }}
              >
                <ChevronLeft size={16} />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => scrollPaths(1)}
                aria-label="Scroll learning paths right"
                sx={{
                  border: '1px solid rgba(148, 163, 184, 0.35)',
                  color: '#fff',
                  bgcolor: 'rgba(7, 26, 51, 0.45)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.14)', borderColor: '#FBBF24', color: '#FBBF24' },
                }}
              >
                <ChevronRight size={16} />
              </IconButton>
            </Stack>
          </Stack>

          <Box sx={{ position: 'relative' }}>
            <Box
              ref={pathScrollRef}
              sx={{
                display: 'flex',
                gap: 1.2,
                overflowX: 'auto',
                pt: 0.3,
                pb: 0.6,
                px: 0.4,
                mx: -0.4,
                scrollSnapType: 'x mandatory',
                scrollPaddingLeft: '4px',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              {topics.map((topic, index) => {
                const selected = topic === activeTopic;
                const { title, kind, Icon } = describeTopic(topic);
                const palette = PATH_PALETTE[index % PATH_PALETTE.length];

                return (
                  <MotionPaper
                    key={topic}
                    elevation={0}
                    onClick={() => onTopicChange(topic)}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                    sx={{
                      flex: '0 0 auto',
                      width: 'auto',
                      maxWidth: 230,
                      px: 1.3,
                      py: 0.65,
                      cursor: 'pointer',
                      borderRadius: '999px',
                      scrollSnapAlign: 'start',
                      border: '1px solid rgba(255, 255, 255, 0.24)',
                      background: selected ? palette.gradient : 'rgba(7, 26, 51, 0.42)',
                      backdropFilter: 'blur(10px)',
                      color: '#fff',
                      boxShadow: selected
                        ? '0 8px 24px rgba(0, 0, 0, 0.24)'
                        : '0 4px 14px rgba(0, 0, 0, 0.12)',
                      transition: 'box-shadow 0.22s ease, border-color 0.22s ease',
                      '&:hover': {
                        borderColor: selected ? 'rgba(255,255,255,0.35)' : 'rgba(251, 191, 36, 0.65)',
                        boxShadow: selected
                          ? '0 14px 28px rgba(15, 23, 42, 0.24)'
                          : `0 10px 22px ${palette.soft}, 0 4px 12px rgba(0, 0, 0, 0.18)`,
                      },
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1.1}>
                      <Box
                        sx={{
                          width: 27,
                          height: 27,
                          flexShrink: 0,
                          borderRadius: 1.6,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: selected ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255,255,255,0.1)',
                          color: selected ? '#fff' : '#FBBF24',
                        }}
                      >
                        <Icon size={14} />
                      </Box>

                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          noWrap
                          sx={{ fontSize: '0.78rem', fontWeight: 800, lineHeight: 1.2, textTransform: 'capitalize' }}
                        >
                          {title}
                        </Typography>
                        <Typography
                          noWrap
                          sx={{
                            fontSize: '0.64rem',
                            fontWeight: 600,
                            color: 'rgba(255,255,255,0.65)',
                          }}
                        >
                          {kind}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', opacity: selected ? 1 : 0.4, flexShrink: 0 }}>
                        <ArrowRight size={15} />
                      </Box>
                    </Stack>
                  </MotionPaper>
                );
              })}
            </Box>
          </Box>
        </MotionBox>

        <Stack
          direction="row"
          divider={<Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.18)' }} />}
          sx={{
            mt: 'auto',
            pt: { xs: 0.8, sm: 1 },
            width: '100%',
            overflow: 'hidden',
          }}
        >
          {stats.map(({ key, label, value, Icon, iconColor, glow }, index) => (
            <MotionBox
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.34 + index * 0.08 }}
              sx={{
                flex: 1,
                minWidth: 0,
                px: { xs: 0.7, sm: 1.5 },
                py: 0.75,
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 0.7, sm: 1 },
                bgcolor: 'rgba(7, 26, 51, 0.3)',
                backdropFilter: 'blur(8px)',
                '&:first-of-type': { borderRadius: '14px 0 0 14px' },
                '&:last-of-type': { borderRadius: '0 14px 14px 0' },
              }}
            >
              <Box
                sx={{
                  width: { xs: 28, sm: 34 },
                  height: { xs: 28, sm: 34 },
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  color: iconColor,
                  bgcolor: 'rgba(255,255,255,0.08)',
                  boxShadow: `0 0 18px ${glow}`,
                }}
              >
                <Icon size={16} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: '#fff', fontSize: { xs: '0.95rem', sm: '1.18rem' }, fontWeight: 800, lineHeight: 1 }}>
                  {value}
                </Typography>
                <Typography
                  sx={{
                    mt: 0.35,
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: { xs: '0.57rem', sm: '0.68rem' },
                    fontWeight: 600,
                    lineHeight: 1.2,
                  }}
                >
                  {label}
                </Typography>
              </Box>
            </MotionBox>
          ))}
        </Stack>
      </Box>

      <Popover
        open={filterOpen}
        anchorEl={filterAnchorEl}
        onClose={handleCloseFilters}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1.2,
              width: { xs: 'calc(100vw - 32px)', sm: 440 },
              maxWidth: '100%',
              borderRadius: 3,
              overflow: 'hidden',
              border: '1px solid rgba(148, 163, 184, 0.28)',
              boxShadow: '0 24px 48px rgba(15, 23, 42, 0.2)',
            },
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.6,
            display: 'flex',
            alignItems: 'center',
            gap: 1.2,
            color: '#fff',
            background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 45%, #6366F1 100%)',
          }}
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.8,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'rgba(255,255,255,0.18)',
              flexShrink: 0,
            }}
          >
            <SlidersHorizontal size={17} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.98rem', lineHeight: 1.2 }}>Refine results</Typography>
            <Typography sx={{ fontSize: '0.74rem', opacity: 0.85 }}>
              {activeFiltersCount ? `${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} applied` : 'No filters applied'}
            </Typography>
          </Box>

          <Tooltip title="Close">
            <IconButton
              size="small"
              onClick={handleCloseFilters}
              aria-label="Close filters"
              sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' } }}
            >
              <X size={17} />
            </IconButton>
          </Tooltip>
        </Box>

        <Stack spacing={2.2} sx={{ p: 2.2, bgcolor: 'background.paper' }}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={0.8} sx={{ mb: 0.9 }}>
              <Box sx={{ display: 'flex', color: '#64748B' }}>
                <Compass size={14} />
              </Box>
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  letterSpacing: 0.7,
                  textTransform: 'uppercase',
                  color: '#475569',
                }}
              >
                Topic
              </Typography>
            </Stack>

            <FormControl size="small" fullWidth>
              <Select
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                sx={{
                  borderRadius: 2,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.38)' },
                }}
                MenuProps={{ slotProps: { paper: { sx: { borderRadius: 2, maxHeight: 300 } } } }}
              >
                <MenuItem value="all">All topics</MenuItem>
                {topicOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <FilterSection<DifficultyFilter>
            label="Difficulty"
            icon={<BarChart3 size={14} />}
            value={difficulty}
            onChange={setDifficulty}
            options={[
              { value: 'all', label: 'All levels' },
              { value: 'beginner', label: 'Beginner' },
              { value: 'intermediate', label: 'Intermediate' },
              { value: 'advanced', label: 'Advanced' },
            ]}
          />

          <FilterSection<DurationFilter>
            label="Duration"
            icon={<Clock4 size={14} />}
            value={duration}
            onChange={setDuration}
            options={[
              { value: 'all', label: 'Any length' },
              { value: 'short', label: 'Under 10 min' },
              { value: 'medium', label: '10-30 min' },
              { value: 'long', label: '30+ min' },
            ]}
          />

          <FilterSection<SortFilter>
            label="Sort by"
            icon={<ArrowUpNarrowWide size={14} />}
            value={sort}
            onChange={setSort}
            options={[
              { value: 'relevance', label: 'Relevance' },
              { value: 'newest', label: 'Newest' },
              { value: 'popular', label: 'Most popular' },
            ]}
          />
        </Stack>

        <Divider />

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1.5}
          sx={{ px: 2.2, py: 1.5, bgcolor: 'rgba(248, 250, 252, 0.9)' }}
        >
          <Button
            variant="text"
            color="inherit"
            onClick={handleResetFilters}
            disabled={!activeFiltersCount}
            startIcon={<RotateCcw size={14} />}
            sx={{ textTransform: 'none', fontWeight: 700, color: '#64748B' }}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            onClick={handleApplyFilters}
            sx={{
              textTransform: 'none',
              fontWeight: 800,
              px: 2.6,
              borderRadius: 2,
              boxShadow: '0 8px 18px rgba(37, 99, 235, 0.3)',
            }}
          >
            Apply filters
          </Button>
        </Stack>
      </Popover>
    </MotionPaper>
  );
};
