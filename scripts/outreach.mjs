// scripts/outreach.mjs - ES Module version
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
  console.log('💡 Usage: node scripts/outreach.mjs 6');
  process.exit(1);
}

console.log(`\n📝 STARTING OUTREACH FOR CAMPAIGN ${CAMPAIGN_ID}`);
console.log('============================================\n');

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
      console.log('✅ No leads found');
      return;
    }

    const leadsToProcess = leads.filter(l => {
      const hasMessage = l.outreach_messages && l.outreach_messages.length > 0;
      return !hasMessage;
    });

    if (leadsToProcess.length === 0) {
      console.log('✅ All leads already have messages!');
      return;
    }

    console.log(`📊 Found ${leadsToProcess.length} leads for outreach\n`);

    let generated = 0;
    let failed = 0;

    for (const lead of leadsToProcess) {
      const report = lead.website_reports?.[0]?.report_json || null;
      const score = lead.website_reports?.[0]?.opportunity_score || 0;
      
      console.log(`📝 Generating for: ${lead.business_name}`);
      console.log(`   Score: ${score}/100`);

      try {
        let message = `Hi there! I noticed your business needs a website.`;

        if (lead.website && (lead.website_status === 'has_website' || lead.website_status === 'needs_review')) {
          message = `Hi there! I looked at your website and noticed it could be improved.`;
        } else {
          message = `Hi there! I noticed you don't have a website yet.`;
        }

        const { error: insertError } = await supabase
          .from('outreach_messages')
          .insert({
            lead_id: lead.id,
            channel: 'email',
            message_body: message + ` (Score: ${score}/100)`,
            status: 'draft',
            created_at: new Date().toISOString()
          });

        if (insertError) {
          console.log(`   ❌ Error:`, insertError.message);
          failed++;
        } else {
          generated++;
          console.log(`   ✅ Generated`);
        }
      } catch (err) {
        console.log(`   ❌ Error:`, err.message);
        failed++;
      }

      console.log('');
      await new Promise(r => setTimeout(r, 300));
    }

    console.log('============================================');
    console.log(`✅ Generated: ${generated}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📌 Campaign: ${CAMPAIGN_ID}\n`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

run();