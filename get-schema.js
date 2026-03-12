const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.test' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getSchema() {
  const { data, error } = await supabase
    .from('broadcast_campaigns')
    .select('*')
    .limit(1);

  if (error) {
    if (error.code === 'PGRST204') {
      console.log('Table exists, but no rows. Unable to determine full schema without db metadata.');
      // Fallback: try inserting an invalid row to see what PostgreSQL complains about
      const { data: d2, error: e2 } = await supabase.from('broadcast_campaigns').insert({ test_fake_column: 1 });
      console.log('Error on insert:', e2);
    } else {
      console.error('Error fetching data:', error);
    }
  } else if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
  } else {
    // Empty table, do the insert trick
    const { data: d2, error: e2 } = await supabase.from('broadcast_campaigns').insert({ test_fake_column: 1 }).select();
    console.log('Error on insert:', e2);
  }
}

getSchema();
