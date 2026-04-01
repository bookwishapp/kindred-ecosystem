const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Auth token storage using OS keychain
  saveToken: (token) => ipcRenderer.invoke('save-token', token),
  getToken: () => ipcRenderer.invoke('get-token'),
  clearToken: () => ipcRenderer.invoke('clear-token'),

  // Deep link handler
  onDeepLink: (callback) => ipcRenderer.on('deep-link', (_, url) => callback(url)),

  // Open external URLs
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Embedding generation
  generateEmbedding: (data) => ipcRenderer.invoke('generate-embedding', data),

  // Database operations
  db: {
    addPoolEntry: (data) => ipcRenderer.invoke('db-add-pool-entry', data),
    getPoolEntries: (data) => ipcRenderer.invoke('db-get-pool-entries', data),
    addKeptGhost: (data) => ipcRenderer.invoke('db-add-kept-ghost', data),
  },

  // Folder watch operations
  folders: {
    pick: () => ipcRenderer.invoke('folder-pick'),
    add: (data) => ipcRenderer.invoke('folder-add', data),
    list: (data) => ipcRenderer.invoke('folder-list', data),
    remove: (data) => ipcRenderer.invoke('folder-remove', data),
    scan: (data) => ipcRenderer.invoke('folder-scan', data),
    readFile: (data) => ipcRenderer.invoke('folder-read-file', data),
    markIngested: (data) => ipcRenderer.invoke('folder-mark-ingested', data),
  },

  // Platform info
  platform: process.platform,
});