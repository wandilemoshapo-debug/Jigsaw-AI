require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { generateOutreachMessage } = require('../lib/ai/index.cjs');

// ✅ USE SERVICE ROLE KEY (bypasses RLS for scripts)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get campaign ID from command line argument
const CAMPAIGN_ID = process.argv[2] || null;

async function run() {
  if (CAMPAIGN_ID) {
    console.log(`📝 Starting outreach generation for campaign: ${CAMPAIGN_ID}`);
  } else {
    console.log('📝 Starting outreach generation for ALL leads...');
  }
  console.log('🔑 Using service role (bypasses RLS)');

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
    console.log('✅ No leads to generate outreach for!');
    return;
  }

  // Filter leads that don't have outreach messages yet
  const leadsToProcess = leads.filter(l => {
    const hasMessage = l.outreach_messages && l.outreach_messages.length > 0;
    return !hasMessage;
  });

  if (leadsToProcess.length === 0) {
    console.log('✅ All leads already have outreach messages!');
    return;
  }

  console.log(`📊 Found ${leadsToProcess.length} leads for outreach`);

  let generated = 0;
  let failed = 0;

  for (const lead of leadsToProcess) {
    // Get the report data
    let report = lead.website_reports?.[0]?.report_json || null;
    
    // If no report but has website, create a basic report
    if (!report && lead.website && lead.website_status === 'has_website') {
      report = {
        reachable: true,
        hasSSL: lead.website?.startsWith('https'),
        title: 'Website found',
        hasMetaDescription: true,
        hasViewport: true,
        mobileResponsive: true,
        hasContactPage: true,
        hasAboutPage: true,
        totalLinks: 10,
        loadTimeMs: 2000
      };
      console.log(`   ⚠️ No report found, using basic report for ${lead.business_name}`);
    }
    
    const score = lead.website_reports?.[0]?.opportunity_score || 0;
    
    console.log(`\n📝 Generating outreach for: ${lead.business_name} (Score: ${score}/100)`);
    console.log(`   📊 Website: ${lead.website || 'No website'}`);
    console.log(`   📊 Website Status: ${lead.website_status}`);
    console.log(`   📊 Report: ${report ? 'Found ✅' : 'Not found ❌'}`);

    try {
      // Pass the score to the message generator
      const message = await generateOutreachMessage(lead, report, score);

      // ✅ Insert WITHOUT user_id (service role bypasses RLS)
      const { error: insertError } = await supabase
        .from('outreach_messages')
        .insert({
          lead_id: lead.id,
          channel: 'email',
          message_body: message,
          status: 'draft',
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.log(`   ❌ Error saving:`, insertError.message);
        failed++;
      } else {
        generated++;
        console.log(`   ✅ Generated outreach for ${lead.business_name}`);
        console.log(`   📝 Preview: ${message.substring(0, 100)}...`);
      }
    } catch (err) {
      console.log(`   ❌ Error:`, err.message);
      failed++;
    }

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n🎉 Outreach generation complete!`);
  console.log(`✅ Generated: ${generated}`);
  console.log(`❌ Failed: ${failed}`);
}

run().catch(console.error);