require('dotenv').config({ path: '.env.local' });
const key = process.env.OPENROUTER_API_KEY;

console.log('Key exists:', !!key);
console.log('Key starts with:', key?.substring(0, 15) + '...');

fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`
  },
  body: JSON.stringify({
    model: 'openrouter/free',
    messages: [{ role: 'user', content: 'Say hello' }]
  })
})
.then(r => r.json())
.then(d => {
  if (d.choices) {
    console.log('✅ OpenRouter works!');
    console.log('Response:', d.choices[0].message.content);
  } else {
    console.log('❌ Error:', d);
  }
})
.catch(e => console.log('❌ Error:', e.message));