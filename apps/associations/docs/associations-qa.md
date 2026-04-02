# Associations — Q&A Mode

## Context

Read `docs/ARCHITECTURE.md`, `docs/CLAUDE.md`, and `apps/associations/docs/ASSOCIATIONS_ARCHITECTURE.md` before starting. The Q&A philosophy is fully documented there. Read it carefully before writing any code.

Read every file before touching it. No scope creep. No other files modified outside this list.

---

## The Philosophy (Non-Negotiable)

Questions must point to something already present in the writing that is unresolved or unclear. They never invite new content. They never tell the writer what to write next.

**Never allowed:**
- *What does Damien smell when he thinks of her?* — invites new content
- *How does this scene connect to your theme?* — observation/prompt
- *What happens next?* — prompt
- *Why did you choose this setting?* — asks about the writer, not the writing

**Correct:**
- *Does Damien know he's been here before?* — clarifies something already implied
- *The bus appears twice. Is that intentional?* — surfaces something already present
- *Max doesn't speak in this scene. Is that a choice?* — points to an absence that already exists

The system prompt for question generation must enforce this distinction absolutely.

---

## Task A — Q&A database schema

Read `apps/associations/electron/main.js`.

Add to the `db.exec()` schema block:

```sql
CREATE TABLE IF NOT EXISTS qa_pairs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  source_excerpt TEXT,
  asked_at TEXT DEFAULT (datetime('now')),
  answered_at TEXT,
  dismissed_at TEXT,
  asked_as_ghost INTEGER DEFAULT 0
);
```

Add migration for existing databases:

```js
try {
  db.exec(`ALTER TABLE qa_pairs ADD COLUMN asked_as_ghost INTEGER DEFAULT 0`);
} catch (e) {}
```

Add IPC handlers:

```js
ipcMain.handle('qa-save', (event, { id, projectId, question, sourceExcerpt, askedAsGhost }) => {
  db.prepare(`
    INSERT OR IGNORE INTO qa_pairs (id, project_id, question, source_excerpt, asked_as_ghost)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, projectId, question, sourceExcerpt || null, askedAsGhost ? 1 : 0);
  return true;
});

ipcMain.handle('qa-answer', (event, { id, answer }) => {
  db.prepare(`
    UPDATE qa_pairs SET answer = ?, answered_at = datetime('now') WHERE id = ?
  `).run(answer, id);
  return true;
});

ipcMain.handle('qa-dismiss', (event, { id }) => {
  db.prepare(`
    UPDATE qa_pairs SET dismissed_at = datetime('now') WHERE id = ?
  `).run(id);
  return true;
});

ipcMain.handle('qa-get-unanswered', (event, { projectId }) => {
  return db.prepare(`
    SELECT * FROM qa_pairs
    WHERE project_id = ?
      AND answer IS NULL
      AND dismissed_at IS NULL
    ORDER BY asked_at DESC
    LIMIT 10
  `).all(projectId);
});

ipcMain.handle('qa-get-all', (event, { projectId }) => {
  return db.prepare(`
    SELECT * FROM qa_pairs
    WHERE project_id = ?
    ORDER BY asked_at DESC
  `).all(projectId);
});
```

---

## Task B — Expose Q&A IPC in preload

Read `apps/associations/electron/preload.js`.

Add to contextBridge:

```js
qa: {
  save: (data) => ipcRenderer.invoke('qa-save', data),
  answer: (data) => ipcRenderer.invoke('qa-answer', data),
  dismiss: (data) => ipcRenderer.invoke('qa-dismiss', data),
  getUnanswered: (data) => ipcRenderer.invoke('qa-get-unanswered', data),
  getAll: (data) => ipcRenderer.invoke('qa-get-all', data),
},
```

---

## Task C — Question generation service

Create `apps/associations/src/db/questions.js`:

```js
const MIN_WORDS_FOR_QUESTIONS = 200; // don't generate questions until there's enough material

export async function generateQuestion({ projectId, recentText, poolEntries }) {
  if (!recentText || recentText.trim().split(/\s+/).length < MIN_WORDS_FOR_QUESTIONS) {
    return null;
  }

  const token = await window.electron.getToken();
  if (!token) return null;

  // Build context from pool entries — a sample of what exists
  const poolSample = poolEntries
    .slice(0, 10)
    .map(e => e.content)
    .join('\n\n');

  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/qa/question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        excerpt: recentText.slice(-800), // last ~800 chars of current writing
        context: poolSample,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.question || null;
  } catch {
    return null;
  }
}
```

---

## Task D — Update associations-api Q&A route with correct system prompt

Read `services/associations-api/src/routes/qa.js`.

Replace the system prompt entirely. This is the most critical part of the implementation:

```js
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

Ask one question. Nothing else.`;
```

Update the full route handler:

```js
router.post('/question', requireAuth, async (req, res) => {
  try {
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

    // Validate it's actually a question
    if (!question.includes('?')) {
      return res.json({ question: null });
    }

    return res.json({ question });
  } catch (error) {
    console.error('POST /qa/question error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## Task E — Q&A Session component

Create `apps/associations/src/components/QASession.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { generateQuestion } from '../db/questions';

export default function QASession({ projectId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [noQuestions, setNoQuestions] = useState(false);

  useEffect(() => {
    loadQuestion();
  }, []);

  async function loadQuestion() {
    setLoading(true);
    try {
      // Check for existing unanswered questions first
      const unanswered = await window.electron.qa.getUnanswered({ projectId });
      if (unanswered.length > 0) {
        setQuestion(unanswered[0]);
        setLoading(false);
        return;
      }

      // Generate a new question
      const entries = await window.electron.db.getPoolEntries({ projectId });
      if (entries.length < 5) {
        setNoQuestions(true);
        setLoading(false);
        return;
      }

      // Get recent compose text from saved document
      const saved = await window.electron.document.load({ documentId: 'default' });
      if (!saved || saved.trim().split(/\s+/).length < 200) {
        setNoQuestions(true);
        setLoading(false);
        return;
      }

      const generated = await generateQuestion({
        projectId,
        recentText: saved,
        poolEntries: entries,
      });

      if (!generated) {
        setNoQuestions(true);
        setLoading(false);
        return;
      }

      // Save the question
      const id = window.crypto.randomUUID();
      await window.electron.qa.save({
        id,
        projectId,
        question: generated,
        sourceExcerpt: saved.slice(-400),
        askedAsGhost: false,
      });

      setQuestion({ id, question: generated });
    } catch (err) {
      console.error('Q&A load error:', err);
      setNoQuestions(true);
    }
    setLoading(false);
  }

  async function handleAnswer() {
    if (!answer.trim() || !question) return;
    setSaving(true);
    await window.electron.qa.answer({ id: question.id, answer: answer.trim() });

    // Add answer to pool
    const { addToPool } = await import('../db/pool');
    await addToPool({
      projectId,
      content: answer.trim(),
      source: 'qa',
    });

    setDone(true);
    setSaving(false);
  }

  async function handleDismiss() {
    if (question) {
      await window.electron.qa.dismiss({ id: question.id });
    }
    onClose();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(42,40,37,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
    }}>
      <div style={{
        background: 'var(--bg)',
        borderRadius: '12px',
        padding: '48px',
        width: '520px',
        maxWidth: '90vw',
      }}>
        {loading ? (
          <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '16px', color: 'var(--text-muted)' }}>
            Reading…
          </p>
        ) : noQuestions ? (
          <>
            <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '17px', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '32px' }}>
              Nothing to ask right now.
            </p>
            <button
              onClick={onClose}
              style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.08em', color: 'var(--text-muted)', background: 'none', border: '0.5px solid var(--text-faint)', borderRadius: '6px', padding: '10px 24px', cursor: 'pointer' }}
            >
              Close
            </button>
          </>
        ) : done ? (
          <>
            <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '17px', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '32px' }}>
              Your answer is in the pool now.
            </p>
            <button
              onClick={onClose}
              style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.08em', color: 'var(--text-muted)', background: 'none', border: '0.5px solid var(--text-faint)', borderRadius: '6px', padding: '10px 24px', cursor: 'pointer' }}
            >
              Close
            </button>
          </>
        ) : (
          <>
            <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '20px', color: 'var(--text)', lineHeight: '1.6', marginBottom: '36px' }}>
              {question?.question}
            </p>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Answer however you want. Or don't."
              rows={5}
              style={{
                width: '100%',
                fontFamily: "'Lora', serif",
                fontSize: '16px',
                lineHeight: '1.8',
                color: 'var(--text)',
                background: 'transparent',
                border: 'none',
                borderTop: '0.5px solid var(--border)',
                borderBottom: '0.5px solid var(--border)',
                outline: 'none',
                padding: '20px 0',
                resize: 'none',
                marginBottom: '28px',
              }}
            />
            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                onClick={handleAnswer}
                disabled={!answer.trim() || saving}
                style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.08em', color: 'var(--text-muted)', background: 'none', border: '0.5px solid var(--text-faint)', borderRadius: '6px', padding: '10px 24px', cursor: 'pointer' }}
              >
                {saving ? 'Saving…' : 'Add to pool'}
              </button>
              <button
                onClick={handleDismiss}
                style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.08em', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Not now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## Task F — Wire Q&A Session into App

Read `apps/associations/src/App.jsx`.

Add Q&A session trigger. It lives alongside the folder watch trigger — accessible from the bottom-left corner label area. Add a "questions" label next to "folders":

```jsx
import QASession from './components/QASession';

// Add state:
const [showQA, setShowQA] = useState(false);
```

Update the bottom-left corner to show both:

```jsx
<span style={{
  position: 'absolute', bottom: 14, left: 20,
  fontFamily: "'Poppins', sans-serif", fontSize: '10px',
  color: 'var(--text-faint)', letterSpacing: '0.08em',
  zIndex: 10, userSelect: 'none',
  display: 'flex', gap: '16px',
}}>
  <span onClick={() => setShowFolderWatch(true)} style={{ cursor: 'pointer' }}>folders</span>
  <span onClick={() => setShowQA(true)} style={{ cursor: 'pointer' }}>questions</span>
</span>
```

Add the QA session overlay:

```jsx
{showQA && (
  <QASession
    projectId="default"
    onClose={() => setShowQA(false)}
  />
)}
```

---

## Task G — Question ghosts (inline questions while composing)

Read `apps/associations/src/components/Compose.jsx` and `apps/associations/src/db/ghosts.js`.

Question ghosts appear approximately one for every four passage ghosts. They use the same ghost mechanic — same fade-in, same three responses.

**In `Compose.jsx`**, add a ghost question counter ref:

```js
const passageGhostCountRef = useRef(0);
```

In `checkForGhost`, after a passage ghost is shown, increment the counter. When counter reaches 4, attempt a question ghost instead:

```js
// After setGhost(found) for a passage ghost:
passageGhostCountRef.current += 1;

// If counter has reached 4, next check should try a question ghost
if (passageGhostCountRef.current >= 4) {
  passageGhostCountRef.current = 0;
  // Question ghost will be attempted on next check
}
```

Add a `questionGhostPending` ref and generate question ghost asynchronously:

```js
const questionGhostPending = useRef(false);
```

When counter resets to 0 after 4 passage ghosts, generate a question:

```js
if (passageGhostCountRef.current === 0 && !ghost) {
  questionGhostPending.current = true;
}
```

In `checkForGhost`, if `questionGhostPending` is true, generate a question ghost instead of a passage ghost:

```js
if (questionGhostPending.current) {
  questionGhostPending.current = false;
  const entries = await window.electron.db.getPoolEntries({ projectId });
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
    // Show as ghost with question content
    setGhost({ id, content: q, isQuestion: true });
    setWatching(false);
    return;
  }
}
```

**In `Ghost.jsx`**, when `ghost.isQuestion` is true, style the ghost text slightly differently — perhaps in a lighter weight — to signal it's a question rather than a passage. No structural changes, just a subtle visual distinction:

```jsx
<p style={{
  fontFamily: "'Lora', serif",
  fontStyle: ghost.isQuestion ? 'normal' : 'italic',
  fontWeight: ghost.isQuestion ? '400' : '400',
  fontSize: '15px',
  lineHeight: '1.75',
  color: ghost.isQuestion ? 'var(--text-muted)' : 'var(--text-faint)',
  ...
}}>
```

When a question ghost is kept, the writer should be prompted to answer. For now, keeping a question ghost just stores it in `kept_ghosts` the same as a passage ghost — the answer comes later in a Q&A session where unanswered questions surface first.

---

## Verification Checklist

- [ ] `questions` label appears in bottom-left corner alongside `folders`
- [ ] Clicking `questions` opens Q&A session
- [ ] With insufficient writing, session shows "Nothing to ask right now."
- [ ] With sufficient writing, a question appears that points to something already in the text
- [ ] Question is never a prompt — it asks about something already present
- [ ] Answering adds the answer to the pool
- [ ] "Not now" dismisses without answering
- [ ] After 4 passage ghosts, a question ghost is attempted
- [ ] Question ghost visually distinct from passage ghost
- [ ] associations-api deployed with updated system prompt
- [ ] No other files modified outside this list
