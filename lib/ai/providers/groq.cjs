async function complete({ system, prompt, maxTokens = 300 }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not found in .env.local');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama3-70b-8192',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

module.exports = { complete };