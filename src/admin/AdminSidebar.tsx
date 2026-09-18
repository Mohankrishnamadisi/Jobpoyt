import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AppstoreOutlined,
  BankOutlined,
  CrownOutlined,
  CustomerServiceOutlined,
  EnvironmentOutlined,
  FileSearchOutlined,
  GlobalOutlined,
  SafetyOutlined,
  SettingOutlined,
  TeamOutlined,
  ToolOutlined,
  TranslationOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { ROUTES } from '../constants';

const sidebarGroups = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', to: ROUTES.ADMIN_DASHBOARD, icon: AppstoreOutlined }],
  },
  {
    title: 'People',
    items: [
      { label: 'Organizations', to: ROUTES.ADMIN_USERS, icon: BankOutlined },
      { label: 'Recruiters', to: ROUTES.ADMIN_RECRUITERS, icon: TeamOutlined },
      { label: 'Candidates', to: ROUTES.ADMIN_CANDIDATES, icon: UserOutlined },
    ],
  },
  {
    title: 'Job Market',
    items: [
      { label: 'Jobs', to: ROUTES.ADMIN_JOBS, icon: ToolOutlined },
      { label: 'Applications', to: ROUTES.ADMIN_APPLICATIONS, icon: FileSearchOutlined },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'Communities', to: ROUTES.ADMIN_COMMUNITIES, icon: GlobalOutlined },
      { label: 'Subscriptions', to: ROUTES.ADMIN_SUBSCRIPTIONS, icon: CrownOutlined },
      { label: 'Revenue & Billing', to: ROUTES.ADMIN_BILLING_MANAGEMENT, icon: CrownOutlined },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Support', to: ROUTES.ADMIN_CUSTOMER_CARE, icon: CustomerServiceOutlined },
      { label: 'Moderation', to: ROUTES.ADMIN_DATA_INTEGRITY, icon: SafetyOutlined },
      { label: 'Analytics', to: ROUTES.ADMIN_ANALYTICS, icon: AppstoreOutlined },
      { label: 'System Monitoring', to: ROUTES.ADMIN_SYSTEM_HEALTH, icon: SettingOutlined },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { label: 'Global Settings', to: ROUTES.ADMIN_GLOBAL_SETTINGS, icon: SettingOutlined },
      { label: 'Localization', to: ROUTES.ADMIN_LOCALIZATION, icon: TranslationOutlined },
      { label: 'Regional Management', to: ROUTES.ADMIN_REGIONAL_MANAGEMENT, icon: EnvironmentOutlined },
      { label: 'Settings', to: ROUTES.ADMIN_SETTINGS, icon: SettingOutlined },
    ],
  },
];

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
  onToggleCollapsed,
  onMobileOpenChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (to: string) => location.pathname === to || (to === ROUTES.ADMIN_DASHBOARD && location.pathname.startsWith('/admin/dashboard'));

  return (
    <>
      {isMobile && mobileOpen && <button className="admin-backdrop" type="button" aria-label="Close admin menu" onClick={() => onMobileOpenChange?.(false)} />}
      <aside
        className={`admin-sidebar ${collapsed ? 'admin-sidebar--collapsed' : ''} ${isMobile ? 'admin-sidebar--mobile' : ''} ${mobileOpen ? 'admin-sidebar--mobile-open' : ''}`}
        aria-label="Admin navigation"
      >
        <div className="admin-sidebar__header">
          <div className="admin-sidebar__brand-row">
            <img src="/white%20jobpoyt.png.png" alt="JobPoyt" className="admin-sidebar__logo" />
            {!collapsed && <span className="admin-sidebar__brand-label">Super Admin</span>}
          </div>
          {!collapsed && <div className="admin-sidebar__console-label">Admin Console</div>}
        </div>

        <div className="admin-sidebar__profile">
          <div className="admin-sidebar__avatar">A</div>
          {!collapsed && (
            <div className="admin-sidebar__profile-copy">
              <span className="admin-sidebar__profile-name">Admin</span>
              <span className="admin-sidebar__profile-role">Super Administrator</span>
            </div>
          )}
        </div>

        <nav className="admin-sidebar__nav">
          {sidebarGroups.map((group) => (
            <div key={group.title} className="admin-sidebar__group">
              {!collapsed && <div className="admin-sidebar__group-label">{group.title}</div>}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);

                return (
                  <button
                    key={item.to}
                    type="button"
                    className={`admin-sidebar__item ${active ? 'admin-sidebar__item--active' : ''}`}
                    onClick={() => {
                      navigate(item.to);
                      if (isMobile) onMobileOpenChange?.(false);
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="admin-sidebar__icon-wrap">
                      <Icon className="admin-sidebar__icon" />
                    </span>
                    {!collapsed && <span className="admin-sidebar__label">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {isMobile && (
          <button type="button" className="admin-sidebar__close" onClick={() => onToggleCollapsed?.()} aria-label="Toggle sidebar">
            <SettingOutlined />
          </button>
        )}
      </aside>
    </>
  );
};

export default AdminSidebar;
