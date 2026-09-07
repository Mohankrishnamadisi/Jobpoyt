import { supabase } from '@services/supabase';

type CheckoutPlan = {
  id: string;
  name: string;
  price: number;
  durationMonths: number;
  durationLabel: string;
};

type RazorpayOrder = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const loadRazorpay = (): Promise<void> => new Promise((resolve, reject) => {
  if (window.Razorpay) {
    resolve();
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve();
  script.onerror = () => reject(new Error('Unable to load Razorpay checkout. Check your network connection.'));
  document.head.appendChild(script);
});

export const razorpayCheckout = {
  async start(plan: CheckoutPlan, onSuccess: (payment: unknown) => void, onFailure: (reason: string) => void): Promise<void> {
    const { data: order, error } = await supabase.functions.invoke<RazorpayOrder>('razorpay-checkout', {
      body: { action: 'create-order', planId: plan.id },
    });
    if (error || !order?.orderId || !order.keyId) throw new Error(error?.message || 'Unable to create a secure payment order.');

    await loadRazorpay();
    const checkout = new window.Razorpay!({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: 'Jobpoyt',
      description: `${plan.name} - ${plan.durationLabel}`,
      order_id: order.orderId,
      handler: async (response: Record<string, string>) => {
        try {
          const { data: payment, error: verificationError } = await supabase.functions.invoke('razorpay-checkout', {
            body: { action: 'verify-payment', planId: plan.id, ...response },
          });
          if (verificationError) throw verificationError;
          onSuccess(payment);
        } catch (verificationError) {
          onFailure(verificationError instanceof Error ? verificationError.message : 'Payment verification failed.');
        }
      },
      modal: { ondismiss: () => onFailure('Payment was cancelled before completion.') },
      theme: { color: '#2563EB' },
    });
    checkout.open();
  },
};