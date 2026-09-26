import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  CircularProgress,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  Close as CloseIcon,
  FilterList as FilterListIcon,
  WorkOutline as WorkOutlineIcon,
  Public as PublicIcon,
  AutoAwesome as AutoAwesomeIcon,
  Search as SearchIcon,
  OpenInNew as OpenInNewIcon,
  WorkspacePremium as WorkspacePremiumIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@store/index';
import { applicationService, jobService, savedService, userService } from '@services/api';
import { supabase } from '@services/supabase';
import { ROUTES, USER_ROLES } from '@constants/index';
import { isCandidatePremium, isSubscriptionActive } from '@utils/candidateSubscriptionHelpers';

type RemoteSubscription = { plan?: string; status?: string; end_date?: string | null; endDate?: string | null } | null;
type Props = { subscription: RemoteSubscription; subscriptionLoading?: boolean; standalone?: boolean };
type Job = Record<string, any> & { id: string; title: string; company_name: string };
type CandidateProfile = Record<string, any>;
type ScoredJob = { job: Job; score: number | null; matchingSkills: string[]; reasons: string[] };
type Filters = { location: string; category: string; jobType: string; experience: string; salaryMin: string; salaryMax: string; postedWithin: string };

const EMPTY_FILTERS: Filters = { location: '', category: '', jobType: '', experience: '', salaryMin: '', salaryMax: '', postedWithin: '' };
const surface = { bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2, boxShadow: '0 4px 14px rgba(15,23,42,0.045)' };
const ink = '#14243A';
const muted = '#64748B';
const actionNavy = '#0B2745';
const secondaryActionSx = { textTransform: 'none', color: '#344054', '&:hover': { bgcolor: '#EAECF0', color: actionNavy } };
const outlinedActionSx = { textTransform: 'none', color: '#344054', borderColor: '#D0D5DD', '&:hover': { borderColor: actionNavy, bgcolor: '#EAECF0', color: actionNavy } };
const selectMenuProps = { PaperProps: { sx: { p: 0.35, border: '1px solid #E2E8F0', borderRadius: 1.4, boxShadow: '0 8px 24px rgba(15,23,42,0.12)', '& .MuiMenuItem-root': { minHeight: 34, mx: 0.25, borderRadius: 0.9, fontSize: 13 }, '& .MuiMenuItem-root:hover': { bgcolor: '#EAECF0', color: actionNavy }, '& .MuiMenuItem-root.Mui-selected': { bgcolor: '#E4E7EC', color: actionNavy }, '& .MuiMenuItem-root.Mui-selected:hover': { bgcolor: '#D0D5DD' } } } };
const PAGE_SIZE = 50;
const freshnessFilter: Record<string, string> = { '1': '1d', '7': '7d', '15': '15d', '30': '30d' };

const fetchRemotePage = async (search: string, filters: Filters, page: number, signal?: AbortSignal) => {
  const response = await jobService.getJobs({
    status: 'published',
    workMode: 'Remote',
    keyword: search ? search.split(/[\s,]+/).filter(Boolean).join(',') : undefined,
    location: filters.location || undefined,
    category: filters.category || undefined,
    jobType: filters.jobType || undefined,
    experience: filters.experience || undefined,
    freshness: filters.postedWithin ? freshnessFilter[filters.postedWithin] : undefined,
  }, page, PAGE_SIZE, { includeTotal: true, signal });
  const jobs = (response.data || []).filter((job: Job) => job.status === 'published' && isRemoteJob(job));
  if (!jobs.length) return { jobs, total: response.total || 0 };
  try {
    const { data, error } = await supabase.from('jobs').select('id, company_logo_url').in('id', jobs.map((job: Job) => job.id));
    if (!error && data) {
      const logos = new Map(data.map((row: Record<string, any>) => [String(row.id), row.company_logo_url]));
      jobs.forEach((job: Job) => { job.company_logo_url = logos.get(String(job.id)) || job.company_logo_url; });
    }
  } catch (error) {
    console.warn('Remote job company logos could not be loaded:', error);
  }
  return { jobs, total: response.total || 0 };
};

const asStrings = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(asStrings);
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    return asStrings(item.name || item.label || item.title || item.value);
  }
  if (typeof value !== 'string') return [];
  const input = value.trim();
  if (input.startsWith('[') && input.endsWith(']')) {
    try {
      const parsed: unknown = JSON.parse(input);
      if (Array.isArray(parsed)) return parsed.flatMap(asStrings);
    } catch {
      return input.split(/[,|;\/\n]/).map((part) => part.trim()).filter(Boolean);
    }
  }
  return input.split(/[,|;\/\n]/).map((part) => part.trim()).filter(Boolean);
};

const normalized = (value: unknown) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const hasTokenMatch = (first: string, second: string) => Boolean(first && second && (first === second || first.includes(second) || second.includes(first)));
const skillMatches = (first: string, second: string) => {
  const left = normalized(first);
  const right = normalized(second);
  return Boolean(left && right && (left === right || left.split(' ').includes(right) || right.split(' ').includes(left)));
};
const isRemoteJob = (job: Job) => {
  const mode = String(job.work_mode || job.workMode || '').trim().toLowerCase();
  if (mode) return mode.includes('remote') || mode === 'work from home' || mode === 'wfh';
  const location = String(job.location || '').toLowerCase();
  return /\bremote\b|\bworldwide\b|\bwork from home\b|\bwfh\b/.test(location);
};

const candidateExperienceYears = (profile: CandidateProfile) => {
  const direct = Number(profile.experience_years ?? profile.experienceYears);
  if (Number.isFinite(direct) && direct >= 0) return direct;
  const months = Number(profile.total_experience_months ?? profile.totalExperienceMonths);
  if (Number.isFinite(months) && months >= 0) return months / 12;
  const text = String(profile.experience || '').toLowerCase();
  const range = text.match(/(\d+)\s*(?:-|to)\s*(\d+)/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  const plus = text.match(/(\d+)\s*\+/);
  if (plus) return Number(plus[1]);
  const single = text.match(/(\d+(?:\.\d+)?)/);
  return single ? Number(single[1]) : null;
};

const matchExperience = (candidateYears: number, jobExperience: string): number | null => {
  const value = jobExperience.toLowerCase();
  if (!value) return null;
  if (value.includes('fresher') || value.includes('entry level') || value.includes('entry-level')) return candidateYears <= 1 ? 1 : 0.25;
  const range = value.match(/(\d+)\s*(?:-|to)\s*(\d+)/);
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    if (candidateYears >= min && candidateYears <= max) return 1;
    const distance = candidateYears < min ? min - candidateYears : candidateYears - max;
    return Math.max(0, 1 - distance / Math.max(max - min + 1, 2));
  }
  const plus = value.match(/(\d+)\s*\+/);
  if (plus) return candidateYears >= Number(plus[1]) ? 1 : Math.max(0, candidateYears / Number(plus[1]));
  return null;
};

const buildMatch = (job: Job, profile: CandidateProfile): ScoredJob => {
  const candidateSkills = asStrings(profile.skills).map(normalized).filter(Boolean);
  const jobSkills = asStrings(job.skills).map(normalized).filter(Boolean);
  const matchingSkills = asStrings(job.skills).filter((skill) => candidateSkills.some((candidate) => skillMatches(candidate, skill)));
  const preferredTitles = asStrings(profile.preferred_job_titles || profile.preferredJobTitles).map(normalized).filter(Boolean);
  const designation = normalized(profile.current_designation || profile.currentDesignation);
  const title = normalized(job.title);
  const categoryPrefs = asStrings(profile.preferred_job_categories || profile.preferred_categories || profile.preferred_category).map(normalized).filter(Boolean);
  const category = normalized(job.category);
  const locationPrefs = asStrings(profile.preferred_locations || profile.preferred_location || profile.preferred_country).map(normalized).filter(Boolean);
  const preferredMode = normalized(profile.preferred_work_mode || profile.preferredWorkMode);
  const location = normalized(job.location);
  const years = candidateExperienceYears(profile);
  const experience = String(job.experience || '');
  const factors: Array<{ weight: number; value: number | null; reason?: string }> = [];

  if (candidateSkills.length && jobSkills.length) {
    const overlap = matchingSkills.length;
    const precision = overlap / Math.max(jobSkills.length, 1);
    const recall = overlap / Math.max(candidateSkills.length, 1);
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    factors.push({ weight: 40, value: f1, reason: overlap ? `${overlap} matching skill${overlap === 1 ? '' : 's'}` : undefined });
  }
  if (preferredTitles.length) {
    const matched = preferredTitles.some((preferred) => hasTokenMatch(title, preferred));
    factors.push({ weight: 25, value: matched ? 1 : 0, reason: matched ? 'Matches a preferred role' : undefined });
  }
  if (designation) {
    const matched = hasTokenMatch(title, designation) || (category && hasTokenMatch(category, designation));
    factors.push({ weight: 15, value: matched ? 1 : 0, reason: matched ? 'Related to your current designation' : undefined });
  }
  if (years !== null && experience) {
    const fit = matchExperience(years, experience);
    if (fit !== null) factors.push({ weight: 10, value: fit, reason: fit >= 0.7 ? 'Experience level aligns' : undefined });
  }
  if (locationPrefs.length && location) {
    const matched = /worldwide|anywhere|global/.test(location) || locationPrefs.some((preferred) => hasTokenMatch(location, preferred));
    factors.push({ weight: 5, value: matched ? 1 : 0, reason: matched ? 'Location preference aligns' : undefined });
  }
  if (preferredMode) {
    const remotePreference = preferredMode.includes('remote') || preferredMode.includes('work from home') || preferredMode === 'wfh';
    factors.push({ weight: 5, value: remotePreference ? 1 : 0, reason: remotePreference ? 'Matches your remote work preference' : undefined });
  }
  if (categoryPrefs.length && category) {
    const matched = categoryPrefs.some((preferred) => hasTokenMatch(category, preferred));
    factors.push({ weight: 5, value: matched ? 1 : 0, reason: matched ? 'Matches a preferred category' : undefined });
  }

  const profileSignals = [candidateSkills.length > 0, preferredTitles.length > 0 || Boolean(designation), years !== null, locationPrefs.length > 0, categoryPrefs.length > 0].filter(Boolean).length;
  if (profileSignals < 2 || factors.length < 2) return { job, score: null, matchingSkills, reasons: factors.flatMap((factor) => factor.reason ? [factor.reason] : []) };
  const availableWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
  const weighted = factors.reduce((sum, factor) => sum + factor.weight * (factor.value || 0), 0);
  return { job, score: Math.round((weighted / availableWeight) * 100), matchingSkills, reasons: factors.flatMap((factor) => factor.reason ? [factor.reason] : []) };
};

const salaryValue = (job: Job) => {
  const minRaw = job.salary_min ?? job.salaryMin;
  const maxRaw = job.salary_max ?? job.salaryMax;
  const min = minRaw === '' || minRaw == null ? 0 : Number(minRaw);
  const max = maxRaw === '' || maxRaw == null ? min : Number(maxRaw);
  return Number.isFinite(min) && Number.isFinite(max) ? (min + max) / 2 : 0;
};

const formatSalary = (job: Job) => {
  const minRaw = job.salary_min ?? job.salaryMin;
  const maxRaw = job.salary_max ?? job.salaryMax;
  const min = minRaw === '' || minRaw == null ? Number.NaN : Number(minRaw);
  const max = maxRaw === '' || maxRaw == null ? Number.NaN : Number(maxRaw);
  if (!Number.isFinite(min) && !Number.isFinite(max)) return '';
  const currency = String(job.currency || '');
  const format = (value: number) => new Intl.NumberFormat(undefined, { notation: value >= 100000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
  if (Number.isFinite(min) && Number.isFinite(max) && min !== max) return `${currency} ${format(min)}–${format(max)}`.trim();
  return `${currency} ${format(Number.isFinite(min) ? min : max)}`.trim();
};

const postedLabel = (createdAt?: string) => {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const profileMissing = (profile: CandidateProfile) => {
  const missing: string[] = [];
  if (!asStrings(profile.skills).length) missing.push('skills');
  if (!asStrings(profile.preferred_job_titles || profile.preferredJobTitles).length) missing.push('preferred job titles');
  if (candidateExperienceYears(profile) === null) missing.push('experience');
  return missing;
};

export const RemoteJobHub: React.FC<Props> = ({ subscription, subscriptionLoading = false, standalone = false }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filterOptionsJobs, setFilterOptionsJobs] = useState<Job[]>([]);
  const [freshJobs, setFreshJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Record<string, any>[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState('best');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const hasPremiumAccess = Boolean(
    user?.role === USER_ROLES.JOB_SEEKER
    && subscription
    && subscription.status === 'active'
    && isCandidatePremium(subscription.plan)
    && isSubscriptionActive(subscription.end_date || subscription.endDate),
  );

  useEffect(() => {
    if (!hasPremiumAccess || !user?.id) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [profileData, remoteResult, saved, candidateApplications] = await Promise.all([
          userService.getProfile(user.id),
          fetchRemotePage('', EMPTY_FILTERS, 1, controller.signal),
          savedService.getUserSavedJobs(user.id),
          applicationService.getUserApplications(user.id),
        ]);
        if (controller.signal.aborted) return;
        setProfile(profileData || {});
        setJobs(remoteResult.jobs);
        setFilterOptionsJobs(remoteResult.jobs);
        setFreshJobs([...remoteResult.jobs].sort((first, second) => new Date(second.created_at || 0).getTime() - new Date(first.created_at || 0).getTime()).slice(0, 3));
        setTotal(remoteResult.total);
        setSavedIds(new Set((saved || []).map((row: any) => String(row.job_id || row.jobs?.id)).filter(Boolean)));
        setApplications(candidateApplications || []);
        setPage(1);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error('Remote Job Hub load failed:', loadError);
        setError(loadError instanceof Error ? loadError.message : 'Remote jobs could not be loaded.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void fetchData();
    return () => controller.abort();
  }, [hasPremiumAccess, user?.id, reloadKey]);

  const queryRemoteJobs = async (query: string, nextFilters: Filters, nextPage = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const response = await fetchRemotePage(query, nextFilters, nextPage);
      setJobs((current) => {
        if (!append) return response.jobs;
        const known = new Set(current.map((job) => String(job.id)));
        return [...current, ...response.jobs.filter((job) => !known.has(String(job.id)))];
      });
      setTotal(response.total);
      setPage(nextPage);
      setSearch(query);
      setFilters(nextFilters);
    } catch (queryError) {
      console.error('Remote Job Hub query failed:', queryError);
      setError(queryError instanceof Error ? queryError.message : 'Remote jobs could not be loaded.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = async () => {
    if (!user?.id || loadingMore || page * PAGE_SIZE >= total) return;
    const nextPage = page + 1;
    await queryRemoteJobs(search, filters, nextPage, true);
  };

  const scored = useMemo(() => jobs.map((job) => buildMatch(job, profile || {})), [jobs, profile]);
  const matchingJobs = useMemo(() => {
    const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
    const freshnessCutoff = filters.postedWithin ? Date.now() - Number(filters.postedWithin) * 86400000 : 0;
    let result = scored.filter(({ job }) => {
      const haystack = [job.title, job.company_name, job.description, ...asStrings(job.skills)].join(' ').toLowerCase();
      if (terms.length && !terms.some((term) => haystack.includes(term))) return false;
      if (filters.location && !String(job.location || '').toLowerCase().includes(filters.location.toLowerCase())) return false;
      if (filters.category && String(job.category || '') !== filters.category) return false;
      if (filters.jobType && String(job.job_type || '') !== filters.jobType) return false;
      if (filters.experience && !String(job.experience || '').toLowerCase().includes(filters.experience.toLowerCase())) return false;
      const minRaw = job.salary_min ?? job.salaryMin;
      const maxRaw = job.salary_max ?? job.salaryMax;
      const min = minRaw === '' || minRaw == null ? Number.NaN : Number(minRaw);
      const max = maxRaw === '' || maxRaw == null ? Number.NaN : Number(maxRaw);
      if (filters.salaryMin && (!Number.isFinite(max) || max < Number(filters.salaryMin))) return false;
      if (filters.salaryMax && (!Number.isFinite(min) || min > Number(filters.salaryMax))) return false;
      if (freshnessCutoff && (!job.created_at || new Date(job.created_at).getTime() < freshnessCutoff)) return false;
      return true;
    });
    result = [...result].sort((first, second) => {
      if (sort === 'newest') return new Date(second.job.created_at || 0).getTime() - new Date(first.job.created_at || 0).getTime();
      if (sort === 'salaryHigh') return salaryValue(second.job) - salaryValue(first.job);
      if (sort === 'salaryLow') return salaryValue(first.job) - salaryValue(second.job);
      if (first.score === null) return second.score === null ? 0 : 1;
      if (second.score === null) return -1;
      return second.score - first.score;
    });
    return result;
  }, [filters, profile, scored, search, sort]);

  const highMatches = matchingJobs.filter((item) => item.score !== null && item.score >= 70);
  const topMatches = matchingJobs.filter((item) => item.score !== null).slice(0, 3);
  const topMatchIds = new Set(topMatches.map((item) => String(item.job.id)));
  const extraHighMatches = highMatches.filter((item) => !topMatchIds.has(String(item.job.id)));
  const otherMatches = matchingJobs.filter((item) => !topMatchIds.has(String(item.job.id)) && !highMatches.some((high) => String(high.job.id) === String(item.job.id)));
  const remoteApplications = applications.filter((application) => {
    const job = Array.isArray(application.jobs) ? application.jobs[0] : application.jobs;
    return job && isRemoteJob(job as Job);
  });
  const missing = profileMissing(profile || {});
  const locationOptions = [...new Set(filterOptionsJobs.map((job) => String(job.location || '').trim()).filter(Boolean))].sort();
  const categoryOptions = [...new Set(filterOptionsJobs.map((job) => String(job.category || '').trim()).filter(Boolean))].sort();
  const typeOptions = [...new Set(filterOptionsJobs.map((job) => String(job.job_type || '').trim()).filter(Boolean))].sort();
  const experienceOptions = [...new Set(filterOptionsJobs.map((job) => String(job.experience || '').trim()).filter(Boolean))].sort();
  const hasSalary = filterOptionsJobs.some((job) => {
    const min = job.salary_min ?? job.salaryMin;
    const max = job.salary_max ?? job.salaryMax;
    return (min !== '' && min != null && Number.isFinite(Number(min))) || (max !== '' && max != null && Number.isFinite(Number(max)));
  });

  const openJob = (job: Job) => window.open(
    `${window.location.origin}${ROUTES.JOB_DETAILS.replace(':id', encodeURIComponent(String(job.id)))}`,
    '_blank',
    'noopener,noreferrer',
  );

  const toggleSaved = async (job: Job) => {
    if (!user?.id || savingId) return;
    const id = String(job.id);
    setSavingId(id);
    try {
      if (savedIds.has(id)) {
        await savedService.unsaveJob(user.id, id);
        setSavedIds((current) => { const next = new Set(current); next.delete(id); return next; });
      } else {
        await savedService.saveJob(user.id, id);
        setSavedIds((current) => new Set(current).add(id));
      }
    } catch (saveError) {
      console.error('Remote job save failed:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'Could not update saved jobs.');
    } finally {
      setSavingId(null);
    }
  };

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setSearchInput('');
    setSort('best');
    void queryRemoteJobs('', EMPTY_FILTERS);
  };

  if (subscriptionLoading) return <Box sx={{ minHeight: 150, display: 'grid', placeItems: 'center' }}><CircularProgress size={26} /></Box>;

  if (!hasPremiumAccess) {
    return <Card sx={{ ...surface, maxWidth: standalone ? 780 : 'none', mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Stack direction="row" spacing={1.5} alignItems="center"><Avatar sx={{ bgcolor: '#EEF4FF', color: '#174A7C' }}><WorkspacePremiumIcon /></Avatar><Box><Typography variant="h6" sx={{ color: ink, fontWeight: 850 }}>Premium access required</Typography><Typography variant="body2" sx={{ color: muted }}>Remote Job Hub is available to candidates with an active Premium subscription.</Typography></Box></Stack>
      <Button variant="contained" onClick={() => navigate(ROUTES.PRICING)} sx={{ mt: 1.6, minHeight: 38, textTransform: 'none', fontWeight: 750, bgcolor: actionNavy, '&:hover': { bgcolor: '#061A30' } }}>View Premium plans</Button>
    </Card>;
  }

  const jobCard = ({ job, score, matchingSkills, reasons }: ScoredJob) => {
    const salary = formatSalary(job);
    const jobSkills = asStrings(job.skills);
    const logo = String(job.company_logo_url || job.company_logo || job.companyLogoUrl || '');
    const isSaved = savedIds.has(String(job.id));
    const hasExternal = Boolean(job.application_link || job.applicationLink || job.application_url || job.applicationUrl);
    const compactChipSx = { height: 25, borderRadius: 1.2, '& .MuiChip-label': { px: 0.9, fontSize: 11.5, fontWeight: 650 }, '& .MuiChip-icon': { ml: 0.65, mr: -0.3, fontSize: 14 } };
    return <Card key={job.id} sx={{ ...surface, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 292, p: 1.4, transition: 'border-color 150ms ease, box-shadow 150ms ease', '&:hover': { borderColor: '#A8BED4', boxShadow: '0 8px 20px rgba(15,23,42,0.08)' } }}>
      <Stack direction="row" alignItems="flex-start" gap={1} sx={{ minWidth: 0 }}>
        <Avatar src={logo || undefined} variant="rounded" imgProps={{ onError: (event) => { event.currentTarget.style.display = 'none'; } }} sx={{ width: 40, height: 40, flexShrink: 0, bgcolor: '#F1F5F9', color: '#174A7C', fontWeight: 800 }}>{String(job.company_name || 'C').charAt(0).toUpperCase()}</Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="subtitle2" sx={{ color: ink, fontWeight: 800, lineHeight: 1.3, overflowWrap: 'anywhere' }}>{job.title}</Typography><Typography variant="caption" sx={{ display: 'block', mt: 0.2, color: muted }}>{job.company_name || 'Company not listed'}</Typography></Box>
        {score !== null ? <Box sx={{ minWidth: 72, textAlign: 'right' }}><Typography variant="caption" sx={{ color: score >= 70 ? '#15803D' : '#1D4ED8', fontWeight: 800 }}>{score}% match</Typography><LinearProgress variant="determinate" value={score} sx={{ mt: 0.35, height: 4, borderRadius: 4, bgcolor: '#EAF0F6', '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: score >= 70 ? '#16A34A' : '#2563EB' } }} /></Box> : null}
      </Stack>
      <Stack direction="row" flexWrap="wrap" gap={0.55} sx={{ mt: 1 }}>
        <Chip size="small" icon={<PublicIcon />} label={job.location || 'Remote'} sx={{ ...compactChipSx, bgcolor: '#EFF8FF', color: '#175CD3', border: '1px solid #D6EAFB' }} />
        {job.job_type ? <Chip size="small" icon={<WorkOutlineIcon />} label={job.job_type} variant="outlined" sx={compactChipSx} /> : null}
        {job.experience ? <Chip size="small" label={job.experience} variant="outlined" sx={compactChipSx} /> : null}
      </Stack>
      {salary ? <Typography variant="body2" sx={{ mt: 0.75, color: '#344054', fontWeight: 750, fontSize: 13 }}>{salary}{job.salary_period ? ` · ${job.salary_period}` : ''}</Typography> : null}
      {jobSkills.length ? <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.8 }}>
        {jobSkills.slice(0, 4).map((skill) => { const matched = matchingSkills.some((match) => skillMatches(match, skill)); return <Chip key={skill} size="small" label={skill} variant={matched ? 'filled' : 'outlined'} color={matched ? 'success' : 'default'} sx={{ ...compactChipSx, height: 23, '& .MuiChip-label': { px: 0.8, fontSize: 11, fontWeight: 600 } }} />; })}
        {jobSkills.length > 4 ? <Chip size="small" label={`+${jobSkills.length - 4}`} variant="outlined" sx={{ ...compactChipSx, height: 23 }} /> : null}
      </Stack> : null}
      {score !== null ? <Box sx={{ mt: 0.85 }}><Typography variant="caption" sx={{ color: '#475467', fontWeight: 750, fontSize: 11.5 }}>Why this matches</Typography>{reasons.length ? <Stack spacing={0.35} sx={{ mt: 0.3 }}>{reasons.slice(0, 3).map((reason) => <Stack key={reason} direction="row" alignItems="center" spacing={0.55}><CheckCircleOutlineIcon sx={{ fontSize: 14, color: '#16804A' }} /><Typography variant="caption" sx={{ color: '#475467', fontSize: 11.5 }}>{reason}</Typography></Stack>)}</Stack> : <Typography variant="caption" sx={{ display: 'block', mt: 0.3, color: muted }}>No direct profile overlap found.</Typography>}</Box> : null}
      <Box sx={{ flex: 1, minHeight: 8 }} />
      <Divider sx={{ mt: 1, mb: 0.75 }} />
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={0.6}>
        <Typography variant="caption" sx={{ color: muted, fontSize: 11 }}>{postedLabel(job.created_at) ? `Posted ${postedLabel(job.created_at)}` : 'Date unavailable'}</Typography>
        <Stack direction="row" alignItems="center" gap={0.5}>
          <IconButton aria-label={isSaved ? 'Unsave job' : 'Save job'} title={isSaved ? 'Saved' : 'Save job'} disabled={savingId === String(job.id)} onClick={() => void toggleSaved(job)} size="small" sx={{ width: 32, height: 32, border: '1px solid #E2E8F0', borderRadius: 1.2, color: isSaved ? '#C2185B' : '#475467', '&:hover': { bgcolor: '#EAECF0', color: actionNavy } }}>{isSaved ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}</IconButton>
          <Button size="small" variant="contained" onClick={() => openJob(job)} endIcon={hasExternal ? <OpenInNewIcon sx={{ fontSize: '15px !important' }} /> : undefined} sx={{ minHeight: 32, px: 1.1, borderRadius: 1.2, textTransform: 'none', fontSize: 12, fontWeight: 750, bgcolor: actionNavy, boxShadow: 'none', '&:hover': { bgcolor: '#061A30', boxShadow: '0 2px 6px rgba(11,39,69,0.22)' } }}>{hasExternal ? 'View Job' : 'Apply Now'}</Button>
        </Stack>
      </Stack>
    </Card>;
  };

  if (loading) return <Stack spacing={1.25} sx={{ minWidth: 0 }}><LinearProgress /><Typography variant="body2" sx={{ color: muted }}>Finding remote opportunities for your profile...</Typography><Box className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{[0, 1, 2].map((item) => <Card key={item} sx={{ ...surface, p: 2, minHeight: 190 }}><CircularProgress size={20} /></Card>)}</Box></Stack>;

  if (error && !jobs.length) return <Alert severity="error" action={<Button size="small" onClick={() => setReloadKey((current) => current + 1)} sx={secondaryActionSx}>Retry</Button>}>{error}</Alert>;

  return <Stack spacing={1.35} sx={{ minWidth: 0 }}>
    <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 1.2, flexWrap: 'wrap' }}>
      <Box><Stack direction="row" alignItems="center" gap={0.7}><AutoAwesomeIcon sx={{ fontSize: 18, color: '#B7791F' }} /><Typography variant="caption" sx={{ color: '#946200', fontWeight: 850, textTransform: 'uppercase' }}>Premium Remote Access</Typography></Stack><Typography variant="h5" sx={{ mt: 0.25, color: ink, fontSize: { xs: 20, sm: 23 }, fontWeight: 850 }}>Remote Job Hub</Typography><Typography variant="body2" sx={{ mt: 0.3, color: muted }}>Remote opportunities personalized to your skills, experience, and career goals.</Typography></Box>
      <Chip icon={<PublicIcon />} label={`${matchingJobs.length} remote jobs matched`} sx={{ bgcolor: '#EFF8FF', color: '#175CD3', fontWeight: 800 }} />
    </Box>

    {missing.length ? <Card sx={{ ...surface, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1, p: 1.25, bgcolor: '#FFFCF5', borderColor: '#FEC84B' }}><Box><Typography variant="body2" sx={{ color: ink, fontWeight: 800 }}>Improve your remote matches</Typography><Typography variant="caption" sx={{ color: muted }}>Your profile is missing {missing.join(', ')}. Add these details to get more useful recommendations.</Typography></Box><Button size="small" variant="outlined" onClick={() => navigate(ROUTES.DASHBOARD_PROFILE)} sx={{ ...outlinedActionSx, fontWeight: 750 }}>Complete Profile</Button></Card> : null}

    <Card sx={{ ...surface, p: 0.8 }}>
      <Box className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_auto_170px_auto] gap-2" sx={{ alignItems: 'center' }}>
        <TextField fullWidth size="small" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void queryRemoteJobs(searchInput.trim(), filters); }} placeholder="Search title, company, skills" InputProps={{ startAdornment: <SearchIcon sx={{ mr: 0.75, color: muted, fontSize: 20 }} /> }} sx={{ '& .MuiOutlinedInput-root': { minHeight: 38, borderRadius: 1.4, bgcolor: '#FFFFFF', fontSize: 13 }, '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#98A2B3' }, '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: actionNavy } }} />
        <Button size="small" variant="outlined" startIcon={<FilterListIcon sx={{ fontSize: 18 }} />} onClick={() => { setDraftFilters(filters); setFilterOpen(true); }} sx={{ ...outlinedActionSx, minHeight: 38, px: 1.3, borderRadius: 1.4, whiteSpace: 'nowrap', fontWeight: 700 }}>Filters</Button>
        <FormControl size="small" sx={{ minWidth: { sm: 170 }, '& .MuiOutlinedInput-root': { minHeight: 38, borderRadius: 1.4, fontSize: 13 }, '& .MuiInputLabel-root': { fontSize: 13, '&.Mui-focused': { color: actionNavy } }, '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#98A2B3' }, '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: actionNavy } }}><InputLabel>Sort by</InputLabel><Select value={sort} label="Sort by" onChange={(event) => setSort(event.target.value)} MenuProps={selectMenuProps}><MenuItem value="best">Best Match</MenuItem><MenuItem value="newest">Newest</MenuItem>{hasSalary ? <><MenuItem value="salaryHigh">Salary: High to Low</MenuItem><MenuItem value="salaryLow">Salary: Low to High</MenuItem></> : null}</Select></FormControl>
        <Button size="small" variant="contained" startIcon={<SearchIcon sx={{ fontSize: 18 }} />} onClick={() => void queryRemoteJobs(searchInput.trim(), filters)} sx={{ minHeight: 38, px: 1.45, borderRadius: 1.4, textTransform: 'none', fontWeight: 750, bgcolor: actionNavy, boxShadow: 'none', '&:hover': { bgcolor: '#061A30' } }}>Search</Button>
      </Box>
    </Card>
    {error ? <Alert severity="warning">{error}</Alert> : null}

    <Box>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={1} sx={{ mb: 0.9 }}>
        <Box><Typography variant="h6" sx={{ color: ink, fontWeight: 850 }}>Top Remote Matches For You</Typography><Typography variant="caption" sx={{ color: muted }}>Based on your skills, preferred roles, and experience.</Typography></Box>
        {topMatches.length ? <Typography variant="caption" sx={{ color: muted }}>{topMatches.length} strongest profile matches</Typography> : null}
      </Stack>
      {topMatches.length ? <Box className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{topMatches.map(jobCard)}</Box> : <Card sx={{ ...surface, p: 1.5 }}><Typography variant="body2" sx={{ color: ink, fontWeight: 750 }}>{!matchingJobs.length ? 'No remote jobs match your current search or filters.' : missing.length ? 'Complete more of your profile to calculate personalized match scores.' : 'No match score is available for these jobs from the profile information provided.'}</Typography><Typography variant="caption" sx={{ color: muted }}>{!matchingJobs.length ? 'Try clearing filters or updating your preferred roles and skills.' : 'No match percentage is fabricated when profile signals are insufficient.'}</Typography></Card>}
    </Box>

    <Box>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={1} sx={{ mb: 0.9 }}><Box><Typography variant="h6" sx={{ color: ink, fontWeight: 850 }}>High-Match Remote Jobs</Typography><Typography variant="caption" sx={{ color: muted }}>Deterministic profile relevance of 70% or higher.</Typography></Box></Stack>
      {highMatches.length ? extraHighMatches.length ? <Box className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{extraHighMatches.map(jobCard)}</Box> : <Typography variant="body2" sx={{ color: muted }}>Your top matches are listed above.</Typography> : <Card sx={{ ...surface, p: 1.5 }}><Typography variant="body2" sx={{ color: ink, fontWeight: 750 }}>No high-match remote jobs right now.</Typography><Typography variant="caption" sx={{ color: muted }}>{matchingJobs.length ? 'Lower-match relevant opportunities are listed below.' : 'Try updating your preferred roles or skills.'}</Typography></Card>}
    </Box>

    {otherMatches.length ? <Box><Typography variant="subtitle1" sx={{ color: ink, fontWeight: 850, mb: 0.9 }}>Other Remote Opportunities</Typography><Box className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{otherMatches.map(jobCard)}</Box></Box> : null}

    <Box><Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={1} sx={{ mb: 0.9 }}><Box><Typography variant="h6" sx={{ color: ink, fontWeight: 850 }}>Fresh Remote Jobs</Typography><Typography variant="caption" sx={{ color: muted }}>Recently added remote opportunities.</Typography></Box><Button size="small" onClick={() => { clearFilters(); setSort('newest'); }} sx={secondaryActionSx}>View All Remote Jobs</Button></Stack>{freshJobs.length ? <Box className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{freshJobs.map((job) => jobCard(buildMatch(job, profile || {})))}</Box> : <Card sx={{ ...surface, p: 1.5 }}><Typography variant="body2" sx={{ color: muted }}>No new remote opportunities have been added recently.</Typography></Card>}</Box>

    <Card sx={{ ...surface, overflow: 'hidden' }}><Box sx={{ p: 1.4, borderBottom: '1px solid #EAECF0' }}><Typography variant="subtitle1" sx={{ color: ink, fontWeight: 850 }}>Your Remote Applications</Typography><Typography variant="caption" sx={{ color: muted }}>Remote jobs you’ve already applied to.</Typography></Box>{remoteApplications.length ? remoteApplications.slice(0, 6).map((application, index) => { const job = Array.isArray(application.jobs) ? application.jobs[0] : application.jobs; return <Stack key={application.id} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={0.7} sx={{ px: 1.4, py: 1, borderBottom: index < remoteApplications.length - 1 ? '1px solid #F0F2F5' : 'none' }}><Box><Typography variant="body2" sx={{ color: ink, fontWeight: 750 }}>{job?.title || 'Job title unavailable'}</Typography><Typography variant="caption" sx={{ color: muted }}>{job?.company_name || 'Company not listed'} · Applied {postedLabel(application.applied_at)}</Typography></Box><Chip size="small" label={String(application.status || 'Applied').replace(/_/g, ' ')} sx={{ textTransform: 'capitalize' }} /></Stack>; }) : <Box sx={{ p: 1.5 }}><Typography variant="body2" sx={{ color: muted }}>No remote applications yet.</Typography></Box>}<Box sx={{ p: 1.1, borderTop: '1px solid #EAECF0' }}><Button size="small" onClick={() => navigate(ROUTES.DASHBOARD_APPLICATIONS)} sx={secondaryActionSx}>View Applications</Button></Box></Card>

    {page * PAGE_SIZE < total ? <Button onClick={() => void loadMore()} disabled={loadingMore} variant="outlined" sx={{ ...outlinedActionSx, alignSelf: 'center', minHeight: 36, px: 1.4, borderRadius: 1.3 }}>{loadingMore ? <CircularProgress size={18} /> : 'Load more remote jobs'}</Button> : null}

    <Drawer anchor="right" open={filterOpen} onClose={() => setFilterOpen(false)} PaperProps={{ sx: { width: { xs: 'min(92vw, 380px)', sm: 380 }, p: { xs: 1.8, sm: 2.2 }, overflowY: 'auto', bgcolor: '#FBFCFE', boxShadow: '-12px 0 32px rgba(15,23,42,0.12)', '& .MuiOutlinedInput-root': { borderRadius: 1.35, bgcolor: '#FFFFFF', fontSize: 13 }, '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#98A2B3' }, '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: actionNavy }, '& .MuiInputLabel-root.Mui-focused': { color: actionNavy }, '& .MuiFormLabel-root': { fontSize: 13 }, '& .MuiMenuItem-root': { minHeight: 36, fontSize: 13 } } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, pb: 1.2, borderBottom: '1px solid #E4E7EC' }}><Box><Typography variant="subtitle1" sx={{ color: ink, fontWeight: 850 }}>Filter remote jobs</Typography><Typography variant="caption" sx={{ color: muted }}>Refine the live remote listing results.</Typography></Box><IconButton aria-label="Close filters" onClick={() => setFilterOpen(false)} size="small" sx={{ width: 32, height: 32, border: '1px solid #E4E7EC', borderRadius: 1.2 }}><CloseIcon fontSize="small" /></IconButton></Stack>
      <Stack spacing={1.1}>
        <TextField select fullWidth size="small" SelectProps={{ MenuProps: selectMenuProps }} label="Location / Country" value={draftFilters.location} onChange={(event) => setDraftFilters((current) => ({ ...current, location: event.target.value }))}><MenuItem value="">Any location</MenuItem>{locationOptions.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
        <TextField select fullWidth size="small" SelectProps={{ MenuProps: selectMenuProps }} label="Category" value={draftFilters.category} onChange={(event) => setDraftFilters((current) => ({ ...current, category: event.target.value }))}><MenuItem value="">Any category</MenuItem>{categoryOptions.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
        <TextField select fullWidth size="small" SelectProps={{ MenuProps: selectMenuProps }} label="Job type" value={draftFilters.jobType} onChange={(event) => setDraftFilters((current) => ({ ...current, jobType: event.target.value }))}><MenuItem value="">Any job type</MenuItem>{typeOptions.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
        <TextField select fullWidth size="small" SelectProps={{ MenuProps: selectMenuProps }} label="Experience" value={draftFilters.experience} onChange={(event) => setDraftFilters((current) => ({ ...current, experience: event.target.value }))}><MenuItem value="">Any experience</MenuItem>{experienceOptions.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
        {hasSalary ? <Stack direction="row" spacing={1}><TextField fullWidth size="small" type="number" label="Minimum salary" value={draftFilters.salaryMin} onChange={(event) => setDraftFilters((current) => ({ ...current, salaryMin: event.target.value }))} /><TextField fullWidth size="small" type="number" label="Maximum salary" value={draftFilters.salaryMax} onChange={(event) => setDraftFilters((current) => ({ ...current, salaryMax: event.target.value }))} /></Stack> : null}
        <TextField select fullWidth size="small" SelectProps={{ MenuProps: selectMenuProps }} label="Posted date" value={draftFilters.postedWithin} onChange={(event) => setDraftFilters((current) => ({ ...current, postedWithin: event.target.value }))}><MenuItem value="">Any time</MenuItem><MenuItem value="1">Last 24 hours</MenuItem><MenuItem value="7">Last 7 days</MenuItem><MenuItem value="15">Last 15 days</MenuItem><MenuItem value="30">Last 30 days</MenuItem></TextField>
        <Divider sx={{ my: 0.4 }} />
        <Stack direction="row" spacing={0.8} sx={{ pt: 0.4 }}><Button size="small" fullWidth variant="outlined" onClick={() => { setDraftFilters(EMPTY_FILTERS); void queryRemoteJobs(search, EMPTY_FILTERS); setFilterOpen(false); }} sx={{ ...outlinedActionSx, minHeight: 36, borderRadius: 1.3, fontWeight: 700 }}>Clear Filters</Button><Button size="small" fullWidth variant="contained" onClick={() => { void queryRemoteJobs(search, draftFilters); setFilterOpen(false); }} sx={{ minHeight: 36, borderRadius: 1.3, textTransform: 'none', fontWeight: 750, bgcolor: actionNavy, boxShadow: 'none', '&:hover': { bgcolor: '#061A30' } }}>Apply Filters</Button></Stack>
      </Stack>
    </Drawer>
  </Stack>;
};