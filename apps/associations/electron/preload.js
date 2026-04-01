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

  // Database operations
  db: {
    addPoolEntry: (data) => ipcRenderer.invoke('db-add-pool-entry', data),
    getPoolEntries: (data) => ipcRenderer.invoke('db-get-pool-entries', data),
    addKeptGhost: (data) => ipcRenderer.invoke('db-add-kept-ghost', data),
  },

  // Platform info
  platform: process.platform,
});