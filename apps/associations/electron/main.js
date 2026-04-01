const { app, BrowserWindow, protocol, shell, ipcMain, safeStorage } = require('electron');
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