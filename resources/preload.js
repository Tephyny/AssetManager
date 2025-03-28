const { contextBridge, ipcRenderer } = require('electron');

// Exposing a safe API to the renderer process using contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
    // Expose specific ipcRenderer methods that are safe
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    on: (channel, listener) => ipcRenderer.on(channel, listener)
});
