const { ROUTING } = require('./config.cjs');
const openrouter = require('./providers/openrouter.cjs');
const gemini = require('./providers/gemini.cjs');
const pollinations = require('./providers/pollinations.cjs');

const PROVIDERS = { 
  openrouter, 
  gemini, 
  pollinations 
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
  const hasWebsite = lead.website && lead.website_status === 'has_website';
  const scoreText = score ? ` (Score: ${score}/100)` : '';
  
  let systemPrompt = 'You write short, warm, human-sounding cold emails for a web design studio. Under 120 words. No corporate phrases. Sign with "Jigsaw Studios" at the end.';
  
  let userPrompt;
  
  if (!hasWebsite) {
    userPrompt = `Write to ${lead.business_name}, a ${lead.industry_category || 'business'} in ${lead.suburb || 'South Africa'}. This business has NO website at all. They are missing out on customers searching for them online. Mention that you can help them get found online, build credibility, and generate leads. Reference their location (${lead.suburb || 'their area'}) and industry (${lead.industry_category || 'business'}). End with a soft question about whether they've thought about having a website. ${scoreText}`;
  } else {
    userPrompt = `Write to ${lead.business_name}, a ${lead.industry_category || 'business'} in ${lead.suburb || 'South Africa'}. They have a website at ${lead.website} but it needs improvement. Mention one specific real detail from the analysis: ${JSON.stringify(report)}. End with a soft, low-pressure question. ${scoreText}`;
  }
  
  return callAI('generateOutreachMessage', {
    system: systemPrompt,
    prompt: userPrompt,
    maxTokens: 350
  });
}


module.exports = {
  generateOpportunityExplanation,
  generateOutreachMessage,
  callAI
};