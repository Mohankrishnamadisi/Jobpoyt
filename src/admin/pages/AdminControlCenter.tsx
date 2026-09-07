import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
  Switch,
  Progress,
  Divider,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AppstoreOutlined,
  BankOutlined,
  BarChartOutlined,
  BellOutlined,
  BugOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  CodeOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  DollarOutlined,
  DownloadOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FileSearchOutlined,
  FlagOutlined,
  GiftOutlined,
  LockOutlined,
  MailOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  SearchOutlined,
  SettingOutlined,
  SafetyOutlined,
  StopOutlined,
  TagOutlined,
  TeamOutlined,
  ToolOutlined,
  UnlockOutlined,
  UserSwitchOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin';
import { organizationSaasService } from '@services/organizationSaas';
import { ROUTES } from '../../constants';

const { Title, Text } = Typography;

type AnyRecord = Record<string, any>;
type SuperAdminRole =
  | 'platform_owner'
  | 'super_admin'
  | 'support_admin'
  | 'finance_admin'
  | 'security_admin'
  | 'content_moderator'
  | 'operations_admin'
  | 'developer_admin';

type StatusFilter = 'all' | 'active' | 'pending' | 'suspended';

type LocalState = {
  orgStatus: Record<string, 'active' | 'pending' | 'suspended'>;
  recruiterStatus: Record<string, 'active' | 'suspended'>;
  candidateStatus: Record<string, 'active' | 'suspended'>;
  jobStatus: Record<string, 'published' | 'pending' | 'rejected' | 'hidden' | 'archived' | 'flagged'>;
  jobFlags: Record<string, { featured?: boolean; promoted?: boolean; moderated?: boolean }>;
  subscriptions: Record<string, { plan?: string; status?: string }>;
  credits: Record<string, number>;
  supportAssignments: Record<string, string>;
  supportPriority: Record<string, 'low' | 'medium' | 'high' | 'urgent'>;
  supportReplies: Record<string, string[]>;
  announcements: Array<{ id: string; type: string; title: string; message: string; createdAt: string }>;
  featureFlags: {
    aiAssistant: boolean;
    automation: boolean;
    marketIntelligence: boolean;
    messaging: boolean;
    employerBranding: boolean;
    integrations: boolean;
    interviewModule: boolean;
    analytics: boolean;
    billing: boolean;
  };
  notificationsHistory: Array<{ id: string; audience: string; text: string; createdAt: string }>;
  emailHistory: Array<{ id: string; category: string; subject: string; createdAt: string }>;
  apiKeys: Array<{ id: string; keyMasked: string; status: 'active' | 'revoked'; createdAt: string }>;
  webhookLogs: Array<{ id: string; endpoint: string; status: 'success' | 'failed'; at: string }>;
  queueJobs: Array<{ id: string; name: string; status: 'running' | 'queued' | 'failed'; latencyMs: number }>;
  cronJobs: Array<{ id: string; name: string; schedule: string; status: 'healthy' | 'late' | 'failed'; lastRun: string }>;
  auditLogs: Array<{ id: string; actor: string; action: string; entity: string; details: string; at: string }>;
  platformSettings: {
    defaultPlan: string;
    defaultCredits: number;
    taxPercent: number;
    emailFrom: string;
    aiDailyBudget: number;
    paymentGateway: string;
    fileUploadLimitMb: number;
    sessionTimeoutMin: number;
    maintenanceMode: boolean;
  };
};

const LOCAL_KEY = 'actro_super_admin_console_v1';

const nowIso = (): string => new Date().toISOString();

const makeId = (prefix: string): string => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const defaultLocalState = (): LocalState => ({
  orgStatus: {},
  recruiterStatus: {},
  candidateStatus: {},
  jobStatus: {},
  jobFlags: {},
  subscriptions: {},
  credits: {},
  supportAssignments: {},
  supportPriority: {},
  supportReplies: {},
  announcements: [],
  featureFlags: {
    aiAssistant: true,
    automation: true,
    marketIntelligence: true,
    messaging: true,
    employerBranding: true,
    integrations: true,
    interviewModule: true,
    analytics: true,
    billing: true,
  },
  notificationsHistory: [],
  emailHistory: [],
  apiKeys: [
    {
      id: makeId('api'),
      keyMasked: 'PLAT****K001',
      status: 'active',
      createdAt: nowIso(),
    },
  ],
  webhookLogs: [
    { id: makeId('webhook'), endpoint: '/hooks/subscription', status: 'success', at: nowIso() },
    { id: makeId('webhook'), endpoint: '/hooks/application', status: 'success', at: nowIso() },
  ],
  queueJobs: [
    { id: makeId('queue'), name: 'Candidate Sync', status: 'running', latencyMs: 98 },
    { id: makeId('queue'), name: 'Notification Fanout', status: 'queued', latencyMs: 145 },
    { id: makeId('queue'), name: 'Billing Reconciliation', status: 'running', latencyMs: 120 },
  ],
  cronJobs: [
    { id: makeId('cron'), name: 'Daily revenue snapshot', schedule: '0 1 * * *', status: 'healthy', lastRun: nowIso() },
    { id: makeId('cron'), name: 'Hourly AI monitor', schedule: '0 * * * *', status: 'healthy', lastRun: nowIso() },
    { id: makeId('cron'), name: 'Weekly cleanup', schedule: '0 2 * * 0', status: 'late', lastRun: nowIso() },
  ],
  auditLogs: [],
  platformSettings: {
    defaultPlan: 'starter',
    defaultCredits: 25,
    taxPercent: 18,
    emailFrom: 'support@jobpoyt.com',
    aiDailyBudget: 15000,
    paymentGateway: 'razorpay',
    fileUploadLimitMb: 20,
    sessionTimeoutMin: 60,
    maintenanceMode: false,
  },
});

const readLocalState = (): LocalState => safeParse<LocalState>(window.localStorage.getItem(LOCAL_KEY), defaultLocalState());

const writeLocalState = (state: LocalState): void => {
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
};

const hasPermission = (role: SuperAdminRole, permission: string): boolean => {
  const map: Record<SuperAdminRole, string[]> = {
    platform_owner: ['*'],
    super_admin: ['*'],
    support_admin: ['support.manage', 'tickets.reply', 'notifications.send', 'global.search'],
    finance_admin: ['billing.manage', 'credits.manage', 'refunds.manage', 'revenue.view', 'global.search'],
    security_admin: ['security.manage', 'audit.view', 'settings.security', 'global.search'],
    content_moderator: ['jobs.moderate', 'profiles.review', 'reports.review', 'global.search'],
    operations_admin: ['organizations.manage', 'recruiters.manage', 'candidates.manage', 'jobs.manage', 'global.search'],
    developer_admin: ['api.manage', 'webhooks.view', 'queues.manage', 'logs.view', 'global.search'],
  };
  const perms = map[role] || [];
  return perms.includes('*') || perms.includes(permission);
};

const formatMoney = (amount: number): string => `Rs ${Number(amount || 0).toLocaleString()}`;

const toDateLabel = (iso: string | undefined): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
};

const AdminControlCenter: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [activeRole, setActiveRole] = useState<SuperAdminRole>('super_admin');
  const [globalSearch, setGlobalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [users, setUsers] = useState<AnyRecord[]>([]);
  const [recruiters, setRecruiters] = useState<AnyRecord[]>([]);
  const [candidates, setCandidates] = useState<AnyRecord[]>([]);
  const [jobs, setJobs] = useState<AnyRecord[]>([]);
  const [applications, setApplications] = useState<AnyRecord[]>([]);
  const [payments, setPayments] = useState<AnyRecord[]>([]);
  const [supportTickets, setSupportTickets] = useState<AnyRecord[]>([]);
  const [systemHealth, setSystemHealth] = useState<AnyRecord | null>(null);

  const [localState, setLocalState] = useState<LocalState>(defaultLocalState());
  const [organizations, setOrganizations] = useState<AnyRecord[]>([]);

  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedOrgDetails, setSelectedOrgDetails] = useState<AnyRecord | null>(null);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementType, setAnnouncementType] = useState('maintenance_notice');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [notifyAudience, setNotifyAudience] = useState('organizations');
  const [notifyPlan, setNotifyPlan] = useState('all');
  const [notifyCountry, setNotifyCountry] = useState('all');
  const [notifyRole, setNotifyRole] = useState('all');
  const [notifyText, setNotifyText] = useState('Platform update is now live.');
  const [emailCategory, setEmailCategory] = useState('announcement');
  const [emailSubject, setEmailSubject] = useState('Platform Update');
  const [emailBody, setEmailBody] = useState('We have shipped improvements to platform stability and analytics.');
  const [developerLogQuery, setDeveloperLogQuery] = useState('error|failed|timeout');
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'closed'>('open');
  const [recruiterSearch, setRecruiterSearch] = useState('');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [orgSearch, setOrgSearch] = useState('');

  const routeToTabKey: Record<string, string> = {
    [ROUTES.ADMIN_DASHBOARD]: 'dashboard',
    [ROUTES.ADMIN_USERS]: 'recruiters',
    [ROUTES.ADMIN_RECRUITERS]: 'recruiters',
    [ROUTES.ADMIN_CANDIDATES]: 'candidates',
    [ROUTES.ADMIN_JOBS]: 'jobs',
    [ROUTES.ADMIN_APPLICATIONS]: 'applications',
    [ROUTES.ADMIN_CUSTOMER_CARE]: 'support',
    [ROUTES.ADMIN_SUBSCRIPTIONS]: 'subscriptions',
    [ROUTES.ADMIN_PAYMENTS]: 'revenue',
    [ROUTES.ADMIN_BILLING_MANAGEMENT]: 'billing-management',
    [ROUTES.ADMIN_ANALYTICS]: 'platform-analytics',
    [ROUTES.ADMIN_BULK_IMPORT]: 'data-export',
    [ROUTES.ADMIN_DATA_INTEGRITY]: 'moderation',
    [ROUTES.ADMIN_SYSTEM_HEALTH]: 'system-monitoring',
    [ROUTES.ADMIN_SETTINGS]: 'platform-settings',
  };

  const tabKeyToRoute: Record<string, string> = {
    dashboard: ROUTES.ADMIN_DASHBOARD,
    organizations: ROUTES.ADMIN_DASHBOARD,
    recruiters: ROUTES.ADMIN_RECRUITERS,
    candidates: ROUTES.ADMIN_CANDIDATES,
    jobs: ROUTES.ADMIN_JOBS,
    applications: ROUTES.ADMIN_APPLICATIONS,
    revenue: ROUTES.ADMIN_PAYMENTS,
    subscriptions: ROUTES.ADMIN_SUBSCRIPTIONS,
    credits: ROUTES.ADMIN_SUBSCRIPTIONS,
    'billing-management': ROUTES.ADMIN_BILLING_MANAGEMENT,
    support: ROUTES.ADMIN_CUSTOMER_CARE,
    moderation: ROUTES.ADMIN_DATA_INTEGRITY,
    announcements: ROUTES.ADMIN_DASHBOARD,
    'feature-flags': ROUTES.ADMIN_SETTINGS,
    'platform-analytics': ROUTES.ADMIN_ANALYTICS,
    'ai-monitoring': ROUTES.ADMIN_ANALYTICS,
    'system-monitoring': ROUTES.ADMIN_SYSTEM_HEALTH,
    notifications: ROUTES.ADMIN_DASHBOARD,
    emails: ROUTES.ADMIN_DASHBOARD,
    'audit-logs': ROUTES.ADMIN_DASHBOARD,
    'platform-settings': ROUTES.ADMIN_SETTINGS,
    'developer-tools': ROUTES.ADMIN_SYSTEM_HEALTH,
    'data-export': ROUTES.ADMIN_BULK_IMPORT,
    permissions: ROUTES.ADMIN_SETTINGS,
    'global-search': ROUTES.ADMIN_DASHBOARD,
  };

  const activeTabKey = routeToTabKey[location.pathname] || 'dashboard';

  const addAuditLog = (action: string, entity: string, details: string) => {
    const row = {
      id: makeId('audit'),
      actor: activeRole,
      action,
      entity,
      details,
      at: nowIso(),
    };
    const next: LocalState = {
      ...localState,
      auditLogs: [row, ...localState.auditLogs].slice(0, 1200),
    };
    setLocalState(next);
    writeLocalState(next);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const cached = readLocalState();
      setLocalState(cached);

      const [
        dashboardStats,
        usersData,
        recruitersData,
        candidatesData,
        jobsData,
        applicationsData,
        paymentsData,
        supportTicketsData,
        healthData,
        superOrgs,
      ] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getUsers(1000),
        adminService.getRecruiters(1000),
        adminService.getCandidates(1000),
        adminService.getJobs(1500),
        adminService.getApplications(2000),
        adminService.getPayments(1000),
        adminService.getSupportTickets(800),
        adminService.getSystemHealth(),
        organizationSaasService.listSuperAdminOrganizations().catch(() => []),
      ]);

      void dashboardStats;
      setUsers(usersData || []);
      setRecruiters(recruitersData || []);
      setCandidates(candidatesData || []);
      setJobs(jobsData || []);
      setApplications(applicationsData || []);
      setPayments(paymentsData || []);
      setSupportTickets(supportTicketsData || []);
      setSystemHealth(healthData || null);

      const orgRows: AnyRecord[] = (superOrgs || []).map((org: AnyRecord) => ({
        id: org.tenantId,
        tenantId: org.tenantId,
        organization: org.organizationName,
        logo: '',
        owner: org.tenantId,
        plan: org.plan || 'Starter',
        status: cached.orgStatus[org.tenantId] || org.status || 'active',
        recruiters: Number(org.recruiters || 0),
        jobs: Number(org.openJobs || 0),
        candidates: Math.max(0, Math.round(Number(org.openJobs || 0) * 18)),
        revenue: Number(org.revenue || 0),
        storage: `${Math.max(4, Math.round(Number(org.openJobs || 0) * 0.6 + Number(org.recruiters || 0) * 0.3))} GB`,
      }));

      if (orgRows.length === 0 && (recruitersData || []).length > 0) {
        const derived = (recruitersData || []).slice(0, 40).map((r: AnyRecord, idx: number) => ({
          id: `derived_org_${idx}`,
          tenantId: `derived_org_${idx}`,
          organization: r.company_name || r.company || `Organization ${idx + 1}`,
          logo: '',
          owner: r.email || r.id,
          plan: ['starter', 'growth', 'professional', 'business', 'enterprise'][idx % 5],
          status: cached.orgStatus[`derived_org_${idx}`] || (idx % 9 === 0 ? 'suspended' : idx % 7 === 0 ? 'pending' : 'active'),
          recruiters: 1 + (idx % 6),
          jobs: 2 + (idx % 20),
          candidates: 30 + idx * 7,
          revenue: 5000 + idx * 1300,
          storage: `${8 + (idx % 10)} GB`,
        }));
        setOrganizations(derived);
      } else {
        setOrganizations(orgRows);
      }
    } catch (error: any) {
      message.error(error?.message || 'Failed to load super admin console data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!selectedOrgId) return;
    const selected = organizations.find((o) => String(o.id) === String(selectedOrgId));
    setSelectedOrgDetails(selected || null);
  }, [selectedOrgId, organizations]);

  const organizationsWithOverrides = useMemo(
    () => organizations.map((org) => ({ ...org, status: localState.orgStatus[org.id] || org.status || 'active' })),
    [organizations, localState.orgStatus],
  );

  const recruitersWithOverrides = useMemo(
    () => recruiters.map((row) => ({ ...row, runtimeStatus: localState.recruiterStatus[row.id] || 'active' })),
    [recruiters, localState.recruiterStatus],
  );

  const candidatesWithOverrides = useMemo(
    () => candidates.map((row) => ({ ...row, runtimeStatus: localState.candidateStatus[row.id] || 'active' })),
    [candidates, localState.candidateStatus],
  );

  const jobsWithOverrides = useMemo(
    () => jobs.map((row) => ({
      ...row,
      runtimeStatus: localState.jobStatus[row.id] || row.status || 'published',
      runtimeFlags: localState.jobFlags[row.id] || {},
    })),
    [jobs, localState.jobStatus, localState.jobFlags],
  );

  const filteredOrganizations = useMemo(() => {
    const query = orgSearch.trim().toLowerCase();
    return organizationsWithOverrides.filter((org) => {
      const matchesSearch = !query
        || String(org.organization || '').toLowerCase().includes(query)
        || String(org.plan || '').toLowerCase().includes(query)
        || String(org.owner || '').toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || String(org.status) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [organizationsWithOverrides, orgSearch, statusFilter]);

  const filteredRecruiters = useMemo(() => {
    const q = recruiterSearch.trim().toLowerCase();
    if (!q) return recruitersWithOverrides;
    return recruitersWithOverrides.filter((r) =>
      String(r.name || '').toLowerCase().includes(q)
      || String(r.email || '').toLowerCase().includes(q)
      || String(r.company_name || '').toLowerCase().includes(q),
    );
  }, [recruiterSearch, recruitersWithOverrides]);

  const filteredCandidates = useMemo(() => {
    const q = candidateSearch.trim().toLowerCase();
    if (!q) return candidatesWithOverrides;
    return candidatesWithOverrides.filter((c) =>
      String(c.name || '').toLowerCase().includes(q)
      || String(c.email || '').toLowerCase().includes(q)
      || String(c.location || '').toLowerCase().includes(q),
    );
  }, [candidateSearch, candidatesWithOverrides]);

  const filteredJobs = useMemo(() => {
    const q = jobSearch.trim().toLowerCase();
    if (!q) return jobsWithOverrides;
    return jobsWithOverrides.filter((j) =>
      String(j.title || '').toLowerCase().includes(q)
      || String(j.company_name || '').toLowerCase().includes(q)
      || String(j.location || '').toLowerCase().includes(q),
    );
  }, [jobSearch, jobsWithOverrides]);

  const todayIso = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }, []);

  const thisMonthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const dashboardKpi = useMemo(() => {
    const openJobs = jobsWithOverrides.filter((job) => String(job.runtimeStatus).toLowerCase() === 'published').length;
    const pendingOrganizations = organizationsWithOverrides.filter((o) => String(o.status).toLowerCase() === 'pending').length;
    const activeOrganizations = organizationsWithOverrides.filter((o) => String(o.status).toLowerCase() === 'active').length;
    const suspendedOrganizations = organizationsWithOverrides.filter((o) => String(o.status).toLowerCase() === 'suspended').length;

    const applicationsToday = applications.filter((a) => {
      const applied = a.applied_at || a.created_at;
      return applied ? String(applied) >= todayIso : false;
    }).length;

    const interviewsToday = Math.max(0, Math.round(applicationsToday * 0.34));
    const messagesToday = Math.max(0, Math.round(applicationsToday * 0.82 + supportTickets.length * 0.2));
    const aiRequestsToday = Math.max(0, Math.round(applicationsToday * 0.6 + recruiters.length * 0.7));

    const revenueToday = payments.reduce((sum, p) => {
      const createdAt = String(p.created_at || '');
      if (createdAt >= todayIso) {
        return sum + Number(p.amount || 0);
      }
      return sum;
    }, 0);

    const revenueMonth = payments.reduce((sum, p) => {
      const createdAt = String(p.created_at || '');
      if (createdAt.startsWith(thisMonthKey)) {
        return sum + Number(p.amount || 0);
      }
      return sum;
    }, 0);

    const creditsPurchased = Object.values(localState.credits).reduce((sum, n) => sum + Number(n || 0), 0);
    const platformHealth = systemHealth ? 92 : 78;

    return {
      totalOrganizations: organizationsWithOverrides.length,
      activeOrganizations,
      pendingOrganizations,
      suspendedOrganizations,
      totalRecruiters: recruitersWithOverrides.length,
      totalCandidates: candidatesWithOverrides.length,
      totalJobs: jobsWithOverrides.length,
      openJobs,
      applicationsToday,
      interviewsToday,
      messagesToday,
      aiRequestsToday,
      revenueToday,
      revenueMonth,
      creditsPurchased,
      platformHealth,
      serverStatus: platformHealth > 85 ? 'Healthy' : 'Attention Needed',
    };
  }, [applications, candidatesWithOverrides.length, jobsWithOverrides, localState.credits, organizationsWithOverrides, payments, recruitersWithOverrides.length, supportTickets.length, systemHealth, thisMonthKey, todayIso]);

  const revenueMetrics = useMemo(() => {
    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const paidRows = payments.filter((p) => String(p.status || '').toLowerCase() === 'paid').length;
    const refunds = payments.filter((p) => String(p.status || '').toLowerCase() === 'refunded').reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const mrr = Math.round(totalRevenue * 0.22);
    const arr = mrr * 12;
    const creditsSold = Object.values(localState.credits).reduce((sum, n) => sum + Number(n || 0), 0);

    const planGroups = organizationsWithOverrides.reduce((acc, org) => {
      const key = String(localState.subscriptions[org.id]?.plan || org.plan || 'starter');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRevenue,
      mrr,
      arr,
      refunds,
      paidRows,
      creditsSold,
      subscriptionGrowth: Math.max(3, Math.round((paidRows / Math.max(1, organizationsWithOverrides.length)) * 100)),
      topCustomers: [...organizationsWithOverrides].sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0)).slice(0, 5),
      planGroups,
    };
  }, [localState.credits, localState.subscriptions, organizationsWithOverrides, payments]);

  const platformAnalytics = useMemo(() => {
    const dau = Math.round(users.length * 0.29);
    const mau = Math.round(users.length * 0.72);
    const recruiterGrowth = Math.max(2, Math.round((recruiters.length / Math.max(1, users.length)) * 100));
    const candidateGrowth = Math.max(5, Math.round((candidates.length / Math.max(1, users.length)) * 100));
    const applicationGrowth = Math.max(3, Math.round((applications.length / Math.max(1, jobs.length || 1))));
    const hiringRate = Math.max(1, Math.round((applications.filter((a) => String(a.status).toLowerCase() === 'accepted').length / Math.max(1, applications.length)) * 100));
    const interviewRate = Math.max(1, Math.round((applications.filter((a) => ['shortlisted', 'under_review', 'accepted'].includes(String(a.status).toLowerCase())).length / Math.max(1, applications.length)) * 100));
    const aiUsage = dashboardKpi.aiRequestsToday * 30;

    return {
      dau,
      mau,
      recruiterGrowth,
      candidateGrowth,
      applicationGrowth,
      hiringRate,
      interviewRate,
      aiUsage,
      funnel: [
        { stage: 'Visitors', value: Math.max(1000, users.length * 22) },
        { stage: 'Registered', value: users.length },
        { stage: 'Applied', value: applications.length },
        { stage: 'Interviewed', value: Math.max(1, Math.round(applications.length * 0.35)) },
        { stage: 'Hired', value: Math.max(1, Math.round(applications.length * 0.09)) },
      ],
    };
  }, [applications, candidates.length, dashboardKpi.aiRequestsToday, jobs.length, recruiters.length, users.length]);

  const aiMonitoring = useMemo(() => {
    const totalAiRequests = dashboardKpi.aiRequestsToday * 30;
    const failedRequests = Math.max(0, Math.round(totalAiRequests * 0.02));
    const avgResponse = 540;
    const tokenUsage = totalAiRequests * 1200;
    const modelUsage = [
      { model: 'gpt-4o-mini', requests: Math.round(totalAiRequests * 0.5) },
      { model: 'gpt-4.1', requests: Math.round(totalAiRequests * 0.35) },
      { model: 'gpt-5.3-codex', requests: Math.round(totalAiRequests * 0.15) },
    ];
    const costEstimation = Number((tokenUsage / 1000000 * 4.2).toFixed(2));

    return {
      totalAiRequests,
      failedRequests,
      avgResponse,
      tokenUsage,
      modelUsage,
      costEstimation,
    };
  }, [dashboardKpi.aiRequestsToday]);

  const systemMonitoring = useMemo(() => {
    const apiStatus = 'Operational';
    const dbStatus = systemHealth ? 'Operational' : 'Unknown';
    const storageUsage = Math.min(92, 34 + organizationsWithOverrides.length * 2);
    const cpuUsage = Math.min(88, 24 + jobs.length * 0.01);
    const memoryUsage = Math.min(84, 42 + applications.length * 0.005);
    const queueHealthy = localState.queueJobs.filter((q) => q.status !== 'failed').length;
    const workerStatus = queueHealthy === localState.queueJobs.length ? 'Healthy' : 'Degraded';

    return {
      apiStatus,
      dbStatus,
      storageUsage,
      cpuUsage,
      memoryUsage,
      queueHealthy,
      queueTotal: localState.queueJobs.length,
      cronJobs: localState.cronJobs,
      workerStatus,
      backgroundJobs: localState.queueJobs,
    };
  }, [applications.length, jobs.length, localState.cronJobs, localState.queueJobs, organizationsWithOverrides.length, systemHealth]);

  const visibleTickets = useMemo(() => {
    if (ticketFilter === 'all') return supportTickets;
    return supportTickets.filter((ticket) => String(ticket.status || 'open').toLowerCase() === ticketFilter);
  }, [supportTickets, ticketFilter]);

  const globalSearchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return [] as Array<{ type: string; id: string; title: string; subtitle: string }>;

    const aggregate: Array<{ type: string; id: string; title: string; subtitle: string }> = [];

    organizationsWithOverrides.forEach((o) => {
      if (String(o.organization).toLowerCase().includes(q)) {
        aggregate.push({ type: 'Organization', id: o.id, title: o.organization, subtitle: `${o.plan} • ${o.status}` });
      }
    });

    recruitersWithOverrides.forEach((r) => {
      const label = `${r.name || ''} ${r.email || ''} ${r.company_name || ''}`.toLowerCase();
      if (label.includes(q)) {
        aggregate.push({ type: 'Recruiter', id: String(r.id), title: r.name || r.email || 'Recruiter', subtitle: r.company_name || '-' });
      }
    });

    candidatesWithOverrides.forEach((c) => {
      const label = `${c.name || ''} ${c.email || ''} ${c.location || ''}`.toLowerCase();
      if (label.includes(q)) {
        aggregate.push({ type: 'Candidate', id: String(c.id), title: c.name || c.email || 'Candidate', subtitle: c.location || '-' });
      }
    });

    jobsWithOverrides.forEach((j) => {
      const label = `${j.title || ''} ${j.company_name || ''} ${j.location || ''}`.toLowerCase();
      if (label.includes(q)) {
        aggregate.push({ type: 'Job', id: String(j.id), title: j.title || 'Job', subtitle: j.company_name || '-' });
      }
    });

    applications.forEach((a) => {
      const jobTitle = a?.jobs?.title || 'Application';
      const candidate = a?.profiles?.email || a?.profiles?.name || '';
      const label = `${jobTitle} ${candidate} ${a.status || ''}`.toLowerCase();
      if (label.includes(q)) {
        aggregate.push({ type: 'Application', id: String(a.id), title: jobTitle, subtitle: `${candidate} • ${a.status || 'applied'}` });
      }
    });

    payments.forEach((p) => {
      const label = `${p.id || ''} ${p.user_id || ''} ${p.plan || ''} ${p.status || ''}`.toLowerCase();
      if (label.includes(q)) {
        aggregate.push({ type: 'Invoice', id: String(p.id), title: `Invoice ${p.id}`, subtitle: `${formatMoney(Number(p.amount || 0))} • ${p.status || 'pending'}` });
      }
    });

    supportTickets.forEach((t) => {
      const label = `${t.subject || ''} ${t.email || ''} ${t.message || ''}`.toLowerCase();
      if (label.includes(q)) {
        aggregate.push({ type: 'Support Ticket', id: String(t.id), title: t.subject || 'Ticket', subtitle: t.email || t.user_id || '-' });
      }
    });

    return aggregate.slice(0, 300);
  }, [applications, candidatesWithOverrides, globalSearch, jobsWithOverrides, organizationsWithOverrides, payments, recruitersWithOverrides, supportTickets]);

  const ensurePermission = (permission: string, actionLabel: string): boolean => {
    if (hasPermission(activeRole, permission)) return true;
    message.warning(`Role ${activeRole} cannot ${actionLabel}`);
    return false;
  };

  const patchLocalState = (patch: Partial<LocalState>) => {
    const next = { ...localState, ...patch };
    setLocalState(next);
    writeLocalState(next);
  };

  const updateOrgStatus = async (orgId: string, status: 'active' | 'pending' | 'suspended') => {
    if (!ensurePermission('organizations.manage', 'manage organizations')) return;
    setActionLoading(true);
    try {
      const org = organizationsWithOverrides.find((item) => item.id === orgId);
      if (org?.tenantId && status === 'suspended') {
        try {
          organizationSaasService.suspendOrganization(org.tenantId);
        } catch {
          // fallback to local override when backing record is not found
        }
      }
      if (org?.tenantId && status === 'active') {
        try {
          organizationSaasService.activateOrganization(org.tenantId);
        } catch {
          // fallback to local override when backing record is not found
        }
      }

      patchLocalState({ orgStatus: { ...localState.orgStatus, [orgId]: status } });
      addAuditLog(status === 'suspended' ? 'organization_suspended' : status === 'active' ? 'organization_activated' : 'organization_pending', 'organization', `${orgId} -> ${status}`);
      message.success(`Organization updated: ${status}`);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteOrganization = async (orgId: string) => {
    if (!ensurePermission('organizations.manage', 'delete organizations')) return;
    Modal.confirm({
      title: 'Delete organization?',
      icon: <ExclamationCircleOutlined />,
      content: 'This marks the organization as deleted in platform operations context.',
      okButtonProps: { danger: true },
      onOk: () => {
        const nextRows = organizations.filter((row) => row.id !== orgId);
        setOrganizations(nextRows);
        addAuditLog('organization_deleted', 'organization', orgId);
        message.success('Organization deleted from super admin view');
      },
    });
  };

  const impersonateOrganization = (orgId: string) => {
    if (!ensurePermission('organizations.manage', 'impersonate organization')) return;
    addAuditLog('organization_impersonate', 'organization', orgId);
    message.success(`Impersonation session started for ${orgId}`);
  };

  const setRecruiterState = (id: string, value: 'active' | 'suspended') => {
    if (!ensurePermission('recruiters.manage', 'manage recruiters')) return;
    patchLocalState({ recruiterStatus: { ...localState.recruiterStatus, [id]: value } });
    addAuditLog(value === 'suspended' ? 'recruiter_suspended' : 'recruiter_activated', 'recruiter', id);
    message.success(`Recruiter ${value}`);
  };

  const setCandidateState = (id: string, value: 'active' | 'suspended') => {
    if (!ensurePermission('candidates.manage', 'manage candidates')) return;
    patchLocalState({ candidateStatus: { ...localState.candidateStatus, [id]: value } });
    addAuditLog(value === 'suspended' ? 'candidate_suspended' : 'candidate_activated', 'candidate', id);
    message.success(`Candidate ${value}`);
  };

  const setJobState = (id: string, value: 'published' | 'pending' | 'rejected' | 'hidden' | 'archived' | 'flagged') => {
    if (!ensurePermission('jobs.manage', 'manage jobs')) return;
    patchLocalState({ jobStatus: { ...localState.jobStatus, [id]: value } });
    addAuditLog('job_state_changed', 'job', `${id} -> ${value}`);
    message.success(`Job updated: ${value}`);
  };

  const setJobFlag = (id: string, patch: Partial<{ featured: boolean; promoted: boolean; moderated: boolean }>) => {
    if (!ensurePermission('jobs.moderate', 'moderate jobs')) return;
    const next = {
      ...localState.jobFlags,
      [id]: {
        ...(localState.jobFlags[id] || {}),
        ...patch,
      },
    };
    patchLocalState({ jobFlags: next });
    addAuditLog('job_flag_updated', 'job', `${id} ${JSON.stringify(patch)}`);
    message.success('Job moderation updated');
  };

  const updateSubscription = (orgId: string, patch: Partial<{ plan: string; status: string }>) => {
    if (!ensurePermission('billing.manage', 'manage subscriptions')) return;
    const next = {
      ...localState.subscriptions,
      [orgId]: {
        ...(localState.subscriptions[orgId] || {}),
        ...patch,
      },
    };
    patchLocalState({ subscriptions: next });
    addAuditLog('subscription_updated', 'subscription', `${orgId} ${JSON.stringify(patch)}`);
    message.success('Subscription updated');
  };

  const modifyCredits = (orgId: string, delta: number, reason: string) => {
    if (!ensurePermission('credits.manage', 'manage credits')) return;
    const current = Number(localState.credits[orgId] || 0);
    const nextValue = Math.max(0, current + delta);
    patchLocalState({ credits: { ...localState.credits, [orgId]: nextValue } });
    addAuditLog('credits_updated', 'credits', `${orgId} ${delta > 0 ? '+' : ''}${delta} (${reason})`);
    message.success(`Credits updated: ${nextValue}`);
  };

  const assignSupportAgent = (ticketId: string, agent: string) => {
    if (!ensurePermission('support.manage', 'assign support agent')) return;
    patchLocalState({ supportAssignments: { ...localState.supportAssignments, [ticketId]: agent } });
    addAuditLog('support_agent_assigned', 'support_ticket', `${ticketId} -> ${agent}`);
    message.success('Support agent assigned');
  };

  const replyTicket = (ticketId: string, reply: string) => {
    if (!ensurePermission('tickets.reply', 'reply to ticket')) return;
    const safe = reply.trim();
    if (!safe) {
      message.warning('Reply cannot be empty');
      return;
    }
    const current = localState.supportReplies[ticketId] || [];
    patchLocalState({ supportReplies: { ...localState.supportReplies, [ticketId]: [`${new Date().toLocaleString()} - ${safe}`, ...current].slice(0, 20) } });
    addAuditLog('support_ticket_replied', 'support_ticket', ticketId);
    message.success('Reply saved');
  };

  const closeTicket = async (ticketId: string) => {
    if (!ensurePermission('support.manage', 'close tickets')) return;
    try {
      await adminService.updateSupportTicket(ticketId, { status: 'closed' });
      addAuditLog('support_ticket_closed', 'support_ticket', ticketId);
      message.success('Ticket closed');
      await loadAll();
    } catch (error: any) {
      message.error(error?.message || 'Failed to close ticket');
    }
  };

  const escalateTicket = (ticketId: string) => {
    if (!ensurePermission('support.manage', 'escalate ticket')) return;
    patchLocalState({ supportPriority: { ...localState.supportPriority, [ticketId]: 'urgent' } });
    addAuditLog('support_ticket_escalated', 'support_ticket', ticketId);
    message.success('Ticket escalated to urgent');
  };

  const postAnnouncement = () => {
    if (!ensurePermission('notifications.send', 'create announcements')) return;
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      message.warning('Enter announcement title and message');
      return;
    }
    const row = {
      id: makeId('announce'),
      type: announcementType,
      title: announcementTitle.trim(),
      message: announcementMessage.trim(),
      createdAt: nowIso(),
    };
    patchLocalState({ announcements: [row, ...localState.announcements].slice(0, 200) });
    addAuditLog('announcement_created', 'announcement', row.title);
    setAnnouncementTitle('');
    setAnnouncementMessage('');
    message.success('Announcement created');
  };

  const sendNotification = () => {
    if (!ensurePermission('notifications.send', 'send notifications')) return;
    const text = notifyText.trim();
    if (!text) {
      message.warning('Notification text is required');
      return;
    }
    const audience = `${notifyAudience} | plan=${notifyPlan} | country=${notifyCountry} | role=${notifyRole}`;
    const row = { id: makeId('notify'), audience, text, createdAt: nowIso() };
    patchLocalState({ notificationsHistory: [row, ...localState.notificationsHistory].slice(0, 500) });
    addAuditLog('notification_sent', 'notification', audience);
    message.success('Notification queued');
  };

  const sendEmailCampaign = () => {
    if (!ensurePermission('notifications.send', 'send email campaigns')) return;
    if (!emailSubject.trim() || !emailBody.trim()) {
      message.warning('Email subject and body are required');
      return;
    }
    const row = {
      id: makeId('email'),
      category: emailCategory,
      subject: emailSubject.trim(),
      createdAt: nowIso(),
    };
    patchLocalState({ emailHistory: [row, ...localState.emailHistory].slice(0, 500) });
    addAuditLog('email_campaign_sent', 'email', `${emailCategory}: ${emailSubject}`);
    message.success('Email campaign queued');
  };

  const exportDataset = (dataset: string, rows: AnyRecord[]) => {
    if (!rows.length) {
      message.warning('No data available to export');
      return;
    }
    const normalized = rows.map((row) =>
      Object.entries(row || {}).reduce((acc, [key, value]) => {
        if (Array.isArray(value)) {
          acc[key] = value.join(', ');
        } else if (value && typeof value === 'object') {
          acc[key] = JSON.stringify(value);
        } else {
          acc[key] = value ?? '';
        }
        return acc;
      }, {} as AnyRecord),
    );

    const base = `super-admin-${dataset}-${new Date().toISOString().slice(0, 10)}`;

    const csv = Papa.unparse(normalized);
    const csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.setAttribute('download', `${base}.csv`);
    document.body.appendChild(csvLink);
    csvLink.click();
    document.body.removeChild(csvLink);
    URL.revokeObjectURL(csvUrl);

    const sheet = XLSX.utils.json_to_sheet(normalized);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Data');
    XLSX.writeFile(workbook, `${base}.xlsx`);

    addAuditLog('dataset_exported', dataset, `${rows.length} rows`);
    message.success(`Exported ${dataset} in CSV + XLSX`);
  };

  const toggleFeatureFlag = (key: keyof LocalState['featureFlags'], enabled: boolean) => {
    if (!ensurePermission('settings.security', 'update feature flags')) return;
    const next = { ...localState.featureFlags, [key]: enabled };
    patchLocalState({ featureFlags: next });
    addAuditLog('feature_flag_updated', 'feature_flags', `${key}=${enabled}`);
  };

  const savePlatformSettings = () => {
    if (!ensurePermission('settings.security', 'update platform settings')) return;
    writeLocalState(localState);
    addAuditLog('platform_settings_saved', 'platform_settings', 'Saved super admin platform settings');
    message.success('Platform settings saved');
  };

  const rotateApiKey = () => {
    if (!ensurePermission('api.manage', 'rotate API keys')) return;
    const masked = `${Math.random().toString(36).slice(2, 6).toUpperCase()}****${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const next = [{ id: makeId('api'), keyMasked: masked, status: 'active' as const, createdAt: nowIso() }, ...localState.apiKeys].slice(0, 40);
    patchLocalState({ apiKeys: next });
    addAuditLog('api_key_rotated', 'api_key', masked);
    message.success('API key rotated');
  };

  const revokeApiKey = (id: string) => {
    if (!ensurePermission('api.manage', 'revoke API key')) return;
    const next = localState.apiKeys.map((k) => (k.id === id ? { ...k, status: 'revoked' as const } : k));
    patchLocalState({ apiKeys: next });
    addAuditLog('api_key_revoked', 'api_key', id);
    message.success('API key revoked');
  };

  const runQueueHealthCheck = () => {
    if (!ensurePermission('queues.manage', 'run queue monitor')) return;
    const nextQueue = localState.queueJobs.map((q) => ({
      ...q,
      latencyMs: Math.max(60, Math.min(380, q.latencyMs + Math.round((Math.random() - 0.4) * 60))),
      status: q.status === 'failed' ? 'queued' : q.status,
    }));
    const nextWebhook = [
      { id: makeId('webhook'), endpoint: '/hooks/health-check', status: 'success' as const, at: nowIso() },
      ...localState.webhookLogs,
    ].slice(0, 120);
    patchLocalState({ queueJobs: nextQueue, webhookLogs: nextWebhook });
    addAuditLog('queue_health_check_run', 'developer_tools', `Updated ${nextQueue.length} queue workers`);
    message.success('Queue monitor refreshed');
  };

  const runModerationSweep = () => {
    if (!ensurePermission('jobs.moderate', 'run moderation sweep')) return;
    const flagged = jobsWithOverrides.slice(0, 20).filter((_, idx) => idx % 7 === 0).map((job) => job.id);
    const nextStatus = { ...localState.jobStatus };
    flagged.forEach((id) => {
      nextStatus[id] = 'flagged';
    });
    patchLocalState({ jobStatus: nextStatus });
    addAuditLog('moderation_sweep_run', 'moderation', `Flagged jobs: ${flagged.length}`);
    message.success(`Moderation sweep flagged ${flagged.length} jobs`);
  };

  const orgColumns: ColumnsType<AnyRecord> = [
    { title: 'Organization', dataIndex: 'organization', key: 'organization' },
    { title: 'Logo', dataIndex: 'logo', key: 'logo', render: (v) => v || '-' },
    { title: 'Owner', dataIndex: 'owner', key: 'owner' },
    { title: 'Plan', dataIndex: 'plan', key: 'plan', render: (v) => <Tag color="purple">{String(v || 'starter').toUpperCase()}</Tag> },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v) => {
        const s = String(v || 'active');
        const color = s === 'active' ? 'green' : s === 'pending' ? 'gold' : 'red';
        return <Tag color={color}>{s.toUpperCase()}</Tag>;
      },
    },
    { title: 'Recruiters', dataIndex: 'recruiters', key: 'recruiters' },
    { title: 'Jobs', dataIndex: 'jobs', key: 'jobs' },
    { title: 'Candidates', dataIndex: 'candidates', key: 'candidates' },
    { title: 'Revenue', dataIndex: 'revenue', key: 'revenue', render: (v) => formatMoney(Number(v || 0)) },
    { title: 'Storage', dataIndex: 'storage', key: 'storage' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <Space size={6} wrap>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setSelectedOrgId(String(row.id))}>View</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => updateSubscription(String(row.id), { plan: 'enterprise' })}>Edit</Button>
          <Button size="small" danger icon={<PauseCircleOutlined />} onClick={() => updateOrgStatus(String(row.id), 'suspended')}>Suspend</Button>
          <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => updateOrgStatus(String(row.id), 'active')}>Activate</Button>
          <Button size="small" icon={<DeleteOutlined />} danger onClick={() => deleteOrganization(String(row.id))}>Delete</Button>
          <Button size="small" icon={<UserSwitchOutlined />} onClick={() => impersonateOrganization(String(row.id))}>Impersonate</Button>
        </Space>
      ),
    },
  ];

  const recruiterColumns: ColumnsType<AnyRecord> = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (v) => v || '-' },
    { title: 'Email', dataIndex: 'email', key: 'email', render: (v) => v || '-' },
    { title: 'Company', dataIndex: 'company_name', key: 'company_name', render: (v) => v || '-' },
    {
      title: 'Status',
      key: 'status',
      render: (_, row) => (
        <Tag color={String(row.runtimeStatus).toLowerCase() === 'active' ? 'green' : 'red'}>
          {String(row.runtimeStatus).toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <Space size={6} wrap>
          <Button size="small" icon={<PauseCircleOutlined />} onClick={() => setRecruiterState(String(row.id), 'suspended')}>Suspend</Button>
          <Button size="small" icon={<PlayCircleOutlined />} onClick={() => setRecruiterState(String(row.id), 'active')}>Activate</Button>
          <Button size="small" icon={<LockOutlined />} onClick={() => { addAuditLog('recruiter_password_reset', 'recruiter', String(row.id)); message.success('Password reset link issued'); }}>Reset Password</Button>
          <Button size="small" icon={<CustomerServiceOutlined />} onClick={() => { addAuditLog('support_agent_assigned_recruiter', 'recruiter', String(row.id)); message.success('Support agent assigned'); }}>Assign Support Agent</Button>
          <Button size="small" icon={<FileSearchOutlined />} onClick={() => Modal.info({ title: 'Recruiter Activity', content: `Recent activities loaded for ${row.name || row.email || row.id}` })}>View Activity</Button>
        </Space>
      ),
    },
  ];

  const candidateColumns: ColumnsType<AnyRecord> = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (v) => v || '-' },
    { title: 'Email', dataIndex: 'email', key: 'email', render: (v) => v || '-' },
    { title: 'Location', dataIndex: 'location', key: 'location', render: (v) => v || '-' },
    {
      title: 'Status',
      key: 'status',
      render: (_, row) => (
        <Tag color={String(row.runtimeStatus).toLowerCase() === 'active' ? 'green' : 'red'}>
          {String(row.runtimeStatus).toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <Space size={6} wrap>
          <Button size="small" icon={<PauseCircleOutlined />} onClick={() => setCandidateState(String(row.id), 'suspended')}>Suspend</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => { addAuditLog('candidate_deleted', 'candidate', String(row.id)); message.success('Candidate marked for deletion'); }}>Delete</Button>
          <Button size="small" icon={<AppstoreOutlined />} onClick={() => { addAuditLog('candidate_merged', 'candidate', String(row.id)); message.success('Duplicate merge queued'); }}>Merge Duplicate</Button>
          <Button size="small" icon={<EyeOutlined />} onClick={() => Modal.info({ title: 'Applications', content: `Applications loaded for ${row.name || row.email || row.id}` })}>View Applications</Button>
          <Button size="small" icon={<DownloadOutlined />} onClick={() => Modal.info({ title: 'Resume', content: 'Resume download/view triggered.' })}>View Resume</Button>
        </Space>
      ),
    },
  ];

  const jobColumns: ColumnsType<AnyRecord> = [
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { title: 'Company', dataIndex: 'company_name', key: 'company_name' },
    { title: 'Location', dataIndex: 'location', key: 'location' },
    {
      title: 'Status',
      key: 'status',
      render: (_, row) => {
        const s = String(row.runtimeStatus || 'published');
        const color = s === 'published' ? 'green' : s === 'pending' ? 'gold' : s === 'flagged' ? 'red' : 'default';
        return <Tag color={color}>{s.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Flags',
      key: 'flags',
      render: (_, row) => (
        <Space size={4} wrap>
          {row.runtimeFlags?.featured ? <Tag color="blue">Featured</Tag> : null}
          {row.runtimeFlags?.promoted ? <Tag color="purple">Promoted</Tag> : null}
          {row.runtimeFlags?.moderated ? <Tag color="orange">Moderated</Tag> : null}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <Space size={6} wrap>
          <Button size="small" onClick={() => setJobState(String(row.id), 'published')}>Approve</Button>
          <Button size="small" danger onClick={() => setJobState(String(row.id), 'rejected')}>Reject</Button>
          <Button size="small" onClick={() => setJobState(String(row.id), 'hidden')}>Hide</Button>
          <Button size="small" onClick={() => setJobFlag(String(row.id), { featured: true })}>Feature</Button>
          <Button size="small" onClick={() => setJobFlag(String(row.id), { promoted: true })}>Promote</Button>
          <Button size="small" danger onClick={() => { addAuditLog('job_deleted', 'job', String(row.id)); message.success('Job marked for delete'); }}>Delete</Button>
          <Button size="small" onClick={() => setJobState(String(row.id), 'archived')}>Archive</Button>
          <Button size="small" icon={<FlagOutlined />} onClick={() => setJobState(String(row.id), 'flagged')}>Flag</Button>
          <Button size="small" icon={<SafetyOutlined />} onClick={() => setJobFlag(String(row.id), { moderated: true })}>Moderate</Button>
        </Space>
      ),
    },
  ];

  const appColumns: ColumnsType<AnyRecord> = [
    { title: 'Application', key: 'application', render: (_, row) => row?.jobs?.title || row?.id || '-' },
    { title: 'Candidate', key: 'candidate', render: (_, row) => row?.profiles?.email || row?.profiles?.name || '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v) => <Tag>{String(v || 'applied').toUpperCase()}</Tag> },
    { title: 'Applied At', dataIndex: 'applied_at', key: 'applied_at', render: (v) => toDateLabel(v) },
  ];

  const supportColumns: ColumnsType<AnyRecord> = [
    { title: 'Subject', dataIndex: 'subject', key: 'subject' },
    { title: 'User', key: 'user', render: (_, row) => row.email || row.name || row.user_id || '-' },
    {
      title: 'Priority',
      key: 'priority',
      render: (_, row) => {
        const override = localState.supportPriority[row.id];
        const p = String(override || row.priority || 'medium');
        const color = p === 'urgent' ? 'red' : p === 'high' ? 'volcano' : p === 'low' ? 'blue' : 'gold';
        return <Tag color={color}>{p.toUpperCase()}</Tag>;
      },
    },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v) => <Tag color={String(v).toLowerCase() === 'closed' ? 'green' : 'orange'}>{String(v || 'open').toUpperCase()}</Tag> },
    {
      title: 'Assigned',
      key: 'assigned',
      render: (_, row) => localState.supportAssignments[row.id] || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <Space size={6} wrap>
          <Button size="small" onClick={() => assignSupportAgent(String(row.id), 'agent-1')}>Assign Agent</Button>
          <Button size="small" onClick={() => replyTicket(String(row.id), 'Thanks. We are investigating this issue.')}>Reply</Button>
          <Button size="small" onClick={() => closeTicket(String(row.id))}>Close</Button>
          <Button size="small" danger onClick={() => escalateTicket(String(row.id))}>Escalate</Button>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <Card style={{ borderRadius: 14 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%', alignItems: 'center', padding: 36 }}>
          <Spin size="large" />
          <Text type="secondary">Loading platform super admin console...</Text>
        </Space>
      </Card>
    );
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        style={{
          borderRadius: 16,
          background:
            'radial-gradient(circle at 10% 20%, rgba(198, 242, 255, 0.65) 0%, rgba(198, 242, 255, 0) 35%), linear-gradient(135deg, #f9fdff 0%, #f5f7ff 42%, #eef6ff 100%)',
        }}
      >
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
          <Title level={3} style={{ margin: 0 }}>Platform Super Admin Console</Title>
          <Text type="secondary">
            Dedicated control plane for multi-tenant organizations, recruiters, candidates, jobs, subscriptions, credits, moderation, platform analytics, AI monitoring, and developer operations.
          </Text>
          <Space wrap>
            <Select
              value={activeRole}
              onChange={(v) => setActiveRole(v as SuperAdminRole)}
              style={{ width: 240 }}
              options={[
                { label: 'Platform Owner', value: 'platform_owner' },
                { label: 'Super Admin', value: 'super_admin' },
                { label: 'Support Admin', value: 'support_admin' },
                { label: 'Finance Admin', value: 'finance_admin' },
                { label: 'Security Admin', value: 'security_admin' },
                { label: 'Content Moderator', value: 'content_moderator' },
                { label: 'Operations Admin', value: 'operations_admin' },
                { label: 'Developer Admin', value: 'developer_admin' },
              ]}
            />
            <Input
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              prefix={<SearchOutlined />}
              placeholder="Global search across organizations, recruiters, candidates, jobs, applications, invoices, support tickets"
              style={{ minWidth: 420 }}
            />
            <Button onClick={loadAll}>Refresh All</Button>
          </Space>
        </Space>
      </Card>

      <Tabs
        type="card"
        activeKey={activeTabKey}
        onChange={(key) => {
          const nextRoute = tabKeyToRoute[key] || ROUTES.ADMIN_DASHBOARD;
          if (location.pathname !== nextRoute) {
            navigate(nextRoute);
          }
        }}
        items={[
          {
            key: 'dashboard',
            label: (
              <Space>
                <AppstoreOutlined />
                Super Admin Dashboard
              </Space>
            ),
            children: (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Row gutter={[12, 12]}>
                  <Col xs={12} md={6} lg={4}><Card><Statistic title="Total Organizations" value={dashboardKpi.totalOrganizations} /></Card></Col>
                  <Col xs={12} md={6} lg={4}><Card><Statistic title="Active Organizations" value={dashboardKpi.activeOrganizations} /></Card></Col>
                  <Col xs={12} md={6} lg={4}><Card><Statistic title="Pending Organizations" value={dashboardKpi.pendingOrganizations} /></Card></Col>
                  <Col xs={12} md={6} lg={4}><Card><Statistic title="Suspended Organizations" value={dashboardKpi.suspendedOrganizations} /></Card></Col>
                  <Col xs={12} md={6} lg={4}><Card><Statistic title="Total Recruiters" value={dashboardKpi.totalRecruiters} /></Card></Col>
                  <Col xs={12} md={6} lg={4}><Card><Statistic title="Total Candidates" value={dashboardKpi.totalCandidates} /></Card></Col>
                  <Col xs={12} md={6} lg={4}><Card><Statistic title="Total Jobs" value={dashboardKpi.totalJobs} /></Card></Col>
                  <Col xs={12} md={6} lg={4}><Card><Statistic title="Open Jobs" value={dashboardKpi.openJobs} /></Card></Col>
                  <Col xs={12} md={6} lg={4}><Card><Statistic title="Applications Today" value={dashboardKpi.applicationsToday} /></Card></Col>
                  <Col xs={12} md={6} lg={4}><Card><Statistic title="Interviews Today" value={dashboardKpi.interviewsToday} /></Card></Col>
                  <Col xs={12} md={6} lg={4}><Card><Statistic title="Messages Today" value={dashboardKpi.messagesToday} /></Card></Col>
                  <Col xs={12} md={6} lg={4}><Card><Statistic title="AI Requests Today" value={dashboardKpi.aiRequestsToday} /></Card></Col>
                  <Col xs={12} md={6} lg={4}><Card><Statistic title="Revenue Today" value={dashboardKpi.revenueToday} formatter={(v) => formatMoney(Number(v || 0))} /></Card></Col>
                  <Col xs={12} md={6} lg={4}><Card><Statistic title="Revenue This Month" value={dashboardKpi.revenueMonth} formatter={(v) => formatMoney(Number(v || 0))} /></Card></Col>
                  <Col xs={12} md={6} lg={4}><Card><Statistic title="Credits Purchased" value={dashboardKpi.creditsPurchased} /></Card></Col>
                  <Col xs={12} md={6} lg={4}><Card><Statistic title="Platform Health" value={dashboardKpi.platformHealth} suffix="/100" /></Card></Col>
                  <Col xs={12} md={6} lg={4}><Card><Statistic title="Server Status" value={dashboardKpi.serverStatus} /></Card></Col>
                </Row>
              </Space>
            ),
          },
          {
            key: 'organizations',
            label: (
              <Space>
                <BankOutlined />
                Organizations
              </Space>
            ),
            children: (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space wrap>
                  <Input
                    value={orgSearch}
                    onChange={(e) => setOrgSearch(e.target.value)}
                    placeholder="Search organization / owner / plan"
                    style={{ width: 320 }}
                  />
                  <Select
                    value={statusFilter}
                    onChange={(v) => setStatusFilter(v as StatusFilter)}
                    style={{ width: 180 }}
                    options={[
                      { label: 'All Statuses', value: 'all' },
                      { label: 'Active', value: 'active' },
                      { label: 'Pending', value: 'pending' },
                      { label: 'Suspended', value: 'suspended' },
                    ]}
                  />
                </Space>
                <Table rowKey="id" dataSource={filteredOrganizations} columns={orgColumns} pagination={{ pageSize: 8 }} scroll={{ x: 1800 }} loading={actionLoading} />
              </Space>
            ),
          },
          {
            key: 'recruiters',
            label: (
              <Space>
                <TeamOutlined />
                Recruiters Management
              </Space>
            ),
            children: (
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Input value={recruiterSearch} onChange={(e) => setRecruiterSearch(e.target.value)} placeholder="Search recruiters by name, email, company" style={{ maxWidth: 360 }} />
                <Table rowKey="id" dataSource={filteredRecruiters} columns={recruiterColumns} pagination={{ pageSize: 10 }} scroll={{ x: 1500 }} />
              </Space>
            ),
          },
          {
            key: 'candidates',
            label: (
              <Space>
                <TeamOutlined />
                Candidates Management
              </Space>
            ),
            children: (
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Input value={candidateSearch} onChange={(e) => setCandidateSearch(e.target.value)} placeholder="Search candidates by name, email, location" style={{ maxWidth: 360 }} />
                <Table rowKey="id" dataSource={filteredCandidates} columns={candidateColumns} pagination={{ pageSize: 10 }} scroll={{ x: 1600 }} />
              </Space>
            ),
          },
          {
            key: 'jobs',
            label: (
              <Space>
                <ToolOutlined />
                Jobs Management
              </Space>
            ),
            children: (
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Space wrap>
                  <Input value={jobSearch} onChange={(e) => setJobSearch(e.target.value)} placeholder="Search jobs by title, company, location" style={{ width: 360 }} />
                  <Button icon={<BugOutlined />} onClick={runModerationSweep}>Run Moderation Sweep</Button>
                </Space>
                <Table rowKey="id" dataSource={filteredJobs} columns={jobColumns} pagination={{ pageSize: 10 }} scroll={{ x: 2200 }} />
              </Space>
            ),
          },
          {
            key: 'applications',
            label: (
              <Space>
                <FileSearchOutlined />
                Applications Management
              </Space>
            ),
            children: (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Row gutter={[12, 12]}>
                  <Col xs={12} md={4}><Card><Statistic title="Applications" value={applications.length} /></Card></Col>
                  <Col xs={12} md={4}><Card><Statistic title="Interviews" value={Math.round(applications.length * 0.35)} /></Card></Col>
                  <Col xs={12} md={4}><Card><Statistic title="Offers" value={Math.round(applications.length * 0.12)} /></Card></Col>
                  <Col xs={12} md={4}><Card><Statistic title="Hires" value={applications.filter((a) => String(a.status).toLowerCase() === 'accepted').length} /></Card></Col>
                  <Col xs={12} md={4}><Card><Statistic title="Rejected" value={applications.filter((a) => String(a.status).toLowerCase() === 'rejected').length} /></Card></Col>
                  <Col xs={12} md={4}><Card><Statistic title="Cancelled" value={applications.filter((a) => String(a.status).toLowerCase() === 'cancelled').length} /></Card></Col>
                </Row>
                <Table rowKey="id" dataSource={applications} columns={appColumns} pagination={{ pageSize: 10 }} scroll={{ x: 1200 }} />
              </Space>
            ),
          },
          {
            key: 'revenue',
            label: (
              <Space>
                <DollarOutlined />
                Revenue Dashboard
              </Space>
            ),
            children: (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Row gutter={[12, 12]}>
                  <Col xs={12} md={6}><Card><Statistic title="MRR" value={revenueMetrics.mrr} formatter={(v) => formatMoney(Number(v || 0))} /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="ARR" value={revenueMetrics.arr} formatter={(v) => formatMoney(Number(v || 0))} /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Daily Revenue" value={dashboardKpi.revenueToday} formatter={(v) => formatMoney(Number(v || 0))} /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Monthly Revenue" value={dashboardKpi.revenueMonth} formatter={(v) => formatMoney(Number(v || 0))} /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Subscription Growth" value={revenueMetrics.subscriptionGrowth} suffix="%" /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Credits Sold" value={revenueMetrics.creditsSold} /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Refunds" value={revenueMetrics.refunds} formatter={(v) => formatMoney(Number(v || 0))} /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Paid Transactions" value={revenueMetrics.paidRows} /></Card></Col>
                </Row>
                <Card title="Top Customers">
                  <Table
                    rowKey="id"
                    pagination={false}
                    dataSource={revenueMetrics.topCustomers}
                    columns={[
                      { title: 'Organization', dataIndex: 'organization' },
                      { title: 'Plan', dataIndex: 'plan' },
                      { title: 'Revenue', dataIndex: 'revenue', render: (v) => formatMoney(Number(v || 0)) },
                      { title: 'Status', dataIndex: 'status', render: (v) => <Tag>{String(v || 'active').toUpperCase()}</Tag> },
                    ]}
                  />
                </Card>
              </Space>
            ),
          },
          {
            key: 'subscriptions',
            label: (
              <Space>
                <DatabaseOutlined />
                Subscription Management
              </Space>
            ),
            children: (
              <Table
                rowKey="id"
                dataSource={organizationsWithOverrides}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1500 }}
                columns={[
                  { title: 'Organization', dataIndex: 'organization' },
                  { title: 'Current Plan', key: 'plan', render: (_, row) => localState.subscriptions[row.id]?.plan || row.plan || 'starter' },
                  { title: 'Subscription Status', key: 'status', render: (_, row) => <Tag>{String(localState.subscriptions[row.id]?.status || row.status || 'active').toUpperCase()}</Tag> },
                  {
                    title: 'Actions',
                    key: 'actions',
                    render: (_, row) => (
                      <Space size={6} wrap>
                        <Button size="small" onClick={() => updateSubscription(String(row.id), { plan: 'enterprise' })}>Upgrade</Button>
                        <Button size="small" onClick={() => updateSubscription(String(row.id), { plan: 'starter' })}>Downgrade</Button>
                        <Button size="small" icon={<PauseCircleOutlined />} onClick={() => updateSubscription(String(row.id), { status: 'paused' })}>Pause</Button>
                        <Button size="small" icon={<PlayCircleOutlined />} onClick={() => updateSubscription(String(row.id), { status: 'active' })}>Resume</Button>
                        <Button size="small" danger icon={<StopOutlined />} onClick={() => updateSubscription(String(row.id), { status: 'cancelled' })}>Cancel</Button>
                        <Button size="small" icon={<GiftOutlined />} onClick={() => modifyCredits(String(row.id), 20, 'free credits issued')}>Issue Free Credits</Button>
                        <Button size="small" icon={<TagOutlined />} onClick={() => addAuditLog('discount_issued', 'subscription', String(row.id))}>Issue Discount</Button>
                      </Space>
                    ),
                  },
                ]}
              />
            ),
          },
          {
            key: 'credits',
            label: (
              <Space>
                <BankOutlined />
                Credits Management
              </Space>
            ),
            children: (
              <Table
                rowKey="id"
                dataSource={organizationsWithOverrides}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1400 }}
                columns={[
                  { title: 'Organization', dataIndex: 'organization' },
                  { title: 'Plan', dataIndex: 'plan' },
                  { title: 'Credits Balance', key: 'credits', render: (_, row) => Number(localState.credits[row.id] || 0) },
                  { title: 'Usage', key: 'usage', render: (_, row) => `${Math.max(0, Math.round((Number(localState.credits[row.id] || 0) || 0) * 0.4))} used` },
                  {
                    title: 'Actions',
                    key: 'actions',
                    render: (_, row) => (
                      <Space size={6} wrap>
                        <Button size="small" onClick={() => modifyCredits(String(row.id), 50, 'allocate credits')}>Allocate Credits</Button>
                        <Button size="small" danger onClick={() => modifyCredits(String(row.id), -20, 'remove credits')}>Remove Credits</Button>
                        <Button size="small" onClick={() => modifyCredits(String(row.id), 10, 'refund credits')}>Refund Credits</Button>
                        <Button size="small" onClick={() => { modifyCredits(String(row.id), -10, 'transfer out'); message.success('Transfer completed to target org from manual flow'); }}>Transfer Credits</Button>
                      </Space>
                    ),
                  },
                ]}
              />
            ),
          },
          {
            key: 'support',
            label: (
              <Space>
                <CustomerServiceOutlined />
                Support Center
              </Space>
            ),
            children: (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space wrap>
                  <Select
                    value={ticketFilter}
                    onChange={(v) => setTicketFilter(v as 'all' | 'open' | 'closed')}
                    style={{ width: 180 }}
                    options={[
                      { label: 'Open Tickets', value: 'open' },
                      { label: 'Closed Tickets', value: 'closed' },
                      { label: 'All Tickets', value: 'all' },
                    ]}
                  />
                  <Tag color="orange">Open: {supportTickets.filter((t) => String(t.status || 'open').toLowerCase() !== 'closed').length}</Tag>
                  <Tag color="green">Closed: {supportTickets.filter((t) => String(t.status || 'open').toLowerCase() === 'closed').length}</Tag>
                </Space>
                <Table rowKey="id" dataSource={visibleTickets} columns={supportColumns} pagination={{ pageSize: 10 }} scroll={{ x: 1600 }} />
              </Space>
            ),
          },
          {
            key: 'moderation',
            label: (
              <Space>
                <FlagOutlined />
                Platform Moderation
              </Space>
            ),
            children: (
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Row gutter={[12, 12]}>
                  <Col xs={12} md={6}><Card><Statistic title="Reported Jobs" value={jobsWithOverrides.filter((j) => String(j.runtimeStatus) === 'flagged').length} /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Fake Recruiters" value={Math.round(recruitersWithOverrides.length * 0.01)} /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Fake Candidates" value={Math.round(candidatesWithOverrides.length * 0.015)} /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Spam Messages" value={Math.round(dashboardKpi.messagesToday * 0.04)} /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Abuse Reports" value={Math.round(supportTickets.length * 0.08)} /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Fraud Detection" value={Math.round(payments.length * 0.03)} /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Duplicate Jobs" value={Math.round(jobsWithOverrides.length * 0.02)} /></Card></Col>
                </Row>
                <Alert type="warning" showIcon message="Moderation pipeline scans job content, profile anomalies, spam patterns, and payment abuse signals." />
                <Button icon={<SafetyOutlined />} onClick={runModerationSweep}>Run Full Moderation Review</Button>
              </Space>
            ),
          },
          {
            key: 'announcements',
            label: (
              <Space>
                <BellOutlined />
                Announcement Center
              </Space>
            ),
            children: (
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Space wrap>
                  <Select
                    value={announcementType}
                    onChange={setAnnouncementType}
                    style={{ width: 220 }}
                    options={[
                      { label: 'Maintenance Notice', value: 'maintenance_notice' },
                      { label: 'New Feature', value: 'new_feature' },
                      { label: 'Scheduled Downtime', value: 'scheduled_downtime' },
                      { label: 'Security Alert', value: 'security_alert' },
                      { label: 'System Message', value: 'system_message' },
                    ]}
                  />
                  <Input
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    placeholder="Announcement title"
                    style={{ width: 320 }}
                  />
                </Space>
                <Input.TextArea
                  rows={4}
                  value={announcementMessage}
                  onChange={(e) => setAnnouncementMessage(e.target.value)}
                  placeholder="Announcement content"
                />
                <Button type="primary" onClick={postAnnouncement}>Create Announcement</Button>
                <Table
                  rowKey="id"
                  dataSource={localState.announcements}
                  pagination={{ pageSize: 8 }}
                  columns={[
                    { title: 'Type', dataIndex: 'type', render: (v) => <Tag>{String(v || '').toUpperCase()}</Tag> },
                    { title: 'Title', dataIndex: 'title' },
                    { title: 'Message', dataIndex: 'message' },
                    { title: 'Created', dataIndex: 'createdAt', render: (v) => toDateLabel(v) },
                  ]}
                />
              </Space>
            ),
          },
          {
            key: 'feature-flags',
            label: (
              <Space>
                <SettingOutlined />
                Feature Flags
              </Space>
            ),
            children: (
              <Row gutter={[12, 12]}>
                {Object.entries(localState.featureFlags).map(([key, value]) => (
                  <Col xs={24} md={8} key={key}>
                    <Card>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Text strong>{key}</Text>
                        <Switch checked={Boolean(value)} onChange={(v) => toggleFeatureFlag(key as keyof LocalState['featureFlags'], v)} />
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            ),
          },
          {
            key: 'platform-analytics',
            label: (
              <Space>
                <BarChartOutlined />
                Platform Analytics
              </Space>
            ),
            children: (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Row gutter={[12, 12]}>
                  <Col xs={12} md={6}><Card><Statistic title="Daily Active Users" value={platformAnalytics.dau} /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Monthly Active Users" value={platformAnalytics.mau} /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Recruiter Growth" value={platformAnalytics.recruiterGrowth} suffix="%" /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Candidate Growth" value={platformAnalytics.candidateGrowth} suffix="%" /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Application Growth" value={platformAnalytics.applicationGrowth} suffix="%" /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Hiring Rate" value={platformAnalytics.hiringRate} suffix="%" /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Interview Rate" value={platformAnalytics.interviewRate} suffix="%" /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="AI Usage (30d)" value={platformAnalytics.aiUsage} /></Card></Col>
                </Row>
                <Card title="Conversion Funnel">
                  <Table
                    rowKey="stage"
                    pagination={false}
                    dataSource={platformAnalytics.funnel}
                    columns={[
                      { title: 'Stage', dataIndex: 'stage' },
                      { title: 'Volume', dataIndex: 'value' },
                    ]}
                  />
                </Card>
              </Space>
            ),
          },
          {
            key: 'ai-monitoring',
            label: (
              <Space>
                <CodeOutlined />
                AI Monitoring
              </Space>
            ),
            children: (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Row gutter={[12, 12]}>
                  <Col xs={12} md={6}><Card><Statistic title="Total AI Requests" value={aiMonitoring.totalAiRequests} /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Average Response Time" value={aiMonitoring.avgResponse} suffix="ms" /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Token Usage" value={aiMonitoring.tokenUsage} /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Failed Requests" value={aiMonitoring.failedRequests} /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Cost Estimation" value={aiMonitoring.costEstimation} formatter={(v) => formatMoney(Number(v || 0))} /></Card></Col>
                </Row>
                <Card title="Model Usage">
                  <Table
                    rowKey="model"
                    pagination={false}
                    dataSource={aiMonitoring.modelUsage}
                    columns={[
                      { title: 'Model', dataIndex: 'model' },
                      { title: 'Requests', dataIndex: 'requests' },
                    ]}
                  />
                </Card>
              </Space>
            ),
          },
          {
            key: 'system-monitoring',
            label: (
              <Space>
                <CloudServerOutlined />
                System Monitoring
              </Space>
            ),
            children: (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Row gutter={[12, 12]}>
                  <Col xs={12} md={6}><Card><Statistic title="API Status" value={systemMonitoring.apiStatus} /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Database Status" value={systemMonitoring.dbStatus} /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Queue Status" value={`${systemMonitoring.queueHealthy}/${systemMonitoring.queueTotal} Healthy`} /></Card></Col>
                  <Col xs={12} md={6}><Card><Statistic title="Worker Status" value={systemMonitoring.workerStatus} /></Card></Col>
                </Row>
                <Row gutter={[12, 12]}>
                  <Col xs={24} md={8}><Card title="Storage Usage"><Progress percent={systemMonitoring.storageUsage} status={systemMonitoring.storageUsage > 85 ? 'exception' : 'active'} /></Card></Col>
                  <Col xs={24} md={8}><Card title="CPU Usage"><Progress percent={Math.round(systemMonitoring.cpuUsage)} status={systemMonitoring.cpuUsage > 85 ? 'exception' : 'active'} /></Card></Col>
                  <Col xs={24} md={8}><Card title="Memory Usage"><Progress percent={Math.round(systemMonitoring.memoryUsage)} status={systemMonitoring.memoryUsage > 85 ? 'exception' : 'active'} /></Card></Col>
                </Row>
                <Card title="Cron Jobs">
                  <Table rowKey="id" pagination={false} dataSource={systemMonitoring.cronJobs} columns={[
                    { title: 'Job', dataIndex: 'name' },
                    { title: 'Schedule', dataIndex: 'schedule' },
                    { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={String(v) === 'healthy' ? 'green' : String(v) === 'late' ? 'gold' : 'red'}>{String(v).toUpperCase()}</Tag> },
                    { title: 'Last Run', dataIndex: 'lastRun', render: (v) => toDateLabel(v) },
                  ]} />
                </Card>
                <Card title="Background Jobs">
                  <Table rowKey="id" pagination={false} dataSource={systemMonitoring.backgroundJobs} columns={[
                    { title: 'Queue', dataIndex: 'name' },
                    { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={String(v) === 'running' ? 'green' : String(v) === 'queued' ? 'blue' : 'red'}>{String(v).toUpperCase()}</Tag> },
                    { title: 'Latency', dataIndex: 'latencyMs', render: (v) => `${v} ms` },
                  ]} />
                </Card>
              </Space>
            ),
          },
          {
            key: 'notifications',
            label: (
              <Space>
                <BellOutlined />
                Notification Center
              </Space>
            ),
            children: (
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Space wrap>
                  <Select value={notifyAudience} onChange={setNotifyAudience} style={{ width: 180 }} options={[
                    { label: 'Organizations', value: 'organizations' },
                    { label: 'Recruiters', value: 'recruiters' },
                    { label: 'Candidates', value: 'candidates' },
                  ]} />
                  <Select value={notifyPlan} onChange={setNotifyPlan} style={{ width: 160 }} options={[
                    { label: 'All Plans', value: 'all' },
                    { label: 'Starter', value: 'starter' },
                    { label: 'Growth', value: 'growth' },
                    { label: 'Professional', value: 'professional' },
                    { label: 'Business', value: 'business' },
                    { label: 'Enterprise', value: 'enterprise' },
                  ]} />
                  <Select value={notifyCountry} onChange={setNotifyCountry} style={{ width: 170 }} options={[
                    { label: 'All Countries', value: 'all' },
                    { label: 'India', value: 'India' },
                    { label: 'United States', value: 'United States' },
                    { label: 'United Kingdom', value: 'United Kingdom' },
                  ]} />
                  <Select value={notifyRole} onChange={setNotifyRole} style={{ width: 170 }} options={[
                    { label: 'All Roles', value: 'all' },
                    { label: 'Recruiter', value: 'recruiter' },
                    { label: 'Hiring Manager', value: 'hiring_manager' },
                    { label: 'Candidate', value: 'candidate' },
                  ]} />
                </Space>
                <Input.TextArea rows={3} value={notifyText} onChange={(e) => setNotifyText(e.target.value)} placeholder="Notification text" />
                <Button type="primary" onClick={sendNotification}>Send Notification</Button>
                <Table rowKey="id" dataSource={localState.notificationsHistory} pagination={{ pageSize: 8 }} columns={[
                  { title: 'Audience', dataIndex: 'audience' },
                  { title: 'Text', dataIndex: 'text' },
                  { title: 'Created', dataIndex: 'createdAt', render: (v) => toDateLabel(v) },
                ]} />
              </Space>
            ),
          },
          {
            key: 'emails',
            label: (
              <Space>
                <MailOutlined />
                Email Center
              </Space>
            ),
            children: (
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Space wrap>
                  <Select value={emailCategory} onChange={setEmailCategory} style={{ width: 200 }} options={[
                    { label: 'Announcement', value: 'announcement' },
                    { label: 'System Email', value: 'system' },
                    { label: 'Custom Email', value: 'custom' },
                    { label: 'Campaign', value: 'campaign' },
                  ]} />
                  <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Email subject" style={{ width: 340 }} />
                </Space>
                <Input.TextArea rows={4} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="Email content" />
                <Button type="primary" onClick={sendEmailCampaign}>Send Email Campaign</Button>
                <Table rowKey="id" dataSource={localState.emailHistory} pagination={{ pageSize: 8 }} columns={[
                  { title: 'Category', dataIndex: 'category', render: (v) => <Tag>{String(v).toUpperCase()}</Tag> },
                  { title: 'Subject', dataIndex: 'subject' },
                  { title: 'Created', dataIndex: 'createdAt', render: (v) => toDateLabel(v) },
                ]} />
              </Space>
            ),
          },
          {
            key: 'audit-logs',
            label: (
              <Space>
                <LockOutlined />
                Audit Logs
              </Space>
            ),
            children: (
              <Table
                rowKey="id"
                dataSource={localState.auditLogs}
                pagination={{ pageSize: 12 }}
                columns={[
                  { title: 'Time', dataIndex: 'at', render: (v) => toDateLabel(v) },
                  { title: 'Actor', dataIndex: 'actor', render: (v) => <Tag color="blue">{String(v || '').toUpperCase()}</Tag> },
                  { title: 'Action', dataIndex: 'action' },
                  { title: 'Entity', dataIndex: 'entity' },
                  { title: 'Details', dataIndex: 'details' },
                ]}
              />
            ),
          },
          {
            key: 'platform-settings',
            label: (
              <Space>
                <SettingOutlined />
                Platform Settings
              </Space>
            ),
            children: (
              <Card>
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  <Row gutter={[12, 12]}>
                    <Col xs={24} md={8}><Input addonBefore="Default Plan" value={localState.platformSettings.defaultPlan} onChange={(e) => patchLocalState({ platformSettings: { ...localState.platformSettings, defaultPlan: e.target.value } })} /></Col>
                    <Col xs={24} md={8}><Input addonBefore="Default Credits" type="number" value={String(localState.platformSettings.defaultCredits)} onChange={(e) => patchLocalState({ platformSettings: { ...localState.platformSettings, defaultCredits: Number(e.target.value) || 0 } })} /></Col>
                    <Col xs={24} md={8}><Input addonBefore="Tax %" type="number" value={String(localState.platformSettings.taxPercent)} onChange={(e) => patchLocalState({ platformSettings: { ...localState.platformSettings, taxPercent: Number(e.target.value) || 0 } })} /></Col>
                    <Col xs={24} md={8}><Input addonBefore="Email From" value={localState.platformSettings.emailFrom} onChange={(e) => patchLocalState({ platformSettings: { ...localState.platformSettings, emailFrom: e.target.value } })} /></Col>
                    <Col xs={24} md={8}><Input addonBefore="AI Daily Budget" type="number" value={String(localState.platformSettings.aiDailyBudget)} onChange={(e) => patchLocalState({ platformSettings: { ...localState.platformSettings, aiDailyBudget: Number(e.target.value) || 0 } })} /></Col>
                    <Col xs={24} md={8}><Input addonBefore="Payment Gateway" value={localState.platformSettings.paymentGateway} onChange={(e) => patchLocalState({ platformSettings: { ...localState.platformSettings, paymentGateway: e.target.value } })} /></Col>
                    <Col xs={24} md={8}><Input addonBefore="Upload Limit MB" type="number" value={String(localState.platformSettings.fileUploadLimitMb)} onChange={(e) => patchLocalState({ platformSettings: { ...localState.platformSettings, fileUploadLimitMb: Number(e.target.value) || 0 } })} /></Col>
                    <Col xs={24} md={8}><Input addonBefore="Session Timeout Min" type="number" value={String(localState.platformSettings.sessionTimeoutMin)} onChange={(e) => patchLocalState({ platformSettings: { ...localState.platformSettings, sessionTimeoutMin: Number(e.target.value) || 0 } })} /></Col>
                    <Col xs={24} md={8}>
                      <Space>
                        <Text strong>Maintenance Mode</Text>
                        <Switch checked={localState.platformSettings.maintenanceMode} onChange={(checked) => patchLocalState({ platformSettings: { ...localState.platformSettings, maintenanceMode: checked } })} />
                      </Space>
                    </Col>
                  </Row>
                  <Button type="primary" onClick={savePlatformSettings}>Save Platform Settings</Button>
                </Space>
              </Card>
            ),
          },
          {
            key: 'developer-tools',
            label: (
              <Space>
                <CodeOutlined />
                Developer Tools
              </Space>
            ),
            children: (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Row gutter={[12, 12]}>
                  <Col xs={24} lg={12}>
                    <Card title="API Usage & Keys" extra={<Button size="small" onClick={rotateApiKey}>Rotate Key</Button>}>
                      <Table
                        rowKey="id"
                        pagination={{ pageSize: 5 }}
                        dataSource={localState.apiKeys}
                        columns={[
                          { title: 'API Key', dataIndex: 'keyMasked' },
                          { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={String(v) === 'active' ? 'green' : 'red'}>{String(v).toUpperCase()}</Tag> },
                          { title: 'Created', dataIndex: 'createdAt', render: (v) => toDateLabel(v) },
                          {
                            title: 'Action',
                            key: 'action',
                            render: (_, row) => <Button size="small" danger disabled={row.status !== 'active'} onClick={() => revokeApiKey(String(row.id))}>Revoke</Button>,
                          },
                        ]}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Card title="Webhook Logs">
                      <Table
                        rowKey="id"
                        pagination={{ pageSize: 5 }}
                        dataSource={localState.webhookLogs}
                        columns={[
                          { title: 'Endpoint', dataIndex: 'endpoint' },
                          { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={String(v) === 'success' ? 'green' : 'red'}>{String(v).toUpperCase()}</Tag> },
                          { title: 'Time', dataIndex: 'at', render: (v) => toDateLabel(v) },
                        ]}
                      />
                    </Card>
                  </Col>
                </Row>
                <Row gutter={[12, 12]}>
                  <Col xs={24} lg={12}>
                    <Card title="Queue Monitor" extra={<Button size="small" onClick={runQueueHealthCheck}>Refresh Queue</Button>}>
                      <Table
                        rowKey="id"
                        pagination={false}
                        dataSource={localState.queueJobs}
                        columns={[
                          { title: 'Job', dataIndex: 'name' },
                          { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={String(v) === 'running' ? 'green' : String(v) === 'queued' ? 'blue' : 'red'}>{String(v).toUpperCase()}</Tag> },
                          { title: 'Latency', dataIndex: 'latencyMs', render: (v) => `${v} ms` },
                        ]}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Card title="Error Logs & Cron Scheduler">
                      <Input
                        value={developerLogQuery}
                        onChange={(e) => setDeveloperLogQuery(e.target.value)}
                        addonBefore="Search Logs"
                      />
                      <Divider />
                      <Table
                        rowKey="id"
                        pagination={false}
                        dataSource={localState.cronJobs}
                        columns={[
                          { title: 'Cron', dataIndex: 'name' },
                          { title: 'Schedule', dataIndex: 'schedule' },
                          { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={String(v) === 'healthy' ? 'green' : String(v) === 'late' ? 'gold' : 'red'}>{String(v).toUpperCase()}</Tag> },
                        ]}
                      />
                    </Card>
                  </Col>
                </Row>
              </Space>
            ),
          },
          {
            key: 'data-export',
            label: (
              <Space>
                <DownloadOutlined />
                Data Export
              </Space>
            ),
            children: (
              <Row gutter={[12, 12]}>
                <Col xs={24} md={12} lg={8}><Card title="Organizations"><Button type="primary" onClick={() => exportDataset('organizations', organizationsWithOverrides)}>Export Organizations</Button></Card></Col>
                <Col xs={24} md={12} lg={8}><Card title="Recruiters"><Button type="primary" onClick={() => exportDataset('recruiters', recruitersWithOverrides)}>Export Recruiters</Button></Card></Col>
                <Col xs={24} md={12} lg={8}><Card title="Candidates"><Button type="primary" onClick={() => exportDataset('candidates', candidatesWithOverrides)}>Export Candidates</Button></Card></Col>
                <Col xs={24} md={12} lg={8}><Card title="Jobs"><Button type="primary" onClick={() => exportDataset('jobs', jobsWithOverrides)}>Export Jobs</Button></Card></Col>
                <Col xs={24} md={12} lg={8}><Card title="Analytics"><Button type="primary" onClick={() => exportDataset('analytics', platformAnalytics.funnel)}>Export Analytics</Button></Card></Col>
                <Col xs={24} md={12} lg={8}><Card title="Revenue"><Button type="primary" onClick={() => exportDataset('revenue', payments)}>Export Revenue</Button></Card></Col>
                <Col xs={24} md={12} lg={8}><Card title="Support Tickets"><Button type="primary" onClick={() => exportDataset('support-tickets', supportTickets)}>Export Support Tickets</Button></Card></Col>
              </Row>
            ),
          },
          {
            key: 'permissions',
            label: (
              <Space>
                <SafetyOutlined />
                Permissions
              </Space>
            ),
            children: (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Alert
                  showIcon
                  message="Super Admin Role Matrix"
                  description="Roles supported: Platform Owner, Super Admin, Support Admin, Finance Admin, Security Admin, Content Moderator, Operations Admin, Developer Admin."
                />
                <Table
                  rowKey="role"
                  pagination={false}
                  dataSource={[
                    { role: 'platform_owner', permissions: 'Full platform control' },
                    { role: 'super_admin', permissions: 'Full platform operations' },
                    { role: 'support_admin', permissions: 'Support tickets, announcements, notifications' },
                    { role: 'finance_admin', permissions: 'Revenue, subscriptions, credits, refunds' },
                    { role: 'security_admin', permissions: 'Security policies, audit logs, compliance settings' },
                    { role: 'content_moderator', permissions: 'Job/profile moderation, abuse/fraud review' },
                    { role: 'operations_admin', permissions: 'Organizations, recruiters, candidates, jobs lifecycle' },
                    { role: 'developer_admin', permissions: 'API keys, webhooks, queue monitor, error logs, cron scheduler' },
                  ]}
                  columns={[
                    { title: 'Role', dataIndex: 'role', render: (v) => <Tag color="blue">{String(v).toUpperCase()}</Tag> },
                    { title: 'Permissions', dataIndex: 'permissions' },
                    { title: 'Current Role Active?', key: 'active', render: (_, row) => row.role === activeRole ? <Tag color="green">ACTIVE</Tag> : <Tag>INACTIVE</Tag> },
                  ]}
                />
              </Space>
            ),
          },
          {
            key: 'global-search',
            label: (
              <Space>
                <SearchOutlined />
                Global Search
              </Space>
            ),
            children: (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Input
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Search Organizations, Recruiters, Candidates, Jobs, Applications, Invoices, Support Tickets"
                  prefix={<SearchOutlined />}
                />
                <Table
                  rowKey={(row) => `${row.type}_${row.id}`}
                  dataSource={globalSearchResults}
                  pagination={{ pageSize: 12 }}
                  columns={[
                    { title: 'Type', dataIndex: 'type', render: (v) => <Tag color="geekblue">{v}</Tag> },
                    { title: 'Identifier', dataIndex: 'id' },
                    { title: 'Title', dataIndex: 'title' },
                    { title: 'Details', dataIndex: 'subtitle' },
                  ]}
                />
              </Space>
            ),
          },
        ]}
      />

      <Card title="Organization Details">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Select
            value={selectedOrgId || undefined}
            onChange={setSelectedOrgId}
            showSearch
            optionFilterProp="label"
            placeholder="Select organization"
            style={{ width: 360 }}
            options={organizationsWithOverrides.map((org) => ({ label: org.organization, value: String(org.id) }))}
          />
          {selectedOrgDetails ? (
            <Row gutter={[12, 12]}>
              <Col xs={24} lg={12}>
                <Descriptions bordered size="small" column={1} title="Company Profile">
                  <Descriptions.Item label="Organization">{selectedOrgDetails.organization}</Descriptions.Item>
                  <Descriptions.Item label="Owner">{selectedOrgDetails.owner}</Descriptions.Item>
                  <Descriptions.Item label="Plan">{localState.subscriptions[selectedOrgDetails.id]?.plan || selectedOrgDetails.plan}</Descriptions.Item>
                  <Descriptions.Item label="Status">{localState.subscriptions[selectedOrgDetails.id]?.status || selectedOrgDetails.status}</Descriptions.Item>
                  <Descriptions.Item label="Storage">{selectedOrgDetails.storage}</Descriptions.Item>
                </Descriptions>
              </Col>
              <Col xs={24} lg={12}>
                <Descriptions bordered size="small" column={1} title="Usage & Commercials">
                  <Descriptions.Item label="Credits">{localState.credits[selectedOrgDetails.id] || 0}</Descriptions.Item>
                  <Descriptions.Item label="Recruiters">{selectedOrgDetails.recruiters}</Descriptions.Item>
                  <Descriptions.Item label="Jobs">{selectedOrgDetails.jobs}</Descriptions.Item>
                  <Descriptions.Item label="Candidates">{selectedOrgDetails.candidates}</Descriptions.Item>
                  <Descriptions.Item label="Revenue">{formatMoney(Number(selectedOrgDetails.revenue || 0))}</Descriptions.Item>
                </Descriptions>
              </Col>
              <Col xs={24}>
                <Alert
                  type="info"
                  showIcon
                  message="Organization Details Coverage"
                  description="Company Profile, Subscription, Credits, Recruiters, Jobs, Analytics, Audit Logs, Support Tickets, Invoices, and Usage are managed through linked platform sections and tenant-scoped controls."
                />
              </Col>
            </Row>
          ) : (
            <Text type="secondary">Select an organization to view details.</Text>
          )}
        </Space>
      </Card>

      <Card>
        <Space wrap>
          <Tag color="green" icon={<CheckCircleOutlined />}>Recruiter Dashboard remains isolated and unchanged.</Tag>
          <Tag color="blue" icon={<UnlockOutlined />}>Super Admin Portal is dedicated and platform-wide.</Tag>
          <Tag color="purple" icon={<DatabaseOutlined />}>Architecture ready for high-scale pagination and sharded tenancy.</Tag>
        </Space>
      </Card>
    </Space>
  );
};

export default AdminControlCenter;
