require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { evaluateDigitalPresence, evaluateWebsite } = require('../lib/evaluation/index.cjs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CAMPAIGN_ID = process.argv[2] || null;

async function runEvaluations() {
  console.log('📊 Running evaluations with new criteria...');
  console.log('🔥 Hot: No website (75-100)');
  console.log('🟠 Warm: Bad/outdated website (55-74)');
  console.log('🔵 Cool: Decent website (30-54)');
  console.log('⚪ Cold: Good website (<30 - will be removed)\n');

  // ✅ FIX: Build the query with campaign filter
  let query = supabase
    .from('discovered_leads')
    .select('*, website_reports(*)')
    .in('website_status', ['has_website', 'confirmed_no_website']);

  if (CAMPAIGN_ID) {
    console.log(`📌 Filtering by campaign: ${CAMPAIGN_ID}`);
    query = query.eq('campaign_id', CAMPAIGN_ID);
  } else {
    console.log('📌 No campaign filter - evaluating ALL leads');
  }

  // ✅ FIX: Use the filtered query
  const { data: leads, error } = await query;

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  if (!leads || leads.length === 0) {
    console.log('❌ No leads found' + (CAMPAIGN_ID ? ` for campaign ${CAMPAIGN_ID}` : ''));
    return;
  }

  console.log(`📊 Found ${leads.length} leads to evaluate${CAMPAIGN_ID ? ` in campaign ${CAMPAIGN_ID}` : ''}`);

  let hot = 0, warm = 0, cool = 0, cold = 0;

  for (const lead of leads) {
    console.log(`\n📊 Evaluating: ${lead.business_name}`);
    
    let evaluationResult;

    const hasWebsite = lead.website_status === 'has_website';
    
    if (hasWebsite) {
      const report = lead.website_reports?.[0]?.report_json || null;
      evaluationResult = evaluateWebsite(lead, report);
      console.log(`   🌐 Website: ${evaluationResult.total_score}/100 (${evaluationResult.opportunity_level})`);
    } else {
      evaluationResult = evaluateDigitalPresence(lead);
      console.log(`   📱 Digital Presence: ${evaluationResult.total_score}/100 (${evaluationResult.opportunity_level})`);
    }

    if (evaluationResult.opportunity_level === '🔥 Hot') hot++;
    else if (evaluationResult.opportunity_level === '🟠 Warm') warm++;
    else if (evaluationResult.opportunity_level === '🔵 Cool') cool++;
    else cold++;

    const { error: updateError } = await supabase
      .from('discovered_leads')
      .update({
        eval_opportunity_score: evaluationResult.total_score,
        eval_opportunity_level: evaluationResult.opportunity_level || 'unknown',
        eval_ai_summary: evaluationResult.ai_summary,
        eval_missed_opportunities: evaluationResult.missed_opportunities || [],
        eval_recommended_solution: evaluationResult.recommended_solution || {},
        evaluation_type: evaluationResult.evaluation_type,
        confidence_score: evaluationResult.total_score
      })
      .eq('id', lead.id);

    if (updateError) {
      console.log(`   ❌ Error saving:`, updateError.message);
    } else {
      console.log(`   ✅ Saved: ${evaluationResult.total_score}/100`);
    }
  }

  console.log(`\n🎉 Evaluation complete!`);
  console.log(`🔥 Hot (No Website): ${hot}`);
  console.log(`🟠 Warm (Bad Website): ${warm}`);
  console.log(`🔵 Cool (Decent Website): ${cool}`);
  console.log(`⚪ Cold (Good Website - DISPOSED): ${cold}`);
}

runEvaluations().catch(console.error);