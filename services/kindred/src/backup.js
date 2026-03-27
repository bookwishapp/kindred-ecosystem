const { pool } = require('./db');

/**
 * Save encrypted backup for a user
 * POST /backup
 */
async function saveBackup(req, res) {
  try {
    const { ciphertext, version = 1 } = req.body;
    const userId = req.user.id;

    if (!ciphertext) {
      return res.status(400).json({ error: 'Ciphertext is required' });
    }

    // Upsert - one backup record per user
    await pool.query(
      `INSERT INTO backups (user_id, ciphertext, version, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET ciphertext = $2, version = $3, updated_at = NOW()`,
      [userId, ciphertext, version]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving backup:', error);
    res.status(500).json({ error: 'Failed to save backup' });
  }
}

/**
 * Get encrypted backup for a user
 * GET /backup
 */
async function getBackup(req, res) {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT ciphertext, version, updated_at FROM backups WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ backup: null });
    }

    res.json({ backup: result.rows[0] });
  } catch (error) {
    console.error('Error getting backup:', error);
    res.status(500).json({ error: 'Failed to get backup' });
  }
}

module.exports = {
  saveBackup,
  getBackup
};