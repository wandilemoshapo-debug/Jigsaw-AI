require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log('🚀 analyze.cjs started...');
console.log('📌 Campaign ID:', process.argv[2] || 'ALL');

const CAMPAIGN_ID = process.argv[2] || null;

// This ensures we re-analyze leads even if they have old reports
const FORCE_REANALYZE = true; // ✅ Set to true to override old reports

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

  let query = supabase
    .from('discovered_leads')
    .select('*, website_reports(*)')
    .in('website_status', ['has_website', 'confirmed_no_website', 'needs_review']);

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
    console.log(`\n🌐 Analyzing: ${lead.business_name}`);
    console.log(`   Website: ${lead.website || 'NO WEBSITE'}`);
    console.log(`   Website Status: ${lead.website_status}`);
    console.log(`   Has existing report: ${lead.website_reports && lead.website_reports.length > 0}`);
    console.log(`   FORCE_REANALYZE: ${FORCE_REANALYZE}`);

    // Skip if already analyzed (unless FORCE_REANALYZE is true)
    if (!FORCE_REANALYZE && lead.website_reports && lead.website_reports.length > 0) {
      console.log(`   ⏭️ Skipping (already analyzed and FORCE_REANALYZE is false)`);
      skipped++;
      continue;
    }

    // Actually analyze
    let report;
    if (lead.website && lead.website_status === 'has_website') {
      console.log(`   🧪 Running website analysis...`);
      report = await analyzeWebsite(browser, lead);
    } else {
      console.log(`   📝 No website to analyze, creating no-website report`);
      report = noWebsiteReport();
    }

    // Save the report
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
      
      // Update website status based on analysis
      let status = lead.website_status;
      if (report.no_website || !lead.website) {
        status = 'confirmed_no_website';
      } else if (report.reachable === true) {
        status = 'has_website';
      } else if (report.reachable === false) {
        status = 'needs_review';
      }
      
      const { error: updateError } = await supabase
        .from('discovered_leads')
        .update({ website_status: status })
        .eq('id', lead.id);
      
      if (updateError) {
        console.log(`   ⚠️ Error updating website_status:`, updateError.message);
      } else {
        console.log(`   ✅ Updated website_status to: ${status}`);
      }
    }
  }

  await browser.close();

  console.log(`\n🎉 Analysis complete!`);
  console.log(`✅ Analyzed: ${analyzed}`);
  console.log(`⏭️ Skipped: ${skipped}`);
}

run().catch(console.error);