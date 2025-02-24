import { app, BrowserWindow, ipcMain } from 'electron';
import { spawn } from 'child_process';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import os from 'os';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

class Logger {
  #logFile = '';
  #isDev = true;

  constructor(logDir, isDev) {
      this.#logFile = path.join(logDir, 'app.log');
      this.#isDev = isDev;
  }

  #writeMessage(message) {
      const timestamp = new Date().toISOString();
      const logMessage = `${timestamp} - ${message}\n`;
      fs.appendFileSync(this.#logFile, logMessage, 'utf8');
  }

  log(message) {
      this.#isDev ? console.log(message) : this.#writeMessage(`INFO: ${message}`);
  }

  warn(message) {
      this.#isDev ? console.warn(message) : this.#writeMessage(`WARN: ${message}`);
  }

  error(message) {
      this.#isDev ? console.error(message) : this.#writeMessage(`ERROR: ${message}`);      
  }
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
  const basePath = isDev ? path.join(app.getAppPath(), 'tmp') : path.join(app.getPath('userData'), 'tmp');
  const loggerRef = new Logger(`"${app.getPath('userData')}"`, isDev);


  // TODO validate if this is necessary
  // cleanup tmp filee

  function clearTempFolder() {
    const tempPath = basePath; // Change to match your temp folder
    if (fs.existsSync(tempPath)) {
      fs.promises.readdir(tempPath).then(files => {
        return Promise.all(files.map(file => fs.promises.unlink(path.join(tempPath, file))));
      }).then(() => {
        loggerRef.log(`Cleared tmp folder: ${tempPath}`);
      }).catch(err => {
        loggerRef.error(`Error clearing tmp folder: ${err.message}`);
      });
    } else {
      loggerRef.log(`Temp folder does not exist: ${tempPath}`);
    }
  }

  app.on('ready', () => {
    clearTempFolder(); // Clear temp files before quitting
  });

  app.on('will-quit', () => {
    clearTempFolder(); // Clear temp files before quitting
  });

  app.on('before-quit', () => {
    clearTempFolder(); // Ensure cleanup before exiting
  });

  app.on('quit', () => {
    clearTempFolder(); // Extra safety cleanup
  });


  // Handle running binaries from the main process
  ipcMain.handle("run-binary", async (event, binaryPath, args = []) => {
    return new Promise((resolve, reject) => {
      loggerRef.log("Running binary:", binaryPath, args);

      // ✅ Use spawn instead of exec
      const child = spawn(binaryPath, args, { shell: true });

      let output = "";
      let errorOutput = "";

      // ✅ Collect stdout data
      child.stdout.on("data", (data) => {
        output += data.toString();
        loggerRef.log(`stdout: ${data}`);
      });

      // ✅ Collect stderr data
      child.stderr.on("data", (data) => {
        errorOutput += data.toString();
        loggerRef.error(`stderr: ${data}`);
      });

      // ✅ Handle process exit
      child.on("close", (code) => {
        loggerRef.log(`Process exited with code ${code}`);
        resolve({ output, errorOutput, exitCode: code });
      });

      // ✅ Handle process errors
      child.on("error", (error) => {
        loggerRef.error(`Error: ${error.message}`);
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

  // Handle file writing from the main process
  ipcMain.handle("write-file", async (event, filePath, content, options) => {
    try {
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, content, options);
      loggerRef.log(`File written successfully: ${filePath}`);
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  });

  ipcMain.handle("remove-file", async (event, filePath) => {
    try {
      await fs.promises.unlink(filePath);
      loggerRef.log(`File removed successfully: ${filePath}`);
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  });

  // Handle directory reading from the main process
  ipcMain.handle("read-dir", async (event, path) => {
    try {
      const data = await fs.promises.readdir(path);
      return data;
    } catch (error) {
      return { error: error.message };
    }
  });

  // Handle directory reading from the main process
  ipcMain.handle("remove-dir", async (event, path) => {
    try {
      await fs.promises.rm(path, { recursive: true, force: true });
      return { success: true };
    } catch (error) {
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

  ipcMain.handle("log", (event, message) => {
    loggerRef.log(message);
  });
  ipcMain.handle("warn", (event, message) => {
    loggerRef.warn(message);
  });
  ipcMain.handle("error", (event, message) => {
    loggerRef.warn(message);
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
