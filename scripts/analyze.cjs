require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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

    // Check meta description
    const metaDesc = await page.$('meta[name="description"]');
    report.hasMetaDescription = !!metaDesc;

    // Check viewport
    const viewport = await page.$('meta[name="viewport"]');
    report.hasViewport = !!viewport;

    // Count links
    const links = await page.$$('a');
    report.totalLinks = links.length;

    // Check for contact page
    const contactLinks = await page.$$('a[href*="contact"], a[href*="kontak"]');
    report.hasContactPage = contactLinks.length > 0;

    // Check for about page
    const aboutLinks = await page.$$('a[href*="about"], a[href*="oor"]');
    report.hasAboutPage = aboutLinks.length > 0;

    // Check mobile responsiveness
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

  // Get leads with website_status = 'has_website'
  const { data: leads, error } = await supabase
    .from('discovered_leads')
    .select('*, website_reports(*)')
    .eq('website_status', 'has_website');

  if (error) {
    console.log('❌ Error fetching leads:', error.message);
    return;
  }

  if (!leads || leads.length === 0) {
    console.log('✅ No leads with websites to analyze!');
    return;
  }

  // Filter out leads that already have reports
  const leadsToAnalyze = leads.filter(l => !l.website_reports || l.website_reports.length === 0);
  
  if (leadsToAnalyze.length === 0) {
    console.log('✅ All leads already analyzed!');
    return;
  }

  console.log(`📊 Found ${leadsToAnalyze.length} leads to analyze`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  let analyzed = 0;
  let failed = 0;

  for (const lead of leadsToAnalyze) {
    console.log(`\n🌐 Analyzing: ${lead.business_name}`);

    const report = await analyzeWebsite(browser, lead);

    const { error: insertError } = await supabase
      .from('website_reports')
      .insert({
        lead_id: lead.id,
        report_json: report,
        report_text: JSON.stringify(report, null, 2)
      });

    if (insertError) {
      console.log(`❌ Error saving report:`, insertError.message);
      failed++;
    } else {
      analyzed++;
      console.log(`✅ Saved report for ${lead.business_name}`);
    }

    // Small delay between requests
    await new Promise(r => setTimeout(r, 1000));
  }

  await browser.close();

  console.log(`\n🎉 Analysis complete!`);
  console.log(`✅ Analyzed: ${analyzed}`);
  console.log(`❌ Failed: ${failed}`);
}

run().catch(console.error);