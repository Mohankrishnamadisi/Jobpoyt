import React, { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  AutoAwesome as AutoAwesomeIcon,
  BusinessCenterOutlined as BusinessCenterIcon,
  LocationOnOutlined as LocationIcon,
  OpenInNew as OpenInNewIcon,
  WorkOutline as WorkIcon,
} from '@mui/icons-material';
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
  const location = useLocation();
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
  const profileSummary = `${currentDesignation}${preferredTitles.length ? ` · Preferred: ${preferredTitles.slice(0, 3).join(', ')}` : ''}`;

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
      experience: profile.experience || formatExperienceString(profile.experience_years, profile.experience_months),
      total_experience_months: profile.total_experience_months ?? getTotalExperienceMonths(profile.experience_years, profile.experience_months),
    };
    return Math.round(calculateMatchScore(candidate, job).score);
  };

  const recommendedJobs = jobs
    .map((job) => ({ job, matchPercentage: calculateMatchPercentage(job) }))
    .filter(({ matchPercentage }) => matchPercentage >= minMatch && matchPercentage <= 100)
    .sort((first, second) => second.matchPercentage - first.matchPercentage);

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
      <Container maxWidth="xl" sx={{ py: { xs: 2.5, md: 4 }, px: { xs: 1.5, sm: 3 } }}>
        <Box sx={{ mb: { xs: 3, md: 4 }, p: { xs: 2, sm: 3, md: 3.5 }, borderRadius: 3, background: 'linear-gradient(110deg, #102A43 0%, #174A68 58%, #1D6B73 100%)', color: '#fff', boxShadow: '0 18px 38px rgba(16, 42, 67, 0.16)' }}>
          <Button
            variant="text"
            onClick={() => navigate(-1)}
            startIcon={<ArrowBackIcon />}
            sx={{ mb: 2, ml: -0.8, color: 'rgba(255,255,255,0.82)', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
          >
            Back
          </Button>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2}>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" alignItems="center" gap={0.8} sx={{ mb: 0.8 }}>
                <AutoAwesomeIcon sx={{ color: '#9DE3D2', fontSize: 19 }} />
                <Typography sx={{ color: '#9DE3D2', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>Matched to your profile</Typography>
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 850, lineHeight: 1.15, fontSize: { xs: 25, sm: 30, md: 34 } }}>Recommended Jobs for You</Typography>
              <Typography sx={{ mt: 0.8, color: 'rgba(255,255,255,0.78)', fontSize: { xs: 14, sm: 15 } }}>
                {recommendedJobs.length} {recommendedJobs.length === 1 ? 'role fits' : 'roles fit'} your skills and career preferences.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.16)', flexShrink: 0 }}>
              <BusinessCenterIcon sx={{ color: '#9DE3D2' }} />
              <Box>
                <Typography sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>{recommendedJobs.length}</Typography>
                <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.72)' }}>Recommended</Typography>
              </Box>
            </Box>
          </Stack>
          <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid rgba(255,255,255,0.18)' }}>
            <Typography sx={{ mb: 0.8, fontSize: 12, fontWeight: 750, color: 'rgba(255,255,255,0.82)' }}>{profileSummary}</Typography>
            {userSkills.length ? (
              <Stack direction="row" flexWrap="wrap" gap={0.65}>
                {userSkills.slice(0, 8).map((skill) => <Chip key={skill} size="small" label={skill} sx={{ height: 25, color: '#E6FFFA', bgcolor: 'rgba(157,227,210,0.13)', border: '1px solid rgba(157,227,210,0.3)', fontWeight: 600 }} />)}
                {userSkills.length > 8 ? <Chip size="small" label={`+${userSkills.length - 8}`} sx={{ height: 25, color: '#E6FFFA', bgcolor: 'rgba(255,255,255,0.1)' }} /> : null}
              </Stack>
            ) : <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: 13 }}>Add skills to your profile for more precise recommendations.</Typography>}
          </Box>
        </Box>

        {recommendedJobs.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            {jobs.length === 0 ? 'No recommended jobs found. Try adding more skills to your profile.' : 'No jobs meet this match threshold. Try viewing more recommendations.'}
          </Alert>
        ) : (
          <Grid container spacing={{ xs: 1.5, md: 2 }}>
            {recommendedJobs.map(({ job, matchPercentage }) => {
              const companyName = String(job.company_name || 'Company not listed');
              const companyLogo = job.company_logo_url || job.company_logo || job.companyLogoUrl || job.companyLogo || job.logo_url || undefined;
              const requiredSkills: string[] = Array.isArray(job.skills)
                ? job.skills.filter(Boolean).map(String)
                : typeof job.skills === 'string'
                  ? job.skills.split(/[,|;]/).map((skill: string) => skill.trim()).filter(Boolean)
                  : [];
              const matchTone = matchPercentage >= 80 ? '#087E65' : matchPercentage >= 60 ? '#A15C00' : '#526477';
              const jobLocation = job.location || 'Location not specified';
              const workMode = job.work_mode || job.workMode || job.job_type || job.jobType;

              return (
                <Grid item xs={12} md={6} key={job.id}>
                  <Box sx={{ height: '100%', minHeight: 280, p: { xs: 1.8, sm: 2.2 }, display: 'flex', flexDirection: 'column', border: '1px solid #DCE5EB', borderRadius: 2.5, bgcolor: '#FFFFFF', boxShadow: '0 4px 15px rgba(19, 42, 61, 0.045)', transition: 'border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease', '&:hover': { borderColor: '#9CC8C1', boxShadow: '0 14px 28px rgba(19, 42, 61, 0.1)', transform: 'translateY(-2px)' } }}>
                    <Stack direction="row" alignItems="flex-start" gap={1.5}>
                      <Avatar src={companyLogo} alt={`${companyName} logo`} variant="rounded" sx={{ width: 58, height: 58, border: '1px solid #E2E8F0', borderRadius: 1.5, bgcolor: '#EAF4F2', color: '#176B63', fontSize: 20, fontWeight: 800, flexShrink: 0, '& img': { objectFit: 'contain', p: 0.4, bgcolor: '#fff' } }}>
                        {companyName.slice(0, 1).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ color: '#122B3A', fontSize: { xs: 16, sm: 17 }, fontWeight: 800, lineHeight: 1.35, overflowWrap: 'anywhere' }}>{job.title || 'Untitled role'}</Typography>
                        <Typography sx={{ mt: 0.35, color: '#617484', fontSize: 13, fontWeight: 650 }}>{companyName}</Typography>
                      </Box>
                      <Box sx={{ px: 1, py: 0.65, borderRadius: 1, bgcolor: '#EFF7F5', color: matchTone, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}>{matchPercentage}% match</Box>
                    </Stack>

                    <Stack direction="row" flexWrap="wrap" gap={1.2} sx={{ mt: 2.2, color: '#5A7080' }}>
                      <Stack direction="row" alignItems="center" gap={0.55}>
                        <LocationIcon sx={{ fontSize: 17, color: '#2D7A75' }} />
                        <Typography sx={{ fontSize: 12.5, lineHeight: 1.4 }}>{jobLocation}</Typography>
                      </Stack>
                      {workMode ? <Stack direction="row" alignItems="center" gap={0.55}><WorkIcon sx={{ fontSize: 16, color: '#2D7A75' }} /><Typography sx={{ fontSize: 12.5, lineHeight: 1.4 }}>{workMode}</Typography></Stack> : null}
                    </Stack>

                    <Box sx={{ mt: 2, flex: 1 }}>
                      <Typography sx={{ mb: 0.8, color: '#304A5B', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>Skills for this role</Typography>
                      {requiredSkills.length ? (
                        <Stack direction="row" flexWrap="wrap" gap={0.6}>
                          {requiredSkills.slice(0, 5).map((skill: string) => {
                            const isMatched = userSkills.some((profileSkill) => String(profileSkill).toLowerCase() === skill.toLowerCase());
                            return <Chip key={skill} label={skill} size="small" sx={{ height: 25, bgcolor: isMatched ? '#E5F4EF' : '#F2F5F7', color: isMatched ? '#176B55' : '#526477', border: `1px solid ${isMatched ? '#B9DFD1' : '#E2E8EC'}`, fontSize: 11, fontWeight: 650 }} />;
                          })}
                          {requiredSkills.length > 5 ? <Chip size="small" label={`+${requiredSkills.length - 5}`} sx={{ height: 25, bgcolor: '#F2F5F7', color: '#526477', fontSize: 11 }} /> : null}
                        </Stack>
                      ) : <Typography sx={{ color: '#7A8B97', fontSize: 12.5 }}>Skills not listed</Typography>}
                    </Box>

                    <Button variant="contained" fullWidth endIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />} onClick={() => handleOpenJobDetails(String(job.id))} sx={{ mt: 2.2, minHeight: 42, borderRadius: 1.25, bgcolor: '#176B63', color: '#fff', fontWeight: 750, textTransform: 'none', boxShadow: 'none', '&:hover': { bgcolor: '#11564F', boxShadow: 'none' } }}>
                      View job details
                    </Button>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>
    </Layout>
  );
};

export default RecommendedJobs;
