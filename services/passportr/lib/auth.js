const jwt = require('jsonwebtoken');
const db = require('./db');

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

async function getOrganizerProfile(userId) {
  const result = await db.query(
    `SELECT * FROM organizer_profiles
     WHERE user_id = $1
     AND (
       subscription_status = 'active'
       OR subscription_status = 'past_due'
       OR (
         subscription_status = 'single'
         AND single_hop_expires_at > NOW()
       )
       OR nonprofit_verified = true
     )`,
    [userId]
  );
  return result.rows[0] || null;
}

async function requireOrganizer(req) {
  const user = requireAuth(req);
  const profile = await getOrganizerProfile(user.sub);
  if (!profile) {
    throw new Error('Forbidden');
  }
  return { user, profile };
}

module.exports = { verifyToken, getAuthUser, requireAuth, getOrganizerProfile, requireOrganizer };
