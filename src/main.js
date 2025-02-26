import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { spawn } from 'child_process';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import os from 'os';

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
  if (!app.isPackaged) { mainWindow.webContents.openDevTools(); }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  const isDev = !app.isPackaged;
  const basePath = isDev ? app.getAppPath() : app.getPath('userData');
  const errorLogPath = path.join(basePath, 'error.log');
  const infoLogPath = path.join(basePath, 'info.log');
  fs.writeFileSync(errorLogPath, '', { flag: 'w' });
  fs.writeFileSync(infoLogPath, '', { flag: 'w' });

  // Handle running binaries from the main process
  ipcMain.handle("run-binary", async (event, binaryPath, args = []) => {
    return new Promise((resolve, reject) => {
      fs.writeFileSync(infoLogPath, `Running binary: ${binaryPath} ${args}\n\n`, { flag: 'a' });
      console.log("Running binary:", binaryPath, args);

      const child = spawn(binaryPath, args, { shell: true });

      let output = "";
      let errorOutput = "";

      // Collect stdout data
      child.stdout.on("data", (data) => {
        output += data.toString();
        fs.writeFileSync(infoLogPath, `stdout: ${data}\n\n`, { flag: 'a' });
        console.log(`stdout: ${data}`);
      });

      // Collect stderr data
      child.stderr.on("data", (data) => {
        errorOutput += data.toString();
        console.error(`stderr: ${data}`);
        if(data){ 
          fs.writeFileSync(errorLogPath, `stderr: ${data}\n\n`, { flag: 'a' });
        }
      });

      // Handle process exit
      child.on("close", (code) => {
        console.log(`Process exited with code ${code}`);
        fs.writeFileSync(infoLogPath, `Process exited with code ${code}\n\n`, { flag: 'a' });
        resolve({ output, errorOutput, exitCode: code });
      });

      // Handle process errors
      child.on("error", (error) => {
        const message = `Binary Error: ${error.message}`
        console.error(message);
        fs.writeFileSync(errorLogPath, `${message}\n\n`, { flag: 'a' });
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
      fs.writeFileSync(errorLogPath, `Error reading file: ${error}\n\n`, { flag: 'a' });
      return { error: error.message };
    }
  });

  // Handle file writing from the main process
  ipcMain.handle("write-file", async (event, filePath, content, options) => {
    try {
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, content, options);
      console.log(`File written successfully: ${filePath}`);
      fs.writeFileSync(infoLogPath, `File written successfully: ${filePath}\n\n`, { flag: 'a' });
      return { success: true };
    } catch (error) {
      fs.writeFileSync(errorLogPath, `Error writing file: ${error}\n\n`, { flag: 'a' });
      return { error: error.message };
    }
  });

  ipcMain.handle("remove-file", async (event, filePath) => {
    try {
      await fs.promises.unlink(filePath);
      fs.writeFileSync(infoLogPath, `File removed successfully: ${filePath}\n\n`, { flag: 'a' });
      console.log(`File removed successfully: ${filePath}`);
      return { success: true };
    } catch (error) {
      fs.writeFileSync(errorLogPath, `Error removing file: ${error}\n\n`, { flag: 'a' });
      return { error: error.message };
    }
  });

  // Handle directory reading from the main process
  ipcMain.handle("read-dir", async (event, path) => {
    try {
      const data = await fs.promises.readdir(path);
      return data;
    } catch (error) {
      fs.writeFileSync(errorLogPath, `Error reading directory: ${error}\n\n`, { flag: 'a', });
      console.error(`Error reading directory: ${error}`);
      return { error: error.message };
    }
  });

  // Handle directory reading from the main process
  ipcMain.handle("remove-dir", async (event, path) => {
    try {
      await fs.promises.rm(path, { recursive: true, force: true });
      fs.writeFileSync(infoLogPath, `Directory removed successfully: ${path}\n\n`, { flag: 'a' });
      console.log(`Directory removed successfully: ${path}`);
      return { success: true };
    } catch (error) {
      fs.writeFileSync(errorLogPath, `Error removing directory: ${error}\n\n`, { flag: 'a' });
      return { error: error.message };
    }
  });

  // Handle path joining from the main process
  ipcMain.handle("join-path", (event, ...segments) => {
    return path.join(segments.join('/'));
  });

  // Handle getting the root directory from the main process
  ipcMain.handle("get-safe-dir", () => {
    return path.join(basePath);
  });

  // Handle getting the root directory from the main process
  ipcMain.handle("get-root-dir", () => {
    return app.isPackaged ? process.resourcesPath : app.getAppPath();
  });

  ipcMain.handle("get-platform", () => {
    return os.platform();
  });

  ipcMain.handle("show-error-dialog", (event, errorMessage, error) => {
    try{
      if(!!error) {
        fs.writeFileSync(errorLogPath, `${error}\n\n`, { flag: 'a' });
      }
      dialog.showErrorBox("Somthing went wrong", errorMessage);
    } catch(error) {
      dialog.showErrorBox("Somthing went wrong", error.message);
      console.error(`Error writing error log: ${error.message}`);
    }
  });

  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('before-quit', () => {
    console.log('before-quit');
    clearTempFolder(basePath, errorLogPath, infoLogPath); // Clear temp files before quitting
  });
  app.on('will-quit', () => {
    console.log('will-quit');
    clearTempFolder(basePath, errorLogPath, infoLogPath); // Clear temp files before quitting
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

// TODO validate if this is necessary
  // cleanup tmp filee
  function clearTempFolder(basePath, errorLogPath, infoLogPath) {
    const tempPath = path.join(basePath, 'tmp'); // Change to match your temp folder
    if (fs.existsSync(tempPath)) {
      fs.promises.readdir(tempPath).then(files => {
        return Promise.all(files.map(file => fs.promises.unlink(path.join(tempPath, file))));
      }).then(() => {
        fs.writeFileSync(infoLogPath, `Cleared tmp folder: ${tempPath}\n\n`, { flag: 'a' });
        console.log(`Cleared tmp folder: ${tempPath}`);
      }).catch(err => {
        fs.writeFileSync(errorLogPath, `Error clearing tmp folder: ${err.message}\n\n`, { flag: 'a' });
        console.error(`Error clearing tmp folder: ${err.message}`);
      });
    } else {
      fs.writeFileSync(infoLogPath, `Temp folder does not exist: ${tempPath}\n\n`, { flag: 'a' });
      console.log(`Temp folder does not exist: ${tempPath}`);
    }
  }
