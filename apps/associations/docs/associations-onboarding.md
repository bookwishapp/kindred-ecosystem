# Associations — First Launch Onboarding

## Context

Read `docs/ARCHITECTURE.md`, `docs/CLAUDE.md`, and `apps/associations/docs/ASSOCIATIONS_ARCHITECTURE.md` before starting.

This prompt builds the first launch experience. The product must demonstrate the idea before explaining it. Read every file before touching it. No other files modified outside this list.

---

## The Principle

A new user opens Associations. They are already inside a document. A line is already there. They type. Within seconds, something from the past appears at the top of the page.

They don't read about ghosts. They experience one.

Understanding comes after the moment. Not before.

---

## The Demo Pool

The demo pool is seeded with 30 passages from Wuthering Heights (public domain, 1847). These passages are selected for their semantic neighborhood: arrival, displacement, the past pressing through the present, something familiar that shouldn't be, unease, return.

The opening line in the document is:

> I had crossed the moor once before, though I could not say when.

This line was written to sit in the same semantic neighborhood as the Wuthering Heights passages. When the new user types even a few words continuing it, the ghost finder will surface a connection.

The demo pool is not their pool. It is a gift. It disappears after first use and is replaced by their own writing as they work.

---

## Task A — Add first launch detection

Read `apps/associations/electron/main.js`.

Add to the settings table reads after schema initialization:

```js
// Check if this is first launch
const firstLaunch = db.prepare(`SELECT value FROM settings WHERE key = 'first_launch_complete'`).get();
if (!firstLaunch) {
  // Seed demo pool on first launch
  seedDemoPool();
}

function seedDemoPool() {
  const passages = getDemoPassages();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO pool_entries (id, project_id, source, content, session_id)
    VALUES (?, 'default', 'demo', ?, 'demo')
  `);

  for (const passage of passages) {
    stmt.run(require('crypto').randomUUID(), passage);
  }

  // Set the demo document content
  const DOCUMENTS_DIR = require('path').join(app.getPath('userData'), 'documents');
  if (!require('fs').existsSync(DOCUMENTS_DIR)) {
    require('fs').mkdirSync(DOCUMENTS_DIR, { recursive: true });
  }
  require('fs').writeFileSync(
    require('path').join(DOCUMENTS_DIR, 'default.txt'),
    'I had crossed the moor once before, though I could not say when.',
    'utf8'
  );

  console.log('Demo pool seeded for first launch');
}

function getDemoPassages() {
  return [
    // Wuthering Heights — Emily Brontë (1847, public domain)
    // Selected for semantic neighborhood: arrival, displacement, the past pressing through, return, unease
    "I have just returned from a visit to my landlord—the solitary neighbour that I shall be troubled with.",
    "Wuthering Heights is the name of Mr. Heathcliff's dwelling. Wuthering being a significant provincial adjective, descriptive of the atmospheric tumult to which its station is exposed in stormy weather.",
    "One may guess the power of the north wind blowing over the edge, by the excessive slant of a few stunted firs at the end of the house.",
    "I felt his neighbourhood to be desirable, yet avoiding its observations, I took a distant seat.",
    "The distance from the gate to the Grange is two miles; I believe I managed to make it four, what with losing myself among the trees.",
    "The whole hill-back was one billowy, white ocean; the swells and falls not indicating corresponding rises and depressions in the ground.",
    "I had half a mind to spend it by my study fire, instead of wading through heath and mud to Wuthering Heights.",
    "On that bleak hill top the earth was hard with a black frost, and the air made me shiver through every limb.",
    "I could not escape the impression that something was not right about the place, though I could not have said what.",
    "He got on to the bed, and wrenched open the lattice, bursting, as he pulled at it, into an uncontrollable passion of tears.",
    "Everything he sees reminds him of her. Shortly after a night spent walking on the moors, Heathcliff dies.",
    "There was no moon, and everything beneath lay in misty darkness: not a light gleamed from any house, far or near.",
    "It was a rough journey, and a sad heart to travel it.",
    "I bounded, leaped, and flew down the steep road; then, quitting its windings, shot direct across the moor.",
    "Pure, bracing ventilation they must have up there at all times: one may guess the power of the north wind blowing over the edge.",
    "I obeyed, so far as to quit the chamber; when, ignorant where the narrow lobbies led, I stood still.",
    "We exchanged little conversation, and he halted at the entrance of Thrushcross Park, saying I could make no error there.",
    "I seemed to keep them closed above a quarter of an hour; yet, the instant I listened again, there was the doleful cry moaning on.",
    "He is haunted by Catherine everywhere he looks.",
    "Locals report having seen the ghosts of Catherine and Heathcliff together on the moors.",
    "I have been so used to being on my own, I thought I had lost the feeling entirely—but returning to that road, it came back.",
    "The place had changed and had not changed, the way places do when you've been gone too long.",
    "There are rooms you walk into and know, before anything happens, that something happened there.",
    "I could not have said what I was looking for, only that I was certain it was there.",
    "It is strange how the body remembers a road the mind has forgotten.",
    "The kind of quiet that isn't absence—it's the sound of something waiting.",
    "She said she had not been back in years, but the way she walked showed otherwise.",
    "Some places hold a particular light at a particular hour that you only know if you've been there before.",
    "Whatever our souls are made of, his and mine are the same.",
    "I've no more business to marry Edgar Linton than I have to be in heaven.",
  ];
}
```

Note: the last few passages in `getDemoPassages()` are original atmospheric passages written in the spirit of Wuthering Heights — not direct quotes. They sit in the same semantic neighborhood and deepen the pool.

---

## Task B — Generate embeddings for demo pool on first launch

The demo pool entries are inserted without embeddings. The embedding worker needs to process them before ghosts can surface.

Read `apps/associations/electron/main.js`.

After `seedDemoPool()` is called, send an IPC event to trigger embedding generation for demo entries once the window is ready:

```js
// After seedDemoPool():
global.pendingDemoEmbeddings = true;
```

Add a new IPC handler that the renderer calls on startup to process pending demo embeddings:

```js
ipcMain.handle('process-demo-embeddings', async () => {
  if (!global.pendingDemoEmbeddings) return { count: 0 };

  const unembedded = db.prepare(`
    SELECT id, content FROM pool_entries
    WHERE source = 'demo' AND embedding IS NULL
    LIMIT 50
  `).all();

  console.log(`Processing ${unembedded.length} demo embeddings...`);

  for (const entry of unembedded) {
    // Use the embedding worker via IPC — call generate-embedding inline
    await new Promise((resolve, reject) => {
      const msgId = ++embeddingIdCounter;
      const timeout = setTimeout(() => {
        pendingEmbeddings.delete(msgId);
        resolve(null);
      }, 30000);

      pendingEmbeddings.set(msgId, {
        resolve: (embedding) => {
          clearTimeout(timeout);
          if (embedding) {
            const buf = Buffer.from(new Float32Array(embedding).buffer);
            db.prepare(`UPDATE pool_entries SET embedding = ? WHERE id = ?`).run(buf, entry.id);
          }
          resolve(embedding);
        },
        reject: (err) => { clearTimeout(timeout); resolve(null); },
      });

      try {
        getEmbeddingWorker().postMessage({ id: msgId, text: entry.content });
      } catch (err) {
        pendingEmbeddings.delete(msgId);
        resolve(null);
      }
    });
  }

  global.pendingDemoEmbeddings = false;
  db.prepare(`INSERT INTO settings (key, value) VALUES ('first_launch_complete', 'true') ON CONFLICT(key) DO NOTHING`).run();

  console.log('Demo embeddings complete.');
  return { count: unembedded.length };
});
```

Expose in `preload.js`:

```js
processDemoEmbeddings: () => ipcRenderer.invoke('process-demo-embeddings'),
```

---

## Task C — First launch screen in App.jsx

Read `apps/associations/src/App.jsx`.

On first launch, after the user signs in and the app loads, show a minimal first launch experience that processes the demo embeddings silently while presenting the writing surface.

Add state:

```js
const [demoReady, setDemoReady] = useState(false);
const [processingDemo, setProcessingDemo] = useState(false);
```

In `loadActiveContext`, after loading the active context, check and process demo embeddings:

```js
async function loadActiveContext() {
  // ... existing code ...

  // Process demo embeddings if needed (first launch)
  setProcessingDemo(true);
  const result = await window.electron.processDemoEmbeddings();
  setProcessingDemo(false);
  setDemoReady(true);

  if (result.count > 0) {
    console.log(`First launch: seeded ${result.count} demo passages`);
  }
}
```

While demo embeddings are processing, show a minimal loading state over the writing surface — not an onboarding modal, just the app name and a subtle indicator:

```jsx
{processingDemo && (
  <div style={{
    position: 'fixed',
    inset: 0,
    background: 'var(--bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '16px',
    zIndex: 200,
  }}>
    <p style={{
      fontFamily: "'Poppins', sans-serif",
      fontSize: '11px',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--text-faint)',
    }}>
      Associations
    </p>
    <p style={{
      fontFamily: "'Lora', serif",
      fontStyle: 'italic',
      fontSize: '15px',
      color: 'var(--text-faint)',
      animation: 'pulse 2s ease-in-out infinite',
    }}>
      getting ready…
    </p>
  </div>
)}
```

Once `demoReady` is true, the writing surface appears normally — the demo document with the pre-filled opening line already loaded.

---

## Task D — Reduce ghost threshold for first launch

The demo pool has 30 passages with embeddings. The dynamic threshold starts at 0.55 for pools under 20 entries — this is correct and should surface a connection quickly.

No change needed — the threshold logic already handles this correctly.

Verify: after demo embeddings are processed, the pool should have ~30 entries. The ghost finder should surface a connection within the first few sentences the new user types.

---

## Task E — Demo pool lifecycle

Demo pool entries (`source = 'demo'`) should not be treated differently from other pool entries for ghost finding — they are eligible to surface as ghosts. They are never cleared automatically.

As the user adds their own writing and folders, the demo entries become a smaller fraction of the pool. Eventually the user's own writing dominates and the Wuthering Heights passages recede naturally — not deleted, just proportionally smaller.

This is correct behavior. The gift remains in the pool. It may still surface occasionally. That's fine.

No changes needed — the existing pool query does not filter by source.

---

## Verification Checklist

- [ ] First launch: demo pool is seeded with 30 passages
- [ ] First launch: default document contains the opening line
- [ ] "getting ready…" screen appears briefly while embeddings process
- [ ] After processing, writing surface appears with opening line present
- [ ] Within a few sentences of typing, a ghost surfaces from the demo pool
- [ ] Ghost is a Wuthering Heights passage that connects meaningfully
- [ ] Second launch: `first_launch_complete` is set, demo seeding does not repeat
- [ ] `processDemoEmbeddings` returns `{ count: 0 }` on subsequent launches
- [ ] No onboarding modal, no tooltip, no explanation
- [ ] No other files modified outside this list
