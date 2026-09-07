import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const lines = envContent.split('\n');
const supabaseUrl = lines.find(l => l.includes('VITE_SUPABASE_URL')).split('=')[1].trim();
const anonKey = lines.find(l => l.includes('VITE_SUPABASE_ANON_KEY')).split('=')[1].trim();

console.log('=== SUPABASE CLIENT DIAGNOSIS ===\n');
console.log('Supabase URL:', supabaseUrl);
console.log('Anon Key exists: YES');

// Create Supabase client exactly like the frontend does
const supabase = createClient(supabaseUrl, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

console.log('\n=== CHECKING CURRENT SESSION ===\n');

const checkSession = async () => {
  try {
    // Try to get current session
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('ERROR getting session:', error.message);
      return;
    }

    if (!data.session) {
      console.log('NO ACTIVE SESSION found');
      console.log('This means: NO user is currently signed in');
      console.log('Result: razorpayCheckout.start() would send NO Authorization header');
      console.log('\nThis is the ROOT CAUSE: Edge Function returns 401 because user is NOT signed in');
      return;
    }

    console.log('ACTIVE SESSION found:');
    console.log('  User ID:', data.session.user?.id);
    console.log('  User Email:', data.session.user?.email);
    console.log('  Access Token exists: YES');
    console.log('  Access Token length:', data.session.access_token?.length || 0);
    console.log('  Token expires at:', new Date(data.session.expires_at * 1000).toISOString());
    
    console.log('\n=== WHAT BROWSER WOULD SEND ===\n');
    console.log('Authorization header format:');
    console.log(`  Authorization: Bearer <${data.session.access_token.length} char JWT>`);
    console.log('\nThis JWT would be automatically included by supabase.functions.invoke()');
    
    console.log('\n=== TESTING FUNCTION CALL ===\n');
    
    // Now test the function call
    const payload = {
      action: 'create-order',
      planId: 'premium_monthly'
    };
    
    console.log('Calling razorpay-checkout with payload:', JSON.stringify(payload, null, 2));
    
    const { data: order, error: invokeError } = await supabase.functions.invoke('razorpay-checkout', {
      body: payload
    });
    
    if (invokeError) {
      console.log('\nFunction ERROR:');
      console.log('  Status:', invokeError.status || 'unknown');
      console.log('  Message:', invokeError.message);
    } else {
      console.log('\nFunction SUCCESS:');
      console.log('  Order ID:', order?.orderId);
      console.log('  Amount:', order?.amount);
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
};

checkSession();
