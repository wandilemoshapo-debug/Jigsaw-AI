const { supabase } = require('../../lib/supabase.cjs');

/**
 * Generate all outreach scripts for a business
 */
function generateAllScripts(lead, report) {
  const hasWebsite = lead.website && lead.website_status === 'has_website';
  const businessName = lead.business_name || 'your business';
  const industry = lead.industry_category || 'business';
  const location = lead.suburb || 'your area';
  const phone = lead.phone || '(no phone listed)';
  const email = lead.email || '(no email listed)';
  const website = lead.website || 'No website';
  const brabysUrl = lead.brabys_url || '';
  
  // Extract contact info
  const contactInfo = {
    phone: phone,
    email: email,
    whatsapp: lead.whatsapp_number || phone,
    instagram: lead.instagram_handle || null,
    facebook: lead.facebook_url || null,
    linkedin: lead.linkedin_url || null,
    brabys: brabysUrl
  };

  // Determine issue severity for website leads
  let websiteIssues = [];
  if (hasWebsite && report) {
    if (!report.reachable) websiteIssues.push('Website is not reachable');
    if (!report.hasSSL) websiteIssues.push('No SSL certificate - not secure');
    if (report.loadTimeMs && report.loadTimeMs > 4000) websiteIssues.push(`Slow loading: ${report.loadTimeMs}ms (should be under 3000ms)`);
    if (!report.hasViewport) websiteIssues.push('Not mobile-friendly');
    if (!report.hasContactPage) websiteIssues.push('No contact page found');
    if (!report.hasAboutPage) websiteIssues.push('No about page found');
    if (!report.hasMetaDescription) websiteIssues.push('Missing meta description for SEO');
  }

  const mainIssue = hasWebsite && websiteIssues.length > 0 ? websiteIssues[0] : 'No website';
  const issueSummary = hasWebsite ? (websiteIssues.slice(0, 3).join('; ') || 'Needs improvement') : 'No website found';

  // ============================================================
  // CALL SCRIPT (Day 14 & 18)
  // ============================================================
  const callScript = `
📞 CALL SCRIPT — ${businessName}

📋 BUSINESS INFO:
• Name: ${businessName}
• Industry: ${industry}
• Location: ${location}
• Phone: ${contactInfo.phone}
• Email: ${contactInfo.email}
• WhatsApp: ${contactInfo.whatsapp || 'Not available'}
• Website: ${hasWebsite ? website : 'NO WEBSITE'}
• Brabys: ${brabysUrl || 'N/A'}

🎯 OPPORTUNITY SCORE: ${lead.confidence_score || 0}/100

=== STAGE 1: OPEN THE CALL (1-2 min) ===

"Hi, is this ${businessName}? My name is Wandile from Jigsaw AI."

"I came across your business while researching ${industry} companies in ${location}."

"I'll keep this quick — I noticed ${hasWebsite ? 'a few issues with your website that are probably costing you customers' : 'you don\'t have a website yet, which means you\'re losing customers to competitors online'}."

"Would it be okay if I WhatsApp you a couple of examples of what I've done for businesses like yours? Takes 2 minutes."

➡️ IF YES: "Perfect — what's the best number? I'll send it right now."
➡️ IF NOT NOW: "No problem — when is a better time to reach you?"

=== STAGE 2: BUSINESS QUESTIONS (3-4 min) ===

"Tell me about ${businessName} — what do you do and who are your main customers?"

"How long have you been running the business?"

"How do most of your new customers find you right now — word of mouth, social media, or something else?"

${hasWebsite ? '"How is your website performing for you currently?"' : '"Have you ever had a customer tell you they found a competitor online instead of you?"'}

=== STAGE 3: WEBSITE QUESTIONS (3-4 min) ===

${hasWebsite ? `
"On a scale of 1 to 10, how happy are you with your current website?"

"What do you feel it's missing?"

"Have you noticed any issues with getting enquiries or phone calls from your website?"

"${mainIssue ? `I noticed ${mainIssue} — have you noticed that too?` : 'Are you happy with how it looks on mobile?'}"
` : `
"What has stopped you from getting a website until now?"

"When someone searches for ${industry} in ${location} on Google — do you know if they can find you?"

"Have you ever lost a customer to a competitor who had a better online presence?"
`}

=== STAGE 4: RESULTS QUESTIONS (2-3 min) ===

"If you had a great website bringing in regular enquiries — what would that mean for your business over the next 6 months?"

"What would an extra 3-5 new customers per month mean for your revenue?"

"Is that something that would make a real difference for you?"

=== STAGE 5: PRESENT THE PROBLEM (1-2 min) ===

"Based on everything you've told me — here's what I'm hearing:"

"${businessName} is doing great work in ${location}, but ${hasWebsite ? 'your website isn\'t working as hard as it could be. ' + (mainIssue ? 'The main issue is ' + mainIssue.toLowerCase() + '.' : 'It\'s not bringing in enough customers.') : 'the people who need you most can\'t find you online. There\'s no clear place for them to go, no way to see your work, and no easy way to contact you.'}"

"Does that sound right?"

=== STAGE 6: PERMISSION TO PITCH ===

"Based on what you've described — would it be helpful if I showed you exactly what I'd ${hasWebsite ? 'improve on your website' : 'build for ' + businessName}?"

=== STAGE 7: PRESENT THE SOLUTION (3-5 min) ===

"Here's what I can do for you:"

"${hasWebsite ? 'I can redesign your website to be faster, more mobile-friendly, and set up to convert visitors into customers. I can fix ' + (mainIssue ? mainIssue.toLowerCase() : 'the issues we discussed') + ' and add everything we talked about.' : 'I build professional websites specifically for ${industry} businesses. Your site would be mobile-friendly, fast, and set up so that when someone searches for ${industry} in ${location}, they find you — not your competitors.'}"

"Based on what you've described, I would recommend the ${hasWebsite ? 'Redesign package at R3,500' : 'Standard package at R3,000'}. That gives you ${hasWebsite ? 'a full redesign, mobile optimization, and everything we talked about' : 'a full 3-5 page site, mobile-ready, with everything we talked about'}."

"To get started, I just need a 50% deposit of ${hasWebsite ? 'R1,750' : 'R1,500'} — and we can have your site live within 7-10 business days."

⏰ REMEMBER: After you quote the price — STOP TALKING. Wait for them to respond.

=== GATEKEEPER SCRIPT ===

"Hi, could I speak with the owner or the person who handles the business's website?"

➡️ IF ASKED: "Sure — my name is Wandile. I noticed something about ${businessName}'s website the owner would want to know about. Is [he/she] available?"

=== OBJECTION HANDLING ===

➡️ "We already have a website"
→ "I checked it before calling — ${mainIssue ? 'it ' + mainIssue.toLowerCase() : 'I noticed a few issues that could be fixed'}. Would you be open to a 10-minute look together?"

➡️ "We're not interested"
→ "Is it more than you don't need it right now, or not sure the cost is worth it for your business?"

➡️ "Send me an email"
→ "Of course — do you have a website currently, or starting from scratch? That way I can tailor what I send."

=== AFTER THE CALL ===

✅ Send WhatsApp within 15 minutes: "Great speaking with you! I'll send the proposal shortly."
✅ Update lead status to "Proposal Stage"
✅ Send proposal within 24 hours
✅ Continue outreach — 10+ new messages

🔑 KEY PAIN POINTS TO ADDRESS:
${hasWebsite ? websiteIssues.map(i => `• ${i}`).join('\n') : '• No online presence = customers can\'t find them\n• Missing credibility = losing to competitors with websites\n• No lead generation = relying only on word of mouth'}
`;

  // ============================================================
  // EMAIL SCRIPT (Day 13)
  // ============================================================
  const emailSubject = hasWebsite ? 
    `[${businessName}] is losing customers on mobile` :
    `Quick question about ${businessName}'s website`;

  const emailScript = `
📧 EMAIL SCRIPT — ${businessName}

📧 SUBJECT: ${emailSubject}

Hi ${businessName} Team,

${hasWebsite ? `
I came across ${businessName} while looking for ${industry} in ${location} — your reviews are really impressive.

I had a look at your website and noticed a few issues:
${websiteIssues.slice(0, 4).map(i => `→ ${i}`).join('\n')}

Each of these is fixable. I'd love to show you what an updated version could look like — free, no obligation.

Would you be open to a 10-minute call to discuss?

Wandile
Jigsaw AI
` : `
I came across ${businessName} while searching for ${industry} in ${location}. Your listing stood out — clearly people rate your work.

I noticed you don't have a website. In SA, most people search Google before they call — so potential customers go straight to competitors.

I help small businesses set up a simple, professional website affordably.

Open to a 10-minute call to see if it could work?

Wandile
Jigsaw AI
`}

📌 EMAIL SENDING RULES:
• Under 200 words
• One clear call-to-action
• Send Tue-Thu, 8-11am
• Max 20-30 cold emails per day
`;

  // ============================================================
  // DM SCRIPT (Day 11)
  // ============================================================
  const dmScript = `
💬 DM SCRIPT — ${businessName}

📱 INSTAGRAM DM — ${hasWebsite ? 'BAD WEBSITE' : 'NO WEBSITE'}

${hasWebsite ? `
Hey ${businessName} Team,

I came across ${businessName} while looking for ${industry} in ${location}. Quick observation — I checked your website and ${mainIssue ? 'it ' + mainIssue.toLowerCase() : 'it needs some improvements'}.

In SA, over 80% of people browse on their phones — so you're probably losing customers without realising.

I help small businesses fix exactly this.

Would you be open to a quick look at what's wrong?

Wandile
` : `
Hey ${businessName} Team,

I came across ${businessName} while looking for ${industry} in ${location} — ${contactInfo.instagram ? 'your Instagram is really impressive' : 'your listings look great'}.

One thing I noticed — you don't have a website. Anyone who finds you on Google Maps and wants to learn more hits a dead end.

Would it be helpful if I showed you what a simple site could do for ${businessName}?

Wandile
`}

📌 INSTAGRAM/FACEBOOK DM RULES:
• 3-Part Formula: Hook → Pain → One Question
• Personalise with specific observation
• Don't pitch price
• Just open the conversation
`;

  // ============================================================
  // WHATSAPP SCRIPT (Day 12)
  // ============================================================
  const whatsappScript = `
💬 WHATSAPP SCRIPT — ${businessName}

📱 WHATSAPP — ${hasWebsite ? 'HAS WEBSITE (Issue)' : 'NO WEBSITE'}

Hi ${businessName} Team, I got your number from ${brabysUrl ? 'your Brabys listing' : 'your Google listing'}.

My name is Wandile from Jigsaw AI. I help small businesses in ${location} build professional websites that show up on Google.

${hasWebsite ? `
I noticed your website ${mainIssue ? 'has an issue: ' + mainIssue.toLowerCase() : 'needs some improvements'}.

Would you be interested in seeing what a simple, affordable redesign could look like for your business?

Happy to send a free concept — no obligation.
` : `
I noticed ${businessName} doesn't have a website yet.

Would you be interested in seeing what a simple, affordable website could look like for your business?

Happy to send a free concept — no obligation.
`}

📌 WHATSAPP RULES:
• Only use if number is PUBLIC (Google listing, Facebook page, Instagram bio)
• Don't cold-message without a public number
• Keep it personal and professional
`;

  // ============================================================
  // LINKEDIN SCRIPT (Day 12)
  // ============================================================
  const linkedinScript = `
💼 LINKEDIN SCRIPT — ${businessName}

🤝 LINKEDIN — CONNECTION REQUEST

Hi ${businessName} Team, I noticed you work in ${industry} in ${location}.

I help local ${industry} businesses get more clients through better web presence.

Would love to connect.

— Wandile

💬 LINKEDIN — FIRST MESSAGE AFTER CONNECTING

Hi ${businessName} Team, thanks for connecting.

I work with small businesses in South Africa to help them show up on Google and convert website visitors into paying clients.

${hasWebsite ? `
I noticed your website ${mainIssue ? 'has an issue: ' + mainIssue.toLowerCase() : 'could be improved'}. A professional website makes a big difference.

Would you be open to a quick 10-minute conversation?
` : `
I noticed ${businessName} doesn't have a strong web presence yet. A professional website makes a big difference — especially when people Google you before they call.

Would you be open to a quick 10-minute conversation?
`}

Best, Wandile

📌 LINKEDIN RULES:
• Talk about leads, visibility, credibility, conversions
• Not just "great-looking website"
• Keep connection request short
`;

  // ============================================================
  // FOLLOW-UP SCRIPTS (Day 13)
  // ============================================================
  const followUpScript = `
📨 FOLLOW-UP SCRIPTS — ${businessName}

📧 EMAIL #2 — BAD WEBSITE (if they have one)

Subject: ${businessName} is losing customers on mobile

Hi ${businessName} Team,

I had a look at ${businessName}'s website and noticed a few issues:
${websiteIssues.slice(0, 3).map(i => `→ ${i}`).join('\n')}

Each of these is fixable. I'd love to show you what an updated version could look like — free, no obligation.

Wandile

---

📧 EMAIL #3 — FREE CONCEPT (if they responded)

Subject: Free website concept I made for ${businessName}

Hi ${businessName} Team,

I put together a free website concept for ${businessName} using your branding and a few ideas I had.

No strings attached — I just want to show you what your business could look like online.

If you like it and want to move forward, great. If not, keep the ideas.

Would you like me to send it through?

Wandile

---

📱 LINKEDIN — NO WEBSITE ON PROFILE

Hi ${businessName} Team,

Quick one — I checked your LinkedIn and couldn't find a website for ${businessName}. Potential clients Google you before making contact. If you don't show up cleanly, you're losing business to someone who does.

I specialise in professional websites for ${industry}.

Worth a 10-minute call this week?

Wandile
`;

  return {
    businessName,
    contactInfo,
    hasWebsite,
    issueSummary,
    websiteIssues,
    callScript,
    emailScript,
    dmScript,
    whatsappScript,
    linkedinScript,
    followUpScript
  };
}

module.exports = { generateAllScripts };