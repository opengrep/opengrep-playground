<template>
  <div class="container">
    <!-- Rules Editor -->
    <div class="code-area">
      <div class="column-view resizable">
        <div class="editor-header">
          <h3>Rule</h3>
          <div class="editor-actions">
            <button class="editor-action" @click="loadRuleFromFile" title="Load a YAML rule file from disk">Load file...</button>
            <button class="editor-action editor-action--ghost" @click="clearRule" title="Clear the rule editor">Clear</button>
          </div>
        </div>
        <div class="code-editor-container">
          <RuleEditor @ruleEditorUpdated="handleRuleEditorUpdate" />
        </div>
        <div class="resize-handle" @mousedown="startResize($event, 0)"></div>
      </div>

      <!-- Code Viewer -->
      <div class="column-view resizable">
        <div class="editor-header">
          <h3>Code to Test</h3>
          <div class="editor-actions">
            <button class="editor-action" @click="loadCodeFromFile" title="Load a code file from disk">Load file...</button>
            <button class="editor-action editor-action--ghost" @click="clearCode" title="Clear the code editor">Clear</button>
          </div>
        </div>
        <div class="code-editor-container">
          <CodeEditor ref="codeEditor" @codeEditorUpdated="handleCodeEditorUpdate" />
        </div>
        <div class="resize-handle" @mousedown="startResize($event, 1)"></div>
      </div>

      <!-- Results Viewer -->
      <div class="column-view resizable" style="flex-grow: 1;">
        <RuleResults @showDataFlows="handleShowDataFlows"
          @scrollToCodeSnippet="handleScrollToCodeSnippet" />
        <div class="resize-handle" @mousedown="startResize($event, 2)"></div>
      </div>
    </div>
    <!-- Debug Rule Area -->
    <div class="meta-section">
      <DebugSection style="flex: 3;" class="scroll-container" @scrollToCodeSnippet="handleScrollToCodeSnippet" />
    </div>
  </div>
</template>

<script setup>
import { onMounted, inject, ref } from 'vue';
import CodeEditor from './components/CodeEditor.vue';
import RuleResults from './components/RuleResults.vue';
import DebugSection from './components/DebugSection.vue';
import RuleEditor from './components/RuleEditor.vue';
import { store } from './store';

const getRootDir = inject('$getRootDir');
const getSafeDir = inject('$getSafeDir');
const joinPath = inject('$joinPath');
const writeFile = inject('$writeFile');
const showErrorDialog = inject('$showErrorDialog');
const openFileDialog = inject('$openFileDialog');

const codeEditor = ref(null);
const resizingColumn = ref(null);
const startX = ref(0);
const startWidth = ref(0);

onMounted(async () => {
  store.safeDir = await getSafeDir();
  store.rootDir = await getRootDir();
});

function handleShowDataFlows(dataFlows) {
  if (codeEditor.value) {
    codeEditor.value.determineCodeFlowInformation(dataFlows);
  }
};

async function handleCodeEditorUpdate() {
  try {
    if (store.ruleEditorCode.normalizedRule === '') {
      return;
    }

    const codeSampleFilePath = await joinPath(store.safeDir, "tmp", `untitled_code.${store.languageDetails?.extension}`);
    await writeFile(codeSampleFilePath, store.codeEditorCode, { flag: 'w' }); // 'w' flag to create or overwrite the file
    store.codeSampleFilePath = codeSampleFilePath;

  } catch (error) {
    showErrorDialog(`Error saving code: ${error}`, error);
    console.error("Error saving code:", error);
  }
}

async function handleRuleEditorUpdate() {
  try {
    const ruleFilePath = await joinPath(store.safeDir, "tmp", 'untitled_rule.yaml');
    await writeFile(ruleFilePath, store.ruleEditorCode.normalizedRule, { flag: 'w' }); // 'w' flag to create or overwrite the file
    store.ruleFilePath = ruleFilePath;
    await handleCodeEditorUpdate();
  } catch (error) {
    showErrorDialog(`Error saving code: ${error}`, error);
    console.error("Error saving code:", error);
  }
}

function startResize(event, columnIndex) {
  resizingColumn.value = columnIndex;
  startX.value = event.clientX;
  startWidth.value = event.target.parentElement.offsetWidth;
  document.addEventListener('mousemove', resizeColumn);
  document.addEventListener('mouseup', stopResize);
}

function resizeColumn(event) {
  if (resizingColumn.value !== null) {
    const dx = event.clientX - startX.value;
    const newWidth = startWidth.value + dx;
    document.querySelectorAll('.column-view')[resizingColumn.value].style.width = `${newWidth}px`;
  }
}

function stopResize() {
  document.removeEventListener('mousemove', resizeColumn);
  document.removeEventListener('mouseup', stopResize);
  resizingColumn.value = null;
}

function handleScrollToCodeSnippet(lineNumber) {
  if (codeEditor.value) {
    codeEditor.value.scrollToCodeSnippet(lineNumber)
  }
}

function clearRule() {
  // Setting the store empties the Monaco model via RuleEditor's watcher,
  // which in turn disables the Evaluate button.
  store.ruleEditorCode = { originalRule: '', normalizedRule: '' };
}

function clearCode() {
  store.codeEditorCode = '';
}

async function loadRuleFromFile() {
  await loadIntoEditor({
    title: 'Load rule file',
    filters: [{ name: 'YAML', extensions: ['yaml', 'yml'] }],
    apply: (content) => {
      store.ruleEditorCode = { originalRule: content, normalizedRule: content };
    },
  });
}

async function loadCodeFromFile() {
  await loadIntoEditor({
    title: 'Load code file',
    filters: [{ name: 'All Files', extensions: ['*'] }],
    apply: (content) => {
      store.codeEditorCode = content;
    },
  });
}

async function loadIntoEditor({ title, filters, apply }) {
  try {
    const result = await openFileDialog({ title, filters });
    if (!result || result.canceled) return;
    if (result.error) {
      showErrorDialog(`Error loading file: ${result.error}`, result.error);
      return;
    }
    apply(result.content);
  } catch (error) {
    showErrorDialog(`Error loading file: ${error}`, error);
  }
}
</script>

<style lang="scss">
@use 'sass:color';

$border-color: #3c3c3c;
$primary-color: #3498db;
$secondary-color: #2ecc71;

/* Layout */
.container {
  display: flex;
  height: 100vh;
  overflow: auto;

  flex: 1;
  display: flex;
  flex-direction: column;

  .header {
    padding: 10px;
    border-bottom: 1px solid $border-color;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .code-area {
    display: flex;
    flex: 3;
    max-height: 75%;
  }

  .column-view {
    width: 300px;
    padding: 15px;
    flex-grow: 2;
    overflow: hidden;
    font-family: monospace;
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: relative;
  }

  .column-view:not(:last-child) {
    border-right: 1px solid $border-color;
  }

  .resize-handle {
    position: absolute;
    top: 0;
    right: 0;
    width: 5px;
    height: 100%;
    cursor: ew-resize;
    background-color: transparent;
  }

  .meta-section {
    padding: 15px;
    overflow: hidden;
    font-family: monospace;
    flex: 1;
    display: flex;
    background: #f8f9fa;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    gap: 16px;

  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;

    select {
      background-color: $primary-color;
      border: none;
      color: white;
      padding: 10px;
      border-radius: 5px;
      cursor: pointer;
      outline: none;
      transition: background-color 0.3s ease;
    }

    .editor-actions {
      display: flex;
      gap: 6px;
    }

    .editor-action {
      background-color: $primary-color;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 4px 10px;
      font-size: 11px;
      font-family: inherit;
      cursor: pointer;
      transition: background-color 0.2s ease;

      &:hover {
        background-color: color.adjust($primary-color, $lightness: -8%);
      }

      &.editor-action--ghost {
        background-color: transparent;
        color: #555;
        border: 1px solid #bdc3c7;

        &:hover {
          background-color: #ecf0f1;
          color: #2c3e50;
        }
      }
    }
  }

  .code-editor-container {
    flex: 1;
    min-height: 0;
  }

  .textarea-container {
    position: relative;
    height: 100%;
    width: 100%;
  }
}

.scroll-container {
  overflow-y: auto;
}

.empty-state {
  font-family: monospace;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #7f8c8d;
  font-size: 14px;
  font-style: italic;
}
</style>
