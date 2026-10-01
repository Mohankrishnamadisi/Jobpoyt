import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { RecruiterPageHero } from './RecruiterPageHero';
import {
  Analytics as AnalyticsIcon,
  Business as BusinessIcon,
  DataObject as WarehouseIcon,
  AutoGraph as AiInsightsIcon,
  QueryStats as ForecastingIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { executiveIntelligenceService } from '@services/executiveIntelligence';

type IntelligenceTab =
  | 'executive-dashboard'
  | 'business-intelligence'
  | 'data-warehouse'
  | 'ai-insights'
  | 'forecasting'
  | 'hiring-intelligence'
  | 'candidate-intelligence'
  | 'recruiter-intelligence'
  | 'organization-intelligence'
  | 'revenue-intelligence'
  | 'market-intelligence'
  | 'executive-reports'
  | 'custom-report-builder'
  | 'scheduled-reports'
  | 'realtime-monitoring'
  | 'data-quality'
  | 'ai-executive-assistant'
  | 'alerts'
  | 'benchmarking'
  | 'exports'
  | 'permissions';

interface RecruiterExecutiveIntelligenceCenterProps {
  mode?: 'executive-intelligence' | 'business-intelligence' | 'data-warehouse' | 'ai-insights' | 'forecasting';
}

const initialTabFromMode = (mode: RecruiterExecutiveIntelligenceCenterProps['mode']): IntelligenceTab => {
  if (mode === 'business-intelligence') return 'business-intelligence';
  if (mode === 'data-warehouse') return 'data-warehouse';
  if (mode === 'ai-insights') return 'ai-insights';
  if (mode === 'forecasting') return 'forecasting';
  return 'executive-dashboard';
};

const statCard = (label: string, value: string | number) => (
  <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
    <CardContent>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>{value}</Typography>
    </CardContent>
  </Card>
);

const saveTextFile = (name: string, content: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const RecruiterExecutiveIntelligenceCenter: React.FC<RecruiterExecutiveIntelligenceCenterProps> = ({ mode = 'executive-intelligence' }) => {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const [tab, setTab] = useState<IntelligenceTab>(initialTabFromMode(mode));
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setTab(initialTabFromMode(mode));
  }, [mode]);

  const [assistantQuery, setAssistantQuery] = useState('Show hiring trend for last six months.');
  const [assistantResult, setAssistantResult] = useState<any>(null);

  const [customName, setCustomName] = useState('Executive Growth Snapshot');
  const [customFields, setCustomFields] = useState('organizations,recruiters,candidates,jobs,applications,hires,revenue,mrr,arr');
  const [customFilters, setCustomFilters] = useState('period:last_quarter,industry:all,region:all');
  const [customChart, setCustomChart] = useState<'line' | 'bar' | 'area' | 'pie'>('line');
  const [customGroupBy, setCustomGroupBy] = useState('organization');

  const [scheduleName, setScheduleName] = useState('Board Monthly Intelligence Report');
  const [scheduleType, setScheduleType] = useState<'ceo' | 'chro' | 'recruitment' | 'finance' | 'operations' | 'board'>('board');
  const [scheduleCadence, setScheduleCadence] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('monthly');
  const [scheduleRecipients, setScheduleRecipients] = useState('board@actro.com,ceo@actro.com');

  const [reportType, setReportType] = useState<'ceo' | 'chro' | 'recruitment' | 'finance' | 'operations' | 'board'>('ceo');
  const [reportPeriod, setReportPeriod] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [generatedReport, setGeneratedReport] = useState('');

  const executiveKpis = useMemo(() => executiveIntelligenceService.getExecutiveKpis(), []);
  const bi = useMemo(() => executiveIntelligenceService.getBusinessIntelligence(), []);
  const warehouse = useMemo(() => executiveIntelligenceService.getWarehouseArchitecture(), []);
  const hiring = useMemo(() => executiveIntelligenceService.getHiringIntelligence(), []);
  const candidateIntel = useMemo(() => executiveIntelligenceService.getCandidateIntelligence(), []);
  const recruiterIntel = useMemo(() => executiveIntelligenceService.getRecruiterIntelligence(), []);
  const orgIntel = useMemo(() => executiveIntelligenceService.getOrganizationIntelligence(), []);
  const revenueIntel = useMemo(() => executiveIntelligenceService.getRevenueIntelligence(), []);
  const aiInsights = useMemo(() => executiveIntelligenceService.getAiInsights(), []);
  const forecasting = useMemo(() => executiveIntelligenceService.getPredictiveAnalytics(), []);
  const market = useMemo(() => executiveIntelligenceService.getMarketIntelligence(), []);
  const realtime = useMemo(() => executiveIntelligenceService.getRealtimeMonitoring(), []);
  const dataQuality = useMemo(() => executiveIntelligenceService.getDataQualityDashboard(), []);
  const benchmarking = useMemo(() => executiveIntelligenceService.getBenchmarking(), []);
  const permissions = useMemo(() => executiveIntelligenceService.getPermissions(), []);

  const scheduledReports = useMemo(() => executiveIntelligenceService.listScheduledReports(), [refreshKey]);
  const customTemplates = useMemo(() => executiveIntelligenceService.listCustomReportTemplates(), [refreshKey]);
  const alerts = useMemo(() => executiveIntelligenceService.listAlerts(), [refreshKey]);

  return (
    <Box>
      <RecruiterPageHero
        eyebrow="Intelligence"
        icon={<AnalyticsIcon />}
        title="Enterprise Intelligence & Decision Platform"
        description="Unified executive analytics across warehouse, AI insights, forecasting, BI and strategic reporting."
        actions={(
          <>
            <Button variant="contained" startIcon={<AnalyticsIcon />} onClick={() => setTab('executive-dashboard')}>KPI Center</Button>
            <Button variant="outlined" startIcon={<AiInsightsIcon />} onClick={() => setTab('ai-executive-assistant')}>AI Assistant</Button>
          </>
        )}
      />

      <Paper sx={{ border: '1px solid #e2e8f0', borderRadius: 2, mb: 2 }}>
        <Tabs value={tab} onChange={(_, value: IntelligenceTab) => setTab(value)} variant={isTablet ? 'scrollable' : 'scrollable'} scrollButtons="auto" allowScrollButtonsMobile sx={{ minHeight: 54, px: 0.5, '& .MuiTabs-scroller': { overflowX: 'auto !important' }, '& .MuiTabs-scrollButtons': { width: 34, borderRadius: 1, mx: 0.5 }, '& .MuiTab-root': { textTransform: 'none', whiteSpace: 'nowrap', minHeight: 54, minWidth: 'max-content', px: 1.8, fontWeight: 700, fontSize: '0.82rem' } }}>
          <Tab value="executive-dashboard" label="Executive Intelligence" icon={<AnalyticsIcon />} iconPosition="start" />
          <Tab value="business-intelligence" label="Business Intelligence" icon={<BusinessIcon />} iconPosition="start" />
          <Tab value="data-warehouse" label="Data Warehouse" icon={<WarehouseIcon />} iconPosition="start" />
          <Tab value="ai-insights" label="AI Insights" icon={<AiInsightsIcon />} iconPosition="start" />
          <Tab value="forecasting" label="Forecasting" icon={<ForecastingIcon />} iconPosition="start" />
          <Tab value="executive-reports" label="Reports" />
          <Tab value="realtime-monitoring" label="Real-time" />
          <Tab value="alerts" label="Alerts" />
          <Tab value="permissions" label="Permissions" />
        </Tabs>
      </Paper>

      {tab === 'executive-dashboard' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={3}>{statCard('Organizations', executiveKpis.organizations.toLocaleString())}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Recruiters', executiveKpis.recruiters.toLocaleString())}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Candidates', executiveKpis.candidates.toLocaleString())}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Jobs', executiveKpis.jobs.toLocaleString())}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Applications', executiveKpis.applications.toLocaleString())}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Interviews', executiveKpis.interviews.toLocaleString())}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Offers', executiveKpis.offers.toLocaleString())}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Hires', executiveKpis.hires.toLocaleString())}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Revenue', `$${executiveKpis.revenue.toLocaleString()}`)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('MRR', `$${executiveKpis.mrr.toLocaleString()}`)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('ARR', `$${executiveKpis.arr.toLocaleString()}`)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Platform Growth', `${executiveKpis.platformGrowth}%`)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('User Retention', `${executiveKpis.userRetention}%`)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Churn Rate', `${executiveKpis.churnRate}%`)}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('AI Usage', executiveKpis.aiUsage.toLocaleString())}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Assessment Usage', executiveKpis.assessmentUsage.toLocaleString())}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Referral Growth', `${executiveKpis.referralGrowth}%`)}</Grid>
        </Grid>
      )}

      {tab === 'business-intelligence' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="info">Interactive BI: charts, pivot tables, heat maps, geo maps, trend, funnel, cohort and drill-down style snapshots.</Alert></Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid #e2e8f0' }}><CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Charts & Trend Analysis</Typography>
              {bi.charts.map((chart) => (
                <Box key={chart.title} sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">{chart.title} ({chart.type})</Typography>
                  <Typography variant="body2" color="text.secondary">{chart.data.map((p) => `${p.label}: ${p.value}`).join(' | ')}</Typography>
                </Box>
              ))}
            </CardContent></Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0' }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>Pivot Metric</TableCell><TableCell>Enterprise</TableCell><TableCell>Growth%</TableCell><TableCell>Variance%</TableCell></TableRow></TableHead>
                <TableBody>
                  {bi.pivotRows.map((row) => (
                    <TableRow key={row.metric}><TableCell>{row.metric}</TableCell><TableCell>{row.enterprise.toLocaleString()}</TableCell><TableCell>{row.growth}</TableCell><TableCell>{row.variance}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          <Grid item xs={12} md={4}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Heat Map</Typography>{bi.heatMap.map((x) => <Typography key={x.segment} variant="body2">{x.segment}: {x.intensity}</Typography>)}</CardContent></Card></Grid>
          <Grid item xs={12} md={4}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Geo Map</Typography>{bi.geoMap.map((x) => <Typography key={x.region} variant="body2">{x.region}: {x.value.toLocaleString()}</Typography>)}</CardContent></Card></Grid>
          <Grid item xs={12} md={4}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Funnel/Cohort</Typography>{bi.funnels.map((x) => <Typography key={x.stage} variant="body2">{x.stage}: {x.users.toLocaleString()}</Typography>)}{bi.cohorts.map((x) => <Typography key={x.cohort} variant="body2">{x.cohort} 30d:{x.retention30d}% 90d:{x.retention90d}%</Typography>)}</CardContent></Card></Grid>
        </Grid>
      )}

      {tab === 'data-warehouse' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="success">Warehouse architecture is designed for millions of records using partitioning, materialized views, and mixed stream/batch refresh.</Alert></Grid>
          <Grid item xs={12} md={6}>{statCard('Centralized Data Storage', warehouse.centralizedStorage)}</Grid>
          <Grid item xs={12} md={6}>{statCard('Historical Snapshots', warehouse.historicalSnapshots)}</Grid>
          <Grid item xs={12} md={6}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Fact Tables</Typography>{warehouse.factTables.map((x) => <Typography key={x} variant="body2">- {x}</Typography>)}</CardContent></Card></Grid>
          <Grid item xs={12} md={6}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Dimension Tables</Typography>{warehouse.dimensionTables.map((x) => <Typography key={x} variant="body2">- {x}</Typography>)}</CardContent></Card></Grid>
          <Grid item xs={12} md={4}>{statCard('Partitioning', warehouse.dataPartitioning)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Retention Policy', warehouse.retentionPolicies)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Refresh Schedule', warehouse.refreshSchedule)}</Grid>
          <Grid item xs={12}>{statCard('Scale Strategy', warehouse.scaleStrategy)}</Grid>
        </Grid>
      )}

      {tab === 'hiring-intelligence' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={3}>{statCard('Time to Hire', `${hiring.timeToHireDays} days`)}</Grid>
          <Grid item xs={12} md={3}>{statCard('Time to Interview', `${hiring.timeToInterviewDays} days`)}</Grid>
          <Grid item xs={12} md={3}>{statCard('Offer Acceptance', `${hiring.offerAcceptanceRate}%`)}</Grid>
          <Grid item xs={12} md={3}>{statCard('Recruiter Productivity', `${hiring.recruiterProductivity}%`)}</Grid>
          <Grid item xs={12} md={4}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Hiring Funnel</Typography>{hiring.hiringFunnel.map((x) => <Typography key={x.stage} variant="body2">{x.stage}: {x.value}%</Typography>)}</CardContent></Card></Grid>
          <Grid item xs={12} md={4}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Department Hiring</Typography>{hiring.departmentHiring.map((x) => <Typography key={x.department} variant="body2">{x.department}: {x.hires.toLocaleString()}</Typography>)}</CardContent></Card></Grid>
          <Grid item xs={12} md={4}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Location/Source Effectiveness</Typography>{hiring.locationHiring.map((x) => <Typography key={x.location} variant="body2">{x.location}: {x.hires.toLocaleString()}</Typography>)}{hiring.sourceEffectiveness.map((x) => <Typography key={x.source} variant="body2">{x.source}: {x.conversion}%</Typography>)}</CardContent></Card></Grid>
        </Grid>
      )}

      {tab === 'candidate-intelligence' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={3}>{statCard('Candidate Growth', `${candidateIntel.candidateGrowth}%`)}</Grid>
          <Grid item xs={12} md={3}>{statCard('Resume Quality', `${candidateIntel.resumeQualityScore}%`)}</Grid>
          <Grid item xs={12} md={3}>{statCard('Assessment Performance', `${candidateIntel.assessmentPerformance}%`)}</Grid>
          <Grid item xs={12} md={3}>{statCard('Interview Success', `${candidateIntel.interviewSuccessRate}%`)}</Grid>
          <Grid item xs={12} md={6}>{statCard('Offer Acceptance', `${candidateIntel.offerAcceptance}%`)}</Grid>
          <Grid item xs={12} md={6}>{statCard('Retention Prediction', `${candidateIntel.retentionPrediction}%`)}</Grid>
          <Grid item xs={12}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Skill Trends</Typography>{candidateIntel.skillTrends.map((skill: string) => <Typography key={skill} variant="body2">- {skill}</Typography>)}</CardContent></Card></Grid>
        </Grid>
      )}

      {tab === 'recruiter-intelligence' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={3}>{statCard('Productivity', `${recruiterIntel.recruiterProductivity}%`)}</Grid>
          <Grid item xs={12} md={3}>{statCard('Response Time', `${recruiterIntel.averageResponseTimeHours} hrs`)}</Grid>
          <Grid item xs={12} md={3}>{statCard('Hiring Success', `${recruiterIntel.hiringSuccessRate}%`)}</Grid>
          <Grid item xs={12} md={3}>{statCard('Candidate Engagement', `${recruiterIntel.candidateEngagement}%`)}</Grid>
          <Grid item xs={12}>{statCard('Interview Success', `${recruiterIntel.interviewSuccess}%`)}</Grid>
          <Grid item xs={12}><TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0' }}><Table size="small"><TableHead><TableRow><TableCell>Top Recruiter</TableCell><TableCell>Hires</TableCell></TableRow></TableHead><TableBody>{recruiterIntel.topRecruiters.map((x: any) => <TableRow key={x.name}><TableCell>{x.name}</TableCell><TableCell>{x.hires}</TableCell></TableRow>)}</TableBody></Table></TableContainer></Grid>
        </Grid>
      )}

      {tab === 'organization-intelligence' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}>{statCard('Growth Rate', `${orgIntel.growthRate}%`)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Subscription Usage', `${orgIntel.subscriptionUsage}%`)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Storage Usage', `${orgIntel.storageUsageTb} TB`)}</Grid>
          <Grid item xs={12} md={6}>{statCard('AI Usage', orgIntel.aiUsage.toLocaleString())}</Grid>
          <Grid item xs={12} md={6}>{statCard('Recruiter Activity', `${orgIntel.recruiterActivity}%`)}</Grid>
          <Grid item xs={12}>{statCard('Hiring Trends', orgIntel.hiringTrends)}</Grid>
          <Grid item xs={12}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Department Performance</Typography>{orgIntel.departmentPerformance.map((x: any) => <Typography key={x.department} variant="body2">{x.department}: {x.score}</Typography>)}</CardContent></Card></Grid>
        </Grid>
      )}

      {tab === 'revenue-intelligence' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}>{statCard('Subscription Growth', `${revenueIntel.subscriptionGrowth}%`)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Credits Purchased', revenueIntel.creditsPurchased.toLocaleString())}</Grid>
          <Grid item xs={12} md={4}>{statCard('Payment Success', `${revenueIntel.paymentSuccess}%`)}</Grid>
          <Grid item xs={12} md={6}>{statCard('Refunds', `${revenueIntel.refunds}%`)}</Grid>
          <Grid item xs={12} md={6}>{statCard('Revenue Forecast', `$${revenueIntel.revenueForecast.toLocaleString()}`)}</Grid>
          <Grid item xs={12} md={6}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Revenue Trends</Typography>{revenueIntel.revenueTrends.map((x: any) => <Typography key={x.label} variant="body2">{x.label}: ${x.value.toLocaleString()}</Typography>)}</CardContent></Card></Grid>
          <Grid item xs={12} md={6}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Top Paying Organizations</Typography>{revenueIntel.topPayingOrganizations.map((x: any) => <Typography key={x.organization} variant="body2">{x.organization}: ${x.revenue.toLocaleString()}</Typography>)}</CardContent></Card></Grid>
        </Grid>
      )}

      {tab === 'ai-insights' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="success">AI-generated intelligence includes bottlenecks, trend forecasting, talent shortage alerts and recommendations.</Alert></Grid>
          <Grid item xs={12} md={6}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Hiring Bottlenecks</Typography>{aiInsights.hiringBottlenecks.map((x: string) => <Typography key={x} variant="body2">- {x}</Typography>)}</CardContent></Card></Grid>
          <Grid item xs={12} md={6}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Recruitment Trends</Typography>{aiInsights.recruitmentTrends.map((x: string) => <Typography key={x} variant="body2">- {x}</Typography>)}</CardContent></Card></Grid>
          <Grid item xs={12} md={6}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Top Skills & Emerging Technologies</Typography>{aiInsights.topSkills.map((x: string) => <Typography key={x} variant="body2">Skill: {x}</Typography>)}{aiInsights.emergingTechnologies.map((x: string) => <Typography key={x} variant="body2">Tech: {x}</Typography>)}</CardContent></Card></Grid>
          <Grid item xs={12} md={6}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Demand & Alerts</Typography><Typography variant="body2">{aiInsights.demandForecast}</Typography>{aiInsights.talentShortageAlerts.map((x: string) => <Typography key={x} variant="body2">Alert: {x}</Typography>)}</CardContent></Card></Grid>
          <Grid item xs={12} md={6}>{statCard('Recruiter Recommendations', aiInsights.recruiterRecommendations.join(' | '))}</Grid>
          <Grid item xs={12} md={6}>{statCard('Candidate Recommendations', aiInsights.candidateRecommendations.join(' | '))}</Grid>
        </Grid>
      )}

      {tab === 'forecasting' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="info">Predictive analytics estimates hiring demand, candidate availability, subscription and revenue growth.</Alert></Grid>
          <Grid item xs={12} md={3}>{statCard('Hiring Demand', `${forecasting.hiringDemand}%`)}</Grid>
          <Grid item xs={12} md={3}>{statCard('Candidate Availability', `${forecasting.candidateAvailability}%`)}</Grid>
          <Grid item xs={12} md={3}>{statCard('Subscription Growth', `${forecasting.subscriptionGrowth}%`)}</Grid>
          <Grid item xs={12} md={3}>{statCard('Revenue Growth', `${forecasting.revenueGrowth}%`)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Assessment Success', `${forecasting.assessmentSuccess}%`)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Recruiter Workload', `${forecasting.recruiterWorkload}%`)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Hiring Timeline', `${forecasting.hiringTimelineDays} days`)}</Grid>
        </Grid>
      )}

      {tab === 'market-intelligence' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={6}>{statCard('Industry Hiring Trends', market.industryHiringTrends)}</Grid>
          <Grid item xs={12} md={6}>{statCard('Salary Trends', market.salaryTrends)}</Grid>
          <Grid item xs={12} md={6}>{statCard('Remote Hiring', `${market.remoteHiring}%`)}</Grid>
          <Grid item xs={12} md={6}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Technology Demand</Typography>{market.technologyDemand.map((x: string) => <Typography key={x} variant="body2">- {x}</Typography>)}</CardContent></Card></Grid>
          <Grid item xs={12} md={6}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Regional Hiring</Typography>{market.regionalHiring.map((x: any) => <Typography key={x.region} variant="body2">{x.region}: {x.index}</Typography>)}</CardContent></Card></Grid>
          <Grid item xs={12} md={6}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Company Hiring Activity</Typography>{market.companyHiringActivity.map((x: any) => <Typography key={x.segment} variant="body2">{x.segment}: {x.activity}</Typography>)}</CardContent></Card></Grid>
        </Grid>
      )}

      {tab === 'executive-reports' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="info">Generate CEO, CHRO, Recruitment, Finance, Operations and Board reports for weekly/monthly/quarterly/yearly cadence.</Alert></Grid>
          <Grid item xs={12} md={3}><FormControl fullWidth size="small"><InputLabel>Report</InputLabel><Select value={reportType} label="Report" onChange={(e) => setReportType(e.target.value as any)}>{['ceo', 'chro', 'recruitment', 'finance', 'operations', 'board'].map((x) => <MenuItem key={x} value={x}>{x.toUpperCase()}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={12} md={3}><FormControl fullWidth size="small"><InputLabel>Period</InputLabel><Select value={reportPeriod} label="Period" onChange={(e) => setReportPeriod(e.target.value as any)}>{['weekly', 'monthly', 'quarterly', 'yearly'].map((x) => <MenuItem key={x} value={x}>{x.toUpperCase()}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="contained" onClick={() => setGeneratedReport(executiveIntelligenceService.generateExecutiveReport(reportType, reportPeriod))}>Generate Report</Button></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="outlined" startIcon={<DownloadIcon />} onClick={() => { if (generatedReport) saveTextFile(`${reportType}-${reportPeriod}.md`, generatedReport); }}>Download</Button></Grid>
          <Grid item xs={12}>{generatedReport && <Paper sx={{ p: 1.2, border: '1px solid #e2e8f0' }}><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{generatedReport}</Typography></Paper>}</Grid>
        </Grid>
      )}

      {tab === 'custom-report-builder' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="success">Custom Report Builder supports field selection, filters, charts, grouping, templates and scheduling.</Alert></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Report Name" value={customName} onChange={(e) => setCustomName(e.target.value)} /></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Fields" value={customFields} onChange={(e) => setCustomFields(e.target.value)} /></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Filters" value={customFilters} onChange={(e) => setCustomFilters(e.target.value)} /></Grid>
          <Grid item xs={12} md={1.5}><FormControl fullWidth size="small"><InputLabel>Chart</InputLabel><Select value={customChart} label="Chart" onChange={(e) => setCustomChart(e.target.value as any)}>{['line', 'bar', 'area', 'pie'].map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={12} md={1.5}><TextField fullWidth size="small" label="Group By" value={customGroupBy} onChange={(e) => setCustomGroupBy(e.target.value)} /></Grid>
          <Grid item xs={12}><Button variant="contained" onClick={() => {
            executiveIntelligenceService.createCustomReportTemplate(
              customName,
              customFields.split(',').map((x) => x.trim()).filter(Boolean),
              customFilters.split(',').map((x) => x.trim()).filter(Boolean),
              customChart,
              customGroupBy
            );
            setRefreshKey((v) => v + 1);
            toast.success('Custom report template saved');
          }}>Save Template</Button></Grid>
          <Grid item xs={12}><TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0' }}><Table size="small"><TableHead><TableRow><TableCell>Name</TableCell><TableCell>Fields</TableCell><TableCell>Filters</TableCell><TableCell>Chart</TableCell><TableCell>Group By</TableCell></TableRow></TableHead><TableBody>{customTemplates.map((row) => <TableRow key={row.id}><TableCell>{row.name}</TableCell><TableCell>{row.fields.join(', ')}</TableCell><TableCell>{row.filters.join(', ')}</TableCell><TableCell>{row.chartType}</TableCell><TableCell>{row.groupBy}</TableCell></TableRow>)}</TableBody></Table></TableContainer></Grid>
        </Grid>
      )}

      {tab === 'scheduled-reports' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="info">Scheduled reports: daily/weekly/monthly/quarterly with email delivery.</Alert></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Schedule Name" value={scheduleName} onChange={(e) => setScheduleName(e.target.value)} /></Grid>
          <Grid item xs={12} md={2}><FormControl fullWidth size="small"><InputLabel>Type</InputLabel><Select value={scheduleType} label="Type" onChange={(e) => setScheduleType(e.target.value as any)}>{['ceo', 'chro', 'recruitment', 'finance', 'operations', 'board'].map((x) => <MenuItem key={x} value={x}>{x.toUpperCase()}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={12} md={2}><FormControl fullWidth size="small"><InputLabel>Cadence</InputLabel><Select value={scheduleCadence} label="Cadence" onChange={(e) => setScheduleCadence(e.target.value as any)}>{['daily', 'weekly', 'monthly', 'quarterly'].map((x) => <MenuItem key={x} value={x}>{x.toUpperCase()}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Recipients" value={scheduleRecipients} onChange={(e) => setScheduleRecipients(e.target.value)} /></Grid>
          <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={() => {
            executiveIntelligenceService.scheduleReport(
              scheduleName,
              scheduleType,
              scheduleCadence,
              scheduleRecipients.split(',').map((x) => x.trim()).filter(Boolean)
            );
            setRefreshKey((v) => v + 1);
            toast.success('Report scheduled');
          }}>Schedule</Button></Grid>
          <Grid item xs={12}><TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0' }}><Table size="small"><TableHead><TableRow><TableCell>Name</TableCell><TableCell>Type</TableCell><TableCell>Cadence</TableCell><TableCell>Recipients</TableCell><TableCell>Status</TableCell><TableCell>Action</TableCell></TableRow></TableHead><TableBody>{scheduledReports.map((row) => <TableRow key={row.id}><TableCell>{row.name}</TableCell><TableCell>{row.reportType}</TableCell><TableCell>{row.cadence}</TableCell><TableCell>{row.recipients.join(', ')}</TableCell><TableCell>{row.enabled ? 'Enabled' : 'Disabled'}</TableCell><TableCell><Button size="small" onClick={() => { executiveIntelligenceService.toggleScheduledReport(row.id); setRefreshKey((v) => v + 1); }}>{row.enabled ? 'Disable' : 'Enable'}</Button></TableCell></TableRow>)}</TableBody></Table></TableContainer></Grid>
        </Grid>
      )}

      {tab === 'realtime-monitoring' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={3}>{statCard('Active Users', realtime.activeUsers.toLocaleString())}</Grid>
          <Grid item xs={12} md={3}>{statCard('Jobs Posted', realtime.jobsPosted.toLocaleString())}</Grid>
          <Grid item xs={12} md={3}>{statCard('Applications Received', realtime.applicationsReceived.toLocaleString())}</Grid>
          <Grid item xs={12} md={3}>{statCard('Live KPIs', realtime.liveKpis ? 'On' : 'Off')}</Grid>
          <Grid item xs={12} md={3}>{statCard('Interview Status', realtime.interviewStatus)}</Grid>
          <Grid item xs={12} md={3}>{statCard('Queue Health', realtime.queueHealth)}</Grid>
          <Grid item xs={12} md={3}>{statCard('API Health', realtime.apiHealth)}</Grid>
          <Grid item xs={12} md={3}>{statCard('AI Worker Status', realtime.aiWorkerStatus)}</Grid>
        </Grid>
      )}

      {tab === 'data-quality' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="warning">Data quality dashboard tracks missing data, duplicates, failed jobs, import and validation errors with freshness SLA.</Alert></Grid>
          <Grid item xs={12} md={4}>{statCard('Missing Data', `${dataQuality.missingData}%`)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Duplicate Records', `${dataQuality.duplicateRecords}%`)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Failed Jobs', dataQuality.failedJobs)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Import Errors', dataQuality.importErrors)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Validation Errors', dataQuality.validationErrors)}</Grid>
          <Grid item xs={12} md={4}>{statCard('Data Freshness', `${dataQuality.dataFreshnessMinutes} min`)}</Grid>
        </Grid>
      )}

      {tab === 'ai-executive-assistant' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="info">Ask questions like: hiring trend, top recruiter, next month prediction, fastest growing skills, root-cause of hiring slowdown.</Alert></Grid>
          <Grid item xs={12} md={10}><TextField fullWidth size="small" label="Executive Query" value={assistantQuery} onChange={(e) => setAssistantQuery(e.target.value)} /></Grid>
          <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={() => setAssistantResult(executiveIntelligenceService.askExecutiveAssistant(assistantQuery))}>Ask AI</Button></Grid>
          {assistantResult && (
            <>
              <Grid item xs={12}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{assistantResult.summary}</Typography>{assistantResult.narrative.map((line: string) => <Typography key={line} variant="body2">- {line}</Typography>)}</CardContent></Card></Grid>
              <Grid item xs={12}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Chart Data</Typography>{assistantResult.chart.map((point: any) => <Typography key={point.label} variant="body2">{point.label}: {point.value}</Typography>)}</CardContent></Card></Grid>
            </>
          )}
        </Grid>
      )}

      {tab === 'alerts' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="error">Critical alert channels: Revenue Drop, Hiring Slowdown, Application Drop, AI Failure, System Health, Subscription Churn, Security Events.</Alert></Grid>
          <Grid item xs={12}><TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0' }}><Table size="small"><TableHead><TableRow><TableCell>Type</TableCell><TableCell>Severity</TableCell><TableCell>Message</TableCell><TableCell>Created</TableCell><TableCell>Status</TableCell><TableCell>Action</TableCell></TableRow></TableHead><TableBody>{alerts.map((row) => <TableRow key={row.id}><TableCell>{row.type}</TableCell><TableCell>{row.severity}</TableCell><TableCell>{row.message}</TableCell><TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell><TableCell>{row.acknowledged ? 'Acknowledged' : 'Open'}</TableCell><TableCell><Button size="small" disabled={row.acknowledged} onClick={() => { executiveIntelligenceService.acknowledgeAlert(row.id); setRefreshKey((v) => v + 1); }}>{row.acknowledged ? 'Done' : 'Acknowledge'}</Button></TableCell></TableRow>)}</TableBody></Table></TableContainer></Grid>
        </Grid>
      )}

      {tab === 'benchmarking' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="info">Benchmark comparisons across organizations, departments, recruiters, locations, industries and time periods.</Alert></Grid>
          <Grid item xs={12} md={4}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Organizations</Typography>{benchmarking.organizations.map((x: any) => <Typography key={x.name} variant="body2">{x.name}: {x.score}</Typography>)}</CardContent></Card></Grid>
          <Grid item xs={12} md={4}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Departments</Typography>{benchmarking.departments.map((x: any) => <Typography key={x.name} variant="body2">{x.name}: {x.score}</Typography>)}</CardContent></Card></Grid>
          <Grid item xs={12} md={4}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Recruiters</Typography>{benchmarking.recruiters.map((x: any) => <Typography key={x.name} variant="body2">{x.name}: {x.score}</Typography>)}</CardContent></Card></Grid>
          <Grid item xs={12} md={6}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Locations</Typography>{benchmarking.locations.map((x: any) => <Typography key={x.name} variant="body2">{x.name}: {x.score}</Typography>)}</CardContent></Card></Grid>
          <Grid item xs={12} md={6}><Card sx={{ border: '1px solid #e2e8f0' }}><CardContent><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Industries</Typography>{benchmarking.industries.map((x: any) => <Typography key={x.name} variant="body2">{x.name}: {x.score}</Typography>)}{benchmarking.periods.map((x: string) => <Typography key={x} variant="body2">Period: {x}</Typography>)}</CardContent></Card></Grid>
        </Grid>
      )}

      {tab === 'exports' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="info">Export formats supported: PDF, Excel, CSV, PowerPoint.</Alert></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="contained" startIcon={<DownloadIcon />} onClick={() => saveTextFile('executive-report.pdf.txt', executiveIntelligenceService.export(generatedReport || 'Executive report sample', 'pdf'))}>PDF</Button></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="outlined" onClick={() => saveTextFile('executive-report.excel.txt', executiveIntelligenceService.export(generatedReport || 'Executive report sample', 'excel'))}>Excel</Button></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="outlined" onClick={() => saveTextFile('executive-report.csv', executiveIntelligenceService.export(generatedReport || 'Executive report sample', 'csv'))}>CSV</Button></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="outlined" onClick={() => saveTextFile('executive-report.ppt.txt', executiveIntelligenceService.export(generatedReport || 'Executive report sample', 'powerpoint'))}>PowerPoint</Button></Grid>
        </Grid>
      )}

      {tab === 'permissions' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}><Alert severity="info">Role-based access control for executive intelligence platform.</Alert></Grid>
          <Grid item xs={12} md={6}>{statCard('Platform Owner', permissions.platformOwner)}</Grid>
          <Grid item xs={12} md={6}>{statCard('Executive', permissions.executive)}</Grid>
          <Grid item xs={12} md={6}>{statCard('Finance', permissions.finance)}</Grid>
          <Grid item xs={12} md={6}>{statCard('Operations', permissions.operations)}</Grid>
          <Grid item xs={12} md={6}>{statCard('HR Director', permissions.hrDirector)}</Grid>
          <Grid item xs={12} md={6}>{statCard('Super Admin', permissions.superAdmin)}</Grid>
        </Grid>
      )}

      <Paper sx={{ border: '1px dashed #cbd5e1', borderRadius: 2, mt: 2, p: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Additional modules available in this center: Hiring Intelligence, Candidate Intelligence, Recruiter Intelligence, Organization Intelligence, Revenue Intelligence, Market Intelligence, Custom Report Builder, Scheduled Reports, Data Quality, AI Assistant, Benchmarking and Exports.
        </Typography>
        <Stack direction="row" spacing={0.7} sx={{ mt: 1 }} flexWrap="wrap">
          <Button size="small" onClick={() => setTab('hiring-intelligence')}>Hiring Intelligence</Button>
          <Button size="small" onClick={() => setTab('candidate-intelligence')}>Candidate Intelligence</Button>
          <Button size="small" onClick={() => setTab('recruiter-intelligence')}>Recruiter Intelligence</Button>
          <Button size="small" onClick={() => setTab('organization-intelligence')}>Organization Intelligence</Button>
          <Button size="small" onClick={() => setTab('revenue-intelligence')}>Revenue Intelligence</Button>
          <Button size="small" onClick={() => setTab('market-intelligence')}>Market Intelligence</Button>
          <Button size="small" onClick={() => setTab('custom-report-builder')}>Custom Report Builder</Button>
          <Button size="small" onClick={() => setTab('scheduled-reports')}>Scheduled Reports</Button>
          <Button size="small" onClick={() => setTab('data-quality')}>Data Quality Dashboard</Button>
          <Button size="small" onClick={() => setTab('ai-executive-assistant')}>AI Executive Assistant</Button>
          <Button size="small" onClick={() => setTab('benchmarking')}>Benchmarking</Button>
          <Button size="small" onClick={() => setTab('exports')}>Export</Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default RecruiterExecutiveIntelligenceCenter;
