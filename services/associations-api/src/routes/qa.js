const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /qa/question
router.post('/question', requireAuth, async (req, res) => {
  try {
    // Verify user can access Q&A
    const userResult = await db.query(
      'SELECT * FROM users WHERE user_id = $1',
      [req.user.sub]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const canAccess = user.subscription_status === 'active'
      || user.subscription_status === 'past_due'
      || (user.subscription_status === 'trial' && user.trial_words_used < 15000);

    if (!canAccess) {
      return res.status(403).json({ error: 'Subscription required' });
    }

    const { excerpt, context } = req.body;

    if (!excerpt) {
      return res.status(400).json({ error: 'excerpt required' });
    }

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: `You are reading a writer's private work. Your only job is to ask one question — a single interrogative sentence — about a specific gap, tension, or unresolved detail you notice in what they've written.

Rules:
- One question only
- Never give advice
- Never make observations
- Never explain why you're asking
- Ask about something specific in the text, never something generic
- The question should feel like it came from the work itself

Writer's excerpt:
${excerpt}

${context ? `Additional context from their writing:\n${context}` : ''}

Ask one question.`
        }
      ]
    });

    const question = message.content[0].text.trim();

    return res.json({ question });
  } catch (error) {
    console.error('POST /qa/question error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;