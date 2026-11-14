const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("schoolVerse", Object.freeze({
  saveBoardPdf: (pngDataUrl) => ipcRenderer.invoke("schoolverse:save-board-pdf", pngDataUrl)
}));
