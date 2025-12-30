const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Add API functions here if needed, e.g. for native dialogs
    // openFile: () => ipcRenderer.invoke('dialog:openFile'),
});
