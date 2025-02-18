// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  runBinary: (binaryPath, args) =>
    ipcRenderer.invoke("run-binary", binaryPath, args),
  readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
  joinPath: (...segments) => ipcRenderer.invoke("join-path", ...segments),
  getRootDir: () => ipcRenderer.invoke("get-root-dir"),
});


