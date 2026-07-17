async function complete({ system, prompt, maxTokens = 300 }) {
  const host = process.env.OLLAMA_HOST || 'http://localhost:11434';

  const response = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama3.2',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ],
      stream: false,
      options: {
        num_predict: maxTokens,
        temperature: 0.7
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.message?.content || '';
}

module.exports = { complete };