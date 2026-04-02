# Associations — Ghost UX Fixes

## Context

Read `apps/associations/docs/ASSOCIATIONS_ARCHITECTURE.md` before starting.

The ghost mechanic is working. This prompt fixes several UX issues identified in first use. Read every file before touching it. No scope creep. No other files modified outside this list.

---

## Issues to Fix

1. Ghost is surfacing current session writing — compose text is saved to pool every 30s, matching against itself
2. Same ghost returns after dismissal — shownGhostIds not persisting correctly
3. Ghost overlay has no visual differentiation from writing beneath it
4. Ghost action buttons (let it go / watch / keep) are hard to see
5. macOS traffic light buttons are covered by the writing surface
6. No confirmation when a ghost is kept

---

## Task A — Exclude current session from pool matches

Read `apps/associations/src/db/ghosts.js` and `apps/associations/src/db/pool.js`.

The ghost finder must never surface passages that were added during the current session. Add a session ID that is generated once when the app starts and passed to `addToPool` and `findGhost`.

**In `apps/associations/src/db/pool.js`**, add a `sessionId` parameter:

```js
import { generateEmbedding } from './embeddings';
import { v4 as uuidv4 } from 'uuid';

// Session ID — generated once per app launch, never persists
export const SESSION_ID = uuidv4();

export async function addToPool({ projectId, content, source = 'compose' }) {
  const id = uuidv4();
  const wordCount = content.trim().split(/\s+/).length;
  const embedding = await generateEmbedding(content);

  await window.electron.db.addPoolEntry({
    id,
    projectId,
    source,
    content,
    embedding,
    wordCount,
    sessionId: SESSION_ID,
  });

  return id;
}
```

**In `apps/associations/electron/main.js`**, update the schema to add `session_id` to `pool_entries`, and add the migration:

```js
// Add session_id column if it doesn't exist
try {
  db.exec(`ALTER TABLE pool_entries ADD COLUMN session_id TEXT`);
} catch (e) { /* already exists */ }
```

Update `db-add-pool-entry` handler to store `sessionId`:

```js
ipcMain.handle('db-add-pool-entry', (event, { id, projectId, source, content, embedding, wordCount, sessionId }) => {
  const embeddingBuffer = embedding
    ? Buffer.from(new Float32Array(embedding).buffer)
    : null;
  db.prepare(`INSERT OR IGNORE INTO pool_entries (id, project_id, source, content, embedding, word_count, session_id) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, projectId, source, content, embeddingBuffer, wordCount, sessionId || null);
  return true;
});
```

Update `db-get-pool-entries` to accept and exclude a `sessionId`:

```js
ipcMain.handle('db-get-pool-entries', (event, { projectId, excludeSessionId }) => {
  if (excludeSessionId) {
    return db.prepare(`
      SELECT id, content, embedding FROM pool_entries
      WHERE project_id = ?
        AND embedding IS NOT NULL
        AND (session_id IS NULL OR session_id != ?)
    `).all(projectId, excludeSessionId);
  }
  return db.prepare(`
    SELECT id, content, embedding FROM pool_entries
    WHERE project_id = ? AND embedding IS NOT NULL
  `).all(projectId);
});
```

**In `apps/associations/src/db/ghosts.js`**, import `SESSION_ID` and pass it:

```js
import { SESSION_ID } from './pool';

export async function findGhost({ projectId, currentText, excludeIds = [] }) {
  if (!currentText || currentText.trim().length < MIN_ENTRY_LENGTH) return null;

  const entries = await window.electron.db.getPoolEntries({
    projectId,
    excludeSessionId: SESSION_ID,
  });

  // ... rest of function unchanged
}
```

**In `apps/associations/src/db/ingest.js`**, do NOT use SESSION_ID — folder ingestion should always be available as ghost material:

No change needed — folder ingestion passes `source: 'folder'` and no sessionId, so it will always be available.

---

## Task B — Prevent same ghost returning after dismissal

Read `apps/associations/src/components/Compose.jsx`.

The `shownGhostIds` array grows during the session but the ghost finder still returns the same ghost if it's the only one above threshold. Two fixes:

**Fix 1** — Raise the similarity threshold for ghost finding. In `apps/associations/src/db/ghosts.js`, change:

```js
const SIMILARITY_THRESHOLD = 0.72;
```

To:

```js
const SIMILARITY_THRESHOLD = 0.78;
```

**Fix 2** — After all pool entries have been shown, reset `shownGhostIds` so new writing can surface ghosts again, rather than returning the same one. In `Compose.jsx`, in `checkForGhost`:

```js
const found = await findGhost({
  projectId,
  currentText: content,
  excludeIds: shownGhostIds,
});

if (found) {
  setGhost(found);
  setWatching(false);
} else if (shownGhostIds.length > 0) {
  // All ghosts shown — reset so new writing can surface fresh ones
  // But only reset if we've written significantly more since last ghost
  setShownGhostIds([]);
}
```

---

## Task C — Frosted ghost overlay

Read `apps/associations/src/components/Ghost.jsx`.

The ghost overlay needs visual separation from the writing beneath it. Replace the gradient background with a frosted glass effect:

Find the outer div style and replace the background with:

```js
background: 'rgba(245, 243, 239, 0.85)',
backdropFilter: 'blur(12px)',
WebkitBackdropFilter: 'blur(12px)',
borderBottom: '0.5px solid rgba(42, 40, 37, 0.08)',
```

Remove the linear-gradient background entirely. The blur creates depth without a hard edge.

---

## Task D — Ghost action button visibility

Read `apps/associations/src/components/Ghost.jsx`.

The action buttons need more contrast. Update all three button colors from `var(--text-faint)` to `var(--text-muted)`. And add a subtle visual separator above the buttons:

```jsx
<div style={{
  display: 'flex',
  gap: '28px',
  paddingTop: '12px',
  borderTop: '0.5px solid rgba(42, 40, 37, 0.08)',
}}>
```

Also increase button font size from `10px` to `11px` and letter spacing from `0.1em` to `0.08em`.

---

## Task E — Clear macOS traffic lights

Read `apps/associations/src/components/Compose.jsx`.

The writing surface starts at `inset: 0` which places content behind the macOS traffic light buttons. Add top padding to the writing area:

Find the writing surface div and change:

```js
padding: '64px 10vw 64px',
```

To:

```js
padding: '48px 10vw 64px',
paddingTop: 'max(48px, env(safe-area-inset-top, 48px))',
```

Also in `apps/associations/electron/main.js`, the corner labels need to clear the traffic lights. Find the corner label positioning for top-left and top-right and change `top: 16` to `top: 20` for both — they're already at 16px which clips under the traffic lights on some window sizes.

Actually the more reliable fix is to add a `trafficLightPosition` to the BrowserWindow config in `main.js`:

```js
trafficLightPosition: { x: 16, y: 20 },
```

Add this inside the BrowserWindow options alongside `titleBarStyle: 'hiddenInset'`.

---

## Task F — Keep confirmation

Read `apps/associations/src/components/Compose.jsx`.

When a ghost is kept, show a brief confirmation. Add state:

```js
const [keptConfirm, setKeptConfirm] = useState(false);
```

In `handleKeep`, after dismissing the ghost:

```js
setKeptConfirm(true);
setTimeout(() => setKeptConfirm(false), 2000);
```

Add the confirmation display alongside the corner labels:

```jsx
{keptConfirm && (
  <span style={{
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    fontFamily: "'Poppins', sans-serif",
    fontSize: '10px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    zIndex: 10,
    userSelect: 'none',
    animation: 'fadeOut 2s ease-in forwards',
  }}>
    kept
  </span>
)}
```

Add to `globals.css`:

```css
@keyframes fadeOut {
  0%, 60% { opacity: 1; }
  100% { opacity: 0; }
}
```

---

## Task G — Smaller passages for tighter associations

Read `apps/associations/src/db/ingest.js`.

The current passage size (200 words max) is too large. A ghost should be a sentence or two — the smallest unit that carries a complete idea. Replace the `splitIntoPassages` function entirely:

```js
const PASSAGE_MIN_WORDS = 10;
const PASSAGE_MAX_WORDS = 40;

function splitIntoPassages(text) {
  // Split into sentences first
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text.trim()];
  const passages = [];
  let current = [];
  let wordCount = 0;

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    const words = trimmed.split(/\s+/).length;

    if (wordCount + words > PASSAGE_MAX_WORDS && current.length > 0) {
      const passage = current.join(' ').trim();
      if (passage.split(/\s+/).length >= PASSAGE_MIN_WORDS) {
        passages.push(passage);
      }
      // Overlap — keep last sentence for context continuity
      current = [current[current.length - 1]];
      wordCount = current[0]?.split(/\s+/).length || 0;
    }

    current.push(trimmed);
    wordCount += words;
  }

  if (current.length > 0) {
    const passage = current.join(' ').trim();
    if (passage.split(/\s+/).length >= PASSAGE_MIN_WORDS) {
      passages.push(passage);
    }
  }

  return passages;
}
```

After making this change, the existing pool entries are too large. Clear them so re-sync creates properly sized passages. Add a one-time cleanup to `apps/associations/electron/main.js` after the schema initialization:

```js
// Clear oversized pool entries from previous ingestion (one-time migration)
const oversized = db.prepare(`
  SELECT COUNT(*) as count FROM pool_entries WHERE source = 'folder' AND word_count > 50
`).get();
if (oversized.count > 0) {
  db.prepare(`DELETE FROM pool_entries WHERE source = 'folder' AND word_count > 50`).run();
  db.prepare(`DELETE FROM watched_files`).run();
  console.log(`Cleared ${oversized.count} oversized pool entries — re-sync folders to rebuild`);
}
```

This forces a re-sync of all folders with the new passage size. The pool will be rebuilt correctly on next sync.

---

## Task H — Current session writing eligibility as ghost

Read `apps/associations/src/db/ghosts.js` and `apps/associations/src/components/Compose.jsx`.

Current session writing can eventually become eligible as a ghost — but only when it feels genuinely past. The rules:

- Minimum 300 words written since this passage was added to the pool
- The ghost text must be 2 sentences or fewer — never a full chunk

**In `apps/associations/src/db/ghosts.js`**, update `findGhost` to truncate current-session ghosts to 2 sentences:

```js
// After finding bestMatch:
if (bestMatch) {
  // Truncate to 2 sentences maximum
  const sentences = bestMatch.content.match(/[^.!?]+[.!?]+/g) || [bestMatch.content];
  bestMatch.content = sentences.slice(0, 2).join(' ').trim();
}

return bestMatch;
```

**In `apps/associations/src/components/Compose.jsx`**, pass current word count to ghost finder so session entries can be filtered by distance:

```js
const found = await findGhost({
  projectId,
  currentText: content,
  excludeIds: shownGhostIds,
  currentWordCount: wordCount,
});
```

**In `apps/associations/src/db/ghosts.js`**, update `findGhost` signature and the pool entries query to accept `currentWordCount`:

```js
export async function findGhost({ projectId, currentText, excludeIds = [], currentWordCount = 0 }) {
```

The session exclusion from Task A already handles this correctly — current session entries are excluded unless `excludeSessionId` logic allows them through after enough distance. The 2-sentence truncation above applies to all ghosts regardless of source, keeping them tight and precise.

---

## Verification Checklist

- [ ] Ghost does not surface text written in the current session
- [ ] Dismissed ghost does not immediately return
- [ ] Ghost overlay is visually distinct from writing — frosted background
- [ ] Action buttons readable without straining
- [ ] Traffic light buttons not covered by writing surface
- [ ] "kept" confirmation appears briefly when ghost is kept
- [ ] Terminal shows oversized pool entries cleared on startup
- [ ] After re-syncing folders, pool entries are 10-40 words each
- [ ] Ghost text is never more than 2 sentences
- [ ] No other files modified outside this list
