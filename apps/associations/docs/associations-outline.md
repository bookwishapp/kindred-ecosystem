# Associations — Outline Mode

## Context

Read `docs/ARCHITECTURE.md`, `docs/CLAUDE.md`, and `apps/associations/docs/ASSOCIATIONS_ARCHITECTURE.md` before starting.

This prompt builds Outline mode — a structural view of the project's documents, their kept ghosts, and tagged passages. Read every file before touching it. No scope creep. No other files modified outside this list.

---

## What Outline Mode Is

Outline mode is not a writing surface. It is a structural view — a place to see the shape of the work.

It shows:
- All documents in the current project, in their current order
- Word count per document
- Kept ghosts attached to each document — the associations the writer chose to hold
- Tagged passages (marked with the dot) within each document

The writer can reorder documents by dragging. That reordering is the outline — not a separate outline document, but the sequence of the work itself.

Kept ghosts are visible alongside the document they were kept from. They are read-only — you can't edit them here, but you can release them (remove the kept association) if they no longer belong.

Tagged passages are visible as a list under each document. Clicking a tagged passage opens that document at that passage (for a later iteration — for V1, just show the text).

Outline mode is accessed via the View menu (to be added) or keyboard shortcut Cmd+2. Compose is Cmd+1.

---

## Task A — Add tagged passages to database

Read `apps/associations/electron/main.js`.

The `kept_ghosts` table exists. Tagged passages need their own table — currently tags are only visual (a dot in the margin). Add storage:

```sql
CREATE TABLE IF NOT EXISTS tagged_passages (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  content TEXT NOT NULL,
  character_offset INTEGER,
  tagged_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);
```

Migration for existing databases:

```js
try {
  db.exec(`CREATE TABLE IF NOT EXISTS tagged_passages (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    content TEXT NOT NULL,
    character_offset INTEGER,
    tagged_at TEXT DEFAULT (datetime('now'))
  )`);
} catch(e) {}
```

Add IPC handlers:

```js
ipcMain.handle('tag-add', (event, { id, documentId, projectId, content, characterOffset }) => {
  db.prepare(`
    INSERT OR IGNORE INTO tagged_passages (id, document_id, project_id, content, character_offset)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, documentId, projectId, content, characterOffset || 0);
  return true;
});

ipcMain.handle('tag-list', (event, { documentId }) => {
  return db.prepare(`
    SELECT * FROM tagged_passages WHERE document_id = ? ORDER BY character_offset ASC
  `).all(documentId);
});

ipcMain.handle('tag-remove', (event, { id }) => {
  db.prepare(`DELETE FROM tagged_passages WHERE id = ?`).run(id);
  return true;
});

ipcMain.handle('kept-ghost-list', (event, { documentId }) => {
  return db.prepare(`
    SELECT kg.*, pe.content as ghost_content
    FROM kept_ghosts kg
    JOIN pool_entries pe ON pe.id = kg.pool_entry_id
    WHERE kg.document_id = ?
    ORDER BY kg.created_at ASC
  `).all(documentId);
});

ipcMain.handle('kept-ghost-remove', (event, { id }) => {
  db.prepare(`DELETE FROM kept_ghosts WHERE id = ?`).run(id);
  return true;
});
```

---

## Task B — Expose outline IPC in preload

Read `apps/associations/electron/preload.js`.

Add to contextBridge:

```js
tags: {
  add: (data) => ipcRenderer.invoke('tag-add', data),
  list: (data) => ipcRenderer.invoke('tag-list', data),
  remove: (data) => ipcRenderer.invoke('tag-remove', data),
},
keptGhosts: {
  list: (data) => ipcRenderer.invoke('kept-ghost-list', data),
  remove: (data) => ipcRenderer.invoke('kept-ghost-remove', data),
},
```

---

## Task C — Tag keystroke in Compose

Read `apps/associations/src/components/Compose.jsx`.

Add tagging to the compose surface. When the writer presses `*` at the start of a line or after a space, the current sentence or selection is tagged and a dot appears at the margin.

In `handleKeyDown`, add before the Enter handler:

```js
if (e.key === '*') {
  e.preventDefault();
  const sel = window.getSelection();
  if (!sel.rangeCount) return;

  // Get the current paragraph text
  const range = sel.getRangeAt(0);
  const container = range.startContainer;
  const paraEl = container.nodeType === 3 ? container.parentElement : container;
  const paraText = paraEl.innerText || paraEl.textContent || '';

  if (paraText.trim().length < 5) return; // too short to tag

  // Add visual dot marker
  paraEl.style.borderLeft = '2px solid var(--text-faint)';
  paraEl.style.paddingLeft = '12px';
  paraEl.style.marginLeft = '-14px';

  // Save tag to database
  const id = window.crypto.randomUUID();
  await window.electron.tags.add({
    id,
    documentId,
    projectId,
    content: paraText.trim(),
    characterOffset: range.startOffset,
  });

  return;
}
```

Note: `handleKeyDown` needs to be async for the `await` call. Update the function signature:

```js
async function handleKeyDown(e) {
```

---

## Task D — Outline component

Create `apps/associations/src/components/Outline.jsx`:

```jsx
import { useState, useEffect, useRef } from 'react';

export default function Outline({ projectId, activeDocumentId, onSwitchDocument, onClose }) {
  const [documents, setDocuments] = useState([]);
  const [docData, setDocData] = useState({}); // { docId: { ghosts, tags } }
  const [expanded, setExpanded] = useState({});
  const [dragging, setDragging] = useState(null);
  const dragOverRef = useRef(null);

  useEffect(() => {
    loadOutline();
  }, [projectId]);

  async function loadOutline() {
    const docs = await window.electron.documents.list({ projectId });
    setDocuments(docs);

    const data = {};
    for (const doc of docs) {
      const [ghosts, tags] = await Promise.all([
        window.electron.keptGhosts.list({ documentId: doc.id }),
        window.electron.tags.list({ documentId: doc.id }),
      ]);
      data[doc.id] = { ghosts, tags };
    }
    setDocData(data);
  }

  async function handleRemoveGhost(ghostId, docId) {
    await window.electron.keptGhosts.remove({ id: ghostId });
    setDocData(prev => ({
      ...prev,
      [docId]: {
        ...prev[docId],
        ghosts: prev[docId].ghosts.filter(g => g.id !== ghostId),
      }
    }));
  }

  async function handleRemoveTag(tagId, docId) {
    await window.electron.tags.remove({ id: tagId });
    setDocData(prev => ({
      ...prev,
      [docId]: {
        ...prev[docId],
        tags: prev[docId].tags.filter(t => t.id !== tagId),
      }
    }));
  }

  function handleDragStart(e, id) {
    setDragging(id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, id) {
    e.preventDefault();
    dragOverRef.current = id;
  }

  async function handleDrop(e, targetId) {
    e.preventDefault();
    if (!dragging || dragging === targetId) return;
    const newOrder = [...documents];
    const fromIndex = newOrder.findIndex(d => d.id === dragging);
    const toIndex = newOrder.findIndex(d => d.id === targetId);
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    setDocuments(newOrder);
    await window.electron.documents.reorder({ projectId, orderedIds: newOrder.map(d => d.id) });
    setDragging(null);
  }

  function toggleExpanded(docId) {
    setExpanded(prev => ({ ...prev, [docId]: !prev[docId] }));
  }

  return (
    <div style={{
      height: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Corner labels */}
      <span style={{
        position: 'absolute', top: 20, left: 80,
        fontFamily: "'Poppins', sans-serif", fontSize: '10px',
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--text-faint)', zIndex: 10, userSelect: 'none',
      }}>
        Outline
      </span>

      <span
        onClick={onClose}
        style={{
          position: 'absolute', top: 20, right: 20,
          fontFamily: "'Poppins', sans-serif", fontSize: '10px',
          color: 'var(--text-faint)', letterSpacing: '0.08em',
          zIndex: 10, cursor: 'pointer', userSelect: 'none',
        }}
      >
        compose
      </span>

      {/* Document list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '64px 10vw 80px',
        maxWidth: '720px',
        margin: '0 auto',
        width: '100%',
      }}>
        {documents.length === 0 ? (
          <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '16px', color: 'var(--text-faint)' }}>
            No documents yet.
          </p>
        ) : (
          documents.map((doc, index) => {
            const data = docData[doc.id] || { ghosts: [], tags: [] };
            const isExpanded = expanded[doc.id];
            const isActive = doc.id === activeDocumentId;
            const hasContent = data.ghosts.length > 0 || data.tags.length > 0;

            return (
              <div
                key={doc.id}
                draggable
                onDragStart={(e) => handleDragStart(e, doc.id)}
                onDragOver={(e) => handleDragOver(e, doc.id)}
                onDrop={(e) => handleDrop(e, doc.id)}
                style={{
                  marginBottom: '32px',
                  opacity: dragging === doc.id ? 0.4 : 1,
                }}
              >
                {/* Document header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '16px',
                  paddingBottom: '12px',
                  borderBottom: '0.5px solid var(--border)',
                  cursor: 'pointer',
                }}
                  onClick={() => hasContent && toggleExpanded(doc.id)}
                >
                  <span style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '11px',
                    color: 'var(--text-faint)',
                    letterSpacing: '0.06em',
                    minWidth: '24px',
                    userSelect: 'none',
                  }}>
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <span
                    onClick={(e) => { e.stopPropagation(); onSwitchDocument(doc.id); onClose(); }}
                    style={{
                      fontFamily: "'Lora', serif",
                      fontSize: '18px',
                      color: isActive ? 'var(--text)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      flex: 1,
                    }}
                  >
                    {doc.title}
                  </span>

                  <span style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '10px',
                    color: 'var(--text-faint)',
                    letterSpacing: '0.06em',
                  }}>
                    {doc.word_count > 0 ? `${doc.word_count.toLocaleString()} words` : 'empty'}
                  </span>

                  {hasContent && (
                    <span style={{
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: '10px',
                      color: 'var(--text-faint)',
                      userSelect: 'none',
                    }}>
                      {isExpanded ? '−' : '+'}
                    </span>
                  )}
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ paddingLeft: '40px', paddingTop: '16px' }}>

                    {/* Kept ghosts */}
                    {data.ghosts.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <p style={{
                          fontFamily: "'Poppins', sans-serif", fontSize: '10px',
                          letterSpacing: '0.1em', textTransform: 'uppercase',
                          color: 'var(--text-faint)', marginBottom: '12px',
                        }}>
                          Kept
                        </p>
                        {data.ghosts.map(ghost => (
                          <div key={ghost.id} style={{
                            display: 'flex', alignItems: 'flex-start',
                            gap: '16px', marginBottom: '12px',
                          }}>
                            <p style={{
                              fontFamily: "'Lora', serif", fontStyle: 'italic',
                              fontSize: '14px', color: 'var(--text-muted)',
                              lineHeight: '1.7', flex: 1,
                            }}>
                              {ghost.ghost_content}
                            </p>
                            <button
                              onClick={() => handleRemoveGhost(ghost.id, doc.id)}
                              style={{
                                fontFamily: "'Poppins', sans-serif", fontSize: '10px',
                                color: 'var(--text-faint)', background: 'none',
                                border: 'none', cursor: 'pointer', flexShrink: 0,
                                letterSpacing: '0.06em', paddingTop: '2px',
                              }}
                            >
                              release
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tagged passages */}
                    {data.tags.length > 0 && (
                      <div>
                        <p style={{
                          fontFamily: "'Poppins', sans-serif", fontSize: '10px',
                          letterSpacing: '0.1em', textTransform: 'uppercase',
                          color: 'var(--text-faint)', marginBottom: '12px',
                        }}>
                          Tagged
                        </p>
                        {data.tags.map(tag => (
                          <div key={tag.id} style={{
                            display: 'flex', alignItems: 'flex-start',
                            gap: '16px', marginBottom: '12px',
                          }}>
                            <p style={{
                              fontFamily: "'Lora', serif",
                              fontSize: '14px', color: 'var(--text-muted)',
                              lineHeight: '1.7', flex: 1,
                            }}>
                              {tag.content}
                            </p>
                            <button
                              onClick={() => handleRemoveTag(tag.id, doc.id)}
                              style={{
                                fontFamily: "'Poppins', sans-serif", fontSize: '10px',
                                color: 'var(--text-faint)', background: 'none',
                                border: 'none', cursor: 'pointer', flexShrink: 0,
                                letterSpacing: '0.06em', paddingTop: '2px',
                              }}
                            >
                              remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

---

## Task E — Wire Outline into App and menu

Read `apps/associations/src/App.jsx`.

Add import and state:

```jsx
import Outline from './components/Outline';

const [mode, setMode] = useState('compose'); // 'compose' | 'outline'
```

Replace the Compose render with a mode-aware render:

```jsx
{mode === 'compose' ? (
  <Compose
    key={documentId}
    projectId={projectId}
    documentId={documentId}
    documentTitle={documentTitle}
    onWordCountChange={(wc) => {
      window.electron.documents.updateWordCount({ documentId, wordCount: wc });
    }}
  />
) : (
  <Outline
    projectId={projectId}
    activeDocumentId={documentId}
    onSwitchDocument={handleDocumentSelect}
    onClose={() => setMode('compose')}
  />
)}
```

---

## Task F — Add View menu

Read `apps/associations/electron/main.js`.

Add a View menu to the template between Project and Edit:

```js
{
  label: 'View',
  submenu: [
    {
      label: 'Compose',
      accelerator: 'CmdOrCtrl+1',
      click: () => mainWindow?.webContents.send('menu-compose'),
    },
    {
      label: 'Outline',
      accelerator: 'CmdOrCtrl+2',
      click: () => mainWindow?.webContents.send('menu-outline'),
    },
  ],
},
```

In `preload.js`, add to menu contextBridge:

```js
onCompose: (cb) => ipcRenderer.on('menu-compose', cb),
onOutline: (cb) => ipcRenderer.on('menu-outline', cb),
```

In `App.jsx`, wire menu events:

```js
window.electron.menu.onCompose(() => setMode('compose'));
window.electron.menu.onOutline(() => setMode('outline'));
```

---

## Verification Checklist

- [ ] Cmd+2 switches to Outline mode
- [ ] Cmd+1 switches back to Compose
- [ ] "compose" label in top-right corner of Outline switches back
- [ ] All documents listed in order with word counts
- [ ] Documents can be dragged to reorder
- [ ] Expanding a document shows kept ghosts and tagged passages
- [ ] "release" removes a kept ghost
- [ ] "remove" removes a tagged passage
- [ ] Pressing * in Compose tags the current paragraph with a dot
- [ ] Tagged passages appear in Outline under the correct document
- [ ] Clicking a document title in Outline opens it in Compose
- [ ] No other files modified outside this list
