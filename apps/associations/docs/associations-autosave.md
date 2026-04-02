# Associations — Auto-Save

## Context

Read `docs/ARCHITECTURE.md`, `docs/CLAUDE.md`, and `apps/associations/docs/ASSOCIATIONS_ARCHITECTURE.md` before starting.

A writing tool that loses writing is not a writing tool. This prompt adds auto-save to the Compose surface. Read every file before touching it. No scope creep. No other files modified outside this list.

---

## What Auto-Save Does

Every 10 seconds after any change, and immediately on app quit, the current document content is saved to a local file in the user's data directory. On next launch, the content is restored automatically. No manual save. No save button. The writer never thinks about it.

This is not the same as the pool. The pool holds passages for ghost finding. Auto-save holds the full document for recovery. They are separate concerns.

---

## Task A — Add document save/load IPC handlers

Read `apps/associations/electron/main.js`.

Add after the existing IPC handlers:

```js
const DOCUMENTS_DIR = path.join(app.getPath('userData'), 'documents');

// Ensure documents directory exists
if (!fs.existsSync(DOCUMENTS_DIR)) {
  fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
}

// Save document content to file
ipcMain.handle('document-save', (event, { documentId, content }) => {
  try {
    const filePath = path.join(DOCUMENTS_DIR, `${documentId}.txt`);
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (err) {
    console.error('Document save error:', err.message);
    return false;
  }
});

// Load document content from file
ipcMain.handle('document-load', (event, { documentId }) => {
  try {
    const filePath = path.join(DOCUMENTS_DIR, `${documentId}.txt`);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error('Document load error:', err.message);
    return null;
  }
});

// Save on app quit — flush any pending saves
app.on('before-quit', () => {
  if (mainWindow) {
    mainWindow.webContents.send('app-will-quit');
  }
});
```

---

## Task B — Expose document IPC in preload

Read `apps/associations/electron/preload.js`.

Add to the contextBridge:

```js
document: {
  save: (data) => ipcRenderer.invoke('document-save', data),
  load: (data) => ipcRenderer.invoke('document-load', data),
  onWillQuit: (callback) => ipcRenderer.on('app-will-quit', callback),
},
```

---

## Task C — Add auto-save to Compose

Read `apps/associations/src/components/Compose.jsx`.

**C1** — Add auto-save timer ref alongside existing refs:

```js
const autoSaveTimer = useRef(null);
const isDirtyRef = useRef(false); // true when content has changed since last save
```

**C2** — Add a `saveDocument` function:

```js
async function saveDocument() {
  if (!isDirtyRef.current) return;
  const content = contentRef.current;
  if (!content.trim()) return;
  await window.electron.document.save({ documentId, content });
  isDirtyRef.current = false;
}
```

**C3** — In `handleInput`, mark dirty and schedule auto-save:

After `setWordCount(wc);`, add:

```js
isDirtyRef.current = true;

// Auto-save 10 seconds after last change
clearTimeout(autoSaveTimer.current);
autoSaveTimer.current = setTimeout(saveDocument, 10000);
```

**C4** — Load content on mount:

Add a `useEffect` that runs once on mount to restore saved content:

```js
useEffect(() => {
  async function loadDocument() {
    const saved = await window.electron.document.load({ documentId });
    if (saved && editorRef.current) {
      editorRef.current.innerText = saved;
      contentRef.current = saved;
      setWordCount(getWordCount(saved));
    }
  }
  loadDocument();

  // Save immediately on app quit
  window.electron.document.onWillQuit(() => {
    saveDocument();
  });

  // Save on component unmount
  return () => {
    saveDocument();
    clearTimeout(autoSaveTimer.current);
    clearTimeout(ghostCheckTimer.current);
    clearTimeout(passageSaveTimer.current);
  };
}, []); // runs once on mount only
```

**C5** — Add a subtle save indicator in the bottom-left corner alongside the folders label. Currently the bottom-left shows "folders" — add a save status next to it:

```jsx
<span style={{
  position: 'absolute', bottom: 14, left: 20,
  fontFamily: "'Poppins', sans-serif", fontSize: '10px',
  color: 'var(--text-faint)', letterSpacing: '0.08em',
  zIndex: 10, userSelect: 'none',
  display: 'flex', gap: '12px', alignItems: 'center',
}}>
  <span
    onClick={() => setShowFolderWatch(true)}
    style={{ cursor: 'pointer' }}
  >
    folders
  </span>
</span>
```

Note: the save indicator is intentionally absent — the writer should not think about saving. The only time saving surfaces is if it fails, which we handle silently for now. The absence of a save indicator is the indicator that everything is fine.

---

## Task D — Handle the default document

The current `documentId` defaults to `'default'`. This means all writing goes to the same file until project and document management is built. That's correct for V1 — one document, always restored on launch.

No change needed here. Document management comes in a later prompt.

---

## Verification Checklist

- [ ] App launches and restores previous writing automatically
- [ ] Writing after 10 seconds causes a save (check userData/documents/default.txt exists)
- [ ] Closing and reopening the app restores content exactly
- [ ] No save button, no save indicator, no manual action required
- [ ] Word count restores correctly after load
- [ ] Paragraph indents restore correctly after load
- [ ] No other files modified outside this list

## What This Does Not Do

- Multiple documents — comes with document management
- Document naming — comes with document management  
- Document history or versioning — roadmap item
- Cloud backup — roadmap item
- Export — separate prompt
