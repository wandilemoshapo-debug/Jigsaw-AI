require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { generateAllScripts } = require('../lib/scripts/outreach-scripts.cjs');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log('📞 Generating complete outreach scripts for all leads...');

  const { data: leads, error } = await supabase
    .from('discovered_leads')
    .select('*, website_reports(*)')
    .in('website_status', ['has_website', 'confirmed_no_website']);

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  if (!leads || leads.length === 0) {
    console.log('❌ No leads found');
    return;
  }

  console.log(`📊 Found ${leads.length} leads`);

  // Create output directory
  if (!fs.existsSync('./call-scripts')) {
    fs.mkdirSync('./call-scripts');
  }

  let total = 0;

  for (const lead of leads) {
    const report = lead.website_reports?.[0]?.report_json || null;
    const scripts = generateAllScripts(lead, report);
    
    // Save each script type to individual files
    const fileName = lead.business_name.replace(/[^a-zA-Z0-9]/g, '_');
    
    const fullScript = `
===========================================
OUTREACH SCRIPTS FOR: ${scripts.businessName}
===========================================
Generated: ${new Date().toLocaleString()}

📋 CONTACT INFO:
Phone: ${scripts.contactInfo.phone}
Email: ${scripts.contactInfo.email}
WhatsApp: ${scripts.contactInfo.whatsapp || 'Not available'}
Instagram: ${scripts.contactInfo.instagram || 'Not available'}
Facebook: ${scripts.contactInfo.facebook || 'Not available'}
LinkedIn: ${scripts.contactInfo.linkedin || 'Not available'}
Brabys: ${scripts.contactInfo.brabys || 'Not available'}

📊 WEBSITE STATUS: ${scripts.hasWebsite ? 'Has Website' : 'NO WEBSITE'}
📊 OPPORTUNITY SCORE: ${lead.confidence_score || 0}/100
📊 ISSUES: ${scripts.issueSummary}

${'='.repeat(60)}
${scripts.callScript}
${'='.repeat(60)}
${scripts.emailScript}
${'='.repeat(60)}
${scripts.dmScript}
${'='.repeat(60)}
${scripts.whatsappScript}
${'='.repeat(60)}
${scripts.linkedinScript}
${'='.repeat(60)}
${scripts.followUpScript}
${'='.repeat(60)}

===========================================
END OF SCRIPTS
===========================================
`;

    fs.writeFileSync(`call-scripts/${fileName}.txt`, fullScript);
    
    // Also save individually
    fs.writeFileSync(`call-scripts/${fileName}-call.txt`, scripts.callScript);
    fs.writeFileSync(`call-scripts/${fileName}-email.txt`, scripts.emailScript);
    fs.writeFileSync(`call-scripts/${fileName}-dm.txt`, scripts.dmScript);
    fs.writeFileSync(`call-scripts/${fileName}-whatsapp.txt`, scripts.whatsappScript);
    fs.writeFileSync(`call-scripts/${fileName}-linkedin.txt`, scripts.linkedinScript);
    
    total++;
    console.log(`✅ Generated scripts for: ${lead.business_name}`);
  }

  console.log(`\n🎉 Complete! Generated scripts for ${total} leads`);
  console.log(`📁 Scripts saved to ./call-scripts/`);
}

run().catch(console.error);