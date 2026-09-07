import React from 'react';
import { Box, Container, Card, CardContent, Typography, Button, Grid } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp as TrendingIcon,
  Work as WorkIcon,
  PriceCheck as PriceIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { MobileLayout } from '@components/layout/MobileLayout';
import { ROUTES } from '@constants/index';
import { useAuthStore } from '@store/index';

const MotionCard = motion(Card);

interface FeatureProps {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureProps> = ({ icon: Icon, title, description }) => (
  <Card sx={{ mb: 2 }}>
    <CardContent sx={{ p: 2, textAlign: 'center' }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 1.5,
        }}
      >
        <Icon sx={{ color: '#fff', fontSize: 28 }} />
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {description}
      </Typography>
    </CardContent>
  </Card>
);

export const MobileHome: React.FC = () => {
  const { user } = useAuthStore();

  const features = [
    {
      icon: WorkIcon,
      title: 'Find Your Dream Job',
      description: 'Browse thousands of job opportunities from top companies worldwide',
    },
    {
      icon: PriceIcon,
      title: 'Competitive Salaries',
      description: 'Discover jobs with competitive compensation and benefits packages',
    },
    {
      icon: SchoolIcon,
      title: 'Premium Features',
      description: 'Get exclusive tools to boost your job search success',
    },
  ];

  return (
    <MobileLayout footer={true}>
      <Container maxWidth="sm" sx={{ py: 2 }}>
        {/* Hero Section */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              mb: 1,
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Find Your Perfect Job
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Connect with top employers and launch your career
          </Typography>

          {user ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                component={RouterLink}
                to={ROUTES.JOBS}
                variant="contained"
                fullWidth
                sx={{ py: 1.5, textTransform: 'none', fontSize: '1rem' }}
              >
                Browse Jobs
              </Button>
              <Button
                component={RouterLink}
                to={ROUTES.DASHBOARD}
                variant="outlined"
                fullWidth
                sx={{ py: 1.5, textTransform: 'none', fontSize: '1rem' }}
              >
                Go to Dashboard
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                component={RouterLink}
                to={ROUTES.JOBS}
                variant="contained"
                fullWidth
                sx={{ py: 1.5, textTransform: 'none', fontSize: '1rem' }}
              >
                Start Browsing
              </Button>
              <Button
                component={RouterLink}
                to={ROUTES.SIGNUP}
                variant="outlined"
                fullWidth
                sx={{ py: 1.5, textTransform: 'none', fontSize: '1rem' }}
              >
                Create Account
              </Button>
            </Box>
          )}
        </Box>

        {/* Features Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, textAlign: 'center' }}>
            Why Choose Jobpoyt?
          </Typography>
          {features.map((feature, index) => (
            <MotionCard
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <FeatureCard {...feature} />
            </MotionCard>
          ))}
        </Box>

        {/* Stats Section */}
        <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', color: '#fff' }}>
          <CardContent sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    10K+
                  </Typography>
                  <Typography variant="caption">Jobs</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    5K+
                  </Typography>
                  <Typography variant="caption">Companies</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    100K+
                  </Typography>
                  <Typography variant="caption">Users</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card sx={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <CardContent sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
              Ready to Get Started?
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2, display: 'block' }}>
              Join thousands of job seekers and find your next opportunity today
            </Typography>
            {user ? (
              <Button
                component={RouterLink}
                to={ROUTES.JOBS}
                variant="contained"
                fullWidth
                size="small"
              >
                Browse Jobs
              </Button>
            ) : (
              <Button
                component={RouterLink}
                to={ROUTES.SIGNUP}
                variant="contained"
                fullWidth
                size="small"
              >
                Sign Up Now
              </Button>
            )}
          </CardContent>
        </Card>
      </Container>
    </MobileLayout>
  );
};
