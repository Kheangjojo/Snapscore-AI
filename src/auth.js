const crypto = require('crypto');
const P = { N: 16384, r: 8, p: 1 };
const scrypt = (pw, salt) => new Promise((ok, no) => crypto.scrypt(pw, salt, 64, P, (e, k) => (e ? no(e) : ok(k))));
async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${(await scrypt(pw, salt)).toString('hex')}`;
}
const DUMMY = `scrypt$${'00'.repeat(16)}$${'00'.repeat(64)}`;
async function verifyPassword(pw, stored) {
  const [alg, s, h] = String(stored || DUMMY).split('$');
  if (alg !== 'scrypt') return false;
  const k = await scrypt(pw, Buffer.from(s, 'hex'));
  const b = Buffer.from(h, 'hex');
  return b.length === k.length && crypto.timingSafeEqual(k, b);
}
module.exports = { hashPassword, verifyPassword };
