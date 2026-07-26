require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { data: leads } = await supabase
    .from('discovered_leads')
    .select('id, business_name, brabys_url')
    .eq('website_status', 'unknown');

  console.log('🔍 Unknown leads - open these in your browser:\n');
  leads.forEach((lead, i) => {
    console.log(`${i+1}. ${lead.business_name}`);
    console.log(`   URL: ${lead.brabys_url}\n`);
  });
}

run();