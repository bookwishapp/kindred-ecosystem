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
  processDemoEmbeddings: () => ipcRenderer.invoke('process-demo-embeddings'),

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

  // Document operations
  document: {
    save: (data) => ipcRenderer.invoke('document-save', data),
    load: (data) => ipcRenderer.invoke('document-load', data),
    onWillQuit: (callback) => ipcRenderer.on('app-will-quit', callback),
  },

  // Q&A operations
  qa: {
    save: (data) => ipcRenderer.invoke('qa-save', data),
    answer: (data) => ipcRenderer.invoke('qa-answer', data),
    dismiss: (data) => ipcRenderer.invoke('qa-dismiss', data),
    getUnanswered: (data) => ipcRenderer.invoke('qa-get-unanswered', data),
    getAll: (data) => ipcRenderer.invoke('qa-get-all', data),
  },

  // Project operations
  projects: {
    list: () => ipcRenderer.invoke('project-list'),
    create: (data) => ipcRenderer.invoke('project-create', data),
    rename: (data) => ipcRenderer.invoke('project-rename', data),
    delete: (data) => ipcRenderer.invoke('project-delete', data),
    getActive: () => ipcRenderer.invoke('project-get-active'),
    setActive: (data) => ipcRenderer.invoke('project-set-active', data),
  },

  // Document operations
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

  // Menu operations
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
    onCompose: (cb) => ipcRenderer.on('menu-compose', cb),
    onOutline: (cb) => ipcRenderer.on('menu-outline', cb),
    onBilling: (cb) => ipcRenderer.on('menu-billing', cb),
    rebuild: (data) => ipcRenderer.send('menu-rebuild', data),
  },

  // Export operations
  export: {
    document: (data) => ipcRenderer.invoke('export-document', data),
  },

  // Tagging operations
  tags: {
    add: (data) => ipcRenderer.invoke('tag-add', data),
    list: (data) => ipcRenderer.invoke('tag-list', data),
    remove: (data) => ipcRenderer.invoke('tag-remove', data),
  },

  // Kept ghosts operations
  keptGhosts: {
    list: (data) => ipcRenderer.invoke('kept-ghost-list', data),
    remove: (data) => ipcRenderer.invoke('kept-ghost-remove', data),
  },

  // Update notifications
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', cb),

  // Platform info
  platform: process.platform,
});