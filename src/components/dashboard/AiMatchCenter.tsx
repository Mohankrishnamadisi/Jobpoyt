import React, { Suspense, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AutoAwesome as AiIcon, CompareArrows as CompareIcon, Search as SearchIcon } from '@mui/icons-material';
import type { Job } from '@types';
import {
  aiMatchCenterService,
  type AiMatchCandidateContext,
  type AiMatchJobCardModel,
} from '@services/aiMatchCenter';
import './AiMatchCenter.css';

const AiMatchJobCard = React.lazy(() => import('./AiMatchJobCard'));

type MatchFilter = 'highest_match' | 'newest' | 'highest_salary' | 'remote_only' | 'hybrid' | 'onsite';
type MatchSort = 'highest_match_score' | 'highest_selection_probability' | 'highest_salary' | 'newest';

interface AiMatchCenterProps {
  jobs: Job[];
  context: AiMatchCandidateContext;
  onApplyNow: (jobId: string) => void;
  onSaveJob: (jobId: string) => void;
  onImproveMatch: (jobId: string) => void;
  onResumeOptimizer: () => void;
  onMockInterview: () => void;
  onViewDetails: (jobId: string) => void;
}

const compareDate = (job: AiMatchJobCardModel): number => {
  const createdAt = String(job.rawJob.created_at || job.rawJob.createdAt || '');
  const timestamp = new Date(createdAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const salaryValue = (salaryLabel: string): number => {
  const nums = salaryLabel.match(/\d+/g);
  if (!nums || nums.length === 0) return 0;
  return Number(nums[nums.length - 1]) || 0;
};

export const AiMatchCenter: React.FC<AiMatchCenterProps> = ({
  jobs,
  context,
  onApplyNow,
  onSaveJob,
  onImproveMatch,
  onResumeOptimizer,
  onMockInterview,
  onViewDetails,
}) => {
  const [filter, setFilter] = useState<MatchFilter>('highest_match');
  const [sortBy, setSortBy] = useState<MatchSort>('highest_match_score');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [experienceFilter, setExperienceFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');

  const scored = useMemo(() => aiMatchCenterService.scoreJobs(context, jobs), [context, jobs]);

  const companies = useMemo(() => Array.from(new Set(scored.map((item) => item.companyName))).slice(0, 20), [scored]);
  const locations = useMemo(() => Array.from(new Set(scored.map((item) => item.location))).slice(0, 20), [scored]);

  const filtered = useMemo(() => {
    let list = [...scored];

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter((item) => `${item.title} ${item.companyName} ${item.location} ${item.workMode}`.toLowerCase().includes(query));
    }

    if (companyFilter !== 'all') {
      list = list.filter((item) => item.companyName === companyFilter);
    }
    if (locationFilter !== 'all') {
      list = list.filter((item) => item.location === locationFilter);
    }
    if (experienceFilter !== 'all') {
      list = list.filter((item) => String(item.rawJob.experience || '').toLowerCase().includes(experienceFilter));
    }

    if (filter === 'remote_only') list = list.filter((item) => item.workMode === 'Remote');
    if (filter === 'hybrid') list = list.filter((item) => item.workMode === 'Hybrid');
    if (filter === 'onsite') list = list.filter((item) => item.workMode === 'Onsite');

    if (filter === 'newest') {
      list.sort((a, b) => compareDate(b) - compareDate(a));
    }

    if (filter === 'highest_salary') {
      list.sort((a, b) => salaryValue(b.salaryLabel) - salaryValue(a.salaryLabel));
    }

    if (sortBy === 'highest_match_score') {
      list.sort((a, b) => b.analysis.overallMatchScore - a.analysis.overallMatchScore);
    }
    if (sortBy === 'highest_selection_probability') {
      list.sort((a, b) => b.analysis.selectionProbability - a.analysis.selectionProbability);
    }
    if (sortBy === 'highest_salary') {
      list.sort((a, b) => salaryValue(b.salaryLabel) - salaryValue(a.salaryLabel));
    }
    if (sortBy === 'newest') {
      list.sort((a, b) => compareDate(b) - compareDate(a));
    }

    return list;
  }, [companyFilter, experienceFilter, filter, locationFilter, scored, searchQuery, sortBy]);

  const topTen = useMemo(() => filtered.slice(0, 10), [filtered]);
  const summary = useMemo(() => aiMatchCenterService.summarize(topTen), [topTen]);

  const compareOptions = useMemo(() => topTen.map((item) => ({ id: item.id, label: `${item.title} - ${item.companyName}` })), [topTen]);

  const compareJobA = useMemo(() => topTen.find((item) => item.id === compareA), [compareA, topTen]);
  const compareJobB = useMemo(() => topTen.find((item) => item.id === compareB), [compareB, topTen]);

  return (
    <Card className="ai-match-center ai-match-center-surface rounded-3xl bg-slate-50/80 shadow-sm" sx={{ borderRadius: 4, mb: 3, border: (theme) => `1px solid ${theme.palette.divider}` }}>
      <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', lg: 'center' }} spacing={2} sx={{ mb: 3 }}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.7 }}>
              <Box className="rounded-xl bg-indigo-100 p-2" sx={{ display: 'flex' }}><AiIcon sx={{ color: '#4F46E5' }} /></Box>
              <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>AI Match Center</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">Find roles that fit your skills, experience, preferences, and career direction.</Typography>
          </Box>
          <Alert icon={<AiIcon />} severity="info" sx={{ py: 0.5, borderRadius: 2, maxWidth: { xs: '100%', lg: 420 } }}>
            Scored from your current profile and job preferences.
          </Alert>
        </Stack>

        <Box className="rounded-2xl bg-white p-3 shadow-sm sm:p-4" sx={{ mb: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Refine your matches</Typography>
              <Typography variant="caption" color="text.secondary">Use multiple filters to narrow the result set.</Typography>
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main' }}>{topTen.length} of {filtered.length} matches shown</Typography>
          </Stack>
          <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}><TextField fullWidth size="small" label="Search roles or companies" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="e.g. React, product, remote" InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} /></Grid>
          <Grid item xs={12} sm={6} md={2}><FormControl fullWidth size="small"><InputLabel>Filter</InputLabel><Select value={filter} label="Filter" onChange={(e) => setFilter(e.target.value as MatchFilter)}><MenuItem value="highest_match">Highest Match</MenuItem><MenuItem value="newest">Newest Jobs</MenuItem><MenuItem value="highest_salary">Highest Salary</MenuItem><MenuItem value="remote_only">Remote Only</MenuItem><MenuItem value="hybrid">Hybrid</MenuItem><MenuItem value="onsite">Onsite</MenuItem></Select></FormControl></Grid>
          <Grid item xs={12} sm={6} md={2}><FormControl fullWidth size="small"><InputLabel>Sort</InputLabel><Select value={sortBy} label="Sort" onChange={(e) => setSortBy(e.target.value as MatchSort)}><MenuItem value="highest_match_score">Highest Match Score</MenuItem><MenuItem value="highest_selection_probability">Highest Selection Probability</MenuItem><MenuItem value="highest_salary">Highest Salary</MenuItem><MenuItem value="newest">Newest</MenuItem></Select></FormControl></Grid>
          <Grid item xs={12} sm={6} md={2}><FormControl fullWidth size="small"><InputLabel>Company</InputLabel><Select value={companyFilter} label="Company" onChange={(e) => setCompanyFilter(e.target.value)}><MenuItem value="all">All</MenuItem>{companies.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={12} sm={6} md={2}><FormControl fullWidth size="small"><InputLabel>Experience</InputLabel><Select value={experienceFilter} label="Experience" onChange={(e) => setExperienceFilter(e.target.value)}><MenuItem value="all">All</MenuItem><MenuItem value="0">0-1</MenuItem><MenuItem value="1">1-3</MenuItem><MenuItem value="3">3-5</MenuItem><MenuItem value="5">5+</MenuItem></Select></FormControl></Grid>
          <Grid item xs={12} sm={6} md={2}><FormControl fullWidth size="small"><InputLabel>Location</InputLabel><Select value={locationFilter} label="Location" onChange={(e) => setLocationFilter(e.target.value)}><MenuItem value="all">All</MenuItem>{locations.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={12} sm={6} md={2}><Button fullWidth variant="outlined" onClick={() => { setSearchQuery(''); setFilter('highest_match'); setSortBy('highest_match_score'); setCompanyFilter('all'); setExperienceFilter('all'); setLocationFilter('all'); }}>Reset filters</Button></Grid>
          </Grid>
        </Box>

        <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
          <Grid item xs={12} sm={6} md={2.4}><Card className="ai-match-metric-card" sx={{ borderRadius: 2.4, border: (theme) => `1px solid ${theme.palette.divider}` }}><CardContent><Typography variant="caption" color="text.secondary">Average Match Score</Typography><Typography variant="h5" sx={{ fontWeight: 900, color: '#4F46E5', mt: 0.4 }}>{summary.averageMatchScore}%</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={2.4}><Card className="ai-match-metric-card" sx={{ borderRadius: 2.4, border: (theme) => `1px solid ${theme.palette.divider}` }}><CardContent><Typography variant="caption" color="text.secondary">Selection Probability</Typography><Typography variant="h5" sx={{ fontWeight: 900, color: '#0284C7', mt: 0.4 }}>{summary.averageSelectionProbability}%</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={2.4}><Card className="ai-match-metric-card" sx={{ borderRadius: 2.4, border: (theme) => `1px solid ${theme.palette.divider}` }}><CardContent><Typography variant="caption" color="text.secondary">Best Matching Skill</Typography><Typography variant="subtitle1" sx={{ fontWeight: 900, mt: 0.5 }}>{summary.bestMatchingSkill}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={2.4}><Card className="ai-match-metric-card" sx={{ borderRadius: 2.4, border: (theme) => `1px solid ${theme.palette.divider}` }}><CardContent><Typography variant="caption" color="text.secondary">Weakest Area</Typography><Typography variant="subtitle1" sx={{ fontWeight: 900, mt: 0.5 }}>{summary.weakestArea}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} md={6}><Card className="ai-match-metric-card" sx={{ borderRadius: 2.4, border: (theme) => `1px solid ${theme.palette.divider}` }}><CardContent><Typography variant="caption" color="text.secondary">Recommended Learning</Typography><Typography variant="body2" sx={{ fontWeight: 700, mt: 0.6 }}>{summary.recommendedLearning}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} md={6}><Card className="ai-match-metric-card" sx={{ borderRadius: 2.4, border: (theme) => `1px solid ${theme.palette.divider}` }}><CardContent><Typography variant="caption" color="text.secondary">Profile Improvement</Typography><Typography variant="body2" sx={{ fontWeight: 700, mt: 0.6 }}>{summary.profileImprovement}</Typography></CardContent></Card></Grid>
        </Grid>

        <Card sx={{ borderRadius: 3, border: (theme) => `1px solid ${theme.palette.divider}`, mb: 1.8 }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.1 }}>
              <CompareIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Compare Jobs (Job A vs Job B)</Typography>
            </Stack>
            <Grid container spacing={1.2} alignItems="center" sx={{ mb: 1.1 }}>
              <Grid item xs={12} md={5}><FormControl fullWidth size="small"><InputLabel>Job A</InputLabel><Select value={compareA} label="Job A" onChange={(e) => setCompareA(e.target.value)}><MenuItem value="">Select Job A</MenuItem>{compareOptions.map((option) => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}</Select></FormControl></Grid>
              <Grid item xs={12} md={5}><FormControl fullWidth size="small"><InputLabel>Job B</InputLabel><Select value={compareB} label="Job B" onChange={(e) => setCompareB(e.target.value)}><MenuItem value="">Select Job B</MenuItem>{compareOptions.map((option) => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}</Select></FormControl></Grid>
              <Grid item xs={12} md={2}><Button fullWidth variant="outlined" disabled={!compareA || !compareB}>Compare</Button></Grid>
            </Grid>
            {compareJobA && compareJobB ? (
              <Grid container spacing={1.2}>
                <Grid item xs={12} md={6}><Card sx={{ borderRadius: 2.4, border: (theme) => `1px solid ${theme.palette.divider}` }}><CardContent><Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{compareJobA.title}</Typography><Typography variant="body2" color="text.secondary">{compareJobA.companyName}</Typography><Typography variant="body2" sx={{ mt: 0.4 }}>Salary: {compareJobA.salaryLabel}</Typography><Typography variant="body2">Skills: {compareJobA.analysis.requiredSkills.slice(0, 5).join(', ') || 'N/A'}</Typography><Typography variant="body2">Experience: {String(compareJobA.rawJob.experience || 'N/A')}</Typography><Typography variant="body2">Growth: {compareJobA.analysis.overallMatchScore}%</Typography><Typography variant="body2">Remote Flexibility: {compareJobA.workMode}</Typography><Typography variant="body2">Selection Probability: {compareJobA.analysis.selectionProbability}%</Typography></CardContent></Card></Grid>
                <Grid item xs={12} md={6}><Card sx={{ borderRadius: 2.4, border: (theme) => `1px solid ${theme.palette.divider}` }}><CardContent><Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{compareJobB.title}</Typography><Typography variant="body2" color="text.secondary">{compareJobB.companyName}</Typography><Typography variant="body2" sx={{ mt: 0.4 }}>Salary: {compareJobB.salaryLabel}</Typography><Typography variant="body2">Skills: {compareJobB.analysis.requiredSkills.slice(0, 5).join(', ') || 'N/A'}</Typography><Typography variant="body2">Experience: {String(compareJobB.rawJob.experience || 'N/A')}</Typography><Typography variant="body2">Growth: {compareJobB.analysis.overallMatchScore}%</Typography><Typography variant="body2">Remote Flexibility: {compareJobB.workMode}</Typography><Typography variant="body2">Selection Probability: {compareJobB.analysis.selectionProbability}%</Typography></CardContent></Card></Grid>
              </Grid>
            ) : (
              <Typography variant="body2" color="text.secondary">Select Job A and Job B to compare salary, skills, experience, growth, remote flexibility and selection probability.</Typography>
            )}
          </CardContent>
        </Card>

        <Box className="ai-match-job-grid">
          {topTen.length > 0 ? topTen.map((item, idx) => (
            <Suspense
              key={item.id}
              fallback={
                <Card sx={{ borderRadius: 3, border: (theme) => `1px solid ${theme.palette.divider}` }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Loading job match card...</Typography>
                  </CardContent>
                </Card>
              }
            >
              <AiMatchJobCard
                item={item}
                index={idx}
                onApplyNow={onApplyNow}
                onSaveJob={onSaveJob}
                onImproveMatch={onImproveMatch}
                onResumeOptimizer={onResumeOptimizer}
                onMockInterview={onMockInterview}
                onViewDetails={onViewDetails}
              />
            </Suspense>
          )) : (
            <Card sx={{ borderRadius: 3, border: (theme) => `1px solid ${theme.palette.divider}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>No match results yet</Typography>
                <Typography variant="body2" color="text.secondary">Update your skills, experience, and preferences to generate AI match insights.</Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default AiMatchCenter;
