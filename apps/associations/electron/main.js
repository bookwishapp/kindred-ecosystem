const { app, BrowserWindow, protocol, shell, ipcMain, safeStorage, dialog, Menu } = require('electron');
const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const isDev = process.env.NODE_ENV === 'development';

// Configure auto-updater
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// Check for updates after window is ready (production only)
function checkForUpdates() {
  if (isDev) return;

  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    log.info('Update available — downloading...');
  });

  autoUpdater.on('update-downloaded', () => {
    log.info('Update downloaded — will install on quit');
    // Notify renderer that update is ready
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded');
    }
  });

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err.message);
  });
}

// Register deep link protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('associations', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('associations');
}

let mainWindow;

function loadDevURL(win, retries = 10) {
  win.loadURL('http://localhost:5173').catch(() => {
    if (retries > 0) {
      setTimeout(() => loadDevURL(win, retries - 1), 500);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#F5F3EF',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    loadDevURL(mainWindow);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

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
        { type: 'separator' },
        {
          label: 'Manage Billing…',
          click: () => mainWindow?.webContents.send('menu-billing'),
        },
        {
          label: 'Documents…',
          click: () => mainWindow?.webContents.send('menu-documents'),
        },
      ],
    },
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
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Spelling and Grammar',
          submenu: [
            { role: 'showSubstitutions' },
            { type: 'separator' },
            { role: 'toggleSmartQuotes' },
            { role: 'toggleSmartDashes' },
          ]
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

ipcMain.on('menu-rebuild', (event, { projectName, documentTitle }) => {
  buildMenu(projectName, documentTitle);
});

app.whenReady().then(() => {
  createWindow();
  buildMenu('Default', 'Untitled');
  checkForUpdates();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Handle deep link auth callback — associations://auth/verify?access_token=...
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow) {
    mainWindow.webContents.send('deep-link', url);
  }
});

// IPC handlers for secure token storage
const tokenPath = path.join(app.getPath('userData'), '.assoc_token');

ipcMain.handle('save-token', async (event, token) => {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(token);
      fs.writeFileSync(tokenPath, encrypted);
    } else {
      fs.writeFileSync(tokenPath, token);
    }
    return true;
  } catch { return false; }
});

ipcMain.handle('get-token', async () => {
  try {
    if (!fs.existsSync(tokenPath)) return null;
    const data = fs.readFileSync(tokenPath);
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(data);
    }
    return data.toString();
  } catch { return null; }
});

ipcMain.handle('clear-token', async () => {
  try {
    if (fs.existsSync(tokenPath)) fs.unlinkSync(tokenPath);
    return true;
  } catch { return false; }
});

ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
  return true;
});

// Database initialization
const db = new Database(path.join(app.getPath('userData'), 'associations.db'));
db.pragma('journal_mode = WAL');

// Embedding worker initialization
let embeddingWorker = null;
let pendingEmbeddings = new Map();
let embeddingIdCounter = 0;

function getWorkerPath() {
  if (isDev) {
    return path.join(__dirname, 'embeddings-worker.mjs');
  }
  // In packaged app, extraResources are placed in Resources/
  return path.join(process.resourcesPath, 'embeddings-worker.mjs');
}

function getEmbeddingWorker() {
  if (!embeddingWorker) {
    embeddingWorker = new Worker(getWorkerPath(), { type: 'module' });
    embeddingWorker.on('message', ({ id, embedding, error }) => {
      const { resolve, reject } = pendingEmbeddings.get(id);
      pendingEmbeddings.delete(id);
      if (error) reject(new Error(error));
      else resolve(embedding);
    });
    embeddingWorker.on('error', (err) => {
      console.error('Embedding worker error:', err.message, err.stack);
      embeddingWorker = null;
    });

    embeddingWorker.on('exit', (code) => {
      console.error('Embedding worker exited with code:', code);
      embeddingWorker = null;
    });
  }
  return embeddingWorker;
}

// Initialize schema inline
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, use_global_pool INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS pool_entries (id TEXT PRIMARY KEY, project_id TEXT, source TEXT NOT NULL, content TEXT NOT NULL, embedding BLOB, word_count INTEGER DEFAULT 0, session_id TEXT, created_at TEXT DEFAULT (datetime('now')));
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
    passages_ingested INTEGER DEFAULT 0,
    UNIQUE(file_path),
    FOREIGN KEY (folder_id) REFERENCES watched_folders(id) ON DELETE CASCADE
  );
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
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  CREATE TABLE IF NOT EXISTS tagged_passages (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    content TEXT NOT NULL,
    character_offset INTEGER,
    tagged_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
  );
`);

// Add passages_ingested column if it doesn't exist (migration)
try {
  db.exec(`ALTER TABLE watched_files ADD COLUMN passages_ingested INTEGER DEFAULT 0`);
} catch (e) {
  // Column already exists, ignore
}

// Add session_id column if it doesn't exist
try {
  db.exec(`ALTER TABLE pool_entries ADD COLUMN session_id TEXT`);
} catch (e) { /* already exists */ }

// Add asked_as_ghost column if it doesn't exist
try {
  db.exec(`ALTER TABLE qa_pairs ADD COLUMN asked_as_ghost INTEGER DEFAULT 0`);
} catch (e) { /* already exists */ }

// Add updated_at to projects if it doesn't exist
try {
  db.exec(`ALTER TABLE projects ADD COLUMN updated_at TEXT`);
} catch (e) { /* already exists */ }

// Add position, word_count to documents if they don't exist
try {
  db.exec(`ALTER TABLE documents ADD COLUMN position INTEGER DEFAULT 0`);
} catch (e) { /* already exists */ }
try {
  db.exec(`ALTER TABLE documents ADD COLUMN word_count INTEGER DEFAULT 0`);
} catch (e) { /* already exists */ }

// Clear oversized pool entries from previous ingestion (one-time migration)
const oversized = db.prepare(`
  SELECT COUNT(*) as count FROM pool_entries WHERE source = 'folder' AND word_count > 50
`).get();
if (oversized.count > 0) {
  db.prepare(`DELETE FROM pool_entries WHERE source = 'folder' AND word_count > 50`).run();
  db.prepare(`DELETE FROM watched_files`).run();
  console.log(`Cleared ${oversized.count} oversized pool entries — re-sync folders to rebuild`);
}

// Clear fragmented pool entries that don't end with sentence punctuation
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

// Seed default project and document
const defaultProject = db.prepare(`SELECT id FROM projects WHERE id = 'default'`).get();
if (!defaultProject) {
  db.prepare(`INSERT INTO projects (id, name) VALUES ('default', 'Default')`).run();
}
const defaultDoc = db.prepare(`SELECT id FROM documents WHERE id = 'default'`).get();
if (!defaultDoc) {
  db.prepare(`INSERT INTO documents (id, project_id, title) VALUES ('default', 'default', 'Untitled')`).run();
}

// Check if this is first launch
const firstLaunch = db.prepare(`SELECT value FROM settings WHERE key = 'first_launch_complete'`).get();
if (!firstLaunch) {
  // Seed demo pool on first launch
  seedDemoPool();
  global.pendingDemoEmbeddings = true;
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

ipcMain.handle('db-add-pool-entry', (event, { id, projectId, source, content, embedding, wordCount, sessionId }) => {
  const embeddingBuffer = embedding
    ? Buffer.from(new Float32Array(embedding).buffer)
    : null;
  db.prepare(`INSERT OR IGNORE INTO pool_entries (id, project_id, source, content, embedding, word_count, session_id) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, projectId, source, content, embeddingBuffer, wordCount, sessionId || null);
  return true;
});

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

ipcMain.handle('db-add-kept-ghost', (event, { id, documentId, poolEntryId }) => {
  db.prepare(`INSERT INTO kept_ghosts (id, document_id, pool_entry_id) VALUES (?, ?, ?)`).run(id, documentId, poolEntryId);
  return true;
});

// Folder watch IPC handlers

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
            SELECT last_modified, passages_ingested
            FROM watched_files WHERE file_path = ?
          `).get(fullPath);

          if (!existing || existing.last_modified !== lastModified || existing.passages_ingested === 0) {
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
ipcMain.handle('folder-mark-ingested', (event, { folderId, filePath, lastModified, passagesIngested }) => {
  const id = require('crypto').randomUUID();
  db.prepare(`
    INSERT INTO watched_files (id, folder_id, file_path, last_modified, ingested_at, passages_ingested)
    VALUES (?, ?, ?, ?, datetime('now'), ?)
    ON CONFLICT(file_path) DO UPDATE SET
      last_modified = excluded.last_modified,
      ingested_at = datetime('now'),
      passages_ingested = excluded.passages_ingested
  `).run(id, folderId, filePath, lastModified, passagesIngested || 0);
  return true;
});

// Q&A IPC handlers
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

// ── Tagging ──

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

// Export document
ipcMain.handle('export-document', async (event, { content, defaultName, format }) => {
  const extensions = format === 'rtf' ? ['rtf'] : ['txt'];
  const filters = format === 'rtf'
    ? [{ name: 'Rich Text', extensions: ['rtf'] }, { name: 'All Files', extensions: ['*'] }]
    : [{ name: 'Plain Text', extensions: ['txt'] }, { name: 'All Files', extensions: ['*'] }];

  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `${defaultName || 'Untitled'}.${extensions[0]}`,
    filters,
    title: 'Export Document',
  });

  if (result.canceled || !result.filePath) return { success: false };

  try {
    let output;
    if (format === 'rtf') {
      output = generateRTF(content);
    } else {
      output = content;
    }

    fs.writeFileSync(result.filePath, output, format === 'rtf' ? 'binary' : 'utf8');
    return { success: true, filePath: result.filePath };
  } catch (err) {
    console.error('Export error:', err.message);
    return { success: false, error: err.message };
  }
});

function generateRTF(text) {
  // RTF header
  const header = '{\\rtf1\\ansi\\ansicpg1252\\cocoartf2639\n' +
    '{\\fonttbl\\f0\\froman\\fcharset0 TimesNewRomanPSMT;}\n' +
    '{\\colortbl;\\red0\\green0\\blue0;}\n' +
    '\\paperw12240\\paperh15840\\margl1800\\margr1800\\margt1440\\margb1440\n' +
    '\\f0\\fs24\\cf1\n';

  // Split into paragraphs — each div becomes a paragraph
  const paragraphs = text
    .split(/\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  let body = '';
  let isFirst = true;

  for (const para of paragraphs) {
    // First paragraph: no indent. Subsequent: 0.5 inch indent (720 twips)
    const indent = isFirst ? '' : '\\fi720 ';
    const escaped = para
      .replace(/\\/g, '\\\\')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      // Smart quotes already in text — RTF unicode escape
      .replace(/\u201C/g, '\\u8220?')
      .replace(/\u201D/g, '\\u8221?')
      .replace(/\u2018/g, '\\u8216?')
      .replace(/\u2019/g, '\\u8217?')
      .replace(/\u2014/g, '\\u8212?')
      .replace(/\u2013/g, '\\u8211?');

    body += `\\pard\\sl480\\slmult1 ${indent}${escaped}\\par\n`;
    isFirst = false;
  }

  return header + body + '}';
}

// Embedding generation
ipcMain.handle('generate-embedding', async (event, { text }) => {
  console.log('generate-embedding called, text length:', text?.length);
  return new Promise((resolve, reject) => {
    const id = ++embeddingIdCounter;
    pendingEmbeddings.set(id, { resolve, reject });
    try {
      getEmbeddingWorker().postMessage({ id, text });
    } catch (err) {
      pendingEmbeddings.delete(id);
      reject(err);
    }
  });
});

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