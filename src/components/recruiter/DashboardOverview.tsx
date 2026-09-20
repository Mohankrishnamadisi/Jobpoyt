import React from 'react';
import { Box, Grid, Card, CardContent, Typography, Button, LinearProgress } from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Bolt as LightningIcon,
  ArrowForward as ArrowForwardIcon,
  WorkOutline as WorkOutlineIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { themeColors } from '@styles/recruiterTheme';

interface DashboardOverviewProps {
  activeJobs?: number;
  totalApplicants?: number;
  shortlisted?: number;
  rejected?: number;
  priorityCandidates?: number;
  onViewJobs?: () => void;
  onViewApplicants?: () => void;
  onPostJob?: () => void;
  profileCompletion?: number;
  profileComplete?: boolean;
  onEditProfile?: () => void;
}

const MotionCard = motion(Card);

const ProfileCompletionCard: React.FC<{
  completion: number;
  onEditProfile?: () => void;
}> = ({ completion, onEditProfile }) => (
  <Card
    sx={{
      borderRadius: '18px',
      border: '1px solid rgba(37,99,235,0.18)',
      background: 'linear-gradient(135deg, #FFFFFF 0%, #EFF6FF 100%)',
      boxShadow: '0 14px 30px rgba(37,99,235,0.08)',
    }}
  >
    <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', minWidth: 0 }}>
          <Box sx={{ width: 42, height: 42, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: '#2563EB', background: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)', flexShrink: 0 }}>
            <SearchIcon />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, color: themeColors.text.primary, fontSize: '1rem' }}>
              Complete your recruiter profile
            </Typography>
            <Typography sx={{ mt: 0.35, color: themeColors.text.secondary, fontSize: '0.8rem' }}>
              Add your company and HR details to unlock jobs, applicants, and candidate tools.
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" onClick={onEditProfile} sx={{ borderRadius: 2.5, px: 2.2, fontWeight: 800, textTransform: 'none', background: 'linear-gradient(135deg, #2563EB, #4F46E5)', boxShadow: '0 8px 18px rgba(37,99,235,0.22)' }}>
          Edit Profile
        </Button>
      </Box>
      <Box sx={{ mt: 2.1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.7 }}>
          <Typography sx={{ color: themeColors.text.secondary, fontSize: '0.75rem', fontWeight: 700 }}>Profile completion</Typography>
          <Typography sx={{ color: '#2563EB', fontSize: '0.82rem', fontWeight: 900 }}>{completion}%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={completion} sx={{ height: 9, borderRadius: 99, backgroundColor: '#DBEAFE', '& .MuiLinearProgress-bar': { borderRadius: 99, background: 'linear-gradient(90deg, #2563EB, #7C3AED)' } }} />
      </Box>
    </CardContent>
  </Card>
);

const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  trend?: string;
  onClick?: () => void;
  index?: number;
}> = ({ title, value, icon, color, trend, onClick, index = 0 }) => (
  <MotionCard
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay: index * 0.08 }}
    whileHover={{ y: -8, scale: 1.02, boxShadow: '0 22px 44px rgba(27, 52, 102, 0.16)' }}
    onClick={onClick}
    sx={{
      cursor: onClick ? 'pointer' : 'default',
      borderRadius: '16px',
      border: `1px solid rgba(148, 163, 184, 0.22)`,
      background: '#FFFFFF',
      minHeight: 148,
      display: 'flex',
      transition: 'all 0.25s ease-in-out',
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(135deg, ${color}0D 0%, transparent 62%)`,
      },
      '&:hover': {
        borderColor: `${color}88`,
      },
    }}
  >
    <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, position: 'relative', zIndex: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Box>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.67rem',
              fontWeight: 800,
              color: themeColors.text.secondary,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              mb: 0.75,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="h3"
            sx={{
              fontSize: '1.7rem',
              fontWeight: 800,
              color: themeColors.text.primary,
              lineHeight: 1,
            }}
          >
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${color}20 0%, ${color}48 100%)`,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 12px 24px ${color}26`,
          }}
        >
          {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: '1.25rem' } })}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1 }}>
        <Typography variant="body2" sx={{ color: themeColors.text.tertiary, fontSize: '0.85rem' }}>
          Updated just now
        </Typography>
        {trend ? (
          <Typography variant="caption" sx={{ color, fontWeight: 800, textTransform: 'uppercase' }}>
            {trend}
          </Typography>
        ) : null}
      </Box>
    </CardContent>
  </MotionCard>
);

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  activeJobs = 0,
  totalApplicants = 0,
  shortlisted = 0,
  rejected = 0,
  priorityCandidates = 0,
  onViewJobs,
  onViewApplicants,
  onPostJob,
  profileCompletion = 0,
  profileComplete = false,
  onEditProfile,
}) => {
  if (!profileComplete) {
    return (
      <Box sx={{ mb: 3 }}>
        <ProfileCompletionCard completion={profileCompletion} onEditProfile={onEditProfile} />
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Card
        sx={{
          mb: 2.25,
          overflow: 'hidden',
          border: 'none',
          borderRadius: '18px',
          color: '#FFFFFF',
          background: 'linear-gradient(115deg, #091324 0%, #12294D 55%, #24518B 100%)',
          position: 'relative',
          boxShadow: '0 18px 34px rgba(9, 19, 36, 0.2)',
        }}
      >
        <Box sx={{ position: 'absolute', width: 250, height: 250, right: -70, top: -100, borderRadius: '50%', border: '1px solid rgba(125,211,252,0.22)', boxShadow: '0 0 0 24px rgba(125,211,252,0.04), 0 0 0 48px rgba(125,211,252,0.025)' }} />
        <CardContent sx={{ p: { xs: 2.2, md: 2.8 }, position: 'relative' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography sx={{ color: '#7DD3FC', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', mb: 0.7 }}>
                Recruiter workspace
              </Typography>
              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: { xs: '1.35rem', md: '1.6rem' }, mb: 0.6 }}>
                Your hiring, at a glance.
              </Typography>
              <Typography sx={{ color: 'rgba(226,232,240,0.76)', fontSize: '0.8rem', maxWidth: 500 }}>
                Track momentum, spot priority candidates, and move your strongest applicants forward.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button disabled={!onViewJobs} onClick={onViewJobs} variant="outlined" endIcon={<ArrowForwardIcon />} sx={{ color: '#E0F2FE', borderColor: 'rgba(186,230,253,0.45)', backgroundColor: 'rgba(255,255,255,0.06)', '&:hover': { borderColor: '#7DD3FC', backgroundColor: 'rgba(125,211,252,0.12)' } }}>
                View workspace
              </Button>
              <Button disabled={!onPostJob} onClick={onPostJob} variant="contained" startIcon={<WorkOutlineIcon />} sx={{ background: '#7DD3FC', color: '#091324', '&:hover': { background: '#BAE6FD' } }}>
                Post a job
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: themeColors.text.primary, fontSize: '1.05rem' }}>Hiring pulse</Typography>
          <Typography variant="body2" sx={{ color: themeColors.text.secondary, fontSize: '0.76rem' }}>Live signals from your recruitment pipeline</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, color: themeColors.success, fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase' }}>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: themeColors.success, boxShadow: `0 0 0 4px ${themeColors.success}22` }} /> Live
        </Box>
      </Box>

      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Active Jobs"
            value={activeJobs}
            icon={<LightningIcon sx={{ fontSize: '1.5rem' }} />}
            color={themeColors.primary}
            onClick={onViewJobs}
            index={0}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Applicants"
            value={totalApplicants}
            icon={<PeopleIcon sx={{ fontSize: '1.5rem' }} />}
            color="#7C3AED"
            onClick={onViewApplicants}
            index={1}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Shortlisted"
            value={shortlisted}
            icon={<CheckCircleIcon sx={{ fontSize: '1.5rem' }} />}
            color={themeColors.success}
            trend={`${totalApplicants > 0 ? ((shortlisted / totalApplicants) * 100).toFixed(1) : 0}% conversion`}
            index={2}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Rejected"
            value={rejected}
            icon={<CancelIcon sx={{ fontSize: '1.5rem' }} />}
            color={themeColors.danger}
            index={3}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Priority Candidates"
            value={priorityCandidates}
            icon={<TrendingUpIcon sx={{ fontSize: '1.5rem' }} />}
            color={themeColors.warning}
            index={4}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <motion.div
            whileHover={{ y: -5 }}
            transition={{ duration: 0.2 }}
            style={{ height: '100%' }}
          >
            <Card
              sx={{
                borderRadius: '16px',
                border: `1px dashed ${themeColors.borderDark}`,
                background: 'linear-gradient(135deg, #F0F7FF 0%, #F7FBFF 100%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '148px',
                p: 1.5,
                boxShadow: '0 10px 22px rgba(37,99,235,0.07)',
              }}
            >
              <CardContent sx={{ textAlign: 'center', p: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: themeColors.text.secondary,
                    mb: 1.2,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  Need more applicants?
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  onClick={onViewApplicants}
                  sx={{
                    background: 'linear-gradient(135deg, #0B1325 0%, #28508A 100%)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    px: 1.8,
                    boxShadow: '0 10px 20px rgba(11,19,37,0.18)',
                  }}
                >
                  Explore candidates
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
    </Box>
  );
};
