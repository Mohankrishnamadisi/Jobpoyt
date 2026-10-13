import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Pagination,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Block as BlockIcon,
  LocationOn as LocationIcon,
  Message as MessageIcon,
  PersonSearch as PersonSearchIcon,
  Send as SendIcon,
  Visibility as ViewIcon,
  Work as WorkIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { AddToPoolButton } from './talentPool/AddToPoolButton';
import { ResumeUnlockContact } from './ResumeUnlockContact';
import {
  getRecommendedCandidates,
  inviteCandidateToApply,
} from '@utils/recommendations';
import { trackCandidateProfileView } from '@utils/resumeUnlocks';
import { getMatchScoreHex, normalizeSkills } from '@utils/matchScore';
import type {
  Job,
  PaginatedResult,
  RecommendedCandidate,
  RecommendedCandidateFilters,
} from '@types';
import { recruiterSettingsService } from '@services/recruiterSettings';

interface RecommendedCandidatesProps {
  recruiterId: string;
  jobId: string;
  title?: string;
  compact?: boolean;
  onMessageClick?: (candidateId: string, candidateName: string) => void;
}

const MotionCard = motion(Card);
const PAGE_SIZE = 10;

export const RecommendedCandidates: React.FC<RecommendedCandidatesProps> = ({
  recruiterId,
  jobId,
  title = 'AI Recommended Candidates',
  compact = false,
  onMessageClick,
}) => {
  const [result, setResult] = useState<PaginatedResult<RecommendedCandidate> | null>(null);
  const [loading, setLoading] = useState(true);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<RecommendedCandidate | null>(null);
  const [page, setPage] = useState(1);
  const [blockedCandidateIds, setBlockedCandidateIds] = useState<string[]>([]);
  const [blockedCandidateEmails, setBlockedCandidateEmails] = useState<string[]>([]);
  const [filters, setFilters] = useState<RecommendedCandidateFilters>({
    minMatchScore: 70,
    skills: '',
    location: '',
    minExperience: undefined,
  });

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const blockedIdsKey = useMemo(() => blockedCandidateIds.slice().sort().join(','), [blockedCandidateIds]);
  const blockedEmailsKey = useMemo(() => blockedCandidateEmails.slice().sort().join(','), [blockedCandidateEmails]);

  useEffect(() => {
    setBlockedCandidateIds(Array.from(recruiterSettingsService.getBlockedCandidateIds(recruiterId)));
    setBlockedCandidateEmails(Array.from(recruiterSettingsService.getBlockedCandidateEmails(recruiterId)));
  }, [recruiterId]);

  useEffect(() => {
    setPage(1);
  }, [jobId, filterKey]);

  useEffect(() => {
    let active = true;

    const loadCandidates = async () => {
      setLoading(true);
      try {
        const data = await getRecommendedCandidates(
          jobId,
          filters,
          page,
          PAGE_SIZE,
          blockedCandidateIds,
          blockedCandidateEmails
        );
        if (active) setResult(data);
      } catch (err) {
        console.error('Failed to load recommended candidates:', err);
        toast.error('Failed to load recommended candidates');
      } finally {
        if (active) setLoading(false);
      }
    };

    if (jobId) loadCandidates();
    return () => {
      active = false;
    };
  }, [jobId, filterKey, page, blockedIdsKey, blockedEmailsKey]);

  const handleBlockCandidate = (item: RecommendedCandidate) => {
    recruiterSettingsService.upsertBlockedCandidate(recruiterId, {
      candidateId: item.candidate.id,
      name: item.candidate.name || 'Candidate',
      email: item.candidate.email || null,
      headline: item.candidate.bio || null,
      reason: 'Blocked from recommendations',
    });

    setBlockedCandidateIds((current) => (current.includes(item.candidate.id) ? current : [item.candidate.id, ...current]));
    setBlockedCandidateEmails((current) => {
      const email = String(item.candidate.email || '').trim().toLowerCase();
      if (!email || current.includes(email)) return current;
      return [email, ...current];
    });
    setSelectedCandidate((current) => (current?.candidate.id === item.candidate.id ? null : current));
    setResult((current) => {
      if (!current) return current;
      const nextData = current.data.filter((entry) => entry.candidate.id !== item.candidate.id);
      const nextTotal = Math.max(0, current.total - 1);
      return {
        ...current,
        data: nextData,
        total: nextTotal,
        totalPages: Math.max(1, Math.ceil(nextTotal / current.pageSize)),
      };
    });
    toast.success('Candidate blocked');
  };

  const handleInvite = async (item: RecommendedCandidate) => {
    if (onMessageClick) {
      onMessageClick(item.candidate.id, item.candidate.name || 'Candidate');
      return;
    }

    setInvitingId(item.candidate.id);
    try {
      await inviteCandidateToApply(
        recruiterId,
        item.candidate.id,
        item.job as Job,
        item.matchScore.score
      );
      toast.success('Invite sent to candidate');
    } catch (err) {
      console.error('Failed to invite candidate:', err);
      toast.error('Failed to send invite');
    } finally {
      setInvitingId(null);
    }
  };

  const handleViewRecommendedCandidate = async (item: RecommendedCandidate) => {
    try {
      await trackCandidateProfileView({
        recruiterId,
        candidateId: item.candidate.id,
        jobId,
        source: 'recommended_candidates',
      });
    } catch (error) {
      console.error('Failed to record recommended candidate profile view:', error);
      toast.error('Could not record profile activity.');
    }
    setSelectedCandidate(item);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant={compact ? 'h6' : 'h5'} sx={{ fontWeight: 800, mb: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ranked by skills, experience, location, salary, and education fit.
          </Typography>
        </Box>
        {result && (
          <Chip
            icon={<PersonSearchIcon />}
            label={`${result.total} match${result.total === 1 ? '' : 'es'}`}
            sx={{ fontWeight: 700, bgcolor: 'rgba(10,102,194,0.08)', color: '#0A66C2' }}
          />
        )}
      </Box>

      <Card sx={{ mb: 2, border: '1px solid rgba(148, 163, 184, 0.22)', boxShadow: 'none' }}>
        <CardContent sx={{ p: compact ? 2 : 2.5 }}>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Minimum Match Score"
                type="number"
                value={filters.minMatchScore ?? ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    minMatchScore: e.target.value === '' ? undefined : Number(e.target.value),
                  }))
                }
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Skills"
                value={filters.skills || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, skills: e.target.value }))}
                placeholder="React, SQL"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Location"
                value={filters.location || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, location: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Minimum Experience"
                type="number"
                value={filters.minExperience ?? ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    minExperience: e.target.value === '' ? undefined : Number(e.target.value),
                  }))
                }
                inputProps={{ min: 0 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading ? (
        <RecommendationSkeleton />
      ) : !result || result.data.length === 0 ? (
        <Alert
          severity="info"
          sx={{
            borderRadius: 2,
            border: '1px solid rgba(10,102,194,0.16)',
            bgcolor: 'rgba(10,102,194,0.04)',
          }}
        >
          No recommended candidates found for this job. Try lowering the minimum match score or clearing filters.
        </Alert>
      ) : (
        <>
          <Grid container spacing={2}>
            {result.data.map((item, index) => (
              <Grid item xs={12} sm={6} lg={compact ? 6 : 4} key={item.candidate.id}>
                <RecommendedCandidateCard
                  item={item}
                  recruiterId={recruiterId}
                  index={index}
                  inviting={invitingId === item.candidate.id}
                  onView={() => {
                    void handleViewRecommendedCandidate(item);
                  }}
                  onMessage={() => onMessageClick?.(item.candidate.id, item.candidate.name || 'Candidate')}
                  onInvite={() => handleInvite(item)}
                  onBlock={() => handleBlockCandidate(item)}
                />
              </Grid>
            ))}
          </Grid>

          {result.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                page={result.page}
                count={result.totalPages}
                color="primary"
                shape="rounded"
                onChange={(_, nextPage) => setPage(nextPage)}
              />
            </Box>
          )}
        </>
      )}

      <RecommendedCandidateDialog
        item={selectedCandidate}
        open={!!selectedCandidate}
        recruiterId={recruiterId}
        inviting={selectedCandidate ? invitingId === selectedCandidate.candidate.id : false}
        onClose={() => setSelectedCandidate(null)}
        onMessage={onMessageClick}
        onInvite={handleInvite}
        onBlock={handleBlockCandidate}
      />
    </Box>
  );
};

function RecommendedCandidateCard({
  item,
  recruiterId,
  index,
  inviting,
  onView,
  onMessage,
  onInvite,
  onBlock,
}: {
  item: RecommendedCandidate;
  recruiterId: string;
  index: number;
  inviting: boolean;
  onView: () => void;
  onMessage: () => void;
  onInvite: () => void;
  onBlock: () => void;
}) {
  const candidate = item.candidate;
  const name = candidate.name || 'Candidate';
  const skills = normalizeSkills(candidate.skills);
  const matchHex = getMatchScoreHex(item.matchScore.score);

  return (
    <MotionCard
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      sx={{
        height: '100%',
        borderRadius: 2,
        border: '1px solid rgba(148, 163, 184, 0.24)',
        boxShadow: '0 18px 42px rgba(15,23,42,0.07)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 24px 52px rgba(15,23,42,0.1)',
        },
      }}
    >
      <CardContent sx={{ p: 2.25, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.75 }}>
          <Avatar src={candidate.avatar_url || undefined} sx={{ width: 52, height: 52, bgcolor: '#0A66C2', fontWeight: 800 }}>
            {name.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.25 }} noWrap>
              {name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {candidate.bio || 'Job Seeker'}
            </Typography>
          </Box>
          <Chip
            label={item.matchScore.label}
            size="small"
            sx={{
              height: 26,
              fontWeight: 900,
              bgcolor: `${matchHex}14`,
              color: matchHex,
              border: `1px solid ${matchHex}33`,
            }}
          />
        </Box>

        <Box sx={{ display: 'grid', gap: 0.75, mb: 1.75 }}>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <WorkIcon sx={{ fontSize: 17 }} />
            {candidate.experience || 'Experience not specified'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <LocationIcon sx={{ fontSize: 17 }} />
            {candidate.location || 'Location not specified'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2, flex: 1 }}>
          {skills.slice(0, 5).map((skill) => (
            <Chip key={skill} label={skill} size="small" variant="outlined" sx={{ height: 23, fontSize: 11 }} />
          ))}
          {skills.length > 5 && <Chip label={`+${skills.length - 5}`} size="small" sx={{ height: 23, fontSize: 11 }} />}
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              AI Match Score
            </Typography>
            <Typography variant="caption" sx={{ color: matchHex, fontWeight: 900 }}>
              {item.matchScore.score}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={item.matchScore.score}
            sx={{
              height: 6,
              borderRadius: 4,
              bgcolor: 'rgba(148,163,184,0.2)',
              '& .MuiLinearProgress-bar': { bgcolor: matchHex, borderRadius: 4 },
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid rgba(148,163,184,0.16)' }}>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="View Profile">
              <IconButton size="small" onClick={onView}>
                <ViewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Send Message">
              <span>
                <IconButton size="small" onClick={onMessage} disabled={!onMessage}>
                  <MessageIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <AddToPoolButton recruiterId={recruiterId} candidateId={candidate.id} />
            <Tooltip title="Block Candidate">
              <IconButton size="small" onClick={onBlock}>
                <BlockIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Button
            size="small"
            variant="contained"
            startIcon={<SendIcon />}
            onClick={onInvite}
            disabled={inviting}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#0A66C2' }}
          >
            {inviting ? 'Inviting' : 'Invite'}
          </Button>
        </Box>
      </CardContent>
    </MotionCard>
  );
}

function RecommendationSkeleton() {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Grid item xs={12} sm={6} lg={4} key={index}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                <Skeleton variant="circular" width={52} height={52} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="70%" />
                  <Skeleton width="45%" />
                </Box>
              </Box>
              <Skeleton width="90%" />
              <Skeleton width="65%" />
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Skeleton variant="rounded" width={68} height={24} />
                <Skeleton variant="rounded" width={68} height={24} />
                <Skeleton variant="rounded" width={68} height={24} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

function RecommendedCandidateDialog({
  item,
  open,
  recruiterId,
  inviting,
  onClose,
  onMessage,
  onInvite,
  onBlock,
}: {
  item: RecommendedCandidate | null;
  open: boolean;
  recruiterId: string;
  inviting: boolean;
  onClose: () => void;
  onMessage?: (candidateId: string, candidateName: string) => void;
  onInvite: (item: RecommendedCandidate) => void;
  onBlock: (item: RecommendedCandidate) => void;
}) {
  if (!item) return null;

  const candidate = item.candidate;
  const name = candidate.name || 'Candidate';
  const skills = normalizeSkills(candidate.skills);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Recommended Candidate</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Avatar src={candidate.avatar_url || undefined} sx={{ width: 84, height: 84, mx: 'auto', mb: 1, bgcolor: '#0A66C2', fontSize: 34, fontWeight: 800 }}>
              {name.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {candidate.bio || 'Job Seeker'}
            </Typography>
            <Chip
              label={item.matchScore.label}
              sx={{
                mt: 1,
                fontWeight: 900,
                bgcolor: `${getMatchScoreHex(item.matchScore.score)}14`,
                color: getMatchScoreHex(item.matchScore.score),
              }}
            />
          </Box>

          <ResumeUnlockContact
            recruiterId={recruiterId}
            candidateId={candidate.id}
            jobId={item.job.id}
          />
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon fontSize="small" /> {candidate.location || 'Location not specified'}
          </Typography>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WorkIcon fontSize="small" />
            {candidate.experience || 'Experience not specified'}
          </Typography>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
              Top Skills
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {skills.length > 0 ? skills.map((skill) => <Chip key={skill} label={skill} size="small" />) : (
                <Typography variant="body2" color="text.secondary">No skills listed</Typography>
              )}
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
              Strengths
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.2 }}>
              {item.matchScore.strengths.map((strength) => (
                <Typography component="li" variant="body2" key={strength} sx={{ mb: 0.5 }}>
                  {strength}
                </Typography>
              ))}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="outlined"
          color="warning"
          startIcon={<BlockIcon />}
          onClick={() => {
            onBlock(item);
            onClose();
          }}
        >
          Block Candidate
        </Button>
        <AddToPoolButton recruiterId={recruiterId} candidateId={candidate.id} size="medium" />
        {onMessage && (
          <Button
            variant="outlined"
            startIcon={<MessageIcon />}
            onClick={() => {
              onMessage(candidate.id, name);
              onClose();
            }}
          >
            Send Message
          </Button>
        )}
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={() => {
            onInvite(item);
            if (onMessage) onClose();
          }}
          disabled={inviting}
        >
          {inviting ? 'Inviting...' : 'Invite To Apply'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
