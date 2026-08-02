require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Get campaign ID from command line
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
  const lines = fileContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  let imported = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const lead = {};
    
    headers.forEach((header, index) => {
      lead[header] = values[index] || null;
    });

    // Try to find business name from common column names
    const name = lead['Business Name'] || lead['Name'] || lead['business_name'] || lead['Company'] || 'Unknown';
    
    // Skip if name is "Unknown" or empty
    if (!name || name === 'Unknown' || name.trim() === '') {
      skipped++;
      continue;
    }

    const leadData = {
      business_name: name,
      address: lead['Address'] || lead['Street Address'] || lead['address'] || null,
      suburb: lead['Suburb'] || lead['City'] || lead['suburb'] || null,
      phone: lead['Phone'] || lead['Telephone'] || lead['phone'] || null,
      website: lead['Website'] || lead['Web Address'] || lead['website'] || null,
      email: lead['Email'] || lead['email'] || null,
      industry_category: lead['Industry'] || lead['Category'] || lead['industry_category'] || null,
      campaign_id: CAMPAIGN_ID,
      created_at: new Date().toISOString()
    };

    // Set website status
    if (leadData.website) {
      leadData.website_status = 'has_website';
    } else {
      leadData.website_status = 'confirmed_no_website';
    }

    // ✅ FIX: Use upsert to handle duplicates
    const { error } = await supabase
      .from('discovered_leads')
      .upsert(leadData, { onConflict: 'business_name' });

    if (error) {
      console.log(`❌ Failed to import ${name}:`, error.message);
      failed++;
    } else {
      imported++;
      console.log(`✅ Imported: ${name}`);
    }
  }

  console.log(`\n🎉 Import complete!`);
  console.log(`✅ Imported: ${imported}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️ Skipped (no name): ${skipped}`);
  console.log(`📌 Campaign ID: ${CAMPAIGN_ID}`);
}

importCSV().catch(console.error);