const pool = require('./db');
const { randomUUID } = require('crypto');

async function getMyProfile(req, res) {
  const client = await pool.connect();
  try {
    // Get basic profile
    const profileResult = await client.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [req.user.id]
    );

    let profile = profileResult.rows[0] || null;

    if (profile) {
      // Get wishlist links
      const linksResult = await client.query(
        'SELECT * FROM profile_wishlist_links WHERE user_id = $1 ORDER BY created_at DESC',
        [req.user.id]
      );
      profile.wishlist_links = linksResult.rows;

      // Get shared dates
      const datesResult = await client.query(
        'SELECT * FROM profile_shared_dates WHERE user_id = $1 ORDER BY date ASC',
        [req.user.id]
      );
      profile.dates = datesResult.rows;
    }

    res.json({ profile });
  } finally {
    client.release();
  }
}

async function upsertProfile(req, res) {
  const { name, username, photo_url, birthday } = req.body;

  // Validate username if provided
  if (username !== undefined && username !== null) {
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-20 characters, lowercase alphanumeric and underscores only' });
    }

    // Check against reserved words
    const reservedWords = [
      'about', 'help', 'support', 'terms', 'privacy', 'login', 'logout', 'signup',
      'register', 'admin', 'api', 'app', 'www', 'mail', 'email', 'contact', 'home',
      'index', 'profile', 'user', 'users', 'account', 'accounts', 'settings',
      'billing', 'pricing', 'press', 'blog', 'news', 'legal', 'security', 'status',
      'download', 'downloads', 'install', 'kindred', 'fromkindred'
    ];

    if (reservedWords.includes(username.toLowerCase())) {
      return res.status(400).json({ error: 'Username not available' });
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO profiles (user_id, name, username, photo_url, birthday)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE
       SET name = COALESCE(EXCLUDED.name, profiles.name),
           username = COALESCE(EXCLUDED.username, profiles.username),
           photo_url = COALESCE(EXCLUDED.photo_url, profiles.photo_url),
           birthday = COALESCE(EXCLUDED.birthday, profiles.birthday),
           updated_at = NOW()
       RETURNING *`,
      [req.user.id, name, username, photo_url, birthday]
    );
    res.json({ profile: result.rows[0] });
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'profiles_username_key') {
      return res.status(400).json({ error: 'Username already taken' });
    }
    throw error;
  }
}

async function getPublicProfile(req, res) {
  const { userId } = req.params;

  // Check if it's a UUID or username
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const usernameRegex = /^[a-z0-9_]{3,20}$/;

  let query;
  let params;

  if (uuidRegex.test(userId)) {
    // It's a UUID
    query = 'SELECT user_id, name, username, photo_url, birthday FROM profiles WHERE user_id = $1';
    params = [userId];
  } else if (usernameRegex.test(userId)) {
    // It's a username
    query = 'SELECT user_id, name, username, photo_url, birthday FROM profiles WHERE username = $1';
    params = [userId];
  } else {
    // Invalid format
    return res.status(404).json({ error: 'Not found' });
  }

  const result = await pool.query(query, params);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  res.json({ profile: result.rows[0] });
}

async function deleteProfile(req, res) {
  await pool.query('DELETE FROM profiles WHERE user_id = $1', [req.user.id]);
  res.json({ success: true });
}

// Wishlist link endpoints
async function addWishlistLink(req, res) {
  const { label, url } = req.body;
  const result = await pool.query(
    `INSERT INTO profile_wishlist_links (user_id, label, url)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [req.user.id, label, url]
  );
  res.json(result.rows[0]);
}

async function deleteWishlistLink(req, res) {
  const { linkId } = req.params;
  await pool.query(
    'DELETE FROM profile_wishlist_links WHERE id = $1 AND user_id = $2',
    [linkId, req.user.id]
  );
  res.json({ success: true });
}

// Shared date endpoints
async function addSharedDate(req, res) {
  const { label, date, recurs_annually = true } = req.body;
  const result = await pool.query(
    `INSERT INTO profile_shared_dates (user_id, label, date, recurs_annually)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [req.user.id, label, date, recurs_annually]
  );
  res.json(result.rows[0]);
}

async function deleteSharedDate(req, res) {
  const { dateId } = req.params;
  await pool.query(
    'DELETE FROM profile_shared_dates WHERE id = $1 AND user_id = $2',
    [dateId, req.user.id]
  );
  res.json({ success: true });
}

// Check username availability
async function checkUsername(req, res) {
  const { username } = req.params;

  // Validate format
  const usernameRegex = /^[a-z0-9_]{3,20}$/;
  if (!usernameRegex.test(username)) {
    return res.json({ available: false });
  }

  // Check against reserved words
  const reservedWords = [
    'about', 'help', 'support', 'terms', 'privacy', 'login', 'logout', 'signup',
    'register', 'admin', 'api', 'app', 'www', 'mail', 'email', 'contact', 'home',
    'index', 'profile', 'user', 'users', 'account', 'accounts', 'settings',
    'billing', 'pricing', 'press', 'blog', 'news', 'legal', 'security', 'status',
    'download', 'downloads', 'install', 'kindred', 'fromkindred'
  ];

  if (reservedWords.includes(username.toLowerCase())) {
    return res.json({ available: false });
  }

  // Check database
  const result = await pool.query(
    'SELECT 1 FROM profiles WHERE LOWER(username) = LOWER($1)',
    [username]
  );

  res.json({ available: result.rows.length === 0 });
}

module.exports = {
  getMyProfile,
  upsertProfile,
  getPublicProfile,
  deleteProfile,
  addWishlistLink,
  deleteWishlistLink,
  addSharedDate,
  deleteSharedDate,
  checkUsername
};