async function complete({ system, prompt, maxTokens = 300 }) {
  // Pollinations.ai uses a different endpoint format
  const response = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
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
    const error = await response.text();
    throw new Error(`Pollinations error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

module.exports = { complete };