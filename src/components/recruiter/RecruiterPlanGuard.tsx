import React from 'react';
import { Box, Button, Dialog, DialogContent, Stack, Typography } from '@mui/material';
import {
  AllInclusive as AllInclusiveIcon,
  LockOpen as LockOpenIcon,
  Logout as LogoutIcon,
  WorkspacePremium as WorkspacePremiumIcon,
  WorkOutline as WorkOutlineIcon,
} from '@mui/icons-material';
import type { RecruiterCreditStatus } from '@services/recruiterCredits';
import Swal from '@utils/sweetAlert';

const NUDGE_INTERVAL_MS = 3 * 60 * 1000;
const NUDGE_CHECK_MS = 5 * 1000;
// Stored outside React so page changes/remounts do not restart the 3-minute cycle.
const NUDGE_DUE_KEY = 'jp_recruiter_upgrade_nudge_due';

const readNudgeDue = () => {
  const stored = Number(window.sessionStorage.getItem(NUDGE_DUE_KEY));
  if (Number.isFinite(stored) && stored > 0) return stored;
  const due = Date.now() + NUDGE_INTERVAL_MS;
  window.sessionStorage.setItem(NUDGE_DUE_KEY, String(due));
  return due;
};

const svg = (path: string) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
const CROWN = 'M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z';
const NUDGE_BENEFITS = [
  { color: '#2563EB', label: 'Unlimited job postings', path: 'M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 0h-4V4h4v2z' },
  { color: '#0E9F8E', label: 'Unlimited candidate unlocks', path: 'M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z' },
  { color: '#7C3AED', label: 'AI matching, analytics & all recruiter tools', path: 'M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z' },
];

const buildNudgeHtml = (credits: number | null) => `
  <div class="jp-pro-hero">
    <span class="jp-pro-orb jp-pro-orb--a"></span>
    <span class="jp-pro-orb jp-pro-orb--b"></span>
    <div class="jp-pro-crown">${svg(CROWN)}</div>
    <span class="jp-pro-badge">Recruiter Pro</span>
    <h2 class="jp-pro-title">Hire faster. Hire without limits.</h2>
    <p class="jp-pro-sub">Top recruiters on Jobpoyt close roles faster with Pro.</p>
  </div>
  <div class="jp-pro-body">
    ${credits !== null ? `<div class="jp-pro-credits"><strong>${Number(credits)}</strong> free credits left on your plan</div>` : ''}
    <ul class="jp-pro-list">
      ${NUDGE_BENEFITS.map((item) => `
        <li>
          <span class="jp-pro-ico" style="color:${item.color};background:${item.color}1A">${svg(item.path)}</span>
          <span>${item.label}</span>
        </li>`).join('')}
    </ul>
  </div>
`;

type RecruiterPlanGuardProps = {
  status: RecruiterCreditStatus | null;
  onUpgrade: () => void;
  onLogout: () => void;
};

const PRO_BENEFITS = [
  { icon: <AllInclusiveIcon fontSize="small" />, label: 'Unlimited job postings' },
  { icon: <LockOpenIcon fontSize="small" />, label: 'Unlimited candidate unlocks — contact, resume & full profile' },
  { icon: <WorkOutlineIcon fontSize="small" />, label: 'All recruiter tools, analytics and AI features' },
];

export const RecruiterPlanGuard: React.FC<RecruiterPlanGuardProps> = ({ status, onUpgrade, onLogout }) => {
  const isFree = status?.planState === 'free';
  const isExpired = status?.planState === 'expired';
  const creditsRef = React.useRef<number | null>(null);
  const onUpgradeRef = React.useRef(onUpgrade);
  creditsRef.current = status?.availableCredits ?? null;
  onUpgradeRef.current = onUpgrade;

  React.useEffect(() => {
    if (!isFree) return undefined;
    readNudgeDue();
    const timer = window.setInterval(async () => {
      if (Date.now() < readNudgeDue()) return;
      if (document.visibilityState !== 'visible' || Swal.isVisible()) return;
      window.sessionStorage.setItem(NUDGE_DUE_KEY, String(Date.now() + NUDGE_INTERVAL_MS));
      const result = await Swal.fire({
        html: buildNudgeHtml(creditsRef.current),
        width: 460,
        showCancelButton: true,
        showCloseButton: true,
        confirmButtonText: 'Upgrade to Pro',
        cancelButtonText: 'Maybe later',
        reverseButtons: true,
        customClass: {
          popup: 'ac-sw-popup jp-pro-popup',
          htmlContainer: 'jp-pro-html',
          actions: 'jp-pro-actions',
          confirmButton: 'jp-pro-confirm',
          cancelButton: 'jp-pro-cancel',
          closeButton: 'jp-pro-close',
        },
      });
      if (result.isConfirmed) onUpgradeRef.current();
    }, NUDGE_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [isFree]);

  return (
    <>
      <Dialog
        open={isExpired}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown
        onClose={() => undefined}
        slotProps={{ backdrop: { sx: { backdropFilter: 'blur(6px)', backgroundColor: 'rgba(6, 21, 45, 0.6)' } } }}
        PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}
      >
        <Box sx={{ px: 3.5, py: 3, color: '#fff', background: 'radial-gradient(circle at 90% 10%, rgba(56,189,248,0.35), transparent 40%), linear-gradient(120deg, #06152D 0%, #0B2548 55%, #122F63 100%)' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#FCD34D' }}>
            Subscription expired
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>Renew Recruiter Pro to continue hiring</Typography>
          <Typography sx={{ mt: 1, fontSize: 14, color: 'rgba(226,232,240,0.88)' }}>
            Your plan ended{status?.planEndDate ? ` on ${new Date(status.planEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}.
            Job posting, candidate unlocks and recruiter tools are paused until you renew.
          </Typography>
        </Box>
        <DialogContent sx={{ px: 3.5, py: 3 }}>
          <Stack spacing={1.4}>
            {PRO_BENEFITS.map((benefit) => (
              <Box key={benefit.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.4 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#2563EB', bgcolor: 'rgba(37,99,235,0.1)', flexShrink: 0 }}>
                  {benefit.icon}
                </Box>
                <Typography sx={{ fontSize: 14, color: '#0F172A' }}>{benefit.label}</Typography>
              </Box>
            ))}
          </Stack>
          <Box sx={{ mt: 3, display: 'flex', gap: 1.2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<WorkspacePremiumIcon />}
              onClick={onUpgrade}
              sx={{ flex: 1, minWidth: 200, borderRadius: 2.5, textTransform: 'none', fontWeight: 700, background: 'linear-gradient(135deg, #2563EB, #7C3AED)', boxShadow: '0 12px 26px rgba(79,70,229,0.3)' }}
            >
              View plans & renew
            </Button>
            <Button variant="outlined" size="large" startIcon={<LogoutIcon />} onClick={onLogout} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600 }}>
              Logout
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RecruiterPlanGuard;
