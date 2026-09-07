import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const candidatePlanCatalog: Record<string, { name: string; price: number; durationMonths: number; gstPercent: number }> = {
  premium_monthly: { name: 'Actro Premium Monthly', price: 149, durationMonths: 1, gstPercent: 18 },
  premium_3_month: { name: 'Actro Premium 3 Months', price: 399, durationMonths: 3, gstPercent: 18 },
};

const recruiterPlanCatalog: Record<string, { id: string; name: string; price: number; durationMonths: number; gstPercent: number; amount: number; amountInPaise: number; type: 'recruiter' }> = {
  jobpoyt_recruiter_pro_1_month: { id: 'jobpoyt_recruiter_pro_1_month', name: 'Jobpoyt Recruiter Pro', price: 999, durationMonths: 1, gstPercent: 0, amount: 999, amountInPaise: 99900, type: 'recruiter' },
  jobpoyt_recruiter_pro_3_month: { id: 'jobpoyt_recruiter_pro_3_month', name: 'Jobpoyt Recruiter Pro', price: 2499, durationMonths: 3, gstPercent: 0, amount: 2499, amountInPaise: 249900, type: 'recruiter' },
  jobpoyt_recruiter_pro_6_month: { id: 'jobpoyt_recruiter_pro_6_month', name: 'Jobpoyt Recruiter Pro', price: 4499, durationMonths: 6, gstPercent: 0, amount: 4499, amountInPaise: 449900, type: 'recruiter' },
  jobpoyt_recruiter_pro_12_month: { id: 'jobpoyt_recruiter_pro_12_month', name: 'Jobpoyt Recruiter Pro', price: 7999, durationMonths: 12, gstPercent: 0, amount: 7999, amountInPaise: 799900, type: 'recruiter' },
};

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const calculateGrossAmount = (basePrice: number, gstPercent = 0): number => Number((basePrice * (1 + gstPercent / 100)).toFixed(2));

const getValidatedPlan = (plan: Record<string, unknown> = {}) => {
  const planId = String(plan.id || '').trim();
  const durationMonths = Number(plan.durationMonths ?? 0);

  const recruiterPlan = recruiterPlanCatalog[planId];
  if (recruiterPlan) {
    return recruiterPlan;
  }

  if (planId === 'actro_recruiter_pro' || planId === 'jobpoyt_recruiter_pro') {
    if (!recruiterPlanCatalog[`jobpoyt_recruiter_pro_${durationMonths}_month`]) {
      return null;
    }
    return recruiterPlanCatalog[`jobpoyt_recruiter_pro_${durationMonths}_month`];
  }

  const catalogPlan = candidatePlanCatalog[planId];
  if (!catalogPlan) {
    return null;
  }

  const amount = calculateGrossAmount(catalogPlan.price, catalogPlan.gstPercent);
  return {
    id: catalogPlan.name.includes('3 Months') ? 'premium_3_month' : 'premium_monthly',
    name: catalogPlan.name,
    price: catalogPlan.price,
    durationMonths: catalogPlan.durationMonths,
    gstPercent: catalogPlan.gstPercent,
    amount,
    amountInPaise: Math.round(amount * 100),
    type: 'candidate',
  };
};

const verifySignature = async (orderId: string, paymentId: string, signature: string, secret: string): Promise<boolean> => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${orderId}|${paymentId}`));
  const expected = Array.from(new Uint8Array(signed)).map((value) => value.toString(16).padStart(2, '0')).join('');
  return expected === signature;
};

const extractUserIdFromJWT = (token: string): string | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Decode the payload (second part) - don't verify, Supabase already verified it
    const decoded = JSON.parse(atob(parts[1]));
    return decoded.sub || null;
  } catch {
    return null;
  }
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!razorpayKeyId || !razorpayKeySecret || !serviceKey) return response({ error: 'Payments are not configured yet. Please contact support.' }, 503);

    // Extract authenticated user from verified JWT (verify_jwt=true already validated it)
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const userId = extractUserIdFromJWT(token);
    if (!userId) return response({ error: 'Please sign in before making a payment.' }, 401);

    const body = await request.json();
    const requestedPlanId = String(body.planId || '');
    const plan = getValidatedPlan({ id: requestedPlanId });
    if (!plan) return response({ error: 'Selected plan is unavailable.' }, 400);

    if (body.action === 'create-order') {
      const authorization = `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`;
      const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { Authorization: authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: plan.amountInPaise,
          currency: 'INR',
          receipt: `actro_${userId.slice(0, 12)}_${Date.now()}`,
          notes: {
            user_id: userId,
            plan_id: plan.id,
            duration_months: String(plan.durationMonths),
            plan_type: plan.type,
          },
        }),
      });
      if (!razorpayResponse.ok) {
        const errorText = await razorpayResponse.text().catch(() => '');
        console.error('Razorpay order creation failed', { status: razorpayResponse.status, errorText });
        return response({ error: 'Unable to create Razorpay order.' }, 502);
      }
      const order = await razorpayResponse.json();
      return response({ keyId: razorpayKeyId, orderId: order.id, amount: order.amount, currency: order.currency });
    }

    if (body.action === 'verify-payment') {
      const orderId = String(body.razorpay_order_id || '');
      const paymentId = String(body.razorpay_payment_id || '');
      const signature = String(body.razorpay_signature || '');
      const requestedPlanId = String(body.planId || '');
      const verifiedPlan = getValidatedPlan({ id: requestedPlanId });

      if (!orderId || !paymentId || !signature) {
        return response({ error: 'Incomplete Razorpay payment response.' }, 400);
      }

      if (!verifiedPlan) return response({ error: 'Selected plan is unavailable.' }, 400);

      const authorization = `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`;
      const orderLookupResponse = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`, {
        method: 'GET',
        headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      });
      if (!orderLookupResponse.ok) {
        const errorText = await orderLookupResponse.text().catch(() => '');
        console.error('Razorpay order lookup failed during verification', { status: orderLookupResponse.status, errorText });
        return response({ error: 'Unable to validate Razorpay order.' }, 502);
      }
      const razorpayOrder = await orderLookupResponse.json();
      const orderPlanId = String(razorpayOrder?.notes?.plan_id || '');
      if (orderPlanId && orderPlanId !== verifiedPlan.id) {
        return response({ error: 'Payment plan mismatch.' }, 400);
      }

      const valid = await verifySignature(orderId, paymentId, signature, razorpayKeySecret);
      if (!valid) return response({ error: 'Payment signature verification failed.' }, 400);

      const admin = createClient(supabaseUrl, serviceKey);
      const { data: existingPayment, error: paymentLookupError } = await admin
        .from('payments')
        .select('id, user_id, subscription_id, amount, status, transaction_id')
        .eq('transaction_id', paymentId)
        .maybeSingle();

      if (paymentLookupError) throw paymentLookupError;
      if (existingPayment) {
        const { data: existingSubscription } = await admin
          .from('subscriptions')
          .select('*')
          .eq('id', existingPayment.subscription_id)
          .maybeSingle();

        return response({
          id: existingPayment.id,
          transaction_id: existingPayment.transaction_id,
          amount: existingPayment.amount,
          currency: 'INR',
          status: existingPayment.status,
          subscription: existingSubscription,
          alreadyProcessed: true,
        });
      }

      const startDate = new Date();
      const expiryDate = new Date(startDate);
      expiryDate.setMonth(expiryDate.getMonth() + plan.durationMonths);

      const { error: expireError } = await admin.from('subscriptions').update({ status: 'expired' }).eq('user_id', userId).eq('status', 'active');
      if (expireError) throw expireError;

      const { data: subscription, error: subscriptionError } = await admin
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan: plan.id,
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: expiryDate.toISOString(),
          amount: plan.amount,
        })
        .select()
        .single();

      if (subscriptionError) throw subscriptionError;

      const { data: payment, error: paymentError } = await admin
        .from('payments')
        .insert({
          user_id: userId,
          subscription_id: subscription.id,
          amount: plan.amount,
          currency: 'INR',
          status: 'completed',
          method: 'razorpay',
          transaction_id: paymentId,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      const { error: updateSubscriptionError } = await admin
        .from('subscriptions')
        .update({ payment_id: payment.id })
        .eq('id', subscription.id);

      if (updateSubscriptionError) throw updateSubscriptionError;

      return response({ ...payment, subscription, alreadyProcessed: false });
    }
    return response({ error: 'Unsupported checkout action.' }, 400);
  } catch (error) {
    console.error('Razorpay checkout error:', error);
    return response({ error: 'Payment processing failed. Please try again.' }, 500);
  }
});