/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import { createApp } from 'vue';
import App from './App.vue';
import { install as VueMonacoEditorPlugin } from '@guolao/vue-monaco-editor';

const app = createApp(App);
app.use(VueMonacoEditorPlugin, {
  paths: {
    // The recommended CDN config
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs'
  },
});

app.provide('$electronAPI', window.electronAPI);
app.provide('$getRootDir', window.electronAPI.getRootDir);
app.provide('$joinPath', window.electronAPI.joinPath);
app.provide('$readFile', window.electronAPI.readFile);
app.provide('$writeFile', window.electronAPI.writeFile);
app.provide('$readDir', window.electronAPI.readDir);
app.provide('$removeDir', window.electronAPI.removeDir);
app.provide('$runBinary', window.electronAPI.runBinary);

app.mount('#app');


