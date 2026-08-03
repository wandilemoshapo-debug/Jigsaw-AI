const { ROUTING } = require('./config.cjs');
const openrouter = require('./providers/openrouter.cjs');
const gemini = require('./providers/gemini.cjs');
const pollinations = require('./providers/pollinations.cjs');

const PROVIDERS = { 
  pollinations,  // ✅ FIRST - try Pollinations first
  openrouter, 
  gemini
};

async function callAI(task, args) {
  const chain = ROUTING[task];
  if (!chain) {
    throw new Error(`No routing defined for task: ${task}`);
  }

  let lastError = null;

  for (const name of chain) {
    try {
      const provider = PROVIDERS[name];
      if (!provider) {
        console.log(`   ⚠️ Provider "${name}" not found, skipping...`);
        continue;
      }
      console.log(`   🤖 Trying ${name}...`);
      const result = await provider.complete(args);
      console.log(`   ✅ ${name} succeeded`);
      return result;
    } catch (err) {
      console.log(`   ❌ ${name} failed: ${err.message}`);
      lastError = err;
    }
  }

  throw new Error(`All providers failed for ${task}: ${lastError?.message}`);
}

async function generateOpportunityExplanation(lead, score) {
  return callAI('generateOpportunityExplanation', {
    system: 'You explain lead scores to a sales rep in 2 short, plain-English sentences.',
    prompt: `Business: ${lead.business_name}, industry: ${lead.industry_category || 'unknown'}, website: ${lead.website || 'none found'}. Score: ${score}/100. Explain why.`,
    maxTokens: 150
  });
}

async function generateOutreachMessage(lead, report, score) {
  // Debug logging
  console.log(`📊 generateOutreachMessage called for: ${lead.business_name}`);
  console.log(`   - website: ${lead.website}`);
  console.log(`   - website_status: ${lead.website_status}`);
  console.log(`   - has report: ${!!report}`);
  console.log(`   - report keys: ${report ? Object.keys(report).join(', ') : 'none'}`);
  console.log(`   - score: ${score}`);
  
  const hasWebsite = lead.website && (lead.website_status === 'has_website' || lead.website_status === 'needs_review');
  const scoreText = score ? ` (Score: ${score}/100)` : '';
  
  let systemPrompt = 'You write short, warm, human-sounding cold emails for a web design studio. Under 120 words. No corporate phrases. Sign with "Wandile" at the end.';
  
  let userPrompt;
  
  if (!hasWebsite) {
    userPrompt = `Write to ${lead.business_name}, a ${lead.industry_category || 'business'} in ${lead.suburb || 'South Africa'}. This business has NO website at all. They are missing out on customers searching for them online. Mention that you can help them get found online, build credibility, and generate leads. Reference their location (${lead.suburb || 'their area'}) and industry (${lead.industry_category || 'business'}). End with a soft question about whether they've thought about having a website. ${scoreText}`;
  } else {
    // Build a detailed report string
    let reportDetails = '';
    if (report) {
      const issues = [];
      if (report.reachable === false) issues.push('❌ Website is not reachable');
      if (report.hasSSL === false) issues.push('❌ No SSL certificate (not secure)');
      if (report.loadTimeMs && report.loadTimeMs > 5000) issues.push(`❌ Slow loading (${report.loadTimeMs}ms)`);
      if (report.hasMetaDescription === false) issues.push('❌ No meta description (bad for SEO)');
      if (report.hasViewport === false) issues.push('❌ Not mobile-friendly');
      if (report.hasContactPage === false) issues.push('❌ No contact page');
      if (report.hasAboutPage === false) issues.push('❌ No about page');
      if (report.totalLinks < 5) issues.push('❌ Very few links (poor navigation)');
      
      reportDetails = issues.length > 0 
        ? `Issues found: ${issues.join('; ')}`
        : 'There are some areas that could be improved.';
    } else {
      reportDetails = 'There are some areas that could be improved.';
    }
    
    userPrompt = `Write to ${lead.business_name}, a ${lead.industry_category || 'business'} in ${lead.suburb || 'South Africa'}. They have a website at ${lead.website} but it needs improvement. ${reportDetails}. Offer a free consultation to fix these issues. End with a soft, low-pressure question. ${scoreText}`;
  }
  
  return callAI('generateOutreachMessage', {
    system: systemPrompt,
    prompt: userPrompt,
    maxTokens: 350
  });
}

// ✅ MAKE SURE THIS IS AT THE BOTTOM
module.exports = {
  generateOpportunityExplanation,
  generateOutreachMessage,
  callAI
};