require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');
const { verifyCandidate } = require('../lib/evaluation/verify.cjs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---- IMPROVED: Find the ACTUAL website link on Brabys page ----
async function findViaBrabys(page, lead) {
  if (!lead.brabys_url) return null;
  
  try {
    console.log(`   📋 Checking Brabys: ${lead.brabys_url}`);
    await page.goto(lead.brabys_url, { timeout: 15000, waitUntil: 'domcontentloaded' });
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Method 1: Look for "Visit Website" or "Website" link specifically
    const websiteLink = await page.evaluate(() => {
      // Get all links
      const links = document.querySelectorAll('a[href*="http"]');
      
      // Skip these domains
      const skipDomains = [
        'brabys.com', 'facebook.com', 'instagram.com', 'twitter.com', 
        'linkedin.com', 'youtube.com', 'tiktok.com', 'pinterest.com',
        'mailto:', 'tel:', 'javascript:'
      ];
      
      // First pass: look for "Visit Website" or "Website" text
      for (const link of links) {
        const text = link.textContent?.toLowerCase().trim() || '';
        const href = link.getAttribute('href') || '';
        
        // Skip if it's a domain we don't want
        let shouldSkip = false;
        for (const domain of skipDomains) {
          if (href.includes(domain)) {
            shouldSkip = true;
            break;
          }
        }
        if (shouldSkip) continue;
        
        // Check if this is a "Visit Website" link
        if (text.includes('visit') || text.includes('website') || text.includes('site') || text.includes('www')) {
          return href;
        }
      }
      
      // Second pass: look for any external link that's not social media
      for (const link of links) {
        const href = link.getAttribute('href') || '';
        
        let shouldSkip = false;
        for (const domain of skipDomains) {
          if (href.includes(domain)) {
            shouldSkip = true;
            break;
          }
        }
        if (shouldSkip) continue;
        
        // If it's a valid HTTP link, return it
        if (href.startsWith('http://') || href.startsWith('https://')) {
          return href;
        }
      }
      
      return null;
    });
    
    if (websiteLink) {
      console.log(`      🔗 Found link on Brabys: ${websiteLink}`);
      return websiteLink;
    }
    
    console.log(`      ⚠️ No website link found on Brabys page`);
    return null;
    
  } catch (error) {
    console.log(`      ❌ Brabys page error: ${error.message}`);
    return null;
  }
}

// ---- Search DuckDuckGo ----
async function findViaSearch(page, lead) {
  const query = encodeURIComponent(`${lead.business_name} ${lead.suburb || ''} South Africa official website`);
  console.log(`   🔎 Searching DuckDuckGo: ${lead.business_name}`);
  
  try {
    await page.goto(`https://html.duckduckgo.com/html/?q=${query}`, { 
      timeout: 15000, 
      waitUntil: 'domcontentloaded' 
    });
    
    await page.waitForTimeout(2000);
    
    const links = await page.evaluate(() => {
      const results = [];
      const allLinks = document.querySelectorAll('a[href*="http"]');
      
      const skipDomains = [
        'brabys.com', 'facebook.com', 'instagram.com', 'twitter.com', 
        'linkedin.com', 'youtube.com', 'tiktok.com', 'pinterest.com',
        'yellowpages', 'cylex', 'hotfrog', 'yalwa', 'saonline',
        'github.com', 'wordpress.com', 'blogspot.com', 'medium.com'
      ];
      
      for (const link of allLinks) {
        const href = link.getAttribute('href') || '';
        
        let shouldSkip = false;
        for (const domain of skipDomains) {
          if (href.includes(domain)) {
            shouldSkip = true;
            break;
          }
        }
        if (shouldSkip) continue;
        
        if (href.startsWith('http://') || href.startsWith('https://')) {
          results.push(href);
        }
      }
      
      return results;
    });
    
    // Return the first valid link
    for (const link of links) {
      if (link && link.length > 10) {
        console.log(`      🔗 Found search result: ${link}`);
        return link;
      }
    }
    
    console.log(`      ⚠️ No valid results found`);
    return null;
    
  } catch (error) {
    console.log(`      ❌ Search error: ${error.message}`);
    return null;
  }
}

// ---- Domain Guessing - LAST resort ----
function guessCandidates(businessName) {
  const slug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .split(' ')
    .filter(w => w.length > 2)
    .slice(0, 2)
    .join('');
  
  if (!slug) return [];
  
  const tlds = ['.co.za', '.com', '.za'];
  const guesses = [];
  
  for (const tld of tlds) {
    guesses.push(`https://${slug}${tld}`);
    guesses.push(`https://www.${slug}${tld}`);
  }
  
  return guesses;
}

// ---- Main enrichment function ----
async function enrichLead(browser, lead) {
  const page = await browser.newPage();
  const attempts = [];

  console.log(`\n🔍 Searching for: ${lead.business_name} (${lead.suburb || 'no location'})`);

  // Source 1: Brabys page (most reliable)
  const brabysLink = await findViaBrabys(page, lead);
  if (brabysLink) {
    const result = await verifyCandidate(page, brabysLink, lead);
    attempts.push(result);
    if (result.verified) {
      await page.close();
      return { 
        website: result.url, 
        status: 'has_website', 
        confidence: result.confidence, 
        attempts 
      };
    }
  }

  // Source 2: DuckDuckGo search
  const searchLink = await findViaSearch(page, lead);
  if (searchLink) {
    const result = await verifyCandidate(page, searchLink, lead);
    attempts.push(result);
    if (result.verified) {
      await page.close();
      return { 
        website: result.url, 
        status: 'has_website', 
        confidence: result.confidence, 
        attempts 
      };
    }
  }

  // Source 3: Domain guessing (LAST resort, always verified)
  console.log(`   🎯 Trying domain guesses...`);
  const guesses = guessCandidates(lead.business_name);
  for (const guess of guesses) {
    console.log(`      Checking: ${guess}`);
    const result = await verifyCandidate(page, guess, lead);
    attempts.push(result);
    if (result.verified) {
      await page.close();
      return { 
        website: result.url, 
        status: 'has_website', 
        confidence: result.confidence, 
        attempts 
      };
    }
    await sleep(500);
  }

  await page.close();

  // Nothing verified. Check if we found any candidates at all.
  const hadUnverifiedCandidates = attempts.some(a => a.url && !a.verified);
  
  return {
    website: null,
    status: hadUnverifiedCandidates ? 'needs_review' : 'confirmed_no_website',
    confidence: 0,
    attempts,
  };
}

// ---- Main run function ----
async function run() {
  console.log('🔍 Starting Brabys enrichment with improved verification...');

  const { data: leads, error } = await supabase
    .from('discovered_leads')
    .select('*')
    .eq('website_status', 'unknown');

  if (error) {
    console.log('❌ Error fetching leads:', error.message);
    return;
  }

  if (!leads || leads.length === 0) {
    console.log('✅ No leads need enrichment!');
    return;
  }

  console.log(`📊 Found ${leads.length} leads to enrich`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let found = 0;
  let needsReview = 0;
  let noWebsite = 0;

  for (const lead of leads) {
    const result = await enrichLead(browser, lead);
    
    // Update the lead
    await supabase
      .from('discovered_leads')
      .update({
        website: result.website || null,
        website_status: result.status,
        enrichment_confidence: result.confidence || 0,
        enrichment_log: JSON.stringify(result.attempts, null, 2),
        enriched_at: new Date().toISOString()
      })
      .eq('id', lead.id);

    if (result.status === 'has_website') {
      found++;
      console.log(`   ✅ ${lead.business_name}: ${result.website} (${Math.round(result.confidence * 100)}% confidence)`);
    } else if (result.status === 'needs_review') {
      needsReview++;
      console.log(`   ⚠️ ${lead.business_name}: Found candidates but none verified - needs review`);
    } else {
      noWebsite++;
      console.log(`   ❌ ${lead.business_name}: No website found`);
    }

    await sleep(1200);
  }

  await browser.close();

  console.log(`\n🎉 Enrichment complete!`);
  console.log(`✅ Verified websites: ${found}`);
  console.log(`⚠️ Needs human review: ${needsReview}`);
  console.log(`❌ No website confirmed: ${noWebsite}`);
}

run().catch(console.error);