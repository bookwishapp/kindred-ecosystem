const crypto = require('crypto');
const { serialize, parse } = require('cookie');

const COOKIE_NAME = 'admin_session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
};

function createToken(data) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) throw new Error('ADMIN_SECRET not configured');

  const payload = JSON.stringify(data);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return `${Buffer.from(payload).toString('base64')}.${signature}`;
}

function verifyToken(token) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) throw new Error('ADMIN_SECRET not configured');

  try {
    const [payload, signature] = token.split('.');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(Buffer.from(payload, 'base64').toString())
      .digest('hex');

    if (signature !== expectedSignature) {
      return null;
    }

    return JSON.parse(Buffer.from(payload, 'base64').toString());
  } catch {
    return null;
  }
}

function setAuthCookie(res, data) {
  const token = createToken(data);
  const cookie = serialize(COOKIE_NAME, token, COOKIE_OPTIONS);
  res.setHeader('Set-Cookie', cookie);
}

function clearAuthCookie(res) {
  const cookie = serialize(COOKIE_NAME, '', {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });
  res.setHeader('Set-Cookie', cookie);
}

function getAuthFromRequest(req) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

async function validatePassword(password) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD not configured');
  }

  return password === adminPassword;
}

module.exports = {
  createToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
  getAuthFromRequest,
  validatePassword,
};