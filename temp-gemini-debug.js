const fs = require('fs');
const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx), l.slice(idx + 1)];
    })
);
const apiKey = env.GEMINI_API_KEY;
const model = 'gemini-2.0-flash';
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
const requestBody = {
  contents: [
    { role: 'user', parts: [{ text: 'You MUST respond with ONLY valid JSON containing linkedInPosts (3 strings), twitterThread (array), summary (string).' }] },
    { role: 'model', parts: [{ text: 'Understood.' }] },
    { role: 'user', parts: [{ text: 'Transcript:\nShort transcript text.' }] },
  ],
  generationConfig: {
    temperature: 0.2,
    maxOutputTokens: 1024,
    responseMimeType: 'application/json',
  },
};

(async () => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    console.log('status', res.status);
    const txt = await res.text();
    console.log(txt);
  } catch (err) {
    console.error('error', err);
  }
})();
