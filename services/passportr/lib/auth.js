const jwt = require('jsonwebtoken');

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

function getAuthUser(req) {
  const authHeader = req.headers?.get?.('authorization') || req.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.slice(7));
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
