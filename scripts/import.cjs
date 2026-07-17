require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const Papa = require('papaparse');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CSV_PATH = process.argv[2] || './leads.csv';

// Intelligent column mapping
const COLUMN_MAP = {
  business_name: ['business name', 'name', 'company', 'business', 'organisation'],
  address: ['address', 'street address', 'location', 'full address'],
  phone: ['phone', 'phone number', 'tel', 'telephone', 'contact number', 'cell'],
  industry_category: ['category', 'industry', 'type', 'sector'],
  website: ['website', 'website url', 'url', 'web'],
  email: ['email', 'email address', 'e-mail'],
  suburb: ['suburb', 'city', 'town', 'area'],
  province: ['province', 'state', 'region'],
  brabys_url: ['more information', 'brabys url', 'profile link', 'more info', 'brabys link']
};

function findColumn(headers, aliases) {
  const lower = headers.map(h => h.trim().toLowerCase());
  for (const alias of aliases) {
    const idx = lower.indexOf(alias);
    if (idx !== -1) return headers[idx];
  }
  // Try partial matches
  for (const alias of aliases) {
    for (let i = 0; i < lower.length; i++) {
      if (lower[i].includes(alias) || alias.includes(lower[i])) {
        return headers[i];
      }
    }
  }
  return null;
}

async function run() {
  console.log(`📂 Reading CSV from: ${CSV_PATH}`);
  
  const file = fs.readFileSync(CSV_PATH, 'utf8');
  const parsed = Papa.parse(file, { header: true, skipEmptyLines: true });
  const headers = parsed.meta.fields;

  // Detect columns
  const resolved = {};
  for (const field in COLUMN_MAP) {
    resolved[field] = findColumn(headers, COLUMN_MAP[field]);
  }
  console.log('📋 Detected columns:', resolved);

  let imported = 0;
  let skipped = 0;

  for (const row of parsed.data) {
    const name = resolved.business_name ? row[resolved.business_name]?.trim() : null;
    if (!name) {
      skipped++;
      continue;
    }

    const website = resolved.website ? (row[resolved.website]?.trim() || null) : null;
    const brabysUrl = resolved.brabys_url ? (row[resolved.brabys_url]?.trim() || null) : null;
    const suburb = resolved.suburb ? row[resolved.suburb]?.trim() : null;
    const province = resolved.province ? row[resolved.province]?.trim() : null;

    // Determine website status
    let websiteStatus;
    if (website) {
      websiteStatus = 'has_website';
    } else if (brabysUrl) {
      websiteStatus = 'unknown'; // Need to check Brabys page
    } else {
      websiteStatus = 'confirmed_no_website';
    }

    const { error } = await supabase
      .from('discovered_leads')
      .upsert({
        business_name: name,
        address: resolved.address ? row[resolved.address]?.trim() : null,
        phone: resolved.phone ? row[resolved.phone]?.trim() : null,
        email: resolved.email ? row[resolved.email]?.trim() : null,
        industry_category: resolved.industry_category ? row[resolved.industry_category]?.trim() : null,
        suburb: suburb,
        province: province,
        website: website,
        brabys_url: brabysUrl,
        website_status: websiteStatus,
        discovery_sources: ['csv_import']
      }, {
        onConflict: 'business_name'
      });

    if (error) {
      console.log(`❌ Error importing ${name}:`, error.message);
      skipped++;
    } else {
      imported++;
      console.log(`✅ Imported: ${name} (${websiteStatus})`);
    }
  }

  console.log(`\n🎉 Import complete!`);
  console.log(`📊 Imported: ${imported}`);
  console.log(`⏭️ Skipped: ${skipped}`);
  console.log(`📋 Total records: ${parsed.data.length}`);
}

run().catch(console.error);