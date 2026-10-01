import React, { useEffect, useMemo, useState } from 'react';
import { Box, Container, Typography, Card, CardContent, Chip, Button, Grid, Avatar } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ArrowForward, Bookmark, BookmarkBorder, Business, LocationOn, Public, Schedule } from '@mui/icons-material';
import { Layout } from '@components/layout/Layout';
import { DashboardHero, DashboardStatCard, heroGoldButtonSx } from '@components/dashboard/DashboardSectionKit';
import { useAuthStore } from '@store/index';
import { savedService } from '@services/api';
import { ROUTES } from '@constants/index';
import { formatDate } from '@utils/index';
import { Link as RouterLink } from 'react-router-dom';

type SavedJobItem = {
  id: string;
  created_at?: string;
  jobs?: {
    id?: string;
    title?: string;
    company_name?: string;
    location?: string;
  };
};

export const SavedJobsPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { user } = useAuthStore();
  const Shell = embedded ? React.Fragment : Layout;
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [savedJobs, setSavedJobs] = useState<SavedJobItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSavedJobs = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const data = await savedService.getUserSavedJobs(user.id);
        setSavedJobs(data || []);
      } catch (err) {
        console.error('Failed to load saved jobs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedJobs();
  }, [user?.id]);

  const stats = useMemo(() => {
    const total = savedJobs.length;
    const remote = savedJobs.filter((item) => String(item.jobs?.location || '').toLowerCase().includes('remote')).length;
    const withCompany = savedJobs.filter((item) => Boolean(item.jobs?.company_name)).length;
    const withLocation = savedJobs.filter((item) => Boolean(item.jobs?.location)).length;

    return { total, remote, withCompany, withLocation };
  }, [savedJobs]);

  return (
    <Shell>
      <Container maxWidth="xl" sx={{ py: embedded ? { xs: 1, md: 1.4 } : { xs: 1.5, md: 2.2 }, px: embedded ? { xs: 0.7, sm: 1, md: 1.2 } : { xs: 1.2, sm: 2, md: 3 } }}>
        <DashboardHero
          compact={embedded}
          icon={<Bookmark />}
          eyebrow="CAREER WATCHLIST"
          title="Saved Jobs"
          subtitle="Keep the roles that matter close and come back when the moment is right."
          action={(
            <Button component={RouterLink} to={ROUTES.JOBS} variant="contained" endIcon={<ArrowForward />} sx={heroGoldButtonSx}>
              Browse More Jobs
            </Button>
          )}
        />

        <Grid container spacing={embedded ? 1 : 1.5} sx={{ mb: embedded ? 1.5 : 2 }}>
          {[
            { label: 'Total Saved', value: stats.total, icon: <Bookmark />, accent: '#4F46E5', accent2: '#8B5CF6' },
            { label: 'Remote Roles', value: stats.remote, icon: <Public />, accent: '#0284C7', accent2: '#38BDF8' },
            { label: 'With Company', value: stats.withCompany, icon: <Business />, accent: '#D97706', accent2: '#F59E0B' },
            { label: 'With Location', value: stats.withLocation, icon: <LocationOn />, accent: '#059669', accent2: '#10B981' },
          ].map((item) => (
            <Grid item xs={6} md={3} key={item.label}>
              <DashboardStatCard compact={embedded} darkMode={isDarkMode} label={item.label} value={item.value} icon={item.icon} accent={item.accent} accent2={item.accent2} />
            </Grid>
          ))}
        </Grid>

        {loading ? (
          <Card sx={{ borderRadius: 3.5 }}>
            <CardContent>
              <Typography sx={{ color: 'text.secondary' }}>Loading saved jobs...</Typography>
            </CardContent>
          </Card>
        ) : savedJobs.length === 0 ? (
          <Box sx={{ border: '1px dashed rgba(99,102,241,0.3)', borderRadius: 3.5, p: { xs: 3, md: 4 }, textAlign: 'center', background: isDarkMode ? '#0F172A' : 'radial-gradient(circle at 15% 0%, rgba(99,102,241,0.08), transparent 40%), radial-gradient(circle at 85% 100%, rgba(214,167,58,0.1), transparent 40%), #FFFFFF' }}>
            <Avatar sx={{ width: 56, height: 56, mx: 'auto', mb: 1.5, color: '#fff', background: 'linear-gradient(135deg, #4F46E5, #8B5CF6)', boxShadow: '0 0 0 8px rgba(99,102,241,0.1), 0 12px 24px rgba(79,70,229,0.3)' }}>
              <BookmarkBorder />
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.6 }}>
              No saved jobs yet
            </Typography>
            <Typography sx={{ color: 'text.secondary', mb: 2 }}>
              Mark a job as saved to keep it handy for later.
            </Typography>
            <Button component={RouterLink} to={ROUTES.JOBS} variant="contained" endIcon={<ArrowForward />} sx={{ ...heroGoldButtonSx, px: 2.4 }}>
              Explore Jobs
            </Button>
          </Box>
        ) : (
          <Grid container spacing={embedded ? 1.2 : 1.8}>
            {savedJobs.map((item) => {
              const isRemote = String(item.jobs?.location || '').toLowerCase().includes('remote');

              return (
                <Grid item xs={12} md={6} lg={4} key={item.id}>
                  <Card
                    sx={{
                      height: '100%',
                      borderRadius: 3.5,
                      border: isDarkMode ? '1px solid rgba(148,163,184,0.24)' : '1px solid rgba(148,163,184,0.2)',
                      background: isDarkMode ? 'linear-gradient(160deg, rgba(15,23,42,0.97), rgba(30,41,59,0.92))' : '#FFFFFF',
                      boxShadow: isDarkMode ? '0 10px 24px rgba(2,6,23,0.34)' : '0 4px 14px rgba(15,23,42,0.05)',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.22s ease',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 0,
                        height: 3,
                        background: isRemote ? 'linear-gradient(90deg, #0284C7, #38BDF8)' : 'linear-gradient(90deg, #4F46E5, #D6A73A)',
                      },
                      '&:hover': { transform: 'translateY(-3px)', borderColor: 'rgba(79,70,229,0.4)', boxShadow: '0 18px 34px rgba(79,70,229,0.14)' },
                    }}
                  >
                    <CardContent sx={{ p: embedded ? 1.7 : 2.3, '&:last-child': { pb: embedded ? 1.7 : 2.3 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2, mb: 1.2 }}>
                        <Avatar
                          variant="rounded"
                          sx={{ width: embedded ? 42 : 48, height: embedded ? 42 : 48, borderRadius: 2.5, fontWeight: 800, color: '#fff', background: 'linear-gradient(135deg, #4F46E5, #8B5CF6)', boxShadow: '0 8px 18px rgba(79,70,229,0.25)', flexShrink: 0 }}
                        >
                          {String(item.jobs?.company_name || item.jobs?.title || 'J').charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.25, fontSize: embedded ? 13.5 : 15.5, color: isDarkMode ? '#F8FAFC' : '#0B2745', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.jobs?.title || 'Role unavailable'}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.3, fontSize: embedded ? 12 : 13, fontWeight: 600, color: isDarkMode ? '#CBD5E1' : '#64748B', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.jobs?.company_name || 'Company unavailable'}
                          </Typography>
                        </Box>
                        <Chip icon={<Bookmark sx={{ fontSize: '14px !important', color: '#071D35 !important' }} />} label="Saved" size="small" sx={{ fontWeight: 800, color: '#071D35', background: 'linear-gradient(135deg, #FDE68A, #D6A73A)', borderRadius: 99, flexShrink: 0 }} />
                      </Box>

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7, mb: embedded ? 1.3 : 1.7 }}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 1, py: 0.35, borderRadius: 99, fontSize: 12, fontWeight: 600, color: isDarkMode ? '#CBD5E1' : '#475569', bgcolor: isDarkMode ? 'rgba(148,163,184,0.12)' : '#F1F5F9' }}>
                          <LocationOn sx={{ fontSize: 15, color: '#EF4444' }} /> {item.jobs?.location || 'Location not specified'}
                        </Box>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 1, py: 0.35, borderRadius: 99, fontSize: 12, fontWeight: 600, color: isDarkMode ? '#CBD5E1' : '#475569', bgcolor: isDarkMode ? 'rgba(148,163,184,0.12)' : '#F1F5F9' }}>
                          <Schedule sx={{ fontSize: 15, color: '#D97706' }} /> {item.created_at ? `Saved ${formatDate(item.created_at)}` : 'Saved recently'}
                        </Box>
                        {isRemote ? (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 1, py: 0.35, borderRadius: 99, fontSize: 12, fontWeight: 800, color: '#075985', bgcolor: '#E0F2FE' }}>
                            <Public sx={{ fontSize: 15 }} /> Remote
                          </Box>
                        ) : null}
                      </Box>

                      {item.jobs?.id ? (
                        <Button size={embedded ? 'small' : 'medium'} component={RouterLink} to={ROUTES.JOB_DETAILS.replace(':id', item.jobs.id)} fullWidth variant="contained" endIcon={<ArrowForward />} sx={{ minHeight: embedded ? 34 : 40, fontSize: embedded ? 12 : 13.5, textTransform: 'none', fontWeight: 800, borderRadius: 2.5, background: 'linear-gradient(135deg, #1D4ED8, #4F46E5)', boxShadow: '0 10px 20px rgba(79,70,229,0.28)', '&:hover': { background: 'linear-gradient(135deg, #1E40AF, #4338CA)', boxShadow: '0 12px 24px rgba(79,70,229,0.38)' } }}>
                          View Job
                        </Button>
                      ) : (
                        <Button size={embedded ? 'small' : 'medium'} fullWidth variant="outlined" disabled sx={{ minHeight: embedded ? 34 : 40, fontSize: embedded ? 12 : undefined, textTransform: 'none', fontWeight: 700, borderRadius: 2.5 }}>
                          Job Unavailable
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>
    </Shell>
  );
};
