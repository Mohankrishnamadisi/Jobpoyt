import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { adminService } from '../../services/admin';
import { formatRupees } from '@utils/currency';

const StatCard: React.FC<{ title: string; value: number | string }> = ({ title, value }) => (
  <Paper sx={{ p: 2 }} elevation={1}>
    <Typography variant="subtitle2" color="text.secondary">
      {title}
    </Typography>
    <Typography variant="h5">{value}</Typography>
  </Paper>
);

const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<Record<string, any>>({});
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const stats = await adminService.getAnalytics();
        const series = await adminService.getDashboardChartData(14);
        const labels = Array.from({ length: 14 }).map((_, idx) => {
          const date = new Date();
          date.setDate(date.getDate() - (13 - idx));
          return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        });

        const registrationCounts = labels.map((label) => {
          const found = series.registrations.find((item: any) => item.day === label);
          return found ? found.count : 0;
        });

        const paymentsByDay = labels.map((label) => {
          const found = series.revenue.find((item: any) => item.day === label);
          return found ? found.amount : 0;
        });

        setAnalytics(stats);
        setTrendData(labels.map((label, index) => ({
          day: label,
          registrations: registrationCounts[index],
          revenue: paymentsByDay[index],
        })));
      } catch (err) {
        // noop
      }
    })();
  }, []);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Analytics
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Users" value={analytics.totalUsers ?? '—'} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Candidates" value={analytics.totalCandidates ?? '—'} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Recruiters" value={analytics.totalRecruiters ?? '—'} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Published Jobs" value={analytics.activeJobs ?? '—'} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Applications" value={analytics.totalApplications ?? '—'} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Revenue" value={formatRupees(analytics.totalRevenue)} />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 320 }}>
            <Typography variant="subtitle1">Registrations (Last 14 days)</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line dataKey="registrations" stroke="#1976d2" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 320 }}>
            <Typography variant="subtitle1">Revenue (Last 14 days)</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line dataKey="revenue" stroke="#2e7d32" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsPage;
