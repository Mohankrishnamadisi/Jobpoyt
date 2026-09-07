import fs from 'fs';
import https from 'https';

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const lines = envContent.split('\n');
const supabaseUrl = lines.find(l => l.includes('VITE_SUPABASE_URL')).split('=')[1].trim();
const anonKey = lines.find(l => l.includes('VITE_SUPABASE_ANON_KEY')).split('=')[1].trim();

console.log('Supabase URL:', supabaseUrl);
console.log('Anon Key length:', anonKey.length);

const functionUrl = `${supabaseUrl}/functions/v1/razorpay-checkout`;
console.log('\nCalling function at:', functionUrl);

const payload = {
  action: 'create-order',
  planId: 'premium_monthly'
};

console.log('Payload:', JSON.stringify(payload, null, 2));

const url = new URL(functionUrl);

const options = {
  hostname: url.hostname,
  port: url.port,
  path: url.pathname + url.search,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(JSON.stringify(payload))
  }
};

const req = https.request(options, (res) => {
  console.log('\n--- RESPONSE ---');
  console.log('HTTP Status:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Body:');
    try {
      console.log(JSON.stringify(JSON.parse(data), null, 2));
    } catch {
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(JSON.stringify(payload));
req.end();
