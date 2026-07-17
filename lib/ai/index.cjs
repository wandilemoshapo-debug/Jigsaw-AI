const { ROUTING } = require('./config.cjs');
const pollinations = require('./providers/pollinations.cjs');
const openrouter = require('./providers/openrouter.cjs');
const groq = require('./providers/groq.cjs');
const ollama = require('./providers/ollama.cjs');
const gemini = require('./providers/gemini.cjs');

const PROVIDERS = { 
  pollinations, 
  openrouter, 
  groq, 
  ollama, 
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

async function generateOutreachMessage(lead, report) {
  return callAI('generateOutreachMessage', {
    system: 'You write short, warm, human-sounding cold emails for a web design studio. Under 90 words. No corporate phrases.',
    prompt: `Write to ${lead.business_name}, a ${lead.industry_category || 'business'} in ${lead.suburb || 'South Africa'}. Website situation: ${lead.website ? 'has a site but: ' + JSON.stringify(report) : 'has no website at all'}. Mention one specific real detail. End with a soft, low-pressure question.`,
    maxTokens: 200
  });
}

module.exports = {
  generateOpportunityExplanation,
  generateOutreachMessage,
  callAI
};