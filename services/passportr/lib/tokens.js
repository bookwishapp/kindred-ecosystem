const { randomBytes } = require('crypto');

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateToken() {
  const bytes = randomBytes(8);
  return Array.from(bytes).map(b => CHARS[b % CHARS.length]).join('');
}

module.exports = { generateToken };
