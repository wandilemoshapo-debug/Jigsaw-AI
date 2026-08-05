// scripts/import-with-campaign.cjs
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CAMPAIGN_ID = process.argv[2] || null;
const CSV_PATH = process.argv[3] || './brabys (7).csv';

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

  for (let i = 1; i < records.length; i++) {
    const values = records[i];

    // Skip empty rows
    if (!values || values.length < 5) continue;

    // Map columns based on the CSV structure
    const businessName = values[1] || null;      // Column 2: Business Name
    const brabysUrl = values[2] || null;         // Column 3: Brabys URL
    const location = values[3] || null;          // Column 4: Location
    const industry = values[6] || null;          // Column 7: Industry
    const phone = values[8] || null;             // ✅ Column 9: Phone Number
    const email = values[10] || null;            // ✅ Column 11: Email Address

    // Website detection - check column 12 or 13
    let website = null;
    // Check column 12 (index 12) first
    if (values[12] && values[12].includes('http') && !values[12].includes('brabys.com')) {
      website = values[12];
    }
    // If not found, check column 13 (index 13)
    if (!website && values[13] && values[13].includes('http') && !values[13].includes('brabys.com')) {
      website = values[13];
    }

    if (website) {
      websitesFound++;
      website = website.trim();
      if (!website.startsWith('http://') && !website.startsWith('https://')) {
        website = 'https://' + website;
      }
    }

    // Debug first 5 rows
    if (i <= 5) {
      console.log(`\n📋 DEBUG Row ${i}:`);
      console.log(`   Business Name: ${businessName}`);
      console.log(`   Phone: ${phone}`);
      console.log(`   Email: ${email}`);
      console.log(`   Website: ${website || 'NO WEBSITE'}`);
      console.log(`   Brabys URL: ${brabysUrl}`);
    }

    if (!businessName || businessName.trim() === '') {
      continue;
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
      website: website || null,
      brabys_url: brabysUrl || null,
      industry_category: industry || null,
      campaign_id: CAMPAIGN_ID,
      created_at: new Date().toISOString()
    };

    // Set website status
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
  console.log(`📌 Campaign ID: ${CAMPAIGN_ID}`);
}

importCSV().catch(console.error);