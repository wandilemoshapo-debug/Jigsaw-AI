require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Generate scripts for HOT LEADS (No website + Active business)
 */
function generateHotLeadScripts(lead) {
  const businessName = lead.business_name || 'Your Business';
  const industry = lead.industry_category || 'business';
  const location = lead.suburb || 'your area';
  const phone = lead.phone || '';
  const email = lead.email || '';
  
  // ============================================================
  // EMAIL SCRIPT
  // ============================================================
  const emailScript = `📧 EMAIL SCRIPT — ${businessName}

Subject: Quick question about ${businessName}

Hi there,

I came across ${businessName} while looking for ${industry} in ${location} — your customers clearly rate your work.

I noticed you don't have a website yet. In South Africa, most people search Google before they call — so potential customers are going straight to competitors.

I help small businesses set up a simple, professional website that actually brings in customers.

Would you be open to a 10-minute call to see if it could work for you?

Best,
Wandile
Jigsaw AI`;

  // ============================================================
  // DM SCRIPT
  // ============================================================
  const dmScript = `💬 DM SCRIPT — ${businessName}

Hey ${businessName} Team,

I came across your business while looking for ${industry} in ${location} — you're clearly doing great work.

One thing I noticed — you don't have a website. Anyone who finds you on Google Maps and wants to learn more hits a dead end.

Would it be helpful if I showed you what a simple website could do for ${businessName}?

Wandile`;

  // ============================================================
  // WHATSAPP SCRIPT
  // ============================================================
  const whatsappScript = `💬 WHATSAPP SCRIPT — ${businessName}

Hi ${businessName} Team,

I'm Wandile from Jigsaw AI. I help small businesses in ${location} get found on Google and attract more customers.

I noticed you don't have a website yet — so when people search for ${industry} in ${location}, they can't find you.

Would you be interested in seeing what a simple, affordable website could look like for your business?

Happy to send a free concept — no obligation.

Wandile`;

  // ============================================================
  // CALL SCRIPT
  // ============================================================
  const callScript = `📞 CALL SCRIPT — ${businessName}

=== STAGE 1: OPEN THE CALL ===

"Hi, is this ${businessName}? My name is Wandile from Jigsaw AI. I came across your business while researching ${industry} in ${location}."

"I'll keep this quick — I noticed you don't have a website yet, which means you're losing customers to competitors online."

"Would it be okay if I WhatsApp you a couple of examples of what I've done for businesses like yours? Takes 2 minutes."

=== GATEKEEPER SCRIPT ===

"Hi, could I speak with the owner or the person who handles the business's marketing?"

=== OBJECTION HANDLING ===

"We're not interested"
→ "Is it more than you don't need it right now, or not sure the cost is worth it for your business?"

"Send me an email"
→ "Of course — I'll send you some examples of websites I've built for similar businesses."

=== AFTER THE CALL ===

✅ Send WhatsApp within 15 minutes
✅ Update lead status to "Proposal Stage"
✅ Send proposal within 24 hours

🔑 KEY PAIN POINTS:
• No online presence = customers can't find them
• Missing credibility = losing to competitors
• No lead generation = relying only on word of mouth
• No way for customers to contact them online

🎯 RECOMMENDED: 5-page website with contact form, WhatsApp button, and customer testimonials`;

  return {
    emailScript,
    dmScript,
    whatsappScript,
    callScript
  };
}

async function run() {
  console.log('🔥 Generating HOT LEADS scripts...');
  console.log('📌 Only for businesses with NO website (eval_opportunity_level = "🔥 Hot")\n');

  // ✅ FIXED: Get leads with eval_opportunity_level = "🔥 Hot"
  const { data: leads, error } = await supabase
    .from('discovered_leads')
    .select('*')
    .eq('eval_opportunity_level', '🔥 Hot');

  if (error) {
    console.log('❌ Error fetching leads:', error.message);
    return;
  }

  if (!leads || leads.length === 0) {
    console.log('❌ No HOT leads found!');
    return;
  }

  console.log(`🔥 Found ${leads.length} HOT LEADS (no website + active business)\n`);

  // Create output directory
  if (!fs.existsSync('./hot-leads-scripts')) {
    fs.mkdirSync('./hot-leads-scripts');
  }

  let total = 0;

  for (const lead of leads) {
    const scripts = generateHotLeadScripts(lead);
    const fileName = lead.business_name.replace(/[^a-zA-Z0-9]/g, '_');
    
    const fullScript = `
===========================================
🔥 HOT LEAD SCRIPTS
===========================================
Business: ${lead.business_name}
Industry: ${lead.industry_category || 'Unknown'}
Location: ${lead.suburb || 'Unknown'}
Phone: ${lead.phone || 'Not available'}
Email: ${lead.email || 'Not available'}
Score: ${lead.eval_opportunity_score || 0}/100
===========================================

${scripts.emailScript}

${'='.repeat(60)}

${scripts.dmScript}

${'='.repeat(60)}

${scripts.whatsappScript}

${'='.repeat(60)}

${scripts.callScript}

===========================================
🔥 PRIORITY: HIGHEST
💡 Reason: NO WEBSITE - customers can't find them online
📋 Active Signals: ${lead.eval_opportunity_score === 100 ? '✅ Brabys/Google/Facebook/Phone' : '✅ Active business'}
===========================================
`;

    // Save full script
    fs.writeFileSync(`hot-leads-scripts/${fileName}.txt`, fullScript);
    
    // Save individual scripts
    fs.writeFileSync(`hot-leads-scripts/${fileName}-email.txt`, scripts.emailScript);
    fs.writeFileSync(`hot-leads-scripts/${fileName}-dm.txt`, scripts.dmScript);
    fs.writeFileSync(`hot-leads-scripts/${fileName}-whatsapp.txt`, scripts.whatsappScript);
    fs.writeFileSync(`hot-leads-scripts/${fileName}-call.txt`, scripts.callScript);
    
    total++;
    console.log(`✅ Generated scripts for: ${lead.business_name}`);
  }

  console.log(`\n🎉 Complete! Generated scripts for ${total} HOT LEADS`);
  console.log(`📁 Scripts saved to ./hot-leads-scripts/`);
}

run().catch(console.error);