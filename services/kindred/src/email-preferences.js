const pool = require('./db');
const { verifyUnsubscribeToken } = require('./utils/unsubscribe');

async function getEmailPreferences(req, res) {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT subscribed, email FROM email_preferences WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ subscribed: false, email: null });
    }

    res.json({
      subscribed: result.rows[0].subscribed,
      email: result.rows[0].email,
    });
  } catch (error) {
    console.error('Error fetching email preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateEmailPreferences(req, res) {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const { subscribed } = req.body;

    if (typeof subscribed !== 'boolean') {
      return res.status(400).json({ error: 'subscribed must be a boolean' });
    }

    if (!userEmail) {
      return res.status(400).json({ error: 'Email not found in token' });
    }

    // Upsert the email preferences
    const result = await pool.query(
      `INSERT INTO email_preferences (user_id, email, subscribed, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET subscribed = $3, email = $2, updated_at = NOW()
       RETURNING *`,
      [userId, userEmail, subscribed]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating email preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function unsubscribe(req, res) {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ error: 'userId and token are required' });
    }

    // Verify the unsubscribe token
    if (!verifyUnsubscribeToken(userId, token)) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    // Update the subscription status
    const result = await pool.query(
      `UPDATE email_preferences
       SET subscribed = false, updated_at = NOW()
       WHERE user_id = $1
       RETURNING *`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Preferences not found' });
    }

    res.json({ success: true, message: 'Successfully unsubscribed' });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getEmailPreferences,
  updateEmailPreferences,
  unsubscribe,
};
