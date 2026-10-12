const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('core', {
  setup: () => ipcRenderer.invoke('setup'),
  knowledge: () => ipcRenderer.invoke('knowledge'),
  analyze: (url) => ipcRenderer.invoke('analyze', url),
  build: (dupUrl, analyzed, dryRun) => ipcRenderer.invoke('build', dupUrl, analyzed, dryRun),
  open: (url) => ipcRenderer.invoke('open', url)
});
