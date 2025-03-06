import { createApp } from 'vue';
import App from './App.vue';
import { loader } from '@guolao/vue-monaco-editor';
import * as monaco from 'monaco-editor';
import { configureMonacoYaml } from 'monaco-yaml';
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker"
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker"
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker"
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker"
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker"
import YamlWorker from './yaml.worker?worker';

const app = createApp(App);

app.provide('$electronAPI', window.electronAPI);
app.provide('$getPlatform', window.electronAPI.getPlatform);
app.provide('$getSafeDir', window.electronAPI.getSafeDir);
app.provide('$getRootDir', window.electronAPI.getRootDir);
app.provide('$joinPath', window.electronAPI.joinPath);
app.provide('$readFile', window.electronAPI.readFile);
app.provide('$writeFile', window.electronAPI.writeFile);
app.provide('$removeFile', window.electronAPI.removeFile);
app.provide('$readDir', window.electronAPI.readDir);
app.provide('$removeDir', window.electronAPI.removeDir);
app.provide('$runBinary', window.electronAPI.runBinary);
app.provide('$showErrorDialog', window.electronAPI.showErrorDialog);

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "json") {
      return new jsonWorker()
    }
    if (label === "css" || label === "scss" || label === "less") {
      return new cssWorker()
    }
    if (label === "html" || label === "handlebars" || label === "razor") {
      return new htmlWorker()
    }
    if (label === "typescript" || label === "javascript") {
      return new tsWorker()
    }
    if (label === "yaml") {
      return new YamlWorker()
    }
    return new editorWorker()
  }
}

configureMonacoYaml(monaco, {
  enableSchemaRequest: true,
  validate: true,
  hover: true,
  completion: true,
  schemas: [
    {
      uri: 'https://raw.githubusercontent.com/semgrep/semgrep-interfaces/main/rule_schema_v1.yaml',
      fileMatch: ['*'],
    },
  ],
});
loader.config({ monaco });

app.mount('#app');
