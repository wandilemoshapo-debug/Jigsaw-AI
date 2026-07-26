require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Search for social media profiles using Google search via Playwright
 */
async function findSocialMediaWithPlaywright(businessName, location) {
  const social = {
    facebook: null,
    instagram: null,
    linkedin: null,
    twitter: null,
    tiktok: null
  };

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    const searchQuery = `${businessName} ${location || ''} facebook instagram linkedin`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    
    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });

    await page.waitForTimeout(3000);

    // Extract social media links from search results
    const results = await page.evaluate(() => {
      const links = [];
      const resultElements = document.querySelectorAll('a[href*="http"]');
      
      for (const el of resultElements) {
        const href = el.getAttribute('href');
        if (href?.startsWith('http') && !href.includes('google.com')) {
          const url = href.split('&')[0];
          links.push(url);
        }
      }
      
      return links;
    });

    await browser.close();

    // Check each link for social media platforms
    for (const url of results) {
      if (url.includes('facebook.com') && !social.facebook) {
        social.facebook = url;
      } else if (url.includes('instagram.com') && !social.instagram) {
        social.instagram = url;
      } else if (url.includes('linkedin.com') && !social.linkedin) {
        social.linkedin = url;
      } else if ((url.includes('twitter.com') || url.includes('x.com')) && !social.twitter) {
        social.twitter = url;
      } else if (url.includes('tiktok.com') && !social.tiktok) {
        social.tiktok = url;
      }
    }

    return social;
  } catch (error) {
    if (browser) await browser.close();
    return social;
  }
}

/**
 * Also try domain guessing for social media
 */
function guessSocialMediaUrls(businessName) {
  const cleanName = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^(the|a|an)/, '');
  
  return {
    facebook: `https://facebook.com/${cleanName}`,
    instagram: `https://instagram.com/${cleanName}`,
    linkedin: `https://linkedin.com/company/${cleanName}`,
    twitter: `https://twitter.com/${cleanName}`,
    tiktok: `https://tiktok.com/@${cleanName}`
  };
}

async function run() {
  console.log('🔍 Finding social media profiles...');

  const { data: leads, error } = await supabase
    .from('discovered_leads')
    .select('*')
    .is('facebook_url', null)
    .limit(30);

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  if (!leads || leads.length === 0) {
    console.log('✅ All leads already have social media links!');
    return;
  }

  console.log(`📊 Found ${leads.length} leads to check for social media`);

  let found = 0;

  for (const lead of leads) {
    console.log(`\n🔍 Searching: ${lead.business_name}`);
    
    // First try guessing social media URLs
    const guessed = guessSocialMediaUrls(lead.business_name);
    
    // Then search with Playwright
    const social = await findSocialMediaWithPlaywright(lead.business_name, lead.suburb);
    
    // Merge results (prefer found over guessed)
    const updates = {};
    if (social.facebook) updates.facebook_url = social.facebook;
    else if (guessed.facebook) updates.facebook_url = guessed.facebook;
    
    if (social.instagram) updates.instagram_url = social.instagram;
    else if (guessed.instagram) updates.instagram_url = guessed.instagram;
    
    if (social.linkedin) updates.linkedin_url = social.linkedin;
    else if (guessed.linkedin) updates.linkedin_url = guessed.linkedin;
    
    if (social.twitter) updates.twitter_url = social.twitter;
    else if (guessed.twitter) updates.twitter_url = guessed.twitter;
    
    if (social.tiktok) updates.tiktok_url = social.tiktok;
    else if (guessed.tiktok) updates.tiktok_url = guessed.tiktok;

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('discovered_leads')
        .update(updates)
        .eq('id', lead.id);
      
      found++;
      console.log(`   ✅ Found: ${Object.keys(updates).join(', ')}`);
    } else {
      console.log(`   ❌ No social media found`);
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n🎉 Complete! Found social media for ${found} leads`);
}

run().catch(console.error);