import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Divider,
  Alert,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '@components/layout/Layout';
import { useAuthStore } from '@store/index';
import { userService, jobService } from '@services/api';
import { ROUTES } from '@constants/index';
import { calculateMatchScore } from '@utils/matchScore';
import { formatExperienceString, getTotalExperienceMonths } from '@utils/experience';

const getJobList = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

export const RecommendedJobs: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [profile, setProfile] = useState<any>(null);

  const handleOpenJobDetails = (jobId: string) => {
    const url = `${window.location.origin}${ROUTES.JOB_DETAILS.replace(':id', jobId)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const preferredTitles = Array.isArray(profile?.preferred_job_titles || profile?.preferredJobTitles)
    ? (profile?.preferred_job_titles || profile?.preferredJobTitles || []).filter(Boolean)
    : [];
  const currentDesignation = profile?.current_designation || profile?.currentDesignation || 'Career professional';
  const profileSummary = `${currentDesignation}${preferredTitles.length ? ` • Preferred: ${preferredTitles.slice(0, 3).join(', ')}` : ''}`;

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const profileData = await userService.getProfile(user.id);
        setProfile(profileData);

        const skills: string[] = profileData?.skills || [];
        setUserSkills(skills);

        const preferredTitles: string[] = profileData?.preferred_job_titles || profileData?.preferredJobTitles || [];
        const currentDesignation: string = profileData?.current_designation || profileData?.currentDesignation || '';
        const searchTerms = [...preferredTitles, currentDesignation]
          .filter(Boolean)
          .map((term) => String(term).trim())
          .filter(Boolean)
          .slice(0, 5);

        const jobsBySkills = skills.length > 0
          ? getJobList(await jobService.getJobsBySkills(skills, 1, 100))
          : [];

        const titleSearchResponses = await Promise.all(
          searchTerms.map((term) => jobService.getJobs({ keyword: term }, 1, 50).catch(() => ({ data: [] })))
        );
        const jobsByTitles = titleSearchResponses.flatMap(getJobList);

        const combinedJobs = [...jobsBySkills, ...jobsByTitles];
        const uniqueJobs = Array.from(new Map(combinedJobs.map((job) => [job.id, job])).values());

        if (uniqueJobs.length === 0 && !skills.length && !searchTerms.length) {
          const allJobsResponse = await jobService.getJobs({}, 1, 50);
          setJobs(getJobList(allJobsResponse));
        } else {
          setJobs(uniqueJobs);
        }
      } catch (error) {
        console.error('Error fetching recommended jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // optional minMatch query param to filter results (50-100 by default if provided)
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  const minMatch = Math.max(0, parseInt(search.get('minMatch') || '0', 10) || 0);

  const calculateMatchPercentage = (job: any) => {
    if (!profile) return 0;

    const candidate = {
      ...profile,
      preferred_job_titles: profile.preferred_job_titles || profile.preferredJobTitles || [],
      preferredJobTitles: profile.preferred_job_titles || profile.preferredJobTitles || [],
      current_designation: profile.current_designation || profile.currentDesignation || '',
      currentDesignation: profile.current_designation || profile.currentDesignation || '',
      experience:
        profile.experience ||
        formatExperienceString(profile.experience_years, profile.experience_months),
      total_experience_months:
        profile.total_experience_months ?? getTotalExperienceMonths(profile.experience_years, profile.experience_months),
    };

    const score = calculateMatchScore(candidate, job).score;
    return Math.round(score);
  };

  if (loading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress />
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Button
            variant="outlined"
            onClick={() => navigate(-1)}
            sx={{ mb: 2, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            ← Back
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            Recommended Jobs for You
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1 }}>
            {jobs.length} jobs match your skills, designation, and preferred job roles.
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {userSkills.length ? `Skills: ${userSkills.slice(0, 6).join(', ')}` : 'Add skills to your profile for better matching.'}
            {profileSummary ? ` • ${profileSummary}` : ''}
          </Typography>
        </Box>

        {jobs.length === 0 ? (
          <Alert severity="info">
            No recommended jobs found. Try adding more skills to your profile.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {jobs
              .map((job) => ({ job, matchPercentage: calculateMatchPercentage(job) }))
              .filter(({ matchPercentage }) => matchPercentage >= minMatch && matchPercentage <= 100)
              .sort((a, b) => b.matchPercentage - a.matchPercentage)
              .map(({ job, matchPercentage }) => (
                <Grid item xs={12} md={6} key={job.id}>
                  <Paper
                    sx={{
                      p: 3,
                      background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(220,184,105,0.1) 100%)',
                      border: '1px solid rgba(255,215,0,0.3)',
                      borderRadius: 2,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 8px 24px rgba(255,215,0,0.15)',
                        transform: 'translateY(-4px)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {job.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {job.company_name}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${matchPercentage}% Match`}
                        color={matchPercentage >= 70 ? 'success' : matchPercentage >= 50 ? 'warning' : 'default'}
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>

                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                      {job.location} • {job.work_mode || job.workMode}
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                        Required Skills:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {(job.skills || []).map((skill: string) => (
                          <Chip
                            key={skill}
                            label={skill}
                            size="small"
                            variant={
                              userSkills.some((s) => String(s).toLowerCase() === String(skill).toLowerCase())
                                ? 'filled'
                                : 'outlined'
                            }
                            color={
                              userSkills.some((s) => String(s).toLowerCase() === String(skill).toLowerCase())
                                ? 'success'
                                : 'default'
                            }
                          />
                        ))}
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => handleOpenJobDetails(job.id)}
                      sx={{
                        background: 'linear-gradient(135deg, #FFD700 0%, #DAA520 100%)',
                        color: '#000',
                        fontWeight: 700,
                      }}
                    >
                      View Job Details
                    </Button>
                  </Paper>
                </Grid>
              ))}
          </Grid>
        )}
      </Container>
    </Layout>
  );
};

export default RecommendedJobs;
