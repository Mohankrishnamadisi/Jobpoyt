import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Alert,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  Tab,
  TextField,
  Tooltip,
  Typography,
  Avatar,
} from '@mui/material';
import {
  Block as BlockIcon,
  GetApp as DownloadIcon,
  Lock as LockIcon,
  Message as MessageIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Star as StarIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { jobService } from '@services/api';
import { candidateTagService } from '@services/candidateTags';
import type { Job, CandidateTag } from '@types';
import { calculateMatchScore, getMatchScoreHex, type MatchScoreResult } from '@utils/matchScore';
import { downloadApplicantsCsv } from '@utils/applicantCsv';
import { ApplicantDetailsModal } from './ApplicantDetailsModal';
import { getResumeUnlockMap, trackCandidateProfileView } from '@utils/resumeUnlocks';
import { BulkActionsToolbar, type BulkToolbarAction } from './BulkActionsToolbar';
import { BulkConfirmationDialog } from './BulkConfirmationDialog';
import { BulkMessageDialog } from './BulkMessageDialog';
import {
  bulkMoveToAtsStage,
  bulkSendMessage,
  bulkSetTags,
  bulkSetTalentPools,
  bulkUpdateApplicationStatus,
  getApplicantStage,
  getApplicantTags,
  getApplicantTalentPools,
  getJobApplicantsPaginated,
  type BulkApplicant,
} from './bulkActionsApi';
import { recruiterSettingsService } from '@services/recruiterSettings';

interface ViewApplicantsProps {
  recruiterId: string;
  onChatClick?: (candidateId: string, candidateName: string) => void;
}

type SortMode = 'applied_desc' | 'match_desc' | 'match_asc';
type MatchScoreFilter = 'all' | '90_plus' | '70_89' | 'below_70';

interface PendingConfirmation {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: 'primary' | 'error' | 'warning' | 'success';
  run: () => Promise<void>;
}

const pageSizeOptions = [10, 25, 50, 100];

const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
  switch (status) {
    case 'applied':
      return 'info';
    case 'under_review':
      return 'warning';
    case 'shortlisted':
      return 'success';
    case 'rejected':
      return 'error';
    case 'accepted':
      return 'success';
    default:
      return 'default';
  }
};

const labelize = (value: string): string => value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const selectedText = (count: number) => `${count} ${count === 1 ? 'Candidate' : 'Candidates'} Selected`;

export const ViewApplicants: React.FC<ViewApplicantsProps> = ({ recruiterId, onChatClick }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [applicants, setApplicants] = useState<BulkApplicant[]>([]);
  const [totalApplicants, setTotalApplicants] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [loading, setLoading] = useState(true);
  const [applicantsError, setApplicantsError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<BulkApplicant | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'priority'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('applied_desc');
  const [matchScoreFilter, setMatchScoreFilter] = useState<MatchScoreFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [messageOpen, setMessageOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null);
  const [unlockedApplicants, setUnlockedApplicants] = useState<Record<string, boolean>>({});
  const [recruiterTags, setRecruiterTags] = useState<CandidateTag[]>([]);
  const [tagAssignmentsByCandidate, setTagAssignmentsByCandidate] = useState<Record<string, CandidateTag[]>>({});
  const [blockedCandidateIds, setBlockedCandidateIds] = useState<Set<string>>(new Set());
  const [blockedCandidateEmails, setBlockedCandidateEmails] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchJobs();
    fetchTags();
    setBlockedCandidateIds(recruiterSettingsService.getBlockedCandidateIds(recruiterId));
    setBlockedCandidateEmails(recruiterSettingsService.getBlockedCandidateEmails(recruiterId));
  }, [recruiterId]);

  useEffect(() => {
    if (selectedJobId) fetchApplicants();
  }, [selectedJobId, page, rowsPerPage]);

  useEffect(() => {
    setSelectedIds(new Set());
    setPage(0);
  }, [selectedJobId]);

  const fetchTags = async () => {
    try {
      const tags = await candidateTagService.getRecruiterTags(recruiterId);
      setRecruiterTags(tags);
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  };

  const fetchJobs = async () => {
    try {
      const data = await jobService.getRecruiterJobs(recruiterId);
      setJobs(data || []);
      if (data && data.length > 0) setSelectedJobId(data[0].id);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      toast.error('Failed to fetch jobs');
    }
  };

  const fetchApplicants = async () => {
    setLoading(true);
    setApplicantsError('');
    try {
      const result = await getJobApplicantsPaginated(selectedJobId, page + 1, rowsPerPage);
      const normalizedApplicants = (result.data || []).map((applicant) => ({
        ...applicant,
        priority_application: Boolean(applicant.priority_application ?? applicant.priorityApplication),
        priorityApplication: Boolean(applicant.priority_application ?? applicant.priorityApplication),
      }));
      setApplicants(normalizedApplicants);
      setTotalApplicants(result.total);
      const unlockMap = await getResumeUnlockMap(
        recruiterId,
        normalizedApplicants.map((applicant) => applicant.user_id)
      );
      setUnlockedApplicants(unlockMap);

      // Fetch tag assignments for all candidates
      const candidateIds = normalizedApplicants.map((applicant) => applicant.user_id);
      if (candidateIds.length > 0) {
        try {
          const assignments = await candidateTagService.getAssignmentsForCandidates(candidateIds);
          const tagsByCandidate: Record<string, CandidateTag[]> = {};
          candidateIds.forEach((id) => {
            tagsByCandidate[id] = assignments
              .filter((a) => a.candidate_id === id && a.candidate_tags)
              .map((a) => a.candidate_tags!)
              .filter((tag, idx, arr) => arr.findIndex((t) => t.id === tag.id) === idx); // deduplicate
          });
          setTagAssignmentsByCandidate(tagsByCandidate);
        } catch (err) {
          console.error('Error fetching tag assignments:', err);
        }
      }
    } catch (err) {
      console.error('Error fetching applicants:', err);
      setApplicants([]);
      setTotalApplicants(0);
      setApplicantsError('Unable to load applicants. Please try again.');
      toast.error('Failed to fetch applicants');
    } finally {
      setLoading(false);
    }
  };

  const selectedJob = jobs.find((job) => job.id === selectedJobId) || jobs[0];

  const getApplicantMatchScore = (applicant: BulkApplicant): MatchScoreResult =>
    calculateMatchScore(
      {
        ...(applicant.profiles || {}),
        expected_ctc: applicant.expected_ctc || applicant.expectedCtc,
        current_ctc: applicant.current_ctc || applicant.currentCtc,
      },
      selectedJob
    );

  const isPriorityApplicant = (applicant: BulkApplicant) => Boolean(applicant.priority_application ?? applicant.priorityApplication);

  const activeApplicants = useMemo(
    () =>
      applicants.filter((applicant) => {
        const email = String(applicant.profiles?.email || '').trim().toLowerCase();
        return !blockedCandidateIds.has(applicant.user_id) && (!email || !blockedCandidateEmails.has(email));
      }),
    [applicants, blockedCandidateIds, blockedCandidateEmails]
  );

  const enrichedApplicants = useMemo(
    () => activeApplicants.map((applicant) => ({ ...applicant, match_score: getApplicantMatchScore(applicant).score })),
    [activeApplicants, selectedJob]
  );

  const visibleApplicants = useMemo(() => {
    return [...enrichedApplicants]
      .filter((applicant) => (statusFilter === 'all' ? true : applicant.status === statusFilter))
      .filter((applicant) => {
        const score = applicant.match_score || 0;
        if (matchScoreFilter === '90_plus') return score >= 90;
        if (matchScoreFilter === '70_89') return score >= 70 && score <= 89;
        if (matchScoreFilter === 'below_70') return score < 70;
        return true;
      })
      .filter((applicant) => {
        if (priorityFilter === 'priority') return isPriorityApplicant(applicant);
        return true;
      })
      .sort((a, b) => {
        const pa = isPriorityApplicant(a);
        const pb = isPriorityApplicant(b);
        if (pa !== pb) return pa ? -1 : 1;
        if (sortMode === 'match_desc') return (b.match_score || 0) - (a.match_score || 0);
        if (sortMode === 'match_asc') return (a.match_score || 0) - (b.match_score || 0);
        return new Date(b.applied_at || 0).getTime() - new Date(a.applied_at || 0).getTime();
      });
  }, [enrichedApplicants, matchScoreFilter, sortMode, statusFilter, priorityFilter]);

  const selectedApplicants = useMemo(
    () => enrichedApplicants.filter((applicant) => selectedIds.has(applicant.id)),
    [enrichedApplicants, selectedIds]
  );

  const visibleIds = visibleApplicants.map((applicant) => applicant.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));

  const statusCounts = {
    applied: activeApplicants.filter((a) => a.status === 'applied').length,
    under_review: activeApplicants.filter((a) => a.status === 'under_review').length,
    shortlisted: activeApplicants.filter((a) => a.status === 'shortlisted').length,
    rejected: activeApplicants.filter((a) => a.status === 'rejected').length,
    accepted: activeApplicants.filter((a) => a.status === 'accepted').length,
  };

  const availableTags = useMemo(
    () => Array.from(new Set(enrichedApplicants.flatMap((applicant) => getApplicantTags(applicant)))),
    [enrichedApplicants]
  );

  const availablePools = useMemo(
    () => Array.from(new Set(enrichedApplicants.flatMap((applicant) => getApplicantTalentPools(applicant)))),
    [enrichedApplicants]
  );

  const filteredJobs = jobs.filter((job) =>
    job.title?.toString().toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const runBulkAction = async (successMessage: string, action: () => Promise<void>) => {
    setProcessing(true);
    try {
      await action();
      toast.success(successMessage);
      setSelectedIds(new Set());
      await fetchApplicants();
    } catch (err) {
      console.error('Bulk action failed:', err);
      toast.error('Bulk action failed. Please check your application metadata columns.');
    } finally {
      setProcessing(false);
      setConfirmation(null);
    }
  };

  const confirmAction = (nextConfirmation: PendingConfirmation) => setConfirmation(nextConfirmation);

  const handleToolbarAction = (action: BulkToolbarAction) => {
    const count = selectedApplicants.length;
    const applicationIds = selectedApplicants.map((applicant) => applicant.id);
    if (count === 0) return;

    if (action.type === 'shortlist') {
      void runBulkAction(`Shortlisted ${count} candidates`, () => bulkUpdateApplicationStatus(applicationIds, 'shortlisted', selectedJobId));
      return;
    }

    if (action.type === 'reject') {
      confirmAction({
        title: 'Reject Candidates',
        message: `Are you sure you want to reject ${count} candidates?`,
        confirmLabel: 'Reject',
        confirmColor: 'error',
        run: () => runBulkAction(`Rejected ${count} candidates`, () => bulkUpdateApplicationStatus(applicationIds, 'rejected', selectedJobId)),
      });
      return;
    }

    if (action.type === 'move_stage') {
      const run = () => runBulkAction(`Moved ${count} candidates to ${action.stage}`, () => bulkMoveToAtsStage(applicationIds, action.stage, selectedJobId));
      if (action.stage === 'Rejected') {
        confirmAction({
          title: 'Reject Candidates',
          message: `Are you sure you want to reject ${count} candidates?`,
          confirmLabel: 'Reject',
          confirmColor: 'error',
          run,
        });
      } else {
        void run();
      }
      return;
    }

    if (action.type === 'add_tags') {
      void runBulkAction(`Tags added to ${count} candidates`, () => bulkSetTags(selectedApplicants, action.values, 'add'));
      return;
    }

    if (action.type === 'remove_tags') {
      void runBulkAction(`Tags removed from ${count} candidates`, () => bulkSetTags(selectedApplicants, action.values, 'remove'));
      return;
    }

    if (action.type === 'add_pool') {
      void runBulkAction(`Added ${count} candidates to talent pool`, () => bulkSetTalentPools(recruiterId, selectedApplicants, action.values, 'add'));
      return;
    }

    if (action.type === 'remove_pool') {
      void runBulkAction(`Removed ${count} candidates from talent pool`, () => bulkSetTalentPools(recruiterId, selectedApplicants, action.values, 'remove'));
      return;
    }

    if (action.type === 'message') {
      setMessageOpen(true);
      return;
    }

    if (action.type === 'export_csv') {
      downloadApplicantsCsv(selectedApplicants, `${selectedJob?.title || 'selected'}-candidates.csv`);
      toast.success(`Exported ${count} candidates`);
    }
  };

  const handleSendBulkMessage = (message: string) => {
    void runBulkAction(`Message sent to ${selectedApplicants.length} candidates`, () => bulkSendMessage(recruiterId, selectedApplicants, message));
    setMessageOpen(false);
  };

  const toggleApplicant = (applicantId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(applicantId)) next.delete(applicantId);
      else next.add(applicantId);
      return next;
    });
  };

  const toggleVisibleApplicants = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleViewApplicant = async (applicant: BulkApplicant) => {
    await trackCandidateProfileView({
      recruiterId,
      candidateId: applicant.user_id,
      jobId: selectedJobId || null,
      source: 'view_applicants',
    });
    setSelectedApplicant(applicant);
    setViewDialogOpen(true);
  };

  const handleStatusChanged = () => {
    void fetchApplicants();
  };

  const handleBlockCandidate = (applicant: BulkApplicant) => {
    recruiterSettingsService.upsertBlockedCandidate(recruiterId, {
      candidateId: applicant.user_id,
      name: applicant.profiles?.name || applicant.profiles?.full_name || 'Candidate',
      email: applicant.profiles?.email || null,
      headline: applicant.profiles?.headline ? String(applicant.profiles?.headline) : null,
      reason: 'Blocked from applicants',
    });

    setBlockedCandidateIds((current) => {
      const next = new Set(current);
      next.add(applicant.user_id);
      return next;
    });
    setBlockedCandidateEmails((current) => {
      const email = String(applicant.profiles?.email || '').trim().toLowerCase();
      if (!email) return current;
      const next = new Set(current);
      next.add(email);
      return next;
    });
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(applicant.id);
      return next;
    });
    toast.success('Candidate blocked from recruiter view');
  };

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="textSecondary">No jobs posted yet. Post a job first to view applicants.</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}
    >
      <Box
        sx={{
          background: 'linear-gradient(135deg, rgba(91,140,255,0.08), rgba(139,92,246,0.07), rgba(255,255,255,0.8))',
          borderRadius: 4,
          border: '1px solid rgba(148, 163, 184, 0.2)',
          boxShadow: '0 18px 50px rgba(15, 23, 42, 0.06)',
          p: { xs: 1.5, md: 2 },
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.25, mb: 1.5 }}>
          <Box>
            <Typography variant="overline" sx={{ color: '#4465F2', fontWeight: 800, letterSpacing: '0.12em' }}>Recruiting pipeline</Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, fontSize: '1.7rem', color: '#0f172a', lineHeight: 1.1 }}>Applicants</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={`${totalApplicants} total`} color="primary" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
            <Chip label={selectedJob?.title || 'Selected job'} variant="outlined" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1.25 }}>
          {[
            { label: 'Total applicants', value: totalApplicants || activeApplicants.length, accent: '#4465F2' },
            { label: 'Shortlisted', value: statusCounts.shortlisted, accent: '#10B981' },
            { label: 'Under review', value: statusCounts.under_review, accent: '#F59E0B' },
            { label: 'Rejected', value: statusCounts.rejected, accent: '#EF4444' },
          ].map((item, index) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
              <Paper
                sx={{
                  p: 1.5,
                  borderRadius: 3,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(248,250,255,0.92))',
                  border: '1px solid rgba(148,163,184,0.18)',
                  boxShadow: '0 14px 30px rgba(15,23,42,0.05)',
                }}
              >
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.66rem' }}>{item.label}</Typography>
                <Typography variant="h5" sx={{ mt: 0.7, fontWeight: 800, fontSize: '1.3rem', color: item.accent }}>{item.value}</Typography>
              </Paper>
            </motion.div>
          ))}
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '280px minmax(0, 1fr)' },
          gap: { xs: 1.5, lg: 2 },
          alignItems: 'start',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: '100%',
            minWidth: 0,
            minHeight: { lg: 620 },
            height: { lg: 'calc(100vh - 116px)' },
            maxHeight: { lg: 'calc(100vh - 116px)' },
            display: 'flex',
            flexDirection: 'column',
            position: { lg: 'sticky' },
            top: { lg: 96 },
          }}
        >
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
            <Card
              sx={{
                flex: '0 0 auto',
                mb: 1.25,
                borderRadius: 3,
                border: '1px solid rgba(148, 163, 184, 0.22)',
                boxShadow: '0 18px 50px rgba(15, 23, 42, 0.06)',
                background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
              }}
            >
              <CardContent sx={{ p: 1.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5, color: '#0f172a' }}>
                  Job Openings
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 1.25 }}>
                  Ordered by latest posting date
                </Typography>
                <TextField
                  placeholder="Search jobs"
                  size="small"
                  fullWidth
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: '#fff',
                      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
                    },
                  }}
                />
              </CardContent>
            </Card>
          </motion.div>

          <Card
            sx={{
              flex: '1 1 auto',
              overflow: 'hidden',
              width: '100%',
              minHeight: { xs: 360, lg: 0 },
              borderRadius: 3,
              border: '1px solid rgba(148, 163, 184, 0.22)',
              boxShadow: '0 24px 70px rgba(15, 23, 42, 0.08)',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(245,249,255,0.96))',
            }}
          >
            <CardContent sx={{ height: '100%', p: 0.75 }}>
              <Box
                sx={{
                  height: '100%',
                  overflowY: 'auto',
                  pr: 0.75,
                  scrollbarWidth: 'thin',
                  '&::-webkit-scrollbar': { width: 8 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(100,116,139,0.35)', borderRadius: 99 },
                }}
              >
                <Box sx={{ display: 'grid', gap: 0.9 }}>
                  {filteredJobs.map((job) => (
                    <motion.div
                      key={job.id}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.18 }}
                    >
                      <Box
                        onClick={() => setSelectedJobId(job.id)}
                        sx={{
                          p: 1.35,
                          minHeight: 74,
                          borderRadius: 2,
                          cursor: 'pointer',
                          border: selectedJobId === job.id ? '1px solid rgba(68,101,242,0.45)' : '1px solid rgba(148, 163, 184, 0.22)',
                          background: selectedJobId === job.id
                            ? 'linear-gradient(135deg, rgba(68,101,242,0.12), rgba(14,165,233,0.08))'
                            : '#fff',
                          boxShadow: selectedJobId === job.id
                            ? '0 20px 40px rgba(68, 101, 242, 0.14)'
                            : '0 10px 28px rgba(15, 23, 42, 0.04)',
                          transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                          '&:hover': {
                            boxShadow: '0 18px 40px rgba(15,23,42,0.09)',
                            borderColor: 'rgba(68,101,242,0.55)',
                          },
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5, color: '#020617' }}>{job.title}</Typography>
                        <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>
                          Posted {job.created_at ? format(new Date(job.created_at as string), 'dd MMM yyyy') : 'Unknown'}
                        </Typography>
                      </Box>
                    </motion.div>
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ width: '100%', minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
            <Card
              sx={{
                mb: 1.25,
                borderRadius: 3,
                border: '1px solid rgba(96, 165, 250, 0.28)',
                boxShadow: '0 20px 60px rgba(30, 64, 175, 0.1)',
                background: 'linear-gradient(145deg, #ffffff 0%, #F5F9FF 58%, #EEF4FF 100%)',
                overflow: 'hidden',
              }}
            >
              <CardContent sx={{ p: { xs: 1.5, md: 1.75 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.25, mb: 1.25, pb: 1.25, borderBottom: '1px solid rgba(148,163,184,0.2)' }}>
                  <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 1.1 }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: '#DCEBFF', color: '#1D4B86', fontWeight: 900 }}>
                      {String(selectedJob.title || 'J').charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="overline" sx={{ color: '#0A66C2', fontWeight: 900, letterSpacing: '0.08em', lineHeight: 1 }}>Selected job</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: '#020617', lineHeight: 1.15 }} noWrap>{selectedJob.title}</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {selectedJob.status ? `${selectedJob.status} - ` : ''}
                        Posted {selectedJob.created_at ? format(new Date(selectedJob.created_at as string), 'dd MMM yyyy') : 'Unknown'} - {totalApplicants} applicant(s)
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Chip label={`${totalApplicants} applicants`} sx={{ fontWeight: 800, color: '#28508A', bgcolor: '#E7F0FF', border: '1px solid #C7DBFF' }} />
                    {selectedIds.size > 0 && <Chip color="primary" label={selectedText(selectedIds.size)} sx={{ fontWeight: 800, borderRadius: 1 }} />}
                  </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(5, minmax(110px, 1fr))' }, gap: 0.8, my: 1.25 }}>
                  {Object.entries(statusCounts).map(([status, count], index) => (
                    <Paper
                      key={status}
                      variant="outlined"
                      sx={{
                        p: 1.1,
                        borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.82)',
                        borderColor: ['#BBD7FF', '#F5D58A', '#B7E9DA', '#FECACA', '#C4B5FD'][index] || '#DCE6F2',
                        boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{labelize(status)}</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>{count}</Typography>
                    </Paper>
                  ))}
                </Box>

                <Tabs value={statusFilter} onChange={(_, value) => setStatusFilter(value)} sx={{ mb: 0, borderBottom: '1px solid #e0e0e0' }} variant="scrollable">
                  <Tab label={`All (${activeApplicants.length})`} value="all" sx={{ textTransform: 'none', minHeight: 38, py: 0.75 }} />
                  <Tab label={`Applied (${statusCounts.applied})`} value="applied" sx={{ textTransform: 'none', minHeight: 38, py: 0.75 }} />
                  <Tab label={`Under Review (${statusCounts.under_review})`} value="under_review" sx={{ textTransform: 'none', minHeight: 38, py: 0.75 }} />
                  <Tab label={`Shortlisted (${statusCounts.shortlisted})`} value="shortlisted" sx={{ textTransform: 'none', minHeight: 38, py: 0.75 }} />
                  <Tab label={`Rejected (${statusCounts.rejected})`} value="rejected" sx={{ textTransform: 'none', minHeight: 38, py: 0.75 }} />
                </Tabs>

                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'wrap',
                    mt: 1.25,
                    pt: 1.1,
                    borderTop: '1px solid rgba(148,163,184,0.14)',
                    '& .MuiFormControl-root': { width: { xs: '100%', sm: 160 } },
                    '& .MuiInputBase-root': { height: 32, fontSize: 12, borderRadius: 1.5 },
                    '& .MuiSelect-select': { py: 0.5, pl: 1.25 },
                    '& .MuiInputLabel-root': { fontSize: 12 },
                    '& .MuiInputLabel-root:not(.MuiInputLabel-shrink)': { transform: 'translate(12px, 7px) scale(1)' },
                    '& .MuiSvgIcon-root': { fontSize: 18 },
                  }}
                >
                  <FormControl size="small">
                    <InputLabel>Sort By Match Score</InputLabel>
                    <Select value={sortMode} label="Sort By Match Score" onChange={(event) => setSortMode(event.target.value as SortMode)}>
                      <MenuItem value="applied_desc">Newest Applied</MenuItem>
                      <MenuItem value="match_desc">Match Score: High to Low</MenuItem>
                      <MenuItem value="match_asc">Match Score: Low to High</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small">
                    <InputLabel>Filter By Match Score</InputLabel>
                    <Select value={matchScoreFilter} label="Filter By Match Score" onChange={(event) => setMatchScoreFilter(event.target.value as MatchScoreFilter)}>
                      <MenuItem value="all">All Scores</MenuItem>
                      <MenuItem value="90_plus">90+ Green</MenuItem>
                      <MenuItem value="70_89">70-89 Orange</MenuItem>
                      <MenuItem value="below_70">Below 70 Red</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small">
                    <InputLabel>Filter By Featured</InputLabel>
                    <Select value={priorityFilter} label="Filter By Featured" onChange={(event) => setPriorityFilter(event.target.value as 'all' | 'priority')}>
                      <MenuItem value="all">All Applicants</MenuItem>
                      <MenuItem value="priority">Top Applicants Only</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </CardContent>
            </Card>
          </motion.div>

          <Box sx={{ mb: 1.25 }}>
            <BulkActionsToolbar
              selectedCount={selectedIds.size}
              availableTags={availableTags}
              availablePools={availablePools}
              processing={processing}
              onAction={handleToolbarAction}
              onClear={() => setSelectedIds(new Set())}
            />
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : applicantsError ? (
            <Alert
              severity="error"
              action={<Button color="inherit" size="small" onClick={fetchApplicants}>Retry</Button>}
              sx={{ mb: 2 }}
            >
              {applicantsError}
            </Alert>
          ) : visibleApplicants.length === 0 ? (
            <Paper sx={{ minHeight: 260, display: 'grid', placeItems: 'center', textAlign: 'center', p: 3, borderRadius: 3, border: '1px dashed #B8C9E2', background: 'linear-gradient(145deg, rgba(255,255,255,0.82), rgba(239,246,255,0.82))' }}>
              <Box>
                <Avatar sx={{ width: 52, height: 52, mx: 'auto', mb: 1.2, bgcolor: '#DCEBFF', color: '#28508A' }}><PeopleIcon /></Avatar>
                <Typography variant="h6" sx={{ fontWeight: 850, color: '#16325C', mb: 0.5 }}>Your candidate space is ready</Typography>
                <Typography variant="body2" sx={{ color: '#64748B', maxWidth: 360 }}>Applicants for this job will appear here as soon as candidates apply. Adjust the filters if you expect existing candidates.</Typography>
              </Box>
            </Paper>
          ) : (
            <Paper
              sx={{
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                overflow: 'hidden',
                border: '1px solid rgba(148, 163, 184, 0.24)',
                borderRadius: 3,
                boxShadow: '0 24px 70px rgba(15, 23, 42, 0.08)',
                bgcolor: '#fff',
              }}
            >
              <TableContainer
                sx={{
                  width: '100%',
                  maxWidth: '100%',
                  maxHeight: 'calc(100vh - 280px)',
                  overflowX: 'auto',
                  overflowY: 'auto',
                  scrollbarWidth: 'thin',
                  '&::-webkit-scrollbar': { height: 10, width: 10 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(100,116,139,0.35)', borderRadius: 99 },
                  '&::-webkit-scrollbar-track': { bgcolor: 'rgba(226,232,240,0.7)' },
                }}
              >
                <Table
                  stickyHeader
                  size="small"
                  sx={{
                    width: { xs: 1080, lg: '100%' },
                    minWidth: 1080,
                    tableLayout: 'auto',
                    '& .MuiTableCell-root': {
                      px: 0.75,
                      py: 0.55,
                      fontSize: 12,
                      lineHeight: 1.25,
                    },
                    '& .MuiCheckbox-root': {
                      p: 0.5,
                    },
                    '& .MuiTableRow-root': {
                      height: 40,
                    },
                    '& .MuiChip-root': {
                      height: 22,
                      maxWidth: '100%',
                    },
                    '& .MuiChip-label': {
                      px: 0.75,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell padding="none" sx={{ bgcolor: '#f8fafc', width: 70, minWidth: 70, maxWidth: 70 }}>
                        <Box sx={{ width: 70, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Checkbox
                            indeterminate={!allVisibleSelected && someVisibleSelected}
                            checked={allVisibleSelected}
                            onChange={toggleVisibleApplicants}
                            inputProps={{ 'aria-label': 'Select all candidates' }}
                            sx={{ width: 32, height: 32 }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 900, bgcolor: '#f8fafc', width: '13%', pl: 2 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 900, bgcolor: '#f8fafc', width: '15%' }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 900, bgcolor: '#f8fafc', width: '11%' }}>Tags</TableCell>
                      <TableCell sx={{ fontWeight: 900, bgcolor: '#f8fafc', width: '11%' }}>Talent Pool</TableCell>
                      <TableCell sx={{ fontWeight: 900, bgcolor: '#f8fafc', width: '10%' }}>ATS Stage</TableCell>
                      <TableCell sx={{ fontWeight: 900, bgcolor: '#f8fafc', width: '9%' }}>Match Score</TableCell>
                      <TableCell sx={{ fontWeight: 900, bgcolor: '#f8fafc', width: '7%' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 900, bgcolor: '#f8fafc', width: '7%' }}>Applied</TableCell>
                      <TableCell sx={{ fontWeight: 900, bgcolor: '#f8fafc', width: '9%' }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visibleApplicants.map((applicant) => {
                      const matchScore = getApplicantMatchScore(applicant);
                      const matchHex = getMatchScoreHex(matchScore.score);
                      const profile = applicant.profiles;
                      const checked = selectedIds.has(applicant.id);
                      const isUnlocked = Boolean(unlockedApplicants[applicant.user_id]);
                      return (
                        <TableRow key={applicant.id} hover selected={checked}>
                          <TableCell padding="none" sx={{ width: 70, minWidth: 70, maxWidth: 70 }}>
                            <Box sx={{ width: 70, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Checkbox checked={checked} onChange={() => toggleApplicant(applicant.id)} inputProps={{ 'aria-label': `Select ${profile?.name || 'candidate'}` }} sx={{ width: 32, height: 32 }} />
                            </Box>
                          </TableCell>
                          <TableCell sx={{ pl: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography sx={{ fontWeight: 800, color: '#020617', fontSize: 12 }} noWrap>{profile?.name || profile?.full_name || 'Unknown'}</Typography>
                              {isPriorityApplicant(applicant) && (
                                <Chip icon={<StarIcon sx={{ color: '#F59E0B', fontSize: 16 }} />} size="small" color="warning" sx={{ fontWeight: 800, minWidth: 28, px: 0.4 }} />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {isUnlocked ? (
                              <Typography variant="body2" sx={{ fontSize: 12 }} noWrap>
                                {profile?.email || 'Not provided'}
                              </Typography>
                            ) : (
                              <Chip
                                icon={<LockIcon />}
                                label="Email Locked"
                                size="small"
                                variant="filled"
                                sx={{ fontWeight: 800 }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap', minWidth: 0 }}>
                              {(() => {
                                const existingTags = getApplicantTags(applicant).slice(0, 3);
                                const assignedTags = (tagAssignmentsByCandidate[applicant.user_id] || []).map((t) => t.name).slice(0, 3);
                                const allTags = Array.from(new Set([...existingTags, ...assignedTags]));
                                return allTags.length > 0
                                  ? allTags.map((tag) => <Chip key={tag} label={tag} size="small" variant="outlined" />)
                                  : <Typography variant="caption" color="text.secondary">No tags</Typography>;
                              })()}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap', minWidth: 0 }}>
                              {getApplicantTalentPools(applicant).slice(0, 2).map((pool) => <Chip key={pool} label={pool} size="small" color="info" variant="outlined" />)}
                              {getApplicantTalentPools(applicant).length === 0 && <Typography variant="caption" color="text.secondary">None</Typography>}
                            </Box>
                          </TableCell>
                          <TableCell><Chip label={getApplicantStage(applicant)} size="small" sx={{ borderRadius: 1, fontWeight: 700 }} /></TableCell>
                          <TableCell>
                            <Chip label={matchScore.label} size="small" sx={{ fontWeight: 800, bgcolor: `${matchHex}14`, color: matchHex, border: `1px solid ${matchHex}33` }} />
                          </TableCell>
                          <TableCell><Chip label={labelize(applicant.status)} size="small" color={getStatusColor(applicant.status)} variant="filled" /></TableCell>
                          <TableCell><Typography variant="body2" sx={{ fontSize: 12 }} noWrap>{applicant.applied_at ? format(new Date(applicant.applied_at), 'dd MMM yyyy') : 'Unknown'}</Typography></TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => { void handleViewApplicant(applicant); }} title="View details"><ViewIcon fontSize="small" /></IconButton>
                            {applicant.resume_url && isUnlocked && (
                              <Tooltip title={isUnlocked ? 'View resume' : 'Unlock candidate to download resume.'}>
                                <span>
                                  <IconButton
                                    size="small"
                                    href={String(applicant.resume_url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="View resume"
                                  >
                                    <DownloadIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                            {applicant.resume_url && !isUnlocked && (
                              <Tooltip title="Unlock candidate to download resume.">
                                <span>
                                  <IconButton size="small" disabled title="Unlock candidate to download resume.">
                                    <LockIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                            <Tooltip title="Block candidate">
                              <IconButton size="small" onClick={() => handleBlockCandidate(applicant)} title="Block candidate">
                                <BlockIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <IconButton size="small" onClick={() => onChatClick?.(applicant.user_id, profile?.name || profile?.full_name || 'Candidate')} title="Send message"><MessageIcon fontSize="small" /></IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={totalApplicants}
                page={page}
                onPageChange={(_, nextPage) => setPage(nextPage)}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={pageSizeOptions}
                onRowsPerPageChange={(event) => {
                  setRowsPerPage(parseInt(event.target.value, 10));
                  setPage(0);
                }}
              />
            </Paper>
          )}
        </Box>
      </Box>

      {selectedIds.size > 0 && (
        <Paper
          elevation={10}
          sx={{
            position: 'fixed',
            left: { xs: 16, md: '50%' },
            right: { xs: 16, md: 'auto' },
            bottom: 18,
            transform: { md: 'translateX(-50%)' },
            zIndex: 1300,
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            borderRadius: 2,
            border: '1px solid rgba(10, 102, 194, 0.18)',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{selectedText(selectedIds.size)}</Typography>
          <Button size="small" variant="contained" disabled={processing} onClick={() => handleToolbarAction({ type: 'shortlist' })}>Shortlist</Button>
          <Button size="small" color="error" disabled={processing} onClick={() => handleToolbarAction({ type: 'reject' })}>Reject</Button>
          <Button size="small" disabled={processing} onClick={() => setSelectedIds(new Set())}>Deselect All</Button>
        </Paper>
      )}

      {selectedApplicant && (
        <ApplicantDetailsModal
          open={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
          applicantId={selectedApplicant.id}
          candidateId={selectedApplicant.user_id}
          jobId={selectedJobId}
          recruiterId={recruiterId}
          availableTags={recruiterTags}
          onStatusChange={handleStatusChanged}
          onTagsChange={fetchTags}
          onUnlocked={() => setUnlockedApplicants((current) => ({ ...current, [selectedApplicant.user_id]: true }))}
        />
      )}

      <BulkMessageDialog
        open={messageOpen}
        selectedCount={selectedApplicants.length}
        loading={processing}
        onClose={() => setMessageOpen(false)}
        onSend={handleSendBulkMessage}
      />

      <BulkConfirmationDialog
        open={Boolean(confirmation)}
        title={confirmation?.title || ''}
        message={confirmation?.message || ''}
        confirmLabel={confirmation?.confirmLabel}
        confirmColor={confirmation?.confirmColor}
        loading={processing}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => void confirmation?.run()}
      />
    </motion.div>
  );
};
