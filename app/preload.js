const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('core', {
  setup: () => ipcRenderer.invoke('setup'),
  knowledge: () => ipcRenderer.invoke('knowledge'),
  analyze: (url) => ipcRenderer.invoke('analyze', url),
  build: (coreUrl, analyzed, dryRun, mode, versionSaved) => ipcRenderer.invoke('build', coreUrl, analyzed, dryRun, mode, versionSaved),
  open: (url) => ipcRenderer.invoke('open', url)
});
