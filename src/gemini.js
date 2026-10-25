// Server-side Gemini call. The API key is only ever sent in a request header from the server.
const SYSTEM = 'You review product photos for small online sellers. Describe only what is visible. ' +
  'Do not invent brands, prices or claims. Be practical and brief. Reply with JSON only.';
const KEYS = ['lighting', 'background', 'composition', 'visibility', 'recommendations'];
function prompt(m) {
  const nums = Object.entries(m || {}).filter(([, v]) => typeof v === 'number' && isFinite(v)).slice(0, 16)
    .map(([k, v]) => `${k}=${Math.round(v * 100) / 100}`).join(', ');
  return 'Analyze this product photo. Return JSON with exactly these keys: ' +
    '"product" (short description or null if unclear), "lighting", "background", "composition", "visibility", ' +
    '"recommendations" (each an array of up to 4 short strings). Recommendations must be concrete steps a beginner can do. ' +
    (nums ? `Local measurements already computed (context only, do not repeat): ${nums}.` : '');
}
const clean = (s) => String(s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
function validate(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('invalid');
  const out = { product: typeof o.product === 'string' && o.product.trim() ? clean(o.product).slice(0, 200) : null };
  for (const k of KEYS) {
    const a = Array.isArray(o[k]) ? o[k] : [];
    out[k] = a.filter(x => typeof x === 'string' && x.trim()).slice(0, 5).map(clean);
  }
  if (!out.recommendations.length) throw new Error('invalid');
  return out;
}
async function analyzeWithGemini({ cfg, image, mime, measurements }) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), cfg.geminiTimeout);
  try {
    const r = await fetch(`${cfg.geminiBase}/models/${encodeURIComponent(cfg.geminiModel)}:generateContent`, {
      method: 'POST', signal: ctl.signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.geminiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: prompt(measurements) }, { inlineData: { mimeType: mime, data: image.toString('base64') } }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1200, responseMimeType: 'application/json' }
      })
    });
    if (!r.ok) { const e = new Error('upstream'); e.upstream = r.status; throw e; }
    const j = await r.json();
    const text = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
    return validate(JSON.parse(text));
  } finally { clearTimeout(t); }
}
module.exports = { analyzeWithGemini, validate };
