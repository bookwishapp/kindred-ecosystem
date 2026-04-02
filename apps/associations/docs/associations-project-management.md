# Associations — Project and Document Management

## Context

Read `docs/ARCHITECTURE.md`, `docs/CLAUDE.md`, and `apps/associations/docs/ASSOCIATIONS_ARCHITECTURE.md` before starting.

This prompt adds project management, document management, and a macOS menu bar. It replaces the bottom-left corner labels with a "questions waiting" indicator and moves all structural operations to the menu bar.

Read every file before touching it. No scope creep. No other files modified outside this list.

---

## What Changes

**Before:** Everything uses `projectId: 'default'` and `documentId: 'default'`. Bottom-left corner shows "folders" and "questions" labels.

**After:** Projects and documents are real named entities. The macOS menu bar handles all project/document operations. The bottom-left corner shows "N questions waiting" when questions exist, nothing when they don't.

---

## Task A — Project and document schema

Read `apps/associations/electron/main.js`.

Add to the `db.exec()` schema block:

```sql
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  use_global_pool INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  position INTEGER DEFAULT 0,
  word_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

Note: `projects` table already exists from earlier scaffold but may be missing `updated_at`. Add migration:

```js
try { db.exec(`ALTER TABLE projects ADD COLUMN updated_at TEXT`); } catch(e) {}
try { db.exec(`ALTER TABLE documents ADD COLUMN position INTEGER DEFAULT 0`); } catch(e) {}
try { db.exec(`ALTER TABLE documents ADD COLUMN word_count INTEGER DEFAULT 0`); } catch(e) {}
```

**Seed the default project and document if they don't exist:**

```js
const defaultProject = db.prepare(`SELECT id FROM projects WHERE id = 'default'`).get();
if (!defaultProject) {
  db.prepare(`INSERT INTO projects (id, name) VALUES ('default', 'Default')`).run();
}
const defaultDoc = db.prepare(`SELECT id FROM documents WHERE id = 'default'`).get();
if (!defaultDoc) {
  db.prepare(`INSERT INTO documents (id, project_id, title) VALUES ('default', 'default', 'Untitled')`).run();
}
```

---

## Task B — Project and document IPC handlers

Read `apps/associations/electron/main.js`.

Add after existing IPC handlers:

```js
// ── Projects ──

ipcMain.handle('project-list', () => {
  return db.prepare(`SELECT * FROM projects ORDER BY updated_at DESC`).all();
});

ipcMain.handle('project-create', (event, { name }) => {
  const id = require('crypto').randomUUID();
  db.prepare(`INSERT INTO projects (id, name) VALUES (?, ?)`).run(id, name || 'Untitled');
  // Create default document for new project
  const docId = require('crypto').randomUUID();
  db.prepare(`INSERT INTO documents (id, project_id, title) VALUES (?, ?, 'Untitled')`).run(docId, id);
  return { projectId: id, documentId: docId };
});

ipcMain.handle('project-rename', (event, { projectId, name }) => {
  db.prepare(`UPDATE projects SET name = ?, updated_at = datetime('now') WHERE id = ?`).run(name, projectId);
  return true;
});

ipcMain.handle('project-delete', (event, { projectId }) => {
  if (projectId === 'default') return false; // never delete default
  db.prepare(`DELETE FROM projects WHERE id = ?`).run(projectId);
  return true;
});

ipcMain.handle('project-get-active', () => {
  // Store active project in a simple settings table
  const setting = db.prepare(`SELECT value FROM settings WHERE key = 'active_project'`).get();
  return setting?.value || 'default';
});

ipcMain.handle('project-set-active', (event, { projectId }) => {
  db.prepare(`INSERT INTO settings (key, value) VALUES ('active_project', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(projectId);
  return true;
});

// ── Documents ──

ipcMain.handle('document-list', (event, { projectId }) => {
  return db.prepare(`SELECT * FROM documents WHERE project_id = ? ORDER BY position ASC, created_at ASC`).all(projectId);
});

ipcMain.handle('document-create', (event, { projectId, title }) => {
  const id = require('crypto').randomUUID();
  const maxPos = db.prepare(`SELECT MAX(position) as pos FROM documents WHERE project_id = ?`).get(projectId);
  const position = (maxPos?.pos || 0) + 1;
  db.prepare(`INSERT INTO documents (id, project_id, title, position) VALUES (?, ?, ?, ?)`).run(id, projectId, title || 'Untitled', position);
  return id;
});

ipcMain.handle('document-rename', (event, { documentId, title }) => {
  db.prepare(`UPDATE documents SET title = ?, updated_at = datetime('now') WHERE id = ?`).run(title, documentId);
  return true;
});

ipcMain.handle('document-delete', (event, { documentId }) => {
  db.prepare(`DELETE FROM documents WHERE id = ?`).run(documentId);
  // Delete the saved file
  const filePath = path.join(DOCUMENTS_DIR, `${documentId}.txt`);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return true;
});

ipcMain.handle('document-reorder', (event, { projectId, orderedIds }) => {
  const stmt = db.prepare(`UPDATE documents SET position = ? WHERE id = ?`);
  orderedIds.forEach((id, index) => stmt.run(index, id));
  return true;
});

ipcMain.handle('document-update-word-count', (event, { documentId, wordCount }) => {
  db.prepare(`UPDATE documents SET word_count = ?, updated_at = datetime('now') WHERE id = ?`).run(wordCount, documentId);
  return true;
});

ipcMain.handle('document-get-active', (event, { projectId }) => {
  const setting = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(`active_doc_${projectId}`);
  if (setting?.value) return setting.value;
  // Fall back to first document
  const first = db.prepare(`SELECT id FROM documents WHERE project_id = ? ORDER BY position ASC LIMIT 1`).get(projectId);
  return first?.id || null;
});

ipcMain.handle('document-set-active', (event, { projectId, documentId }) => {
  db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(`active_doc_${projectId}`, documentId);
  return true;
});
```

Add the settings table to the schema:

```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

---

## Task C — Expose project/document IPC in preload

Read `apps/associations/electron/preload.js`.

Add to contextBridge:

```js
projects: {
  list: () => ipcRenderer.invoke('project-list'),
  create: (data) => ipcRenderer.invoke('project-create', data),
  rename: (data) => ipcRenderer.invoke('project-rename', data),
  delete: (data) => ipcRenderer.invoke('project-delete', data),
  getActive: () => ipcRenderer.invoke('project-get-active'),
  setActive: (data) => ipcRenderer.invoke('project-set-active', data),
},
documents: {
  list: (data) => ipcRenderer.invoke('document-list', data),
  create: (data) => ipcRenderer.invoke('document-create', data),
  rename: (data) => ipcRenderer.invoke('document-rename', data),
  delete: (data) => ipcRenderer.invoke('document-delete', data),
  reorder: (data) => ipcRenderer.invoke('document-reorder', data),
  updateWordCount: (data) => ipcRenderer.invoke('document-update-word-count', data),
  getActive: (data) => ipcRenderer.invoke('document-get-active', data),
  setActive: (data) => ipcRenderer.invoke('document-set-active', data),
},
```

---

## Task D — macOS menu bar

Read `apps/associations/electron/main.js`.

Add the menu after `app.whenReady()`. Import Menu and MenuItem:

```js
const { Menu, MenuItem } = require('electron');
```

Build and set the application menu:

```js
function buildMenu(projectName, documentTitle) {
  const template = [
    {
      label: 'Associations',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Document',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu-new-document'),
        },
        {
          label: 'Open Document…',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu-open-document'),
        },
        {
          label: 'Rename Document…',
          click: () => mainWindow?.webContents.send('menu-rename-document'),
        },
        { type: 'separator' },
        {
          label: 'Export…',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow?.webContents.send('menu-export'),
        },
      ],
    },
    {
      label: 'Project',
      submenu: [
        {
          label: 'New Project…',
          click: () => mainWindow?.webContents.send('menu-new-project'),
        },
        {
          label: 'Switch Project…',
          click: () => mainWindow?.webContents.send('menu-switch-project'),
        },
        {
          label: 'Rename Project…',
          click: () => mainWindow?.webContents.send('menu-rename-project'),
        },
        { type: 'separator' },
        {
          label: 'Folders…',
          click: () => mainWindow?.webContents.send('menu-folders'),
        },
        {
          label: 'Questions…',
          click: () => mainWindow?.webContents.send('menu-questions'),
        },
        {
          label: 'Documents…',
          click: () => mainWindow?.webContents.send('menu-documents'),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
```

Call `buildMenu()` after `createWindow()` in `app.whenReady()`.

Add IPC to allow renderer to trigger menu rebuild when project/document changes:

```js
ipcMain.on('menu-rebuild', (event, { projectName, documentTitle }) => {
  buildMenu(projectName, documentTitle);
});
```

Expose menu events in preload:

```js
menu: {
  onNewDocument: (cb) => ipcRenderer.on('menu-new-document', cb),
  onOpenDocument: (cb) => ipcRenderer.on('menu-open-document', cb),
  onRenameDocument: (cb) => ipcRenderer.on('menu-rename-document', cb),
  onExport: (cb) => ipcRenderer.on('menu-export', cb),
  onNewProject: (cb) => ipcRenderer.on('menu-new-project', cb),
  onSwitchProject: (cb) => ipcRenderer.on('menu-switch-project', cb),
  onRenameProject: (cb) => ipcRenderer.on('menu-rename-project', cb),
  onFolders: (cb) => ipcRenderer.on('menu-folders', cb),
  onQuestions: (cb) => ipcRenderer.on('menu-questions', cb),
  onDocuments: (cb) => ipcRenderer.on('menu-documents', cb),
  rebuild: (data) => ipcRenderer.send('menu-rebuild', data),
},
```

---

## Task E — Document list panel

Create `apps/associations/src/components/DocumentList.jsx`:

```jsx
import { useState, useEffect, useRef } from 'react';

export default function DocumentList({ projectId, activeDocumentId, onSelect, onClose }) {
  const [documents, setDocuments] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const dragOverRef = useRef(null);

  useEffect(() => { loadDocuments(); }, []);

  async function loadDocuments() {
    const docs = await window.electron.documents.list({ projectId });
    setDocuments(docs);
  }

  async function handleNew() {
    const id = await window.electron.documents.create({ projectId, title: 'Untitled' });
    await loadDocuments();
    onSelect(id);
  }

  async function handleRename(id) {
    if (!renameValue.trim()) return;
    await window.electron.documents.rename({ documentId: id, title: renameValue.trim() });
    setRenaming(null);
    await loadDocuments();
  }

  async function handleDelete(id) {
    if (documents.length <= 1) return; // never delete last document
    await window.electron.documents.delete({ documentId: id });
    await loadDocuments();
    if (id === activeDocumentId && documents.length > 1) {
      const remaining = documents.filter(d => d.id !== id);
      if (remaining.length > 0) onSelect(remaining[0].id);
    }
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
        padding: '40px',
        width: '480px',
        maxWidth: '90vw',
        maxHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
            Documents
          </p>
          <button onClick={onClose} style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Close
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {documents.map(doc => (
            <div
              key={doc.id}
              draggable
              onDragStart={(e) => handleDragStart(e, doc.id)}
              onDragOver={(e) => handleDragOver(e, doc.id)}
              onDrop={(e) => handleDrop(e, doc.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '0.5px solid var(--border)',
                opacity: dragging === doc.id ? 0.4 : 1,
                cursor: 'grab',
                background: doc.id === activeDocumentId ? 'rgba(42,40,37,0.03)' : 'transparent',
              }}
            >
              <div style={{ flex: 1, marginRight: '16px' }}>
                {renaming === doc.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => handleRename(doc.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRename(doc.id);
                      if (e.key === 'Escape') setRenaming(null);
                    }}
                    style={{
                      fontFamily: "'Lora', serif",
                      fontSize: '15px',
                      color: 'var(--text)',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '0.5px solid var(--text-muted)',
                      outline: 'none',
                      padding: '0 0 2px',
                      width: '100%',
                    }}
                  />
                ) : (
                  <p
                    onClick={() => { onSelect(doc.id); onClose(); }}
                    style={{ fontFamily: "'Lora', serif", fontSize: '15px', color: 'var(--text)', cursor: 'pointer', marginBottom: '2px' }}
                  >
                    {doc.title}
                  </p>
                )}
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', color: 'var(--text-faint)', letterSpacing: '0.06em' }}>
                  {doc.word_count > 0 ? `${doc.word_count.toLocaleString()} words` : 'empty'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => { setRenaming(doc.id); setRenameValue(doc.title); }}
                  style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em' }}
                >
                  rename
                </button>
                {documents.length > 1 && (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em' }}
                  >
                    delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleNew}
          style={{
            marginTop: '24px',
            fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.08em',
            color: 'var(--text-muted)', background: 'none',
            border: '0.5px solid var(--text-faint)', borderRadius: '6px',
            padding: '10px 20px', cursor: 'pointer', width: '100%',
          }}
        >
          + New Document
        </button>
      </div>
    </div>
  );
}
```

---

## Task F — Project switcher panel

Create `apps/associations/src/components/ProjectSwitcher.jsx`:

```jsx
import { useState, useEffect } from 'react';

export default function ProjectSwitcher({ activeProjectId, onSelect, onClose }) {
  const [projects, setProjects] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => { loadProjects(); }, []);

  async function loadProjects() {
    const list = await window.electron.projects.list();
    setProjects(list);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    const { projectId, documentId } = await window.electron.projects.create({ name: newName.trim() });
    setCreating(false);
    setNewName('');
    await loadProjects();
    onSelect(projectId, documentId);
  }

  async function handleRename(id) {
    if (!renameValue.trim()) return;
    await window.electron.projects.rename({ projectId: id, name: renameValue.trim() });
    setRenaming(null);
    await loadProjects();
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
        padding: '40px',
        width: '440px',
        maxWidth: '90vw',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
            Projects
          </p>
          <button onClick={onClose} style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Close
          </button>
        </div>

        {projects.map(project => (
          <div key={project.id} style={{
            display: 'flex', alignItems: 'center',
            padding: '12px 0', borderBottom: '0.5px solid var(--border)',
            background: project.id === activeProjectId ? 'rgba(42,40,37,0.03)' : 'transparent',
          }}>
            <div style={{ flex: 1 }}>
              {renaming === project.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={() => handleRename(project.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRename(project.id);
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                  style={{ fontFamily: "'Lora', serif", fontSize: '16px', color: 'var(--text)', background: 'transparent', border: 'none', borderBottom: '0.5px solid var(--text-muted)', outline: 'none', padding: '0 0 2px', width: '100%' }}
                />
              ) : (
                <p
                  onClick={() => { onSelect(project.id, null); onClose(); }}
                  style={{ fontFamily: "'Lora', serif", fontSize: '16px', color: 'var(--text)', cursor: 'pointer' }}
                >
                  {project.name}
                  {project.id === activeProjectId && (
                    <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', color: 'var(--text-faint)', marginLeft: '10px', letterSpacing: '0.06em' }}>active</span>
                  )}
                </p>
              )}
            </div>
            <button
              onClick={() => { setRenaming(project.id); setRenameValue(project.name); }}
              style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '12px' }}
            >
              rename
            </button>
          </div>
        ))}

        {creating ? (
          <div style={{ marginTop: '20px' }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setCreating(false); setNewName(''); }
              }}
              placeholder="Project name"
              style={{ fontFamily: "'Lora', serif", fontSize: '16px', color: 'var(--text)', background: 'transparent', border: 'none', borderBottom: '0.5px solid var(--text-muted)', outline: 'none', padding: '0 0 4px', width: '100%', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleCreate} style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: '0.5px solid var(--text-faint)', borderRadius: '6px', padding: '8px 20px', cursor: 'pointer' }}>
                Create
              </button>
              <button onClick={() => { setCreating(false); setNewName(''); }} style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            style={{ marginTop: '24px', fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.08em', color: 'var(--text-muted)', background: 'none', border: '0.5px solid var(--text-faint)', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer', width: '100%' }}
          >
            + New Project
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## Task G — Wire everything into App.jsx

Read `apps/associations/src/App.jsx`.

This is the largest change. The App needs to:
- Load the active project and document on mount
- Pass `projectId` and `documentId` down to Compose
- Handle menu events
- Show the questions waiting count in the bottom-left corner
- Remove "folders" and "questions" labels from the corner (they move to the menu)

Replace `App.jsx` entirely:

```jsx
import { useState, useEffect } from 'react';
import './styles/globals.css';
import Compose from './components/Compose';
import FolderWatch from './components/FolderWatch';
import QASession from './components/QASession';
import DocumentList from './components/DocumentList';
import ProjectSwitcher from './components/ProjectSwitcher';

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const [projectId, setProjectId] = useState('default');
  const [documentId, setDocumentId] = useState('default');
  const [projectName, setProjectName] = useState('Default');
  const [documentTitle, setDocumentTitle] = useState('Untitled');
  const [questionsWaiting, setQuestionsWaiting] = useState(0);

  const [showFolderWatch, setShowFolderWatch] = useState(false);
  const [showQA, setShowQA] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showProjects, setShowProjects] = useState(false);

  useEffect(() => {
    async function init() {
      const token = await window.electron.getToken();
      setAuthed(!!token);
      setChecking(false);

      if (token) {
        await loadActiveContext();
      }

      window.electron.onDeepLink((url) => {
        const params = new URL(url);
        const t = params.searchParams.get('access_token');
        if (t) {
          window.electron.saveToken(t).then(() => {
            setAuthed(true);
            loadActiveContext();
          });
        }
      });
    }
    init();
  }, []);

  // Wire menu events
  useEffect(() => {
    if (!authed) return;
    window.electron.menu.onNewDocument(() => handleNewDocument());
    window.electron.menu.onOpenDocument(() => setShowDocuments(true));
    window.electron.menu.onFolders(() => setShowFolderWatch(true));
    window.electron.menu.onQuestions(() => setShowQA(true));
    window.electron.menu.onDocuments(() => setShowDocuments(true));
    window.electron.menu.onNewProject(() => setShowProjects(true));
    window.electron.menu.onSwitchProject(() => setShowProjects(true));
  }, [authed]);

  // Check questions waiting periodically
  useEffect(() => {
    if (!authed) return;
    checkQuestionsWaiting();
    const interval = setInterval(checkQuestionsWaiting, 60000);
    return () => clearInterval(interval);
  }, [authed, projectId]);

  async function checkQuestionsWaiting() {
    const unanswered = await window.electron.qa.getUnanswered({ projectId });
    setQuestionsWaiting(unanswered.length);
  }

  async function loadActiveContext() {
    const activeProjectId = await window.electron.projects.getActive();
    setProjectId(activeProjectId);

    const projects = await window.electron.projects.list();
    const project = projects.find(p => p.id === activeProjectId);
    if (project) setProjectName(project.name);

    const activeDocId = await window.electron.documents.getActive({ projectId: activeProjectId });
    if (activeDocId) {
      setDocumentId(activeDocId);
      const docs = await window.electron.documents.list({ projectId: activeProjectId });
      const doc = docs.find(d => d.id === activeDocId);
      if (doc) setDocumentTitle(doc.title);
    }
  }

  async function handleProjectSelect(newProjectId, newDocumentId) {
    await window.electron.projects.setActive({ projectId: newProjectId });
    setProjectId(newProjectId);

    const projects = await window.electron.projects.list();
    const project = projects.find(p => p.id === newProjectId);
    if (project) setProjectName(project.name);

    let docId = newDocumentId;
    if (!docId) {
      docId = await window.electron.documents.getActive({ projectId: newProjectId });
      if (!docId) {
        const docs = await window.electron.documents.list({ projectId: newProjectId });
        docId = docs[0]?.id;
      }
    }

    if (docId) {
      setDocumentId(docId);
      await window.electron.documents.setActive({ projectId: newProjectId, documentId: docId });
      const docs = await window.electron.documents.list({ projectId: newProjectId });
      const doc = docs.find(d => d.id === docId);
      if (doc) setDocumentTitle(doc.title);
    }
  }

  async function handleDocumentSelect(newDocumentId) {
    setDocumentId(newDocumentId);
    await window.electron.documents.setActive({ projectId, documentId: newDocumentId });
    const docs = await window.electron.documents.list({ projectId });
    const doc = docs.find(d => d.id === newDocumentId);
    if (doc) setDocumentTitle(doc.title);
  }

  async function handleNewDocument() {
    const id = await window.electron.documents.create({ projectId, title: 'Untitled' });
    await handleDocumentSelect(id);
  }

  if (checking) return null;

  if (!authed) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '24px', padding: '48px' }}>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
          Associations
        </p>
        {sent ? (
          <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '16px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '320px', lineHeight: '1.7' }}>
            Check your email for a sign-in link.
          </p>
        ) : (
          <form onSubmit={async (e) => {
            e.preventDefault();
            setSending(true);
            try {
              await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, redirect_uri: 'associations://auth/verify' }),
              });
              setSent(true);
            } catch {}
            setSending(false);
          }} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '280px' }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{ fontFamily: "'Lora', serif", fontSize: '15px', padding: '10px 14px', border: '0.5px solid var(--text-faint)', borderRadius: '6px', background: 'transparent', color: 'var(--text)', outline: 'none', textAlign: 'center' }}
            />
            <button type="submit" disabled={sending} style={{ fontFamily: "'Poppins', sans-serif", fontSize: '12px', letterSpacing: '0.08em', background: 'none', border: '0.5px solid var(--text-faint)', color: 'var(--text-muted)', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer' }}>
              {sending ? 'Sending…' : 'Send sign-in link'}
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      <Compose
        key={documentId}
        projectId={projectId}
        documentId={documentId}
        documentTitle={documentTitle}
        onWordCountChange={(wc) => {
          window.electron.documents.updateWordCount({ documentId, wordCount: wc });
        }}
      />

      {/* Bottom-left: questions waiting */}
      {questionsWaiting > 0 && (
        <span
          onClick={() => setShowQA(true)}
          style={{
            position: 'fixed', bottom: 14, left: 20,
            fontFamily: "'Poppins', sans-serif", fontSize: '10px',
            color: 'var(--text-faint)', letterSpacing: '0.08em',
            zIndex: 10, cursor: 'pointer', userSelect: 'none',
          }}
        >
          {questionsWaiting} {questionsWaiting === 1 ? 'question' : 'questions'} waiting
        </span>
      )}

      {showFolderWatch && <FolderWatch projectId={projectId} onClose={() => setShowFolderWatch(false)} />}
      {showQA && <QASession projectId={projectId} onClose={() => { setShowQA(false); checkQuestionsWaiting(); }} />}
      {showDocuments && <DocumentList projectId={projectId} activeDocumentId={documentId} onSelect={handleDocumentSelect} onClose={() => setShowDocuments(false)} />}
      {showProjects && <ProjectSwitcher activeProjectId={projectId} onSelect={handleProjectSelect} onClose={() => setShowProjects(false)} />}
    </div>
  );
}
```

Note: `Compose` now receives a `key={documentId}` prop — this forces a full remount when the document changes, which correctly resets the editor content and loads the new document. Also add `onWordCountChange` prop to Compose.

---

## Task H — Update Compose to accept onWordCountChange

Read `apps/associations/src/components/Compose.jsx`.

Add `onWordCountChange` to the props and call it when word count changes:

```js
export default function Compose({ projectId = 'default', documentId = 'default', documentTitle = 'Untitled', onWordCountChange }) {
```

In `handleInput`, after `setWordCount(wc)`:

```js
if (onWordCountChange) onWordCountChange(wc);
```

Also remove the `showFolderWatch` state and related code from Compose — that now lives in App.jsx. The bottom-left corner in Compose should be empty — App.jsx renders the "questions waiting" label over it.

---

## Verification Checklist

- [ ] App launches and loads correct active project and document
- [ ] macOS menu bar shows File, Project, Edit menus
- [ ] File > New Document creates a new document and switches to it
- [ ] Project > Switch Project opens project switcher
- [ ] Project > Folders opens folder watch panel
- [ ] Project > Questions opens Q&A session
- [ ] Project > Documents opens document list
- [ ] Documents can be reordered by dragging
- [ ] Documents can be renamed inline
- [ ] Switching projects changes the pool, document, and context
- [ ] "N questions waiting" appears in bottom-left when questions exist
- [ ] Clicking "N questions waiting" opens Q&A session
- [ ] Word count updates in document list after writing
- [ ] Creating a new project creates it with one Untitled document
- [ ] No other files modified outside this list
