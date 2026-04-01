const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');

const TRIAL_WORD_LIMIT = 15000;

// GET /users/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    let result = await db.query(
      'SELECT * FROM users WHERE user_id = $1',
      [req.user.sub]
    );

    if (result.rows.length === 0) {
      // First time — create user record
      result = await db.query(
        `INSERT INTO users (user_id, email)
         VALUES ($1, $2)
         RETURNING *`,
        [req.user.sub, req.user.email]
      );
    }

    const user = result.rows[0];
    const trialRemaining = Math.max(0, TRIAL_WORD_LIMIT - user.trial_words_used);
    const canWrite = user.subscription_status === 'active'
      || user.subscription_status === 'past_due'
      || (user.subscription_status === 'trial' && trialRemaining > 0);

    return res.json({
      user_id: user.user_id,
      email: user.email,
      subscription_status: user.subscription_status,
      trial_words_used: user.trial_words_used,
      trial_words_remaining: trialRemaining,
      trial_word_limit: TRIAL_WORD_LIMIT,
      can_write: canWrite,
    });
  } catch (error) {
    console.error('GET /users/me error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /users/words — increment trial word count
router.post('/words', requireAuth, async (req, res) => {
  try {
    const { count } = req.body;
    if (!count || typeof count !== 'number' || count < 0) {
      return res.status(400).json({ error: 'Invalid count' });
    }

    const result = await db.query(
      `UPDATE users
       SET trial_words_used = trial_words_used + $1,
           trial_exhausted_at = CASE
             WHEN trial_words_used + $1 >= $2 AND trial_exhausted_at IS NULL
             THEN NOW()
             ELSE trial_exhausted_at
           END,
           updated_at = NOW()
       WHERE user_id = $3
       RETURNING trial_words_used, subscription_status`,
      [count, TRIAL_WORD_LIMIT, req.user.sub]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const trialRemaining = Math.max(0, TRIAL_WORD_LIMIT - user.trial_words_used);
    const canWrite = user.subscription_status === 'active'
      || user.subscription_status === 'past_due'
      || (user.subscription_status === 'trial' && trialRemaining > 0);

    return res.json({
      trial_words_used: user.trial_words_used,
      trial_words_remaining: trialRemaining,
      can_write: canWrite,
    });
  } catch (error) {
    console.error('POST /users/words error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;