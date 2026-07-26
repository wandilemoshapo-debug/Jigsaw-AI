const { supabase } = require('../supabase.cjs');

function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return { headers: [], records: [] };

  // Parse headers
  const headers = parseCSVLine(lines[0]);
  
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const record = {};
    headers.forEach((h, idx) => {
      record[h] = values[idx] || '';
    });
    records.push(record);
  }

  return { headers, records };
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Specialized parser for Brabys CSV format
function parseBrabysRecord(record) {
  // Find the business name (usually in the second column or a column with the name)
  let businessName = '';
  let phone = '';
  let email = '';
  let website = '';
  let brabysUrl = '';
  let address = '';
  let category = '';

  // Get all values from the record
  const values = Object.values(record);
  
  // Business name is usually the second column (index 1) or a column with the name
  for (const val of values) {
    if (val && typeof val === 'string') {
      // Business names are usually uppercase or mixed case, not containing @ or http
      if (!val.includes('@') && !val.includes('http') && !val.includes('tel:') && !val.includes('mailto:') && !val.includes('Visit') && !val.includes('More')) {
        const trimmed = val.trim();
        if (trimmed && trimmed.length > 1 && !trimmed.includes('href') && !trimmed.includes('resize')) {
          businessName = trimmed;
          break;
        }
      }
    }
  }

  // Find phone
  for (const val of values) {
    if (val && typeof val === 'string') {
      if (val.includes('tel:')) {
        phone = val.replace('tel:', '').trim();
        break;
      }
      // Look for South African phone numbers
      const phoneMatch = val.match(/(?:\+27|0)[0-9]{9,10}/);
      if (phoneMatch) {
        phone = phoneMatch[0];
        break;
      }
    }
  }

  // Find email
  for (const val of values) {
    if (val && typeof val === 'string') {
      if (val.includes('mailto:')) {
        email = val.replace('mailto:', '').trim();
        break;
      }
      const emailMatch = val.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        email = emailMatch[0];
        break;
      }
    }
  }

  // Find website
  for (const val of values) {
    if (val && typeof val === 'string') {
      if (val.startsWith('http') && !val.includes('brabys.com')) {
        website = val.trim();
        break;
      }
    }
  }

  // Find Brabys URL (the profile link)
  for (const val of values) {
    if (val && typeof val === 'string') {
      if (val.includes('brabys.com') && val.includes('/za/')) {
        brabysUrl = val.trim();
        break;
      }
    }
  }

  // Find address
  for (const val of values) {
    if (val && typeof val === 'string') {
      // Address contains city names and commas
      if (val.includes(',') && val.includes('Cape') || val.includes('Gauteng') || val.includes('Kwazulu')) {
        address = val.trim();
        break;
      }
    }
  }

  // Find category
  for (const val of values) {
    if (val && typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed.includes('@') && !trimmed.includes('http') && !trimmed.includes('tel:') && !trimmed.includes('mailto:') && !trimmed.includes('Visit') && !trimmed.includes('More') && !trimmed.includes('href') && !trimmed.includes('resize')) {
        // Check if it looks like a category (single word or short phrase)
        if (trimmed.length < 30 && !trimmed.includes(',') && trimmed !== businessName) {
          category = trimmed;
          break;
        }
      }
    }
  }

  // Extract suburb from address
  let suburb = '';
  if (address) {
    const parts = address.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      suburb = parts[parts.length - 2];
    } else if (parts.length === 1) {
      suburb = parts[0];
    }
  }

  return {
    business_name: businessName,
    phone: phone || null,
    email: email || null,
    website: website || null,
    brabys_url: brabysUrl || null,
    address: address || null,
    category: category || null,
    suburb: suburb || null
  };
}

async function importLeads(content, options = {}) {
  const { type = 'csv', filename = 'file' } = options;

  let records = [];

  if (type === 'json') {
    try {
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        records = data;
      } else if (data.data && Array.isArray(data.data)) {
        records = data.data;
      }
    } catch (e) {
      return { error: 'Invalid JSON format', saved: 0 };
    }
  } else {
    const parsed = parseCSV(content);
    records = parsed.records;
  }

  if (records.length === 0) {
    return { error: 'No valid records found in file', saved: 0 };
  }

  console.log(`📊 Processing ${records.length} records...`);

  let imported = 0;
  let skipped = 0;

  for (const row of records) {
    // Parse the Brabys record
    const biz = parseBrabysRecord(row);
    
    if (!biz.business_name) {
      skipped++;
      continue;
    }

    // Determine website status
    let websiteStatus;
    if (biz.website) {
      websiteStatus = 'has_website';
    } else if (biz.brabys_url) {
      websiteStatus = 'unknown';
    } else {
      websiteStatus = 'confirmed_no_website';
    }

    const { error } = await supabase
      .from('discovered_leads')
      .upsert({
        business_name: biz.business_name,
        address: biz.address,
        phone: biz.phone,
        email: biz.email,
        industry_category: biz.category || 'restaurant',
        suburb: biz.suburb,
        website: biz.website,
        brabys_url: biz.brabys_url,
        website_status: websiteStatus,
        discovery_sources: ['brabys_csv_import']
      }, {
        onConflict: 'business_name'
      });

    if (error) {
      console.log(`❌ Error importing ${biz.business_name}:`, error.message);
      skipped++;
    } else {
      imported++;
      console.log(`✅ Imported: ${biz.business_name} (${websiteStatus})`);
    }
  }

  return {
    success: true,
    saved: imported,
    skipped: skipped,
    total: records.length,
    filename: filename
  };
}

module.exports = { importLeads };