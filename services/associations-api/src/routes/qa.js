const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const systemPrompt = `You are reading a writer's private work. Your only job is to ask one question — a single interrogative sentence — that points to something already present in the writing that is unresolved or ambiguous.

CRITICAL RULES:
1. Never invite new content. Never ask what happens next, what a character feels about something not yet mentioned, or what the writer intended to add.
2. Never make observations. Never comment on themes, patterns, or quality.
3. Never ask about the writer's intentions or process.
4. Only ask about something that already exists in the text but is unclear or unresolved.
5. The answer must already exist in the writer's mind — your question just surfaces it.
6. One sentence. No preamble. No explanation.

EXAMPLES OF WRONG QUESTIONS:
- "What does Damien smell when he thinks of her?" (invites new content)
- "How does the bus symbolize transition?" (observation/interpretation)
- "What happens when Damien reaches the hospital?" (prompt)
- "Why did you choose to set this at night?" (asks about the writer)

EXAMPLES OF CORRECT QUESTIONS:
- "Does Damien know he's been to this city before?" (clarifies something implied)
- "The bus appears twice — is that deliberate?" (surfaces something already present)
- "Max doesn't speak in this scene. Is that a choice?" (points to existing absence)
- "Is the woman on the bus someone Damien recognizes?" (clarifies an ambiguity)

If you cannot identify a specific, complete, unresolved element in the writing worth asking about, respond with only the word "none" — nothing else.

Ask one question. Nothing else.`;

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

    if (!excerpt || excerpt.trim().length < 100) {
      return res.json({ question: null }); // not enough to work with
    }

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 60,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Here is the writer's recent text:\n\n${excerpt}${context ? `\n\nAdditional context from their writing:\n\n${context}` : ''}`
        }
      ]
    });

    const question = message.content[0].text.trim();

    if (question.toLowerCase() === 'none' || !question.includes('?')) {
      return res.json({ question: null });
    }

    return res.json({ question });
  } catch (error) {
    console.error('POST /qa/question error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;