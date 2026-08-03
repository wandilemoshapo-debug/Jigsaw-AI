require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CAMPAIGN_ID = process.argv[2] || null;
const CSV_PATH = process.argv[3] || './brabys (4).csv';

async function importCSV() {
  console.log('📂 Importing CSV...');
  console.log(`📌 Campaign ID: ${CAMPAIGN_ID}`);
  console.log(`📄 File: ${CSV_PATH}`);

  if (!fs.existsSync(CSV_PATH)) {
    console.log(`❌ File not found: ${CSV_PATH}`);
    return;
  }

  const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');

  let records;
  try {
    records = parse(fileContent, {
      columns: false,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });
  } catch (error) {
    console.log('❌ Error parsing CSV:', error.message);
    return;
  }

  if (records.length === 0) {
    console.log('❌ CSV is empty');
    return;
  }

  console.log(`📊 Found ${records.length - 1} data rows\n`);

  let imported = 0;
  let failed = 0;
  let websitesFound = 0;
  let brabysUrlsFound = 0;

  for (let i = 1; i < records.length; i++) {
    const values = records[i];

    const businessName = values[1] || null;
    const brabysUrl = values[2] || null;
    const location = values[3] || null;
    const industry = values[4] || null;
    const phone = values[6] || null;
    const email = values[9] || null;
    const rawWebsite = values[12] || null;
    const brabysPage = values[13] || null;

    // Debug first 5 rows
    if (i <= 5) {
      console.log(`\n📋 DEBUG Row ${i}:`);
      console.log(`   Business Name: ${businessName}`);
      console.log(`   Raw Website: ${rawWebsite}`);
      console.log(`   Phone: ${phone}`);
      console.log(`   Email: ${email}`);
    }

    if (!businessName || businessName.trim() === '') {
      continue;
    }

    // ✅ FIX: Determine if it's a real website or Brabys URL
    let realWebsite = null;
    let brabysUrlFinal = brabysUrl || brabysPage || null;

    if (rawWebsite) {
      const cleaned = rawWebsite.trim();
      // Check if it's a Brabys URL (contains brabys.com)
      if (cleaned.includes('brabys.com')) {
        // It's a Brabys URL, not a real website
        brabysUrlFinal = brabysUrlFinal || cleaned;
        console.log(`   ℹ️ ${businessName}: Brabys URL (not a real website)`);
      } else {
        // It's a real website
        realWebsite = cleaned;
        if (!realWebsite.startsWith('http://') && !realWebsite.startsWith('https://')) {
          realWebsite = 'https://' + realWebsite;
        }
        websitesFound++;
        console.log(`   ✅ ${businessName}: Real website found: ${realWebsite}`);
      }
    }

    // Parse location into suburb
    let suburb = null;
    if (location) {
      const parts = location.split(',').map(p => p.trim());
      suburb = parts[0] || null;
    }

    const leadData = {
      business_name: businessName.trim(),
      address: location || null,
      suburb: suburb,
      phone: phone || null,
      email: email || null,
      website: realWebsite || null,  // ✅ Only real websites go here
      brabys_url: brabysUrlFinal || null,  // ✅ Brabys URLs go here
      industry_category: industry || null,
      campaign_id: CAMPAIGN_ID,
      created_at: new Date().toISOString()
    };

    // Set website status based on real website
    if (leadData.website) {
      leadData.website_status = 'has_website';
    } else {
      leadData.website_status = 'confirmed_no_website';
    }

    const { error } = await supabase
      .from('discovered_leads')
      .upsert(leadData, { onConflict: 'business_name' });

    if (error) {
      console.log(`❌ Failed to import ${businessName}:`, error.message);
      failed++;
    } else {
      imported++;
      if (leadData.website) {
        console.log(`✅ Imported: ${businessName} (has real website)`);
      } else {
        console.log(`✅ Imported: ${businessName} (no real website)`);
      }
    }
  }

  console.log(`\n🎉 Import complete!`);
  console.log(`✅ Imported: ${imported}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`🌐 Real websites found: ${websitesFound}`);
  console.log(`📋 Brabys URLs found: ${brabysUrlsFound}`);
  console.log(`📌 Campaign ID: ${CAMPAIGN_ID}`);
}

importCSV().catch(console.error);