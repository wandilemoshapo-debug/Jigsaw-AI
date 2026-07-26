require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const Papa = require('papaparse');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CSV_PATH = process.argv[2] || './leads.csv';
const CAMPAIGN_ID = process.argv[3] || null;

// ✅ UPDATED: Special mapping for Brabys CSV format
function parseBrabysRecord(row) {
  // Extract business name (text-lg column)
  const businessName = row['text-lg']?.trim() || '';
  
  // Extract address (pt-2 column)
  const address = row['pt-2']?.trim() || '';
  
  // Extract category (text-black column)
  const category = row['text-black']?.trim() || '';
  
  // Extract phone (contactItem column)
  const phone = row['contactItem']?.trim() || '';
  
  // Extract email (contactItem 2 column)
  const email = row['contactItem 2']?.trim() || '';
  
  // Extract Brabys URL (text-lg href column)
  const brabysUrl = row['text-lg href']?.trim() || '';
  
  // Extract website (text-white href column - may contain a website or Brabys link)
  let website = row['text-white href']?.trim() || '';
  // If the website is a Brabys link, it's not a real website
  if (website && website.includes('brabys.com')) {
    website = null;
  }
  
  // Try to find a real website from the "Visit Website" link
  // Sometimes it's in the 'text-white href' column
  if (!website) {
    // Check if there's a "Visit Website" link
    const visitWebsite = row['text-white']?.trim() || '';
    if (visitWebsite && visitWebsite.includes('Visit Website')) {
      const websiteLink = row['text-white href']?.trim() || '';
      if (websiteLink && !websiteLink.includes('brabys.com')) {
        website = websiteLink;
      }
    }
  }

  // Extract suburb from address
  let suburb = '';
  let province = '';
  if (address) {
    const parts = address.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      suburb = parts[parts.length - 2] || '';
      province = parts[parts.length - 1] || '';
    } else if (parts.length === 1) {
      suburb = parts[0];
    }
  }

  // Determine website status
  let websiteStatus;
  if (website) {
    websiteStatus = 'has_website';
  } else if (brabysUrl) {
    websiteStatus = 'unknown';
  } else {
    websiteStatus = 'confirmed_no_website';
  }

  return {
    business_name: businessName || 'Unknown Business',
    address: address || null,
    phone: phone || null,
    email: email || null,
    website: website || null,
    brabys_url: brabysUrl || null,
    category: category || null,
    suburb: suburb || null,
    province: province || null,
    website_status: websiteStatus
  };
}

async function run() {
  console.log(`📂 Reading CSV from: ${CSV_PATH}`);
  
  if (!fs.existsSync(CSV_PATH)) {
    console.log(`❌ File not found: ${CSV_PATH}`);
    console.log('💡 Usage: node scripts/import.cjs ./your-file.csv [campaign_id]');
    return;
  }

  // Check if campaign exists
  if (CAMPAIGN_ID) {
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('id, name, is_archived')
      .eq('id', CAMPAIGN_ID)
      .single();
    
    if (error || !campaign) {
      console.log(`❌ Campaign with ID ${CAMPAIGN_ID} not found`);
      return;
    }
    
    if (campaign.is_archived || campaign.status === 'archived') {
      console.log(`❌ Campaign "${campaign.name}" is archived and read-only`);
      return;
    }
    
    console.log(`📌 Importing into campaign: ${campaign.name} (ID: ${campaign.id})`);
  } else {
    console.log('⚠️ No campaign specified. Leads will be imported without a campaign.');
  }
  
  const file = fs.readFileSync(CSV_PATH, 'utf8');
  const parsed = Papa.parse(file, { header: true, skipEmptyLines: true });
  const records = parsed.data;

  if (!records || records.length === 0) {
    console.log('❌ No records found in CSV');
    return;
  }

  console.log(`📊 Found ${records.length} records`);

  let imported = 0;
  let skipped = 0;
  let updated = 0;

  for (const row of records) {
    // Skip empty rows
    const hasContent = Object.values(row).some(val => val && val.trim());
    if (!hasContent) {
      skipped++;
      continue;
    }

    // Parse the Brabys record
    const biz = parseBrabysRecord(row);
    
    if (!biz.business_name || biz.business_name === 'Unknown Business') {
      skipped++;
      continue;
    }

    // Check if business already exists
    const { data: existing } = await supabase
      .from('discovered_leads')
      .select('id, campaign_id')
      .eq('business_name', biz.business_name)
      .maybeSingle();

    const leadData = {
      business_name: biz.business_name,
      address: biz.address,
      phone: biz.phone,
      email: biz.email,
      website: biz.website,
      brabys_url: biz.brabys_url,
      industry_category: biz.category,
      suburb: biz.suburb,
      province: biz.province,
      website_status: biz.website_status,
      campaign_id: CAMPAIGN_ID || null,
      discovery_sources: ['brabys_csv_import'],
      updated_at: new Date().toISOString()
    };

    if (existing) {
      // Update existing lead
      const { error } = await supabase
        .from('discovered_leads')
        .update({
          ...leadData,
          campaign_id: CAMPAIGN_ID || existing.campaign_id
        })
        .eq('id', existing.id);

      if (error) {
        console.log(`❌ Error updating ${biz.business_name}:`, error.message);
        skipped++;
      } else {
        updated++;
        console.log(`🔄 Updated: ${biz.business_name}`);
      }
    } else {
      // Insert new lead
      const { error } = await supabase
        .from('discovered_leads')
        .insert({
          ...leadData,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.log(`❌ Error importing ${biz.business_name}:`, error.message);
        skipped++;
      } else {
        imported++;
        console.log(`✅ Imported: ${biz.business_name}`);
        if (biz.website) console.log(`   🌐 Website: ${biz.website}`);
        if (biz.phone) console.log(`   📞 Phone: ${biz.phone}`);
        if (biz.email) console.log(`   ✉️ Email: ${biz.email}`);
      }
    }
  }

  console.log(`\n🎉 Import complete!`);
  console.log(`📊 Imported: ${imported}`);
  console.log(`🔄 Updated: ${updated}`);
  console.log(`⏭️ Skipped: ${skipped}`);
  console.log(`📋 Total records: ${records.length}`);
  console.log(`📁 Campaign ID: ${CAMPAIGN_ID || 'None'}`);
}

run().catch(console.error);