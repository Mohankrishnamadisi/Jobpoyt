import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  Typography,
} from '@mui/material';
import {
  AutoAwesome,
  CheckCircle,
  DescriptionOutlined,
  InfoOutlined,
  MarkEmailRead,
  MarkEmailUnread,
  NotificationsActive,
  NotificationsNone,
  Schedule,
  VisibilityOutlined,
  WorkOutline,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { Layout } from '@components/layout/Layout';
import { DashboardHero, DashboardStatCard, heroGoldButtonSx } from '@components/dashboard/DashboardSectionKit';
import { useAuthStore } from '@store/index';
import { notificationService } from '@services/api';
import { supabase } from '@services/supabase';
import { formatDate } from '@utils/index';
import { getNotificationDate, groupNotificationsByDay, sortAndDedupeNotifications } from '@utils/notificationDisplay';
import type { Notification } from '@types';

const POLL_INTERVAL_MS = 30_000;

export const NotificationsPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { user } = useAuthStore();
  const Shell = embedded ? React.Fragment : Layout;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const aliveRef = useRef(false);
  const activeUserIdRef = useRef(user?.id);
  activeUserIdRef.current = user?.id;

  const refreshNotifications = useCallback(async (showLoading = false) => {
    const requestUserId = user?.id;
    if (!requestUserId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    try {
      const [items, count] = await Promise.all([
        notificationService.getUserNotifications(requestUserId, 50),
        notificationService.getUnreadNotificationCount(requestUserId),
      ]);
      if (!aliveRef.current || activeUserIdRef.current !== requestUserId) return;
      setNotifications(sortAndDedupeNotifications(items as Notification[]));
      setUnreadCount(count);
      setError(null);
    } catch (refreshError) {
      console.error('Failed to load notifications:', refreshError);
      if (aliveRef.current && activeUserIdRef.current === requestUserId) {
        setError('Notifications could not be loaded. Check your connection and retry.');
      }
    } finally {
      if (aliveRef.current && activeUserIdRef.current === requestUserId) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    aliveRef.current = true;
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      setLoading(false);
      return () => {
        aliveRef.current = false;
      };
    }

    setNotifications([]);
    setUnreadCount(0);
    setError(null);
    setLoading(true);
    void refreshNotifications(true);
    const channel = supabase
      .channel(`candidate-notifications:${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        void refreshNotifications();
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Notification realtime is unavailable; the polling fallback remains active.');
        }
      });
    const poll = window.setInterval(() => void refreshNotifications(), POLL_INTERVAL_MS);

    return () => {
      aliveRef.current = false;
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [refreshNotifications, user?.id]);

  const unreadVisibleCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );
  const notificationGroups = useMemo(() => groupNotificationsByDay(notifications), [notifications]);

  const getNotificationVisual = (notification: Notification) => {
    const category = String(notification.data?.category || '');
    if (category === 'Profile Performance') {
      return { icon: <VisibilityOutlined sx={{ fontSize: 20 }} />, color: '#0F6B9A', background: '#E0F2FE', label: category };
    }
    if (category === 'Application History') {
      return { icon: <DescriptionOutlined sx={{ fontSize: 20 }} />, color: '#047857', background: '#DCFCE7', label: category };
    }
    if (notification.type === 'job_match' || notification.type === 'new_job') {
      return { icon: <WorkOutline sx={{ fontSize: 20 }} />, color: '#0F6B9A', background: '#E0F2FE', label: 'Job opportunity' };
    }
    if (notification.type === 'application_status') {
      return { icon: <CheckCircle sx={{ fontSize: 20 }} />, color: '#047857', background: '#DCFCE7', label: 'Application update' };
    }
    if (notification.type === 'subscription') {
      return { icon: <AutoAwesome sx={{ fontSize: 20 }} />, color: '#9A7017', background: '#FFF4D6', label: 'Account update' };
    }
    return { icon: <InfoOutlined sx={{ fontSize: 20 }} />, color: '#2563EB', background: '#DBEAFE', label: 'Career update' };
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (!user?.id || notification.read) return;
    try {
      await notificationService.markAsRead(notification.id, user.id);
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read: true } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (markError) {
      console.error('Failed to mark notification as read:', markError);
      toast.error('Could not mark the notification as read.');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id || unreadCount === 0) return;
    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
      setUnreadCount(0);
    } catch (markError) {
      console.error('Failed to mark all notifications as read:', markError);
      toast.error('Could not mark notifications as read.');
    }
  };

  const renderNotification = (notification: Notification) => {
    const visual = getNotificationVisual(notification);
    const date = getNotificationDate(notification);
    return (
      <ListItem
        key={notification.id}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          py: 1.1,
          px: { xs: 1.1, md: 1.4 },
          minHeight: 0,
          alignItems: 'flex-start',
          border: '1px solid',
          borderColor: notification.read ? 'rgba(148,163,184,0.2)' : `${visual.color}55`,
          borderRadius: 3,
          bgcolor: notification.read ? '#FFFFFF' : `${visual.background}66`,
          boxShadow: notification.read ? '0 4px 14px rgba(15,23,42,0.04)' : `0 10px 22px ${visual.color}1A`,
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background: notification.read ? 'transparent' : `linear-gradient(180deg, ${visual.color}, #D6A73A)`,
          },
        }}
      >
        <Box sx={{ width: 38, height: 38, mr: 1.2, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 2.4, color: visual.color, bgcolor: visual.background, border: '3px solid #fff', boxShadow: `0 6px 14px ${visual.color}2E` }}>
          {visual.icon}
        </Box>
        <ListItemText
          sx={{ my: 0, minWidth: 0 }}
          primary={(
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, flexWrap: 'wrap', mb: 0.35 }}>
              <Typography sx={{ fontWeight: 800, color: '#0B2745', fontSize: 14.2, lineHeight: 1.3 }}>
                {notification.title}
              </Typography>
              <Chip label={visual.label} size="small" sx={{ height: 20, bgcolor: visual.background, color: visual.color, fontWeight: 750, fontSize: 10 }} />
            </Box>
          )}
          secondary={(
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap', pt: 0.15 }}>
              <Typography component="span" variant="body2" sx={{ color: '#475569', fontSize: 13, lineHeight: 1.35, flex: 1, minWidth: 0 }}>
                {notification.message}
              </Typography>
              <Typography variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, color: '#94A3B8', fontWeight: 600, lineHeight: 1.1, whiteSpace: 'nowrap', flexShrink: 0 }}>
                <Schedule sx={{ fontSize: 13 }} />
                {date ? formatDate(date) : 'Time unavailable'}
              </Typography>
            </Box>
          )}
        />
        {notification.read ? (
          <Chip label="Read" size="small" sx={{ ml: 1, mt: 0.1, height: 21, bgcolor: '#F1F5F9', color: '#64748B', fontWeight: 800, fontSize: 10 }} />
        ) : (
          <IconButton
            aria-label="Mark notification as read"
            title="Mark as read"
            size="small"
            onClick={() => void handleMarkAsRead(notification)}
            sx={{ ml: 0.5, color: visual.color, flexShrink: 0 }}
          >
            <MarkEmailRead fontSize="small" />
          </IconButton>
        )}
      </ListItem>
    );
  };

  return (
    <Shell>
      <Container maxWidth="lg" sx={{ py: { xs: 1, md: 1.5 }, px: { xs: 1.2, sm: 2, md: 3 } }}>
        <DashboardHero
          compact={embedded}
          icon={<NotificationsActive />}
          eyebrow="CAREER PULSE"
          title="Notifications"
          subtitle="Stay close to every recruiter signal, application update, and opportunity."
          action={(
            <Button
              onClick={() => void handleMarkAllAsRead()}
              variant="contained"
              disabled={unreadCount === 0}
              startIcon={unreadCount > 0 ? <MarkEmailUnread /> : <CheckCircle />}
              sx={heroGoldButtonSx}
            >
              {unreadCount > 0 ? `Mark all read (${unreadCount})` : 'All caught up'}
            </Button>
          )}
        />

        <Box className="grid grid-cols-1 gap-2 sm:grid-cols-3" sx={{ mb: 1.5 }}>
          <DashboardStatCard compact={embedded} label="Total updates" value={notifications.length} icon={<NotificationsNone />} accent="#4F46E5" accent2="#8B5CF6" />
          <DashboardStatCard compact={embedded} label="Unread now" value={unreadCount} icon={<MarkEmailUnread />} accent="#D97706" accent2="#F59E0B" />
          <DashboardStatCard
            compact={embedded}
            smallValue
            label="Latest signal"
            value={notifications[0] ? formatDate(getNotificationDate(notifications[0])) : 'None yet'}
            icon={<Schedule />}
            accent="#0284C7"
            accent2="#38BDF8"
          />
        </Box>

        <Card sx={{ borderRadius: 4, border: '1px solid rgba(148,163,184,0.18)', boxShadow: '0 20px 44px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
          <Box sx={{ px: { xs: 1.5, md: 2 }, py: 1.3, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #E7EEF5', background: 'linear-gradient(90deg, rgba(79,70,229,0.06), rgba(255,255,255,0.6))' }}>
            <Box sx={{ width: 30, height: 30, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(135deg, #4F46E5, #8B5CF6)', boxShadow: '0 6px 14px rgba(79,70,229,0.3)' }}>
              <NotificationsActive sx={{ fontSize: 17 }} />
            </Box>
            <Typography sx={{ color: '#0B2745', fontWeight: 800, fontSize: 14.5 }}>Your latest updates</Typography>
            {unreadCount > 0 && <Chip label={`${unreadCount} unread`} size="small" sx={{ ml: 'auto', bgcolor: '#FFF4D6', color: '#9A7017', fontWeight: 800 }} />}
          </Box>
          <CardContent sx={{ p: { xs: 1, md: 1.4 }, background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 60%)' }}>
            {error && (
              <Alert severity="error" sx={{ mb: 1 }} action={<Button color="inherit" size="small" onClick={() => void refreshNotifications(true)}>Retry</Button>}>
                {error}
              </Alert>
            )}
            <List sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 1, maxHeight: { xs: 560, md: 620 }, overflowY: 'auto' }}>
              {loading ? (
                <ListItem sx={{ py: 4, justifyContent: 'center' }}>
                  <ListItemText primary="Loading notifications..." />
                </ListItem>
              ) : error && notifications.length === 0 ? (
                <ListItem sx={{ py: 4, justifyContent: 'center' }}>
                  <ListItemText primary="Notifications are temporarily unavailable." />
                </ListItem>
              ) : notifications.length === 0 ? (
                <ListItem sx={{ py: 5, flexDirection: 'column', textAlign: 'center', borderRadius: 3.5, border: '1px dashed rgba(99,102,241,0.3)', background: 'radial-gradient(circle at 15% 0%, rgba(99,102,241,0.08), transparent 40%), radial-gradient(circle at 85% 100%, rgba(214,167,58,0.1), transparent 40%), #FFFFFF' }}>
                  <Avatar sx={{ width: 52, height: 52, mb: 1.4, color: '#fff', background: 'linear-gradient(135deg, #4F46E5, #8B5CF6)', boxShadow: '0 0 0 8px rgba(99,102,241,0.1), 0 12px 24px rgba(79,70,229,0.3)' }}>
                    <NotificationsNone />
                  </Avatar>
                  <ListItemText
                    primary={<Typography sx={{ fontWeight: 800, fontSize: 17, color: '#0B2745' }}>You&apos;re all caught up</Typography>}
                    secondary={<Typography sx={{ mt: 0.5, color: '#64748B' }}>Updates from your saved jobs and applications will appear here.</Typography>}
                  />
                </ListItem>
              ) : (
                <>
                  {notificationGroups.today.length > 0 && (
                    <>
                      <ListSubheader component="div" disableSticky sx={{ px: 0.5, py: 0.25, bgcolor: 'transparent', color: '#64748B', fontWeight: 800, lineHeight: 1.5 }}>Today</ListSubheader>
                      {notificationGroups.today.map(renderNotification)}
                    </>
                  )}
                  {notificationGroups.earlier.length > 0 && (
                    <>
                      <ListSubheader component="div" disableSticky sx={{ px: 0.5, py: 0.25, bgcolor: 'transparent', color: '#64748B', fontWeight: 800, lineHeight: 1.5 }}>Earlier</ListSubheader>
                      {notificationGroups.earlier.map(renderNotification)}
                    </>
                  )}
                </>
              )}
            </List>
            {unreadVisibleCount !== unreadCount && notifications.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Showing the latest {notifications.length}; {unreadCount} unread notification(s) total.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Container>
    </Shell>
  );
};
