import React, { useEffect, useMemo, useState } from 'react';
import { Box, Container, Typography, Card, CardContent, Chip, Button, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Layout } from '@components/layout/Layout';
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
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <Card
          sx={{
            mb: 2.2,
            borderRadius: 3,
            border: isDarkMode ? '1px solid rgba(148,163,184,0.3)' : '1px solid rgba(30,136,229,0.28)',
            background: isDarkMode
              ? 'radial-gradient(circle at 14% 20%, rgba(56,189,248,0.24) 0%, rgba(56,189,248,0) 38%), linear-gradient(136deg, #020617 0%, #0F172A 46%, #1E293B 100%)'
              : 'radial-gradient(circle at 14% 20%, rgba(191,219,254,0.62) 0%, rgba(191,219,254,0) 38%), linear-gradient(136deg, #F4F9FF 0%, #EAF4FF 48%, #DCEBFD 100%)',
            color: isDarkMode ? '#E2E8F0' : '#0B3A64',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: isDarkMode ? '0 18px 42px rgba(2,6,23,0.55)' : '0 18px 42px rgba(37, 99, 235, 0.16)',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background: isDarkMode
                ? 'linear-gradient(118deg, rgba(148,163,184,0.08) 0%, rgba(148,163,184,0) 34%)'
                : 'linear-gradient(118deg, rgba(255,255,255,0.46) 0%, rgba(255,255,255,0) 36%)',
              pointerEvents: 'none',
            },
          }}
        >
          <CardContent sx={{ p: { xs: 2.1, md: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.1, mb: 0.6 }}>
                  Saved Jobs
                </Typography>
                <Typography sx={{ color: isDarkMode ? 'rgba(226,232,240,0.9)' : 'rgba(11,58,100,0.84)' }}>
                  Curated watchlist of opportunities you bookmarked for the right moment.
                </Typography>
              </Box>
              <Button
                component={RouterLink}
                to={ROUTES.JOBS}
                variant="outlined"
                sx={{
                  borderColor: isDarkMode ? 'rgba(148,163,184,0.64)' : 'rgba(30,136,229,0.5)',
                  bgcolor: isDarkMode ? 'rgba(148,163,184,0.14)' : 'rgba(255,255,255,0.72)',
                  color: isDarkMode ? '#E2E8F0' : '#0B3A64',
                  fontWeight: 700,
                  '&:hover': {
                    borderColor: isDarkMode ? '#CBD5E1' : '#1D4ED8',
                    bgcolor: isDarkMode ? 'rgba(148,163,184,0.22)' : 'rgba(255,255,255,0.94)',
                  },
                }}
              >
                Browse More Jobs
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Grid container spacing={1.4} sx={{ mb: 2.2 }}>
          {[
            { label: 'Total Saved', value: stats.total, color: isDarkMode ? '#E2E8F0' : '#0F172A' },
            { label: 'Remote Roles', value: stats.remote, color: '#0284C7' },
            { label: 'With Company', value: stats.withCompany, color: '#2563EB' },
            { label: 'With Location', value: stats.withLocation, color: '#0EA5E9' },
          ].map((item) => (
            <Grid item xs={6} md={3} key={item.label}>
              <Card
                sx={{
                  borderRadius: 2.2,
                  border: isDarkMode ? '1px solid rgba(148,163,184,0.2)' : `1px solid ${theme.palette.divider}`,
                  background: isDarkMode
                    ? 'linear-gradient(160deg, rgba(15,23,42,0.94), rgba(30,41,59,0.9))'
                    : 'linear-gradient(160deg, #FFFFFF, #F8FAFC)',
                }}
              >
                <CardContent sx={{ py: 1.4, '&:last-child': { pb: 1.4 } }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    {item.label}
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 0.3, fontWeight: 900, color: item.color }}>
                    {item.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {loading ? (
          <Card sx={{ borderRadius: 2.2 }}>
            <CardContent>
              <Typography sx={{ color: 'text.secondary' }}>Loading saved jobs...</Typography>
            </CardContent>
          </Card>
        ) : savedJobs.length === 0 ? (
          <Card sx={{ borderRadius: 2.2, border: isDarkMode ? '1px solid rgba(148,163,184,0.2)' : `1px solid ${theme.palette.divider}` }}>
            <CardContent sx={{ py: 5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.6 }}>
                No saved jobs yet
              </Typography>
              <Typography sx={{ color: 'text.secondary', mb: 2 }}>
                Mark a job as saved to keep it handy for later.
              </Typography>
              <Button component={RouterLink} to={ROUTES.JOBS} variant="contained">
                Explore Jobs
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={1.6}>
            {savedJobs.map((item) => {
              const isRemote = String(item.jobs?.location || '').toLowerCase().includes('remote');

              return (
                <Grid item xs={12} md={6} lg={4} key={item.id}>
                  <Card
                    sx={{
                      height: '100%',
                      borderRadius: 2.3,
                      border: isDarkMode ? '1px solid rgba(148,163,184,0.24)' : `1px solid ${theme.palette.divider}`,
                      background: isDarkMode
                        ? 'linear-gradient(160deg, rgba(15,23,42,0.97), rgba(30,41,59,0.92))'
                        : 'linear-gradient(160deg, #FFFFFF 0%, #F7FBFF 100%)',
                      boxShadow: isDarkMode ? '0 10px 24px rgba(2,6,23,0.34)' : '0 10px 24px rgba(15,23,42,0.08)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 4,
                        background: isRemote ? '#0EA5E9' : '#2563EB',
                      },
                    }}
                  >
                    <CardContent sx={{ pl: 2.2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.1, mb: 1.1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.25, color: isDarkMode ? '#F8FAFC' : '#0F172A' }}>
                          {item.jobs?.title || 'Role unavailable'}
                        </Typography>
                        <Chip label="Saved" size="small" color="primary" sx={{ fontWeight: 700 }} />
                      </Box>

                      <Typography variant="body2" sx={{ fontWeight: 700, color: isDarkMode ? '#CBD5E1' : '#334155', mb: 0.4 }}>
                        {item.jobs?.company_name || 'Company unavailable'}
                      </Typography>

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mt: 1.2, mb: 1.4 }}>
                        <Chip size="small" variant="outlined" label={item.jobs?.location || 'Location not specified'} sx={{ fontWeight: 600 }} />
                        <Chip size="small" variant="outlined" label={item.created_at ? `Saved ${formatDate(item.created_at)}` : 'Saved recently'} sx={{ fontWeight: 600 }} />
                        {isRemote ? <Chip size="small" label="Remote" color="info" sx={{ fontWeight: 700 }} /> : null}
                      </Box>

                      {item.jobs?.id ? (
                        <Button component={RouterLink} to={ROUTES.JOB_DETAILS.replace(':id', item.jobs.id)} fullWidth variant="contained" sx={{ fontWeight: 700 }}>
                          View Job
                        </Button>
                      ) : (
                        <Button fullWidth variant="outlined" disabled sx={{ fontWeight: 700 }}>
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
