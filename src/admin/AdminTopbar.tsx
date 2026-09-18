import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  Dropdown,
  Empty,
  Input,
  Layout,
  List,
  Modal,
  Popover,
  Space,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  BellOutlined,
  HomeOutlined,
  LeftOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { adminService } from '../services/admin';
import { authService } from '@services/supabase';
import { useAuthStore } from '@store/index';
import { ROUTES } from '../constants';

const { Header } = Layout;

type AdminTopbarProps = {
  collapsed?: boolean;
  isMobile?: boolean;
  mobileOpen?: boolean;
  onToggleCollapsed?: () => void;
  onMobileOpenChange?: (open: boolean) => void;
};

const AdminTopbar: React.FC<AdminTopbarProps> = ({ collapsed = false, isMobile = false, onToggleCollapsed, onMobileOpenChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loadingNotifications, setLoadingNotifications] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);

  const pageLabel = React.useMemo(() => {
    const raw = location.pathname.split('/').filter(Boolean).pop() || 'dashboard';
    return raw.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }, [location.pathname]);

  const loadNotifications = React.useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoadingNotifications(true);
    try {
      const [list, unread] = await Promise.all([
        adminService.getAdminNotifications(user.id, 10),
        adminService.getUnreadNotificationsCount(user.id),
      ]);
      setNotifications(list || []);
      setUnreadCount(unread || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoadingNotifications(false);
    }
  }, [user?.id]);

  React.useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  React.useEffect(() => {
    if (!user?.id) return undefined;

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadNotifications();
      }
    }, 30000);

    return () => window.clearInterval(interval);
  }, [loadNotifications, user?.id]);

  React.useEffect(() => {
    if (notificationsOpen) {
      loadNotifications();
    }
  }, [notificationsOpen, loadNotifications]);

  const markAllRead = async () => {
    if (!user?.id) return;
    try {
      await adminService.markAllNotificationsRead(user.id);
      message.success('All notifications marked as read');
      await loadNotifications();
    } catch {
      message.error('Unable to mark notifications as read');
    }
  };

  const markSingleRead = async (id: string) => {
    if (!user?.id) return;
    try {
      await adminService.markNotificationRead(user.id, id);
      await loadNotifications();
    } catch {
      // noop
    }
  };

  const performLogout = async () => {
    try {
      await authService.signOut();
    } catch {
      // Ignore Supabase signout failures and proceed with local logout.
    } finally {
      logout();
      message.success('Logged out successfully');
      navigate(ROUTES.LOGIN, { replace: true });
    }
  };

  const handleLogout = () => {
    Modal.confirm({
      title: 'Logout?',
      content: 'Are you sure you want to logout from admin dashboard?',
      okText: 'Yes, Logout',
      cancelText: 'Cancel',
      okButtonProps: { danger: true },
      onOk: async () => {
        await performLogout();
      },
    });
  };

  const profileMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: user?.name || user?.email || 'Admin Profile',
      disabled: true,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Admin Settings',
      onClick: () => navigate(ROUTES.ADMIN_SETTINGS),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      danger: true,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  const notificationContent = (
    <div style={{ width: 360 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text strong>Notifications</Typography.Text>
        <Button type="link" size="small" onClick={markAllRead} disabled={unreadCount === 0}>
          Mark all read
        </Button>
      </div>
      {notifications.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No notifications" />
      ) : (
        <List
          size="small"
          loading={loadingNotifications}
          dataSource={notifications}
          renderItem={(item: any) => (
            <List.Item
              style={{ cursor: item.read ? 'default' : 'pointer', paddingLeft: 8, paddingRight: 8 }}
              onClick={() => {
                if (!item.read && item.id) markSingleRead(String(item.id));
              }}
            >
              <List.Item.Meta
                title={<Typography.Text strong={!item.read}>{item.title || 'Notification'}</Typography.Text>}
                description={
                  <Space direction="vertical" size={0}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {item.message || '-'}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      {item.created_at ? new Date(item.created_at).toLocaleString() : 'Recent'}
                    </Typography.Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Header className="admin-topbar" style={{ left: isMobile ? 0 : undefined }}>
      <div className="admin-topbar__left">
        <button type="button" className="admin-topbar__toggle" onClick={() => {
          if (isMobile) {
            onMobileOpenChange?.(true);
          }
          onToggleCollapsed?.();
        }}>
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </button>

        <button type="button" className="admin-topbar__back" onClick={() => navigate(-1)} aria-label="Back">
          <LeftOutlined />
        </button>

        <div className="admin-topbar__title-wrap">
          <Typography.Text className="admin-topbar__crumb">Super Admin / {pageLabel}</Typography.Text>
          <Typography.Title level={5} className="admin-topbar__title">
            Platform Control Center
          </Typography.Title>
        </div>
      </div>

      <div className="admin-topbar__right">
        <Input className="admin-topbar__search" prefix={<SearchOutlined />} placeholder="Search users, jobs, companies..." />
        <button type="button" className="admin-topbar__icon-button" onClick={() => navigate(ROUTES.HOME)} aria-label="Home">
          <HomeOutlined />
        </button>

        <Popover trigger="click" placement="bottomRight" content={notificationContent} onOpenChange={setNotificationsOpen} open={notificationsOpen}>
          <Badge count={unreadCount} size="small" overflowCount={99}>
            <button type="button" className="admin-topbar__icon-button" aria-label="Notifications">
              <BellOutlined />
            </button>
          </Badge>
        </Popover>

        <Dropdown trigger={['click']} menu={{ items: profileMenuItems }} placement="bottomRight">
          <div className="admin-topbar__user">
            <Avatar className="admin-topbar__avatar">{(user?.name || user?.email || 'A').charAt(0).toUpperCase()}</Avatar>
            {!isMobile && (
              <>
                <div className="admin-topbar__user-copy">
                  <span>{user?.name || 'Admin'}</span>
                </div>
              </>
            )}
          </div>
        </Dropdown>
      </div>
    </Header>
  );
};

export default AdminTopbar;
