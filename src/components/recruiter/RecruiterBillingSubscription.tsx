import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Security as SecurityIcon,
  WorkspacePremium as WorkspacePremiumIcon,
  TrendingUp as TrendingUpIcon,
  ElectricBolt as ZapIcon,
  ChatBubble as MessageSquareIcon,
  Work as BriefcaseIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { subscriptionService } from '@services/api';
import { billingSubscriptionService, type RecruiterPlanDuration } from '@services/billingSubscription';
import { getRecruiterWelcomeUsage } from '@utils/recruiterWelcomeBenefits';
import { PaymentModal } from '@components/payments/PaymentModal';

interface RecruiterBillingSubscriptionProps {
  ownerId: string;
  currentUserId: string;
}

const MotionBox = motion(Box);
const MotionCard = motion(Card);

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);

const PRICING_DATA = [
  { duration: 1 as RecruiterPlanDuration, price: 999, teamLimit: 10, savings: null },
  { duration: 3 as RecruiterPlanDuration, price: 2499, teamLimit: 10, savings: 498 },
  { duration: 6 as RecruiterPlanDuration, price: 4499, teamLimit: 10, savings: 1495 },
  { duration: 12 as RecruiterPlanDuration, price: 7999, teamLimit: 15, savings: 3989, isBestValue: true },
];

const PRO_FEATURES = [
  {
    icon: TrendingUpIcon,
    category: 'HIRING',
    features: ['Unlimited Job Posts', 'Unlimited Active Jobs', 'Unlimited Candidate Search', 'Priority Job Placement'],
  },
  {
    icon: MessageSquareIcon,
    category: 'CANDIDATE ACCESS',
    features: ['Unlimited Resume Access', 'Unlimited Resume Unlocks', 'Talent Pool', 'Candidate Tags & Notes'],
  },
  {
    icon: ZapIcon,
    category: 'AI & ANALYTICS',
    features: ['AI Recommended Candidates', 'AI Candidate Matching', 'AI Hiring Assistant', 'Analytics & Reports'],
  },
  {
    icon: BriefcaseIcon,
    category: 'WORKFLOW',
    features: ['Unlimited Messaging', 'Interview Management', 'ATS Pipeline', 'Priority Support'],
  },
];

interface UsageData {
  jobPostsUsed: number;
  jobPostsTotal: number;
  jobPostsRemaining: number;
  resumeUnlocksUsed: number;
  resumeUnlocksTotal: number;
  resumeUnlocksRemaining: number;
  isFree: boolean;
}

const getUsageWarningLevel = (used: number, total: number): 'normal' | 'running_low' | 'almost_exhausted' | 'limit_reached' => {
  if (total === 0) return 'normal';
  const percentage = (used / total) * 100;
  if (percentage >= 100) return 'limit_reached';
  if (percentage >= 90) return 'almost_exhausted';
  if (percentage >= 70) return 'running_low';
  return 'normal';
};

const UsageCard: React.FC<{
  label: string;
  emoji?: string;
  used: number;
  total: number;
  remaining: number;
}> = ({ label, emoji = '📊', used, total, remaining }) => {
  const warningLevel = getUsageWarningLevel(used, total);
  const percentage = total > 0 ? (used / total) * 100 : 0;

  let warningText = '';
  let warningColor = 'transparent';

  if (warningLevel === 'running_low') {
    warningText = "You're running low";
    warningColor = 'rgba(217, 119, 6, 0.08)';
  } else if (warningLevel === 'almost_exhausted') {
    warningText = 'Almost exhausted';
    warningColor = 'rgba(220, 38, 38, 0.08)';
  } else if (warningLevel === 'limit_reached') {
    warningText = 'Limit reached';
    warningColor = 'rgba(220, 38, 38, 0.12)';
  }

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid #E5E7EB',
        background: warningColor || 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%)',
        height: '100%',
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: 24 }}>{emoji}</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1F2937' }}>
              {label}
            </Typography>
          </Box>
          {warningText && (
            <Chip
              label={warningText}
              size="small"
              variant="filled"
              sx={{
                backgroundColor:
                  warningLevel === 'limit_reached'
                    ? '#DC2626'
                    : warningLevel === 'almost_exhausted'
                      ? '#F97316'
                      : '#D97706',
                color: 'white',
                fontWeight: 700,
                height: 24,
                fontSize: '0.65rem',
              }}
            />
          )}
        </Box>

        <Grid container spacing={1} sx={{ mb: 1.5 }}>
          <Grid item xs={6}>
            <Typography variant="caption" sx={{ color: '#6B7280', display: 'block' }}>
              Used
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: '#1F2937' }}>
              {used.toLocaleString()}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" sx={{ color: '#6B7280', display: 'block' }}>
              Remaining
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: '#10B981' }}>
              {Math.max(remaining, 0).toLocaleString()}
            </Typography>
          </Grid>
        </Grid>

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>
              {used} / {total}
            </Typography>
            <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 700 }}>
              {Math.round(percentage)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(percentage, 100)}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: '#E5E7EB',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                background:
                  warningLevel === 'limit_reached'
                    ? '#DC2626'
                    : warningLevel === 'almost_exhausted'
                      ? '#F97316'
                      : warningLevel === 'running_low'
                        ? '#D97706'
                        : 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export const RecruiterBillingSubscription: React.FC<RecruiterBillingSubscriptionProps> = ({
  ownerId,
}) => {
  const [selectedDuration, setSelectedDuration] = useState<RecruiterPlanDuration>(3);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'billing-history' | 'current-subscription' | 'usage-analytics' | 'invoices'>('overview');
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [billingOverview, setBillingOverview] = useState<any>(null);
  const [invoiceList, setInvoiceList] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [usageSnapshot, setUsageSnapshot] = useState<any>(null);
  const [generatedInvoice, setGeneratedInvoice] = useState<any>(null);
  const [usage, setUsage] = useState<UsageData>({
    jobPostsUsed: 0,
    jobPostsTotal: 15,
    jobPostsRemaining: 15,
    resumeUnlocksUsed: 0,
    resumeUnlocksTotal: 150,
    resumeUnlocksRemaining: 150,
    isFree: true,
  });
  const [loadingDuration, setLoadingDuration] = useState<RecruiterPlanDuration | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<{ id: string; name: string; price: number; durationMonths: number; durationLabel: string } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [sub, welcomeUsage, overview, snapshot, invoices, payments] = await Promise.all([
          subscriptionService.getUserSubscription(ownerId),
          getRecruiterWelcomeUsage(ownerId).catch(() => null),
          billingSubscriptionService.getBillingOverview(ownerId, ownerId).catch(() => null),
          billingSubscriptionService.getUsageSnapshot(ownerId).catch(() => null),
          Promise.resolve(billingSubscriptionService.getInvoices(ownerId)),
          Promise.resolve(billingSubscriptionService.getPayments(ownerId)),
        ]);

        setCurrentSubscription(sub);
        setBillingOverview(overview);
        setUsageSnapshot(snapshot);
        setInvoiceList(invoices || []);
        setPaymentHistory(payments || []);

        if (welcomeUsage) {
          setUsage({
            jobPostsUsed: welcomeUsage.freeJobPostsUsed || 0,
            jobPostsTotal: welcomeUsage.freeJobPostsTotal || 15,
            jobPostsRemaining: welcomeUsage.freeJobPostsRemaining || 15,
            resumeUnlocksUsed: welcomeUsage.freeResumeViewsUsed || 0,
            resumeUnlocksTotal: welcomeUsage.freeResumeViewsTotal || 150,
            resumeUnlocksRemaining: welcomeUsage.freeResumeViewsRemaining || 150,
            isFree: true,
          });
        }
      } catch (error) {
        console.error('Failed to load billing data:', error);
      }
    };

    loadData();
  }, [ownerId]);

  const isFreeRecruiter = currentSubscription?.plan === 'free' || !currentSubscription?.plan;

  const currentPlanLabel = currentSubscription?.plan === 'Jobpoyt_recruiter_pro' ? 'Jobpoyt Recruiter Pro' : 'Free Onboarding';
  const planAmount = currentSubscription?.amount || billingOverview?.monthlySpend || 0;
  const planStart = currentSubscription?.start_date || currentSubscription?.created_at || new Date().toISOString();
  const planExpiry = currentSubscription?.end_date || currentSubscription?.expiry_date || billingOverview?.nextBillingDate || 'Not set';
  const nextBillingDate = billingOverview?.nextBillingDate || planExpiry;

  const handleGenerateInvoice = () => {
    const generated = {
      invoiceNumber: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      amount: planAmount,
      status: 'Generated',
      plan: currentPlanLabel,
      dueDate: planExpiry,
      lineItems: [
        { label: currentPlanLabel, amount: planAmount },
        { label: 'GST / Taxes', amount: Math.round(planAmount * 0.05) },
      ],
    };
    setGeneratedInvoice(generated);
    toast.success('Invoice generated successfully');
  };

  const handleUpgradePlan = (duration: RecruiterPlanDuration) => {
    if (!ownerId) {
      toast.error('Please sign in to upgrade.');
      return;
    }
    const pricing = billingSubscriptionService.getRecruiterPlanPricing(duration);
    setCheckoutPlan({
      id: `jobpoyt_recruiter_pro_${duration}_month`,
      name: 'Jobpoyt Recruiter Pro',
      price: pricing.price,
      durationMonths: duration,
      durationLabel: `${duration} ${duration === 1 ? 'Month' : 'Months'}`,
    });
  };

  const renderOverviewTab = () => (
    <Grid container spacing={2.5}>
      <Grid item xs={12} sm={6} md={3}>
        <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E5E7EB', height: '100%' }}>
          <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', mb: 1 }}>Current Plan</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#111827' }}>{currentPlanLabel}</Typography>
          <Typography variant="body2" sx={{ color: '#4B5563', mt: 0.5 }}>{currentSubscription?.status || 'active'}</Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E5E7EB', height: '100%' }}>
          <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', mb: 1 }}>Monthly Spend</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#111827' }}>{formatMoney(billingOverview?.monthlySpend || planAmount)}</Typography>
          <Typography variant="body2" sx={{ color: '#4B5563', mt: 0.5 }}>This month</Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E5E7EB', height: '100%' }}>
          <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', mb: 1 }}>Next Billing</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#111827' }}>{nextBillingDate}</Typography>
          <Typography variant="body2" sx={{ color: '#4B5563', mt: 0.5 }}>Auto-renewal</Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E5E7EB', height: '100%' }}>
          <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', mb: 1 }}>Available Balance</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#111827' }}>{billingOverview?.creditsRemaining ?? 0}</Typography>
          <Typography variant="body2" sx={{ color: '#4B5563', mt: 0.5 }}>Credits left</Typography>
        </Paper>
      </Grid>

      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E5E7EB' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Billing Summary</Typography>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography>Plan Value</Typography><Typography sx={{ fontWeight: 700 }}>{formatMoney(planAmount)}</Typography></Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography>Resume Unlocks Used</Typography><Typography sx={{ fontWeight: 700 }}>{billingOverview?.resumeUnlocks ?? usage.resumeUnlocksUsed}</Typography></Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography>Jobs Posted</Typography><Typography sx={{ fontWeight: 700 }}>{billingOverview?.jobsPosted ?? usage.jobPostsUsed}</Typography></Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography>AI Requests</Typography><Typography sx={{ fontWeight: 700 }}>{billingOverview?.aiRequestsUsed ?? usageSnapshot?.aiUsage ?? 0}</Typography></Box>
          </Stack>
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E5E7EB' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Usage Highlights</Typography>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="caption" sx={{ color: '#6B7280' }}>Job Posts</Typography>
              <LinearProgress variant="determinate" value={Math.min((usage.jobPostsUsed / usage.jobPostsTotal) * 100, 100)} sx={{ mt: 0.5, height: 8, borderRadius: 99 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#6B7280' }}>Resume Unlocks</Typography>
              <LinearProgress variant="determinate" value={Math.min((usage.resumeUnlocksUsed / usage.resumeUnlocksTotal) * 100, 100)} sx={{ mt: 0.5, height: 8, borderRadius: 99, '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #10B981 0%, #14B8A6 100%)' } }} />
            </Box>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderHistoryTab = () => (
    <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E5E7EB' }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Billing History</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Payment</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(paymentHistory.length ? paymentHistory : [{ id: 'n/a', transactionId: 'No payment history yet', date: new Date().toISOString(), status: 'pending', amount: 0 }]).map((payment) => (
            <TableRow key={payment.id || payment.transactionId}>
              <TableCell>{payment.transactionId || 'Payment'}</TableCell>
              <TableCell>{new Date(payment.date || Date.now()).toLocaleDateString()}</TableCell>
              <TableCell>{payment.status || 'pending'}</TableCell>
              <TableCell align="right">{formatMoney(Number(payment.amount || 0))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );

  const renderSubscriptionTab = () => (
    <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E5E7EB' }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Current Subscription</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2.5, borderRadius: 3, background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>Plan</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>{currentPlanLabel}</Typography>
            <Typography variant="body2" sx={{ color: '#4B5563', mt: 1 }}>
              Status: {currentSubscription?.status || 'active'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#4B5563', mt: 0.5 }}>
              Amount: {formatMoney(planAmount)}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2.5, borderRadius: 3, background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>Validity</Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: '#111827' }}><strong>Started:</strong> {new Date(planStart).toLocaleDateString()}</Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: '#111827' }}><strong>Expires:</strong> {String(planExpiry).includes('Invalid') ? 'Not available' : new Date(planExpiry).toLocaleDateString()}</Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: '#111827' }}><strong>Next billing:</strong> {new Date(nextBillingDate).toLocaleDateString()}</Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );

  const renderUsageTab = () => (
    <Grid container spacing={2.5}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E5E7EB' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Recruiter Usage Analytics</Typography>
          <Stack spacing={2}>
            <Box><Typography variant="caption">Jobs Posted</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{usageSnapshot?.jobsPosted ?? usage.jobPostsUsed}</Typography></Box>
            <Box><Typography variant="caption">Applications Received</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{usageSnapshot?.applicationsReceived ?? 0}</Typography></Box>
            <Box><Typography variant="caption">Resume Unlocks</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{usageSnapshot?.resumeUnlocks ?? usage.resumeUnlocksUsed}</Typography></Box>
            <Box><Typography variant="caption">AI Requests</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{usageSnapshot?.aiUsage ?? 0}</Typography></Box>
          </Stack>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E5E7EB' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Usage Breakdown</Typography>
          <Stack spacing={2}>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography>Job Posts</Typography><Typography>{usage.jobPostsUsed}/{usage.jobPostsTotal}</Typography></Box>
              <LinearProgress variant="determinate" value={Math.min((usage.jobPostsUsed / usage.jobPostsTotal) * 100, 100)} sx={{ mt: 0.5, height: 8, borderRadius: 99 }} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography>Resume Unlocks</Typography><Typography>{usage.resumeUnlocksUsed}/{usage.resumeUnlocksTotal}</Typography></Box>
              <LinearProgress variant="determinate" value={Math.min((usage.resumeUnlocksUsed / usage.resumeUnlocksTotal) * 100, 100)} sx={{ mt: 0.5, height: 8, borderRadius: 99, '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #14B8A6 0%, #10B981 100%)' } }} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography>Automation Runs</Typography><Typography>{usageSnapshot?.automationUsage ?? 0}</Typography></Box>
              <LinearProgress variant="determinate" value={Math.min(((usageSnapshot?.automationUsage ?? 0) / 20) * 100, 100)} sx={{ mt: 0.5, height: 8, borderRadius: 99 }} />
            </Box>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderInvoicesTab = () => (
    <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E5E7EB' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Invoices</Typography>
        <Button variant="contained" onClick={handleGenerateInvoice}>Generate Invoice</Button>
      </Box>

      {generatedInvoice && (
        <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #dbeafe', background: '#f8fbff', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Latest Generated Invoice</Typography>
          <Typography variant="body2">Invoice #: {generatedInvoice.invoiceNumber}</Typography>
          <Typography variant="body2">Plan: {generatedInvoice.plan}</Typography>
          <Typography variant="body2">Amount: {formatMoney(generatedInvoice.amount)}</Typography>
          <Typography variant="body2">Due: {new Date(generatedInvoice.dueDate).toLocaleDateString()}</Typography>
        </Paper>
      )}

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Invoice #</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(invoiceList.length ? invoiceList : [{ id: 'draft', invoiceNumber: generatedInvoice?.invoiceNumber || 'INV-DRAFT', date: new Date().toISOString(), status: 'paid', amount: planAmount }]).map((invoice) => (
            <TableRow key={invoice.id || invoice.invoiceNumber}>
              <TableCell>{invoice.invoiceNumber || 'INV-DRAFT'}</TableCell>
              <TableCell>{new Date(invoice.date || Date.now()).toLocaleDateString()}</TableCell>
              <TableCell>{invoice.status || 'paid'}</TableCell>
              <TableCell align="right">{formatMoney(Number(invoice.amount || 0))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'overview':
        return renderOverviewTab();
      case 'billing-history':
        return renderHistoryTab();
      case 'current-subscription':
        return renderSubscriptionTab();
      case 'usage-analytics':
        return renderUsageTab();
      case 'invoices':
        return renderInvoicesTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <MotionBox initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        {/* Hero Section */}
        <Paper
          sx={{
            mb: 4,
            p: { xs: 2.5, md: 4 },
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            background:
              'radial-gradient(circle at 15% 20%, rgba(37, 99, 235, 0.15), transparent 40%), radial-gradient(circle at 85% 18%, rgba(14, 165, 233, 0.15), transparent 42%), linear-gradient(135deg, rgba(15, 23, 42, 0.97), rgba(30, 41, 59, 0.97))',
            color: '#F8FAFC',
            boxShadow: '0 25px 60px rgba(15, 23, 42, 0.18)',
          }}
        >
          <Grid container spacing={3} alignItems="flex-start">
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <WorkspacePremiumIcon sx={{ color: '#6EE7B7', fontSize: 28 }} />
                <Typography
                  variant="overline"
                  sx={{ color: 'rgba(209, 250, 229, 0.95)', letterSpacing: 1.2, fontWeight: 800 }}
                >
                  Recruiter Billing Console
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.5rem' }, mb: 1.5 }}>
                Billing & Subscription
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(226, 232, 240, 0.9)', maxWidth: 600, lineHeight: 1.6 }}>
                Simple, transparent recruiter plans built for every hiring stage. Start free with 15 job posts and
                150 resume unlocks, then upgrade to unlimited when you're ready.
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: 'rgba(15, 23, 42, 0.4)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <Typography variant="overline" sx={{ color: 'rgba(209, 250, 229, 0.9)', fontWeight: 800 }}>
                  Current Plan
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 900, mb: 0.5, color: isFreeRecruiter ? '#6EE7B7' : '#60A5FA' }}
                >
                  {isFreeRecruiter ? 'FREE' : 'JOBPOYT RECRUITER PRO'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(226, 232, 240, 0.85)' }}>
                  {isFreeRecruiter
                    ? 'Welcome benefits active'
                    : `Active until ${new Date(currentSubscription?.expiry_date || Date.now()).toLocaleDateString()}`}
                </Typography>
                {!isFreeRecruiter && currentSubscription?.team_member_limit && (
                  <Typography variant="caption" sx={{ color: 'rgba(226, 232, 240, 0.8)', display: 'block', mt: 1 }}>
                    {currentSubscription.team_member_limit} Team Members Included
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ mb: 4, borderRadius: 3, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <Tabs
            value={selectedTab}
            onChange={(_, value) => setSelectedTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: '1px solid #E5E7EB',
              background: '#F8FAFC',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                minHeight: 52,
              },
            }}
          >
            <Tab label="Overview" value="overview" />
            <Tab label="Billing History" value="billing-history" />
            <Tab label="Current Subscription" value="current-subscription" />
            <Tab label="Usage Analytics" value="usage-analytics" />
            <Tab label="Invoices" value="invoices" />
          </Tabs>
          <Box sx={{ p: 3 }}>{renderTabContent()}</Box>
        </Paper>

        {/* FREE Plan Status Section */}
        {isFreeRecruiter && (
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Paper
              sx={{
                mb: 4,
                p: { xs: 2.5, md: 3 },
                borderRadius: 4,
                border: '2px solid rgba(16, 185, 129, 0.3)',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(14, 165, 233, 0.06) 100%)',
              }}
            >
              <Grid container spacing={2} alignItems="flex-start">
                <Grid item xs={12} md={8}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Typography sx={{ fontSize: 26, lineHeight: 1 }}>🎁</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#065F46', lineHeight: 1.2 }}>
                      Welcome Hiring Benefits
                    </Typography>
                  </Box>
                  <Typography
                    variant="body1"
                    sx={{
                      color: '#374151',
                      maxWidth: 680,
                      lineHeight: 1.5,
                      fontWeight: 500,
                    }}
                  >
                    You received complimentary hiring benefits to get started. These are available one-time only.
                  </Typography>
                </Grid>

                <Grid
                  item
                  xs={12}
                  md={4}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: { xs: 'flex-start', md: 'flex-end' },
                    pt: { xs: 0, md: 1.5 },
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      color: '#374151',
                      fontWeight: 500,
                      textAlign: { xs: 'left', md: 'right' },
                      lineHeight: 1.4,
                      maxWidth: 280,
                    }}
                  >
                    Upgrade to Recruiter Pro and get
                    <Box component="span" sx={{ display: 'block' }}>
                      unlimited everything
                    </Box>
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <UsageCard
                        label="Free Job Posts"
                        emoji="📝"
                        used={usage.jobPostsUsed}
                        total={usage.jobPostsTotal}
                        remaining={usage.jobPostsRemaining}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <UsageCard
                        label="Resume Unlocks"
                        emoji="📄"
                        used={usage.resumeUnlocksUsed}
                        total={usage.resumeUnlocksTotal}
                        remaining={usage.resumeUnlocksRemaining}
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Paper>
          </MotionBox>
        )}

        {/* Paid Plans Section */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              mb: 1,
              color: '#1F2937',
            }}
          >
            Jobpoyt Recruiter Pro
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#6B7280',
              mb: 3,
            }}
          >
            Choose your billing duration
          </Typography>

          {/* Pricing Cards Grid */}
          <Grid container spacing={2.5} sx={{ mb: 4 }}>
            {PRICING_DATA.map((pricing, idx) => (
              <Grid item xs={12} sm={6} md={3} key={pricing.duration}>
                <MotionCard
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 + idx * 0.08 }}
                  whileHover={{ y: -8 }}
                  onClick={() => setSelectedDuration(pricing.duration)}
                  sx={{
                    height: '100%',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    border:
                      pricing.isBestValue && selectedDuration === pricing.duration
                        ? '2px solid #10B981'
                        : pricing.isBestValue
                          ? '1px solid rgba(16, 185, 129, 0.5)'
                          : selectedDuration === pricing.duration
                            ? '2px solid #2563EB'
                            : '1px solid #E5E7EB',
                    background:
                      pricing.isBestValue
                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)'
                        : selectedDuration === pricing.duration
                          ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)'
                          : '#FFFFFF',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      boxShadow: pricing.isBestValue
                        ? '0 20px 40px rgba(16, 185, 129, 0.15)'
                        : '0 16px 32px rgba(37, 99, 235, 0.12)',
                    },
                  }}
                >
                  {pricing.isBestValue && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
                      }}
                    />
                  )}

                  <CardContent
                    sx={{
                      p: 2.5,
                      pb: 2.5,
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                    }}
                  >
                    {pricing.isBestValue && (
                      <Box sx={{ mb: 1.5 }}>
                        <Chip
                          icon={<StarIcon />}
                          label="BEST VALUE"
                          size="small"
                          sx={{
                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            color: 'white',
                            fontWeight: 800,
                            fontSize: '0.7rem',
                            height: 28,
                          }}
                        />
                      </Box>
                    )}

                    <Typography variant="overline" sx={{ color: '#6B7280', fontWeight: 700 }}>
                      JOBPOYT RECRUITER PRO
                    </Typography>

                    <Typography
                      variant="h3"
                      sx={{
                        fontWeight: 900,
                        mt: 1,
                        mb: 0.5,
                        color: '#1F2937',
                      }}
                    >
                      ₹{pricing.price.toLocaleString()}
                    </Typography>

                    <Typography variant="body2" sx={{ color: '#6B7280', mb: 1.5 }}>
                      {pricing.duration} month{pricing.duration > 1 ? 's' : ''}
                    </Typography>

                    {pricing.savings && (
                      <Chip
                        label={`Save ₹${pricing.savings.toLocaleString()}`}
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(34, 197, 94, 0.15)',
                          color: '#22C55E',
                          fontWeight: 700,
                          mb: 1.5,
                        }}
                      />
                    )}

                    <Divider sx={{ my: 1.5 }} />

                    <Stack spacing={0.8} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircleIcon sx={{ fontSize: 18, color: '#10B981', flexShrink: 0 }} />
                        <Typography variant="caption" sx={{ color: '#374151' }}>
                          Unlimited Job Posts
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircleIcon sx={{ fontSize: 18, color: '#10B981', flexShrink: 0 }} />
                        <Typography variant="caption" sx={{ color: '#374151' }}>
                          Unlimited Resume Access
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircleIcon sx={{ fontSize: 18, color: '#10B981', flexShrink: 0 }} />
                        <Typography variant="caption" sx={{ color: '#374151' }}>
                          AI Hiring Tools
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircleIcon sx={{ fontSize: 18, color: '#10B981', flexShrink: 0 }} />
                        <Typography variant="caption" sx={{ color: '#374151' }}>
                          {pricing.teamLimit} Team Members
                        </Typography>
                      </Box>
                    </Stack>

                    <Divider sx={{ my: 1.5 }} />

                    <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 1.5 }}>
                      ₹{Math.round(pricing.price / pricing.duration)}/month
                    </Typography>

                    <Button
                      fullWidth
                      variant={selectedDuration === pricing.duration ? 'contained' : 'outlined'}
                      onClick={() => handleUpgradePlan(pricing.duration)}
                      disabled={loadingDuration === pricing.duration}
                      sx={{
                        mt: 'auto',
                        height: 48,
                        fontWeight: 700,
                        borderRadius: 2,
                        fontSize: '1rem',
                        textTransform: 'none',
                        background:
                          selectedDuration === pricing.duration
                            ? 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)'
                            : 'transparent',
                        '&:hover': {
                          background:
                            selectedDuration === pricing.duration
                              ? 'linear-gradient(135deg, #1D4ED8 0%, #6D28D9 100%)'
                              : 'rgba(37, 99, 235, 0.04)',
                        },
                      }}
                    >
                      {loadingDuration === pricing.duration
                        ? 'Processing...'
                        : `Choose ${pricing.duration} ${pricing.duration === 1 ? 'Month' : 'Months'}`}
                    </Button>
                  </CardContent>
                </MotionCard>
              </Grid>
            ))}
          </Grid>

          {checkoutPlan && (
            <PaymentModal
              open={Boolean(checkoutPlan)}
              plan={checkoutPlan}
              onClose={() => setCheckoutPlan(null)}
              onSuccess={async () => {
                const updated = await subscriptionService.getUserSubscription(ownerId);
                setCurrentSubscription(updated);
                setCheckoutPlan(null);
                toast.success('Jobpoyt Recruiter Pro is active.');
              }}
              onError={(reason) => toast.error(reason)}
            />
          )}

          <Paper
            sx={{
              p: 4,
              borderRadius: 4,
              border: '1px solid #E5E7EB',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                mb: 3,
                color: '#1F2937',
                textAlign: 'center',
              }}
            >
              Everything Included in Recruiter Pro
            </Typography>

            <Grid container spacing={3}>
              {PRO_FEATURES.map((featureGroup) => {
                const IconComponent = featureGroup.icon;
                return (
                  <Grid item xs={12} sm={6} md={3} key={featureGroup.category}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        border: '1px solid #E5E7EB',
                        height: '100%',
                        '&:hover': {
                          boxShadow: '0 8px 16px rgba(37, 99, 235, 0.08)',
                        },
                      }}
                    >
                      <CardContent sx={{ p: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <IconComponent sx={{ fontSize: 20, color: '#2563EB' }} />
                          <Typography
                            variant="overline"
                            sx={{
                              fontWeight: 800,
                              color: '#2563EB',
                              letterSpacing: 0.5,
                            }}
                          >
                            {featureGroup.category}
                          </Typography>
                        </Box>

                        <Stack spacing={1}>
                          {featureGroup.features.map((feature) => (
                            <Box key={feature} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                              <CheckCircleIcon
                                sx={{
                                  fontSize: 16,
                                  color: '#10B981',
                                  mt: 0.5,
                                  flexShrink: 0,
                                }}
                              />
                              <Typography variant="body2" sx={{ color: '#4B5563' }}>
                                {feature}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>

          <Box
            sx={{
              mt: 4,
              p: 2.5,
              borderRadius: 3,
              background: 'rgba(59, 130, 246, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
            }}
          >
            <SecurityIcon sx={{ color: '#2563EB', mt: 0.5, flexShrink: 0 }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1F2937', mb: 0.5 }}>
                Secure & Transparent Billing
              </Typography>
              <Typography variant="body2" sx={{ color: '#6B7280' }}>
                All payments are processed securely. No hidden fees. Cancel anytime. Our billing is audited and transparent.
              </Typography>
            </Box>
          </Box>
        </MotionBox>
      </Container>
    </MotionBox>
  );
};

