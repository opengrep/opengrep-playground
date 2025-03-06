// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getPlatform: () => ipcRenderer.invoke("get-platform"),
  runBinary: (binaryPath, args) =>
    ipcRenderer.invoke("run-binary", binaryPath, args),
  readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
  writeFile: (filePath, content, options) => ipcRenderer.invoke("write-file", filePath, content, options),
  removeFile: (filePath) => ipcRenderer.invoke("remove-file", filePath),
  readDir: (path) => ipcRenderer.invoke("read-dir", path),
  removeDir: (path) => ipcRenderer.invoke("remove-dir", path),
  joinPath: (...segments) => ipcRenderer.invoke("join-path", ...segments),
  getSafeDir: () => ipcRenderer.invoke("get-safe-dir"),
  getRootDir: () => ipcRenderer.invoke("get-root-dir"),
  showErrorDialog: (errorMessage, error = null) => ipcRenderer.invoke("show-error-dialog", errorMessage, error),
});

// Safe insertion of Guesslang.js script
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
contextBridge.exposeInMainWorld("loadGuesslang", {
  load: () => {
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src = "https://cdn.jsdelivr.net/npm/guesslang-js@latest/dist/lib/guesslang.min.js";
      script.async = true;
      script.onload = () => console.log("Guesslang.js loaded successfully!");
      script.onerror = () => console.error("Failed to load Guesslang.js");
      document.head.appendChild(script);
  }
});


