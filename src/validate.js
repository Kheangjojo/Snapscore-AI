const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class Bad extends Error { constructor(m) { super(m); this.status = 400; } }
const str = (v, name, min, max) => {
  if (typeof v !== 'string') throw new Bad(`${name} is required`);
  const s = v.trim();
  if (s.length < min || s.length > max) throw new Bad(`${name} must be ${min}-${max} characters`);
  return s;
};
const int = (v, name, min, max, optional) => {
  if ((v === undefined || v === null) && optional) return null;
  if (!Number.isInteger(v) || v < min || v > max) throw new Bad(`${name} must be a whole number from ${min} to ${max}`);
  return v;
};
const uuid = (v) => { if (!UUID.test(String(v))) throw new Bad('Invalid id'); return v; };
const email = (v) => { const s = str(v, 'email', 3, 254).toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Bad('Enter a valid email'); return s; };
const scores = (v) => {
  if (!Array.isArray(v) || v.length !== 6) throw new Bad('scores must be 6 numbers');
  return v.map((x, i) => int(x, 'score ' + (i + 1), 0, 100));
};
// Small JSON objects only (settings, measurements): limited size.
const obj = (v, name, optional, max = 4000) => {
  if ((v === undefined || v === null) && optional) return null;
  if (typeof v !== 'object' || Array.isArray(v)) throw new Bad(`${name} must be an object`);
  if (JSON.stringify(v).length > max) throw new Bad(`${name} is too large`);
  return v;
};
module.exports = { Bad, str, int, uuid, email, scores, obj };
