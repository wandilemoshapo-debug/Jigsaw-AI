require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { generateOutreachMessage } = require('../lib/ai/index.cjs');

// Use service role key for bypassing RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CAMPAIGN_ID = process.argv[2] || null;

async function run() {
  console.log('📝 Starting outreach generation...');

  // ✅ FIX: Build query with campaign filter
  let query = supabase
    .from('discovered_leads')
    .select('*, website_reports(*)')
    .in('website_status', ['has_website', 'confirmed_no_website']);

  if (CAMPAIGN_ID) {
    console.log(`📌 Filtering by campaign: ${CAMPAIGN_ID}`);
    query = query.eq('campaign_id', CAMPAIGN_ID);
  } else {
    console.log('📌 No campaign filter - processing ALL leads');
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

  console.log(`📊 Found ${leadsToProcess.length} leads for outreach${CAMPAIGN_ID ? ` in campaign ${CAMPAIGN_ID}` : ''}`);

  let generated = 0;
  let failed = 0;

  for (const lead of leadsToProcess) {
    const report = lead.website_reports?.[0]?.report_json || null;
    const score = lead.website_reports?.[0]?.opportunity_score || 0;
    
    console.log(`\n📝 Generating outreach for: ${lead.business_name} (Score: ${score}/100)`);

    try {
      // ✅ FIX: Pass lead, report, and score to generate personalized message
      const message = await generateOutreachMessage(lead, report, score);

      // ✅ FIX: Replace "Wandile" with "Jigsaw Studios" and add contact details
      const finalMessage = message
        .replace(/Wandile/g, 'Jigsaw Studios')
        .replace(/Jigsaw AI/g, 'Jigsaw Studios')
        .replace(/Best,\nWandile/g, 'Best,\nJigsaw Studios\nhello@jigsaw-studios.co.za\n069 869 7035')
        .replace(/Best,\nWandile/g, 'Best,\nJigsaw Studios\nhello@jigsaw-studios.co.za\n069 869 7035');

      const { error: insertError } = await supabase
        .from('outreach_messages')
        .insert({
          lead_id: lead.id,
          channel: 'email',
          message_body: finalMessage,
          status: 'draft'
        });

      if (insertError) {
        console.log(`   ❌ Error saving:`, insertError.message);
        failed++;
      } else {
        generated++;
        console.log(`   ✅ Generated outreach for ${lead.business_name}`);
        console.log(`   📝 Preview: ${finalMessage.substring(0, 100)}...`);
      }
    } catch (err) {
      console.log(`   ❌ Error:`, err.message);
      failed++;
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n🎉 Outreach generation complete!`);
  console.log(`✅ Generated: ${generated}`);
  console.log(`❌ Failed: ${failed}`);
  if (CAMPAIGN_ID) {
    console.log(`📁 Campaign: ${CAMPAIGN_ID}`);
  }
}

run().catch(console.error);