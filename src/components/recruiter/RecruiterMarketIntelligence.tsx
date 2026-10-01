import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { RecruiterPageHero } from './RecruiterPageHero';
import {
  AutoAwesome as AiIcon,
  Download as DownloadIcon,
  Insights as InsightsIcon,
  LocationOn as LocationIcon,
  NotificationsActive as AlertIcon,
  Paid as SalaryIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { themeColors } from '@styles/recruiterTheme';
import { jobService } from '@services/api';
import {
  marketIntelligenceService,
  type CompetitorInsightRow,
  type JobHealthRow,
  type LocationIntelligenceRow,
  type MarketFilters,
} from '@services/marketIntelligence';

interface RecruiterMarketIntelligenceProps {
  ownerId: string;
  currentUserId: string;
}

type MarketTab =
  | 'overview'
  | 'salary'
  | 'hiring-demand'
  | 'talent'
  | 'competition'
  | 'skills'
  | 'job-optimization'
  | 'supply-demand'
  | 'location'
  | 'forecast'
  | 'competitors'
  | 'job-health'
  | 'recommendations'
  | 'industry-reports'
  | 'executive-reports'
  | 'alerts'
  | 'daily-briefing'
  | 'integration';

const MotionBox = motion(Box);

const defaultFilters: MarketFilters = {
  country: 'India',
  state: 'All',
  city: 'All',
  industry: 'All',
  jobCategory: 'All',
  experience: 'All',
  salaryRange: 'All',
  remote: true,
  hybrid: true,
  onsite: true,
};

const statCard = (title: string, value: string | number, color = '#1D4ED8') => (
  <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
    <CardContent>
      <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>{title}</Typography>
      <Typography variant="h6" sx={{ mt: 0.6, fontWeight: 800, color }}>{value}</Typography>
    </CardContent>
  </Card>
);

const formatCurrency = (amount: number): string => `INR ${Math.round(amount).toLocaleString('en-IN')}`;

const downloadText = (fileName: string, content: string): void => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const MiniBars: React.FC<{ rows: Array<{ label: string; value: number }>; color?: string }> = ({ rows, color = '#2563EB' }) => {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <Stack spacing={0.8}>
      {rows.map((row) => (
        <Box key={row.label}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption">{row.label}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>{row.value}</Typography>
          </Stack>
          <Box sx={{ mt: 0.3, height: 8, borderRadius: 999, backgroundColor: '#E5E7EB', overflow: 'hidden' }}>
            <Box sx={{ width: `${Math.round((row.value / max) * 100)}%`, height: '100%', backgroundColor: color }} />
          </Box>
        </Box>
      ))}
    </Stack>
  );
};

const ListBlock: React.FC<{ title: string; items: string[] }> = ({ title, items }) => (
  <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
    <CardContent>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>{title}</Typography>
      <Stack direction="row" spacing={0.7} sx={{ flexWrap: 'wrap' }}>
        {items.map((item) => <Chip key={item} size="small" label={item} />)}
      </Stack>
    </CardContent>
  </Card>
);

export const RecruiterMarketIntelligence: React.FC<RecruiterMarketIntelligenceProps> = ({ ownerId }) => {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const [tab, setTab] = useState<MarketTab>('overview');
  const [filters, setFilters] = useState<MarketFilters>(defaultFilters);
  const [loading, setLoading] = useState(true);

  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');

  const [salaryQuery, setSalaryQuery] = useState({
    jobTitle: 'Frontend Developer',
    location: 'Bangalore',
    experience: '3-5',
    industry: 'IT',
    employmentType: 'Full-time',
    workMode: 'Hybrid',
  });

  const [industryName, setIndustryName] = useState('IT');
  const [executiveReportType, setExecutiveReportType] = useState<'hiring_market' | 'salary_benchmark' | 'skill_trend' | 'competition' | 'location'>('hiring_market');
  const [executiveReportFormat, setExecutiveReportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');

  const [overview, setOverview] = useState<any>(null);
  const [salary, setSalary] = useState<any>(null);
  const [demand, setDemand] = useState<any>(null);
  const [talent, setTalent] = useState<any>(null);
  const [competition, setCompetition] = useState<any>(null);
  const [skills, setSkills] = useState<any>(null);
  const [optimization, setOptimization] = useState<any>(null);
  const [supplyDemand, setSupplyDemand] = useState<any>(null);
  const [locations, setLocations] = useState<LocationIntelligenceRow[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [competitors, setCompetitors] = useState<CompetitorInsightRow[]>([]);
  const [jobHealth, setJobHealth] = useState<JobHealthRow[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [dailyBriefing, setDailyBriefing] = useState<any>(null);

  const access = useMemo(() => marketIntelligenceService.getPlanAccess(ownerId), [ownerId]);

  const runLoad = async (): Promise<void> => {
    setLoading(true);
    try {
      const recruiterJobs = await jobService.getRecruiterJobs(ownerId).catch(() => []);
      setJobs(recruiterJobs || []);
      const effectiveJobId = selectedJobId || String(recruiterJobs?.[0]?.id || '');
      if (!selectedJobId && recruiterJobs?.[0]?.id) setSelectedJobId(String(recruiterJobs[0].id));

      const [
        nextOverview,
        nextSalary,
        nextDemand,
        nextTalent,
        nextCompetition,
        nextSkills,
        nextOptimization,
        nextSupplyDemand,
        nextLocations,
        nextForecast,
        nextCompetitors,
        nextJobHealth,
        nextRecommendations,
        nextAlerts,
        nextDailyBriefing,
      ] = await Promise.all([
        marketIntelligenceService.getOverview(ownerId, filters),
        marketIntelligenceService.getSalaryInsights(ownerId, salaryQuery),
        marketIntelligenceService.getHiringDemand(ownerId),
        marketIntelligenceService.getTalentAvailability(ownerId),
        marketIntelligenceService.getCompetitionAnalysis(ownerId),
        marketIntelligenceService.getSkillIntelligence(ownerId, effectiveJobId),
        marketIntelligenceService.optimizeJob(ownerId, effectiveJobId),
        marketIntelligenceService.getSupplyDemand(ownerId),
        marketIntelligenceService.getLocationIntelligence(ownerId),
        marketIntelligenceService.getHiringForecast(ownerId),
        marketIntelligenceService.getCompetitorInsights(ownerId),
        marketIntelligenceService.getJobHealthAnalysis(ownerId),
        marketIntelligenceService.getAiRecommendations(ownerId, effectiveJobId),
        marketIntelligenceService.getAlerts(ownerId),
        marketIntelligenceService.getDailyBriefing(ownerId),
      ]);

      setOverview(nextOverview);
      setSalary(nextSalary);
      setDemand(nextDemand);
      setTalent(nextTalent);
      setCompetition(nextCompetition);
      setSkills(nextSkills);
      setOptimization(nextOptimization);
      setSupplyDemand(nextSupplyDemand);
      setLocations(nextLocations);
      setForecast(nextForecast);
      setCompetitors(nextCompetitors);
      setJobHealth(nextJobHealth);
      setRecommendations(nextRecommendations);
      setAlerts(nextAlerts);
      setDailyBriefing(nextDailyBriefing);
    } catch (error) {
      console.error('Market intelligence load failed:', error);
      toast.error('Failed to load Market Intelligence data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!access.canAccess) return;
    runLoad();
  }, [ownerId, selectedJobId]);

  const applySalarySearch = async (): Promise<void> => {
    try {
      const next = await marketIntelligenceService.getSalaryInsights(ownerId, salaryQuery);
      setSalary(next);
      toast.success('Salary insights updated');
    } catch {
      toast.error('Unable to fetch salary insights');
    }
  };

  const applyFilters = async (): Promise<void> => {
    if (!access.canAccess) return;
    await runLoad();
    toast.success('Filters applied');
  };

  const generateIndustryReport = async (): Promise<void> => {
    try {
      const report = await marketIntelligenceService.getIndustryReport(ownerId, industryName);
      downloadText(`${industryName.toLowerCase().replace(/\s+/g, '_')}_market_report.md`, report);
      toast.success('Industry report generated');
    } catch {
      toast.error('Unable to generate industry report');
    }
  };

  const generateExecutiveReport = async (): Promise<void> => {
    try {
      const report = await marketIntelligenceService.getExecutiveReport(ownerId, executiveReportType, executiveReportFormat);
      downloadText(report.fileName, report.content);
      toast.success('Executive report generated');
    } catch {
      toast.error('Unable to generate executive report');
    }
  };

  if (!access.canAccess) {
    return (
      <Box sx={{ p: 1 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {access.message}
        </Alert>
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
          <CardContent>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Market Intelligence Locked</Typography>
            <Typography variant="body2" sx={{ color: themeColors.text.secondary, mb: 1.2 }}>
              Only Professional, Business, and Enterprise plans can access this module.
            </Typography>
            <Stack direction="row" spacing={0.8}>
              <Chip label={`Current Plan: ${access.planId.toUpperCase()}`} color="warning" />
              <Chip label="Upgrade from Billing & Subscription" color="info" />
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (loading || !overview || !salary || !demand || !talent || !competition || !skills || !optimization || !supplyDemand || !forecast || !dailyBriefing) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>Loading market intelligence...</Typography>
      </Box>
    );
  }

  return (
    <MotionBox initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <RecruiterPageHero
        eyebrow="Intelligence"
        icon={<InsightsIcon />}
        title="Market Intelligence & Salary Insights"
        description="Market demand, compensation benchmarks, talent supply, competitor insights, forecasting, and AI optimization."
        actions={(
          <>
            <Chip icon={<InsightsIcon />} label="Plan: Eligible" color="success" />
            <Chip icon={<AiIcon />} label="AI Driven" />
          </>
        )}
      />

      <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}`, mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Filters</Typography>
          <Grid container spacing={1}>
            <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Country" value={filters.country} onChange={(e) => setFilters((cur) => ({ ...cur, country: e.target.value }))} /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth size="small" label="State" value={filters.state} onChange={(e) => setFilters((cur) => ({ ...cur, state: e.target.value }))} /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth size="small" label="City" value={filters.city} onChange={(e) => setFilters((cur) => ({ ...cur, city: e.target.value }))} /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Industry" value={filters.industry} onChange={(e) => setFilters((cur) => ({ ...cur, industry: e.target.value }))} /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Job Category" value={filters.jobCategory} onChange={(e) => setFilters((cur) => ({ ...cur, jobCategory: e.target.value }))} /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Experience" value={filters.experience} onChange={(e) => setFilters((cur) => ({ ...cur, experience: e.target.value }))} /></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Salary Range" value={filters.salaryRange} onChange={(e) => setFilters((cur) => ({ ...cur, salaryRange: e.target.value }))} /></Grid>
            <Grid item xs={12} md={3}><FormControl fullWidth size="small"><InputLabel>Remote</InputLabel><Select label="Remote" value={filters.remote ? 'yes' : 'no'} onChange={(e) => setFilters((cur) => ({ ...cur, remote: e.target.value === 'yes' }))}><MenuItem value="yes">Yes</MenuItem><MenuItem value="no">No</MenuItem></Select></FormControl></Grid>
            <Grid item xs={12} md={3}><FormControl fullWidth size="small"><InputLabel>Hybrid</InputLabel><Select label="Hybrid" value={filters.hybrid ? 'yes' : 'no'} onChange={(e) => setFilters((cur) => ({ ...cur, hybrid: e.target.value === 'yes' }))}><MenuItem value="yes">Yes</MenuItem><MenuItem value="no">No</MenuItem></Select></FormControl></Grid>
            <Grid item xs={12} md={3}><FormControl fullWidth size="small"><InputLabel>Onsite</InputLabel><Select label="Onsite" value={filters.onsite ? 'yes' : 'no'} onChange={(e) => setFilters((cur) => ({ ...cur, onsite: e.target.value === 'yes' }))}><MenuItem value="yes">Yes</MenuItem><MenuItem value="no">No</MenuItem></Select></FormControl></Grid>
            <Grid item xs={12}><Button variant="contained" onClick={applyFilters}>Apply Filters</Button></Grid>
          </Grid>
        </CardContent>
      </Card>

      <Paper sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}`, mb: 2 }}>
        <Tabs value={tab} onChange={(_, value: MarketTab) => setTab(value)} variant={isTablet ? 'scrollable' : 'scrollable'} scrollButtons="auto" allowScrollButtonsMobile sx={{ minHeight: 54, px: 0.5, '& .MuiTabs-scroller': { overflowX: 'auto !important' }, '& .MuiTabs-scrollButtons': { width: 34, borderRadius: 1, mx: 0.5 }, '& .MuiTab-root': { textTransform: 'none', whiteSpace: 'nowrap', minHeight: 54, minWidth: 'max-content', px: 1.8, fontWeight: 700, fontSize: '0.82rem' } }}>
          <Tab value="overview" label="Overview" />
          <Tab value="salary" label="Salary Insights" />
          <Tab value="hiring-demand" label="Hiring Demand" />
          <Tab value="talent" label="Talent Availability" />
          <Tab value="competition" label="Competition" />
          <Tab value="skills" label="Skill Intelligence" />
          <Tab value="job-optimization" label="AI Job Optimization" />
          <Tab value="supply-demand" label="Supply vs Demand" />
          <Tab value="location" label="Location Intelligence" />
          <Tab value="forecast" label="Hiring Forecast" />
          <Tab value="competitors" label="Competitor Insights" />
          <Tab value="job-health" label="Job Health" />
          <Tab value="recommendations" label="AI Recommendations" />
          <Tab value="industry-reports" label="Industry Reports" />
          <Tab value="executive-reports" label="Executive Reports" />
          <Tab value="alerts" label="Alerts" />
          <Tab value="daily-briefing" label="Daily Briefing" />
          <Tab value="integration" label="Integrations" />
        </Tabs>
      </Paper>

      {tab === 'overview' && (
        <Grid container spacing={1.4}>
          <Grid item xs={12} sm={6} md={4}>{statCard('Market Demand', overview.marketDemand)}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Talent Availability', overview.talentAvailability, '#0F766E')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Average Salary', formatCurrency(overview.averageSalary), '#7C3AED')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Hiring Competition', overview.hiringCompetition, '#C2410C')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Open Positions', overview.openPositions, '#0369A1')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Remote Hiring Trend', `${overview.remoteHiringTrend}%`, '#0E7490')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Average Time To Hire', `${overview.averageTimeToHire} days`, '#D97706')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Skill Demand Score', overview.skillDemandScore, '#9333EA')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Market Health Score', overview.marketHealthScore, '#1D4ED8')}</Grid>
        </Grid>
      )}

      {tab === 'salary' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Salary Search</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Job Title" value={salaryQuery.jobTitle} onChange={(e) => setSalaryQuery((cur) => ({ ...cur, jobTitle: e.target.value }))} /></Grid>
                  <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Location" value={salaryQuery.location} onChange={(e) => setSalaryQuery((cur) => ({ ...cur, location: e.target.value }))} /></Grid>
                  <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Experience" value={salaryQuery.experience} onChange={(e) => setSalaryQuery((cur) => ({ ...cur, experience: e.target.value }))} /></Grid>
                  <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Industry" value={salaryQuery.industry} onChange={(e) => setSalaryQuery((cur) => ({ ...cur, industry: e.target.value }))} /></Grid>
                  <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Employment Type" value={salaryQuery.employmentType} onChange={(e) => setSalaryQuery((cur) => ({ ...cur, employmentType: e.target.value }))} /></Grid>
                  <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Work Mode" value={salaryQuery.workMode} onChange={(e) => setSalaryQuery((cur) => ({ ...cur, workMode: e.target.value }))} /></Grid>
                  <Grid item xs={12}><Button variant="contained" startIcon={<SalaryIcon />} onClick={applySalarySearch}>Search Salary Insights</Button></Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>{statCard('Minimum Salary', formatCurrency(salary.minimumSalary), '#0F766E')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Average Salary', formatCurrency(salary.averageSalary), '#1D4ED8')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Maximum Salary', formatCurrency(salary.maximumSalary), '#9333EA')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Median Salary', formatCurrency(salary.medianSalary), '#C2410C')}</Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Salary Trend</Typography><MiniBars rows={salary.salaryTrend.map((r: any) => ({ label: r.month, value: r.value }))} /></CardContent></Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Salary Comparison</Typography><MiniBars rows={salary.salaryComparison.map((r: any) => ({ label: r.label, value: r.value }))} color="#0F766E" /><Typography variant="body2" sx={{ mt: 1 }}>Salary Growth: <b>{salary.salaryGrowthPercent}%</b></Typography></CardContent></Card>
          </Grid>
        </Grid>
      )}

      {tab === 'hiring-demand' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}><Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Top Hiring Cities</Typography><MiniBars rows={demand.topHiringCities.map((r: any) => ({ label: r.city, value: r.jobs }))} /></CardContent></Card></Grid>
          <Grid item xs={12} md={4}><Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Fastest Growing Roles</Typography><MiniBars rows={demand.fastestGrowingRoles.map((r: any) => ({ label: r.role, value: r.growth }))} color="#9333EA" /></CardContent></Card></Grid>
          <Grid item xs={12} md={4}><Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Most In-Demand Skills</Typography><MiniBars rows={demand.mostInDemandSkills.map((r: any) => ({ label: r.skill, value: r.demand }))} color="#0F766E" /></CardContent></Card></Grid>
          <Grid item xs={12} md={6}><Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Fastest Growing Technologies</Typography><MiniBars rows={demand.fastestGrowingTechnologies.map((r: any) => ({ label: r.technology, value: r.growth }))} color="#C2410C" /></CardContent></Card></Grid>
          <Grid item xs={12} md={6}><Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Hiring Trend</Typography><MiniBars rows={demand.hiringTrend.map((r: any) => ({ label: r.month, value: r.demand }))} color="#0369A1" /><Typography variant="body2" sx={{ mt: 1 }}>Monthly Growth: <b>{demand.monthlyGrowth}%</b> | Yearly Growth: <b>{demand.yearlyGrowth}%</b></Typography></CardContent></Card></Grid>
        </Grid>
      )}

      {tab === 'talent' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={3}>{statCard('Candidate Availability', talent.candidateAvailability, '#1D4ED8')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Immediate Joiners', talent.immediateJoiners, '#0F766E')}</Grid>
          <Grid item xs={12} sm={6} md={2}>{statCard('Remote', talent.remoteCandidates, '#9333EA')}</Grid>
          <Grid item xs={12} sm={6} md={2}>{statCard('Hybrid', talent.hybridCandidates, '#0369A1')}</Grid>
          <Grid item xs={12} sm={6} md={2}>{statCard('Onsite', talent.onsiteCandidates, '#C2410C')}</Grid>
          <Grid item xs={12} md={6}><Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Experience Distribution</Typography><MiniBars rows={talent.experienceDistribution.map((r: any) => ({ label: r.bucket, value: r.count }))} /></CardContent></Card></Grid>
          <Grid item xs={12} md={6}><Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Notice Period Distribution</Typography><MiniBars rows={talent.noticePeriodDistribution.map((r: any) => ({ label: r.bucket, value: r.count }))} color="#0E7490" /></CardContent></Card></Grid>
        </Grid>
      )}

      {tab === 'competition' && (
        <TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Company</TableCell>
                <TableCell>Open Jobs</TableCell>
                <TableCell>Competition Level</TableCell>
                <TableCell>Average Salary</TableCell>
                <TableCell>Hiring Speed</TableCell>
                <TableCell>Talent Competition Score</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {competition.companiesHiring.map((row: any) => (
                <TableRow key={row.company}>
                  <TableCell>{row.company}</TableCell>
                  <TableCell>{row.openJobs}</TableCell>
                  <TableCell><Chip size="small" label={row.competitionLevel} color={row.competitionLevel === 'High' ? 'error' : row.competitionLevel === 'Medium' ? 'warning' : 'success'} /></TableCell>
                  <TableCell>{formatCurrency(row.averageSalary)}</TableCell>
                  <TableCell>{row.hiringSpeedDays} days</TableCell>
                  <TableCell>{row.talentCompetitionScore}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 'skills' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}><ListBlock title="Trending Skills" items={skills.trendingSkills} /></Grid>
          <Grid item xs={12} md={4}><ListBlock title="Declining Skills" items={skills.decliningSkills} /></Grid>
          <Grid item xs={12} md={4}><ListBlock title="Emerging Technologies" items={skills.emergingTechnologies} /></Grid>
          <Grid item xs={12} md={6}><ListBlock title="Most Requested Skills" items={skills.mostRequestedSkills} /></Grid>
          <Grid item xs={12} md={6}><ListBlock title="Most Missing Skills" items={skills.mostMissingSkills} /></Grid>
          <Grid item xs={12}><ListBlock title="Recommended Skills For Job" items={skills.recommendedSkillsForJob} /></Grid>
        </Grid>
      )}

      {tab === 'job-optimization' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Grid container spacing={1} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Select Job</InputLabel>
                      <Select value={selectedJobId} label="Select Job" onChange={(e) => setSelectedJobId(e.target.value)}>
                        {jobs.map((job) => <MenuItem key={job.id} value={String(job.id)}>{job.title}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={8}><Button variant="contained" onClick={runLoad}>Re-analyze Job</Button></Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}><Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Better Job Title</Typography><Typography variant="body2">{optimization.betterJobTitle}</Typography><Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 700 }}>Salary Improvement</Typography><Typography variant="body2">{optimization.salaryImprovement}</Typography><Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 700 }}>Deadline Suggestion</Typography><Typography variant="body2">{optimization.applicationDeadlineSuggestion}</Typography><Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 700 }}>Remote Work Recommendation</Typography><Typography variant="body2">{optimization.remoteWorkRecommendation}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} md={6}><Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Hiring Speed Prediction</Typography><Typography variant="body2">{optimization.hiringSpeedPredictionDays} days</Typography><Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 700 }}>Application Prediction</Typography><Typography variant="body2">{optimization.applicationPrediction}</Typography><Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 700 }}>Required Skills</Typography><Stack direction="row" spacing={0.6} sx={{ flexWrap: 'wrap', mt: 0.4 }}>{optimization.requiredSkills.map((s: string) => <Chip key={s} size="small" label={s} />)}</Stack><Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 700 }}>Preferred Skills</Typography><Stack direction="row" spacing={0.6} sx={{ flexWrap: 'wrap', mt: 0.4 }}>{optimization.preferredSkills.map((s: string) => <Chip key={s} size="small" label={s} />)}</Stack></CardContent></Card></Grid>
          <Grid item xs={12}><Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Job Description Improvements</Typography><Stack spacing={0.7} sx={{ mt: 0.6 }}>{optimization.jobDescriptionImprovements.map((i: string) => <Alert key={i} severity="info">{i}</Alert>)}</Stack><Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 700 }}>Benefits To Add</Typography><Stack direction="row" spacing={0.6} sx={{ flexWrap: 'wrap', mt: 0.4 }}>{optimization.benefitsToAdd.map((b: string) => <Chip key={b} size="small" label={b} />)}</Stack></CardContent></Card></Grid>
        </Grid>
      )}

      {tab === 'supply-demand' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={4}>{statCard('Supply', supplyDemand.supply, '#0F766E')}</Grid>
          <Grid item xs={12} sm={4}>{statCard('Demand', supplyDemand.demand, '#1D4ED8')}</Grid>
          <Grid item xs={12} sm={4}>{statCard('Gap Analysis', supplyDemand.gap, supplyDemand.gap >= 0 ? '#0F766E' : '#DC2626')}</Grid>
          <Grid item xs={12}><Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}><CardContent><Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Future Forecast</Typography><MiniBars rows={supplyDemand.forecast.map((r: any) => ({ label: `${r.month} S`, value: r.supply })).concat(supplyDemand.forecast.map((r: any) => ({ label: `${r.month} D`, value: r.demand })))} color="#0E7490" /></CardContent></Card></Grid>
        </Grid>
      )}

      {tab === 'location' && (
        <TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>City</TableCell>
                <TableCell>Hiring Density</TableCell>
                <TableCell>Average Salary</TableCell>
                <TableCell>Talent Availability</TableCell>
                <TableCell>Competition Level</TableCell>
                <TableCell>Remote Adoption</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {locations.map((row: LocationIntelligenceRow) => (
                <TableRow key={row.city}>
                  <TableCell><Stack direction="row" spacing={0.4} alignItems="center"><LocationIcon fontSize="small" color="action" /><span>{row.city}</span></Stack></TableCell>
                  <TableCell>{row.hiringDensity}</TableCell>
                  <TableCell>{formatCurrency(row.averageSalary)}</TableCell>
                  <TableCell>{row.talentAvailability}</TableCell>
                  <TableCell>{row.competitionLevel}</TableCell>
                  <TableCell>{row.remoteAdoption}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 'forecast' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={3}>{statCard('Expected Applications', forecast.expectedApplications, '#1D4ED8')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Hiring Difficulty', forecast.hiringDifficulty, '#C2410C')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Time To Fill', `${forecast.timeToFillDays} days`, '#0F766E')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Salary Changes', `${forecast.salaryChangesPercent}%`, '#9333EA')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Skill Demand Shift', `${forecast.skillDemandShift}%`, '#0369A1')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Recruitment Cost', formatCurrency(forecast.recruitmentCost), '#D97706')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Hiring Success Probability', `${forecast.hiringSuccessProbability}%`, '#0E7490')}</Grid>
        </Grid>
      )}

      {tab === 'competitors' && (
        <TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Company</TableCell>
                <TableCell>Salary Comparison</TableCell>
                <TableCell>Benefits Comparison</TableCell>
                <TableCell>Hiring Volume</TableCell>
                <TableCell>Hiring Trend</TableCell>
                <TableCell>Market Position</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {competitors.map((row: CompetitorInsightRow) => (
                <TableRow key={row.company}>
                  <TableCell>{row.company}</TableCell>
                  <TableCell>{row.salaryComparison}%</TableCell>
                  <TableCell>{row.benefitsComparison}</TableCell>
                  <TableCell>{row.hiringVolume}</TableCell>
                  <TableCell>{row.hiringTrend}%</TableCell>
                  <TableCell><Chip size="small" label={row.marketPosition} color={row.marketPosition === 'Leader' ? 'success' : row.marketPosition === 'Challenger' ? 'warning' : 'default'} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 'job-health' && (
        <TableContainer component={Paper} sx={{ border: `1px solid ${themeColors.border}`, borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Job</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Health Score</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Salary</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Skills</TableCell>
                <TableCell>Experience</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Application Rate</TableCell>
                <TableCell>Hiring Speed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobHealth.map((row: JobHealthRow) => (
                <TableRow key={row.jobId}>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>{row.location}</TableCell>
                  <TableCell>{row.healthScore}</TableCell>
                  <TableCell><Chip size="small" label={row.status} color={row.status === 'Excellent' ? 'success' : row.status === 'Good' ? 'info' : row.status === 'Average' ? 'warning' : 'error'} /></TableCell>
                  <TableCell>{row.salaryScore}</TableCell>
                  <TableCell>{Math.round(row.descriptionQuality)}</TableCell>
                  <TableCell>{row.requiredSkillsScore}</TableCell>
                  <TableCell>{row.experienceScore}</TableCell>
                  <TableCell>{Math.round(row.locationScore)}</TableCell>
                  <TableCell>{row.applicationRateScore}</TableCell>
                  <TableCell>{Math.round(row.hiringSpeedScore)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 'recommendations' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>AI Recommendations</Typography>
            <Stack spacing={0.7}>
              {recommendations.map((item) => <Alert key={item} severity="info" icon={<AiIcon />}>{item}</Alert>)}
            </Stack>
          </CardContent>
        </Card>
      )}

      {tab === 'industry-reports' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Industry Reports</Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} md={4}><TextField fullWidth label="Industry" value={industryName} onChange={(e) => setIndustryName(e.target.value)} helperText="IT, Healthcare, Finance, Manufacturing, Education, Marketing, Sales, Custom" /></Grid>
              <Grid item xs={12} md={8}><Button variant="contained" startIcon={<DownloadIcon />} onClick={generateIndustryReport}>Generate Industry Report</Button></Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {tab === 'executive-reports' && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Executive Reports</Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} md={4}><FormControl fullWidth><InputLabel>Report Type</InputLabel><Select value={executiveReportType} label="Report Type" onChange={(e) => setExecutiveReportType(e.target.value as any)}><MenuItem value="hiring_market">Hiring Market Report</MenuItem><MenuItem value="salary_benchmark">Salary Benchmark Report</MenuItem><MenuItem value="skill_trend">Skill Trend Report</MenuItem><MenuItem value="competition">Competition Report</MenuItem><MenuItem value="location">Location Report</MenuItem></Select></FormControl></Grid>
              <Grid item xs={12} md={4}><FormControl fullWidth><InputLabel>Download Format</InputLabel><Select value={executiveReportFormat} label="Download Format" onChange={(e) => setExecutiveReportFormat(e.target.value as any)}><MenuItem value="pdf">PDF</MenuItem><MenuItem value="excel">Excel</MenuItem><MenuItem value="csv">CSV</MenuItem></Select></FormControl></Grid>
              <Grid item xs={12} md={4}><Button fullWidth variant="contained" startIcon={<DownloadIcon />} onClick={generateExecutiveReport}>Generate & Download</Button></Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {tab === 'alerts' && (
        <Grid container spacing={1.1}>
          {alerts.map((alert) => (
            <Grid item xs={12} md={6} key={alert.id}>
              <Alert severity={alert.severity} icon={<AlertIcon />}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{alert.message}</Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.3 }}>{format(new Date(alert.createdAt), 'dd MMM yyyy, hh:mm a')}</Typography>
              </Alert>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 'daily-briefing' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Typography variant="caption" sx={{ color: themeColors.text.secondary }}>Generated: {format(new Date(dailyBriefing.generatedAt), 'dd MMM yyyy, hh:mm a')}</Typography></Grid>
          <Grid item xs={12} md={6}><ListBlock title="Top Hiring Trends" items={dailyBriefing.topHiringTrends} /></Grid>
          <Grid item xs={12} md={6}><ListBlock title="Top Skills" items={dailyBriefing.topSkills} /></Grid>
          <Grid item xs={12} md={6}><ListBlock title="Salary Changes" items={dailyBriefing.salaryChanges} /></Grid>
          <Grid item xs={12} md={6}><ListBlock title="Hiring Opportunities" items={dailyBriefing.hiringOpportunities} /></Grid>
          <Grid item xs={12} md={6}><ListBlock title="Recruitment Risks" items={dailyBriefing.recruitmentRisks} /></Grid>
          <Grid item xs={12} md={6}><ListBlock title="Recommended Actions" items={dailyBriefing.recommendedActions} /></Grid>
        </Grid>
      )}

      {tab === 'integration' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Integrated Recruiter Modules</Typography>
                <Stack spacing={0.7}>
                  <Alert severity="success">Jobs: open positions and skills feed market demand, salary, and job health.</Alert>
                  <Alert severity="success">Applicants: talent availability, experience/notice distribution, supply analysis.</Alert>
                  <Alert severity="success">Analytics: KPI and trend overlays used for demand/competition health.</Alert>
                  <Alert severity="success">AI Hiring Assistant: request volume signals and recommendation enhancement.</Alert>
                  <Alert severity="success">Automation Center: execution velocity used in forecast and market health signals.</Alert>
                  <Alert severity="success">Employer Branding: brand strength contributes to market health scoring.</Alert>
                  <Alert severity="success">Dashboard: KPI cards and alerts available in recruiter navigation.</Alert>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Visual Analytics Coverage</Typography>
                <Stack direction="row" spacing={0.7} sx={{ flexWrap: 'wrap' }}>
                  <Chip icon={<TrendingIcon />} label="Salary Trends" />
                  <Chip icon={<TrendingIcon />} label="Demand Trends" />
                  <Chip icon={<TrendingIcon />} label="Skill Trends" />
                  <Chip icon={<InsightsIcon />} label="Hiring Funnel" />
                  <Chip icon={<LocationIcon />} label="Heatmaps" />
                  <Chip icon={<LocationIcon />} label="Maps" />
                  <Chip icon={<InsightsIcon />} label="Bar Charts" />
                  <Chip icon={<InsightsIcon />} label="Pie Charts" />
                  <Chip icon={<TrendingIcon />} label="Forecast Charts" />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </MotionBox>
  );
};
