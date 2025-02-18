import { app, BrowserWindow, ipcMain } from 'electron';
import { spawn,exec } from 'child_process';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false, // Better security
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  ipcMain.handle("run-binary", async (event, binaryPath, args = []) => {
    return new Promise((resolve, reject) => {
      console.log("Running binary:", binaryPath, args);

      // ✅ Use spawn instead of exec
      const child = spawn(binaryPath, args, { shell: true });

      let output = "";
      let errorOutput = "";

      // ✅ Collect stdout data
      child.stdout.on("data", (data) => {
        output += data.toString();
        console.log(`stdout: ${data}`);
      });

      // ✅ Collect stderr data
      child.stderr.on("data", (data) => {
        errorOutput += data.toString();
        console.error(`stderr: ${data}`);
      });

      // ✅ Handle process exit
      child.on("close", (code) => {
        console.log(`Process exited with code ${code}`);
        resolve({ output, errorOutput, exitCode: code });
      });

      // ✅ Handle process errors
      child.on("error", (error) => {
        console.error(`Error: ${error.message}`);
        reject(error);
      });
    });
  });

  // Handle file reading from the main process
  ipcMain.handle("read-file", async (event, filePath) => {
    try {
      const data = await fs.promises.readFile(filePath, "utf-8");
      return data;
    } catch (error) {
      return { error: error.message };
    }
  });
  ipcMain.handle("join-path", (event, ...segments) => {
    return path.join(segments.join('/'))
  });
  ipcMain.handle("get-root-dir", () => { 
    return app.getAppPath(); // This is the Electron main process root
  });

  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
