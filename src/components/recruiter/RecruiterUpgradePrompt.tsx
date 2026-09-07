import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Chip,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { subscriptionService } from '@services/api';
import { billingSubscriptionService } from '@services/billingSubscription';
import type { RecruiterPlanDuration } from '@services/billingSubscription';

type UpgradeReason = 'job_limit_reached' | 'resume_unlock_limit_reached' | 'team_limit_reached' | 'general';

interface RecruiterUpgradePromptProps {
  open: boolean;
  onClose: () => void;
  recruiterId: string;
  reason?: UpgradeReason;
}

const MotionCard = motion(Card);
const MotionBox = motion(Box);

const UPGRADE_MESSAGES: Record<UpgradeReason, { title: string; description: string }> = {
  job_limit_reached: {
    title: '🎯 You\'ve Used All 15 Free Job Posts',
    description: 'Your complimentary recruiter job posting allowance has been fully used. Continue hiring without limits with Jobpoyt Recruiter Pro.',
  },
  resume_unlock_limit_reached: {
    title: '📄 You\'ve Used All 150 Free Resume Unlocks',
    description: 'Your complimentary resume unlock allowance has been fully used. Unlock unlimited resumes with Jobpoyt Recruiter Pro.',
  },
  team_limit_reached: {
    title: '👥 Team Member Limit Reached',
    description: 'You\'ve reached the team member limit on your current plan. Upgrade to Jobpoyt Recruiter Pro for unlimited team collaboration.',
  },
  general: {
    title: 'Upgrade to Jobpoyt Recruiter Pro',
    description: 'Unlock unlimited hiring capabilities with Jobpoyt Recruiter Pro.',
  },
};

const PRO_FEATURES = [
  { category: 'HIRING', features: ['Unlimited Job Posts', 'Unlimited Active Jobs', 'Unlimited Candidate Search', 'Priority Job Placement'] },
  { category: 'CANDIDATE ACCESS', features: ['Unlimited Resume Access', 'Unlimited Resume Unlocks', 'Unlimited Talent Pool', 'Candidate Tags & Notes'] },
  { category: 'AI & ANALYTICS', features: ['AI Recommended Candidates', 'AI Candidate Matching', 'AI Hiring Assistant', 'Hiring Analytics & Reports'] },
  { category: 'WORKFLOW', features: ['Unlimited Messaging', 'Interview Management', 'ATS Pipeline', 'Priority Support'] },
];

const PRICING_DATA = [
  { duration: 1 as RecruiterPlanDuration, price: 999, teamLimit: 10, savings: null },
  { duration: 3 as RecruiterPlanDuration, price: 2499, teamLimit: 10, savings: 498 },
  { duration: 6 as RecruiterPlanDuration, price: 4499, teamLimit: 10, savings: 1495 },
  { duration: 12 as RecruiterPlanDuration, price: 7999, teamLimit: 15, savings: 3989, isBestValue: true },
];

export const RecruiterUpgradePrompt: React.FC<RecruiterUpgradePromptProps> = ({
  open,
  onClose,
  recruiterId,
  reason = 'general',
}) => {
  const [selectedDuration, setSelectedDuration] = useState<RecruiterPlanDuration>(3);
  const [loadingDuration, setLoadingDuration] = useState<RecruiterPlanDuration | null>(null);

  const message = UPGRADE_MESSAGES[reason];

  const handleSelectPlan = async (duration: RecruiterPlanDuration) => {
    if (!recruiterId) {
      toast.error('Please sign in to upgrade.');
      return;
    }

    try {
      setLoadingDuration(duration);
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + duration);

      await subscriptionService.createSubscription(
        recruiterId,
        'Jobpoyt_recruiter_pro',
        expiryDate.toISOString(),
        billingSubscriptionService.getRecruiterPlanPricing(duration).price,
        `razorpay_placeholder_${Date.now()}`
      );

      toast.success('Jobpoyt Recruiter Pro activated! Start hiring unlimited.');
      onClose();
    } catch (error) {
      console.error('Upgrade failed:', error);
      toast.error('Failed to activate plan. Please try again.');
    } finally {
      setLoadingDuration(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          boxShadow: '0 40px 80px rgba(15, 23, 42, 0.20)',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ position: 'relative' }}>
          {/* Close Button */}
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 16,
              top: 16,
              zIndex: 10,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
            }}
          >
            <CloseIcon />
          </IconButton>

          {/* Hero Section */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
              p: 4,
              textAlign: 'center',
              borderBottom: '1px solid rgba(226, 232, 240, 0.5)',
            }}
          >
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 900,
                  mb: 1,
                  color: '#1F2937',
                }}
              >
                {message.title}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: '#6B7280',
                  maxWidth: 500,
                  mx: 'auto',
                }}
              >
                {message.description}
              </Typography>
            </MotionBox>
          </Box>

          {/* Pricing Cards */}
          <Box sx={{ p: 4 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                mb: 3,
                color: '#374151',
                textAlign: 'center',
              }}
            >
              Choose your billing duration
            </Typography>

            <Grid container spacing={2} sx={{ mb: 4 }}>
              {PRICING_DATA.map((pricing, idx) => (
                <Grid item xs={12} sm={6} md={3} key={pricing.duration}>
                  <MotionCard
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                    onClick={() => setSelectedDuration(pricing.duration)}
                    whileHover={{ y: -4 }}
                    sx={{
                      height: '100%',
                      cursor: 'pointer',
                      position: 'relative',
                      border: selectedDuration === pricing.duration ? '2px solid #2563EB' : '1px solid #E5E7EB',
                      background:
                        selectedDuration === pricing.duration
                          ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)'
                          : pricing.isBestValue
                            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)'
                            : '#FFFFFF',
                      transition: 'all 0.3s ease-in-out',
                      '&:hover': {
                        boxShadow: '0 12px 24px rgba(37, 99, 235, 0.12)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2, pb: 2 }}>
                      {pricing.isBestValue && (
                        <Chip
                          label="BEST VALUE"
                          size="small"
                          sx={{
                            mb: 1,
                            backgroundColor: '#10B981',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.65rem',
                          }}
                        />
                      )}

                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                        ₹{pricing.price.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', mb: 1 }}>
                        {pricing.duration} month{pricing.duration > 1 ? 's' : ''}
                      </Typography>

                      {pricing.savings && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#10B981',
                            fontWeight: 700,
                            display: 'block',
                            mb: 1,
                          }}
                        >
                          Save ₹{pricing.savings.toLocaleString()}
                        </Typography>
                      )}

                      <Box sx={{ mb: 1.5 }}>
                        <Typography variant="caption" sx={{ color: '#6B7280' }}>
                          ₹{Math.round(pricing.price / pricing.duration)}/month
                        </Typography>
                      </Box>

                      <Typography variant="caption" sx={{ color: '#4B5563', display: 'block', fontWeight: 600 }}>
                        {pricing.teamLimit} Team Members
                      </Typography>

                      <Button
                        fullWidth
                        variant={selectedDuration === pricing.duration ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => handleSelectPlan(pricing.duration)}
                        disabled={loadingDuration === pricing.duration}
                        sx={{ mt: 1.5, fontWeight: 700 }}
                      >
                        {loadingDuration === pricing.duration ? 'Processing...' : 'Choose'}
                      </Button>
                    </CardContent>
                  </MotionCard>
                </Grid>
              ))}
            </Grid>

            {/* Features Grid */}
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  color: '#374151',
                  textAlign: 'center',
                }}
              >
                Everything included in Recruiter Pro
              </Typography>

              <Grid container spacing={2}>
                {PRO_FEATURES.map((featureGroup) => (
                  <Grid item xs={12} sm={6} md={3} key={featureGroup.category}>
                    <Card sx={{ borderRadius: 2, border: '1px solid #E5E7EB', height: '100%' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 800,
                            color: '#2563EB',
                            letterSpacing: 0.5,
                            display: 'block',
                            mb: 1,
                          }}
                        >
                          {featureGroup.category}
                        </Typography>
                        <Stack spacing={0.8}>
                          {featureGroup.features.map((feature) => (
                            <Box key={feature} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                              <CheckCircleIcon
                                sx={{
                                  fontSize: 16,
                                  color: '#10B981',
                                  mt: 0.3,
                                  flexShrink: 0,
                                }}
                              />
                              <Typography variant="caption" sx={{ color: '#4B5563' }}>
                                {feature}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Action Buttons */}
            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 4 }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => handleSelectPlan(selectedDuration)}
                disabled={loadingDuration !== null}
                sx={{
                  background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
                  fontWeight: 700,
                  px: 4,
                }}
              >
                {loadingDuration ? 'Processing...' : 'Upgrade Now'}
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={onClose}
                sx={{ fontWeight: 700 }}
              >
                Maybe Later
              </Button>
            </Stack>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
