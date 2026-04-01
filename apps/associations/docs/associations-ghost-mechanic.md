# Associations — Ghost Mechanic

## Context

Read `docs/ARCHITECTURE.md`, `docs/CLAUDE.md`, and `apps/associations/docs/ASSOCIATIONS_ARCHITECTURE.md` before starting.

The scaffold is complete. The Electron app launches, the writing surface renders, and the API service is running. This prompt builds the ghost mechanic — the core of the product.

Read all files being modified before touching them. No scope creep. Verify after each task.

---

## What the Ghost Mechanic Does

When a writer is composing, the system continuously compares what they're writing against everything in their pool. When similarity crosses a threshold, a ghost candidate is identified. The ghost grows slowly from near-zero opacity to near-full strength over the top portion of the writing surface — an overlay that doesn't move the text beneath it.

The writer has three responses:
- **Let it go** — ghost recedes immediately
- **Watch** — ghost solidifies to full strength, door opens for more ghosts to arrive
- **Keep** — ghost attaches to the current passage, stored as a kept association

The ghost is always the writer's own words. The system never generates text.

---

## Task A — Local embedding generation

Read `apps/associations/src/db/embeddings.js`.

Replace with a working implementation using Transformers.js:

```js
import { pipeline } from '@xenova/transformers';

let embedder = null;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
  }
  return embedder;
}

export async function generateEmbedding(text) {
  const embed = await getEmbedder();
  const output = await embed(text, {
    pooling: 'mean',
    normalize: true,
  });
  return Array.from(output.data);
}

export function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function embeddingToBuffer(embedding) {
  return Buffer.from(new Float32Array(embedding).buffer);
}

export function bufferToEmbedding(buffer) {
  return Array.from(new Float32Array(buffer.buffer));
}
```

---

## Task B — Pool entry embedding on insert

Read `apps/associations/src/db/index.js`.

Add a function `addToPool` that inserts a pool entry and generates its embedding:

```js
import { generateEmbedding, embeddingToBuffer } from './embeddings';
import { v4 as uuidv4 } from 'uuid';
import db from './index';

export async function addToPool({ projectId, content, source = 'compose' }) {
  const id = uuidv4();
  const wordCount = content.trim().split(/\s+/).length;
  const embedding = await generateEmbedding(content);
  const embeddingBuffer = embeddingToBuffer(embedding);

  db.prepare(`
    INSERT INTO pool_entries (id, project_id, source, content, embedding, word_count)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, projectId, source, content, embeddingBuffer, wordCount);

  return id;
}
```

---

## Task C — Ghost finder

Create `apps/associations/src/db/ghosts.js`:

```js
import db from './index';
import { generateEmbedding, bufferToEmbedding, cosineSimilarity } from './embeddings';

const SIMILARITY_THRESHOLD = 0.72;
const MIN_ENTRY_LENGTH = 20; // characters — don't surface very short fragments

export async function findGhost({ projectId, currentText, excludeIds = [] }) {
  if (!currentText || currentText.trim().length < MIN_ENTRY_LENGTH) {
    return null;
  }

  // Get all pool entries for this project with embeddings
  const entries = db.prepare(`
    SELECT id, content, embedding
    FROM pool_entries
    WHERE project_id = ?
      AND embedding IS NOT NULL
      AND length(content) >= ?
    ORDER BY created_at DESC
    LIMIT 200
  `).all(projectId, MIN_ENTRY_LENGTH);

  if (entries.length === 0) return null;

  // Generate embedding for current text
  const currentEmbedding = await generateEmbedding(currentText.slice(-500));

  // Find best match above threshold, excluding already-shown ids
  let bestMatch = null;
  let bestScore = SIMILARITY_THRESHOLD;

  for (const entry of entries) {
    if (excludeIds.includes(entry.id)) continue;

    const entryEmbedding = bufferToEmbedding(entry.embedding);
    const score = cosineSimilarity(currentEmbedding, entryEmbedding);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = { id: entry.id, content: entry.content, score };
    }
  }

  return bestMatch;
}
```

---

## Task D — Ghost component

Read `apps/associations/src/components/Ghost.jsx`.

Replace entirely:

```jsx
import { useEffect, useState } from 'react';

const GROW_DURATION = 7000; // ms to reach near-full strength
const NEAR_FULL_OPACITY = 0.88;
const FULL_OPACITY = 1.0;

export default function Ghost({ ghost, onLetItGo, onWatch, onKeep, watching }) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (!ghost) {
      setOpacity(0);
      return;
    }

    // Grow from 0 to near-full over GROW_DURATION
    const start = performance.now();
    let frame;

    function grow(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / GROW_DURATION, 1);
      // Ease-in curve — slow at first, accelerates
      const eased = progress * progress * progress;
      setOpacity(eased * NEAR_FULL_OPACITY);

      if (progress < 1) {
        frame = requestAnimationFrame(grow);
      }
    }

    frame = requestAnimationFrame(grow);
    return () => cancelAnimationFrame(frame);
  }, [ghost]);

  // When watching, jump to full opacity
  useEffect(() => {
    if (watching) setOpacity(FULL_OPACITY);
  }, [watching]);

  if (!ghost) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0,
      padding: '40px 10vw 28px',
      background: `linear-gradient(to bottom,
        rgba(245,243,239,${opacity}) 0%,
        rgba(245,243,239,${opacity}) 65%,
        rgba(245,243,239,0) 100%
      )`,
      zIndex: 8,
      pointerEvents: opacity > 0.1 ? 'auto' : 'none',
      transition: watching ? 'none' : undefined,
    }}>
      <p style={{
        fontFamily: "'Lora', serif",
        fontStyle: 'italic',
        fontSize: '15px',
        lineHeight: '1.75',
        color: `rgba(42, 40, 37, ${opacity})`,
        marginBottom: '12px',
        maxWidth: '600px',
      }}>
        {ghost.content}
      </p>

      <div style={{ display: 'flex', gap: '24px', opacity }}>
        <button
          onClick={onLetItGo}
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '10px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          let it go
        </button>

        <button
          onClick={onWatch}
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '10px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: watching ? 'var(--text-muted)' : 'var(--text-faint)',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          {watching ? 'watching' : 'watch'}
        </button>

        <button
          onClick={onKeep}
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '10px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          keep
        </button>
      </div>
    </div>
  );
}
```

---

## Task E — Wire ghost mechanic into Compose

Read `apps/associations/src/components/Compose.jsx`.

Replace entirely with the full Compose implementation:

```jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import Ghost from './Ghost';
import { findGhost } from '../db/ghosts';
import { addToPool } from '../db/pool';
import db from '../db/index';

const GHOST_CHECK_INTERVAL = 4000; // check for ghost every 4s after pause
const PASSAGE_SAVE_INTERVAL = 30000; // save passage to pool every 30s
const MIN_WORDS_FOR_GHOST = 50; // don't look for ghosts until some writing exists

export default function Compose({ projectId, documentId, documentTitle = 'Untitled' }) {
  const [content, setContent] = useState('');
  const [ghost, setGhost] = useState(null);
  const [watching, setWatching] = useState(false);
  const [shownGhostIds, setShownGhostIds] = useState([]);

  const editorRef = useRef(null);
  const ghostCheckTimer = useRef(null);
  const passageSaveTimer = useRef(null);
  const lastContentRef = useRef('');

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  // Check for a ghost after the writer pauses
  const checkForGhost = useCallback(async () => {
    if (!content || wordCount < MIN_WORDS_FOR_GHOST) return;
    if (ghost) return; // already showing one

    const found = await findGhost({
      projectId,
      currentText: content,
      excludeIds: shownGhostIds,
    });

    if (found) {
      setGhost(found);
      setWatching(false);
    }
  }, [content, wordCount, ghost, projectId, shownGhostIds]);

  // Restart ghost check timer on every keystroke
  useEffect(() => {
    clearTimeout(ghostCheckTimer.current);
    ghostCheckTimer.current = setTimeout(checkForGhost, GHOST_CHECK_INTERVAL);
    return () => clearTimeout(ghostCheckTimer.current);
  }, [content, checkForGhost]);

  // Periodically save recent passage to pool
  useEffect(() => {
    clearTimeout(passageSaveTimer.current);
    passageSaveTimer.current = setTimeout(async () => {
      const current = content.trim();
      if (current && current !== lastContentRef.current && wordCount > 10) {
        // Save last ~200 words as a pool entry
        const words = current.split(/\s+/);
        const passage = words.slice(-200).join(' ');
        await addToPool({ projectId, content: passage, source: 'compose' });
        lastContentRef.current = current;
      }
    }, PASSAGE_SAVE_INTERVAL);
    return () => clearTimeout(passageSaveTimer.current);
  }, [content, wordCount, projectId]);

  function handleLetItGo() {
    if (ghost) setShownGhostIds(prev => [...prev, ghost.id]);
    setGhost(null);
    setWatching(false);
  }

  function handleWatch() {
    setWatching(true);
  }

  function handleKeep() {
    if (!ghost) return;

    // Save kept association to local db
    const crypto = window.crypto || require('crypto');
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO kept_ghosts (id, document_id, pool_entry_id)
      VALUES (?, ?, ?)
    `).run(id, documentId, ghost.id);

    // Mark the current position in the text with a tag dot
    // This is handled visually by the editor — store offset
    setShownGhostIds(prev => [...prev, ghost.id]);
    setGhost(null);
    setWatching(false);
  }

  return (
    <div style={{ height: '100vh', position: 'relative', overflow: 'hidden' }}>

      {/* Corner labels */}
      <span style={{
        position: 'absolute', top: 16, left: 20,
        fontFamily: "'Poppins', sans-serif", fontSize: '10px',
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--text-faint)', zIndex: 10, userSelect: 'none'
      }}>
        Associations
      </span>

      <span style={{
        position: 'absolute', top: 16, right: 20,
        fontFamily: "'Poppins', sans-serif", fontSize: '10px',
        color: 'var(--text-faint)', letterSpacing: '0.06em',
        zIndex: 10, userSelect: 'none'
      }}>
        {documentTitle}
      </span>

      <span style={{
        position: 'absolute', bottom: 14, right: 20,
        fontFamily: "'Poppins', sans-serif", fontSize: '10px',
        color: 'var(--text-faint)', letterSpacing: '0.06em',
        zIndex: 10, userSelect: 'none'
      }}>
        {wordCount.toLocaleString()} words
      </span>

      {/* Fade at bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '40px', zIndex: 5, pointerEvents: 'none',
        background: 'linear-gradient(to top, var(--bg) 0%, transparent 100%)'
      }} />

      {/* Ghost overlay */}
      <Ghost
        ghost={ghost}
        watching={watching}
        onLetItGo={handleLetItGo}
        onWatch={handleWatch}
        onKeep={handleKeep}
      />

      {/* Writing surface */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => setContent(e.currentTarget.innerText)}
        style={{
          position: 'absolute',
          inset: 0,
          padding: '64px 10vw 64px',
          fontFamily: "'Lora', serif",
          fontSize: '20px',
          lineHeight: '2',
          color: 'var(--text)',
          outline: 'none',
          overflowY: 'auto',
          caretColor: 'var(--text-muted)',
          zIndex: 1,
        }}
      />
    </div>
  );
}
```

---

## Task F — Trial word counter

The trial word counter needs to report words written in Compose mode to the API. This happens in the background — the writer never sees it happen.

Read `apps/associations/src/api/client.js`.

Add a `reportWords` function:

```js
export async function reportWords(count) {
  const token = await window.electron.getToken();
  if (!token) return;

  try {
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/words`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ count }),
    });
  } catch {
    // Silent fail — trial counting is best effort
  }
}
```

In `Compose.jsx`, import `reportWords` and call it in the passage save timer alongside the pool save:

```js
import { reportWords } from '../api/client';

// Inside the passage save timer, after addToPool:
const newWords = current.split(/\s+/).length
  - (lastContentRef.current?.split(/\s+/).length || 0);
if (newWords > 0) await reportWords(newWords);
```

---

## Task G — Trial exhaustion screen

In `apps/associations/src/App.jsx`, after the auth check, also fetch the user profile from the API. If `can_write` is false, show the trial exhaustion screen instead of Compose.

Add to `App.jsx`:

```jsx
const [userProfile, setUserProfile] = useState(null);

useEffect(() => {
  if (authed) {
    fetchUserProfile().then(setUserProfile);
  }
}, [authed]);
```

Add the trial exhaustion screen:

```jsx
if (authed && userProfile && !userProfile.can_write) {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '24px',
      padding: '48px',
      textAlign: 'center',
    }}>
      <p style={{
        fontFamily: "'Lora', serif",
        fontStyle: 'italic',
        fontSize: '22px',
        color: 'var(--text)',
        lineHeight: '1.6',
        maxWidth: '400px',
      }}>
        Your ghosts know you a little now.
      </p>
      <p style={{
        fontFamily: "'Lora', serif",
        fontSize: '15px',
        color: 'var(--text-muted)',
      }}>
        Subscribe to keep writing.
      </p>
      <button
        onClick={() => {
          // Stripe checkout — URL from API
          fetchCheckoutUrl().then(url => window.electron.openExternal(url));
        }}
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: '13px',
          background: 'none',
          border: '0.5px solid var(--text-faint)',
          color: 'var(--text-muted)',
          padding: '10px 28px',
          borderRadius: '6px',
          cursor: 'pointer',
          letterSpacing: '0.06em',
          marginTop: '8px',
        }}
      >
        Subscribe
      </button>
    </div>
  );
}
```

---

## Verification Checklist

- [ ] `npm run dev` launches without errors
- [ ] Writing surface renders and accepts input
- [ ] After 4 seconds of no typing, ghost check fires (check console)
- [ ] With enough pool entries, a ghost appears and grows slowly
- [ ] Let it go — ghost recedes, does not reappear immediately
- [ ] Watch — ghost solidifies to full opacity
- [ ] Keep — ghost stored in `kept_ghosts` table, ghost dismisses
- [ ] Word count in corner updates correctly
- [ ] Trial word reporting calls API in background
- [ ] Trial exhaustion screen shows when `can_write` is false
- [ ] No layout shift when ghost appears — writing surface does not move

## Do Not Build Yet

- Folder watch
- Q&A UI
- Stripe checkout UI
- Outline mode
- Multiple simultaneous ghosts (watching — V2)
- Phone companion app
