import React from 'react';
import '../../admin/components/adminDashboard.css';

export type RecruiterHeroStat = { label: string; value: React.ReactNode; tone?: 'ok' | 'warn' };

type RecruiterPageHeroProps = {
  eyebrow: string;
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  stats?: RecruiterHeroStat[];
};

export const RecruiterPageHero: React.FC<RecruiterPageHeroProps> = ({ eyebrow, title, description, icon, actions, stats }) => (
  <section className="adm-hero adm-hero--page">
    <div className="adm-hero__copy">
      <span className="adm-hero__badge">
        {icon && <span className="adm-hero__badge-icon">{icon}</span>}
        {eyebrow}
      </span>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {actions && <div className="adm-hero__actions adm-hero__actions--mui">{actions}</div>}
    </div>
    {stats && stats.length > 0 && (
      <div className="adm-hero__stats">
        {stats.map((stat) => (
          <div key={stat.label}>
            <span>{stat.label}</span>
            <strong className={stat.tone === 'warn' ? 'is-warn' : stat.tone === 'ok' ? 'is-ok' : undefined}>{stat.value}</strong>
          </div>
        ))}
      </div>
    )}
  </section>
);

export default RecruiterPageHero;
