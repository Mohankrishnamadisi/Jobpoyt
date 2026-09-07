import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  AccountBalanceWallet as BillingIcon,
  AutoGraph as ReportsIcon,
  Download as DownloadIcon,
  LocalOffer as CouponIcon,
  Receipt as InvoiceTemplateIcon,
  Security as GatewayIcon,
  Settings as SettingsIcon,
  TrendingUp as RevenueIcon,
  Warning as RefundIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  billingSubscriptionService,
  type CreditWalletType,
} from '@services/billingSubscription';
import { teamManagementService } from '@services/teamManagement';

// Placeholder ownerId for admin-level operations (platform-wide context).
// In production this would be the selected organization's owner ID.
const ADMIN_PLATFORM_OWNER = 'admin_platform';

type AdminBillingTab =
  | 'overview'
  | 'plans-management'
  | 'pricing-management'
  | 'coupons'
  | 'promotions'
  | 'free-trial'
  | 'enterprise'
  | 'organization-billing'
  | 'credit-allocation'
  | 'refunds'
  | 'taxes'
  | 'payment-gateways'
  | 'invoice-templates'
  | 'billing-notifications'
  | 'billing-reports'
  | 'revenue-analytics'
  | 'subscription-analytics'
  | 'plan-analytics'
  | 'coupon-analytics'
  | 'promotion-analytics'
  | 'audit-logs'
  | 'system-settings';

const taxTypeOptions = ['GST', 'VAT', 'Sales Tax'] as const;

const paymentGatewayOptions = [
  { id: 'razorpay', label: 'Razorpay', status: 'active' },
  { id: 'stripe', label: 'Stripe', status: 'configured' },
  { id: 'payu', label: 'PayU', status: 'inactive' },
  { id: 'cashfree', label: 'Cashfree', status: 'inactive' },
  { id: 'manual_invoice', label: 'Manual Invoice (Enterprise)', status: 'active' },
];

const formatDate = (value?: string): string => {
  if (!value) return '-';
  try {
    return format(new Date(value), 'dd MMM yyyy');
  } catch {
    return '-';
  }
};

const downloadText = (filename: string, content: string): void => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const statCard = (title: string, value: string | number, color = '#1D4ED8') => (
  <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
    <CardContent>
      <Typography variant="body2" sx={{ color: '#64748B' }}>{title}</Typography>
      <Typography variant="h6" sx={{ mt: 0.6, fontWeight: 800, color }}>{value}</Typography>
    </CardContent>
  </Card>
);

interface AdminBillingManagementProps {
  ownerId?: string;
}

const AdminBillingManagement: React.FC<AdminBillingManagementProps> = ({ ownerId = ADMIN_PLATFORM_OWNER }) => {
  const [tab, setTab] = useState<AdminBillingTab>('overview');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);

  const [couponForm, setCouponForm] = useState({
    code: 'WELCOME20',
    discountPercent: '20',
    flatDiscount: '',
    expiry: new Date(Date.now() + 86400000 * 45).toISOString().slice(0, 10),
    usageLimit: '100',
    minimumPurchase: '1000',
  });

  const [taxValues, setTaxValues] = useState({
    gstPercent: 18,
    vatPercent: 0,
    salesTaxPercent: 0,
    currency: 'INR' as 'INR' | 'USD' | 'EUR',
  });

  const [allocationToUser, setAllocationToUser] = useState('');
  const [allocationType, setAllocationType] = useState<CreditWalletType>('ai');
  const [allocationAmount, setAllocationAmount] = useState('25');

  const [orgLimitUser, setOrgLimitUser] = useState('');
  const [orgLimitForm, setOrgLimitForm] = useState({
    monthlySpendLimit: '20000',
    aiRequestLimit: '500',
    resumeUnlockLimit: '300',
    promotionCreditLimit: '100',
    automationCreditLimit: '200',
  });

  const [promotionJobId, setPromotionJobId] = useState('job_1');
  const [promotionDays, setPromotionDays] = useState('7');

  const [refundPaymentId, setRefundPaymentId] = useState('');
  const [refundReason, setRefundReason] = useState('Duplicate purchase');

  const [gatewayApiKeys, setGatewayApiKeys] = useState({
    razorpay: { keyId: 'rzp_test_***', secret: '***' },
    stripe: { keyId: 'pk_test_***', secret: '***' },
  });

  const plans = billingSubscriptionService.getPlanCatalog();
  const subscription = billingSubscriptionService.getSubscription(ownerId);
  const walletLabelMap = billingSubscriptionService.getWalletLabelMap();
  const coupons = billingSubscriptionService.listCoupons(ownerId);
  const invoices = billingSubscriptionService.getInvoices(ownerId);
  const payments = billingSubscriptionService.getPayments(ownerId);
  const refunds = billingSubscriptionService.listRefunds(ownerId);
  const notifications = billingSubscriptionService.listNotifications(ownerId);
  const taxConfig = billingSubscriptionService.getTaxConfig(ownerId);
  const trial = billingSubscriptionService.getTrialStatus(ownerId);
  const enterprise = billingSubscriptionService.getEnterpriseBilling(ownerId);
  const allOwnerWallets = billingSubscriptionService.getAllWalletsForOwner(ownerId);
  const allocationLedger = billingSubscriptionService.getAllocationLedger(ownerId);
  const orgLimits = billingSubscriptionService.listOrganizationLimits(ownerId);
  const promotions = billingSubscriptionService.listPromotions(ownerId);
  const members = teamManagementService.listMembers(ownerId).filter((m) => m.status !== 'inactive');

  const packagesForAi = billingSubscriptionService.getCreditPackages('ai');

  useEffect(() => {
    billingSubscriptionService.initialize(ownerId, ownerId);
    setTaxValues({
      gstPercent: taxConfig.gstPercent,
      vatPercent: taxConfig.vatPercent,
      salesTaxPercent: taxConfig.salesTaxPercent,
      currency: taxConfig.currency,
    });
  }, [ownerId]);

  useEffect(() => {
    if (!allocationToUser && members.length > 0) {
      setAllocationToUser(members[0].userId || ownerId);
    }
    if (!orgLimitUser && members.length > 0) {
      setOrgLimitUser(members[0].userId || ownerId);
    }
  }, [members, allocationToUser, orgLimitUser, ownerId]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [ov, usg] = await Promise.all([
        billingSubscriptionService.getBillingOverview(ownerId, ownerId),
        billingSubscriptionService.getUsageSnapshot(ownerId),
      ]);
      setOverview(ov);
      setUsage(usg);
    } catch (err) {
      console.error('admin billing refresh failed', err);
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [ownerId]);

  const createCoupon = () => {
    billingSubscriptionService.createCoupon(ownerId, {
      code: couponForm.code,
      discountPercent: couponForm.discountPercent ? Number(couponForm.discountPercent) : undefined,
      flatDiscount: couponForm.flatDiscount ? Number(couponForm.flatDiscount) : undefined,
      expiry: new Date(couponForm.expiry).toISOString(),
      usageLimit: Number(couponForm.usageLimit),
      minimumPurchase: Number(couponForm.minimumPurchase),
    });
    toast.success('Coupon created');
  };

  const applyTaxConfig = () => {
    billingSubscriptionService.updateTaxConfig(ownerId, taxValues);
    toast.success('Tax configuration updated');
  };

  const allocateCredits = () => {
    billingSubscriptionService.allocateCredits(ownerId, ownerId, allocationToUser, allocationType, Number(allocationAmount));
    toast.success('Credits allocated');
    refresh();
  };

  const saveOrgLimit = () => {
    billingSubscriptionService.setOrganizationLimit(ownerId, {
      id: '',
      ownerId,
      memberUserId: orgLimitUser,
      monthlySpendLimit: Number(orgLimitForm.monthlySpendLimit),
      aiRequestLimit: Number(orgLimitForm.aiRequestLimit),
      resumeUnlockLimit: Number(orgLimitForm.resumeUnlockLimit),
      promotionCreditLimit: Number(orgLimitForm.promotionCreditLimit),
      automationCreditLimit: Number(orgLimitForm.automationCreditLimit),
    });
    toast.success('Organization limits saved');
  };

  const runPromotion = (featured = false) => {
    try {
      billingSubscriptionService.promoteJob(ownerId, ownerId, {
        jobId: promotionJobId,
        durationDays: Number(promotionDays),
        featured,
      });
      toast.success(featured ? 'Featured listing scheduled' : 'Job promotion scheduled');
      refresh();
    } catch (error: any) {
      toast.error(error?.message || 'Unable to configure promotion');
    }
  };

  const submitRefund = () => {
    if (!refundPaymentId) {
      toast.error('Select a payment transaction');
      return;
    }
    billingSubscriptionService.requestRefund(ownerId, refundPaymentId, refundReason);
    toast.success('Refund processed');
  };

  if (loading || !overview || !usage) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" sx={{ color: '#64748B' }}>Loading Admin Billing Management...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
            Billing Management
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            Platform-wide billing configuration: pricing, coupons, taxes, payment gateways, reports, and analytics.
          </Typography>
        </Box>
        <Chip icon={<BillingIcon />} color="error" label="Admin Only" />
      </Box>

      {/* ── Tab Bar ── */}
      <Paper sx={{ borderRadius: 2, border: '1px solid #E2E8F0', mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v: AdminBillingTab) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 54,
            px: 0.5,
            '& .MuiTabs-scroller': { overflowX: 'auto !important' },
            '& .MuiTab-root': { textTransform: 'none', whiteSpace: 'nowrap', minHeight: 54, minWidth: 'max-content', px: 1.8, fontWeight: 700, fontSize: '0.82rem' },
          }}
        >
          <Tab value="overview" label="Overview" />
          <Tab value="plans-management" label="Plans Management" />
          <Tab value="pricing-management" label="Pricing Management" />
          <Tab value="coupons" label="Coupons" />
          <Tab value="promotions" label="Promotions" />
          <Tab value="free-trial" label="Free Trial" />
          <Tab value="enterprise" label="Enterprise Plans" />
          <Tab value="organization-billing" label="Organization Billing" />
          <Tab value="credit-allocation" label="Credit Allocation" />
          <Tab value="refunds" label="Refunds" />
          <Tab value="taxes" label="Taxes" />
          <Tab value="payment-gateways" label="Payment Gateways" />
          <Tab value="invoice-templates" label="Invoice Templates" />
          <Tab value="billing-notifications" label="Billing Notifications" />
          <Tab value="billing-reports" label="Billing Reports" />
          <Tab value="revenue-analytics" label="Revenue Analytics" />
          <Tab value="subscription-analytics" label="Subscription Analytics" />
          <Tab value="plan-analytics" label="Plan Analytics" />
          <Tab value="coupon-analytics" label="Coupon Analytics" />
          <Tab value="promotion-analytics" label="Promotion Analytics" />
          <Tab value="audit-logs" label="Audit Logs" />
          <Tab value="system-settings" label="System Settings" />
        </Tabs>
      </Paper>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={4}>{statCard('Platform Revenue (MTD)', `INR ${overview.monthlySpend ?? 0}`, '#1D4ED8')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Active Subscriptions', overview.subscriptionStatus ?? '-', '#0F766E')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Total Credits Issued', overview.creditsRemaining ?? 0, '#7C3AED')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Credits Used (MTD)', overview.creditsUsedThisMonth ?? 0, '#D97706')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Active Plans', plans.length, '#0369A1')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Active Coupons', coupons.length, '#C2410C')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Pending Refunds', refunds.filter((r) => r.status === 'requested').length, '#DC2626')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Unread Notifications', notifications.filter((n) => !n.read).length, '#7C2D12')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Active Promotions', promotions.filter((p) => p.type === 'promoted').length, '#2563EB')}</Grid>
        </Grid>
      )}

      {/* ── Plans Management ── */}
      {tab === 'plans-management' && (
        <Grid container spacing={1.3}>
          {plans.map((plan) => (
            <Grid item xs={12} md={6} lg={4} key={plan.id}>
              <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0', height: '100%' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{plan.name}</Typography>
                    {subscription.planId === plan.id && <Chip size="small" color="success" label="Default" />}
                  </Stack>
                  <Typography variant="body2" sx={{ color: '#64748B' }}>
                    Monthly: INR {plan.priceMonthly} | Yearly: INR {plan.priceYearly}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 700 }}>Limits</Typography>
                  <Typography variant="caption" display="block">Jobs: {plan.limits.jobs}</Typography>
                  <Typography variant="caption" display="block">Recruiters: {plan.limits.recruiters}</Typography>
                  <Typography variant="caption" display="block">AI Requests: {plan.limits.aiRequests}</Typography>
                  <Typography variant="caption" display="block">Resume Unlock Credits: {plan.limits.resumeUnlockCredits}</Typography>
                  <Typography variant="caption" display="block">Automation Rules: {plan.limits.automationRules}</Typography>
                  <Typography variant="caption" display="block">Storage: {plan.limits.storageGb} GB</Typography>
                  <Stack direction="row" spacing={0.7} sx={{ mt: 1.2, flexWrap: 'wrap' }}>
                    {plan.features.map((f) => <Chip key={f} size="small" label={f} />)}
                  </Stack>
                  <Stack direction="row" spacing={0.7} sx={{ mt: 1.2 }}>
                    <Button size="small" variant="outlined" startIcon={<SettingsIcon />}>Edit Plan</Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Pricing Management ── */}
      {tab === 'pricing-management' && (
        <Grid container spacing={1.3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Pricing Configuration</Typography>
                <Stack spacing={1}>
                  {plans.map((plan) => (
                    <Stack key={plan.id} direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" sx={{ flexGrow: 1 }}>{plan.name}</Typography>
                      <TextField size="small" label="Monthly (INR)" defaultValue={plan.priceMonthly} sx={{ width: 130 }} />
                      <TextField size="small" label="Yearly (INR)" defaultValue={plan.priceYearly} sx={{ width: 130 }} />
                    </Stack>
                  ))}
                  <Button variant="contained" startIcon={<SettingsIcon />} onClick={() => toast.success('Pricing configuration saved')}>
                    Save Pricing
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Credit Package Pricing</Typography>
                <Stack spacing={0.8}>
                  {packagesForAi.map((pkg) => (
                    <Stack key={pkg.id} direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" sx={{ flexGrow: 1 }}>{pkg.name}</Typography>
                      <TextField size="small" label="Price" defaultValue={(pkg as any).price ?? 0} sx={{ width: 110 }} />
                      <TextField size="small" label="Credits" defaultValue={pkg.credits} sx={{ width: 110 }} />
                    </Stack>
                  ))}
                  <Button variant="outlined" onClick={() => toast.success('Package pricing saved')}>Save Packages</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── Coupons ── */}
      {tab === 'coupons' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Create Coupon</Typography>
                <Stack spacing={1}>
                  <TextField label="Coupon Code" value={couponForm.code} onChange={(e) => setCouponForm((c) => ({ ...c, code: e.target.value.toUpperCase() }))} fullWidth />
                  <TextField label="Discount %" value={couponForm.discountPercent} onChange={(e) => setCouponForm((c) => ({ ...c, discountPercent: e.target.value }))} fullWidth />
                  <TextField label="Flat Discount (INR)" value={couponForm.flatDiscount} onChange={(e) => setCouponForm((c) => ({ ...c, flatDiscount: e.target.value }))} fullWidth />
                  <TextField label="Expiry" type="date" value={couponForm.expiry} onChange={(e) => setCouponForm((c) => ({ ...c, expiry: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
                  <TextField label="Usage Limit" value={couponForm.usageLimit} onChange={(e) => setCouponForm((c) => ({ ...c, usageLimit: e.target.value }))} fullWidth />
                  <TextField label="Minimum Purchase (INR)" value={couponForm.minimumPurchase} onChange={(e) => setCouponForm((c) => ({ ...c, minimumPurchase: e.target.value }))} fullWidth />
                  <Button variant="contained" startIcon={<CouponIcon />} onClick={createCoupon}>Create Coupon</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={7}>
            <TableContainer component={Paper} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Discount %</TableCell>
                    <TableCell>Flat Discount</TableCell>
                    <TableCell>Expiry</TableCell>
                    <TableCell>Usage</TableCell>
                    <TableCell>Min Purchase</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell>{coupon.code}</TableCell>
                      <TableCell>{coupon.discountPercent || '-'}</TableCell>
                      <TableCell>{coupon.flatDiscount || '-'}</TableCell>
                      <TableCell>{formatDate(coupon.expiry)}</TableCell>
                      <TableCell>{coupon.usedCount}/{coupon.usageLimit}</TableCell>
                      <TableCell>{coupon.minimumPurchase}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {/* ── Promotions ── */}
      {tab === 'promotions' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Job Promotion Configuration</Typography>
                <Stack spacing={1}>
                  <TextField fullWidth label="Job ID" value={promotionJobId} onChange={(e) => setPromotionJobId(e.target.value)} />
                  <TextField fullWidth label="Duration (days)" value={promotionDays} onChange={(e) => setPromotionDays(e.target.value)} />
                  <Button variant="contained" onClick={() => runPromotion(false)}>Configure Promotion</Button>
                  <Button variant="outlined" onClick={() => runPromotion(true)}>Configure Featured Job</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={7}>
            <TableContainer component={Paper} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Job ID</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Credits</TableCell>
                    <TableCell>Impressions</TableCell>
                    <TableCell>Clicks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {promotions.map((promo) => (
                    <TableRow key={promo.id}>
                      <TableCell>{promo.jobId}</TableCell>
                      <TableCell>{promo.type}</TableCell>
                      <TableCell>{promo.durationDays}</TableCell>
                      <TableCell>{promo.creditsSpent}</TableCell>
                      <TableCell>{promo.impressions}</TableCell>
                      <TableCell>{promo.clicks}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {/* ── Free Trial ── */}
      {tab === 'free-trial' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}>{statCard('Trial Days Remaining', trial.trialDaysRemaining)}</Grid>
          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Free Trial Configuration</Typography>
                <Typography variant="subtitle2" sx={{ mt: 1.2, fontWeight: 700 }}>Features Included in Trial</Typography>
                <Stack direction="row" spacing={0.6} sx={{ flexWrap: 'wrap', mt: 0.6 }}>
                  {trial.featuresAvailable.map((item: string) => <Chip key={item} label={item} onDelete={() => {}} />)}
                </Stack>
                <Typography variant="subtitle2" sx={{ mt: 1.5, fontWeight: 700 }}>Upgrade Suggestions</Typography>
                <Stack spacing={0.6} sx={{ mt: 0.6 }}>
                  {trial.upgradeSuggestions.map((item: string) => <Alert key={item} severity="info">{item}</Alert>)}
                </Stack>
                <Button variant="contained" sx={{ mt: 1.5 }} onClick={() => toast.success('Trial configuration saved')}>
                  Save Trial Config
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── Enterprise Plans ── */}
      {tab === 'enterprise' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} sm={6} md={4}>{statCard('Custom Pricing', enterprise.customPricing ? 'Enabled' : 'Disabled')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Annual Contracts', enterprise.annualContracts ? 'Enabled' : 'Disabled')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Purchase Orders', enterprise.purchaseOrders ? 'Enabled' : 'Disabled')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Manual Invoices', enterprise.manualInvoices ? 'Enabled' : 'Disabled')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Dedicated Account Manager', enterprise.dedicatedAccountManager ? 'Enabled' : 'Disabled')}</Grid>
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Enterprise Plan Settings</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button variant="outlined" onClick={() => toast.success('Custom pricing enabled')}>Enable Custom Pricing</Button>
                  <Button variant="outlined" onClick={() => toast.success('Annual contracts enabled')}>Enable Annual Contracts</Button>
                  <Button variant="outlined" onClick={() => toast.success('Purchase orders enabled')}>Enable Purchase Orders</Button>
                  <Button variant="contained" onClick={() => toast.success('Enterprise config saved')}>Save Enterprise Config</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── Organization Billing ── */}
      {tab === 'organization-billing' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Organization Billing</Typography>
                <TableContainer component={Paper} sx={{ border: '1px solid #E2E8F0' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Total Available Credits</TableCell>
                        <TableCell>Total Used Credits</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {members.map((member) => {
                        const userKey = member.userId || ownerId;
                        const userWallets = allOwnerWallets.filter((w) => w.memberUserId === userKey);
                        const available = userWallets.reduce((sum, w) => sum + w.available, 0);
                        const used = userWallets.reduce((sum, w) => sum + w.used, 0);
                        return (
                          <TableRow key={member.id}>
                            <TableCell>{member.fullName}</TableCell>
                            <TableCell>{member.role}</TableCell>
                            <TableCell>{available}</TableCell>
                            <TableCell>{used}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Typography variant="h6" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>Set Monthly Limits Per Member</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>User</InputLabel>
                      <Select value={orgLimitUser} label="User" onChange={(e) => setOrgLimitUser(e.target.value)}>
                        {members.map((m) => <MenuItem key={m.id} value={m.userId || ownerId}>{m.fullName}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2}><TextField fullWidth label="Monthly Spend" value={orgLimitForm.monthlySpendLimit} onChange={(e) => setOrgLimitForm((s) => ({ ...s, monthlySpendLimit: e.target.value }))} /></Grid>
                  <Grid item xs={12} md={2}><TextField fullWidth label="AI Limit" value={orgLimitForm.aiRequestLimit} onChange={(e) => setOrgLimitForm((s) => ({ ...s, aiRequestLimit: e.target.value }))} /></Grid>
                  <Grid item xs={12} md={2}><TextField fullWidth label="Resume Limit" value={orgLimitForm.resumeUnlockLimit} onChange={(e) => setOrgLimitForm((s) => ({ ...s, resumeUnlockLimit: e.target.value }))} /></Grid>
                  <Grid item xs={12} md={2}><TextField fullWidth label="Promo Limit" value={orgLimitForm.promotionCreditLimit} onChange={(e) => setOrgLimitForm((s) => ({ ...s, promotionCreditLimit: e.target.value }))} /></Grid>
                  <Grid item xs={12} md={1}><Button fullWidth variant="contained" onClick={saveOrgLimit}>Save</Button></Grid>
                </Grid>

                <TableContainer component={Paper} sx={{ border: '1px solid #E2E8F0', mt: 1.5 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Spend Limit</TableCell>
                        <TableCell>AI</TableCell>
                        <TableCell>Resume</TableCell>
                        <TableCell>Promotion</TableCell>
                        <TableCell>Automation</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orgLimits.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.memberUserId}</TableCell>
                          <TableCell>{row.monthlySpendLimit}</TableCell>
                          <TableCell>{row.aiRequestLimit}</TableCell>
                          <TableCell>{row.resumeUnlockLimit}</TableCell>
                          <TableCell>{row.promotionCreditLimit}</TableCell>
                          <TableCell>{row.automationCreditLimit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── Credit Allocation ── */}
      {tab === 'credit-allocation' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Allocate Credits</Typography>
                <Stack spacing={1}>
                  <FormControl fullWidth>
                    <InputLabel>Recruiter</InputLabel>
                    <Select value={allocationToUser} label="Recruiter" onChange={(e) => setAllocationToUser(e.target.value)}>
                      {members.map((m) => (
                        <MenuItem key={m.id} value={m.userId || ownerId}>{m.fullName} ({m.role})</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel>Credit Type</InputLabel>
                    <Select value={allocationType} label="Credit Type" onChange={(e) => setAllocationType(e.target.value as CreditWalletType)}>
                      {(Object.keys(walletLabelMap) as CreditWalletType[]).map((type) => (
                        <MenuItem key={type} value={type}>{walletLabelMap[type]}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField label="Credits to Allocate" value={allocationAmount} onChange={(e) => setAllocationAmount(e.target.value)} fullWidth />
                  <Button variant="contained" onClick={allocateCredits}>Allocate Credits</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={7}>
            <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Allocation Ledger</Typography>
                <TableContainer component={Paper} sx={{ border: '1px solid #E2E8F0' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>From</TableCell>
                        <TableCell>To</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Credits</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {allocationLedger.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{formatDate(entry.at)}</TableCell>
                          <TableCell>{entry.fromUserId}</TableCell>
                          <TableCell>{entry.toUserId}</TableCell>
                          <TableCell>{walletLabelMap[entry.walletType]}</TableCell>
                          <TableCell>{entry.credits}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── Refunds ── */}
      {tab === 'refunds' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Refund Management</Typography>
                <Stack spacing={1}>
                  <FormControl fullWidth>
                    <InputLabel>Transaction</InputLabel>
                    <Select value={refundPaymentId} label="Transaction" onChange={(e) => setRefundPaymentId(e.target.value)}>
                      {payments.map((p) => <MenuItem key={p.id} value={p.id}>{p.transactionId} — {p.amount}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField fullWidth multiline minRows={3} label="Reason" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
                  <Button variant="contained" startIcon={<RefundIcon />} onClick={submitRefund}>Process Refund</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={7}>
            <TableContainer component={Paper} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Transaction</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {refunds.map((refund) => (
                    <TableRow key={refund.id}>
                      <TableCell>{payments.find((p) => p.id === refund.transactionId)?.transactionId || refund.transactionId}</TableCell>
                      <TableCell>{refund.amount}</TableCell>
                      <TableCell>
                        <Chip size="small" label={refund.status} color={['processed', 'approved'].includes(refund.status) ? 'success' : refund.status === 'rejected' ? 'error' : 'warning'} />
                      </TableCell>
                      <TableCell>{refund.reason}</TableCell>
                      <TableCell>{formatDate(refund.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {/* ── Taxes ── */}
      {tab === 'taxes' && (
        <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Tax Configuration</Typography>
            <Typography variant="body2" sx={{ color: '#64748B', mb: 1.5 }}>
              Configurable tax rules: {taxTypeOptions.join(', ')}. Applies to all invoices and credit purchases.
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} md={3}><TextField fullWidth label="GST %" value={taxValues.gstPercent} onChange={(e) => setTaxValues((t) => ({ ...t, gstPercent: Number(e.target.value) }))} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="VAT %" value={taxValues.vatPercent} onChange={(e) => setTaxValues((t) => ({ ...t, vatPercent: Number(e.target.value) }))} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="Sales Tax %" value={taxValues.salesTaxPercent} onChange={(e) => setTaxValues((t) => ({ ...t, salesTaxPercent: Number(e.target.value) }))} /></Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Currency</InputLabel>
                  <Select value={taxValues.currency} label="Currency" onChange={(e) => setTaxValues((t) => ({ ...t, currency: e.target.value as 'INR' | 'USD' | 'EUR' }))}>
                    <MenuItem value="INR">INR</MenuItem>
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="EUR">EUR</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={1}><Button fullWidth variant="contained" onClick={applyTaxConfig}>Save</Button></Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* ── Payment Gateways ── */}
      {tab === 'payment-gateways' && (
        <Grid container spacing={1.2}>
          {paymentGatewayOptions.map((gw) => (
            <Grid item xs={12} md={6} key={gw.id}>
              <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{gw.label}</Typography>
                    <Chip size="small" label={gw.status} color={gw.status === 'active' ? 'success' : gw.status === 'configured' ? 'warning' : 'default'} />
                  </Stack>
                  {(gw.id === 'razorpay' || gw.id === 'stripe') && (
                    <Stack spacing={1}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Key ID"
                        value={gatewayApiKeys[gw.id as 'razorpay' | 'stripe'].keyId}
                        onChange={(e) => setGatewayApiKeys((k) => ({ ...k, [gw.id]: { ...k[gw.id as 'razorpay' | 'stripe'], keyId: e.target.value } }))}
                      />
                      <TextField
                        fullWidth
                        size="small"
                        label="Secret Key"
                        type="password"
                        value={gatewayApiKeys[gw.id as 'razorpay' | 'stripe'].secret}
                        onChange={(e) => setGatewayApiKeys((k) => ({ ...k, [gw.id]: { ...k[gw.id as 'razorpay' | 'stripe'], secret: e.target.value } }))}
                      />
                    </Stack>
                  )}
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button size="small" variant="contained" startIcon={<GatewayIcon />} onClick={() => toast.success(`${gw.label} configured`)}>
                      {gw.status === 'active' ? 'Update' : 'Configure'}
                    </Button>
                    {gw.status === 'active' && (
                      <Button size="small" variant="outlined" color="error" onClick={() => toast.success(`${gw.label} disabled`)}>Disable</Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Invoice Templates ── */}
      {tab === 'invoice-templates' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Invoice Template Configuration</Typography>
                <Stack spacing={1}>
                  <TextField fullWidth label="Company Name" defaultValue="Jobpoyt" />
                  <TextField fullWidth label="GST Number" defaultValue="27XXXXX1234X1ZX" />
                  <TextField fullWidth label="Address Line 1" defaultValue="123, Tech Park, Bengaluru" />
                  <TextField fullWidth label="Address Line 2" defaultValue="Karnataka - 560001, India" />
                  <TextField fullWidth label="Footer Text" defaultValue="Thank you for your business." />
                  <TextField fullWidth label="Terms & Conditions" multiline minRows={3} defaultValue="Payment due within 15 days of invoice date." />
                  <Button variant="contained" startIcon={<InvoiceTemplateIcon />} onClick={() => toast.success('Invoice template saved')}>
                    Save Template
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Recent Invoices</Typography>
                <TableContainer component={Paper} sx={{ border: '1px solid #E2E8F0' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Invoice #</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoices.slice(0, 8).map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell>{inv.invoiceNumber}</TableCell>
                          <TableCell>{formatDate(inv.date)}</TableCell>
                          <TableCell>{inv.amount}</TableCell>
                          <TableCell><Chip size="small" label={inv.status} color={inv.status === 'paid' ? 'success' : inv.status === 'failed' ? 'error' : 'warning'} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── Billing Notifications ── */}
      {tab === 'billing-notifications' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Notification Rules</Typography>
                <Stack spacing={0.8}>
                  <Alert severity="success">Payment Success — Trigger: on payment confirmation</Alert>
                  <Alert severity="error">Payment Failed — Trigger: on payment failure</Alert>
                  <Alert severity="warning">Credits Low — Trigger: when below 20% of quota</Alert>
                  <Alert severity="success">Subscription Renewed — Trigger: on auto-renewal</Alert>
                  <Alert severity="warning">Trial Expiring — Trigger: 3 days before trial end</Alert>
                  <Alert severity="info">Invoice Generated — Trigger: on invoice creation</Alert>
                  <Alert severity="warning">Subscription Expiring — Trigger: 7 days before renewal</Alert>
                </Stack>
                <Button variant="outlined" sx={{ mt: 1.5 }} onClick={() => toast.success('Notification rules saved')}>
                  Save Notification Rules
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Recent Notification Feed</Typography>
                <Stack spacing={0.7}>
                  {notifications.slice(0, 10).map((note) => (
                    <Alert
                      key={note.id}
                      severity={note.type.includes('failed') ? 'error' : note.type.includes('credits_low') ? 'warning' : 'info'}
                    >
                      {note.message}
                    </Alert>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── Billing Reports ── */}
      {tab === 'billing-reports' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={7}>
            <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Billing Reports</Typography>
                <Stack spacing={0.8}>
                  {[
                    { label: 'Monthly Spend Report', key: 'monthlySpend' },
                    { label: 'Yearly Spend Report', key: 'yearlySpend' },
                    { label: 'Credit Consumption Report', key: 'creditConsumption' },
                    { label: 'Subscription History Report', key: 'subscriptionHistory' },
                    { label: 'Invoice History Report', key: 'invoiceHistory' },
                    { label: 'Payment Success Rate Report', key: 'paymentSuccessRate' },
                  ].map(({ label, key }) => (
                    <Button
                      key={key}
                      variant="outlined"
                      startIcon={<ReportsIcon />}
                      onClick={async () => {
                        const reports = await billingSubscriptionService.generateReports(ownerId);
                        downloadText(`${key}.md`, (reports as any)[key]);
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Report Summary</Typography>
                {statCard('Total Invoices', invoices.length)}
                <Box sx={{ mt: 1 }}>{statCard('Total Refunds', refunds.length)}</Box>
                <Box sx={{ mt: 1 }}>{statCard('Total Payments', payments.length)}</Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── Revenue Analytics ── */}
      {tab === 'revenue-analytics' && (
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={3}>{statCard('MRR (INR)', overview.monthlySpend ?? 0, '#1D4ED8')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('ARR Estimate (INR)', (overview.monthlySpend ?? 0) * 12, '#0F766E')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Total Invoiced', invoices.length, '#7C3AED')}</Grid>
          <Grid item xs={12} sm={6} md={3}>{statCard('Paid Invoices', invoices.filter((i) => i.status === 'paid').length, '#D97706')}</Grid>
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Revenue by Plan</Typography>
                <Stack spacing={0.6}>
                  {plans.map((plan) => (
                    <Stack key={plan.id} direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">{plan.name}</Typography>
                      <Chip size="small" label={`INR ${plan.priceMonthly}/mo`} icon={<RevenueIcon />} />
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── Subscription Analytics ── */}
      {tab === 'subscription-analytics' && (
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={4}>{statCard('Current Plan', overview.currentPlan ?? '-', '#1D4ED8')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Subscription Status', overview.subscriptionStatus ?? '-', '#0F766E')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Next Billing Date', overview.nextBillingDate ?? '-', '#7C3AED')}</Grid>
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Subscription History</Typography>
                <Alert severity="info">Full subscription analytics including churn rate, upgrade/downgrade ratios, and retention metrics are available in the billing reports.</Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── Plan Analytics ── */}
      {tab === 'plan-analytics' && (
        <Grid container spacing={1.5}>
          {plans.map((plan) => (
            <Grid item xs={12} md={6} lg={4} key={plan.id}>
              <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{plan.name}</Typography>
                  <Typography variant="body2" sx={{ color: '#64748B' }}>Monthly: INR {plan.priceMonthly}</Typography>
                  <Stack direction="row" spacing={0.6} sx={{ mt: 1, flexWrap: 'wrap' }}>
                    <Chip size="small" label={`Jobs: ${plan.limits.jobs}`} />
                    <Chip size="small" label={`AI: ${plan.limits.aiRequests}`} />
                    <Chip size="small" label={`Resumes: ${plan.limits.resumeUnlockCredits}`} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Coupon Analytics ── */}
      {tab === 'coupon-analytics' && (
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={4}>{statCard('Total Coupons', coupons.length, '#1D4ED8')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Total Redemptions', coupons.reduce((s, c) => s + c.usedCount, 0), '#0F766E')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Avg Usage Rate', `${coupons.length > 0 ? Math.round(coupons.reduce((s, c) => s + (c.usedCount / Math.max(1, c.usageLimit)) * 100, 0) / coupons.length) : 0}%`, '#7C3AED')}</Grid>
          <Grid item xs={12}>
            <TableContainer component={Paper} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Discount %</TableCell>
                    <TableCell>Redemptions</TableCell>
                    <TableCell>Limit</TableCell>
                    <TableCell>Usage Rate</TableCell>
                    <TableCell>Expiry</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {coupons.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.code}</TableCell>
                      <TableCell>{c.discountPercent || '-'}</TableCell>
                      <TableCell>{c.usedCount}</TableCell>
                      <TableCell>{c.usageLimit}</TableCell>
                      <TableCell>{Math.round((c.usedCount / Math.max(1, c.usageLimit)) * 100)}%</TableCell>
                      <TableCell>{formatDate(c.expiry)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {/* ── Promotion Analytics ── */}
      {tab === 'promotion-analytics' && (
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={4}>{statCard('Total Promotions', promotions.length, '#1D4ED8')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Total Impressions', promotions.reduce((s, p) => s + p.impressions, 0), '#0F766E')}</Grid>
          <Grid item xs={12} sm={6} md={4}>{statCard('Total Clicks', promotions.reduce((s, p) => s + p.clicks, 0), '#7C3AED')}</Grid>
          <Grid item xs={12}>
            <TableContainer component={Paper} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Job ID</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Credits Spent</TableCell>
                    <TableCell>Impressions</TableCell>
                    <TableCell>Clicks</TableCell>
                    <TableCell>CTR</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {promotions.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.jobId}</TableCell>
                      <TableCell>{p.type}</TableCell>
                      <TableCell>{p.durationDays}d</TableCell>
                      <TableCell>{p.creditsSpent}</TableCell>
                      <TableCell>{p.impressions}</TableCell>
                      <TableCell>{p.clicks}</TableCell>
                      <TableCell>{p.impressions > 0 ? `${((p.clicks / p.impressions) * 100).toFixed(1)}%` : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {/* ── Audit Logs ── */}
      {tab === 'audit-logs' && (
        <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Billing Audit Logs</Typography>
            <TableContainer component={Paper} sx={{ border: '1px solid #E2E8F0' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Event</TableCell>
                    <TableCell>Actor</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.slice(0, 10).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{formatDate(p.date)}</TableCell>
                      <TableCell>Payment {p.status}</TableCell>
                      <TableCell>{p.method}</TableCell>
                      <TableCell>{p.transactionId} — {p.amount}</TableCell>
                    </TableRow>
                  ))}
                  {refunds.slice(0, 5).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{formatDate(r.createdAt)}</TableCell>
                      <TableCell>Refund {r.status}</TableCell>
                      <TableCell>Admin</TableCell>
                      <TableCell>{r.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button variant="outlined" startIcon={<DownloadIcon />} sx={{ mt: 1.5 }} onClick={() => toast.success('Audit log exported')}>
              Export Audit Log
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── System Settings ── */}
      {tab === 'system-settings' && (
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Billing System Settings</Typography>
                <Stack spacing={1}>
                  <TextField fullWidth label="Invoice Prefix" defaultValue="INV-" />
                  <TextField fullWidth label="Default Currency" defaultValue="INR" />
                  <TextField fullWidth label="Grace Period (days)" defaultValue="7" />
                  <TextField fullWidth label="Max Refund Window (days)" defaultValue="30" />
                  <TextField fullWidth label="Trial Duration (days)" defaultValue="14" />
                  <Button variant="contained" startIcon={<SettingsIcon />} onClick={() => toast.success('System settings saved')}>
                    Save Settings
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Billing Rules</Typography>
                <Stack spacing={1}>
                  <Alert severity="info">Auto-suspend after 3 failed payment attempts</Alert>
                  <Alert severity="info">Credits expire after 12 months of inactivity</Alert>
                  <Alert severity="info">Refunds processed within 7 business days</Alert>
                  <Alert severity="info">GST invoices auto-generated on every purchase</Alert>
                  <Button variant="outlined" onClick={() => toast.success('Billing rules updated')}>Update Rules</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AdminBillingManagement;
