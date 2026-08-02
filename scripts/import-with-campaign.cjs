require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Get campaign ID from command line or use default
const CAMPAIGN_ID = process.argv[2] || null;
const CSV_PATH = process.argv[3] || './brabys (1).csv';

async function importCSV() {
  console.log('📂 Importing CSV...');
  console.log(`📌 Campaign ID: ${CAMPAIGN_ID || 'None (will create new campaign)'}`);
  console.log(`📄 File: ${CSV_PATH}`);

  if (!fs.existsSync(CSV_PATH)) {
    console.log(`❌ File not found: ${CSV_PATH}`);
    return;
  }

  const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  let campaignId = CAMPAIGN_ID;
  
  // If no campaign ID, create a new campaign
  if (!campaignId) {
    const campaignName = `Import ${new Date().toLocaleDateString()}`;
    console.log(`📊 Creating new campaign: ${campaignName}`);
    
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({ 
        name: campaignName, 
        description: `Imported ${lines.length - 1} leads on ${new Date().toISOString()}`
      })
      .select()
      .single();
    
    if (campaignError) {
      console.log('❌ Error creating campaign:', campaignError.message);
      return;
    }
    
    campaignId = campaign.id;
    console.log(`✅ Created campaign: ${campaignName} (ID: ${campaignId})`);
  }

  let imported = 0;
  let failed = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const lead = {};
    
    headers.forEach((header, index) => {
      lead[header] = values[index] || null;
    });

    const leadData = {
      business_name: lead['Business Name'] || lead['Name'] || 'Unknown',
      address: lead['Address'] || lead['Street Address'] || null,
      suburb: lead['Suburb'] || lead['City'] || null,
      phone: lead['Phone'] || lead['Telephone'] || null,
      website: lead['Website'] || lead['Web Address'] || null,
      industry_category: lead['Industry'] || lead['Category'] || null,
      campaign_id: campaignId,
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
      .insert(leadData);

    if (error) {
      console.log(`❌ Failed to import ${leadData.business_name}:`, error.message);
      failed++;
    } else {
      imported++;
      console.log(`✅ Imported: ${leadData.business_name}`);
    }
  }

  console.log(`\n🎉 Import complete!`);
  console.log(`✅ Imported: ${imported}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📌 Campaign ID: ${campaignId}`);
}

importCSV().catch(console.error);