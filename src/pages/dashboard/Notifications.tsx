import React, { useEffect, useMemo, useState } from 'react';
import { Box, Container, Typography, Card, CardContent, List, ListItem, ListItemText, Chip, Button, Avatar } from '@mui/material';
import { AutoAwesome, CheckCircle, InfoOutlined, MarkEmailUnread, NotificationsActive, NotificationsNone, Schedule, WorkOutline } from '@mui/icons-material';
import { Layout } from '@components/layout/Layout';
import { DashboardHero, DashboardStatCard, heroGoldButtonSx } from '@components/dashboard/DashboardSectionKit';
import { useAuthStore } from '@store/index';
import { notificationService } from '@services/api';
import { formatDate } from '@utils/index';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@constants/index';

export const NotificationsPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const Shell = embedded ? React.Fragment : Layout;
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications]);

  const getNotificationVisual = (type?: string) => {
    if (type === 'job_match' || type === 'new_job') return { icon: <WorkOutline sx={{ fontSize: 20 }} />, color: '#0F6B9A', background: '#E0F2FE', label: 'Job opportunity' };
    if (type === 'application_status') return { icon: <CheckCircle sx={{ fontSize: 20 }} />, color: '#047857', background: '#DCFCE7', label: 'Application update' };
    if (type === 'subscription') return { icon: <AutoAwesome sx={{ fontSize: 20 }} />, color: '#9A7017', background: '#FFF4D6', label: 'Account update' };
    return { icon: <InfoOutlined sx={{ fontSize: 20 }} />, color: '#2563EB', background: '#DBEAFE', label: 'Career update' };
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const data = await notificationService.getUserNotifications(user.id, 50);
        setNotifications(data || []);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user?.id]);

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
              onClick={async () => {
                if (!user?.id) return;
                await notificationService.markAllAsRead(user.id);
                window.location.reload();
              }}
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
            value={notifications[0] ? formatDate(notifications[0].created_at || notifications[0].createdAt || new Date().toISOString()) : 'None yet'}
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
            {unreadCount > 0 ? <Chip label={`${unreadCount} unread`} size="small" sx={{ ml: 'auto', bgcolor: '#FFF4D6', color: '#9A7017', fontWeight: 800 }} /> : null}
          </Box>
          <CardContent sx={{ p: { xs: 1, md: 1.4 }, background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 60%)' }}>
            <List sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 1, maxHeight: { xs: 560, md: 620 }, overflowY: 'auto' }}>
              {loading ? (
                <ListItem sx={{ py: 4, justifyContent: 'center' }}>
                  <ListItemText primary="Loading notifications..." />
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
                notifications.map((notification) => {
                  const visual = getNotificationVisual(notification.type);
                  return (
                    <ListItem key={notification.id} sx={{ position: 'relative', overflow: 'hidden', py: 1.1, px: { xs: 1.1, md: 1.4 }, minHeight: 0, alignItems: 'flex-start', border: '1px solid', borderColor: notification.read ? 'rgba(148,163,184,0.2)' : `${visual.color}55`, borderRadius: 3, bgcolor: notification.read ? '#FFFFFF' : `${visual.background}66`, boxShadow: notification.read ? '0 4px 14px rgba(15,23,42,0.04)' : `0 10px 22px ${visual.color}1A`, transition: 'all 0.2s ease', '&::before': { content: '""', position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: notification.read ? 'transparent' : `linear-gradient(180deg, ${visual.color}, #D6A73A)` }, '&:hover': { borderColor: visual.color, transform: 'translateX(3px)', boxShadow: `0 14px 26px ${visual.color}1F` } }}>
                      <Box sx={{ width: 38, height: 38, mr: 1.2, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 2.4, color: visual.color, bgcolor: visual.background, border: '3px solid #fff', boxShadow: `0 6px 14px ${visual.color}2E` }}>
                        {visual.icon}
                      </Box>
                      <ListItemText
                        sx={{ my: 0, minWidth: 0 }}
                        primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, flexWrap: 'wrap', mb: 0.35 }}><Typography sx={{ fontWeight: 800, color: '#0B2745', fontSize: embedded ? 13 : 14.5, lineHeight: 1.3 }}>{notification.title}</Typography><Chip label={visual.label} size="small" sx={{ height: 20, bgcolor: visual.background, color: visual.color, fontWeight: 800, fontSize: 10 }} /></Box>}
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap', pt: 0.15 }}>
                            <Typography component="span" variant="body2" sx={{ color: '#475569', fontSize: 13, lineHeight: 1.35, flex: 1, minWidth: 0 }}>
                              {notification.message}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, color: '#94A3B8', fontWeight: 600, lineHeight: 1.1, whiteSpace: 'nowrap', flexShrink: 0 }}>
                              <Schedule sx={{ fontSize: 13 }} />
                              {formatDate(notification.created_at || notification.createdAt || new Date().toISOString())}
                            </Typography>
                            {notification.data?.premiumTool === 'Interview Invites' ? <Button size="small" onClick={() => navigate(`${ROUTES.DASHBOARD}?premiumTool=Interview%20Invites`)} sx={{ minHeight: 28, textTransform: 'none', fontWeight: 750 }}>View interview invite</Button> : null}
                          </Box>
                        }
                      />
                      <Chip label={notification.read ? 'Read' : 'New'} size="small" sx={{ ml: 1, mt: 0.1, height: 21, bgcolor: notification.read ? '#F1F5F9' : 'transparent', background: notification.read ? undefined : 'linear-gradient(135deg, #FDE68A, #D6A73A)', color: notification.read ? '#64748B' : '#071D35', fontWeight: 800, fontSize: 10 }} />
                    </ListItem>
                  );
                })
              )}
            </List>
          </CardContent>
        </Card>
      </Container>
    </Shell>
  );
};
