const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    addEntry: (title) => ipcRenderer.send('add-entry', title),
    updateEntry: (title, value) => ipcRenderer.send('update-entry', title, value)
})