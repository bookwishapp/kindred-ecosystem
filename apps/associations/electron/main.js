const { app, BrowserWindow, protocol, shell, ipcMain, safeStorage } = require('electron');
const path = require('path');
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
ipcMain.handle('save-token', async (event, token) => {
  if (!safeStorage.isEncryptionAvailable()) {
    return false;
  }
  const encrypted = safeStorage.encryptString(token);
  // In production, you'd save this to a file or keychain
  // For now, we'll keep it in memory (not ideal for production)
  global.encryptedToken = encrypted;
  return true;
});

ipcMain.handle('get-token', async () => {
  if (!global.encryptedToken || !safeStorage.isEncryptionAvailable()) {
    return null;
  }
  try {
    return safeStorage.decryptString(global.encryptedToken);
  } catch {
    return null;
  }
});

ipcMain.handle('clear-token', async () => {
  global.encryptedToken = null;
  return true;
});

ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
  return true;
});