import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  try {
    const { content, campaign_id } = await req.json();

    if (!content || !campaign_id) {
      return Response.json({ error: 'Missing content or campaign_id' }, { status: 400 });
    }

    // Parse CSV
    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
    const records = parsed.data;

    if (records.length === 0) {
      return Response.json({ error: 'No valid records found' }, { status: 400 });
    }

    // Map columns
    const columnMap = {
      business_name: ['business name', 'name', 'company', 'business'],
      phone: ['phone', 'phone number', 'tel', 'telephone'],
      email: ['email', 'email address', 'e-mail'],
      address: ['address', 'street address', 'location'],
      website: ['website', 'website url', 'url'],
      category: ['category', 'industry', 'type'],
      suburb: ['suburb', 'city', 'town'],
      province: ['province', 'state', 'region'],
      brabys_url: ['brabys', 'more information']
    };

    const headers = parsed.meta.fields || [];
    const resolved = {};

    for (const [field, aliases] of Object.entries(columnMap)) {
      for (const alias of aliases) {
        const found = headers.find(h => h.toLowerCase().trim() === alias);
        if (found) {
          resolved[field] = found;
          break;
        }
      }
      if (!resolved[field]) {
        for (const alias of aliases) {
          const found = headers.find(h => h.toLowerCase().trim().includes(alias));
          if (found) {
            resolved[field] = found;
            break;
          }
        }
      }
    }

    let imported = 0;
    let skipped = 0;

    for (const row of records) {
      const name = resolved.business_name ? row[resolved.business_name]?.trim() : null;
      if (!name) {
        skipped++;
        continue;
      }

      const website = resolved.website ? row[resolved.website]?.trim() : null;
      const brabysUrl = resolved.brabys_url ? row[resolved.brabys_url]?.trim() : null;

      let websiteStatus;
      if (website) {
        websiteStatus = 'has_website';
      } else if (brabysUrl) {
        websiteStatus = 'unknown';
      } else {
        websiteStatus = 'confirmed_no_website';
      }

      const leadData = {
        place_id: `csv_${name}_${resolved.suburb ? row[resolved.suburb] : ''}`.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        business_name: name,
        phone: resolved.phone ? row[resolved.phone]?.trim() : null,
        email: resolved.email ? row[resolved.email]?.trim() : null,
        address: resolved.address ? row[resolved.address]?.trim() : null,
        website: website,
        brabys_url: brabysUrl,
        industry_category: resolved.category ? row[resolved.category]?.trim() : null,
        suburb: resolved.suburb ? row[resolved.suburb]?.trim() : null,
        province: resolved.province ? row[resolved.province]?.trim() : null,
        website_status: websiteStatus,
        campaign_id: campaign_id,  // ✅ Link to campaign
        discovery_sources: ['csv_import']
      };

      const { error } = await supabase
  .from('discovered_leads')
  .upsert(leadData, { onConflict: 'place_id' });
      if (error) {
        console.error('Error importing:', error);
        skipped++;
      } else {
        imported++;
      }
    }

    // Update campaign lead count
    await supabase
      .from('campaigns')
      .update({ 
        updated_at: new Date().toISOString(),
        lead_count: imported
      })
      .eq('id', campaign_id);

    return Response.json({
      success: true,
      total: records.length,
      imported: imported,
      skipped: skipped
    });

  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}