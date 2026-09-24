import React, { useEffect, useMemo, useState } from 'react';
import { Box, Container, Typography, Card, CardContent, List, ListItem, ListItemText, Chip, Button, Divider } from '@mui/material';
import { AutoAwesome, CheckCircle, InfoOutlined, NotificationsActive, WorkOutline } from '@mui/icons-material';
import { Layout } from '@components/layout/Layout';
import { useAuthStore } from '@store/index';
import { notificationService } from '@services/api';
import { formatDate } from '@utils/index';

export const NotificationsPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { user } = useAuthStore();
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
        <Box className="flex flex-wrap items-center justify-between gap-3" sx={{ mb: 1.2, p: { xs: 1.5, md: 1.8 }, borderRadius: 3, background: 'linear-gradient(115deg, #071D35 0%, #0B3558 58%, #126B8F 100%)', boxShadow: '0 10px 24px rgba(7,29,53,0.16)', position: 'relative', overflow: 'hidden', '&::after': { content: '""', position: 'absolute', width: 180, height: 180, borderRadius: '50%', right: -70, top: -100, background: 'rgba(214,167,58,0.2)' } }}>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Chip label="CAREER PULSE" size="small" sx={{ mb: 0.6, height: 21, bgcolor: 'rgba(255,255,255,0.14)', color: '#F7D774', fontWeight: 900, letterSpacing: 1, borderRadius: 1.2, fontSize: 10 }} />
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#fff', fontSize: { xs: 23, md: 28 }, lineHeight: 1.05, letterSpacing: '-0.03em' }}>Notifications</Typography>
            <Typography variant="body2" sx={{ mt: 0.3, color: 'rgba(255,255,255,0.76)', fontSize: { xs: 12, md: 13.5 } }}>Stay close to every recruiter signal, application update, and opportunity.</Typography>
          </Box>
          <Button
            onClick={async () => {
              if (!user?.id) return;
              await notificationService.markAllAsRead(user.id);
              window.location.reload();
            }}
            variant="contained"
            disabled={unreadCount === 0}
            sx={{ position: 'relative', zIndex: 1, borderRadius: 1.7, px: 1.5, py: 0.75, bgcolor: '#D6A73A', color: '#071D35', textTransform: 'none', fontWeight: 900, fontSize: 12, boxShadow: '0 6px 14px rgba(0,0,0,0.14)', '&:hover': { bgcolor: '#F0C75E' }, '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' } }}
          >
            {unreadCount > 0 ? `Mark all read (${unreadCount})` : 'All caught up'}
          </Button>
        </Box>

        <Box className="grid grid-cols-1 gap-2 sm:grid-cols-3" sx={{ mb: 1.2 }}>
          {[
            { label: 'Total updates', value: notifications.length, color: '#0B2745' },
            { label: 'Unread now', value: unreadCount, color: '#D97706' },
            { label: 'Latest signal', value: notifications[0] ? formatDate(notifications[0].created_at || notifications[0].createdAt || new Date().toISOString()) : 'None yet', color: '#0F6B9A' },
          ].map((item) => (
            <Box key={item.label} sx={{ minHeight: 68, px: 1.4, py: 1, border: '1px solid #DCE6F2', borderTop: `3px solid ${item.color}`, borderRadius: 2.2, bgcolor: '#fff', boxShadow: '0 6px 14px rgba(15,35,63,0.04)' }}>
              <Typography sx={{ color: '#64748B', fontSize: 11, fontWeight: 800 }}>{item.label}</Typography>
              <Typography sx={{ mt: 0.45, color: item.color, fontSize: item.label === 'Latest signal' ? 13 : 22, lineHeight: 1, fontWeight: 900 }}>{item.value}</Typography>
            </Box>
          ))}
        </Box>

        <Card sx={{ borderRadius: 3, border: '1px solid #DCE6F2', boxShadow: '0 12px 28px rgba(15,35,63,0.07)', overflow: 'hidden' }}>
          <Box sx={{ px: { xs: 1.3, md: 1.8 }, py: 1, display: 'flex', alignItems: 'center', gap: 0.8, borderBottom: '1px solid #E7EEF5', background: 'linear-gradient(180deg, #FBFDFF 0%, #F5F9FC 100%)' }}>
            <NotificationsActive sx={{ color: '#0F6B9A', fontSize: 20 }} />
            <Typography sx={{ color: '#0B2745', fontWeight: 900, fontSize: 14 }}>Your latest updates</Typography>
            {unreadCount > 0 ? <Chip label={`${unreadCount} unread`} size="small" sx={{ ml: 'auto', bgcolor: '#FFF4D6', color: '#9A7017', fontWeight: 800 }} /> : null}
          </Box>
          <CardContent sx={{ p: { xs: 0.55, md: 0.8 } }}>
            <List sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 0.9, maxHeight: { xs: 560, md: 620 }, overflowY: 'auto' }}>
              {loading ? (
                <ListItem sx={{ py: 4, justifyContent: 'center' }}>
                  <ListItemText primary="Loading notifications..." />
                </ListItem>
              ) : notifications.length === 0 ? (
                <ListItem sx={{ py: 5, textAlign: 'center' }}>
                  <ListItemText
                    primary={<Typography sx={{ fontWeight: 900, color: '#0B2745' }}>You&apos;re all caught up</Typography>}
                    secondary={<Typography sx={{ mt: 0.5, color: '#64748B' }}>Updates from your saved jobs and applications will appear here.</Typography>}
                  />
                </ListItem>
              ) : (
                notifications.map((notification) => (
                  <React.Fragment key={notification.id}>
                    <ListItem sx={{ py: 0.7, px: { xs: 0.8, md: 1.05 }, minHeight: 0, alignItems: 'flex-start', border: '1px solid', borderColor: notification.read ? '#D6E2EE' : '#A8D4EA', borderLeft: notification.read ? '4px solid #B8C9D8' : '4px solid #D6A73A', borderRadius: 2, bgcolor: notification.read ? '#FFFFFF' : '#F2FAFF', boxShadow: notification.read ? '0 4px 12px rgba(15,35,63,0.05)' : '0 7px 16px rgba(15,107,154,0.08)' }}>
                      <Box sx={{ width: 28, height: 28, mr: 0.8, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1.3, color: getNotificationVisual(notification.type).color, bgcolor: getNotificationVisual(notification.type).background }}>
                        {getNotificationVisual(notification.type).icon}
                      </Box>
                      <ListItemText
                        sx={{ my: 0, minWidth: 0 }}
                        primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, flexWrap: 'wrap', mb: 0.35 }}><Typography sx={{ fontWeight: 900, color: '#0B2745', fontSize: 14 }}>{notification.title}</Typography><Chip label={getNotificationVisual(notification.type).label} size="small" sx={{ height: 19, bgcolor: getNotificationVisual(notification.type).background, color: getNotificationVisual(notification.type).color, fontWeight: 800, fontSize: 9.5 }} /></Box>}
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap', pt: 0.15 }}>
                            <Typography component="span" variant="body2" sx={{ color: 'text.secondary', fontSize: 12.5, lineHeight: 1.25, flex: 1, minWidth: 0 }}>
                              {notification.message}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.1, whiteSpace: 'nowrap', flexShrink: 0 }}>
                              {formatDate(notification.created_at || notification.createdAt || new Date().toISOString())}
                            </Typography>
                          </Box>
                        }
                      />
                      <Chip label={notification.read ? 'Read' : 'New'} size="small" sx={{ mt: 0.1, height: 21, bgcolor: notification.read ? '#F1F5F9' : '#FFF4D6', color: notification.read ? '#64748B' : '#9A7017', fontWeight: 800, fontSize: 10 }} />
                    </ListItem>
                  </React.Fragment>
                ))
              )}
            </List>
          </CardContent>
        </Card>
      </Container>
    </Shell>
  );
};
