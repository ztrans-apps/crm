const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.test' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase
    .from('security_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
    
  console.log('Error:', error);
  console.log('Data:', JSON.stringify(data, null, 2));

  const { error: insertError } = await supabase
    .from('security_events')
    .insert({
      tenant_id: '00000000-0000-0000-0000-000000000001',
      user_id: '00000000-0000-0000-0000-000000000001',
      event_type: 'brute_force',
      severity: 'high',
      ip_address: '127.0.0.1',
      details: {},
    });
  console.log('Insert error:', insertError);
}

testInsert();
