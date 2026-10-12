const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('core', {
  setup: () => ipcRenderer.invoke('setup'),
  knowledge: () => ipcRenderer.invoke('knowledge'),
  analyze: (url) => ipcRenderer.invoke('analyze', url),
  checkWorkplace: (state, url) => ipcRenderer.invoke('checkWorkplace', state, url),
  buildNewCore: (state, work) => ipcRenderer.invoke('buildNewCore', state, work),
  applyUpdate: (state, work) => ipcRenderer.invoke('applyUpdate', state, work),
  screens: (items) => ipcRenderer.invoke('screens', items),
  onProgress: (cb) => ipcRenderer.on('progress', (_e, ev) => cb(ev)),
  open: (url) => ipcRenderer.invoke('open', url)
});
