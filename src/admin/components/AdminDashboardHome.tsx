import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRightOutlined,
  BankOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CustomerServiceOutlined,
  DollarOutlined,
  EyeOutlined,
  FileSearchOutlined,
  NotificationOutlined,
  ReloadOutlined,
  SafetyOutlined,
  StarOutlined,
  TeamOutlined,
  ToolOutlined,
  TrophyOutlined,
  UploadOutlined,
  UserAddOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { ROUTES } from '../../constants';
import { formatRupees, paiseToRupees } from '@utils/currency';
import './adminDashboard.css';

type AnyRecord = Record<string, any>;
export type Slice = { name: string; value: number; color?: string };

export type AdminDashboardKpi = {
  openJobs: number;
  totalOrganizations: number;
  activeOrganizations: number;
  totalCandidates: number;
  totalRecruiters: number;
  revenueMonth: number;
  revenueToday: number;
  applicationsToday: number;
};

type AdminDashboardHomeProps = {
  adminName: string;
  stats: Record<string, number>;
  kpi: AdminDashboardKpi;
  users: AnyRecord[];
  jobs: AnyRecord[];
  applications: AnyRecord[];
  payments: AnyRecord[];
  supportTickets: AnyRecord[];
  chartData: AnyRecord[];
  systemHealth: AnyRecord | null;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onNavigate: (to: string) => void;
};

const PALETTE = ['#2563eb', '#7c3aed', '#0ea5e9', '#16a34a', '#f59e0b', '#ef4444', '#64748b', '#db2777'];

export const STATUS_COLORS: Record<string, string> = {
  applied: '#2563eb',
  under_review: '#f59e0b',
  shortlisted: '#7c3aed',
  accepted: '#16a34a',
  rejected: '#ef4444',
  published: '#16a34a',
  draft: '#94a3b8',
  closed: '#64748b',
  expired: '#f59e0b',
  paused: '#0ea5e9',
};

export const formatNumber = (value: unknown) => Number(value || 0).toLocaleString();
const formatMoney = formatRupees;
export const humanize = (value: string) => value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
export const normalizeKey = (value: unknown, fallback: string) => String(value || fallback).trim().toLowerCase().replace(/\s+/g, '_');

export const toSlices = (rows: AnyRecord[], pick: (row: AnyRecord) => string, weigh: (row: AnyRecord) => number = () => 1, limit = 6): Slice[] => {
  const totals = new Map<string, number>();
  rows.forEach((row) => {
    const key = pick(row);
    totals.set(key, (totals.get(key) || 0) + weigh(row));
  });
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const head = sorted.slice(0, limit - 1);
  const rest = sorted.slice(limit - 1).reduce((sum, [, value]) => sum + value, 0);
  const slices = head.map(([key, value]) => ({ name: humanize(key), value, color: STATUS_COLORS[key] }));
  if (rest > 0) slices.push({ name: 'Other', value: rest, color: '#cbd5e1' });
  return slices.filter((slice) => slice.value > 0);
};

export const percentChange = (current: number, previous: number): number | null => {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
};

export const timeAgo = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs)) return 'Recently';
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days < 30 ? `${days}d ago` : new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const TrendBadge: React.FC<{ change: number | null }> = ({ change }) => {
  if (change === null) return <span className="adm-trend adm-trend--new">New</span>;
  const tone = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  return (
    <span className={`adm-trend adm-trend--${tone}`}>
      {change > 0 ? '▲' : change < 0 ? '▼' : '•'} {Math.abs(change)}%
    </span>
  );
};

export const DonutCard: React.FC<{ title: string; subtitle: string; data: Slice[]; centerLabel: string; formatter?: (value: number) => string }> = ({
  title,
  subtitle,
  data,
  centerLabel,
  formatter = formatNumber,
}) => {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <section className="adm-card">
      <header className="adm-card__header">
        <div>
          <h3 className="adm-card__title">{title}</h3>
          <p className="adm-card__subtitle">{subtitle}</p>
        </div>
      </header>
      {total === 0 ? (
        <div className="adm-empty">No data yet</div>
      ) : (
        <div className="adm-donut">
          <div className="adm-donut__chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="92%" paddingAngle={2} stroke="none" isAnimationActive>
                  {data.map((slice, index) => (
                    <Cell key={slice.name} fill={slice.color || PALETTE[index % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatter(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="adm-donut__center">
              <strong>{formatter(total)}</strong>
              <span>{centerLabel}</span>
            </div>
          </div>
          <ul className="adm-legend">
            {data.map((slice, index) => (
              <li key={slice.name}>
                <span className="adm-legend__dot" style={{ background: slice.color || PALETTE[index % PALETTE.length] }} />
                <span className="adm-legend__name">{slice.name}</span>
                <span className="adm-legend__value">{formatter(slice.value)}</span>
                <span className="adm-legend__pct">{Math.round((slice.value / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

const AdminDashboardHome: React.FC<AdminDashboardHomeProps> = ({
  adminName,
  stats,
  kpi,
  users,
  jobs,
  applications,
  payments,
  supportTickets,
  chartData,
  systemHealth,
  lastUpdated,
  onRefresh,
  onNavigate,
}) => {
  const trends = useMemo(() => {
    const half = Math.floor(chartData.length / 2);
    const sum = (rows: AnyRecord[], key: string) => rows.reduce((total, row) => total + Number(row[key] || 0), 0);
    const previous = chartData.slice(0, half);
    const current = chartData.slice(half);
    return {
      window: current.length,
      registrations: sum(current, 'registrations'),
      registrationsChange: percentChange(sum(current, 'registrations'), sum(previous, 'registrations')),
      revenue: sum(current, 'revenue'),
      revenueChange: percentChange(sum(current, 'revenue'), sum(previous, 'revenue')),
    };
  }, [chartData]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    applications.forEach((row) => {
      const key = normalizeKey(row.status, 'applied');
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [applications]);

  const totalApplications = Number(stats.totalApplications ?? applications.length);
  const sampledApplications = applications.length;
  const appliedCandidates = useMemo(() => new Set(applications.map((row) => row.user_id).filter(Boolean)).size, [applications]);

  const pipeline = [
    { key: 'jobs', label: 'Live jobs', value: kpi.openJobs, icon: <ToolOutlined />, tone: 'blue' },
    { key: 'applied', label: 'Applications', value: sampledApplications, icon: <FileSearchOutlined />, tone: 'indigo' },
    { key: 'review', label: 'Under review', value: statusCounts.under_review || 0, icon: <EyeOutlined />, tone: 'amber' },
    { key: 'shortlisted', label: 'Shortlisted', value: statusCounts.shortlisted || 0, icon: <StarOutlined />, tone: 'violet' },
    { key: 'hired', label: 'Hired', value: statusCounts.accepted || 0, icon: <TrophyOutlined />, tone: 'green' },
  ];
  const rejected = statusCounts.rejected || 0;
  const share = (value: number) => (sampledApplications > 0 ? Math.round((value / sampledApplications) * 100) : 0);

  const applicationSlices = useMemo(() => toSlices(applications, (row) => normalizeKey(row.status, 'applied')), [applications]);
  const workModeSlices = useMemo(() => toSlices(jobs, (row) => normalizeKey(row.work_mode, 'not_specified')), [jobs]);
  const jobStatusSlices = useMemo(() => toSlices(jobs, (row) => normalizeKey(row.status, 'draft')), [jobs]);
  const revenueSlices = useMemo(
    () => toSlices(payments, (row) => normalizeKey(row.plan || row.plan_name || row.status, 'other'), (row) => paiseToRupees(row.amount)),
    [payments],
  );
  const audienceSlices: Slice[] = [
    { name: 'Candidates', value: kpi.totalCandidates, color: '#2563eb' },
    { name: 'Recruiters', value: kpi.totalRecruiters, color: '#7c3aed' },
  ];

  const openTickets = supportTickets.filter((ticket) => normalizeKey(ticket.status, 'open') !== 'closed').length;
  const integrity = (systemHealth?.integrity || {}) as AnyRecord;
  const orphanJobs = Array.isArray(integrity.jobsWithoutRecruiters) ? integrity.jobsWithoutRecruiters.length : 0;
  const invalidApplications = Array.isArray(integrity.invalidApplications) ? integrity.invalidApplications.length : 0;
  const integrityIssues = orphanJobs + invalidApplications;

  const activity = useMemo(() => {
    const events: Array<{ id: string; at: string; title: string; detail: string; tone: string; icon: React.ReactNode }> = [];
    users.slice(0, 12).forEach((row) => row.created_at && events.push({
      id: `user-${row.id}`, at: row.created_at, title: `${row.name || row.email || 'New user'} joined`, detail: humanize(String(row.role || 'member')), tone: 'blue', icon: <UserAddOutlined />,
    }));
    jobs.slice(0, 12).forEach((row) => row.created_at && events.push({
      id: `job-${row.id}`, at: row.created_at, title: `New job · ${row.title || 'Untitled role'}`, detail: row.company_name || 'Company', tone: 'violet', icon: <ToolOutlined />,
    }));
    applications.slice(0, 12).forEach((row) => (row.applied_at || row.created_at) && events.push({
      id: `app-${row.id}`, at: row.applied_at || row.created_at, title: `Application · ${row.jobs?.title || 'a job'}`, detail: humanize(normalizeKey(row.status, 'applied')), tone: 'green', icon: <FileSearchOutlined />,
    }));
    payments.slice(0, 12).forEach((row) => row.created_at && events.push({
      id: `pay-${row.id}`, at: row.created_at, title: `Payment · ${formatMoney(paiseToRupees(row.amount))}`, detail: humanize(String(row.status || 'received')), tone: 'gold', icon: <DollarOutlined />,
    }));
    supportTickets.slice(0, 12).forEach((row) => row.created_at && events.push({
      id: `ticket-${row.id}`, at: row.created_at, title: `Ticket · ${row.subject || 'Support request'}`, detail: humanize(String(row.status || 'open')), tone: 'red', icon: <CustomerServiceOutlined />,
    }));
    return events.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 8);
  }, [applications, jobs, payments, supportTickets, users]);

  const kpis = [
    { label: 'Total users', value: formatNumber(stats.totalUsers ?? users.length), meta: `${formatNumber(trends.registrations)} joined in ${trends.window}d`, change: trends.registrationsChange, icon: <UserOutlined />, tone: 'blue', to: ROUTES.ADMIN_CANDIDATES },
    { label: 'Candidates', value: formatNumber(kpi.totalCandidates), meta: 'Job seekers', icon: <TeamOutlined />, tone: 'indigo', to: ROUTES.ADMIN_CANDIDATES },
    { label: 'Recruiters', value: formatNumber(kpi.totalRecruiters), meta: 'Hiring partners', icon: <BankOutlined />, tone: 'violet', to: ROUTES.ADMIN_RECRUITERS },
    { label: 'Organizations', value: formatNumber(kpi.totalOrganizations), meta: `${formatNumber(kpi.activeOrganizations)} active`, icon: <BankOutlined />, tone: 'cyan', to: ROUTES.ADMIN_USERS },
    { label: 'Live jobs', value: formatNumber(kpi.openJobs), meta: 'Published listings', icon: <ToolOutlined />, tone: 'green', to: ROUTES.ADMIN_JOBS },
    { label: 'Applications', value: formatNumber(totalApplications), meta: `${formatNumber(kpi.applicationsToday)} today`, icon: <FileSearchOutlined />, tone: 'amber', to: ROUTES.ADMIN_APPLICATIONS },
    { label: 'Revenue this month', value: formatMoney(kpi.revenueMonth), meta: `${formatMoney(trends.revenue)} in ${trends.window}d`, change: trends.revenueChange, icon: <DollarOutlined />, tone: 'gold', to: ROUTES.ADMIN_PAYMENTS },
    { label: 'Open tickets', value: formatNumber(openTickets), meta: `${formatNumber(supportTickets.length)} total`, icon: <CustomerServiceOutlined />, tone: openTickets > 0 ? 'red' : 'green', to: ROUTES.ADMIN_CUSTOMER_CARE },
  ];

  const quickActions = [
    { label: 'Moderate jobs', icon: <ToolOutlined />, to: ROUTES.ADMIN_JOBS },
    { label: 'Bulk import jobs', icon: <UploadOutlined />, to: ROUTES.ADMIN_BULK_IMPORT },
    { label: 'Review applications', icon: <FileSearchOutlined />, to: ROUTES.ADMIN_APPLICATIONS },
    { label: 'Organizations', icon: <BankOutlined />, to: ROUTES.ADMIN_USERS },
    { label: 'Send announcement', icon: <NotificationOutlined />, to: `${ROUTES.ADMIN_DASHBOARD}?view=announcements` },
    { label: 'Support desk', icon: <CustomerServiceOutlined />, to: ROUTES.ADMIN_CUSTOMER_CARE },
    { label: 'Billing', icon: <DollarOutlined />, to: ROUTES.ADMIN_BILLING_MANAGEMENT },
    { label: 'Analytics', icon: <BarChartOutlined />, to: ROUTES.ADMIN_ANALYTICS },
  ];

  const recentUsers = users.slice(0, 6);
  const recentJobs = jobs.slice(0, 6);
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const jobSampleNote = kpi.openJobs > jobs.length ? ` · latest ${formatNumber(jobs.length)} jobs` : '';
  const applicationSampleNote = totalApplications > sampledApplications ? ` · latest ${formatNumber(sampledApplications)}` : '';

  return (
    <div className="adm">
      <section className="adm-hero">
        <div className="adm-hero__copy">
          <span className="adm-hero__badge">Super Admin · {today}</span>
          <h1>Welcome back, {adminName}</h1>
          <p>Everything happening across JobPoyt — people, jobs, hiring and revenue — in one view.</p>
          <div className="adm-hero__actions">
            <button type="button" className="adm-btn adm-btn--light" onClick={onRefresh}>
              <ReloadOutlined /> Refresh data
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => onNavigate(ROUTES.ADMIN_ANALYTICS)}>
              <BarChartOutlined /> Full analytics
            </button>
          </div>
          {lastUpdated && <span className="adm-hero__updated">Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
        <div className="adm-hero__stats">
          <div>
            <span>Applications today</span>
            <strong>{formatNumber(kpi.applicationsToday)}</strong>
          </div>
          <div>
            <span>Revenue today</span>
            <strong>{formatMoney(kpi.revenueToday)}</strong>
          </div>
          <div>
            <span>Data checks</span>
            <strong className={integrityIssues > 0 ? 'is-warn' : 'is-ok'}>
              {systemHealth ? (integrityIssues > 0 ? `${integrityIssues} issues` : 'All clear') : 'Pending'}
            </strong>
          </div>
        </div>
      </section>

      <section className="adm-kpis">
        {kpis.map((item) => (
          <button key={item.label} type="button" className={`adm-kpi adm-kpi--${item.tone}`} onClick={() => onNavigate(item.to)}>
            <span className="adm-kpi__icon">{item.icon}</span>
            <span className="adm-kpi__body">
              <span className="adm-kpi__label">{item.label}</span>
              <span className="adm-kpi__value">{item.value}</span>
              <span className="adm-kpi__meta">
                {'change' in item && <TrendBadge change={item.change ?? null} />}
                {item.meta}
              </span>
            </span>
          </button>
        ))}
      </section>

      <div className="adm-grid adm-grid--wide">
        <section className="adm-card">
          <header className="adm-card__header">
            <div>
              <h3 className="adm-card__title">Growth & revenue</h3>
              <p className="adm-card__subtitle">Daily sign-ups and payments, last {chartData.length} days</p>
            </div>
          </header>
          {chartData.length === 0 ? (
            <div className="adm-empty">No activity recorded yet</div>
          ) : (
            <div className="adm-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="admRegistrations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="admRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 6" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis yAxisId="left" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" hide />
                  <Tooltip
                    formatter={(value, name) => (name === 'Revenue' ? formatMoney(value) : formatNumber(value))}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 12px 30px rgba(15,23,42,0.12)' }}
                  />
                  <Area yAxisId="left" type="monotone" dataKey="registrations" name="Sign-ups" stroke="#2563eb" strokeWidth={2.5} fill="url(#admRegistrations)" />
                  <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="#16a34a" strokeWidth={2.5} fill="url(#admRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="adm-chart__legend">
            <span><i style={{ background: '#2563eb' }} /> Sign-ups</span>
            <span><i style={{ background: '#16a34a' }} /> Revenue</span>
          </div>
        </section>

        <DonutCard title="Audience mix" subtitle="Talent vs hiring partners" data={audienceSlices} centerLabel="people" />
      </div>

      <section className="adm-card adm-flow-card">
        <header className="adm-card__header">
          <div>
            <h3 className="adm-card__title">Hiring pipeline flow</h3>
            <p className="adm-card__subtitle">
              How applications move from a live job to a hire
              {totalApplications > sampledApplications ? ` · latest ${formatNumber(sampledApplications)} of ${formatNumber(totalApplications)} applications` : ''}
              {appliedCandidates > 0 ? ` · ${formatNumber(appliedCandidates)} unique candidates` : ''}
            </p>
          </div>
          <button type="button" className="adm-link" onClick={() => onNavigate(ROUTES.ADMIN_APPLICATIONS)}>
            Open applications <ArrowRightOutlined />
          </button>
        </header>

        <div className="adm-flow">
          {pipeline.map((stage, index) => (
            <React.Fragment key={stage.key}>
              {index > 0 && (
                <div className="adm-flow__arrow" aria-hidden="true">
                  <span className="adm-flow__line" />
                  {index > 1 && <span className="adm-flow__pct">{share(stage.value)}%</span>}
                </div>
              )}
              <div className={`adm-flow__node adm-flow__node--${stage.tone}`}>
                <span className="adm-flow__icon">{stage.icon}</span>
                <span className="adm-flow__value">{formatNumber(stage.value)}</span>
                <span className="adm-flow__label">{stage.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        <div className="adm-flow__branch">
          <span className="adm-flow__branch-line" aria-hidden="true" />
          <div className="adm-flow__node adm-flow__node--red adm-flow__node--small">
            <span className="adm-flow__icon"><CloseCircleOutlined /></span>
            <span className="adm-flow__value">{formatNumber(rejected)}</span>
            <span className="adm-flow__label">Rejected · {share(rejected)}%</span>
          </div>
          <div className="adm-flow__node adm-flow__node--slate adm-flow__node--small">
            <span className="adm-flow__icon"><FileSearchOutlined /></span>
            <span className="adm-flow__value">{formatNumber(statusCounts.applied || 0)}</span>
            <span className="adm-flow__label">Awaiting review · {share(statusCounts.applied || 0)}%</span>
          </div>
        </div>
      </section>

      <div className="adm-grid adm-grid--three">
        <DonutCard title="Application status" subtitle={`Where every application stands${applicationSampleNote}`} data={applicationSlices} centerLabel="applications" />
        <DonutCard title="Jobs by work mode" subtitle={`Remote, hybrid and onsite split${jobSampleNote}`} data={workModeSlices} centerLabel="jobs" />
        <DonutCard title="Job status" subtitle={`Published, draft and closed${jobSampleNote}`} data={jobStatusSlices} centerLabel="jobs" />
      </div>

      <div className="adm-grid adm-grid--split">
        <DonutCard title="Revenue by plan" subtitle="Payment amounts grouped by plan" data={revenueSlices} centerLabel="collected" formatter={formatMoney} />

        <section className="adm-card">
          <header className="adm-card__header">
            <div>
              <h3 className="adm-card__title">Platform health</h3>
              <p className="adm-card__subtitle">Live data consistency checks</p>
            </div>
            <button type="button" className="adm-link" onClick={() => onNavigate(ROUTES.ADMIN_SYSTEM_HEALTH)}>
              System monitor <ArrowRightOutlined />
            </button>
          </header>
          <ul className="adm-health">
            <li className={orphanJobs > 0 ? 'is-warn' : 'is-ok'}>
              {orphanJobs > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
              <div>
                <strong>Jobs linked to recruiters</strong>
                <span>{orphanJobs > 0 ? `${orphanJobs} jobs without a recruiter record` : 'Every job has a recruiter'}</span>
              </div>
            </li>
            <li className={invalidApplications > 0 ? 'is-warn' : 'is-ok'}>
              {invalidApplications > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
              <div>
                <strong>Applications linked to profiles</strong>
                <span>{invalidApplications > 0 ? `${invalidApplications} applications reference missing users` : 'All applications are valid'}</span>
              </div>
            </li>
            <li className={openTickets > 0 ? 'is-warn' : 'is-ok'}>
              {openTickets > 0 ? <CustomerServiceOutlined /> : <CheckCircleOutlined />}
              <div>
                <strong>Support queue</strong>
                <span>{openTickets > 0 ? `${openTickets} tickets waiting for a reply` : 'No open tickets'}</span>
              </div>
            </li>
            <li className="is-info">
              <SafetyOutlined />
              <div>
                <strong>Moderation</strong>
                <span>Review flagged jobs and data issues</span>
              </div>
              <button type="button" className="adm-link" onClick={() => onNavigate(ROUTES.ADMIN_DATA_INTEGRITY)}>Open</button>
            </li>
          </ul>
        </section>
      </div>

      <div className="adm-grid adm-grid--split">
        <section className="adm-card">
          <header className="adm-card__header">
            <div>
              <h3 className="adm-card__title">Recent sign-ups</h3>
              <p className="adm-card__subtitle">Newest accounts on the platform</p>
            </div>
            <button type="button" className="adm-link" onClick={() => onNavigate(ROUTES.ADMIN_CANDIDATES)}>
              View all <ArrowRightOutlined />
            </button>
          </header>
          {recentUsers.length === 0 ? <div className="adm-empty">No users yet</div> : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead><tr><th>Name</th><th>Role</th><th>Joined</th></tr></thead>
                <tbody>
                  {recentUsers.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="adm-person">
                          <span className="adm-person__avatar">{String(row.name || row.email || 'U').charAt(0).toUpperCase()}</span>
                          <span className="adm-person__copy">
                            <strong>{row.name || 'Unnamed user'}</strong>
                            <span>{row.email || '—'}</span>
                          </span>
                        </span>
                      </td>
                      <td><span className={`adm-pill adm-pill--${normalizeKey(row.role, 'member')}`}>{humanize(String(row.role || 'member'))}</span></td>
                      <td>{row.created_at ? timeAgo(row.created_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="adm-card">
          <header className="adm-card__header">
            <div>
              <h3 className="adm-card__title">Live activity</h3>
              <p className="adm-card__subtitle">Latest events across the platform</p>
            </div>
          </header>
          {activity.length === 0 ? <div className="adm-empty">No recent activity</div> : (
            <ol className="adm-timeline">
              {activity.map((event) => (
                <li key={event.id} className={`adm-timeline__item adm-timeline__item--${event.tone}`}>
                  <span className="adm-timeline__icon">{event.icon}</span>
                  <div className="adm-timeline__copy">
                    <strong>{event.title}</strong>
                    <span>{event.detail}</span>
                  </div>
                  <time>{timeAgo(event.at)}</time>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="adm-grid adm-grid--split">
        <section className="adm-card">
          <header className="adm-card__header">
            <div>
              <h3 className="adm-card__title">Recent job postings</h3>
              <p className="adm-card__subtitle">Latest listings and their status</p>
            </div>
            <button type="button" className="adm-link" onClick={() => onNavigate(ROUTES.ADMIN_JOBS)}>
              Manage jobs <ArrowRightOutlined />
            </button>
          </header>
          {recentJobs.length === 0 ? <div className="adm-empty">No jobs yet</div> : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead><tr><th>Job</th><th>Status</th><th>Posted</th></tr></thead>
                <tbody>
                  {recentJobs.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="adm-person__copy">
                          <strong>{row.title || 'Untitled role'}</strong>
                          <span>{[row.company_name, row.location].filter(Boolean).join(' · ') || '—'}</span>
                        </span>
                      </td>
                      <td><span className={`adm-pill adm-pill--${normalizeKey(row.status, 'draft')}`}>{humanize(normalizeKey(row.status, 'draft'))}</span></td>
                      <td>{row.created_at ? timeAgo(row.created_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="adm-card">
          <header className="adm-card__header">
            <div>
              <h3 className="adm-card__title">Quick actions</h3>
              <p className="adm-card__subtitle">Jump straight to common tasks</p>
            </div>
          </header>
          <div className="adm-actions">
            {quickActions.map((action) => (
              <button key={action.label} type="button" className="adm-action" onClick={() => onNavigate(action.to)}>
                <span className="adm-action__icon">{action.icon}</span>
                <span>{action.label}</span>
                <ArrowRightOutlined className="adm-action__arrow" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboardHome;
