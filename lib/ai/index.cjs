// scripts/run-pipeline.js
// One command to rule them all - Import, Analyze, Score, and Outreach for any campaign

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get campaign ID and CSV file from command line
const CAMPAIGN_ID = process.argv[2];
const CSV_FILE = process.argv[3] || `brabys (${CAMPAIGN_ID}).csv`;

if (!CAMPAIGN_ID) {
  console.log('❌ Please provide a campaign ID');
  console.log('💡 Usage: node scripts/run-pipeline.js 6');
  console.log('💡 Usage with custom CSV: node scripts/run-pipeline.js 6 "my-file.csv"');
  process.exit(1);
}

console.log('🚀 STARTING FULL CAMPAIGN PIPELINE');
console.log(`📌 Campaign ID: ${CAMPAIGN_ID}`);
console.log(`📄 CSV File: ${CSV_FILE}`);
console.log('============================================\n');

async function runPipeline() {
  // Step 1: Check if campaign exists, if not create it
  console.log('📊 STEP 0: Checking campaign...');
  console.log('============================================');
  
  const { data: existingCampaign, error: checkError } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('id', CAMPAIGN_ID)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.log('❌ Error checking campaign:', checkError.message);
    process.exit(1);
  }

  if (!existingCampaign) {
    console.log(`📌 Campaign ${CAMPAIGN_ID} does not exist. Creating...`);
    const campaignName = `Campaign ${CAMPAIGN_ID}`;
    const { error: createError } = await supabase
      .from('campaigns')
      .insert({ 
        id: parseInt(CAMPAIGN_ID), 
        name: campaignName,
        description: `Imported from ${CSV_FILE} on ${new Date().toISOString()}`
      });
    
    if (createError) {
      console.log('❌ Error creating campaign:', createError.message);
      process.exit(1);
    }
    console.log(`✅ Campaign ${CAMPAIGN_ID} created: ${campaignName}`);
  } else {
    console.log(`✅ Campaign ${CAMPAIGN_ID} exists: ${existingCampaign.name}`);
  }

  // Step 2: Check if CSV exists in Downloads or current directory
  console.log('\n📊 STEP 1: Importing CSV...');
  console.log('============================================');
  
  let csvPath = CSV_FILE;
  if (!fs.existsSync(csvPath)) {
    // Try Downloads folder
    const downloadPath = `C:\\Users\\Wandile\\Downloads\\${CSV_FILE}`;
    if (fs.existsSync(downloadPath)) {
      console.log(`📄 Copying from Downloads: ${downloadPath}`);
      fs.copyFileSync(downloadPath, CSV_FILE);
      csvPath = CSV_FILE;
    } else {
      console.log(`❌ CSV file not found: ${CSV_FILE}`);
      console.log(`💡 Please place the file in the project root or Downloads folder`);
      process.exit(1);
    }
  }

  console.log(`📄 Using CSV: ${csvPath}`);

  try {
    execSync(`node scripts/import-with-campaign.cjs ${CAMPAIGN_ID} "${csvPath}"`, { stdio: 'inherit' });
  } catch (error) {
    console.log('❌ Import failed, stopping pipeline');
    process.exit(1);
  }

  // Step 3: Analyze
  console.log('\n📊 STEP 2: Analyzing websites...');
  console.log('============================================');
  try {
    execSync(`node scripts/analyze.cjs ${CAMPAIGN_ID}`, { stdio: 'inherit' });
  } catch (error) {
    console.log('❌ Analysis failed, stopping pipeline');
    process.exit(1);
  }

  // Step 4: Score
  console.log('\n📊 STEP 3: Scoring leads...');
  console.log('============================================');
  try {
    execSync(`node scripts/score.cjs ${CAMPAIGN_ID}`, { stdio: 'inherit' });
  } catch (error) {
    console.log('❌ Scoring failed, stopping pipeline');
    process.exit(1);
  }

  // Step 5: Copy scores to eval fields
  console.log('\n📊 STEP 4: Updating eval fields...');
  console.log('============================================');
  const { error: updateError } = await supabase
    .rpc('copy_scores_to_eval_fields', { campaign_id_param: CAMPAIGN_ID });
  
  if (updateError) {
    console.log('⚠️ Could not use RPC function, trying direct SQL...');
    // Direct SQL update
    const { error: directError } = await supabase
      .from('discovered_leads')
      .update({
        eval_opportunity_score: supabase.raw('wr.opportunity_score'),
        eval_opportunity_level: supabase.raw(`
          CASE
            WHEN wr.opportunity_score >= 80 THEN '🔥 Hot'
            WHEN wr.opportunity_score >= 60 THEN '🟠 Warm'
            WHEN wr.opportunity_score >= 40 THEN '🔵 Cool'
            ELSE '❄️ Cold'
          END
        `),
        eval_ai_summary: supabase.raw('wr.score_explanation')
      })
      .from('discovered_leads')
      .eq('campaign_id', CAMPAIGN_ID)
      .where('id = wr.lead_id')
      .join('website_reports wr', 'discovered_leads.id', 'wr.lead_id')
      .is('wr.opportunity_score', 'not null');
    
    if (directError) {
      console.log('❌ Error updating eval fields:', directError.message);
      console.log('💡 Please run this SQL manually:');
      console.log(`
        UPDATE discovered_leads
        SET 
          eval_opportunity_score = wr.opportunity_score,
          eval_opportunity_level = CASE
            WHEN wr.opportunity_score >= 80 THEN '🔥 Hot'
            WHEN wr.opportunity_score >= 60 THEN '🟠 Warm'
            WHEN wr.opportunity_score >= 40 THEN '🔵 Cool'
            ELSE '❄️ Cold'
          END,
          eval_ai_summary = wr.score_explanation
        FROM website_reports wr
        WHERE discovered_leads.id = wr.lead_id
          AND discovered_leads.campaign_id = '${CAMPAIGN_ID}'
          AND wr.opportunity_score IS NOT NULL;
      `);
    }
  } else {
    console.log('✅ Eval fields updated successfully');
  }

  // Step 6: Outreach
  console.log('\n📊 STEP 5: Generating outreach messages...');
  console.log('============================================');
  try {
    execSync(`node scripts/outreach.cjs ${CAMPAIGN_ID}`, { stdio: 'inherit' });
  } catch (error) {
    console.log('❌ Outreach failed, stopping pipeline');
    process.exit(1);
  }

  // Step 7: Summary
  console.log('\n📊 STEP 6: Campaign Summary');
  console.log('============================================');
  const { data: summary, error: summaryError } = await supabase
    .from('discovered_leads')
    .select('website_status, eval_opportunity_level, eval_opportunity_score, outreach_messages(id)')
    .eq('campaign_id', CAMPAIGN_ID);

  if (!summaryError && summary) {
    const total = summary.length;
    const withWebsites = summary.filter(l => l.website_status === 'has_website').length;
    const noWebsites = summary.filter(l => l.website_status === 'confirmed_no_website').length;
    const hot = summary.filter(l => l.eval_opportunity_level === '🔥 Hot').length;
    const warm = summary.filter(l => l.eval_opportunity_level === '🟠 Warm').length;
    const cool = summary.filter(l => l.eval_opportunity_level === '🔵 Cool').length;
    const withOutreach = summary.filter(l => l.outreach_messages && l.outreach_messages.length > 0).length;
    const avgScore = summary.reduce((acc, l) => acc + (l.eval_opportunity_score || 0), 0) / total;

    console.log(`📊 Campaign ${CAMPAIGN_ID} Summary:`);
    console.log(`   📝 Total Leads: ${total}`);
    console.log(`   🌐 With Websites: ${withWebsites}`);
    console.log(`   📱 No Website: ${noWebsites}`);
    console.log(`   🔥 Hot Leads: ${hot}`);
    console.log(`   🟠 Warm Leads: ${warm}`);
    console.log(`   🔵 Cool Leads: ${cool}`);
    console.log(`   📊 Avg Score: ${avgScore.toFixed(1)}/100`);
    console.log(`   📨 Outreach Generated: ${withOutreach}`);
  }

  console.log('\n🎉 FULL PIPELINE COMPLETE!');
  console.log(`✅ Campaign ${CAMPAIGN_ID} is ready to go!`);
  console.log(`🔗 View: http://localhost:3000/campaigns/${CAMPAIGN_ID}/dashboard`);
}

runPipeline().catch(console.error);