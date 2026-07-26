require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CAMPAIGN_ID = process.argv[2] || null;

async function analyzeWebsite(browser, lead) {
  const page = await browser.newPage();
  let report = {
    no_website: false,
    reachable: false,
    loadTimeMs: null,
    hasSSL: false,
    title: null,
    hasMetaDescription: false,
    hasViewport: false,
    totalLinks: 0,
    hasContactPage: false,
    hasAboutPage: false,
    mobileResponsive: false
  };

  try {
    console.log(`   ⏳ Loading: ${lead.website}`);
    const start = Date.now();
    const response = await page.goto(lead.website, {
      timeout: 15000,
      waitUntil: 'networkidle'
    });
    
    report.loadTimeMs = Date.now() - start;
    report.reachable = response && response.ok();
    report.hasSSL = lead.website.startsWith('https');
    report.title = await page.title();

    const metaDesc = await page.$('meta[name="description"]');
    report.hasMetaDescription = !!metaDesc;

    const viewport = await page.$('meta[name="viewport"]');
    report.hasViewport = !!viewport;

    const links = await page.$$('a');
    report.totalLinks = links.length;

    const contactLinks = await page.$$('a[href*="contact"], a[href*="kontak"]');
    report.hasContactPage = contactLinks.length > 0;

    const aboutLinks = await page.$$('a[href*="about"], a[href*="oor"]');
    report.hasAboutPage = aboutLinks.length > 0;

    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    const mobileContent = await page.content();
    report.mobileResponsive = mobileContent.length > 1000;

    await page.close();
    console.log(`   ✅ Loaded in ${report.loadTimeMs}ms`);
    return report;

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    report.reachable = false;
    await page.close();
    return report;
  }
}

function noWebsiteReport() {
  return {
    no_website: true,
    google_business_profile_only: true,
    no_online_booking: true,
    no_online_enquiries: true,
    no_online_catalogue: true,
    reachable: false,
    loadTimeMs: null,
    hasSSL: false,
    title: null,
    hasMetaDescription: false,
    hasViewport: false,
    totalLinks: 0,
    hasContactPage: false,
    hasAboutPage: false,
    mobileResponsive: false
  };
}

async function run() {
  console.log('🔍 Starting website analysis...');

  // ✅ FIX: Only get leads from the specified campaign
  let query = supabase
    .from('discovered_leads')
    .select('*, website_reports(*)')
    .in('website_status', ['has_website', 'confirmed_no_website']);

  if (CAMPAIGN_ID) {
    console.log(`📌 Analyzing only campaign: ${CAMPAIGN_ID}`);
    query = query.eq('campaign_id', CAMPAIGN_ID);
  } else {
    console.log('📌 Analyzing ALL campaigns (no campaign filter)');
  }

  const { data: leads, error } = await query;

  if (error) {
    console.log('❌ Error fetching leads:', error.message);
    return;
  }

  if (!leads || leads.length === 0) {
    console.log('✅ No leads to analyze!');
    return;
  }

  console.log(`📊 Found ${leads.length} leads to analyze`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  let analyzed = 0;
  let skipped = 0;

  for (const lead of leads) {
    // Skip if already analyzed
    if (lead.website_reports && lead.website_reports.length > 0) {
      skipped++;
      continue;
    }

    console.log(`\n🌐 Analyzing: ${lead.business_name}`);

    const report = lead.website_status === 'has_website' 
      ? await analyzeWebsite(browser, lead)
      : noWebsiteReport();

    const { error: insertError } = await supabase
      .from('website_reports')
      .insert({
        lead_id: lead.id,
        report_json: report,
        report_text: JSON.stringify(report, null, 2)
      });

    if (insertError) {
      console.log(`   ❌ Error saving report:`, insertError.message);
    } else {
      analyzed++;
      console.log(`   ✅ Saved report`);
    }
  }

  await browser.close();

  console.log(`\n🎉 Analysis complete!`);
  console.log(`✅ Analyzed: ${analyzed}`);
  console.log(`⏭️ Skipped (already analyzed): ${skipped}`);
}

run().catch(console.error);