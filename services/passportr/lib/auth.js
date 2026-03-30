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

module.exports = { verifyToken, getAuthUser, requireAuth };
