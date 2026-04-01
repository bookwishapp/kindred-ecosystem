# Associations — Folder Watch

## Context

Read `docs/ARCHITECTURE.md`, `docs/CLAUDE.md`, and `apps/associations/docs/ASSOCIATIONS_ARCHITECTURE.md` before starting.

The scaffold and ghost mechanic are complete. The app launches, auth persists, and the writing surface works. This prompt adds folder watching — the mechanism that seeds the pool with existing writing.

Read all files before touching them. No scope creep. No other files modified outside this list.

---

## What Folder Watch Does

The user designates one or more folders. Associations monitors them continuously. Any supported file found in the folder is read, split into passages, embedded, and added to the pool. Associations never moves, modifies, or owns the original files. It only reads them and keeps a snapshot in the pool.

Supported formats for V1: `.txt`, `.md`

Word and PDF support comes later — those require additional parsing libraries.

---

## Task A — Add folder watch schema to database

Read `apps/associations/electron/main.js`.

In the `db.exec()` schema initialization block, add the watched_folders table:

```js
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, use_global_pool INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS pool_entries (id TEXT PRIMARY KEY, project_id TEXT, source TEXT NOT NULL, content TEXT NOT NULL, embedding BLOB, word_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS kept_ghosts (id TEXT PRIMARY KEY, document_id TEXT NOT NULL, pool_entry_id TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS watched_folders (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    folder_path TEXT NOT NULL,
    last_scanned TEXT,
    UNIQUE(project_id, folder_path)
  );
  CREATE TABLE IF NOT EXISTS watched_files (
    id TEXT PRIMARY KEY,
    folder_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    last_modified TEXT,
    ingested_at TEXT,
    UNIQUE(file_path),
    FOREIGN KEY (folder_id) REFERENCES watched_folders(id) ON DELETE CASCADE
  );
`);
```

---

## Task B — Add IPC handlers for folder management

In `apps/associations/electron/main.js`, add after the existing IPC handlers:

```js
const { dialog } = require('electron');

// Open folder picker dialog
ipcMain.handle('folder-pick', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Choose a folder to watch',
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// Add a watched folder
ipcMain.handle('folder-add', (event, { projectId, folderPath }) => {
  const id = require('crypto').randomUUID();
  db.prepare(`
    INSERT OR IGNORE INTO watched_folders (id, project_id, folder_path)
    VALUES (?, ?, ?)
  `).run(id, projectId, folderPath);
  return id;
});

// Get watched folders for a project
ipcMain.handle('folder-list', (event, { projectId }) => {
  return db.prepare(`
    SELECT * FROM watched_folders WHERE project_id = ?
  `).all(projectId);
});

// Remove a watched folder
ipcMain.handle('folder-remove', (event, { folderId }) => {
  db.prepare(`DELETE FROM watched_folders WHERE id = ?`).run(folderId);
  db.prepare(`DELETE FROM watched_files WHERE folder_id = ?`).run(folderId);
  return true;
});

// Get files that need ingestion (new or modified since last scan)
ipcMain.handle('folder-scan', (event, { folderId, folderPath }) => {
  const supportedExtensions = ['.txt', '.md'];
  const results = [];

  function scanDir(dirPath) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (!supportedExtensions.includes(ext)) continue;

          const stat = fs.statSync(fullPath);
          const lastModified = stat.mtime.toISOString();

          const existing = db.prepare(`
            SELECT last_modified FROM watched_files WHERE file_path = ?
          `).get(fullPath);

          if (!existing || existing.last_modified !== lastModified) {
            results.push({ filePath: fullPath, lastModified });
          }
        }
      }
    } catch (err) {
      console.error('Scan error:', err.message);
    }
  }

  scanDir(folderPath);
  return results;
});

// Read a file's contents
ipcMain.handle('folder-read-file', (event, { filePath }) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch { return null; }
});

// Mark a file as ingested
ipcMain.handle('folder-mark-ingested', (event, { folderId, filePath, lastModified }) => {
  const id = require('crypto').randomUUID();
  db.prepare(`
    INSERT INTO watched_files (id, folder_id, file_path, last_modified, ingested_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(file_path) DO UPDATE SET
      last_modified = excluded.last_modified,
      ingested_at = datetime('now')
  `).run(id, folderId, filePath, lastModified);
  return true;
});
```

---

## Task C — Expose folder IPC in preload

Read `apps/associations/electron/preload.js`.

Add a `folders` section to the contextBridge:

```js
folders: {
  pick: () => ipcRenderer.invoke('folder-pick'),
  add: (data) => ipcRenderer.invoke('folder-add', data),
  list: (data) => ipcRenderer.invoke('folder-list', data),
  remove: (data) => ipcRenderer.invoke('folder-remove', data),
  scan: (data) => ipcRenderer.invoke('folder-scan', data),
  readFile: (data) => ipcRenderer.invoke('folder-read-file', data),
  markIngested: (data) => ipcRenderer.invoke('folder-mark-ingested', data),
},
```

---

## Task D — Folder ingestion service

Create `apps/associations/src/db/ingest.js`:

```js
import { generateEmbedding, embeddingToBuffer } from './embeddings';
import { v4 as uuidv4 } from 'uuid';

const PASSAGE_MIN_WORDS = 30;
const PASSAGE_MAX_WORDS = 200;

// Split text into overlapping passages for richer pool coverage
function splitIntoPassages(text) {
  const paragraphs = text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const passages = [];

  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    if (words.length < PASSAGE_MIN_WORDS) {
      // Short paragraph — use as-is if not too short
      if (words.length >= 10) passages.push(para);
      continue;
    }

    // Long paragraph — split into overlapping chunks
    let start = 0;
    while (start < words.length) {
      const chunk = words.slice(start, start + PASSAGE_MAX_WORDS).join(' ');
      if (chunk.split(/\s+/).length >= PASSAGE_MIN_WORDS) {
        passages.push(chunk);
      }
      start += Math.floor(PASSAGE_MAX_WORDS * 0.6); // 60% overlap
    }
  }

  return passages;
}

export async function ingestFile({ projectId, filePath, content, onProgress }) {
  const passages = splitIntoPassages(content);
  let ingested = 0;

  for (const passage of passages) {
    try {
      const embedding = await generateEmbedding(passage);
      const embeddingBuffer = embeddingToBuffer(embedding);
      const id = uuidv4();
      const wordCount = passage.split(/\s+/).length;

      await window.electron.db.addPoolEntry({
        id,
        projectId,
        source: 'folder',
        content: passage,
        embeddingBuffer,
        wordCount,
      });

      ingested++;
      if (onProgress) onProgress({ ingested, total: passages.length });
    } catch (err) {
      console.error('Passage ingestion error:', err.message);
    }
  }

  return ingested;
}

export async function ingestFolder({ projectId, folderId, folderPath, onProgress, onFile }) {
  const files = await window.electron.folders.scan({ folderId, folderPath });

  if (files.length === 0) return { filesProcessed: 0, passagesIngested: 0 };

  let filesProcessed = 0;
  let passagesIngested = 0;

  for (const file of files) {
    const content = await window.electron.folders.readFile({ filePath: file.filePath });
    if (!content) continue;

    if (onFile) onFile(file.filePath);

    const count = await ingestFile({
      projectId,
      filePath: file.filePath,
      content,
      onProgress,
    });

    await window.electron.folders.markIngested({
      folderId,
      filePath: file.filePath,
      lastModified: file.lastModified,
    });

    passagesIngested += count;
    filesProcessed++;
  }

  return { filesProcessed, passagesIngested };
}
```

---

## Task E — Folder watch UI component

Create `apps/associations/src/components/FolderWatch.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { ingestFolder } from '../db/ingest';

export default function FolderWatch({ projectId, onClose }) {
  const [folders, setFolders] = useState([]);
  const [ingesting, setIngesting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);

  useEffect(() => {
    loadFolders();
  }, []);

  async function loadFolders() {
    const result = await window.electron.folders.list({ projectId });
    setFolders(result);
  }

  async function handleAddFolder() {
    const folderPath = await window.electron.folders.pick();
    if (!folderPath) return;

    const folderId = await window.electron.folders.add({ projectId, folderPath });
    await loadFolders();
    await handleIngest(folderId, folderPath);
  }

  async function handleIngest(folderId, folderPath) {
    setIngesting(true);
    setProgress({ ingested: 0, total: 0 });

    try {
      const result = await ingestFolder({
        projectId,
        folderId,
        folderPath,
        onProgress: (p) => setProgress(p),
        onFile: (filePath) => setCurrentFile(filePath.split('/').pop()),
      });

      setProgress(null);
      setCurrentFile(null);
    } catch (err) {
      console.error('Ingestion error:', err);
    }

    setIngesting(false);
  }

  async function handleRemove(folderId) {
    await window.electron.folders.remove({ folderId });
    await loadFolders();
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(42,40,37,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }}>
      <div style={{
        background: 'var(--bg)',
        borderRadius: '12px',
        padding: '40px',
        width: '480px',
        maxWidth: '90vw',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
            Watched Folders
          </p>
          <button
            onClick={onClose}
            style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>

        {folders.length === 0 ? (
          <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '15px', color: 'var(--text-muted)', marginBottom: '28px', lineHeight: '1.7' }}>
            No folders watched yet. Add a folder and Associations will read your writing into the pool.
          </p>
        ) : (
          <div style={{ marginBottom: '24px' }}>
            {folders.map(folder => (
              <div key={folder.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '0.5px solid var(--border)',
              }}>
                <div>
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '12px', color: 'var(--text)', marginBottom: '2px' }}>
                    {folder.folder_path.split('/').pop()}
                  </p>
                  <p style={{ fontFamily: "'Lora', serif", fontSize: '11px', color: 'var(--text-faint)' }}>
                    {folder.folder_path}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <button
                    onClick={() => handleIngest(folder.id, folder.folder_path)}
                    disabled={ingesting}
                    style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    sync
                  </button>
                  <button
                    onClick={() => handleRemove(folder.id)}
                    disabled={ingesting}
                    style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {ingesting && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              {currentFile ? `Reading ${currentFile}…` : 'Preparing…'}
            </p>
            {progress && progress.total > 0 && (
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', color: 'var(--text-faint)' }}>
                {progress.ingested} of {progress.total} passages
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleAddFolder}
          disabled={ingesting}
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '11px',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            background: 'none',
            border: '0.5px solid var(--text-faint)',
            borderRadius: '6px',
            padding: '10px 20px',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          + Add folder
        </button>
      </div>
    </div>
  );
}
```

---

## Task F — Wire FolderWatch into App

Read `apps/associations/src/App.jsx`.

Add folder watch trigger to the Compose view. The writer accesses it via the bottom-left corner — currently empty. Add a barely-visible trigger there:

```jsx
import FolderWatch from './components/FolderWatch';

// Add to state:
const [showFolderWatch, setShowFolderWatch] = useState(false);

// Add to the Compose view, inside the outer div:
{showFolderWatch && (
  <FolderWatch
    projectId="default"
    onClose={() => setShowFolderWatch(false)}
  />
)}

// Bottom-left corner label (add alongside the other corner spans):
<span
  onClick={() => setShowFolderWatch(true)}
  style={{
    position: 'fixed',
    bottom: 14,
    left: 20,
    fontFamily: "'Poppins', sans-serif",
    fontSize: '10px',
    color: 'var(--text-faint)',
    letterSpacing: '0.08em',
    zIndex: 10,
    cursor: 'pointer',
    userSelect: 'none',
  }}
>
  folders
</span>
```

---

## Verification Checklist

- [ ] App launches without errors
- [ ] "folders" label appears in bottom-left corner
- [ ] Clicking "folders" opens the FolderWatch panel
- [ ] "+ Add folder" opens the system folder picker
- [ ] After selecting a folder, files are scanned and passages ingested
- [ ] Progress shows during ingestion
- [ ] Folder appears in the list after adding
- [ ] "remove" removes the folder from the list
- [ ] "sync" re-scans and ingests new/modified files
- [ ] Pool entries appear in the database after ingestion (check via DevTools: `await window.electron.db.getPoolEntries({projectId: 'default'})`)

## Do Not Build Yet

- Auto-watch (polling for file changes) — manual sync only in V1
- PDF support
- .docx support
- Progress bar (text progress is enough for V1)
