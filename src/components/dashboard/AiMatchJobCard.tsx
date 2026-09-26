import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  AutoAwesome as AiIcon,
  BookmarkAdd as SaveIcon,
  OpenInNew as OpenIcon,
  RocketLaunch as ApplyIcon,
  Psychology as ImproveIcon,
  Description as ResumeIcon,
  Videocam as MockIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import type { AiMatchJobCardModel, MatchQuality } from '@services/aiMatchCenter';

const MotionCard = motion(Card);

const qualityLabel = (quality: MatchQuality): string => {
  if (quality === 'excellent') return 'Excellent';
  if (quality === 'good') return 'Good';
  if (quality === 'average') return 'Average';
  return 'Needs Improvement';
};

interface AiMatchJobCardProps {
  item: AiMatchJobCardModel;
  index: number;
  onApplyNow: (jobId: string) => void;
  onSaveJob: (jobId: string) => void;
  onImproveMatch: (jobId: string) => void;
  onResumeOptimizer: () => void;
  onMockInterview: () => void;
  onViewDetails: (jobId: string) => void;
}

export const AiMatchJobCard: React.FC<AiMatchJobCardProps> = ({
  item,
  index,
  onApplyNow,
  onSaveJob,
  onImproveMatch,
  onResumeOptimizer,
  onMockInterview,
  onViewDetails,
}) => {
  return (
    <MotionCard
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="ai-match-card-hover rounded-2xl bg-white shadow-sm"
      sx={{ borderRadius: 3, border: (theme) => `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}
    >
      <CardContent sx={{ p: { xs: 2, md: 2.4 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ mb: 1 }}>
          <Stack direction="row" spacing={1.1} alignItems="center">
            <Avatar src={item.companyLogo} alt={item.companyName} sx={{ width: 42, height: 42 }}>
              {item.companyName.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{item.title}</Typography>
              <Typography variant="body2" color="text.secondary">{item.companyName}</Typography>
            </Box>
          </Stack>
          <Chip icon={<AiIcon />} size="small" label={`${item.analysis.overallMatchScore}% Match`} color="primary" sx={{ fontWeight: 700 }} />
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.2 }}>
          {item.location} • {item.salaryLabel}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>
          {item.employmentType} • {item.workMode} • Posted {item.postedDateLabel}
        </Typography>

        <Grid container spacing={1.1} sx={{ mb: 1.4 }}>
          <Grid item xs={6}>
            <Card sx={{ borderRadius: 2.4, border: (theme) => `1px solid ${theme.palette.divider}` }}>
              <CardContent sx={{ p: 1.1 }}>
                <Typography variant="caption" color="text.secondary">Selection Probability</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress variant="determinate" value={item.analysis.selectionProbability} size={46} thickness={5} />
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>{item.analysis.selectionProbability}%</Typography>
                    </Box>
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'capitalize' }}>
                    {item.analysis.selectionBand.replace('_', ' ')}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6}>
            <Card sx={{ borderRadius: 2.4, border: (theme) => `1px solid ${theme.palette.divider}` }}>
              <CardContent sx={{ p: 1.1 }}>
                <Typography variant="caption" color="text.secondary">AI Recommendation</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.4 }}>{item.analysis.aiRecommendation}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mb: 1.2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.6 }}>Match Breakdown</Typography>
          <Stack spacing={0.6}>
            {item.analysis.breakdownEntries.map((entry) => (
              <Box key={entry.key}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">{entry.label}</Typography>
                  <Stack direction="row" spacing={0.7} alignItems="center">
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{entry.value}%</Typography>
                    <Chip size="small" label={qualityLabel(entry.quality)} className={`ai-match-pill-${entry.quality}`} />
                  </Stack>
                </Stack>
                <LinearProgress variant="determinate" value={entry.value} sx={{ height: 7, borderRadius: 999 }} />
              </Box>
            ))}
          </Stack>
        </Box>

        <Grid container spacing={1.1} sx={{ mb: 1.1 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2.2, border: (theme) => `1px solid ${theme.palette.divider}`, height: '100%' }}>
              <CardContent sx={{ p: 1.1 }}>
                <Typography variant="caption" color="text.secondary">Required Skills</Typography>
                <Typography variant="body2" sx={{ mt: 0.4 }}>{item.analysis.requiredSkills.slice(0, 5).join(', ') || 'Not specified'}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.8, display: 'block' }}>Missing Skills</Typography>
                <Typography variant="body2" sx={{ mt: 0.2 }}>{item.analysis.missingSkills.slice(0, 4).join(', ') || 'None'}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.8, display: 'block' }}>Recommended Skills</Typography>
                <Typography variant="body2" sx={{ mt: 0.2 }}>{item.analysis.recommendedSkills.slice(0, 4).join(', ') || 'N/A'}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.8, display: 'block' }}>Trending Skills</Typography>
                <Typography variant="body2" sx={{ mt: 0.2 }}>{item.analysis.trendingSkills.slice(0, 4).join(', ') || 'N/A'}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2.2, border: (theme) => `1px solid ${theme.palette.divider}`, height: '100%' }}>
              <CardContent sx={{ p: 1.1 }}>
                <Typography variant="caption" color="text.secondary">Why This Match</Typography>
                <Stack spacing={0.4} sx={{ mt: 0.5 }}>
                  {item.analysis.explanation.map((line, idx) => (
                    <Typography key={`${line}-${idx}`} variant="body2">- {line}</Typography>
                  ))}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.8, display: 'block' }}>Improvement Suggestions</Typography>
                <Stack spacing={0.4} sx={{ mt: 0.4 }}>
                  {item.analysis.improvements.map((line, idx) => (
                    <Typography key={`${line}-${idx}`} variant="body2">- {line}</Typography>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={0.8}>
          <Grid item xs={12} sm={6} md={4}><Button fullWidth variant="contained" startIcon={<ApplyIcon />} onClick={() => onApplyNow(item.id)} sx={{ minHeight: 42, borderRadius: 2, fontWeight: 800 }}>Apply Now</Button></Grid>
          <Grid item xs={12} sm={6} md={4}><Button fullWidth variant="outlined" startIcon={<SaveIcon />} onClick={() => onSaveJob(item.id)} sx={{ minHeight: 42, borderRadius: 2, fontWeight: 700 }}>Save Job</Button></Grid>
          <Grid item xs={12} sm={6} md={4}><Button fullWidth variant="outlined" startIcon={<ImproveIcon />} onClick={() => onImproveMatch(item.id)} sx={{ minHeight: 42, borderRadius: 2, fontWeight: 700 }}>Improve Match</Button></Grid>
          <Grid item xs={12} sm={6} md={4}><Button fullWidth variant="outlined" startIcon={<ResumeIcon />} onClick={onResumeOptimizer} sx={{ minHeight: 42, borderRadius: 2, fontWeight: 700 }}>AI Resume Optimizer</Button></Grid>
          <Grid item xs={12} sm={6} md={4}><Button fullWidth variant="outlined" startIcon={<MockIcon />} onClick={onMockInterview} sx={{ minHeight: 42, borderRadius: 2, fontWeight: 700 }}>Mock Interview</Button></Grid>
          <Grid item xs={12} sm={6} md={4}><Button fullWidth variant="outlined" startIcon={<OpenIcon />} onClick={() => onViewDetails(item.id)} sx={{ minHeight: 42, borderRadius: 2, fontWeight: 700 }}>View Details</Button></Grid>
        </Grid>
      </CardContent>
    </MotionCard>
  );
};

export default AiMatchJobCard;
