import { addDays, addMonths, format } from 'date-fns';
import { jobService } from '@services/api';
import { listInterviews } from '@services/interviewManagement';
import { aiHiringAssistantService } from '@services/aiHiringAssistant';
import { automationCenterService } from '@services/automationCenter';
import { integrationsHubService } from '@services/integrationsHub';
import { teamManagementService } from '@services/teamManagement';
import { supabase } from '@services/supabase';

export const RECRUITER_PLAN_DURATIONS = [1, 3, 6, 12] as const;
export type RecruiterPlanDuration = (typeof RECRUITER_PLAN_DURATIONS)[number];
export type PlanId = 'free' | 'actro_recruiter_pro';
export type SubscriptionStatus = 'active' | 'trial' | 'paused' | 'cancelled' | 'expired';
export type BillingCycle = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'annual_contract';
export type CreditWalletType =
  | 'resume_unlock'
  | 'ai'
  | 'featured_job'
  | 'job_promotion'
  | 'bulk_messaging'
  | 'interview'
  | 'automation'
  | 'api';

export type PaymentMethod =
  | 'credit_debit_card'
  | 'upi'
  | 'net_banking'
  | 'wallet'
  | 'razorpay'
  | 'stripe'
  | 'manual_invoice';

export interface PlanLimits {
  jobs: number;
  recruiters: number;
  aiRequests: number;
  resumeUnlockCredits: number;
  automationRules: number;
  storageGb: number;
  integrations: number;
  analytics: 'basic' | 'advanced' | 'enterprise';
  support: 'community' | 'priority' | 'dedicated';
}

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  limits: PlanLimits;
  features: string[];
}

export interface RecruiterSubscriptionRecord {
  id: string;
  ownerId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  startDate: string;
  renewalDate: string;
  nextBillingDate: string;
  autoRenewal: boolean;
  billingCycle: BillingCycle;
  pauseAt?: string;
  cancelAt?: string;
  trialEndsAt?: string;
  customPricing?: number;
}

export interface CreditWallet {
  id: string;
  ownerId: string;
  memberUserId: string;
  type: CreditWalletType;
  available: number;
  used: number;
  purchased: number;
  expired: number;
  updatedAt: string;
}

export interface CreditPackage {
  id: string;
  type: CreditWalletType;
  name: string;
  credits: number;
  price: number;
}

export interface CouponDefinition {
  id: string;
  ownerId: string;
  code: string;
  discountPercent?: number;
  flatDiscount?: number;
  expiry: string;
  usageLimit: number;
  usedCount: number;
  minimumPurchase: number;
  active: boolean;
}

export interface PurchasePreview {
  subTotal: number;
  discount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
  currency: string;
}

export interface PaymentTransaction {
  id: string;
  ownerId: string;
  transactionId: string;
  method: PaymentMethod;
  amount: number;
  creditsPurchased: number;
  walletType: CreditWalletType;
  status: 'success' | 'failed' | 'pending' | 'refunded';
  date: string;
  invoiceId: string;
}

export interface InvoiceRecord {
  id: string;
  ownerId: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  tax: number;
  status: 'paid' | 'pending' | 'failed' | 'cancelled';
  emailed: boolean;
  paymentTransactionId: string;
  lineItems: Array<{ label: string; amount: number }>;
}

export interface RefundRecord {
  id: string;
  ownerId: string;
  transactionId: string;
  amount: number;
  reason: string;
  status: 'requested' | 'approved' | 'rejected' | 'processed';
  createdAt: string;
  updatedAt: string;
}

export interface TaxConfig {
  ownerId: string;
  gstPercent: number;
  vatPercent: number;
  salesTaxPercent: number;
  currency: 'INR' | 'USD' | 'EUR';
}

export interface BillingNotification {
  id: string;
  ownerId: string;
  type:
    | 'payment_success'
    | 'payment_failed'
    | 'credits_low'
    | 'subscription_renewed'
    | 'trial_expiring'
    | 'invoice_generated';
  message: string;
  createdAt: string;
  read: boolean;
}

export interface OrganizationLimit {
  id: string;
  ownerId: string;
  memberUserId: string;
  monthlySpendLimit: number;
  aiRequestLimit: number;
  resumeUnlockLimit: number;
  promotionCreditLimit: number;
  automationCreditLimit: number;
}

export interface BillingUsageSnapshot {
  jobsPosted: number;
  applicationsReceived: number;
  resumeUnlocks: number;
  aiUsage: number;
  interviewUsage: number;
  automationUsage: number;
  apiCalls: number;
  storageUsedGb: number;
}

interface BillingStore {
  subscriptions: RecruiterSubscriptionRecord[];
  wallets: CreditWallet[];
  coupons: CouponDefinition[];
  payments: PaymentTransaction[];
  invoices: InvoiceRecord[];
  refunds: RefundRecord[];
  notifications: BillingNotification[];
  orgLimits: OrganizationLimit[];
  taxes: TaxConfig[];
  allocationLedger: Array<{
    id: string;
    ownerId: string;
    fromUserId: string;
    toUserId: string;
    walletType: CreditWalletType;
    credits: number;
    at: string;
  }>;
  subscriptionHistory: Array<{
    id: string;
    ownerId: string;
    action: 'upgrade' | 'downgrade' | 'cancel' | 'pause' | 'resume' | 'renew';
    fromPlan?: PlanId;
    toPlan?: PlanId;
    at: string;
  }>;
  promotions: Array<{
    id: string;
    ownerId: string;
    jobId: string;
    type: 'promoted' | 'featured';
    durationDays: number;
    creditsSpent: number;
    impressions: number;
    clicks: number;
    startsAt: string;
    endsAt: string;
  }>;
}

export interface BillingOverview {
  currentPlan: string;
  subscriptionStatus: string;
  creditsRemaining: number;
  creditsUsedThisMonth: number;
  jobsPosted: number;
  resumeUnlocks: number;
  aiRequestsUsed: number;
  automationRuns: number;
  nextBillingDate: string;
  monthlySpend: number;
}

const STORAGE_KEY = 'actro_billing_subscription_v1';

const allWalletTypes: CreditWalletType[] = [
  'resume_unlock',
  'ai',
  'featured_job',
  'job_promotion',
  'bulk_messaging',
  'interview',
  'automation',
  'api',
];

const walletLabelMap: Record<CreditWalletType, string> = {
  resume_unlock: 'Resume Unlock Credits',
  ai: 'AI Credits',
  featured_job: 'Featured Job Credits',
  job_promotion: 'Job Promotion Credits',
  bulk_messaging: 'Bulk Messaging Credits',
  interview: 'Interview Credits',
  automation: 'Automation Credits',
  api: 'API Credits',
};

export const RECRUITER_PLAN_PRICING: Record<RecruiterPlanDuration, number> = {
  1: 999,
  3: 2499,
  6: 4499,
  12: 7999,
};

export const RECRUITER_TEAM_LIMITS: Record<RecruiterPlanDuration, number> = {
  1: 10,
  3: 10,
  6: 10,
  12: 15,
};

const planCatalog: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'FREE',
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      jobs: 15,
      recruiters: 1,
      aiRequests: 30,
      resumeUnlockCredits: 150,
      automationRules: 2,
      storageGb: 1,
      integrations: 1,
      analytics: 'basic',
      support: 'community',
    },
    features: ['15 free job posts', '150 free resume views', 'One-time onboarding benefit', 'Basic dashboard access'],
  },
  {
    id: 'actro_recruiter_pro',
    name: 'JOBPOYT RECRUITER PRO',
    priceMonthly: 999,
    priceYearly: 7999,
    limits: {
      jobs: 9999,
      recruiters: 15,
      aiRequests: 9999,
      resumeUnlockCredits: 9999,
      automationRules: 9999,
      storageGb: 999,
      integrations: 999,
      analytics: 'advanced',
      support: 'priority',
    },
    features: ['Unlimited job posting', 'Priority candidate access', 'Team member management', 'Advanced recruiter suite'],
  },
];

const creditPackages: CreditPackage[] = [
  { id: 'ai_100', type: 'ai', name: 'AI Starter 100', credits: 100, price: 499 },
  { id: 'ai_500', type: 'ai', name: 'AI Growth 500', credits: 500, price: 1999 },
  { id: 'resume_100', type: 'resume_unlock', name: 'Resume Pack 100', credits: 100, price: 799 },
  { id: 'promo_50', type: 'job_promotion', name: 'Promotion Pack 50', credits: 50, price: 1499 },
  { id: 'featured_20', type: 'featured_job', name: 'Featured Pack 20', credits: 20, price: 999 },
  { id: 'bulk_1000', type: 'bulk_messaging', name: 'Bulk Messaging 1000', credits: 1000, price: 699 },
  { id: 'automation_200', type: 'automation', name: 'Automation 200', credits: 200, price: 1299 },
  { id: 'api_10000', type: 'api', name: 'API Calls 10k', credits: 10000, price: 999 },
  { id: 'interview_200', type: 'interview', name: 'Interview Credits 200', credits: 200, price: 899 },
];

const makeId = (prefix: string): string => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const readStore = (): BillingStore => safeParse<BillingStore>(localStorage.getItem(STORAGE_KEY), {
  subscriptions: [],
  wallets: [],
  coupons: [],
  payments: [],
  invoices: [],
  refunds: [],
  notifications: [],
  orgLimits: [],
  taxes: [],
  allocationLedger: [],
  subscriptionHistory: [],
  promotions: [],
});

const writeStore = (store: BillingStore): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

const nowIso = (): string => new Date().toISOString();

const defaultTaxes = (ownerId: string): TaxConfig => ({
  ownerId,
  gstPercent: 18,
  vatPercent: 0,
  salesTaxPercent: 0,
  currency: 'INR',
});

const ensureTaxConfig = (store: BillingStore, ownerId: string): TaxConfig => {
  const existing = store.taxes.find((item) => item.ownerId === ownerId);
  if (existing) return existing;
  const created = defaultTaxes(ownerId);
  store.taxes.push(created);
  return created;
};

const ensureSubscription = (store: BillingStore, ownerId: string): RecruiterSubscriptionRecord => {
  const existing = store.subscriptions.find((item) => item.ownerId === ownerId);
  if (existing) return existing;

  const now = new Date();
  const created: RecruiterSubscriptionRecord = {
    id: makeId('sub'),
    ownerId,
    planId: 'free',
    status: 'trial',
    startDate: now.toISOString(),
    renewalDate: addMonths(now, 1).toISOString(),
    nextBillingDate: addMonths(now, 1).toISOString(),
    autoRenewal: false,
    billingCycle: 'monthly',
    trialEndsAt: addDays(now, 14).toISOString(),
  };

  store.subscriptions.push(created);
  return created;
};

const ensureWallet = (store: BillingStore, ownerId: string, memberUserId: string, type: CreditWalletType): CreditWallet => {
  const existing = store.wallets.find((item) => item.ownerId === ownerId && item.memberUserId === memberUserId && item.type === type);
  if (existing) return existing;

  const defaults: Record<CreditWalletType, number> = {
    resume_unlock: 20,
    ai: 30,
    featured_job: 5,
    job_promotion: 5,
    bulk_messaging: 200,
    interview: 20,
    automation: 20,
    api: 500,
  };

  const created: CreditWallet = {
    id: makeId('wallet'),
    ownerId,
    memberUserId,
    type,
    available: defaults[type],
    used: 0,
    purchased: 0,
    expired: 0,
    updatedAt: nowIso(),
  };

  store.wallets.push(created);
  return created;
};

const pushNotification = (store: BillingStore, ownerId: string, type: BillingNotification['type'], message: string): void => {
  store.notifications.unshift({
    id: makeId('bill_notif'),
    ownerId,
    type,
    message,
    createdAt: nowIso(),
    read: false,
  });
  store.notifications = store.notifications.slice(0, 2000);
};

const currentMonthKey = (): string => format(new Date(), 'yyyy-MM');

const walletAvailableSum = (wallets: CreditWallet[]): number => wallets.reduce((sum, item) => sum + item.available, 0);

const walletUsedMonth = (wallets: CreditWallet[]): number => wallets.reduce((sum, item) => sum + item.used, 0);

const formatInvoiceNo = (idx: number): string => `INV-${format(new Date(), 'yyyyMMdd')}-${String(idx).padStart(4, '0')}`;

export const billingSubscriptionService = {
  getPlanCatalog(): SubscriptionPlan[] {
    return [...planCatalog];
  },

  getRecruiterPlanCatalog(): SubscriptionPlan[] {
    return [...planCatalog];
  },

  getRecruiterPlanPricing(duration: RecruiterPlanDuration): { price: number; teamMemberLimit: number; label: string } {
    const price = RECRUITER_PLAN_PRICING[duration];
    const teamMemberLimit = RECRUITER_TEAM_LIMITS[duration];
    return {
      price,
      teamMemberLimit,
      label: `${duration} Month${duration > 1 ? 's' : ''}`,
    };
  },

  getCreditPackages(type?: CreditWalletType): CreditPackage[] {
    return creditPackages.filter((item) => !type || item.type === type);
  },

  getWalletLabelMap(): Record<CreditWalletType, string> {
    return walletLabelMap;
  },

  initialize(ownerId: string, memberUserId: string): void {
    const store = readStore();
    ensureSubscription(store, ownerId);
    ensureTaxConfig(store, ownerId);
    allWalletTypes.forEach((type) => ensureWallet(store, ownerId, memberUserId, type));
    writeStore(store);
  },

  getSubscription(ownerId: string): RecruiterSubscriptionRecord {
    const store = readStore();
    const sub = ensureSubscription(store, ownerId);
    writeStore(store);
    return sub;
  },

  getPlan(planId: PlanId): SubscriptionPlan {
    const plan = planCatalog.find((item) => item.id === planId);
    if (!plan) throw new Error('Plan not found');
    return plan;
  },

  updateSubscription(ownerId: string, action: 'upgrade' | 'downgrade' | 'cancel' | 'pause' | 'resume', payload?: {
    planId?: PlanId;
    billingCycle?: BillingCycle;
    autoRenewal?: boolean;
  }): RecruiterSubscriptionRecord {
    const store = readStore();
    const sub = ensureSubscription(store, ownerId);
    const fromPlan = sub.planId;

    let next: RecruiterSubscriptionRecord = { ...sub };

    if (action === 'upgrade' || action === 'downgrade') {
      if (!payload?.planId) throw new Error('Plan id is required');
      next = {
        ...next,
        planId: payload.planId,
        status: 'active',
        billingCycle: payload.billingCycle || next.billingCycle,
        autoRenewal: payload.autoRenewal ?? true,
        renewalDate: addMonths(new Date(), 1).toISOString(),
        nextBillingDate: addMonths(new Date(), 1).toISOString(),
      };
    }

    if (action === 'cancel') {
      next = {
        ...next,
        status: 'cancelled',
        cancelAt: nowIso(),
        autoRenewal: false,
      };
    }

    if (action === 'pause') {
      next = {
        ...next,
        status: 'paused',
        pauseAt: nowIso(),
      };
    }

    if (action === 'resume') {
      next = {
        ...next,
        status: 'active',
        pauseAt: undefined,
        renewalDate: addMonths(new Date(), 1).toISOString(),
        nextBillingDate: addMonths(new Date(), 1).toISOString(),
      };
    }

    store.subscriptions = store.subscriptions.map((item) => item.ownerId === ownerId ? next : item);
    store.subscriptionHistory.unshift({
      id: makeId('sub_hist'),
      ownerId,
      action,
      fromPlan,
      toPlan: next.planId,
      at: nowIso(),
    });

    if (action === 'upgrade' || action === 'downgrade' || action === 'resume') {
      pushNotification(store, ownerId, 'subscription_renewed', `Subscription updated to ${this.getPlan(next.planId).name}`);
    }

    writeStore(store);
    return next;
  },

  getWallets(ownerId: string, memberUserId: string): CreditWallet[] {
    const store = readStore();
    allWalletTypes.forEach((type) => ensureWallet(store, ownerId, memberUserId, type));
    writeStore(store);
    return store.wallets.filter((wallet) => wallet.ownerId === ownerId && wallet.memberUserId === memberUserId);
  },

  getAllWalletsForOwner(ownerId: string): CreditWallet[] {
    return readStore().wallets.filter((wallet) => wallet.ownerId === ownerId);
  },

  consumeCredits(ownerId: string, memberUserId: string, type: CreditWalletType, amount: number): CreditWallet {
    const store = readStore();
    const wallet = ensureWallet(store, ownerId, memberUserId, type);
    if (wallet.available < amount) {
      pushNotification(store, ownerId, 'credits_low', `${walletLabelMap[type]} are low for ${memberUserId}`);
      writeStore(store);
      throw new Error('Insufficient credits');
    }

    const next = {
      ...wallet,
      available: Math.max(0, wallet.available - amount),
      used: wallet.used + amount,
      updatedAt: nowIso(),
    };

    store.wallets = store.wallets.map((item) => item.id === wallet.id ? next : item);

    if (next.available <= 10) {
      pushNotification(store, ownerId, 'credits_low', `${walletLabelMap[type]} running low (${next.available} left)`);
    }

    writeStore(store);
    return next;
  },

  calculatePurchasePreview(ownerId: string, packageId: string, couponCode?: string): PurchasePreview {
    const store = readStore();
    const tax = ensureTaxConfig(store, ownerId);
    const pack = creditPackages.find((item) => item.id === packageId);
    if (!pack) throw new Error('Credit package not found');

    const subTotal = pack.price;
    let discount = 0;

    if (couponCode) {
      const coupon = store.coupons.find((item) => item.ownerId === ownerId && item.active && item.code.toLowerCase() === couponCode.toLowerCase());
      if (coupon) {
        const now = new Date();
        const exp = new Date(coupon.expiry);
        const valid = exp >= now && coupon.usedCount < coupon.usageLimit && subTotal >= coupon.minimumPurchase;
        if (valid) {
          discount += coupon.flatDiscount || 0;
          if (coupon.discountPercent) discount += Math.round((subTotal * coupon.discountPercent) / 100);
        }
      }
    }

    const taxableAmount = Math.max(0, subTotal - discount);
    const taxPercent = tax.gstPercent + tax.vatPercent + tax.salesTaxPercent;
    const taxAmount = Math.round((taxableAmount * taxPercent) / 100);
    const total = taxableAmount + taxAmount;

    return {
      subTotal,
      discount,
      taxableAmount,
      taxAmount,
      total,
      currency: tax.currency,
    };
  },

  purchaseCredits(ownerId: string, memberUserId: string, payload: {
    packageId: string;
    method: PaymentMethod;
    couponCode?: string;
  }): { wallet: CreditWallet; payment: PaymentTransaction; invoice: InvoiceRecord } {
    const store = readStore();
    const pack = creditPackages.find((item) => item.id === payload.packageId);
    if (!pack) throw new Error('Package not found');

    const preview = this.calculatePurchasePreview(ownerId, payload.packageId, payload.couponCode);
    const wallet = ensureWallet(store, ownerId, memberUserId, pack.type);

    const paymentId = makeId('pay');
    const invoiceId = makeId('inv');

    const payment: PaymentTransaction = {
      id: paymentId,
      ownerId,
      transactionId: `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      method: payload.method,
      amount: preview.total,
      creditsPurchased: pack.credits,
      walletType: pack.type,
      status: 'success',
      date: nowIso(),
      invoiceId,
    };

    const invoice: InvoiceRecord = {
      id: invoiceId,
      ownerId,
      invoiceNumber: formatInvoiceNo(store.invoices.length + 1),
      date: nowIso(),
      amount: preview.total,
      tax: preview.taxAmount,
      status: 'paid',
      emailed: false,
      paymentTransactionId: paymentId,
      lineItems: [{ label: pack.name, amount: preview.subTotal }],
    };

    const updatedWallet: CreditWallet = {
      ...wallet,
      available: wallet.available + pack.credits,
      purchased: wallet.purchased + pack.credits,
      updatedAt: nowIso(),
    };

    store.wallets = store.wallets.map((item) => item.id === wallet.id ? updatedWallet : item);
    store.payments.unshift(payment);
    store.invoices.unshift(invoice);

    if (payload.couponCode) {
      store.coupons = store.coupons.map((item) => {
        if (item.ownerId === ownerId && item.code.toLowerCase() === payload.couponCode?.toLowerCase()) {
          return { ...item, usedCount: item.usedCount + 1 };
        }
        return item;
      });
    }

    pushNotification(store, ownerId, 'payment_success', `Payment success for ${pack.name} (${pack.credits} credits)`);
    pushNotification(store, ownerId, 'invoice_generated', `Invoice ${invoice.invoiceNumber} generated`);

    writeStore(store);
    return { wallet: updatedWallet, payment, invoice };
  },

  createCoupon(ownerId: string, payload: {
    code: string;
    discountPercent?: number;
    flatDiscount?: number;
    expiry: string;
    usageLimit: number;
    minimumPurchase: number;
  }): CouponDefinition {
    const store = readStore();
    const coupon: CouponDefinition = {
      id: makeId('coupon'),
      ownerId,
      code: payload.code.trim().toUpperCase(),
      discountPercent: payload.discountPercent,
      flatDiscount: payload.flatDiscount,
      expiry: payload.expiry,
      usageLimit: payload.usageLimit,
      usedCount: 0,
      minimumPurchase: payload.minimumPurchase,
      active: true,
    };

    store.coupons.unshift(coupon);
    writeStore(store);
    return coupon;
  },

  listCoupons(ownerId: string): CouponDefinition[] {
    return readStore().coupons.filter((coupon) => coupon.ownerId === ownerId).sort((a, b) => a.code.localeCompare(b.code));
  },

  getInvoices(ownerId: string): InvoiceRecord[] {
    return readStore().invoices.filter((invoice) => invoice.ownerId === ownerId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  emailInvoice(ownerId: string, invoiceId: string): InvoiceRecord {
    const store = readStore();
    const index = store.invoices.findIndex((invoice) => invoice.ownerId === ownerId && invoice.id === invoiceId);
    if (index < 0) throw new Error('Invoice not found');
    const next = { ...store.invoices[index], emailed: true };
    store.invoices[index] = next;
    writeStore(store);
    return next;
  },

  downloadInvoiceText(ownerId: string, invoiceId: string): string {
    const invoice = this.getInvoices(ownerId).find((item) => item.id === invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const lines = [
      `Invoice Number: ${invoice.invoiceNumber}`,
      `Date: ${format(new Date(invoice.date), 'dd MMM yyyy')}`,
      `Status: ${invoice.status}`,
      '',
      'Line Items:',
      ...invoice.lineItems.map((item) => `- ${item.label}: ${item.amount}`),
      '',
      `Tax: ${invoice.tax}`,
      `Total: ${invoice.amount}`,
    ];

    return lines.join('\n');
  },

  getPayments(ownerId: string): PaymentTransaction[] {
    return readStore().payments.filter((payment) => payment.ownerId === ownerId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  requestRefund(ownerId: string, transactionId: string, reason: string): RefundRecord {
    const store = readStore();
    const payment = store.payments.find((item) => item.ownerId === ownerId && item.id === transactionId);
    if (!payment) throw new Error('Payment not found');

    const refund: RefundRecord = {
      id: makeId('refund'),
      ownerId,
      transactionId,
      amount: payment.amount,
      reason: reason.trim(),
      status: 'requested',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    store.refunds.unshift(refund);
    writeStore(store);
    return refund;
  },

  listRefunds(ownerId: string): RefundRecord[] {
    return readStore().refunds.filter((refund) => refund.ownerId === ownerId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getTaxConfig(ownerId: string): TaxConfig {
    const store = readStore();
    const tax = ensureTaxConfig(store, ownerId);
    writeStore(store);
    return tax;
  },

  updateTaxConfig(ownerId: string, updates: Partial<Omit<TaxConfig, 'ownerId'>>): TaxConfig {
    const store = readStore();
    const current = ensureTaxConfig(store, ownerId);
    const next = { ...current, ...updates };
    store.taxes = store.taxes.map((tax) => tax.ownerId === ownerId ? next : tax);
    writeStore(store);
    return next;
  },

  listNotifications(ownerId: string): BillingNotification[] {
    return readStore().notifications.filter((item) => item.ownerId === ownerId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  markNotificationRead(ownerId: string, notificationId: string): void {
    const store = readStore();
    store.notifications = store.notifications.map((item) => {
      if (item.ownerId === ownerId && item.id === notificationId) {
        return { ...item, read: true };
      }
      return item;
    });
    writeStore(store);
  },

  setOrganizationLimit(ownerId: string, payload: OrganizationLimit): OrganizationLimit {
    const store = readStore();
    const index = store.orgLimits.findIndex((item) => item.ownerId === ownerId && item.memberUserId === payload.memberUserId);
    if (index >= 0) {
      store.orgLimits[index] = { ...payload, ownerId, id: store.orgLimits[index].id };
      writeStore(store);
      return store.orgLimits[index];
    }

    const created = { ...payload, id: makeId('org_limit'), ownerId };
    store.orgLimits.push(created);
    writeStore(store);
    return created;
  },

  listOrganizationLimits(ownerId: string): OrganizationLimit[] {
    return readStore().orgLimits.filter((item) => item.ownerId === ownerId);
  },

  allocateCredits(ownerId: string, fromUserId: string, toUserId: string, type: CreditWalletType, credits: number): void {
    const store = readStore();
    const fromWallet = ensureWallet(store, ownerId, fromUserId, type);
    const toWallet = ensureWallet(store, ownerId, toUserId, type);

    if (fromWallet.available < credits) throw new Error('Not enough credits to allocate');

    const fromNext = { ...fromWallet, available: fromWallet.available - credits, updatedAt: nowIso() };
    const toNext = { ...toWallet, available: toWallet.available + credits, updatedAt: nowIso() };

    store.wallets = store.wallets.map((wallet) => {
      if (wallet.id === fromWallet.id) return fromNext;
      if (wallet.id === toWallet.id) return toNext;
      return wallet;
    });

    store.allocationLedger.unshift({
      id: makeId('alloc'),
      ownerId,
      fromUserId,
      toUserId,
      walletType: type,
      credits,
      at: nowIso(),
    });

    writeStore(store);
  },

  getAllocationLedger(ownerId: string): BillingStore['allocationLedger'] {
    return readStore().allocationLedger.filter((item) => item.ownerId === ownerId).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  },

  promoteJob(ownerId: string, memberUserId: string, payload: { jobId: string; durationDays: number; featured?: boolean }): void {
    const store = readStore();
    const type: CreditWalletType = payload.featured ? 'featured_job' : 'job_promotion';
    const creditsCost = payload.featured ? Math.max(1, payload.durationDays) : Math.max(1, Math.ceil(payload.durationDays / 2));

    const wallet = ensureWallet(store, ownerId, memberUserId, type);
    if (wallet.available < creditsCost) throw new Error('Insufficient promotion credits');

    const updatedWallet = {
      ...wallet,
      available: wallet.available - creditsCost,
      used: wallet.used + creditsCost,
      updatedAt: nowIso(),
    };

    store.wallets = store.wallets.map((item) => item.id === wallet.id ? updatedWallet : item);
    store.promotions.unshift({
      id: makeId('promo'),
      ownerId,
      jobId: payload.jobId,
      type: payload.featured ? 'featured' : 'promoted',
      durationDays: payload.durationDays,
      creditsSpent: creditsCost,
      impressions: Math.floor(1000 + Math.random() * 12000),
      clicks: Math.floor(50 + Math.random() * 600),
      startsAt: nowIso(),
      endsAt: addDays(new Date(), payload.durationDays).toISOString(),
    });

    writeStore(store);
  },

  listPromotions(ownerId: string): BillingStore['promotions'] {
    return readStore().promotions.filter((item) => item.ownerId === ownerId).sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  },

  getTrialStatus(ownerId: string): {
    trialDaysRemaining: number;
    featuresAvailable: string[];
    upgradeSuggestions: string[];
  } {
    const sub = this.getSubscription(ownerId);
    const trialEnd = sub.trialEndsAt ? new Date(sub.trialEndsAt) : addDays(new Date(sub.startDate), 14);
    const remaining = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    return {
      trialDaysRemaining: remaining,
      featuresAvailable: ['Jobs', 'Applicants', 'ATS Pipeline', 'Messaging', 'AI Basic Access'],
      upgradeSuggestions: [
        'Upgrade to Starter for higher AI and resume limits.',
        'Upgrade to Professional for advanced analytics and automation scale.',
      ],
    };
  },

  async getUsageSnapshot(ownerId: string): Promise<BillingUsageSnapshot> {
    const [jobs, interviews] = await Promise.all([
      jobService.getRecruiterJobs(ownerId).catch(() => []),
      listInterviews(ownerId).catch(() => []),
    ]);

    const jobIds = (jobs || []).map((job) => String(job.id));

    let applicationsReceived = 0;
    if (jobIds.length > 0) {
      const { count } = await supabase
        .from('job_applications')
        .select('id', { count: 'exact', head: true })
        .in('job_id', jobIds);
      applicationsReceived = Number(count || 0);
    }

    const aiUsage = aiHiringAssistantService.listRequestHistory(ownerId).length;
    const automationUsage = automationCenterService.getExecutions(ownerId).length;
    const apiCalls = integrationsHubService.getAnalytics(ownerId).apiUsage;

    const ownerWallets = this.getWallets(ownerId, ownerId);
    const resumeWallet = ownerWallets.find((wallet) => wallet.type === 'resume_unlock');

    return {
      jobsPosted: jobs.length,
      applicationsReceived,
      resumeUnlocks: Number(resumeWallet?.used || 0),
      aiUsage,
      interviewUsage: interviews.length,
      automationUsage,
      apiCalls,
      storageUsedGb: Math.max(0.1, Number((jobs.length * 0.03 + applicationsReceived * 0.002).toFixed(2))),
    };
  },

  async getBillingOverview(ownerId: string, memberUserId: string): Promise<BillingOverview> {
    const [usage, sub] = await Promise.all([
      this.getUsageSnapshot(ownerId),
      Promise.resolve(this.getSubscription(ownerId)),
    ]);

    const plan = this.getPlan(sub.planId);
    const wallets = this.getWallets(ownerId, memberUserId);

    const monthKey = currentMonthKey();
    const monthlyPayments = this.getPayments(ownerId).filter((payment) => payment.date.startsWith(monthKey));
    const monthlySpend = monthlyPayments.reduce((sum, payment) => sum + payment.amount, 0);

    return {
      currentPlan: plan.name,
      subscriptionStatus: sub.status,
      creditsRemaining: walletAvailableSum(wallets),
      creditsUsedThisMonth: walletUsedMonth(wallets),
      jobsPosted: usage.jobsPosted,
      resumeUnlocks: usage.resumeUnlocks,
      aiRequestsUsed: usage.aiUsage,
      automationRuns: usage.automationUsage,
      nextBillingDate: format(new Date(sub.nextBillingDate), 'dd MMM yyyy'),
      monthlySpend,
    };
  },

  async generateReports(ownerId: string): Promise<{
    monthlySpend: string;
    yearlySpend: string;
    creditConsumption: string;
    subscriptionHistory: string;
    invoiceHistory: string;
    paymentSuccessRate: string;
  }> {
    const payments = this.getPayments(ownerId);
    const invoices = this.getInvoices(ownerId);
    const wallets = this.getAllWalletsForOwner(ownerId);
    const subHistory = readStore().subscriptionHistory.filter((item) => item.ownerId === ownerId);

    const month = format(new Date(), 'yyyy-MM');
    const year = format(new Date(), 'yyyy');

    const monthlyAmount = payments.filter((payment) => payment.date.startsWith(month)).reduce((sum, payment) => sum + payment.amount, 0);
    const yearlyAmount = payments.filter((payment) => payment.date.startsWith(year)).reduce((sum, payment) => sum + payment.amount, 0);

    const monthlySpend = [`# Monthly Spend`, `- Month: ${month}`, `- Total: ${monthlyAmount}`].join('\n');
    const yearlySpend = [`# Yearly Spend`, `- Year: ${year}`, `- Total: ${yearlyAmount}`].join('\n');

    const consumptionRows = wallets.reduce<Record<string, { used: number; available: number; purchased: number }>>((acc, wallet) => {
      if (!acc[wallet.type]) {
        acc[wallet.type] = { used: 0, available: 0, purchased: 0 };
      }
      acc[wallet.type].used += wallet.used;
      acc[wallet.type].available += wallet.available;
      acc[wallet.type].purchased += wallet.purchased;
      return acc;
    }, {});

    const creditConsumption = [
      '# Credit Consumption',
      '| Wallet | Used | Available | Purchased |',
      '|---|---:|---:|---:|',
      ...Object.entries(consumptionRows).map(([walletType, row]) => `| ${walletLabelMap[walletType as CreditWalletType]} | ${row.used} | ${row.available} | ${row.purchased} |`),
    ].join('\n');

    const subscriptionHistory = [
      '# Subscription History',
      '| Action | From | To | At |',
      '|---|---|---|---|',
      ...subHistory.map((item) => `| ${item.action} | ${item.fromPlan || '-'} | ${item.toPlan || '-'} | ${format(new Date(item.at), 'dd MMM yyyy')} |`),
    ].join('\n');

    const invoiceHistory = [
      '# Invoice History',
      '| Invoice | Date | Amount | Tax | Status |',
      '|---|---|---:|---:|---|',
      ...invoices.map((invoice) => `| ${invoice.invoiceNumber} | ${format(new Date(invoice.date), 'dd MMM yyyy')} | ${invoice.amount} | ${invoice.tax} | ${invoice.status} |`),
    ].join('\n');

    const success = payments.filter((payment) => payment.status === 'success').length;
    const rate = payments.length > 0 ? Math.round((success / payments.length) * 100) : 0;
    const paymentSuccessRate = [`# Payment Success Rate`, `- Successful Payments: ${success}`, `- Total Payments: ${payments.length}`, `- Success Rate: ${rate}%`].join('\n');

    return {
      monthlySpend,
      yearlySpend,
      creditConsumption,
      subscriptionHistory,
      invoiceHistory,
      paymentSuccessRate,
    };
  },

  getEnterpriseBilling(ownerId: string): {
    customPricing: boolean;
    annualContracts: boolean;
    purchaseOrders: boolean;
    manualInvoices: boolean;
    dedicatedAccountManager: boolean;
  } {
    const sub = this.getSubscription(ownerId);
    const isEnterprise = sub.planId === 'enterprise';
    return {
      customPricing: isEnterprise,
      annualContracts: isEnterprise,
      purchaseOrders: isEnterprise,
      manualInvoices: isEnterprise,
      dedicatedAccountManager: isEnterprise,
    };
  },

  canManageBilling(ownerId: string, currentUserId: string): boolean {
    const access = teamManagementService.getAccessContext(ownerId, currentUserId);
    if (access.currentRole === 'owner' || access.currentRole === 'company_admin') return true;
    return access.permissions.includes('billing.manage_subscription') || access.permissions.includes('billing.buy_credits') || access.permissions.includes('billing.invoices');
  },
};
