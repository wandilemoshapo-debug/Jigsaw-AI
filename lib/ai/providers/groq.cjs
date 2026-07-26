// lib/ai/providers/groq.cjs
async function complete(args) {
  // If no API key, use fallback
  if (!process.env.GROQ_API_KEY) {
    console.log('   ⚠️ No Groq API key found, using fallback');
    return `Hi! I noticed your business and wanted to reach out.

I help businesses attract more customers through professional websites and online presence.

Would you be open to a quick chat?

Best,
Wandile / Jigsaw AI`;
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [
          { role: 'system', content: args.system || 'You are a helpful assistant.' },
          { role: 'user', content: args.prompt || 'Generate a warm outreach message.' }
        ],
        max_tokens: args.maxTokens || 350
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.log(`   ⚠️ Groq error: ${error.message}`);
    return `Hi! I noticed your business and wanted to reach out.

I help businesses get more customers through better online presence. Would you be open to a 10-minute chat?

Best,
Wandile / Jigsaw AI`;
  }
}

module.exports = { complete };