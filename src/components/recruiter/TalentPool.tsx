import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper,
} from '@mui/material';
import { Search as SearchIcon, People as PeopleIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useDebounce } from '@hooks/index';
import { useTalentPool } from '@hooks/useTalentPool';
import { calculateSkillMatchScore, normalizeSkills } from '@utils/matchScore';
import type { TalentPool as TalentPoolRecord, TalentPoolCandidate } from '@types';
import { PoolList } from './talentPool/PoolList';
import { PoolCandidateCard } from './talentPool/PoolCandidateCard';
import { PoolFormDialog } from './talentPool/PoolFormDialog';
import { MoveCandidateDialog } from './talentPool/MoveCandidateDialog';
import { TalentPoolProfileDialog } from './talentPool/TalentPoolProfileDialog';
import { trackCandidateProfileView } from '@utils/resumeUnlocks';

interface TalentPoolProps {
  recruiterId: string;
  onChatClick?: (candidateId: string, candidateName: string) => void;
}

export const TalentPool: React.FC<TalentPoolProps> = ({ recruiterId, onChatClick }) => {
  const {
    pools,
    selectedPool,
    selectedPoolId,
    setSelectedPoolId,
    candidates,
    pagination,
    filters,
    updateFilters,
    setPage,
    jobs,
    matchJob,
    matchJobId,
    setMatchJobId,
    poolsLoading,
    candidatesLoading,
    actionLoading,
    createPool,
    updatePool,
    deletePool,
    removeCandidate,
    moveCandidate,
  } = useTalentPool({ recruiterId });

  const [searchInput, setSearchInput] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');

  const [poolFormOpen, setPoolFormOpen] = useState(false);
  const [editingPool, setEditingPool] = useState<TalentPoolRecord | null>(null);
  const [deletePoolTarget, setDeletePoolTarget] = useState<TalentPoolRecord | null>(null);
  const [moveTarget, setMoveTarget] = useState<TalentPoolCandidate | null>(null);
  const [viewTarget, setViewTarget] = useState<TalentPoolCandidate | null>(null);
  const [removeTarget, setRemoveTarget] = useState<TalentPoolCandidate | null>(null);

  const debouncedSearch = useDebounce(searchInput, 400);

  useEffect(() => {
    updateFilters({
      search: debouncedSearch,
      location: locationFilter,
      minExperience: experienceFilter ? Number(experienceFilter) : undefined,
      skill: skillFilter,
    });
  }, [debouncedSearch, locationFilter, experienceFilter, skillFilter, updateFilters]);

  const jobSkills = useMemo(() => normalizeSkills(matchJob?.skills), [matchJob]);

  const getMatchScore = (entry: TalentPoolCandidate) => {
    const candidateSkills = normalizeSkills(entry.profiles?.skills);
    return calculateSkillMatchScore(jobSkills, candidateSkills);
  };

  const handleCreatePool = async (payload: { name: string; description?: string }) => {
    await createPool(payload);
  };

  const handleUpdatePool = async (payload: { name: string; description?: string }) => {
    if (!editingPool) return;
    await updatePool(editingPool.id, payload);
    setEditingPool(null);
  };

  const handleDeletePool = async () => {
    if (!deletePoolTarget) return;
    await deletePool(deletePoolTarget.id);
    setDeletePoolTarget(null);
  };

  const handleRemoveCandidate = async () => {
    if (!removeTarget) return;
    await removeCandidate(removeTarget.id);
    setRemoveTarget(null);
  };

  const handleViewCandidate = async (entry: TalentPoolCandidate) => {
    try {
      await trackCandidateProfileView({
        recruiterId,
        candidateId: entry.candidate_id,
        source: 'talent_pool',
      });
    } catch (error) {
      console.error('Failed to record talent pool candidate profile view:', error);
      toast.error('Could not record profile activity.');
    }
    setViewTarget(entry);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
          Talent Pool
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Organize saved candidates into folders — like LinkedIn Recruiter projects.
        </Typography>
      </Box>

      <Grid container spacing={2.5}>
        {/* Left: Pool list */}
        <Grid item xs={12} md={4} lg={3}>
          <Box sx={{ height: { md: 'calc(100vh - 280px)' }, minHeight: 420 }}>
            <PoolList
              pools={pools}
              selectedPoolId={selectedPoolId}
              onSelectPool={setSelectedPoolId}
              onCreatePool={() => {
                setEditingPool(null);
                setPoolFormOpen(true);
              }}
              onEditPool={(pool) => {
                setEditingPool(pool);
                setPoolFormOpen(true);
              }}
              onDeletePool={setDeletePoolTarget}
              loading={poolsLoading}
            />
          </Box>
        </Grid>

        {/* Right: Candidates */}
        <Grid item xs={12} md={8} lg={9}>
          <Paper
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              minHeight: 420,
              border: '1px solid rgba(148, 163, 184, 0.22)',
              background: 'linear-gradient(145deg, rgba(255,255,255,0.94), rgba(248,250,252,0.9))',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06)',
            }}
          >
            {!selectedPool ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <PeopleIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Select or create a pool
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose a folder on the left to view saved candidates.
                </Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ mb: 2.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {selectedPool.name}
                  </Typography>
                  {selectedPool.description && (
                    <Typography variant="body2" color="text.secondary">
                      {selectedPool.description}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {pagination.total} candidate{pagination.total !== 1 ? 's' : ''} in this pool
                  </Typography>
                </Box>

                {/* Filters */}
                <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Search by name, email…"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Filter by location"
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6} sm={4} md={2}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      placeholder="Min exp (yrs)"
                      value={experienceFilter}
                      onChange={(e) => setExperienceFilter(e.target.value)}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={6} sm={4} md={2}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Skill filter"
                      value={skillFilter}
                      onChange={(e) => setSkillFilter(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4} md={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Match vs Job</InputLabel>
                      <Select
                        value={matchJobId}
                        label="Match vs Job"
                        onChange={(e) => setMatchJobId(e.target.value)}
                      >
                        {jobs.length === 0 ? (
                          <MenuItem value="">No active jobs</MenuItem>
                        ) : (
                          jobs.map((job) => (
                            <MenuItem key={job.id} value={job.id}>
                              {job.title}
                            </MenuItem>
                          ))
                        )}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {candidatesLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                  </Box>
                ) : candidates.length === 0 ? (
                  <Box
                    sx={{
                      textAlign: 'center',
                      py: 8,
                      px: 2,
                      borderRadius: 2,
                      border: '1px dashed rgba(148, 163, 184, 0.4)',
                      bgcolor: 'rgba(10, 102, 194, 0.03)',
                    }}
                  >
                    <PeopleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                      No candidates in this pool
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {filters.search || filters.location || filters.skill
                        ? 'Try adjusting your filters.'
                        : 'Add candidates from Find Candidates or View Applicants.'}
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <Grid container spacing={2}>
                      {candidates.map((entry, index) => (
                        <Grid item xs={12} sm={6} lg={4} key={entry.id}>
                          <PoolCandidateCard
                            entry={entry}
                            index={index}
                            matchScore={getMatchScore(entry)}
                            onView={(target) => {
                              void handleViewCandidate(target);
                            }}
                            onMessage={onChatClick}
                            onRemove={setRemoveTarget}
                            onMove={setMoveTarget}
                            disabled={actionLoading}
                          />
                        </Grid>
                      ))}
                    </Grid>

                    {pagination.totalPages > 1 && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                        <Pagination
                          count={pagination.totalPages}
                          page={pagination.page}
                          onChange={(_, page) => setPage(page)}
                          color="primary"
                          shape="rounded"
                        />
                      </Box>
                    )}
                  </>
                )}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      <PoolFormDialog
        open={poolFormOpen}
        onClose={() => {
          setPoolFormOpen(false);
          setEditingPool(null);
        }}
        pool={editingPool}
        loading={actionLoading}
        onSubmit={editingPool ? handleUpdatePool : handleCreatePool}
      />

      <Dialog open={!!deletePoolTarget} onClose={() => !actionLoading && setDeletePoolTarget(null)}>
        <DialogTitle>Delete Pool</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Delete &quot;{deletePoolTarget?.name}&quot; and remove all{' '}
            {deletePoolTarget?.candidate_count ?? 0} saved candidates from this folder? This cannot
            be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletePoolTarget(null)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleDeletePool} disabled={actionLoading}>
            Delete Pool
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!removeTarget} onClose={() => !actionLoading && setRemoveTarget(null)}>
        <DialogTitle>Remove Candidate</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Remove {removeTarget?.profiles?.name || 'this candidate'} from &quot;{selectedPool?.name}
            &quot;?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveTarget(null)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleRemoveCandidate} disabled={actionLoading}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      <MoveCandidateDialog
        open={!!moveTarget}
        onClose={() => setMoveTarget(null)}
        pools={pools}
        currentPoolId={selectedPoolId || ''}
        candidateName={moveTarget?.profiles?.name || undefined}
        loading={actionLoading}
        onMove={async (targetPoolId) => {
          if (moveTarget) await moveCandidate(moveTarget.id, targetPoolId);
          setMoveTarget(null);
        }}
      />

      <TalentPoolProfileDialog
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        entry={viewTarget}
        recruiterId={recruiterId}
        matchScore={viewTarget ? getMatchScore(viewTarget) : undefined}
        onMessage={onChatClick}
      />
    </motion.div>
  );
};
