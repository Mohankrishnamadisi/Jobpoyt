import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  BusinessCenterOutlined as BusinessCenterOutlinedIcon,
  ApartmentOutlined as ApartmentOutlinedIcon,
  VerifiedOutlined as VerifiedOutlinedIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { Layout } from '@components/layout/Layout';
import { HorizontalJobListItem } from '@components/jobs/HorizontalJobListItem';
import { JobListSkeleton } from '@components/common/LoadingSkeleton';
import { Error } from '@components/common/Error';
import { applicationService, companyService, jobService } from '@services/api';
import { EMPLOYMENT_TYPES, WORK_MODES, EDUCATION_OPTIONS, FRESHNESS_OPTIONS, INDIAN_CITIES } from '@constants/index';
import { JOB_SEARCH_SUGGESTION_GROUPS } from '@constants/jobSearchSuggestions';
import type { Job } from '../types';
import { SEO } from '@components/seo/SEO';
import { siteConfig } from '@config/site';

const MotionPaper = motion(Paper);

const getMultiValues = (params: URLSearchParams, key: string, fallback: string[] = []) => {
  const values = params.getAll(key);
  if (values.length > 0) return values.filter(Boolean);
  const rawValue = params.get(key);
  if (!rawValue) return fallback;
  return rawValue.split(',').map((value) => value.trim()).filter(Boolean);
};

export const Jobs: React.FC = () => {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { subscription } = useSubscription(user?.id || null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestRequestRef = useRef(0);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [allJobsTotal, setAllJobsTotal] = useState(0);
  const [companyTotal, setCompanyTotal] = useState<number | null>(null);
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
    company: searchParams.get('company') || '',
    location: getMultiValues(searchParams, 'location'),
    experience: searchParams.get('experience') || '',
    education: searchParams.get('education') || '',
    freshness: searchParams.get('freshness') || '',
    jobType: [] as string[],
    workMode: [] as string[],
    category: [] as string[],
  });
  const [debouncedKeyword, setDebouncedKeyword] = useState(searchParams.get('keyword') || '');
  const [keywordDraft, setKeywordDraft] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  useEffect(() => {
    let isActive = true;

    const fetchAllJobsTotal = async () => {
      try {
        const [{ total: jobsCount }, companiesCount] = await Promise.all([
          jobService.getJobs({}, 1, 1),
          companyService.getCompanyCount(),
        ]);
        if (isActive) {
          setAllJobsTotal(jobsCount);
          setCompanyTotal(companiesCount);
        }
      } catch (err) {
        console.error('Failed to fetch hero totals:', err);
      }
    };

    fetchAllJobsTotal();

    return () => {
      isActive = false;
    };
  }, []);

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
    let isActive = true;

    const fetchAppliedJobs = async () => {
      if (!user?.id) {
        setAppliedJobIds(new Set());
        return;
      }

      try {
        const applications = await applicationService.getUserApplications(user.id);
        if (isActive) {
          setAppliedJobIds(new Set(
            (applications || [])
              .map((application: { job_id?: string; jobs?: { id?: string } }) => String(application.job_id || application.jobs?.id || ''))
              .filter(Boolean)
          ));
        }
      } catch (err) {
        console.error('Failed to fetch applied jobs:', err);
      }
    };

    fetchAppliedJobs();
    return () => {
      isActive = false;
    };
  }, [user?.id]);

  useEffect(() => {
    const debounceTimer = window.setTimeout(() => {
      setDebouncedKeyword(filters.keyword);
    }, 300);

    return () => window.clearTimeout(debounceTimer);
  }, [filters.keyword]);

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
    setFilters(() => ({
      keyword: searchParams.get('keyword') || '',
      company: searchParams.get('company') || '',
      location: getMultiValues(searchParams, 'location'),
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
      if (filters.company) params.company = filters.company;
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
    filters.company,
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

  const addKeywordTerms = (terms: string[]) => {
    const existingTerms = filters.keyword.split(',').map((term) => term.trim()).filter(Boolean);
    const nextTerms = [...existingTerms];

    terms
      .flatMap((term) => term.split(','))
      .map((term) => term.trim())
      .filter(Boolean)
      .forEach((term) => {
        if (!nextTerms.some((existing) => existing.toLowerCase() === term.toLowerCase())) {
          nextTerms.push(term);
        }
      });

    handleFilterChange('keyword', nextTerms.join(', '));
    setKeywordDraft('');
  };

  const openSuggestionPopup = () => {
    setSuggestionsOpen(true);
  };

  const applySuggestionSearch = () => {
    if (keywordDraft.trim()) {
      addKeywordTerms([keywordDraft]);
    }

    setSuggestionsOpen(false);
  };

  const clearFilters = () => {
    setDebouncedKeyword('');
    setFilters({
      keyword: '',
      company: '',
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

  const keywordValues = filters.keyword.split(',').map((value) => value.trim()).filter(Boolean);
  const selectedKeywordSet = new Set(keywordValues.map((value) => value.toLowerCase()));
  const filteredSuggestionGroups = JOB_SEARCH_SUGGESTION_GROUPS
    .map((group) => ({
      ...group,
      options: group.options.filter((option) =>
        !selectedKeywordSet.has(option.toLowerCase())
      ),
    }))
    .filter((group) => group.options.length > 0);
  const searchCount = keywordValues.length + (filters.company ? 1 : 0) + filters.location.length;
  const profileCount = [filters.experience, filters.education, filters.freshness].filter(Boolean).length;
  const jobTypeCount = filters.jobType.length;
  const workModeCount = filters.workMode.length;
  const categoryCount = filters.category.length;
  const activeFiltersCount = [
    filters.keyword,
    filters.company,
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
    filters.company ? { key: 'company', label: `Company: ${filters.company}`, value: '' } : null,
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
      <SEO title="Jobs in India, Abroad & Remote | JobPoyt" description="Search current jobs in India, abroad and remote roles on JobPoyt. Filter opportunities by role, location, experience, job type and work mode." canonical={`${siteConfig.url}/jobs`} />
      <Container maxWidth="xl" className="find-jobs-page" sx={{ py: { xs: 1.5, md: 3 }, backgroundColor: 'transparent' }}>
        <MotionPaper
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="find-jobs-hero"
          sx={{
            mb: { xs: 2, md: 3 },
            p: { xs: 1.5, sm: 2, md: 2.2 },
            minHeight: { xs: 0, sm: 0, md: 0 },
            borderRadius: { xs: 3, md: 4 },
            border: '1px solid rgba(125, 211, 252, 0.24)',
            backgroundImage: "linear-gradient(90deg, rgba(4, 18, 40, 0.96) 0%, rgba(7, 28, 57, 0.9) 36%, rgba(8, 31, 63, 0.64) 67%, rgba(8, 31, 63, 0.3) 100%), url('/images/find.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: '#fff',
            boxShadow: '0 28px 70px rgba(7, 26, 51, 0.3)',
            overflow: 'hidden',
          }}
        >
          <Grid container spacing={{ xs: 1.2, md: 1.4 }}>
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.5 }}>
                <AutoAwesomeIcon sx={{ fontSize: 16, color: '#7dd3fc' }} />
                <Typography variant="overline" sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: 1.4, color: '#7dd3fc' }}>
                  Career Discovery
                </Typography>
              </Box>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.08,
                  fontSize: { xs: '1.6rem', sm: '2rem', md: '2.35rem' },
                  letterSpacing: '-0.035em',
                  maxWidth: 650,
                  mb: 0.6,
                }}
              >
                <Box component="span" sx={{ display: 'block', color: '#fff', fontWeight: 400, fontSize: { xs: '2.1rem', sm: '2.4rem', md: '2.65rem' }, lineHeight: 1.1, letterSpacing: 0 }}>Find Your</Box>
                <Box component="span" sx={{ color: '#00aef0', fontSize: { xs: '2.7rem', sm: '3.15rem', md: '3.45rem' } }}>Dream</Box>{' '}
                <Box component="span" sx={{ color: '#f4c95d', fontSize: { xs: '2.7rem', sm: '3.15rem', md: '3.45rem' } }}>Job</Box>
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.82)', maxWidth: 'none', whiteSpace: { xs: 'normal', md: 'nowrap' }, fontSize: { xs: '0.85rem', md: '0.92rem' } }}>
                Explore {(allJobsTotal || total).toLocaleString()}+ opportunities from top companies and take the next step in your career.
              </Typography>
              {topLocations ? (
                <Typography variant="body2" sx={{ color: '#bae6fd', mt: 0.6, maxWidth: 690, lineHeight: 1.4, fontSize: '0.8rem' }}>
                  <Box component="span" sx={{ color: '#fff', fontWeight: 700 }}>Trending locations:</Box> {topLocations}
                </Typography>
              ) : null}
            </Grid>

            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  ml: 'auto',
                  maxWidth: 180,
                  p: 1.1,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(14px)',
                  boxShadow: '0 16px 35px rgba(2, 12, 27, 0.18)',
                }}
              >
                {[
                  { value: (allJobsTotal || total).toLocaleString(), label: 'Active Jobs', icon: <BusinessCenterOutlinedIcon /> },
                  { value: companyTotal === null ? '—' : companyTotal.toLocaleString(), label: 'Companies', icon: <ApartmentOutlinedIcon /> },
                  { value: '15,000+', label: 'Featured Roles', icon: <VerifiedOutlinedIcon /> },
                ].map((stat) => (
                  <Box key={stat.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.8, '& + &': { mt: 0.8, pt: 0.8, borderTop: '1px solid rgba(255,255,255,0.14)' } }}>
                    <Box sx={{ width: 30, height: 30, borderRadius: 1.2, display: 'grid', placeItems: 'center', color: '#7dd3fc', background: 'rgba(34,211,238,0.14)' }}>{stat.icon}</Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.95rem', lineHeight: 1.1, fontWeight: 800 }}>{stat.value}</Typography>
                      <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>{stat.label}</Typography>
                    </Box>
                  </Box>
                ))}
                <Typography sx={{ mt: 0.9, pt: 0.8, borderTop: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.75)', fontSize: '0.68rem', fontStyle: 'italic', lineHeight: 1.3 }}>
                  Opportunities don&apos;t happen. You create them.
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Button startIcon={<TuneIcon />} variant="outlined" onClick={() => setShowFilters(!showFilters)} sx={{ display: { xs: 'flex', md: 'none' }, borderColor: 'rgba(255,255,255,0.4)', color: '#fff', borderRadius: 1.5, textTransform: 'none', fontWeight: 700 }}>
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
            </Grid>
          </Grid>

          <Box
            className="find-jobs-hero-summary"
            sx={{
              mt: { xs: 1.1, md: 1.3 },
              p: { xs: 1, md: 1.1 },
              borderRadius: 1.8,
              border: '1px solid rgba(255,255,255,0.22)',
              background: 'rgba(7, 26, 51, 0.48)',
              backdropFilter: 'blur(14px)',
              boxShadow: '0 12px 30px rgba(2, 12, 27, 0.18)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.2 }}>
              <Box>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <WorkOutlineIcon sx={{ color: '#7dd3fc' }} />
                  Showing {jobs.length} of {total} roles
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)', mt: 0.2, display: 'flex', alignItems: 'center', gap: 0.6 }}>
                  <PlaceOutlinedIcon sx={{ fontSize: 18, color: '#7dd3fc' }} />
                  {filters.location.length > 0 ? `Focused on ${filters.location.join(', ')}` : 'All locations'}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                onClick={clearFilters}
                disabled={activeFiltersCount === 0}
                sx={{ color: '#fff', background: 'transparent', borderColor: 'rgba(255,255,255,0.42)', textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: '#fff', background: 'rgba(255,255,255,0.08)' }, '&.Mui-disabled': { color: 'rgba(255,255,255,0.42)', background: 'transparent', borderColor: 'rgba(255,255,255,0.2)' } }}
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
                    sx={{ color: '#e0f2fe', background: 'rgba(191,219,254,0.16)', '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.62)' } }}
                  />
                ))
              ) : (
                <Chip label="No active filters" size="small" variant="outlined" sx={{ color: 'rgba(255,255,255,0.62)', background: 'transparent', borderColor: 'rgba(255,255,255,0.2)' }} />
              )}
            </Box>
          </Box>
        </MotionPaper>

        <Grid container spacing={3}>
          <Grid item xs={12} md={3} sx={{ display: { xs: showFilters ? 'block' : 'none', md: 'block' } }}>
            <MotionPaper
              className="find-jobs-filters"
              sx={{
                p: { xs: 2, md: 2.5 },
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
                borderRadius: 2.75,
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
                    <Box sx={{ position: 'relative', mb: 2.5 }}>
                      <Box
                        sx={{
                          minHeight: 54,
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 0.75,
                          px: 1.5,
                          border: '1px solid',
                          borderColor: suggestionsOpen ? 'primary.main' : 'rgba(148, 163, 184, 0.55)',
                          borderRadius: 1.5,
                          background: '#fff',
                          '&:focus-within': { borderColor: 'primary.main', boxShadow: '0 0 0 1px rgba(37, 99, 235, 0.18)' },
                        }}
                        onClick={openSuggestionPopup}
                      >
                        <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                        {keywordValues.map((keyword) => (
                          <Chip
                            key={keyword}
                            label={keyword}
                            size="small"
                            onDelete={() => handleFilterChange('keyword', keywordValues.filter((value) => value !== keyword).join(', '))}
                            sx={{
                              flexShrink: 0,
                              height: 30,
                              maxWidth: '100%',
                              px: 0.35,
                              fontWeight: 600,
                              border: '1px solid #dbe4f0',
                              background: '#f1f5f9',
                              '& .MuiChip-label': { px: 1 },
                              '& .MuiChip-deleteIcon': { ml: 0.35, mr: 0.35 },
                            }}
                          />
                        ))}
                        <input
                          aria-label="Search job title or skill"
                          value={keywordDraft}
                          onFocus={openSuggestionPopup}
                          onChange={(event) => setKeywordDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              addKeywordTerms([keywordDraft]);
                            }
                            if (event.key === ',' && keywordDraft.trim()) {
                              event.preventDefault();
                              addKeywordTerms([keywordDraft]);
                            }
                          }}
                          placeholder={keywordValues.length > 0 ? 'Add another keyword' : 'Press ENTER - Job title or skill'}
                          style={{ border: 0, outline: 0, flex: 1, minWidth: 160, height: 36, font: 'inherit', color: '#1e293b', background: 'transparent' }}
                        />
                      </Box>

                      <TextField
                        fullWidth
                        aria-label="Search company"
                        placeholder="Company name"
                        value={filters.company}
                        onChange={(event) => handleFilterChange('company', event.target.value)}
                        InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} /> }}
                        sx={{
                          mt: 1.5,
                          '& .MuiOutlinedInput-root': { minHeight: 54, fontSize: '0.97rem' },
                        }}
                      />

                      {suggestionsOpen ? createPortal(
                        <>
                          <Box
                            onClick={() => setSuggestionsOpen(false)}
                            sx={{ position: 'fixed', inset: 0, zIndex: 1599, background: 'rgba(15, 23, 42, 0.34)' }}
                          />
                          <Box
                            sx={{
                              position: 'fixed',
                              zIndex: 1600,
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: 'min(1320px, calc(100vw - 48px))',
                              maxWidth: 'calc(100vw - 32px)',
                              height: 'min(720px, calc(100vh - 40px))',
                              display: 'flex',
                              flexDirection: 'column',
                              overflow: 'hidden',
                              p: { xs: 1.2, md: 1.8 },
                              border: '1px solid #dbe4f0',
                              borderRadius: 2.5,
                              background: '#fff',
                              opacity: 1,
                              boxShadow: '0 24px 70px rgba(15, 23, 42, 0.32)',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, pb: 1.5, borderBottom: '1px solid #e2e8f0' }}>
                              <Box>
                                <Typography sx={{ color: '#0f172a', fontSize: '1.2rem', fontWeight: 800 }}>Choose a job role</Typography>
                                <Typography sx={{ color: 'text.secondary', fontSize: '0.84rem', mt: 0.3 }}>Select one or more roles to filter jobs.</Typography>
                              </Box>
                              <IconButton aria-label="Close job role suggestions" onClick={() => setSuggestionsOpen(false)} size="medium">
                                <CloseIcon />
                              </IconButton>
                            </Box>
                            <Box
                              sx={{
                                minHeight: 54,
                                display: 'flex',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: 0.75,
                                    pl: 1.5,
                                    pr: 13,
                                mb: 2,
                                border: '1px solid #2563eb',
                                borderRadius: 1.5,
                                background: '#fff',
                                    position: 'relative',
                              }}
                            >
                              <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                              {keywordValues.map((keyword) => (
                                <Chip
                                  key={`modal-${keyword}`}
                                  label={keyword}
                                  size="small"
                                  onDelete={() => handleFilterChange('keyword', keywordValues.filter((value) => value !== keyword).join(', '))}
                                  sx={{
                                    flexShrink: 0,
                                    height: 30,
                                    maxWidth: '100%',
                                    px: 0.35,
                                    fontWeight: 600,
                                    border: '1px solid #dbe4f0',
                                    background: '#f1f5f9',
                                    '& .MuiChip-label': { px: 1 },
                                    '& .MuiChip-deleteIcon': { ml: 0.35, mr: 0.35 },
                                  }}
                                />
                              ))}
                              <input
                                aria-label="Search job title or skill"
                                value={keywordDraft}
                                onChange={(event) => setKeywordDraft(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || (event.key === ',' && keywordDraft.trim())) {
                                    event.preventDefault();
                                    addKeywordTerms([keywordDraft]);
                                  }
                                }}
                                placeholder={keywordValues.length > 0 ? 'Add another keyword' : 'Job title or skill'}
                                style={{ border: 0, outline: 0, flex: 1, minWidth: 180, height: 36, font: 'inherit', color: '#1e293b', background: 'transparent' }}
                              />
                              <Button
                                variant="contained"
                                size="small"
                                onClick={applySuggestionSearch}
                                sx={{
                                  position: 'absolute',
                                  right: 8,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  minWidth: 82,
                                  borderRadius: 1,
                                  textTransform: 'none',
                                  fontWeight: 700,
                                  backgroundColor: '#3B82F6',
                                  boxShadow: 'none',
                                  '&:hover': {
                                    backgroundColor: '#2563EB',
                                    boxShadow: 'none',
                                    transform: 'translateY(-50%)',
                                  },
                                }}
                              >
                                Search
                              </Button>
                            </Box>
                            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5 }}>
                              <Box sx={{ columnCount: { xs: 1, sm: 2, md: 5 }, columnGap: { xs: 1, md: 0.9 } }}>
                                {filteredSuggestionGroups.map((group) => (
                                  <Box key={group.label} sx={{ display: 'inline-block', width: '100%', mb: { xs: 1, md: 0.9 }, p: 0.75, border: '1px solid #e2e8f0', borderRadius: 1.25, background: '#f8fafc', breakInside: 'avoid' }}>
                                  <Typography sx={{ display: 'block', px: 0.7, py: 0.45, mb: 0.55, color: '#164e9b', fontSize: '0.66rem', fontWeight: 800, letterSpacing: 0.35, textTransform: 'uppercase', background: 'linear-gradient(135deg, #dbeafe, #e0f2fe)', border: '1px solid #bfdbfe', borderRadius: 0.9, boxShadow: '0 2px 6px rgba(37, 99, 235, 0.08)' }}>
                                    {group.label}
                                  </Typography>
                                  {group.options.map((option) => (
                                    <Button
                                      key={option}
                                      fullWidth
                                      onClick={() => addKeywordTerms([option])}
                                      sx={{ justifyContent: 'flex-start', px: 0.45, py: 0.18, minHeight: 25, color: 'text.primary', textTransform: 'none', fontSize: '0.7rem', lineHeight: 1.2, fontWeight: 500, textAlign: 'left', '&:hover': { background: 'rgba(37, 99, 235, 0.1)' } }}
                                    >
                                      {option}
                                    </Button>
                                  ))}
                                  </Box>
                                ))}
                              </Box>
                              {filteredSuggestionGroups.length === 0 ? (
                                <Typography sx={{ px: 0.8, py: 1, color: 'text.secondary', fontSize: '0.85rem' }}>No matching suggestions</Typography>
                              ) : null}
                            </Box>
                          </Box>
                        </>,
                        document.body,
                      ) : null}
                    </Box>

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
                      isApplied={appliedJobIds.has(String(job.id))}
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
