import React from 'react';
import { Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, Stack, Switch, Typography } from '@mui/material';
import {
  WorkspacePremium as WorkspacePremiumIcon,
  CalendarMonth as CalendarMonthIcon,
  CurrencyRupee as CurrencyRupeeIcon,
  AccessTime as AccessTimeIcon,
  ReceiptLong as ReceiptLongIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { formatDate } from '@utils/index';
import { buildSubscriptionInvoice, createInvoicePdf, invoiceFileName } from '@services/invoice';

export interface SubscriptionSummaryData {
  id?: string | null;
  user_id?: string | null;
  plan?: string | null;
  amount?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  auto_renew?: boolean | null;
  payment_id?: string | null;
}

interface SubscriptionSummaryCardProps {
  subscription: SubscriptionSummaryData | null | undefined;
  loading?: boolean;
  onRenew?: () => void;
  onToggleAutoRenew?: (autoRenew: boolean) => void;
  title?: string;
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free Plan',
  basic: 'Basic Plan',
  premium: 'Premium Plan',
  premium_monthly: 'Premium (Monthly)',
  premium_3_month: 'Premium (3 Months)',
  pro: 'Pro Plan',
  enterprise: 'Enterprise Plan',
};

const formatPlanName = (plan?: string | null): string => {
  if (!plan) return 'Free Plan';
  const key = String(plan).toLowerCase().trim();
  if (PLAN_LABELS[key]) return PLAN_LABELS[key];
  return `${key.charAt(0).toUpperCase()}${key.slice(1)} Plan`;
};

const getDaysRemaining = (endDate?: string | null): number | null => {
  if (!endDate) return null;
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - now) / (24 * 60 * 60 * 1000));
};

const SubscriptionInvoicePanel: React.FC<{ subscription: SubscriptionSummaryData }> = ({ subscription }) => {
  const [busy, setBusy] = React.useState<'view' | 'download' | null>(null);
  const [preview, setPreview] = React.useState<{ url: string; fileName: string; number: string } | null>(null);

  React.useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
  }, [preview?.url]);

  const generate = async () => {
    const invoice = await buildSubscriptionInvoice(String(subscription.user_id), subscription as Record<string, unknown>);
    const doc = await createInvoicePdf(invoice);
    return { doc, invoice };
  };

  const handleView = async () => {
    setBusy('view');
    try {
      const { doc, invoice } = await generate();
      const url = URL.createObjectURL(doc.output('blob'));
      setPreview({ url, fileName: invoiceFileName(invoice), number: invoice.invoiceNumber });
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      toast.error('Could not generate your invoice. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async () => {
    if (preview) {
      const link = document.createElement('a');
      link.href = preview.url;
      link.download = preview.fileName;
      link.click();
      return;
    }
    setBusy('download');
    try {
      const { doc, invoice } = await generate();
      doc.save(invoiceFileName(invoice));
      toast.success('Invoice downloaded');
    } catch (error) {
      console.error('Failed to download invoice:', error);
      toast.error('Could not download your invoice. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Box sx={{ mt: 2.4, p: 1.6, borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box sx={{ width: 38, height: 38, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#2563EB', bgcolor: 'rgba(37,99,235,0.1)', flexShrink: 0 }}>
            <ReceiptLongIcon fontSize="small" />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: '#0F172A' }}>Subscription invoice</Typography>
            <Typography sx={{ color: '#64748B', fontSize: 11.5 }}>Official tax invoice with plan, billing and payment details</Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={busy === 'view' ? <CircularProgress size={14} /> : <VisibilityIcon fontSize="small" />}
            disabled={busy !== null}
            onClick={handleView}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
          >
            View invoice
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={busy === 'download' ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon fontSize="small" />}
            disabled={busy !== null}
            onClick={handleDownload}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5, boxShadow: 'none', background: 'linear-gradient(135deg, #2563EB, #4F46E5)' }}
          >
            Download PDF
          </Button>
        </Stack>
      </Box>

      <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pr: 1.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 16 }}>Invoice</Typography>
            <Typography sx={{ color: '#64748B', fontSize: 12 }}>{preview?.number}</Typography>
          </Box>
          <IconButton aria-label="Close invoice" onClick={() => setPreview(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, height: { xs: '70vh', md: '78vh' }, bgcolor: '#E2E8F0' }}>
          {preview && (
            <Box component="iframe" title="Subscription invoice" src={`${preview.url}#toolbar=0&view=FitH`} sx={{ width: '100%', height: '100%', border: 0, display: 'block' }} />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={() => setPreview(null)} sx={{ textTransform: 'none' }}>Close</Button>
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleDownload} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export const SubscriptionSummaryCard: React.FC<SubscriptionSummaryCardProps> = ({
  subscription,
  loading = false,
  onRenew,
  onToggleAutoRenew,
  title = 'My Subscription',
}) => {
  const isFree = !subscription || !subscription.plan || String(subscription.plan).toLowerCase() === 'free';
  const daysRemaining = getDaysRemaining(subscription?.end_date);
  const isExpired = subscription?.status === 'expired' || (daysRemaining !== null && daysRemaining <= 0);
  const isExpiringSoon = !isExpired && daysRemaining !== null && daysRemaining <= 5;

  const statusChip = isFree
    ? { label: 'Free Plan', color: '#64748B', bg: '#F1F5F9' }
    : isExpired
    ? { label: 'Expired', color: '#B91C1C', bg: '#FEE2E2' }
    : isExpiringSoon
    ? { label: 'Expiring Soon', color: '#B45309', bg: '#FEF3C7' }
    : { label: 'Active', color: '#166534', bg: '#DCFCE7' };

  if (loading) {
    return (
      <Card sx={{ borderRadius: 4, border: '1px solid rgba(148,163,184,0.18)' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography sx={{ color: '#64748B', fontSize: 13 }}>Loading subscription details...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ borderRadius: 4, border: '1px solid rgba(148,163,184,0.18)', boxShadow: '0 18px 34px rgba(15,23,42,0.04)', overflow: 'hidden' }}>
      <Box sx={{ height: 4, background: isExpired ? '#B91C1C' : isExpiringSoon ? '#D97706' : '#071D35' }} />
      <CardContent sx={{ p: { xs: 2.1, md: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1.5, mb: 2.2 }}>
          <Box sx={{ display: 'flex', gap: 1.4, alignItems: 'center' }}>
            <Box sx={{ width: 44, height: 44, borderRadius: 2.4, display: 'grid', placeItems: 'center', color: '#fff', background: '#071D35', boxShadow: '0 8px 18px rgba(7,29,53,0.18)', flexShrink: 0 }}>
              <WorkspacePremiumIcon />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>{title}</Typography>
              <Typography sx={{ color: '#64748B', fontSize: 13, mt: 0.2 }}>Plan details, billing amount and renewal status</Typography>
            </Box>
          </Box>
          <Chip
            size="small"
            label={statusChip.label}
            sx={{ bgcolor: statusChip.bg, color: statusChip.color, fontWeight: 800 }}
          />
        </Box>

        {isExpiringSoon && !isFree && (
          <Box sx={{ mb: 2, p: 1.4, borderRadius: 2, bgcolor: '#FEF3C7', border: '1px solid #FBBF24' }}>
            <Typography sx={{ color: '#92400E', fontSize: 13, fontWeight: 700 }}>
              Your plan expires in {daysRemaining} day{daysRemaining === 1 ? '' : 's'}. Renew now to avoid losing access.
            </Typography>
          </Box>
        )}

        {isExpired && !isFree && (
          <Box sx={{ mb: 2, p: 1.4, borderRadius: 2, bgcolor: '#FEE2E2', border: '1px solid #FCA5A5' }}>
            <Typography sx={{ color: '#991B1B', fontSize: 13, fontWeight: 700 }}>
              Your plan has expired. Renew now to continue enjoying premium benefits.
            </Typography>
          </Box>
        )}

        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Stack spacing={0.4}>
              <Typography sx={{ color: '#94A3B8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Plan</Typography>
              <Typography sx={{ color: '#0F172A', fontSize: 15, fontWeight: 800 }}>{formatPlanName(subscription?.plan)}</Typography>
            </Stack>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Stack spacing={0.4}>
              <Typography sx={{ color: '#94A3B8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.3 }}>
                <CurrencyRupeeIcon sx={{ fontSize: 12 }} /> Amount Paid
              </Typography>
              <Typography sx={{ color: '#0F172A', fontSize: 15, fontWeight: 800 }}>
                {subscription?.amount ? `₹${subscription.amount}` : '—'}
              </Typography>
            </Stack>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Stack spacing={0.4}>
              <Typography sx={{ color: '#94A3B8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.3 }}>
                <CalendarMonthIcon sx={{ fontSize: 12 }} /> Active Since
              </Typography>
              <Typography sx={{ color: '#0F172A', fontSize: 15, fontWeight: 800 }}>
                {subscription?.start_date ? formatDate(subscription.start_date) : '—'}
              </Typography>
            </Stack>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Stack spacing={0.4}>
              <Typography sx={{ color: '#94A3B8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.3 }}>
                <AccessTimeIcon sx={{ fontSize: 12 }} /> {isExpired ? 'Expired On' : 'Valid Until'}
              </Typography>
              <Typography sx={{ color: '#0F172A', fontSize: 15, fontWeight: 800 }}>
                {subscription?.end_date ? formatDate(subscription.end_date) : '—'}
              </Typography>
              {!isFree && daysRemaining !== null && (
                <Typography sx={{ color: isExpired ? '#B91C1C' : isExpiringSoon ? '#B45309' : '#166534', fontSize: 11.5, fontWeight: 700 }}>
                  {isExpired ? 'Expired' : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`}
                </Typography>
              )}
            </Stack>
          </Grid>
        </Grid>

        {!isFree && onToggleAutoRenew && (
          <Box sx={{ mt: 2.4, p: 1.4, borderRadius: 2, bgcolor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: '#0F172A' }}>Auto-renew my plan</Typography>
              <Typography sx={{ color: '#64748B', fontSize: 11.5 }}>
                {subscription?.auto_renew ? 'Your plan will renew automatically before it expires.' : 'Turn on to renew automatically, like Netflix/Prime.'}
              </Typography>
            </Box>
            <Switch
              checked={Boolean(subscription?.auto_renew)}
              onChange={(event) => onToggleAutoRenew(event.target.checked)}
              color="primary"
            />
          </Box>
        )}

        {!isFree && subscription?.id && subscription?.user_id && (
          <SubscriptionInvoicePanel subscription={subscription} />
        )}

        {(isFree || isExpiringSoon || isExpired) && onRenew && (
          <Box sx={{ mt: 2.4 }}>
            <Button
              onClick={onRenew}
              sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 800, px: 2, py: 0.9, color: '#071D35', background: '#D6A73A', boxShadow: 'none', '&:hover': { background: '#F0C75E', boxShadow: 'none' }, fontSize: 13 }}
            >
              {isFree ? 'Upgrade Now' : 'Renew Subscription'}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionSummaryCard;
