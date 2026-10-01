import React, { useMemo } from 'react';
import {
  ArrowRightOutlined,
  CloseCircleOutlined,
  CrownOutlined,
  EyeOutlined,
  FileSearchOutlined,
  StarOutlined,
  ToolOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { DonutCard, formatNumber, normalizeKey, toSlices } from '../../admin/components/AdminDashboardHome';
import '../../admin/components/adminDashboard.css';
import type { Job } from '../../types';
import type { RecruiterDashboardStats } from './RecruiterDashboardHome';

export const jobField = (job: Job, ...keys: string[]) => {
  const record = job as unknown as Record<string, unknown>;
  for (const key of keys) {
    if (record[key]) return String(record[key]);
  }
  return '';
};

type PipelineFlowCardProps = {
  stats: RecruiterDashboardStats;
  onNavigate: (tab: string) => void;
  actionLabel?: string;
  actionTab?: string;
};

export const PipelineFlowCard: React.FC<PipelineFlowCardProps> = ({ stats, onNavigate, actionLabel = 'Open ATS', actionTab = 'ats-pipeline' }) => {
  const total = stats.total_applicants;
  const share = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);
  const awaiting = stats.applied || 0;

  const pipeline = [
    { key: 'jobs', label: 'Live jobs', value: stats.active_jobs, icon: <ToolOutlined />, tone: 'blue', tab: 'jobs' },
    { key: 'applied', label: 'Applications', value: total, icon: <FileSearchOutlined />, tone: 'indigo', tab: 'applicants' },
    { key: 'review', label: 'Under review', value: stats.under_review || 0, icon: <EyeOutlined />, tone: 'amber', tab: 'applicants' },
    { key: 'shortlisted', label: 'Shortlisted', value: stats.shortlisted, icon: <StarOutlined />, tone: 'violet', tab: 'ats-pipeline' },
    { key: 'hired', label: 'Hired', value: stats.accepted || 0, icon: <TrophyOutlined />, tone: 'green', tab: 'ats-pipeline' },
  ];

  return (
    <section className="adm-card adm-flow-card">
      <header className="adm-card__header">
        <div>
          <h3 className="adm-card__title">Hiring pipeline flow</h3>
          <p className="adm-card__subtitle">How your candidates move from application to hire</p>
        </div>
        <button type="button" className="adm-link" onClick={() => onNavigate(actionTab)}>
          {actionLabel} <ArrowRightOutlined />
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
            <button type="button" className={`adm-flow__node adm-flow__node--${stage.tone} adm-flow__node--clickable`} onClick={() => onNavigate(stage.tab)}>
              <span className="adm-flow__icon">{stage.icon}</span>
              <span className="adm-flow__value">{formatNumber(stage.value)}</span>
              <span className="adm-flow__label">{stage.label}</span>
            </button>
          </React.Fragment>
        ))}
      </div>

      <div className="adm-flow__branch">
        <span className="adm-flow__branch-line" aria-hidden="true" />
        <div className="adm-flow__node adm-flow__node--red adm-flow__node--small">
          <span className="adm-flow__icon"><CloseCircleOutlined /></span>
          <span className="adm-flow__value">{formatNumber(stats.rejected)}</span>
          <span className="adm-flow__label">Rejected · {share(stats.rejected)}%</span>
        </div>
        <div className="adm-flow__node adm-flow__node--slate adm-flow__node--small">
          <span className="adm-flow__icon"><FileSearchOutlined /></span>
          <span className="adm-flow__value">{formatNumber(awaiting)}</span>
          <span className="adm-flow__label">Awaiting review · {share(awaiting)}%</span>
        </div>
        <div className="adm-flow__node adm-flow__node--amber adm-flow__node--small">
          <span className="adm-flow__icon"><CrownOutlined /></span>
          <span className="adm-flow__value">{formatNumber(stats.priority_applicants)}</span>
          <span className="adm-flow__label">Priority · {share(stats.priority_applicants)}%</span>
        </div>
      </div>
    </section>
  );
};

export const ApplicationStatusDonut: React.FC<{ stats: RecruiterDashboardStats }> = ({ stats }) => {
  const data = [
    { name: 'Applied', value: stats.applied || 0, color: '#2563eb' },
    { name: 'Under Review', value: stats.under_review || 0, color: '#f59e0b' },
    { name: 'Shortlisted', value: stats.shortlisted, color: '#7c3aed' },
    { name: 'Hired', value: stats.accepted || 0, color: '#16a34a' },
    { name: 'Rejected', value: stats.rejected, color: '#ef4444' },
  ].filter((slice) => slice.value > 0);
  return <DonutCard title="Application status" subtitle="Where every applicant stands" data={data} centerLabel="applicants" />;
};

export const ApplicantsByJobDonut: React.FC<{ stats: RecruiterDashboardStats; jobs: Job[] }> = ({ stats, jobs }) => {
  const byJob = stats.applications_by_job || {};
  const data = useMemo(
    () => toSlices(jobs.filter((job) => byJob[job.id]), (job) => jobField(job as Job, 'title') || 'Untitled role', (job) => byJob[(job as Job).id] || 0),
    [byJob, jobs],
  );
  return <DonutCard title="Applicants by job" subtitle="Which roles attract the most candidates" data={data} centerLabel="applicants" />;
};

export const JobStatusDonut: React.FC<{ jobs: Job[] }> = ({ jobs }) => {
  const data = useMemo(() => toSlices(jobs, (job) => normalizeKey((job as Job).status, 'draft')), [jobs]);
  return <DonutCard title="Jobs by status" subtitle="Published, draft and closed" data={data} centerLabel="jobs" />;
};

export const WorkModeDonut: React.FC<{ jobs: Job[] }> = ({ jobs }) => {
  const data = useMemo(() => toSlices(jobs, (job) => normalizeKey(jobField(job as Job, 'work_mode', 'workMode'), 'not_specified')), [jobs]);
  return <DonutCard title="Jobs by work mode" subtitle="Remote, hybrid and onsite split" data={data} centerLabel="jobs" />;
};
