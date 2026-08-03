require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { generateOpportunityExplanation } = require('../lib/ai/index.cjs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Get campaign ID from command line argument
const CAMPAIGN_ID = process.argv[2] || null;

function computeScore(lead, report) {
  let score = 0;

  // NO WEBSITE = HIGHEST OPPORTUNITY (100 points)
  if (!lead.website || lead.website_status === 'confirmed_no_website') {
    return 100;
  } 
  
  // HAS WEBSITE - check quality
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
  if (CAMPAIGN_ID) {
    console.log(`🤖 Starting AI scoring for campaign: ${CAMPAIGN_ID}`);
  } else {
    console.log('🤖 Starting AI scoring for ALL campaigns...');
  }
  console.log('📌 Provider order: OpenRouter → Groq → Ollama → Gemini');

  // ✅ Build query with optional campaign filter
  let query = supabase
    .from('discovered_leads')
    .select('*, website_reports(*)')
    .in('website_status', ['has_website', 'confirmed_no_website']);

  if (CAMPAIGN_ID) {
    console.log(`📌 Filtering to campaign: ${CAMPAIGN_ID}`);
    query = query.eq('campaign_id', CAMPAIGN_ID);
  } else {
    console.log('📌 No campaign filter (ALL leads)');
  }

  const { data: leads, error } = await query;

  if (error) {
    console.log('❌ Error fetching leads:', error.message);
    return;
  }

  if (!leads || leads.length === 0) {
    console.log('✅ No leads to score!');
    return;
  }

  // Filter leads that need scoring (no score yet)
  const leadsToScore = leads.filter(l => 
    l.website_reports?.[0]?.opportunity_score === null || 
    l.website_reports?.[0]?.opportunity_score === undefined
  );

  if (leadsToScore.length === 0) {
    console.log('✅ All leads already scored!');
    return;
  }

  console.log(`📊 Found ${leadsToScore.length} leads to score`);

  let scored = 0;
  let failed = 0;

  for (const lead of leadsToScore) {
    const report = lead.website_reports?.[0]?.report_json || null;
    
    console.log(`\n📊 Scoring: ${lead.business_name}`);
    console.log(`   Website: ${lead.website || 'NO WEBSITE'}`);
    console.log(`   Website Status: ${lead.website_status}`);
    console.log(`   Has report: ${!!report}`);

    try {
      const score = computeScore(lead, report);
      console.log(`   📊 Calculated score: ${score}/100`);
      
      const explanation = await generateOpportunityExplanation(lead, score);
      console.log(`   📝 Explanation: ${explanation}`);

      const { error: updateError } = await supabase
        .from('website_reports')
        .update({
          opportunity_score: score,
          score_explanation: explanation
        })
        .eq('id', lead.website_reports?.[0]?.id);

      if (updateError) {
        console.log(`❌ Error saving score:`, updateError.message);
        failed++;
      } else {
        scored++;
        console.log(`✅ ${lead.business_name}: ${score}/100`);
      }
    } catch (err) {
      console.log(`❌ Error scoring ${lead.business_name}:`, err.message);
      failed++;
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n🎉 Scoring complete!`);
  console.log(`✅ Scored: ${scored}`);
  console.log(`❌ Failed: ${failed}`);
}

run().catch(console.error);