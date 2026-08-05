// scripts/convert-csv.cjs
// Converts Brabys CSV to normalized format for Jigsaw AI

const fs = require('fs');
const { parse } = require('csv-parse/sync');

const INPUT_FILE = process.argv[2] || './brabys (7).csv';
const OUTPUT_FILE = process.argv[3] || './brabys-normalized.csv';

console.log('🔄 Converting CSV to normalized format...');
console.log(`📄 Input: ${INPUT_FILE}`);
console.log(`📄 Output: ${OUTPUT_FILE}`);

const fileContent = fs.readFileSync(INPUT_FILE, 'utf-8');

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
  process.exit(1);
}

console.log(`📊 Found ${records.length - 1} data rows\n`);

const normalized = [];
let withWebsite = 0;
let withoutWebsite = 0;

// Skip header row (row 0)
for (let i = 1; i < records.length; i++) {
  const values = records[i];
  if (!values || values.length < 5) continue;

  const businessName = values[1] || null;
  const brabysUrl = values[2] || null;
  const location = values[3] || null;
  const industry = values[4] || null;
  const phone = values[6] || null;
  const email = values[9] || null;

  // ✅ SMART WEBSITE DETECTION - search ALL columns after index 11
  let website = null;
  for (let col = 11; col < values.length; col++) {
    const value = values[col];
    if (!value) continue;
    const text = value.trim();
    // Check if it's a real website (http) and NOT brabys.com
    if (text.startsWith('http') && !text.includes('brabys.com')) {
      website = text;
      break;
    }
  }

  const website_status = website ? 'has_website' : 'confirmed_no_website';
  
  if (website) withWebsite++;
  else withoutWebsite++;

  normalized.push({
    business_name: businessName,
    brabys_url: brabysUrl,
    location: location,
    industry: industry,
    phone: phone,
    email: email,
    website: website,
    website_status: website_status
  });
}

// Write normalized CSV
const header = 'business_name,brabys_url,location,industry,phone,email,website,website_status';
const rows = normalized.map(b => 
  `"${b.business_name || ''}","${b.brabys_url || ''}","${b.location || ''}","${b.industry || ''}","${b.phone || ''}","${b.email || ''}","${b.website || ''}","${b.website_status || ''}"`
);

fs.writeFileSync(OUTPUT_FILE, [header, ...rows].join('\n'));

console.log(`\n🎉 Conversion complete!`);
console.log(`✅ Total leads: ${normalized.length}`);
console.log(`🌐 With websites: ${withWebsite}`);
console.log(`📱 Without websites: ${withoutWebsite}`);
console.log(`📄 Saved to: ${OUTPUT_FILE}`);