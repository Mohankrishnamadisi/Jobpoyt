import React from 'react';
import { Card, CardContent, Box, Typography, Chip, Button } from '@mui/material';
import { motion } from 'framer-motion';
import {
  LocationOn as LocationOnIcon,
  Work as WorkIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon,
  Business as BusinessIcon,
  Bolt as BoltIcon,
} from '@mui/icons-material';
import { getTimeAgo, formatJobSalary } from '@utils/index';
import { ROUTES } from '@constants/index';
import type { Job } from '../../types';

const MotionCard = motion(Card);

interface JobCardProps {
  job: Job;
  onSave?: (jobId: string) => void;
  isSaved?: boolean;
  isPremiumUser?: boolean;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onSave, isSaved = false, isPremiumUser = false }) => {
  const workMode = job.workMode || job.work_mode;
  const normalizedWorkMode = String(workMode || '').trim().toLowerCase();
  const showRemotePremium = normalizedWorkMode === 'remote' && !isPremiumUser;
  const postedDate = getTimeAgo(job.createdAt || job.created_at || new Date().toISOString());
  const skills = Array.isArray(job.skills) ? job.skills : [];
  const jobType = job.jobType || job.job_type || 'Type unavailable';
  const positions = job.positionsAvailable || job.positions_available;

  return (
    <MotionCard
      whileHover={{ y: -8 }}
      transition={{ duration: 0.28 }}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 540,
        maxHeight: 540,
        borderRadius: 4,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 16px 34px rgba(15, 23, 42, 0.08)',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 85% 10%, rgba(56, 189, 248, 0.14), transparent 35%), radial-gradient(circle at 20% 90%, rgba(59, 130, 246, 0.12), transparent 40%)',
          pointerEvents: 'none',
        },
      }}
    >
      <Box
        sx={{
          height: 6,
          width: '100%',
          background: 'linear-gradient(90deg, #0ea5e9 0%, #2563eb 55%, #1e40af 100%)',
        }}
      />

      {(job.featured || showRemotePremium) && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 14,
            background: showRemotePremium ? '#DBEAFE' : '#DCFCE7',
            color: showRemotePremium ? '#1E3A8A' : '#14532D',
            borderRadius: 999,
            px: 1.5,
            py: 0.5,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            zIndex: 1,
          }}
        >
          {job.featured ? <TrendingUpIcon sx={{ fontSize: 16 }} /> : null}
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {showRemotePremium ? 'Premium Remote' : 'Featured'}
          </Typography>
        </Box>
      )}
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.25, py: 2.3, px: 2.3, position: 'relative', zIndex: 1, overflow: 'hidden', minHeight: 0 }}>
        <Box sx={{ flex: '0 0 auto', pr: 5 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              mb: 0.55,
              lineHeight: 1.25,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {job.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
            <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                ...(showRemotePremium ? { filter: 'blur(4px)', userSelect: 'none' } : {}),
              }}
            >
              {showRemotePremium ? 'Upgrade to view company' : job.company_name}
            </Typography>
          </Box>
          <Box sx={{ mt: 0.75, display: 'inline-flex', alignItems: 'center', gap: 0.55, px: 1.1, py: 0.45, borderRadius: 99, bgcolor: 'rgba(59, 130, 246, 0.12)' }}>
            <AccessTimeIcon sx={{ fontSize: 13, color: 'primary.main' }} />
            <Typography variant="caption" sx={{ color: 'primary.dark', fontWeight: 700 }}>
              Posted {postedDate}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', flex: '0 0 auto', alignItems: 'flex-start' }}>
          <Chip
            label={jobType}
            size="small"
            sx={{ bgcolor: 'rgba(14, 165, 233, 0.12)', color: '#0c4a6e', fontWeight: 700 }}
          />
          {workMode ? (
            <Chip
              label={workMode}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          ) : null}
          {job.featured ? (
            <Chip
              icon={<BoltIcon sx={{ fontSize: '15px !important' }} />}
              label="Hot Role"
              size="small"
              sx={{ bgcolor: 'rgba(56, 189, 248, 0.12)', color: '#075985', fontWeight: 700 }}
            />
          ) : null}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.85, flex: '0 0 auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.9 }}>
            <LocationOnIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography
              variant="body2"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'text.secondary',
              }}
            >
              {job.location}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.9, flexWrap: 'wrap' }}>
            <WorkIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography
              variant="body2"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'text.secondary',
              }}
            >
              {jobType}
            </Typography>
          </Box>
          {positions && (
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                ...(showRemotePremium ? { filter: 'blur(4px)', userSelect: 'none' } : {}),
              }}
            >
              {showRemotePremium ? 'Positions hidden - Upgrade' : `Hiring ${positions} position${positions === 1 ? '' : 's'}`}
            </Typography>
          )}
          <Box sx={{ mt: 0.2, display: 'inline-flex', alignItems: 'center', px: 1.15, py: 0.6, borderRadius: 99, bgcolor: 'rgba(34, 197, 94, 0.12)', width: 'fit-content' }}>
            <Typography
              variant="body2"
              sx={{ color: 'success.dark', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {formatJobSalary(job.salaryMin, job.salaryMax)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, flex: '0 0 auto' }}>
          {skills.slice(0, 3).map((skill) => (
            <Chip
              key={skill}
              label={skill}
              size="small"
              variant="outlined"
              sx={{ maxWidth: '100%', bgcolor: 'rgba(226, 232, 240, 0.45)' }}
            />
          ))}
          {skills.length > 3 && (
            <Chip label={`+${skills.length - 3}`} size="small" variant="outlined" />
          )}
        </Box>

        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.55,
            flex: '1 1 auto',
            minHeight: 0,
            ...(showRemotePremium ? { filter: 'blur(4px)', userSelect: 'none' } : {}),
          }}
        >
          {job.description}
        </Typography>
      </CardContent>

      <Box sx={{ display: 'flex', gap: 1, p: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'rgba(248, 250, 252, 0.9)', position: 'relative', zIndex: 1 }}>
        <Button
          component="a"
          href={ROUTES.JOB_DETAILS.replace(':id', job.id)}
          target="_blank"
          rel="noopener noreferrer"
          variant="contained"
          fullWidth
          size="small"
          sx={{
            borderRadius: 2,
            fontWeight: 700,
            textTransform: 'none',
            background: 'linear-gradient(90deg, #0284c7, #2563eb)',
            boxShadow: 'none',
            '&:hover': {
              background: 'linear-gradient(90deg, #0369a1, #1d4ed8)',
              boxShadow: 'none',
            },
          }}
        >
          View Details
        </Button>
        {onSave && (
          <Button
            variant={isSaved ? 'contained' : 'outlined'}
            size="small"
            onClick={() => onSave(job.id)}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {isSaved ? 'Saved' : 'Save'}
          </Button>
        )}
      </Box>
    </MotionCard>
  );
};
