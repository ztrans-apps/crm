const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.test' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getSchema() {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .limit(1);

  if (error) {
    if (error.code === 'PGRST204') {
      const { data: d2, error: e2 } = await supabase.from('messages').insert({ test_fake_column: 1 }).select();
      console.log('Error on insert:', e2);
    } else {
      console.error('Error fetching data:', error);
    }
  } else if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
    console.log('Row:', data[0]);
  } else {
    const { data: d2, error: e2 } = await supabase.from('messages').insert({ test_fake_column: 1 }).select();
    console.log('Error on insert:', e2);
  }
}

getSchema();
