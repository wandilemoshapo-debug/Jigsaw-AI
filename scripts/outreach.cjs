require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { generateOutreachMessage } = require('../lib/ai/index.cjs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log('📝 Starting outreach generation...');

  // Get leads with score >= 55 (Hot + Warm)
  const { data: leads, error } = await supabase
    .from('discovered_leads')
    .select('*, website_reports(*)')
    .in('website_status', ['has_website', 'confirmed_no_website']);

  if (error) {
    console.log('❌ Error fetching leads:', error.message);
    return;
  }

  if (!leads || leads.length === 0) {
    console.log('✅ No leads to generate outreach for!');
    return;
  }

  // Filter leads with high scores that don't have outreach yet
  const leadsToProcess = leads.filter(l => {
    const score = l.website_reports?.[0]?.opportunity_score || 0;
    const hasMessage = l.outreach_messages && l.outreach_messages.length > 0;
    return score >= 55 && !hasMessage;
  });

  if (leadsToProcess.length === 0) {
    console.log('✅ All high-scoring leads already have outreach messages!');
    return;
  }

  console.log(`📊 Found ${leadsToProcess.length} leads for outreach`);

  let generated = 0;
  let failed = 0;

  for (const lead of leadsToProcess) {
    const report = lead.website_reports?.[0]?.report_json || null;
    const score = lead.website_reports?.[0]?.opportunity_score || 0;
    
    console.log(`\n📝 Generating outreach for: ${lead.business_name} (${score}/100)`);

    try {
      const message = await generateOutreachMessage(lead, report);

      const { error: insertError } = await supabase
        .from('outreach_messages')
        .insert({
          lead_id: lead.id,
          channel: 'email',
          message_body: message,
          status: 'draft'
        });

      if (insertError) {
        console.log(`❌ Error saving message:`, insertError.message);
        failed++;
      } else {
        generated++;
        console.log(`✅ Generated outreach for ${lead.business_name}`);
        console.log(`   📝 Preview: ${message.substring(0, 100)}...`);
      }
    } catch (err) {
      console.log(`❌ Error generating outreach:`, err.message);
      failed++;
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n🎉 Outreach generation complete!`);
  console.log(`✅ Generated: ${generated}`);
  console.log(`❌ Failed: ${failed}`);
}

run().catch(console.error);