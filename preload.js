const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    addEntry: (title) => ipcRenderer.send('add-entry', title)
})