require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runFullPipeline() {
  console.log('🚀 STARTING FULL PIPELINE');
  console.log('============================================\n');

  // Step 1: Import CSV
  console.log('📂 STEP 1: Importing CSV...');
  try {
    execSync('node scripts/import.cjs "./brabys (1).csv"', { stdio: 'inherit' });
  } catch (e) {
    console.log('❌ Import failed, stopping pipeline');
    return;
  }

  // Step 2: Enrich websites
  console.log('\n🔍 STEP 2: Enriching websites...');
  try {
    execSync('node scripts/enrich-brabys.cjs', { stdio: 'inherit' });
  } catch (e) {
    console.log('⚠️ Enrichment had issues, continuing...');
  }

  // Step 3: Analyze websites
  console.log('\n🌐 STEP 3: Analyzing websites...');
  try {
    execSync('node scripts/analyze.cjs', { stdio: 'inherit' });
  } catch (e) {
    console.log('⚠️ Analysis had issues, continuing...');
  }

  // Step 4: Run evaluations
  console.log('\n📊 STEP 4: Running evaluations...');
  try {
    execSync('node scripts/run-evaluations.cjs', { stdio: 'inherit' });
  } catch (e) {
    console.log('⚠️ Evaluations had issues, continuing...');
  }

  // Step 5: Generate hot leads scripts
  console.log('\n🔥 STEP 5: Generating hot leads scripts...');
  try {
    execSync('node scripts/generate-hot-leads-scripts.cjs', { stdio: 'inherit' });
  } catch (e) {
    console.log('⚠️ Script generation had issues, continuing...');
  }

  // Step 6: Generate outreach
  console.log('\n📝 STEP 6: Generating outreach messages...');
  try {
    execSync('node scripts/outreach.cjs', { stdio: 'inherit' });
  } catch (e) {
    console.log('⚠️ Outreach had issues, continuing...');
  }

  console.log('\n============================================');
  console.log('🎉 FULL PIPELINE COMPLETE!');
  
  const { data: leads } = await supabase.from('discovered_leads').select('eval_opportunity_level');
  const counts = (leads || []).reduce((acc, l) => {
    acc[l.eval_opportunity_level] = (acc[l.eval_opportunity_level] || 0) + 1;
    return acc;
  }, {});
  
  console.log(`\n📊 LEAD SUMMARY:`);
  console.log(`🔥 Hot: ${counts['🔥 Hot'] || 0}`);
  console.log(`🟠 Warm: ${counts['🟠 Warm'] || 0}`);
  console.log(`🔵 Cool: ${counts['🔵 Cool'] || 0}`);
  console.log(`📝 Total: ${leads?.length || 0}`);
}

runFullPipeline();