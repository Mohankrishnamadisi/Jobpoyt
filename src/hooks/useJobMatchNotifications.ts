import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@services/supabase';
import type { JobMatchNotification } from '@types';

/**
 * Hook to subscribe to job match notifications via Realtime
 * Updates in real-time as premium candidates receive job match notifications
 */
export function useJobMatchNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);

  // Initial fetch of notifications
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .eq('type', 'job_match')
          .order('created_at', { ascending: false })
          .limit(50);

        if (fetchError) {
          console.error('Error fetching notifications:', fetchError);
          setError('Failed to load notifications');
        } else {
          setNotifications(data || []);
        }
      } catch (err) {
        console.error('Error in fetchNotifications:', err);
        setError('Failed to load notifications');
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [userId]);

  // Subscribe to real-time changes for this user's notifications
  useEffect(() => {
    if (!userId) return;

    const subscription = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const newNotification = payload.new;
          if (newNotification.type === 'job_match') {
            setNotifications((prev) => [newNotification, ...prev]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const updatedNotification = payload.new;
          if (updatedNotification.type === 'job_match') {
            setNotifications((prev) =>
              prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        }
      });

    subscriptionRef.current = subscription;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [userId]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        const { error: updateError } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notificationId);

        if (updateError) {
          console.error('Error marking notification as read:', updateError);
        } else {
          setNotifications((prev) =>
            prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
          );
        }
      } catch (err) {
        console.error('Error in markAsRead:', err);
      }
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('type', 'job_match')
        .eq('read', false);

      if (updateError) {
        console.error('Error marking all as read:', updateError);
      } else {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error('Error in markAllAsRead:', err);
    }
  }, [userId]);

  return {
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    unreadCount: notifications.filter((n) => !n.read).length,
  };
}

/**
 * Hook to get real-time unread notification count
 */
export function useNotificationBadge(userId: string | undefined) {
  const [unreadCount, setUnreadCount] = useState(0);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('read', false);

        if (!error) {
          setUnreadCount(data?.length || 0);
        }
      } catch (err) {
        console.error('Error fetching unread count:', err);
      }
    };

    fetchUnreadCount();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel(`notifications:unread:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          if (!payload.new.read) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          // If a notification changed from unread to read
          if (payload.old.read === false && payload.new.read === true) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
          // If a notification changed from read to unread
          else if (payload.old.read === true && payload.new.read === false) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    subscriptionRef.current = subscription;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [userId]);

  return { unreadCount };
}

/**
 * Hook to fetch a single job for a job match notification
 */
export function useJobForNotification(jobId: string | undefined) {
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(!!jobId);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      return;
    }

    const fetchJob = async () => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('id, title, company_name, location, job_type, work_mode, salary_min, salary_max, description')
          .eq('id', jobId)
          .single();

        if (!error) {
          setJob(data);
        }
      } catch (err) {
        console.error('Error fetching job:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [jobId]);

  return { job, loading };
}
