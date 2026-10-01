import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import type { RecruiterCredits } from '@types';
import {
  getResumeUnlockContext,
  unlockCandidateContact,
} from '@utils/resumeUnlocks';

interface ResumeUnlockContactProps {
  recruiterId?: string;
  candidateId?: string;
  jobId?: string | null;
  email?: string | null;
  phone?: string | null;
  compact?: boolean;
  onUnlocked?: (contact: { email?: string | null; phone?: string | null; credits?: RecruiterCredits | null }) => void;
}

const MASKED_VALUE = '**************';

export const ResumeUnlockContact: React.FC<ResumeUnlockContactProps> = ({
  recruiterId,
  candidateId,
  jobId,
  email,
  phone,
  compact = false,
  onUnlocked,
}) => {
  const [credits, setCredits] = useState<RecruiterCredits | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [visibleEmail, setVisibleEmail] = useState<string | null | undefined>(email);
  const [visiblePhone, setVisiblePhone] = useState<string | null | undefined>(phone);
  const [loading, setLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const onUnlockedRef = useRef(onUnlocked);

  useEffect(() => {
    onUnlockedRef.current = onUnlocked;
  }, [onUnlocked]);

  useEffect(() => {
    let active = true;

    const loadContext = async () => {
      if (!recruiterId || !candidateId) return;
      setLoading(true);
      try {
        const context = await getResumeUnlockContext(recruiterId, candidateId);
        if (!active) return;
        setCredits(context.credits);
        setUnlocked(context.isUnlocked);
        if (context.isUnlocked) {
          const result = await unlockCandidateContact(candidateId, jobId);
          if (!active) return;
          setVisibleEmail(result.candidate_email || email);
          setVisiblePhone(result.candidate_phone || phone);
          setCredits((current) => current
            ? {
                ...current,
                available_credits: result.available_credits,
                used_credits: result.used_credits,
              }
            : current
          );
          onUnlockedRef.current?.({
            email: result.candidate_email || email,
            phone: result.candidate_phone || phone,
            credits: {
              ...(context.credits || {
                id: '',
                recruiter_id: recruiterId || '',
                created_at: '',
                updated_at: '',
              }),
              available_credits: result.available_credits,
              used_credits: result.used_credits,
            } as RecruiterCredits,
          });
        }
      } catch (err) {
        console.error('Failed to load resume unlock context:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadContext();
    return () => {
      active = false;
    };
  }, [candidateId, email, jobId, phone, recruiterId]);

  useEffect(() => {
    setVisibleEmail(email);
    setVisiblePhone(phone);
  }, [email, phone]);

  const isUnlimited = credits?.available_credits === -1;
  const hasCredits = isUnlimited || (credits?.available_credits ?? 0) > 0;
  const canUnlock = Boolean(recruiterId && candidateId && hasCredits && !loading && !unlocking);

  const creditLabel = useMemo(() => {
    if (loading) return 'Checking credits';
    if (isUnlimited) return 'Remaining Credits: ∞';
    return `Remaining Credits: ${credits?.available_credits ?? 0}`;
  }, [credits?.available_credits, isUnlimited, loading]);

  const handleUnlock = async () => {
    if (!candidateId || !canUnlock) return;
    setUnlocking(true);
    try {
      const result = await unlockCandidateContact(candidateId, jobId);
      const nextCredits = {
        ...(credits || {
          id: '',
          recruiter_id: recruiterId || '',
          created_at: '',
          updated_at: '',
        }),
        available_credits: result.available_credits,
        used_credits: result.used_credits,
      } as RecruiterCredits;

      setCredits(nextCredits);
      setUnlocked(true);
      setVisibleEmail(result.candidate_email || email);
      setVisiblePhone(result.candidate_phone || phone);
      setConfirmOpen(false);
      onUnlocked?.({
        email: result.candidate_email || email,
        phone: result.candidate_phone || phone,
        credits: nextCredits,
      });
      toast.success(result.already_unlocked ? 'Candidate contact already unlocked' : 'Candidate contact unlocked');
    } catch (err: any) {
      console.error('Failed to unlock candidate contact:', err);
      toast.error(err?.message || 'Failed to unlock contact');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <Box
      sx={{
        p: compact ? 0 : 1.5,
        borderRadius: compact ? 0 : 2,
        border: compact ? 'none' : '1px solid rgba(10, 102, 194, 0.16)',
        bgcolor: compact ? 'transparent' : 'rgba(10, 102, 194, 0.035)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
        <Typography variant={compact ? 'body2' : 'subtitle2'} sx={{ fontWeight: 800 }}>
          Contact Details
        </Typography>
        {unlocked && (
          <Chip
            icon={<CheckCircleIcon />}
            label="Unlocked"
            size="small"
            color="success"
            variant="outlined"
            sx={{ fontWeight: 800 }}
          />
        )}
      </Box>

      <Box sx={{ display: 'grid', gap: 0.75 }}>
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {unlocked ? <PhoneIcon fontSize="small" /> : <LockIcon fontSize="small" color="action" />}
          <strong>Phone:</strong> {unlocked ? visiblePhone || 'Not provided' : MASKED_VALUE}
        </Typography>
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {unlocked ? <EmailIcon fontSize="small" /> : <LockIcon fontSize="small" color="action" />}
          <strong>Email:</strong> {unlocked ? visibleEmail || 'Not provided' : MASKED_VALUE}
        </Typography>
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {unlocked ? <LockOpenIcon fontSize="small" color="success" /> : <LockIcon fontSize="small" color="action" />}
          <strong>Resume:</strong> {unlocked ? 'Unlocked' : 'Locked'}
        </Typography>
      </Box>

      {!unlocked && (
        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700 }}>
              Cost: 1 Credit
            </Typography>
            <Typography variant="caption" color={hasCredits ? 'text.secondary' : 'error'} sx={{ fontWeight: 800 }}>
              {hasCredits ? creditLabel : 'No Credits Remaining'}
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={loading ? <CircularProgress size={16} /> : <LockOpenIcon />}
            disabled={!canUnlock}
            onClick={() => setConfirmOpen(true)}
            sx={{ bgcolor: '#0A66C2', fontWeight: 800, textTransform: 'none' }}
          >
            {hasCredits ? 'Unlock Candidate' : 'No Credits Remaining'}
          </Button>
        </Box>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Unlock Candidate Contact Details?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Unlocking reveals this candidate&apos;s phone and email for your recruiter account.
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Typography variant="body2"><strong>Credits Required:</strong> 1</Typography>
            <Typography variant="body2"><strong>{creditLabel}</strong></Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={unlocking}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUnlock}
            disabled={unlocking || !canUnlock}
            endIcon={unlocking ? <CircularProgress size={18} /> : undefined}
            sx={{ bgcolor: '#0A66C2', fontWeight: 800 }}
          >
            {unlocking ? 'Unlocking...' : 'Unlock'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
