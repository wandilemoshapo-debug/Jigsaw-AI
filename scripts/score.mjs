// scripts/score.mjs - ES Module version
// This script calculates opportunity scores for leads.

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CAMPAIGN_ID = process.argv[2] || null;

if (!CAMPAIGN_ID) {
  console.log('❌ Please provide a campaign ID');
  console.log('💡 Usage: node scripts/score.mjs 6');
  process.exit(1);
}

console.log(`\n📊 STARTING SCORING FOR CAMPAIGN ${CAMPAIGN_ID}`);
console.log('============================================\n');

function computeScore(lead, report) {
  let score = 0;

  if (!lead.website || lead.website_status === 'confirmed_no_website') {
    return 100;
  } 
  
  if (report) {
    if (report.reachable) score += 20;
    else score += 35;
    if (report.hasSSL) score += 20;
    if (report.loadTimeMs && report.loadTimeMs < 3000) score += 10;
    else if (report.loadTimeMs && report.loadTimeMs < 5000) score += 5;
    if (report.hasContactPage) score += 10;
    if (report.hasAboutPage) score += 5;
    if (report.hasMetaDescription) score += 5;
    if (report.hasViewport) score += 10;
    if (report.totalLinks > 20) score += 5;
  }

  return Math.min(100, Math.round(score));
}

async function run() {
  try {
    const { data: leads, error } = await supabase
      .from('discovered_leads')
      .select('*, website_reports(*)')
      .in('website_status', ['has_website', 'confirmed_no_website'])
      .eq('campaign_id', CAMPAIGN_ID);

    if (error) {
      console.log('❌ Error fetching leads:', error.message);
      return;
    }

    if (!leads || leads.length === 0) {
      console.log('✅ No leads found in campaign', CAMPAIGN_ID);
      return;
    }

    console.log(`📊 Found ${leads.length} total leads`);

    const leadsToScore = leads.filter(l => 
      l.website_reports?.[0]?.opportunity_score === null || 
      l.website_reports?.[0]?.opportunity_score === undefined
    );

    if (leadsToScore.length === 0) {
      console.log('✅ All leads already scored!');
      return;
    }

    console.log(`📊 Found ${leadsToScore.length} leads to score\n`);

    let scored = 0;
    let failed = 0;

    for (const lead of leadsToScore) {
      const report = lead.website_reports?.[0]?.report_json || null;
      
      console.log(`📊 Scoring: ${lead.business_name}`);
      console.log(`   Website: ${lead.website || 'NO WEBSITE'}`);
      console.log(`   Status: ${lead.website_status}`);

      try {
        const score = computeScore(lead, report);
        console.log(`   Score: ${score}/100`);

        const { error: updateError } = await supabase
          .from('website_reports')
          .update({
            opportunity_score: score
          })
          .eq('id', lead.website_reports?.[0]?.id);

        if (updateError) {
          console.log(`   ❌ Error saving:`, updateError.message);
          failed++;
        } else {
          scored++;
          console.log(`   ✅ Saved`);
        }
      } catch (err) {
        console.log(`   ❌ Error:`, err.message);
        failed++;
      }

      console.log('');
      await new Promise(r => setTimeout(r, 500));
    }

    console.log('============================================');
    console.log(`✅ Scored: ${scored}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📌 Campaign: ${CAMPAIGN_ID}\n`);

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

run();