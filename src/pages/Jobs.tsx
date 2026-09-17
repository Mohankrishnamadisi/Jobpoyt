import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Container,
  Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Typography,
  Pagination,
  InputAdornment,
  Paper,
  Autocomplete,
  Chip,
  Collapse,
  IconButton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@store/index';
import { useSubscription } from '@hooks/index';
import {
  Search as SearchIcon,
  Tune as TuneIcon,
  WorkOutline as WorkOutlineIcon,
  PlaceOutlined as PlaceOutlinedIcon,
  AutoAwesome as AutoAwesomeIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { Layout } from '@components/layout/Layout';
import { HorizontalJobListItem } from '@components/jobs/HorizontalJobListItem';
import { JobListSkeleton } from '@components/common/LoadingSkeleton';
import { Error } from '@components/common/Error';
import { jobService } from '@services/api';
import { EMPLOYMENT_TYPES, WORK_MODES, EDUCATION_OPTIONS, FRESHNESS_OPTIONS, INDIAN_CITIES } from '@constants/index';
import type { Job } from '../types';

const MotionPaper = motion(Paper);

const getMultiValues = (params: URLSearchParams, key: string, fallback: string[] = []) => {
  const values = params.getAll(key);
  if (values.length > 0) return values.filter(Boolean);
  const rawValue = params.get(key);
  if (!rawValue) return fallback;
  return rawValue.split(',').map((value) => value.trim()).filter(Boolean);
};

const DEFAULT_LOCATIONS = [
  'India',
  'Hyderabad',
  'Bengaluru',
  'Chennai',
  'Mumbai',
  'Delhi',
  'Pune',
  'Kolkata',
  'Coimbatore',
  'Visakhapatnam',
  'Noida',
  'Gurgaon',
];

export const Jobs: React.FC = () => {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { subscription } = useSubscription(user?.id || null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestRequestRef = useRef(0);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [openSections, setOpenSections] = useState({
    search: true,
    profile: true,
    jobType: true,
    workMode: false,
    category: false,
  });

  const [filters, setFilters] = useState({
    keyword: searchParams.get('keyword') || '',
    location: getMultiValues(searchParams, 'location', DEFAULT_LOCATIONS),
    experience: searchParams.get('experience') || '',
    education: searchParams.get('education') || '',
    freshness: searchParams.get('freshness') || '',
    jobType: [] as string[],
    workMode: [] as string[],
    category: [] as string[],
  });
  const [debouncedKeyword, setDebouncedKeyword] = useState(searchParams.get('keyword') || '');

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const fetchedCategories = await jobService.getCategories();
        setCategories(fetchedCategories);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const debounceTimer = window.setTimeout(() => {
      setDebouncedKeyword(filters.keyword);
    }, 300);

    return () => window.clearTimeout(debounceTimer);
  }, [filters.keyword]);

  useEffect(() => {
    const normalizedKeyword = debouncedKeyword.trim();

    setSearchParams((prev) => {
      const currentKeyword = prev.get('keyword') || '';
      if (currentKeyword === normalizedKeyword) {
        return prev;
      }

      const params = new URLSearchParams(prev);
      params.delete('keyword');
      if (normalizedKeyword) params.set('keyword', normalizedKeyword);
      return params;
    });
  }, [debouncedKeyword, setSearchParams]);

  const syncKeywordToUrl = useCallback((nextKeyword: string) => {
    const normalizedKeyword = nextKeyword.trim();

    setSearchParams((prev) => {
      const currentKeyword = prev.get('keyword') || '';
      if (currentKeyword === normalizedKeyword) {
        return prev;
      }

      const params = new URLSearchParams(prev);
      params.delete('keyword');
      if (normalizedKeyword) params.set('keyword', normalizedKeyword);
      return params;
    });
  }, [setSearchParams]);

  useEffect(() => {
    setFilters((previousFilters) => ({
      keyword: searchParams.get('keyword') || '',
      // Keep the default or an explicitly cleared value when the URL has no location.
      location: searchParams.has('location')
        ? getMultiValues(searchParams, 'location')
        : previousFilters.location,
      experience: searchParams.get('experience') || '',
      education: searchParams.get('education') || '',
      freshness: searchParams.get('freshness') || '',
      jobType: getMultiValues(searchParams, 'jobType'),
      workMode: getMultiValues(searchParams, 'workMode'),
      category: getMultiValues(searchParams, 'category'),
    }));
    setPage(1);
  }, [searchParams]);

  const fetchJobs = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {};
      if (debouncedKeyword) params.keyword = debouncedKeyword;
      if (filters.location.length > 0) params.location = filters.location;
      if (filters.experience) params.experience = filters.experience;
      if (filters.education) params.education = filters.education;
      if (filters.freshness) params.freshness = filters.freshness;
      if (filters.jobType.length > 0) params.jobType = filters.jobType;
      if (filters.workMode.length > 0) params.workMode = filters.workMode;
      if (filters.category.length > 0) params.category = filters.category;

      const { data, total: count } = await jobService.getJobs(params, page, 12);
      if (requestId !== latestRequestRef.current) return;
      setJobs(data);
      setTotal(count);
    } catch (err) {
      if (requestId !== latestRequestRef.current) return;
      let loadError = 'Failed to load jobs';
      if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
        loadError = (err as any).message;
      } else if (typeof err === 'string') {
        loadError = err;
      }
      setError(loadError);
    } finally {
      if (requestId === latestRequestRef.current) {
        setLoading(false);
      }
    }
  }, [
    debouncedKeyword,
    filters.location,
    filters.experience,
    filters.education,
    filters.freshness,
    filters.jobType,
    filters.workMode,
    filters.category,
    page,
  ]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchJobs();
    }, 60000);

    return () => window.clearInterval(interval);
  }, [fetchJobs]);

  const handleFilterChange = (filterName: string, value: unknown) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
    setPage(1);

    if (filterName === 'keyword') {
      syncKeywordToUrl(String(value ?? ''));
      return;
    }

    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.delete(filterName);

      if (Array.isArray(value)) {
        value.forEach((item) => {
          const text = String(item).trim();
          if (text) {
            params.append(filterName, text);
          }
        });
      } else if (value !== null && value !== undefined && String(value).trim() !== '') {
        params.set(filterName, String(value).trim());
      }

      return params;
    });
  };

  const clearFilters = () => {
    setDebouncedKeyword('');
    setFilters({
      keyword: '',
      location: [],
      experience: '',
      education: '',
      freshness: '',
      jobType: [],
      workMode: [],
      category: [],
    });
    setSearchParams(new URLSearchParams());
    setPage(1);
  };

  const itemsPerPage = 12;
  const totalPages = Math.ceil(total / itemsPerPage);

  useEffect(() => {
    if (page > Math.max(totalPages, 1)) {
      setPage(1);
    }
  }, [page, totalPages]);

  if (error) {
    return (
      <Layout>
        <Error message={error} />
      </Layout>
    );
  }

  const searchCount = (filters.keyword ? 1 : 0) + filters.location.length;
  const profileCount = [filters.experience, filters.education, filters.freshness].filter(Boolean).length;
  const jobTypeCount = filters.jobType.length;
  const workModeCount = filters.workMode.length;
  const categoryCount = filters.category.length;
  const activeFiltersCount = [
    filters.keyword,
    ...filters.location,
    filters.experience,
    filters.education,
    filters.freshness,
    ...filters.jobType,
    ...filters.workMode,
    ...filters.category,
  ].filter(Boolean).length;

  const topLocations = jobs
    .map((job) => job.location)
    .filter(Boolean)
    .slice(0, 3)
    .join(' • ');

  const activeFilterChips = [
    filters.keyword ? { key: 'keyword', label: `Keyword: ${filters.keyword}`, value: '' } : null,
    filters.location.length > 0
      ? { key: 'location', label: `Location: ${filters.location.join(', ')}`, value: '' }
      : null,
    filters.experience ? { key: 'experience', label: `Experience: ${filters.experience}`, value: '' } : null,
    filters.education ? { key: 'education', label: `Education: ${filters.education}`, value: '' } : null,
    filters.freshness ? { key: 'freshness', label: `Freshness: ${filters.freshness}`, value: '' } : null,
  ].filter(Boolean) as { key: string; label: string; value: string }[];

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ py: { xs: 1.5, md: 2 } }}>
        <MotionPaper
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          sx={{
            mb: 2,
            p: { xs: 1.5, md: 2 },
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            background:
              'radial-gradient(circle at 15% 25%, rgba(56, 189, 248, 0.22), transparent 40%), radial-gradient(circle at 85% 20%, rgba(59, 130, 246, 0.18), transparent 44%), linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.94))',
            color: '#f8fafc',
            boxShadow: '0 30px 70px rgba(15, 23, 42, 0.26)',
            overflow: 'hidden',
          }}
        >
          <Grid container spacing={2.5} alignItems="center">
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.6 }}>
                <AutoAwesomeIcon sx={{ fontSize: 20, color: '#7dd3fc' }} />
                <Typography variant="overline" sx={{ letterSpacing: 1.4, color: 'rgba(226, 232, 240, 0.9)' }}>
                  Career Discovery
                </Typography>
              </Box>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.15,
                  fontSize: { xs: '1.4rem', md: '1.8rem' },
                  mb: 0.5,
                }}
              >
                Find jobs You Will Actually Love
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(226, 232, 240, 0.9)', maxWidth: 680 }}>
                Discover {total} verified openings with smart filters across roles, cities, and work styles.
              </Typography>
              {topLocations ? (
                <Typography variant="body2" sx={{ color: 'rgba(191, 219, 254, 0.95)', mt: 0.6 }}>
                  Trending locations: {topLocations}
                </Typography>
              ) : null}
            </Grid>

            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  height: '100%',
                  minHeight: 160,
                }}
              >
                <Box
                  component="img"
                  src="/main.svg"
                  alt="Find Jobs"
                  sx={{
                    maxWidth: '100%',
                    maxHeight: 200,
                    width: 'auto',
                    height: 'auto',
                  }}
                />
                <Button
                  startIcon={<TuneIcon />}
                  variant="contained"
                  onClick={() => setShowFilters(!showFilters)}
                  sx={{
                    display: { xs: 'flex', md: 'none' },
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    bgcolor: '#0ea5e9',
                    '&:hover': { bgcolor: '#0284c7' },
                  }}
                >
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </MotionPaper>

        <Grid container spacing={3}>
          <Grid item xs={12} md={3} sx={{ display: { xs: showFilters ? 'block' : 'none', md: 'block' } }}>
            <MotionPaper
              sx={{
                p: { xs: 2.6, md: 3.2 },
                position: { md: 'sticky' },
                top: { md: 80 },
                minHeight: { md: 'calc(100vh - 120px)' },
                maxHeight: 'none',
                overflowY: 'visible',
                overflowX: 'hidden',
                alignSelf: 'flex-start',
                background: theme.palette.mode === 'dark'
                  ? 'linear-gradient(180deg, #111827, #0F172A)'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(241, 248, 255, 0.96))',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 4,
                boxShadow: '0 24px 60px rgba(15, 23, 42, 0.11)',
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                Smart Filters
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                Use keywords, city, experience and job type to narrow the best matches.
              </Typography>

              <Box sx={{ mb: 2.8 }}>
                <Box
                  onClick={() => toggleSection('search')}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    borderRadius: 2.5,
                    px: 1.3,
                    py: 0.9,
                    minHeight: 56,
                    bgcolor: 'rgba(59, 130, 246, 0.06)',
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Search</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                    <Chip size="small" label={searchCount} color={searchCount > 0 ? 'primary' : 'default'} sx={{ minWidth: 32, height: 24, fontWeight: 700 }} />
                    <IconButton size="medium">{openSections.search ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
                  </Box>
                </Box>

                <Collapse in={openSections.search}>
                  <Box sx={{ pt: 1.8 }}>
                    <TextField
                      fullWidth
                      placeholder="Job title, skill, or company"
                      value={filters.keyword}
                      onChange={(e) => handleFilterChange('keyword', e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { height: 54, fontSize: '0.97rem' } }}
                    />

                    <Autocomplete
                      multiple
                      freeSolo
                      options={INDIAN_CITIES}
                      value={filters.location}
                      onChange={(_, value) => handleFilterChange('location', value)}
                      filterOptions={(options, state) =>
                        options.filter((option) =>
                          option.toLowerCase().includes(state.inputValue.toLowerCase())
                        )
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          placeholder="Location"
                          sx={{
                            mb: 2.5,
                            '& .MuiOutlinedInput-root': {
                              minHeight: 54,
                              height: 'auto',
                              alignItems: 'flex-start',
                              fontSize: '0.97rem',
                              py: 0.5,
                            },
                            '& .MuiAutocomplete-input': {
                              minWidth: 120,
                            },
                          }}
                        />
                      )}
                    />
                  </Box>
                </Collapse>
              </Box>

              <Box sx={{ mb: 2.8 }}>
                <Box
                  onClick={() => toggleSection('profile')}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    borderRadius: 2.5,
                    px: 1.3,
                    py: 0.9,
                    minHeight: 56,
                    bgcolor: 'rgba(14, 165, 233, 0.06)',
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Profile Match</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                    <Chip size="small" label={profileCount} color={profileCount > 0 ? 'primary' : 'default'} sx={{ minWidth: 32, height: 24, fontWeight: 700 }} />
                    <IconButton size="medium">{openSections.profile ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
                  </Box>
                </Box>

                <Collapse in={openSections.profile}>
                  <Box sx={{ pt: 1.8 }}>
                    <TextField
                      fullWidth
                      placeholder="Experience"
                      value={filters.experience}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d*$/.test(value)) {
                          handleFilterChange('experience', value);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      inputProps={{
                        inputMode: 'numeric',
                        pattern: '[0-9]*',
                      }}
                      sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { height: 54, fontSize: '0.97rem' } }}
                    />

                    <FormControl fullWidth sx={{ mb: 2.5 }}>
                      <InputLabel>Education</InputLabel>
                      <Select
                        value={filters.education}
                        onChange={(e) => handleFilterChange('education', e.target.value)}
                        label="Education"
                      >
                        <MenuItem value="">All Levels</MenuItem>
                        {EDUCATION_OPTIONS.map((edu) => (
                          <MenuItem key={edu} value={edu}>{edu}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth sx={{ mb: 2.5 }}>
                      <InputLabel>Freshness</InputLabel>
                      <Select
                        value={filters.freshness}
                        onChange={(e) => handleFilterChange('freshness', e.target.value)}
                        label="Freshness"
                      >
                        <MenuItem value="">All Time</MenuItem>
                        {FRESHNESS_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Collapse>
              </Box>

              <Box sx={{ mb: 2.8 }}>
                <Box
                  onClick={() => toggleSection('jobType')}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    borderRadius: 2.5,
                    px: 1.3,
                    py: 0.9,
                    minHeight: 56,
                    bgcolor: 'rgba(59, 130, 246, 0.06)',
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Job Type</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                    <Chip size="small" label={jobTypeCount} color={jobTypeCount > 0 ? 'primary' : 'default'} sx={{ minWidth: 32, height: 24, fontWeight: 700 }} />
                    <IconButton size="medium">{openSections.jobType ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
                  </Box>
                </Box>

                <Collapse in={openSections.jobType}>
                  <FormControl fullWidth sx={{ mt: 1.8 }}>
                    <FormGroup sx={{ flexDirection: 'column', gap: 0.4 }}>
                      {EMPLOYMENT_TYPES.map((type) => (
                        <FormControlLabel
                          key={type}
                          control={
                            <Checkbox
                              checked={filters.jobType.includes(type)}
                              onChange={(e) => {
                                const nextValues = e.target.checked
                                  ? [...filters.jobType, type]
                                  : filters.jobType.filter((item) => item !== type);
                                handleFilterChange('jobType', nextValues);
                              }}
                            />
                          }
                          label={type}
                          sx={{ py: 0.15, minHeight: 36 }}
                          slotProps={{ typography: { variant: 'body1' } }}
                        />
                      ))}
                    </FormGroup>
                  </FormControl>
                </Collapse>
              </Box>

              <Box sx={{ mb: 2.8 }}>
                <Box
                  onClick={() => toggleSection('workMode')}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    borderRadius: 2.5,
                    px: 1.3,
                    py: 0.9,
                    minHeight: 56,
                    bgcolor: 'rgba(14, 165, 233, 0.06)',
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Work Mode</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                    <Chip size="small" label={workModeCount} color={workModeCount > 0 ? 'primary' : 'default'} sx={{ minWidth: 32, height: 24, fontWeight: 700 }} />
                    <IconButton size="medium">{openSections.workMode ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
                  </Box>
                </Box>

                <Collapse in={openSections.workMode}>
                  <FormControl fullWidth sx={{ mt: 1.8 }}>
                    <FormGroup sx={{ flexDirection: 'column', gap: 0.4 }}>
                      {WORK_MODES.map((mode) => (
                        <FormControlLabel
                          key={mode}
                          control={
                            <Checkbox
                              checked={filters.workMode.includes(mode)}
                              onChange={(e) => {
                                const nextValues = e.target.checked
                                  ? [...filters.workMode, mode]
                                  : filters.workMode.filter((item) => item !== mode);
                                handleFilterChange('workMode', nextValues);
                              }}
                            />
                          }
                          label={mode}
                          sx={{ py: 0.15, minHeight: 36 }}
                          slotProps={{ typography: { variant: 'body1' } }}
                        />
                      ))}
                    </FormGroup>
                  </FormControl>
                </Collapse>
              </Box>

              <Box sx={{ mb: 3.2 }}>
                <Box
                  onClick={() => toggleSection('category')}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    borderRadius: 2.5,
                    px: 1.3,
                    py: 0.9,
                    minHeight: 56,
                    bgcolor: 'rgba(59, 130, 246, 0.06)',
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Category</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                    <Chip size="small" label={categoryCount} color={categoryCount > 0 ? 'primary' : 'default'} sx={{ minWidth: 32, height: 24, fontWeight: 700 }} />
                    <IconButton size="medium">{openSections.category ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
                  </Box>
                </Box>

                <Collapse in={openSections.category}>
                  <FormControl fullWidth sx={{ mt: 1.8 }}>
                    <Box
                      sx={{
                        maxHeight: 280,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        width: '100%',
                        pr: 0.4,
                      }}
                    >
                      <FormGroup
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          width: '100%',
                          gap: 1.1,
                        }}
                      >
                        {categoriesLoading ? (
                          <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
                            Loading categories...
                          </Typography>
                        ) : categories.length === 0 ? (
                          <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
                            No categories available
                          </Typography>
                        ) : (
                          categories.map((category) => (
                            <FormControlLabel
                              key={category}
                              control={
                                <Checkbox
                                  sx={{ p: 0.5, mr: 0.75 }}
                                  checked={filters.category.includes(category)}
                                  onChange={(e) => {
                                    const nextValues = e.target.checked
                                      ? [...filters.category, category]
                                      : filters.category.filter((item) => item !== category);
                                    handleFilterChange('category', nextValues);
                                  }}
                                />
                              }
                              label={category}
                              sx={{
                                m: 0,
                                width: '100%',
                                alignItems: 'center',
                                  minHeight: 40,
                                '& .MuiFormControlLabel-label': {
                                  flex: 1,
                                  minWidth: 0,
                                    fontSize: '0.98rem',
                                  whiteSpace: 'normal',
                                  overflowWrap: 'anywhere',
                                  lineHeight: 1.4,
                                },
                              }}
                            />
                          ))
                        )}
                      </FormGroup>
                    </Box>
                  </FormControl>
                </Collapse>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                {filters.keyword && <Chip label={filters.keyword} size="small" />}
                {filters.location.length > 0 && <Chip label={filters.location.join(', ')} size="small" />}
                {filters.experience && <Chip label={filters.experience} size="small" />}
                {filters.education && <Chip label={filters.education} size="small" />}
              </Box>

              <Button variant="outlined" fullWidth onClick={clearFilters}>
                Clear Filters
              </Button>
            </MotionPaper>
          </Grid>

          <Grid item xs={12} md={9}>
            <Paper
              sx={{
                mb: 2.5,
                p: { xs: 1.5, md: 2 },
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                background: theme.palette.mode === 'dark'
                  ? 'linear-gradient(180deg, #111827, #0F172A)'
                  : 'linear-gradient(180deg, #ffffff, #f8fbff)',
                boxShadow: '0 14px 36px rgba(15, 23, 42, 0.06)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <WorkOutlineIcon sx={{ color: 'primary.main' }} />
                    Showing {jobs.length} of {total} roles
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.2, display: 'flex', alignItems: 'center', gap: 0.6 }}>
                    <PlaceOutlinedIcon sx={{ fontSize: 18 }} />
                    {filters.location.length > 0 ? `Focused on ${filters.location.join(', ')}` : 'All locations'}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  onClick={clearFilters}
                  disabled={activeFiltersCount === 0}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Reset All Filters
                </Button>
              </Box>

              <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {activeFilterChips.length > 0 ? (
                  activeFilterChips.map((chip) => (
                    <Chip
                      key={`${chip.key}-${chip.value}`}
                      label={chip.label}
                      onDelete={() => {
                        if (chip.key === 'location') {
                          handleFilterChange('location', []);
                        } else if (chip.key === 'keyword') {
                          handleFilterChange('keyword', '');
                        } else {
                          handleFilterChange(chip.key, '');
                        }
                      }}
                      size="small"
                    />
                  ))
                ) : (
                  <Chip label="No active filters" size="small" variant="outlined" />
                )}
              </Box>
            </Paper>

            {loading ? (
              <JobListSkeleton count={6} />
            ) : jobs.length === 0 ? (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 8,
                  px: 2,
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: 'divider',
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(180deg, #111827, #0F172A)'
                    : 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
                }}
              >
                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700, mb: 1.4 }}>
                  No jobs found
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  Try adjusting your filters or search criteria
                </Typography>
                <Button variant="contained" onClick={clearFilters}>
                  Clear and Explore
                </Button>
              </Box>
            ) : (
              <>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 4 }}>
                  {jobs.map((job) => (
                    <HorizontalJobListItem
                      key={job.id}
                      job={job}
                      isPremiumUser={!!subscription}
                    />
                  ))}
                </Box>

                {totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(_, value) => setPage(value)}
                      color="primary"
                    />
                  </Box>
                )}
              </>
            )}
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
};
