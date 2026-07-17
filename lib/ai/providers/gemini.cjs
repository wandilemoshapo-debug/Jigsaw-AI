async function complete({ system, prompt, maxTokens = 300 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not found in .env.local');
  }

  const model = 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: system }]
      },
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

module.exports = { complete };