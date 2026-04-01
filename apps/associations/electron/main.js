const { app, BrowserWindow, protocol, shell, ipcMain, safeStorage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const isDev = process.env.NODE_ENV === 'development';

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
    titleBarStyle: 'hiddenInset',
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

app.whenReady().then(createWindow);

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

// Initialize schema inline
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

ipcMain.handle('db-add-pool-entry', (event, { id, projectId, source, content, embeddingBuffer, wordCount }) => {
  db.prepare(`INSERT OR IGNORE INTO pool_entries (id, project_id, source, content, embedding, word_count) VALUES (?, ?, ?, ?, ?, ?)`).run(id, projectId, source, content, embeddingBuffer, wordCount);
  return true;
});

ipcMain.handle('db-get-pool-entries', (event, { projectId }) => {
  return db.prepare(`SELECT id, content, embedding FROM pool_entries WHERE project_id = ? AND embedding IS NOT NULL`).all(projectId);
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