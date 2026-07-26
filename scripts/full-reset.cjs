require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fullReset() {
  console.log('🔄 Full reset and re-import...');

  // Clear all data
  console.log('🗑️ Clearing data...');
  await supabase.from('outreach_messages').delete().neq('id', 0);
  await supabase.from('website_reports').delete().neq('id', 0);
  await supabase.from('discovered_leads').delete().neq('id', 0);
  console.log('✅ Data cleared');

  // Import CSV
  console.log('📂 Importing leads...');
  execSync('node scripts/import.cjs "./brabys (1).csv"', { stdio: 'inherit' });

  // Enrich Brabys
  console.log('🔍 Enriching Brabys...');
  execSync('node scripts/enrich-brabys.cjs', { stdio: 'inherit' });

  // Analyze websites
  console.log('🌐 Analyzing websites...');
  execSync('node scripts/analyze.cjs', { stdio: 'inherit' });

  // Run evaluations
  console.log('📊 Running evaluations...');
  execSync('node scripts/run-evaluations.cjs', { stdio: 'inherit' });

  // Generate outreach
  console.log('📝 Generating outreach...');
  execSync('node scripts/outreach.cjs', { stdio: 'inherit' });

  // Generate call scripts
  console.log('📞 Generating call scripts...');
  execSync('node scripts/generate-outreach-scripts.cjs', { stdio: 'inherit' });

  console.log('🎉 Complete!');
}

fullReset();