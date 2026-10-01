import React, { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  ArrowRightOutlined,
  BarChartOutlined,
  CalendarOutlined,
  CloseCircleOutlined,
  CrownOutlined,
  FileSearchOutlined,
  MessageOutlined,
  PartitionOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  StarOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import {
  TrendBadge,
  formatNumber,
  humanize,
  normalizeKey,
  percentChange,
  timeAgo,
} from '../../admin/components/AdminDashboardHome';
import '../../admin/components/adminDashboard.css';
import type { Job } from '../../types';
import { ApplicantsByJobDonut, ApplicationStatusDonut, JobStatusDonut, PipelineFlowCard, WorkModeDonut, jobField } from './RecruiterInsights';
import {
  CANDIDATE_UNLOCK_CREDIT_COST,
  FREE_RECRUITER_CREDITS,
  JOB_POST_CREDIT_COST,
  type RecruiterCreditStatus,
} from '../../services/recruiterCredits';

export type RecruiterDashboardStats = {
  active_jobs: number;
  total_jobs: number;
  total_applicants: number;
  applied?: number;
  under_review?: number;
  shortlisted: number;
  accepted?: number;
  rejected: number;
  priority_applicants: number;
  applications_by_day?: Array<{ day: string; applications: number }>;
  applications_by_job?: Record<string, number>;
};

type RecruiterDashboardHomeProps = {
  displayName: string;
  companyName?: string;
  stats: RecruiterDashboardStats;
  jobs: Job[];
  unreadMessages: number;
  unreadNotifications: number;
  credits: number;
  planName: string;
  creditStatus: RecruiterCreditStatus | null;
  canPostJob: boolean;
  onNavigate: (tab: string) => void;
  onPostJob: () => void;
  onOpenSubscription: () => void;
  onRefresh: () => void;
};

const RecruiterDashboardHome: React.FC<RecruiterDashboardHomeProps> = ({
  displayName,
  companyName,
  stats,
  jobs,
  unreadMessages,
  unreadNotifications,
  credits,
  planName,
  creditStatus,
  canPostJob,
  onNavigate,
  onPostJob,
  onOpenSubscription,
  onRefresh,
}) => {
  const trend = stats.applications_by_day || [];
  const byJob = stats.applications_by_job || {};
  const total = stats.total_applicants;
  const accepted = stats.accepted || 0;

  const trendSummary = useMemo(() => {
    const half = Math.floor(trend.length / 2);
    const sum = (rows: typeof trend) => rows.reduce((acc, row) => acc + row.applications, 0);
    const current = sum(trend.slice(half));
    return { current, window: trend.length - half, change: percentChange(current, sum(trend.slice(0, half))) };
  }, [trend]);

  const share = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

  const recentJobs = useMemo(
    () => [...jobs]
      .sort((a, b) => jobField(b, 'created_at', 'createdAt').localeCompare(jobField(a, 'created_at', 'createdAt')))
      .slice(0, 6),
    [jobs],
  );

  const kpis = [
    { label: 'Active jobs', value: formatNumber(stats.active_jobs), meta: `${formatNumber(stats.total_jobs)} total posted`, icon: <ThunderboltOutlined />, tone: 'blue', tab: 'jobs' },
    { label: 'Applicants', value: formatNumber(total), meta: `${formatNumber(trendSummary.current)} in ${trendSummary.window}d`, change: trendSummary.change, icon: <TeamOutlined />, tone: 'indigo', tab: 'applicants' },
    { label: 'Shortlisted', value: formatNumber(stats.shortlisted), meta: `${share(stats.shortlisted)}% of applicants`, icon: <StarOutlined />, tone: 'violet', tab: 'ats-pipeline' },
    { label: 'Hired', value: formatNumber(accepted), meta: `${share(accepted)}% hire rate`, icon: <TrophyOutlined />, tone: 'green', tab: 'ats-pipeline' },
    { label: 'Priority candidates', value: formatNumber(stats.priority_applicants), meta: 'Fast-track applicants', icon: <CrownOutlined />, tone: 'gold', tab: 'applicants' },
    { label: 'Rejected', value: formatNumber(stats.rejected), meta: `${share(stats.rejected)}% of applicants`, icon: <CloseCircleOutlined />, tone: 'red', tab: 'applicants' },
    { label: 'Unread messages', value: formatNumber(unreadMessages), meta: 'Candidate conversations', icon: <MessageOutlined />, tone: 'cyan', tab: 'messages' },
    { label: 'Credits', value: credits < 0 ? 'Unlimited' : formatNumber(credits), meta: `${planName} plan`, icon: <WalletOutlined />, tone: credits === 0 ? 'red' : 'amber', tab: 'billing-subscription' },
  ];

  const quickActions = [
    { label: canPostJob ? 'Post a job' : 'Post a job (no credits)', icon: <PlusOutlined />, onClick: onPostJob, disabled: !canPostJob },
    { label: 'ATS pipeline', icon: <PartitionOutlined />, onClick: () => onNavigate('ats-pipeline') },
    { label: 'Review applicants', icon: <FileSearchOutlined />, onClick: () => onNavigate('applicants') },
    { label: 'Find candidates', icon: <SearchOutlined />, onClick: () => onNavigate('find-candidates') },
    { label: 'Interviews', icon: <CalendarOutlined />, onClick: () => onNavigate('interview-management') },
    { label: 'Talent pool', icon: <TeamOutlined />, onClick: () => onNavigate('talent-pool') },
    { label: 'Analytics', icon: <BarChartOutlined />, onClick: () => onNavigate('analytics') },
    { label: 'My subscription', icon: <CrownOutlined />, onClick: onOpenSubscription },
  ];

  const freeCreditsUsed = Math.min(FREE_RECRUITER_CREDITS, creditStatus?.usedCredits ?? 0);
  const freeCreditsPercent = Math.round((freeCreditsUsed / FREE_RECRUITER_CREDITS) * 100);

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="adm">
      <section className="adm-hero">
        <div className="adm-hero__copy">
          <span className="adm-hero__badge">{companyName ? `${companyName} · ` : ''}{today}</span>
          <h1>Welcome back, {displayName}</h1>
          <p>Your hiring at a glance — jobs, applicants and pipeline progress in one place.</p>
          <div className="adm-hero__actions">
            <button type="button" className="adm-btn adm-btn--light" onClick={onPostJob} disabled={!canPostJob} title={canPostJob ? undefined : `Posting a job needs ${JOB_POST_CREDIT_COST} credits`}>
              <PlusOutlined /> {canPostJob ? 'Post a job' : 'No credits to post'}
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => onNavigate('ats-pipeline')}>
              <PartitionOutlined /> ATS pipeline
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={onRefresh}>
              <ReloadOutlined /> Refresh
            </button>
          </div>
        </div>
        <div className="adm-hero__stats">
          <div>
            <span>New applicants ({trendSummary.window}d)</span>
            <strong>{formatNumber(trendSummary.current)}</strong>
          </div>
          <div>
            <span>Notifications</span>
            <strong className={unreadNotifications > 0 ? 'is-warn' : 'is-ok'}>{unreadNotifications > 0 ? `${formatNumber(unreadNotifications)} unread` : 'All caught up'}</strong>
          </div>
          <div>
            <span>Plan</span>
            <strong>{planName}</strong>
          </div>
        </div>
      </section>

      <section className="adm-kpis">
        {kpis.map((item) => (
          <button key={item.label} type="button" className={`adm-kpi adm-kpi--${item.tone}`} onClick={() => onNavigate(item.tab)}>
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
              <h3 className="adm-card__title">Applications trend</h3>
              <p className="adm-card__subtitle">New applications across your jobs, last {trend.length} days</p>
            </div>
            <button type="button" className="adm-link" onClick={() => onNavigate('analytics')}>
              Analytics <ArrowRightOutlined />
            </button>
          </header>
          {trend.every((row) => row.applications === 0) ? (
            <div className="adm-empty">No applications in the last {trend.length || 14} days</div>
          ) : (
            <div className="adm-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="recApplications" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 6" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 12px 30px rgba(15,23,42,0.12)' }} />
                  <Area type="monotone" dataKey="applications" name="Applications" stroke="#7c3aed" strokeWidth={2.5} fill="url(#recApplications)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <ApplicantsByJobDonut stats={stats} jobs={jobs} />
      </div>

      <PipelineFlowCard stats={stats} onNavigate={onNavigate} />

      <div className="adm-grid adm-grid--three">
        <ApplicationStatusDonut stats={stats} />
        <JobStatusDonut jobs={jobs} />
        <WorkModeDonut jobs={jobs} />
      </div>

      <div className="adm-grid adm-grid--split">
        <section className="adm-card">
          <header className="adm-card__header">
            <div>
              <h3 className="adm-card__title">Your job postings</h3>
              <p className="adm-card__subtitle">Latest roles and applicant volume</p>
            </div>
            <button type="button" className="adm-link" onClick={() => onNavigate('jobs')}>
              Manage jobs <ArrowRightOutlined />
            </button>
          </header>
          {recentJobs.length === 0 ? (
            <div className="adm-empty">
              <button type="button" className="adm-link" onClick={onPostJob} disabled={!canPostJob}><PlusOutlined /> Post your first job</button>
            </div>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead><tr><th>Job</th><th>Applicants</th><th>Status</th><th>Posted</th></tr></thead>
                <tbody>
                  {recentJobs.map((job) => {
                    const status = normalizeKey(job.status, 'draft');
                    const posted = jobField(job, 'created_at', 'createdAt');
                    return (
                      <tr key={job.id}>
                        <td>
                          <span className="adm-person__copy">
                            <strong>{job.title || 'Untitled role'}</strong>
                            <span>{[jobField(job, 'location'), jobField(job, 'work_mode', 'workMode')].filter(Boolean).join(' · ') || '—'}</span>
                          </span>
                        </td>
                        <td><strong>{formatNumber(byJob[job.id] || 0)}</strong></td>
                        <td><span className={`adm-pill adm-pill--${status}`}>{humanize(status)}</span></td>
                        <td>{posted ? timeAgo(posted) : '—'}</td>
                      </tr>
                    );
                  })}
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
              <button key={action.label} type="button" className="adm-action" onClick={action.onClick} disabled={'disabled' in action && action.disabled}>
                <span className="adm-action__icon">{action.icon}</span>
                <span>{action.label}</span>
                <ArrowRightOutlined className="adm-action__arrow" />
              </button>
            ))}
          </div>
        </section>
      </div>

      {creditStatus?.planState === 'free' && (
        <section className="adm-card">
          <header className="adm-card__header">
            <div>
              <h3 className="adm-card__title">Free credits</h3>
              <p className="adm-card__subtitle">
                Job post = {JOB_POST_CREDIT_COST} credits · Candidate unlock = {CANDIDATE_UNLOCK_CREDIT_COST} credit (repeat views are free)
              </p>
            </div>
            <button type="button" className="adm-link" onClick={onOpenSubscription}>
              Go unlimited <ArrowRightOutlined />
            </button>
          </header>
          <div className="adm-usage">
            <div className="adm-usage__item">
              <div className="adm-usage__row">
                <strong>{formatNumber(creditStatus.availableCredits)} credits left</strong>
                <span>{formatNumber(freeCreditsUsed)} / {FREE_RECRUITER_CREDITS} used</span>
              </div>
              <div className="adm-usage__bar"><span style={{ width: `${freeCreditsPercent}%`, background: freeCreditsPercent >= 100 ? '#dc2626' : '#2563eb' }} /></div>
            </div>
            <div className="adm-usage__item">
              <div className="adm-usage__row">
                <strong>What you can still do</strong>
                <span>
                  {Math.floor(creditStatus.availableCredits / JOB_POST_CREDIT_COST)} job posts or {formatNumber(creditStatus.availableCredits)} unlocks
                </span>
              </div>
              <div className="adm-usage__bar"><span style={{ width: `${100 - freeCreditsPercent}%`, background: '#16a34a' }} /></div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default RecruiterDashboardHome;
