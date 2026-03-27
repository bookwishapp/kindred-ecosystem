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
  const { name, photo_url, birthday } = req.body;
  const result = await pool.query(
    `INSERT INTO profiles (user_id, name, photo_url, birthday)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE
     SET name = COALESCE(EXCLUDED.name, profiles.name),
         photo_url = COALESCE(EXCLUDED.photo_url, profiles.photo_url),
         birthday = COALESCE(EXCLUDED.birthday, profiles.birthday),
         updated_at = NOW()
     RETURNING *`,
    [req.user.id, name, photo_url, birthday]
  );
  res.json({ profile: result.rows[0] });
}

async function getPublicProfile(req, res) {
  const { userId } = req.params;
  const result = await pool.query(
    'SELECT user_id, name, photo_url, birthday FROM profiles WHERE user_id = $1',
    [userId]
  );
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

module.exports = {
  getMyProfile,
  upsertProfile,
  getPublicProfile,
  deleteProfile,
  addWishlistLink,
  deleteWishlistLink,
  addSharedDate,
  deleteSharedDate
};