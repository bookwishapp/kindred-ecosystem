const pool = require('./db');

async function getMyProfile(req, res) {
  const result = await pool.query(
    'SELECT * FROM profiles WHERE user_id = $1',
    [req.user.id]
  );
  res.json({ profile: result.rows[0] || null });
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

module.exports = { getMyProfile, upsertProfile, getPublicProfile, deleteProfile };