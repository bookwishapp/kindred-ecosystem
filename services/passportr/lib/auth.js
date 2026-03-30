const jwt = require('jsonwebtoken');

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

function getAuthUser(req) {
  // Try Authorization header first
  const authHeader = req.headers?.get?.('authorization') || req.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return verifyToken(authHeader.slice(7));
  }

  // Fall back to cookie
  const cookieHeader = req.headers?.get?.('cookie') || req.headers?.cookie || '';
  const match = cookieHeader.match(/passportr_token=([^;]+)/);
  if (match) {
    return verifyToken(decodeURIComponent(match[1]));
  }

  return null;
}

function requireAuth(req) {
  const user = getAuthUser(req);
  if (!user) throw new Error('Unauthorized');
  return user;
}

function isOrganizer(user) {
  if (!user || !user.email) return false;
  const organizerEmails = process.env.ORGANIZER_EMAILS || '';
  const allowedEmails = organizerEmails.split(',').map(e => e.trim().toLowerCase()).filter(e => e);
  return allowedEmails.includes(user.email.toLowerCase());
}

function requireOrganizer(req) {
  const user = requireAuth(req);
  if (!isOrganizer(user)) {
    throw new Error('Forbidden');
  }
  return user;
}

module.exports = { verifyToken, getAuthUser, requireAuth, isOrganizer, requireOrganizer };
