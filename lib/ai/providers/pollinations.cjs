async function complete({ system, prompt, maxTokens = 300 }) {
  try {
    const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.POLLINATIONS_API_KEY
          ? { 'Authorization': `Bearer ${process.env.POLLINATIONS_API_KEY}` }
          : {})
      },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      // If Pollinations fails, throw error to try next provider
      throw new Error(`Pollinations error ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    // If Pollinations fails, throw error to try next provider
    throw new Error(`Pollinations failed: ${error.message}`);
  }
}

module.exports = { complete };
