require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log('🔍 Starting Brabys enrichment...');

  // Get leads with unknown website status that have a Brabys URL
  const { data: leads } = await supabase
    .from('discovered_leads')
    .select('*')
    .eq('website_status', 'unknown')
    .not('brabys_url', 'is', null);

  if (!leads || leads.length === 0) {
    console.log('✅ No leads need Brabys enrichment!');
    return;
  }

  console.log(`📊 Found ${leads.length} leads to enrich from Brabys`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  let enriched = 0;
  let failed = 0;

  for (const lead of leads) {
    const page = await browser.newPage();
    let website = null;
    let email = null;
    let phone = null;
    let address = null;
    let description = null;

    try {
      console.log(`🌐 Visiting: ${lead.brabys_url}`);
      
      await page.goto(lead.brabys_url, {
        timeout: 15000,
        waitUntil: 'domcontentloaded'
      });

      // Wait for content
      await page.waitForTimeout(2000);

      // Extract website - look for external links
      const links = await page.$$eval('a[href*="http"]', (els) => {
        return els.map(el => el.getAttribute('href')).filter(h => 
          h && 
          !h.includes('brabys.com') && 
          !h.includes('facebook.com') &&
          !h.includes('instagram.com') &&
          !h.includes('linkedin.com')
        );
      });

      if (links && links.length > 0) {
        website = links[0];
      }

      // Extract email
      const pageText = await page.content();
      const emailMatch = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) email = emailMatch[0];

      // Extract phone
      const phoneMatch = pageText.match(/(?:\+27|0)[0-9]{9,10}/);
      if (phoneMatch) phone = phoneMatch[0];

      // Extract address
      const addressEl = await page.$('.address, .location, [class*="address"]');
      if (addressEl) {
        address = await addressEl.textContent();
        address = address.trim();
      }

      // Extract description
      const descEl = await page.$('.description, .about, [class*="description"]');
      if (descEl) {
        description = await descEl.textContent();
        description = description.trim();
      }

      // Update the lead
      const websiteStatus = website ? 'has_website' : 'confirmed_no_website';
      
      const { error } = await supabase
        .from('discovered_leads')
        .update({
          website: website || null,
          email: email || lead.email,
          phone: phone || lead.phone,
          address: address || lead.address,
          description: description || null,
          website_status: websiteStatus
        })
        .eq('id', lead.id);

      if (error) {
        console.log(`❌ Error updating ${lead.business_name}:`, error.message);
        failed++;
      } else {
        enriched++;
        console.log(`✅ ${lead.business_name}: ${website ? 'website found - ' + website : 'confirmed_no_website'}`);
      }

    } catch (error) {
      console.log(`❌ Failed to process ${lead.business_name}:`, error.message);
      failed++;
      
      // Mark as confirmed_no_website if we couldn't load the page
      await supabase
        .from('discovered_leads')
        .update({ website_status: 'confirmed_no_website' })
        .eq('id', lead.id);
    }

    await page.close();
    await new Promise(r => setTimeout(r, 1000)); // Be kind to the server
  }

  await browser.close();

  console.log(`\n🎉 Brabys enrichment complete!`);
  console.log(`✅ Enriched: ${enriched}`);
  console.log(`❌ Failed: ${failed}`);
}

run().catch(console.error);
