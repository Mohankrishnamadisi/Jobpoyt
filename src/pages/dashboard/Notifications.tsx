import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, Card, CardContent, List, ListItem, ListItemText, Chip, Button, Divider } from '@mui/material';
import { Layout } from '@components/layout/Layout';
import { useAuthStore } from '@store/index';
import { notificationService } from '@services/api';
import { formatDate } from '@utils/index';

export const NotificationsPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { user } = useAuthStore();
  const Shell = embedded ? React.Fragment : Layout;
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Notifications
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Stay updated when HR takes action on your applications and when new matched roles arrive.
            </Typography>
          </Box>
          <Button
            onClick={async () => {
              if (!user?.id) return;
              await notificationService.markAllAsRead(user.id);
              window.location.reload();
            }}
            variant="outlined"
          >
            Mark All Read
          </Button>
        </Box>

        <Card>
          <CardContent>
            <List>
              {loading ? (
                <ListItem>
                  <ListItemText primary="Loading notifications..." />
                </ListItem>
              ) : notifications.length === 0 ? (
                <ListItem>
                  <ListItemText
                    primary="No notifications yet"
                    secondary="You will receive updates when there is activity on your saved jobs or applications."
                  />
                </ListItem>
              ) : (
                notifications.map((notification) => (
                  <React.Fragment key={notification.id}>
                    <ListItem sx={{ py: 2, bgcolor: notification.read ? 'transparent' : '#E0F2FE' }}>
                      <ListItemText
                        primary={notification.title}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
                              {notification.message}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 1 }}>
                              {formatDate(notification.created_at || notification.createdAt || new Date().toISOString())}
                            </Typography>
                          </>
                        }
                      />
                      <Chip
                        label={notification.read ? 'Read' : 'Unread'}
                        size="small"
                        color={notification.read ? 'default' : 'primary'}
                      />
                    </ListItem>
                    <Divider />
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
