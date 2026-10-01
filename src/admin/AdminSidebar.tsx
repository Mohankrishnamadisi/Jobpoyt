import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AppstoreOutlined,
  AuditOutlined,
  BankOutlined,
  BarChartOutlined,
  BellOutlined,
  CloseOutlined,
  CodeOutlined,
  CreditCardOutlined,
  CrownOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  DollarOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
  FileSearchOutlined,
  FlagOutlined,
  GlobalOutlined,
  LockOutlined,
  MailOutlined,
  NotificationOutlined,
  ReadOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SafetyOutlined,
  SettingOutlined,
  TeamOutlined,
  ToolOutlined,
  TranslationOutlined,
  UploadOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { ROUTES } from '../constants';
import { useAuthStore } from '@store/index';

type SidebarItem = { label: string; to: string; view?: string; icon: React.ComponentType<{ className?: string }> };

const sidebarGroups: Array<{ title: string; items: SidebarItem[] }> = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', to: ROUTES.ADMIN_DASHBOARD, icon: AppstoreOutlined }],
  },
  {
    title: 'People',
    items: [
      { label: 'Organizations', to: ROUTES.ADMIN_DASHBOARD, view: 'organizations', icon: BankOutlined },
      { label: 'Recruiters', to: ROUTES.ADMIN_RECRUITERS, icon: TeamOutlined },
      { label: 'Candidates', to: ROUTES.ADMIN_CANDIDATES, icon: UserOutlined },
    ],
  },
  {
    title: 'Job Market',
    items: [
      { label: 'Jobs', to: ROUTES.ADMIN_JOBS, icon: ToolOutlined },
      { label: 'Applications', to: ROUTES.ADMIN_APPLICATIONS, icon: FileSearchOutlined },
      { label: 'Bulk Import', to: ROUTES.ADMIN_BULK_IMPORT, icon: UploadOutlined },
      { label: 'Assessment Library', to: ROUTES.ADMIN_ASSESSMENT_LIBRARY, icon: ReadOutlined },
    ],
  },
  {
    title: 'Revenue',
    items: [
      { label: 'Subscriptions', to: ROUTES.ADMIN_SUBSCRIPTIONS, icon: CrownOutlined },
      { label: 'Credits', to: ROUTES.ADMIN_SUBSCRIPTIONS, view: 'credits', icon: WalletOutlined },
      { label: 'Payments', to: ROUTES.ADMIN_PAYMENTS, icon: DollarOutlined },
      { label: 'Billing Management', to: ROUTES.ADMIN_BILLING_MANAGEMENT, icon: CreditCardOutlined },
    ],
  },
  {
    title: 'Engagement',
    items: [
      { label: 'Communities', to: ROUTES.ADMIN_COMMUNITIES, icon: GlobalOutlined },
      { label: 'Announcements', to: ROUTES.ADMIN_DASHBOARD, view: 'announcements', icon: NotificationOutlined },
      { label: 'Notifications', to: ROUTES.ADMIN_DASHBOARD, view: 'notifications', icon: BellOutlined },
      { label: 'Email Center', to: ROUTES.ADMIN_DASHBOARD, view: 'emails', icon: MailOutlined },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Support Desk', to: ROUTES.ADMIN_CUSTOMER_CARE, icon: CustomerServiceOutlined },
      { label: 'Moderation', to: ROUTES.ADMIN_DATA_INTEGRITY, icon: SafetyOutlined },
      { label: 'Analytics', to: ROUTES.ADMIN_ANALYTICS, icon: BarChartOutlined },
      { label: 'AI Monitoring', to: ROUTES.ADMIN_ANALYTICS, view: 'ai-monitoring', icon: RobotOutlined },
      { label: 'System Monitoring', to: ROUTES.ADMIN_SYSTEM_HEALTH, icon: DashboardOutlined },
      { label: 'Audit Logs', to: ROUTES.ADMIN_DASHBOARD, view: 'audit-logs', icon: AuditOutlined },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { label: 'Platform Settings', to: ROUTES.ADMIN_SETTINGS, icon: SettingOutlined },
      { label: 'Feature Flags', to: ROUTES.ADMIN_SETTINGS, view: 'feature-flags', icon: FlagOutlined },
      { label: 'Roles & Permissions', to: ROUTES.ADMIN_SETTINGS, view: 'permissions', icon: LockOutlined },
      { label: 'Developer Tools', to: ROUTES.ADMIN_SYSTEM_HEALTH, view: 'developer-tools', icon: CodeOutlined },
      { label: 'Data Export', to: ROUTES.ADMIN_BULK_IMPORT, view: 'data-export', icon: DownloadOutlined },
      { label: 'Global Settings', to: ROUTES.ADMIN_GLOBAL_SETTINGS, icon: SettingOutlined },
      { label: 'Localization', to: ROUTES.ADMIN_LOCALIZATION, icon: TranslationOutlined },
      { label: 'Compliance', to: ROUTES.ADMIN_COMPLIANCE, icon: SafetyCertificateOutlined },
      { label: 'Regional Management', to: ROUTES.ADMIN_REGIONAL_MANAGEMENT, icon: EnvironmentOutlined },
    ],
  },
];

const toHref = (item: SidebarItem) => (item.view ? `${item.to}?view=${item.view}` : item.to);

type AdminSidebarProps = {
  collapsed?: boolean;
  isMobile?: boolean;
  mobileOpen?: boolean;
  onToggleCollapsed?: () => void;
  onMobileOpenChange?: (open: boolean) => void;
};

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  collapsed = false,
  isMobile = false,
  mobileOpen = false,
  onMobileOpenChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const showLabels = !collapsed || isMobile;
  const currentView = new URLSearchParams(location.search).get('view') || '';

  const isActive = (item: SidebarItem) => location.pathname === item.to && currentView === (item.view || '');

  const displayName = user?.name || user?.email || 'Admin';

  return (
    <>
      {isMobile && mobileOpen && <button className="admin-backdrop" type="button" aria-label="Close admin menu" onClick={() => onMobileOpenChange?.(false)} />}
      <aside
        className={`admin-sidebar ${collapsed && !isMobile ? 'admin-sidebar--collapsed' : ''} ${isMobile ? 'admin-sidebar--mobile' : ''} ${mobileOpen ? 'admin-sidebar--mobile-open' : ''}`}
        aria-label="Admin navigation"
      >
        <div className="admin-sidebar__header">
          <div className="admin-sidebar__brand-row">
            <img
              src="/white%20jobpoyt.png.png"
              alt="JobPoyt"
              className="admin-sidebar__logo"
              width={showLabels ? 116 : 40}
              height={showLabels ? 32 : 40}
            />
            {showLabels && <span className="admin-sidebar__brand-label">Admin</span>}
          </div>
          {isMobile && (
            <button type="button" className="admin-sidebar__close" onClick={() => onMobileOpenChange?.(false)} aria-label="Close admin menu">
              <CloseOutlined />
            </button>
          )}
        </div>

        <div className="admin-sidebar__profile" title={collapsed && !isMobile ? displayName : undefined}>
          <div className="admin-sidebar__avatar">{displayName.charAt(0).toUpperCase()}</div>
          {showLabels && (
            <div className="admin-sidebar__profile-copy">
              <span className="admin-sidebar__profile-name">{displayName}</span>
              <span className="admin-sidebar__profile-role">Super Administrator</span>
            </div>
          )}
        </div>

        <nav className="admin-sidebar__nav">
          {sidebarGroups.map((group) => (
            <div key={group.title} className="admin-sidebar__group">
              {showLabels ? <div className="admin-sidebar__group-label">{group.title}</div> : <div className="admin-sidebar__group-divider" />}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);

                return (
                  <button
                    key={toHref(item)}
                    type="button"
                    className={`admin-sidebar__item ${active ? 'admin-sidebar__item--active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => {
                      navigate(toHref(item));
                      if (isMobile) onMobileOpenChange?.(false);
                    }}
                    title={showLabels ? undefined : item.label}
                  >
                    <span className="admin-sidebar__icon-wrap">
                      <Icon className="admin-sidebar__icon" />
                    </span>
                    {showLabels && <span className="admin-sidebar__label">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default AdminSidebar;
