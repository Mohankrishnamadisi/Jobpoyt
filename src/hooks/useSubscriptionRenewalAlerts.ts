import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { subscriptionService, notificationService } from '@services/api';

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 15 * 60 * 1000; // re-check every 15 minutes, throttled by localStorage

const PLAN_LABELS: Record<string, string> = {
  basic: 'Basic',
  premium: 'Premium',
  premium_monthly: 'Premium (Monthly)',
  premium_3_month: 'Premium (3 Months)',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const formatPlanName = (plan?: string | null): string => {
  if (!plan) return 'current';
  const key = String(plan).toLowerCase().trim();
  return PLAN_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
};

/**
 * Alerts candidates/recruiters to renew their subscription starting 5 days
 * before expiry, repeating every 5 hours until the plan is renewed.
 */
export const useSubscriptionRenewalAlerts = (userId: string | null) => {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    const checkAndAlert = async () => {
      try {
        const subscription = await subscriptionService.getUserSubscription(userId);
        if (!mounted || !subscription?.end_date) return;

        const endDate = new Date(subscription.end_date).getTime();
        if (Number.isNaN(endDate)) return;

        const msRemaining = endDate - Date.now();
        // Only alert when within the 5-day renewal window and not yet expired
        if (msRemaining <= 0 || msRemaining > FIVE_DAYS_MS) return;

        const storageKey = `subscription_renewal_alert_last_${userId}`;
        const lastAlert = Number(localStorage.getItem(storageKey) || 0);
        if (Date.now() - lastAlert < FIVE_HOURS_MS) return;

        const daysRemaining = Math.max(1, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
        const planLabel = formatPlanName(subscription.plan);
        const autoRenewOn = Boolean(subscription.auto_renew);

        const toastMessage = autoRenewOn
          ? `Your ${planLabel} plan will auto-renew in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. No action needed.`
          : `Your ${planLabel} plan expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Renew now to avoid losing access.`;

        toast(toastMessage, { duration: 7000, position: 'top-center', icon: autoRenewOn ? '🔄' : '⏰' });

        try {
          await notificationService.createNotification(
            userId,
            'subscription',
            autoRenewOn ? 'Auto-Renewal Coming Up' : 'Subscription Expiring Soon',
            autoRenewOn
              ? `Your ${planLabel} plan will auto-renew in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Make sure your payment method is up to date.`
              : `Your ${planLabel} plan expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Renew now to continue enjoying uninterrupted benefits.`,
            { plan: subscription.plan, endDate: subscription.end_date, autoRenew: autoRenewOn }
          );
        } catch (notifyError) {
          console.error('Failed to record subscription renewal notification:', notifyError);
        }

        localStorage.setItem(storageKey, String(Date.now()));
      } catch (error) {
        console.error('Failed to check subscription renewal alert:', error);
      }
    };

    checkAndAlert();
    timerRef.current = window.setInterval(checkAndAlert, CHECK_INTERVAL_MS);

    return () => {
      mounted = false;
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [userId]);
};
