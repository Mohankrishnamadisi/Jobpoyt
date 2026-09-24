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
      <Container maxWidth="xl" sx={{ py: { xs: 1.5, md: 2.2 }, px: { xs: 1.2, sm: 2, md: 3 } }}>
        <Card
          sx={{
            mb: 2,
            borderRadius: 3.5,
            border: 'none',
            background: 'linear-gradient(115deg, #071D35 0%, #0B3558 58%, #126B8F 100%)',
            color: '#fff',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 16px 34px rgba(7,29,53,0.18)',
            '&::after': { content: '""', position: 'absolute', width: 220, height: 220, borderRadius: '50%', right: -80, top: -120, background: 'rgba(214,167,58,0.2)' },
          }}
        >
          <CardContent sx={{ p: { xs: 2, md: 2.6 }, position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Chip label="CAREER WATCHLIST" size="small" sx={{ mb: 1, bgcolor: 'rgba(255,255,255,0.14)', color: '#F7D774', fontWeight: 900, letterSpacing: 1, borderRadius: 1.2 }} />
                <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.08, mb: 0.6, fontSize: { xs: 26, md: 32 }, letterSpacing: '-0.035em' }}>
                  Saved Jobs
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.76)', fontSize: { xs: 13, md: 15 } }}>
                  Keep the roles that matter close and come back when the moment is right.
                </Typography>
              </Box>
              <Button
                component={RouterLink}
                to={ROUTES.JOBS}
                variant="outlined"
                sx={{
                  border: 'none',
                  bgcolor: '#D6A73A',
                  color: '#071D35',
                  fontWeight: 900,
                  borderRadius: 2,
                  px: 2.2,
                  py: 1.1,
                  boxShadow: '0 8px 18px rgba(0,0,0,0.16)',
                  '&:hover': {
                    bgcolor: '#F0C75E',
                  },
                }}
              >
                Browse More Jobs
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Grid container spacing={1.2} sx={{ mb: 2 }}>
          {[
            { label: 'Total Saved', value: stats.total, color: '#0B2745' },
            { label: 'Remote Roles', value: stats.remote, color: '#0284C7' },
            { label: 'With Company', value: stats.withCompany, color: '#2563EB' },
            { label: 'With Location', value: stats.withLocation, color: '#0EA5A0' },
          ].map((item, index) => (
            <Grid item xs={6} md={3} key={item.label}>
              <Box sx={{ minHeight: 92, px: 1.6, py: 1.35, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid', borderColor: isDarkMode ? 'rgba(148,163,184,0.24)' : '#DCE6F2', borderRadius: 2.5, bgcolor: isDarkMode ? '#0F172A' : '#fff', boxShadow: '0 8px 20px rgba(15,35,63,0.045)', borderTop: `3px solid ${index === 0 ? '#0B2745' : item.color}`, transition: 'transform 0.18s ease, box-shadow 0.18s ease', '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 14px 26px rgba(15,35,63,0.1)' } }}>
                <Typography variant="caption" sx={{ color: isDarkMode ? '#CBD5E1' : '#64748B', fontWeight: 800, lineHeight: 1.25 }}>{item.label}</Typography>
                <Typography sx={{ mt: 0.6, fontWeight: 900, color: isDarkMode ? '#F8FAFC' : item.color, fontSize: 26, lineHeight: 1 }}>{item.value}</Typography>
              </Box>
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
                      borderRadius: 3,
                      border: isDarkMode ? '1px solid rgba(148,163,184,0.24)' : '1px solid #DCE6F2',
                      background: isDarkMode ? 'linear-gradient(160deg, rgba(15,23,42,0.97), rgba(30,41,59,0.92))' : '#FFFFFF',
                      boxShadow: isDarkMode ? '0 10px 24px rgba(2,6,23,0.34)' : '0 10px 24px rgba(15,35,63,0.07)',
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
                      '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 16px 30px rgba(15,35,63,0.12)' },
                      transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                    }}
                  >
                    <CardContent sx={{ pl: 2.4, p: 2.4 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.1, mb: 1.1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.25, color: isDarkMode ? '#F8FAFC' : '#0B2745' }}>
                          {item.jobs?.title || 'Role unavailable'}
                        </Typography>
                        <Chip label="Saved" size="small" sx={{ fontWeight: 800, bgcolor: '#FFF4D6', color: '#9A7017', borderRadius: 1.2 }} />
                      </Box>

                      <Typography variant="body2" sx={{ fontWeight: 700, color: isDarkMode ? '#CBD5E1' : '#334155', mb: 0.4 }}>
                        {item.jobs?.company_name || 'Company unavailable'}
                      </Typography>

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mt: 1.2, mb: 1.4 }}>
                        <Chip size="small" variant="outlined" label={item.jobs?.location || 'Location not specified'} sx={{ fontWeight: 700, borderColor: '#C9D8E6', color: '#526B82' }} />
                        <Chip size="small" variant="outlined" label={item.created_at ? `Saved ${formatDate(item.created_at)}` : 'Saved recently'} sx={{ fontWeight: 700, borderColor: '#C9D8E6', color: '#526B82' }} />
                        {isRemote ? <Chip size="small" label="Remote" sx={{ fontWeight: 800, bgcolor: '#E0F2FE', color: '#075985' }} /> : null}
                      </Box>

                      {item.jobs?.id ? (
                        <Button component={RouterLink} to={ROUTES.JOB_DETAILS.replace(':id', item.jobs.id)} fullWidth variant="contained" sx={{ fontWeight: 800, borderRadius: 2, bgcolor: '#0B2745', '&:hover': { bgcolor: '#123B5D' } }}>
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
