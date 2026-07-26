import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import Papa from 'papaparse';

const execPromise = promisify(exec);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  try {
    const { content, campaign_id } = await req.json();

    if (!content || !campaign_id) {
      return Response.json({ error: 'Missing content or campaign_id' }, { status: 400 });
    }

    console.log('📂 Parsing CSV...');

    // Parse CSV
    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
    const records = parsed.data;

    if (records.length === 0) {
      return Response.json({ error: 'No valid records found' }, { status: 400 });
    }

    // Map columns
    const headers = parsed.meta.fields || [];
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

    // Import leads
    let imported = 0;
    let skipped = 0;
    let updated = 0;

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

      // ✅ FIX: Check if lead already exists
      const { data: existing } = await supabase
        .from('discovered_leads')
        .select('id, campaign_id')
        .eq('business_name', name)
        .maybeSingle();

      if (existing) {
        // Update existing lead with campaign_id
        const { error } = await supabase
          .from('discovered_leads')
          .update({
            campaign_id: campaign_id,
            phone: resolved.phone ? row[resolved.phone]?.trim() : null,
            email: resolved.email ? row[resolved.email]?.trim() : null,
            address: resolved.address ? row[resolved.address]?.trim() : null,
            website: website,
            brabys_url: brabysUrl,
            industry_category: resolved.category ? row[resolved.category]?.trim() : null,
            suburb: resolved.suburb ? row[resolved.suburb]?.trim() : null,
            province: resolved.province ? row[resolved.province]?.trim() : null,
            website_status: websiteStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) {
          console.error('Error updating:', error);
          skipped++;
        } else {
          updated++;
        }
      } else {
        // Insert new lead
        const leadData = {
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
          campaign_id: campaign_id,
          discovery_sources: ['csv_import'],
          created_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('discovered_leads')
          .insert(leadData);

        if (error) {
          console.error('Error importing:', error);
          skipped++;
        } else {
          imported++;
        }
      }
    }

    console.log(`✅ Imported ${imported} new leads, updated ${updated}, skipped ${skipped}`);

    // ✅ FIX: Update campaign lead count
    const { count } = await supabase
      .from('discovered_leads')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign_id);

    await supabase
      .from('campaigns')
      .update({
        lead_count: count || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaign_id);

    // Start pipeline in background
    runPipeline(campaign_id, imported + updated).catch(console.error);

    return Response.json({
      success: true,
      imported: imported,
      updated: updated,
      skipped: skipped,
      total: records.length,
      campaign_id: campaign_id,
      lead_count: count || 0,
      pipeline_started: true,
      message: `Import complete! ${imported} new leads, ${updated} updated. Pipeline running in background.`
    });

  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================
// PIPELINE FUNCTIONS
// ============================================================

async function runPipeline(campaignId, count) {
  console.log(`📌 Running pipeline for campaign ${campaignId} (${count} leads)...`);

  try {
    // Step 1: Enrich Brabys
    console.log('🔍 Step 1: Enriching Brabys...');
    await runScript('scripts/enrich-brabys.cjs');

    // Step 2: Analyze websites
    console.log('🌐 Step 2: Analyzing websites...');
    await runScript('scripts/analyze.cjs');

    // Step 3: Run evaluations
    console.log('📊 Step 3: Running evaluations...');
    await runScript('scripts/run-evaluations.cjs');

    // Step 4: Generate outreach
    console.log('📝 Step 4: Generating outreach...');
    await runScript('scripts/outreach.cjs');

    // Step 5: Generate hot leads scripts
    console.log('🔥 Step 5: Generating hot leads scripts...');
    await runScript('scripts/generate-hot-leads-scripts.cjs');

    console.log(`✅ Pipeline complete for campaign ${campaignId}!`);

    // Update campaign with stats
    const { data: leads } = await supabase
      .from('discovered_leads')
      .select('eval_opportunity_level, pipeline_status')
      .eq('campaign_id', campaignId);

    const hotCount = leads?.filter(l => l.eval_opportunity_level === '🔥 Hot').length || 0;
    const wonCount = leads?.filter(l => l.pipeline_status === 'won').length || 0;
    const contactedCount = leads?.filter(l => l.pipeline_status === 'contacted').length || 0;

    await supabase
      .from('campaigns')
      .update({
        lead_count: leads?.length || 0,
        hot_count: hotCount,
        won_count: wonCount,
        contacted_count: contactedCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

  } catch (error) {
    console.error('Pipeline error:', error);
  }
}

async function runScript(scriptPath) {
  try {
    const { stdout, stderr } = await execPromise(`node ${scriptPath}`, {
      timeout: 300000,
    });
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    return { success: true };
  } catch (error) {
    console.error(`Script ${scriptPath} failed:`, error.message);
    return { success: false, error: error.message };
  }
}