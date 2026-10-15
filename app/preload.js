const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('core', {
  setup: () => ipcRenderer.invoke('setup'),
  installClaude: () => ipcRenderer.invoke('installClaude'),
  openConnect: () => ipcRenderer.invoke('openConnect'),
  knowledge: () => ipcRenderer.invoke('knowledge'),
  analyze: (url) => ipcRenderer.invoke('analyze', url),
  checkWorkplace: (state, url) => ipcRenderer.invoke('checkWorkplace', state, url),
  buildNewCore: (state, work) => ipcRenderer.invoke('buildNewCore', state, work),
  applyUpdate: (state, work) => ipcRenderer.invoke('applyUpdate', state, work),
  gatherForPaste: (state, work, url) => ipcRenderer.invoke('gatherForPaste', state, work, url),
  screens: (items) => ipcRenderer.invoke('screens', items),
  onProgress: (cb) => ipcRenderer.on('progress', (_e, ev) => cb(ev)),
  tokenStatus: () => ipcRenderer.invoke('tokenStatus'),
  tokenSave: (t) => ipcRenderer.invoke('tokenSave', t),
  tokenClear: () => ipcRenderer.invoke('tokenClear'),
  open: (url) => ipcRenderer.invoke('open', url)
});
