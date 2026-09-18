import React from 'react';
import { Outlet } from 'react-router-dom';
import { Layout } from 'antd';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import SupportWidget from '@components/common/SupportWidget';
import '../styles/fixedSideNav.css';

const { Content } = Layout;
const EXPANDED_SIDEBAR_WIDTH = 260;
const COLLAPSED_SIDEBAR_WIDTH = 80;

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth <= 1024 : false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const update = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileOpen(false);
      }
    };

    window.addEventListener('resize', update);
    update();
    return () => window.removeEventListener('resize', update);
  }, []);

  const sidebarWidth = collapsed ? COLLAPSED_SIDEBAR_WIDTH : EXPANDED_SIDEBAR_WIDTH;

  return (
    <div
      className="admin-shell"
      data-collapsed={collapsed}
      data-mobile={isMobile}
      data-mobile-open={mobileOpen}
      style={{
        ['--admin-sidebar-width' as string]: `${sidebarWidth}px`,
        ['--admin-topbar-height' as string]: '72px',
      }}
    >
      <AdminSidebar
        collapsed={collapsed}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onToggleCollapsed={() => setCollapsed((prev) => !prev)}
        onMobileOpenChange={setMobileOpen}
      />

      <div className="admin-main-shell">
        <AdminTopbar
          collapsed={collapsed}
          isMobile={isMobile}
          mobileOpen={mobileOpen}
          onToggleCollapsed={() => {
            if (isMobile) {
              setMobileOpen((prev) => !prev);
              return;
            }
            setCollapsed((prev) => !prev);
          }}
          onMobileOpenChange={setMobileOpen}
        />

        <Content className="admin-content">
          <div className="admin-content-shell">
            <Outlet />
          </div>
        </Content>
      </div>

      <SupportWidget audience="admin" />
    </div>
  );
};

export default AdminLayout;
