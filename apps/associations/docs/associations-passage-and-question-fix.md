# Associations — Passage Quality and Question Ghost Fix

## Context

Read `docs/ARCHITECTURE.md`, `docs/CLAUDE.md`, and `apps/associations/docs/ASSOCIATIONS_ARCHITECTURE.md` before starting.

Two fixes in one prompt. Read every file before touching it. No other files modified outside this list.

---

## Fix 1 — Complete-thought passages

The pool should hold complete thoughts, not word-count fragments. Every passage must begin and end at a sentence boundary.

**Read `apps/associations/src/db/ingest.js`.**

Replace `splitIntoPassages` entirely:

```js
const MIN_SENTENCE_WORDS = 8;
const MIN_PASSAGE_WORDS = 10;

function splitIntoPassages(text) {
  const sentenceRegex = /[^.!?]+[.!?]+(?:\s|$)/g;
  const rawSentences = text.match(sentenceRegex) || [];

  const sentences = rawSentences
    .map(s => s.trim())
    .filter(s => s.split(/\s+/).filter(w => w.length > 0).length >= MIN_SENTENCE_WORDS);

  if (sentences.length === 0) {
    const words = text.trim().split(/\s+/).length;
    return words >= MIN_PASSAGE_WORDS ? [text.trim()] : [];
  }

  const passages = [];

  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i].split(/\s+/).length >= MIN_PASSAGE_WORDS) {
      passages.push(sentences[i]);
    }
    if (i + 1 < sentences.length) {
      passages.push(`${sentences[i]} ${sentences[i + 1]}`);
    }
    if (i + 2 < sentences.length) {
      passages.push(`${sentences[i]} ${sentences[i + 1]} ${sentences[i + 2]}`);
    }
  }

  return [...new Set(passages)];
}
```

**Read `apps/associations/electron/main.js`.**

After the schema initialization block, add a cleanup that clears fragmented pool entries and forces a re-sync:

```js
try {
  const fragmented = db.prepare(`
    SELECT COUNT(*) as count FROM pool_entries
    WHERE source = 'folder'
    AND content NOT GLOB '*[.!?]'
    AND content NOT GLOB '*[.!?]"'
    AND content NOT GLOB "*[.!?]'"
  `).get();

  if (fragmented.count > 0) {
    db.prepare(`
      DELETE FROM pool_entries
      WHERE source = 'folder'
      AND content NOT GLOB '*[.!?]'
      AND content NOT GLOB '*[.!?]"'
      AND content NOT GLOB "*[.!?]'"
    `).run();
    db.prepare(`DELETE FROM watched_files`).run();
    console.log(`Cleared ${fragmented.count} fragmented pool entries — re-sync folders to rebuild`);
  }
} catch(e) {
  console.error('Fragment cleanup error:', e.message);
}
```

---

## Fix 2 — Question ghosts based on need, not frequency

Question ghosts must only appear when the AI has a genuine question — not because a counter reached a threshold. Remove all counter-based logic and replace with need-based evaluation.

**Read `apps/associations/src/components/Compose.jsx`.**

Remove `passageGhostCountRef` and `questionGhostPending` entirely.

In `checkForGhost`, after the passage ghost search returns nothing, attempt a question ghost:

```js
const found = await findGhost({
  projectId,
  currentText: content,
  excludeIds: shownGhostIds,
});

if (found) {
  setGhost(found);
  setWatching(false);
  return;
}

// No passage ghost — check if there's a genuine question worth asking
const wc = getWordCount(contentRef.current);
if (wc >= 200) {
  const entries = await window.electron.db.getPoolEntries({
    projectId,
    excludeSessionId: SESSION_ID,
  });
  if (entries.length >= 5) {
    const { generateQuestion } = await import('../db/questions');
    const q = await generateQuestion({
      projectId,
      recentText: contentRef.current,
      poolEntries: entries,
    });
    if (q) {
      const id = window.crypto.randomUUID();
      await window.electron.qa.save({
        id, projectId, question: q,
        sourceExcerpt: contentRef.current.slice(-400),
        askedAsGhost: true,
      });
      setGhost({ id, content: q, isQuestion: true });
      setWatching(false);
    }
  }
}
```

**Read `services/associations-api/src/routes/qa.js`.**

Update the system prompt to return "none" when no genuine question exists:

Add after the EXAMPLES OF CORRECT QUESTIONS section:

```
If you cannot identify a specific, complete, unresolved element in the writing worth asking about, respond with only the word "none" — nothing else.
```

Update the response handler:

```js
const question = message.content[0].text.trim();

if (question.toLowerCase() === 'none' || !question.includes('?')) {
  return res.json({ question: null });
}

return res.json({ question });
```

Deploy `associations-api` after this change.

---

## Verification Checklist

- [ ] App launches, terminal shows fragmented entries cleared if any existed
- [ ] After re-syncing a folder, all pool entries end with sentence punctuation
- [ ] Ghost passages read as complete thoughts
- [ ] No `passageGhostCountRef` or `questionGhostPending` in Compose.jsx
- [ ] Question ghosts only appear when the AI has a genuine question
- [ ] Q&A route returns `null` when model responds "none"
- [ ] associations-api redeployed
- [ ] No other files modified outside this list
