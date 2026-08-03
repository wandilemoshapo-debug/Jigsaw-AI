// lib/ai/providers/pollinations.cjs
async function complete(args) {
  try {
    // Pollinations.ai - Free text generation API
    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: args.system || 'You are a helpful assistant.' },
          { role: 'user', content: args.prompt || 'Generate a warm outreach message.' }
        ],
        model: 'openai',
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Pollinations error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.log(`   ⚠️ Pollinations error: ${error.message}`);
    // Return a fallback message instead of failing
    return generateFallbackMessage(args);
  }
}

// Fallback message generator
function generateFallbackMessage(args) {
  const prompt = args.prompt || '';
  
  // Try to extract business name from prompt
  const nameMatch = prompt.match(/to (.*?), a/);
  const businessName = nameMatch ? nameMatch[1] : 'your business';
  
  // Try to extract industry
  const industryMatch = prompt.match(/a (.*?) in/);
  const industry = industryMatch ? industryMatch[1] : 'business';
  
  // Try to extract location
  const locationMatch = prompt.match(/in (.*?)(?:\.|,|$)/);
  const location = locationMatch ? locationMatch[1] : 'South Africa';

  // Check if it's a "no website" or "bad website" message
  if (prompt.includes('NO website') || prompt.includes('no website')) {
    return `Hi there!

I came across ${businessName} while searching for ${industry} in ${location} and noticed you don't have a website yet.

In South Africa, most people search Google before they call - so you're missing out on potential customers.

I help businesses like yours get online with simple, professional websites starting from R1,000.

Would you be open to a quick 10-minute chat to see if we can help?

Best,
Wandile / Jigsaw Studios`;
  } else {
    return `Hi there!

I looked at your website and noticed a few areas that could be improved to attract more customers.

I specialize in helping businesses like yours get better results online.

Would you be open to a quick chat to discuss what we could do for you?

Best,
Wandile / Jigsaw Studios`;
  }
}

module.exports = { complete };