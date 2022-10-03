const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    addEntry: (title, entry) => ipcRenderer.send('add-entry', title, entry),
    removeEntry: (title) => ipcRenderer.send('remove-entry', title),
    updateEntry: (title, value) => ipcRenderer.send('update-entry', title, value),
    loadEntriesForDay: (date) => ipcRenderer.send('load-entries-for-day', date),
    export: (from, to) => ipcRenderer.send('export', from, to)
})