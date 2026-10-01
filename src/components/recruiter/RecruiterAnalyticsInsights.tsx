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
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { RecruiterPageHero } from './RecruiterPageHero';
import {
  AutoGraph as AutoGraphIcon,
  Download as DownloadIcon,
  Insights as InsightsIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  TableChart as TableChartIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
import { themeColors } from '@styles/recruiterTheme';
import {
  AnalyticsFilters,
  getDefaultFilterWindow,
  getRecruiterAnalyticsData,
  RecruiterAnalyticsData,
  TrendGranularity,
} from '@services/recruiterAnalytics';
import {
  FunnelBreakdownChart,
  HeatmapActivityChart,
  MultiBarChart,
  PieDistributionChart,
  SimpleBarChart,
  TrendChart,
} from '@components/recruiter/analytics/RecruiterAnalyticsCharts';

interface RecruiterAnalyticsInsightsProps {
  recruiterId: string;
}

type AnalyticsTab =
  | 'overview'
  | 'funnel'
  | 'trends'
  | 'jobs'
  | 'sources'
  | 'demographics'
  | 'performance'
  | 'insights'
  | 'team'
  | 'reports';

interface RecruiterGoals {
  hiringTarget: number;
  interviewTarget: number;
  offerTarget: number;
  monthlyGoal: number;
  yearlyGoal: number;
}

const MotionBox = motion(Box);

const defaultGoals: RecruiterGoals = {
  hiringTarget: 10,
  interviewTarget: 30,
  offerTarget: 15,
  monthlyGoal: 4,
  yearlyGoal: 48,
};

const localGoalsKey = (recruiterId: string): string => `actro_recruiter_analytics_goals_v1:${recruiterId}`;

const toPercent = (value: number, total: number): number => {
  if (total <= 0) return 0;
  return Math.min(100, Number(((value / total) * 100).toFixed(1)));
};

const downloadTextFile = (fileName: string, content: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const convertToCsv = (rows: Array<Record<string, unknown>>): string => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escapeCell = (value: unknown): string => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const lines = [headers.join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((header) => escapeCell(row[header])).join(','));
  });
  return lines.join('\n');
};

const getInsightSeverityColor = (severity: 'info' | 'warning' | 'success'): string => {
  if (severity === 'warning') return themeColors.warning;
  if (severity === 'success') return themeColors.success;
  return themeColors.info;
};

const tableCellHeaderStyle = {
  fontWeight: 700,
  color: themeColors.text.primary,
  bgcolor: '#F8FAFC',
  whiteSpace: 'nowrap' as const,
};

const kpiAccentPalette = [
  '#2563EB',
  '#0EA5E9',
  '#10B981',
  '#7C3AED',
  '#F59E0B',
  '#EF4444',
  '#14B8A6',
  '#8B5CF6',
];

export const RecruiterAnalyticsInsights: React.FC<RecruiterAnalyticsInsightsProps> = ({ recruiterId }) => {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [tab, setTab] = useState<AnalyticsTab>('overview');
  const [trendGranularity, setTrendGranularity] = useState<TrendGranularity>('monthly');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RecruiterAnalyticsData | null>(null);
  const [sortKey, setSortKey] = useState<keyof RecruiterAnalyticsData['jobPerformance'][number]>('applications');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const defaultWindow = getDefaultFilterWindow();
  const [filters, setFilters] = useState<AnalyticsFilters>({
    from: defaultWindow.from,
    to: defaultWindow.to,
    jobId: '',
    location: '',
    department: '',
    recruiter: '',
    experience: '',
    workMode: '',
    employmentType: '',
  });

  const [goals, setGoals] = useState<RecruiterGoals>(defaultGoals);
  const [reportDateFrom, setReportDateFrom] = useState(defaultWindow.from);
  const [reportDateTo, setReportDateTo] = useState(defaultWindow.to);
  const [reportJob, setReportJob] = useState('all');
  const [reportDepartment, setReportDepartment] = useState('all');
  const [reportLocation, setReportLocation] = useState('all');
  const [reportRecruiter, setReportRecruiter] = useState('all');
  const [reportStage, setReportStage] = useState('all');

  useEffect(() => {
    const raw = localStorage.getItem(localGoalsKey(recruiterId));
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as RecruiterGoals;
      setGoals({ ...defaultGoals, ...parsed });
    } catch {
      // Ignore malformed local cache.
    }
  }, [recruiterId]);

  useEffect(() => {
    localStorage.setItem(localGoalsKey(recruiterId), JSON.stringify(goals));
  }, [goals, recruiterId]);

  const loadAnalytics = async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await getRecruiterAnalyticsData(recruiterId, {
        ...filters,
        jobId: filters.jobId || undefined,
        location: filters.location || undefined,
        department: filters.department || undefined,
        recruiter: filters.recruiter || undefined,
        experience: filters.experience || undefined,
        workMode: filters.workMode || undefined,
        employmentType: filters.employmentType || undefined,
      });
      setData(result);
    } catch (error) {
      console.error('Failed to load recruiter analytics:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
  }, [recruiterId, filters.from, filters.to, filters.jobId, filters.location, filters.department, filters.recruiter, filters.experience, filters.workMode, filters.employmentType]);

  const sortedJobPerformance = useMemo(() => {
    if (!data) return [];
    const rows = [...data.jobPerformance];
    rows.sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      const first = Number(aValue || 0);
      const second = Number(bValue || 0);
      return sortDirection === 'asc' ? first - second : second - first;
    });
    return rows;
  }, [data, sortDirection, sortKey]);

  const reportRows = useMemo(() => {
    if (!data) return [];
    return data.reportRows.filter((row) => {
      if (reportDateFrom && row.date < reportDateFrom) return false;
      if (reportDateTo && row.date > reportDateTo) return false;
      if (reportJob !== 'all' && row.jobTitle !== reportJob) return false;
      if (reportDepartment !== 'all' && row.department !== reportDepartment) return false;
      if (reportLocation !== 'all' && row.location !== reportLocation) return false;
      if (reportRecruiter !== 'all' && row.recruiter !== reportRecruiter) return false;
      if (reportStage !== 'all' && row.stage !== reportStage) return false;
      return true;
    });
  }, [data, reportDateFrom, reportDateTo, reportJob, reportDepartment, reportLocation, reportRecruiter, reportStage]);

  const options = useMemo(() => {
    if (!data) {
      return {
        jobs: [] as string[],
        departments: [] as string[],
        locations: [] as string[],
        recruiters: [] as string[],
        stages: [] as string[],
      };
    }

    const jobs = Array.from(new Set(data.reportRows.map((row) => row.jobTitle))).sort();
    const departments = Array.from(new Set(data.reportRows.map((row) => row.department))).sort();
    const locations = Array.from(new Set(data.reportRows.map((row) => row.location))).sort();
    const recruiters = Array.from(new Set(data.reportRows.map((row) => row.recruiter))).sort();
    const stages = Array.from(new Set(data.reportRows.map((row) => row.stage))).sort();

    return { jobs, departments, locations, recruiters, stages };
  }, [data]);

  const goalsProgress = useMemo(() => {
    if (!data) {
      return {
        hiring: 0,
        interviews: 0,
        offers: 0,
        monthly: 0,
        yearly: 0,
      };
    }

    const hires = data.kpis.find((item) => item.label === 'Hires')?.value || 0;
    const interviews = data.kpis.find((item) => item.label === 'Interview Scheduled')?.value || 0;
    const offers = data.kpis.find((item) => item.label === 'Offers Sent')?.value || 0;

    return {
      hiring: toPercent(hires, goals.hiringTarget),
      interviews: toPercent(interviews, goals.interviewTarget),
      offers: toPercent(offers, goals.offerTarget),
      monthly: toPercent(hires, goals.monthlyGoal),
      yearly: toPercent(hires, goals.yearlyGoal),
    };
  }, [data, goals]);

  const notificationItems = useMemo(() => {
    if (!data) return [] as Array<{ label: string; tone: 'success' | 'warning' | 'info' }>;

    const hires = data.kpis.find((item) => item.label === 'Hires')?.value || 0;
    const growth = data.kpis.find((item) => item.label === 'Monthly Hiring Growth')?.value || 0;

    const weeklyTone = hires >= Math.max(1, Math.round(goals.monthlyGoal / 4)) ? 'success' : 'warning';
    const monthlyTone = growth >= 0 ? 'info' : 'warning';
    const yearlyTone = hires >= goals.yearlyGoal ? 'success' : 'info';

    return [
      {
        label: weeklyTone === 'success' ? 'Weekly Hiring Report: goals on track' : 'Weekly Hiring Report: target missed',
        tone: weeklyTone,
      },
      {
        label: monthlyTone === 'info' ? 'Monthly Hiring Report: growth positive' : 'Monthly Hiring Report: growth declined',
        tone: monthlyTone,
      },
      {
        label: yearlyTone === 'success' ? 'Hiring Goals Achieved' : 'Yearly Hiring Goals in progress',
        tone: yearlyTone,
      },
    ];
  }, [data, goals.monthlyGoal, goals.yearlyGoal]);

  const exportCsv = (): void => {
    const csv = convertToCsv(reportRows as Array<Record<string, unknown>>);
    downloadTextFile(`recruiter-analytics-report-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8;');
  };

  const exportExcel = (): void => {
    const worksheet = XLSX.utils.json_to_sheet(reportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Analytics Report');
    XLSX.writeFile(workbook, `recruiter-analytics-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPdf = (): void => {
    const newWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!newWindow) return;

    const tableRows = reportRows.slice(0, 250).map((row) => (
      `<tr>
        <td>${row.date}</td>
        <td>${row.jobTitle}</td>
        <td>${row.department}</td>
        <td>${row.location}</td>
        <td>${row.recruiter}</td>
        <td>${row.stage}</td>
        <td>${row.candidate}</td>
        <td>${row.source}</td>
        <td>${row.matchScore}</td>
        <td>${row.status}</td>
      </tr>`
    )).join('');

    newWindow.document.write(`
      <html>
        <head>
          <title>Recruiter Analytics Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { margin-bottom: 6px; }
            p { color: #555; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px; font-size: 12px; }
            th { background: #f4f4f4; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Recruiter Analytics Report</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Job</th><th>Department</th><th>Location</th><th>Recruiter</th><th>Stage</th><th>Candidate</th><th>Source</th><th>Match Score</th><th>Status</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `);
    newWindow.document.close();
    newWindow.focus();
    newWindow.print();
  };

  const sortBy = (key: keyof RecruiterAnalyticsData['jobPerformance'][number]): void => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection('desc');
  };

  if (loading) {
    return (
      <Card sx={{ borderRadius: 2.5 }}>
        <CardContent sx={{ py: 8 }}>
          <Stack spacing={2} alignItems="center">
            <LinearProgress sx={{ width: '40%' }} />
            <Typography variant="body2" color="text.secondary">
              Loading recruiter analytics...
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Alert severity="error">
        Failed to load analytics data. Please refresh and try again.
      </Alert>
    );
  }

  return (
    <MotionBox initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <RecruiterPageHero
        eyebrow="Intelligence"
        icon={<TableChartIcon />}
        title="Analytics & Hiring Insights"
        description="Comprehensive hiring intelligence across funnel, performance, and AI recommendations."
        actions={(
          <>
            <Button variant="contained" startIcon={<RefreshIcon />} onClick={() => void loadAnalytics()}>
              Refresh
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>
              CSV
            </Button>
            <Button variant="outlined" startIcon={<TableChartIcon />} onClick={exportExcel}>
              Excel
            </Button>
            <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={exportPdf}>
              PDF
            </Button>
            <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>
              Print
            </Button>
          </>
        )}
      />

      <Paper sx={{ p: 2, mb: 2, borderRadius: 2.5, border: `1px solid ${themeColors.border}` }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25, color: themeColors.text.primary }}>
          Filters
        </Typography>
        <Grid container spacing={1.25}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="From"
              type="date"
              fullWidth
              size="small"
              value={filters.from || ''}
              onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="To"
              type="date"
              fullWidth
              size="small"
              value={filters.to || ''}
              onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>Job</InputLabel>
              <Select
                value={filters.jobId || ''}
                label="Job"
                onChange={(event) => setFilters((prev) => ({ ...prev, jobId: event.target.value }))}
              >
                <MenuItem value="">All Jobs</MenuItem>
                {data.jobPerformance.map((job) => (
                  <MenuItem key={job.jobId} value={job.jobId}>{job.jobTitle}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Location"
              fullWidth
              size="small"
              value={filters.location || ''}
              onChange={(event) => setFilters((prev) => ({ ...prev, location: event.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              label="Department"
              fullWidth
              size="small"
              value={filters.department || ''}
              onChange={(event) => setFilters((prev) => ({ ...prev, department: event.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              label="Recruiter"
              fullWidth
              size="small"
              value={filters.recruiter || ''}
              onChange={(event) => setFilters((prev) => ({ ...prev, recruiter: event.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              label="Experience"
              fullWidth
              size="small"
              value={filters.experience || ''}
              onChange={(event) => setFilters((prev) => ({ ...prev, experience: event.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              label="Work Mode"
              fullWidth
              size="small"
              value={filters.workMode || ''}
              onChange={(event) => setFilters((prev) => ({ ...prev, workMode: event.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              label="Employment Type"
              fullWidth
              size="small"
              value={filters.employmentType || ''}
              onChange={(event) => setFilters((prev) => ({ ...prev, employmentType: event.target.value }))}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ mb: 2, borderRadius: 2.5, border: `1px solid ${themeColors.border}` }}>
        <Tabs
          value={tab}
          onChange={(_event, value: AnalyticsTab) => setTab(value)}
          variant={isTablet ? 'scrollable' : 'scrollable'} scrollButtons="auto" allowScrollButtonsMobile sx={{ minHeight: 54, px: 0.5, '& .MuiTabs-scroller': { overflowX: 'auto !important' }, '& .MuiTabs-scrollButtons': { width: 34, borderRadius: 1, mx: 0.5 }, '& .MuiTab-root': { textTransform: 'none', whiteSpace: 'nowrap', minHeight: 54, minWidth: 'max-content', px: 1.8, fontWeight: 700, fontSize: '0.82rem' } }}
        >
          <Tab value="overview" label="Overview" />
          <Tab value="funnel" label="Hiring Funnel" />
          <Tab value="trends" label="Hiring Trends" />
          <Tab value="jobs" label="Job Performance" />
          <Tab value="sources" label="Source Analytics" />
          <Tab value="demographics" label="Demographics" />
          <Tab value="performance" label="Performance" />
          <Tab value="insights" label="AI Insights" />
          <Tab value="team" label="Team Analytics" />
          <Tab value="reports" label="Custom Reports" />
        </Tabs>
      </Paper>

      {tab === 'overview' && (
        <Grid container spacing={2}>
          {data.kpis.map((kpi, idx) => (
            <Grid key={kpi.label} item xs={12} sm={6} md={4} lg={3}>
              <Card sx={{ borderRadius: 2.5, border: `1px solid ${themeColors.border}` }}>
                <CardContent>
                  <Typography variant="body2" sx={{ color: themeColors.text.secondary }}>
                    {kpi.label}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: kpiAccentPalette[idx % kpiAccentPalette.length], mt: 0.7 }}>
                    {kpi.value}{kpi.suffix || ''}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}

          <Grid item xs={12} lg={8}>
            <TrendChart
              title="Hiring Calendar Activity"
              subtitle="Applications, interviews, offers and hires by date"
              data={data.calendarActivity}
              xKey="date"
              lines={[
                { key: 'applications', label: 'Applications', color: '#2563EB' },
                { key: 'interviews', label: 'Interviews', color: '#10B981' },
                { key: 'offers', label: 'Offers', color: '#7C3AED' },
                { key: 'hires', label: 'Hires', color: '#F59E0B' },
              ]}
              area
            />
          </Grid>

          <Grid item xs={12} lg={4}>
            <HeatmapActivityChart
              title="Calendar Heatmap"
              subtitle="Application intensity by date"
              data={data.calendarActivity.slice(-84)}
              metric="applications"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2.5 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.4 }}>Hiring Goals</Typography>
                <Stack spacing={1.2}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.4}>
                      <Typography variant="body2">Hiring Target ({goals.hiringTarget})</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{goalsProgress.hiring}%</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={goalsProgress.hiring} sx={{ height: 8, borderRadius: 10 }} />
                  </Box>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.4}>
                      <Typography variant="body2">Interview Target ({goals.interviewTarget})</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{goalsProgress.interviews}%</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={goalsProgress.interviews} sx={{ height: 8, borderRadius: 10 }} />
                  </Box>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.4}>
                      <Typography variant="body2">Offer Target ({goals.offerTarget})</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{goalsProgress.offers}%</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={goalsProgress.offers} sx={{ height: 8, borderRadius: 10 }} />
                  </Box>
                </Stack>

                <Grid container spacing={1} sx={{ mt: 1.2 }}>
                  <Grid item xs={6}>
                    <TextField
                      type="number"
                      size="small"
                      fullWidth
                      label="Monthly Goal"
                      value={goals.monthlyGoal}
                      onChange={(event) => setGoals((prev) => ({ ...prev, monthlyGoal: Math.max(1, Number(event.target.value || 0)) }))}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      type="number"
                      size="small"
                      fullWidth
                      label="Yearly Goal"
                      value={goals.yearlyGoal}
                      onChange={(event) => setGoals((prev) => ({ ...prev, yearlyGoal: Math.max(1, Number(event.target.value || 0)) }))}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2.5 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.4 }}>Notifications</Typography>
                <Stack spacing={1}>
                  {notificationItems.map((item) => (
                    <Alert key={item.label} severity={item.tone} sx={{ py: 0.75 }}>
                      {item.label}
                    </Alert>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'funnel' && (
        <Grid container spacing={2}>
          <Grid item xs={12} lg={7}>
            <FunnelBreakdownChart
              title="Hiring Funnel"
              subtitle="Stage-by-stage pipeline conversion"
              data={data.funnel.map((item) => ({ stage: item.stage, count: item.count }))}
            />
          </Grid>
          <Grid item xs={12} lg={5}>
            <Card sx={{ borderRadius: 2.5 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.2 }}>Conversion by Stage</Typography>
                <Stack spacing={1.1}>
                  {data.funnel.map((stage) => (
                    <Box key={stage.stage} sx={{ p: 1.2, border: `1px solid ${themeColors.border}`, borderRadius: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{stage.stage}</Typography>
                        <Chip size="small" label={`${stage.count}`} />
                      </Stack>
                      <Typography variant="caption" sx={{ color: themeColors.text.secondary }}>
                        Conversion from previous: {stage.conversionFromPrev}%
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'trends' && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Stack direction={isMobile ? 'column' : 'row'} spacing={1.2} alignItems={isMobile ? 'stretch' : 'center'}>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Trend Window</InputLabel>
                <Select
                  value={trendGranularity}
                  label="Trend Window"
                  onChange={(event) => setTrendGranularity(event.target.value as TrendGranularity)}
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="yearly">Yearly</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Grid>

          <Grid item xs={12}>
            <TrendChart
              title="Hiring Trends"
              subtitle="Applications, interviews, offers and hires"
              data={data.trends[trendGranularity]}
              xKey="label"
              lines={[
                { key: 'applications', label: 'Applications', color: '#2563EB' },
                { key: 'interviews', label: 'Interviews', color: '#10B981' },
                { key: 'offers', label: 'Offers', color: '#7C3AED' },
                { key: 'hires', label: 'Hires', color: '#F59E0B' },
              ]}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <SimpleBarChart
              title="Applications Trend"
              data={data.trends[trendGranularity]}
              xKey="label"
              barKey="applications"
              barLabel="Applications"
              color="#2563EB"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <SimpleBarChart
              title="Interviews Trend"
              data={data.trends[trendGranularity]}
              xKey="label"
              barKey="interviews"
              barLabel="Interviews"
              color="#10B981"
            />
          </Grid>
        </Grid>
      )}

      {tab === 'jobs' && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TableContainer component={Paper} sx={{ borderRadius: 2.5 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={tableCellHeaderStyle} onClick={() => sortBy('jobTitle')}>Job Title</TableCell>
                    <TableCell sx={tableCellHeaderStyle} onClick={() => sortBy('views')}>Views</TableCell>
                    <TableCell sx={tableCellHeaderStyle} onClick={() => sortBy('applications')}>Applications</TableCell>
                    <TableCell sx={tableCellHeaderStyle} onClick={() => sortBy('qualified')}>Qualified</TableCell>
                    <TableCell sx={tableCellHeaderStyle} onClick={() => sortBy('shortlisted')}>Shortlisted</TableCell>
                    <TableCell sx={tableCellHeaderStyle} onClick={() => sortBy('interviews')}>Interviews</TableCell>
                    <TableCell sx={tableCellHeaderStyle} onClick={() => sortBy('offers')}>Offers</TableCell>
                    <TableCell sx={tableCellHeaderStyle} onClick={() => sortBy('hires')}>Hires</TableCell>
                    <TableCell sx={tableCellHeaderStyle} onClick={() => sortBy('conversionRate')}>Conversion %</TableCell>
                    <TableCell sx={tableCellHeaderStyle} onClick={() => sortBy('timeToFillDays')}>Time To Fill</TableCell>
                    <TableCell sx={tableCellHeaderStyle} onClick={() => sortBy('aiScore')}>AI Score</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedJobPerformance.map((row) => (
                    <TableRow key={row.jobId} hover>
                      <TableCell>{row.jobTitle}</TableCell>
                      <TableCell>{row.views}</TableCell>
                      <TableCell>{row.applications}</TableCell>
                      <TableCell>{row.qualified}</TableCell>
                      <TableCell>{row.shortlisted}</TableCell>
                      <TableCell>{row.interviews}</TableCell>
                      <TableCell>{row.offers}</TableCell>
                      <TableCell>{row.hires}</TableCell>
                      <TableCell>{row.conversionRate}%</TableCell>
                      <TableCell>{row.timeToFillDays} days</TableCell>
                      <TableCell>{row.aiScore}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2.5 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Job Health Score</Typography>
                <Grid container spacing={1.25}>
                  {data.jobHealth.map((item) => (
                    <Grid key={item.jobId} item xs={12} md={6} lg={4}>
                      <Paper sx={{ p: 1.25, borderRadius: 1.6, border: `1px solid ${themeColors.border}` }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.jobTitle}</Typography>
                          <Chip
                            label={`${item.rating} (${item.score})`}
                            size="small"
                            color={item.rating === 'Excellent' ? 'success' : item.rating === 'Good' ? 'primary' : item.rating === 'Average' ? 'warning' : 'error'}
                          />
                        </Stack>
                        <Stack spacing={0.5} sx={{ mt: 1 }}>
                          <Typography variant="caption">Applications: {item.factors.applications.toFixed(1)}</Typography>
                          <Typography variant="caption">CTR: {item.factors.ctr.toFixed(1)}</Typography>
                          <Typography variant="caption">Hiring Speed: {item.factors.hiringSpeed.toFixed(1)}</Typography>
                          <Typography variant="caption">Response Time: {item.factors.responseTime.toFixed(1)}</Typography>
                          <Typography variant="caption">Candidate Match: {item.factors.matchScore.toFixed(1)}</Typography>
                          <Typography variant="caption">Offer Acceptance: {item.factors.offerAcceptance.toFixed(1)}</Typography>
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'sources' && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <PieDistributionChart
              title="Source Mix"
              subtitle="Candidate distribution by source"
              data={data.sourceAnalytics.totals}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <SimpleBarChart
              title="Source Volume"
              subtitle="Absolute candidate counts"
              data={data.sourceAnalytics.totals}
              xKey="label"
              barKey="value"
              barLabel="Candidates"
              color="#0EA5E9"
            />
          </Grid>
          <Grid item xs={12}>
            <MultiBarChart
              title="Source Trend"
              subtitle="Month-over-month source contribution"
              data={data.sourceAnalytics.trend}
              xKey="label"
              bars={[
                { key: 'Direct', label: 'Direct' },
                { key: 'Google', label: 'Google' },
                { key: 'LinkedIn', label: 'LinkedIn' },
                { key: 'Referral', label: 'Referral' },
                { key: 'Indeed', label: 'Indeed' },
                { key: 'Naukri', label: 'Naukri' },
                { key: 'RemoteOK', label: 'RemoteOK' },
                { key: 'Company Website', label: 'Company Website' },
                { key: 'GitHub', label: 'GitHub' },
                { key: 'Other', label: 'Other' },
              ]}
            />
          </Grid>
        </Grid>
      )}

      {tab === 'demographics' && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <PieDistributionChart title="Experience Distribution" data={data.demographics.experience} />
          </Grid>
          <Grid item xs={12} md={6}>
            <PieDistributionChart title="Education Distribution" data={data.demographics.education} />
          </Grid>
          <Grid item xs={12} md={6}>
            <SimpleBarChart title="Location Distribution" data={data.demographics.location} xKey="label" barKey="value" barLabel="Candidates" color="#06B6D4" />
          </Grid>
          <Grid item xs={12} md={6}>
            <SimpleBarChart title="Skills Distribution" data={data.demographics.skills} xKey="label" barKey="value" barLabel="Mentions" color="#7C3AED" />
          </Grid>
          <Grid item xs={12} md={6}>
            <PieDistributionChart title="Work Mode" data={data.demographics.workMode} />
          </Grid>
          <Grid item xs={12} md={6}>
            <PieDistributionChart title="Employment Type" data={data.demographics.employmentType} />
          </Grid>
        </Grid>
      )}

      {tab === 'performance' && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ borderRadius: 2.5 }}><CardContent><Typography variant="body2">Messages Sent</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{data.recruiterPerformance.messagesSent}</Typography></CardContent></Card>
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ borderRadius: 2.5 }}><CardContent><Typography variant="body2">Average Response Time</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{data.recruiterPerformance.averageResponseTimeHours} hrs</Typography></CardContent></Card>
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ borderRadius: 2.5 }}><CardContent><Typography variant="body2">Interview Feedback Pending</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{data.recruiterPerformance.interviewFeedbackPending}</Typography></CardContent></Card>
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ borderRadius: 2.5 }}><CardContent><Typography variant="body2">Offer Acceptance Rate</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{data.recruiterPerformance.offerAcceptanceRate}%</Typography></CardContent></Card>
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ borderRadius: 2.5 }}><CardContent><Typography variant="body2">Candidate Response Rate</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{data.recruiterPerformance.candidateResponseRate}%</Typography></CardContent></Card>
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ borderRadius: 2.5 }}><CardContent><Typography variant="body2">Rejected Rate</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{data.recruiterPerformance.rejectedRate}%</Typography></CardContent></Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2.5 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.1 }}>Time Metrics</Typography>
                <Stack spacing={0.8}>
                  <Typography variant="body2">Average Time To Review: {data.timeMetrics.averageTimeToReviewDays} days</Typography>
                  <Typography variant="body2">Average Time To Shortlist: {data.timeMetrics.averageTimeToShortlistDays} days</Typography>
                  <Typography variant="body2">Average Time To Schedule Interview: {data.timeMetrics.averageTimeToScheduleInterviewDays} days</Typography>
                  <Typography variant="body2">Average Time To Hire: {data.timeMetrics.averageTimeToHireDays} days</Typography>
                  <Typography variant="body2">Average Offer Acceptance Time: {data.timeMetrics.averageOfferAcceptanceTimeDays} days</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2.5 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.1 }}>Salary Insights</Typography>
                <Stack spacing={0.7}>
                  <Typography variant="body2">Average Salary: {data.salaryInsights.averageSalary.toLocaleString()}</Typography>
                  <Typography variant="body2">Minimum Salary: {data.salaryInsights.minSalary.toLocaleString()}</Typography>
                  <Typography variant="body2">Maximum Salary: {data.salaryInsights.maxSalary.toLocaleString()}</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <TrendChart
              title="Salary Trend"
              subtitle="Average salary movement"
              data={data.salaryInsights.trend}
              xKey="label"
              lines={[{ key: 'averageSalary', label: 'Average Salary', color: '#7C3AED' }]}
            />
          </Grid>
        </Grid>
      )}

      {tab === 'insights' && (
        <Grid container spacing={2}>
          {data.hiringInsights.map((insight) => (
            <Grid item xs={12} md={6} key={insight.title}>
              <Card sx={{ borderRadius: 2.5, borderLeft: `5px solid ${getInsightSeverityColor(insight.severity)}` }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <InsightsIcon sx={{ color: getInsightSeverityColor(insight.severity) }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>{insight.title}</Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ color: themeColors.text.secondary, mb: 1 }}>
                    {insight.summary}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: themeColors.text.primary }}>
                    Action: {insight.recommendation}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 'team' && (
        <Grid container spacing={2}>
          {data.teamAnalytics.length === 0 ? (
            <Grid item xs={12}>
              <Alert severity="info">
                Team analytics will appear automatically when multiple recruiters are detected for this company profile.
              </Alert>
            </Grid>
          ) : (
            <Grid item xs={12}>
              <Card sx={{ borderRadius: 2.5 }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1.2}>
                    <AutoGraphIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Team Leaderboard</Typography>
                  </Stack>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={tableCellHeaderStyle}>Recruiter</TableCell>
                          <TableCell sx={tableCellHeaderStyle}>Applications Handled</TableCell>
                          <TableCell sx={tableCellHeaderStyle}>Interviews Conducted</TableCell>
                          <TableCell sx={tableCellHeaderStyle}>Offers Sent</TableCell>
                          <TableCell sx={tableCellHeaderStyle}>Hires Completed</TableCell>
                          <TableCell sx={tableCellHeaderStyle}>Average Response Time</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.teamAnalytics.map((member) => (
                          <TableRow key={member.recruiterId}>
                            <TableCell>{member.recruiterName}</TableCell>
                            <TableCell>{member.applicationsHandled}</TableCell>
                            <TableCell>{member.interviewsConducted}</TableCell>
                            <TableCell>{member.offersSent}</TableCell>
                            <TableCell>{member.hiresCompleted}</TableCell>
                            <TableCell>{member.averageResponseTimeHours} hrs</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {tab === 'reports' && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2, borderRadius: 2.5, border: `1px solid ${themeColors.border}` }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.2 }}>Custom Reports</Typography>
              <Grid container spacing={1.25}>
                <Grid item xs={12} sm={6} md={2.4}>
                  <TextField type="date" label="Date From" fullWidth size="small" value={reportDateFrom} onChange={(event) => setReportDateFrom(event.target.value)} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <TextField type="date" label="Date To" fullWidth size="small" value={reportDateTo} onChange={(event) => setReportDateTo(event.target.value)} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Job</InputLabel>
                    <Select value={reportJob} label="Job" onChange={(event) => setReportJob(event.target.value)}>
                      <MenuItem value="all">All Jobs</MenuItem>
                      {options.jobs.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Department</InputLabel>
                    <Select value={reportDepartment} label="Department" onChange={(event) => setReportDepartment(event.target.value)}>
                      <MenuItem value="all">All Departments</MenuItem>
                      {options.departments.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Location</InputLabel>
                    <Select value={reportLocation} label="Location" onChange={(event) => setReportLocation(event.target.value)}>
                      <MenuItem value="all">All Locations</MenuItem>
                      {options.locations.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Recruiter</InputLabel>
                    <Select value={reportRecruiter} label="Recruiter" onChange={(event) => setReportRecruiter(event.target.value)}>
                      <MenuItem value="all">All Recruiters</MenuItem>
                      {options.recruiters.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>ATS Stage</InputLabel>
                    <Select value={reportStage} label="ATS Stage" onChange={(event) => setReportStage(event.target.value)}>
                      <MenuItem value="all">All Stages</MenuItem>
                      {options.stages.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Stack direction="row" spacing={1} mt={1.5}>
                <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>Export CSV</Button>
                <Button size="small" variant="outlined" startIcon={<TableChartIcon />} onClick={exportExcel}>Export Excel</Button>
                <Button size="small" variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={exportPdf}>Export PDF</Button>
                <Button size="small" variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>Print</Button>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <TableContainer component={Paper} sx={{ borderRadius: 2.5 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={tableCellHeaderStyle}>Date</TableCell>
                    <TableCell sx={tableCellHeaderStyle}>Job</TableCell>
                    <TableCell sx={tableCellHeaderStyle}>Department</TableCell>
                    <TableCell sx={tableCellHeaderStyle}>Location</TableCell>
                    <TableCell sx={tableCellHeaderStyle}>Recruiter</TableCell>
                    <TableCell sx={tableCellHeaderStyle}>ATS Stage</TableCell>
                    <TableCell sx={tableCellHeaderStyle}>Candidate</TableCell>
                    <TableCell sx={tableCellHeaderStyle}>Source</TableCell>
                    <TableCell sx={tableCellHeaderStyle}>Match Score</TableCell>
                    <TableCell sx={tableCellHeaderStyle}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportRows.slice(0, 500).map((row, index) => (
                    <TableRow key={`${row.date}-${row.candidate}-${index}`} hover>
                      <TableCell>{row.date.slice(0, 10)}</TableCell>
                      <TableCell>{row.jobTitle}</TableCell>
                      <TableCell>{row.department}</TableCell>
                      <TableCell>{row.location}</TableCell>
                      <TableCell>{row.recruiter}</TableCell>
                      <TableCell>{row.stage}</TableCell>
                      <TableCell>{row.candidate}</TableCell>
                      <TableCell>{row.source}</TableCell>
                      <TableCell>{row.matchScore}</TableCell>
                      <TableCell>{row.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}
    </MotionBox>
  );
};
